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
/* Exact lexical matches. "logos" must not match "astrólogos". */
function lexicalTerms(value){
 return fold(value).match(/[\p{L}\p{N}]+/gu)||[];
}
function containsWholeTerms(value,terms){
 if(!terms.length)return true;
 const words=new Set(lexicalTerms(value));
 return terms.every(t=>words.has(t));
}
function exactPosition(value,term){
 const wanted=fold(term);
 for(const m of String(value||'').matchAll(/[\p{L}\p{M}\p{N}]+/gu)){
  if(fold(m[0])===wanted)return {start:m.index,end:m.index+m[0].length};
 }
 return null;
}

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
  // Índice estático generado por scripts/build-apparatus-index.py (bloques del PDF con su locus + notas DOCX).
  const warnings=[];entries=[];
  try{
   const r=await fetch('data/apparatus-index.json?v=20261105-apparatus-v1');if(!r.ok)throw Error('HTTP '+r.status);
   const d=await r.json();
   for(const e of d.entries){const ed=ED.find(x=>x.id===e.edition)||{name:e.version,pdf:''};
    entries.push({edition:e.edition,editionName:ed.name,pdf:ed.pdf,page:e.page,type:e.source==='nota'?'nota':e.kind,source:e.source,
     title:e.source==='nota'?'Nota '+String(e.id).split('-n').pop():e.label+(e.locusMention?' — '+e.locusMention:''),
     text:e.text,anchor:e.anchor||'',locusMention:e.locusMention||(e.loci||[])[0]||null,
     locusCertified:e.source==='nota'?e.locusLink==='locus explícito':!!e.locusInHeading,pageLoci:e.loci||[]});}
  }catch(err){warnings.push('Índice del aparato: '+err.message)}
  loaded=true;
  const blockCount=entries.filter(e=>e.source==='bloque').length;
  const noteCount=entries.filter(e=>e.source==='nota').length;
  q('apparatus-catalog-totals').textContent=blockCount.toLocaleString('es-AR')+' encabezados o bloques de aparato localizados en páginas PDF; '+noteCount.toLocaleString('es-AR')+' notas del índice DOCX. Son registros de consulta, no variantes manuscritas individualmente certificadas.';
  if(warnings.length){const p=document.createElement('p');p.textContent='Índices no disponibles: '+warnings.join('; ');q('apparatus-catalog-totals').after(p);}
  apply();
 })().catch(e=>{status.textContent='No se pudo cargar el catálogo: '+e.message+'. Inténtelo de nuevo.';promise=null;});
 return promise;
}
function excerpt(text,term){
 const raw=String(text||'').replace(/\s+/g,' ').trim(),query=String(term||'').trim();
 if(!query)return esc(raw.slice(0,580))+(raw.length>580?'…':'');
 // Resaltar únicamente coincidencias literales; las normalizadas siguen siendo localizables.
 const first=lexicalTerms(query)[0];
 const match=first?exactPosition(raw,first):null;
 if(!match)return esc(raw.slice(0,580))+(raw.length>580?'…':'');
 const start=Math.max(0,match.start-130),end=Math.min(raw.length,match.end+430);
 return (start?'… ':'')+esc(raw.slice(start,match.start))+'<mark>'+esc(raw.slice(match.start,match.end))+'</mark>'+esc(raw.slice(match.end,end))+(end<raw.length?'…':'');
}
function apply(){
 if(!loaded)return;
 const term=fold(q('apparatus-catalog-query').value),edition=q('apparatus-catalog-edition').value,type=q('apparatus-catalog-type').value;
 const terms=lexicalTerms(term);
 visible=entries.filter(e=>(!edition||edition===e.edition)&&(!type||type===e.type)&&containsWholeTerms([e.title,e.text,e.anchor,e.locusMention,(e.pageLoci||[]).join(' '),e.editionName].join(' '),terms));
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
  const status=e.source==='nota'
   ?(e.locusCertified?'Nivel A · Nota DOCX con locus explícito (no es variante manuscrita verificada)':e.locusMention?'Nivel B · Nota DOCX con locus candidato, pendiente de cotejo':'Nivel C · Nota DOCX sin locus comprobado')
   :(e.locusCertified?'Bloque editorial con locus en el encabezado; lectura reportada desde PDF':'Bloque extraído de texto PDF; locus no certificado');

  const link=e.page?pdfURL(e,e.page):e.pdf;
  const locus=e.locusMention?' · locus '+e.locusMention+(e.locusCertified?' (en el rótulo)':e.source==='nota'?' (anclaje propuesto)':' (mencionado en el texto)'):'';const readLocus=e.locusMention&&/^\d+\.(?:praef\.)?\d+(?:\.\d+)?$/.test(e.locusMention)?e.locusMention:(e.pageLoci||[])[0];
  article.innerHTML='<p class="meta">'+esc(e.editionName)+' · '+esc(location)+' · '+esc(status)+'</p>'+
   '<h3 style="font-family:var(--serif);font-weight:500">'+esc(e.title)+'</h3>'+
   '<p>'+excerpt(e.text,term)+'</p>'+
   '<p class="source-note">Tipo: '+esc(e.type)+esc(locus)+' · Procedencia: '+esc(e.source==='nota'?'DOCX de la edición del autor':'Texto extraído del PDF editorial')+' · <strong>Collatio autóptica: no acreditada por esta ficha.</strong> Verificar la variante en la fuente primaria antes de citar.</p>'+
   '<div class="actions"><a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">'+(e.page?'Abrir la página '+e.page+' del PDF':'Consultar libro original PDF')+' ↗</a>'+(readLocus?' <a href="lector-bilingue.html?edition='+esc(e.edition)+'&amp;locus='+esc(encodeURIComponent(readLocus))+'">Leer el locus en el lector →</a>':'')+'</div>';
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
{const u=new URLSearchParams(location.search),v=u.get('q')||u.get('locus');if(v){q('apparatus-catalog-query').value=v;load();}}
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(records=>{if(records.some(e=>e.isIntersecting)){observer.disconnect();load();}},{rootMargin:'550px'});
 observer.observe(target);
}else load();
