/* Perrault 1673 · institutional IIIF facsimile reader.
   The book's images remain hosted by e-rara; no local copies or invented image highlights. */
const host=document.querySelector("#perrault-page-viewer");
if(host){
 host.replaceChildren();
 const manifest="data/perrault-iiif-pages.json"; // verified local map of external IIIF URLs; no photographs stored
 const toolbar=document.createElement("div");toolbar.className="perrault-toolbar";
 toolbar.setAttribute("role","toolbar");toolbar.setAttribute("aria-label","Herramientas de lectura del facsímil");
 const viewport=document.createElement("div");viewport.className="perrault-viewport";
 viewport.tabIndex=0;viewport.setAttribute("aria-label","Página ampliable, arrastrar para desplazar");
 const img=document.createElement("img");img.alt="Página original de Perrault, edición 1673";
 img.loading="lazy";img.decoding="async";img.draggable=false;
 img.style.maxWidth="none";img.style.height="auto";img.style.display="block";
 viewport.append(img);
 const status=document.createElement("p");status.className="note perrault-status";status.setAttribute("role","status");
 const link=document.createElement("a");link.href="https://doi.org/10.3931/e-rara-61952";link.target="_blank";
 link.rel="noopener noreferrer";link.textContent="Ver el ejemplar original en e-rara ↗";
 const zoomLabel=document.createElement("output");zoomLabel.className="perrault-zoom-label";zoomLabel.textContent="100 %";
 let pages=null,fetching=null,serial=0,imageSerial=0,zoom=1,inverted=false,contrast=false;
 let service="",fallback="",loadedWidth=0,pageNumber=1;
 function addButton(text,title,fn){
  const b=document.createElement("button");b.className="perrault-tool";b.type="button";
  b.textContent=text;b.setAttribute("aria-label",title);b.title=title;
  b.addEventListener("click",fn);toolbar.append(b);return b;
 }
 addButton("−","Reducir el zoom",()=>setZoom(zoom/1.3));
 toolbar.append(zoomLabel);
 addButton("+","Ampliar el zoom",()=>setZoom(zoom*1.3));
 addButton("Ajustar","Ajustar al ancho",()=>setZoom(1));
 const inv=addButton("Invertir","Invertir colores de la imagen",()=>{inverted=!inverted;filter();inv.setAttribute("aria-pressed",String(inverted))});
 const c=addButton("Contraste","Aumentar contraste",()=>{contrast=!contrast;filter();c.setAttribute("aria-pressed",String(contrast))});
 addButton("⛶","Pantalla completa",async()=>{
  try{if(document.fullscreenElement===host)await document.exitFullscreen();
   else if(host.requestFullscreen)await host.requestFullscreen();}
  catch{status.textContent="Pantalla completa no disponible; podés usar el zoom."; }
 });
 addButton("Restaurar","Restablecer la vista",()=>{
  inverted=false;contrast=false;inv.setAttribute("aria-pressed","false");c.setAttribute("aria-pressed","false");
  filter();setZoom(1);viewport.scrollTop=0;viewport.scrollLeft=0;
 });
 inv.setAttribute("aria-pressed","false");c.setAttribute("aria-pressed","false");
 host.append(toolbar,viewport,status,link);
 function filter(){
  img.style.filter=[inverted?"invert(1) hue-rotate(180deg)":"",contrast?"grayscale(1) contrast(1.7) brightness(1.06)":""].filter(Boolean).join(" ");
 }
 function setZoom(value){
  zoom=Math.min(6,Math.max(1,Number(value)||1));
  img.style.width=(zoom*100)+"%";zoomLabel.textContent=Math.round(zoom*100)+" %";
  if(zoom>=1.5)loadWidth(zoom>=3?3200:2400);
 }
 function url(width){return service?service+"/full/"+width+",/0/default.jpg":fallback;}
 function loadWidth(width){
  if((!service&&!fallback)||loadedWidth>=width)return;
  const my=++imageSerial;
  const candidates=service?[...new Set([width,1600,1200,900])].map(w=>({url:service+"/full/"+w+",/0/default.jpg",pixels:w})):[];
  // Guaranteed institutional thumbnail fallback when the IIIF resizing endpoint fails.
  if(fallback)candidates.push({url:fallback,pixels:1000,fallback:true});
  function next(i){
   if(my!==imageSerial)return;
   if(i>=candidates.length){
    if(!loadedWidth){img.hidden=true;status.textContent="No fue posible cargar la imagen institucional. Abrí el original en e-rara."}
    return;
   }
   const choice=candidates[i],loader=new Image();loader.decoding="async";
   loader.onload=()=>{
    if(my!==imageSerial)return;
    img.src=choice.url;img.hidden=false;loadedWidth=choice.pixels;
    status.textContent="Perrault 1673 · página PDF "+pageNumber+" · "+(choice.fallback?"imagen institucional de consulta (1000 px)":"imagen IIIF ampliable")+". Correspondencia del folio con PDF provisional.";
   };
   loader.onerror=()=>next(i+1);
   loader.src=choice.url;
  }
  next(0);
 }
 async function getPages(){
  if(pages)return pages;
  if(!fetching)fetching=fetch(manifest).then(r=>{
   if(!r.ok)throw Error("HTTP "+r.status);return r.json();
  }).then(data=>{
   const entries=data.pages;
   if(!Array.isArray(entries)||entries.length!==370)throw Error("Índice IIIF incompleto");
   pages=entries;return pages;
  }).catch(e=>{fetching=null;throw e});
  return fetching;
 }
 async function show(){
  if(host.hidden)return;
  const page=Number(host.dataset.page||1),my=++serial;
  pageNumber=page;imageSerial++;loadedWidth=0;img.hidden=true;zoom=1;setZoom(1);
  status.textContent="Cargando facsímil, página "+page+"…";
  try{
   const list=await getPages();if(my!==serial||host.hidden)return;
   // La primera página del PDF es la cubierta y no está en el manifiesto.
   const image=list[page-2];
   service=image?.id?"https://www.e-rara.ch/i3f/v20/"+image.id:"";
   fallback=image?.fallback||"";
   if(!service&&!fallback)throw Error("La página no figura en el índice IIIF");
   loadWidth(1200);
  }catch(e){if(my!==serial)return;status.textContent="Visor institucional no disponible: "+e.message;img.hidden=true;}
 }
 let drag=null;
 viewport.addEventListener("pointerdown",ev=>{
  if(ev.button!==0)return;
  drag={x:ev.clientX,y:ev.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};
  viewport.setPointerCapture(ev.pointerId);
 });
 viewport.addEventListener("pointermove",ev=>{
  if(!drag)return;
  viewport.scrollLeft=drag.left-(ev.clientX-drag.x);
  viewport.scrollTop=drag.top-(ev.clientY-drag.y);
 });
 ["pointerup","pointercancel","lostpointercapture"].forEach(t=>viewport.addEventListener(t,()=>drag=null));
 viewport.addEventListener("dblclick",()=>setZoom(zoom<2?2:1));
 viewport.addEventListener("wheel",ev=>{
  if(!ev.ctrlKey&&!ev.metaKey)return;
  ev.preventDefault();setZoom(zoom*(ev.deltaY<0?1.2:1/1.2));
 },{passive:false});
 new MutationObserver(show).observe(host,{attributes:true,attributeFilter:["hidden","data-page"]});
 if(!host.hidden)show();
}
