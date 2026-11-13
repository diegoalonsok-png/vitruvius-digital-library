/* Codex H: optional 1 / 2 / 3-column scholarly reader.
 * Uses ONLY folio-to-locus records actually documented by the local map.
 * V514 Latin is an editorial reading, NEVER a diplomatic transcription of H.
 * Source text and translation load only if the user chooses study mode.
 * Does not modify default facing-folio interface or its original zoom/filters.
 */
(function(){
 "use strict";
 const book=document.querySelector("section.book");
 if(!book||!document.getElementById("left-stage")||!document.getElementById("right-stage"))return;
 const $=id=>document.getElementById(id);
 const label=code=>({
  spread:"Doble folio",parallel:"Folio + latín",triple:"Folio + latín + traducción",
  sideLeft:"Folio izquierdo",sideRight:"Folio derecho",
  original:"Texto latino de la edición V514",
  translation:"Traducción castellana de la edición V514",
  warning:"Este texto procede de una edición moderna, NO de una transcripción diplomática del Codex H.",
  loading:"Consultando datos de loci documentados…",
  unavailable:"No hay correspondencia de folio y locus documentada para esta hoja. No se infiere su texto por proximidad de página.",
  missing:"El texto de este locus no está disponible en la edición consultada.",
  map:"Correspondencia de investigación, no alineación letra a letra ni cotejo paleográfico",
  citation:"Consultar el locus en el lector bilingüe",
  institutional:"Codex H: British Library, Harley MS 2767",
  published:"Fuente latina y traducción: Vitruvio, De architectura, ed. V514",
  errors:"No se pudieron consultar los archivos de correspondencias o la edición; se conserva el manuscrito sin asociarle una lectura no comprobada."
 })[code]||code;
 const style=document.createElement("style");
 style.id="codex-h-study-panels-css";
 style.textContent=[
  ".ch-study-tools{display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:8px 12px;margin:0 0 10px;border:1px solid #b8a88c;background:#f4ecdc;color:#223b4e;font:12px/1.45 system-ui,sans-serif}",
  ".ch-study-tools button{padding:6px 9px;border:1px solid #9b907d;background:#fdf8ef;color:#1c3546;cursor:pointer;font:inherit}",
  ".ch-study-tools button[aria-pressed=true]{background:#223b4e;color:#fff}",
  ".ch-study-tools button:disabled{opacity:.4;cursor:not-allowed}",
  ".ch-study-panel{min-width:0;overflow:auto;max-height:min(75vh,1020px);background:#fdf8ef;color:#242a30;border:1px solid #a79578;padding:15px 16px;overflow-wrap:anywhere}",
  ".ch-study-panel h3{font:20px/1.3 Georgia,serif;margin:0 0 8px}",
  ".ch-study-panel p{margin:8px 0;font:12px/1.55 system-ui,sans-serif}",
  ".ch-study-panel blockquote{margin:10px 0 20px;padding:0;border:0;color:#25292d;font:17px/1.7 'Gentium Book Plus',Georgia,serif;white-space:pre-wrap}",
  ".ch-study-panel .ch-study-source{font:11px/1.55 system-ui,sans-serif;color:#555d65}",
  ".ch-study-panel a{color:#194e76;text-decoration:underline}",
  ".book[data-ch-study=parallel]{grid-template-columns:repeat(2,minmax(0,1fr))}",
  ".book[data-ch-study=triple]{grid-template-columns:repeat(3,minmax(0,1fr))}",
  ".book[data-ch-study=spread] .ch-study-panel{display:none}",
  ".book[data-ch-study=parallel] .ch-study-translation{display:none}",
  ".book[data-ch-study]:not([data-ch-study=spread])[data-ch-side=left] .leaf.right{display:none}",
  ".book[data-ch-study]:not([data-ch-study=spread])[data-ch-side=right] .leaf.left{display:none}",
  "html[data-reader-theme=dark] .ch-study-tools{background:#394754;color:#f9ecdc}",
  "html[data-reader-theme=dark] .ch-study-tools button{background:#263a4a;color:#f9ecdc}",
  "html[data-reader-theme=dark] .ch-study-tools button[aria-pressed=true]{background:#9b7844;color:#fff}",
  "@media(max-width:840px){.book[data-ch-study=triple]{grid-template-columns:1fr 1fr}.book[data-ch-study=triple] .ch-study-translation{grid-column:1 / -1;max-height:55vh}}",
  "@media(max-width:520px){.book[data-ch-study=parallel],.book[data-ch-study=triple]{grid-template-columns:1fr}.book[data-ch-study=triple] .ch-study-translation{grid-column:auto}}"
 ].join("");
 document.head.append(style);
 const controls=document.createElement("div");
 controls.className="ch-study-tools";
 controls.setAttribute("role","group");
 controls.setAttribute("aria-label","Modalidad de lectura filológica del Codex H");
 const modes=new Map();
 let currentMode="spread",side="left",hasChosenSide=false;
 const addButton=(text,callback)=>{
  const b=document.createElement("button");b.type="button";b.textContent=text;
  b.addEventListener("click",callback);controls.append(b);return b;
 };
 for(const type of ["spread","parallel","triple"]){
  const b=addButton(label(type),()=>setMode(type,true));
  b.setAttribute("aria-pressed",String(type==="spread"));modes.set(type,b);
 }
 const leftButton=addButton(label("sideLeft"),()=>{side="left";hasChosenSide=true;draw()});
 const rightButton=addButton(label("sideRight"),()=>{side="right";hasChosenSide=true;draw()});
 const status=document.createElement("span");
 status.setAttribute("role","status");status.style.marginLeft="auto";
 controls.append(status);
 book.before(controls);
 const makePanel=(kind,title)=>{
  const panel=document.createElement("section");panel.className="ch-study-panel ch-study-"+kind;
  panel.setAttribute("aria-label",title);
  const h=document.createElement("h3");h.textContent=title;panel.append(h);
  const body=document.createElement("div");panel.append(body);book.append(panel);
  return body;
 };
 const latin=makePanel("latin",label("original"));
 const translation=makePanel("translation",label("translation"));
 book.dataset.chStudy="spread";
 book.dataset.chSide=side;
 let dataPromise=null,data=null,serial=0;
 const source=(url)=>fetch(url,{headers:{Accept:"application/json"}}).then(r=>{
  if(!r.ok)throw Error("HTTP "+r.status+" · "+url);
  return r.json();
 });
 function loadData(){
  if(!dataPromise)dataPromise=Promise.all([
   source("data/codex-h/folio-locus-map.json"),
   source("data/structured/recensio-es.json")
  ]).then(([map,edition])=>{
   if(!Array.isArray(map.entries)||!Array.isArray(edition.passages)||
      edition.edition!=="recensio-es"||edition.version!=="V514")
    throw Error("La fuente documental no cumple el contrato de datos");
   const byFolio=new Map();
   for(const entry of map.entries){
    if(!/^\d{1,3}[rv]$/.test(entry.folio||"")||!Number.isInteger(entry.image_number))continue;
    byFolio.set(entry.folio.toLowerCase()+"|"+entry.image_number,entry);
   }
   const byLocus=new Map(edition.passages.map(x=>[x.locus,x]));
   data={byFolio,byLocus};
   return data;
  }).catch(e=>{dataPromise=null;throw e});
  return dataPromise;
 }
 function leaf(side){
  const txt=$(side+"-label")?.textContent||"";
  const meta=$(side+"-meta")?.textContent||"";
  const match=txt.match(/(?:\bf\.?\s*)?(\d{1,3}[rv])\b/i);
  const number=meta.match(/(?:imagen digital|image)\s*(\d+)/i);
  return match&&number&&!( $(side+"-image")?.hidden )?
   {folio:match[1].toLowerCase(),number:Number(number[1])}:null;
 }
 const p=(parent,text,css)=>{
  const n=document.createElement("p");n.textContent=text;
  if(css)n.className=css;parent.append(n);return n;
 };
 function textEntry(parent,part,locus,entry){
  const link=document.createElement("a");link.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(locus);
  link.textContent=label("citation")+" · "+locus;parent.append(link);
  const reading=part==="latin"?entry.latin:entry.translation;
  if(typeof reading==="string"&&reading.trim()){
   const q=document.createElement("blockquote");q.textContent=reading.trim();q.lang=part==="latin"?"la":"es";parent.append(q);
  }else p(parent,label("missing"));
 }
 function renderText(reading){
  latin.replaceChildren();translation.replaceChildren();
  p(latin,label("institutional"),"ch-study-source");
  p(latin,label("warning"),"ch-study-source");
  p(translation,label("published"),"ch-study-source");
  if(!reading){p(latin,label("unavailable"));p(translation,label("unavailable"));return;}
  const entry=data.byFolio.get(reading.folio+"|"+reading.number);
  if(!entry||!Array.isArray(entry.loci)||!entry.loci.length){
   p(latin,label("unavailable"));p(translation,label("unavailable"));return;
  }
  p(latin,"Folio "+entry.folio+" · imagen "+entry.image_number+" · "+label("map"),"ch-study-source");
  p(translation,"Edición V514 · DOI: 10.5281/zenodo.23884757 · versión editorial castellana","ch-study-source");
  const entries=entry.loci.slice(0,4);
  for(const loc of entries){
   const locus=String(loc.locus||"");
   if(!/^(?:10|[1-9])\.(?:praef|\d+)\.\d+$/.test(locus))continue;
   const real=data.byLocus.get(locus);
   p(latin,"Locus "+locus+" · evidencia: "+(loc.status||entry.folio_status||"no clasificada")+
    " · "+(loc.extent||"alcance no declarado"),"ch-study-source");
   if(loc.note)p(latin,loc.note,"ch-study-source");
   if(real){textEntry(latin,"latin",locus,real);textEntry(translation,"translation",locus,real);}
   else {p(latin,"Locus "+locus+" · "+label("missing"));p(translation,"Locus "+locus+" · "+label("missing"));}
  }
  if(entry.loci.length>4)p(latin,"Se muestran 4 de "+entry.loci.length+" referencias registradas. El registro original sigue intacto.","ch-study-source");
  const doi=document.createElement("a");doi.href="https://doi.org/10.5281/zenodo.23884757";
  doi.textContent="DOI · V514";doi.target="_blank";doi.rel="noopener noreferrer";
  latin.append(doi);
 }
 async function draw(){
  book.dataset.chStudy=currentMode;
  const l=leaf("left"),r=leaf("right");
  leftButton.hidden=rightButton.hidden=currentMode==="spread";
  leftButton.disabled=!l;rightButton.disabled=!r;
  if((side==="left"&&!l)||(side==="right"&&!r)){side=l?"left":"right";hasChosenSide=false}
  leftButton.setAttribute("aria-pressed",String(side==="left"));
  rightButton.setAttribute("aria-pressed",String(side==="right"));
  book.dataset.chSide=side;
  if(currentMode==="spread"){status.textContent="";return;}
  const reading=side==="left"?l:r;
  const ticket=++serial;
  status.textContent=label("loading");
  try{
   await loadData();
   if(ticket!==serial||currentMode==="spread")return;
   renderText(reading);
   status.textContent=reading?"Folio "+reading.folio+" · correspondencia documentada o ausencia declarada":"Sin folio visible";
  }catch(err){
   if(ticket!==serial)return;
   latin.replaceChildren();translation.replaceChildren();
   p(latin,label("errors"));p(translation,label("errors"));status.textContent=label("errors");
  }
 }
 function setMode(mode,updateUrl){
  currentMode=mode;
  modes.forEach((button,key)=>button.setAttribute("aria-pressed",String(key===mode)));
  if(updateUrl){const url=new URL(location.href);
   if(mode==="spread")url.searchParams.delete("study");
   else url.searchParams.set("study",mode);
   history.replaceState(null,"",url);
  }
  draw();
 }
 for(const id of ["left-label","left-meta","right-label","right-meta"]){
  const el=$(id);if(!el)continue;
  const observer=new MutationObserver(()=>{if(currentMode!=="spread")draw()});
  observer.observe(el,{childList:true,characterData:true,subtree:true});
 }
 const initial=new URLSearchParams(location.search).get("study");
 if(initial==="parallel"||initial==="triple")setMode(initial,false);
 window.VitruviusCodexHStudy={setMode,source:"data/codex-h/folio-locus-map.json",edition:"V514"};
})();