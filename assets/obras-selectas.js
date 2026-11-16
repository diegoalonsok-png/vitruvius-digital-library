/* Bibliotheca selective works: catalogue-only vs registered vs indexed.
 * The three states always come from live manifest/registry, not a fixed counter.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id),list=$("select-list"),message=$("select-status-text");
const query=$("select-query"),author=$("select-author"),status=$("select-status");
const fold=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f\u1dc0-\u1dff]/g,"").toLocaleLowerCase();
const add=(tag,cls,text,parent)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=String(text);
 if(parent)parent.append(e);return e;
};
let works=[];
function render(){
 const q=fold(query.value.trim()),a=author.value,t=status.value;
 const shown=works.filter(x=>(!a||x.author===a)&&(!t||x.availability===t)&&(!q||fold([x.title,x.titleOriginal,x.author,x.aliases?.join(" ")].join(" ")).includes(q)));
 list.replaceChildren();
 for(const w of shown){
  const article=add("article","work",null,list);
  if(window.BibliothecaCoverMiniatures)article.append(window.BibliothecaCoverMiniatures.create(w));
  const header=add("div",null,null,article);
  add("h2",null,w.title,header);
  const dat=add("div","data",[w.author,w.dating,w.genre].filter(Boolean).join(" · "),article);
  const label=w.availability==="indexed"?"Original griego · indexación confirmada":w.availability==="registered"?"Original griego cargado · índice pendiente":"Fuente TEI catalogada · sin transcripción local indexada";
  add("div","state"+(w.availability==="indexed"?" is-indexed":""),label,article);
  const links=add("nav","links",null,article);
  const detail=add("a",null,"Ficha académica",links);
  detail.href="bibliotheca-graeca-latina.html?work="+encodeURIComponent(w.id)+"&view="+(w.availability==="source"?"external":"text");
  if(w.availability!=="source"){
   const read=add("a",null,"Leer original griego",links);
   read.href="classics-text-reader.html?work="+encodeURIComponent(w.id)+"&lang=grc";
  }
  if(/^https:\/\/github\.com\/PerseusDL\/canonical-greekLit\/blob\//.test(w.sourceUrl||"")){
   const original=add("a",null,"Edición TEI · Perseus",links);
   original.href=w.sourceUrl;original.target="_blank";original.rel="noopener noreferrer";
  }
  if(w.bibliography?.canonicalReference)add("p","cite",w.bibliography.canonicalReference,article);
 }
 const counts={source:0,registered:0,indexed:0};
 for(const w of works)counts[w.availability]++;
 message.textContent=shown.length+" de "+works.length+" obras selectas · "+counts.indexed+" originales indexados · "+counts.registered+" cargados con índice pendiente · "+counts.source+" con fuente bibliográfica verificada.";
}
async function load(){
 try{
  const paths=[
   "data/bibliotheca-expansion-publicada-2026-11-16.json",
   "data/classics-corpus/search-registry.json",
   "data/index/classics/manifest.json"
  ];
  const responses=await Promise.all(paths.map(p=>fetch(p,{cache:"no-cache"})));
  for(let i=0;i<responses.length;i++)if(!responses[i].ok)throw Error(paths[i]+": HTTP "+responses[i].status);
  const [catalogue,registry,lexical]=await Promise.all(responses.map(r=>r.json()));
  const known=new Set((registry.entries||[]).filter(e=>e.language==="grc"&&e.format==="json-passages"&&/^data\/classics-corpus\/[a-z0-9-]+-grc\.json$/.test(e.path||"")).map(e=>e.workId));
  const indexed=new Set((lexical.index||[]).filter(e=>e.lang==="grc"&&/^data\/classics-corpus\/[a-z0-9-]+-grc\.json$/.test(e.file||"")).map(e=>e.id));
  works=(catalogue.works||[]).filter(w=>w.collection==="obras-selectas")
   .map(w=>({...w,availability:!known.has(w.id)?"source":indexed.has(w.id)?"indexed":"registered"}))
   .sort((a,b)=>(a.selectionOrder||999)-(b.selectionOrder||999));
  if(!works.length)throw Error("No se encontraron fichas de obras selectas.");
  const authors=[...new Set(works.map(w=>w.author))].sort((a,b)=>a.localeCompare(b,"es"));
  for(const a of authors){const option=add("option",null,a,author);option.value=a}
  for(const el of [query,author,status])el.addEventListener(el===query?"input":"change",render);
  render();
 }catch(err){
  message.textContent="No fue posible comprobar el catálogo en este momento.";
  add("p","error",err.message+" · Consultá el catálogo general mientras se restablece la consulta.",list);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load,{once:true});else load();
})();
