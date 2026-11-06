/* Independent historical OCR comparison: source pages, not scholarly loci.
   Read only on explicit query. No historical text or translation is generated. */
(()=>{
"use strict";
const editions=[
 {id:"krohn-1912",name:"Fritz Krohn · 1912",language:"Latín",path:"data/text/krohn-1912.json",pages:314},
 {id:"rose-1899",name:"Valentin Rose · 1899",language:"Latín",path:"data/text/rose-1899.json",pages:358},
 {id:"perrault-1673",name:"Claude Perrault · 1673",language:"Francés",path:"data/text/perrault-1673.json",pages:370}
];
const $=id=>document.getElementById(id), form=$("historical-ocr-form"),query=$("historical-ocr-query");
const status=$("historical-ocr-status"),container=$("historical-ocr-results");
const cache=new Map();let serial=0;
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
function getPages(e){
 if(!cache.has(e.path))cache.set(e.path,fetch(e.path).then(r=>{
  if(!r.ok)throw Error("Índice HTTP "+r.status);
  return r.json();
 }).then(d=>{
  if(!Array.isArray(d)||d.length<200||d.some(x=>!Number.isInteger(x.page)||typeof x.text!=="string"))
   throw Error("Índice incompleto o no validado");
  return d;
 }).catch(error=>{cache.delete(e.path);throw error;}));
 return cache.get(e.path);
}
function occurrences(text,term){
 const plain=fold(text),target=fold(term);let count=0,at=0,first=-1;
 while((at=plain.indexOf(target,at))!==-1&&count<1000){
  if(first<0)first=at;
  count++;at+=Math.max(1,target.length);
 }
 return {count,first};
}
function el(tag,text,className){
 const n=document.createElement(tag);if(text!==undefined)n.textContent=text;
 if(className)n.className=className;return n;
}
function render(e,result,term){
 const card=el("section",undefined,"ocr-edition");
 card.append(el("h2",e.name),el("p",e.language+" · OCR por página del facsímil · "+e.pages+" registros de página"));
 if(result.error){card.append(el("p","Índice no disponible: "+result.error));return card;}
 const {total,pages}=result;
 card.append(el("p",total+" coincidencia(s) OCR en "+pages.length+" páginas digitales."));
 if(!pages.length){card.append(el("p","Sin coincidencias en este OCR; no demuestra ausencia en el impreso."));return card;}
 const nav=el("nav",undefined,"ocr-pages");nav.setAttribute("aria-label","Páginas OCR de "+e.name);
 for(const p of pages.slice(0,24)){
  const url="concordancia-historica.html?ed="+encodeURIComponent(e.id)+
   "&q="+encodeURIComponent(term)+"&page="+p.page;
  const a=el("a","p. "+p.page+" ("+p.count+")");
  a.href=url;a.title="Abrir página OCR "+p.page+" del facsímil "+e.name;
  nav.append(a);
 }
 card.append(nav);
 if(pages.length>24)card.append(el("p","Se muestran las primeras 24 páginas con coincidencias; el recuento incluye todas."));
 return card;
}
async function run(term){
 const request=++serial;
 container.replaceChildren();status.textContent="Consultando los tres índices OCR…";
 const responses=await Promise.all(editions.map(async e=>{
  try{
   const source=await getPages(e),pages=[];let total=0;
   for(const p of source){
    const hit=occurrences(p.text,term);
    if(!hit.count)continue;
    total+=hit.count;pages.push({page:p.page,count:hit.count});
   }
   return {total,pages};
  }catch(error){return {error:error.message||"Error de carga"};}
 }));
 if(request!==serial)return;
 let total=0,loaded=0;
 for(let i=0;i<editions.length;i++){
  const result=responses[i];if(!result.error){loaded++;total+=result.total;}
  container.append(render(editions[i],result,term));
 }
 status.textContent=loaded+" de 3 índices consultados · "+total+
  " coincidencias OCR para «"+term+"». Coincidencias no cotejadas con los impresos.";
}
form.addEventListener("submit",e=>{
 e.preventDefault();
 const term=query.value.trim();
 if(term.length<3||term.length>90){status.textContent="Introduce al menos tres caracteres (máximo 90).";return;}
 const u=new URL(location.href);u.searchParams.set("q",term);history.replaceState(null,"",u);
 run(term);
});
const initial=new URLSearchParams(location.search).get("q");
if(initial&&initial.length>=3&&initial.length<=90){query.value=initial;run(initial);}
})();
