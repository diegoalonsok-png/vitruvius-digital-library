/* Lexicon · contextual dictionary viewer for highlighted original words.
 * Uses the site's documented ClassicalLexicon lookup; only verified local
 * historical imagery is embedded, otherwise links to an image catalogue.
 */
(()=>{
"use strict";
const passages=document.getElementById("passages");
const inLexiconViewer=!passages&&!!document.getElementById("lx-results");
const classicalOriginal=document.getElementById("original");
const inClassicalReader=!passages&&!inLexiconViewer&&!!classicalOriginal;
const bibliographyRoot=document.getElementById("result");
const inBibliotheca=!passages&&!inLexiconViewer&&!inClassicalReader&&!!document.getElementById("classic-results");
const targetRoot=passages||classicalOriginal||(inBibliotheca?bibliographyRoot:document);
const lexicon=window.ClassicalLexicon;
if((!passages&&!inLexiconViewer&&!inClassicalReader&&!inBibliotheca)||!lexicon)return;
const classicalWorkIds={
 "stoa0079.stoa001":"cato-agricultura",
 "phi0845.phi002":"columella-rustica",
 "ll.varro-rustica":"varro-rustica",
 "ll.frontinus":"frontinus-aquaeductu",
 "phi0474.phi055":"cicero-officiis",
 "phi0448.phi001":"caesar-gallico",
 "phi0550.phi001":"lucretius",
 "phi0690.phi002":"virgil-georgica",
 "phi0690.phi003":"virgil-aeneid",
 "phi1212.phi002":"apuleius-metamorphoses",
 "phi0472.phi001":"catullus-carmina",
 "phi0972.phi001":"petronius-satyrica",
 "phi0978.phi001":"pliny-naturalis",
 "tlg0093.tlg009":"theophrastus-characters",
 "tlg0059.tlg002":"plato-apology",
 "tlg0086.tlg034":"aristotle-poetics"
};

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
let quickLexiconPromise=null;
function quickLexicon(){
 if(!quickLexiconPromise)quickLexiconPromise=fetch("data/lexicon/etymologicum.json",{cache:"force-cache"})
  .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(j=>Array.isArray(j.entries)?j.entries:[])
  .catch(err=>{quickLexiconPromise=null;throw err});
 return quickLexiconPromise;
}
function fastEntry(word,lang){
 return quickLexicon().then(entries=>{
  const key=fold(word),entry=entries.find(e=>(e.l===lang)&&[e.lemma,e.id,e.head].some(v=>fold(v||"")===key));
  if(!entry)return null;
  const section=el("section",null,"cl-popup-quick");
  section.append(el("h3","Diccionario académico · ficha editorial"));
  section.append(el("p",entry.lemma||word,"cl-popup-quick-lemma"));
  if(entry.pos||entry.morph)section.append(el("p",[entry.pos,entry.morph].filter(Boolean).join(" · "),"cl-popup-note"));
  for(const sense of (entry.sens||[]).slice(0,5))section.append(el("p",sense));
  if(entry.etym)section.append(el("p","Etimología: "+entry.etym,"cl-popup-note"));
  return section;
 });
}

const langCode=mark=>{
 const code=passages?.getAttribute("lang")||mark?.closest("[lang]")?.getAttribute("lang")||"";
 if(code==="el")return "grc";
 return inBibliotheca&&!supported.has(code)?lexicon.detectLang(mark?.textContent):code;
};
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
async function openMark(mark,explicitWord){
 const openedAt=performance.now();
 const lang=langCode(mark);
 if(!supported.has(lang))return;
 const word=explicitWord||lexicon.wordOfMark(mark)||mark.textContent?.trim();
 if(!word||!/^[\p{L}\p{M}ʼ’'-]{2,80}$/u.test(word))return;
 const id=++current;
 delete root.dataset.readyMs;
 lastFocus=mark;
 title.textContent=word;
 const slot=el("div",null,"cl-popup-dictionary");
 const status=el("p","Cargando la ficha del diccionario local…","cl-popup-note");
 // Paint a useful panel synchronously, even while large lexica load.
 contents.replaceChildren(slot,status,historicalMedia(word),linksFor(word,lang));
 if(!root.open)root.showModal();
 close.focus();
 try{
  const params=new URLSearchParams(location.search);
  const edition=mark.closest("[data-work]")?.getAttribute("data-work")||
   params.get("work")||classicalWorkIds[params.get("obra")]||"";
  // Resolve the exact highlighted form from attested local dictionaries only.
  // Rendering is asynchronous: the modal appears immediately, without an
  // external lookup or blocking the reader. The cache shares repeated clicks.
  const lookupTask=lexicon.renderPanel(slot,word,{lang,work:edition,online:false})
   .then(result=>{
    if(id!==current)return;
    status.textContent=result?.entries?.length
     ?"Diccionario local · lema, glosas y fuentes documentadas."
     :"Forma documentada en el pasaje; no se recuperó una glosa local para esta flexión.";
    root.dataset.readyMs=String(Math.round(performance.now()-openedAt));
   }).catch(()=>{
    if(id===current)status.textContent="No se pudo cargar el glosario local. Los enlaces académicos siguen disponibles.";
   });
  // The concise curated etymological entry is supplementary, never a
  // substitute for the actual lemma and its local source attribution.
  const editorialTask=fastEntry(word,lang).then(quick=>{
   if(id!==current||!quick||contents.querySelector(".cl-popup-quick"))return;
   contents.insertBefore(quick,slot);
  }).catch(()=>{});
  void lookupTask;
  void editorialTask;

 }catch{
  if(id===current)status.textContent="No se pudo recuperar el diccionario rápido; los enlaces siguen disponibles.";
 }
}
const markSelector=inBibliotheca?"#classic-results mark,#bibliotheca-docx-results mark":passages?"mark.cl-hit,mark.cl-parallel-hit":
 inClassicalReader?".txt mark":
 "#lx-viewer .lx-viewer-origin .w,#lx-viewer .lx-viewer-col .w,.lx-hit .lx-kwic .w,.lx-hit .lx-passage .w";
function markOf(target){
 return target instanceof Element?target.closest(markSelector):null;
}
function showInlineLexicon(mark){
 if(!passages)return;
 const box=document.getElementById("lexicon");
 const word=lexicon.wordOfMark(mark)||mark.textContent?.trim();
 if(!box||!word)return;
 const query=new URLSearchParams(location.search);
 const work=mark.closest("[data-work]")?.getAttribute("data-work")||query.get("work")||"";
 void lexicon.renderPanel(box,word,{lang:langCode(mark),work,online:false});
}
targetRoot.addEventListener("click",event=>{
 // An ordinary click on ANY Latin or Greek word opens the same scholarly
 // dictionary popup used by highlighted search hits, also inside parallel iframes.
 // Do not intercept navigation, inline translation controls or other widgets.
 const mark=markOf(event.target);
 const selection=window.getSelection?.();
 if(selection&&!selection.isCollapsed&&selection.toString().trim())return;
 if(!mark && passages && targetRoot.contains(event.target)){
  if(event.target.closest?.("a,button,input,select,textarea,summary,[data-no-dictionary],.cl-ui,.cl-dict"))return;
  if(!supported.has(langCode(passages)))return;
  const word=lexicon.wordAt(event);
  if(!word||! /^[\p{L}\p{M}ʼ’-]{2,80}$/u.test(word))return;
  event.preventDefault();
  event.stopImmediatePropagation(); // Prevent competing inline panel or another popup.
  void openMark(passages,word);
  return;
 }
 if(!mark||!targetRoot.contains(mark)||!supported.has(langCode(mark)))return;
 // The original reader's general word-click handler remains available on
 // unhighlighted text. Highlighted terms use this self-contained viewer.
 event.preventDefault();
 if(passages){
  // Own the highlighted click and paint both dictionaries from the same
  // entire original word; the generic wordAt handler can select a neighbour.
  event.stopImmediatePropagation();
  showInlineLexicon(mark);
  void openMark(mark);
 }else if(inBibliotheca){
  // Concordance hits have the native four-action cited dictionary.
  // Uploaded DOCX text has no native panel and must keep its classical popup.
  if(mark.closest("#classic-results"))return;
  event.stopImmediatePropagation();
  void openMark(mark);
 }else if(inLexiconViewer||inClassicalReader){
  // These readers already have link/navigation or small lexical popups:
  // yellow-word clicks open the larger viewer without competing overlays.
  event.stopImmediatePropagation();
  void openMark(mark);
 }else{
  // Single owner for highlighted-word clicks. The general wordAt handler can
  // otherwise race with this modal and overwrite the inline dictionary with
  // a neighbouring word; openMark renders both panels from the same lemma.
  event.stopImmediatePropagation();
  void openMark(mark);
 }
},true);
targetRoot.addEventListener("keydown",event=>{
 if(event.key!=="Enter"&&event.key!==" ")return;
 const mark=markOf(event.target);
 if(!mark||!supported.has(langCode(mark)))return;
 if(inBibliotheca&&mark.closest('#classic-results'))return; // Native concordance dictionary owns this keypress.
 event.preventDefault();
 event.stopImmediatePropagation();
 showInlineLexicon(mark);
 void openMark(mark);
},true);
function prepareMark(mark){
 if(mark.dataset.clPopupReady==="1")return;
 mark.dataset.clPopupReady="1";
 mark.tabIndex=0;mark.setAttribute("role","button");
 mark.setAttribute("aria-label","Consultar lema y significado de "+(lexicon.wordOfMark(mark)||mark.textContent));
 mark.title="Abrir ficha de la palabra";
}
function prepareMarks(node){
 if(!(node instanceof Element||node instanceof Document||node instanceof DocumentFragment))return;
 if(node instanceof Element&&node.matches(markSelector))prepareMark(node);
 for(const mark of node.querySelectorAll(markSelector))prepareMark(mark);
}
// Process only newly inserted subtrees instead of scanning the entire Lexicon
// after every progress paint, popup update, or translation insertion.
const observer=new MutationObserver(records=>{
 for(const record of records)
  for(const node of record.addedNodes)prepareMarks(node);
});
observer.observe(targetRoot,{childList:true,subtree:true});
prepareMarks(targetRoot);
window.VitruviaClassicalWordPopup=Object.freeze({openMark,dismiss});
})();
