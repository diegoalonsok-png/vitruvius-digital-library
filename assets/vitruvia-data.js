/* Shared, bounded data transport. Source records and editorial versions are never rewritten.
 * Local indexes are parsed once per page; failed loads remain retryable.
 * External results are kept only in memory, expire after two minutes and are cancelled
 * with their owning search. HTTP 429/410 responses are not repeatedly requested.
 */
(()=>{
"use strict";
if(window.VitruviaData)return;
const local=new Map(),remote=new Map(),pending=new Map(),cooldowns=new Map();
const stats={localLoads:0,localHits:0,remoteLoads:0,remoteHits:0,cancelled:0};
const abortError=()=>new DOMException("Search cancelled","AbortError");
const absolute=url=>new URL(url,document.baseURI||location.href);
const localKey=url=>{const u=absolute(url);if(u.origin!==location.origin)throw Error("Local index must be same-origin");return u.href};
function bounded(map,max){while(map.size>max)map.delete(map.keys().next().value)}
function waitFor(promise,signal){
 if(!signal)return promise;
 if(signal.aborted)return Promise.reject(abortError());
 return new Promise((resolve,reject)=>{
  const stop=()=>{cleanup();reject(abortError())},cleanup=()=>signal.removeEventListener("abort",stop);
  signal.addEventListener("abort",stop,{once:true});
  promise.then(value=>{cleanup();resolve(value)},error=>{cleanup();reject(error)});
 });
}
async function request(url,{timeoutMs=10000,signal,external=false}={}){
 const controller=new AbortController();
 const stop=()=>controller.abort();
 if(signal?.aborted)throw abortError();
 signal?.addEventListener("abort",stop,{once:true});
 const timer=setTimeout(stop,timeoutMs);
 try{
  const response=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"}});
  if(!response.ok){
   if(external&&[429,410].includes(response.status)){
    const retry=response.headers?.get("Retry-After"),seconds=Number(retry);
    const delay=retry?(Number.isFinite(seconds)?seconds*1000:Date.parse(retry)-Date.now()):response.status===429?30000:600000;
    const u=absolute(url);cooldowns.set(u.origin+u.pathname,{until:Date.now()+Math.max(1000,Math.min(600000,delay||30000)),status:response.status});
    bounded(cooldowns,64);
   }
   throw Error("HTTP "+response.status+" · "+absolute(url).host);
  }
  const value=await response.json();
  if(value?.error)throw Error(value.error.info||value.error.code||"Source unavailable");
  return value;
 }catch(error){if(signal?.aborted){stats.cancelled++;throw abortError()}throw error}
 finally{clearTimeout(timer);signal?.removeEventListener("abort",stop)}
}
function json(url,{signal,timeoutMs=10000}={}){
 const key=localKey(url);
 if(local.has(key)){stats.localHits++;return waitFor(local.get(key),signal)}
 stats.localLoads++;
 const promise=request(key,{timeoutMs}).catch(error=>{if(local.get(key)===promise)local.delete(key);throw error});
 local.set(key,promise);
 return waitFor(promise,signal);
}
function remoteJSON(url,{signal,timeoutMs=9000,maxAge=120000}={}){
 if(signal?.aborted)return Promise.reject(abortError());
 const u=absolute(url),key=u.href;
 if(u.origin===location.origin)return json(key,{signal,timeoutMs});
 const hit=remote.get(key);
 if(hit&&hit.until>Date.now()){stats.remoteHits++;return Promise.resolve(hit.value)}
 if(hit)remote.delete(key);
 const paused=cooldowns.get(u.origin+u.pathname);
 if(paused&&paused.until>Date.now())return Promise.reject(Error("HTTP "+paused.status+" · "+u.host+" · retry pending"));
 const active=pending.get(key);
 if(active&&active.signal===signal&&!signal?.aborted){stats.remoteHits++;return active.promise}
 stats.remoteLoads++;
 const entry={signal,promise:null};
 entry.promise=request(key,{signal,timeoutMs,external:true}).then(value=>{
  remote.set(key,{value,until:Date.now()+maxAge});bounded(remote,80);return value;
 }).finally(()=>{if(pending.get(key)===entry)pending.delete(key)});
 pending.set(key,entry);
 return entry.promise;
}
function defer(task,{signal,delay=180}={}){
 if(signal?.aborted)return Promise.reject(abortError());
 return new Promise((resolve,reject)=>{
  const stop=()=>{clearTimeout(timer);signal?.removeEventListener("abort",stop);reject(abortError())};
  const timer=setTimeout(()=>{signal?.removeEventListener("abort",stop);if(signal?.aborted){reject(abortError());return}Promise.resolve().then(task).then(resolve,reject)},delay);
  signal?.addEventListener("abort",stop,{once:true});
 });
}
function reconcile(parent,children){
 let cursor=parent.firstChild;
 for(const child of children){if(child===cursor)cursor=cursor.nextSibling;else parent.insertBefore(child,cursor)}
 while(cursor){const next=cursor.nextSibling;parent.removeChild(cursor);cursor=next}
}
window.VitruviaData={json,remoteJSON,defer,reconcile,stats,version:"20261105-performance-1"};
})();
