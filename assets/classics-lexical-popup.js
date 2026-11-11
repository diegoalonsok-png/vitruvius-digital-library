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
const targetRoot=passages||classicalOriginal||document;
const lexicon=window.ClassicalLexicon;
if((!passages&&!inLexiconViewer&&!inClassicalReader)||!lexicon)return;
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
  // Bibliotheca uses the curated Etymologicum JSON: show that lightweight
  // entry first, without waiting for corpus morphology, Wiktionary, or translation.
  // Prefer the dictionary already resident in the Lexicon corpus index.
  // A detailed dictionary is deliberately opt-in: loading it on every word
  // click caused multi-second stalls, particularly on first access.
  const fast=window.VitruviaLexicon?.quickWord?.(word,lang);
  if(fast?.gloss){
   const quick=el("section",null,"cl-popup-quick");
   quick.append(el("h3","Significado · diccionario del corpus"));
   quick.append(el("p",fast.lemma||word,"cl-popup-quick-lemma"));
   quick.append(el("p",fast.gloss));
   contents.insertBefore(quick,slot);
   status.textContent="Definición local disponible. Análisis completo opcional.";
  }
  const quickTask=fastEntry(word,lang).then(quick=>{
   if(id!==current||!quick)return;
   const prior=contents.querySelector(".cl-popup-quick");
   if(!prior)contents.insertBefore(quick,slot);
  }).catch(()=>{});
  const detail=el("button","Cargar análisis morfológico completo","cl-popup-detail-button");
  detail.type="button";
  detail.addEventListener("click",async()=>{
   if(id!==current)return;
   detail.disabled=true;detail.textContent="Consultando morfología…";
   try{
    await lexicon.renderPanel(slot,word,{lang,work:edition,online:false});
    if(id!==current)return;
    status.remove();detail.remove();
    const glosses=[...slot.querySelectorAll(".cl-entry .cl-gloss")].map(x=>x.textContent.trim()).filter(Boolean).join(" · ").slice(0,1050);
    if(glosses&&window.VitruviaInlineTranslation?.attach){
     const glossNode=el("p",glosses,"cl-popup-note");glossNode.lang=glosses.startsWith("Castellano:")?"es":"en";
     const wrapper=el("section",null,"cl-popup-gloss-translation");
     wrapper.append(el("h3","Traducción orientativa de la explicación lexicográfica"),glossNode);
     contents.insertBefore(wrapper,contents.querySelector(".cl-popup-media"));
     window.VitruviaInlineTranslation.attach(glossNode,{sourceLanguage:glossNode.lang,originalText:glosses});
    }
   }catch{
    if(id!==current)return;
    status.textContent="No se pudo cargar la morfología. Consulte los enlaces externos.";
    detail.disabled=false;detail.textContent="Reintentar análisis";
   }
  });
  contents.insertBefore(detail,contents.querySelector(".cl-popup-media"));
  void quickTask;

 }catch{
  if(id===current)status.textContent="No se pudo recuperar el diccionario rápido; los enlaces siguen disponibles.";
 }
}
const markSelector=passages?"mark.cl-hit,mark.cl-parallel-hit":
 inClassicalReader?".txt mark":
 "#lx-viewer .lx-viewer-origin mark.w,#lx-viewer .lx-viewer-col mark.w,.lx-hit .lx-kwic mark.w,.lx-hit .lx-passage mark.w";
function markOf(target){
 return target instanceof Element?target.closest(markSelector):null;
}
targetRoot.addEventListener("click",event=>{
 const mark=markOf(event.target);
 if(!mark||!targetRoot.contains(mark)||!supported.has(langCode(mark)))return;
 // The original reader's general word-click handler remains available on
 // unhighlighted text. Highlighted terms use this self-contained viewer.
 event.preventDefault();
 if(inLexiconViewer||inClassicalReader){
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
 event.preventDefault();event.stopImmediatePropagation();
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