/* Vitruvia · Universal documentary chronology.
 * Every query uses sourced years from Wikidata entity properties, linked
 * cultural works, catalogued albums, and bibliographic result records.
 * We do not infer a person's life, historical influence or a work's first release
 * from a search-result rank. Undated searches receive an explicit empty state.
 */
(()=>{
 "use strict";
 const root=document.getElementById("vitruvia-academic-timeline");
 if(!root)return;
 const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const lang=()=>["en","fr"].includes(document.documentElement.lang)?document.documentElement.lang:"es";
 const L=(es,en,fr)=>lang()==="en"?en:lang()==="fr"?fr:es;
 const el=(name,cls,text)=>{const n=document.createElement(name);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
 const year=x=>typeof x==="number"&&Number.isInteger(x)&&x>=-4000&&x<=2026?x:null;
 const normUrl=u=>typeof u==="string"&&/^https:\/\/[^\s]+$/i.test(u)?u:"";
 function documentedYear(value){if(value===null||value===undefined||typeof value==="boolean"||typeof value==="string"&&!/^-?\d+$/.test(value.trim()))return null;const n=Number(value);return Number.isInteger(n)&&n>=-4000&&n<=2026&&n!==0?n:null}
 function recordYear(row){const fields=row.type==="manuscript"||row.type==="fragment"?["codexDate"]:row.type==="edition"?["editionYear","year"]:["year","editionYear"];for(const key of fields){const y=documentedYear(row[key]);if(y!==null)return y}return null}
 function recordUrl(value){
  if(typeof value!=="string"||!value.trim()||value.startsWith("#"))return "";
  try{
   const url=new URL(value,location.href);
   if(url.username||url.password||!["https:","http:"].includes(url.protocol))return "";
   return url.origin===location.origin||url.protocol==="https:"?url.href:"";
  }catch{return ""}
 }
 const showYear=x=>x<0?Math.abs(x)+" "+L("a. C.","BCE","av. J.-C."):String(x);
 const types={
  life:[L("Vida e instituciones","Life and institutions","Vie et institutions"),"♔"],
  events:[L("Acontecimientos","Historical events","Événements"),"⚑"],
  works:[L("Obras y creaciones","Works and creations","Œuvres et créations"),"▤"],
  documents:[L("Documentos y ediciones","Documents and editions","Documents et éditions"),"▥"]
 };
 const state={query:"",token:0,authority:null,works:[],albums:[],rows:[],zoom:null,position:0,selected:"",rowSignature:"",pendingWorks:null,tagColor:null,datedLabels:{}};
 // Greedy tracks keep same-day and adjacent milestones from touching.
 // Popup centres are independently clamped, so no tooltip can protrude
 // beyond the chronology track even at narrow mobile widths.
 function dateWindow(fullLow,fullHigh,zoom,position){
 const fullRange=Math.max(1,fullHigh-fullLow);
 const span=Math.max(1,Math.ceil(fullRange/Math.max(1,zoom)));
 const travel=Math.max(0,fullRange-span);
 const low=fullLow+Math.round(travel*Math.max(0,Math.min(1,position)));
 return {low,high:low+span,range:span,travel};
}
 function automaticZoom(span){return span>800?8:span>200?4:span>2?2:1}
 function layoutMarkers(items,low,range,width,zoom=1){
  const safeWidth=Math.max(1,Number(width)||1);
  const diameter=24,gap=11;
  const popupWidth=Math.max(1,Math.min(Math.max(1,safeWidth-12),Math.round(134*zoom)));
  const lastCentres=[];
  return items.map(event=>{
   const raw=(event.year-low)/Math.max(1,range)*safeWidth;
   const center=Math.max(Math.min(safeWidth/2,diameter/2+3),Math.min(safeWidth-Math.min(safeWidth/2,diameter/2+3),raw));
   let level=lastCentres.findIndex(last=>center-last>=diameter+gap);
   if(level<0){level=lastCentres.length;lastCentres.push(-Infinity)}
   lastCentres[level]=center;
   const popupCenter=Math.max(popupWidth/2+4,Math.min(safeWidth-popupWidth/2-4,center));
   return {event,center,level,popupWidth,shift:popupCenter-center};
  });
 }
 const article=document.getElementById("vitruvia-article");
 const articleGrid=article?.querySelector(".article-grid");
 const resultsGrid=document.querySelector("#results .results-grid");
 let queued=false;
 /* Never insert the timeline inside an editorial grid. Later inline CSS owns
    those grids and assigns rows 1 and 2 to article and side panels; a fourth
    grid item caused timeline cards to overlap the text in production.
    Keep chronology a standalone, full-width sibling before either grid. */
 function place(){
  const visible=Boolean(article&&!article.hidden&&articleGrid);
  const anchor=visible?articleGrid:resultsGrid;
  const parent=visible?article:resultsGrid?.parentElement;
  if(parent&&anchor&&(root.parentElement!==parent||root.nextElementSibling!==anchor)){
   parent.insertBefore(root,anchor);
  }
 }
 function queuePlacement(){
  if(queued)return;queued=true;
  queueMicrotask(()=>{queued=false;place()});
 }
 if(article)new MutationObserver(queuePlacement).observe(article,{attributes:true,attributeFilter:["hidden","style","class"]});
 place();
 function event(item){
  const y=year(item.year),end=item.end==null?null:year(item.end);
  if(y===null||end!==null&&end<y)return null;
  const title=String(item.title||"").trim().slice(0,130),url=recordUrl(item.url);
  if(!title||!url||!types[item.lane])return null;
  return {...item,year:y,end,title,url,detail:String(item.detail||"").slice(0,600),source:String(item.source||"").slice(0,140)};
 }
 function matchedTitle(q,title){
  const terms=normalize(q).split(" ").filter(w=>w.length>2&&!["the","que","los","las","del","des","una","and"].includes(w));
  const t=normalize(title);
  return terms.length>0&&terms.every(w=>t.split(" ").some(x=>x===w||w.length>5&&x.startsWith(w)));
 }
 const isNero=()=>state.authority?.wikidataId?state.authority.wikidataId==="Q1413":/^(?:emperador )?(?:neron|nero)(?: romano)?$/.test(normalize(state.query));
 const neroBounds={birth:37,death:68};
 function neroEvents(){
  const url="https://ancientromelive.org/nero/",wd="https://www.wikidata.org/wiki/Q1413";
  return [
   [37,"life",L("Nacimiento en Antium","Birth at Antium","Naissance à Antium"),"Suetonio · Nerón 6",L("Nace Lucio Domicio Ahenobarbo, el 15 de diciembre.","Lucius Domitius Ahenobarbus is born on 15 December.","Naissance de Lucius Domitius Ahenobarbus le 15 décembre.")],
   [49,"life",L("Agripina se casa con Claudio","Agrippina marries Claudius","Agrippine épouse Claude"),"American Institute for Roman Culture",L("Su madre se incorpora a la familia imperial de Claudio.","His mother joins Claudius' imperial household.","Sa mère rejoint la famille impériale de Claude.")],
   [50,"life",L("Adopción por Claudio","Adoption by Claudius","Adoption par Claude"),"Tácito · Anales XII; AIRC",L("Adopción formal y nuevo nombre dinástico.","Formal adoption and new dynastic name.","Adoption officielle et nouveau nom dynastique.")],
   [53,"life",L("Matrimonio con Octavia","Marriage to Octavia","Mariage avec Octavie"),"Wikidata Q1413 · P26",L("Matrimonio con la hija de Claudio.","Marriage to Claudius' daughter.","Mariage avec la fille de Claude."),wd],
   [54,"life",L("Acceso al poder imperial","Imperial accession","Avènement impérial"),"Suetonio · Nerón 8",L("Comienza su reinado tras la muerte de Claudio; concluye en 68.","His reign begins after Claudius' death and ends in 68.","Son règne commence après la mort de Claude et se termine en 68."),url,68],
   [55,"events",L("Muerte de Británico","Death of Britannicus","Mort de Britannicus"),"Suetonio · Nerón 33",L("Crisis de la sucesión dentro de la familia imperial.","Succession crisis within the imperial family.","Crise de succession au sein de la famille impériale.")],
   [59,"events",L("Muerte de Agripina","Death of Agrippina","Mort d’Agrippine"),"Suetonio · Nerón 34",L("Ruptura definitiva entre Nerón y su madre.","Final rupture between Nero and his mother.","Rupture définitive entre Néron et sa mère.")],
   [62,"life",L("Matrimonio con Popea Sabina","Marriage to Poppaea Sabina","Mariage avec Poppée"),"Wikidata Q1413 · P26",L("Nueva unión imperial tras el divorcio de Octavia.","New imperial marriage after divorce from Octavia.","Nouvelle union impériale après le divorce d’Octavie."),wd],
   [64,"events",L("Gran incendio de Roma","Great Fire of Rome","Grand incendie de Rome"),"Tácito · Anales XV, 38–44",L("La ciudad sufre una grave destrucción. La atribución del incendio a Nerón no está demostrada.","Rome suffers extensive destruction. Nero's responsibility is unproven.","Rome subit de graves destructions. La responsabilité de Néron n’est pas établie.")],
   [64,"works",L("Domus Aurea","Domus Aurea","Domus Aurea"),"American Institute for Roman Culture",L("Proyecto palacial posterior al incendio de Roma, inconcluso al morir el emperador.","Palace project following the fire, unfinished at his death.","Projet palatial après l’incendie, inachevé à sa mort.")],
   [64,"events",L("Persecución de cristianos en Roma","Persecution of Christians in Rome","Persécution des chrétiens à Rome"),"Tácito · Anales XV, 44",L("Tácito vincula la persecución con las acusaciones posteriores al incendio.","Tacitus connects the persecution with accusations following the fire.","Tacite relie la persécution aux accusations après l’incendie.")],
   [66,"life",L("Matrimonio con Estatilia Mesalina","Marriage to Statilia Messalina","Mariage avec Statilia Messalina"),"Wikidata Q1413 · P26",L("Último matrimonio documentado del emperador.","Last recorded marriage of the emperor.","Dernier mariage documenté de l’empereur."),wd],
   [68,"events",L("Rebeliones de Víndex y Galba","Revolts of Vindex and Galba","Révoltes de Vindex et Galba"),"Suetonio · Nerón 40–49",L("La crisis política precipita el final del reinado.","Political crisis brings the reign to an end.","La crise politique précipite la fin du règne.")],
   [68,"life",L("Muerte de Nerón","Death of Nero","Mort de Néron"),"Suetonio · Nerón 49",L("Muere el 9 de junio; termina la dinastía julio-claudia.","Dies on 9 June; the Julio-Claudian dynasty ends.","Mort le 9 juin ; fin de la dynastie julio-claudienne.")]
  ].map(([year,lane,title,source,detail,link,end])=>({year,lane,title,source,url:link||url,detail,...(end?{end}:{})}));
 }
 const isAkhenaten=()=>/^(?:akhenaten|akhenaton|akhenat[oó]n|ajenaton|ajenat[oó]n|akenaton|akenat[oó]n|amenhotep iv|amenofis iv|amenophis iv)$/.test(normalize(state.query).replace(/^(?:rey|faraon|pharaoh|king|roi|pharaon)\s+/,""));
 // An abstract lexical concept is NOT a historical person/album/work.
 // Search result title matches cannot establish a chronology of the concept.
 // Provide a sourced concept-specific dataset before enabling those milestones.
 const abstractTerms=new Set([
  "logos","λογος","logoi","λογοι",
  "ethos","ηθος","mythos","μυθος",
  "physis","φυσις","arche","αρχη",
  "aletheia","αληθεια","ousia","ουσια",
  "nous","νους","techne","τεχνη",
  "episteme","επιστημη"
 ]);
 // Lexical headwords are not historical events; citations of a word in books
 // must not become artificial milestones for the meaning of that word.
 const lexicalHeadwords=new Set(["domus","casa","aedes","aedificium","tectum","insula","villa","οικος","οικια","δομος"]);
 const isLexicalHeadword=()=>lexicalHeadwords.has(normalize(state.query));
 const isAbstractTerm=()=>abstractTerms.has(normalize(state.query))||isLexicalHeadword();
 // Chronologies describe a *dated historical subject*, never all the dated
 // documents that happen to contain a generic lexical search term.
 // Wikidata P31 IDs: people; literary/artistic works; historical events;
 // buildings and archaeological sites; states and organizations.
 const chronologicalTypes=new Set([
  "Q5","Q571","Q7725634","Q47461344","Q11424","Q482994",
  "Q1656682","Q178561","Q1190554","Q13418847",
  "Q41176","Q839954","Q23413","Q6256","Q43229","Q4830453","Q215380"
 ]);
 const hasHistoricalSubject=()=>{
  if(isAkhenaten()||isNero())return true;
  if(isAbstractTerm())return false;
  const a=state.authority;
  return Boolean(a&&Array.isArray(a.instanceOf)&&a.instanceOf.some(id=>chronologicalTypes.has(id)));
 };

 // Akhenaten has a biographical scale: c. 1370–1336 BCE. Birth is not
 // attested precisely and these milestones are approximate, not regnal-date
 // conversions presented as certainties. Bibliography remains outside it.
 const akhenatenBounds={birth:-1370,death:-1336};
 function akhenatenEvents(){
  const ucl="https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/akhnaton.html";
  const pbs="https://www.pbs.org/empires/egypt/special/timeline/akenhaten.html";
  return [
   {year:-1370,lane:"life",title:L("Nacimiento estimado","Estimated birth","Naissance estimée"),
    source:"Estimación biográfica; fecha de nacimiento no documentada",url:ucl,approx:true,
    detail:L("Nacimiento aproximado hacia 1370 a. C., inferido y discutido. No se conoce una fecha de nacimiento contemporánea verificable.","Approximate inferred birth, not securely attested.","Naissance approximative, non attestée avec certitude.")},
   {year:-1353,lane:"life",title:L("Acceso al trono como Amenhotep IV","Accession as Amenhotep IV","Avènement d'Amenhotep IV"),
    source:"PBS · Egypt's Golden Empire / UCL Digital Egypt",url:pbs,approx:true,
    detail:L("Comienzo aproximado del reinado de Amenhotep IV; cronologías alternativas varían varios años.","Approximate start of the reign, with competing chronologies.","Début approximatif du règne; chronologies variables.")},
   {year:-1351,end:-1349,lane:"events",title:L("Primeros años · templos de Atón en Karnak","Early reign · Aten temples at Karnak","Début du règne · temples d’Aton à Karnak"),source:"The Met",url:"https://www.metmuseum.org/essays/art-architecture-and-the-city-in-the-reign-of-amenhotep-iv-akhenaten-ca-13531336-b-c",approx:true,detail:L("Construcción del complejo de Atón antes de Ajetatón.","Construction of the Aten complex before Akhetaten.","Construction du complexe d’Aton avant Akhetaton.")},
   {year:-1348,lane:"events",title:L("Año 5 · primera proclamación de Ajetatón","Year 5 · first proclamation of Akhetaten","An 5 · première proclamation d’Akhetaton"),source:"Amarna Project · Stelae K, M, X",url:"https://www.amarnaproject.com/amarna-the-place/boundary-stelae/",approx:true,detail:L("Consagración de una nueva ciudad a Atón; UCL propone el año 6.","Dedication of a new city to Aten; UCL proposes year 6.","Consécration d’une ville à Aton ; UCL propose l’an 6.")},
   {year:-1347,lane:"events",title:L("Año 6 · segunda proclamación","Year 6 · second proclamation","An 6 · seconde proclamation"),source:"Amarna Project / UCL Digital Egypt",url:"https://www.amarnaproject.com/amarna-the-place/boundary-stelae/",approx:true,detail:L("Segunda proclamación de las estelas fronterizas.","Second proclamation of the boundary stelae.","Seconde proclamation des stèles frontières.")},
   {year:-1345,lane:"events",title:L("Año 8 · reafirmación del juramento fronterizo","Year 8 · renewal of the boundary oath","An 8 · renouvellement du serment frontalier"),source:"Amarna Project",url:"https://www.amarnaproject.com/amarna-the-place/boundary-stelae/",approx:true,detail:L("Se añade una reafirmación a la segunda proclamación.","A reaffirmation is added to the second proclamation.","Une réaffirmation est ajoutée à la seconde proclamation.")},
   {year:-1344,end:-1341,lane:"events",title:L("Años 9–12 · nueva formulación del nombre de Atón","Years 9–12 · new form of Aten’s name","Ans 9–12 · nouvelle formulation du nom d’Aton"),source:"The Met",url:"https://www.metmuseum.org/essays/art-architecture-and-the-city-in-the-reign-of-amenhotep-iv-akhenaten-ca-13531336-b-c",approx:true,detail:L("La nueva formulación se fecha entre los años 9 y 12; las medidas contra Amón pudieron coincidir.","New wording dated between years 9 and 12; measures against Amun may have coincided.","Nouvelle formulation datée des ans 9 à 12 ; les mesures contre Amon ont pu coïncider.")},
   {year:-1341,lane:"events",title:L("Año 12 · recepción de tributos extranjeros","Year 12 · reception of foreign tribute","An 12 · réception des tributs étrangers"),source:"ISAC · University of Chicago · Huya y Meryra II",url:"https://isac.uchicago.edu/sites/default/files/uploads/shared/docs/LongCoregency.pdf",approx:true,detail:L("Las escenas conservan una fecha del año regnal 12.","The scenes preserve a date in regnal year 12.","Les scènes conservent une date de l’an 12.")},
   {year:-1348,end:-1347,lane:"life",title:L("Años 5–6 · adopción del nombre Akenatón","Years 5–6 · adoption of the name Akhenaten","Ans 5–6 · adoption du nom Akhenaton"),source:"The Met · reinado de Amenhotep IV",url:"https://www.metmuseum.org/essays/art-architecture-and-the-city-in-the-reign-of-amenhotep-iv-akhenaten-ca-13531336-b-c",approx:true,detail:L("Sustituye el nombre teóforo de Amón por uno dedicado a Atón; el momento exacto se discute.","The Amun-related name gives way to an Aten-related one; exact timing debated.","Le nom lié à Amon cède la place à celui lié à Aton ; date précise discutée.")},
   {year:-1340,end:-1339,lane:"life",title:L("Años 13–14 · muerte de Meketatón","Years 13–14 · death of Meketaten","Ans 13–14 · mort de Méketaton"),source:"Trabajos de Egiptología 13 (2022)",url:"https://www.ull.es/revistas/index.php/trabajos-egiptologia/fr_CA/article/download/4975/3959/17313",approx:true,detail:L("Datación aproximada; escenas de duelo en la tumba real.","Approximate dating; mourning scenes in the royal tomb.","Datation approximative ; scènes de deuil dans la tombe royale.")},
   {year:-1339,lane:"life",title:L("Año 14 · muerte atribuida a la reina Tiy","Year 14 · attributed death of Queen Tiye","An 14 · mort attribuée à la reine Tiyi"),source:"UCLA Encyclopedia of Egyptology",url:"https://escholarship.org/content/qt77s6r0zr/qt77s6r0zr.pdf?v=lg",approx:true,detail:L("Cronología propuesta en la bibliografía, no fecha absoluta certificada.","Proposed scholarly chronology, not a certified absolute date.","Chronologie proposée par la recherche, sans date absolue certifiée.")},
   {year:-1337,lane:"events",title:L("Año 16 · inscripción de Dayr Abu Hinnis","Year 16 · Dayr Abu Hinnis inscription","An 16 · inscription de Dayr Abu Hinnis"),source:"KU Leuven · Athena Van der Perre",url:"https://www.arts.kuleuven.be/dayr-al-barsha/news/year-16-graffito-nefertiti",approx:true,detail:L("Atestigua que Nefertiti conservaba el título de gran esposa real en el año 16.","Attests Nefertiti as Great Royal Wife in year 16.","Atteste le titre de grande épouse royale de Néfertiti en l’an 16.")},
   {year:-1336,lane:"life",title:L("Muerte de Akenatón · fin de la línea biográfica","Death of Akhenaten · end of biography","Mort d'Akhenaton · fin de la chronologie"),
    source:"PBS · Egypt's Golden Empire; cronología aproximada",url:pbs,approx:true,
    detail:L("Muerte hacia 1336 a. C., tras un reinado de alrededor de diecisiete años. La edad exacta al morir no está establecida con certeza.","Approximate death around 1336 BCE; exact age unknown.","Décès vers 1336 av. J.-C.; âge exact incertain.")}
  ];
 }
 // Generic chronology from explicit temporal qualifiers and source records.
 // Wikidata is a discovery authority, not an independent primary source.
 const datedRelationLabels={
  P39:["Cargo","Position","Fonction"],P26:["Matrimonio","Marriage","Mariage"],
  P69:["Estudios","Education","Études"],P108:["Actividad profesional","Employment","Activité professionnelle"],
  P166:["Distinción","Award","Distinction"],P793:["Acontecimiento significativo","Significant event","Événement marquant"],
  P607:["Participación en conflicto","Conflict participation","Participation à un conflit"],
  P937:["Lugar de trabajo","Work location","Lieu de travail"],P54:["Equipo","Team","Équipe"],
  P102:["Afiliación política","Political affiliation","Affiliation politique"],P463:["Pertenencia","Membership","Appartenance"],
  P551:["Residencia","Residence","Résidence"],P1416:["Afiliación","Affiliation","Affiliation"],
  P1344:["Participación","Participation","Participation"],P800:["Obra destacada","Notable work","Œuvre notable"],
  P509:["Causa de muerte","Cause of death","Cause du décès"],P119:["Sepultura","Burial","Sépulture"]
 };
 const datedDirectLabels={
  P569:["life","Nacimiento","Birth","Naissance"],P570:["life","Muerte","Death","Décès"],
  P571:["life","Fundación o inicio","Foundation or inception","Fondation ou début"],P576:["life","Disolución o final","Dissolution or end","Dissolution ou fin"],
  P585:["events","Acontecimiento fechado","Dated event","Événement daté"],P580:["events","Comienzo del acontecimiento","Event begins","Début de l’événement"],
  P582:["events","Final del acontecimiento","Event ends","Fin de l’événement"],P577:["works","Publicación documentada","Documented publication","Publication attestée"],
  P575:["events","Descubrimiento","Discovery","Découverte"],P1619:["works","Inauguración","Opening","Inauguration"]
 };
 function datedAuthorityEvents(authority,labels={}){
  if(!/^Q\d+$/.test(authority?.wikidataId||""))return [];
  const out=[];
  for(const c of authority.temporalClaims||[]){
   const direct=datedDirectLabels[c.property],relation=datedRelationLabels[c.property];
   if(!direct&&!relation)continue;
   const refUrls=[...new Set((c.references||[]).flatMap(r=>r.urls||[]).filter(normUrl))];
   const refIds=[...new Set((c.references||[]).flatMap(r=>r.statedIn||[]).filter(x=>/^Q\d+$/.test(x)))];
   const referenceLinks=[...refUrls,...refIds.map(id=>"https://www.wikidata.org/wiki/"+id)];
   const stmt="https://www.wikidata.org/wiki/"+authority.wikidataId+"#"+encodeURIComponent(String(c.statementId||"").replace("$","-"));
   const source="Wikidata · "+c.property+" · "+(referenceLinks.length?L("con referencias","with references","avec références"):L("sin referencia enlazada","without linked reference","sans référence liée"));
   const detail=L("Dato estructurado de autoridad: comprobar la fuente, la precisión y el calendario antes de citar. No equivale a una verificación historiográfica independiente.","Structured authority data: check source, precision and calendar before citing. Not independent historical verification.","Donnée structurée d’autorité : vérifier la source, la précision et le calendrier avant citation. Ne vaut pas validation historique indépendante.");
   const add=(date,title,lane,end=null)=>{
    if(year(date?.year)===null||date.year===0)return;
    out.push({year:date.year,end:end&&year(end.year)!==null&&end.year>=date.year?end.year:null,title,lane,source,url:stmt,referenceLinks,detail,approx:Boolean(date.before||date.after),authorityEvidence:true});
   };
   if(direct){
    for(const date of c.dates||[])add(date,L(...direct.slice(1)),direct[0]);
    continue;
   }
   const label=labels[c.objectId];if(!label)continue; // Never show a bare QID as an historical event.
   const title=L(...relation)+" · "+label;
   const q=c.qualifier||{},starts=q.P580||[],ends=q.P582||[],points=q.P585||[];
   const lane=c.property==="P800"?"works":["P793","P607","P1344","P509","P119"].includes(c.property)?"events":"life";
   // A range is emitted only for unambiguous start/end pairing within the same statement.
   if(starts.length===1&&ends.length===1&&ends[0].year>=starts[0].year)add(starts[0],title,lane,ends[0]);
   else {
    for(const d of starts)add(d,title+" · "+L("inicio","start","début"),lane);
    for(const d of ends)add(d,title+" · "+L("final","end","fin"),lane);
   }
   for(const d of points)add(d,title,lane);
  }
  return out;
 }
 async function getDatedLabels(authority,language){
  const ids=[...new Set((authority?.temporalClaims||[]).map(c=>c.objectId).filter(id=>/^Q\d+$/.test(id||"")))];
  const labels={};
  // Batch requests; the batching size is an API constraint, not a cap on milestones.
  for(let i=0;i<ids.length;i+=40){
   const params=new URLSearchParams({action:"wbgetentities",ids:ids.slice(i,i+40).join("|"),props:"labels",languages:[...new Set([language,"en"])].join("|"),format:"json",origin:"*"});
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),5500);
   try{
    const r=await fetch("https://www.wikidata.org/w/api.php?"+params,{signal:ctrl.signal});
    if(!r.ok)continue;
    const data=await r.json();
    for(const [id,record] of Object.entries(data.entities||{})){
     const label=record.labels?.[language]?.value||record.labels?.en?.value;
     if(label)labels[id]=label;
    }
   }catch{}finally{clearTimeout(timer)}
  }
  return labels;
 }
 function collect(){
  const historical=hasHistoricalSubject();
  if(isAbstractTerm()||!historical&&!state.rows.some(r=>r.timelineWorkMatch===true&&recordYear(r)!==null))return []; // Only authority or explicitly associated catalogue records.
  let ev=isAkhenaten()?akhenatenEvents():isNero()?neroEvents():[],a=state.authority;
  if(historical&&Array.isArray(a?.temporalClaims))ev.push(...datedAuthorityEvents(a,state.datedLabels).filter(e=>!((isNero()||isAkhenaten())&&e.lane==="life"&&/P569|P570/.test(e.source))));
  // All Wikidata authority properties keep their distinct meanings.
  if(historical&&a&&!Array.isArray(a.temporalClaims)&&/^Q\d+$/.test(a.wikidataId||"")){
   const metadata=[
    ["birthYear","life",L("Nacimiento","Birth","Naissance"),"P569"],
    ["deathYear","life",L("Muerte","Death","Décès"),"P570"],
    ["inceptionYear","life",L("Fundación o inicio","Foundation or inception","Fondation ou début"),"P571"],
    ["dissolutionYear","life",L("Disolución o final","Dissolution or end","Dissolution ou fin"),"P576"],
    ["eventYear","events",L("Acontecimiento fechado","Dated event","Événement daté"),"P585"],
    ["startYear","events",L("Comienzo del acontecimiento","Event begins","Début de l'événement"),"P580"],
    ["endYear","events",L("Final del acontecimiento","Event ends","Fin de l'événement"),"P582"],
    ["publicationYear","works",L("Publicación documentada","Documented publication","Publication attestée"),"P577"],
    ["discoveryYear","events",L("Descubrimiento","Discovery","Découverte"),"P575"],
    ["openingYear","works",L("Inauguración","Opening","Inauguration"),"P1619"]
   ];
   const url="https://www.wikidata.org/wiki/"+a.wikidataId;
   for(const [field,lane,title,p] of metadata){
    const y=year(a[field]);if(y==null||isNero()&&["birthYear","deathYear"].includes(field))continue;
    ev.push({year:y,lane,title,source:"Wikidata · "+p,url,
      detail:L("Fecha registrada en la ficha de autoridad ("+p+"). Debe cotejarse la precisión y la referencia del enunciado antes de utilizarla como prueba historiográfica.",
       "Date recorded in the authority record ("+p+"). Verify the statement's precision and references before scholarly use.",
       "Date inscrite dans la notice d'autorité ("+p+"). Vérifier précision et sources.")});
   }
  }
  // Attributed cultural works: source relation and typed date, not editorial importance.
  for(const w of state.works){
   const y=year(w.year);if(y==null||!/^Q\d+$/.test(w.id||""))continue;
   const type=String(w.dateKind||"undated"),property=String(w.dateProperty||"");
   ev.push({year:y,lane:"works",title:w.title,url:"https://www.wikidata.org/wiki/"+w.id,
    source:"Wikidata · "+(property||type),
    detail:String(w.description||L("Obra atribuida por relaciones del catálogo.","Work attributed by catalogue relationships.","Œuvre attribuée par les relations du catalogue.")).slice(0,350)+
     " · "+L("Fecha catalogada: ","Catalogued date: ","Date cataloguée : ")+type+
     ". "+L("El registro no demuestra una atribución historiográfica independiente.","The record is not independent proof of attribution.","La notice ne prouve pas à elle seule l'attribution."),
    image:normUrl(w.image)});
  }
  // Recorded album releaseDate is an edition's date, potentially a reissue.
  for(const a of state.albums){
   const y=documentedYear(String(a.releaseDate||"").slice(0,4));
   if(year(y)==null||!normUrl(a.url))continue;
   ev.push({year:y,lane:"documents",title:a.title,url:a.url,source:"Apple Music · catálogo de ediciones",
    detail:L("Fecha de edición en el catálogo musical. Puede corresponder a una reedición; no se presenta como año de lanzamiento original.",
     "Music catalogue edition date. It may refer to a reissue; not necessarily first release.",
     "Date d'une édition musicale, parfois une réédition ; pas nécessairement la sortie originale."),
    image:normUrl(a.image)});
  }
  // Documents are not biographical milestones. Require strong title match.
  // Excepción razonada: un testimonio manuscrito o una edición del propio
  // catálogo, con su datación catalogada, pertenece a la cronología de lo que
  // se buscó aunque su título no repita la consulta —«Harley MS 2767» no dice
  // «Vitruvio»—. Son datos catalogados con fuente, no inferencias a partir del
  // orden de los resultados, y se rotulan como lo que son. Sin esta excepción
  // la cronología dependía por completo de que respondiera Wikidata.

  for(const r of state.rows){
   if(!["book","openlibrary","googlebook","article","edition","manuscript","fragment"].includes(r.type))continue;
   const catalogued=["edition","manuscript","fragment"].includes(r.type)&&r.timelineWorkMatch===true;
   if(!catalogued&&(!historical||!matchedTitle(state.query,r.title)))continue;
   const y=recordYear(r);
   if(y===null||!recordUrl(r.link))continue;
   ev.push({year:y,lane:"documents",title:r.title,url:r.link,source:String(r.source||"Catálogo").slice(0,80),
    detail:catalogued?
     L("Datación catalogada de un testimonio o edición de la obra consultada. Es la fecha del soporte o de la edición, no la de composición del texto ni un hito biográfico; la precisión depende de la ficha del catálogo.",
      "Catalogued date of a witness or edition of the work consulted. It is the date of the artefact or edition, not of the text's composition, and its precision depends on the catalogue record.",
      "Date catalographique d'un témoin ou d'une édition de l'œuvre consultée. Date du support ou de l'édition, non de la composition du texte."):
     L("Fecha del documento o edición recuperada. No debe confundirse con el acontecimiento que estudia ni con la fecha de composición de una obra antigua.",
      "Record or edition date, not the date of the event it studies or the composition of an ancient text.",
      "Date de la notice ou de l'édition, distincte de l'événement étudié et de la composition de l'œuvre.")});
  }
  const seen=new Set();
  ev=ev.map(event).filter(Boolean).filter(e=>{
   const key=normalize(e.title)+"|"+e.year+"|"+e.lane+"|"+(e.end??"")+"|"+(e.authorityEvidence?e.url:"");
   if(seen.has(key))return false;seen.add(key);return true
  }).sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title));
  return ev;
 }
 function highlightButton(button,detail,event){
  for(const active of root.querySelectorAll(".vat-event[aria-pressed=true]"))active.setAttribute("aria-pressed","false");
  button.setAttribute("aria-pressed","true");
  state.selected=[event.title,event.year,event.lane,event.end??"",event.authorityEvidence?event.url:""].join("|");
  const heading=el("h4",null,(event.approx?"c. ":"")+showYear(event.year)+" · "+event.title);
  const body=el("p",null,event.detail);
  const source=el("small","vat-evidence",event.source||L("Registro original","Source record","Notice source"));
  const link=el("a","vat-source-link",L("Consultar fuente y metadatos","Open source and metadata","Consulter la source"));
  link.href=event.url;link.target="_blank";link.rel="noopener noreferrer";
  const contents=el("div","vat-detail-text");contents.append(heading,body,source,link);
  for(const u of event.referenceLinks||[]){
   const a=el("a","vat-source-link",L("Referencia registrada","Recorded reference","Référence enregistrée")+" · "+new URL(u).hostname);
   a.href=u;a.target="_blank";a.rel="noopener noreferrer";contents.append(a);
  }
  detail.replaceChildren();
  if(event.image){
   const img=el("img","vat-detail-image");img.src=event.image;img.alt=event.title;
   img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
   img.onerror=()=>img.remove();detail.append(img)
  }
  detail.append(contents);detail.hidden=false;
 }
 let panDrag=null,panFrame=0;
 function draw(force=false){
  if(panDrag&&!force)return;
  if(!state.query){root.hidden=true;root.replaceChildren();return}
  const events=collect();
  root.replaceChildren();root.hidden=false;
  const head=el("div","vat-header");
  const left=el("div","vat-title");
  left.append(el("h2",null,L("Cronología interactiva","Interactive chronology","Chronologie interactive")));
  left.append(el("p",null,state.authority?.canonical||state.authority?.catalogName||state.query));
  const controls=el("div","vat-controls");
  const prev=el("button",null,"←"),next=el("button",null,"→");
  const zoomOut=el("button",null,"−"),zoomIn=el("button",null,"+");
  prev.type=next.type="button";
  prev.setAttribute("aria-label",L("Retroceder","Previous dates","Dates précédentes"));
  next.setAttribute("aria-label",L("Avanzar","Next dates","Dates suivantes"));
  zoomOut.type=zoomIn.type="button";
  zoomOut.setAttribute("aria-label",L("Alejar cronología","Zoom out timeline","Dézoomer la chronologie"));
  zoomIn.setAttribute("aria-label",L("Acercar cronología","Zoom in timeline","Zoomer la chronologie"));
  zoomOut.title=L("Reducir escala","Reduce scale","Réduire l’échelle");
  zoomIn.title=L("Ampliar escala","Increase scale","Agrandir l’échelle");
  const colors=el("label","vat-color-control",L("Color de etiquetas","Label color","Couleur des étiquettes"));
  const colorInput=el("input");colorInput.type="color";colorInput.value=state.tagColor||"#d4e5f2";colorInput.setAttribute("aria-label",L("Elegir color de las etiquetas","Choose label color","Choisir la couleur des étiquettes"));
  const varied=el("button",null,L("Variados","Mixed","Variées"));varied.type="button";varied.title=L("Restaurar colores pastel variados","Restore assorted pastel colors","Rétablir les couleurs pastel");
  colors.append(colorInput);controls.append(colors,varied,prev,zoomOut,zoomIn,next);
  root.classList.toggle("vat-custom-color",Boolean(state.tagColor));
  if(state.tagColor)root.style.setProperty("--vat-user-color",state.tagColor);
  else root.style.removeProperty("--vat-user-color");
  colorInput.addEventListener("input",()=>{state.tagColor=colorInput.value;root.classList.add("vat-custom-color");root.style.setProperty("--vat-user-color",state.tagColor)});
  varied.addEventListener("click",()=>{state.tagColor=null;root.classList.remove("vat-custom-color");root.style.removeProperty("--vat-user-color")});
  left.append(el("small","vat-subtitle",isAkhenaten()?L(
    "Vida aproximada · c. 1370–1336 a. C. · sin publicaciones posteriores",
    "Approximate lifetime · c. 1370–1336 BCE · no later publications",
    "Vie approximative · v. 1370–1336 av. J.-C. · sans publications postérieures"):L(
    "Fechas documentadas · obras · ediciones · fuentes",
    "Documented dates · works · editions · sources",
    "Dates documentées · œuvres · éditions · sources")));
  head.append(left,controls);root.append(head);
  const method=el("p","vat-method",L(
   "Cada hito abre una ficha de lectura y su fuente. Los años de una edición no representan necesariamente la creación de la obra ni el acontecimiento histórico.",
   "Select a milestone to read its record. Edition dates do not necessarily indicate first publication or historical events.",
   "Chaque jalon ouvre sa notice. Les dates d'édition ne sont pas nécessairement celles des œuvres ou des événements."));
  if(isAkhenaten())method.textContent=L(
    "Escala biográfica exclusivamente hasta la muerte aproximada. El nacimiento es estimado y los años absolutos del reinado pueden variar según la cronología egiptológica. Libros y estudios modernos no son hitos biográficos.",
    "Biographical scale stops at approximate death. Birth and absolute reign dates are uncertain; modern studies are excluded.",
    "L'échelle biographique s'arrête au décès approximatif. Dates discutées; les études modernes sont exclues.");
  root.append(method);
  if(!events.length){
   root.hidden=true;root.replaceChildren();return; // No timeline without documented milestones for a historical entity.
   const empty=el("p","vat-empty",L(
    "Todavía no se recuperaron acontecimientos con fecha y fuente acreditada para esta consulta. Los demás resultados del buscador siguen disponibles.",
    "No sourced dated records have been retrieved for this query yet. Other search results remain available.",
    "Aucun jalon daté avec source pour cette recherche ; les autres résultats restent disponibles."));
   root.append(empty);return;
  }
  // In biographies the documentary axis ends at death. Posthumous
  // editions remain reachable, but cannot distort a lifetime into millennia.
  const born=isAkhenaten()?akhenatenBounds.birth:isNero()?neroBounds.birth:year(state.authority?.birthYear);
  const died=isAkhenaten()?akhenatenBounds.death:isNero()?neroBounds.death:year(state.authority?.deathYear);
  const lifeScope=born!==null&&died!==null&&died>=born?{born,died}:null;
  const inBiography=e=>e.lane!=="documents"&&e.year>=lifeScope.born&&e.year<=lifeScope.died;
  const visibleEvents=lifeScope?events.filter(inBiography):events;
  const outsideEvents=lifeScope?events.filter(e=>!inBiography(e)):[];
  const minYear=visibleEvents[0]?.year??events[0].year;
  const maxYear=Math.max(...(visibleEvents.length?visibleEvents:events).map(e=>e.end??e.year));
  const span=Math.max(1,maxYear-minYear),padding=lifeScope?0:Math.max(1,Math.ceil(span*.04));
  const fullLow=lifeScope?lifeScope.born:minYear-padding;
  const fullHigh=lifeScope?lifeScope.died:maxYear+padding;
  const zoom=state.zoom??(lifeScope||isNero()||isAkhenaten()?1:automaticZoom(fullHigh-fullLow));
  const {low,high,range,travel}=dateWindow(fullLow,fullHigh,zoom,state.position);
  const windowEvents=visibleEvents.filter(e=>e.year>=low&&e.year<=high);
  const eventKey=e=>[e.title,e.year,e.lane,e.end??"",e.authorityEvidence?e.url:""].join("|");
  const allStops=visibleEvents.slice().sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title));
  // Size the axis from the actual available content box. No 250px
  // minimum canvas and no fixed 960px map overflowing mobile readers.
  const cs=typeof getComputedStyle==="function"?getComputedStyle(root):{paddingLeft:"0",paddingRight:"0"};
  const outer=Number(root.clientWidth)||Number(root.getBoundingClientRect?.().width)||760;
  const available=Math.max(1,Math.floor(outer)-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0)-3);
  const labelWidth=Math.min(Math.round(available*.33),available<420?88:available<740?124:170);
  const mapWidth=Math.max(1,available-labelWidth-2);
  const cardWidth=Math.min(134,Math.max(1,mapWidth-12));
  root.style.setProperty("--vat-label-width",labelWidth+"px");
  root.style.setProperty("--vat-card-width",cardWidth+"px");
  const viewport=el("div","vat-viewport");viewport.tabIndex=0;
  viewport.setAttribute("aria-label",L("Cronología adaptada al ancho del visor","Chronology fitted to reader width","Chronologie adaptée à la largeur du lecteur"));
  const map=el("div","vat-map");map.style.width=available+"px";
  const axis=el("div","vat-axis");
  const ticks=Math.max(1,Math.min(range,9,Math.floor(mapWidth/120)));
  for(let i=0;i<=ticks;i++){
   const y=Math.round(low+i*range/ticks);
   const tick=el("span","vat-tick",showYear(y));
   tick.style.left=(i/ticks*100)+"%";axis.append(tick)
  }
  map.append(axis);
  const detail=el("div","vat-detail");detail.hidden=true;detail.setAttribute("aria-live","polite");
  const stops=[];
  for(const [lane,[label,icon]] of Object.entries(types)){
   const items=windowEvents.filter(x=>x.lane===lane);if(!items.length)continue;
   const band=el("section","vat-band");band.setAttribute("aria-label",label);
   const title=el("div","vat-band-title");title.append(el("span","vat-icon",icon),el("strong",null,label));
   const laneBody=el("div","vat-band-body");
   const track=el("div","vat-track");track.style.width=mapWidth+"px";
   const preview=el("div","vat-peek");preview.hidden=true;
   preview.setAttribute("aria-live","polite");
   function previewEvent(e){
    preview.replaceChildren(
     el("span","vat-peek-year",(e.approx?"c. ":"")+showYear(e.year)),
     el("strong",null,e.title),
     el("p",null,e.detail.slice(0,280))
    );
    preview.hidden=false;
   }
   const line=el("div","vat-line");track.append(line);
   const positioned=layoutMarkers(items,low,range,mapWidth,1);
   let levelMax=0;
   for(const {event:e,center,level,popupWidth,shift} of positioned){
    levelMax=Math.max(levelMax,level);
    const button=el("button","vat-event");
    button.type="button";button.setAttribute("aria-pressed","false");
    button.classList.add("vat-event-marker");
    button.style.left=center+"px";button.style.top=(23+level*40)+"px";
    button.style.setProperty("--vat-popup-width",popupWidth+"px");
    button.style.setProperty("--vat-popup-shift",shift+"px");
    button.setAttribute("aria-label",(e.approx?"c. ":"")+showYear(e.year)+" · "+e.title);
    button.title=L("Pasar el mouse o pulsar para ver la ficha","Hover or select to see the record","Survoler ou sélectionner pour voir la notice");
    const popup=el("span","vat-event-pop");
    popup.append(el("span","vat-year",(e.approx?"c. ":"")+showYear(e.year)));
    popup.append(el("strong",null,e.title));
    if(e.end!=null&&e.end!==e.year){
     const dur=el("span","vat-duration","– "+showYear(e.end));popup.append(dur);
    }
    button.append(popup);
    button.addEventListener("mouseenter",()=>previewEvent(e));
    button.addEventListener("focus",()=>previewEvent(e));
    button.addEventListener("mouseleave",()=>{preview.hidden=true});
    button.addEventListener("blur",()=>{preview.hidden=true});
    button.addEventListener("click",()=>{
     highlightButton(button,detail,e);
     detail.scrollIntoView?.({behavior:"smooth",block:"nearest"});
    });
    stops.push({button,event:e});
    const key=eventKey(e);
    if(key===state.selected)queueMicrotask(()=>{if(button.isConnected)highlightButton(button,detail,e)});
    track.append(button);
   }
   track.style.height=(72+levelMax*40)+"px";
   laneBody.append(track,preview);
   band.append(title,laneBody);map.append(band);
  }
  if(!windowEvents.length)map.append(el("p","vat-empty",L("No hay hitos documentados en este intervalo. Desplace la escala para explorar otras fechas.","No documented milestones in this interval. Move the scale to explore other dates.","Aucun jalon documenté dans cet intervalle. Déplacez l’échelle pour explorer d’autres dates.")));
  viewport.append(map);root.append(viewport);
  const pan=el("label","vat-pan");
  pan.style.cssText="display:grid;gap:6px;margin:12px 0;font:12px/1.5 system-ui,sans-serif";
  const panLabel=el("span",null,L("Período visible","Visible period","Période visible")+": "+showYear(low)+" – "+showYear(high));
  const slider=el("input");slider.type="range";slider.min="0";slider.max="1000";slider.step="1";
  slider.value=String(Math.round(state.position*1000));slider.disabled=fullHigh-fullLow<=1;
  slider.setAttribute("aria-label",L("Desplazar período cronológico","Pan chronology period","Déplacer la période chronologique"));
  slider.setAttribute("aria-valuetext",showYear(low)+" – "+showYear(high));
  slider.style.cssText="width:100%;margin:0;accent-color:#879da9";
  const navigationZoom=travel>0?zoom:2;
  slider.addEventListener("input",()=>{
   const w=dateWindow(fullLow,fullHigh,navigationZoom,Number(slider.value)/1000);
   panLabel.textContent=L("Período visible","Visible period","Période visible")+": "+showYear(w.low)+" – "+showYear(w.high);
   slider.setAttribute("aria-valuetext",showYear(w.low)+" – "+showYear(w.high));
  });
  slider.addEventListener("change",()=>{
   state.zoom=navigationZoom;state.position=Number(slider.value)/1000;
   const focused=document.activeElement===slider;
   draw();if(focused)root.querySelector(".vat-pan input")?.focus({preventScroll:true});
  });
  // Capture the pointer on the persistent root, not the recreated slider.
  // Repaint the actual date window during dragging, including touch.
  slider.style.touchAction="none";
  slider.addEventListener("pointerdown",e=>{
   if(slider.disabled||e.button!==0)return;
   e.preventDefault();
   const rect=slider.getBoundingClientRect();
   panDrag={id:e.pointerId,left:rect.left,width:Math.max(1,rect.width),zoom:navigationZoom};
   root.setPointerCapture?.(e.pointerId);
   updatePan(e);
  });
  const extent=el("span","vat-pan-extent");extent.style.cssText="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap";
  extent.append(el("span",null,showYear(fullLow)),el("span",null,L("Período completo","Full period","Période complète")+" · "+windowEvents.length+"/"+visibleEvents.length+" "+L("hitos","milestones","jalons")),el("span",null,showYear(fullHigh)));
  if(!travel&&fullHigh-fullLow>1)panLabel.textContent+=" · "+L("Arrastre para ampliar y desplazarse","Drag to zoom and pan","Glissez pour zoomer et déplacer");
  pan.append(panLabel,slider,extent);
  if(isNero()){
   const phases=el("div","vat-phase-navigation");phases.style.cssText="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px";
   for(const [label,from,to] of [
    [L("Vida completa","Full lifetime","Vie complète"),37,68],
    [L("Juventud y sucesión","Youth and succession","Jeunesse et succession"),37,53],
    [L("Primer reinado","Early reign","Début du règne"),54,61],
    [L("Crisis y reconstrucción","Crisis and rebuilding","Crise et reconstruction"),62,65],
    [L("Últimos años","Final years","Dernières années"),66,68]
   ]){
    const button=el("button",null,label+" · "+from+"–"+to);button.type="button";
    button.style.cssText="font:inherit;padding:6px 9px;border:1px solid #777;border-radius:5px;color:inherit;background:transparent;cursor:pointer";
    button.onclick=()=>{const z=Math.max(1,Math.min(8,(fullHigh-fullLow)/Math.max(1,to-from)));const w=dateWindow(fullLow,fullHigh,z,0);state.zoom=z;state.position=w.travel?Math.max(0,Math.min(1,(from-fullLow)/w.travel)):0;draw()};
    phases.append(button);
   }
   pan.append(phases);
  }
  root.append(pan,detail);
  const catalog=el("details","vat-chronological-list");
  catalog.open=state.listOpen===true;
  catalog.addEventListener("toggle",()=>{state.listOpen=catalog.open});
  catalog.append(el("summary",null,L("Lista cronológica completa","Complete chronological list","Liste chronologique complète")+" · "+visibleEvents.length+" "+L("hitos","milestones","jalons")));
  const entries=el("ol");entries.style.cssText="margin:10px 0;padding-left:24px;max-height:480px;overflow:auto";
  for(const e of visibleEvents){
   const li=el("li");li.style.cssText="padding:5px 0;line-height:1.5";
   const title=(e.approx?"c. ":"")+showYear(e.year)+(e.end!==null&&e.end!==undefined&&e.end!==e.year?" – "+showYear(e.end):"")+" · "+e.title;
   const a=el("a",null,title);a.href=e.url;a.target="_blank";a.rel="noopener noreferrer";
   const meta=el("small",null," · "+(e.source||""));meta.style.opacity=".8";
   li.append(a,meta);entries.append(li);
  }
  catalog.append(entries);root.append(catalog);
  if(lifeScope&&outsideEvents.length){
   const extra=el("details","vat-outside");
   extra.append(el("summary",null,L(
    "Documentos y registros separados de la biografía ("+outsideEvents.length+")",
    "Documents and records separate from the biography ("+outsideEvents.length+")",
    "Documents et notices hors du récit biographique ("+outsideEvents.length+")")));
   const list=el("ul","vat-outside-list");
   for(const e of outsideEvents){
    const li=el("li");
    const link=el("a",null,showYear(e.year)+" · "+e.title);
    link.href=e.url;link.target="_blank";link.rel="noopener noreferrer";
    li.append(link);list.append(li);
   }
   extra.append(list);root.append(extra);
  }
  stops.sort((a,b)=>a.event.year-b.event.year||a.event.title.localeCompare(b.event.title));
  function navigate(direction){
   const current=allStops.findIndex(e=>eventKey(e)===state.selected);
   const index=current<0?(direction>0?0:allStops.length-1):Math.max(0,Math.min(allStops.length-1,current+direction));
   const target=allStops[index];if(!target)return;
   const nextStop=stops.find(item=>eventKey(item.event)===eventKey(target));
   if(nextStop){
    highlightButton(nextStop.button,detail,nextStop.event);
    nextStop.button.focus?.({preventScroll:true});
   }else if(travel>0){
    state.zoom=zoom;state.position=Math.max(0,Math.min(1,(target.year-fullLow-range/2)/travel));
    state.selected=eventKey(target);draw();
    queueMicrotask(()=>root.querySelector('.vat-event[aria-pressed="true"]')?.focus({preventScroll:true}));
   }
  }
  prev.title=L("Hito anterior","Previous milestone","Jalon précédent");
  next.title=L("Hito siguiente","Next milestone","Jalon suivant");
  zoomOut.disabled=zoom===1;zoomIn.disabled=zoom>=8||range<=1;
  prev.disabled=next.disabled=!allStops.length;
  zoomOut.onclick=()=>{state.zoom=Math.max(1,zoom/2);draw()};
  zoomIn.onclick=()=>{state.zoom=Math.min(8,zoom*2);draw()};
  prev.onclick=()=>navigate(-1);
  next.onclick=()=>navigate(1);
  viewport.addEventListener("keydown",e=>{
   if(e.target!==viewport||!["ArrowLeft","ArrowRight"].includes(e.key))return;
   e.preventDefault();navigate(e.key==="ArrowRight"?1:-1);
  });
 }
 function updatePan(e){
  if(!panDrag||e.pointerId!==panDrag.id)return;
  state.zoom=panDrag.zoom;
  state.position=Math.max(0,Math.min(1,(e.clientX-panDrag.left)/panDrag.width));
  if(!panFrame)panFrame=requestAnimationFrame(()=>{panFrame=0;draw(true)});
 }
 root.addEventListener("pointermove",updatePan);
 function endPan(e){
  if(!panDrag||e.pointerId!==panDrag.id)return;
  if(e.type==="pointerup")updatePan(e);
  panDrag=null;if(panFrame){cancelAnimationFrame(panFrame);panFrame=0}
  if(root.hasPointerCapture?.(e.pointerId))root.releasePointerCapture(e.pointerId);
  draw(true);root.querySelector(".vat-pan input")?.focus({preventScroll:true});
 }
 root.addEventListener("pointerup",endPan);
 root.addEventListener("pointercancel",endPan);
 root.addEventListener("lostpointercapture",endPan);
 // Redraw only when the available width changes, not when card height grows.
 let fittedWidth=0;
 if(typeof ResizeObserver!=="undefined"){
  new ResizeObserver(entries=>{
   const width=Math.round(entries[0]?.contentRect?.width||0);
   if(!width||Math.abs(width-fittedWidth)<2)return;
   fittedWidth=width;
   if(!root.hidden&&state.query)requestAnimationFrame(()=>{if(!root.hidden)draw()});
  }).observe(root);
 }else{
  window.addEventListener("resize",()=>{if(!root.hidden&&state.query)draw()},{passive:true});
 }
 function reset(q){
  panDrag=null;if(panFrame){cancelAnimationFrame(panFrame);panFrame=0}
  state.token++;state.query=String(q||"").trim().slice(0,160);state.zoom=null;state.position=0;
  state.authority=null;state.listOpen=false;state.datedLabels={};state.works=[];state.albums=[];state.rows=[];state.selected="";state.rowSignature="";state.pendingWorks=null;
  place();draw();
  if(!state.query)return;
  const token=state.token;
  resolveAuthority(state.query).then(a=>{
   if(token!==state.token||!a)return;
   state.authority=a;
   getDatedLabels(a,lang()).then(labels=>{if(token!==state.token)return;state.datedLabels=labels;draw()});
   const pending=state.pendingWorks;
   if(pending&&pending.wikidataId===a.wikidataId)state.works=pending.works;
   draw();
  });
 }
 /* La resolución de la entidad se guarda durante la sesión: repetir una
    consulta no tiene por qué esperar otra vez a la red, que es lo que hacía
    que la cronología apareciera unas veces y otras no. Si la primera llamada
    vuelve vacía se reintenta una sola vez: la mayoría de los fallos son de
    red, no de la entidad. */
 const AUTHORITY_TTL=3600000;
 function cachedAuthority(key){
  try{
   const raw=sessionStorage.getItem("vat-authority:"+key);
   if(!raw)return null;
   const saved=JSON.parse(raw);
   if(!saved||Date.now()-saved.at>AUTHORITY_TTL)return null;
   return saved.value;
  }catch{return null}
 }
 function rememberAuthority(key,value){
  try{sessionStorage.setItem("vat-authority:"+key,JSON.stringify({at:Date.now(),value}))}catch{}
 }
 async function resolveAuthority(query){
  const resolver=window.VitruviaEntityResolver;
  if(!resolver?.resolve)return null;
  const key="v2-temporal|"+normalize(query)+"|"+lang();
  const hit=cachedAuthority(key);
  if(hit)return hit;
  let value=await resolver.resolve(query,lang()).catch(()=>null);
  if(!value){
   await new Promise(done=>setTimeout(done,700));
   value=await resolver.resolve(query,lang()).catch(()=>null);
  }
  if(value)rememberAuthority(key,value);
  return value;
 }
 window.addEventListener("vitruvia:search",e=>reset(e.detail?.query||""));
 window.addEventListener("vitruvia:clear",()=>reset(""));
 window.addEventListener("vitruvia:results",e=>{
  if(normalize(e.detail?.query)!==normalize(state.query))return;
  const rows=Array.isArray(e.detail.rows)?e.detail.rows:[];
  const sig=JSON.stringify(rows.slice(0,90).map(r=>[r.type,r.title,r.year,r.editionYear,r.codexDate,r.link,r.timelineWorkMatch]));
  if(sig===state.rowSignature)return;
  state.rowSignature=sig;state.rows=rows;draw();
 });
 window.addEventListener("vitruvia:cultural-works",e=>{
  const d=e.detail||{},qid=state.authority?.wikidataId;
  if(!d.wikidataId||!/^Q\d+$/.test(d.wikidataId))return;
  const works=Array.isArray(d.works)?d.works:[];
  if(!qid){state.pendingWorks={wikidataId:d.wikidataId,works};return}
  if(d.wikidataId!==qid)return;
  state.works=works;draw();
 });
 window.addEventListener("vitruvia:albums",e=>{
  const d=e.detail||{};
  const subject=s=>normalize(s).replace(/^(the|el|la|los|las|le|les) /,"");
  if(subject(d.query)!==subject(state.query)&&subject(d.query)!==subject(state.authority?.canonical)&&subject(d.query)!==subject(state.authority?.catalogName))return;
  state.albums=Array.isArray(d.albums)?d.albums:[];draw();
 });
 new MutationObserver(changes=>{
  if(changes.some(c=>c.attributeName==="lang")&&state.query){const token=state.token;state.datedLabels={};draw();if(state.authority)getDatedLabels(state.authority,lang()).then(labels=>{if(token===state.token){state.datedLabels=labels;draw()}})}
 }).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
 const snapshot=window.VitruviaSearchSnapshot;
 if(snapshot?.query)reset(snapshot.query);
 window.VitruviaAcademicTimeline={collect,layoutMarkers,dateWindow,automaticZoom,recordYear,version:"2.7-universal-dated-statements",neroEvents,akhenatenEvents,datedAuthorityEvents};
})();
