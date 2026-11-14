/* Index commentariorum: text of the Kurilo editions, never generated commentary. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const fold=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const escapeHtml=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const topics=["symmetria","decor","eurythmia","ordinatio","dispositio","distributio","firmitas","utilitas","venustas","fabrica","ratiocinatio","proportio","commensuratio","ichnographia","orthographia","scaenographia","entasis","triglyphus","analemma","metrologia","architectura","templum","columna","machina","aqua","codex","Harleianus"];
const books=[1,2,3,4,5,6,7,8,9,10],romans=["I","II","III","IV","V","VI","VII","VIII","IX","X"];
const create=(tag,txt,parent,cls)=>{const e=document.createElement(tag);if(txt!==null)e.textContent=String(txt);if(cls)e.className=cls;if(parent)parent.append(e);return e};
let all=[],visible=[],shown=0;const STEP=30;
for(let book of books){const o=create("option","Liber "+romans[book-1],$("ic-book"));o.value=String(book)}
for(const topic of topics){const o=create("option",topic,$("ic-term"));o.value=topic}
async function load(path){const r=await fetch(path,{headers:{Accept:"application/json"}});if(!r.ok)throw Error(path+" HTTP "+r.status);return r.json()}
function normalizedLocus(value){return String(value||"").replace(/^([IVX]+)\./,(_,v)=>(romans.indexOf(v)+1)+".")}
function record(book,edition,e){return{type:"commentary",book:String(book),edition,locus:normalizedLocus(e.locus),position:"explicit",text:e.text||"",ordinal:"",source:e.source||"Comentario en el cuerpo de la edición",source_file:"",original_location:""}}
function note(e){const locus=normalizedLocus(e.locus||e.candidate_locus);return{type:"footnote",book:locus.split(".")[0]||"",edition:e.edition==="recensio-es"?"V514":e.edition==="recensio-fr"?"V554":"V297",locus,position:e.locus?"explicit":e.candidate_locus?"suggested":"unspecified",text:e.text||"",ordinal:e.footnote_id||"",source:"Nota al pie extraída del DOCX original",source_file:e.source_file||"",original_location:e.source_paragraph?"párrafo DOCX "+e.source_paragraph:""}}
function matches(entry){
 const book=$("ic-book").value,edition=$("ic-edition").value,type=$("ic-type").value,term=fold($("ic-term").value),query=fold($("ic-search").value.trim());
 if(book&&entry.book!==book)return false;if(edition&&entry.edition!==edition)return false;if(type&&entry.type!==type)return false;
 const content=fold(entry.text+" "+entry.locus);
 if(term&&!content.includes(term))return false;
 if(query&&!content.includes(query))return false;
 return true;
}
function renderOne(e){
 const box=create("article",null,$("ic-results"),"result");
 const title=(e.type==="commentary"?"Commentarius":"Nota "+e.ordinal)+" · "+e.edition+" · "+(e.locus||"referencia general");
 create("h3",title,box);
 create("p",e.type==="commentary"?"Comentario original con encabezamiento de locus en el libro":e.position==="explicit"?"Nota original con locus explícito":e.position==="suggested"?"Nota original con ubicación digital sugerida":"Nota original sin localizador digital asignado",box,"meta");
 const preview=e.text.length>670?e.text.slice(0,670).trim()+"…":e.text;
 create("p",preview,box);
 if(e.text.length>670){const details=create("details",null,box);create("summary","Leer el comentario íntegro",details);create("pre",e.text,details)}
 const source=create("p",e.source+(e.original_location?" · "+e.original_location:""),box,"meta");
 const link=create("a",e.locus?"Leer texto latino, traducción y notas por locus":"Consultar inventario autoral",box);
 link.href=e.locus?"commentarius-perpetuus.html?locus="+encodeURIComponent(e.locus):"inventario-aparato-autoral.html";
 if(e.locus){const a=create("a"," · Aparato crítico",box);a.href="apparatus-bude.html?locus="+encodeURIComponent(e.locus)}
}
function render(reset){
 if(reset){shown=0;$("ic-results").replaceChildren()}
 const slice=visible.slice(shown,shown+STEP);for(const item of slice)renderOne(item);
 shown+=slice.length;$("ic-more").hidden=shown>=visible.length;
 $("ic-status").textContent=visible.length+" entradas documentales encontradas · "+shown+" visibles. "+all.filter(x=>x.type==="commentary").length+" comentarios extensos y "+all.filter(x=>x.type==="footnote").length+" notas integradas al índice.";
 if(!shown)create("p","No hay coincidencias con estos filtros. Pruebe una raíz latina o elija todos los libros.",$("ic-results"),"note");
}
function apply(){visible=all.filter(matches);render(true)}
$("ic-form").addEventListener("submit",e=>{e.preventDefault();apply()});
$("ic-more").addEventListener("click",()=>render(false));
for(const key of ["ic-book","ic-edition","ic-term","ic-type"])$(key).addEventListener("change",apply);
$("ic-search").addEventListener("input",apply);
(async()=>{
 try{
  const tasks=books.flatMap(book=>["V514","V554"].map(ed=>({book,ed,path:"data/commentary/"+ed.toLowerCase()+"-libro-"+book+".json"})));
  const requests=tasks.map(async t=>{try{const json=await load(t.path);return (json.entries||[]).map(e=>record(t.book,t.ed,e))}catch(e){console.warn(t.path,e.message);return []}});
  const results=await Promise.all([...requests,load("data/critical-notes.json").then(j=>(j.entries||[]).filter(e=>["recensio-es","recensio-fr"].includes(e.edition)).map(note))]);
  all=results.flat();const url=new URLSearchParams(location.search);
  if(url.get("q"))$("ic-search").value=url.get("q").slice(0,200);
  if(url.get("book")&&books.includes(Number(url.get("book"))))$("ic-book").value=url.get("book");
  if(url.get("locus"))$("ic-search").value=url.get("locus");
  if(topics.includes(url.get("term")))$("ic-term").value=url.get("term");
  apply();
 }catch(e){$("ic-status").textContent="No se pudo cargar el índice: "+e.message}
})();
})();