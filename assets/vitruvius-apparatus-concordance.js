/* Aparato crítico integral de Vitruvio: concordancia de pasajes y comentarios.
   No traslada aparato a obras ajenas; todas las relaciones incluyen evidencia. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const form=$("critical-form"),input=$("critical-query"),container=$("critical-integrated"),status=$("critical-integrated-status"),results=$("critical-integrated-results");
if(!form||!input||!container||!status||!results)return;
const ED=[
 {id:"recensio-es",language:"es",label:"V514 · Castellano",pdf:"documents/kurilo-recensio-es.pdf"},
 {id:"recensio-fr",language:"fr",label:"V554 · Français",pdf:"documents/kurilo-recensio-fr.pdf"},
 {id:"theory-en",language:"en",label:"V297 · English",pdf:"documents/kurilo-theory-en.pdf"}
];
const fetchCache=new Map(),LIMIT=16;
let generation=0;
function source(path){
 if(!fetchCache.has(path))fetchCache.set(path,fetch(path).then(r=>{if(!r.ok)throw Error(path+": HTTP "+r.status);return r.json()}).catch(e=>{fetchCache.delete(path);throw e}));
 return fetchCache.get(path);
}
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
const tokens=s=>[...String(s||"").matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(m=>({word:fold(m[0]),start:m.index,end:m.index+m[0].length}));
function occurrences(text,query){
 const phrase=tokens(query).map(t=>t.word),words=tokens(text),out=[];
 if(!phrase.length)return out;
 for(let i=0;i+phrase.length<=words.length;i++){
  if(phrase.every((w,j)=>words[i+j].word===w)){
   out.push({start:words[i].start,end:words[i+phrase.length-1].end});i+=phrase.length-1;
  }
 }
 return out;
}
function canonicalLocus(value){
 const str=String(value||"").trim().toLowerCase().replace(/\s+/g,"");
 const m=str.match(/^([ivx]+|10|[1-9])\.(praef\.)?(\d+)(?:\.(\d+))?$/);
 if(!m)return null;
 const roman={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
 const book=roman[m[1]]||Number(m[1]);
 return (book>=1&&book<=10)?[book,m[2]?"praef":Number(m[3]),m[2]?Number(m[3]):m[4]?Number(m[4]):null].filter(v=>v!=null).join("."):null;
}
const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
function anchor(text,url){const a=element("a","",text);a.href=url;return a}
function excerpt(target,text,matches,{max=740,full=false}={}){
 const value=String(text||"").replace(/\s+/g," ").trim();
 // Recompute offsets after whitespace normalization, never slice original offsets.
 const spans=occurrences(value,currentQuery),first=spans[0],start=full?0:first?Math.max(0,first.start-170):0;
 const end=full?value.length:first?Math.min(value.length,first.end+max-170):Math.min(value.length,max);
 if(start)target.append("… ");
 let at=start;
 for(const span of spans){
  if(span.end<=start||span.start>=end)continue;
  if(span.start>at)target.append(document.createTextNode(value.slice(at,span.start)));
  const marked=element("mark","critical-inline-hit",value.slice(Math.max(at,span.start),Math.min(span.end,end)));
  target.append(marked);at=Math.min(span.end,end);
 }
 if(at<end)target.append(document.createTextNode(value.slice(at,end)));
 if(end<value.length)target.append(" …");
}
let currentQuery="";
function commentaryEvidence(e,locus){
 if(e.source==="nota"){
  if(e.locusMention===locus&&e.locusLink==="locus explícito")return "Locus explícito en nota DOCX";
  if((e.loci||[]).includes(locus))return "Anclaje candidato DOCX · pendiente de cotejo";
  return null;
 }
 if(e.locusInHeading&&e.locusMention===locus)return "Referencia explícita en encabezado del aparato PDF";
 if((e.loci||[]).includes(locus))return "Contexto de la misma página impresa · vínculo orientativo";
 return null;
}
function paragraphLinks(locus,edition,term){
 const url=new URL("lector-bilingue.html",location.href);url.searchParams.set("locus",locus);url.searchParams.set("edition",edition);if(term)url.searchParams.set("q",term);
 return url.pathname.replace(/^.*\/(?=[^/]+$)/,"")+url.search;
}
function printCommentary(root,e,relation){
 const ed=ED.find(v=>v.id===e.edition);
 const line=element("div","critical-integrated-comment");
 const label=element("p","critical-integrated-meta",(ed?.label||e.version||e.edition)+" · "+(e.label||"Nota editorial")+
  (e.page?" · PDF p. "+e.page:" · nota "+String(e.id||"").split("-n").pop())+" · "+relation);
 line.append(label);
 const summary=element("details","critical-integrated-details");
 const title=element("summary","",e.source==="nota"?"Leer nota y explicación del autor":"Leer bloque de análisis del libro");
 summary.append(title);
 const para=element("p","critical-integrated-prose");excerpt(para,e.text,[],{full:true});summary.append(para);
 if(e.pdf)summary.append(anchor("Abrir página de la edición (PDF) ↗",e.pdf));
 line.append(summary);root.append(line);
}
function groupedComments(index,nearby,locus){
 const linked=[];
 const seen=new Set();
 for(const e of index){
  const reason=commentaryEvidence(e,locus);
  if(reason&&!seen.has(e.id)){seen.add(e.id);linked.push({e,reason,order:reason.includes("explícit")?0:1})}
 }
 for(const entry of nearby.filter(x=>x.locus===locus)){
  const ed=ED.find(x=>x.id===entry.edition);
  const e=index.find(x=>x.id===(ed?.label.slice(0,4)+"-n"+entry.footnote_id));
  if(e&&!seen.has(e.id)){seen.add(e.id);linked.push({e,reason:"Proximidad del párrafo DOCX ("+entry.distance+" de distancia) · locus no cotejado",order:2})}
 }
 return linked.sort((a,b)=>a.order-b.order||ED.findIndex(x=>x.id===a.e.edition)-ED.findIndex(x=>x.id===b.e.edition));
}
function recordLink(e,locus){
 const a=element("a","","Consultar el locus en el lector →");
 a.href=paragraphLinks(locus,e.edition,currentQuery);return a;
}
function renderPassageGroup(parent,group,index,nearby,i){
 const row=element("article","critical-integrated-passage");
 const d=element("details","critical-integrated-locus");if(i<2)d.open=true;
 const title=element("summary","", "Vitr., De architectura · "+group.locus+" · "+group.hitCount+
  " coincidencia"+(group.hitCount===1?"":"s")+" en ediciones consultadas");
 d.append(title);
 const perEd=new Map(group.members.map(x=>[x.edition.id,x]));
 const es=perEd.get("recensio-es")||group.members[0];
 if(es?.p.latin){const latin=element("p","critical-integrated-prose");latin.lang="la";
  latin.append(element("strong","","Latín · "+es.edition.label+": "));excerpt(latin,es.p.latin,[],{max:850});d.append(latin)}
 for(const ed of ED){
  const m=perEd.get(ed.id);if(!m)continue;
  const label=element("p","critical-integrated-meta",ed.label+" · "+m.hits+" coincidencia"+(m.hits===1?"":"s")+
    " en la traducción"+(ed.id==="recensio-es"?" (texto latino contado una vez por obra)":""));
  d.append(label);
  const trans=element("p","critical-integrated-prose");trans.lang=ed.language;excerpt(trans,m.p.translation,[],{max:850});d.append(trans);
  d.append(recordLink(ed,group.locus));
 }
 const attached=groupedComments(index,nearby,group.locus);
 const detail=element("details","critical-integrated-notes");
 const label=element("summary","","Aparato y explicaciones sobre este pasaje ("+attached.length+")");
 detail.append(label);
 if(attached.length){for(const x of attached)printCommentary(detail,x.e,x.reason)}
 else detail.append(element("p","critical-integrated-meta","No se ha identificado una nota documentalmente vinculada a este locus. Esto no demuestra ausencia de comentarios en las ediciones."));
 d.append(detail);row.append(d);parent.append(row);
}
function renderLexicalComment(parent,e,i){
 const ed=ED.find(x=>x.id===e.edition);
 const details=element("details","critical-integrated-lexical");
 if(i<2)details.open=true;
 details.append(element("summary","",(ed?.label||e.edition)+" · "+(e.label||"Nota")+" · "+(e.page?"PDF p. "+e.page:"nota "+String(e.id||"").split("-n").pop())));
 details.append(element("p","critical-integrated-meta","Coincidencia literal en una explicación del autor. NO demuestra que el comentario se refiera a todos los pasajes donde aparece el término."));
 const prose=element("p","critical-integrated-prose");excerpt(prose,e.text,[],{max:950});details.append(prose);
 if(e.pdf)details.append(anchor("Abrir edición fuente (PDF) ↗",e.pdf));
 const loc=e.locusMention||(e.loci||[])[0];
 if(loc&&canonicalLocus(loc))details.append(recordLink({edition:{id:e.edition}},canonicalLocus(loc)));
 parent.append(details);
}
function lazyList(root,items,renderer){
 let count=0;const body=element("div","critical-integrated-list"),button=element("button","button outline","Mostrar más resultados");button.type="button";
 const more=()=>{const next=items.slice(count,count+LIMIT);next.forEach((item,i)=>renderer(body,item,count+i));count+=next.length;
  button.hidden=count>=items.length;if(!button.hidden)button.textContent="Mostrar más ("+count+" de "+items.length+")";};
 button.addEventListener("click",more);root.append(body,button);more();
}
function runMessage(msg){status.textContent=msg}
async function search(){
 const query=input.value.trim();if(!query)return;
 currentQuery=query;const run=++generation;
 const edition=$("critical-edition")?.value||"all",mode=$("critical-mode")?.value||"all";
 const eds=ED.filter(e=>edition==="all"||edition===e.id);
 container.hidden=false;results.replaceChildren();runMessage("Buscando en los textos y el aparato de las ediciones seleccionadas…");
 const request=[
  ...eds.map(e=>source("data/structured/"+e.id+".json").then(data=>({edition:e,passages:data.passages}))),
  source("data/apparatus-index.json").then(x=>({apparatus:x.entries})),
  source("data/apparatus-nearby.json").then(x=>({nearby:x.entries}))
 ];
 const resolved=await Promise.allSettled(request);
 if(run!==generation)return;
 const corpora=[],missing=[];let index=[],nearby=[];
 for(let i=0;i<resolved.length;i++){
  const r=resolved[i];
  if(r.status==="rejected"){missing.push(i<eds.length?eds[i].label:i===eds.length?"índice PDF y notas":"índice de notas próximas");continue}
  const x=r.value;if(x.edition)corpora.push(x);if(x.apparatus)index=x.apparatus;if(x.nearby)nearby=x.nearby;
 }
 const locusQuery=canonicalLocus(query),byLocus=new Map(),tally={latin:0,es:0,fr:0,en:0},edLatinSeen=new Set();
 let passagesExamined=0;
 for(const {edition:ed,passages} of corpora){
  for(const p of passages||[]){
   const locus=canonicalLocus(p.locus);
   if(!locus)continue;passagesExamined++;
   const latinHits=mode!=="translation"&&(!edLatinSeen.has(locus))?occurrences(p.latin,query).length:0;
   if(!edLatinSeen.has(locus))edLatinSeen.add(locus);
   const trHits=mode!=="la"?occurrences(p.translation,query).length:0;
   const hits=locusQuery?(locus===locusQuery?1:0):latinHits+trHits;
   if(!hits)continue;
   const group=byLocus.get(locus)||{locus,members:[],hitCount:0};
   group.members.push({edition:ed,p,hits:trHits});group.hitCount+=hits;
   byLocus.set(locus,group);
   tally.latin+=latinHits;tally[ed.language]+=trHits;
  }
 }
 // For every found locus, add independent editions even when their translation
 // doesn't contain the word, to read the same reference in all languages.
 for(const group of byLocus.values()){
  for(const {edition:ed,passages} of corpora){
   if(group.members.some(m=>m.edition.id===ed.id))continue;
   const same=passages.find(p=>canonicalLocus(p.locus)===group.locus);
   if(same)group.members.push({edition:ed,p:same,hits:0});
  }
 }
 const groups=[...byLocus.values()].sort((a,b)=>{
  const ka=a.locus.split(".").map(x=>x==="praef"?-1:Number(x)),kb=b.locus.split(".").map(x=>x==="praef"?-1:Number(x));
  for(let i=0;i<3;i++){let d=(ka[i]??0)-(kb[i]??0);if(d)return d}return 0;
 });
 const filteredIndex=index.filter(x=>edition==="all"||x.edition===edition);
 const lexical=locusQuery?[]:filteredIndex.filter(e=>occurrences([e.text,e.anchor].filter(Boolean).join(" "),query).length);
 runMessage("Vitruvio, De architectura · "+groups.length+" loci con coincidencias · latín "+tally.latin+
  " apariciones (sin triplicar ediciones) · castellano "+tally.es+" · francés "+tally.fr+" · inglés "+tally.en+
  " · "+lexical.length+" entradas de aparato con coincidencias literales. "+
  (missing.length?"Consulta parcial: no se cargó "+missing.join(", ")+".":""));
 const principles=element("p","critical-integrated-warning","Las coincidencias se cuentan en las ediciones digitales. La misma referencia del tratado permite consultar traducciones distintas, pero no certifica alineación literal de palabras. Las notas próximas o asociadas a una página no equivalen a variantes manuscritas verificadas.");
 results.append(principles);
 const sections=element("div","critical-integrated-sections");
 const witness=element("section","critical-integrated-section");
 witness.append(element("h3","","Pasajes de De architectura ("+groups.length+" loci)"));
 if(groups.length)lazyList(witness,groups,(node,item,i)=>renderPassageGroup(node,item,filteredIndex,nearby.filter(x=>edition==="all"||x.edition===edition),i));
 else witness.append(element("p","critical-integrated-meta","No se hallaron pasajes para esta búsqueda en las versiones cargadas."));
 sections.append(witness);
 const comments=element("section","critical-integrated-section");
 comments.append(element("h3","","Explicaciones y notas que contienen la palabra o frase ("+lexical.length+")"));
 if(lexical.length)lazyList(comments,lexical,(node,item,i)=>renderLexicalComment(node,item,i));
 else comments.append(element("p","critical-integrated-meta",locusQuery?"Consulta por locus: el aparato se muestra dentro de cada pasaje.":"Sin coincidencias literales en el índice de comentarios disponible."));
 sections.append(comments);results.append(sections);
}
form.addEventListener("submit",()=>{void search()});
document.querySelectorAll("[data-example]").forEach(button=>button.addEventListener("click",()=>{queueMicrotask(()=>void search())}));
const existing=new URLSearchParams(location.search).get("locus")||new URLSearchParams(location.search).get("q");
if(existing){setTimeout(()=>{if(input.value.trim())void search()},170)}
})();