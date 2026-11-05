/* Vitruvia · caché local de consultas públicas.
 * Guarda en el navegador (Cache Storage) las respuestas GET de las API abiertas que usa el sitio
 * (Wikipedia, Wikidata, Commons, Open Library, PubChem) y los textos TEI o planos de GitHub
 * (Perseus, Open Greek and Latin, The Latin Library). Una búsqueda repetida responde al instante.
 * No guarda nada en el servidor ni datos personales; si la caché falla, se consulta la red como siempre.
 */
(()=>{
 'use strict';
 if(!('caches' in self)||typeof window.fetch!=='function'||window.VitruviaFetchCache)return;
 const DAY=864e5;
 const RULES=[
  [/^https:\/\/[a-z-]+\.wikipedia\.org\/(w\/api\.php|api\/rest_v1\/)/,DAY],
  [/^https:\/\/(www\.)?wikidata\.org\/w\/api\.php/,DAY],
  [/^https:\/\/commons\.wikimedia\.org\/w\/api\.php/,DAY],
  [/^https:\/\/openlibrary\.org\/search\.json/,DAY],
  [/^https:\/\/pubchem\.ncbi\.nlm\.nih\.gov\/rest\//,7*DAY],
  [/^https:\/\/raw\.githubusercontent\.com\/(PerseusDL|OpenGreekAndLatin|cltk)\//,7*DAY]
 ];
 const NAME='vitruvia-api-v1',STAMP='x-vitruvia-cached',MAX=1500;
 const native=window.fetch.bind(window);
 let store=null;
 const open=()=>store||(store=caches.open(NAME).catch(()=>null));
 async function lookup(url,ttl){
  try{const c=await open();if(!c)return null;const hit=await c.match(url);
   if(hit&&Date.now()-(Number(hit.headers.get(STAMP))||0)<ttl)return hit;}catch{}
  return null;
 }
 async function save(url,res){
  try{const c=await open();if(!c)return;const body=await res.blob();const h=new Headers(res.headers);h.set(STAMP,String(Date.now()));
   await c.put(url,new Response(body,{status:res.status,statusText:res.statusText,headers:h}));}catch{}
 }
 window.fetch=async function(input,init){
  const req=input instanceof Request?input:null;
  const url=req?req.url:String(input);
  const method=String(init?.method||req?.method||'GET').toUpperCase();
  const rule=method==='GET'&&!init?.body&&RULES.find(r=>r[0].test(url));
  if(!rule)return native(input,init);
  const hit=await lookup(url,rule[1]);
  if(hit)return hit;
  const res=await native(input,init);
  if(res.ok&&(res.type==='cors'||res.type==='basic'))save(url,res.clone());
  return res;
 };
 // Limpieza ocasional: si hay demasiadas entradas, se borran las más antiguas.
 const tidy=async()=>{try{const c=await open();if(!c)return;const keys=await c.keys();if(keys.length>MAX)await Promise.all(keys.slice(0,keys.length-MAX+300).map(k=>c.delete(k)))}catch{}};
 if(window.requestIdleCallback)window.requestIdleCallback(()=>tidy(),{timeout:8000});else setTimeout(tidy,4000);
 window.VitruviaFetchCache={name:NAME,clear:()=>caches.delete(NAME).then(()=>{store=null})};
})();
