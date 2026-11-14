/* Aparato crítico → lexical card: direct click and keyboard handlers on
 * highlighted forms, including dynamically inserted apparatus catalogue
 * results. A direct event listener (not just delegation) is deliberate:
 * the words must be inspectably interactive in all supported browsers.
 * Dictionary data is fetched only after actual reader interaction.
 */
(()=>{"use strict";
const selector=[
 "#critical-results p[lang='la'] mark",
 "#critical-unified-results [lang='la'] mark.critical-unified-hit",
 "#critical-comparison [lang='la'] mark",
 "#apparatus-catalog-results .ac-ficha mark"
].join(",");
const WORD=/^[\p{L}\p{M}'ʼ’-]{2,70}$/u;
function launch(mark){
 const word=(mark.textContent||"").trim();
 if(!WORD.test(word))return false;
 const card=window.VitruviusLexicalCard;
 if(!card?.open)return false;
 void card.open(word,mark);
 return true;
}
function enhance(root){
 if(!root)return;
 const marks=[...(root.matches?.(selector)?[root]:[]),...(root.querySelectorAll?.(selector)||[])];
 for(const mark of marks){
  if(mark.dataset.criticalLexicalReady==="1")continue;
  mark.dataset.criticalLexicalReady="1";
  if(!mark.hasAttribute("tabindex"))mark.tabIndex=0;
  mark.setAttribute("role","button");
  mark.setAttribute("aria-label","Abrir diccionario: "+mark.textContent.trim());
  mark.setAttribute("title","Abrir ficha del diccionario · "+mark.textContent.trim());
  mark.addEventListener("click",event=>{
   if(event.button!==0)return;
   if(launch(mark)){event.preventDefault();event.stopPropagation();}
  });
  mark.addEventListener("keydown",event=>{
   if(event.key!=="Enter"&&event.key!==" ")return;
   if(launch(mark)){event.preventDefault();event.stopPropagation();}
  });
 }
}
function init(){
 const roots=["critical-results","critical-unified-results","critical-comparison","apparatus-catalog-results"]
  .map(id=>document.getElementById(id)).filter(Boolean);
 for(const root of roots){
  enhance(root);
  if(typeof MutationObserver==="function"){
   new MutationObserver(records=>{
    for(const record of records)for(const added of record.addedNodes){
     if(added.nodeType===1)enhance(added);
    }
   }).observe(root,{childList:true,subtree:true});
  }
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
