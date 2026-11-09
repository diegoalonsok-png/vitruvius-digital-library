/* Vitruvia · private PDF text extraction in the visitor's browser.
 * Loads a pinned PDF.js display module only when the visitor asks to
 * examine a local PDF. No files or extracted passages are posted to Vitruvia.
 * Result strings exist only in caller memory until the panel is closed.
 */
(()=>{
 'use strict';
 const MODULE_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
 const WORKER_URL='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
 const MAX_PAGES=150,MAX_CHARACTERS=550000,MAX_FILE_SIZE=15*1024*1024;
 let libPromise=null;
 const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'')
  .toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 const words=s=>fold(s).split(' ').filter(x=>x.length>1);
 /* Unicode hieroglyphs in a PDF text layer are searchable. Image OCR is separate. */
 const HIEROGLYPHS=/[𓀀-𓑟]/u;
 const HIEROGLYPH_ALL=/[𓀀-𓑟]/gu;
 const CUNEIFORM=/[𒀀-𒏿𒐀-𒑿]/u;
 const CUNEIFORM_ALL=/[𒀀-𒏿𒐀-𒑿]/gu;
 function identifyScripts(pages){
  let hieroglyphPages=0,hieroglyphs=0,cuneiformPages=0,cuneiformCharacters=0;const examples=[],cuneiformExamples=[];
  for(const entry of pages||[]){
   const text=String(entry?.text||'');
   if(HIEROGLYPHS.test(text)){
    hieroglyphPages++;
    const marks=[...text.matchAll(HIEROGLYPH_ALL)];
    hieroglyphs+=marks.length;
    if(examples.length<3)examples.push({page:entry.page,sample:marks.slice(0,8).map(x=>x[0]).join('')});
   }
   if(CUNEIFORM.test(text)){
    cuneiformPages++;
    const marks=[...text.matchAll(CUNEIFORM_ALL)];
    cuneiformCharacters+=marks.length;
    if(cuneiformExamples.length<3)cuneiformExamples.push({page:entry.page,sample:marks.slice(0,8).map(x=>x[0]).join('')});
   }
  }
  return {hieroglyphPages,hieroglyphCharacters:hieroglyphs,examples,cuneiformPages,cuneiformCharacters,cuneiformExamples,
   detection:'Unicode Egyptian Hieroglyphs in extracted text layer',
   imageRecognitionPerformed:false,
   note:'Detecta jeroglíficos y signos cuneiformes Unicode extraíbles; no reconoce signos en imágenes escaneadas.'};
 }
 function search(pages,needle,{limit=30}={}){
  const query=fold(needle),qwords=[...new Set(words(needle))];
  if(!query||!qwords.length)return [];
  const out=[],max=Math.max(1,Math.min(60,Number(limit)||30));
  for(const item of pages||[]){
   const text=String(item?.text||'').replace(/\s+/g,' ').trim();
   if(!text)continue;
   // Search both exact phrase and nearby individual terms, never infer
   // semantic relevance from filename, citations or unrelated pages.
   const windowSize=360,step=235,matched=[];
   for(let start=0;start<text.length;start+=step){
    const slice=text.slice(start,start+windowSize);
    const normalized=fold(slice);
    if(!normalized)continue;
    const phrase=normalized.includes(query);
    const complete=qwords.every(w=>normalized.includes(w));
    if(!phrase&&!complete)continue;
    matched.push({page:Number(item.page)||1,excerpt:(start>0?'… ':'')+slice.trim()+
     (start+windowSize<text.length?' …':''),strength:phrase?2:1,offset:start});
    if(matched.length>=5)break;
   }
   out.push(...matched);
   if(out.length>=max*2)break;
  }
  return out.sort((a,b)=>b.strength-a.strength||a.page-b.page||a.offset-b.offset).slice(0,max);
 }
 async function loadLibrary(){
  if(!libPromise){
   libPromise=import(MODULE_URL).then(lib=>{
    if(!lib?.getDocument||!lib?.GlobalWorkerOptions)throw Error('PDF.js no disponible');
    lib.GlobalWorkerOptions.workerSrc=WORKER_URL;return lib;
   }).catch(err=>{libPromise=null;throw err});
  }
  return libPromise;
 }
 async function extract(file,{signal,onProgress,maxPages=MAX_PAGES,maxCharacters=MAX_CHARACTERS}={}){
  if(!file||!(/\.pdf$/i.test(file.name||'')||file.type==='application/pdf'))throw Error('Archivo PDF inválido');
  if(file.size>MAX_FILE_SIZE)throw Error('El PDF supera 15 MB');
  if(signal?.aborted)throw Error('Operación cancelada');
  const lib=await loadLibrary();
  if(signal?.aborted)throw Error('Operación cancelada');
  const binary=new Uint8Array(await file.arrayBuffer());
  if(signal?.aborted){binary.fill(0);throw Error('Operación cancelada')}
  let task=null,total=0,scanned=0,characters=0,pagesWithoutText=0;
  const pages=[];
  try{
   // Supplying data bytes (not a URL) is what guarantees local-only parsing.
   task=lib.getDocument({
    data:binary,stopAtErrors:false,isEvalSupported:false,
    disableFontFace:true,enableXfa:false,useSystemFonts:false
   });
   const pdf=await task.promise;
   total=pdf.numPages;
   const bound=Math.min(total,Math.min(MAX_PAGES,Math.max(1,maxPages)));
   const cap=Math.min(MAX_CHARACTERS,Math.max(5000,maxCharacters));
   for(let i=1;i<=bound&&characters<cap;i++){
    if(signal?.aborted)throw Error('Operación cancelada');
    const page=await pdf.getPage(i);
    try{
     const content=await page.getTextContent({includeMarkedContent:false});
     const raw=(content.items||[]).map(x=>typeof x.str==='string'?x.str:'').filter(Boolean).join(' ');
     const text=raw.slice(0,cap-characters);
     if(text.trim())pages.push({page:i,text});else pagesWithoutText++;
     characters+=text.length;scanned=i;
    }finally{try{page.cleanup()}catch{}}
    if(signal?.aborted)throw Error('Operación cancelada');
    if(i===1||i%5===0||i===bound)onProgress?.({page:i,total,characters});
   }
   return {
    pages,total,scanned,characters,truncated:scanned<total,
    scripts:identifyScripts(pages),
    pagesWithText:pages.length,pagesWithoutText,
    extractionMethod:'embedded-text-layer',ocrPerformed:false,
    coverage:scanned<total?'partial':pages.length===0?'no-extractable-text':pagesWithoutText?'mixed-text-and-image':'embedded-text',
    note:'PDF.js extrae texto incrustado; no realiza OCR ni cotejo paleográfico. Las páginas sin texto requieren OCR separado y verificación manual.'
   };
  }finally{
   try{await task?.destroy()}catch{}
   // If PDF.js transferred the underlying ArrayBuffer, it is detached and
   // wiping it isn't possible; destroy() still releases the worker document.
   try{if(binary.byteLength)binary.fill(0)}catch{}
  }
 }
 window.VitruviaPDFLocal={search,extract,fold,identifyScripts,MAX_PAGES,MAX_FILE_SIZE,version:'1.2-ancient-scripts-textlayer'};
})();
