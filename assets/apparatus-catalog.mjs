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
     locusCertified:e.source==='nota'?e.locusLink==='locus explícito':!!e.locusInHeading,pageLoci:e.loci||[],
     label:e.label||'',locusLink:e.locusLink||''});}
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
 const cuenta={};for(const e of visible){const t=TIPO[e.type]?e.type:'otro';cuenta[t]=(cuenta[t]||0)+1}
 const qtxt=q('apparatus-catalog-query').value.trim();
 q('apparatus-catalog-status').textContent=(qtxt?'«'+qtxt+'»: ':'')+visible.length.toLocaleString('es-AR')+(visible.length===1?' registro':' registros')+
  (visible.length?' · '+Object.entries(cuenta).sort((a,b)=>b[1]-a[1]).map(([t,n])=>n+' '+(TIPO[t]||TIPO.otro)[n===1?0:1]).join(' · '):
   '. Pruebe la raíz sin terminación o quite filtros.');
 renderNext();
}
/* Qué es cada registro, dicho una vez y en llano. */
const TIPO={
 nota:['nota del aparato','notas del aparato','Nota al pie de la edición (DOCX); su locus puede ser explícito o sólo candidato.'],
 glosa:['glosa explicativa','glosas explicativas','Comentario lematizado del autor: lema ] explicación.'],
 glosario:['entrada del glosario','entradas del glosario','Definición del glosario de términos de la edición.'],
 comparativa:['aparato comparativo','aparatos comparativos','Cómo resuelven el pasaje las ediciones modernas frente a la del autor.'],
 filologica:['nota filológica','notas filológicas','Crítica textual: lecturas, testimonios y decisiones sobre el texto latino.'],
 comentario:['comentario','comentarios','Comentario editorial del pasaje: sentido, contexto y fuentes.'],
 tecnica:['nota técnica','notas técnicas','Terminología y procedimientos técnicos del pasaje.'],
 otro:['registro','registros','']};
const R=['','I','II','III','IV','V','VI','VII','VIII','IX','X'];
const vitr=l=>{const m=/^(\d+)\.(.*)$/.exec(l||'');return m?'Vitr. '+(R[+m[1]]||m[1])+'.'+m[2]:''};
const LENG={'recensio-es':'castellano','recensio-fr':'francés','theory-en':'inglés'};
function renderNext(){
 const area=q('apparatus-catalog-results'),term=q('apparatus-catalog-query').value;
 const rows=visible.slice(shown,shown+20);
 for(const e of rows){
  const t=TIPO[e.type]?e.type:'otro',info=TIPO[t];
  const article=document.createElement('article');article.className='critical-result ac-ficha';
  const readLocus=e.locusMention&&/^\d+\.(?:praef\.)?\d+(?:\.\d+)?$/.test(e.locusMention)?e.locusMention:(e.pageLoci||[])[0];
  const anclaje=e.source==='nota'?(e.locusCertified?'locus explícito en la nota':e.locusMention?'locus candidato, sin cotejar':'sin locus')
   :e.source==='glosa'?(e.locusLink||'locus por el lema'):(e.locusCertified?'locus en el rótulo':'locus por contexto de página');
  // Glosas: el texto ya trae «lema] explicación»; se separa para no repetir el lema.
  let cuerpo;
  const m=e.source==='glosa'?/^(.*?)\]\s*([\s\S]*)$/.exec(e.text||''):null;
  if(m)cuerpo='<p class="ac-ap"><i>'+excerpt(m[1],term)+'</i> <span class="ac-cor">]</span> '+excerpt(m[2],term)+'</p>';
  else cuerpo='<p>'+excerpt(e.text,term)+'</p>';
  const pagina=e.page?'<a href="'+esc(pdfURL(e,e.page))+'" target="_blank" rel="noopener noreferrer">'+esc(String(e.editionName).split(' ')[0])+' p. '+e.page+' ↗</a>':esc(e.source==='nota'?'nota '+String(e.title).replace('Nota ',''):'');
  article.innerHTML='<header class="ac-cab"><span class="ac-chip ac-'+t+'">'+esc(info[0])+'</span>'+
   (readLocus?'<strong class="ac-locus">'+esc(vitr(readLocus))+'</strong>':'')+
   '<span class="ac-que">'+esc(info[2])+'</span></header>'+cuerpo+
   '<p class="ac-meta">'+esc(e.editionName)+(LENG[e.edition]?' · '+LENG[e.edition]:'')+' · '+esc(anclaje)+' · '+pagina+'</p>'+
   '<div class="actions">'+(readLocus?'<a href="lector-bilingue.html?edition='+esc(e.edition)+'&amp;locus='+esc(encodeURIComponent(readLocus))+'">Leer el pasaje →</a> '+
     '<a href="registro-ecdotico.html?locus='+esc(encodeURIComponent(readLocus))+'">Todo el aparato de este locus →</a>':'')+'</div>';
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
