const $=id=>document.getElementById(id);
const REMOTE='https://www.e-rara.ch/i3f/v20/6125674/manifest';
const LOCAL='data/iiif/barbaro-1567.json';
const status=$('bar-status'),view=$('bar-image'),mag=$('bar-magnified'),bubble=$('bar-loupe');
let pages=[],currentSerial=0;
const text=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
function label(c){
 const value=c.label||c.iiif_label||'';
 return typeof value==='string'?value:Object.values(value||{}).flat().join(' · ');
}
function getPageImage(c){
 if(c.image_url)return [c.image_url,null];
 const body=c.images?.[0]?.resource||c.items?.[0]?.items?.[0]?.body;
 const service=body?.service||body?.services;
 const srv=Array.isArray(service)?service[0]:service;
 const id=typeof srv==='string'?srv:srv?.id||srv?.['@id'];
 const src=id?String(id).replace(/\/$/,'')+'/full/1200,/0/default.jpg':body?.id||body?.['@id'];
 return [src,null];
}
async function readIndex(url){
 const r=await fetch(url,{headers:{'Accept':'application/json,application/ld+json'}});
 if(!r.ok)throw new Error('HTTP '+r.status);
 const doc=await r.json();
 const items=doc.canvases||doc.sequences?.[0]?.canvases||doc.items;
 if(!Array.isArray(items)||!items.length)throw new Error('Manifiesto sin imágenes');
 return items;
}
async function start(){
 const reasons=[];
 for(const url of [LOCAL,REMOTE]){
  try{
   pages=await readIndex(url);
   $('bar-page').max=String(pages.length);
   status.textContent=pages.length+' imágenes indexadas. Fuente de lectura: imágenes oficiales IIIF suministradas por e-rara, sin descarga al repositorio.';
   const requested=Number(new URLSearchParams(location.search).get('image'));
   if(Number.isInteger(requested)&&requested>=1&&requested<=pages.length)$('bar-page').value=String(requested);
   openPage();
   return;
  }catch(e){reasons.push(e.message);}
 }
 status.textContent='No fue posible cargar el índice IIIF ('+reasons.join('; ')+'). Abrí el ejemplar mediante el enlace institucional.';
}
function filters(){
 const values='brightness('+$('bar-brightness').value+'%) contrast('+$('bar-contrast').value+'%)'+($('bar-gray').checked?' grayscale(1)':'')+($('bar-negative').checked?' invert(1) hue-rotate(180deg)':'');
 view.style.filter=values;mag.style.filter=values;
 view.style.width=(Math.round(Number($('bar-zoom').value)*11))+'px';
 $('bar-zoom-out').textContent=$('bar-zoom').value+'%';
 $('bar-contrast-out').textContent=$('bar-contrast').value+'%';
 $('bar-brightness-out').textContent=$('bar-brightness').value+'%';
}
function openPage(){
 if(!pages.length)return;
 const page=Number($('bar-page').value),serial=++currentSerial;
 if(!Number.isInteger(page)||page<1||page>pages.length){status.textContent='Número fuera del intervalo 1–'+pages.length;return;}
 const c=pages[page-1],urls=getPageImage(c);
 $('bar-counter').textContent=page+' / '+pages.length;
 $('bar-label').textContent=label(c)||'Sin etiqueta en el registro IIIF';
 if(!urls[0]){status.textContent='La imagen '+page+' carece de servicio IIIF.';return;}
 let index=0;
 status.textContent='Abriendo imagen '+page+' de '+pages.length+'…';
 view.onload=()=>{if(serial!==currentSerial)return;mag.src=view.src;filters();status.textContent='Imagen '+page+' de '+pages.length+' cargada.'};
 view.onerror=()=>{if(serial!==currentSerial)return;if(index===0&&urls[1]){index=1;view.src=urls[1];return;}status.textContent='La imagen no se pudo cargar. Consultá el original institucional en e-rara.'};
 view.src=urls[0];
}
function step(n){if(!pages.length)return;$('bar-page').value=String(Math.max(1,Math.min(pages.length,Number($('bar-page').value)+n)));openPage();}
$('bar-open').addEventListener('click',openPage);
$('bar-page').addEventListener('change',openPage);
$('bar-page').addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();openPage();}});
$('bar-prev').addEventListener('click',()=>step(-1));
$('bar-next').addEventListener('click',()=>step(1));
$('bar-find').addEventListener('click',()=>{
 const term=text($('bar-folio-search').value);
 if(!term){status.textContent='Escribí una etiqueta IIIF o foliación para buscar.';return;}
 const positions=pages.map((p,i)=>({i,label:text(label(p))})).filter(p=>p.label===term||p.label.includes(term));
 if(positions.length!==1){status.textContent=positions.length?('Hay '+positions.length+' páginas con esa etiqueta; precisá la búsqueda.'):('No se encontró esa etiqueta en el índice IIIF.');return;}
 $('bar-page').value=String(positions[0].i+1);openPage();
});
$('bar-folio-search').addEventListener('keydown',e=>{if(e.key==='Enter'){$('bar-find').click();}});
for(const id of ['bar-zoom','bar-contrast','bar-brightness','bar-gray','bar-negative'])$(id).addEventListener('input',filters);
$('bar-stage').addEventListener('pointermove',ev=>{
 if(!$('bar-magnify').checked||!view.naturalWidth)return;
 const b=view.getBoundingClientRect(),x=ev.clientX-b.left,y=ev.clientY-b.top;
 if(x<0||y<0||x>b.width||y>b.height){bubble.style.display='none';return;}
 const size=bubble.getBoundingClientRect().width||200,k=3;
 bubble.style.display='block';bubble.style.left=Math.max(5,Math.min(innerWidth-size-5,ev.clientX+16))+'px';
 bubble.style.top=Math.max(5,Math.min(innerHeight-size-5,ev.clientY-size/2))+'px';
 mag.style.width=(b.width*k)+'px';mag.style.height=(b.height*k)+'px';
 mag.style.left=(size/2-x*k)+'px';mag.style.top=(size/2-y*k)+'px';
});
$('bar-stage').addEventListener('pointerleave',()=>bubble.style.display='none');
filters();start();
