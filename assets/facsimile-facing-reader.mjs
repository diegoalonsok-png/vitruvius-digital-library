/* The same PDF leaf, its unaltered OCR and an optional machine translation.
   No canonical loci or diplomatic readings are inferred from page numbers. */
import {translationPieces} from './modern-edition-parallel-core.mjs';
const $=id=>document.getElementById(id),LANG={es:'castellano',fr:'français',en:'English'};
const output=$('facing-translation'),canvas=$('facsimile-canvas'),frame=$('reader-frame');
let current=null,generation=0,pdfSerial=0,renderTask=null,zoom=1,font=19,sourceChosen=false;
const translations=new Map(),documents=new Map();let enginePromise,comparedPdf=null,comparedEdition="",documentNotes=null;
function engine(){
 if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
 if(!enginePromise)enginePromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  script.onload=()=>window.pdfjsLib?resolve(window.pdfjsLib):reject(Error('PDF.js no disponible'));
  script.onerror=()=>reject(Error('No se pudo cargar el lector PDF'));document.head.append(script);
 });return enginePromise;
}
function safePDF(value){
 try{const u=new URL(value,location.href);return (u.origin===location.origin&&u.pathname.includes('/documents/')||u.origin==='https://libros.vitruvius-digital-library.org'&&u.pathname.startsWith('/clasicos/pdf/'))&&u.pathname.endsWith('.pdf')?u.href:null;}catch{return null;}
}
async function renderPDF(){
 if(!current)return;const state=current,serial=++pdfSerial;
 $('pdf-render-status').textContent='Cargando la página digital '+state.page+' del PDF…';
 if(renderTask)try{renderTask.cancel();}catch{}
 try{
  const api=await engine();if(serial!==pdfSerial)return;
  api.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const url=safePDF(state.pdf);if(!url)throw Error('PDF fuera de las fuentes declaradas');
  if(!documents.has(url))documents.set(url,api.getDocument({url,withCredentials:false,isEvalSupported:false,disableAutoFetch:true,disableStream:true,rangeChunkSize:262144}).promise.catch(error=>{documents.delete(url);throw error;}));
  const pdf=await documents.get(url);if(serial!==pdfSerial)return;
  if(state.page<1||state.page>pdf.numPages)throw Error('La hoja no corresponde al PDF');
  const page=await pdf.getPage(state.page);if(serial!==pdfSerial)return;
  const normal=page.getViewport({scale:1}),scale=Math.max(.1,(frame.clientWidth-18||680)/normal.width)*zoom;
  const viewport=page.getViewport({scale}),dpr=Math.min(window.devicePixelRatio||1,2,5000/Math.max(viewport.width,viewport.height));
  canvas.width=Math.ceil(viewport.width*dpr);canvas.height=Math.ceil(viewport.height*dpr);
  canvas.style.width=Math.round(viewport.width)+'px';canvas.style.height=Math.round(viewport.height)+'px';
  canvas.hidden=false;$('pdf-viewer').hidden=true;$('pdf-viewer').removeAttribute('src');
  renderTask=page.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport,transform:dpr!==1?[dpr,0,0,dpr,0,0]:null});
  await renderTask.promise;if(serial!==pdfSerial)return;frame.scrollTop=0;frame.scrollLeft=0;
  canvas.setAttribute('aria-label','Página digital '+state.page+' de '+pdf.numPages+' del facsímil');
  $('pdf-render-status').textContent='PDF original · página digital '+state.page+' / '+pdf.numPages+' · '+Math.round(zoom*100)+'% de ampliación · traducción sincronizada con esta hoja.';
  if(!state.text.trim()){
   const tc=await page.getTextContent();if(serial!==pdfSerial)return;
   const text=(tc.items||[]).map(x=>(x.str||'')+(x.hasEOL?'\n':' ')).join('').trim();
   if(text){current={...state,text,method:'Capa de texto del mismo PDF'};window.VDLFacsimilePage=current;$('folio').textContent=text;generation++;show();}
  }
 }catch(error){
  if(serial!==pdfSerial||error?.name==='RenderingCancelledException')return;
  canvas.hidden=true;const fallback=$('pdf-viewer');fallback.hidden=false;fallback.src=state.pdf+'#page='+state.page+'&view=FitH';
  $('pdf-render-status').textContent='Visor PDF del navegador; la navegación superior mantiene sincronizada la lectura.';
  $('status').textContent='Página '+state.page+' · Visor PDF del navegador. Use la navegación superior para sincronizar la traducción. '+error.message;
 }
}
function mode(){
 const value=$('facing-mode').value,isPdf=value==='pdf';
 $('ocr-section').hidden=value==='translation'||isPdf;$('translation-section').hidden=value==='ocr'||isPdf;
 document.querySelector('.facing-texts').hidden=isPdf;
 if(isPdf&&window.ClassicsAcademicReader){
  if(!comparedPdf||comparedEdition!==current?.edition){if(comparedPdf)comparedPdf.remove();comparedPdf=window.ClassicsAcademicReader.pdfPanel(current?.id||'');comparedEdition=current?.edition||'';document.querySelector('.reader-ocr').append(comparedPdf)}
 }
 if(comparedPdf)comparedPdf.hidden=!isPdf;
}
function textSource(){return String(current?.workingText??current?.text??'').trim();}
function key(){return JSON.stringify([current?.edition,current?.page,$('facing-source').value,$('facing-target').value,textSource()]);}
async function translate(force=false){
 const text=textSource(),source=$('facing-source').value,target=$('facing-target').value,token=++generation;
 output.lang=target;$('facing-target-title').textContent='Traducción automática · '+LANG[target];
 if(!current||$('facing-mode').value==='pdf')return;
 if(!text){output.textContent='Esta hoja no contiene texto OCR utilizable. Avance a una hoja con texto para leer su traducción.';$('translation-status').textContent='Sin texto fuente en esta hoja; se conserva el facsímil completo.';return;}
 if(source===target){output.textContent=text;$('translation-status').textContent='La hoja ya está en el idioma elegido; se muestra su texto OCR.';return;}
 const cacheKey=key();
 if(!force&&translations.has(cacheKey)){const saved=translations.get(cacheKey);output.textContent=saved.text;$('translation-status').textContent=saved.note;return;}
 if(!$('facing-auto').checked&&!force){output.textContent='Pulse «Traducir de nuevo» o active la traducción al cambiar de página.';$('translation-status').textContent='Traducción automática detenida. El OCR sigue disponible.';return;}
 output.replaceChildren();output.setAttribute('aria-busy','true');$('facing-retry').disabled=true;
 const parts=translationPieces(text,1000),done=[];let provider='';
 try{
  const api=window.VitruviaInlineTranslation?.translate;if(typeof api!=='function')throw Error('Servicio de traducción no disponible');
  for(let i=0;i<parts.length;i++){
   if(token!==generation)return;
   $('translation-status').textContent='Traduciendo página '+current.page+' · fragmento '+(i+1)+' de '+parts.length+'…';
   const result=await api(parts[i],source,target);if(token!==generation)return;
   if(result.partial||!result.text)throw Error('El proveedor entregó un fragmento incompleto');
   done.push(result.text);provider=result.provider;output.textContent=done.join('\n\n');
  }
  const note=provider+' · Página '+current.page+' procesada completa · Versión automática no revisada.'+(source==='grc'?' El proveedor trata el griego antiguo como griego moderno; requiere cotejo.':'');
  translations.set(cacheKey,{text:done.join('\n\n'),note});$('translation-status').textContent=note;
 }catch(error){if(token!==generation)return;
  if(!done.length)output.textContent='No se obtuvo traducción de esta hoja. Puede consultar el OCR original o reintentar.';
  $('translation-status').textContent=(done.length?'Traducción parcial: '+done.length+' de '+parts.length+' fragmentos. ':'')+error.message+'. No se ha sustituido por otro pasaje.';
 }finally{if(token===generation){output.removeAttribute('aria-busy');$('facing-retry').disabled=false;}}
}
function show(){
 if(!current)return;generation++;output.removeAttribute('aria-busy');$('facing-retry').disabled=false;
 $('translation-page-label').textContent='Página digital '+current.page+' / '+current.total;
 $('folio').lang=$('facing-source').value;$('folio').textContent=current.text||'Esta hoja no tiene texto OCR disponible.';
 if($('facing-editable-ocr'))$('facing-editable-ocr').value=textSource();
 if(!documentNotes){documentNotes=document.createElement('section');documentNotes.className='cl-edition-footnotes';documentNotes.setAttribute('aria-label','Notas documentales de esta página');document.querySelector('.reader-ocr').append(documentNotes)}
 documentNotes.replaceChildren();const h=document.createElement('h3');h.textContent='Notas documentales · página '+current.page;const p=document.createElement('p');p.textContent=[current.title,current.note,'Transcripción de la página: '+(current.method||'OCR no revisado')+'. Las notas impresas pueden formar parte del OCR; la traducción automática no constituye un aparato crítico.'].filter(Boolean).join(' · ');documentNotes.append(h,p);
 mode();if(!['ocr','pdf'].includes($('facing-mode').value))void translate();
}
function detectLanguage(state){
 const text=state.text||'';
 if((text.match(/[\u0370-\u03ff\u1f00-\u1fff]/g)||[]).length>15)return 'grc';
 const raw=String(state.language==='s/d'?state.originalLanguage:state.language||'').replace(/^bilingue-/,'');
 if(String(state.language).startsWith('bilingue-')&&raw==='en'){
  const en=(text.match(/\b(the|and|of|that|with|from|this|which)\b/gi)||[]).length;
  const la=(text.match(/\b(et|non|est|qui|quod|autem|sunt|enim)\b/gi)||[]).length;
  if(la>en&&la>2)return 'la';
 }
 const lang=({eng:'en',fre:'fr',fra:'fr',spa:'es',lat:'la'})[raw]||raw;
 return ['la','grc','es','en','fr'].includes(lang)?lang:(['la','grc'].includes(state.originalLanguage)?state.originalLanguage:'la');
}
function receive(state){
 if(!state||!Number.isInteger(state.page))return;
 const changedEdition=current?.edition!==state.edition;current=state;
 if(changedEdition){sourceChosen=false;zoom=1;}
 if(!sourceChosen)$('facing-source').value=detectLanguage(state);
 show();void renderPDF();
}
if($('facing-use-edited'))$('facing-use-edited').onclick=()=>{if(!current)return;current={...current,workingText:$('facing-editable-ocr').value};void translate(true)};
$('facing-mode').onchange=show;$('facing-source').onchange=()=>{sourceChosen=true;show()};$('facing-target').onchange=show;
$('facing-auto').onchange=()=>{generation++;show();};$('facing-retry').onclick=()=>void translate(true);
$('facing-smaller').onclick=()=>{font=Math.max(14,font-2);document.querySelector('.facing-texts').style.setProperty('--facing-font',font+'px');};
$('facing-larger').onclick=()=>{font=Math.min(36,font+2);document.querySelector('.facing-texts').style.setProperty('--facing-font',font+'px');};
for(const [id,action] of [['pdf-zoom-in',()=>zoom=Math.min(4,zoom+.25)],['pdf-zoom-out',()=>zoom=Math.max(.5,zoom-.25)],['pdf-zoom-fit',()=>zoom=1]])$(id).onclick=()=>{action();void renderPDF();};
let resized;window.addEventListener('resize',()=>{clearTimeout(resized);resized=setTimeout(()=>void renderPDF(),120);});
document.addEventListener('vdl:facsimile-page',e=>receive(e.detail));
if(window.VDLFacsimilePage)receive(window.VDLFacsimilePage);

document.addEventListener('vdl:facsimile-reset',()=>{generation++;pdfSerial++;current=null;output.replaceChildren();output.removeAttribute('aria-busy');if(comparedPdf){comparedPdf.remove();comparedPdf=null}if(documentNotes)documentNotes.replaceChildren();});
