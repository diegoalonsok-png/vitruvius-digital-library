/* Vitruvia: opt-in REAL neural semantic search for static GitHub Pages.
 * Multilingual E5 embeddings run in the visitor's browser; BM25 supplies exact hits
 * and fallback. Text citations come ONLY from indexed, identified source documents.
 * No generative text, fabricated citations, server-side AI, or secret API credentials.
 */
(()=>{"use strict";
const MODEL="Xenova/multilingual-e5-small";
const CDN="https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const stop=new Set("de del la el los las un una unos unas y en por para a al con del sobre the of and for in on a an is are it into le les des du et il elle un une auf die der das und ein eine di degli della che".split(" "));
const normalize=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu," ").replace(/\s+/g," ").trim();
const terms=s=>normalize(s).split(" ").filter(t=>t.length>1&&!stop.has(t));
const asString=s=>String(s||"").replace(/\s+/g," ").trim();
let modelPromise=null;
// Reduce bandwidth when the visitor explicitly enabled their browser's
// data-saver preference. Unsupported browsers keep the existing behavior.
function prefersReducedData(){
 return typeof navigator!=="undefined"&&navigator.connection?.saveData===true;
}
const notify=(message,phase="working")=>{
 const el=document.getElementById("ai-status");
 if(el){el.textContent=message;el.hidden=false;el.dataset.phase=phase}
 window.dispatchEvent(new CustomEvent("vitruvia:ai-update",{detail:{message,phase}}));
};
const requestJSON=async url=>{const r=await fetch(url,{headers:{Accept:"application/json"}});if(!r.ok)throw Error(url+" HTTP "+r.status);return r.json()};
const urlFor=(source,locus,passage)=>{
 if(passage?.reader&&/^https:\/\//i.test(passage.reader))return passage.reader;
 const base=source.reader||"bibliotheca-graeca-latina.html?work="+encodeURIComponent(source.workId||"");
 return base+(base.includes("?")?"&":"?")+"locus="+encodeURIComponent(locus);
};
function sliceIntoChunks(raw,max=340,overlap=48){
 const words=asString(raw).split(/\s+/).filter(Boolean);
 if(words.length<=max)return [words.join(" ")];
 const out=[];const step=max-overlap;
 for(let i=0;i<words.length;i+=step){
  const part=words.slice(i,i+max).join(" ");
  if(part)out.push(part);
  if(i+max>=words.length)break;
 }
 return out;
}
// The shared index may not yet be loaded (or may fail). A small, explicit
// reserve manifest preserves independent BM25 operation without downloading
// the entire library or silently asserting exhaustive coverage.
async function reserveCorpus(query){
 const manifest=await requestJSON("./data/ai-corpora.json");
 const sources=(Array.isArray(manifest.sources)?manifest.sources:[]).filter(s=>
  typeof s.url==="string"&&/^data\/[a-z0-9/_-]+\.json$/i.test(s.url)&&s.workId&&s.edition).slice(0,6);
 const documents=[],works=[],unavailable=[],seen=new Set();
 const qt=[...new Set(terms(query))];
 let loaded=0;
 for(const source of sources){
  try{
   const data=await requestJSON("./"+source.url);
   if(!Array.isArray(data.passages))throw Error("Formato no compatible");
   loaded++;
   works.push([source.workTitle,source.edition,source.language].filter(Boolean).join(" · "));
   let matches=0;
   for(const p of data.passages){
    if(!p||typeof p.locus!=="string"||!p.locus.trim())continue;
    const original=typeof p.latin==="string"?p.latin:typeof p.original==="string"?p.original:source.language==="grc"&&typeof p.text==="string"?p.text:"";
    const translation=typeof p.translation==="string"?p.translation:"";
    const texts=[{text:original,language:p.latin?"la":source.language},{text:translation,language:source.language}];
    let matched=false;
    for(const {text,language} of texts){
     if(!text.trim()||!language)continue;
     const folded=normalize(text);
     if(!qt.some(t=>(" "+folded+" ").includes(" "+t+" "))&&!folded.includes(normalize(query)))continue;
     matched=true;
     const key=[source.workId,source.edition,language,source.url,p.locus].join("|");
     if(seen.has(key))continue;seen.add(key);
     for(const [i,excerptText] of sliceIntoChunks(text).entries()){
      const tokens=terms(excerptText);if(!tokens.length)continue;
      const tf=new Map();for(const token of tokens)tf.set(token,(tf.get(token)||0)+1);
      documents.push({id:key+":"+i,workId:source.workId,locus:p.locus,workTitle:source.workTitle,
       author:source.author,edition:source.edition,language,source:source.source,url:urlFor(source,p.locus,p),
       original:["la","grc"].includes(language)?text:"",translation:["es","en","fr","de","it","pt"].includes(language)?text:"",
       sourceText:text,excerptText,tf,length:tokens.length});
     }
    }
    if(matched&&++matches>=40)break;
   }
  }catch{unavailable.push(source.url)}
 }
 const df=new Map();for(const d of documents)for(const token of d.tf.keys())df.set(token,(df.get(token)||0)+1);
 return {documents,df,avgLength:documents.reduce((sum,d)=>sum+d.length,0)/Math.max(1,documents.length),works,unavailable,
  declaredSources:sources.length,loadedSources:loaded,targeted:sources.length,indexGate:false,partial:true,reserve:true};
}
// Retrieve actual matching loci through the existing concordance index.
 // Coverage is explicitly bounded, not a random 48-passage sample.
 async function prepareCorpus(query){
  const api=window.ClassicsCorpusSearch;
  if(!api?.searchPassages)return reserveCorpus(query);
  const queryTerms=[...new Set(terms(query))].filter(t=>t.length>=3).slice(0,5);
  const literalQueries=[...new Set([query,...queryTerms])].slice(0,6);
  let concept=null;
  try{concept=await api.conceptTerms?.(query)||null}catch{}
  const originalGreek=/[\u0370-\u03ff\u1f00-\u1fff]/u.test(query);
  const la=[...new Set([...(originalGreek?[]:literalQueries),...(concept?.la||[])])];
  const grc=[...new Set([...(originalGreek?literalQueries:[]),...(concept?.grc||[])])];
  const queries=[...new Set([...literalQueries,...(concept?.la||[]),...(concept?.grc||[])])].slice(0,12);
  const languageTerms=concept?{la,grc}:null;
  let diagnostics={};
  const rows=await api.searchPassages(queries,{limit:240,maxPerEdition:16,strictBudget:24,structuredOnly:true,languageTerms,
   onProgress:p=>notify("Fuentes candidatas: "+p.checked+"/"+p.total+" · pasajes encontrados: "+p.matched),
   onComplete:d=>{diagnostics=d}});
  const documents=[],seen=new Set(),works=new Set();
  for(const row of rows){
   if(row.ocr||!row.locus||!row.workId||!row.link||typeof row.originalText!=="string"||!row.originalText.trim())continue;
   const text=row.originalText;
   const key=[row.workId,row.language,row.edition,row.source,row.locus].join("|");
   if(seen.has(key))continue;seen.add(key);
   works.add([row.title,row.edition,row.language].filter(Boolean).join(" · "));
   // Keep the exact source text. A translation is not an ancient original.
   const chunks=sliceIntoChunks(text);
   for(let i=0;i<chunks.length;i++){
    const excerptText=chunks[i],tokens=terms(excerptText);
    if(!tokens.length)continue;
    const tf=new Map();for(const t of tokens)tf.set(t,(tf.get(t)||0)+1);
    documents.push({id:key+":"+i,workId:row.workId,locus:row.locus,workTitle:row.title,author:row.author,
     edition:row.edition||"",language:row.language||"",source:row.attribution||row.source,url:row.link,
     original:["la","grc"].includes(row.language)?text:"",translation:["es","en","fr","de","it","pt"].includes(row.language)?text:"",
     sourceText:text,excerptText,chunk:i,tf,length:tokens.length,matchedTerm:row.term||"",conceptId:concept?.id||"",conceptMatch:Boolean(concept&&[...(concept.la||[]),...(concept.grc||[])].some(v=>normalize(v)===normalize(row.term)))});
   }
  }
  const df=new Map();
  for(const d of documents)for(const token of d.tf.keys())df.set(token,(df.get(token)||0)+1);
  const avgLength=documents.reduce((sum,d)=>sum+d.length,0)/Math.max(1,documents.length);
  return {documents,df,avgLength,works:[...works],unavailable:(diagnostics.failures||[]).map(x=>x.path||x.workId),
   declaredSources:diagnostics.registered??null,loadedSources:diagnostics.loaded??null,targeted:diagnostics.targeted??null,
   eligible:diagnostics.eligible??null,indexGate:diagnostics.indexGate??false,partial:true,concept};
 }
function lexicalRanking(q,data){
 const queryTerms=[...new Set(terms(q))];const n=data.documents.length;
 const exact=normalize(q);
 const scores=data.documents.map(doc=>{
  let score=0;
  for(const term of queryTerms){
   const freq=doc.tf.get(term)||0;
   if(!freq)continue;
   const df=data.df.get(term)||0;
   const idf=Math.log(1+(n-df+.5)/(df+.5));
   const k1=1.4,b=.72;
   score+=idf*(freq*(k1+1))/(freq+k1*(1-b+b*doc.length/data.avgLength));
  }
  if(exact.length>4&&normalize(doc.excerptText).includes(exact))score+=75;
  if(doc.conceptMatch&&doc.matchedTerm&&(" "+normalize(doc.excerptText)+" ").includes(" "+normalize(doc.matchedTerm)+" "))score+=8;
  return {doc,score};
 });
 return scores.sort((a,b)=>b.score-a.score);
}
function diversity(lexical,limit=82){
 const selected=[],used=new Set();
 const add=entry=>{
  if(!entry||used.has(entry.doc.id)||selected.length>=limit)return;
  used.add(entry.doc.id);selected.push(entry);
 };
 // Preserve the best lexical evidence while reserving room for other sources.
 // E5 must not operate on only the first 64 hits from one edition.
 const lexicalCap=Math.min(48,Math.floor(limit*.6));
 let lexicalTaken=0;
 for(const entry of lexical){
  if(entry.score<=0||lexicalTaken>=lexicalCap)break;
  add(entry);lexicalTaken++;
 }
 // Treat each edition separately: the same ancient work can have translations.
 const byEdition=new Map();
 for(const entry of lexical){
  const key=entry.doc.workId+"|"+entry.doc.edition+"|"+entry.doc.language;
  if(!byEdition.has(key))byEdition.set(key,[]);
  byEdition.get(key).push(entry);
 }
 const groups=[...byEdition.values()];
 // The first pass reserves at least one candidate per edition when capacity permits.
 for(const group of groups)add(group[0]);
 // Sample across each edition's full locus range instead of repeatedly taking its
 // first chapter. This is only candidate generation, not a relevance guarantee.
 const rounds=Math.max(0,Math.min(48,limit));
 for(let round=1;round<=rounds&&selected.length<limit;round++){
  for(const group of groups){
   if(selected.length>=limit)break;
   const index=Math.min(group.length-1,Math.floor(round*group.length/(rounds+1)));
   add(group[index]);
  }
 }
 // Fill remaining positions from the lexical ranking (including negative-free ties)
 // so the candidate pool remains deterministic and bounded.
 for(const entry of lexical){if(selected.length>=limit)break;add(entry)}
 return selected;
}
function candidateCoverage(candidates){
 return {candidateWorks:new Set(candidates.map(x=>x.doc.workId)).size,
  candidateEditions:new Set(candidates.map(x=>x.doc.workId+"|"+x.doc.edition+"|"+x.doc.language)).size};
}
function sourceExcerpt(doc,query,max=420){
 const source=doc.excerptText;const lowered=normalize(source),words=terms(query);
 let where=-1;
 for(const word of words){const at=lowered.indexOf(word);if(at>=0&&(where<0||at<where))where=at}
 // Unicode accent stripping changes offsets, so use a conservative window rather
 // than claiming an exact character mapping for the excerpt.
 if(where<0)return source.slice(0,max)+(source.length>max?"…":"");
 const from=Math.max(0,Math.min(source.length-max,where-100));
 return (from?"…":"")+source.slice(from,from+max)+(from+max<source.length?"…":"");
}
function renderRow(doc,query,score,semantic=false){
 const exact=normalize(doc.excerptText).includes(normalize(query));
 const kind=semantic?(exact?"E5 + coincidencia textual · cotejo pendiente":"Reordenación E5 + BM25 · comprobar pertinencia"):doc.conceptMatch&&!exact?"Conceptus · correspondencia editorial atestiguada en el pasaje":"BM25 · coincidencia textual indexada";
 return {type:"passage",title:doc.workTitle+" · "+doc.locus,
  author:doc.author+" · "+doc.edition+" · "+doc.language,
  excerpt:sourceExcerpt(doc,query),latin:doc.language==="la"?doc.original:"",originalText:doc.sourceText||doc.original||doc.translation,originalLanguage:doc.language==="la"||doc.language==="grc"?doc.language:"",translation:doc.translation,translationLanguage:doc.translation?doc.language:"",
  locus:doc.locus,edition:doc.edition,workId:doc.workId,link:doc.url,source:doc.source,
  meta:kind+" · "+doc.source+" · locus "+doc.locus+(doc.conceptMatch?" · "+doc.conceptId+" → "+doc.matchedTerm:""),
  rating:Math.round(score),aiScore:Math.round(score),aiSemantic:semantic,
  exactTextMatch:exact,conceptId:doc.conceptId||null,matchedTerm:doc.matchedTerm||null,aiEvidence:true
 };
}
const dot=(a,b)=>{let sum=0;for(let i=0;i<Math.min(a.length,b.length);i++)sum+=a[i]*b[i];return sum};
async function getModel(){
 if(modelPromise)return modelPromise;
 modelPromise=(async()=>{
  notify("Cargando IA multilingüe en este navegador. La primera vez descarga aproximadamente 120 MB…");
  const mod=await import(CDN);
  mod.env.allowLocalModels=false;
  const pipeline=await mod.pipeline("feature-extraction",MODEL,{
   dtype:"q8",device:"wasm",
   progress_callback:info=>{
    if(info?.status==="progress"&&Number.isFinite(info.progress)){
     notify("Modelo de IA: "+Math.round(info.progress)+" % descargado (solo la primera vez).");
    }
   }
  });
  return pipeline;
 })().catch(err=>{modelPromise=null;throw err});
 return modelPromise;
}
async function vectors(pipe,texts){
 const out=[];
 for(let i=0;i<texts.length;i+=6){
  const batch=texts.slice(i,i+6);
  const tensor=await pipe(batch,{pooling:"mean",normalize:true});
  const data=tensor.data;
  if(!data||!tensor.dims)throw Error("Embeddings incompletos");
  const dims=tensor.dims,dim=dims[dims.length-1];
  for(let row=0;row<batch.length;row++)out.push(Float32Array.from(data.subarray(row*dim,(row+1)*dim)));
  notify("IA semántica: cotejando "+Math.min(i+batch.length,texts.length)+"/"+texts.length+" fragmentos.");
 }
 return out;
}
async function search(query,{method="neural"}={}){
 const q=asString(query);if(!q)return {rows:[],mode:"empty"};
 notify("Indexando los textos disponibles y calculando coincidencias exactas…");
 let data;
 try{data=await prepareCorpus(q)}catch(error){if(!window.ClassicsCorpusSearch?.searchPassages)throw error;data=await reserveCorpus(q)}
 const ranked=lexicalRanking(q,data);
 const coverageNotice="Selección parcial de pasajes: "+(data.loadedSources??"sin recuento")+"/"+(data.targeted??"sin recuento")+" ediciones consultadas; "+(data.reserve?"corpus de reserva, máximo 6. ":"máximo 24. ")+(data.indexGate?"Índice léxico utilizado. ":"Índice léxico no disponible; selección acotada. ")+(data.unavailable.length?"Fuentes no cargadas: "+data.unavailable.length+".":"");
 const candidates=diversity(ranked);
 const coverage=candidateCoverage(candidates);
 if(!candidates.length){notify("No se recuperaron pasajes en la selección acotada. Esto no prueba ausencia en el corpus. "+coverageNotice,"fallback");return {rows:[],mode:"empty",warning:coverageNotice,stats:{chunks:0,works:data.works,declaredSources:data.declaredSources,loadedSources:data.loadedSources,partial:true}};}
 const fallback=candidates.filter(x=>x.score>0).slice(0,35).map(x=>renderRow(x.doc,q,x.score*25));
 if(method==="bm25"||prefersReducedData()){
  const warning=(method==="bm25"?"Motor BM25 elegido: búsqueda textual indexada, sin descarga E5 ni similitud neuronal.":"Ahorro de datos activo: se omite la descarga del modelo E5; resultados BM25 sobre textos indexados, sin afirmar análisis neuronal.")+(coverageNotice?" "+coverageNotice:"");
  notify(warning,"fallback");
  return {rows:fallback,mode:"bm25-fallback",
   stats:{chunks:data.documents.length,candidates:candidates.length,...coverage,works:data.works,declaredSources:data.declaredSources,loadedSources:data.loadedSources,unavailable:data.unavailable},warning,method:"bm25"};
 }
 try{
  const model=await getModel();
  notify("Modelo cargado. Comparando significado; los textos clásicos conservan búsquedas literales comprobables…");
  const inputs=["query: "+q,...candidates.map(entry=>"passage: "+entry.doc.workTitle+". "+entry.doc.excerptText.slice(0,1100))];
  const embeddings=await vectors(model,inputs),queryVec=embeddings.shift();
  const semantic=candidates.map((entry,i)=>({...entry,similarity:dot(queryVec,embeddings[i])}))
   .sort((a,b)=>b.similarity-a.similarity);
  const lexRanks=new Map(ranked.map((entry,i)=>[entry.doc.id,i+1]));
  const semRanks=new Map(semantic.map((entry,i)=>[entry.doc.id,i+1]));
  const combined=candidates.map(entry=>{
   const l=lexRanks.get(entry.doc.id)||ranked.length+1,s=semRanks.get(entry.doc.id)||candidates.length+1;
   // Reciprocal Rank Fusion + phrase evidence. Semantic similarity is not textual proof.
   const fused=1/(60+l)+1/(60+s)+(entry.score>=75?.011:0);
   return {...entry,score:fused*16000};
  }).sort((a,b)=>b.score-a.score).slice(0,35);
  notify("IA semántica activa · "+data.documents.length+" fragmentos disponibles; "+candidates.length+" cotejados con embeddings."+(coverageNotice?" "+coverageNotice:""),coverageNotice?"fallback":"success");
  return {rows:combined.map(x=>renderRow(x.doc,q,x.score,true)),mode:"neural",method:"e5",stats:{chunks:data.documents.length,candidates:candidates.length,...coverage,works:data.works,declaredSources:data.declaredSources,loadedSources:data.loadedSources,unavailable:data.unavailable},warning:coverageNotice||undefined};
 }catch(e){
  notify("No se pudo cargar el modelo ("+String(e.message||"error").slice(0,90)+"). Se muestran coincidencias BM25, sin afirmar IA semántica.","fallback");
  return {rows:fallback,mode:"bm25-fallback",stats:{chunks:data.documents.length,candidates:candidates.length,...coverage,works:data.works},warning:String(e.message||e)};
 }
}
/* Ordenación genérica por sentido para visores (p. ej. páginas de un PDF):
 * BM25 sobre los textos recibidos + reordenamiento E5 de los mejores candidatos.
 * docs: [{id,text,...}] · devuelve {mode:"neural"|"bm25-fallback",rows:[{doc,score,exact}]}. */
async function rank(query,docs,{limit=30,candidates=40}={}){
 const q=asString(query);if(!q||!Array.isArray(docs)||!docs.length)return {mode:"empty",rows:[]};
 const prepared=docs.map(d=>{const tokens=terms(d.text);const tf=new Map();for(const t of tokens)tf.set(t,(tf.get(t)||0)+1);return {doc:d,tf,length:Math.max(1,tokens.length)}}).filter(x=>x.length>3);
 const df=new Map();for(const x of prepared)for(const w of x.tf.keys())df.set(w,(df.get(w)||0)+1);
 const avg=prepared.reduce((a,x)=>a+x.length,0)/Math.max(1,prepared.length),n=prepared.length,qt=[...new Set(terms(q))],exactQ=normalize(q);
 const scored=prepared.map(x=>{let score=0;for(const t of qt){const f=x.tf.get(t)||0;if(!f)continue;const d=df.get(t)||0;score+=Math.log(1+(n-d+.5)/(d+.5))*(f*2.4)/(f+1.4*(1-.72+.72*x.length/avg))}
  const exact=exactQ.length>4&&normalize(x.doc.text).includes(exactQ);if(exact)score+=75;return {doc:x.doc,score,exact}}).sort((a,b)=>b.score-a.score);
 const pool=scored.filter(x=>x.score>0).slice(0,candidates);
 const fill=scored.filter(x=>x.score<=0).slice(0,Math.max(0,Math.min(12,candidates-pool.length)));
 const cand=[...pool,...fill];if(!cand.length)return {mode:"empty",rows:[]};
 if(prefersReducedData()){
  const warning="Ahorro de datos activo: se usa BM25 sin descargar E5.";
  notify(warning,"fallback");
  return {mode:"bm25-fallback",rows:pool.slice(0,limit),warning};
 }
 try{
  const model=await getModel();
  const vecs=await vectors(model,["query: "+q,...cand.map(x=>"passage: "+String(x.doc.text).slice(0,1100))]);const qv=vecs.shift();
  const sem=cand.map((x,i)=>({...x,similarity:dot(qv,vecs[i])})).sort((a,b)=>b.similarity-a.similarity);
  const lr=new Map(scored.map((x,i)=>[x.doc.id,i+1])),sr=new Map(sem.map((x,i)=>[x.doc.id,i+1]));
  const rows=cand.map(x=>({...x,score:(1/(60+(lr.get(x.doc.id)||999))+1/(60+(sr.get(x.doc.id)||999))+(x.exact?.011:0))*16000})).sort((a,b)=>b.score-a.score).slice(0,limit);
  notify("IA semántica activa en el visor.","success");return {mode:"neural",rows};
 }catch(e){return {mode:"bm25-fallback",rows:pool.slice(0,limit),warning:String(e.message||e)}}
}
window.VitruviaAI={search,rank,model:MODEL,version:"1.4-conceptus-reserve"};
})();