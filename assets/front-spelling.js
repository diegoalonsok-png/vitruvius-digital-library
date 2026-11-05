/* Buscador de la portada: si una búsqueda no encuentra nada, propone la forma corregida
   (vocabulario de los textos del sitio y nombres registrados) y la búsqueda en Vitruvia. */
(()=>{
"use strict";
const $=s=>document.querySelector(s);
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn):fn()}
ready(()=>{
 const status=$("#search-status"),results=$("#search-results"),input=$("#query"),form=$("#search-form"),button=$("#search-button");
 if(!status||!results||!input||!form||!window.VitruviaUnderstand)return;
 const U=window.VitruviaUnderstand;
 U.setVocabulary(["Vitruvio","Vitruvius","Cicerón","Lucrecio","Palladio","Alberti","Cesariano","Giocondo","Barbaro","Sulpizio","Perrault","Krohn","Rose","Augusto","Julio César","Arquímedes","Ctesibio","Harleianus","Gudianus","Fano"]);
 let box=null,last="";
 const clear=()=>{box?.remove();box=null};
 async function check(){
  const q=input.value.trim();if(!q||q===last||button?.disabled)return;
  if(results.children.length){clear();return}
  last=q;const fix=U.localCorrect(q)||await U.generalCorrect(q).catch(()=>null);
  if(input.value.trim()!==q||results.children.length)return;
  clear();box=document.createElement("p");box.className="front-spelling";box.style.cssText="margin:10px 0;font-size:15px";
  if(fix){box.append("¿Quisiste decir ");const b=document.createElement("button");b.type="button";b.textContent="«"+fix+"»";b.style.cssText="background:none;border:0;color:inherit;font:inherit;text-decoration:underline;cursor:pointer;padding:0";
   b.addEventListener("click",()=>{input.value=fix;clear();form.requestSubmit()});box.append(b,"? · ")}
  const a=document.createElement("a");a.href="vitruvia.html?q="+encodeURIComponent(fix||q);a.textContent="Buscar «"+(fix||q)+"» en Vitruvia, el buscador general →";box.append(a);
  status.after(box);
 }
 new MutationObserver(()=>setTimeout(check,250)).observe(status,{childList:true,characterData:true,subtree:true});
 input.addEventListener("input",()=>{last="";clear()});
});
})();
