/* From Vitruvia's general search to Bibliotheca's attested original-text loci.
   No claim of lemma analysis: this is a literal search initiated by the reader. */
(()=>{"use strict";
function init(){
 const input=document.getElementById("query"),form=document.getElementById("search-form");
 if(!input||!form||document.getElementById("vitruvia-concordance-link"))return;
 const wrap=document.createElement("div");wrap.id="vitruvia-concordance-link";
 wrap.style.cssText="margin:10px 0 16px;font:14px/1.6 system-ui,sans-serif";
 const a=document.createElement("a");a.textContent="Buscar esta forma en los loci griegos y latinos de la Bibliotheca";
 a.style.cssText="display:inline-block;padding:8px 12px;border:1px solid currentColor;border-radius:6px;text-decoration:underline";
 const hint=document.createElement("small");hint.textContent=" Concordancia literal; no análisis por lema.";hint.style.marginLeft="10px";
 wrap.append(a,hint);
 form.insertAdjacentElement("afterend",wrap);
 function update(){
  const q=input.value.trim().slice(0,120);
  wrap.hidden=q.length<2;
  const u=new URL("bibliotheca-graeca-latina.html",location.href);
  u.searchParams.set("concordance",q);
  if(/[Ͱ-Ͽἀ-῿]/u.test(q))u.searchParams.set("c-lang","grc");
  a.href=u.pathname+u.search+"#bibliotheca-concordance";
 }
 input.addEventListener("input",update);
 form.addEventListener("submit",()=>queueMicrotask(update));
 window.addEventListener("vitruvia:search",update);
 update();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();