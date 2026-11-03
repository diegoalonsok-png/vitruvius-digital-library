const $=id=>document.getElementById(id);
const manifest='https://bl.digirati.io/iiif/ark:/81055/vdc_100056038850.0x000001';
const alternative='https://api.bl.uk/metadata/iiif/ark:/81055/vdc_100056038850.0x000001/manifest.json';
let canvases=[],serial=0;
const status=$('status'),img=$('folio'),loupe=$('loupe'),mag=$('magnified');
let displayMode='original';
const stage=$('stage');
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

function imageFilter(){const contrast='contrast('+$('contrast').value+'%)';return displayMode==='bw'?'grayscale(1) '+contrast+' brightness(1.15)':displayMode==='negative'?'grayscale(1) invert(1) '+contrast:contrast;}
document.querySelectorAll('[data-image-mode]').forEach(button=>button.addEventListener('click',()=>{displayMode=button.dataset.imageMode;document.querySelectorAll('[data-image-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));setFilters();}));
function setFilters(){
 const z=clamp(Number($('zoom').value)||100,50,500);
 const previousWidth=img.getBoundingClientRect().width||Math.max(200,stage.clientWidth-28);
 const centerX=stage.scrollLeft+stage.clientWidth/2;
 const centerY=stage.scrollTop+stage.clientHeight/2;
 const relativeX=centerX/previousWidth;
 const relativeY=centerY/Math.max(1,img.getBoundingClientRect().height);
 const base=Math.max(240,stage.clientWidth-28);
 img.style.maxWidth='none';img.style.width=Math.round(base*z/100)+'px';img.style.height='auto';
 img.style.filter=imageFilter();mag.style.filter=imageFilter();
 $('zval').textContent=z+'%';$('cval').textContent=$('contrast').value+'%';
 if(img.complete&&img.naturalWidth){
   stage.scrollLeft=Math.max(0,relativeX*img.getBoundingClientRect().width-stage.clientWidth/2);
   stage.scrollTop=Math.max(0,relativeY*img.getBoundingClientRect().height-stage.clientHeight/2);
 }
}
function setZoom(z){$('zoom').value=String(clamp(Math.round(z/25)*25,50,500));setFilters();}
$('zoom-in')?.addEventListener('click',()=>setZoom(Number($('zoom').value)+25));
$('zoom-out')?.addEventListener('click',()=>setZoom(Number($('zoom').value)-25));
$('zoom-fit')?.addEventListener('click',()=>{setZoom(100);stage.scrollTo({left:0,top:0,behavior:'auto'});});
stage.addEventListener('dblclick',()=>setZoom(Number($('zoom').value)+50));
stage.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();setZoom(Number($('zoom').value)+(e.deltaY<0?25:-25));},{passive:false});
stage.addEventListener('keydown',e=>{
 if(['+','='].includes(e.key)){e.preventDefault();setZoom(Number($('zoom').value)+25);}
 if(e.key==='-'){e.preventDefault();setZoom(Number($('zoom').value)-25);}
 if(e.key==='0'){e.preventDefault();$('zoom-fit').click();}
});
for(const id of ['zoom','contrast'])$(id).addEventListener('input',setFilters);
function imageUrls(canvas){
 const resource=canvas.images?.[0]?.resource||canvas.items?.[0]?.items?.[0]?.body;
 const raw=resource?.service||resource?.services;
 const service=Array.isArray(raw)?raw[0]:raw;
 const base=typeof service==='string'?service:service?.id||service?.['@id'];
 if(base)return [2500,2000,1200].map(n=>String(base).replace(/\/$/,'')+'/full/'+n+',/0/default.jpg');
 const fallback=resource?.id||resource?.['@id']||null;
 return fallback?[fallback]:[];
}
async function getManifest(url){const r=await fetch(url,{headers:{Accept:'application/json,application/ld+json'}});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();const list=d.sequences?.[0]?.canvases||d.items;if(!Array.isArray(list)||!list.length)throw Error('El manifiesto no incluye páginas');return list;}
async function init(){
 let failures=[];
 for(const url of [manifest,alternative]){
  try{canvases=await getManifest(url);$('page').max=String(canvases.length);status.textContent='Manifiesto IIIF cargado: '+canvases.length+' imágenes disponibles.';const image=Number(new URLSearchParams(location.search).get('image'));if(Number.isInteger(image)&&image>=1&&image<=canvases.length)$('page').value=String(image);openPage();return;}
  catch(e){failures.push(e.message)}
 }
 status.textContent='No se pudo recuperar el manifiesto IIIF desde este navegador ('+failures.join('; ')+'). Consultá el visor de la British Library mediante el enlace inferior.';
}
function canvasLabel(c){const v=c?.label;if(typeof v==='string')return v;if(v&&typeof v==='object')return Object.values(v).flat().join(' · ');return '';}
function canonicalFolio(s){const text=String(s||'').toLowerCase().replace(/folio|fol\.|fol\s*|f\./g,'').replace(/[^0-9rv]/g,'');const m=text.match(/^(\d{1,3})([rv])$/);return m?Number(m[1])+m[2]:null;}
function openFolio(){if(!canvases.length){status.textContent='El índice de folios todavía no está disponible.';return}const target=canonicalFolio($('folio-ref').value);if(!target){status.textContent='Escribí un folio con recto o verso; por ejemplo, f.1r o 16v.';return}const matches=[];for(let i=0;i<canvases.length;i++){const label=canvasLabel(canvases[i]);const m=label.match(/(?:^|[^a-z\d])(?:f(?:ol(?:io)?)?\.?\s*)?(\d{1,3})\s*([rv])(?:$|[^a-z\d])/i);if(m&&Number(m[1])+m[2].toLowerCase()===target)matches.push(i+1)}if(matches.length!==1){status.textContent=matches.length?'Folio '+target+' tiene varias imágenes posibles ('+matches.join(', ')+'); es necesario cotejarlas.':'El folio '+target+' no aparece identificado en las etiquetas IIIF.';return}$('page').value=String(matches[0]);openPage();}
$('go-folio')?.addEventListener('click',openFolio);
$('folio-ref')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openFolio()}});
function openPage(){
 if(!canvases.length){status.textContent='El manifiesto IIIF aún no está disponible.';return}
 const p=Number($('page').value),id=++serial;
 if(!Number.isInteger(p)||p<1||p>canvases.length){status.textContent='Imagen fuera del rango 1–'+canvases.length;return}
 const label=canvasLabel(canvases[p-1]);const matched=label.match(/^f\.?\s*(\d{1,3})\s*([rv])$/i);const folio=matched?'f.'+Number(matched[1])+matched[2].toLowerCase():'Sin folio identificado';$('current-folio').textContent=folio;$('current-image').textContent=p+' / '+canvases.length;$('current-label').textContent=label||'sin etiqueta';$('folio-info').textContent='Referencia de foliación obtenida directamente del manifiesto IIIF.';const urls=imageUrls(canvases[p-1]);
 if(!urls.length){status.textContent='Sin dirección de imagen para la página '+p;return}
 stage.scrollTop=0;stage.scrollLeft=0;
 let attempt=0;
 status.textContent='Abriendo imagen '+p+' de '+canvases.length+' a alta resolución…';
 img.onload=()=>{if(id!==serial)return;mag.src=img.src;setFilters();status.textContent='Imagen '+p+' de '+canvases.length+' cargada ('+img.naturalWidth+' × '+img.naturalHeight+' píxeles). Usá +, − o el deslizador para ampliar.'};
 img.onerror=()=>{if(id!==serial)return;attempt++;if(attempt<urls.length){status.textContent='Probando otra resolución institucional…';img.src=urls[attempt];}else status.textContent='No se pudo cargar la imagen desde la British Library. Utilizá el visor institucional.'};
 img.src=urls[0];
}
$('open').addEventListener('click',openPage);
$('page').addEventListener('change',openPage);
$('page').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openPage()}});
for(const [id,d] of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{if(!canvases.length)return;$('page').value=String(Math.min(canvases.length,Math.max(1,Number($('page').value)+d)));openPage()});
$('stage').addEventListener('pointermove',e=>{if(!img.naturalWidth)return;const b=img.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;if(x<0||y<0||x>b.width||y>b.height){loupe.style.display='none';return}const size=180,scale=3;loupe.style.display='block';loupe.style.left=Math.max(5,Math.min(innerWidth-size-5,e.clientX+14))+'px';loupe.style.top=Math.max(5,Math.min(innerHeight-size-5,e.clientY-size/2))+'px';mag.style.width=(b.width*scale)+'px';mag.style.height=(b.height*scale)+'px';mag.style.left=(size/2-x*scale)+'px';mag.style.top=(size/2-y*scale)+'px'});
$('stage').addEventListener('pointerleave',()=>loupe.style.display='none');
setFilters();init();
