/* Service worker de Vitruvius Digital Library (PWA).
   - Páginas HTML: red primero; sin conexión, copia guardada u offline.html.
   - Datos JSON: copia de hasta cinco minutos, con revalidación en segundo plano.
     Los parámetros de versión forman parte de la clave; un índice nuevo no sustituye
     otro de distinta versión. Tras cinco minutos se espera a la red.
   - Datos del Lexicon con huella (?v=): caché primero (inmutables hasta que cambia la huella).
   - JS/CSS versionados (?v=): caché primero. Imágenes y PDF: caché primero con límite.
   - Recursos de otros dominios: no se interceptan. */
const VERSION="vdl-20261107-classics-readers-v1";
const SHELL="shell-"+VERSION,PAGES="pages-"+VERSION,DATA="data-"+VERSION,LEXDATA="lexdata-"+VERSION,STATIC="static-"+VERSION,MEDIA="media-"+VERSION;
const CORE=["./","index.html","offline.html","vitruvia.html","lector-bilingue.html","bibliotheca-graeca-latina.html","classics-text-reader.html","termino.html",
 "manifest.webmanifest","vitruvia.webmanifest","instalar-apps.html","assets/app-icons/vitruvia-192.png","assets/app-icons/vitruvia-512.png","assets/app-icons/vitruvia-apple-touch-icon.png","assets/favicon.svg","assets/app-icons/icon-192.png","assets/app-icons/icon-512.png","assets/pwa.js"];
const MEDIA_LIMIT=400;
self.addEventListener("install",e=>{e.waitUntil(caches.open(SHELL).then(c=>Promise.allSettled(CORE.map(u=>c.add(new Request(u,{cache:"reload"}))))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{
 const keep=new Set([SHELL,PAGES,DATA,LEXDATA,STATIC,MEDIA]);
 for(const k of await caches.keys())if(/^(shell|pages|data|lexdata|static|media)-vdl-/.test(k)&&!keep.has(k))await caches.delete(k);
 await self.clients.claim();
})())});
async function trim(name,max){const c=await caches.open(name);const keys=await c.keys();for(let i=0;i<keys.length-max;i++)await c.delete(keys[i])}
async function networkFirst(req,cacheName,fallback){
 const c=await caches.open(cacheName);
 try{const r=await fetch(req);if(r&&r.ok&&r.type==="basic")c.put(req,r.clone());return r}
 catch(err){const hit=await c.match(req,{ignoreSearch:cacheName===PAGES})||await caches.match(req,{ignoreSearch:cacheName===PAGES});if(hit)return hit;if(fallback)return(await caches.match(fallback))||Response.error();throw err}
}
async function cacheFirst(req,cacheName,limit){
 const hit=await caches.match(req);if(hit)return hit;
 const r=await fetch(req);
 if(r&&r.ok&&r.type==="basic"&&!r.headers.get("content-range")){const c=await caches.open(cacheName);c.put(req,r.clone());if(limit)trim(cacheName,limit)}
 return r;
}
async function updateData(req,cache){
 const response=await fetch(req);
 if(response.ok&&response.type==="basic"){
  const headers=new Headers(response.headers);headers.set("x-vitruvia-cached-at",String(Date.now()));headers.delete("content-encoding");headers.delete("content-length");
  const copy=new Response(response.clone().body,{status:response.status,statusText:response.statusText,headers});
  await cache.put(req,copy);
 }
 return response;
}
async function dataResponse(event){
 const cache=await caches.open(DATA),hit=await cache.match(event.request);
 const age=hit?Date.now()-Number(hit.headers.get("x-vitruvia-cached-at")||0):Infinity;
 if(hit&&age<300000){
  if(age>30000)event.waitUntil(updateData(event.request,cache).catch(()=>{}));
  return hit;
 }
 try{const response=await updateData(event.request,cache);return response.ok?response:hit||response}
 catch(error){if(hit)return hit;throw error}
}
function pageKey(request){const url=new URL(request.url);url.search="";return url.href}
async function updatePage(request,cache){
 const response=await fetch(request);
 if(response.ok&&response.type==="basic"){
  const headers=new Headers(response.headers);headers.set("x-vitruvia-page-at",String(Date.now()));
  headers.delete("content-encoding");headers.delete("content-length");
  await cache.put(pageKey(request),new Response(response.clone().body,{status:response.status,statusText:response.statusText,headers}));
 }
 return response;
}
async function pageResponse(event){
 const cache=await caches.open(PAGES),hit=await cache.match(pageKey(event.request));
 if(new URL(event.request.url).searchParams.get("source")==="install"){
  try{return await updatePage(event.request,cache)}catch{return hit||(await caches.match("offline.html"))||Response.error()}
 }
 // Navigate with network-first semantics: returning a fresh-looking cached
 // document during its former two-minute grace period can keep a fixed
 // search bug visible even after its JavaScript has been updated.
 const refresh=updatePage(event.request,cache);event.waitUntil(refresh.catch(()=>{}));
 if(hit){
  let timer;
  try{return await Promise.race([refresh.then(response=>response.ok?response:hit),new Promise(resolve=>{timer=setTimeout(()=>resolve(hit),1200)})])}
  catch{return hit}finally{clearTimeout(timer)}
 }
 try{const response=await refresh;if(response.ok)return response;return(await caches.match("offline.html"))||response}
 catch{return(await caches.match("offline.html"))||Response.error()}
}
self.addEventListener("fetch",e=>{
 const req=e.request;if(req.method!=="GET")return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 if(req.headers.has("range"))return; // lectura parcial de PDF: la gestiona el navegador
 if(req.mode==="navigate"||req.destination==="document"||/\.html$/i.test(url.pathname)){e.respondWith(pageResponse(e));return}
 const p=url.pathname;
 // Datos del Lexicon con huella de versión (?v=): inmutables, se sirven desde la caché del dispositivo.
 if(/\/data\/lexicon\/[^/]+\.json$/i.test(p)&&url.searchParams.has("v")){e.respondWith(cacheFirst(req,LEXDATA,30));return}
 if(/\.json$/i.test(p)){e.respondWith(dataResponse(e));return}
 if(/\.(?:js|mjs|css|svg|woff2?|webmanifest)$/i.test(p)){e.respondWith(url.search?cacheFirst(req,STATIC):networkFirst(req,STATIC));return}
 if(/\.(?:png|jpe?g|webp|gif|pdf)$/i.test(p)){e.respondWith(cacheFirst(req,MEDIA,MEDIA_LIMIT));return}
});
self.addEventListener("message",e=>{if(e.data==="skipWaiting")self.skipWaiting()});

