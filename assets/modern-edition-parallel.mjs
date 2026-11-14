/* Page-synchronised editorial Latin/Spanish/French, with a distinct optional
 * machine translation of the exact OCR leaf. No editorial text is rewritten. */
import {combineEditions,pageReadings,createParallelSearch,parallelTerms,locusLabel,translationPieces} from './modern-edition-parallel-core.mjs';
import {findRanges,parseReference,KEY_TERMS} from './modern-edition-search.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const EDITIONS={'rose-1899':{label:'Rose · 1899',editor:'Valentin Rose',year:'1899'},'krohn-1912':{label:'Krohn · 1912',editor:'Fritz Krohn',year:'1912'}};
const edition=Object.hasOwn(EDITIONS,params.get('edition'))?params.get('edition'):'rose-1899',work=EDITIONS[edition];
document.body.dataset.edition=edition;document.body.classList.add('compared');
$('compare-edition').value=edition;$('parallel-title').textContent='Lectura enfrentada con traducción · '+work.label;
$('facsimile-heading').textContent='01 · Facsímil · '+work.label;
$('stage').setAttribute('aria-label','Página ampliable de '+work.label+'. Teclas más, menos y cero para zoom; flechas izquierda y derecha para cambiar de página.');
$('parallel-image-tools-group').setAttribute('aria-label','Herramientas de lectura de '+work.label);
$('h-gallery-title').textContent='Buscar por imagen · Galería visual de '+work.label;
$('parallel-facsimile-citation').textContent='Facsímil: Vitruvius Pollio, Vitruvii De architectura libri decem. Edición de '+work.editor+'. Leipzig: B. G. Teubner, '+work.year+'.';
$('status').textContent='Cargando las páginas de '+work.label+'…';
$('parallel-query').value=params.get('q')||params.get('locus')||'';
$('parallel-find').open=!!params.get('q');
if(['la','es','fr'].includes(params.get('lang')))$('parallel-language').value=params.get('lang');
if(['edition','ocr','automatic'].includes(params.get('reading')))$('parallel-reading').value=params.get('reading');
if(['concept','phrase','words'].includes(params.get('match')))$('parallel-match').value=params.get('match');
if(['all','la','es','fr'].includes(params.get('scope')))$('parallel-scope').value=params.get('scope');
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const output=$('parallel-text'),viewport=$('parallel-text-viewport'),workspace=$('parallel-workspace'),splitter=$('parallel-splitter');
let rows=[],map=null,searchIndex=null,current={edition,image:0,total:0,text:'',terms:[]},focusLocus=params.get('locus')||'',query='',queryMode='concept',searchHits=[],shown=0;
let sequence=0,automatic=false,lastSelection=null,lastEventKey='',machineKey='',scrollKey='';
const translated=new Map(),translatedPending=new Map();
const defaults={width:52,stacked:false,reversed:false,font:20,bg:'#fffdf8',fg:'#172b3c',mark:'#ffe45a'};
let prefs={...defaults};try{const p=JSON.parse(localStorage.getItem('vdl:modern:parallel-layout')||'{}');for(const k of Object.keys(defaults))if(typeof p[k]===typeof defaults[k])prefs[k]=p[k];}catch{}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function savePrefs(){try{localStorage.setItem('vdl:modern:parallel-layout',JSON.stringify(prefs));}catch{}}
function style(){
 prefs.width=clamp(Number(prefs.width)||52,25,75);prefs.font=clamp(Number(prefs.font)||20,14,38);
 workspace.style.setProperty('--parallel-left',prefs.width+'%');workspace.classList.toggle('stacked',prefs.stacked);workspace.classList.toggle('reversed',prefs.reversed);
 splitter.setAttribute('aria-valuenow',prefs.width);splitter.setAttribute('aria-valuetext',prefs.width+' por ciento para el primer lector');
 $('parallel-layout').textContent=prefs.stacked?'Lectores en columnas':'Apilar lectores';
 for(const [name,key] of [['background','bg'],['foreground','fg'],['mark-color','mark']]){
  if(!/^#[0-9a-f]{6}$/i.test(prefs[key]))prefs[key]=defaults[key];$('text-'+name).value=prefs[key];
 }
 viewport.style.setProperty('--parallel-font',prefs.font+'px');viewport.style.setProperty('--parallel-bg',prefs.bg);viewport.style.setProperty('--parallel-fg',prefs.fg);viewport.style.setProperty('--parallel-mark',prefs.mark);
 window.dispatchEvent(new Event('resize'));savePrefs();
}
style();
$('parallel-layout').onclick=()=>{prefs.stacked=!prefs.stacked;style();};
$('parallel-swap').onclick=()=>{prefs.reversed=!prefs.reversed;style();};
$('parallel-reset').onclick=()=>{prefs={...defaults};style();};
$('text-smaller').onclick=()=>{prefs.font-=2;style();};$('text-larger').onclick=()=>{prefs.font+=2;style();};
for(const [name,key] of [['background','bg'],['foreground','fg'],['mark-color','mark']])$('text-'+name).oninput=()=>{prefs[key]=$('text-'+name).value;style();};
function resize(event){const r=workspace.getBoundingClientRect();prefs.width=Math.round(100*(event.clientX-r.left)/r.width);style();}
splitter.onpointerdown=event=>{if(prefs.stacked||window.innerWidth<900)return;event.preventDefault();workspace.dataset.dragging='true';splitter.setPointerCapture?.(event.pointerId);resize(event);};
splitter.onpointermove=event=>{if(workspace.dataset.dragging==='true')resize(event);};
splitter.onpointerup=splitter.onpointercancel=event=>{workspace.dataset.dragging='false';if(splitter.hasPointerCapture?.(event.pointerId))splitter.releasePointerCapture(event.pointerId);};
splitter.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();prefs.width=event.key==='Home'?25:event.key==='End'?75:prefs.width+(event.key==='ArrowLeft'?-5:5);style();};
$('text-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('text-pane').requestFullscreen();}catch{$('parallel-translation-status').textContent='Este navegador no permite pantalla completa; use A+ para ampliar.';}};
function updateURL(){const u=new URL(location.href);u.searchParams.set('edition',edition);u.searchParams.set('lang',$('parallel-language').value);u.searchParams.set('reading',$('parallel-reading').value);history.replaceState(null,'',u);}
function markText(text,terms){const fragment=document.createDocumentFragment();let at=0;for(const [a,b] of findRanges(text,terms)){fragment.append(document.createTextNode(text.slice(at,a)),make('mark',text.slice(a,b),'parallel-mark'));at=b;}fragment.append(document.createTextNode(text.slice(at)));return fragment;}
function stamp(text){let n=2166136261;for(const ch of text)n=Math.imul(n^ch.codePointAt(0),16777619);return(n>>>0).toString(16);}
function marksKey(){return ['vdl:parallel:marks',edition,current.image,$('parallel-reading').value,$('parallel-language').value].join(':');}
function storedMarks(){try{const x=JSON.parse(localStorage.getItem(marksKey())||'{}');return x.signature===stamp(output.textContent)&&Array.isArray(x.marks)?x.marks:[];}catch{return [];}}
function paintMarks(marks=storedMarks()){
 if(!marks.length)return;const nodes=[],walker=document.createTreeWalker(output,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode()))nodes.push(n);
 let offset=0;for(const text of nodes){const start=offset,end=start+text.textContent.length;offset=end;
  const spans=marks.filter(m=>Number.isInteger(m.start)&&Number.isInteger(m.end)&&m.start<end&&m.end>start).sort((a,b)=>a.start-b.start);if(!spans.length)continue;
  let at=0;const frag=document.createDocumentFragment();for(const m of spans){const a=Math.max(at,m.start-start),b=Math.min(text.textContent.length,m.end-start);if(b<=a)continue;frag.append(document.createTextNode(text.textContent.slice(at,a)));const mark=make('mark',text.textContent.slice(a,b));mark.dataset.userMark='1';mark.style.setProperty('--parallel-mark',/^#[0-9a-f]{6}$/i.test(m.color)?m.color:prefs.mark);frag.append(mark);at=b;}frag.append(document.createTextNode(text.textContent.slice(at)));text.replaceWith(frag);
 }
}
document.addEventListener('selectionchange',()=>{
 const selection=window.getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return;
 const range=selection.getRangeAt(0);if(!output.contains(range.commonAncestorContainer))return;
 const before=range.cloneRange();before.selectNodeContents(output);before.setEnd(range.startContainer,range.startOffset);
 lastSelection={start:before.toString().length,end:before.toString().length+range.toString().length,signature:stamp(output.textContent),text:range.toString()};
});
$('text-mark').onclick=()=>{
 if(!lastSelection||lastSelection.signature!==stamp(output.textContent)||lastSelection.end<=lastSelection.start){$('parallel-translation-status').textContent='Seleccione primero palabras de la lectura para subrayarlas.';return;}
 const marks=[...storedMarks(),{start:lastSelection.start,end:lastSelection.end,color:prefs.mark}];try{localStorage.setItem(marksKey(),JSON.stringify({signature:lastSelection.signature,marks}));}catch{$('parallel-translation-status').textContent='No se pudo guardar el subrayado en este navegador.';}
 render();
};
$('text-clear-marks').onclick=()=>{try{localStorage.removeItem(marksKey());}catch{}lastSelection=null;render();};
function readings(){if(!map||map.sha256_pdf&&current.sha256_pdf&&map.sha256_pdf!==current.sha256_pdf)return [];return pageReadings(map,rows,current.image);}
function sourceText(){return $('parallel-machine-source')?.value==='edition'&&readings().length?readings().map(r=>r.la).join('\n\n'):current.text||'';}
const machineLabel=make('label','Fuente automática '),machineSelect=make('select');machineSelect.id='parallel-machine-source';
for(const [value,label] of [['ocr','OCR de la hoja mostrada'],['edition','Latín de Kurilo · loci completos']]){const o=make('option',label);o.value=value;machineSelect.append(o);}machineLabel.append(machineSelect);$('parallel-reading').closest('.parallel-tools').append(machineLabel);
machineSelect.onchange=()=>{sequence++;machineKey='';render();};
function render(){
 const mode=$('parallel-reading').value,lang=$('parallel-language').value,links=readings();
 $('parallel-page-label').textContent=work.label+' · imagen digital '+(current.image||'—')+(current.total?' / '+current.total:'');
 machineLabel.hidden=mode!=='automatic';$('parallel-stop').hidden=!automatic;
 $('parallel-translate').textContent=automatic?'Traducción automática activada':'Activar traducción automática';$('parallel-translate').disabled=automatic;
 output.replaceChildren();output.removeAttribute('aria-busy');lastSelection=null;
 if(mode==='edition'&&links.length){
  const terms=query?parallelTerms(query,queryMode)[lang]:lang==='la'?current.terms||KEY_TERMS:[];
  output.lang=lang;
  for(const row of links){
   const article=make('article');article.dataset.locus=row.locus;
   if(row.locus===focusLocus)article.classList.add('parallel-current');
   article.append(make('h3','Vitr. '+locusLabel(row.locus)));
   const context=[];if(row.images.length>1)context.push('Locus presente en las imágenes '+row.images.join(' y '));
   if(row.continuation)context.push('Continuación desde la imagen '+row.primaryPage);
   if(row.status==='ambiguous_textual_candidate')context.push('Correspondencia OCR ambigua: cotejar el facsímil');
   if(context.length)article.append(make('p',context.join(' · '),'parallel-context'));
   const p=make('p');p.lang=lang;p.append(markText(row[lang]||'No hay texto de esta lectura para el locus.',terms));article.append(p);output.append(article);
  }
  $('parallel-source-note').textContent=(lang==='la'?'Latín de Diego Kurilo · V514, basado en Krohn':lang==='es'?'Traducción castellana de Diego Kurilo · V514':'Traduction française de Diego Kurilo · V554')+' · '+links.length+' loci completos vinculados a esta hoja. Localización propuesta mediante OCR; se conserva el contexto.';
  $('parallel-translation-status').textContent='Texto de la edición del autor; disponible sin servicio de traducción externa.';
 }else if(mode==='automatic'){
  const source=sourceText();output.lang=lang;
  $('parallel-source-note').textContent=machineSelect.value==='edition'&&links.length?'Fuente: latín de Kurilo, loci editoriales completos relacionados con esta imagen.':'Fuente: OCR íntegro de la imagen digital '+current.image+' del facsímil.';
  if(lang==='la'){
   const p=make('p',source||'El OCR de esta hoja todavía no está disponible.','parallel-ocr');p.lang='la';output.append(p);$('parallel-translation-status').textContent='Latín fuente: no se genera una traducción inversa al latín.';
  }else{
   const key=[edition,current.image,lang,machineSelect.value,stamp(source)].join('|'),cached=translated.get(key);
   if(cached){const p=make('p',cached.text);p.lang=lang;output.append(p);$('parallel-translation-status').textContent=cached.provider+' · Traducción automática no revisada.';}
   else if(automatic&&source){
    const pending=translatedPending.get(key);
    if(pending?.token===sequence){output.setAttribute('aria-busy','true');for(const text of pending.done)output.append(make('p',text));$('parallel-translation-status').textContent='Traduciendo esta hoja…';}
    else runTranslation(source,lang,key);
   }
   else{$('parallel-translation-status').textContent=source?'Pulse «Activar traducción automática» para traducir esta hoja y las siguientes al navegar.':'Esperando el texto OCR de la hoja…';const p=make('p',source||'No hay texto fuente disponible.','parallel-ocr');p.lang='la';output.append(p);}
  }
 }else{
  output.lang='la';const terms=query?parallelTerms(query,queryMode).la:current.terms||KEY_TERMS,p=make('p',undefined,'parallel-ocr');p.lang='la';p.append(markText(current.text||'Esperando el OCR de la hoja…',terms));output.append(p);
  $('parallel-source-note').textContent=mode==='edition'?'Esta hoja no tiene loci editoriales asignados. Se muestra el OCR latino de esta misma imagen; puede activar su traducción automática.':'OCR del mismo PDF histórico: texto automático de esta hoja, con posibles errores de reconocimiento.';
  $('parallel-translation-status').textContent='El OCR conserva el contenido de la hoja, incluidos preliminares y aparato crítico. No es una transcripción diplomática revisada.';
 }
 paintMarks();
 const focus=focusLocus&&output.querySelector('[data-locus="'+focusLocus+'"]'),positionKey=[current.image,focusLocus,mode,lang].join('|');
 if(positionKey!==scrollKey){scrollKey=positionKey;viewport.scrollTop=focus?Math.max(0,focus.offsetTop-output.offsetTop-8):0;}
}
async function runTranslation(source,lang,key){
 const previous=translatedPending.get(key);if(previous?.token===sequence)return previous.promise;
 machineKey=key;const token=++sequence,parts=translationPieces(source);let done=[],provider='';
 const job={token,done};translatedPending.set(key,job);
 output.lang=lang;output.setAttribute('aria-busy','true');output.replaceChildren();
 const task=(async()=>{
  try{
   for(let i=0;i<parts.length;i++){
    if(token!==sequence||!automatic)return;
    $('parallel-translation-status').textContent='Traduciendo imagen '+current.image+' · fragmento '+(i+1)+' de '+parts.length+'…';
    const api=window.VitruviaInlineTranslation?.translate;if(typeof api!=='function')throw Error('Servicio de traducción no disponible');
    const result=await api(parts[i],'la',lang);
    if(token!==sequence||!automatic)return;
    if(result.partial)throw Error('El proveedor entregó un fragmento incompleto');
    done.push(result.text);provider=result.provider;
    const p=make('p',result.text);p.lang=lang;output.append(p);
   }
   if(token!==sequence||!automatic)return;
   translated.set(key,{text:done.join('\n\n'),provider});output.replaceChildren(make('p',done.join('\n\n')));$('parallel-translation-status').textContent=provider+' · Hoja procesada completa · Traducción automática no revisada.';paintMarks();
  }catch(error){if(token!==sequence)return;
   if(!done.length)output.append(make('p',source,'parallel-ocr'));
   $('parallel-translation-status').textContent=(done.length?'Traducción parcial: '+done.length+' de '+parts.length+' fragmentos. ':'No se obtuvo traducción automática. ')+(error?.message||'Servicio no disponible')+'. Puede consultar los textos de Kurilo o el OCR completo.';
  }finally{if(translatedPending.get(key)===job)translatedPending.delete(key);if(token===sequence)output.removeAttribute('aria-busy');}
 })();job.promise=task;return task;
}
$('parallel-translate').onclick=()=>{automatic=true;sequence++;machineKey='';$('parallel-reading').value='automatic';updateURL();render();};
$('parallel-stop').onclick=()=>{automatic=false;sequence++;machineKey='';output.removeAttribute('aria-busy');render();};
for(const name of ['parallel-reading','parallel-language'])$(name).onchange=()=>{sequence++;machineKey='';updateURL();render();};
$('compare-edition').onchange=()=>{const u=new URL(location.href);u.searchParams.set('edition',$('compare-edition').value);u.searchParams.delete('image');if(!focusLocus)u.searchParams.delete('locus');else u.searchParams.set('locus',focusLocus);location.href=u.href;};
document.addEventListener('vdl:edition-text',event=>{
 const d=event.detail;if(d?.edition!==edition||!Number.isInteger(d.image))return;
 const key=[d.image,stamp(d.text||''),(d.terms||[]).join('|')].join(':');
 const changed=d.image!==current.image||d.text!==current.text;current=d;
 if(key===lastEventKey)return;lastEventKey=key;if(changed){sequence++;machineKey='';}render();
});
function openResult(hit){
 focusLocus=hit.locus;const scope=$('parallel-scope').value;if(scope!=='all')$('parallel-language').value=scope;
 $('parallel-reading').value='edition';const u=new URL(location.href);u.searchParams.set('locus',hit.locus);if(query)u.searchParams.set('q',query);u.searchParams.set('lang',$('parallel-language').value);u.searchParams.set('reading','edition');history.replaceState(null,'',u);
 document.dispatchEvent(new CustomEvent('vdl:edition-open',{detail:{edition,image:hit.page,terms:hit.terms?.la||[]}}));
 render();const row=output.querySelector('[data-locus="'+hit.locus+'"]');if(row)viewport.scrollTop=Math.max(0,row.offsetTop-output.offsetTop-8);
 workspace.scrollIntoView({behavior:'smooth',block:'start'});
}
function moreResults(){
 const frag=document.createDocumentFragment();for(const hit of searchHits.slice(shown,shown+15)){
  const article=make('article');article.append(make('h3','Vitr. '+locusLabel(hit.locus)+' · imagen '+hit.page+' · '+({la:'latín',es:'castellano',fr:'français'}[hit.language])));
  const a=Math.max(0,(hit.ranges[0]?.[0]||0)-65),b=Math.min(hit.text.length,a+310),p=make('p');p.lang=hit.language;
  p.append(a?'…':'',markText(hit.text.slice(a,b),hit.terms?.[hit.language]||[]),b<hit.text.length?'…':'');article.append(p);
  const button=make('button','Abrir hoja y lectura');button.type='button';button.onclick=()=>openResult(hit);article.append(button);frag.append(article);
 }
 $('parallel-results').append(frag);shown=Math.min(searchHits.length,shown+15);$('parallel-search-more').hidden=shown>=searchHits.length;
 $('parallel-search-more').textContent='Mostrar más loci ('+shown+' de '+searchHits.length+')';
}
async function runSearch(){
 query=$('parallel-query').value.trim();queryMode=$('parallel-match').value;if(!query)return;
 $('parallel-search-submit').disabled=true;$('parallel-search-status').textContent='Consultando los índices de latín, castellano y francés…';
 try{
  await parallelReady;if(!searchIndex)throw Error('No se pudo preparar el índice de textos');
  searchHits=searchIndex(query,queryMode,$('parallel-scope').value);shown=0;$('parallel-results').replaceChildren();moreResults();
  $('parallel-search-status').textContent=searchHits.length+' loci encontrados · '+(parseReference(query)?'índice de loci y prefacios':queryMode==='concept'?'vocabulario conceptual controlado y formas documentadas':'coincidencias en el texto de las ediciones')+'.';
  const u=new URL(location.href);u.searchParams.set('q',query);u.searchParams.set('match',queryMode);u.searchParams.set('scope',$('parallel-scope').value);history.replaceState(null,'',u);
  const terms=parallelTerms(query,queryMode);document.dispatchEvent(new CustomEvent('vdl:edition-highlight',{detail:{edition,terms:terms.la}}));render();
 }catch(error){$('parallel-search-status').textContent=error.message+'. El facsímil y el OCR permanecen disponibles.';}
 finally{$('parallel-search-submit').disabled=false;}
}
$('parallel-search-form').onsubmit=event=>{event.preventDefault();runSearch();};
$('parallel-search-more').onclick=moreResults;
$('parallel-search-clear').onclick=()=>{query='';focusLocus='';searchHits=[];$('parallel-query').value='';$('parallel-preface').value='';$('parallel-results').replaceChildren();$('parallel-search-more').hidden=true;$('parallel-search-status').textContent=rows.length+' loci en latín, castellano y francés disponibles para buscar.';const u=new URL(location.href);for(const k of ['q','locus','scope','match'])u.searchParams.delete(k);history.replaceState(null,'',u);document.dispatchEvent(new CustomEvent('vdl:edition-highlight',{detail:{edition,terms:KEY_TERMS}}));render();};
$('parallel-preface').onchange=()=>{if($('parallel-preface').value){$('parallel-query').value=$('parallel-preface').value;runSearch();}};
document.querySelectorAll('[data-parallel-term]').forEach(button=>button.onclick=()=>{$('parallel-query').value=button.dataset.parallelTerm;$('parallel-match').value='concept';runSearch();});
async function readJSON(path){const r=await fetch(path+'?v=20261114-parallel-1',{cache:'no-cache',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function initialize(){
 try{
  const [es,fr,index]=await Promise.all([readJSON('data/structured/recensio-es.json'),readJSON('data/structured/recensio-fr.json'),readJSON('data/r2/folios/'+edition+'-parallel.json')]);
  if(index.schema!=='vdl-edition-parallel-1'||index.edition!==edition||!Array.isArray(index.pages))throw Error('Índice de otra edición');
  rows=combineEditions(es,fr);map=index;searchIndex=createParallelSearch(rows,map);
  $('parallel-search-status').textContent=rows.length+' loci indexados en latín, castellano y francés · edición de Diego Kurilo.';render();
  if(params.get('q'))queueMicrotask(runSearch);
  if(!params.has('image')&&params.get('locus')){
   const found=searchIndex(params.get('locus'),'phrase','all')[0];
   if(found){
    const openMapped=()=>document.dispatchEvent(new CustomEvent('vdl:edition-open',{detail:{edition,image:found.page}}));
    if(current.total>0)openMapped();else{
     const whenReady=event=>{if(event.detail?.edition===edition&&event.detail.total>0){document.removeEventListener('vdl:edition-text',whenReady);openMapped();}};
     document.addEventListener('vdl:edition-text',whenReady);
    }
   }
  }
 }catch(error){$('parallel-search-status').textContent='No se pudieron cargar las ediciones del autor: '+error.message+'. El facsímil y su OCR siguen disponibles.';render();}
}
const parallelReady=initialize();
await import('./rose-krohn-harleianus-reader.mjs?v=20261114-5');
