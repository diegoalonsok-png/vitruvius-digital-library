/* Búsqueda por sentido dentro del lector bilingüe (no es un visor nuevo).
 * Añade el modo «Por sentido · IA» al selector de coincidencia del propio lector,
 * reutiliza el motor existente de Vitruvia (window.VitruviaAI: BM25 + E5 multilingüe
 * en el navegador, con reserva BM25 si el modelo no carga), agrupa los pasajes por
 * libro, subraya los términos de la consulta y permite imprimir el dosier.
 * Solo muestra pasajes de las ediciones indexadas; no genera texto.
 */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const EDITION={es:'V514',fr:'V554',en:'V297'};
const ROMAN=['','I','II','III','IV','V','VI','VII','VIII','IX','X'];
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const STOP=new Set('de del la el los las un una y en por para a al con sobre que se su sus the of and for in on to le les des du et est qui cum ad in et est quod non ut'.split(' '));
const words=q=>[...new Set(norm(q).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2&&!STOP.has(w)))];
const stem=w=>w.length>6?w.slice(0,w.length-2):w.length>4?w.slice(0,w.length-1):w;
const roman=locus=>{const [b,...r]=String(locus).split('.');return (ROMAN[Number(b)]||b)+'.'+r.join('.')};
let engine=null;
function loadEngine(){
 if(window.VitruviaAI)return Promise.resolve(window.VitruviaAI);
 if(engine)return engine;
 engine=new Promise((ok,fail)=>{const s=document.createElement('script');s.src='assets/vitruvia-ai.js?v=20261104-semantic-reader-v1';
  s.onload=()=>window.VitruviaAI?ok(window.VitruviaAI):fail(Error('motor no disponible'));s.onerror=()=>fail(Error('motor no disponible'));document.head.append(s)});
 return engine;
}
// Subrayado sin alterar el texto: compara palabra a palabra por raíz, sin acentos.
function highlight(parent,text,query){
 const keys=words(query).map(stem);
 for(const part of String(text).split(/(\s+)/)){
  const w=norm(part).replace(/[^\p{L}\p{N}]/gu,'');
  if(w&&keys.some(k=>k.length>2&&(w.startsWith(k)||k.startsWith(w)&&w.length>3))){const m=document.createElement('mark');m.textContent=part;parent.append(m)}
  else parent.append(document.createTextNode(part));
 }
}
function openPassage(locus){
 $('locus').value=roman(locus);
 $('form').requestSubmit();
 $('passage-ref')?.scrollIntoView({block:'start',behavior:'smooth'});
}
function printDossier(query,meta){
 const results=$('find-results');
 const w=window.open('','_blank');
 if(!w){window.print();return}
 const doc=w.document;
 doc.title='Dosier · '+query;
 const style=doc.createElement('style');
 style.textContent='body{font:12pt Georgia,serif;color:#1B2A4A;margin:2cm}h1{font-size:18pt;margin:0 0 4pt}p.meta{font:9pt system-ui,sans-serif;color:#555;margin:0 0 14pt}h2{font-size:13pt;border-bottom:1px solid #C9A84C;padding-bottom:3pt;margin:16pt 0 6pt}.hit{margin:0 0 9pt;page-break-inside:avoid}.ref{font-weight:600}.kind{font:8pt system-ui,sans-serif;color:#777}mark{background:#f3e3a6;color:inherit}button{display:none}';
 doc.head.append(style);
 const h=doc.createElement('h1');h.textContent='Vitruvio, De architectura · búsqueda por sentido: «'+query+'»';
 const p=doc.createElement('p');p.className='meta';p.textContent=meta+' · Vitruvius Digital Library · '+new Date().toLocaleDateString('es-ES');
 doc.body.append(h,p);
 for(const node of results.querySelectorAll('[data-semantic-group],[data-semantic-hit]')){
  if(node.dataset.semanticGroup){const g=doc.createElement('h2');g.textContent=node.textContent;doc.body.append(g)}
  else{const d=doc.createElement('div');d.className='hit';d.innerHTML=node.innerHTML;doc.body.append(d)}
 }
 w.setTimeout(()=>{w.focus();w.print()},300);
}
async function semanticSearch(event){
 if($('find-mode')?.value!=='semantic')return;
 event.preventDefault();event.stopImmediatePropagation();
 const query=$('term').value.trim();if(!query)return;
 const status=$('find-status'),out=$('find-results');out.replaceChildren();
 const edition=EDITION[$('lang').value]||'V514',onlyBook=$('find-scope').value==='book'?String($('book').value):'';
 status.textContent='Buscando por sentido en la edición '+edition+'… La primera vez el navegador descarga el modelo multilingüe (~120 MB); si no puede, se usa la búsqueda textual BM25.';
 let res;
 try{res=await (await loadEngine()).search(query)}catch(e){status.textContent='No se pudo iniciar la búsqueda por sentido ('+e.message+'). Usa «Todas las palabras».';return}
 let rows=(res.rows||[]).filter(r=>r.workId==='vitruvius');
 const inEdition=rows.filter(r=>r.edition===edition);
 if(inEdition.length)rows=inEdition;
 if(onlyBook)rows=rows.filter(r=>String(r.locus).split('.')[0]===onlyBook);
 const seen=new Set();rows=rows.filter(r=>!seen.has(r.locus)&&seen.add(r.locus));
 // Sin modelo, reforzar los pasajes que contienen más raíces distintas de la consulta
 // (en latín o en la traducción completa); con modelo se respeta el orden de la IA.
 if(res.mode!=='neural'){
  const keys=words(query).map(stem).filter(k=>k.length>2);
  for(const r of rows){const hay=norm((r.latin||'')+' '+(r.translation||'')+' '+(r.excerpt||''));r.coverage=keys.filter(k=>hay.includes(k)).length;r.rating=r.coverage*1000+(r.rating||0)}
  rows=rows.filter(r=>r.coverage>0||keys.length===0);
 }
 if(!rows.length){status.textContent='No hay pasajes relacionados con «'+query+'» en la selección.';return}
 // Agrupar por libro; los libros se ordenan por su mejor pasaje.
 const groups=new Map();
 for(const r of rows){const b=String(r.locus).split('.')[0];if(!groups.has(b))groups.set(b,[]);groups.get(b).push(r)}
 const ordered=[...groups.entries()].sort((a,b)=>Math.max(...b[1].map(x=>x.rating))-Math.max(...a[1].map(x=>x.rating)));
 const neural=res.mode==='neural';
 const meta=rows.length+' pasajes en '+ordered.length+' libros · '+(neural?'IA semántica (E5 multilingüe) + texto literal':'búsqueda textual BM25 (el modelo de IA no se cargó)')+' · edición '+(inEdition.length?edition:'varias');
 status.textContent=meta+'. Pulsa un pasaje para abrirlo en el lector.';
 const print=document.createElement('button');print.type='button';print.className='button outline semantic-print';print.textContent='Imprimir dosier';
 print.addEventListener('click',()=>printDossier(query,meta));out.append(print);
 for(const [book,items] of ordered){
  const h=document.createElement('h4');h.dataset.semanticGroup=book;
  h.textContent='Libro '+(ROMAN[Number(book)]||book)+' · '+items.length+(items.length===1?' pasaje':' pasajes');out.append(h);
  for(const r of items.sort((a,b)=>b.rating-a.rating)){
   const b=document.createElement('button');b.type='button';b.className='reader-hit';b.dataset.semanticHit=r.locus;
   const ref=document.createElement('span');ref.className='ref';ref.textContent='Vitr., De arch. '+roman(r.locus)+' ';
   const kind=document.createElement('small');kind.className='kind';kind.textContent=r.exactTextMatch?'· frase literal':neural?'· por sentido · verificar el pasaje':'· coincidencia de términos';
   const ex=document.createElement('span');ex.append(document.createTextNode(' — '));highlight(ex,r.excerpt,query);
   b.append(ref,kind,ex);b.addEventListener('click',()=>openPassage(r.locus));out.append(b);
  }
 }
}
function styles(){if(document.getElementById('semantic-passages-style'))return;const st=document.createElement('style');st.id='semantic-passages-style';st.textContent='#find-results [data-semantic-group]{font:600 11px/1.4 system-ui,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#8c6c39;border-bottom:1px solid #C9A84C;padding:18px 0 6px;margin:8px 0 4px}#find-results [data-semantic-hit] mark{background:rgba(201,168,76,.28);color:inherit;padding:0 1px;border-radius:2px}#find-results [data-semantic-hit] .ref{font-weight:600;color:#1B2A4A}html[data-theme=dark] #find-results [data-semantic-hit] .ref{color:#f3ecdf}#find-results [data-semantic-hit] .kind{font:11px system-ui,sans-serif;color:#7a7f86}#find-results .semantic-print{margin:6px 0 4px}';document.head.append(st)}
function install(){
 styles();
 const mode=$('find-mode'),form=$('find-form');if(!mode||!form)return;
 if(![...mode.options].some(o=>o.value==='semantic')){const o=document.createElement('option');o.value='semantic';o.textContent='Por sentido · IA (agrupa pasajes)';mode.append(o)}
 form.addEventListener('submit',semanticSearch,true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
