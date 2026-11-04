/* Biblioteca Graeca et Latina · on-site facsimile readers.
   PDFs are public-domain local scans. Manuscript frames remain hosted by custody libraries. */
window.ClassicsFacsimileViewer=(function(){
"use strict";
const lang=()=>document.getElementById("classic-ui-language")?.value||"es";
const tr=(es,en,fr)=>lang()==="en"?en:lang()==="fr"?fr:es;
let session=0;
function el(tag,className,text){
 const x=document.createElement(tag);
 if(className)x.className=className;
 if(text!==undefined)x.textContent=text;
 return x;
}
function addButton(to,label,title,callback){
 const b=el("button","classical-pdf-tool",label);b.type="button";b.title=title;b.setAttribute("aria-label",title);
 b.addEventListener("click",callback);to.append(b);return b;
}
function addLink(to,url,label,download){
 if(!url)return;
 const a=el("a","classical-pdf-link",label);a.href=url;
 if(download)a.download=url.split("/").pop();
 else {a.target="_blank";a.rel="noopener noreferrer"}
 to.append(a);
 return a;
}
function isLocalPDF(path){return /^documents\/(?:classics\/)?[a-z0-9-]+\.pdf$/i.test(path||"")}
function fallbackPdf(target,source,title){
 target.replaceChildren();
 target.append(el("p","classic-ref",tr("El lector avanzado no está disponible; se utiliza el visor PDF del navegador.","Advanced reader unavailable; using the browser's native PDF reader.","Lecteur avancé indisponible ; affichage PDF natif.")));
 const frame=el("iframe","classical-native-pdf");frame.src=source+"#toolbar=1&navpanes=0";frame.title="PDF · "+title;frame.loading="lazy";target.append(frame);
 const links=el("div","classic-linkline");addLink(links,source,tr("Abrir PDF completo ↗","Open full PDF ↗","Ouvrir PDF complet ↗"));
 addLink(links,source,tr("Descargar PDF","Download PDF","Télécharger le PDF"),true);target.append(links);
}
async function mountPdf(target,item){
 const token=++session;
 const src=item?.url||"",title=item?.title||"PDF";
 if(!isLocalPDF(src)){
  target.replaceChildren(el("p",null,"No se ha acreditado un PDF local para esta ficha."));return;
 }
 target.replaceChildren();
 const top=el("div","classical-pdf-toolbar");top.setAttribute("role","toolbar");top.setAttribute("aria-label","Controles de lectura del PDF");
 const reader=el("div","classical-pdf-viewport");reader.tabIndex=0;reader.setAttribute("aria-label","Página del documento; desplazar para leer");
 const canvas=el("canvas","classical-pdf-canvas");canvas.setAttribute("role","img");canvas.setAttribute("aria-label","Página digitalizada del libro");
 reader.append(canvas);
 const status=el("p","classical-pdf-status",tr("Cargando documento PDF…","Loading PDF…","Chargement du PDF…"));status.setAttribute("role","status");
 const attribution=el("p","classic-ref",item.note||item.status||"");attribution.style.margin="8px 0 0";
 const links=el("div","classical-pdf-external");
 addLink(links,src,tr("Abrir PDF ↗","Open PDF ↗","Ouvrir le PDF ↗"));
 addLink(links,src,tr("Descargar PDF","Download PDF","Télécharger PDF"),true);
 let pdf=null,pageNumber=1,scale=1,turn=0,contrast=false,inverted=false,renderTask=null,taskSerial=0,activeSearch=0;
 const pager=el("div","classical-pdf-pager");
 const prev=addButton(pager,"←",tr("Página anterior","Previous page","Page précédente"),()=>loadPage(pageNumber-1));
 const pageInput=el("input","classical-pdf-number");
 pageInput.type="number";pageInput.inputMode="numeric";pageInput.min="1";pageInput.value="1";pageInput.setAttribute("aria-label","Número de página");
 pager.append(pageInput);
 const total=el("span","classical-pdf-total","/ —");pager.append(total);
 const next=addButton(pager,"→",tr("Página siguiente","Next page","Page suivante"),()=>loadPage(pageNumber+1));
 const minus=addButton(top,"−",tr("Alejar","Zoom out","Réduire"),()=>setZoom(scale/1.25));
 const zoomOutput=el("output","classical-pdf-zoom","100 %");top.append(zoomOutput);
 addButton(top,"+",tr("Ampliar","Zoom in","Agrandir"),()=>setZoom(scale*1.25));
 addButton(top,tr("Ajustar","Fit","Ajuster"),tr("Ajustar al ancho","Fit width","Ajuster largeur"),()=>setZoom(1));
 addButton(top,"↻",tr("Girar 90°","Rotate 90°","Pivoter 90°"),()=>{turn=(turn+90)%360;render()});
 const inv=addButton(top,tr("Invertir","Invert","Inverser"),tr("Invertir colores","Invert colors","Inverser couleurs"),()=>{inverted=!inverted;filter();inv.setAttribute("aria-pressed",String(inverted))});
 const high=addButton(top,tr("Contraste","Contrast","Contraste"),tr("Realzar contraste","Enhance contrast","Renforcer contraste"),()=>{contrast=!contrast;filter();high.setAttribute("aria-pressed",String(contrast))});
 inv.setAttribute("aria-pressed","false");high.setAttribute("aria-pressed","false");
 addButton(top,"⛶",tr("Pantalla completa","Fullscreen","Plein écran"),async()=>{
  try{if(document.fullscreenElement===target)await document.exitFullscreen();
   else await target.requestFullscreen()}catch{status.textContent=tr("Pantalla completa no disponible.","Fullscreen not available.","Plein écran indisponible.")}
 });
 top.append(pager);
 top.append(links);
 const searchForm=el("form","classical-pdf-find");
 const input=el("input");input.type="search";input.placeholder=tr("Buscar texto OCR en el PDF…","Search PDF text layer…","Rechercher le texte OCR…");input.maxLength=100;
 input.setAttribute("aria-label",input.placeholder);searchForm.append(input);
 const find=el("button",null,tr("Buscar","Search","Chercher"));find.type="submit";searchForm.append(find);
 const searchResult=el("div","classical-pdf-search-results");
 target.append(top,searchForm,searchResult,reader,status,attribution);
 function filter(){canvas.style.filter=[inverted?"invert(1) hue-rotate(180deg)":"",contrast?"grayscale(1) contrast(1.65) brightness(1.08)":""].filter(Boolean).join(" ");}
 function setZoom(value){scale=Math.max(0.6,Math.min(3.5,value));zoomOutput.textContent=Math.round(scale*100)+" %";minus.disabled=scale<=.6;render()}
 function loadPage(page){
  if(!pdf)return;const n=Math.max(1,Math.min(pdf.numPages,Math.floor(Number(page)||1)));
  pageNumber=n;pageInput.value=String(n);prev.disabled=n<=1;next.disabled=n>=pdf.numPages;render()
 }
 async function render(){
  if(!pdf||token!==session||!target.isConnected)return;
  const serial=++taskSerial;
  status.textContent=tr("Renderizando página ","Rendering page ","Rendu de la page ")+pageNumber+"…";
  if(renderTask){try{renderTask.cancel()}catch{};renderTask=null}
  try{
   const pg=await pdf.getPage(pageNumber);
   if(serial!==taskSerial||token!==session||!target.isConnected)return;
   const normal=pg.getViewport({scale:1,rotation:turn});
   const base=Math.max(0.2,Math.min(3,(reader.clientWidth-26)/normal.width));
   const viewport=pg.getViewport({scale:base*scale,rotation:turn});
   const dpr=Math.min(window.devicePixelRatio||1,1.8,5000/Math.max(1,viewport.width));
   canvas.width=Math.ceil(viewport.width*dpr);canvas.height=Math.ceil(viewport.height*dpr);
   canvas.style.width=Math.round(viewport.width)+"px";
   canvas.style.height=Math.round(viewport.height)+"px";
   const ctx=canvas.getContext("2d",{alpha:false});
   renderTask=pg.render({canvasContext:ctx,viewport,transform:dpr!==1?[dpr,0,0,dpr,0,0]:null});
   await renderTask.promise;
   if(serial!==taskSerial||token!==session)return;
   status.textContent=tr("Página ","Page ","Page ")+pageNumber+" / "+pdf.numPages+" · "+Math.round(scale*100)+" % · "+(item.sizeLabel||"PDF local");
  }catch(e){if(e?.name==="RenderingCancelledException")return;
   if(serial===taskSerial)status.textContent=tr("No se pudo representar esta página: ","Could not render page: ","Impossible d'afficher la page : ")+e.message;
  }
 }
 function showSearchHit(page,preview,term){
  const btn=el("button","classical-pdf-search-hit");
  btn.type="button";
  btn.append(el("strong",tr("Página ","Page ","Page ")+page+" · "));
  const fragment=String(preview||"").slice(0,220);
  const low=fragment.toLocaleLowerCase(),q=term.toLocaleLowerCase(),index=low.indexOf(q);
  if(index<0)btn.append(fragment);
  else{
   btn.append(fragment.slice(0,index));
   btn.append(el("mark",null,fragment.slice(index,index+term.length)));
   btn.append(fragment.slice(index+term.length));
  }
  btn.addEventListener("click",()=>{loadPage(page);reader.scrollIntoView({block:"start",behavior:"smooth"})});
  searchResult.append(btn);
 }
 searchForm.addEventListener("submit",async ev=>{
  ev.preventDefault();
  if(!pdf)return;
  const term=input.value.trim();searchResult.replaceChildren();if(term.length<2)return;
  const mine=++activeSearch;
  searchResult.textContent=tr("Buscando texto extraíble en el PDF; puede no haber OCR…","Searching extracted PDF text; OCR may be unavailable…","Recherche du texte extractible ; OCR possiblement absent…");
  let hits=0,hasText=0;
  for(let n=1;n<=pdf.numPages;n++){
   if(mine!==activeSearch||token!==session||!target.isConnected)return;
   try{
    const pg=await pdf.getPage(n);
    const tc=await pg.getTextContent();
    const value=tc.items.map(x=>x.str||"").join(" ");
    if(value.trim())hasText++;
    const index=value.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
    if(index>=0){
     if(hits===0)searchResult.replaceChildren();
     const context=value.slice(Math.max(0,index-70),Math.min(value.length,index+term.length+135));
     showSearchHit(n,context,term);hits++;
     if(hits>=25)break;
    }
   }catch{}
   if(n%20===0){searchResult.setAttribute("aria-busy","true");await new Promise(r=>setTimeout(r,0))}
  }
  searchResult.removeAttribute("aria-busy");
  if(!hits)searchResult.textContent=hasText?tr("No se encontró el término en las capas de texto del PDF.","No match in the PDF text layer.","Aucun terme correspondant dans la couche de texte."):tr("Este facsímil no tiene OCR utilizable. Podés leerlo y ampliarlo, pero buscar palabras exige transcripción/OCR.","No usable OCR layer in this scan. Reading and zooming work; text search requires OCR.","Pas de couche OCR exploitable. Lecture et zoom possibles ; la recherche exige OCR.");
 });
 pageInput.addEventListener("change",()=>loadPage(pageInput.value));
 target.addEventListener("keydown",ev=>{if(ev.target===input||ev.target===pageInput)return;if(ev.key==="ArrowRight")loadPage(pageNumber+1);else if(ev.key==="ArrowLeft")loadPage(pageNumber-1)});
 if(!window.pdfjsLib){
  fallbackPdf(target,src,title);return;
 }
 try{
  window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const documentTask=window.pdfjsLib.getDocument({url:src,withCredentials:false});
  pdf=await documentTask.promise;
  if(token!==session||!target.isConnected){pdf.destroy();return}
  total.textContent="/ "+pdf.numPages;loadPage(1);
 }catch(e){
  if(token===session&&target.isConnected)fallbackPdf(target,src,title);
 }
}
function mountManuscript(target,record){
 ++session;
 target.replaceChildren();
 const title=el("h3",null,record.title||"Códice"),meta=el("p","classical-evidence-meta",[record.library,record.shelfmark,record.date].filter(Boolean).join(" · "));
 const scope=el("p","classic-ref",record.coverage||"");
 target.append(title,meta,scope);
 const toolbar=el("div","classical-ms-toolbar");
 const manifest=record.manifest;
 if(manifest&&/^https:\/\//i.test(manifest)){
  const viewerUrl="https://uv-v4.netlify.app/#?manifest="+encodeURIComponent(manifest);
  const wrap=el("div","classical-ms-container");
  const frame=el("iframe","classical-ms-frame");
  frame.src=viewerUrl;frame.title="IIIF · "+record.shelfmark+" · "+record.title;
  frame.loading="lazy";frame.referrerPolicy="no-referrer-when-downgrade";
  wrap.append(frame);
  addButton(toolbar,"⛶",tr("Ampliar visor IIIF a pantalla completa","Fullscreen IIIF viewer","Visor IIIF plein écran"),async()=>{
   try{if(document.fullscreenElement===wrap)await document.exitFullscreen();else await wrap.requestFullscreen()}catch{}
  });
  addLink(toolbar,viewerUrl,tr("Abrir visor IIIF ↗","Open IIIF viewer ↗","Ouvrir le visualiseur IIIF ↗"));
  target.append(toolbar,wrap);
 }else{
  target.append(el("p","classic-ref",tr("La institución no ofrece aquí un manifiesto IIIF comprobado; usá su visor oficial.","No verified IIIF manifest supplied here; use the institution's own viewer.","Aucun manifeste IIIF vérifié ; consultez le visualiseur institutionnel.")));
 }
 const links=el("div","classic-linkline");
 addLink(links,record.viewer,tr("Abrir en biblioteca custodiante ↗","Open at holding library ↗","Ouvrir à la bibliothèque ↗"));
 if(record.record!==record.viewer)addLink(links,record.record,tr("Ficha y signatura ↗","Catalogue and shelfmark ↗","Notice et cote ↗"));
 target.append(links);
 const rights=el("p","classic-ref",record.rights||"");target.append(rights);
}
return{mountPdf,mountManuscript,isLocalPDF};
})();
