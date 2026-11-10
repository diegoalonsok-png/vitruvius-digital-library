/* Source-aware, multi-lane chronology for Vitruvia.
 * Event date is never inferred from result relevance. BCE dates, ranges,
 * catalogued editions and approximate dates are explicitly distinguished.
 * The timeline never claims to exhaust a person's life or cultural production.
 */
(()=>{
"use strict";
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const locale=()=>["en","fr"].includes(document.documentElement.lang)?document.documentElement.lang:"es";
const t=(es,en,fr)=>locale()==="en"?en:locale()==="fr"?fr:es;
const el=(name,cls,txt)=>{const e=document.createElement(name);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const sourceURL=u=>typeof u==="string"&&(/^https:\/\//.test(u)||/^[a-z0-9/_-]+\.html(?:[?#][^\s]*)?$/i.test(u))?u:"";
const yearValue=x=>Number.isInteger(x)&&Math.abs(x)<=9999?x:null;
const dateLabel=(y,approx=false)=>{const n=yearValue(y);return n==null?"":(approx?"c. ":"")+(n<0?Math.abs(n)+" "+t("a. C.","BCE","av. J.-C."):n+"")};
const NOW=2026;
const pink=[
 {year:1965,lane:"life",title:"Formación de Pink Floyd",detail:"Syd Barrett, Roger Waters, Nick Mason y Richard Wright establecieron el núcleo del grupo en Londres.",url:"https://archive.pinkfloyd.com/history/biography",source:"Pink Floyd · biografía oficial"},
 {year:1967,lane:"works",title:"The Piper at the Gates of Dawn",detail:"Primer álbum de estudio del grupo. Pertenece al período psicodélico encabezado por Syd Barrett.",url:"https://www.pinkfloyd.com/",source:"Pink Floyd · discografía"},
 {year:1973,lane:"works",title:"The Dark Side of the Moon",detail:"Lanzado en marzo de 1973; obra conceptual sobre tiempo, trabajo, dinero, vida y muerte.",url:"https://www.pinkfloyd.com/albums/the-dark-side-of-the-moon/",source:"Pink Floyd · ficha del álbum"},
 {year:1975,lane:"works",title:"Wish You Were Here",detail:"Publicado en septiembre de 1975, con canciones dedicadas en parte a Syd Barrett y a la experiencia de la ausencia.",url:"https://www.pinkfloyd.com/albums/wish-you-were-here/",source:"Pink Floyd · ficha del álbum"},
 {year:1977,lane:"works",title:"Animals",detail:"Álbum publicado en 1977. La fecha corresponde a la edición original, no a reediciones digitales.",url:"https://archive.pinkfloyd.com/history/biography",source:"Pink Floyd · biografía oficial"},
 {year:1979,lane:"works",title:"The Wall",detail:"Álbum de 1979 y punto clave en la evolución del espectáculo y la temática del aislamiento.",url:"https://rockhall.com/inductees/pink-floyd/",source:"Rock & Roll Hall of Fame"},
 {year:1996,lane:"docs",title:"Ingreso en el Rock & Roll Hall of Fame",detail:"Reconocimiento institucional de la trayectoria de Pink Floyd; no equivale a una fecha de producción musical.",url:"https://rockhall.com/inductees/pink-floyd/",source:"Rock & Roll Hall of Fame"}
];
const ramses=[
 {year:-1303,approx:true,lane:"life",title:"Nacimiento de Ramsés II",detail:"Datación biográfica aproximada, sujeta a las reconstrucciones de la cronología egipcia.",url:"https://egyptianmuseum.org/explore/new-kingdom-ruler-ramses-ii",source:"Rosicrucian Egyptian Museum"},
 {year:-1279,approx:true,lane:"life",title:"Comienzo del reinado",detail:"Ramsés II sucede a Seti I en la dinastía XIX; las fechas absolutas son aproximaciones historiográficas.",url:"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/ramsesii.html",source:"UCL · Digital Egypt"},
 {year:-1274,approx:true,lane:"military",title:"Batalla de Qadesh",detail:"Campaña del quinto año contra los hititas; el resultado militar y su representación propagandística deben distinguirse.",url:"https://nmec.gov.eg/mummies-hall/ramses-ii/",source:"National Museum of Egyptian Civilization"},
 {year:-1264,end:-1244,approx:true,lane:"works",title:"Construcción de Abu Simbel",detail:"Período propuesto de construcción de los templos rupestres; la datación es aproximada y existen otras propuestas.",url:"https://es.egyptianmuseum.org/explore/new-kingdom-monuments-abu-simbel",source:"Rosicrucian Egyptian Museum"},
 {year:-1258,approx:true,lane:"military",title:"Tratado con los hititas",detail:"El tratado de paz se sitúa hacia el año 21 del reinado. Se conservan tradiciones textuales egipcias e hititas.",url:"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/ramsesii.html",source:"UCL · Digital Egypt"},
 {year:-1213,approx:true,lane:"life",title:"Muerte de Ramsés II",detail:"Final de un reinado prolongado; fecha absoluta aproximada de la cronología convencional.",url:"https://www.ucl.ac.uk/museums-static/digitalegypt/chronology/ramsesii.html",source:"UCL · Digital Egypt"}
];
const labels={
 life:["Vida e institución","Life and institution","Vie et institution"],
 military:["Política y campañas","Politics and campaigns","Politique et campagnes"],
 works:["Obras y cultura","Works and culture","Œuvres et culture"],
 docs:["Documentos y recepción","Documents and reception","Documents et réception"]
};
const nameIsRamses=s=>/\b(?:ramses|rameses|ramesses|ramsses)\s*(?:ii|2|segundo|the great|el grande)\b/.test(fold(s));
const nameIsPink=s=>fold(s).replace(/^the /,"")==="pink floyd";
const state={query:"",root:null,valid:null,authority:null,rows:[],works:[],albums:[],topic:null,token:0};
function normalizeEvent(event){
 const year=yearValue(event?.year);if(year==null)return null;
 if(year>NOW||year < -4500)return null;
 const title=String(event.title||"").slice(0,125).trim();
 const url=sourceURL(event.url);
 if(!title||!url)return null;
 return {...event,title,year,url};
}
function gather(){
 const q=state.query,authority=state.authority;
 let events=(nameIsPink(q)?pink:nameIsRamses(q)?ramses:[]).map(x=>({...x,kind:"editorial"}));
 const isCurated=events.length>0;
 if(!isCurated&&authority){
  const meta=[
   ["birthYear","life",t("Nacimiento","Birth","Naissance"),"P569"],
   ["deathYear","life",t("Muerte","Death","Décès"),"P570"],
   ["inceptionYear","life",t("Fundación o inicio","Foundation or inception","Fondation ou début"),"P571"],
   ["publicationYear","works",t("Publicación identificada","Documented publication","Publication identifiée"),"P577"]
  ];
  for(const [property,lane,title,code] of meta){
   const y=yearValue(authority[property]);if(y==null)continue;
   events.push({year:y,lane,title,detail:t("Fecha incluida en la ficha de autoridad Wikidata ("+code+"). La precisión del testimonio debe comprobarse en la fuente.",
    "Date recorded in Wikidata authority metadata ("+code+"); source precision requires verification.",
    "Date de la notice Wikidata ("+code+"), précision à vérifier."),url:"https://www.wikidata.org/wiki/"+authority.wikidataId,source:"Wikidata · "+code});
  }
 }
 // A culturally related catalogue work is evidence of an attributed work,
 // NOT proof of significance or influence. Its date property is retained.
 for(const w of state.works.slice(0,22)){
  if(yearValue(w.year)==null||!w.id||!/^Q\d+$/.test(w.id))continue;
  events.push({year:w.year,lane:"works",title:w.title,
   detail:(w.description||t("Obra atribuida por el catálogo. Verificar las relaciones de autoría y la fecha.",
    "Attributed work from the catalogue. Verify authorship and dating.",
    "Œuvre attribuée par le catalogue ; vérifier attribution et datation."))+" · "+t("Tipo de fecha: ","Date type: ","Type de date : ")+(w.dateKind||"sin determinar"),
   url:"https://www.wikidata.org/wiki/"+w.id,source:"Wikidata · "+(w.dateProperty||"fecha tipificada"),image:w.image,dateKind:w.dateKind});
 }
 // Apple Music year is a catalogue EDITION date, not first release.
 if(!isCurated)for(const a of state.albums.slice(0,16)){
  const y=Number(String(a.releaseDate||"").slice(0,4));
  if(yearValue(y)==null||y<1870)continue;
  events.push({year:y,lane:"docs",title:a.title,
   detail:t("Fecha de la edición incluida en el catálogo musical; puede ser una reedición y NO es automáticamente el estreno original.",
    "Catalogued edition date; this may be a reissue and is NOT necessarily the original release.",
    "Date de l'édition cataloguée, parfois une réédition ; ce n'est pas nécessairement la sortie originale."),
   url:a.url,source:"Apple Music · edición catalogada",image:a.image});
 }
 // Generic work/edition search: dates of evidence are separate from dates of life.
 for(const r of state.rows.slice(0,100)){
  if(!["manuscript","edition","article","book","openlibrary","googlebook"].includes(r.type))continue;
  const qTokens=fold(q).split(" ").filter(x=>x.length>3);
  const title=fold(r.title||"");
  if(!qTokens.length||!qTokens.every(w=>title.includes(w)))continue;
  const y=yearValue(Number(r.editionYear||r.year||r.codexDate));
  if(y==null||!sourceURL(r.link)||!String(r.title||"").trim())continue;
  events.push({year:y,lane:"docs",title:r.title,
   detail:t("Fecha de un registro documental o de una edición recuperada por coincidencia temática. No es necesariamente un acontecimiento biográfico.",
    "Date of a retrieved publication or documentary record, not necessarily a biographical event.",
    "Date d'une notice éditoriale ou documentaire, non nécessairement un événement biographique."),
   url:r.link,source:String(r.source||"Catálogo externo").slice(0,80)});
 }
 const seen=new Set();
 events=events.map(normalizeEvent).filter(Boolean).filter(e=>{
  const k=fold(e.title)+"|"+e.year+"|"+e.lane;
  if(seen.has(k))return false;seen.add(k);return true
 });
 return events.sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title)).slice(0,44);
}
function renderUI(){
 if(!state.valid?.()||!state.root?.isConnected)return;
 const events=gather(),mount=state.root;
 mount.replaceChildren();
 if(!events.length){mount.hidden=true;return}
 mount.hidden=false;
 const heading=el("div","vat-head");
 heading.append(el("h4","context-section-title",t("Cronología documental interactiva","Interactive source chronology","Chronologie documentaire interactive")));
 const qualifier=el("p","vat-method",t(
  "Fechas, obras y testimonios de origen identificado. La línea documental distingue ediciones de acontecimientos originales. Seleccioná un hito para leer.",
  "Sourced dates, works and witnesses. Catalogue editions are not treated as original events. Select a milestone for details.",
  "Dates, œuvres et témoins sourcés. Les éditions ne sont pas confondues avec les événements originaux. Choisissez un jalon."));
 heading.append(qualifier);mount.append(heading);
 const detail=el("div","vat-detail");detail.hidden=true;detail.setAttribute("aria-live","polite");
 for(const lane of ["life","military","works","docs"]){
  const items=events.filter(x=>x.lane===lane);if(!items.length)continue;
  const band=el("section","vat-lane");
  const name=el("div","vat-lane-header");
  const label=el("h5",null,labels[lane][locale()==="en"?1:locale()==="fr"?2:0]+" · "+items.length);
  const previous=el("button",null,"←"),next=el("button",null,"→");previous.type=next.type="button";
  previous.setAttribute("aria-label",t("Retroceder","Scroll left","Défiler vers la gauche"));
  next.setAttribute("aria-label",t("Avanzar","Scroll right","Défiler vers la droite"));
  const navigation=el("div","vat-navigation");navigation.append(previous,next);name.append(label,navigation);
  const rail=el("div","vat-rail");rail.tabIndex=0;
  rail.setAttribute("aria-label",t("Línea temporal: ","Timeline: ","Frise chronologique : ")+labels[lane][0]);
  previous.onclick=()=>rail.scrollBy({left:-240,behavior:"smooth"});
  next.onclick=()=>rail.scrollBy({left:240,behavior:"smooth"});
  rail.addEventListener("keydown",e=>{if(e.target!==rail)return;if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();rail.scrollBy({left:e.key==="ArrowRight"?220:-220,behavior:"smooth"})}});
  for(const event of items){
   const button=el("button","vat-event");button.type="button";
   const time=el("span","vat-date",dateLabel(event.year,!!event.approx)+(event.end!=null?"–"+dateLabel(event.end,false):""));
   const title=el("strong",null,event.title);button.append(time,title);
   if(event.image&&/^https:\/\//.test(event.image)){
    const image=el("img");image.src=event.image;image.alt=event.title;
    image.loading="lazy";image.decoding="async";image.onerror=()=>image.remove();button.prepend(image)
   }
   button.addEventListener("click",()=>{
    for(const item of mount.querySelectorAll(".vat-event[aria-pressed=true]"))item.setAttribute("aria-pressed","false");
    button.setAttribute("aria-pressed","true");
    const h=el("h5",null,event.title+" · "+dateLabel(event.year,!!event.approx));
    const p=el("p",null,event.detail||t("Consulte la fuente para ampliar este hito.","Consult the source for details.","Consulter la source."));
    const a=el("a",null,t("Abrir fuente primaria o registro","Open original source or record","Voir la source ou la notice"));
    a.href=event.url;a.rel="noopener noreferrer";a.target="_blank";
    detail.replaceChildren(h,p,el("small",null,event.source||""),a);detail.hidden=false;
   });
   rail.append(button);
  }
  band.append(name,rail);mount.append(band)
 }
 mount.append(detail)
}
function attach(parent,query,topic,authority,valid){
 if(!parent||typeof valid!=="function")return;
 const container=el("section","vat-timeline");
 container.hidden=true;
 parent.append(container);
 state.query=String(query||"").trim();
 state.root=container;state.valid=valid;state.authority=authority||null;state.rows=[];state.works=[];state.albums=[];state.topic=topic||null;state.token++;
 renderUI();
 if(!state.authority&&window.VitruviaEntityResolver?.resolve){
  const token=state.token;
  window.VitruviaEntityResolver.resolve(state.query,locale()).then(value=>{
   if(token!==state.token||!value||!valid())return;
   state.authority=value;renderUI();
  }).catch(()=>{});
 }
}
window.addEventListener("vitruvia:albums",e=>{
 const d=e.detail||{};
 if(!state.query||fold(d.query)!==fold(state.topic?.name||state.query))return;
 state.albums=Array.isArray(d.albums)?d.albums:[];renderUI();
});
window.addEventListener("vitruvia:cultural-works",e=>{
 const d=e.detail||{};
 if(!state.query||!state.authority||d.wikidataId!==state.authority.wikidataId)return;
 state.works=Array.isArray(d.works)?d.works:[];renderUI();
});
window.addEventListener("vitruvia:results",e=>{
 if(fold(e.detail?.query)!==fold(state.query))return;
 state.rows=Array.isArray(e.detail?.rows)?e.detail.rows:[];renderUI();
});
window.VitruviaAcademicTimeline={attach,version:"1.0-source-lanes"};
})();