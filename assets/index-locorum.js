(()=>{
"use strict";
const $=id=>document.getElementById(id);
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ");
const langs={la:"Latín",grc:"Griego",es:"Castellano",en:"Inglés",fr:"Francés",de:"Alemán",it:"Italiano",pt:"Portugués"};
const params=new URLSearchParams(location.search);
const MAX_LOCUS_RESULTS=20000; // Guardrail only for exceptionally large entries; filter remains available.
let versions=[],entries=[],concepts=[],shown=0,filtered=[];
function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n}
function link(href,label){const a=el("a",label);a.href=href;return a}
function option(parent,value,text){const o=el("option",text);o.value=value;parent.append(o)}
function relativePath(u){const root=new URL(".",location.href).pathname;return u.pathname.startsWith(root)?u.pathname.slice(root.length):u.pathname}
function url(base,opts){const u=new URL(base,location.href);Object.entries(opts).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")u.searchParams.set(k,String(v))});return relativePath(u)+u.search+u.hash}
function reader(v,locus,term){
 const e=entries.find(x=>x.workId===v.workId&&x.language===v.language&&x.path===v.source);
 const base=e?.reader||("classics-text-reader.html?work="+encodeURIComponent(v.workId)+"&lang="+encodeURIComponent(v.language));
 if(e?.format==="html-text"){const p=new URL(base,location.href);p.searchParams.set("q",term);return relativePath(p)+p.search+(locus&&/^[-a-zA-Z0-9_]+$/.test(locus)?"#"+encodeURIComponent(locus):"")}
 if(e?.format==="historical-ocr-pages")return url(base,{q:term,page:locus});
 return url(base,e?.format==="json-passages"?{q:term,locus,literal:1}:{q:term,locus});
}
function refillEditions(){
 const work=$("work").value,prev=$("edition").value;const e=$("edition");e.replaceChildren();option(e,"","Todas las ediciones");
 for(const v of versions.filter(v=>!work||v.workId===work)){
  const key=[v.workId,v.language,v.source,v.edition||""].join("|");
  option(e,key,(v.author||v.workId)+" · "+(langs[v.language]||v.language)+" · "+(v.edition||v.source.split("/").pop()));
 }
 if([...e.options].some(o=>o.value===prev))e.value=prev;
}
function render(){
 const work=$("work").value,edition=$("edition").value,concept=$("concept").value,q=fold($("query").value.trim());
 filtered=[];
 for(const v of versions){
  if(work&&v.workId!==work)continue;
  if(edition&&[v.workId,v.language,v.source,v.edition||""].join("|")!==edition)continue;
  for(const c of v.concepts||[]){
   if(concept&&c.concept!==concept)continue;
   const meta=concepts.find(k=>k.id===c.concept);
   const names=[c.concept,...Object.values(meta?.modern||{}).flat(),...(meta?.la||[]),...(meta?.grc||[])];
   const loci=(c.loci||[]).filter(x=>Array.isArray(x)&&x.length>=3);
   const selected=q?loci.filter(x=>fold(x[0]).includes(q)||fold(x[1]).includes(q)):loci;
   if(q&&!selected.length&&!names.some(n=>fold(n).includes(q)))continue;
   filtered.push({v,c,meta,loci:q&&selected.length?selected:loci});
  }
 }
 filtered.sort((a,b)=>a.v.workId.localeCompare(b.v.workId)||a.c.concept.localeCompare(b.c.concept)||a.v.language.localeCompare(b.v.language));
 shown=0;$("results").replaceChildren();append();
}
function append(){
 const slice=filtered.slice(shown,shown+30);const frag=document.createDocumentFragment();
 for(const {v,c,meta,loci} of slice){
  const article=el("article",null,"entry");
  article.append(el("h2",(v.author||v.workId)+" · "+(v.title||v.workId)));
  article.append(el("p",(langs[v.language]||v.language)+" · "+(v.edition||v.source)+" · Conceptus: "+c.concept));
  article.append(el("p",loci.length+" registros de forma por locus · "+c.count+" apariciones contabilizadas en la edición (total del concepto; no necesariamente del filtro). Los loci pertenecen a esta edición y no garantizan alineación entre lenguas."));
  if(meta?.note){const n=el("p",meta.note);n.className="muted";article.append(n)}
  const details=el("details");details.open=loci.length<=12;details.append(el("summary","Consultar "+loci.length+" registros documentados (locus · forma · frecuencia)"));
  const ol=el("ol",null,"locilist");
  for(const item of loci.slice(0,MAX_LOCUS_RESULTS)){
   const [locus,form,count]=item,li=el("li");
   li.append(link(reader(v,locus,form),String(locus)+" · "+String(form)+" ("+count+")"));ol.append(li);
  }
  details.append(ol);article.append(details);
  if(loci.length>MAX_LOCUS_RESULTS)article.append(el("p","Hay más de "+MAX_LOCUS_RESULTS+" referencias; refine la búsqueda para consultar las restantes.","muted"));
  const nav=el("div",null,"links");
  nav.append(link("bibliotheca-graeca-latina.html?work="+encodeURIComponent(v.workId),"Ficha de la obra"));
  nav.append(link("vitruvia.html?q="+encodeURIComponent(loci[0]?.[1]||c.concept)+"&mode=all","Buscar forma en Vitruvia"));
  nav.append(link("vitruvia-lexicon.html?q="+encodeURIComponent(loci[0]?.[1]||c.concept)+"&mode=palabra","Estudiar en Lexicon"));
  article.append(nav);frag.append(article);
 }
 $("results").append(frag);shown+=slice.length;
 $("more").hidden=shown>=filtered.length;
 $("summary").textContent=versions.length+" ediciones registradas · "+filtered.length+" entradas concepto/edición con referencias. Mostrando "+shown+". "+(filtered.length===0&&$("query").value.trim()?"Sin coincidencia en Conceptus: consultá la concordancia literal de los textos, disponible más arriba. ":"")+"El índice conceptual no sustituye la concordancia literal ni verifica sentidos individuales.";
}
function exportTsv(){
 const clean=x=>String(x??"").replace(/[\t\r\n]+/g," ").trim();
 const rows=[["Autor","Obra","ID obra","Idioma","Edición","Fuente","Conceptus","Locus","Forma atestiguada","Frecuencia","Enlace al pasaje"]];
 for(const {v,c,loci} of filtered){
  for(const [locus,form,count] of loci){
   const href=new URL(reader(v,locus,form),location.href).href;
   rows.push([v.author,v.title,v.workId,v.language,v.edition||"",v.source,c.concept,locus,form,count,href]);
  }
 }
 const tsv="\uFEFF"+rows.map(row=>row.map(clean).join("\t")).join("\r\n");
 const blob=new Blob([tsv],{type:"text/tab-separated-values;charset=utf-8"});
 const u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download="index-locorum-concordancias.tsv";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),1500);
}

