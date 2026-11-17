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
 // Editorial tools belong in a collapsible strip above BOTH texts, never
 // inside only the Latin column where they offset its first line.
 const sourceHeader=sourceContainer.querySelector(".cl-pane-title");
 const translationHeader=translationContainer.querySelector(".cl-pane-title");
 const toolsFold=document.createElement("details");
 toolsFold.className="cl-annotation-tools-fold";
 const toolsSummary=document.createElement("summary");
 toolsSummary.textContent="Marcas, lupa y colores · herramientas de ambos textos";
 const toolsContent=document.createElement("div");toolsContent.className="cl-annotation-tools-content";
 toolsFold.append(toolsSummary,toolsContent);
 layout.append(toolsFold);
 function relocateReadingControls(){
  const sourceBar=sourceContainer.querySelector(".vdl-annotation-bar");
  if(sourceBar)toolsContent.append(sourceBar);
  const hitNav=sourceContainer.querySelector("#hit-nav");
  if(hitNav)toolsContent.append(hitNav);
  const translationBar=translationContainer.querySelector(".cl-translation-annotations");
  if(translationBar)toolsContent.append(translationBar);
  // The inline locus is preserved for references, selection and screen readers,
  // but the repeated visible label must not add a line above the Latin text.
  const originalLocus=source.querySelector(".locus")?.textContent?.trim();
  const translatedLocus=translationContainer.querySelector(".cl-translation-label")?.textContent?.trim();
  if(sourceHeader){
   const base=sourceHeader.dataset.baseHeading||sourceHeader.textContent.split(" · Locus ")[0];
   sourceHeader.dataset.baseHeading=base;
   const headingText=base+(originalLocus?" · "+originalLocus:"");
   if(sourceHeader.textContent!==headingText)sourceHeader.textContent=headingText;
  }
  if(translationHeader){
   const headingText="Traducción"+(translatedLocus&&/Locus\s/i.test(translatedLocus)?" · "+translatedLocus:"");
   if(translationHeader.textContent!==headingText)translationHeader.textContent=headingText;
  }
 }
 // Called only when passage content or the original annotation component changes.
 // Moving nodes out of their source panel causes at most one extra observation.
 const toolWatcher=new MutationObserver(relocateReadingControls);
 toolWatcher.observe(sourceContainer,{childList:true,subtree:true});
 toolWatcher.observe(translationContainer,{childList:true,subtree:true});
 relocateReadingControls();

 function updateSharedPalette(){
  const styles=article?.style;
  const bg=styles?.getPropertyValue("--reader-bg")?.trim()||"#18191b";
  const fg=styles?.getPropertyValue("--reader-fg")?.trim()||"#e5e5e5";
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
 // Both first paragraphs now occupy the same vertical position because the
 // original-only controls and duplicate locus are outside the reading panes.
 // Keep this lightweight update for asynchronous source/translation changes.
 let frame=0;
 function align(){
  if(frame)cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{
   frame=0;
   source.style.marginTop="0px";
   target.style.marginTop="0px";
   relocateReadingControls();
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
