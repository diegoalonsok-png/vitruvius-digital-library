/* Caché académico selectivo: registros bibliográficos, no PDFs ni folios.
 * IndexedDB es opcional: fallo, cuota o navegación privada => fetch convencional.
 * La versión proviene del registro publicado, no de un contador supuesto.
 */
(()=>{'use strict';
if(window.VitruviaIndexCache)return;
const DB='VitruviaDB', STORE='catalogo', META='meta', VERSION=1;
const MANIFEST='data/vitruvia-index-manifest.json';
const ALLOWED=new Set(['data/classics-corpus/search-registry.json']);
let dbPromise=null, manifestPromise=null;
function openDB(){
 if(!('indexedDB' in window))return Promise.resolve(null);
 if(!dbPromise)dbPromise=new Promise(resolve=>{
  let request;try{request=indexedDB.open(DB,VERSION)}catch{resolve(null);return}
  request.onupgradeneeded=()=>{
   const db=request.result;
   if(!db.objectStoreNames.contains(META))db.createObjectStore(META);
   if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});
  };
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>db.close();resolve(db)};
  request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);
 });
 return dbPromise;
}
async function get(key){
 const db=await openDB();if(!db)return null;
 return new Promise(resolve=>{try{
  const r=db.transaction(STORE,'readonly').objectStore(STORE).get(key);
  r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>resolve(null);
 }catch{resolve(null)}});
}
async function put(key,value,version){
 const db=await openDB();if(!db)return false;
 return new Promise(resolve=>{try{
  const tx=db.transaction([STORE,META],'readwrite');
  tx.objectStore(STORE).put({id:key,value,version,updated:Date.now()});
  tx.objectStore(META).put(version,key);
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);
 }catch{resolve(false)}});
}
async function manifest(){
 if(!manifestPromise)manifestPromise=fetch(MANIFEST,{cache:'no-cache'})
  .then(r=>{if(!r.ok)throw Error('manifest unavailable');return r.json()})
  .then(j=>j?.schema==='vitruvia-index-manifest-v1'?j:null).catch(()=>null);
 return manifestPromise;
}
async function network(path,version){
 const response=await fetch(path,{cache:'no-cache'});
 if(!response.ok)throw Error('HTTP '+response.status);
 const data=await response.json();
 if(!Array.isArray(data?.entries)||data.schema!=='vitruvia-classics-search-registry-v1'||data.entries.length!==data.count)
  throw Error('Registro académico no validado');
 await put(path,data,version||String(data.updated||'unknown'));
 return data;
}
const refreshing=new Map();
function refresh(path,version){
 if(!refreshing.has(path)){
  const p=network(path,version).then(value=>{
   window.dispatchEvent(new CustomEvent('vitruvia:index-updated',{detail:{path,version}}));
   return value;
  }).finally(()=>refreshing.delete(path));
  refreshing.set(path,p);
 }
 return refreshing.get(path);
}
async function json(path){
 if(!ALLOWED.has(path))throw Error('Índice no autorizado');
 const saved=await get(path);
 if(saved?.value){
  // No bloquea la búsqueda: contraste de versión sólo una vez por sesión.
  void manifest().then(m=>{
   const remote=m?.indexes?.[path]?.version;
   if(remote&&remote!==saved.version)void refresh(path,remote).catch(()=>{});
  });
  return saved.value;
 }
 const m=await manifest(), v=m?.indexes?.[path]?.version;
 return refresh(path,v);
}
async function clear(){
 const db=await openDB();if(!db)return false;
 return new Promise(resolve=>{try{
  const tx=db.transaction([STORE,META],'readwrite');
  tx.objectStore(STORE).clear();tx.objectStore(META).clear();
  tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);
 }catch{resolve(false)}});
}
window.VitruviaIndexCache={json,manifest,clear};
})();