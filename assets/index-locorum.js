(()=>{
"use strict";
const $=id=>document.getElementById(id);
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ");
const langs={la:"Latín",grc:"Griego",es:"Castellano",en:"Inglés",fr:"Francés",de:"Alemán",it:"Italiano",pt:"Portugués"};
const params=new URLSearchParams(location.search);
let versions=[],entries=[],concepts=[],shown=0,filtered=[];
function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n}
function link(href,label){const a=el("a",label);a.href=href;return a}
function option(parent,value,text){const o=el("option",text);o.value=value;parent.append(o)}
function url(base,opts){const u=new URL(base,location.href);Object.entries(opts).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")u.searchParams.set(k,String(v))});return u.pathname.split("/").pop()+u.search+u.hash}
function reader(v,locus,term){
 const e=entries.find(x=>x.workId===v.workId&&x.language===v.language&&x.path===v.source);
 const base=e?.reader||("classics-text-reader.html?work="+encodeURIComponent(v.workId)+"&lang="+encodeURIComponent(v.language));
 if(e?.format==="html-text"){const p=new URL(base,location.href);p.searchParams.set("q",term);return p.pathname.split("/").pop()+p.search+(locus&&/^[-a-zA-Z0-9_]+$/.test(locus)?"#"+locus:"")}
 return url(base,{q:term,locus});
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
  article.append(el("p",loci.length+" registros de forma por locus · "+c.count+" apariciones contabilizadas en la edición (total del concepto, no necesariamente del filtro)."));
  if(meta?.note){const n=el("p",meta.note);n.className="muted";article.append(n)}
  const ol=el("ol",null,"locilist");
  for(const item of loci.slice(0,180)){
   const [locus,form,count]=item,li=el("li");
   li.append(link(reader(v,locus,form),String(locus)+" · "+String(form)+" ("+count+")"));ol.append(li);
  }
  article.append(ol);
  if(loci.length>180)article.append(el("p","Se muestran los primeros 180 loci de esta entrada; refine por obra, forma o concepto.","muted"));
  const nav=el("div",null,"links");
  nav.append(link("bibliotheca-graeca-latina.html?work="+encodeURIComponent(v.workId),"Ficha de la obra"));
  nav.append(link("vitruvia.html?q="+encodeURIComponent(c.concept)+"&mode=all","Buscar en Vitruvia"));
  nav.append(link("vitruvia-lexicon.html?q="+encodeURIComponent(loci[0]?.[1]||c.concept)+"&mode=palabra","Estudiar en Lexicon"));
  article.append(nav);frag.append(article);
 }
 $("results").append(frag);shown+=slice.length;
 $("more").hidden=shown>=filtered.length;
 $("summary").textContent=versions.length+" ediciones registradas · "+filtered.length+" entradas concepto/edición con referencias. Mostrando "+shown+". El índice es una concordancia semántica editorial basada en formas; no verifica sentidos individuales.";
}
async function init(){
 try{
 const [r,p,d]=await Promise.all([
  fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro HTTP "+r.status);return r.json()}),
  fetch("data/classics-corpus/semantic-conceptus-postings.json").then(r=>{if(!r.ok)throw Error("Índice HTTP "+r.status);return r.json()}),
  fetch("data/lexicon/conceptus.json").then(r=>{if(!r.ok)throw Error("Conceptus HTTP "+r.status);return r.json()})
 ]);
 if(r.schema!=="vitruvia-classics-search-registry-v1"||p.schema!=="vitruvia-classics-semantic-postings-v1"||!Array.isArray(p.versions)||p.registryEditionCount!==r.entries.length||p.errors?.length)throw Error("Índice no compatible con el registro actual: regenerar y validar antes de consultarlo");
 entries=r.entries;versions=p.versions;concepts=d.concepts||[];
 const byWork=new Map();for(const v of versions){if(!byWork.has(v.workId))byWork.set(v.workId,v.author+" · "+v.title)}
 for(const [key,label] of [...byWork].sort((a,b)=>a[1].localeCompare(b[1])))option($("work"),key,label);
 for(const c of concepts.slice().sort((a,b)=>a.id.localeCompare(b.id)))option($("concept"),c.id,c.id);
 if(byWork.has(params.get("work")))$("work").value=params.get("work");
 refillEditions();
 if(concepts.some(c=>c.id===params.get("concept")))$("concept").value=params.get("concept");
 if(params.has("q"))$("query").value=params.get("q");
 render();
 }catch(err){$("summary").textContent="Índice no disponible: "+err.message+". Las transcripciones originales siguen disponibles en Bibliotheca."}
}
$("work").addEventListener("change",()=>{refillEditions();render()});
["edition","concept"].forEach(id=>$(id).addEventListener("change",render));
$("query").addEventListener("input",render);
$("more").addEventListener("click",append);
init();
})();
