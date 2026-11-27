/* A verified R2 replica is storage, not a new edition. Keep canonical paths,
 * registry identifiers and lexical postings unchanged. Fail closed to GitHub
 * when the certificate, identity, hash, index count or CORS is unavailable.
 * The R2-only repository guard protects the original certified source files. */
const BASE="https://libros.vitruvius-digital-library.org/";
const RX=/^data\/classics-corpus\/([a-z0-9-]+-(?:grc|la|en|es|fr|it|de|pt)\.json)$/;
let certificateTask;
const pending=new Map();
async function json(path){
 const r=await fetch(path,{cache:"no-cache",headers:{Accept:"application/json"}});
 if(!r.ok)throw Error("HTTP "+r.status);
 return r.json();
}
async function certificates(){
 if(!certificateTask)certificateTask=Promise.all([
  json("data/r2/classics-local-r2-sync.json"),
  json("data/index/classics/manifest.json")
 ]).then(([report,index])=>{
  const result=new Map(),duplicates=new Set();
  if(report.schema!=="vdl-classics-local-r2-verified-v1"||report.publicBase!==BASE+"corpus/"||!Array.isArray(report.objects)||!Array.isArray(index.index))return result;
  const indexed=new Map();
  for(const row of index.index){
   if(indexed.has(row.file))indexed.set(row.file,null);
   else indexed.set(row.file,row);
  }
  for(const c of report.objects){
   if(!/^corpus\/[a-z0-9-]+\.json$/.test(c.key)||!["uploaded-and-verified","already-matching"].includes(c.status)||!/^[a-f0-9]{64}$/.test(c.sha256)||!Number.isInteger(c.passages)||c.passages<1||!Number.isInteger(c.bytes)||c.bytes<1)continue;
   const path="data/classics-corpus/"+c.key.slice(7), row=indexed.get(path);
   if(!RX.test(path)||!row||row.id!==c.workId||row.lang!==c.language||row.passages!==c.passages||!(row.tokens>0))continue;
   if(result.has(path))duplicates.add(path);
   result.set(path,c);
  }
  for(const path of duplicates)result.delete(path);
  return result;
 }).catch(()=>new Map());
 return certificateTask;
}
export async function loadCertifiedMirror(path,expected={}){
 if(!RX.test(path)||!globalThis.crypto?.subtle)return null;
 const c=(await certificates()).get(path);
 if(!c||(expected.workId&&expected.workId!==c.workId)||(expected.language&&expected.language!==c.language))return null;
 if(!pending.has(path)){
  const task=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
   try{
    const response=await fetch(BASE+c.key,{signal:controller.signal,headers:{Accept:"application/json"}});
    if(!response.ok)throw Error("R2 HTTP "+response.status);
    const raw=await response.arrayBuffer();
    if(raw.byteLength!==c.bytes)throw Error("R2 size mismatch");
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",raw)),x=>x.toString(16).padStart(2,"0")).join("");
    if(hash!==c.sha256)throw Error("R2 SHA-256 mismatch");
    const value=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw));
    if(value.workId!==c.workId||value.language!==c.language||!Array.isArray(value.passages)||value.passages.length!==c.passages||!value.passages.every(p=>typeof p.text==="string"&&p.text.trim()&&p.locus))throw Error("R2 passage identity mismatch");
    return value;
   }catch{return null}
   finally{clearTimeout(timer)}
  })();
  pending.set(path,task);
  task.finally(()=>{if(pending.get(path)===task)pending.delete(path)});
 }
 return pending.get(path);
}
