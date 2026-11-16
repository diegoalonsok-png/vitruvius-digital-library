/* Equal top alignment and user-resizable heights for the three Scriptorium
   reading panes. Presentation only; text, loci and PDF mappings are untouched. */
(()=>{"use strict";
const STORAGE="vdl-scriptorium-reading-height";
function init(){
 const root=document.querySelector("#script-triple");
 const grid=root?.querySelector(".script-triple-grid");
 const toolbar=root?.querySelector(".script-triple-sync");
 if(!root||!grid||!toolbar||toolbar.querySelector(".script-reader-height-control"))return false;
 const wrapper=document.createElement("label");
 wrapper.className="script-reader-height-control";
 const label=document.createElement("span");label.textContent="Altura de los tres visores";
 const range=document.createElement("input");range.type="range";range.min="380";range.max="1120";range.step="20";range.setAttribute("aria-label","Ajustar altura de lectura en píxeles");
 const output=document.createElement("output");
 const reset=document.createElement("button");reset.type="button";reset.textContent="Restablecer";reset.title="Restablecer la altura original ampliada";
 let current=760;
 try{const stored=Number(localStorage.getItem(STORAGE));if(Number.isFinite(stored)&&stored>=380&&stored<=1120)current=stored}catch{}
 function setHeight(value){
  current=Math.max(380,Math.min(1120,Math.round(value/20)*20));
  range.value=String(current);output.textContent=current+" px";
  root.style.setProperty("--script-reader-height",current+"px");
  try{localStorage.setItem(STORAGE,String(current))}catch{}
 }
 range.addEventListener("input",()=>setHeight(Number(range.value)));
 reset.addEventListener("click",()=>{
  for(const text of grid.querySelectorAll(".script-triple-text"))text.style.height="";
  setHeight(760);
 });
 wrapper.append(label,range,output,reset);toolbar.append(wrapper);setHeight(current);
 let request=0;
 function align(){
  if(request)cancelAnimationFrame(request);
  request=requestAnimationFrame(()=>{
   request=0;
   const surfaces=[...grid.querySelectorAll(".script-triple-pane > .script-triple-reading-surface")];
   if(surfaces.length!==3)return;
   // Always clear old spacers first, especially after pane reordering or reflow.
   for(const el of surfaces)el.style.marginTop="0px";
   if(matchMedia("(max-width:1050px)").matches)return;
   const tops=surfaces.map(el=>el.getBoundingClientRect().top);
   const baseline=Math.max(...tops);
   surfaces.forEach((el,i)=>{el.style.marginTop=Math.max(0,Math.round(baseline-tops[i]))+"px"});
  });
 }
 const seen=new WeakSet();
 const resize="ResizeObserver" in window?new ResizeObserver(()=>align()):null;
 function watch(){
  const panes=[...grid.querySelectorAll(".script-triple-pane")];
  if(panes.length!==3)return;
  for(const pane of panes){
   // Watch only elements BEFORE the reading surface: changing its margin
   // must not cause a ResizeObserver feedback loop.
   for(const child of pane.children){
    if(child.classList.contains("script-triple-reading-surface"))break;
    if(!seen.has(child)&&resize){seen.add(child);resize.observe(child)}
   }
  }
  align();
 }
 const mutation=new MutationObserver(watch);
 mutation.observe(grid,{childList:true});
 // Bibliographic records are loaded asynchronously and can change header size.
 for(const header of grid.querySelectorAll(".script-triple-head")){
  const m=new MutationObserver(align);m.observe(header,{childList:true,subtree:true,characterData:true});
 }
 window.addEventListener("resize",align,{passive:true});
 grid.addEventListener("click",event=>{
  if(event.target.closest(".script-triple-move,.script-triple-view-options"))requestAnimationFrame(align);
 });
 grid.addEventListener("mouseup",align);
 watch();
 return true;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{
 if(init())return;
 const observer=new MutationObserver(()=>{if(init())observer.disconnect()});
 observer.observe(document.body,{childList:true,subtree:true});
},{once:true});else if(!init()){
 const observer=new MutationObserver(()=>{if(init())observer.disconnect()});
 observer.observe(document.body,{childList:true,subtree:true});
}
})();
