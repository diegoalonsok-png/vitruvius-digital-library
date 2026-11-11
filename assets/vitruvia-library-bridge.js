/* Preserve the front-page search in the three Vitruvius editions.
 * Supplemental links reuse its query without changing or submitting the form. */
(()=>{
 "use strict";
 const link=document.getElementById("search-in-vitruvia");
 const input=document.getElementById("query");
 if(!link||!input)return;
 const names={
  es:["Buscar en Vitruvia ↗","Consultar Lexicon ↗","Bibliotheca clásica ↗","Investigar fuentes ↗"],
  en:["Search in Vitruvia ↗","Open Lexicon ↗","Classical library ↗","Research sources ↗"],
  fr:["Rechercher dans Vitruvia ↗","Consulter Lexicon ↗","Bibliotheca classique ↗","Étudier les sources ↗"]
 };
 const container=link.closest(".search-destinations");
 const routeNames=["vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html","investigacion-conectada.html"];
 const links=[link];
 if(container){
  const style=document.createElement("style");
  style.id="front-search-connections-style";
  style.textContent=".search-destinations .front-search-connected{display:inline-flex;align-items:center;min-height:36px;padding:6px 9px;border:1px solid rgba(125,134,141,.55);border-radius:6px;background:transparent;color:inherit;text-decoration:none;font:500 12px/1.4 system-ui,sans-serif;white-space:normal}.search-destinations .front-search-connected:hover,.search-destinations .front-search-connected:focus-visible{border-color:currentColor;text-decoration:underline;text-underline-offset:3px}.search-destinations .front-search-connected:focus-visible{outline:2px solid currentColor;outline-offset:2px}@media print{.search-destinations .front-search-connected{display:none!important}}";
  document.head.append(style);
  for(let i=1;i<routeNames.length;i++){
   const a=document.createElement("a");
   a.id=["","search-in-lexicon","search-in-bibliotheca","search-in-investigacion"][i];
   a.className="front-search-connected";
   a.target="_blank";
   a.rel="noopener noreferrer";
   container.append(a);
   links.push(a);
  }
 }
 // A full canonical Vitruvian locus can be forwarded; arbitrary prose never
 // becomes a manuscript or edition reference through this navigation.
 const locusPattern=/^(?:(?:I|II|III|IV|V|VI|VII|VIII|IX|X)|(?:10|[1-9]))\.(?:praef|[1-9]\d?)\.[1-9]\d{0,2}$/i;
 function update(){
  const q=input.value.trim(),language=document.documentElement.lang;
  const translated=names[language]||names.es;
  links.forEach((a,i)=>{
   const url=new URL(routeNames[i],location.href);
   if(q){
    if(i===0){url.searchParams.set("q",q);url.searchParams.set("mode","all")}
    if(i===1){url.searchParams.set("q",q.slice(0,180));url.searchParams.set("mode","palabra");url.searchParams.set("lang","la")}
    if(i===2){url.searchParams.set("term",q.slice(0,180));url.searchParams.set("work","vitruvius")}
    if(i===3){
     url.searchParams.set("q",q.slice(0,120));url.searchParams.set("work","vitruvius");
     if(locusPattern.test(q))url.searchParams.set("locus",q);
    }
   }else if(i===3)url.searchParams.set("work","vitruvius");
   a.href=url.href;
   a.textContent=translated[i];
  });
 }
 input.addEventListener("input",update);
 input.addEventListener("change",update);
 for(const a of links)a.addEventListener("click",update);
 input.form?.addEventListener("reset",()=>setTimeout(update,0));
 new MutationObserver(update).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
 update();
})();
