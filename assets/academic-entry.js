/* Academic entry navigation, examples and shareable canonical loci.
   Additive enhancement only; leaves existing reader and Codex H unchanged. */
(()=>{
"use strict";
function ready(){
 const input=document.getElementById("query"), form=document.getElementById("search-form");
 if(!input||!form)return;
 const params=new URLSearchParams(location.search);
 const start=params.get("locus")||params.get("q");
 if(start && start.length<160 && /^[\p{L}\p{N}. _\-'’]+$/u.test(start)){
   input.value=start;
   document.getElementById("buscar")?.scrollIntoView({block:"start"});
 }
 document.querySelectorAll("[data-example-query]").forEach(button=>{
   button.addEventListener("click",()=>{
     input.value=button.dataset.exampleQuery||"";
     input.focus();
     if(typeof form.requestSubmit==="function")form.requestSubmit();else form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
   });
 });
 const control=document.createElement("div");control.style.cssText="margin:8px 0;font:12px system-ui,sans-serif";
 const label=document.createElement("label");label.textContent="Enlace compartible a la consulta o locus ";
 const copy=document.createElement("button");copy.type="button";copy.textContent="Copiar enlace";copy.style.cssText="padding:5px 9px;margin-left:8px;cursor:pointer";
 copy.addEventListener("click",async()=>{
   const q=input.value.trim();if(!q)return;
   const u=new URL(location.href);u.searchParams.delete("q");u.searchParams.delete("locus");
   u.searchParams.set(/^\d{1,2}\.[A-Za-z0-9.]+$|^[IVX]+\.[0-9.]+$/i.test(q)?"locus":"q",q);
   try{await navigator.clipboard.writeText(u.href);copy.textContent="Enlace copiado"}catch{copy.textContent=u.href}
 });
 label.append(copy);control.append(label);form.insertAdjacentElement("afterend",control);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready);else ready();
})();