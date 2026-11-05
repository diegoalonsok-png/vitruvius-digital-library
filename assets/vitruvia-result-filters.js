/* Vitruvia · filtro de resultados por clase de evidencia (fuentes primarias, ediciones críticas,
 * estudios, obras de referencia, instituciones). Solo oculta o muestra tarjetas ya obtenidas. */
(()=>{
 'use strict';
 const list=document.getElementById('result-list');if(!list)return;
 const KINDS=[['all','Todo'],['primary','Fuentes primarias'],['edition','Ediciones críticas'],['study','Estudios'],['reference','Referencia'],['institution','Instituciones']];
 const EN={all:'All',primary:'Primary sources',edition:'Critical editions',study:'Studies',reference:'Reference',institution:'Institutions'};
 const FR={all:'Tout',primary:'Sources primaires',edition:'Éditions critiques',study:'Études',reference:'Référence',institution:'Institutions'};
 const bar=document.createElement('div');bar.className='vitruvia-evidence-filter';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Filtrar resultados por tipo de fuente');bar.hidden=true;
 let current='all';
 const style=document.createElement('style');style.textContent=
  '.vitruvia-evidence-filter{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}.vitruvia-evidence-filter[hidden]{display:none}'+
  '.vitruvia-evidence-filter button{font:500 12px/1.2 Arial,Helvetica,sans-serif;padding:7px 11px;border-radius:999px;border:1px solid #5f5f5f;background:transparent;color:inherit;cursor:pointer}'+
  '.vitruvia-evidence-filter button[aria-pressed=true]{background:#e9e4d8;color:#151515;border-color:#e9e4d8}'+
  '.vitruvia-evidence-filter small{opacity:.7;margin-left:4px}'+
  '#result-list[data-evidence-filter] .result-card{display:none}'+
  KINDS.slice(1).map(([k])=>`#result-list[data-evidence-filter="${k}"] .result-card[data-evidence="${k}"]{display:block}`).join('')+
  '#result-list[data-evidence-filter] .vitruvia-result-group{display:none}';
 document.head.append(style);list.before(bar);
 const lang=()=>(document.documentElement.lang||'es').slice(0,2);
 function paint(){
  const cards=[...list.querySelectorAll('.result-card')];bar.hidden=cards.length<4;
  const count=k=>k==='all'?cards.length:cards.filter(c=>c.dataset.evidence===k).length;
  bar.replaceChildren(...KINDS.filter(([k])=>k==='all'||count(k)).map(([k,label])=>{
   const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(k===current));
   b.textContent=(lang()==='en'?EN[k]:lang()==='fr'?FR[k]:label);const n=document.createElement('small');n.textContent=count(k);b.append(n);
   b.onclick=()=>{current=k;apply();paint()};return b;}));
  if(current!=='all'&&!count(current)){current='all';apply()}
 }
 function apply(){if(current==='all')list.removeAttribute('data-evidence-filter');else list.setAttribute('data-evidence-filter',current)}
 let t=0;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(paint,120)}).observe(list,{childList:true});
 window.addEventListener('vitruvia:search',()=>{current='all';apply()});
})();
