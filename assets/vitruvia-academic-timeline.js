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
 const showYear=x=>x<0?Math.abs(x)+" "+L("a. C.","BCE","av. J.-C."):String(x);
 const types={
  life:[L("Vida e instituciones","Life and institutions","Vie et institutions"),"♔"],
  events:[L("Acontecimientos","Historical events","Événements"),"⚑"],
  works:[L("Obras y creaciones","Works and creations","Œuvres et créations"),"▤"],
  documents:[L("Documentos y ediciones","Documents and editions","Documents et éditions"),"▥"]
 };
 const state={query:"",token:0,authority:null,works:[],albums:[],rows:[],zoom:1,selected:"",rowSignature:"",pendingWorks:null,tagColor:null};
 // Greedy tracks keep same-day and adjacent milestones from touching.
 // Popup centres are independently clamped, so no tooltip can protrude
 // beyond the chronology track even at narrow mobile widths.
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
  const title=String(item.title||"").trim().slice(0,130),url=normUrl(item.url);
  if(!title||!url||!types[item.lane])return null;
  return {...item,year:y,end,title,url,detail:String(item.detail||"").slice(0,600),source:String(item.source||"").slice(0,140)};
 }
 function matchedTitle(q,title){
  const terms=normalize(q).split(" ").filter(w=>w.length>2&&!["the","que","los","las","del","des","una","and"].includes(w));
  const t=normalize(title);
  return terms.length>0&&terms.every(w=>t.split(" ").some(x=>x===w||w.length>5&&x.startsWith(w)));
 }
 const isAkhenaten=()=>/^(?:akhenaten|akhenaton|akhenat[oó]n|ajenaton|ajenat[oó]n|akenaton|akenat[oó]n|amenhotep iv|amenofis iv|amenophis iv)$/.test(normalize(state.query));
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
 function collect(){
  if(isAbstractTerm())return []; // No timeline without direct, dated, academically sourced concept history.
  if(isAkhenaten())return akhenatenEvents();
  let ev=[],a=state.authority;
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
    const y=year(a[field]);if(y==null)continue;
    ev.push({year:y,lane,title,source:"Wikidata · "+p,url,
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
   const y=Number(r.editionYear??r.year??r.codexDate??null);
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
  }).sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title)).slice(0,48);
  return ev;
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
  detail.replaceChildren();
  if(event.image){
   const img=el("img","vat-detail-image");img.src=event.image;img.alt=event.title;
   img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
   img.onerror=()=>img.remove();detail.append(img)
  }
  detail.append(contents);detail.hidden=false;
 }
 function draw(){
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
   if(isLexicalHeadword()){root.hidden=true;root.replaceChildren();return}
   const empty=el("p","vat-empty",L(
    "Todavía no se recuperaron acontecimientos con fecha y fuente acreditada para esta consulta. Los demás resultados del buscador siguen disponibles.",
    "No sourced dated records have been retrieved for this query yet. Other search results remain available.",
    "Aucun jalon daté avec source pour cette recherche ; les autres résultats restent disponibles."));
   root.append(empty);return;
  }
  // In biographies the documentary axis ends at death. Posthumous
  // editions remain reachable, but cannot distort a lifetime into millennia.
  const born=isAkhenaten()?akhenatenBounds.birth:year(state.authority?.birthYear);
  const died=isAkhenaten()?akhenatenBounds.death:year(state.authority?.deathYear);
  const lifeScope=born!==null&&died!==null&&died>=born?{born,died}:null;
  const visibleEvents=lifeScope?events.filter(e=>e.year>=lifeScope.born&&e.year<=lifeScope.died):events;
  const outsideEvents=lifeScope?events.filter(e=>e.year<lifeScope.born||e.year>lifeScope.died):[];
  const minYear=visibleEvents[0]?.year??events[0].year;
  const maxYear=Math.max(...(visibleEvents.length?visibleEvents:events).map(e=>e.end??e.year));
  const span=Math.max(1,maxYear-minYear),padding=lifeScope?0:Math.max(1,Math.ceil(span*.04));
  const low=lifeScope?lifeScope.born:minYear-padding;
  const high=lifeScope?lifeScope.died:maxYear+padding;
  const range=Math.max(1,high-low);
  // Size the axis from the actual available content box. No 250px
  // minimum canvas and no fixed 960px map overflowing mobile readers.
  const cs=typeof getComputedStyle==="function"?getComputedStyle(root):{paddingLeft:"0",paddingRight:"0"};
  const outer=Number(root.clientWidth)||Number(root.getBoundingClientRect?.().width)||760;
  const available=Math.max(1,Math.floor(outer)-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0)-3);
  const labelWidth=Math.min(Math.round(available*.33),available<420?88:available<740?124:170);
  const mapWidth=Math.max(1,available-labelWidth-2);
  const cardWidth=Math.min(Math.round(134*state.zoom),Math.max(1,mapWidth-12));
  root.style.setProperty("--vat-label-width",labelWidth+"px");
  root.style.setProperty("--vat-card-width",cardWidth+"px");
  const viewport=el("div","vat-viewport");viewport.tabIndex=0;
  viewport.setAttribute("aria-label",L("Cronología adaptada al ancho del visor","Chronology fitted to reader width","Chronologie adaptée à la largeur du lecteur"));
  const map=el("div","vat-map");map.style.width=available+"px";
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
    const key=[e.title,e.year,e.lane].join("|");
    if(key===state.selected)queueMicrotask(()=>{if(button.isConnected)highlightButton(button,detail,e)});
    track.append(button);
   }
   track.style.height=(72+levelMax*40)+"px";
   laneBody.append(track,preview);
   band.append(title,laneBody);map.append(band);
  }
  viewport.append(map);root.append(viewport,detail);
  if(lifeScope&&outsideEvents.length){
   const extra=el("details","vat-outside");
   extra.append(el("summary",null,L(
    "Ediciones y documentos fuera del período biográfico ("+outsideEvents.length+")",
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
  zoomOut.onclick=()=>{state.zoom=Math.max(.8,Math.round((state.zoom-.1)*100)/100);draw()};
  zoomIn.onclick=()=>{state.zoom=Math.min(1.35,Math.round((state.zoom+.1)*100)/100);draw()};
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
  state.authority=null;state.works=[];state.albums=[];state.rows=[];state.selected="";state.rowSignature="";state.pendingWorks=null;
  place();draw();
  if(!state.query)return;
  const token=state.token;
  resolveAuthority(state.query).then(a=>{
   if(token!==state.token||!a)return;
   state.authority=a;
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
 window.VitruviaAcademicTimeline={collect,layoutMarkers,version:"2.1-fit-mobile-lifetime"};
})();
