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
 // Sync both physical panes, not the nested paragraphs. Their scrollable
 // heights differ because translations and Latin/Greek text have different lengths.
 // This is reading-position correspondence, never a claim of word-level alignment.
 let linked=true,scrollFrame=0,pendingLeader=sourceContainer;
 const expectedTop=new WeakMap();
 const visible=()=>!root.classList.contains("single-source")&&
  !translationContainer.hidden&&!translationContainer.closest("[hidden]")&&
  !translationContainer.classList.contains("cl-pdf-mode");
 const scrollMax=pane=>Math.max(0,pane.scrollHeight-pane.clientHeight);
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function syncFrom(leader){
  if(!linked||!visible())return;
  pendingLeader=leader;
  if(scrollFrame)return;
  scrollFrame=requestAnimationFrame(()=>{
   scrollFrame=0;
   if(!linked||!visible())return;
   const from=pendingLeader;
   const to=from===sourceContainer?translationContainer:sourceContainer;
   const maxFrom=scrollMax(from),maxTo=scrollMax(to);
   const progress=maxFrom>0?clamp(from.scrollTop/maxFrom,0,1):0;
   const desired=Math.round(progress*maxTo);
   if(Math.abs(to.scrollTop-desired)<2)return;
   // Ignore the scroll event produced by this programmatic update, without
   // blocking genuine wheel/trackpad/touch scrolling in either reader.
   expectedTop.set(to,desired);
   to.scrollTop=desired;
  });
 }
 function onPaneScroll(event){
  const pane=event.currentTarget,expected=expectedTop.get(pane);
  if(expected!==undefined){
   expectedTop.delete(pane);
   if(Math.abs(pane.scrollTop-expected)<2)return;
  }
  syncFrom(pane);
 }
 sourceContainer.addEventListener("scroll",onPaneScroll,{passive:true});
 translationContainer.addEventListener("scroll",onPaneScroll,{passive:true});
 function resetForLocus(){
  if(!linked||!visible())return;
  // A newly selected locus must start at the beginning on BOTH sides. Without
  // this reset, the previous locus's scrollTop survives a render and yields
  // different passages on screen, especially during asynchronous translation.
  if(scrollFrame){cancelAnimationFrame(scrollFrame);scrollFrame=0}
  expectedTop.set(sourceContainer,0);
  expectedTop.set(translationContainer,0);
  sourceContainer.scrollTop=0;
  translationContainer.scrollTop=0;
  syncFrom(sourceContainer);
 }
 syncButton.setAttribute("aria-pressed","true");
 syncButton.textContent="Desplazamiento vinculado";
 syncButton.addEventListener("click",()=>{
  linked=!linked;
  syncButton.setAttribute("aria-pressed",String(linked));
  syncButton.textContent=linked?"Desplazamiento vinculado":"Desplazamiento independiente";
  syncButton.title=linked
   ?"Sincronización activada: mover cualquiera de los dos visores desplaza el otro al mismo progreso de lectura."
   :"Sincronización desactivada: cada visor se desplaza por separado.";
  if(linked)syncFrom(sourceContainer);
 });
 let lastLocus=null;
 document.addEventListener("vitruvia:classics-passage",event=>{
  const next=event.detail?.locus;
  if(!next||next===lastLocus)return;
  lastLocus=next;
  resetForLocus();
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
 // Indexed/automatic translations can arrive later than the Latin/Greek locus.
 // Once their actual content arrives, restore the original pane's reading
 // progress instead of leaving the second pane at its previous scroll offset.
 const translationLoaded=new MutationObserver(()=>syncFrom(sourceContainer));
 translationLoaded.observe(target,{childList:true,subtree:true,characterData:true});
 root.addEventListener("click",event=>{if(event.target.closest("button,summary,select"))requestAnimationFrame(align)});
 window.addEventListener("resize",align,{passive:true});
 document.addEventListener("vitruvia:classics-passage",align);
 document.addEventListener("vitruvia:language-changed",align);
 applyHeight(height);register();syncFrom(sourceContainer);
 return true;
}
function boot(){
 if(init())return;
 const observer=new MutationObserver(()=>{if(init())observer.disconnect()});
 observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
