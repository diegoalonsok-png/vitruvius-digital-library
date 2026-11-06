/* Search the actual hosted classical texts, not catalogue-only records.
   The small registry is generated from existing files; JSON and HTML are read on demand.
   Search is literal (diacritics folded), not OCR or verified morphological lemmatization. */
(()=>{
"use strict";
if(window.ClassicsCorpusSearch)return;
const REGISTRY="data/classics-corpus/search-registry.json";
const LEGACY=[
 ["theophrastus-characters","grc","Teofrasto","Caracteres"],
 ["plato-apology","grc","Platón","Apología de Sócrates"],
 ["aristotle-poetics","grc","Aristóteles","Poética"],
 ["epictetus-enchiridion","grc","Epicteto","Enchiridion"],
 ["homer-iliad","grc","Homero","Ilíada"],
 ["homer-odyssey","grc","Homero","Odisea"],
 ["caesar-gallico","la","Julio César","De bello Gallico"],
 ["virgil-aeneid","la","Virgilio","Aeneis"],
 ["virgil-georgica","la","Virgilio","Georgica"],
 ["petronius-satyrica","la","Petronio","Satyrica"],
 ["apuleius-metamorphoses","la","Apuleyo","Metamorphoses"],
 ["cicero-officiis","la","Cicerón","De officiis","corpus/cicero-de-officiis-la.html"],
 ["lucretius","la","Lucrecio","De rerum natura","corpus/lucretius-de-rerum-natura-la.html"],
 ["catullus-carmina","la","Catulo","Carmina","corpus/catullus-carmina-la.html"]
].map(([workId,language,author,title,html])=>({
 workId,language,author,title,format:html?"html-text":"json-passages",
 path:html||"data/classics-corpus/"+workId+"-"+language+".json",
 reader:html||"classics-text-reader.html?work="+workId+"&lang="+language
}));
let registered=null,registryTask=null,lastDiagnostics={mode:"not-searched",targeted:0,loaded:0,failed:0};
const cache=new Map();
function valid(e){
 return e&&/^[a-z0-9-]+$/.test(e.workId||"")&&["grc","la","en","es","fr","it","de","pt"].includes(e.language)
  &&(e.format==="html-text"?/^corpus\/[a-z0-9-]+\.html$/.test(e.path||"")
    :e.format==="json-passages"&&/^data\/classics-corpus\/[a-z0-9-]+\.json$/.test(e.path||"")
     ||e.format==="structured-bilingual"&&e.workId==="vitruvius"&&
      /^data\/structured\/(?:recensio-es|recensio-fr|theory-en)\.json$/.test(e.path||"")
     ||e.format==="historical-ocr-pages"&&e.workId==="krohn-1912-pdf"&&e.language==="la"&&
      e.path==="data/text/krohn-1912.json");
}
async function registry(){
 if(!registryTask)registryTask=fetch(REGISTRY).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(j=>{
  if(j.schema!=="vitruvia-classics-search-registry-v1"||!Array.isArray(j.entries)||j.entries.length<14)throw Error("Registro de búsqueda incompleto");
  registered=j.entries.filter(valid);if(registered.length!==j.entries.length)throw Error("Registro con rutas o metadatos inválidos");
  return registered;
 }).catch(()=>{registered=LEGACY;return LEGACY});
 return registryTask;
}
const fold=s=>window.ClassicalLexicon?window.ClassicalLexicon.fold(s):String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").replace(/j/g,"i").replace(/v/g,"u");
function matches(text,q){
 if(window.ClassicalLexicon)return window.ClassicalLexicon.find(text,q);
 const t=fold(text),k=fold(q),out=[];if(!k)return out;
 let i=t.indexOf(k);while(i>=0&&out.length<80){out.push([i,i+k.length]);i=t.indexOf(k,i+1)}return out;
}
function snippet(text,[a,b]){
 const s=Math.max(0,a-90),e=Math.min(text.length,b+140);
 return (s?"…":"")+text.slice(s,a)+"«"+text.slice(a,b)+"»"+text.slice(b,e)+(e<text.length?"…":"");
}
function loadJson(e){
 if(!cache.has(e.path))cache.set(e.path,
  (window.VitruviaData?.json?window.VitruviaData.json(e.path):fetch(e.path).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}))
   .then(d=>d?.workId===e.workId&&d?.language===e.language&&Array.isArray(d.passages)?d:null).catch(()=>null));
 return cache.get(e.path);
}
function loadStructured(e){
 // Reuse one immutable source JSON for multiple languages; index only its attested passages.
 if(!cache.has(e.path))cache.set(e.path,
  (window.VitruviaData?.json?window.VitruviaData.json(e.path):
   fetch(e.path).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}))
   .then(d=>Array.isArray(d.passages)&&d.edition===e.edition?d:null).catch(()=>null));
 return cache.get(e.path).then(d=>{
  if(!d||!(e.language==="la"||d.language===e.language))return null;
  const field=e.language==="la"?"latin":"translation";
  return {attribution:"Edición "+d.version+" · "+d.edition+
   " · texto estructurado de autoría editorial; fuente DOCX y SHA256 en el archivo",
   passages:d.passages.filter(p=>typeof p[field]==="string"&&p[field].trim())
     .map(p=>({locus:p.locus,text:p[field]}))};
 });
}
function loadHistoricalOcr(e){
 // Keep machine OCR separate from editorial Latin. Its locators are PDF pages only.
 if(!cache.has(e.path))cache.set(e.path,fetch(e.path).then(r=>{
  if(!r.ok)throw Error("HTTP "+r.status);return r.json();
 }).then(rows=>Array.isArray(rows)&&rows.length>=200&&rows.every(p=>
  Number.isInteger(p.page)&&typeof p.text==="string")
   ?{attribution:"Fritz Krohn (1912) · OCR por página, lectura no cotejada",
     passages:rows.filter(p=>p.text.trim().length>0).map(p=>({
       locus:"p. "+p.page,page:p.page,text:p.text
     }))}:null).catch(()=>null));
 return cache.get(e.path);
}
function loadHtml(e){
 if(!cache.has(e.path))cache.set(e.path,fetch(e.path).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.text()}).then(h=>{
  const doc=new DOMParser().parseFromString(h,"text/html");
  const attribution=doc.querySelector(".provenance")?.textContent?.replace(/\s+/g," ").trim().slice(0,220)
   ||doc.querySelector('meta[name="description"]')?.content||"Texto HTML alojado · ver procedencia en el lector";
  doc.querySelectorAll("script,style,nav,header,footer,aside,.apparatus").forEach(n=>n.remove());
  // Poetry may be stored as <pre> or <section><p class=poem>, without <main>.
  // Do not index critical apparatus as if it were the original ancient text.
  const selectors=["main article pre.verses","main p","main pre","main li","main blockquote",
   "section p.poem","body > pre","body > p","body > blockquote"];
  let blocks=[];
  for(const sel of selectors){blocks=[...doc.querySelectorAll(sel)];if(blocks.length)break}
  const passages=blocks.map((n,i)=>{
   const text=n.textContent.replace(/\s+/g," ").trim();
   const parent=n.closest("article[id],section[id]");
   return {text,locus:parent?.id||"¶"+(i+1),anchor:parent?.id||null};
  }).filter(p=>p.text.length>24);
  return passages.length?{attribution,passages}:null;
 }).catch(()=>null));
 return cache.get(e.path);
}
const languageName={grc:"Griego antiguo",la:"Latín",en:"Inglés",es:"Castellano",fr:"Francés",it:"Italiano",de:"Alemán",pt:"Portugués"};
async function search(q,{limit=8}={}){
 q=String(q||"").trim();
 if(fold(q).replace(/[^\p{L}]/gu,"").length<3||q.length>180||q.split(/\s+/).length>14)return[];
 const grec=/[Ͱ-Ͽἀ-῿]/.test(q),all=await registry();
 const targets=all.filter(e=>grec?e.language==="grc":e.language!=="grc");
 const rows=[];let loaded=0,failed=0;
 // Bounded parallelism avoids a sudden 20-file burst for every first search.
 for(let offset=0;offset<targets.length;offset+=4){
  await Promise.all(targets.slice(offset,offset+4).map(async e=>{
   const d=e.format==="html-text"?await loadHtml(e):e.format==="structured-bilingual"?await loadStructured(e):e.format==="historical-ocr-pages"?await loadHistoricalOcr(e):await loadJson(e);
   if(!d?.passages?.length){failed++;return}loaded++;
   let total=0,units=0,first=null;
   for(const p of d.passages){
    if(!p||typeof p.text!=="string")continue;
    const found=matches(p.text,q);if(!found.length)continue;
    total+=found.length;units++;
    if(!first)first={passage:p,at:found[0]};
   }
   if(!first)return;
   let link=e.reader||(e.format==="html-text"?e.path:"classics-text-reader.html?work="+e.workId+"&lang="+e.language);
   link+=(link.includes("?")?"&":"?")+"q="+encodeURIComponent(q);
   if(e.format==="historical-ocr-pages")link+="&page="+encodeURIComponent(first.passage.page);
   else if(e.format==="json-passages"||e.format==="structured-bilingual")link+="&locus="+encodeURIComponent(first.passage.locus);
   else if(first.passage.anchor)link+="#"+encodeURIComponent(first.passage.anchor);
   rows.push({type:"section",kind:"classic-text",workId:e.workId,language:e.language,
    title:e.author+" · "+e.title+" · "+(languageName[e.language]||e.language)+" · "+total+" coincidencias",
    author:(languageName[e.language]||e.language)+" · "+(d.attribution||e.sourceDescription||"Texto alojado").slice(0,180),
    excerpt:(e.format==="historical-ocr-pages"?"Página OCR "+first.passage.page+": ":"Locus "+first.passage.locus+": ")+snippet(first.passage.text,first.at),
    meta:e.format==="historical-ocr-pages"?"OCR HISTÓRICO · PÁGINA DE PDF · NO TEXTO CRÍTICO NI LOCUS":"TEXTO INDEXADO LOCALMENTE · BÚSQUEDA LITERAL · NO OCR MANUSCRITO",
    rating:e.format==="historical-ocr-pages"?22+Math.min(10,total):58+Math.min(30,total),link,source:"Bibliotheca Graeca et Latina · "+e.path,
    count:total,units});
  }));
 }
 lastDiagnostics={mode:registered===LEGACY?"fallback":"registry",targeted:targets.length,loaded,failed};
 return rows.sort((a,b)=>b.rating-a.rating||a.title.localeCompare(b.title)).slice(0,Math.max(1,Math.min(50,limit)));
}
/* Semantic retrieval uses ONLY editorial mappings already recorded in Conceptus.
   It is not a vector embedding, proof of etymology or verified inflectional analysis. */
