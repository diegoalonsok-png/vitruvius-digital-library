/* Optional tools keep their existing UI. Text search owns the initial load. */
(()=>{
 'use strict';
 const config=document.getElementById('vitruvia-feature-manifest');
 if(!config)return;
 const groups=JSON.parse(config.textContent),pending=new Map(),scripts=new Map();
 function load(group){
  if(pending.has(group))return pending.get(group);
  // Fetch in parallel; async=false preserves dependency execution order.
  const task=Promise.allSettled((groups[group]||[]).map(src=>{
   if(!scripts.has(src))scripts.set(src,new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=src;script.async=false;
    script.onload=resolve;script.onerror=()=>{scripts.delete(src);reject(Error('No se pudo cargar '+src))};
    document.body.append(script);
   }));
   return scripts.get(src);
  })).then(results=>{
   const failed=results.filter(r=>r.status==='rejected');
   if(failed.length)pending.delete(group);
   if(results.length&&failed.length===results.length)throw failed[0].reason;
  });
  pending.set(group,task);return task;
 }
 window.VitruviaFeatures={load};
 // Text and visual discovery share the current query. Images remain independent
 // of the first textual result and never scroll the reader automatically.
 document.addEventListener('click',async event=>{
  const button=event.target.closest?.('#search-images-button');
  if(!button||pending.has('images'))return;
  event.preventDefault();event.stopImmediatePropagation();
  button.setAttribute('aria-busy','true');
  try{await load('images');button.click()}
  catch{document.getElementById('result-state').textContent='No se pudieron cargar las imágenes. Vuelva a pulsar Imágenes.'}
  finally{button.removeAttribute('aria-busy')}
 },true);
 // A textual request should not fetch the entire image feature bundle or
 // start Commons image APIs merely because some results have arrived.
 // Explicit visual requests and the dedicated image button still work.
 function textOnlyQuery(query){
  const raw=String(query||'').trim();
  const q=raw.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  if(!q)return false;
  const visual=/\b(?:imagen(?:es)?|foto(?:s|grafias?)?|retrato(?:s)?|busto(?:s)?|escultura(?:s)?|pintura(?:s)?|cuadro(?:s)?|ilustracion(?:es)?|dibujo(?:s)?|plano(?:s)?|lamina(?:s)?|mapa(?:s)?|image(?:s)?|photo(?:s)?|portrait(?:s)?|painting(?:s)?|drawing(?:s)?|picture(?:s)?|sculpture(?:s)?|diagram(?:s)?|facsimil(?:es)?|folio(?:s)?\s+(?:imagen|fotografia))\b/;
  if(visual.test(q))return false;
  if(/^(?:[ivx]+|10|[1-9])[.,]\d+(?:[.,]\d+)?$/.test(q))return true;
  if(/\b(?:locus|loci|caput|capitulo|chapter|liber|libro|book|prefacio|praefatio|concordancia|concordance|kwic|lexicon|lexico|lema|lemma|etimologia|etymology|traduccion|translation|texto|textus|text|pasaje|passage|versiculo|verse|cita textual|exact phrase|frase exacta|aparato critico|apparatus|lectio|variante textual|manuscript transcription|transcripcion)\b/.test(q))return true;
  // A single Greek or Latin word may denote a person or artwork. Defer to
  // textual intent, rather than guessing language from characters alone.
  return false;
 }
 window.VitruviaSearchPreferences={textOnlyQuery};
 window.addEventListener('vitruvia:results',event=>{
  if(!event.detail?.query||!event.detail?.rows?.length)return;
  if(textOnlyQuery(event.detail.query))return;
  void load('images').catch(()=>{});
 });
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
