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
 area.append(label,slider,value,reset);layout.append(area);
 let height=760;
 try{const stored=Number(localStorage.getItem(STORE));if(Number.isFinite(stored)&&stored>=380&&stored<=1120)height=stored}catch{}
 function applyHeight(n){
  height=Math.max(380,Math.min(1120,Math.round(n/20)*20));
  slider.value=String(height);value.textContent=height+" px";
  root.style.setProperty("--cl-study-height",height+"px");
  try{localStorage.setItem(STORE,String(height))}catch{}
  align();
 }
 let frame=0;
 function align(){
  if(frame)cancelAnimationFrame(frame);
  frame=requestAnimationFrame(()=>{
   frame=0;
   source.style.marginTop="0px";target.style.marginTop="0px";
   if(root.classList.contains("single-source")||window.matchMedia("(max-width:900px)").matches||target.closest("[hidden]"))return;
   const a=source.getBoundingClientRect().top,b=target.getBoundingClientRect().top;
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
 const sourceContainer=root.querySelector(".cl-source-column");
 const translationContainer=root.querySelector(".cl-translation-column");
 function register(){trackAbove(sourceContainer,source);trackAbove(translationContainer,target);align()}
 const mutation=new MutationObserver(register);
 mutation.observe(sourceContainer,{childList:true});
 mutation.observe(translationContainer,{childList:true});
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
