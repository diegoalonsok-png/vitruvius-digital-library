/*
 * Catálogo del aparato de Diego Kurilo.
 * Distingue: (a) bloques localizados en texto de PDF por página;
 * (b) notas DOCX previamente extraídas. Ningún resultado equivale a collatio.
 */
const ED=[
 {id:'recensio-es',name:'V514 · Castellano',index:'data/recensio-es-pages.json',pdf:'documents/kurilo-recensio-es.pdf'},
 {id:'recensio-fr',name:'V554 · Français',index:'data/recensio-fr-pages.json',pdf:'documents/kurilo-recensio-fr.pdf'},
 {id:'theory-en',name:'V297 · English',index:'data/theory-en-pages.json',pdf:'documents/kurilo-theory-en.pdf'}
];
const HEAD=/^(?:[ \t]*\d{1,3}[ \t]+)?[ \t]*(APARATO[ \t]+(?:CR[IÍ]TICO|COMPARATIVO|FILOL[OÓ]GICO)|NOTA[ \t]+(?:E[CÉ]D[OÓ]TICA|CR[IÍ]TICA|TEXTUAL|T[EÉ]CNICA|ARQUITECT[OÓ]NICA|COMPARATIVA)|APPARAT[ \t]+(?:CRITIQUE|COMPARATIF|PHILOLOGIQUE)|NOTE[ \t]+(?:E[CÉ]DOTIQUE|CRITIQUE|TEXTUELLE|TECHNIQUE|TERMINOLOGIQUE|COMPARATIVE)|CRITICAL[ \t]+(?:APPARATUS|NOTES?)|TEXTUAL[ \t]+NOTES?|COMPARATIVE[ \t]+NOTES?|PHILOLOGICAL[ \t]+NOTES?)\b/gimu;
const q=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
const pdfURL=(e,n)=>e.pdf+'#page='+n;
let entries=[],visible=[],shown=0,loaded=false,promise=null;
function category(label){
 const v=fold(label);
 if(/tecnica|technique|technical|arquitectonica|terminologique|terminologica/.test(v))return 'tecnica';
 if(/comparativ/.test(v))return 'comparativa';
 if(/ecdot|textual|filolog|philolog|crit/.test(v))return 'filologica';
 return 'comentario';
}
function extract(ed,pages){
 const found=[];
 for(const page of pages){
  if(!Number.isInteger(Number(page.page))||typeof page.text!=='string')continue;
  const text=page.text;
  const matches=[...text.matchAll(HEAD)];
  for(let i=0;i<matches.length;i++){
   const m=matches[i],begin=m.index,end=i+1<matches.length?matches[i+1].index:text.length;
   // Conservar las grafías originales, incluidos los términos griegos.
   const snippet=text.slice(begin,Math.min(end,begin+3400)).trim();
   if(snippet.length<20)continue;
   const label=snippet.split(/\n/)[0].trim().slice(0,180);
   const ref=snippet.slice(0,250).match(/\b(?:[IVX]{1,4}|\d{1,2})\.(?:praef\.)?\d+(?:[–-]\d+)?\b/i);
   found.push({edition:ed.id,editionName:ed.name,pdf:ed.pdf,page:Number(page.page),type:category(label),source:'bloque',title:label,text:snippet,locusMention:ref?.[0]||null});
  }
 }
 return found;
}
async function load(){
 if(promise)return promise;
 const status=q('apparatus-catalog-status');
 status.textContent='Leyendo el aparato y las notas de las tres ediciones…';
 promise=(async()=>{
  const tasks=await Promise.allSettled([...ED.map(async ed=>{
   const r=await fetch(ed.index);
   if(!r.ok)throw Error(ed.index+' (HTTP '+r.status+')');
   const pages=await r.json();if(!Array.isArray(pages))throw Error('Formato incompatible: '+ed.index);
   return extract(ed,pages);
  }),fetch('data/critical-notes.json').then(async r=>{if(!r.ok)throw Error('Notas: HTTP '+r.status);return (await r.json()).entries;})]);
  const warnings=[];
  entries=[];
  tasks.slice(0,3).forEach((r,i)=>r.status==='fulfilled'?entries.push(...r.value):warnings.push(ED[i].name+': '+r.reason.message));
  const n=tasks[3];
  if(n.status==='fulfilled'){
   entries.push(...n.value.map(note=>({
    edition:note.edition,editionName:ED.find(e=>e.id===note.edition)?.name||note.edition,
    pdf:ED.find(e=>e.id===note.edition)?.pdf||'',page:null,type:'nota',
    source:'nota',title:'Nota '+note.footnote_id,text:String(note.text||''),anchor:note.anchor||'',
    sourceParagraph:note.source_paragraph,locusMention:note.locus||note.candidate_locus||null,
    locusCertified:Boolean(note.locus)
   })));
  }else warnings.push('Notas DOCX: '+n.reason.message);
  loaded=true;
  const blockCount=entries.filter(e=>e.source==='bloque').length;
  const noteCount=entries.filter(e=>e.source==='nota').length;
  q('apparatus-catalog-totals').textContent=blockCount.toLocaleString('es-AR')+' encabezados o bloques de aparato localizados en páginas PDF; '+noteCount.toLocaleString('es-AR')+' notas del índice DOCX. Son registros de consulta, no variantes manuscritas individualmente certificadas.';
  if(warnings.length){const p=document.createElement('p');p.textContent='Índices no disponibles: '+warnings.join('; ');q('apparatus-catalog-totals').after(p);}
  apply();
 })().catch(e=>{status.textContent='No se pudo cargar el catálogo: '+e.message+'. Intentá de nuevo.';promise=null;});
 return promise;
}
function excerpt(text,term){
 const raw=String(text||'').replace(/\s+/g,' ').trim(),query=String(term||'').trim();
 if(!query)return esc(raw.slice(0,580))+(raw.length>580?'…':'');
 // Resaltar únicamente coincidencias literales; las normalizadas siguen siendo localizables.
 const i=raw.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
 const start=i<0?0:Math.max(0,i-130),end=Math.min(raw.length,Math.max(i,0)+Math.max(query.length,1)+430);
 if(i<0)return esc(raw.slice(0,580))+(raw.length>580?'…':'');
 return (start?'… ':'')+esc(raw.slice(start,i))+'<mark>'+esc(raw.slice(i,i+query.length))+'</mark>'+esc(raw.slice(i+query.length,end))+(end<raw.length?'…':'');
}
function apply(){
 if(!loaded)return;
 const term=fold(q('apparatus-catalog-query').value),edition=q('apparatus-catalog-edition').value,type=q('apparatus-catalog-type').value;
 const terms=term.split(' ').filter(Boolean);
 visible=entries.filter(e=>(!edition||edition===e.edition)&&(!type||type===e.type)&&(!terms.length||terms.every(t=>fold([e.title,e.text,e.anchor,e.locusMention,e.editionName].join(' ')).includes(t))));
 // Los bloques críticos del propio libro primero; ordenar por edición y página.
 visible.sort((a,b)=>(a.source==='nota')-(b.source==='nota')||ED.findIndex(e=>e.id===a.edition)-ED.findIndex(e=>e.id===b.edition)||(a.page??0)-(b.page??0));
 shown=0;q('apparatus-catalog-results').replaceChildren();
 q('apparatus-catalog-status').textContent=visible.length.toLocaleString('es-AR')+' registros encontrados. Filtra por edición, tipo o término. Los datos proceden de los libros, no de variantes manuscritas inferidas.';
 renderNext();
}
function renderNext(){
 const area=q('apparatus-catalog-results'),term=q('apparatus-catalog-query').value;
 const rows=visible.slice(shown,shown+20);
 for(const e of rows){
  const article=document.createElement('article');article.className='critical-result';
  const location=e.page?'PDF, página '+e.page:'Nota DOCX '+(e.sourceParagraph===undefined?'':'· párrafo '+e.sourceParagraph);
  const status=e.source==='nota'?'Nota al pie extraída del DOCX':'Encabezado o apartado localizado mediante texto del PDF';
  const link=e.page?pdfURL(e,e.page):e.pdf;
  const locus=e.locusMention?' · referencia mencionada '+e.locusMention+(e.source==='nota'&&!e.locusCertified?' (anclaje propuesto)':''):'';
  article.innerHTML='<p class="meta">'+esc(e.editionName)+' · '+esc(location)+' · '+esc(status)+'</p>'+
   '<h3 style="font-family:var(--serif);font-weight:500">'+esc(e.title)+'</h3>'+
   '<p>'+excerpt(e.text,term)+'</p>'+
   '<p class="source-note">Tipo: '+esc(e.type)+esc(locus)+' · El PDF es el testimonio editorial que debe consultarse antes de citar.</p>'+
   '<div class="actions"><a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">'+(e.page?'Abrir la página '+e.page+' del PDF':'Consultar libro original PDF')+' ↗</a></div>';
  area.append(article);
 }
 shown+=rows.length;
 const more=q('apparatus-catalog-more');more.hidden=shown>=visible.length;
 if(!more.hidden)more.textContent='Mostrar más ('+shown+' de '+visible.length+')';
}
q('apparatus-catalog-query').addEventListener('input',apply);
for(const id of ['apparatus-catalog-edition','apparatus-catalog-type'])q(id).addEventListener('change',apply);
q('apparatus-catalog-more').addEventListener('click',renderNext);
q('apparatus-catalog-load').addEventListener('click',load);
const target=q('apparatus-catalog');
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(records=>{if(records.some(e=>e.isIntersecting)){observer.disconnect();load();}},{rootMargin:'550px'});
 observer.observe(target);
}else load();
