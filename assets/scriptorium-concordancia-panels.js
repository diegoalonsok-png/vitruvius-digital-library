/* Concordancia-inspired Scriptorium panel headers; no reader logic changes. */
(()=>{"use strict";
function mount(){
 const root=document.getElementById("script-triple");
 const panes=[...root?.querySelectorAll(".script-triple-grid>.script-triple-pane")||[]];
 if(panes.length!==3)return false;
 panes.forEach((pane,i)=>{
  const head=pane.querySelector(":scope>.script-triple-head");
  if(!head||head.querySelector(".script-triple-ficha-details"))return;
  const title=head.querySelector("h3"),edition=head.querySelector("select");
  const ficha=head.querySelector(".script-triple-ficha");
  const ids=head.querySelector(".script-triple-identifiers");
  const move=head.querySelector(".script-triple-move");
  if(!title||!edition||!ficha||!ids)return;
  const details=document.createElement("details");
  details.className="script-triple-ficha-details";
  const summary=document.createElement("summary");
  summary.textContent="Ficha bibliográfica · edición y procedencia";
  const inner=document.createElement("div");
  inner.className="script-triple-ficha-inner";
  inner.append(ficha,ids);
  details.append(summary,inner);
  // Keep the visible heading and edition selector identical for all three readers.
  head.replaceChildren(title,edition,details);
  if(move)head.append(move);
  const palette=pane.querySelector(".script-triple-optics select");
  if(palette&&palette.value==="dark"){
   palette.value="white";
   palette.dispatchEvent(new Event("change",{bubbles:true}));
  }
 });
 return true;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{
 if(!mount()){
  const mo=new MutationObserver(()=>{if(mount())mo.disconnect()});
  mo.observe(document.body,{childList:true,subtree:true});
 }
},{once:true});
else if(!mount()){
 const mo=new MutationObserver(()=>{if(mount())mo.disconnect()});
 mo.observe(document.body,{childList:true,subtree:true});
}
})();