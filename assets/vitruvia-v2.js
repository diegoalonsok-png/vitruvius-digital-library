/* Standalone encyclopedic search. No legacy search UI, panels or renderers. */
(()=>{
"use strict";
const P=window.VitruviaAcademicPolicy,$=id=>document.getElementById(id);
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n};
const link=(label,url,local=false)=>{const a=el("a",label);if(local||P.safe(url)){a.href=url;if(!local){a.target="_blank";a.rel="noopener noreferrer"}}return a};
const api=async(url,signal)=>{const r=await fetch(url,{signal,headers:{Accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return r.json()};
const wiki=(lang,params)=>"https://"+lang+".wikipedia.org/w/api.php?"+new URLSearchParams({...params,format:"json",origin:"*"});
let generation=0,controller;
const current=id=>id===generation;
function section(root,title){const s=el("section");s.append(el("h2",title));root.append(s);return s}
function record(root,r){const a=el("article",null,"record");a.append(link(r.title,r.link,r.local),el("p",[r.author,r.venue,r.year,r.kind].filter(Boolean).join(" · "),"meta"));if(r.excerpt)a.append(el("p",r.excerpt));root.append(a)}
function year(n){return !Number.isFinite(n)?"No documentado en el registro":n<0?Math.abs(n)+" a. C.":n+" d. C."}
function parseEvidence(html,base){
 const doc=new DOMParser().parseFromString(html,"text/html");
 const refs=new Map();
 for(const r of doc.querySelectorAll("li[id^='cite_note']")){
  const c=r.querySelector(".reference-text")||r;
  const urls=[...c.querySelectorAll("a[href]")].map(a=>{try{return new URL(a.getAttribute("href"),base).href}catch{return ""}}).filter(P.safe);
  const text=c.textContent.trim().replace(/\s+/g," ");
  if(P.reference(text,urls))refs.set(r.id,{text,urls:urls.filter(P.institution),id:r.id});
 }
 const blocks=[];let heading="Introducción";
 for(const n of doc.querySelectorAll("h2,h3,p")){
  if(n.closest("table, aside, .navbox, .reflist, .infobox, .hatnote, .metadata, .thumb"))continue;
  if(n.tagName!=="P"){heading=(n.querySelector(".mw-headline")||n).textContent.replace(/\[editar\]/g,"").trim();continue}
  const ids=[...new Set([...n.querySelectorAll("sup.reference a[href]")].map(a=>a.getAttribute("href").split("#").pop()).filter(x=>x.startsWith("cite_note")))];
  if(!ids.length||ids.some(x=>!refs.has(x)))continue;
  const clean=n.cloneNode(true);clean.querySelectorAll("sup.reference, .mw-editsection, style, script").forEach(x=>x.remove());
  const text=clean.textContent.replace(/\s+/g," ").trim();
  if(text.length>=60)blocks.push({heading,text,refs:ids.map(x=>refs.get(x))});
 }
 return {blocks,refs:[...refs.values()]};
}
async function encyclopedic(identity,signal){
 const lang=["es","en","fr","de","it","pt"].includes(identity.language)?identity.language:"es";
 const d=await api(wiki(lang,{action:"parse",page:identity.canonical,prop:"text|revid",disableeditsection:"1"}),signal);
 if(!d.parse?.text?.["*"])throw Error("Artículo sin HTML");
 return {...parseEvidence(d.parse.text["*"],identity.url),revision:d.parse.revid};
}
async function bibliography(identity,signal){
 const aliases=[identity.canonical,...(identity.aliases||[])].filter(a=>P.norm(a).length>3).slice(0,12);
 const query=new URLSearchParams({"query.bibliographic":identity.canonical,rows:"35",select:"DOI,title,author,published,container-title,publisher,type,ISSN,URL"});
 const data=await api("https://api.crossref.org/works?"+query,signal);
 const unique=new Map();
 for(const r of data.message?.items||[]){const a=P.crossref(r,aliases);if(a)unique.set(a.id,a)}
 return [...unique.values()];
}
async function corpus(q,root,id){
 const s=section(root,"Textos de Bibliotheca");const status=el("p","Buscando pasajes en el corpus…","meta");s.append(status);
 try{
 const result=await window.VitruviaAI.search(q,{method:"neural",targetedOnly:false,learning:false});
 if(!current(id))return;
 const rows=(result.rows||[]).filter(P.local).filter(r=>r.exactTextMatch||r.normalizedTextMatch||r.aiSemantic&&r.aiCalibrated).slice(0,12);
 status.textContent=(result.mode==="neural"?"E5 + BM25":"BM25; IA neuronal no disponible")+" · "+rows.length+" pasajes admitidos. "+(result.warning||"");
 for(const r of rows)record(s,{title:r.title,link:r.link,local:true,author:r.author,excerpt:r.excerpt,kind:r.meta});
 if(!rows.length)s.append(el("p","No se encontraron pasajes con evidencia suficiente."));
 }catch(e){if(current(id))status.textContent="Corpus no disponible: "+String(e.message||e).slice(0,180)}
}
function renderEvidence(root,data,identity){
 const s=section(root,"Artículo enciclopédico · pasajes con referencias académicas");
 const revision=Number(data.revision);
 const source=Number.isInteger(revision)&&revision>0?"https://"+identity.language+".wikipedia.org/w/index.php?oldid="+revision:identity.url;
 const note=el("p",null,"meta");note.append(document.createTextNode("Extractos de Wikipedia, selección automática; las referencias no constituyen una verificación de cada afirmación. "),link("Versión y autores",source),document.createTextNode(" · "),link("CC BY-SA 4.0","https://creativecommons.org/licenses/by-sa/4.0/"));s.append(note);
 if(!data.blocks.length){s.append(el("p","No se localizaron párrafos con referencias admitidas por el filtro."));return}
 let heading="";
 for(const b of data.blocks.slice(0,25)){
  if(heading!==b.heading){heading=b.heading;s.append(el("h3",heading))}
  s.append(el("p",b.text));
  const citations=el("p",null,"meta");b.refs.forEach((r,i)=>{if(i)citations.append(document.createTextNode(" · "));citations.append(link(r.text.slice(0,220),source+"#"+encodeURIComponent(r.id)))});s.append(citations);
 }
}
async function search(q,lang){
 controller?.abort();controller=new AbortController();const signal=controller.signal,id=++generation;
 const root=$("content");root.replaceChildren();$("status").textContent="Identificando el tema…";
 $("query").value=q;const url=new URL(location.href);url.searchParams.set("q",q);url.searchParams.set("lang",lang);history.replaceState(null,"",url);
 const identity=await window.VitruviaEntityResolver.resolve(q,lang).catch(()=>null);
 if(!current(id))return;
 if(!identity?.canonical||!/^Q\d+$/.test(identity.wikidataId||"")||!identity.pageid||!P.safe(identity.url)){
  $("status").textContent="No se identificó una entidad enciclopédica inequívoca. Se conservan las búsquedas documentales.";
  await corpus(q,root,id);return;
 }
 const article=el("article");root.append(article);article.append(el("h1",identity.canonical));
 const origin=el("p",null,"meta");origin.append(link("Wikipedia · artículo de referencia",identity.url),document.createTextNode(" · "),link("Wikidata · registro de identidad","https://www.wikidata.org/wiki/"+identity.wikidataId));article.append(origin);
 if(identity.kind==="person"){const dl=el("dl");for(const [label,value] of [["Nacimiento",year(identity.birthYear)],["Fallecimiento",year(identity.deathYear)]])dl.append(el("dt",label),el("dd",value));article.append(dl);article.append(el("p","Fechas del registro Wikidata; pueden ser aproximadas o estar incompletas.","meta"))}
 const a=el("div"),b=el("div"),c=el("div");root.append(a,b,c);
 $("status").textContent="Identidad localizada · consultando referencias y textos…";
 const tasks=[
 encyclopedic(identity,signal).then(d=>{if(current(id))renderEvidence(a,d,identity)}).catch(()=>{if(current(id))section(a,"Artículo").append(el("p","Fuente temporalmente no disponible."))}),
 bibliography(identity,signal).then(async rows=>{
  if(!current(id))return;const s=section(b,"Bibliografía académica");
  if(!rows.length){s.append(el("p","No se encontraron registros que superen el filtro."));return}
  const docs=rows.map(r=>({id:r.id,text:r.title+" "+r.author+" "+r.venue}));
  const ranked=await window.VitruviaAI.rank(q,docs,{limit:12,candidates:25}).catch(()=>null);
  if(!current(id))return;
  s.append(el("p",ranked?.mode==="neural"?"Orden E5 + BM25 sobre registros admitidos.":"Orden bibliográfico; modelo neuronal no confirmado.","meta"));
  const map=new Map(rows.map(r=>[r.id,r]));const sorted=ranked?.rows?.length?ranked.rows.map(r=>map.get(r.doc.id)).filter(Boolean):rows.slice(0,12);
  for(const r of sorted)record(s,r);
 }).catch(()=>{if(current(id))section(b,"Bibliografía académica").append(el("p","Crossref temporalmente no disponible."))}),
 corpus(q,c,id)];
 await Promise.allSettled(tasks);if(current(id))$("status").textContent="Consulta terminada · la ausencia de resultados no implica ausencia de fuentes.";
}
$("form").addEventListener("submit",e=>{e.preventDefault();const q=$("query").value.trim();if(q)void search(q,$("lang").value)});
const params=new URLSearchParams(location.search),lang=params.get("lang");if(["es","en","fr"].includes(lang))$("lang").value=lang;
if(params.get("q"))void search(params.get("q"),$("lang").value);
})();
