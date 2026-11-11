/* Apparatus textual index → shared lexical card.
   Delegate from the dynamic result containers; no per-passage dictionary fetch. */
(()=>{"use strict";
const selector=[
 "#critical-results p[lang='la'] mark",
 "#critical-unified-results [lang='la'] mark.critical-unified-hit",
 "#critical-comparison [lang='la'] mark"
].join(",");
const WORD=/^[\p{L}\p{M}'ʼ’-]{2,70}$/u;
function target(event){const element=event.target;return element?.closest?.(selector)||null}
function launch(mark){
 const word=(mark.textContent||"").trim();
 if(!WORD.test(word))return false;
 const card=window.VitruviusLexicalCard;
 if(!card?.open)return false;
 void card.open(word,mark);
 return true;
}
document.addEventListener("click",event=>{
 if(event.button!==0)return;
 const mark=target(event);
 if(mark&&launch(mark)){event.preventDefault();event.stopPropagation()}
},true);
document.addEventListener("keydown",event=>{
 if(event.key!=="Enter"&&event.key!==" ")return;
 const mark=target(event);
 if(mark&&launch(mark)){event.preventDefault();event.stopPropagation()}
},true);
function enhance(root){
 if(!root)return;
 for(const mark of root.matches?.(selector)?[root]:[]){
  if(!mark.hasAttribute("tabindex"))mark.tabIndex=0;
  mark.setAttribute("role","button");
  mark.setAttribute("aria-label","Abrir diccionario: "+mark.textContent.trim());
 }
 for(const mark of root.querySelectorAll?.(selector)||[]){
  if(!mark.hasAttribute("tabindex"))mark.tabIndex=0;
  mark.setAttribute("role","button");
  mark.setAttribute("aria-label","Abrir diccionario: "+mark.textContent.trim());
 }
}
const init=()=>{
 const roots=["critical-results","critical-unified-results","critical-comparison"]
  .map(id=>document.getElementById(id)).filter(Boolean);
 for(const root of roots){
  enhance(root);
  new MutationObserver(records=>{
   for(const record of records)for(const added of record.addedNodes)
    if(added.nodeType===1)enhance(added);
  }).observe(root,{childList:true,subtree:true});
 }
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();