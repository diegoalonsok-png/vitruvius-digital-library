/* Vitruvia: opt-in REAL neural semantic search for static GitHub Pages.
 * Multilingual E5 embeddings run in the visitor's browser; BM25 supplies exact hits
 * and fallback. Text citations come ONLY from indexed, identified source documents.
 * No generative text, fabricated citations, server-side AI, or secret API credentials.
 */
(()=>{"use strict";
const MODEL="Xenova/multilingual-e5-small";
const CDN="https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const stop=new Set("de del la el los las un una unos unas y en por para a al con del sobre the of and for in on a an is are it into le les des du et il elle un une auf die der das und ein eine di degli della che".split(" "));
const normalize=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[ςϲ]/g,"σ").replace(/[^\p{L}\p{N}\s]+/gu," ").replace(/\s+/g," ").trim();
const terms=s=>normalize(s).split(" ").filter(t=>t.length>1&&!stop.has(t));
 // Whole-token phrase matching, not substring matching. Normalization is for
 // retrieval only: accents and sigma variants do not certify diplomatic identity.
 function normalizedPhrase(text,query){
  const q=normalize(query);
  return Boolean(q)&&(" "+normalize(text)+" ").includes(" "+q+" ");
 }
 function passagePhrase(doc,query){
  return normalizedPhrase(doc.excerptText,query)&&
   (normalizedPhrase(doc.original,query)||normalizedPhrase(doc.translation,query));
 }
 function literalPhrase(text,query){
  const q=asString(query).normalize("NFC"),t=asString(text).normalize("NFC");
  if(!q)return false;
  let at=t.indexOf(q);
  while(at>=0){
   const left=at>0?t.slice(0,at).match(/[\p{L}\p{M}\p{N}]$/u):false;
   const right=/^[\p{L}\p{M}\p{N}]/u.test(t.slice(at+q.length));
   if(!left&&!right)return true;
   at=t.indexOf(q,at+1);
  }
  return false;
 }
const asString=s=>String(s||"").replace(/\s+/g," ").trim();
let registryPromise=null,modelPromise=null;
const corpusCache=new Map();
 // Explicit relevance feedback, local to this browser. No text or model weights
 // are edited; no search history is uploaded. A vote is not scholarly evidence.
 const MEMORY_KEY="vitruvia-ai-relevance-v1",MEMORY_LIMIT=400,TTL=180*86400000;
 let memory=null;
 function readMemory(){
  if(memory)return memory;
  memory=new Map();
  try{
   const rows=JSON.parse(window.localStorage?.getItem(MEMORY_KEY)||"[]");
   if(Array.isArray(rows))for(const r of rows.slice(-MEMORY_LIMIT)){
    if(Array.isArray(r)&&typeof r[0]==="string"&&r[0].length<=2048&&[1,-1].includes(r[1])&&Number.isFinite(r[2])&&Date.now()-r[2]>=0&&Date.now()-r[2]<TTL)memory.set(r[0],{vote:r[1],at:r[2]});
   }
  }catch{}
  return memory;
 }
 function memoryKey(query,record){
  const q=normalize(query),path=record?.sourcePath,locus=record?.locus;
  if(!q||q.length>300||!path||!locus)return "";
  const key=JSON.stringify([q,record.workId||"",path,record.sourceSha256||record.sha256||"",locus,record.language||""]);
  return key.length<=2048?key:"";
 }
 function persistMemory(){
  try{if(!window.localStorage)return false;window.localStorage.setItem(MEMORY_KEY,JSON.stringify([...readMemory()].map(([key,r])=>[key,r.vote,r.at])));return true}catch{return false}
 }
 function feedback(query,record,vote){
  const key=memoryKey(query,record);if(!key||![1,-1,0].includes(vote))return {accepted:false};
  const map=readMemory();map.delete(key);
  if(vote)map.set(key,{vote,at:Date.now()});
  while(map.size>MEMORY_LIMIT)map.delete(map.keys().next().value);
  return {accepted:true,persisted:persistMemory(),vote};
 }
 function feedbackState(query,record){
  const r=readMemory().get(memoryKey(query,record));
  return r&&Date.now()-r.at<TTL?r.vote:0;
 }
 function clearMemory(){readMemory().clear();try{if(!window.localStorage)return false;window.localStorage.removeItem(MEMORY_KEY);return true}catch{return false}}
 // Rerank only already retrieved evidence. Exact requested loci remain above votes.
 function learnedScore(query,entry,selection,enabled=true){
  if(!enabled||selection?.locus||entry.score<=0)return entry.score;
  return entry.score*(1+.12*feedbackState(query,entry.doc));
 }

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
 let base=source.reader||"bibliotheca-graeca-latina.html?work="+encodeURIComponent(source.workId||"");
 // Preserve the exact edition selected by the index, not the default language edition.
 if(/(?:^|\/)classics-text-reader(?:\.html)?\?/.test(base)&&!/[?&]edition=/.test(base)){
  const edition=source.sha256?source.sha256.slice(0,16):source.url;
  if(edition)base+="&edition="+encodeURIComponent(edition);
 }
 if(/[?&]locus=/.test(base))return base.replace(/([?&]locus=)[^&#]*/,"$1"+encodeURIComponent(locus));
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
async function loadSources(){
 // Build from the verified full-text registry, not a handpicked list of six works.
 let sources=[],registryError="";
 try{
  const registry=await requestJSON("./data/classics-corpus/search-registry.json");
  if(!Array.isArray(registry.entries)||!registry.entries.length)throw Error("Registro vacío");
  const entries=registry.entries.filter(e=>
   (e.format==="json-passages"||e.format==="structured-bilingual") &&
   typeof e.path==="string" &&
   (/^data\/[a-z0-9/_-]+\.json$/.test(e.path) ||
    /^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/[a-z0-9_-]+\.json$/.test(e.path)));
  const byPath=new Map();
  for(const e of entries)if(!byPath.has(e.path))byPath.set(e.path,{
   url:e.path,workId:e.workId,sourceWorkId:e.sourceWorkId||e.workId,format:e.format,workTitle:e.title,author:e.author,
   edition:e.edition||e.language,language:e.language,reader:e.reader,
   source:e.sourceDescription||"Bibliotheca · transcripción registrada",sourceUrn:e.sourceUrn||"",sha256:e.sha256||""
  });
  const manifest=await requestJSON("./data/ai-corpora.json");
  for(const e of manifest.sources||[])byPath.set(e.url,{...byPath.get(e.url),...e});
  sources=[...byPath.values()];
 }catch(error){
  registryError=String(error.message||error);
  const manifest=await requestJSON("./data/ai-corpora.json");
  sources=manifest.sources||[];
 }
 if(!sources.length)throw Error("Catálogo de textos vacío");
 return {sources,registryError};
}
function sourceSelection(query,sources){
 const q=normalize(query),qwords=new Set(terms(query));
 const locus=String(query).match(/(?:^|\s)(\d{1,2}\.(?:\d{1,2}|praef)\.\d{1,3})(?=$|\s)/i)?.[1]?.toLowerCase()||"";
 const phrase=(text)=>text.length>=4&&(" "+q+" ").includes(" "+text+" ");
 const hits=sources.map(source=>{
  const author=normalize(source.author),title=normalize(source.workTitle),id=normalize(source.workId);
  const lastAuthor=author.split(" ").filter(w=>w.length>=5).at(-1)||"";
  const authorWords=author.split(" ").filter(w=>w.length>=5);
  const titleWords=terms(title);
  let score=0;
  if(phrase(author)||authorWords.some(w=>phrase(w)))score+=8;
  if(phrase(lastAuthor))score+=3;
  if(phrase(title)||phrase(id))score+=12;
  else if(titleWords.length>0&&titleWords.every(t=>qwords.has(t)))score+=10;
  if(source.workId==="vitruvius"&&(/\b(?:vitruvio|vitruvius|vitruve|vitruvii|de architectura)\b/.test(q)||locus&&/^\s*\d/.test(query)))score+=20;
  return {source,score};
 });
 const best=Math.max(0,...hits.map(x=>x.score));
 const conceptMatch=best<8&&architecturalConcepts.some(group=>group.some(term=>term.includes(" ")&&(" "+q+" ").includes(" "+normalize(term)+" ")));
 const named=best>=8?hits.filter(x=>x.score>=Math.max(8,best-3)).map(x=>x.source):[];
 const conceptWorks=new Set(matchedPhilosophy(query).map(x=>x.work));
 const philosophy=sources.filter(x=>conceptWorks.has(x.workId));
 const compatible=best>=8?philosophy.filter(x=>named.some(n=>n.workId===x.workId)):philosophy;
 const explicit=best>=8||conceptMatch||compatible.length>0;
 const matches=compatible.length?compatible:best>=8?named:conceptMatch?sources.filter(x=>x.workId==="vitruvius"):sources;
 // Named works are searched without passage sampling; broad queries retain the sampled registry.
 return {sources:matches,explicit,locus,registryCount:sources.length};
}
// Check declared identity before a passage can become evidence. Structured
// bilingual documents use their own editorial schema, not this single-language gate.
function sourceIdentityOK(source,data){
 if(!Array.isArray(data?.passages))return false;
 if(source.format!=="json-passages")return true;
 if(data.workId&&data.workId!==(source.sourceWorkId||source.workId))return false;
 if(data.language&&source.language&&data.language!==source.language)return false;
 return true;
}
async function prepareCorpus(selection,registryError){
 const {sources,explicit,registryCount}=selection;
 const works=[],documents=[],unavailable=[],identityRejected=[];
 let sourcePassages=0,indexedPassages=0,sampledSources=0;
 // Five requests per batch prevent a simultaneous download of the whole library.
 for(let offset=0;offset<sources.length;offset+=5){
  const batch=sources.slice(offset,offset+5);
  const settled=await Promise.allSettled(batch.map(async source=>requestJSON(/^https:\/\//.test(source.url)?source.url:"./"+source.url)));
  for(let i=0;i<batch.length;i++){
   const source=batch[i],result=settled[i];
   if(result.status!=="fulfilled"){unavailable.push(source.workId||source.url);continue}
   const data=result.value;
   if(!sourceIdentityOK(source,data)){unavailable.push(source.workId||source.url);identityRejected.push(source.url);continue}
   const before=documents.length;
   // Representative loci from each edition: bounded memory, not exhaustive passage coverage.
   sourcePassages+=data.passages.length;
   const maxSamples=explicit?Infinity:48,passages=data.passages.length>maxSamples
    ?Array.from({length:maxSamples},(_,j)=>data.passages[Math.floor(j*(data.passages.length-1)/(maxSamples-1))])
    :data.passages;
   if(passages.length<data.passages.length)sampledSources++;
   for(const passage of passages){
    if(!passage||typeof passage.locus!=="string"||!passage.locus.trim())continue;
    const original=asString(passage.latin||passage.original||passage.greek||passage.text||"");
    const translation=asString(passage.translation||"");
    const chunks=sliceIntoChunks(original+" "+translation);
    if(chunks.some(c=>terms(c).length>=4))indexedPassages++;
    for(let chunk=0;chunk<chunks.length;chunk++){
     const excerptText=chunks[chunk],tokens=terms(excerptText);
     if(tokens.length<4)continue;
     const tf=new Map();for(const term of tokens)tf.set(term,(tf.get(term)||0)+1);
     documents.push({
      id:source.url+":"+passage.locus+":"+chunk,
      workId:source.workId||"work",locus:passage.locus,
      workTitle:source.workTitle||data.title||"Texto antiguo",
      author:source.author||data.author||"Autor documentado",
      edition:source.edition||data.version||"",language:source.language||data.language||"",
      source:source.source||"Bibliotheca",sourceUrn:source.sourceUrn||data.sourceUrn||"",sha256:source.sha256||"",sourcePath:source.url,url:urlFor(source,passage.locus,passage),
      original,originalLanguage:passage.latin?"la":passage.greek?"grc":source.language||data.language||"",translation,excerptText,chunk,tf,length:tokens.length,lexical:0
     });
    }
   }
   if(documents.length===before)unavailable.push(source.workId||source.url);
   else works.push((source.workTitle||data.title||source.workId)+" · "+(source.edition||data.version||source.language));
  }
  notify("Corpus: "+Math.min(offset+5,sources.length)+"/"+sources.length+" fuentes revisadas");
 }
 if(!documents.length)throw Error("No hay textos indexados compatibles");
 const df=new Map();
 for(const doc of documents)for(const word of doc.tf.keys())df.set(word,(df.get(word)||0)+1);
 const avgLength=documents.reduce((sum,doc)=>sum+doc.length,0)/documents.length;
 if(registryError)notify("Registro no disponible; se usa corpus de reserva: "+registryError,"fallback");
 return {documents,df,avgLength,works,unavailable,identityRejected,declaredSources:sources.length,registryCount,explicit,sourcePassages,indexedPassages,sampledSources,budgeted:selection.budgeted||false,candidateStrategy:selection.candidateStrategy||""};
}
// Broad neural searches use the existing federated inverted index to choose
// candidate editions. The cap is a retrieval budget, never a completeness claim.
const MAX_BROAD_EDITIONS=24;
async function narrowBroad(query,selection){
 if(selection.explicit||selection.sources.length<=MAX_BROAD_EDITIONS)return selection;
 const idx=window.VitruviaClassicsIndex;
 const hits=new Map();
 if(idx?.lookup){
  const queryTerms=[...new Set(terms(query))].filter(t=>t.length>=3).slice(0,5);
  const results=await Promise.allSettled(queryTerms.map(t=>idx.lookup(t,{translations:true})));
  for(const result of results){
   if(result.status!=="fulfilled")continue;
   for(const hit of result.value?.hits||[]){
    const file=hit.work?.file;if(!file)continue;
    const old=hits.get(file)||{matches:0,weight:0};
    old.matches++;old.weight+=Math.log1p(Math.max(0,Number(hit.per10k||hit.count)||0));hits.set(file,old);
   }
  }
 }
 const ranked=selection.sources.filter(s=>hits.has(s.url)).sort((a,b)=>hits.get(b.url).matches-hits.get(a.url).matches||hits.get(b.url).weight-hits.get(a.url).weight||a.url.localeCompare(b.url));
 const chosen=[],used=new Set(),works=new Set();
 const add=s=>{if(chosen.length<MAX_BROAD_EDITIONS&&!used.has(s.url)){chosen.push(s);used.add(s.url);works.add(s.workId)}};
 // Prefer breadth across relevant works before filling with parallel editions.
 for(const s of ranked)if(!works.has(s.workId))add(s);
 for(const s of ranked)add(s);
 // Reserve a small, deterministic fallback sample when postings are absent.
 // No fabricated evidence: BM25/E5 must still inspect these source passages.
 if(!chosen.length){
  const list=selection.sources;
  for(let i=0;i<MAX_BROAD_EDITIONS;i++)add(list[Math.floor(i*(list.length-1)/(MAX_BROAD_EDITIONS-1))]);
 }
 return {...selection,sources:chosen,budgeted:true,candidateStrategy:ranked.length?"índice léxico federado":"muestra de reserva sin coincidencias de índice"};
}
async function corpus(query,{targetedOnly=false}={}){
 if(!registryPromise)registryPromise=loadSources().catch(e=>{registryPromise=null;throw e});
 const registry=await registryPromise;let selection=sourceSelection(query,registry.sources);
 if(targetedOnly&&!selection.explicit)return {data:null,selection};
 if(targetedOnly&&selection.sources.length>24)return {data:null,selection};
 selection=await narrowBroad(query,selection);
 const key=(selection.explicit?"directed:":"sample:")+selection.sources.map(s=>s.url).join("|");
 if(!corpusCache.has(key)){
  if(corpusCache.size>=3)corpusCache.delete(corpusCache.keys().next().value);
  corpusCache.set(key,prepareCorpus(selection,registry.registryError).catch(e=>{corpusCache.delete(key);throw e}));
 }
 return {data:await corpusCache.get(key),selection};
}
// Domain vocabulary calibrated against V514. Related terms are retrieval
// hints, NOT asserted synonyms, translations or evidence of textual identity.
// No locus or result ID is embedded in the expansion vocabulary.
const architecturalConcepts=[
 [
  "resistencia estructural",
  "firmitas",
  "firmitatis",
  "solidez",
  "cimientos",
  "fundamentorum"
 ],
 [
  "funcionalidad",
  "utilitas",
  "utilitatis",
  "utilidad"
 ],
 [
  "belleza arquitectonica",
  "venustas",
  "venustatis",
  "belleza"
 ],
 [
  "hormigon hidraulico",
  "puzolana",
  "polvo volcanico",
  "vesuvium",
  "vesubio",
  "bayas",
  "baianis"
 ],
 [
  "antropometria",
  "proporciones humanas",
  "corpus hominis",
  "cuerpo del hombre",
  "corporis"
 ],
 [
  "acueducto",
  "acueductos",
  "conduccion de agua",
  "conducciones de agua",
  "ductus aquae",
  "fistulis",
  "canales"
 ],
 [
  "urbanismo eolico",
  "viento urbano",
  "vientos",
  "venti",
  "callejones",
  "angiportis"
 ],
 [
  "formacion del arquitecto",
  "educacion del arquitecto",
  "architecti scientia",
  "disciplinis",
  "ratiocinatione",
  "fabrica"
 ],
 [
  "almagre",
  "ocre rojo",
  "rubricae",
  "sinope",
  "almagres"
 ],
 [
  "gnomonica",
  "gnomonis",
  "gnomon",
  "sombra equinoccial",
  "equinoccial"
 ]
];
// Retrieval hints calibrated against registered historical translations.
// These are contextual associations, not exact equivalences or quotations.
const philosophicalConcepts=[
 {
  "work": "plato-republic",
  "triggers": [
   "alegoria de la caverna",
   "mito de la caverna",
   "allegory of the cave",
   "mythe de la caverne"
  ],
  "hints": [
   "subterranean cavern",
   "prisoners",
   "fetters",
   "shadows",
   "cave"
  ]
 },
 {
  "work": "plato-republic",
  "triggers": [
   "rey filosofo",
   "filosofo rey",
   "gobierno de los filosofos",
   "philosopher kings",
   "roi philosophe"
  ],
  "hints": [
   "philosophers become kings",
   "rulers",
   "pursuit of philosophy"
  ]
 },
 {
  "work": "plato-republic",
  "triggers": [
   "idea del bien",
   "forma del bien",
   "form of the good",
   "idee du bien"
  ],
  "hints": [
   "good itself",
   "essence",
   "knowledge and truth",
   "sunlike",
   "boniform"
  ]
 },
 {
  "work": "aristotle-metaphysics",
  "triggers": [
   "ser en cuanto ser",
   "ser qua ser",
   "being qua being",
   "etre en tant qu etre"
  ],
  "hints": [
   "being qua being",
   "science",
   "properties inherent"
  ]
 },
 {
  "work": "aristotle-metaphysics",
  "triggers": [
   "motor inmovil",
   "primer motor inmovil",
   "unmoved mover",
   "moteur immobile"
  ],
  "hints": [
   "moves without being moved",
   "unmoved",
   "eternal",
   "substance and actuality"
  ]
 },
 {
  "work": "aristotle-metaphysics",
  "triggers": [
   "deseo natural de saber",
   "deseo de conocimiento",
   "natural desire for knowledge",
   "desir naturel de savoir"
  ],
  "hints": [
   "all men naturally desire knowledge",
   "esteem for the senses",
   "sense of sight"
  ]
 },
 {
  "work": "aristotle-politics",
  "triggers": [
   "animal politico",
   "zoon politikon",
   "political animal",
   "animal politique"
  ],
  "hints": [
   "political animal",
   "city-state",
   "possesses speech",
   "natural growth"
  ]
 },
 {
  "work": "aristotle-politics",
  "triggers": [
   "gobierno de la clase media",
   "clase media aristotelica",
   "middle class government",
   "classe moyenne aristotelicienne"
  ],
  "hints": [
   "political community administered by the middle class",
   "middle-class state",
   "well governed"
  ]
 },
 {
  "work": "marcus-aurelius-meditations",
  "triggers": [
   "retiro interior",
   "refugio interior",
   "inner retreat",
   "retraite interieure"
  ],
  "hints": [
   "retire into thyself",
   "own soul",
   "tranquility",
   "good ordering of the mind"
  ]
 },
 {
  "work": "marcus-aurelius-meditations",
  "triggers": [
   "cooperacion humana",
   "cooperacion estoica",
   "human cooperation",
   "cooperation stoicienne"
  ],
  "hints": [
   "made for cooperation",
   "feet",
   "hands",
   "kinsman",
   "contrary to nature"
  ]
 }
];
function matchedPhilosophy(query){
 const q=" "+normalize(query)+" ";
 return philosophicalConcepts.filter(group=>group.triggers.some(t=>q.includes(" "+normalize(t)+" ")));
}
function academicTerms(query,workId){
 const exact=normalize(query),weights=new Map([...new Set(terms(query))].map(t=>[t,1]));
 for(const group of matchedPhilosophy(query))if(group.work===workId)for(const hint of group.hints)for(const t of terms(hint))if(!weights.has(t))weights.set(t,.35);
 if(workId!=="vitruvius")return weights;
 for(const group of architecturalConcepts){
  if(!group.some(x=>(" "+exact+" ").includes(" "+normalize(x)+" ")))continue;
  for(const x of group)for(const t of terms(x))if(!weights.has(t))weights.set(t,.35);
 }
 return weights;
}
function lexicalRanking(q,data,selection={}){
 const termCache=new Map();const n=data.documents.length;
 const exact=normalize(q);
 const scores=data.documents.map(doc=>{
  let score=0;
  if(!termCache.has(doc.workId))termCache.set(doc.workId,academicTerms(q,doc.workId));
  for(const [term,weight] of termCache.get(doc.workId)){
   const freq=doc.tf.get(term)||0;
   if(!freq)continue;
   const df=data.df.get(term)||0;
   const idf=Math.log(1+(n-df+.5)/(df+.5));
   const k1=1.4,b=.72;
   score+=weight*idf*(freq*(k1+1))/(freq+k1*(1-b+b*doc.length/data.avgLength));
  }
  if(exact.length>4&&passagePhrase(doc,q))score+=75;
  if(selection.locus&&doc.locus.toLowerCase()===selection.locus&&doc.workId==="vitruvius")score+=10000;
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
  const key=entry.doc.workId+"|"+entry.doc.edition+"|"+entry.doc.language+"|"+entry.doc.sourcePath;
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
  candidateEditions:new Set(candidates.map(x=>x.doc.workId+"|"+x.doc.edition+"|"+x.doc.language+"|"+x.doc.sourcePath)).size};
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
 const exact=passagePhrase(doc,query);
 const literal=exact&&(literalPhrase(doc.original,query)||literalPhrase(doc.translation,query));
 const kind=semantic?(exact?"E5 + coincidencia normalizada · cotejo pendiente":"Reordenación E5 + BM25 · comprobar pertinencia"):(exact?"BM25 · coincidencia de frase normalizada":"BM25 · términos relacionados o coincidencia parcial");
 return {type:"passage",title:doc.workTitle+" · "+doc.locus,
  author:doc.author+" · "+doc.edition+" · "+doc.language,
  excerpt:sourceExcerpt(doc,query),language:doc.language,original:doc.original,originalLanguage:doc.originalLanguage,latin:doc.originalLanguage==="la"?doc.original:"",greek:doc.originalLanguage==="grc"?doc.original:"",translation:doc.translation,
  locus:doc.locus,edition:doc.edition,workId:doc.workId,link:doc.url,source:doc.source,sourceUrn:doc.sourceUrn,sourceSha256:doc.sha256,sourcePath:doc.sourcePath,
  meta:kind+" · "+doc.source+" · locus "+doc.locus,
  rating:Math.round(score),aiScore:Math.round(score),aiSemantic:semantic,
  aiQuery:query,exactTextMatch:literal,normalizedTextMatch:exact,aiCalibrated:[...academicTerms(query,doc.workId)].filter(([term,weight])=>weight<1&&doc.tf.has(term)).length>=2,aiEvidence:true
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
async function search(query,{method="neural",targetedOnly=false,learning=true}={}){
 const q=asString(query);if(!q)return {rows:[],mode:"empty"};
 const {data,selection}=await corpus(q,{targetedOnly});
 if(!data)return {rows:[],mode:"not-targeted",method:"none"};
 notify("Calculando coincidencias documentales y vocabulario académico…");
 const ranked=lexicalRanking(q,data,selection);
 const adjust=entry=>learnedScore(q,entry,selection,learning);
 const scope="Cobertura: "+data.indexedPassages+"/"+data.sourcePassages+" pasajes de fuentes cargadas; "+data.works.length+"/"+data.declaredSources+" fuentes seleccionadas ("+data.registryCount+" rutas compatibles del registro). "+(data.explicit?"Consulta dirigida a obras identificadas.":"Muestreo del registro, no búsqueda exhaustiva.")+(data.sampledSources?" "+data.sampledSources+" fuentes muestreadas.":"")+(data.budgeted?" Selección limitada a "+MAX_BROAD_EDITIONS+" ediciones por consulta ("+data.candidateStrategy+"); no equivale a la cobertura total del índice.":"");
 const coverageNotice=scope+(data.unavailable.length?" Fuentes no cargadas o rechazadas: "+data.unavailable.length+". Cobertura parcial.":"")+(data.identityRejected.length?" Archivos excluidos por estructura o identidad incompatible: "+data.identityRejected.length+".":"");
 const candidates=diversity(ranked);
 const coverage=candidateCoverage(candidates);
 if(!candidates.length)return {rows:[],mode:"empty",stats:{chunks:data.documents.length,works:data.works}};
 const fallback=candidates.filter(x=>x.score>0).map(x=>({...x,score:adjust(x)})).sort((a,b)=>b.score-a.score).slice(0,35).map(x=>renderRow(x.doc,q,x.score*25));
 if(method==="bm25"||prefersReducedData()){
  const warning=(method==="bm25"?"Motor BM25 elegido: búsqueda textual indexada, sin descarga E5 ni similitud neuronal.":"Ahorro de datos activo: se omite la descarga del modelo E5; resultados BM25 sobre textos indexados, sin afirmar análisis neuronal.")+(coverageNotice?" "+coverageNotice:"");
  notify(warning,"fallback");
  return {rows:fallback,mode:"bm25-fallback",
   stats:{chunks:data.documents.length,candidates:candidates.length,...coverage,works:data.works,declaredSources:data.declaredSources,loadedSources:data.works.length,unavailable:data.unavailable},warning,method:"bm25"};
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
   const fused=1/(60+l)+1/(60+s)+(entry.score>=75?.011:0)+(selection.locus&&entry.doc.workId==="vitruvius"&&entry.doc.locus.toLowerCase()===selection.locus?1:0);
   return {...entry,score:adjust({...entry,score:fused*16000})};
  }).sort((a,b)=>b.score-a.score).slice(0,35);
  notify("IA semántica activa · "+data.documents.length+" fragmentos disponibles; "+candidates.length+" cotejados con embeddings."+(coverageNotice?" "+coverageNotice:""),data.unavailable.length?"fallback":"success");
  return {rows:combined.map(x=>renderRow(x.doc,q,x.score,true)),mode:"neural",method:"e5",stats:{chunks:data.documents.length,candidates:candidates.length,...coverage,works:data.works,declaredSources:data.declaredSources,loadedSources:data.works.length,unavailable:data.unavailable},warning:coverageNotice||undefined};
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
  const exact=exactQ.length>4&&normalizedPhrase(x.doc.text,q);if(exact)score+=75;return {doc:x.doc,score,exact}}).sort((a,b)=>b.score-a.score);
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
window.VitruviaAI={search,rank,model:MODEL,version:"1.9.1-phrase-evidence",sourceSelection,academicTerms,narrowBroad,feedback,feedbackState,clearMemory,learnedScore,sourceIdentityOK,normalizedPhrase,passagePhrase,literalPhrase};
})();