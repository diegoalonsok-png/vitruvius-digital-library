/* Bibliotheca: zero-fulltext overview before any corpus-wide download.
 * A stem index suggests candidate editions; it never certifies a quotation,
 * word form, locus, manuscript reading or textual collation.
 * Works without postings are outside this preview, not automatically negative.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.BibliothecaFastIndex=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 "use strict";
 const stop=new Set("de del la las los el en al y o un una et in ad ex ab de per the a an and of to by for from le du des les der die das und que por para con".split(" "));
 const tokens=query=>{
  const words=String(query||"").normalize("NFC").toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu)||[];
  const meaningful=words.filter(x=>x.length>=3&&!stop.has(x));
  return [...new Set((meaningful.length?meaningful:words.filter(x=>x.length>=2)).slice(0,6))];
 };
 const key=work=>work.i!=null?String(work.i):work.id+"|"+work.lang+"|"+work.file;
 async function candidates(index,query,{allowedWorks=null}={}){
  if(!index||typeof index.lookup!=="function")throw Error("Índice invertido no disponible");
  const ts=tokens(query);if(!ts.length)return {query,terms:[],rows:[],total:0};
  // Only small inverted shards are loaded; not a single full-book JSON.
  const [manifest,...results]=await Promise.all([
   index.manifest(),...ts.map(word=>index.lookup(word,{translations:true}))
  ]);
  const sets=results.map(r=>new Map((r?.hits||[]).map(h=>[key(h.work),h])));
  const allowed=allowedWorks==null?null:new Set(allowedWorks);
  let rows=[];
  for(const hit of sets[0]?.values()||[]){
   const work=hit.work;
   if(allowed&&!allowed.has(work.id))continue;
   const k=key(work),others=sets.slice(1).map(s=>s.get(k));
   if(others.some(x=>!x))continue;
   const matched=[hit,...others];
   rows.push({
    workId:work.id,language:work.lang,title:work.title||work.id,
    reader:work.reader||"",sourceFile:work.file||"",attribution:work.attribution||"",
    // A stem-frequency count is NOT a count of an exact multiword phrase.
    frequency:Math.min(...matched.map(x=>x.count)),
    per10k:ts.length===1?hit.per10k:null,
    terms:ts.length,passageCandidates:hit.passages?.length||0,
    truncated:matched.some(x=>x.truncated),isPhrase:ts.length>1
   });
  }
  rows.sort((a,b)=>b.frequency-a.frequency||
   a.title.localeCompare(b.title,"es")||a.language.localeCompare(b.language));
  return {query,terms:ts,rows,total:rows.length,generated:manifest?.generated||"",
   indexedVersions:manifest?.works||null,source:"data/index/classics/manifest.json",
   exactPhraseVerified:false};
 }
 return {tokens,candidates};
});