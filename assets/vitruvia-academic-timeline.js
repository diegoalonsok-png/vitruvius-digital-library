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
   {year:-1348,lane:"events",title:L("Cambio de nombre y fundación de Ajetatón","Name change and foundation of Akhetaten","Changement de nom et fondation d'Akhetaton"),
    source:"UCL Digital Egypt · año 6 del reinado",url:ucl,approx:true,
    detail:L("UCL sitúa el nuevo nombre real y la creación de la residencia de Ajetatón en el sexto año de reinado. El año absoluto es aproximado y depende de la cronología adoptada.","Year six of the reign, converted approximately to BCE.","An six du règne, conversion absolue approximative.")},
   {year:-1336,lane:"life",title:L("Muerte de Akenatón · fin de la línea biográfica","Death of Akhenaten · end of biography","Mort d'Akhenaton · fin de la chronologie"),
    source:"PBS · Egypt's Golden Empire; cronología aproximada",url:pbs,approx:true,
    detail:L("Muerte hacia 1336 a. C., tras un reinado de alrededor de diecisiete años. La edad exacta al morir no está establecida con certeza.","Approximate death around 1336 BCE; exact age unknown.","Décès vers 1336 av. J.-C.; âge exact incertain.")}
  ];
 }
 function collect(){
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
  for(const r of state.rows.slice(0,90)){
   if(!["book","openlibrary","googlebook","article","edition","manuscript"].includes(r.type))continue;
   if(!matchedTitle(state.query,r.title))continue;
   const y=Number(r.editionYear??r.year??r.codexDate??null);
   if(year(y)==null||!normUrl(r.link))continue;
   ev.push({year:y,lane:"documents",title:r.title,url:r.link,source:String(r.source||"Catálogo").slice(0,80),
    detail:L("Fecha del documento o edición recuperada. No debe confundirse con el acontecimiento que estudia ni con la fecha de composición de una obra antigua.",
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

 // Keep the historical axis separate from the bibliography of later centuries.
 // These classifications are based only on authority properties and sourced dates.
 function timelineScope(events){
  const person=isAkhenaten()||state.authority?.kind==="person";
  const start=isAkhenaten()?akhenatenBounds.birth:
   year(person?state.authority?.birthYear:state.authority?.inceptionYear);
  const end=isAkhenaten()?akhenatenBounds.death:
   year(person?state.authority?.deathYear:state.authority?.dissolutionYear);
  const bounded=start!==null&&end!==null&&end>=start;
  const within=e=>(start===null||e.year>=start)&&(end===null||e.year<=end);
  const historical=events.filter(e=>e.lane!=="documents");
  let timeline=historical.filter(within);
  // An undated subject with only catalogued editions can still be explored,
  // but never invent biographical milestones from book publication dates.
  if(!timeline.length&&!historical.length&&!bounded)timeline=events.slice();
  const references=events.filter(e=>!timeline.includes(e));
  let low=bounded?start:timeline.length?Math.min(...timeline.map(e=>e.year)):start;
  let high=bounded?end:timeline.length?Math.max(...timeline.map(e=>e.end??e.year)):end;
  if(low===null&&high!==null)low=high;
  if(high===null&&low!==null)high=low;
  return {timeline,references,low,high,bounded,person};
 }
 function highlightButton(button,detail,event){
  for(const active of root.querySelectorAll(".vat-event[aria-pressed=true]"))active.setAttribute("aria-pressed","false");
  button.setAttribute("aria-pressed","true");
  const all=Array.isArray(event)?event:[event];
  state.selected=all.map(e=>[e.title,e.year,e.lane].join("|")).join(";;");
  const group=Array.isArray(event)?event:[event];
  const container=el("div","vat-detail-list");
  for(const item of group){
   const card=el("article","vat-detail-item");
   const heading=el("h4",null,(item.approx?"c. ":"")+showYear(item.year)+" · "+item.title);
   const body=el("p",null,item.detail);
   const source=el("small","vat-evidence",item.source||L("Registro original","Source record","Notice source"));
   const link=el("a","vat-source-link",L("Consultar fuente y metadatos","Open source and metadata","Consulter la source"));
   link.href=item.url;link.target="_blank";link.rel="noopener noreferrer";
   if(item.image){
    const img=el("img","vat-detail-image");img.src=item.image;img.alt=item.title;
    img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
    img.onerror=()=>img.remove();card.append(img);
   }
   card.append(heading,body,source,link);container.append(card);
  }
  detail.replaceChildren(container);detail.hidden=false;
 }
 function draw(){
  if(!state.query){root.hidden=true;root.replaceChildren();return}
  const events=collect();
  const scope=timelineScope(events);
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
  zoomOut.setAttribute("aria-label",L("Reducir tamaño de fichas","Reduce label size","Réduire les notices"));
  zoomIn.setAttribute("aria-label",L("Ampliar tamaño de fichas","Increase label size","Agrandir les notices"));
  zoomOut.title=L("Reducir etiquetas sin cambiar las fechas","Smaller labels, same dates","Notices réduites, mêmes dates");
  zoomIn.title=L("Ampliar etiquetas sin cambiar las fechas","Larger labels, same dates","Notices agrandies, mêmes dates");
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
  if(scope.person&&!isAkhenaten()&&scope.bounded)
   method.textContent=L(
    "Escala biográfica: "+showYear(scope.low)+"–"+showYear(scope.high)+". Ediciones y estudios posteriores se conservan en un desplegable separado.",
    "Biographical period: "+showYear(scope.low)+"–"+showYear(scope.high)+". Later editions appear separately.",
    "Période biographique : "+showYear(scope.low)+"–"+showYear(scope.high)+". Éditions postérieures séparées.");
  if(isAkhenaten())method.textContent=L(
    "Escala biográfica exclusivamente hasta la muerte aproximada. El nacimiento es estimado y los años absolutos del reinado pueden variar según la cronología egiptológica. Libros y estudios modernos no son hitos biográficos.",
    "Biographical scale stops at approximate death. Birth and absolute reign dates are uncertain; modern studies are excluded.",
    "L'échelle biographique s'arrête au décès approximatif. Dates discutées; les études modernes sont exclues.");
  root.append(method);
  if(!events.length){
   const empty=el("p","vat-empty",L(
    "Todavía no se recuperaron acontecimientos con fecha y fuente acreditada para esta consulta. Los demás resultados del buscador siguen disponibles.",
    "No sourced dated records have been retrieved for this query yet. Other search results remain available.",
    "Aucun jalon daté avec source pour cette recherche ; les autres résultats restent disponibles."));
   root.append(empty);return;
  }
  if(!scope.timeline.length){
   root.append(el("p","vat-empty",L(
    "No hay acontecimientos acreditados para este período; se conservan las referencias documentales por separado.",
    "No sourced events within this period; documentary references remain available separately.",
    "Aucun jalon attesté dans cette période ; références conservées séparément.")));
  }
  const minYear=scope.low??0,maxYear=scope.high??minYear;
  const span=Math.max(1,maxYear-minYear),padding=scope.bounded?0:Math.max(1,Math.ceil(span*.04));
  const low=minYear-padding,high=maxYear+padding;
  const range=Math.max(1,high-low);
  // Universal fitted scale: time always spans the visible reader, not a fixed 960–5200px canvas.
  const cs=typeof getComputedStyle==="function"?getComputedStyle(root):{paddingLeft:"0",paddingRight:"0"};
  const available=Math.max(250,Math.floor(Number(root.clientWidth)||850)-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0)-3);
  const labelWidth=available<490?94:available<740?128:170;
  const mapWidth=Math.max(150,available-labelWidth-2);
  const cardWidth=Math.min(Math.max(110,Math.round(162*state.zoom)),Math.max(98,mapWidth-10));
  root.style.setProperty("--vat-label-width",labelWidth+"px");
  root.style.setProperty("--vat-card-width",cardWidth+"px");
  const viewport=el("div","vat-viewport");viewport.tabIndex=0;
  viewport.setAttribute("aria-label",L("Cronología adaptada al ancho del visor","Chronology fitted to reader width","Chronologie adaptée à la largeur du lecteur"));
  const map=el("div","vat-map");map.style.width=available+"px";
  const axis=el("div","vat-axis");
  const ticks=Math.max(1,Math.min(8,Math.floor(mapWidth/135),Math.max(1,Math.floor(range))));
  for(let i=0;i<=ticks;i++){
   const y=Math.round(low+i*range/ticks);
   const tick=el("span","vat-tick",showYear(y));
   tick.style.left=(i/ticks*100)+"%";axis.append(tick)
  }
  map.append(axis);
  const detail=el("div","vat-detail");detail.hidden=true;detail.setAttribute("aria-live","polite");

  const markerItems=[];
  for(const [lane,[label,icon]] of Object.entries(types)){
   const items=scope.timeline.filter(x=>x.lane===lane);
   if(!items.length)continue;
   const band=el("section","vat-band");band.setAttribute("aria-label",label);
   const title=el("div","vat-band-title");title.append(el("span","vat-icon",icon),el("strong",null,label));
   const track=el("div","vat-track");track.style.width=mapWidth+"px";
   const line=el("div","vat-line");track.append(line);
   // Small-screen density: close dates share one accessible marker; no
   // overlapping dots. Opening it reveals every dated event and its source.
   const groups=[];
   for(const e of items){
    const x=Math.max(14,Math.min(mapWidth-14,(e.year-low)/range*mapWidth));
    const previous=groups[groups.length-1];
    if(previous&&x-previous.x<34){
     previous.items.push(e);previous.lastX=x;
    }else groups.push({x,lastX:x,items:[e]});
   }
   for(const group of groups){
    const e=group.items[0],last=group.items[group.items.length-1];
    const x=group.x;
    const button=el("button","vat-event");
    button.type="button";button.setAttribute("aria-pressed","false");
    button.classList.add("vat-event-marker");
    button.style.left=x+"px";button.style.top="40px";
    const popCenter=Math.max(cardWidth/2+5,Math.min(mapWidth-cardWidth/2-5,x));
    button.style.setProperty("--vat-popup-width",cardWidth+"px");
    button.style.setProperty("--vat-popup-shift",(popCenter-x)+"px");
    const firstYear=(e.approx?"c. ":"")+showYear(e.year);
    const years=last.year!==e.year?"–"+showYear(last.year):"";
    const groupName=group.items.length>1?L(
     group.items.length+" acontecimientos",""+group.items.length+" events",""+group.items.length+" événements"):e.title;
    button.setAttribute("aria-label",firstYear+years+" · "+groupName);
    button.title=L("Pulsar para abrir los acontecimientos y sus fuentes","Open events and sources","Voir événements et sources");
    const popup=el("span","vat-event-pop");
    popup.append(el("span","vat-year",firstYear+years));
    popup.append(el("strong",null,groupName));
    button.append(popup);
    const key=group.items.map(item=>[item.title,item.year,item.lane].join("|")).join(";;");
    button.addEventListener("click",()=>highlightButton(button,detail,group.items));
    if(key===state.selected)queueMicrotask(()=>{if(button.isConnected)highlightButton(button,detail,group.items)});
    if(group.items.length>1)button.classList.add("vat-event-cluster");
    markerItems.push({button,key,year:e.year,lane,events:group.items});
    track.append(button);
   }
   track.style.height="186px";
   band.append(title,track);map.append(band);
  }
  viewport.append(map);root.append(viewport,detail);
  if(scope.references.length){
   const annex=el("details","vat-references");
   const heading=el("summary",null,L(
    "Ediciones y referencias fuera del período ("+scope.references.length+")",
    "Editions and references outside this period ("+scope.references.length+")",
    "Éditions et références hors période ("+scope.references.length+")"));
   annex.append(heading);
   annex.append(el("p","vat-references-method",L(
    "Estas fuentes conservan su fecha editorial, pero no alargan la vida del personaje ni el período del acontecimiento.",
    "Publication dates never extend a person's lifespan or the historical event.",
    "Les dates éditoriales n'allongent pas la période historique.")));
   const entries=el("ul","vat-reference-list");
   for(const e of scope.references){
    const item=el("li");
    item.append(el("span",null,showYear(e.year)+" · "));
    const link=el("a",null,e.title);link.href=e.url;
    link.target="_blank";link.rel="noopener noreferrer";item.append(link);entries.append(item);
   }
   annex.append(entries);root.append(annex);
  }
  markerItems.sort((a,b)=>a.year-b.year||a.key.localeCompare(b.key));
  function step(direction){
   if(!markerItems.length)return;
   const current=markerItems.findIndex(m=>m.key===state.selected);
   const nextIndex=current<0?(direction>0?0:markerItems.length-1):
    (current+direction+markerItems.length)%markerItems.length;
   markerItems[nextIndex].button.click();
   markerItems[nextIndex].button.focus({preventScroll:true});
  }
  prev.disabled=next.disabled=markerItems.length===0;
  prev.onclick=()=>step(-1);
  next.onclick=()=>step(1);
  zoomOut.onclick=()=>{state.zoom=Math.max(.8,Math.round((state.zoom-.1)*100)/100);draw()};
  zoomIn.onclick=()=>{state.zoom=Math.min(1.35,Math.round((state.zoom+.1)*100)/100);draw()};
  viewport.addEventListener("keydown",e=>{
   if(e.target!==viewport||!["ArrowLeft","ArrowRight"].includes(e.key))return;
   e.preventDefault();step(e.key==="ArrowRight"?1:-1);
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
  if(window.VitruviaEntityResolver?.resolve){
   const safe=window.VitruviaEntityResolver.resolve(state.query,lang()).catch(()=>null);
   safe.then(a=>{if(token!==state.token||!a)return;state.authority=a;const pending=state.pendingWorks;if(pending&&pending.wikidataId===a.wikidataId)state.works=pending.works;draw()});
  }
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
 window.VitruviaAcademicTimeline={collect,timelineScope,version:"2.1-fit-periods-clusters"};
})();
