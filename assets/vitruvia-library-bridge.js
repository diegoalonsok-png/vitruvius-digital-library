/* Keep a library query intact when continuing in the universal encyclopedia. */
(()=>{
 "use strict";
 const link=document.getElementById("search-in-vitruvia"),input=document.getElementById("query");
 if(!link||!input)return;
 const labels={es:"Buscar en Vitruvia ↗",en:"Search in Vitruvia ↗",fr:"Rechercher dans Vitruvia ↗"};
 function update(){
  const url=new URL("vitruvia.html",location.href),q=input.value.trim();
  if(q){url.searchParams.set("q",q);url.searchParams.set("mode","all")}
  link.href=url.href;link.textContent=labels[document.documentElement.lang]||labels.es;
 }
 input.addEventListener("input",update);input.addEventListener("change",update);
 link.addEventListener("click",update);
 input.form?.addEventListener("reset",()=>setTimeout(update,0));
 new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
 update();
})();