let literalSerial=0;
async function searchLiteral(){
 const raw=$("query").value.trim(),token=++literalSerial;
 const status=$("literal-status"),target=$("literal-results");target.replaceChildren();
 if(raw.length<2){status.textContent="Escribí al menos dos letras en el campo de búsqueda.";return}
 if(!window.ClassicsCorpusSearch){status.textContent="El índice textual no está disponible. Verificá la carga del buscador.";return}
 status.textContent="Consultando las ediciones alojadas para «"+raw+"»…";
 $("literal-search").disabled=true;
 try{
  const rows=await window.ClassicsCorpusSearch.search(raw,{limit:75});
  if(token!==literalSerial)return;
  const diagnostics=window.ClassicsCorpusSearch.diagnostics?.()||{};
  status.textContent=rows.length?
   rows.length+" ediciones con coincidencias literales de «"+raw+"». "+(diagnostics.failed?diagnostics.failed+" fuentes no disponibles; resultados parciales.":"Seleccioná una edición para ver su pasaje y procedencia."):
   "Sin coincidencias literales en las "+(diagnostics.loaded||0)+" ediciones examinadas. "+(diagnostics.failed?diagnostics.failed+" fuentes no disponibles. ":"")+"Esto no demuestra ausencia en obras sin texto indexado.";
  for(const row of rows){
   const card=el("article",null,"entry"),a=link(row.link||"bibliotheca-graeca-latina.html",row.title||"Texto clásico");
   const meta=el("p",(row.meta||"")+" · "+(row.units||0)+" pasajes","muted");
   const excerpt=el("p",row.excerpt||"");card.append(a,meta,excerpt);target.append(card);
  }
 }catch(err){if(token===literalSerial)status.textContent="Error de búsqueda: "+err.message}
 finally{if(token===literalSerial)$("literal-search").disabled=false}
}
async function init(){
 try{
 const [r,p,d]=await Promise.all([
  fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro HTTP "+r.status);return r.json()}),
  fetch("data/classics-corpus/semantic-conceptus-postings.json").then(r=>{if(!r.ok)throw Error("Índice HTTP "+r.status);return r.json()}),
  fetch("data/lexicon/conceptus.json").then(r=>{if(!r.ok)throw Error("Conceptus HTTP "+r.status);return r.json()})
 ]);
 if(r.schema!=="vitruvia-classics-search-registry-v1"||p.schema!=="vitruvia-classics-semantic-postings-v1"||!Array.isArray(p.versions)||p.registryEditionCount!==r.entries.length||p.errors?.length)throw Error("Índice no compatible con el registro actual: regenerar y validar antes de consultarlo");
 entries=r.entries;versions=p.versions.map(v=>{const source=entries.find(e=>e.workId===v.workId&&e.language===v.language&&e.path===v.source);return {...v,author:source?.author||v.workId,title:source?.title||v.workId}});concepts=d.concepts||[];
 const byWork=new Map();for(const v of versions){if(!byWork.has(v.workId))byWork.set(v.workId,v.author+" · "+v.title)}
 for(const [key,label] of [...byWork].sort((a,b)=>a[1].localeCompare(b[1])))option($("work"),key,label);
 for(const c of concepts.slice().sort((a,b)=>a.id.localeCompare(b.id)))option($("concept"),c.id,c.id);
 if(byWork.has(params.get("work")))$("work").value=params.get("work");
 refillEditions();
 if(concepts.some(c=>c.id===params.get("concept")))$("concept").value=params.get("concept");
 if(params.has("q"))$("query").value=params.get("q");
 render();
 if(params.get("q")?.trim())searchLiteral();
 }catch(err){$("summary").textContent="Índice no disponible: "+err.message+". Las transcripciones originales siguen disponibles en Bibliotheca."}
}
$("work").addEventListener("change",()=>{refillEditions();render()});
["edition","concept"].forEach(id=>$(id).addEventListener("change",render));
let filterTimer=null;
$("query").addEventListener("input",()=>{clearTimeout(filterTimer);literalSerial++;$("literal-results").replaceChildren();$("literal-status").textContent="Presioná Enter o «Buscar palabra en los textos» para consultar coincidencias literales.";filterTimer=setTimeout(render,130)});
$("query").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();clearTimeout(filterTimer);render();searchLiteral()}});
$("more").addEventListener("click",append);
$("export-tsv").addEventListener("click",exportTsv);
$("literal-search").addEventListener("click",searchLiteral);
init();
})();
