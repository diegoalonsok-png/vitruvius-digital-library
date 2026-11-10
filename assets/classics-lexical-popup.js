/* Lexicon · contextual dictionary viewer for highlighted original words.
 * Uses the site's documented ClassicalLexicon lookup; only verified local
 * historical imagery is embedded, otherwise links to an image catalogue.
 */
(()=>{
"use strict";
const passages=document.getElementById("passages");
const inLexiconViewer=!passages&&!!document.getElementById("lx-results");
const targetRoot=passages||document;
const lexicon=window.ClassicalLexicon;
if((!passages&&!inLexiconViewer)||!lexicon)return;

const imageCatalog={
 domus:{
  source:"https://commons.wikimedia.org/wiki/File:Atrium_with_impluvium_in_the_House_of_the_Vetti_Pompeii.jpg",
  image:"https://commons.wikimedia.org/wiki/Special:FilePath/Atrium%20with%20impluvium%20in%20the%20House%20of%20the%20Vetti%20Pompeii.jpg?width=760",
  caption:"Ejemplo material: atrio con impluvium de la Casa de los Vettii, Pompeya. No representa todas las acepciones de domus.",
  credit:"Mary Harrsch · Wikimedia Commons · CC BY-SA 4.0"
 },
 atrium:{
  source:"https://commons.wikimedia.org/wiki/File:Atrium_with_impluvium_in_the_House_of_the_Vetti_Pompeii.jpg",
  image:"https://commons.wikimedia.org/wiki/Special:FilePath/Atrium%20with%20impluvium%20in%20the%20House%20of%20the%20Vetti%20Pompeii.jpg?width=760",
  caption:"Atrio con impluvium de la Casa de los Vettii (Pompeya), ejemplo arqueológico del espacio doméstico romano.",
  credit:"Mary Harrsch · Wikimedia Commons · CC BY-SA 4.0"
 },
 impluvium:{
  source:"https://commons.wikimedia.org/wiki/File:Atrium_with_impluvium_in_the_House_of_the_Vetti_Pompeii.jpg",
  image:"https://commons.wikimedia.org/wiki/Special:FilePath/Atrium%20with%20impluvium%20in%20the%20House%20of%20the%20Vetti%20Pompeii.jpg?width=760",
  caption:"Impluvium en el atrio de la Casa de los Vettii (Pompeya). Testimonio material, no reconstrucción hipotética.",
  credit:"Mary Harrsch · Wikimedia Commons · CC BY-SA 4.0"
 }
};
const root=document.createElement("dialog");
root.id="classics-lexical-popup";
root.className="classics-lexical-popup";
root.setAttribute("aria-labelledby","classics-lexical-popup-title");
root.innerHTML='<header class="cl-popup-head"><div><p class="cl-popup-kicker">VITRUVIA LEXICON · LECTURA FILOLÓGICA</p><h2 id="classics-lexical-popup-title">Palabra del texto</h2></div><button type="button" class="cl-popup-close" aria-label="Cerrar ficha léxica">Cerrar ×</button></header><div class="cl-popup-content"></div>';
document.body.append(root);
const title=root.querySelector("#classics-lexical-popup-title");
const contents=root.querySelector(".cl-popup-content");
const close=root.querySelector(".cl-popup-close");
let current=0,lastFocus=null;
const supported=new Set(["la","grc"]);
const langCode=mark=>passages?.getAttribute("lang")||
 mark?.closest("[lang]")?.getAttribute("lang")||"";
const fold=word=>lexicon.fold(word).replace(/[^\p{L}\p{N}]/gu,"");
function el(tag,text,className){
 const node=document.createElement(tag);
 if(text!=null)node.textContent=text;
 if(className)node.className=className;
 return node;
}
function dismiss(){
 current++;
 if(root.open)root.close();
 if(lastFocus?.isConnected&&typeof lastFocus.focus==="function")lastFocus.focus({preventScroll:true});
}
close.addEventListener("click",dismiss);
root.addEventListener("click",event=>{if(event.target===root)dismiss()});
root.addEventListener("close",()=>{current++});
function historicalMedia(word){
 const key=fold(word);
 const item=imageCatalog[key];
 const section=el("section",null,"cl-popup-media");
 const header=el("h3",item?"Testimonio material documentado":"Imágenes históricas y arqueológicas");
 section.append(header);
 if(item){
  const figure=el("figure");
  const picture=document.createElement("img");
  picture.src=item.image;
  picture.alt=item.caption;
  picture.loading="lazy";
  picture.addEventListener("error",()=>picture.remove(),{once:true});
  figure.append(picture);
  figure.append(el("figcaption",item.caption+" "+item.credit));
  const source=el("a","Consultar imagen original, autoría y licencia ↗");
  source.href=item.source;source.target="_blank";source.rel="noopener noreferrer";
  figure.append(source);section.append(figure);
 }else{
  section.append(el("p","No hay una imagen histórica verificada para esta palabra en el catálogo local. No se asocia automáticamente una imagen que podría representar otro objeto o período.","cl-popup-note"));
 }
 const search=el("a","Buscar imágenes catalogadas en Wikimedia Commons ↗");
 search.href="https://commons.wikimedia.org/w/index.php?title=Special:MediaSearch&type=image&search="+encodeURIComponent(word);
 search.target="_blank";search.rel="noopener noreferrer";search.className="cl-popup-commons";
 section.append(search);
 return section;
}
function linksFor(word,lang){
 const nav=el("nav",null,"cl-popup-navigation");
 nav.setAttribute("aria-label","Herramientas filológicas");
 const reference=el("a","Abrir análisis completo en Vitruvia Lexicon ↗");
 reference.href="vitruvia-lexicon.html?q="+encodeURIComponent(word)+"&mode=palabra&lang="+encodeURIComponent(lang);
 reference.target="_blank";reference.rel="noopener noreferrer";
 nav.append(reference);
 return nav;
}
async function openMark(mark){
 const lang=langCode(mark);
 if(!supported.has(lang))return;
 const word=lexicon.wordOfMark(mark)||mark.textContent?.trim();
 if(!word||!/^[\p{L}\p{M}ʼ’'-]{2,80}$/u.test(word))return;
 const id=++current;
 lastFocus=mark;
 title.textContent=word;
 contents.replaceChildren(el("p","Consultando el diccionario de la edición…","cl-popup-note"));
 if(!root.open)root.showModal();
 close.focus();
 const slot=el("div",null,"cl-popup-dictionary");
 contents.replaceChildren(slot);
 try{
  const edition=mark.closest("[data-work]")?.getAttribute("data-work")||
   new URLSearchParams(location.search).get("work")||"";
  await lexicon.renderPanel(slot,word,{lang,work:edition,online:true});
  if(id!==current)return;
  contents.append(historicalMedia(word),linksFor(word,lang));
 }catch{
  if(id!==current)return;
  slot.replaceChildren(el("p","No se pudo consultar el diccionario en este momento. Se mantienen disponibles las referencias externas.","cl-popup-note"));
  contents.append(linksFor(word,lang));
 }
}
const markSelector=passages?"mark.cl-hit,mark.cl-parallel-hit":
 "#lx-viewer .lx-viewer-origin mark.w,#lx-viewer .lx-viewer-col mark.w";
function markOf(target){
 return target instanceof Element?target.closest(markSelector):null;
}
targetRoot.addEventListener("click",event=>{
 const mark=markOf(event.target);
 if(!mark||!targetRoot.contains(mark)||!supported.has(langCode(mark)))return;
 // The original reader's general word-click handler remains available on
 // unhighlighted text. Highlighted terms use this self-contained viewer.
 event.preventDefault();
 if(inLexiconViewer){
  // In the outer Lexicon dialog, suppress competing page navigation.
  event.stopImmediatePropagation();
  void openMark(mark);
 }else{
  // Let the existing in-passage dictionary click handler run first while
  // coordinates still refer to this word. Then open the expanded lexical view.
  queueMicrotask(()=>{if(mark.isConnected)void openMark(mark)});
 }
},true);
targetRoot.addEventListener("keydown",event=>{
 if(event.key!=="Enter"&&event.key!==" ")return;
 const mark=markOf(event.target);
 if(!mark||!supported.has(langCode(mark)))return;
 event.preventDefault();event.stopImmediatePropagation();
 void openMark(mark);
},true);
function prepareMarks(){
 for(const mark of targetRoot.querySelectorAll(markSelector)){
  mark.tabIndex=0;mark.setAttribute("role","button");
  mark.setAttribute("aria-label","Consultar lema y significado de "+(lexicon.wordOfMark(mark)||mark.textContent));
  mark.title="Abrir ficha de la palabra";
 }
}
const observer=new MutationObserver(prepareMarks);
observer.observe(targetRoot,{childList:true,subtree:true});
prepareMarks();
window.VitruviaClassicalWordPopup=Object.freeze({openMark,dismiss});
})();