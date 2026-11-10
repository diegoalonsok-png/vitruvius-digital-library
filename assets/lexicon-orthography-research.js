/* Vitruvia Lexicon: reproducible orthographic research against hosted sources.
   Literal attestations only; no unverified lemma, dialect or dating inference. */
(()=>{
"use strict";
const engine=window.VitruviaOrthography;
const form=document.getElementById("lx-form"),input=document.getElementById("lx-q");
if(!engine||!form||!input||document.getElementById("lx-orthography"))return;
const panel=document.createElement("section");
panel.id="lx-orthography";panel.className="lx-orth-panel";
panel.setAttribute("aria-label","Laboratorio de variantes gráficas y atestiguaciones documentales");
panel.innerHTML=[
'<details id="lx-orth-details"><summary>Comprobar grafías en textos griegos y latinos</summary>',
'<div class="lx-orth-inner">',
'<p>Herramienta complementaria de búsqueda de ocurrencias literales en corpus con transcripción; no es una definición de la palabra ni acredita grafías paleográficas de manuscritos sin transcripción. Compare <strong>forma exacta</strong>, búsqueda <strong>sin diacríticos</strong> y <strong>normalización editorial</strong>. La escritura no determina dialecto, período ni pronunciación. Las normalizaciones recuperan candidatos y nunca sustituyen la lectura del testimonio.</p>',
'<div class="lx-orth-form"><label>Modalidad <select id="lx-orth-mode"><option value="exact">Exacta · conservar diacríticos</option><option value="diacritics">Flexible · omitir diacríticos</option><option value="editorial">Editorial · sigma / u-v / i-j</option></select></label>',
'<label>Corpus <select id="lx-orth-lang"><option value="auto">Detectar escritura</option><option value="grc">Griego antiguo</option><option value="la">Latín</option></select></label>',
'<button type="button" id="lx-orth-go">Consultar ediciones registradas</button></div>',
'<p id="lx-orth-status" role="status" aria-live="polite">Escriba una palabra en el buscador principal y abra esta herramienta.</p>',
'<div id="lx-orth-variants"></div><div id="lx-orth-results"></div>',
'<p class="lx-orth-method">Método: la forma original se conserva en cada resultado. La búsqueda compara cadenas Unicode con límites de palabra. La equivalencia editorial no implica lematización, etimología, filiación textual ni identidad de variantes paleográficas. Los PDF sin transcripción verificada quedan fuera.</p>',
'</div></details>'
].join("");
(document.getElementById('instrumenta')||document.getElementById('methodus')||form.parentElement)?.after(panel);
const $=id=>document.getElementById(id),status=$("lx-orth-status"),variants=$("lx-orth-variants"),results=$("lx-orth-results");
const langNames={la:"Latín",grc:"Griego antiguo"};
let registryTask=null,sourceCache=new Map(),serial=0;
function element(tag,text,className){const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(className)x.className=className;return x}
function selectLang(term){const selected=$("lx-orth-lang").value;return selected==="auto"?engine.diagnosis(term).language:selected}
function registered(){
 if(!registryTask)registryTask=fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro HTTP "+r.status);return r.json()})
 .catch(e=>{registryTask=null;throw e});
 return registryTask;
}
function source(entry){
 if(sourceCache.has(entry.path))return sourceCache.get(entry.path);
 const task=fetch(entry.path).then(r=>{if(!r.ok)throw Error("Archivo HTTP "+r.status);return entry.format==="html-text"?r.text():r.json()});
 sourceCache.set(entry.path,task);
 task.catch(()=>sourceCache.delete(entry.path));
 if(sourceCache.size>22)sourceCache.delete(sourceCache.keys().next().value);
 return task;
}
function passageItems(entry,doc){
 if(entry.format==="json-passages")return (doc.passages||[]).map(p=>({locus:p.locus||p.id||"",text:p.text||""}));
 if(entry.format==="structured-bilingual")return (doc.passages||[]).map(p=>({locus:p.locus||"",text:entry.language==="la"?p.latin||"":p.translation||""}));
 if(entry.format==="html-text"){
  const documentHtml=new DOMParser().parseFromString(doc,"text/html");
  const root=documentHtml.querySelector("main")||documentHtml.body;
  return [...root.querySelectorAll("p")].filter(p=>p.textContent.trim().length>=35&&!p.closest("nav,header,footer,.provenance,.apparatus"))
   .map(p=>({locus:p.id||p.closest("[id]")?.id||"",text:p.textContent||"",anchor:p.id||p.closest("[id]")?.id||""}));
 }
 return [];
}
function reader(entry,passage,word){
 const u=new URL(entry.reader||entry.path,location.href);
 if(entry.format!=="html-text"&&passage.locus)u.searchParams.set("locus",passage.locus);
 else if(passage.anchor)u.hash=encodeURIComponent(passage.anchor);
 u.searchParams.set("q",word);
 if(entry.format==="json-passages")u.searchParams.set("literal","1");
 return u.href;
}
function showVariants(term){
 variants.replaceChildren();
 const diagnosis=engine.diagnosis(term),desc=element("p",diagnosis.caveat,"lx-orth-warning");
 variants.append(desc);
 const table=element("table",undefined,"lx-orth-table"),head=element("tr");
 for(const label of ["Operación","Forma generada","Nivel de prueba"]){head.append(element("th",label))}
 table.append(head);
 for(const v of engine.suggestedVariants(term)){
  const tr=element("tr");
  tr.append(element("td",v.label));
  const form=element("td",v.value===null?"No inferible":v.value);form.dir="auto";tr.append(form);
  tr.append(element("td",v.note||v.kind));table.append(tr);
 }
 variants.append(table);
}
async function run(){
 const q=input.value.trim().slice(0,90),id=++serial;
 results.replaceChildren();
 if(!/^[\p{L}\p{M}ʼ’'-]{2,90}$/u.test(q)){status.textContent="Introduzca una sola forma en griego o latín (2–90 caracteres).";return}
 const language=selectLang(q),mode=$("lx-orth-mode").value;
 if(!["grc","la"].includes(language)){status.textContent="Seleccione griego antiguo o latín. La escritura hebrea y aramea se consulta por separado en Conceptus.";return}
 showVariants(q);status.textContent="Consultando las transcripciones alojadas y sus referencias…";
 const go=$("lx-orth-go");go.disabled=true;
 let failed=0,processed=0,count=0,occurrences=0,matchingEditions=0;
 try{
  const registry=await registered();if(id!==serial)return;
  const entries=(registry.entries||[]).filter(e=>e.language===language&&["json-passages","structured-bilingual","html-text"].includes(e.format));
  const output=element("div",undefined,"lx-orth-attestations");
  for(let offset=0;offset<entries.length;offset+=4){
   const batch=await Promise.all(entries.slice(offset,offset+4).map(async e=>{
    try{
     const doc=await source(e),passages=passageItems(e,doc);
     return {entry:e,passages};
    }catch{return {entry:e,error:true}}
   }));
   if(id!==serial)return;
   for(const item of batch){
    if(item.error){failed++;continue}
    processed++;
    const hits=[];
    for(const p of item.passages){
     const stats=engine.attestationStats(p.text,q,mode,language,3);
     if(!stats.count)continue;
     hits.push({p,m:stats.hits,occurrences:stats.count});
    }
    if(!hits.length)continue;
    count+=hits.length;
    matchingEditions++;
    const editionOccurrences=hits.reduce((sum,hit)=>sum+hit.occurrences,0);
    occurrences+=editionOccurrences;
    const article=element("article",undefined,"lx-orth-edition");
    article.append(element("h4",item.entry.author+" · "+item.entry.title+" · "+langNames[language]));
    article.append(element("p",editionOccurrences+" ocurrencias en "+hits.length+" pasajes · edición: "+(item.entry.edition||"ver fuente editorial"),"lx-orth-meta"));
    for(const hit of hits.slice(0,6)){
     const excerpt=element("div",undefined,"lx-orth-excerpt");
     const a=element("a","Locus "+(hit.p.locus||"sin locus editorial")+" · abrir fuente");
     a.href=reader(item.entry,hit.p,hit.m[0].form);a.rel="noopener";excerpt.append(a);
     const m=hit.m[0],around=hit.p.text.slice(Math.max(0,m.start-85),Math.min(hit.p.text.length,m.end+160)).replace(/\s+/g," ");
     const para=element("p",around);para.lang=language;excerpt.append(para);
     excerpt.append(element("p","Forma atestiguada: "+m.form+" · "+(mode==="exact"?"coincidencia exacta":mode==="diacritics"?"coincidencia con diacríticos plegados":"coincidencia de normalización editorial"),"lx-orth-meta"));
     article.append(excerpt);
    }
    if(hits.length>6)article.append(element("p","Se muestran seis pasajes; abra la edición para explorar el resto.","lx-orth-meta"));
    output.append(article);
   }
  }
  results.replaceChildren(output);
  status.textContent=processed+" ediciones leídas · "+matchingEditions+" con coincidencias · "+occurrences+" ocurrencias en "+count+" pasajes · "+failed+" ediciones no disponibles. "+(count?"Frecuencia de formas buscadas en transcripciones, no de lemas; cada vínculo conduce a la fuente.":"La ausencia en textos consultados no demuestra ausencia en todo el corpus.");
 }catch(error){if(id===serial)status.textContent="No fue posible completar la consulta: "+error.message}
 finally{if(id===serial)go.disabled=false}
}
$("lx-orth-go").addEventListener("click",run);
function invalidate(){
 serial++;
 $("lx-orth-go").disabled=false;
 status.textContent="La consulta cambió. Pulse «Consultar ediciones registradas» para actualizar.";
 results.replaceChildren();
 variants.replaceChildren();
}
input.addEventListener("input",invalidate);
$("lx-orth-mode").addEventListener("change",invalidate);
$("lx-orth-lang").addEventListener("change",invalidate);
const p=new URLSearchParams(location.search);
if(p.get("orth")==="1"&&p.get("q")){$("lx-orth-details").open=true;const set=()=>{if(!input.value)input.value=p.get("q");run()};setTimeout(set,80)}
})();