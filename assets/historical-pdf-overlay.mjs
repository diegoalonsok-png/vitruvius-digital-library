// PDF text-layer highlighting. The original PDF stays unchanged.
const pdfURL='documents/krohn-1912.pdf';
const viewer=document.querySelector('#pdfjs-viewer');
const canvas=document.querySelector('#pdfjs-canvas');
const layer=document.querySelector('#pdfjs-highlights');
const fallback=document.querySelector('#historical-pdf');
const status=document.querySelector('#pdfjs-status');
let pdf=null, pdfjs=null, serial=0;
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
async function init(){
 if(pdf)return pdf;
 if(!pdfjs){
   pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs');
   pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
 }
 pdf=await pdfjs.getDocument(new URL(pdfURL,location.href).href).promise;
 return pdf;
}
function rectangles(text,term,prefix){
 const normalized=fold(text),target=fold(term);
 if(!target)return[];
 let hits=[],at=0;while((at=normalized.indexOf(target,at))!==-1){
   const left=at===0||!/[a-z\p{L}]/u.test(normalized[at-1]);
   const end=at+target.length;
   const right=prefix||end===normalized.length||!/[a-z\p{L}]/u.test(normalized[end]);
   if(left&&right)hits.push([at,end]);at=end;
 }return hits;
}
async function draw(pageNumber,terms,prefix=false){
 if(document.querySelector('#ed')?.value!=='krohn-1912'){
   viewer.hidden=true;fallback.hidden=false;
   status.textContent='En esta edición se usa el PDF original externo. El resaltado se muestra en la transcripción OCR; el PDF externo puede impedir la superposición de marcas por restricciones de su servidor.';
   return;
 }
 const mine=++serial;
 try{
   const documentPDF=await init();if(mine!==serial)return;
   const page=await documentPDF.getPage(Number(pageNumber));
   const width=viewer.parentElement.clientWidth||550;
   const base=page.getViewport({scale:1});
   const viewport=page.getViewport({scale:width/base.width});
   const ratio=Math.min(window.devicePixelRatio||1,2);
   canvas.width=Math.ceil(viewport.width*ratio);canvas.height=Math.ceil(viewport.height*ratio);
   canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';
   viewer.style.height=Math.ceil(viewport.height)+'px';
   viewer.style.maxHeight='none';viewer.style.overflow='visible';
   layer.style.width=viewport.width+'px';layer.style.height=viewport.height+'px';
   const ctx=canvas.getContext('2d');await page.render({canvasContext:ctx,viewport,transform:[ratio,0,0,ratio,0,0]}).promise;
   const content=await page.getTextContent();if(mine!==serial)return;
   layer.replaceChildren();
   let found=0;
   for(const item of content.items){
     if(!item.str||!item.transform)continue;
     const m=pdfjs.Util.transform(viewport.transform,item.transform);
     const height=Math.max(4,Math.abs(item.height*viewport.scale)||Math.hypot(m[2],m[3]));
     const width=Math.max(1,item.width*viewport.scale);
     const parts=terms.flatMap(term=>rectangles(item.str,term,prefix));
     for(const [a,b] of parts){
       const highlight=document.createElement('div');
       const left=m[4]+width*a/Math.max(1,item.str.length);
       highlight.style.cssText='position:absolute;background:rgba(255,219,35,.48);mix-blend-mode:multiply;left:'+left+'px;top:'+(m[5]-height)+'px;width:'+(width*(b-a)/Math.max(1,item.str.length))+'px;height:'+height+'px';
       layer.append(highlight);found++;
     }
   }
   viewer.hidden=false;fallback.hidden=true;
   viewer.scrollTop=0;
   viewer.setAttribute('aria-label','Folio '+pageNumber+' de Krohn 1912, visible en el lector de páginas');
   status.textContent=found?'PDF original: '+found+' resaltado(s) amarillos sobre texto detectable en esta página.':'PDF original abierto. No hay coincidencias localizables en su capa de texto para esta página; consultá el OCR resaltado debajo.';
 }catch(err){
   if(mine!==serial)return;
   viewer.hidden=true;fallback.hidden=false;
   status.textContent='No se pudo activar el resaltado sobre el PDF ('+err.message+'). Se mantiene el visor original y el OCR resaltado.';
 }
}
document.addEventListener('historical-pdf-page',ev=>{
 const {page,query,roots,prefix}=ev.detail;
 const terms=roots?.length?roots:[query];
 draw(page,terms,Boolean(prefix||roots?.length));
});
