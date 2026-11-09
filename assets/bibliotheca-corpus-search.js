/* Biblioteca Grecolatina: copia aislada del motor de concordancias; no modifica Vitruvia, Lexicon ni sus lectores. */
/* Search the actual hosted classical texts, not catalogue-only records.
   The small registry is generated from existing files; JSON and HTML are read on demand.
   Search is literal (diacritics folded), not OCR or verified morphological lemmatization. */
(()=>{
"use strict";
if(window.ClassicsCorpusSearch)return;
const REGISTRY="data/classics-corpus/search-registry.json";
/* Shared Latin sources use existing Lexicon JSON; no text duplicates. */
const SHARED_LATIN_SOURCES={"varro-rustica":"data/lexicon/fontes/varro-rustica-la.json","frontinus":"data/lexicon/fontes/frontinus-aquaeductu-la.json","pliny":"data/lexicon/fontes/pliny-naturalis-la.json"};
/* Biblioteca pública: originales y traducciones inglesas; castellano/francés sólo en Vitruvio.
   El registro compartido conserva intactos los testimonios históricos. */
const bibliothecaLanguagePolicy=e=>e.workId==="vitruvius"||["la","grc","en"].includes(e.language);
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
let registered=null,registeredAll=[],registryTask=null,lastDiagnostics={mode:"not-searched",targeted:0,loaded:0,failed:0};
const cache=new Map();
function valid(e){
 return e&&/^[a-z0-9-]+$/.test(e.workId||"")&&["grc","la","en","es","fr","it","de","pt"].includes(e.language)
  &&(e.format==="html-text"?/^corpus\/[a-z0-9-]+\.html$/.test(e.path||"")
    :e.format==="json-passages"&&(/^data\/classics-corpus\/[a-z0-9-]+\.json$/.test(e.path||"")||
       (e.language==="la"&&e.path===SHARED_LATIN_SOURCES[e.workId]&&Boolean(e.sourceWorkId)))
     ||e.format==="structured-bilingual"&&e.workId==="vitruvius"&&
      /^data\/structured\/(?:recensio-es|recensio-fr|theory-en)\.json$/.test(e.path||"")
     ||e.format==="historical-ocr-pages"&&e.workId==="krohn-1912-pdf"&&e.language==="la"&&
      e.path==="data/text/krohn-1912.json");
}
async function registry(){
 if(!registryTask)registryTask=fetch(REGISTRY).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(async j=>{
  if(j.schema!=="vitruvia-classics-search-registry-v1"||!Array.isArray(j.entries)||j.entries.length<14)throw Error("Registro de búsqueda incompleto");
  registered=j.entries.filter(valid);if(registered.length!==j.entries.length)throw Error("Registro con rutas o metadatos inválidos");
  // Keep the full registry separate from the Bibliotheca language filter.
  registeredAll=registered;
  registered=registered.filter(bibliothecaLanguagePolicy);
  // A validated offsite branch does not count as local hosting.
  if(window.ClassicsOffsiteGreek)registered=registered.concat(await window.ClassicsOffsiteGreek.entries());
  if(window.ClassicsOffsiteLatin)registered=registered.concat(await window.ClassicsOffsiteLatin.entries());
  return registered;
 }).catch(()=>{registered=LEGACY;return LEGACY});
 return registryTask;
}
const fold=s=>window.ClassicalLexicon?window.ClassicalLexicon.fold(s):String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").replace(/j/g,"i").replace(/v/g,"u");
function matches(text,q){
 if(window.ClassicalLexicon)return window.ClassicalLexicon.find(text,q,{prefix:false}); // Concordancia literal: palabra/frase completa, no prefijo accidental.
 const t=fold(text),k=fold(q),out=[];if(!k)return out;
 const isLetter=c=>!!c&&/[\p{L}]/u.test(c);
 let i=t.indexOf(k);while(i>=0&&out.length<80){if(!isLetter(t[i-1])&&!isLetter(t[i+k.length]))out.push([i,i+k.length]);i=t.indexOf(k,i+Math.max(1,k.length))}return out;
}
function snippet(text,[a,b]){
 const s=Math.max(0,a-90),e=Math.min(text.length,b+140);
 return (s?"…":"")+text.slice(s,a)+"«"+text.slice(a,b)+"»"+text.slice(b,e)+(e<text.length?"…":"");
}
function loadJson(e){
 if(e.format==="remote-json-passages")
  return (e.language==="grc"?window.ClassicsOffsiteGreek?.load(e):e.language==="la"?window.ClassicsOffsiteLatin?.load(e):null)||Promise.resolve(null);
 if(!cache.has(e.path))cache.set(e.path,
  (window.VitruviaData?.json?window.VitruviaData.json(e.path):fetch(e.path).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}))
   .then(d=>d?.workId===(e.sourceWorkId||e.workId)&&d?.language===e.language&&Array.isArray(d.passages)?d:null).catch(()=>null));
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
 const grec=/[Ͱ-Ͽἀ-῿]/.test(q),semitic=/[\u0590-\u05ff]/u.test(q),all=await registry();
 // The hosted corpus presently has no Hebrew or Aramaic passage editions.
 // Do not fetch Latin/English texts and misreport absence in an unindexed language.
 const targets=all.filter(e=>bibliothecaLanguagePolicy(e)&&(semitic?["he","arc"].includes(e.language):grec?e.language==="grc":e.language!=="grc")&&
   (e.format!=="remote-json-passages"||(e.language==="grc"?grec&&window.ClassicsOffsiteGreek?.mightContain(e,[q]):e.language==="la"?!grec&&window.ClassicsOffsiteLatin?.mightContain(e,[q]):false)));
 const rows=[];let loaded=0,failed=0;
 // Bounded parallelism avoids a sudden 20-file burst for every first search.
 for(let offset=0;offset<targets.length;offset+=8){
  await Promise.all(targets.slice(offset,offset+8).map(async e=>{
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
   else if(["json-passages","structured-bilingual","remote-json-passages"].includes(e.format))link+="&locus="+encodeURIComponent(first.passage.locus);
   else if(first.passage.anchor)link+="#"+encodeURIComponent(first.passage.anchor);
   rows.push({type:"section",kind:"classic-text",workId:e.workId,language:e.language,
    title:e.author+" · "+e.title+" · "+(languageName[e.language]||e.language)+" · "+total+" coincidencias",
    author:(languageName[e.language]||e.language)+" · "+(d.attribution||e.sourceDescription||"Texto alojado").slice(0,180),
    excerpt:(e.format==="historical-ocr-pages"?"Página OCR "+first.passage.page+": ":"Locus "+first.passage.locus+": ")+snippet(first.passage.text,first.at),
    meta:e.format==="historical-ocr-pages"?"OCR HISTÓRICO · PÁGINA DE PDF · NO TEXTO CRÍTICO NI LOCUS":e.format==="remote-json-passages"?"ORIGINAL GRIEGO INDEXADO · ALOJAMIENTO EXTERNO · BÚSQUEDA LITERAL":"TEXTO INDEXADO LOCALMENTE · BÚSQUEDA LITERAL · NO OCR MANUSCRITO",
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
   ...(c.la||[]),...(c.grc||[]),
   ...(c.he||[]).flatMap(x=>typeof x==="string"?[x]:[x.w,x.tr]),
   ...(c.arc||[]).flatMap(x=>typeof x==="string"?[x]:[x.w,x.tr])].some(v=>typeof v==="string"&&fold(v)===key))||null;
}
let semanticPostingTask=null;
async function semanticPostings(){
 if(!semanticPostingTask)semanticPostingTask=fetch("data/classics-corpus/semantic-conceptus-postings.json")
  .then(r=>{if(!r.ok)throw Error("Not generated yet");return r.json()})
  .then(j=>j?.schema==="vitruvia-classics-semantic-postings-v1"&&Array.isArray(j.versions)?j:null)
  .catch(()=>null);
 return semanticPostingTask;
}
async function semanticSearch(q,{limit=6}={}){
 q=String(q||"").trim();
 if(q.length<3||q.length>80||q.split(/\s+/).length>4)return[];
 const concept=await semanticConcept(q);if(!concept)return[];
 const entries=await registry(),rows=[];
 const staticIndex=await semanticPostings();
 // Optional static inverted index: skip JSON editions with no attested hit,
 // but search original HTML sources live. If the index is absent or stale,
 // keep the existing live search fully operational.
 // Conceptus postings count all registry languages, even those excluded from
 // Bibliotheca's public view. HTML without locus anchors stays live-searchable.
 const eligible=new Set(["json-passages","structured-bilingual","html-text"]);
 const indexKey=e=>[e.workId,e.language,e.source||e.path,e.edition||""].join("|");
 const posted=new Set((staticIndex?.versions||[]).map(indexKey));
 const unanchored=new Set((staticIndex?.notIndexedFormats||[])
   .filter(x=>x.format==="html-text"&&/no stable passage anchor/i.test(x.reason||""))
   .map(x=>x.path));
 const indexValid=Boolean(staticIndex&&registeredAll.length&&
   staticIndex.registryEditionCount===registeredAll.length&&
   staticIndex.indexedEditions===staticIndex.versions.length&&
   staticIndex.indexedEditions+unanchored.size===staticIndex.eligibleEditions&&
   !staticIndex.errors?.length&&
   registeredAll.filter(e=>eligible.has(e.format))
     .every(e=>posted.has(indexKey(e))||(e.format==="html-text"&&unanchored.has(e.path))));
 const indexed=new Map(indexValid?staticIndex.versions.map(v=>[
  [v.workId,v.language,v.source,v.edition||""].join("|"),v
 ]):[]);
 let skippedNoHit=0;
 const byLanguage={};
 // Conceptus concordances are documentary matches in the indexed source languages.
 // Translations remain searchable with literal search(), but are not presented
 // as verified Greek/Latin semantic attestations or aligned loci.
 for(const language of ["la","grc"]){
  const candidates=(language==="la"||language==="grc")?(concept[language]||[]):(concept.modern?.[language]||[]);
  byLanguage[language]=candidates.filter(v=>typeof v==="string"&&v.trim().length>1);
 }
 let loaded=0,failed=0,examined=0;
 // A semantic result must always be supported by an actual textual match,
 // not merely the presence of a concept in the editorial dictionary.

 // Strictly bounded vocabulary, exact surface matching; never fabricate a locus.
 for(let offset=0;offset<entries.length;offset+=4){
  await Promise.all(entries.slice(offset,offset+4).map(async e=>{
   const terms=[...new Set((byLanguage[e.language]||[]).map(t=>t.trim()).filter(t=>fold(t).length>=3))].slice(0,8);
   if(!terms.length||e.format==="historical-ocr-pages"||
    e.format==="remote-json-passages"&&!(e.language==="grc"?window.ClassicsOffsiteGreek?.mightContain(e,terms):e.language==="la"?window.ClassicsOffsiteLatin?.mightContain(e,terms):false))return;
   if(indexValid&&["json-passages","structured-bilingual"].includes(e.format)){
    const version=indexed.get([e.workId,e.language,e.path,e.edition||""].join("|"));
    if(version&&!version.concepts.some(c=>c.concept===concept.id)){skippedNoHit++;return}
   }
   examined++;
   const d=e.format==="html-text"?await loadHtml(e):e.format==="structured-bilingual"?await loadStructured(e):e.format==="historical-ocr-pages"?await loadHistoricalOcr(e):await loadJson(e);
   if(!d?.passages?.length){failed++;return}
   loaded++;
   let first=null,total=0,units=0;
   for(const passage of d.passages){
    let passageHits=0;
    if(typeof passage.text!=="string")continue;
    for(const term of terms){
     const hits=matches(passage.text,term);
     total+=hits.length;passageHits+=hits.length;
     if(!first&&hits.length)first={passage,term,at:hits[0]};
    }
    if(passageHits)units++;
   }
   if(!first)return;
   const linkBase=e.reader||(e.format==="html-text"?e.path:
      "classics-text-reader.html?work="+e.workId+"&lang="+e.language);
   let link=linkBase+(linkBase.includes("?")?"&":"?")+"q="+encodeURIComponent(first.term);
   if(e.format==="historical-ocr-pages")link+="&page="+encodeURIComponent(first.passage.page);
   else if(["json-passages","structured-bilingual","remote-json-passages"].includes(e.format))link+="&locus="+encodeURIComponent(first.passage.locus);
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
    meta:"CORRESPONDENCIA SEMÁNTICA EDITORIAL · CONCEPTUS DOCUMENTADO · COINCIDENCIAS EN "+units+" PASAJE(S) · NO LEMATIZACIÓN",
    rating:48+Math.min(total,20),link,source:"Conceptus · "+e.path,count:total,units,conceptId:concept.id,matchedTerm:first.term});
  }));
 }
 lastDiagnostics={mode:"semantic-conceptus",concept:concept.id,targeted:examined,loaded,failed,matchedEditions:rows.length,staticIndexUsed:Boolean(indexValid),skippedNoHit};
 const sorted=rows.sort((a,b)=>b.rating-a.rating||a.title.localeCompare(b.title));
 // Preserve at least one attested result from each ancient source language,
 // when available, before ranking the rest by match strength.
 const head=[],remaining=[...sorted];
 for(const language of ["la","grc"]){
  const i=remaining.findIndex(x=>x.language===language);
  if(i>=0)head.push(...remaining.splice(i,1));
 }
 return [...head,...remaining].slice(0,Math.max(1,Math.min(100,limit)));
}
// Bounded result cache: repeated queries should not rescan all hosted editions.
// A partial scan is never cached, so missing sources can be retried.
const queryCache=new Map(),inflightQueries=new Map(),MAX_QUERY_CACHE=16;
function cached(kind,fn){
 return async (q,options={})=>{
  const limit=Math.max(1,Math.min(100,Number(options.limit)||8));
  const key=kind+"|"+fold(String(q||"").trim())+"|"+limit;
  const hit=queryCache.get(key);
  if(hit){lastDiagnostics={...hit.diagnostics,reused:true};return hit.rows.map(x=>({...x}))}
  // Deduplicate concurrent identical requests from Vitruvia and the bridge UI.
  if(inflightQueries.has(key))return inflightQueries.get(key).then(x=>x.map(r=>({...r})));
  const running=fn(q,{...options,limit}).then(rows=>{
   if(lastDiagnostics.failed===0&&lastDiagnostics.mode!=="not-searched"){
    queryCache.set(key,{rows:rows.map(x=>({...x})),diagnostics:{...lastDiagnostics}});
    if(queryCache.size>MAX_QUERY_CACHE)queryCache.delete(queryCache.keys().next().value);
   }
   return rows;
  }).finally(()=>inflightQueries.delete(key));
  inflightQueries.set(key,running);
  return running.then(rows=>rows.map(x=>({...x})));
 };
}
/* Complete word/phrase offsets for a documentary concordance. The usual
   search() API retains its bounded snippets; only full-concordance mode counts
   all occurrences in a passage. Normalized Unicode maps back to raw offsets. */
function completeMatches(text,term){
 const wanted=fold(term);if(!wanted)return[];
 let content="",offsets=[];
 for(let i=0;i<text.length;){
  const char=String.fromCodePoint(text.codePointAt(i)),f=fold(char);
  for(let j=0;j<f.length;j++){content+=f[j];offsets.push(i)}
  i+=char.length;
 }
 const letter=c=>!!c&&/[\p{L}\p{N}]/u.test(c);
 const hits=[];let at=content.indexOf(wanted);
 while(at>=0){
  const last=at+wanted.length-1;
  if(!letter(content[at-1])&&!letter(content[last+1])){
   const start=offsets[at],end=offsets[last];
   if(start!==undefined&&end!==undefined)
    hits.push([start,end+(text.codePointAt(end)>0xffff?2:1)]);
  }
  at=content.indexOf(wanted,at+Math.max(1,wanted.length));
 }
 return hits;
}
/* Passage-level search for the Index locorum: links to attested units,
   never treats a semantic equivalent as a literal translation or a verified alignment. */
async function searchPassages(terms,{limit=600,workId="",language="",edition="",maxPerEdition=200,allMatches=false,includeFullText=false,includeOCR=true,onProgress=null}={}){
 const queries=[...new Set((Array.isArray(terms)?terms:[terms]).map(q=>String(q||"").trim()).filter(q=>fold(q).length>=2))].slice(0,12);
 if(!queries.length)return [];
 const all=await registry(),hasGreek=queries.some(q=>/[Ͱ-Ͽἀ-῿]/u.test(q));
 const targets=all.filter(e=>bibliothecaLanguagePolicy(e)&&(!workId||e.workId===workId)&&(!language||e.language===language)&&(!edition||e.edition===edition)&&(includeOCR||e.format!=="historical-ocr-pages")&&
  (e.format!=="remote-json-passages"||(e.language==="grc"?(hasGreek||e.workId===workId)&&window.ClassicsOffsiteGreek?.mightContain(e,queries):e.language==="la"?(!hasGreek||e.workId===workId)&&window.ClassicsOffsiteLatin?.mightContain(e,queries):false)))
  .sort((a,b)=>(a.workId==="vitruvius"?0:a.language==="la"?1:a.language==="grc"?2:3)-(b.workId==="vitruvius"?0:b.language==="la"?1:b.language==="grc"?2:3));
 const rows=[];let loaded=0,failed=0,failures=[];
 for(let offset=0;offset<targets.length;offset+=4){
  await Promise.all(targets.slice(offset,offset+4).map(async e=>{
   let d;
   try {d=e.format==="html-text"?await loadHtml(e):e.format==="structured-bilingual"?await loadStructured(e):e.format==="historical-ocr-pages"?await loadHistoricalOcr(e):await loadJson(e)}
   catch(err){failed++;failures.push({workId:e.workId,language:e.language,path:e.path});return}
   if(!d?.passages?.length){failed++;failures.push({workId:e.workId,language:e.language,path:e.path});return}
   loaded++;
   let editionUnits=0,editionMatches=0;
   for(const p of d.passages){
    if(typeof p?.text!=="string")continue;
    let hit=null,term=null,hitsInPassage=0;
    for(const q of queries){
     const m=allMatches?completeMatches(p.text,q):matches(p.text,q);hitsInPassage+=m.length;
     if(m.length&&(!hit||m[0][0]<hit[0])){hit=m[0];term=q}
    }
    if(!hit)continue;
    const base=e.reader||(e.format==="html-text"?e.path:"classics-text-reader.html?work="+e.workId+"&lang="+e.language);
    let href=base+(base.includes("?")?"&":"?")+"q="+encodeURIComponent(term);
    if(e.format==="historical-ocr-pages")href+="&page="+encodeURIComponent(p.page);
    else if(["json-passages","structured-bilingual","remote-json-passages"].includes(e.format))href+="&locus="+encodeURIComponent(p.locus);
    else if(p.anchor)href+="#"+encodeURIComponent(p.anchor);
    else {const quote=p.text.slice(Math.max(0,hit[0]-24),Math.min(p.text.length,hit[1]+36)).trim();
     if(quote)href+="#:~:text="+encodeURIComponent(quote)}
    rows.push({workId:e.workId,author:e.author,title:e.title,language:e.language,edition:e.edition||"",
      source:e.path,locus:String(p.locus||""),term,hitsInPassage,excerpt:snippet(p.text,hit),link:href,
      ocr:e.format==="historical-ocr-pages",attribution:d.attribution||e.sourceDescription||"",...(includeFullText?{passageText:p.text}:{})});
    editionMatches+=hitsInPassage;
    if(++editionUnits>=maxPerEdition&&!allMatches)break;
   }
  }));
  // Reveal attested passages as editions finish; do not wait for the entire corpus.
  if(typeof onProgress==="function"){
   try{onProgress(rows.slice(),{targeted:targets.length,examined:Math.min(offset+8,targets.length),loaded,failed,complete:offset+8>=targets.length})}catch(error){console.warn("Bibliotheca progress callback",error)}
  }
 }
 lastDiagnostics={mode:"passages",registrySource:registered===LEGACY?"fallback":"verified-registry",
  targeted:targets.length,loaded,failed,failures,matchedPassages:rows.length};
 rows.sort((a,b)=>a.ocr-b.ocr||a.author.localeCompare(b.author)||a.title.localeCompare(b.title)||a.locus.localeCompare(b.locus,undefined,{numeric:true}));
 return allMatches?rows:rows.slice(0,Math.max(1,Math.min(600,limit)));
}
window.ClassicsCorpusSearch={
 search:cached("literal",search),semanticSearch:cached("semantic",semanticSearch),searchPassages,
 works:LEGACY.map(e=>({id:e.workId,lang:e.language,author:e.author,title:e.title})),
 registry,diagnostics:()=>({...lastDiagnostics})
};
})();