let conceptTask=null;
async function semanticConcept(q){
 if(!conceptTask)conceptTask=fetch("data/lexicon/conceptus.json")
  .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(j=>Array.isArray(j.concepts)?j.concepts:[]).catch(()=>[]);
 const concepts=await conceptTask,key=fold(q).trim();
 if(!key||key.length<3)return null;
 return concepts.find(c=>[c.id,...Object.values(c.modern||{}).flat(),
   ...(c.la||[]),...(c.grc||[])].some(v=>typeof v==="string"&&fold(v)===key))||null;
}
async function semanticSearch(q,{limit=6}={}){
 q=String(q||"").trim();
 if(q.length<3||q.length>80||q.split(/\s+/).length>4)return[];
 const concept=await semanticConcept(q);if(!concept)return[];
 const entries=await registry(),rows=[];
 const byLanguage={la:(concept.la||[]).filter(x=>typeof x==="string"),
  grc:(concept.grc||[]).filter(x=>typeof x==="string")};
 // Strictly bounded vocabulary, exact surface matching; never fabricate a locus.
 for(let offset=0;offset<entries.length;offset+=4){
  await Promise.all(entries.slice(offset,offset+4).map(async e=>{
   const terms=[...new Set((byLanguage[e.language]||[]).map(t=>t.trim()).filter(t=>fold(t).length>=3))].slice(0,8);
   if(!terms.length||e.format==="historical-ocr-pages")return;
   const d=e.format==="html-text"?await loadHtml(e):e.format==="structured-bilingual"?await loadStructured(e):e.format==="historical-ocr-pages"?await loadHistoricalOcr(e):await loadJson(e);
   if(!d?.passages?.length)return;
   let first=null,total=0;
   for(const passage of d.passages){
    if(typeof passage.text!=="string")continue;
    for(const term of terms){
     const hits=matches(passage.text,term);
     total+=hits.length;
     if(!first&&hits.length)first={passage,term,at:hits[0]};
    }
   }
   if(!first)return;
   const linkBase=e.reader||(e.format==="html-text"?e.path:
      "classics-text-reader.html?work="+e.workId+"&lang="+e.language);
   let link=linkBase+(linkBase.includes("?")?"&":"?")+"q="+encodeURIComponent(first.term);
   if(e.format==="historical-ocr-pages")link+="&page="+encodeURIComponent(first.passage.page);
   else if(e.format==="json-passages"||e.format==="structured-bilingual")link+="&locus="+encodeURIComponent(first.passage.locus);
   else if(first.passage.anchor)link+="#"+encodeURIComponent(first.passage.anchor);
   else {
    // HTML text without an editorial anchor: point to a real matching
    // passage using a browser text-fragment, never a fabricated locus.
    // This preserves the source HTML unchanged.
    const raw=String(first.passage.text).replace(/\s+/g," ").trim();
    const start=Math.max(0,first.at[0]-24),end=Math.min(raw.length,first.at[1]+36);
    const quote=raw.slice(start,end).trim();
    if(quote)link+="#:~:text="+encodeURIComponent(quote);
   }
   rows.push({type:"section",kind:"classic-text",workId:e.workId,language:e.language,
    title:e.author+" · "+e.title+" · "+(languageName[e.language]||e.language),
    author:"Conceptus: "+concept.id+" · equivalente "+first.term,
    excerpt:"Locus "+first.passage.locus+": "+snippet(first.passage.text,first.at),
    meta:"CORRESPONDENCIA SEMÁNTICA EDITORIAL · COINCIDENCIA LITERAL EN TEXTO · NO LEMATIZACIÓN",
    rating:48+Math.min(total,20),link,source:"Conceptus · "+e.path,count:total});
  }));
 }
 return rows.sort((a,b)=>b.rating-a.rating||a.title.localeCompare(b.title))
   .slice(0,Math.max(1,Math.min(20,limit)));
}
window.ClassicsCorpusSearch={
 search,semanticSearch,
 works:LEGACY.map(e=>({id:e.workId,lang:e.language,author:e.author,title:e.title})),
 registry,diagnostics:()=>({...lastDiagnostics})
};
})();
