/* Service worker de Vitruvius Digital Library (PWA).
   - Páginas HTML: red primero; sin conexión, copia guardada u offline.html.
   - Datos JSON: red primero con copia de respaldo (los datos se actualizan sin quedar obsoletos).
   - JS/CSS versionados (?v=): caché primero. Imágenes y PDF: caché primero con límite.
   - Recursos de otros dominios: no se interceptan. */
const VERSION="vdl-20261105-pwa-v1";
const SHELL="shell-"+VERSION,PAGES="pages-"+VERSION,DATA="data-"+VERSION,STATIC="static-"+VERSION,MEDIA="media-"+VERSION;
const CORE=["./","index.html","offline.html","vitruvia.html","lector-bilingue.html","bibliotheca-graeca-latina.html","classics-text-reader.html","termino.html",
 "manifest.webmanifest","assets/favicon.svg","assets/app-icons/icon-192.png","assets/app-icons/icon-512.png","assets/pwa.js"];
const MEDIA_LIMIT=400;
self.addEventListener("install",e=>{e.waitUntil(caches.open(SHELL).then(c=>Promise.allSettled(CORE.map(u=>c.add(new Request(u,{cache:"reload"}))))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{
 const keep=new Set([SHELL,PAGES,DATA,STATIC,MEDIA]);
 for(const k of await caches.keys())if(!keep.has(k))await caches.delete(k);
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
self.addEventListener("fetch",e=>{
 const req=e.request;if(req.method!=="GET")return;
 const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 if(req.headers.has("range"))return; // lectura parcial de PDF: la gestiona el navegador
 if(req.mode==="navigate"||req.destination==="document"){e.respondWith(networkFirst(req,PAGES,"offline.html"));return}
 const p=url.pathname;
 if(/\.json$/i.test(p)){e.respondWith(networkFirst(req,DATA));return}
 if(/\.(?:js|mjs|css|svg|woff2?)$/i.test(p)){e.respondWith(url.search?cacheFirst(req,STATIC):networkFirst(req,STATIC));return}
 if(/\.(?:png|jpe?g|webp|gif|pdf)$/i.test(p)){e.respondWith(cacheFirst(req,MEDIA,MEDIA_LIMIT));return}
});
self.addEventListener("message",e=>{if(e.data==="skipWaiting")self.skipWaiting()});
