/* Crosslink from the critical reading screen to the original DOCX notes inventory. */
(()=>{"use strict";
function init(){
 const input=document.getElementById("critical-query");
 const anchor=document.getElementById("critical-inventory-shortcut");
 if(!input||!anchor)return;
 function update(){
  const q=input.value.trim().slice(0,200);
  const edition=document.getElementById("critical-edition")?.value||"all";
  const isLocus=/^(?:(?:vitr(?:uvius)?\.?)\s*)?(?:[ivx]+|\d{1,2})[.,\s]+(?:praef(?:atio)?|\d{1,2})(?:[.,\s]+\d{1,2})?$/i.test(q);
  const params=new URLSearchParams();
  if(q)params.set(isLocus?"locus":"q",q);
  if(["recensio-es","recensio-fr","theory-en"].includes(edition))params.set("edition",edition);
  anchor.href="inventario-aparato-autoral.html"+(params.size?"?"+params:"");
 }
 input.addEventListener("input",update);
 document.getElementById("critical-edition")?.addEventListener("change",update);
 update();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();