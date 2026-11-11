/* Optional tools keep their existing UI. Text search owns the initial load. */
(()=>{
 'use strict';
 const config=document.getElementById('vitruvia-feature-manifest');
 if(!config)return;
 const groups=JSON.parse(config.textContent),pending=new Map();
 function load(group){
  if(pending.has(group))return pending.get(group);
  const task=(async()=>{
   for(const src of groups[group]||[])await new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.async=false;
    script.onload=resolve;script.onerror=()=>reject(Error('No se pudo cargar '+src));
    document.body.append(script);
   });
  })().catch(error=>{pending.delete(group);throw error});
  pending.set(group,task);return task;
 }
 window.VitruviaFeatures={load};
 // Photos and image APIs are never started by an ordinary text search.
 document.addEventListener('click',async event=>{
  const button=event.target.closest?.('#search-images-button');
  if(!button||pending.has('images'))return;
  event.preventDefault();event.stopImmediatePropagation();
  button.setAttribute('aria-busy','true');
  try{await load('images');button.click()}
  catch{document.getElementById('result-state').textContent='No se pudieron cargar las imágenes. Vuelva a pulsar Imágenes.'}
  finally{button.removeAttribute('aria-busy')}
 },true);
 // Reader controls do not compete with the first result or start remote searches.
 let readerScheduled=false;
 window.addEventListener('vitruvia:results',event=>{
  if(readerScheduled||!event.detail?.rows?.length)return;
  readerScheduled=true;
  setTimeout(()=>void load('reader').catch(()=>{}),1000);
 });
 const readerOnIdle=()=>{if(!readerScheduled){readerScheduled=true;void load('reader').catch(()=>{})}};
 if(!new URLSearchParams(location.search).get('q')){
  if(window.requestIdleCallback)requestIdleCallback(readerOnIdle,{timeout:2500});
  else setTimeout(readerOnIdle,1200);
 }
})();
