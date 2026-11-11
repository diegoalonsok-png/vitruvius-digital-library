/* Historical OCR paragraph search for Vitruvia.
 * Free, on-demand, local files; no external API or server required.
 * These are algorithmically segmented OCR units, NOT verified editorial paragraphs.
 * Concept mode is multilingual term expansion + BM25, NOT neural AI.
 */
(()=>{"use strict";
const SOURCES=Object.freeze({
 krohn:{title:"Fritz Krohn · 1912",edition:"Krohn 1912",file:"data/text/krohn-1912.json",language:"la",mode:"pdf",viewer:"documents/krohn-1912.pdf"},
 rose:{title:"Valentin Rose · 1899",edition:"Rose 1899",file:"data/text/rose-1899.json",language:"la",mode:"pdf",viewer:"https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf"},
 cesariano:{title:"Cesare Cesariano · 1521",edition:"Cesariano 1521",file:"data/text/cesariano-1521.json",language:"it",mode:"image",viewer:"cesariano-1521.html"}
});
const cache=new Map();
const STOP=new Set("a ad al alla alle allo and con cum da de del della delle di do e ed en et for from he in inque into is la le les lo los na ne nel non of on or per por que qui quae quod se su the to una uno un una ut y il et quia in ad ab ex ab eo".split(" "));
const CONCEPTS={
 arquitectura:["architectura","architectus","architettura","aedificatio","edificio"],
 arquitecto:["architectus","architecto","architetto"],
 proporcion:["proportio","proportione","symmetria","simmetria","modulus"],
 simetria:["symmetria","simmetria","proportio","proporzione"],
 columna:["columna","columnae","colonne","colonna"],
 templo:["templum","templa","aedes","tempio","tempie"],
 maquina:["machina","machinae","macchina","mechanica"],
 agua:["aqua","aquae","acqua","aquaeductus"],
 viento:["ventus","venti","ventorum","vento"],
 basilica:["basilica","fano","fanestri"],
 teatro:["theatrum","teatro","theatro"],
 geometria:["geometria","geometrica","geometrie"],
 construccion:["fabrica","aedificatio","costruzione"],
 cemento:["caementum","caementicium","calce","calcis"],
 fortificacion:["munitio","murus","mura","fortezza"],
 ciudad:["urbs","urbis","civitas","citta"],
 sol:["sol","solis","sole"],
 reloj:["horologium","gnomon","orologio"],
 manuscrito:["codex","codices","codice","manuscriptum"]
};
function norm(value){return String(value||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()
 .replace(/ſ/g,"s").replace(/j/g,"i").replace(/v/g,"u")
 .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();}
function tokens(text){return norm(text).split(" ").filter(t=>t.length>2&&!STOP.has(t));}
function wordCount(text){return String(text||"").trim().split(/\s+/).filter(Boolean).length;}
function wrapText(text){return String(text||"").replace(/\r/g,"")
 .replace(/([\p{L}])-\n(?=[\p{L}])/gu,"$1")
 .replace(/[ \t]*\n[ \t]*/g," ").replace(/[ \t]+/g," ").trim();}
function splitLong(value,cap=145){
 const clauses=String(value||"").match(/[^.!?;:]+(?:[.!?;:]+|$)/gu)||[value];
 const chunks=[];let current="";
 const flush=()=>{if(current.trim()){chunks.push(current.trim());current="";}};
 for(const clause of clauses){
  const n=wordCount(clause);
  if(n>cap){
   flush();const words=clause.trim().split(/\s+/);
   for(let i=0;i<words.length;i+=cap)chunks.push(words.slice(i,i+cap).join(" "));
   continue;
  }
  if(wordCount(current)+n>cap&&current)flush();
  current+=(current?" ":"")+clause.trim();
 }
 flush();return chunks;
}
function segmentPage(edition,page,text){
 const raw=String(text||"");if(!raw.trim())return [];
 let parts=raw.replace(/\r/g,"").split(/\n[ \t]*\n+/);
 // Some OCR providers flatten the entire printed page into a single line.
 if(parts.length<2)parts=[raw];
 const chunks=[];
 for(const part of parts){
  const cleaned=wrapText(part);if(!cleaned)continue;
  const blocks=wordCount(cleaned)>175?splitLong(cleaned):[cleaned];
  for(const block of blocks){
   if(wordCount(block)<9)continue;
   chunks.push(block);
  }
 }
 // Short fragments are retained separately: merging different columns can
 // invent a paragraph, which is particularly risky for critical apparatus.
 return chunks.map((text,i)=>({
  id:edition+":p"+String(page).padStart(4,"0")+":b"+String(i+1).padStart(3,"0"),
  edition,page,block:i+1,text,wordCount:wordCount(text),
  sourceFile:SOURCES[edition].file,language:SOURCES[edition].language,
  evidence:"ocr_unverified",segmentation:"heuristic_page_block",
  locus:null,locusStatus:"not_aligned"
 }));
}
function paragraphIndex(edition,pages){
 if(!SOURCES[edition]||!Array.isArray(pages))throw Error("Fuente OCR incompatible: "+edition);
 const units=[];let missing=0;
 for(const row of pages){
  const n=Number(row&&row.page);if(!Number.isInteger(n)||n<1){missing++;continue;}
  const text=row.text||"";units.push(...segmentPage(edition,n,text));
 }
 return {edition,units,sourcePages:pages.length,invalidPages:missing,
  warning:"Los bloques son aproximaciones desde OCR; no sustituyen la edición ni se alinean automáticamente con loci."};
}
function pageURL(entry){
 const source=SOURCES[entry.edition];if(!source)return "";
 return source.mode==="image"?
  source.viewer+"?image="+encodeURIComponent(entry.page):
  source.viewer+"#page="+encodeURIComponent(entry.page);
}
async function load(edition){
 if(!SOURCES[edition])throw Error("Edición no reconocida");
 if(!cache.has(edition))cache.set(edition,(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  try{
   const response=await fetch(SOURCES[edition].file,{signal:controller.signal});
   if(!response.ok)throw Error("HTTP "+response.status);
   return paragraphIndex(edition,await response.json());
  }finally{clearTimeout(timer);}
 })().catch(error=>{cache.delete(edition);throw error;}));
 return cache.get(edition);
}
function queryWeights(query,mode){
 const primary=[...new Set(tokens(query))],weights=new Map(primary.map(t=>[t,1]));
 if(mode==="conceptual")for(const term of primary){
  for(const [key,synonyms] of Object.entries(CONCEPTS)){
   if(norm(key)!==term&&!synonyms.some(s=>norm(s)===term))continue;
   for(const equivalent of synonyms){
    const t=norm(equivalent);
    if(t.length>2&&!weights.has(t))weights.set(t,.42);
   }
  }
 }
 return {primary,weights};
}
function occurrences(words){const counts=new Map();for(const word of words)counts.set(word,(counts.get(word)||0)+1);return counts;}
function rankRows(units,query,mode="literal",limit=50){
 const {primary,weights}=queryWeights(query,mode);
 if(!primary.length)return[];
 const indexed=units.map(u=>({u,counts:occurrences(tokens(u.text)),length:Math.max(1,wordCount(u.text))}));
 const number=indexed.length;if(!number)return[];
 const avgLength=indexed.reduce((s,x)=>s+x.length,0)/number;
 const df=new Map([...weights.keys()].map(t=>[t,indexed.reduce((sum,x)=>sum+Number(x.counts.has(t)),0)]));
 const phrase=norm(query);
 const scored=[];
 for(const x of indexed){
  let bm25=0,primaryHits=0;
  for(const [term,weight] of weights){
   const tf=x.counts.get(term)||0;if(!tf)continue;
   if(primary.includes(term))primaryHits++;
   const idf=Math.log(1+(number-(df.get(term)||0)+.5)/((df.get(term)||0)+.5));
   bm25+=weight*idf*(tf*2.2)/(tf+1.2*(.25+.75*x.length/avgLength));
  }
  if(!primaryHits)continue; // Never return purely synonym-generated hits.
  if(primary.length>1&&primaryHits===1)bm25*=.5;
  if(phrase.length>=7&&norm(x.u.text).includes(phrase))bm25+=3;
  if(bm25>0)scored.push({...x.u,score:+bm25.toFixed(5),matchedPrimary:primaryHits,
    method:mode==="conceptual"?"bm25_multilingual_expansion":"bm25_ocr_text",
    url:pageURL(x.u)});
 }
 return scored.sort((a,b)=>b.score-a.score||a.page-b.page||a.block-b.block).slice(0,Math.min(100,Math.max(1,limit)));
}
async function search(query,options={}){
 const ids=options.edition&&options.edition!=="all"?[options.edition]:Object.keys(SOURCES);
 const mode=options.mode==="conceptual"?"conceptual":"literal";
 const settled=await Promise.allSettled(ids.map(load));
 const sourceStatus={},all=[];
 settled.forEach((r,i)=>{
  const id=ids[i];
  if(r.status==="fulfilled"){
   sourceStatus[id]={status:"loaded",pages:r.value.sourcePages,units:r.value.units.length,
    invalidPages:r.value.invalidPages};
   all.push(...r.value.units);
  }else sourceStatus[id]={status:"unavailable",message:String(r.reason?.message||r.reason)};
 });
 return {query:String(query||""),mode,results:rankRows(all,query,mode,options.limit||50),
  sources:sourceStatus,unitsSearched:all.length,complete:ids.every(id=>sourceStatus[id].status==="loaded"),
  warning:"Coincidencia algorítmica de unidades OCR. No es una colación filológica; modo conceptual = BM25 y equivalencias controladas, no IA neuronal. Los números son páginas digitales, no folios."};
}
window.VitruviaHistoricalParagraphs={SOURCES,norm,tokens,segmentPage,paragraphIndex,queryWeights,rankRows,search,pageURL,
 version:"2026-11-11-ocr-paragraphs-v1"};
})();