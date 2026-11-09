/* Lexicon: compone en cuadrados los jeroglíficos que llevan controles de formato Unicode (U+13430–1345F).
   Solo cambia la disposición; no altera los signos ni añade lecturas. Requiere assets/hiero-render.js. */
(()=>{"use strict";
const CTRL=/[\u{13430}-\u{1345F}]/u;
function enhance(root){
 if(!window.HieroRender)return;
 for(const el of (root||document).querySelectorAll(".lx-hiero:not([data-hg])")){
  el.dataset.hg="1";
  const text=el.textContent;
  if(!CTRL.test(text))continue;
  const rendered=window.HieroRender.render(text.trim(),{size:"1.5em"});
  el.replaceChildren(rendered);
 }
}
const start=()=>{enhance();new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)enhance(n.matches?.(".lx-hiero")?n.parentElement:n)}).observe(document.body,{childList:true,subtree:true})};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
