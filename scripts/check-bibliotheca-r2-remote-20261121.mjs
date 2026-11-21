#!/usr/bin/env node
/* Read-only R2 object liveness probe for the separately indexed classical corpus.
 * Does not modify, overwrite, copy, or claim SHA256 verification.
 * A 206/200 JSON prefix proves remote response is structurally plausible, not
 * the completeness or identity of every passage. */
import {readFileSync} from "node:fs";
const m=JSON.parse(readFileSync("data/index/classics-r2/manifest.json","utf8"));
if(!Array.isArray(m.index)||m.index.length!==m.works)throw Error("R2 index manifest inconsistent");
const expected=/^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/[a-zA-Z0-9_.-]+\.json$/;
const jobs=m.index.map((e)=>({id:e.id,lang:e.lang,url:e.file,sha256:e.sha256}));
const outcomes=[];
async function probe(e){
 if(!expected.test(e.url))return {id:e.id,ok:false,why:"invalid/unapproved remote URL"};
 try{
  const response=await fetch(e.url,{method:"GET",headers:{Range:"bytes=0-1023","Accept":"application/json"},signal:AbortSignal.timeout(20000),cache:"no-store"});
  if(response.status!==200&&response.status!==206)return {id:e.id,ok:false,why:"HTTP "+response.status};
  const type=response.headers.get("content-type")||"";
  if(!response.body)return {id:e.id,ok:false,why:"No response body"};
  const reader=response.body.getReader();
  let first=await reader.read();
  await reader.cancel();
  const prefix=new TextDecoder().decode((first.value||new Uint8Array()).slice(0,1024)).trim();
  if(!prefix.startsWith("{")&&!prefix.startsWith("["))return {id:e.id,ok:false,why:"Response not JSON prefix (likely site fallback)"};
  if(/text\/html/i.test(type))return {id:e.id,ok:false,why:"HTML content type"};
  return {id:e.id,ok:true,status:response.status,contentType:type,hasDeclaredSha:/^[a-f0-9]{64}$/i.test(e.sha256||"")};
 }catch(err){return {id:e.id,ok:false,why:String(err.message||err).slice(0,180)};}
}
for(let i=0;i<jobs.length;i+=6){
 const batch=await Promise.all(jobs.slice(i,i+6).map(probe));
 outcomes.push(...batch);
}
const failed=outcomes.filter(x=>!x.ok),passed=outcomes.filter(x=>x.ok);
const result={checked:jobs.length,reachableJsonPrefix:passed.length,failures:failed,declaredShaPresent:passed.filter(x=>x.hasDeclaredSha).length,verifiedFullHashes:0,method:"HTTP 200/206 plus first JSON bytes; no full-file SHA check, no write"};
console.log(JSON.stringify(result,null,2));
if(failed.length)process.exitCode=1;
