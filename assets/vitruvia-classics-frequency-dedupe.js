/* Prevent an identical classical-frequency widget from appearing twice in
 * a single Vitruvia result. Restrict removal to duplicated content: if the
 * two panels contain different evidence, retain both rather than discard data.
 */
(()=>{
"use strict";
const root=document.getElementById("vitruvia-article");
if(!root)return;
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const heading=/^(?:frecuencia en los clasicos de la biblioteca|frequency in the library classics|frequence dans les classiques de la bibliotheque)$/;
let queued=false;
function dedupe(){
 queued=false;
 const found=[...root.querySelectorAll("h2,h3,h4,h5,[role=heading]")]
  .filter(el=>heading.test(norm(el.textContent)));
 if(found.length<2)return;
 const seen=new Map();
 for(const h of found){
  // Own only the enclosing result module, never the whole article/column.
  const block=h.closest("section,article,.article-research-item,.context-section")||h.parentElement;
  if(!block||block===root||block.id==="article-body"||block.id==="vitruvia-context")continue;
  const key=norm(block.textContent);
  if(key.length<heading.source.length/2)continue;
  if(seen.has(key)&&seen.get(key)!==block)block.remove();
  else seen.set(key,block);
 }
}
function schedule(){
 if(queued)return;queued=true;
 requestAnimationFrame(dedupe);
}
const observer=new MutationObserver(schedule);
observer.observe(root,{childList:true,subtree:true,characterData:true});
schedule();
})();
