/* Vitruvia · herramientas sobre los resultados obtenidos:
 *  · filtro por clase de evidencia (fuentes primarias, ediciones y traducciones, estudios, referencia, instituciones);
 *  · orden (relevancia, más citados, más recientes, más antiguos);
 *  · exportación de los registros bibliográficos visibles (BibTeX y RIS) para Zotero, Mendeley o LaTeX.
 * Solo reordena, oculta o exporta tarjetas ya obtenidas; no consulta fuentes nuevas.
 */
(()=>{
 'use strict';
 const list=document.getElementById('result-list');if(!list)return;
 // Clave de evidencia (assets/vitruvia-evidence.js) → grupo del filtro.
 const GROUP={witness:'primary',fragment:'primary','edition-text':'primary','external-text':'primary',edition:'edition',translation:'edition',apparatus:'edition',reader:'edition','article-index':'study',bibliography:'study',research:'study',reference:'reference',authority:'institution',museum:'institution',site:'institution'};
 const L={es:{all:'Todo',primary:'Fuentes primarias',edition:'Ediciones y traducciones',study:'Estudios',reference:'Referencia',institution:'Instituciones',sort:'Ordenar',rel:'Relevancia',cited:'Más citados',new:'Más recientes',old:'Más antiguos',exp:'Exportar registros:'},
  en:{all:'All',primary:'Primary sources',edition:'Editions and translations',study:'Studies',reference:'Reference',institution:'Institutions',sort:'Sort',rel:'Relevance',cited:'Most cited',new:'Newest',old:'Oldest',exp:'Export records:'},
  fr:{all:'Tout',primary:'Sources primaires',edition:'Éditions et traductions',study:'Études',reference:'Référence',institution:'Institutions',sort:'Trier',rel:'Pertinence',cited:'Les plus cités',new:'Plus récents',old:'Plus anciens',exp:'Exporter les notices :'}};
 const t=k=>(L[(document.documentElement.lang||'es').slice(0,2)]||L.es)[k];
 const bar=document.createElement('div');bar.className='vitruvia-evidence-filter';bar.setAttribute('role','toolbar');bar.hidden=true;
 const chips=document.createElement('div');chips.className='vef-chips';
 const tools=document.createElement('div');tools.className='vef-tools';
 bar.append(chips,tools);
 let current='all',order='rel';
 const style=document.createElement('style');style.textContent=
  '.vitruvia-evidence-filter{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;margin:0 0 14px}.vitruvia-evidence-filter[hidden]{display:none}'+
  '.vef-chips,.vef-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center}'+
  '.vitruvia-evidence-filter button,.vitruvia-evidence-filter select{font:500 12px/1.2 Arial,Helvetica,sans-serif;padding:7px 11px;border-radius:999px;border:1px solid #5f5f5f;background:transparent;color:inherit;cursor:pointer}'+
  '.vitruvia-evidence-filter select option{color:#111}'+
  '.vitruvia-evidence-filter button[aria-pressed=true]{background:#e9e4d8;color:#151515;border-color:#e9e4d8}'+
  '.vitruvia-evidence-filter small{opacity:.7;margin-left:4px}.vef-tools span{font:12px Arial,Helvetica,sans-serif;opacity:.8}'+
  '#result-list[data-evidence-filter] .result-card:not(.vef-on){display:none}';
 document.head.append(style);list.before(bar);
 const cards=()=>[...list.querySelectorAll('.result-card')];
 const group=c=>GROUP[c.dataset.evidence]||'other';
 function apply(){
  const cs=cards();
  if(current==='all')list.removeAttribute('data-evidence-filter');else{list.setAttribute('data-evidence-filter',current);cs.forEach(c=>c.classList.toggle('vef-on',group(c)===current))}
 }
 function sort(){
  const cs=cards();if(!cs.length)return;
  cs.forEach((c,i)=>{if(c.dataset.rank==null)c.dataset.rank=i});
  const key={rel:c=>+c.dataset.rank,cited:c=>-(+c.dataset.cited||0),new:c=>-(+c.dataset.year||-9999),old:c=>(+c.dataset.year||99999)}[order];
  const sorted=[...cs].sort((a,b)=>key(a)-key(b)||(+a.dataset.rank)-(+b.dataset.rank));
  // Se reordena dentro del mismo contenedor de cada tarjeta, sin mover encabezados ni grupos ajenos.
  const parent=cs[0].parentElement;if(sorted.every(c=>c.parentElement===parent)){observer.disconnect();sorted.forEach(c=>parent.append(c));observe()}
 }
 /* ---------- Exportación ---------- */
 const texEsc=s=>String(s??'').replace(/([{}%&$#_])/g,'\\$1');
 const records=()=>cards().filter(c=>!c.hidden&&getComputedStyle(c).display!=='none').map(c=>c._vitruviaRecord).filter(d=>d&&(d.doi||d.year||d.journal||d.publisher)&&/article|book|openlibrary|edition|study/i.test(d.type||''));
 function bib(rs){return rs.map((d,i)=>{const typ=/book|openlibrary|edition/.test(d.type)?'book':'article';const first=String(d.author||'').split(/\s*,\s*/)[0].trim().split(/\s+/).pop()||String(d.title||'ref').split(/\s+/)[0];const key=(first.normalize('NFD').replace(/[^A-Za-z]/g,'')||'ref')+(d.year||'')+'_'+(i+1);
  const f=[['author',String(d.author||'').replace(/,\s*/g,' and ')],['title',d.title],[typ==='book'?'publisher':'journal',typ==='book'?d.publisher:d.journal],['year',d.year],['volume',d.volume],['number',d.issue],['pages',d.pages],['doi',d.doi],['url',d.link]].filter(x=>x[1]);
  return `@${typ}{${key},\n`+f.map(([k,v])=>`  ${k} = {${texEsc(v)}}`).join(',\n')+'\n}'}).join('\n\n')+'\n'}
 function ris(rs){return rs.map(d=>{const ty=/book|openlibrary|edition/.test(d.type)?'BOOK':'JOUR';const out=[['TY',ty]];for(const a of String(d.author||'').split(/\s*,\s*/).filter(Boolean))out.push(['AU',a]);
  [['TI',d.title],['T2',d.journal],['PB',d.publisher],['PY',d.year],['VL',d.volume],['IS',d.issue],['SP',d.pages],['DO',d.doi],['UR',d.link]].forEach(x=>x[1]&&out.push(x));out.push(['ER','']);return out.map(([k,v])=>`${k}  - ${v}`).join('\r\n')}).join('\r\n\r\n')+'\r\n'}
 function save(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},600)}
 function paint(){
  const cs=cards();bar.hidden=cs.length<4;
  const count=k=>k==='all'?cs.length:cs.filter(c=>group(c)===k).length;
  chips.replaceChildren(...['all','primary','edition','study','reference','institution'].filter(k=>k==='all'||count(k)).map(k=>{
   const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(k===current));b.textContent=t(k);const n=document.createElement('small');n.textContent=count(k);b.append(n);
   b.onclick=()=>{current=k;apply();paint()};return b}));
  if(current!=='all'&&!count(current)){current='all';apply()}
  tools.replaceChildren();
  const sel=document.createElement('select');sel.setAttribute('aria-label',t('sort'));
  for(const k of ['rel','cited','new','old']){const o=document.createElement('option');o.value=k;o.textContent=t('sort')+': '+t(k);o.selected=k===order;sel.append(o)}
  sel.onchange=()=>{order=sel.value;sort()};tools.append(sel);
  const n=records().length;
  if(n){const lab=document.createElement('span');lab.textContent=t('exp')+' '+n;tools.append(lab);
   for(const [fmt,ext,type,fn] of [['BibTeX','bib','application/x-bibtex',bib],['RIS','ris','application/x-research-info-systems',ris]]){const b=document.createElement('button');b.type='button';b.textContent=fmt;b.onclick=()=>save('vitruvia-resultados.'+ext,fn(records()),type);tools.append(b)}}
 }
 let tm=0;const observer=new MutationObserver(()=>{clearTimeout(tm);tm=setTimeout(()=>{paint();apply();if(order!=='rel')sort()},150)});
 const observe=()=>observer.observe(list,{childList:true,subtree:true});observe();
 window.addEventListener('vitruvia:search',()=>{current='all';order='rel';apply()});
})();
