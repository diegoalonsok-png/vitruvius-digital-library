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
 const year=x=>typeof x==="number"&&Number.isInteger(x)&&x!==0&&x>=-4000&&x<=2026?x:null;
 const normUrl=u=>typeof u==="string"&&/^https:\/\/[^\s]+$/i.test(u)?u:"";
 const showYear=x=>x<0?Math.abs(x)+" "+L("a. C.","BCE","av. J.-C."):String(x);
 const types={
  life:[L("Vida e instituciones","Life and institutions","Vie et institutions"),"♔"],
  events:[L("Acontecimientos","Historical events","Événements"),"⚑"],
  family:[L("Familia","Family","Famille"),"◇"],
  works:[L("Obras y creaciones","Works and creations","Œuvres et créations"),"▤"],
  documents:[L("Documentos y ediciones","Documents and editions","Documents et éditions"),"▥"]
 };
 const state={query:"",token:0,authority:null,works:[],albums:[],rows:[],zoom:1,selected:"",rowSignature:"",pendingWorks:null,tagColor:null,phase:"idle",history:[],historyIncomplete:false,personDates:null,family:[]};
 // Greedy tracks keep same-day and adjacent milestones from touching.
 // Popup centres are independently clamped, so no tooltip can protrude
 // beyond the chronology track even at narrow mobile widths.
 function layoutMarkers(items,low,range,width,zoom=1){
  const safeWidth=Math.max(1,Number(width)||1);
  const gap=11;
  const markerSize=e=>e.lane==="life"?30:e.lane==="events"?26:e.lane==="family"?18:22;
  const popupWidth=Math.max(1,Math.min(Math.max(1,safeWidth-12),Math.round(134*zoom)));
  const lastCentres=[];
  return items.map(event=>{
   const diameter=markerSize(event);
   const raw=(event.year-low)/Math.max(1,range)*safeWidth;
   const center=Math.max(Math.min(safeWidth/2,diameter/2+3),Math.min(safeWidth-Math.min(safeWidth/2,diameter/2+3),raw));
   let level=lastCentres.findIndex(last=>center-diameter/2-last>=gap);
   if(level<0){level=lastCentres.length;lastCentres.push(-Infinity)}
   lastCentres[level]=center+diameter/2;
   const popupCenter=Math.max(popupWidth/2+4,Math.min(safeWidth-popupWidth/2-4,center));
   return {event,center,level,popupWidth,shift:popupCenter-center,diameter};
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
  const title=String(item.title||"").trim().slice(0,130),url=normUrl(item.url);
  if(!title||!url||!types[item.lane])return null;
  return {...item,year:y,end,title,url,detail:String(item.detail||"").slice(0,600),source:String(item.source||"").slice(0,140)};
 }
 function matchedTitle(q,title){
  const terms=normalize(q).split(" ").filter(w=>w.length>2&&!["the","que","los","las","del","des","una","and"].includes(w));
  const t=normalize(title);
  return terms.length>0&&terms.every(w=>t.split(" ").some(x=>x===w||w.length>5&&x.startsWith(w)));
 }
 const isAkhenaten=()=>[state.query,state.authority?.canonical,state.authority?.catalogName].some(s=>/^(?:akhenaten|akhenaton|ajenaton|akenaton|amenhotep iv|amenofis iv|amenophis iv)$/.test(normalize(s).replace(/^(?:(?:el|the|le) )?(?:faraon|pharaoh|pharaon) /,"")));
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
  if(isAkhenaten())return true;
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
   {year:-1348,lane:"events",title:L("Ajetatón · proclamaciones de los años 5 y 6","Akhetaten · year 5 and year 6 proclamations","Akhetaton · proclamations des ans 5 et 6"),
    source:"Amarna Project · estelas fronterizas; UCL Digital Egypt",url:"https://www.amarnaproject.com/amarna-the-place/boundary-stelae/",approx:true,
    detail:L(
     "Las estelas K, M y X transmiten la primera proclamación sobre Ajetatón (año regnal 5); una segunda proclamación corresponde al año 6 y fue reafirmada en el 8. UCL sitúa el cambio de nombre y la residencia en el año 6; existen diferencias de interpretación y cronología. La posición hacia 1348 a. C. es una escala aproximada, no una fecha absoluta certificada.",
     "Boundary stelae K, M and X preserve the first Akhetaten proclamation (regnal year 5); the second dates to year 6 and was reaffirmed in year 8. UCL places the name change and royal residence in year 6; sources and absolute chronologies differ. Placement near 1348 BCE is approximate, not an exact historical date.",
     "Les stèles K, M et X transmettent la première proclamation d'Akhetaton (an 5); une seconde date de l'an 6 et fut réaffirmée en l'an 8. UCL situe le changement de nom et la résidence à l'an 6; les chronologies divergent. La position vers 1348 av. J.-C. reste approximative."
    )},
   {year:-1336,lane:"life",title:L("Muerte de Akenatón · fin de la línea biográfica","Death of Akhenaten · end of biography","Mort d'Akhenaton · fin de la chronologie"),
    source:"PBS · Egypt's Golden Empire; cronología aproximada",url:pbs,approx:true,
    detail:L("Muerte hacia 1336 a. C., tras un reinado de alrededor de diecisiete años. La edad exacta al morir no está establecida con certeza.","Approximate death around 1336 BCE; exact age unknown.","Décès vers 1336 av. J.-C.; âge exact incertain.")}
  ];
 }

 // Recover historical relationships independently of the main search. A
 // missing network response is not evidence that the person had no events.
 // Only explicitly dated statements and qualifiers are eligible.
 function dateValue(v){
  if(!v||typeof v.time!=="string"||!Number.isInteger(v.precision)||v.precision<9)return null;
  const match=v.time.match(/^([+-]\d+)-/), y=match?year(Number(match[1])):null;
  return y===null?null:{year:y,approx:Boolean(v.before||v.after)};
 }
 function statements(entity,p){
  const all=(entity?.claims?.[p]||[]).filter(s=>s.rank!=="deprecated"&&s.mainsnak?.snaktype==="value");
  const preferred=all.filter(s=>s.rank==="preferred");
  return preferred.length?preferred:all;
 }
 function qualifier(s,p){
  return (s.qualifiers?.[p]||[]).map(q=>dateValue(q.datavalue?.value)).filter(Boolean)[0]||null;
 }
 function claimDate(entity,p){
  return statements(entity,p).map(s=>dateValue(s.mainsnak?.datavalue?.value)).filter(Boolean)[0]||null;
 }
 const entityId=s=>s?.mainsnak?.datavalue?.value?.id;
 const validId=id=>/^Q\d+$/.test(id||"");
 function entityLabel(e,id){
  return e?.labels?.[lang()]?.value||e?.labels?.en?.value||e?.labels?.es?.value||id;
 }
 const familyProperties=["P22","P25","P26","P40","P3373"];
 function familyRecords(person,related){
  const relations={P22:L("Padre","Father","Père"),P25:L("Madre","Mother","Mère"),P26:L("Cónyuge","Spouse","Conjoint"),P40:L("Descendiente","Child","Enfant"),P3373:L("Hermano/a","Sibling","Frère/sœur")};
  const records=[];
  for(const p of familyProperties){
   for(const s of statements(person,p)){
    const id=entityId(s);if(!validId(id)||id===person.id)continue;
    const linked=related[id],name=entityLabel(linked,id);if(name===id)continue;
    const birth=claimDate(linked,"P569"),death=claimDate(linked,"P570");
    const marriage=p==="P26"?qualifier(s,"P580"):null;
    const source="https://www.wikidata.org/wiki/"+person.id+"#"+p;
    records.push({id,p,name,relation:relations[p],birth,death,marriage,source,url:"https://www.wikidata.org/wiki/"+id});
   }
  }
  return records.filter((r,i,a)=>a.findIndex(x=>x.id===r.id&&x.p===r.p)===i);
 }
 function familyEvents(records){
  const result=[];
  for(const r of records){
   const detail=r.relation+" · "+r.name+". "+L("Vínculo registrado en la ficha de autoridad; verificar parentesco y datación con las referencias del registro.","Relationship recorded in the authority record; verify kinship and dates against its references.","Lien consigné dans la notice d’autorité ; vérifier la parenté et les dates dans ses références.");
   const add=(date,label,p)=>{if(date)result.push({year:date.year,approx:date.approx,lane:"family",title:label+" · "+r.name,detail,source:"Wikidata · "+r.p+" / "+p,url:r.url,relationUrl:r.source})};
   // Only a dated birth of a child, a dated death of a relative, or a
   // qualified start of a marriage may become a family milestone.
   // Parents' and siblings' birth dates remain in the family record.
   if(r.p==="P40")add(r.birth,L("Nacimiento de descendiente","Birth of child","Naissance d’un enfant"),"P569");
   if(r.p==="P26")add(r.marriage,L("Inicio de unión documentada","Recorded marriage begins","Début d’union attesté"),"P580");
   add(r.death,L("Muerte de familiar","Death of relative","Décès d’un proche"),"P570");
  }
  return result.map(event).filter(Boolean);
 }
 function relationEvents(person,related){
  const result=[];
  const add=(s,p,date,lane,title,detail,end=null)=>{
   if(!date||!title)return;
   const url=s.id&&s.id.startsWith(person.id+"$")?"https://www.wikidata.org/wiki/"+person.id+"#"+s.id.replace("$","-"):"https://www.wikidata.org/wiki/"+person.id;
   result.push({year:date.year,end:end&&end.year>=date.year?end.year:null,approx:date.approx||Boolean(end?.approx),lane,title,detail,source:"Wikidata · "+p,url});
  };
  for(const s of statements(person,"P39")){
   const id=entityId(s);if(!validId(id))continue;
   const title=entityLabel(related[id],id);if(title===id)continue;
   const start=qualifier(s,"P580"),end=qualifier(s,"P582"),point=qualifier(s,"P585");
   const detail=L("Cargo documentado en la ficha de autoridad; las fechas corresponden a este cargo, no a toda la vida.","Office recorded in the authority record; dates refer to this office, not the whole life.","Fonction attestée ; les dates concernent cette fonction, non toute la vie.");
   if(start)add(s,"P39/P580",start,"life",L("Inicio del cargo: ","Office begins: ","Début de fonction : ")+title,detail,end);
   if(end)add(s,"P39/P582",end,"life",L("Fin del cargo: ","Office ends: ","Fin de fonction : ")+title,detail);
   if(!start&&!end&&point)add(s,"P39/P585",point,"life",title,detail);
  }
  for(const p of ["P793","P607","P1344"]){
   for(const s of statements(person,p)){
    const id=entityId(s);if(!validId(id))continue;
    const linked=related[id],title=entityLabel(linked,id);if(title===id)continue;
    const ownDate=qualifier(s,"P585")||qualifier(s,"P580");
    const linkedDate=claimDate(linked,"P585")||claimDate(linked,"P580");
    const date=ownDate||linkedDate;
    const end=qualifier(s,"P582")||(!ownDate?claimDate(linked,"P582"):null);
    add(s,p+(ownDate?" · qualifier":" · "+id),date,"events",title,
      L("Relación histórica documentada. Si la fecha procede del acontecimiento relacionado, no certifica una fecha individual de participación.","Documented relation; a linked event date does not establish an individual's exact participation date.","Relation documentée ; la date de l’événement ne prouve pas celle de la participation individuelle."),end);
   }
  }
  return result.map(event).filter(Boolean);
 }
 async function getEntities(ids){
  if(!ids.length)return {};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
   const params=new URLSearchParams({action:"wbgetentities",ids:ids.join("|"),props:"claims|labels",languages:lang()+"|en|es",format:"json",origin:"*"});
   const response=await fetch("https://www.wikidata.org/w/api.php?"+params,{signal:controller.signal});
   if(!response.ok)throw Error("HTTP "+response.status);
   const data=await response.json();
   if(!data.entities)throw Error("Missing entity records");
   return data.entities;
  }finally{clearTimeout(timer)}
 }
 async function retrieveHistory(a){
  if(!a?.instanceOf?.includes("Q5")||!validId(a.wikidataId))return [];
  const data=await getEntities([a.wikidataId]),person=data[a.wikidataId];
  if(!person?.claims)throw Error("Missing person claims");
  const ids=[...new Set(["P39","P793","P607","P1344",...familyProperties].flatMap(p=>statements(person,p).map(entityId)).filter(validId))].slice(0,45);
  const related=await getEntities(ids);
  const family=familyRecords(person,related);
  return {family,events:[...relationEvents(person,related),...familyEvents(family)],dates:{birthYear:claimDate(person,"P569"),deathYear:claimDate(person,"P570")}};
 }

 function collect(){
  if(!hasHistoricalSubject())return []; // Never generate incidental-result timelines for generic words.
  let ev=isAkhenaten()?akhenatenEvents():[],a=state.authority;
  ev.push(...state.history);
  // All Wikidata authority properties keep their distinct meanings.
  if(a&&/^Q\d+$/.test(a.wikidataId||"")){
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
    if(isAkhenaten()&&["birthYear","deathYear"].includes(field))continue;
    const checked=state.personDates&&["birthYear","deathYear"].includes(field);
    const date=checked?state.personDates[field]:null;
    const y=checked?date?.year:year(a[field]);if(y==null)continue;
    ev.push({year:y,approx:date?.approx||false,lane,title,source:"Wikidata · "+p,url,
      detail:L("Fecha registrada en la ficha de autoridad ("+p+"). Debe cotejarse la precisión y la referencia del enunciado antes de utilizarla como prueba historiográfica.",
       "Date recorded in the authority record ("+p+"). Verify the statement's precision and references before scholarly use.",
       "Date inscrite dans la notice d'autorité ("+p+"). Vérifier précision et sources.")});
   }
  }
  // Attributed cultural works: source relation and typed date, not editorial importance.
  for(const w of state.works.slice(0,35)){
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
  for(const a of state.albums.slice(0,30)){
   const y=Number(String(a.releaseDate||"").slice(0,4));
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
  const ownHoldings=/bibliotheca vitruviana|biblioteca vitruviana|c[oó]dice|codex|harley|gudian|aparato cr[ií]tico|kurilo|edici[oó]n v\d{3}/i;
  for(const r of state.rows.slice(0,90)){
   if(!["book","openlibrary","googlebook","article","edition","manuscript"].includes(r.type))continue;
   const catalogued=["edition","manuscript"].includes(r.type)&&
    (r.codexDate!=null||r.editionYear!=null)&&
    ownHoldings.test(String(r.source||"")+" "+String(r.meta||"")+" "+String(r.title||""));
   if(!matchedTitle(state.query,r.title)&&!catalogued)continue;
   const raw=r.editionYear??r.year??r.codexDate;
   if(raw==null||String(raw).trim()==="")continue;
   const y=Number(raw);
   if(year(y)==null||!normUrl(r.link))continue;
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
   const key=normalize(e.title)+"|"+e.year+"|"+e.lane;
   if(seen.has(key))return false;seen.add(key);return true
  });
  // Keep primary biographical milestones before selecting secondary material.
  const priority=e=>e.lane==="life"?0:e.lane==="events"?1:e.lane==="family"?2:e.lane==="works"?3:4;
  return ev.sort((a,b)=>priority(a)-priority(b)||a.year-b.year).slice(0,48).sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title));
 }
 function highlightButton(button,detail,event){
  for(const active of root.querySelectorAll(".vat-event[aria-pressed=true]"))active.setAttribute("aria-pressed","false");
  button.setAttribute("aria-pressed","true");
  state.selected=[event.title,event.year,event.lane].join("|");
  const heading=el("h4",null,(event.approx?"c. ":"")+showYear(event.year)+" · "+event.title);
  const body=el("p",null,event.detail);
  const source=el("small","vat-evidence",event.source||L("Registro original","Source record","Notice source"));
  const link=el("a","vat-source-link",L("Consultar fuente y metadatos","Open source and metadata","Consulter la source"));
  link.href=event.url;link.target="_blank";link.rel="noopener noreferrer";
  const contents=el("div","vat-detail-text");contents.append(heading,body,source,link);
  if(normUrl(event.relationUrl)){const relation=el("a","vat-source-link",L("Consultar vínculo familiar","View family relationship","Consulter le lien familial"));relation.href=event.relationUrl;relation.target="_blank";relation.rel="noopener noreferrer";contents.append(relation)}
  detail.replaceChildren();
  if(event.image){
   const img=el("img","vat-detail-image");img.src=event.image;img.alt=event.title;
   img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
   img.onerror=()=>img.remove();detail.append(img)
  }
  detail.append(contents);detail.hidden=false;
 }
 // Keep the life scale independent of later documentary reception.
 function splitChronology(events,isPerson,born,died){
  if(born!==null&&died!==null&&born>died){born=null;died=null}
  const visible=[],outside=[];
  for(const e of events){
   if(isPerson&&(e.lane==="documents"||(born!==null&&e.year<born)||(died!==null&&e.year>died))){
    outside.push(e);continue;
   }
   visible.push(e);
  }
  if(!visible.length)return {visible,outside,low:null,high:null};
  const min=Math.min(...visible.map(e=>e.year));
  const max=Math.max(...visible.map(e=>isPerson&&died!==null?Math.min(e.end??e.year,died):e.end??e.year));
  const padding=Math.max(1,Math.ceil(Math.max(1,max-min)*.04));
  return {visible,outside,low:isPerson&&born!==null?born:min-padding,high:isPerson&&died!==null?died:max+padding};
 }

 function appendFamily(parent,records){
  const section=el("details","vat-outside");
  section.append(el("summary",null,L("Familia documentada","Documented family","Famille documentée")+" ("+records.length+")"));
  const list=el("ul","vat-outside-list");
  for(const r of records){
   const item=el("li"),link=el("a",null,r.relation+" · "+r.name);
   link.href=r.url;link.target="_blank";link.rel="noopener noreferrer";item.append(link);
   const dates=[r.birth?L("Nacimiento","Birth","Naissance")+": "+(r.birth.approx?"c. ":"")+showYear(r.birth.year):"",r.death?L("Muerte","Death","Décès")+": "+(r.death.approx?"c. ":"")+showYear(r.death.year):""].filter(Boolean);
   item.append(el("small",null," · "+(dates.join(" · ")||L("Sin fechas verificables en el registro","No usable dates in the record","Dates absentes de la notice"))));
   list.append(item);
  }
  section.append(list);parent.append(section);
 }

 // Index the already retrieved search records; do not duplicate external
 // requests, invent an inscription, or mistake a catalogue for a full text.
 function documentaryIndex(rows,authority,query){
  const names=[authority?.canonical,authority?.catalogName,authority?.originalCanonical,...(authority?.aliases||[]),query].map(normalize).filter(n=>n.length>=4&&!/^(?:king|rey|tut|faraon|pharaoh|egypt|egipto)$/.test(n));
  const related=r=>{
   if(authority?.wikidataId&&[r.subjectWikidataId,r.creatorWikidataId,r.relatedWikidataId].includes(authority.wikidataId))return true;
   if(r.wikidataId&&authority?.notableWorkIds?.includes(r.wikidataId))return true;
   const fields=[r.title,r.abstract,r.excerpt,r.entityCanonical,...(r.aliases||[])].map(normalize);
   return names.some(n=>fields.some(f=>(" "+f+" ").includes(" "+n+" "))||normalize(r.author)===n);
  };
  const records=(rows||[]).filter(r=>r&&r.title&&related(r));
  const distinct=a=>a.filter((r,i)=>a.findIndex(x=>(x.doi||x.link||x.title)===(r.doi||r.link||r.title))===i);
  return {
   objects:distinct(records.filter(r=>r.type==="museum"||r.recordKind==="museum-object")),
   bibliography:distinct(records.filter(r=>["book","openlibrary","googlebook","article","edition"].includes(r.type))).sort((a,b)=>String(a.author||"").localeCompare(String(b.author||""),lang())||String(a.title).localeCompare(String(b.title),lang()))
  };
 }
 function indexLink(parent,label,url){
  if(typeof url!=="string"||!(/^https:\/\/[^\s]+$/i.test(url)||/^(?:documents\/[a-z0-9/_-]+\.pdf(?:#page=\d+)?|[a-z0-9/_-]+\.html(?:\?[^#]*)?(?:#[a-z0-9=&_-]+)?)$/i.test(url)))return;
  const a=el("a","vat-source-link",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";parent.append(a);
 }
 function appendDocumentaryIndex(parent){
  const {objects,bibliography}=documentaryIndex(state.rows,state.authority,state.query);
  if(objects.length){
   const section=el("details","vat-outside");section.append(el("summary",null,L("Objetos y testimonios materiales","Objects and material witnesses","Objets et témoins matériels")+" ("+objects.length+")"));
   const list=el("ul","vat-outside-list");
   for(const r of objects.slice(0,30)){
    const item=el("li");item.append(el("strong",null,r.title));
    if(normUrl(r.image)){const img=el("img");img.src=r.image;img.alt=r.title;img.loading="lazy";img.style.cssText="display:block;max-width:120px;max-height:100px;object-fit:contain";img.onerror=()=>img.remove();item.append(img)}
    const meta=[r.accessionNumber,r.objectDate,r.source].filter(Boolean).join(" · ");if(meta)item.append(el("p",null,meta));
    if(r.inscriptionOriginal&&r.inscriptionSource&&normUrl(r.inscriptionSource)){
     item.append(el("p",null,r.inscriptionOriginal));
     if(r.inscriptionTransliteration)item.append(el("p",null,r.inscriptionTransliteration));
     if(r.inscriptionTranslation&&r.inscriptionTranslator)item.append(el("p",null,r.inscriptionTranslation+" — "+r.inscriptionTranslator));
     indexLink(item,L("Fuente epigráfica","Epigraphic source","Source épigraphique"),r.inscriptionSource);
    }else item.append(el("small",null,L("Inscripción y traducción no verificadas para este objeto.","Inscription and translation not verified for this object.","Inscription et traduction non vérifiées pour cet objet.")));
    indexLink(item,L("Ficha del museo","Museum record","Notice du musée"),r.link);list.append(item);
   }
   section.append(list);parent.append(section);
  }
  if(bibliography.length){
   const section=el("details","vat-outside");section.append(el("summary",null,L("Bibliografía académica por autor","Academic bibliography by author","Bibliographie savante par auteur")+" ("+bibliography.length+")"));
   const list=el("ul","vat-outside-list");
   for(const r of bibliography.slice(0,60)){
    const item=el("li");item.append(el("strong",null,r.author||L("Autor no indicado","Author not specified","Auteur non indiqué")));
    item.append(el("p",null,[r.title,r.year,r.journal||r.publisher,r.doi?"DOI: "+r.doi:""].filter(Boolean).join(" · ")));
    indexLink(item,L("Ficha bibliográfica","Bibliographic record","Notice bibliographique"),r.link);
    if(r.pdf)indexLink(item,"PDF",r.pdf);
    if(r.fulltext)indexLink(item,L("Leer texto completo","Read full text","Lire le texte intégral"),r.fulltext);
    if(r.translationUrl&&r.translationLanguage)indexLink(item,L("Traducción","Translation","Traduction")+" · "+r.translationLanguage,r.translationUrl);
    if(!r.pdf&&!r.fulltext)item.append(el("small",null,L("Acceso al texto sujeto a la fuente.","Full-text access depends on the source.","Accès au texte selon la source.")));
    list.append(item);
   }
   section.append(list);parent.append(section);
  }
 }

 function draw(){
  if(!state.query){root.hidden=true;root.replaceChildren();return}
  if(state.phase==="identity"||state.phase==="history"){
   root.replaceChildren();root.hidden=true;
   if(state.phase==="history"||isAkhenaten()){
    root.hidden=false;
    root.append(el("p","vat-method",state.phase==="identity"?L("Cronología · identificando el personaje…","Chronology · identifying subject…","Chronologie · identification…"):L("Cronología · recuperando y ordenando acontecimientos documentados…","Chronology · retrieving and sorting documented events…","Chronologie · recherche et classement des événements…")));
   }
   return;
  }
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
  if(state.historyIncomplete)root.append(el("p","vat-method",L("Cronología parcial: no se pudieron consultar todas las fuentes de acontecimientos.","Partial chronology: not all event sources could be retrieved.","Chronologie partielle : certaines sources sont indisponibles.")));
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
  const bound=key=>state.personDates?(state.personDates[key]?.year??null):year(state.authority?.[key]);
  const born=isAkhenaten()?akhenatenBounds.birth:bound("birthYear");
  const died=isAkhenaten()?akhenatenBounds.death:bound("deathYear");
  const isPerson=isAkhenaten()||state.authority?.instanceOf?.includes("Q5");
  const scope=splitChronology(events,isPerson,born,died);
  const visibleEvents=scope.visible,outsideEvents=scope.outside;
  if(!visibleEvents.length){root.hidden=true;root.replaceChildren();return}
  const low=scope.low,high=scope.high;
  const range=Math.max(1,high-low);
  // Size the axis from the actual available content box. No 250px
  // minimum canvas and no fixed 960px map overflowing mobile readers.
  const cs=typeof getComputedStyle==="function"?getComputedStyle(root):{paddingLeft:"0",paddingRight:"0"};
  const outer=Number(root.clientWidth)||Number(root.getBoundingClientRect?.().width)||760;
  const available=Math.max(1,Math.floor(outer)-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0)-3);
  const labelWidth=Math.min(Math.round(available*.33),available<420?88:available<740?124:170);
  const contentWidth=Math.round(available*Math.max(1,state.zoom));
  const mapWidth=Math.max(1,contentWidth-labelWidth-2);
  const cardWidth=Math.min(Math.round(134*Math.min(state.zoom,1.35)),Math.max(1,mapWidth-12));
  root.style.setProperty("--vat-label-width",labelWidth+"px");
  root.style.setProperty("--vat-card-width",cardWidth+"px");
  const viewport=el("div","vat-viewport");viewport.tabIndex=0;
  viewport.style.overflowX="auto";viewport.style.maxWidth="100%";
  viewport.setAttribute("aria-label",L("Cronología desplazable horizontalmente al ampliar","Timeline scrolls horizontally when zoomed","Chronologie défilable horizontalement au zoom"));
  const map=el("div","vat-map");map.style.width=contentWidth+"px";map.style.minWidth=contentWidth+"px";
  const axis=el("div","vat-axis");
  const ticks=Math.max(1,Math.min(9,Math.floor(mapWidth/120)));
  for(let i=0;i<=ticks;i++){
   const y=Math.round(low+i*range/ticks);
   const tick=el("span","vat-tick",showYear(y));
   tick.style.left=(i/ticks*100)+"%";axis.append(tick)
  }
  map.append(axis);
  const detail=el("div","vat-detail");detail.hidden=true;detail.setAttribute("aria-live","polite");
  const stops=[];
  for(const [lane,[label,icon]] of Object.entries(types)){
   const items=visibleEvents.filter(x=>x.lane===lane);if(!items.length)continue;
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
   const positioned=layoutMarkers(items,low,range,mapWidth,state.zoom);
   let levelMax=0;
   for(const {event:e,center,level,popupWidth,shift,diameter} of positioned){
    levelMax=Math.max(levelMax,level);
    const button=el("button","vat-event");
    button.type="button";button.setAttribute("aria-pressed","false");
    button.classList.add("vat-event-marker");
    button.style.left=center+"px";button.style.top=(23+level*45)+"px";
    button.style.width=diameter+"px";button.style.height=diameter+"px";
    if(e.approx)button.style.borderStyle="dashed";
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
    const key=[e.title,e.year,e.lane].join("|");
    if(key===state.selected)queueMicrotask(()=>{if(button.isConnected)highlightButton(button,detail,e)});
    track.append(button);
   }
   track.style.height=(72+levelMax*45)+"px";
   laneBody.append(track,preview);
   band.append(title,laneBody);map.append(band);
  }
  viewport.append(map);root.append(viewport,detail);
  if(state.family.length)appendFamily(root,state.family);
  if(isPerson)appendDocumentaryIndex(root);
  if(outsideEvents.length){
   const extra=el("details","vat-outside");
   extra.append(el("summary",null,L(
    "Documentos y legado fuera de la línea de vida ("+outsideEvents.length+")",
    "Records outside the lifetime ("+outsideEvents.length+")",
    "Documents hors de la période biographique ("+outsideEvents.length+")")));
   const list=el("ul","vat-outside-list");
   for(const e of outsideEvents.slice(0,15)){
    const li=el("li");
    const link=el("a",null,showYear(e.year)+" · "+e.title);
    link.href=e.url;link.target="_blank";link.rel="noopener noreferrer";
    li.append(link);list.append(li);
   }
   if(outsideEvents.length>15)list.append(el("li",null,L("Se muestran los primeros 15 registros.","Showing first 15 records.","15 premières notices affichées.")));
   extra.append(list);root.append(extra);
  }
  stops.sort((a,b)=>a.event.year-b.event.year||a.event.title.localeCompare(b.event.title));
  function navigate(direction){
   const current=stops.findIndex(item=>item.button.getAttribute("aria-pressed")==="true");
   const index=current<0?(direction>0?0:stops.length-1):Math.max(0,Math.min(stops.length-1,current+direction));
   const nextStop=stops[index];
   if(!nextStop)return;
   highlightButton(nextStop.button,detail,nextStop.event);
   nextStop.button.focus?.({preventScroll:true});
  }
  prev.title=L("Hito anterior","Previous milestone","Jalon précédent");
  next.title=L("Hito siguiente","Next milestone","Jalon suivant");
  zoomOut.title=L("Reducir el tamaño de la etiqueta","Smaller labels","Réduire les étiquettes");
  zoomIn.title=L("Aumentar el tamaño de la etiqueta","Larger labels","Agrandir les étiquettes");
  zoomOut.onclick=()=>{state.zoom=Math.max(1,Math.round((state.zoom-.25)*100)/100);draw()};
  zoomIn.onclick=()=>{state.zoom=Math.min(3,Math.round((state.zoom+.25)*100)/100);draw()};
  prev.onclick=()=>navigate(-1);
  next.onclick=()=>navigate(1);
  viewport.addEventListener("keydown",e=>{
   if(e.target!==viewport||!["ArrowLeft","ArrowRight"].includes(e.key))return;
   e.preventDefault();navigate(e.key==="ArrowRight"?1:-1);
  });
 }
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
  state.token++;state.query=String(q||"").trim().slice(0,160);state.zoom=1;
  state.authority=null;state.works=[];state.albums=[];state.rows=[];state.selected="";state.rowSignature="";state.pendingWorks=null;state.history=[];state.historyIncomplete=false;state.personDates=null;state.family=[];state.phase=state.query?"identity":"idle";
  place();draw();
  if(!state.query)return;
  const token=state.token;
  resolveAuthority(state.query).then(async a=>{
   if(token!==state.token)return;
   state.authority=a;
   const pending=state.pendingWorks;
   if(a&&pending&&pending.wikidataId===a.wikidataId)state.works=pending.works;
   if(a?.instanceOf?.includes("Q5")){
    state.phase="history";draw();
    try{const history=await retrieveHistory(a);if(token!==state.token)return;state.history=history.events;state.personDates=history.dates;state.family=history.family}
    catch{if(token!==state.token)return;state.historyIncomplete=true}
   }
   if(token!==state.token)return;
   state.phase="ready";draw();
  }).catch(()=>{if(token===state.token){state.historyIncomplete=true;state.phase="ready";draw()}});

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
  const key=normalize(query)+"|"+lang();
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
  const sig=rows.map(r=>[r.title,r.year,r.editionYear,r.codexDate].join("|")).join(";").slice(0,5000);
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
  if(changes.some(c=>c.attributeName==="lang")&&state.query)draw();
 }).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
 const snapshot=window.VitruviaSearchSnapshot;
 if(snapshot?.query)reset(snapshot.query);
 window.VitruviaAcademicTimeline={collect,layoutMarkers,version:"2.5-family-documentary-index"};
})();
