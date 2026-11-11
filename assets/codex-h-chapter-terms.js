/* Lexical chapter-to-folio navigation for Codex H.
 * Selected forms, counts, and loci are from the V514 editorial Latin.
 * Folio recommendations are document anchors or positional estimates, never H word attestations.
 */
(()=>{"use strict";
const root=document.getElementById("h-chapter-terms");
const bookSelect=document.getElementById("h-term-book"),chapterSelect=document.getElementById("h-term-chapter");
const status=document.getElementById("h-term-status"),results=document.getElementById("h-term-results");
if(!root||!bookSelect||!chapterSelect||!status||!results)return;
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
let index=null,serial=0;
const el=(tag,text,className)=>{
 const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;
};
const link=(title,href)=>{
 const a=el("a",title);a.href=href;return a;
};
const pairLabel=ref=>{
 if(ref.kind==="estimate")return "posición estimada, sin cotejo";
 return ({
  visual_rubric:"ancla de rúbrica registrada",
  visual_text:"ancla textual registrada",
  provisional:"vínculo provisional",
  catalogue:"referencia catalográfica"
 })[ref.status]||"vínculo documentado, palabra no verificada";
};
function chaptersOf(book){
 return index.chapters.filter(x=>x.book===book).sort((a,b)=>
  a.chapter==="praef"?-1:b.chapter==="praef"?1:Number(a.chapter)-Number(b.chapter));
}
function populateChapters(book,wanted){
 chapterSelect.replaceChildren();
 for(const ch of chaptersOf(book)){
  const opt=document.createElement("option");
  opt.value=String(ch.chapter);
  opt.textContent=ch.chapter==="praef"?"Prefacio":("Capítulo "+ch.chapter);
  chapterSelect.append(opt);
 }
 chapterSelect.value=wanted&&[...chapterSelect.options].some(x=>x.value===wanted)?wanted:
  ([...chapterSelect.options].some(x=>x.value==="1")?"1":"praef");
}
async function candidates(term,serialAtRender,holder){
 const C=window.CodexHConcordance;
 if(!C){holder.textContent="Concordancia de folios no disponible.";return}
 const results=await Promise.all(term.loci.map(async locus=>{
  try{return {locus,data:await C.locate(locus)}}catch{return {locus,data:null}}
 }));
 if(serial!==serialAtRender)return;
 const folios=new Map();let unresolved=0;
 for(const {locus,data} of results){
  if(!data){unresolved++;continue}
  const exact=(data.exact||[]).filter(x=>x.status!=="catalogue");
  if(exact.length){
   for(const f of exact){
    if(!folios.has(f.folio))folios.set(f.folio,{folio:f.folio,kind:"documented",status:f.status,loci:new Set()});
    folios.get(f.folio).loci.add(locus);
   }
  }else if(data.estimate?.folio){
   const f=data.estimate.folio;
   if(!folios.has(f))folios.set(f,{folio:f,kind:"estimate",status:"estimated",loci:new Set()});
   folios.get(f).loci.add(locus);
  }else unresolved++;
 }
 holder.replaceChildren();
 if(!folios.size){holder.textContent="Todavía no hay folio candidato documentado para estos loci.";return}
 const note=el("p","Folios candidatos de H para los loci de V514 (no equivalen a ocurrencias confirmadas en el manuscrito):","h-term-caution");holder.append(note);
 const ordered=[...folios.values()].sort((a,b)=>{
  const m=x=>String(x).match(/(\d+)([rv])/);
  const A=m(a.folio),B=m(b.folio);
  return A&&B?(+A[1]-(+B[1]))*2+(A[2]==="v"?1:0)-(B[2]==="v"?1:0):String(a.folio).localeCompare(String(b.folio));
 });
 for(const item of ordered){
  const row=el("div",undefined,"h-term-folio");
  const a=link("f. "+item.folio,"codex-h-folios-local.html?"+new URLSearchParams({folio:"f."+item.folio}));
  a.target="_blank";a.rel="noopener";
  a.title="Abrir el folio y verificar manualmente la lectura";
  row.append(a,el("small"," · "+pairLabel(item)+" · "+[...item.loci].join(", ")));
  holder.append(row);
 }
 if(unresolved)holder.append(el("small",unresolved+" loci aún sin ubicación estimada."));
}
function render(){
 if(!index)return;
 const key=bookSelect.value+"."+chapterSelect.value;
 const group=index.chapters.find(x=>x.id===key),current=++serial;
 results.replaceChildren();
 if(!group){status.textContent="No hay capítulo estructurado para esta selección.";return}
 status.textContent="Libro "+R[group.book]+" · "+(group.chapter==="praef"?"Prefacio":"capítulo "+group.chapter)+
  " · "+group.passages+" pasajes en V514 · "+group.terms.length+
  " formas seleccionadas automáticamente. Frecuencias y loci de V514, no de H.";
 for(const [i,term] of group.terms.entries()){
  const article=el("article",undefined,"h-term-result");
  const heading=el("div",undefined,"h-term-heading");
  heading.append(el("strong",(i+1)+". "));
  const lex=link(term.form,"vitruvia-lexicon.html?"+new URLSearchParams({q:term.form,mode:"palabra",lang:"la"}));
  lex.title="Abrir entrada de Lexicón para la forma latina";
  heading.append(lex,el("small",term.occurrences+" ocurrencia(s) en V514 · "+term.loci.length+" locus/loci"));
  article.append(heading);
  const locusRow=el("div",undefined,"h-term-loci");
  for(const locus of term.loci){
   const a=link("Vitr. "+locus,"lector-bilingue.html?"+new URLSearchParams({edition:"recensio-es",locus,q:term.form}));
   a.title="Leer el pasaje latino y su traducción";
   locusRow.append(a);
  }
  article.append(locusRow);
  const details=document.createElement("details");details.open=true;details.className="h-term-details";
  const summary=el("summary","Ver folios de H asociados con estos loci (verificación paleográfica pendiente)");
  details.append(summary);
  const found=el("div","Calculando folios candidatos…","h-term-folios");details.append(found);
  article.append(details);results.append(article);
  candidates(term,current,found).catch(()=>{if(current===serial)found.textContent="No se pudo obtener la posición candidata";});
 }
}
function init(data){
 if(!data||!Array.isArray(data.chapters))throw Error("Índice de capítulos no válido");
 index=data;
 for(let b=1;b<=10;b++){
  const o=document.createElement("option");o.value=String(b);o.textContent="Libro "+R[b];bookSelect.append(o);
 }
 bookSelect.value="1";populateChapters(1,"2");
 bookSelect.addEventListener("change",()=>{populateChapters(+bookSelect.value);render()});
 chapterSelect.addEventListener("change",render);
 render();
}
fetch("data/codex-h/terminos-capitulos-v514.json?v=20261111-priority-v2").then(r=>{
 if(!r.ok)throw Error("HTTP "+r.status);return r.json();
}).then(init).catch(e=>{status.textContent="Índice de términos no disponible: "+String(e.message||e)});
})();