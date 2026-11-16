/* Symmetric reading layout, adapted from Scriptorium's measured alignment.
   Updates presentation only. The original and translated text remain separate,
   and each side retains its own zoom, marks and locus navigation. */
(()=>{"use strict";
const STORE="vdl:classics:reading-height";
function init(){
 const root=document.querySelector(".cl-dual-reader");
 const layout=document.querySelector(".cl-edition-layout");
 if(!root||!layout||layout.querySelector(".cl-reading-height-control"))return false;
 const source=root.querySelector(".cl-source-column #passages");
 const target=root.querySelector(".cl-translation-column .cl-translation-output");
 if(!source||!target)return false;
 const area=document.createElement("div");area.className="cl-reading-height-control";
 const label=document.createElement("label");label.textContent="Altura de los dos visores";
 const slider=document.createElement("input");slider.type="range";slider.min="380";slider.max="1120";slider.step="20";
 slider.setAttribute("aria-label","Altura común de texto original y traducción");
 const value=document.createElement("output");value.setAttribute("aria-live","off");
 const reset=document.createElement("button");reset.type="button";reset.textContent="Restablecer";
 const syncButton=document.createElement("button");syncButton.type="button";syncButton.textContent="Desplazamiento vinculado";
 syncButton.setAttribute("aria-pressed","true");syncButton.title="Al desplazarse por una columna, acompaña el texto de la otra según la posición relativa; no representa alineación filológica exacta.";
 const expandButton=document.createElement("button");expandButton.type="button";expandButton.textContent="⛶ Ampliar lectores";
 expandButton.setAttribute("aria-pressed","false");expandButton.setAttribute("aria-label","Ampliar lectores a toda la pantalla");
 area.append(label,slider,value,reset,syncButton,expandButton);layout.append(area);
 // Share the original reader's CURRENT palette; never force a second,
 // conflicting background on an editorial translation.
 const article=root.closest(".reader");
 const sourceContainer=root.querySelector(".cl-source-column");
 const translationContainer=root.querySelector(".cl-translation-column");
 function updateSharedPalette(){
  const styles=article?.style;
  const bg=styles?.getPropertyValue("--reader-bg")?.trim()||"#fffdf7";
  const fg=styles?.getPropertyValue("--reader-fg")?.trim()||"#202b35";
  if(!/^#[0-9a-f]{6}$/i.test(bg)||!/^#[0-9a-f]{6}$/i.test(fg))return;
  root.style.setProperty("--cl-shared-bg",bg);
  root.style.setProperty("--cl-shared-fg",fg);
 }
 if(article){
  new MutationObserver(updateSharedPalette).observe(article,{attributes:true,attributeFilter:["style"]});
  updateSharedPalette();
 }
 // A relative-height synchronization is appropriate for independent automatic
 // translation, which can be longer/shorter than the Latin or Greek original.
 let linked=true, scrollFrame=0, moving=false;
 const syncTo=(from,to)=>{
  if(!linked||moving||root.classList.contains("single-source")||to.hidden||to.closest("[hidden]"))return;
  if(scrollFrame)cancelAnimationFrame(scrollFrame);
  scrollFrame=requestAnimationFrame(()=>{
   scrollFrame=0;
   const fromMax=Math.max(0,from.scrollHeight-from.clientHeight);
   const toMax=Math.max(0,to.scrollHeight-to.clientHeight);
   const fraction=fromMax?from.scrollTop/fromMax:0;
   const wanted=fraction*toMax;
   if(Math.abs(to.scrollTop-wanted)<2)return;
   moving=true;
   to.scrollTop=wanted;
   requestAnimationFrame(()=>{moving=false});
  });
 };
 sourceContainer.addEventListener("scroll",()=>syncTo(sourceContainer,translationContainer),{passive:true});
 translationContainer.addEventListener("scroll",()=>syncTo(translationContainer,sourceContainer),{passive:true});
 syncButton.addEventListener("click",()=>{
  linked=!linked;syncButton.setAttribute("aria-pressed",String(linked));
  syncButton.textContent=linked?"Desplazamiento vinculado":"Desplazamiento independiente";
  if(linked)syncTo(sourceContainer,translationContainer);
 });
 function setExpanded(enabled){
  document.documentElement.classList.toggle("cl-biblio-expanded",enabled);
  expandButton.setAttribute("aria-pressed",String(enabled));
  expandButton.setAttribute("aria-label",enabled?"Salir de lectura ampliada":"Ampliar lectores a toda la pantalla");
  expandButton.textContent=enabled?"⤢ Salir de pantalla amplia":"⛶ Ampliar lectores";
  document.body.style.overflow=enabled?"hidden":"";
  requestAnimationFrame(align);
 }
 expandButton.addEventListener("click",()=>setExpanded(!document.documentElement.classList.contains("cl-biblio-expanded")));
 document.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&document.documentElement.classList.contains("cl-biblio-expanded"))setExpanded(false);
 });
  let height=760;
 try{const stored=Number(localStorage.getItem(STORE));if(Number.isFinite(stored)&&stored>=380&&stored<=1120)height=stored}catch{}
 function applyHeight(n){
  height=Math.max(380,Math.min(1120,Math.round(n/20)*20));
  slider.value=String(height);value.textContent=height+" px";
  root.style.setProperty("--cl-study-height",height+"px");
  try{localStorage.setItem(STORE,String(height))}catch{}
  align();
 }
 // Align the FIRST LINE OF TEXT, not the outer passage boxes. The source
 // has an additional locus label and annotation controls which otherwise leave
 // one or two lines of visual offset against the translated paragraph.
 let frame=0;
 function textFirstLineTop(element){
  if(!element)return null;
  const range=document.createRange();
  range.selectNodeContents(element);
  const rects=range.getClientRects();
  if(rects.length){
   for(const rect of rects)if(rect.height>0&&rect.width>0)return rect.top;
  }
  return element.getBoundingClientRect().top;
 }
 function align(){
  if(frame)cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{
   frame=0;
   source.style.marginTop="0px";target.style.marginTop="0px";
   if(root.classList.contains("single-source")||window.matchMedia("(max-width:900px)").matches||target.closest("[hidden]"))return;
   const sourceText=source.querySelector("p > span:not(.locus)")||source.querySelector("p");
   const translatedText=target.querySelector("p:not(.cl-caution)")||target;
   const a=textFirstLineTop(sourceText),b=textFirstLineTop(translatedText);
   if(a===null||b===null)return;
   // Only positive spacing: we never pull either passage under its controls.
   const common=Math.max(a,b);
   source.style.marginTop=Math.max(0,Math.round(common-a))+"px";
   target.style.marginTop=Math.max(0,Math.round(common-b))+"px";
  });
 }
 slider.addEventListener("input",()=>applyHeight(Number(slider.value)));
 reset.addEventListener("click",()=>applyHeight(760));
 const watched=new WeakSet();
 const ro=typeof ResizeObserver!=="undefined"?new ResizeObserver(align):null;
 function trackAbove(container,element){
  for(const child of container.children){
   if(child===element)break;
   if(ro&&!watched.has(child)){watched.add(child);ro.observe(child)}
  }
 }
 function register(){trackAbove(sourceContainer,source);trackAbove(translationContainer,target);align()}
 const mutation=new MutationObserver(register);
 mutation.observe(sourceContainer,{childList:true});
 mutation.observe(translationContainer,{childList:true});
 // Translation often arrives asynchronously. Re-align after its actual first
 // paragraph is rendered, and when the Latin original changes locus.
 const readingMutation=new MutationObserver(align);
 readingMutation.observe(source,{childList:true,subtree:true,characterData:true});
 readingMutation.observe(target,{childList:true,subtree:true,characterData:true});
 root.addEventListener("click",event=>{if(event.target.closest("button,summary,select"))requestAnimationFrame(align)});
 window.addEventListener("resize",align,{passive:true});
 document.addEventListener("vitruvia:classics-passage",align);
 document.addEventListener("vitruvia:language-changed",align);
 applyHeight(height);register();
 return true;
}
function boot(){
 if(init())return;
 const observer=new MutationObserver(()=>{if(init())observer.disconnect()});
 observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
