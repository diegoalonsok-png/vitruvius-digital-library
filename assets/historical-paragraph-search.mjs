import {buildParagraphCandidates,searchParagraphCandidates} from "./historical-paragraph-core.mjs";
const $=id=>document.getElementById(id);
const SOURCES={
 "krohn-1912":{label:"Krohn 1912 · texto latino OCR",link:p=>"documents/krohn-1912.pdf#page="+p,linkLabel:"Abrir PDF · página "+p},
 "rose-1899":{label:"Rose 1899 · texto latino OCR",link:p=>"https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf#page="+p,linkLabel:"Abrir PDF externo · página "+p},
 "cesariano-1521":{label:"Cesariano 1521 · italiano histórico OCR",link:p=>"cesariano-1521.html?image="+p,linkLabel:"Consultar imagen aproximada "+p+" (no cotejada con foliación)"}
};
const caches=new Map();let serial=0,modelPromise;
const el=(tag,content,cls)=>{const node=document.createElement(tag);if(content!==undefined)node.textContent=String(content);if(cls)node.className=cls;return node;};
async function records(edition) {
 if(!caches.has(edition)){
  const loading=(async()=>{const r=await fetch("data/text/"+edition+".json");if(!r.ok)throw Error("OCR no disponible ("+r.status+")");
   const pages=await r.json();
   if(!Array.isArray(pages)||!pages.length)throw Error("Archivo OCR sin páginas");
   const rows=buildParagraphCandidates(edition,pages);
   return {pages:pages.length,rows};})();
  caches.set(edition,loading);
 }
 try{return await caches.get(edition);}catch(e){caches.delete(edition);throw e;}
}
function link(parent,href,label) {
 const a=el("a",label);a.href=href;if(href.startsWith("https://")){a.target="_blank";a.rel="noopener noreferrer";}
 parent.append(a);
}
function render(rows,edition,kind) {
 const out=$("hpar-results");out.replaceChildren();
 if(!rows.length){out.append(el("p","Sin coincidencias textuales recuperadas. Esto no demuestra que el concepto esté ausente del libro."));return;}
 for(const row of rows){
  const item=el("article",undefined,"result");
  item.append(el("h3",SOURCES[edition].label+" · página OCR "+row.page+" · bloque "+row.sequence));
  item.append(el("p","OCR sin verificar · "+(row.segmentation==="approximate_length_window"?"división aproximada por extensión":"separación aproximada por blancos")+" · "+kind,"meta"));
  item.append(el("p",row.text.slice(0,1050)+(row.text.length>1050?" […]":"")));
  const links=el("div",undefined,"row");
  link(links,SOURCES[edition].link(row.page),SOURCES[edition].linkLabel(row.page));
  link(links,"concordancia-historica.html?q="+encodeURIComponent($("hpar-query").value),"Comparar con la concordancia");
  item.append(links);out.append(item);
 }
}
function neural(){
 if(!modelPromise)modelPromise=import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1")
  .then(async module=>module.pipeline("feature-extraction","Xenova/multilingual-e5-small",{dtype:"q8"}))
  .catch(error=>{modelPromise=null;throw error;});
 return modelPromise;
}
async function semanticRerank(query,rows) {
 const pipeline=await neural();
 const candidates=rows.slice(0,24);
 const q=await pipeline("query: "+query,{pooling:"mean",normalize:true});
 const passages=await pipeline(candidates.map(row=>"passage: "+row.text.slice(0,1000)),{pooling:"mean",normalize:true});
 const dims=Number(q.dims?.at(-1));if(!Number.isFinite(dims)||dims<=0||passages.data.length!==candidates.length*dims)throw Error("Dimensiones de vectores incompatibles");
 const ranking=candidates.map((row,i)=>{
  let sim=0;for(let j=0;j<dims;j++)sim+=q.data[j]*passages.data[i*dims+j];
  return {...row,semanticScore:sim};
 });
 return ranking.sort((a,b)=>b.semanticScore-a.semanticScore||b.score-a.score);
}
async function run(){
 const mine=++serial,edition=$("hpar-edition").value,query=$("hpar-query").value.trim();if(query.length<3){$("hpar-status").textContent="Escribí al menos tres caracteres.";return;}
 const status=$("hpar-status");status.textContent="Leyendo el OCR y segmentando bloques de "+SOURCES[edition].label+"…";
 try{
  const {pages,rows}=await records(edition);if(mine!==serial)return;
  $("hpar-source").textContent=pages+" páginas OCR · "+rows.length+" bloques heurísticos (no párrafos diplomáticos)";
  const candidates=searchParagraphCandidates(rows,query,45);
  render(candidates,edition,"búsqueda textual BM25");
  status.textContent=candidates.length+" candidatos textuales entre "+rows.length+" bloques. Revisá siempre el facsímil.";
  if(!candidates.length||!$("hpar-neural").checked)return;
  status.textContent+=" Solicitaste IA: preparando reordenación semántica de hasta 24 candidatos…";
  try{
   const reranked=await semanticRerank(query,candidates);if(mine!==serial)return;
   render(reranked,edition,"IA E5 · reordenación de candidatos literales, no búsqueda semántica exhaustiva");
   status.textContent=reranked.length+" candidatos reordenados con E5 en el navegador. No hay cotejo filológico automatizado.";
  }catch(error){if(mine!==serial)return;status.textContent="La IA no se cargó ("+error.message+"); siguen visibles los resultados textuales BM25.";}
 }catch(error){if(mine!==serial)return;$("hpar-results").replaceChildren();status.textContent="No se pudo leer la fuente ("+error.message+").";}
}
$("hpar-form").addEventListener("submit",event=>{event.preventDefault();run();});
$("hpar-edition").addEventListener("change",()=>{++serial;$("hpar-source").textContent="La nueva fuente se cargará al buscar.";$("hpar-results").replaceChildren();});
const args=new URLSearchParams(location.search);
if(SOURCES[args.get("edition")])$("hpar-edition").value=args.get("edition");
if(args.get("q")){$("hpar-query").value=args.get("q");run();}
else $("hpar-status").textContent="Elegí una edición y escribí una consulta. Todo el procesamiento textual es local en tu navegador.";
