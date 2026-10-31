const $=id=>document.getElementById(id);
const manifest='https://bl.digirati.io/iiif/ark:/81055/vdc_100056038850.0x000001';
const alternative='https://iiif.biblissima.fr/collections/manifest/42a59095238dde332ca5f18a21aa5a7598829539';
let canvases=[],serial=0;
const status=$('status'),img=$('folio'),loupe=$('loupe'),mag=$('magnified');
function setFilters(){img.style.width=(Number($('zoom').value)/100*900)+'px';img.style.filter='contrast('+$('contrast').value+'%)';mag.style.filter=img.style.filter;$('zval').textContent=$('zoom').value+'%';$('cval').textContent=$('contrast').value+'%';}
for(const id of ['zoom','contrast'])$(id).addEventListener('input',setFilters);
function imageUrl(canvas){
 const resource=canvas.images?.[0]?.resource||canvas.items?.[0]?.items?.[0]?.body;
 const raw=resource?.service||resource?.services;
 const service=Array.isArray(raw)?raw[0]:raw;
 const base=typeof service==='string'?service:service?.id||service?.['@id'];
 if(base)return String(base).replace(/\/$/,'')+'/full/1200,/0/default.jpg';
 return resource?.id||resource?.['@id']||null;
}
async function getManifest(url){const r=await fetch(url,{headers:{Accept:'application/json,application/ld+json'}});if(!r.ok)throw Error('HTTP '+r.status);const d=await r.json();const list=d.sequences?.[0]?.canvases||d.items;if(!Array.isArray(list)||!list.length)throw Error('El manifiesto no incluye páginas');return list;}
async function init(){
 let failures=[];
 for(const url of [manifest,alternative]){
  try{canvases=await getManifest(url);$('page').max=String(canvases.length);status.textContent='Manifiesto IIIF cargado: '+canvases.length+' imágenes disponibles.';openPage();return;}
  catch(e){failures.push(e.message)}
 }
 status.textContent='No se pudo recuperar el manifiesto IIIF desde este navegador ('+failures.join('; ')+'). Consultá el visor de la British Library mediante el enlace inferior.';
}
function openPage(){
 if(!canvases.length){status.textContent='El manifiesto IIIF aún no está disponible.';return}
 const p=Number($('page').value),id=++serial;
 if(!Number.isInteger(p)||p<1||p>canvases.length){status.textContent='Imagen fuera del rango 1–'+canvases.length;return}
 const url=imageUrl(canvases[p-1]);
 if(!url){status.textContent='Sin dirección de imagen para la página '+p;return}
 status.textContent='Abriendo imagen '+p+' de '+canvases.length+'…';
 img.onload=()=>{if(id!==serial)return;mag.src=url;setFilters();status.textContent='Imagen '+p+' de '+canvases.length+' cargada.'};
 img.onerror=()=>{if(id===serial)status.textContent='La British Library no permite cargar esta imagen en el sitio. Utilizá el visor oficial.'};
 img.src=url;
}
$('open').addEventListener('click',openPage);
$('page').addEventListener('change',openPage);
$('page').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openPage()}});
for(const [id,d] of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{if(!canvases.length)return;$('page').value=String(Math.min(canvases.length,Math.max(1,Number($('page').value)+d)));openPage()});
$('stage').addEventListener('pointermove',e=>{if(!img.naturalWidth)return;const b=img.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;if(x<0||y<0||x>b.width||y>b.height){loupe.style.display='none';return}const size=180,scale=3;loupe.style.display='block';loupe.style.left=Math.max(5,Math.min(innerWidth-size-5,e.clientX+14))+'px';loupe.style.top=Math.max(5,Math.min(innerHeight-size-5,e.clientY-size/2))+'px';mag.style.width=(b.width*scale)+'px';mag.style.height=(b.height*scale)+'px';mag.style.left=(size/2-x*scale)+'px';mag.style.top=(size/2-y*scale)+'px'});
$('stage').addEventListener('pointerleave',()=>loupe.style.display='none');
setFilters();init();
