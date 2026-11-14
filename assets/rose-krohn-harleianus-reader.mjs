/* Cesariano-style galleries, with each edition's own R2 facsimile and OCR. */
import {findRanges,termsFor,searchPages,parseReference,lociFor,wordBoxes,KEY_TERMS,ROMAN} from './modern-edition-search.mjs?v=20261114-2';
const $=id=>document.getElementById(id),id=document.body.dataset.edition;
const works={'rose-1899':{name:'Rose · 1899',source:'vitruviidearchit00vitr_0'},'krohn-1912':{name:'Krohn · 1912',source:'vitruviidearchit00vitr'}};
const work=works[id],base='https://libros.vitruvius-digital-library.org/folios/'+id+'/';
const img=$('folio'),sheet=$('page-sheet'),stage=$('stage'),overlay=$('image-highlights'),loupe=$('loupe'),mag=$('magnified');
let manifest=null,folios=[],pages=[],locusIndex={loci:{}},selected=5,serial=0,visible=0,matched=[],hits=[],shown=0;
let activeTerms=[],wordPage=null,searchSerial=0,ready=false,drawing=null,fitWhole=false;
const wordCache=new Map(),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
async function json(url){const r=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function either(local,remote){try{return await json(local);}catch(error){if(!remote)throw error;return json(remote);}}
function settingsFilter(){return `contrast(${$('contrast').value}%) brightness(${$('brightness').value}%) grayscale(${$('grayscale').checked?1:0}) invert(${$('negative').checked?1:0})`;}
function apply(preserve=true){
 const old=sheet.getBoundingClientRect(),x=(stage.scrollLeft+stage.clientWidth/2)/(old.width||1),y=(stage.scrollTop+stage.clientHeight/2)/(old.height||1);
 let width=Math.max(200,stage.clientWidth-24);
 if(fitWhole&&img.naturalHeight)width=Math.min(width,(stage.clientHeight-24)*img.naturalWidth/img.naturalHeight);
 sheet.style.width=Math.round(width*Number($('zoom').value)/100)+'px';
 img.style.filter=mag.style.filter=settingsFilter();
 $('zval').textContent=$('zoom').value+'%';$('cval').textContent=$('contrast').value+'%';$('bval').textContent=$('brightness').value+'%';
 if(preserve&&img.complete&&img.naturalWidth){const rect=sheet.getBoundingClientRect();stage.scrollLeft=Math.max(0,x*rect.width-stage.clientWidth/2);stage.scrollTop=Math.max(0,y*rect.height-stage.clientHeight/2);}
}
function zoom(value){fitWhole=false;$('zoom').value=clamp(Math.round(value/25)*25,25,500);apply();}
function savedMarks(){try{const value=JSON.parse(localStorage.getItem('vdl-marks-'+id+'-'+selected)||'[]');return Array.isArray(value)?value.filter(v=>[v.x,v.y,v.w,v.h].every(Number.isFinite)):[];}catch{return [];}}
function saveMarks(marks){try{localStorage.setItem('vdl-marks-'+id+'-'+selected,JSON.stringify(marks));}catch{$('highlight-status').textContent='Este navegador no permite guardar los trazos entre sesiones.';}}
function boxMark(word,manual=false){const m=node('span',undefined,'image-hit'+(manual?' manual':''));m.style.left=word.x*100+'%';m.style.top=word.y*100+'%';m.style.width=word.w*100+'%';m.style.height=word.h*100+'%';return m;}
function markedText(text,ranges){const out=document.createDocumentFragment();let end=0;for(const [a,b] of ranges){if(a<end)continue;out.append(document.createTextNode(text.slice(end,a)),node('mark',text.slice(a,b)));end=b;}out.append(document.createTextNode(text.slice(end)));return out;}
function paint(){
 overlay.replaceChildren();let count=0;
 if(wordPage?.page===selected){
  const ranges=findRanges(wordPage.text,activeTerms.length?activeTerms:$('key-highlights').checked?KEY_TERMS:[]);
  for(const word of wordBoxes(wordPage.words||[],ranges)){overlay.append(boxMark(word));count++;}
  $('ocr-text').replaceChildren(markedText(wordPage.text,ranges));
  $('ocr-status').textContent='OCR de esta misma imagen; lectura automática sin revisión crítica.';
  $('highlight-status').textContent=count+' palabras subrayadas sobre esta hoja mediante coordenadas OCR. Los trazos propios se guardan en este navegador.';
 }else{
  const text=pages.find(p=>p.page===selected)?.text||'';
  $('ocr-text').replaceChildren(markedText(text,findRanges(text,activeTerms.length?activeTerms:$('key-highlights').checked?KEY_TERMS:[])));
  $('ocr-status').textContent=text?'Texto OCR sin coordenadas disponibles para esta imagen.':'Esta página no tiene texto OCR disponible.';
  $('highlight-status').textContent='Coordenadas OCR aún no disponibles para esta hoja. El subrayado manual está disponible.';
 }
 for(const mark of savedMarks())overlay.append(boxMark(mark,true));
}
async function loadWords(n,token){
 const path=folios[n-1]?.texto;if(!path){paint();return;}
 try{
  if(!wordCache.has(n))wordCache.set(n,json(path));const data=await wordCache.get(n);
  if(data.schema!=='vdl-page-ocr-1'||data.edition!==id||data.page!==n||!Array.isArray(data.words))throw Error('OCR de otro ejemplar');
  if(token!==serial)return;wordPage=data;paint();
 }catch(error){wordCache.delete(n);if(token===serial){wordPage=null;paint();}}
}
function updateURL(){const url=new URL(location.href);url.searchParams.set('image',selected);history.replaceState(null,'',url);}
function open(n,scroll=false){
 if(!folios.length)return;selected=clamp(Math.floor(Number(n)||1),1,folios.length);const f=folios[selected-1],token=++serial;
 drawing=null;wordPage=null;overlay.replaceChildren();loupe.style.display='none';
 $('page').value=selected;$('current-label').textContent=f.paginaImpresa?'Página impresa '+f.paginaImpresa:'Imagen digital '+selected;
 $('current-image').textContent=selected+' / '+folios.length;
 const refs=Object.entries(locusIndex.loci||{}).filter(([,v])=>v.page===selected).map(([k])=>k);
 $('current-locus').textContent=refs.length?'Loci propuestos por OCR: '+refs.slice(0,5).join(' · ')+(refs.length>5?'…':''):'Paginación digital del ejemplar';
 $('status').textContent='Cargando imagen '+selected+'…';
 img.onload=()=>{if(token!==serial)return;mag.src=f.imagen;apply(false);stage.scrollTop=0;stage.scrollLeft=0;$('status').textContent=work.name+' · imagen '+selected+' de '+folios.length+' cargada.';};
 img.onerror=()=>{if(token===serial)$('status').textContent='No se pudo cargar la imagen '+selected+'. Puede abrir el PDF completo al pie de esta página.';};
 img.src=f.imagen;img.alt=work.name+' · imagen digital '+selected;
 $('prev').disabled=selected===1;$('next').disabled=selected===folios.length;
 document.querySelectorAll('#h-folio-grid button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.page)===selected)));
 updateURL();paint();loadWords(selected,token);
 if(scroll)$('reading-frame').scrollIntoView({behavior:'smooth',block:'start'});
}
function addThumbs(){
 const frag=document.createDocumentFragment();
 for(const i of matched.slice(visible,visible+48)){
  const f=folios[i],button=node('button',undefined,'ces-image-card'),im=node('img');button.type='button';button.dataset.page=i+1;
  button.setAttribute('aria-label','Abrir imagen digital '+(i+1)+' de '+work.name);button.setAttribute('aria-pressed',String(i+1===selected));
  im.src=f.miniatura||f.imagen;im.loading='lazy';im.decoding='async';im.alt='Miniatura de imagen '+(i+1)+' · '+work.name;
  im.addEventListener('error',()=>{if(im.src!==f.imagen)im.src=f.imagen;},{once:true});
  button.append(im,node('strong','Imagen '+(i+1)),node('small',f.paginaImpresa?'p. '+f.paginaImpresa:work.name));
  button.addEventListener('click',()=>open(i+1,true));frag.append(button);
 }
 $('h-folio-grid').append(frag);visible=Math.min(matched.length,visible+48);
 $('h-gallery-more').hidden=visible>=matched.length;$('h-gallery-more').textContent='Mostrar más imágenes ('+visible+' de '+matched.length+')';
 $('h-gallery-status').textContent=matched.length+' imágenes en orden original · '+visible+' miniaturas visibles.';
}
function gallery(){
 const q=$('h-gallery-query').value.trim(),m=q.match(/^(?:(?:imagen|image|img|página|pagina)\s*)?(\d+)$/i);
 matched=folios.map((_,i)=>i).filter(i=>!q||m&&i+1===Number(m[1]));visible=0;$('h-folio-grid').replaceChildren();
 addThumbs();if(q&&!matched.length)$('h-gallery-status').textContent='No hay una imagen con ese número. Esta edición contiene '+folios.length+' imágenes.';
}
function excerpt(hit){const a=Math.max(0,(hit.ranges[0]?.[0]||0)-95),b=Math.min(hit.text.length,a+430),p=node('p');p.append(a?'…':'',markedText(hit.text.slice(a,b),hit.ranges.filter(([x,y])=>y>a&&x<b).map(([x,y])=>[Math.max(a,x)-a,Math.min(b,y)-a])),b<hit.text.length?'…':'');return p;}
function moreResults(){
 const frag=document.createDocumentFragment();
 for(const hit of hits.slice(shown,shown+20)){
  const article=node('article',undefined,'edition-hit');article.append(node('h3',hit.locus?'Vitr. '+hit.locus+' · imagen '+hit.page:'Imagen digital '+hit.page));
  if(hit.locus)article.append(node('p',hit.status==='strong_textual_candidate'?'Localización propuesta por coincidencia textual OCR.':'Coincidencia OCR ambigua: revisar esta imagen y la alternativa indicada.','edition-note'));
  if(hit.text)article.append(excerpt(hit));
  const actions=node('div',undefined,'edition-actions'),b=node('button','Abrir y ampliar esta hoja');b.type='button';b.addEventListener('click',()=>open(hit.page,true));actions.append(b);
  if(hit.status==='ambiguous_textual_candidate'&&hit.runner_up_page){const alt=node('button','Examinar alternativa · imagen '+hit.runner_up_page);alt.type='button';alt.onclick=()=>open(hit.runner_up_page,true);actions.append(alt);}
  article.append(actions);frag.append(article);
 }
 $('search-results').append(frag);shown=Math.min(hits.length,shown+20);$('search-more').hidden=shown>=hits.length;
 $('search-more').textContent='Mostrar más resultados ('+shown+' de '+hits.length+')';
}
async function search(){
 const query=$('edition-query').value.trim(),revision=++searchSerial;if(!query)return;
 $('search-submit').disabled=true;$('search-status').textContent='Buscando en '+work.name+'…';$('search-results').replaceChildren();$('search-more').hidden=true;
 try{
  await readingTask;if(revision!==searchSerial)return;if(!ready)throw Error('No se pudo cargar el índice de texto de esta edición.');
  const reference=parseReference(query),mode=$('edition-search-mode').value;
  if(reference){activeTerms=[];hits=lociFor(locusIndex,reference).filter(r=>r.page<=folios.length).map(r=>({...r,text:pages.find(p=>p.page===r.page)?.text||'',ranges:[]}));}
  else{activeTerms=mode==='words'?query.split(/\s+/):termsFor(query,mode);hits=searchPages(pages,query,mode);}
  shown=0;moreResults();paint();
  $('search-status').textContent=hits.length+(reference?' loci localizados mediante coincidencias OCR.':' páginas con coincidencias en el OCR de esta edición.')+(reference&&!hits.length?' Pruebe una frase del pasaje para localizarlo manualmente.':'')+(mode==='concept'&&!reference?' Conceptos y formas latinas del vocabulario controlado.':'');
  const url=new URL(location.href);url.searchParams.set(reference?'locus':'q',reference?reference.key:query);url.searchParams.delete(reference?'q':'locus');url.searchParams.set('match',mode);history.replaceState(null,'',url);
 }catch(error){$('search-status').textContent=error.message+' El facsímil sigue disponible para lectura.';}
 finally{if(revision===searchSerial)$('search-submit').disabled=false;}
}
function validManifest(m){return m?.schema==='vdl-folios-obra-1'&&m.obra===id&&Array.isArray(m.folios)&&m.folios.length===m.imagenes&&m.imagenes>0&&m.folios.every((f,i)=>f.imagenDigital===i+1&&typeof f.imagen==='string'&&f.imagen.startsWith(base));}
async function load(){
 try{
  manifest=await either('data/r2/folios/'+id+'.json',base+'indice-folios.json');if(!validManifest(manifest))throw Error('Índice de páginas incompleto');
  folios=manifest.folios;$('page').max=folios.length;
  if(manifest.pdf)$('edition-pdf').href=manifest.pdf;
  if(manifest.custodia){const credit=$('scan-credit'),a=node('a','Consultar ejemplar de origen ↗');a.href=manifest.fuente;a.target='_blank';a.rel='noopener';credit.replaceChildren(document.createTextNode('Digitalización: '+manifest.custodia+'. '),a);}
  gallery();const params=new URLSearchParams(location.search);open(Number(params.get('image')||params.get('page'))||5);
  const data=await either('data/r2/folios/'+id+'-ocr.json',manifest.textoIndice||'data/text/'+id+'.json');
  if(data.sha256_pdf&&manifest.sha256_pdf&&data.sha256_pdf!==manifest.sha256_pdf)throw Error('El OCR pertenece a otro PDF');
  const rows=Array.isArray(data)?data:data.edition===id?data.pages:null;
  if(!Array.isArray(rows)||rows.length!==folios.length||rows.some((p,i)=>p.page!==i+1))throw Error('El texto OCR no corresponde a la secuencia de imágenes de esta edición');
  pages=rows;
  try{locusIndex=await either('data/r2/folios/'+id+'-loci.json',manifest.lociIndice);}catch{
   try{
    if(id==='krohn-1912')locusIndex=await json('data/structured/krohn-1912-ocr-locus-candidates.json');
    else{const old=await json('data/text/krohn-rose-locus-candidates.json');locusIndex={loci:Object.fromEntries(old.entries.filter(r=>r.edition==='rose'&&r.anchorsMatched>=2).map(r=>[r.locus,{...r,status:'ambiguous_textual_candidate'}]))};}
   }catch{locusIndex={loci:{}};}
  }
  ready=true;paint();$('search-status').textContent=pages.length+' páginas OCR disponibles · '+Object.keys(locusIndex.loci||{}).length+' loci con propuestas de localización.';
  // Restore an explicit shared search without waiting on this same promise.
  const q=params.get('q')||params.get('locus');if(q){$('edition-query').value=q;$('edition-search-mode').value=['concept','phrase','words'].includes(params.get('match'))?params.get('match'):'concept';queueMicrotask(search);}
 }catch(error){$('search-status').textContent='No se pudo preparar el índice de búsqueda: '+error.message;if(!folios.length){$('status').textContent='No se pudo cargar el índice de imágenes: '+error.message+'. Puede consultar el PDF completo al pie.';$('h-gallery-status').textContent='No se ha recibido el índice de esta edición.';}}
}
$('prev').onclick=()=>open(selected-1);$('next').onclick=()=>open(selected+1);$('open').onclick=()=>open($('page').value);
$('page').onchange=()=>open($('page').value);$('page').onkeydown=e=>{if(e.key==='Enter')open($('page').value);};
$('zoom-in').onclick=()=>zoom(Number($('zoom').value)+25);$('zoom-out').onclick=()=>zoom(Number($('zoom').value)-25);
$('zoom-fit').onclick=()=>{fitWhole=false;$('zoom').value=100;apply(false);stage.scrollTop=stage.scrollLeft=0;};
$('zoom-page').onclick=()=>{fitWhole=true;$('zoom').value=100;apply(false);stage.scrollTop=stage.scrollLeft=0;};
for(const name of ['zoom','contrast','brightness'])$(name).oninput=()=>{if(name==='zoom')fitWhole=false;apply();};
for(const name of ['grayscale','negative'])$(name).onchange=()=>apply();
$('key-highlights').onchange=paint;$('manual-mark').onchange=()=>{stage.classList.toggle('is-marking',$('manual-mark').checked);loupe.style.display='none';};
$('clear-marks').onclick=()=>{saveMarks([]);paint();};
$('reset-view').onclick=()=>{fitWhole=false;for(const name of ['zoom','contrast','brightness'])$(name).value=100;for(const name of ['grayscale','negative','manual-mark'])$(name).checked=false;$('loupe-enabled').checked=true;stage.classList.remove('is-marking');apply(false);stage.scrollTop=stage.scrollLeft=0;};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('reading-frame').requestFullscreen();}catch{$('status').textContent='Este navegador no permite pantalla completa; puede ampliar con el zoom.';}};
window.addEventListener('resize',()=>apply(false));document.addEventListener('fullscreenchange',()=>apply(false));
stage.ondblclick=()=>{if(!$('manual-mark').checked)zoom(Number($('zoom').value)+50);};
stage.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){e.preventDefault();zoom(Number($('zoom').value)+25);}else if(e.key==='-'){e.preventDefault();zoom(Number($('zoom').value)-25);}else if(e.key==='0'){e.preventDefault();$('zoom-fit').click();}else if(e.key==='ArrowLeft'){e.preventDefault();open(selected-1);}else if(e.key==='ArrowRight'){e.preventDefault();open(selected+1);}});
stage.addEventListener('pointermove',e=>{
 if(!$('loupe-enabled').checked||$('manual-mark').checked||!img.naturalWidth){loupe.style.display='none';return;}
 const rect=img.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;
 if(x<0||x>1||y<0||y>1){loupe.style.display='none';return;}
 const size=window.innerWidth<640?145:200;loupe.style.display='block';loupe.style.left=clamp(e.clientX+18,0,window.innerWidth-size-8)+'px';loupe.style.top=clamp(e.clientY-size/2,0,window.innerHeight-size-8)+'px';
 mag.style.width=rect.width*3+'px';mag.style.left=size/2-x*rect.width*3+'px';mag.style.top=size/2-y*rect.height*3+'px';
});stage.onpointerleave=()=>loupe.style.display='none';
function point(e){const r=img.getBoundingClientRect();return{x:clamp((e.clientX-r.left)/r.width,0,1),y:clamp((e.clientY-r.top)/r.height,0,1)};}
sheet.addEventListener('pointerdown',e=>{if(!$('manual-mark').checked||!img.naturalWidth)return;e.preventDefault();drawing={...point(e),page:selected};sheet.setPointerCapture?.(e.pointerId);});
sheet.addEventListener('pointerup',e=>{if(!drawing||drawing.page!==selected)return;const p=point(e),d=drawing;drawing=null;const width=Math.abs(p.x-d.x);if(width<.003)return;saveMarks([...savedMarks(),{x:Math.min(d.x,p.x),y:Math.max(0,(d.y+p.y)/2-.002),w:width,h:.004}]);paint();});
sheet.addEventListener('pointercancel',()=>drawing=null);
$('gallery-form').onsubmit=e=>{e.preventDefault();gallery();};$('h-gallery-reset').onclick=()=>{$('h-gallery-query').value='';gallery();};$('h-gallery-more').onclick=addThumbs;
$('edition-search-form').onsubmit=e=>{e.preventDefault();search();};$('search-more').onclick=moreResults;
$('search-clear').onclick=()=>{searchSerial++;hits=[];shown=0;activeTerms=[];$('edition-query').value='';$('preface-pick').value='';$('search-results').replaceChildren();$('search-more').hidden=true;$('search-submit').disabled=false;$('search-status').textContent='Escriba una palabra, frase o locus para buscar.';const u=new URL(location.href);for(const k of ['q','locus','match'])u.searchParams.delete(k);history.replaceState(null,'',u);paint();};
$('preface-pick').onchange=()=>{if($('preface-pick').value){$('edition-query').value=$('preface-pick').value;search();}};
document.querySelectorAll('[data-term]').forEach(button=>button.onclick=()=>{$('edition-query').value=button.dataset.term;$('edition-search-mode').value='concept';search();});
$('copy-link').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('copy-link').textContent='Enlace copiado';}catch{$('copy-link').textContent='Copie la dirección de esta página';}};
const readingTask=load();
