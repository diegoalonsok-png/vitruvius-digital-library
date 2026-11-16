/* Parallel Palladio reading. Ware 1738 is an independently paged historical translation.
   The 1570 page is NEVER silently filled from the unrelated 1581 OCR corpus.
   Italian transcriptions saved here are user-local drafts, not published scholarship. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const isPalladio=()=>new URLSearchParams(location.search).get("obra")!=="alberti-diez-libros-1582";
let imageNumber=1,revision=0;
const KEY="vdl:palladio-italian-local-v1:";
function getDraft(n){try{return localStorage.getItem(KEY+n)||""}catch{return""}}
function saveDraft(n,value){try{if(value)localStorage.setItem(KEY+n,value);else localStorage.removeItem(KEY+n)}catch{}}
function externalLink(text,target){
 const link=$("palladio-traductor-externo");
 const url=new URL("https://translate.google.com/");
 url.searchParams.set("sl","it");url.searchParams.set("tl",target);url.searchParams.set("text",text.slice(0,4500));url.searchParams.set("op","translate");
 link.href=url.toString();link.hidden=false;
}
function resetTranslation(){
 $("palladio-resultado-traduccion").textContent="La traducción aparecerá aquí cuando haya texto italiano y un traductor disponible.";
 $("palladio-estado-traduccion").textContent="";
 $("palladio-traductor-externo").hidden=true;
}
function update(f){
 const host=$("palladio-doble-lectura");if(!host)return;
 host.hidden=!isPalladio();if(host.hidden)return;
 imageNumber=Number(f?.imagenDigital)||1;revision++;
 const folio=f?.folio?" · folio "+f.folio:"";
 const page=f?.paginaImpresa?" · pág. impresa "+f.paginaImpresa:"";
 $("palladio-doble-contexto").textContent="Imagen digital "+imageNumber+folio+page+" · 1570. Correspondencia con Ware 1738 no verificada.";
 $("palladio-italiano").value=getDraft(imageNumber);
 $("palladio-origen-transcripcion").textContent=getDraft(imageNumber)?"Borrador local introducido por el lector para la imagen "+imageNumber+". No verificado contra la edición impresa.":"Sin transcripción italiana verificada vinculada a esta imagen. No se reutiliza OCR de otra edición.";
 resetTranslation();
 const frame=host.querySelector('iframe[data-src]');
 if(frame&&!frame.getAttribute("src"))frame.src=frame.dataset.src;
}
async function translate(){
 const text=$("palladio-italiano").value.trim(),target=$("palladio-idioma-traduccion").value;
 if(!text){$("palladio-estado-traduccion").textContent="Introducí primero el texto italiano del folio; no se traducirá una página ajena.";return}
 if(text.length>15000){$("palladio-estado-traduccion").textContent="Para traducir, dividí la transcripción en fragmentos de hasta 15.000 caracteres.";return}
 const r=++revision;
 $("palladio-estado-traduccion").textContent="Comprobando traductor integrado del navegador…";
 $("palladio-resultado-traduccion").textContent="Traducción solicitada…";
 try{
  if(!("Translator" in self)||typeof self.Translator?.create!=="function")throw Error("NO_BROWSER_TRANSLATOR");
  const availability=await self.Translator.availability({sourceLanguage:"it",targetLanguage:target});
  if(availability==="unavailable")throw Error("NO_LANGUAGE_MODEL");
  if(r!==revision)return;
  const translator=await self.Translator.create({sourceLanguage:"it",targetLanguage:target});
  try{
   const result=await translator.translate(text);
   if(r!==revision)return;
   $("palladio-resultado-traduccion").textContent=result;
   $("palladio-resultado-traduccion").lang=target;
   $("palladio-estado-traduccion").textContent="Traducción automática orientativa desde el borrador italiano de esta imagen; no es una edición histórica ni un cotejo filológico.";
   $("palladio-traductor-externo").hidden=true;
  }finally{translator.destroy?.()}
 }catch(error){
  if(r!==revision)return;
  $("palladio-resultado-traduccion").textContent="El traductor local del navegador no está disponible. Usa el enlace externo si quieres traducir este texto.";
  $("palladio-estado-traduccion").textContent="No se generó una traducción en este visor. La consulta externa se abre solo al pulsar su enlace.";
  externalLink(text,target);
 }
}
function init(){
 if(!$("palladio-doble-lectura"))return;
 const input=$("palladio-italiano");
 input.addEventListener("input",()=>{
  revision++;saveDraft(imageNumber,input.value);
  $("palladio-origen-transcripcion").textContent=input.value.trim()?"Borrador local no cotejado · imagen "+imageNumber:"Sin transcripción italiana verificada vinculada a esta imagen.";
  resetTranslation();
 });
 $("palladio-idioma-traduccion").addEventListener("change",()=>{revision++;resetTranslation()});
 $("palladio-traducir").addEventListener("click",translate);
 $("palladio-limpiar").addEventListener("click",()=>{input.value="";input.dispatchEvent(new Event("input",{bubbles:true}))});
}
window.PalladioParallel=Object.freeze({update});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
