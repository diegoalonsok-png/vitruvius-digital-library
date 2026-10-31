// IIIF single-page facsimile: no PDF fetch or automatic download.
const host=document.querySelector('#perrault-page-viewer');
if(host){
 const img=document.createElement('img');img.alt='Facsímil de Perrault, página seleccionada';img.loading='lazy';img.style.cssText='width:100%;height:auto;display:block';
 const caption=document.createElement('p');caption.className='note';caption.setAttribute('role','status');
 const link=document.createElement('a');link.href='https://doi.org/10.3931/e-rara-61952';link.target='_blank';link.rel='noopener';link.textContent='Consultar original en e-rara ↗';
 host.append(img,caption,link);
 let pages=null,sequence=0;
 const manifest='https://www.e-rara.ch/i3f/v20/16797458/manifest';
 function imageSource(canvas){
  const annotation=canvas?.images?.[0]?.resource||canvas?.thumbnail;
  const service=annotation?.service;
  if(service){const base=typeof service==='string'?service:service['@id']||service.id;if(base)return base.replace(/\/$/,'')+'/full/900,/0/default.jpg';}
  const uri=annotation?.['@id']||annotation?.id;
  return typeof uri==='string'&&/^https:\/\//.test(uri)?uri:null;
 }
 async function getPages(){
  if(pages)return pages;
  const response=await fetch(manifest);
  if(!response.ok)throw Error('Manifiesto IIIF no accesible (HTTP '+response.status+')');
  const data=await response.json();
  const list=data.sequences?.[0]?.canvases;
  if(!Array.isArray(list)||list.length<350)throw Error('El manifiesto no contiene las páginas esperadas');
  pages=list;return pages;
 }
 async function show(){
  if(host.hidden)return;
  const n=Number(host.dataset.page||1),mine=++sequence;
  caption.textContent='Cargando imagen IIIF de la página '+n+'…';
  try{
   const canvases=await getPages();if(mine!==sequence)return;
   // First page in the 371-page PDF is the digitization cover, not in IIIF.
   const canvas=canvases[n-2];
   const url=imageSource(canvas);
   if(!url)throw Error('No hay imagen IIIF asociada a la página '+n);
   img.hidden=false;img.src=url;
   img.onerror=()=>{if(mine===sequence){img.hidden=true;caption.textContent='No pudo mostrarse esta imagen desde e-rara; usá el enlace institucional.';}};
   img.onload=()=>{if(mine===sequence)caption.textContent='Imagen IIIF del ejemplar, página PDF '+n+' (correspondencia automática provisional).'};
  }catch(e){if(mine!==sequence)return;img.hidden=true;caption.textContent='Visor institucional no disponible: '+e.message+'. El OCR sigue funcionando.';}
 }
 const observer=new MutationObserver(()=>show());
 observer.observe(host,{attributes:true,attributeFilter:['hidden','data-page']});
}
