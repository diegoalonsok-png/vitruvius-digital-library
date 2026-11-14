/*
 * Catálogo del aparato de Diego Kurilo.
 * Distingue: (a) bloques localizados en texto de PDF por página;
 * (b) notas DOCX previamente extraídas. Ningún resultado equivale a collatio.
 */
import {reference,interventions} from './apparatus-ecdotics.mjs?v=20261113-1';
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
let editionMetadata=new Map();
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
  const bibliography=fetch('data/catalog.json',{headers:{Accept:'application/json'}}).then(r=>{
   if(!r.ok)throw Error('HTTP '+r.status);return r.json();
  }).then(c=>{
   if(!Array.isArray(c.editions))throw Error('Sin ediciones verificables');
   editionMetadata=new Map(c.editions.filter(e=>ED.some(x=>x.id===e.id)).map(e=>[e.id,e]));
  }).catch(e=>{editionMetadata=new Map();warnings.push('Metadatos editoriales: '+e.message)});
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
  await bibliography;
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
  // This citation belongs to the ACTUAL edition and PDF page of this record.
  const pdfLink=e.page&&e.pdf?new URL(pdfURL(e,e.page),location.href).href:'';
  const ref=reference(e,editionMetadata.get(e.edition),pdfLink);
  // Bibliographic record belongs to the exact edition of the result.
  // Keep ancient author separate from the contemporary editor/translator.
  const editionInfo=editionMetadata.get(e.edition);
  const editionLine=document.createElement('p');
  editionLine.className='ac-meta ac-edition-bibliography';
  const version=editionInfo?.version||e.editionName;
  const credit=editionInfo?.editorial_role||editionInfo?.bibliographic_author||'Responsable editorial por verificar';
  const imprint=[editionInfo?.publication_place,editionInfo?.publisher,editionInfo?.year].filter(Boolean).join(' · ');
  editionLine.append(document.createTextNode(
   'Autor antiguo: Marco Vitruvio Polión · Título / edición: '+ref.editionName+
   ' · '+version+' · '+credit+
   (imprint?' · '+imprint:'')+
   ' · DOI: '+(ref.doi||'no acreditado en esta ficha')+
   ' · ISBN: '+(ref.isbn||'no consignado')+
   ' · '+ref.pageLabel+
   ' · '+ref.grade.display+
   ' · '+(ref.locus.reliable?'sección editorial individualizada':'localizador de capítulo o candidato, sin sección individual comprobada')
  ));
  if(ref.doi){
   editionLine.append(document.createTextNode(' · '));
   const doiLink=document.createElement('a');
   doiLink.href='https://doi.org/'+ref.doi;
   doiLink.target='_blank';doiLink.rel='noopener noreferrer';
   doiLink.textContent='Registro DOI de la edición';
   editionLine.append(doiLink);
  }
  if(editionInfo?.isbn_note){
   const note=document.createElement('small');
   note.textContent=' · Nota registral ISBN: '+editionInfo.isbn_note;
   editionLine.append(note);
  }
  article.append(editionLine);
  const details=document.createElement('details');details.className='ac-scholarly-reference';
  const summary=document.createElement('summary');
  summary.textContent='Ficha ecdótica · procedencia y cita académica';
  details.append(summary);
  const bib=document.createElement('p');bib.className='ac-meta';
  bib.textContent='Cita editorial: '+ref.bib;details.append(bib);
  if(ref.doi){
   const doi=document.createElement('a');doi.href='https://doi.org/'+ref.doi;
   doi.target='_blank';doi.rel='noopener noreferrer';doi.textContent='DOI de la edición: '+ref.doi;
   details.append(doi);
  }
  if(ref.isbnNote){
   const note=document.createElement('p');note.className='ac-meta';
   note.textContent='Control de ISBN: '+ref.isbnNote;details.append(note);
  }
  const evidence=document.createElement('p');evidence.className='ac-meta';
  evidence.textContent='Locus / localizador: '+ref.locus.display+
   (ref.locus.note?' · '+ref.locus.note:'')+
   '. Fuente: '+ref.scope+'; '+ref.grade.display+'; '+ref.pageLabel+'.';
  details.append(evidence);
  const witness=document.createElement('p');witness.className='ac-meta';
  witness.textContent='Estado ecdótico: comentario de la edición, no lectura diplomática, colación directa ni variante manuscrita certificada. Toda atribución de variantes exige sigla, signatura, folio, lecciones y fuente cotejada.';
  details.append(witness);
  const inserts=interventions(e);
  if(inserts.length){
   const head=document.createElement('p');head.className='ac-meta';
   head.textContent='Suplementos editoriales marcados en la fuente:';
   details.append(head);
   const ul=document.createElement('ul');
   for(const item of inserts){
    const li=document.createElement('li');li.textContent=item.marked+' · '+item.text;ul.append(li);
   }
   details.append(ul);
  }
  const copy=document.createElement('button');
  copy.type='button';copy.className='button outline ac-copy-citation';
  copy.textContent='Copiar cita académica';
  copy.addEventListener('click',async()=>{
   const text=ref.citation+(inserts.length?'\nIntervenciones editoriales destacadas: '+
    inserts.map(x=>x.marked).join(', ')+'. Sin testimonio manuscrito atribuido.':'');
   try{await navigator.clipboard.writeText(text);copy.textContent='Cita copiada'}
   catch{window.prompt('Cita académica para copiar:',text)}
  });
  details.append(copy);article.append(details);
  // VI.2 alone is a chapter, not VI.2.1. Never deep-link a chapter
  // label to a section-only viewer and silently show a different passage.
  if(readLocus&&!ref.locus.reliable){
   const passage=article.querySelector('.actions a[href^="lector-bilingue"]');
   if(passage){
    passage.href='lector-bilingue.html?edition='+encodeURIComponent(e.edition);
    passage.textContent='Abrir edición · '+ref.locus.display+' (sección sin determinar)';
   }
  }
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
