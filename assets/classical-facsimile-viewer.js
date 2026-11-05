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
 const pageBox=el("div","classical-pdf-page");const hl=el("div","classical-pdf-hl");hl.setAttribute("aria-hidden","true");
 pageBox.append(canvas,hl);reader.append(pageBox);
 const status=el("p","classical-pdf-status",tr("Cargando documento PDF…","Loading PDF…","Chargement du PDF…"));status.setAttribute("role","status");
 const attribution=el("p","classic-ref",item.note||item.status||"");attribution.style.margin="8px 0 0";
 const links=el("div","classical-pdf-external");
 addLink(links,src,tr("Abrir PDF ↗","Open PDF ↗","Ouvrir le PDF ↗"));
 addLink(links,src,tr("Descargar PDF","Download PDF","Télécharger PDF"),true);
 let pdf=null,pageNumber=1,scale=1,turn=0,contrast=false,inverted=false,renderTask=null,taskSerial=0,activeSearch=0,hlTerm="",pageItems=[];
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
 const findMode=el("select");findMode.setAttribute("aria-label",tr("Tipo de búsqueda","Search type","Type de recherche"));
 for(const [v,l] of [["exact",tr("Palabra exacta","Exact word","Mot exact")],["semantic",tr("Por sentido · IA","By meaning · AI","Par le sens · IA")]]){const o=el("option",null,l);o.value=v;findMode.append(o)}
 searchForm.append(findMode);
 const find=el("button",null,tr("Buscar","Search","Chercher"));find.type="submit";searchForm.append(find);
 const searchResult=el("div","classical-pdf-search-results");
 const dict=el("div","classical-pdf-dict");dict.setAttribute("role","status");dict.setAttribute("aria-live","polite");
 target.append(top,searchForm,searchResult,dict,reader,status,attribution);
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
   await layoutText(pg,viewport,serial);
   status.textContent=tr("Página ","Page ","Page ")+pageNumber+" / "+pdf.numPages+" · "+Math.round(scale*100)+" % · "+(item.sizeLabel||"PDF local");
  }catch(e){if(e?.name==="RenderingCancelledException")return;
   if(serial===taskSerial)status.textContent=tr("No se pudo representar esta página: ","Could not render page: ","Impossible d'afficher la page : ")+e.message;
  }
 }
 /* Capa de texto: rectángulos de cada fragmento en coordenadas CSS de la página renderizada. */
 async function layoutText(pg,viewport,serial){
  hl.replaceChildren();pageItems=[];
  hl.style.width=canvas.style.width;hl.style.height=canvas.style.height;
  if(turn!==0||!window.pdfjsLib?.Util)return;
  let tc;try{tc=await pg.getTextContent()}catch{return}
  if(serial!==taskSerial)return;
  for(const it of tc.items){
   const str=it.str||"";if(!str.trim())continue;
   const tx=window.pdfjsLib.Util.transform(viewport.transform,it.transform);
   const h=Math.hypot(tx[2],tx[3]);const w=(it.width||0)*viewport.scale;
   if(!(h>0)||!(w>0))continue;
   pageItems.push({str,x:tx[4],y:tx[5]-h,w,h});
  }
  paintHits();
 }
 function paintHits(){
  hl.replaceChildren();const LEX=window.ClassicalLexicon;if(!hlTerm||!LEX)return 0;let n=0,first=null;
  for(const it of pageItems){
   for(const [a,b] of LEX.find(it.str,hlTerm)){
    const box=el("span","classical-pdf-hit");const len=it.str.length||1;
    box.style.left=(it.x+it.w*a/len-1)+"px";box.style.top=(it.y-1)+"px";
    box.style.width=(it.w*(b-a)/len+2)+"px";box.style.height=(it.h+3)+"px";
    hl.append(box);n++;first=first||box;
   }
  }
  if(first)requestAnimationFrame(()=>{const r=reader.getBoundingClientRect(),f=first.getBoundingClientRect();reader.scrollTop+=f.top-r.top-r.height/3;reader.scrollLeft+=Math.max(0,f.left-r.left-r.width/2)});
  return n;
 }
 function wordFromPoint(ev){
  const rect=canvas.getBoundingClientRect(),x=ev.clientX-rect.left,y=ev.clientY-rect.top;
  const it=pageItems.find(i=>x>=i.x&&x<=i.x+i.w&&y>=i.y-2&&y<=i.y+i.h+2);if(!it)return"";
  const s=it.str,len=s.length;let k=Math.max(0,Math.min(len-1,Math.floor((x-it.x)/it.w*len)));
  const isW=c=>!!c&&/[\p{L}\p{M}]/u.test(c);if(!isW(s[k])&&isW(s[k+1]))k++;
  let a=k,b=k;while(a>0&&isW(s[a-1]))a--;while(b<len&&isW(s[b]))b++;
  return s.slice(a,b);
 }
 canvas.addEventListener("click",ev=>{
  const LEX=window.ClassicalLexicon;if(!LEX)return;
  const w=wordFromPoint(ev);
  if(!w||w.length<2){
   if(!pageItems.length&&item.transcription){dict.replaceChildren(el("p","classic-ref",tr("Esta página no tiene capa de texto utilizable. Para consultar palabras, abre la transcripción del sitio.","This page has no usable text layer. Open the site transcription to look up words.","Pas de couche de texte utilisable. Ouvrez la transcription du site.")));addLink(dict,item.transcription,tr("Abrir transcripción con diccionario →","Open transcription with dictionary →","Ouvrir la transcription →"))}
   return;
  }
  const lang=/[\u0370-\u03ff\u1f00-\u1fff]/.test(w)?"grc":"la";
  if(lang==="la"&&!["la",""].includes(item.language||""))return;
  LEX.renderPanel(dict,w,{lang,work:item.workId});
 });
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
  btn.addEventListener("click",()=>{hlTerm=term;if(page===pageNumber)paintHits();else loadPage(page);reader.scrollIntoView({block:"start",behavior:"smooth"})});
  searchResult.append(btn);
 }
 let pageTexts=null;
 async function allPageTexts(mine){
  if(pageTexts)return pageTexts;const out=[];
  for(let n=1;n<=pdf.numPages;n++){
   if(mine!==activeSearch||token!==session||!target.isConnected)return null;
   try{const tc=await (await pdf.getPage(n)).getTextContent();out.push({id:String(n),page:n,text:tc.items.map(x=>x.str||"").join(" ").replace(/\s+/g," ").trim()})}catch{out.push({id:String(n),page:n,text:""})}
   if(n%25===0){searchResult.textContent=tr("Leyendo el texto del PDF: ","Reading PDF text: ","Lecture du texte : ")+n+" / "+pdf.numPages+"…";await new Promise(r=>setTimeout(r,0))}
  }
  return pageTexts=out;
 }
 const foldTxt=x=>String(x||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
 const STOPW=new Set("del los las una unos unas por para con sobre que the and for with from des les une pour avec dans sur qui cum sed est sunt quod quae atque".split(" "));
 const qStems=q=>foldTxt(q).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2&&!STOPW.has(w)).map(w=>w.length>6?w.slice(0,-2):w.length>4?w.slice(0,-1):w);
 function markInto(node,text,query){
  const keys=qStems(query);
  for(const part of String(text).split(/(\s+)/)){const w=foldTxt(part).replace(/[^\p{L}\p{N}]/gu,"");
   if(w&&keys.some(k=>w.startsWith(k)))node.append(el("mark",null,part));else node.append(part)}
 }
 function bestWindow(text,query,len=240){
  const f=foldTxt(text),keys=qStems(query);let at=-1;for(const k of keys){const i=f.indexOf(k);if(i>=0&&(at<0||i<at))at=i}
  const from=Math.max(0,(at<0?0:at)-80);return (from?"…":"")+text.slice(from,from+len)+(from+len<text.length?"…":"");
 }
 function printPdfDossier(query,meta){
  const w=window.open("","_blank");if(!w){window.print();return}
  const d=w.document;d.title=tr("Dosier · ","Dossier · ","Dossier · ")+query;
  const st=d.createElement("style");st.textContent="body{font:12pt Georgia,serif;color:#1B2A4A;margin:2cm}h1{font-size:17pt;margin:0 0 4pt}p.meta{font:9pt system-ui,sans-serif;color:#555;margin:0 0 14pt}h2{font-size:12pt;border-bottom:1px solid #C9A84C;padding-bottom:3pt;margin:16pt 0 6pt}.hit{margin:0 0 9pt;page-break-inside:avoid}mark{background:#f3e3a6;color:inherit}";
  d.head.append(st);const h=d.createElement("h1");h.textContent=(title||"PDF")+" · «"+query+"»";const m=d.createElement("p");m.className="meta";m.textContent=meta+" · Vitruvius Digital Library · "+new Date().toLocaleDateString();d.body.append(h,m);
  for(const n of searchResult.querySelectorAll("[data-pdf-group],[data-pdf-hit]")){if(n.dataset.pdfGroup){const g=d.createElement("h2");g.textContent=n.textContent;d.body.append(g)}else{const x=d.createElement("div");x.className="hit";x.innerHTML=n.innerHTML;d.body.append(x)}}
  w.setTimeout(()=>{w.focus();w.print()},300);
 }
 async function semanticPdfSearch(term,mine){
  const texts=await allPageTexts(mine);if(!texts)return;
  if(!texts.some(t=>t.text.length>40)){searchResult.textContent=tr("Este facsímil no tiene OCR utilizable; la búsqueda por sentido necesita texto.","No usable OCR in this facsimile.","Pas d'OCR utilisable.");return}
  searchResult.textContent=tr("Buscando por sentido… la primera vez el navegador descarga el modelo multilingüe (~120 MB); si no puede, se usa BM25.","Searching by meaning… first use downloads the multilingual model (~120 MB).","Recherche par le sens…");
  if(!window.VitruviaAI)await new Promise(r=>{const sc=document.createElement("script");sc.src="assets/vitruvia-ai.js?v=20261104-rank-v1";sc.onload=r;sc.onerror=r;document.head.append(sc)});
  if(!window.VitruviaAI?.rank){searchResult.textContent=tr("Motor de búsqueda por sentido no disponible.","Semantic engine unavailable.","Moteur indisponible.");return}
  const res=await window.VitruviaAI.rank(term,texts.filter(t=>t.text.length>40),{limit:24});
  if(mine!==activeSearch)return;searchResult.replaceChildren();
  if(!res.rows.length){searchResult.textContent=tr("No hay páginas relacionadas.","No related pages.","Aucune page liée.");return}
  const hits=res.rows.map(r=>({...r,page:r.doc.page})).sort((a,b)=>a.page-b.page);
  const groups=[];for(const h of hits){const g=groups.at(-1);if(g&&h.page-g.at(-1).page<=3)g.push(h);else groups.push([h])}
  groups.sort((a,b)=>Math.max(...b.map(x=>x.score))-Math.max(...a.map(x=>x.score)));
  const meta=hits.length+tr(" páginas en "," pages in "," pages en ")+groups.length+tr(" tramos · "," sections · "," passages · ")+(res.mode==="neural"?tr("IA semántica (E5 multilingüe) + texto","semantic AI (E5) + text","IA sémantique + texte"):tr("búsqueda textual BM25 (sin modelo de IA)","BM25 text search (no AI model)","recherche BM25"));
  const head=el("p","classical-pdf-semantic-meta",meta);const pr=el("button","classical-pdf-search-hit",tr("Imprimir dosier","Print dossier","Imprimer le dossier"));pr.type="button";pr.addEventListener("click",()=>printPdfDossier(term,meta));
  searchResult.append(head,pr);
  for(const g of groups){
   const a=g[0].page,b=g.at(-1).page;const gh=el("h4","classical-pdf-semantic-group",(a===b?tr("Página ","Page ","Page ")+a:tr("Páginas ","Pages ","Pages ")+a+"–"+b)+" · "+g.length);gh.dataset.pdfGroup="1";searchResult.append(gh);
   for(const h of g){const btn=el("button","classical-pdf-search-hit");btn.type="button";btn.dataset.pdfHit=String(h.page);
    btn.append(el("strong",tr("Página ","Page ","Page ")+h.page+" · "));btn.append(el("small",null,h.exact?tr("frase literal · ","literal phrase · ","phrase littérale · "):res.mode==="neural"?tr("por sentido · ","by meaning · ","par le sens · "):tr("términos · ","terms · ","termes · ")));
    markInto(btn,bestWindow(h.doc.text,term),term);btn.addEventListener("click",()=>{loadPage(h.page);reader.scrollIntoView({block:"start",behavior:"smooth"})});searchResult.append(btn)}
  }
 }
 if(!document.getElementById("classical-pdf-semantic-style")){const st=document.createElement("style");st.id="classical-pdf-semantic-style";
  st.textContent=".classical-pdf-page{position:relative;display:inline-block;margin:0 auto}.classical-pdf-hl{position:absolute;left:0;top:0;pointer-events:none}.classical-pdf-hit{position:absolute;background:rgba(255,222,40,.45);mix-blend-mode:multiply;border-bottom:2px solid #d9a400;border-radius:2px}.classical-pdf-canvas{cursor:help}.classical-pdf-dict:empty{display:none}.classical-pdf-dict{margin:8px 0}.classical-pdf-semantic-group{font:600 11px/1.4 system-ui,sans-serif;letter-spacing:2px;text-transform:uppercase;color:#8c6c39;border-bottom:1px solid #C9A84C;padding:14px 0 5px;margin:6px 0 4px}.classical-pdf-search-results mark{background:rgba(201,168,76,.32);color:inherit;padding:0 1px;border-radius:2px}.classical-pdf-semantic-meta{font:12px system-ui,sans-serif;color:#6b6f75;margin:6px 0}";document.head.append(st)}
 searchForm.addEventListener("submit",async ev=>{
  ev.preventDefault();
  if(!pdf)return;
  if(findMode.value==="semantic"){const t=input.value.trim();searchResult.replaceChildren();if(t.length<2)return;await semanticPdfSearch(t,++activeSearch);return}
  const term=input.value.trim();searchResult.replaceChildren();if(term.length<2)return;
  const mine=++activeSearch;hlTerm=term;paintHits();
  if(window.ClassicalLexicon&&!/\s/.test(term)){const lang=/[\u0370-\u03ff\u1f00-\u1fff]/.test(term)?"grc":"la";if(lang==="grc"||["la",""].includes(item.language||""))window.ClassicalLexicon.renderPanel(dict,term,{lang,work:item.workId})}
  searchResult.textContent=tr("Buscando texto extraíble en el PDF; puede no haber OCR…","Searching extracted PDF text; OCR may be unavailable…","Recherche du texte extractible ; OCR possiblement absent…");
  let hits=0,hasText=0;
  for(let n=1;n<=pdf.numPages;n++){
   if(mine!==activeSearch||token!==session||!target.isConnected)return;
   try{
    const pg=await pdf.getPage(n);
    const tc=await pg.getTextContent();
    const value=tc.items.map(x=>x.str||"").join(" ");
    if(value.trim())hasText++;
    const hitsAt=window.ClassicalLexicon?window.ClassicalLexicon.find(value,term):[];
    const index=hitsAt.length?hitsAt[0][0]:value.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
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
  if(!hits&&item.transcription){searchResult.replaceChildren(el("p",null,tr("Este facsímil no tiene una capa de texto que permita buscar esta palabra. La transcripción del sitio sí permite la búsqueda con resaltado y diccionario.","This facsimile has no searchable text layer for this word. The site transcription supports highlighted search and dictionary.","Ce fac-similé n'a pas de couche de texte exploitable. La transcription du site permet la recherche.")));addLink(searchResult,item.transcription+"&term="+encodeURIComponent(term),tr("Buscar «","Search «","Chercher «")+term+tr("» en la transcripción →","» in the transcription →","» dans la transcription →"));return}
  if(!hits)searchResult.textContent=hasText?tr("No se encontró el término en las capas de texto del PDF.","No match in the PDF text layer.","Aucun terme correspondant dans la couche de texte."):tr("Este facsímil no tiene OCR utilizable. Puedes leerlo y ampliarlo, pero buscar palabras exige transcripción/OCR.","No usable OCR layer in this scan. Reading and zooming work; text search requires OCR.","Pas de couche OCR exploitable. Lecture et zoom possibles ; la recherche exige OCR.");
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
  const viewerParams=new URLSearchParams({manifest,title:record.title||record.shelfmark||"Códice",official:record.viewer||record.record||""});
  if(record.startFolio)viewerParams.set("folio",record.startFolio);
  const viewerUrl="visor-codex.html?"+viewerParams;
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
  target.append(el("p","classic-ref",tr("La institución no ofrece aquí un manifiesto IIIF comprobado; usa su visor oficial.","No verified IIIF manifest supplied here; use the institution's own viewer.","Aucun manifeste IIIF vérifié ; consultez le visualiseur institutionnel.")));
 }
 const links=el("div","classic-linkline");
 addLink(links,record.viewer,tr("Abrir en biblioteca custodiante ↗","Open at holding library ↗","Ouvrir à la bibliothèque ↗"));
 if(record.record!==record.viewer)addLink(links,record.record,tr("Ficha y signatura ↗","Catalogue and shelfmark ↗","Notice et cote ↗"));
 target.append(links);
 const rights=el("p","classic-ref",record.rights||"");target.append(rights);
}
return{mountPdf,mountManuscript,isLocalPDF};
})();
