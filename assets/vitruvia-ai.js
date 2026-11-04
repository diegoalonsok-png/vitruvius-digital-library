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
let corpusPromise=null,modelPromise=null;
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
async function prepareCorpus(){
 const manifest=await requestJSON("./data/ai-corpora.json");
 if(!Array.isArray(manifest.sources)||!manifest.sources.length)throw Error("Catálogo de textos vacío");
 const settled=await Promise.allSettled(manifest.sources.map(async source=>({source,data:await requestJSON("./"+source.url)})));
 const works=[],documents=[];
 for(const result of settled){
  if(result.status!=="fulfilled")continue;
  const {source,data}=result.value;if(!Array.isArray(data.passages))continue;
  works.push(source.workTitle+" · "+(source.edition||data.version));
  for(const passage of data.passages){
   const original=asString(passage.latin||passage.original||passage.greek||"");
   const translation=asString(passage.translation||"");
   const textChunks=sliceIntoChunks(original+" "+translation);
   for(let chunk=0;chunk<textChunks.length;chunk++){
    const text=textChunks[chunk],tokens=terms(text);
    if(tokens.length<4)continue;
    const tf=new Map();for(const t of tokens)tf.set(t,(tf.get(t)||0)+1);
    documents.push({
     id:(source.workId||"work")+":"+(data.edition||source.edition)+":"+passage.locus+":"+chunk,
     workId:source.workId||"work",
     locus:passage.locus,workTitle:source.workTitle||data.title||"Texto antiguo",
     author:source.author||data.author||"Autor documentado",
     edition:source.edition||data.version||"",language:source.language||data.language||"",
     source:source.source||"Biblioteca Vitruviana",url:urlFor(source,passage.locus,passage),
     original,translation,excerptText:text,chunk,tf,length:tokens.length,lexical:0
    });
   }
  }
 }
 if(!documents.length)throw Error("No hay textos completos indexados");
 const df=new Map();
 for(const doc of documents)for(const word of doc.tf.keys())df.set(word,(df.get(word)||0)+1);
 const avgLength=documents.reduce((sum,doc)=>sum+doc.length,0)/documents.length;
 return {documents,df,avgLength,works};
}
function corpus(){if(!corpusPromise)corpusPromise=prepareCorpus().catch(e=>{corpusPromise=null;throw e});return corpusPromise}
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
  return {doc,score};
 });
 return scores.sort((a,b)=>b.score-a.score);
}
function diversity(lexical,limit=82){
 const selected=[],used=new Set();
 const add=entry=>{if(!used.has(entry.doc.id)){used.add(entry.doc.id);selected.push(entry)}};
 for(const entry of lexical.filter(x=>x.score>0).slice(0,64))add(entry);
 // Support conceptual searches without lexical overlap: deterministic coverage
 // across works, books and sections, not invented candidate passages.
 if(selected.length<limit){
  const bySection=new Map();
  for(const entry of lexical){
   const key=entry.doc.workTitle+"|"+String(entry.doc.locus||"").split(".")[0];
   if(!bySection.has(key))bySection.set(key,[]);
   bySection.get(key).push(entry);
  }
  const groups=[...bySection.values()],maxPerGroup=4;
  for(let round=0;round<maxPerGroup&&selected.length<limit;round++){
   for(const group of groups){if(group[round])add(group[round]);if(selected.length>=limit)break}
  }
 }
 return selected.slice(0,limit);
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
 const kind=semantic?(exact?"IA + texto literal":"Coincidencia semántica; verificar el pasaje"):"BM25 · texto documentado";
 return {type:"passage",title:doc.workTitle+" · "+doc.locus,
  author:doc.author+" · "+doc.edition+" · "+doc.language,
  excerpt:sourceExcerpt(doc,query),latin:doc.original,translation:doc.translation,
  locus:doc.locus,edition:doc.edition,workId:doc.workId,link:doc.url,source:doc.source,
  meta:kind+" · "+doc.source+" · locus "+doc.locus,
  rating:Math.round(score),aiScore:Math.round(score),aiSemantic:semantic,
  exactTextMatch:exact,aiEvidence:true
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
async function search(query){
 const q=asString(query);if(!q)return {rows:[],mode:"empty"};
 notify("Indexando los textos disponibles y calculando coincidencias exactas…");
 const data=await corpus(),ranked=lexicalRanking(q,data);
 const candidates=diversity(ranked);
 if(!candidates.length)return {rows:[],mode:"empty",stats:{chunks:data.documents.length,works:data.works}};
 const fallback=candidates.filter(x=>x.score>0).slice(0,35).map(x=>renderRow(x.doc,q,x.score*25));
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
  notify("IA semántica activa · "+data.documents.length+" fragmentos disponibles; "+candidates.length+" cotejados con embeddings.","success");
  return {rows:combined.map(x=>renderRow(x.doc,q,x.score,true)),mode:"neural",stats:{chunks:data.documents.length,candidates:candidates.length,works:data.works}};
 }catch(e){
  notify("No se pudo cargar el modelo ("+String(e.message||"error").slice(0,90)+"). Se muestran coincidencias BM25, sin afirmar IA semántica.","fallback");
  return {rows:fallback,mode:"bm25-fallback",stats:{chunks:data.documents.length,candidates:candidates.length,works:data.works},warning:String(e.message||e)};
 }
}
window.VitruviaAI={search,model:MODEL,version:"1.0-hybrid-local"};
})();