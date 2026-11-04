const $=id=>document.getElementById(id);
const stage=$('stage'),img=$('folio'),lens=$('lens'),lensImg=$('lens-image'),status=$('state');
const controls=['zoom','brightness','contrast','grayscale','sepia'];
let pdfNegative=false;
let searchTarget=null,activeMarks=[],activeViewport=null;
const markerLayer=document.createElement('div');
markerLayer.id='pdf-word-highlights';
markerLayer.setAttribute('aria-hidden','true');
stage.append(markerLayer);
function textFold(str){return String(str||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i').replace(/ς/g,'σ');}
function collectMarks(items,viewport,term){
 const wanted=textFold(term).trim();
 if(!wanted||wanted.length<2)return [];
 const found=[],phrase=wanted.includes(' ');
 const joined=textFold(items.map(it=>it.str||'').join(' '));
 if(phrase&&!joined.includes(wanted))return [];
 const needles=phrase?wanted.split(/\s+/).filter(v=>v.length>=3):[wanted];
 for(const item of items){
  if(!item.str||!item.transform||!item.width)continue;
  const value=textFold(item.str);
  const matrix=pdfjs.Util.transform(viewport.transform,item.transform);
  const h=Math.max(5,Math.abs((item.height||0)*viewport.scale)||Math.hypot(matrix[2],matrix[3]));
  const fullWidth=Math.max(1,item.width*viewport.scale);
  for(const needle of needles){
   let at=0,foundOnItem=0;
   while((at=value.indexOf(needle,at))!==-1&&found.length<24&&foundOnItem<6){
    if(!phrase&&(/[\p{L}\p{N}]/u.test(value[at-1]||'')||/[\p{L}\p{N}]/u.test(value[at+needle.length]||''))){at++;continue;}
    const left=matrix[4]+fullWidth*at/Math.max(1,value.length);
    found.push({left,top:matrix[5]-h,width:Math.max(4,fullWidth*needle.length/Math.max(1,value.length)),height:h});
    at+=needle.length;foundOnItem++;
   }
  }
 }
 return found;
}
function drawMarks(){
 markerLayer.replaceChildren();
 if(!activeMarks.length||!activeViewport||!img.naturalWidth)return;
 const scaleX=img.clientWidth/activeViewport.width,scaleY=img.clientHeight/activeViewport.height;
 for(const m of activeMarks){
  const el=document.createElement('span');
  el.className='pdf-word-mark';
  el.style.left=(img.offsetLeft+m.left*scaleX)+'px';
  el.style.top=(img.offsetTop+m.top*scaleY)+'px';
  el.style.width=(m.width*scaleX)+'px';
  el.style.height=(m.height*scaleY)+'px';
  markerLayer.append(el);
 }
}
let pages=null,request=0,pdfjs=null,pdfCache=new Map(),localObjectUrl=null,localImageUrl=null;
const manuscripts={"ms:h":["https://iiif.bl.uk/uv/#?manifest=https%3A%2F%2Fbl.digirati.io%2Fiiif%2Fark%3A%2F81055%2Fvdc_100056038850.0x000001","Harley MS 2767"],"ms:g":["https://diglib.hab.de/?db=mss&id=69-gud-lat&lang=en&list=ms","Gudianus 69"],"ms:e":["https://diglib.hab.de/?db=mss&id=132-gud-lat&lang=en&list=ms","Gudianus 132"],"ms:s":["https://bhnumerique.ville-selestat.fr/client/fr_FR/bh/search/results?qf=LANGUAGE%09Langue%09LAT%09latin&qu=ms.+17","Sélestat MS 17"],"ms:p":["https://gallica.bnf.fr/ark:/12148/btv1b9066098j","Parisinus lat. 10277"],"ms:cotton":["https://searcharchives.bl.uk/","Cotton Cleopatra D I"]};
const remoteReader=$('remote-reader'),remoteOpen=$('remote-open'),remoteTitle=$('remote-title');
const ownPDFs={'own:recensio-es':'documents/kurilo-recensio-es.pdf','own:recensio-fr':'documents/kurilo-recensio-fr.pdf','own:theory-en':'documents/kurilo-theory-en.pdf'};
const driveReader=$('drive-reader');
const ownLabels={'own:recensio-es':'V514 · Latín–Castellano','own:recensio-fr':'V554 · Latín–Francés','own:theory-en':'V297 · Latín–Inglés'};
const pdfSources={'pdf:rose-1899':'https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf','pdf:krohn':'documents/krohn-1912.pdf','pdf:ortiz-1787':'https://archive.org/download/A065112/A065112.pdf',...ownPDFs};
const institution=$('library-link');
// El Scriptorium muestra solo fuentes cuya lectura está integrada.
 // Los testimonios no integrados permanecen en la bibliografía y en el índice de códices.

function showNative(){remoteReader.hidden=true;driveReader.hidden=true;$('drive-frame').removeAttribute('src');stage.hidden=false;}
function showManuscript(v){const m=manuscripts[v];if(!m)return;stage.hidden=true;driveReader.hidden=true;$('drive-frame').removeAttribute('src');remoteReader.hidden=false;remoteTitle.textContent=m[1]+' · consulta del manuscrito';remoteOpen.href=m[0];$('page').disabled=true;institution.replaceChildren();const a=document.createElement('a');a.href=m[0];a.target='_blank';a.rel='noopener noreferrer';a.textContent='Abrir '+m[1]+' en el repositorio institucional ↗';institution.append(a);status.textContent='Manuscrito seleccionado. Abre el facsímil institucional o importá un folio para utilizar la lupa.';}
$('remote-zoom').disabled=true;$('remote-reset').disabled=true;$('remote-zoom-value').textContent='No aplicable a portales externos';
$('local-file').addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;if(localObjectUrl)URL.revokeObjectURL(localObjectUrl);pdfCache.delete('local');localObjectUrl=URL.createObjectURL(f);localImageUrl=f.type.startsWith('image/')?localObjectUrl:null;$('source').value='local';$('page').value='1';$('page').min='1';$('page').max=localImageUrl?'1':'99999';$('page').disabled=!!localImageUrl;institution.textContent='Archivo local: '+f.name;load();});
function showPdfFallback(selection){remoteReader.hidden=true;stage.hidden=true;driveReader.hidden=false;const file=selection==='local'?localObjectUrl:pdfSources[selection];if(!file){status.textContent='Selecciona un PDF disponible.';return;}const num=Math.max(1,Number($('page').value)||1);const link=new URL(file,location.href).href+'#page='+num+'&zoom=page-width';
// Chrome's embedded PDF viewer may ignore same-document fragment updates.
// Replace the iframe element to guarantee a fresh PDF navigation for every page jump.
const prior=$('drive-frame');const fresh=prior.cloneNode(false);fresh.removeAttribute('src');prior.replaceWith(fresh);fresh.src=link;fresh.style.filter=pdfNegative?'invert(1) hue-rotate(180deg)':'none';
status.textContent='Abriendo la página '+num+' del PDF. Si el visor del navegador no respeta la página, activa «Renderizar PDF con lupa» para navegación por página controlada por el sitio.';}
function filters(){return 'brightness('+$('brightness').value+'%) contrast('+$('contrast').value+'%) grayscale('+$('grayscale').value+'%) sepia('+$('sepia').value+'%)'+(pdfNegative?' invert(1) hue-rotate(180deg)':'');}
function refresh(){for(const id of controls)$(id+'-value').textContent=$(id).value+'%';const f=filters();img.style.filter=f;lensImg.style.filter=f;img.style.width=($('zoom').value/100*900)+'px';drawMarks();}
for(const id of controls)$(id).addEventListener('input',refresh);
$('pdf-invert')?.addEventListener('change',e=>{pdfNegative=e.target.checked;const frame=$('drive-frame');if(frame)frame.style.filter=pdfNegative?'invert(1) hue-rotate(180deg)':'none';refresh()});
$('loupe').addEventListener('change',()=>{stage.classList.toggle('loupe-on',$('loupe').checked);if(!$('loupe').checked)lens.style.display='none'});
$('source').addEventListener('change',()=>{const v=$('source').value;if(v==='ms:h-reader'){window.location.assign(new URL('harleianus.html',location.href).href);return;}if(v==='print:cesariano-1521'){window.location.assign(new URL('cesariano-1521.html',location.href).href);return;}for(const [code,path] of [['print:sulpizio-1486','sulpizio-1486.html'],['print:giocondo-1511','giocondo-1511.html'],['print:barbaro-1567','barbaro-1567.html']]){if(v===code){window.location.assign(new URL(path,location.href).href);return;}}if(manuscripts[v]){showManuscript(v);return;}if(v==='local'&&!localObjectUrl){$('local-file').click();return;}$('image-url').disabled=v!=='custom';$('page').disabled=false;institution.replaceChildren();if(pdfSources[v]){const a=document.createElement('a');a.href=pdfSources[v];a.target='_blank';a.rel='noopener';a.textContent='Abrir PDF original ↗';institution.append('Si la lectura integrada está bloqueada por el proveedor, ',a);}if(ownLabels[v]){const a=document.createElement('a');a.href='index.html#buscar';a.textContent='Buscar palabras y loci de las tres ediciones ↗';institution.append('PDF del autor alojado en GitHub. ',a);}if(v==='perrault'){$('page').min='2';$('page').max='371';$('page').value='16';}else if(pdfSources[v]){$('page').min='1';$('page').max=v==='pdf:krohn'?'314':'9999';$('page').value='1';}load();});
$('pdf-loupe').addEventListener('change',load);
$('reset').addEventListener('click',()=>{for(const id of controls)$(id).value=id==='grayscale'||id==='sepia'?'0':'100';refresh()});
async function manifestPages(){if(pages)return pages;const url='https://www.e-rara.ch/i3f/v20/16797458/manifest';const response=await fetch(url);if(!response.ok)throw Error('No se pudo consultar el manifiesto IIIF');const data=await response.json();pages=data.sequences?.[0]?.canvases;if(!Array.isArray(pages)||!pages.length)throw Error('El manifiesto no incluye folios');$('page').max=String(pages.length+1);return pages;}
async function load(){const n=++request;activeMarks=[];activeViewport=null;markerLayer.replaceChildren();if(manuscripts[$('source').value]){showManuscript($('source').value);return;}if($('source').value==='local'&&!localObjectUrl)return;status.textContent='Abriendo el folio digital…';const helper=$('pdf-stage-message');if(helper){helper.hidden=false;helper.innerHTML='<strong>Preparando el PDF…</strong> La carga puede depender del documento y del navegador. Puedes abrir el PDF completo desde el enlace situado arriba.';}lens.style.display='none';img.onload=null;img.onerror=null;img.removeAttribute('src');lensImg.removeAttribute('src');try{let url;const selection=$('source').value;const original=pdfSources[selection]||(selection==='local'?localObjectUrl:null);const direct=$('pdf-open-original');if(direct&&original){direct.href=new URL(original,location.href).href;direct.parentElement.hidden=false;}else if(direct){direct.parentElement.hidden=true;}showNative();if(pdfSources[selection]||(selection==='local'&&!localImageUrl)){if(!$('pdf-loupe').checked){showPdfFallback(selection);return;}if(!pdfjs){status.textContent='Preparando lector PDF con navegación exacta por página…';pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';}let pdf=pdfCache.get(selection);if(!pdf){const path=selection==='local'?localObjectUrl:new URL(pdfSources[selection],location.href).href;pdf=await pdfjs.getDocument(path).promise;pdfCache.set(selection,pdf);}if(n!==request)return;const p=Number($('page').value);$('page').max=String(pdf.numPages);if(!Number.isInteger(p)||p<1||p>pdf.numPages)throw Error('Página PDF fuera de rango (1–'+pdf.numPages+').');const page=await pdf.getPage(p);const viewport=page.getViewport({scale:2});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;if(n!==request)return;
 if(searchTarget&&searchTarget.source===selection&&searchTarget.page===p&&searchTarget.term){
  try{const content=await page.getTextContent();if(n!==request)return;activeMarks=collectMarks(content.items,viewport,searchTarget.term);activeViewport=viewport;}catch{activeMarks=[];activeViewport=null;}
 }
 url=canvas.toDataURL('image/png');}else if(selection==='local'){url=localImageUrl;}else{const canvases=await manifestPages();const p=Number($('page').value);if(!Number.isInteger(p)||p<2||p>canvases.length+1)throw Error('Página fuera del rango digital disponible');const canvas=canvases[p-2],resource=canvas?.images?.[0]?.resource,service=resource?.service;const base=typeof service==='string'?service:(service?.['@id']||service?.id);url=base?base.replace(/\/$/,'')+'/full/1600,/0/default.jpg':(resource?.['@id']||resource?.id);if(!url)throw Error('El folio no dispone de URL de imagen');}if(n!==request)return;img.onload=()=>{if(n!==request)return;if($('pdf-stage-message'))$('pdf-stage-message').hidden=true;lensImg.src=img.src;refresh();status.textContent=searchTarget&&searchTarget.page===Number($('page').value)&&searchTarget.source===$('source').value?(activeMarks.length?'PDF abierto: '+activeMarks.length+' marca(s) amarilla(s) visibles. Contrasta la lectura con el PDF.':'PDF abierto en la página indexada. El término está resaltado en el resultado de búsqueda; la capa de texto de esta página no permitió marcarlo sobre la imagen.'):'Folio cargado. Puedes ampliar y usar la lupa.'};img.onerror=()=>{if(n===request)status.textContent='El proveedor no permite cargar esta imagen aquí. Abre el visor institucional.'};img.src=url;}catch(err){if(n===request){if(pdfSources[$('source').value]||($('source').value==='local'&&!localImageUrl)){showPdfFallback($('source').value);status.textContent='No se pudo renderizar este PDF dentro de la página. Usa «Abrir PDF completo en otra pestaña» o desactivá «Renderizar PDF con lupa» para intentar el lector del navegador.';}else{img.onload=null;img.removeAttribute('src');lensImg.removeAttribute('src');status.textContent='No se pudo cargar el folio desde el proveedor. Puedes consultar el facsímil en la biblioteca de origen mediante el enlace inferior.';if($('source').value==='perrault'){institution.replaceChildren();const a=document.createElement('a');a.href='https://doi.org/10.3931/e-rara-61952';a.target='_blank';a.rel='noopener noreferrer';a.textContent='Abrir Perrault 1673 en e-rara ↗';institution.append(a);}}}}}
document.addEventListener('scriptorium:open-search-result',ev=>{
 const detail=ev.detail||{},source=detail.source,page=Number(detail.page);
 if(!pdfSources[source]||!Number.isInteger(page)||page<1)return;
 searchTarget={source,page,term:String(detail.term||'').trim()};
 $('source').value=source;
 $('page').disabled=false;
 $('page').min='1';
 $('page').max=source==='pdf:krohn'?'314':'99999';
 $('page').value=String(page);
 $('pdf-loupe').checked=true;
 institution.replaceChildren();
 const a=document.createElement('a');a.href=pdfSources[source];a.target='_blank';a.rel='noopener noreferrer';a.textContent='Consultar el PDF original ↗';institution.append(a);
 load();
});
$('load').addEventListener('click',load);
function stepPage(delta){if($('page').disabled)return;const field=$('page');const min=Number(field.min)||1,max=Number(field.max)||371;field.value=String(Math.min(max,Math.max(min,(Number(field.value)||min)+delta)));load();}
$('prev-page').addEventListener('click',()=>stepPage(-1));
$('next-page').addEventListener('click',()=>stepPage(1));
$('page').addEventListener('change',()=>{if(!$('page').disabled)load()});
$('page').addEventListener('input',()=>{status.textContent='Página '+$('page').value+' seleccionada. Presioná Enter o Abrir folio.'});
$('page').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();load()}});
stage.addEventListener('pointermove',ev=>{if(!$('loupe').checked||!img.naturalWidth||!img.naturalHeight)return;const bounds=img.getBoundingClientRect(),x=ev.clientX-bounds.left,y=ev.clientY-bounds.top;if(x<0||y<0||x>bounds.width||y>bounds.height){lens.style.display='none';return;}const size=lens.getBoundingClientRect().width||230,mag=3;lens.style.display='block';lens.style.left=Math.min(innerWidth-size-8,ev.clientX+18)+'px';lens.style.top=Math.max(8,Math.min(innerHeight-size-8,ev.clientY-size/2))+'px';lensImg.style.width=(bounds.width*mag)+'px';lensImg.style.height=(bounds.height*mag)+'px';lensImg.style.left=(size/2-x*mag)+'px';lensImg.style.top=(size/2-y*mag)+'px';});
stage.addEventListener('pointerleave',()=>lens.style.display='none');
$('page').min='2';
refresh();load();
