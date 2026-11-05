/* Concordancia Codex H (Harley MS 2767) ↔ loci de De architectura.
   Tres grados, siempre declarados:
   · material: entrada del mapa (rúbrica verificada visualmente, catálogo BL o estudio provisional);
   · libro: el locus pertenece a un libro cuyos folios inicial y final están verificados;
   · estimado: posición dentro del libro por proporción de texto (orientativa, no material).
   Fuente: data/codex-h/folio-locus-map.json + data/structured/recensio-es.json. */
(()=>{
"use strict";
const MAP="data/codex-h/folio-locus-map.json?v=20261105-praef-v1",TEXT="data/structured/recensio-es.json";
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
let promise=null;
const pageOf=f=>{const m=String(f||"").replace(/^f\.?\s*/,"").match(/^(\d+)([rv])$/);return m?(+m[1]-1)*2+(m[2]==="v"?1:0):null};
const folioOf=p=>Math.floor(p/2)+1+(p%2?"v":"r");
function load(){
 if(promise)return promise;
 promise=Promise.all([fetch(MAP).then(r=>r.json()),fetch(TEXT).then(r=>r.json())]).then(([map,text])=>{
  const passages=text.passages||[],books=new Map();
  for(const p of passages){if(!books.has(p.book))books.set(p.book,[]);books.get(p.book).push(p)}
  // Peso de cada pasaje dentro de su libro (longitud del latín) para la estimación.
  const cum=new Map();
  for(const [b,list] of books){const tot=list.reduce((s,p)=>s+p.latin.length,0)||1;let c=0;
   for(const p of list){cum.set(p.locus,{book:b,from:c/tot,to:(c+p.latin.length)/tot});c+=p.latin.length}}
  return {map,passages,books,cum,bookRanges:new Map((map.books||[]).map(x=>[x.book,x]))}
 }).catch(e=>{promise=null;throw e});
 return promise
}
const bookOf=l=>Number(String(l).split(".")[0]);
/* Anclas verificadas de un libro: comienzo del prefacio, comienzo del capítulo 1 y fin del libro.
   La estimación se interpola por tramos (prefacio / cuerpo), no sobre todo el libro. */
function anchors(d,book){const b=d.bookRanges.get(book);if(!b)return null;const list=d.books.get(book)||[];
 const ch1=list.find(p=>!p.locus.includes(".praef."));const A=[{x:0,pg:pageOf(b.start)}];
 if(b.chapter1&&ch1){const c=d.cum.get(ch1.locus);if(c&&c.from>0)A.push({x:c.from,pg:pageOf(b.chapter1)})}
 A.push({x:1,pg:pageOf(b.end)});return A}
const xToPage=(A,x)=>{for(let i=1;i<A.length;i++)if(x<=A[i].x){const a=A[i-1],b=A[i];return a.pg+(b.pg-a.pg)*((x-a.x)/((b.x-a.x)||1))}return A.at(-1).pg};
const pageToX=(A,pg)=>{for(let i=1;i<A.length;i++)if(pg<=A[i].pg){const a=A[i-1],b=A[i];return a.x+(b.x-a.x)*((pg-a.pg)/((b.pg-a.pg)||1))}return 1};
const matches=(entryLocus,locus)=>entryLocus===locus||locus.startsWith(entryLocus+".");
/* Locus → folio(s) de H. */
async function locate(locus){
 const d=await load();locus=String(locus||"").trim();
 const exact=d.map.entries.filter(e=>(e.loci||[]).some(l=>matches(l.locus,locus)))
  .map(e=>({folio:e.folio,image:e.image_number,status:(e.loci.find(l=>matches(l.locus,locus))||{}).status||e.folio_status,note:(e.loci.find(l=>matches(l.locus,locus))||{}).note||e.notes}));
 const book=d.bookRanges.get(bookOf(locus))||null;
 let estimate=null;
 const c=d.cum.get(locus)||[...d.cum.entries()].find(([k])=>k.startsWith(locus+"."))?.[1];
 if(book&&c){const A=anchors(d,book.book),a=pageOf(book.start),b=pageOf(book.end);
  if(A){const p=Math.round(xToPage(A,(c.from+c.to)/2));estimate={folio:folioOf(p),from:folioOf(Math.max(a,p-1)),to:folioOf(Math.min(b,p+1)),section:/\.praef\./.test(locus)?"praefatio":"capitula"}}}
 return {locus,exact,book:book&&{number:book.book,roman:R[book.book],start:book.start,chapter1:book.chapter1||null,end:book.end,status:book.status},estimate}
}
/* Folio de H → libro y loci (material si existe; si no, estimado). */
async function forFolio(folio){
 const d=await load(),f=String(folio||"").replace(/^f\.?\s*/,""),pg=pageOf(f);
 const entry=d.map.entries.find(e=>e.folio===f)||null;
 if(pg==null)return {folio:f,entry,book:null,estimate:null};
 const book=(d.map.books||[]).filter(b=>pageOf(b.start)<=pg&&pg<=pageOf(b.end)).pop()||null;
 let estimate=null;
 if(book){const A=anchors(d,book.book),x=A?pageToX(A,pg+.5):0;
  const list=d.books.get(book.book)||[];estimate=list.find(p=>{const c=d.cum.get(p.locus);return c&&x>=c.from&&x<=c.to})||list.at(-1)||null}
 return {folio:f,entry,book:book&&{number:book.book,roman:R[book.book],start:book.start,chapter1:book.chapter1||null,end:book.end},section:book&&book.chapter1&&pg<pageOf(book.chapter1)?"praefatio":book&&book.chapter1&&pg===pageOf(book.chapter1)?"praefatio y capítulo 1":"capitula",estimate:estimate&&estimate.locus}
}
const cite=l=>{if(!l)return"";const [b,...r]=String(l).split(".");return "Vitr. "+(R[+b]||b)+"."+r.join(".").replace(/^praef\./,"praef. ")};
const LABEL={visual_rubric:"rúbrica verificada en la fotografía",visual_text:"comienzo verificado en el texto de la fotografía",catalogue:"catálogo de la British Library",provisional:"estudio provisional",not_verified:"sin verificar"};
window.CodexHConcordance={load,locate,forFolio,cite,label:s=>LABEL[s]||s,version:"1.0"};
})();
