/* Traducción automática del resto de la página cuando la interfaz no está en castellano.
 * Las etiquetas con diccionario propio ya se traducen solas; este módulo completa los textos que quedan en
 * castellano (paneles, resultados, fichas) con el traductor integrado del navegador (API Translator de Chrome,
 * en el propio equipo). No traduce latín ni griego, campos de formulario ni código; al volver al castellano
 * se restaura el texto original. Si el navegador no tiene traductor, deja una nota discreta.
 */
(()=>{
 'use strict';
 if(window.PageAutoTranslate)return;
 const root=document.documentElement;
 const originals=new WeakMap(),mine=new WeakSet(),cache=new Map();
 const SKIP='script,style,noscript,textarea,input,select,option,code,pre,svg,iframe,[contenteditable],[translate=no],.notranslate,[lang="la"],[lang="grc"],[lang^="la-"],[lang="he"],[lang="arc"],.vtp-la,.latin,#ui-language';
 const ES=/\b(el|la|los|las|del|por|para|con|una|uno|como|más|pero|sus|este|esta|estos|desde|sobre|entre|también|según|hasta|donde|cuando|porque|sin|muy|edición|ediciones|libro|libros|página|páginas|fuente|fuentes|buscar|leer|consultar|traducción|obra|obras|siglo|destacado|biblioteca|documentación|carpeta|privacidad|borrar|sesión|búsqueda|dictar|explorar|universidades|investigación|fichas|secciones|lecturas|testimonios|imágenes|manuscrito|códice|códices|resultados|instalar|leer|ver|abrir|cerrar)\b/i;
 const ACC=/[áéíóúñ¿¡]/i;
 const looksSpanish=t=>{const s=t.trim();if(s.length<3||!/[a-záéíóúñ]/i.test(s))return false;const hits=(s.match(/\b(el|la|los|las|del|por|para|con|una|como|más|pero|sus|este|esta|desde|sobre|entre|también|según|sin|muy)\b/gi)||[]).length;return ES.test(s)&&(hits>=1||ACC.test(s)||s.split(/\s+/).length<=6)||(ACC.test(s)&&s.split(/\s+/).length<=4)};
 let translator=null,target='es',running=false,noted=false;
 async function getTranslator(lang){
  if(!self.Translator)return null;
  try{const av=await self.Translator.availability({sourceLanguage:'es',targetLanguage:lang});if(av==='unavailable')return null;return await self.Translator.create({sourceLanguage:'es',targetLanguage:lang})}catch{return null}
 }
 function textNodes(scope){
  const out=[];const w=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||p.closest(SKIP))return NodeFilter.FILTER_REJECT;if(mine.has(n))return NodeFilter.FILTER_REJECT;return looksSpanish(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});
  let n;while((n=w.nextNode()))out.push(n);return out;
 }
 async function translateScope(scope){
  if(target==='es'||!translator)return;
  for(const n of textNodes(scope)){
   const src=n.nodeValue;const key=target+'|'+src;
   let out=cache.get(key);
   if(out==null){try{out=await translator.translate(src.trim());cache.set(key,out)}catch{continue}}
   if(target==='es')return;
   if(!originals.has(n))originals.set(n,src);
   mine.add(n);n.nodeValue=src.replace(src.trim(),out);
  }
 }
 function restore(){
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){if(originals.has(n)){n.nodeValue=originals.get(n);originals.delete(n);mine.delete(n)}}
 }
 async function sync(){
  const lang=(root.lang||'es').slice(0,2);
  if(lang===target&&(lang==='es'||translator))return;
  target=lang;
  if(lang==='es'){translator=null;restore();return}
  restore();translator=await getTranslator(lang);
  if(!translator){if(!noted){noted=true;const p=document.createElement('p');p.id='auto-translate-note';p.style.cssText='position:fixed;left:12px;bottom:64px;z-index:50;max-width:320px;font:12px/1.4 Arial,sans-serif;background:#222;color:#eee;padding:8px 10px;border-radius:8px;opacity:.92';p.textContent=lang==='fr'?'Une partie du contenu reste en espagnol : ce navigateur n’a pas de traducteur intégré. Chrome récent le traduit automatiquement.':'Some content remains in Spanish: this browser has no built-in translator. Recent versions of Chrome translate it automatically.';document.body.append(p);setTimeout(()=>p.remove(),9000)}return}
  translateScope(document.body);
 }
 let t=0;
 new MutationObserver(recs=>{
  if(recs.some(r=>r.type==='attributes'&&r.target===root))return void sync();
  if(target==='es'||!translator)return;
  clearTimeout(t);t=setTimeout(()=>{for(const r of recs)for(const n of r.addedNodes){if(n.nodeType===1)translateScope(n);else if(n.nodeType===3&&n.parentElement&&!mine.has(n))translateScope(n.parentElement)}},250);
 }).observe(document.documentElement,{attributes:true,attributeFilter:['lang'],subtree:true,childList:true,characterData:false});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(sync,800),{once:true});else setTimeout(sync,800);
 window.PageAutoTranslate={sync,restore};
})();
