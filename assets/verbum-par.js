/* Verbum par · cuando una palabra queda subrayada en el texto latino, se subraya
   también su equivalente en la traducción vecina.
   Los equivalentes salen de data/index/verba-capitalia.json (raíces medidas en
   las traducciones de Diego Kurilo: V514 castellano, V554 francés, V297 inglés).
   Si la voz no está registrada se busca la misma forma latina en la traducción
   (términos que la versión conserva en latín); si tampoco aparece, se dice con
   una nota discreta en lugar de subrayar una palabra arbitraria. */
(()=>{
"use strict";
const PARES=[{la:"#latin-text",tr:"#translation-text",lang:()=>document.getElementById("lang")?.value||"es"}];
const CLASES={a:"[aàáâäã]",e:"[eèéêë]",i:"[iíìîïjy]",j:"[iíìîïj]",y:"[yiíì]",o:"[oóòôöõ]",u:"[uúùûüv]",v:"[uúùûüv]",c:"[cç]",n:"[nñ]"};
const plegar=x=>String(x||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/j/g,"i").replace(/v/g,"u").replace(/y/g,"i");
const patron=raices=>new RegExp("(?<![A-Za-zÀ-ÿ])(?:"+raices.map(r=>[...r].map(c=>CLASES[c]||c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("")).join("|")+")[A-Za-zÀ-ÿ]*","gi");
const NOMBRE={es:"la traducción castellana",fr:"la traduction française",en:"the English translation"};
let voces=null;
const cargar=()=>voces||(voces=fetch("data/index/verba-capitalia.json").then(r=>r.ok?r.json():{voces:[]}).then(d=>d.voces||[]).catch(()=>[]));
const css=document.createElement("style");
css.textContent="mark.vp-par{background:inherit;background-color:rgba(255,214,0,.42);color:inherit;box-shadow:inset 0 -2px 0 rgba(27,28,31,.55);border-radius:2px;padding:0 1px}"+
 ".vp-nota{margin:.6em 0 0;font:12px/1.5 system-ui,sans-serif;color:#6f7177}.vp-nota i{font-family:Georgia,serif}"+
 "html[data-theme=dark] .vp-nota,html[data-reader-theme=dark] .vp-nota{color:#a9abb0}";
document.head.append(css);
function limpiar(caja){
 for(const m of caja.querySelectorAll("mark.vp-par")){const p=m.parentNode;p.replaceChild(document.createTextNode(m.textContent),m);p.normalize()}
 caja.querySelector(".vp-nota")?.remove();
}
function subrayar(caja,raices){
 if(!raices.length)return 0;const re=patron(raices);let n=0;
 const w=document.createTreeWalker(caja,NodeFilter.SHOW_TEXT,{acceptNode:x=>x.parentElement.closest("mark,script,style,.vp-nota")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
 const textos=[];for(let x=w.nextNode();x;x=w.nextNode())textos.push(x);
 for(const nodo of textos){
  const s=nodo.nodeValue;re.lastIndex=0;if(!re.test(s))continue;re.lastIndex=0;
  const frag=document.createDocumentFragment();let i=0,g;
  while((g=re.exec(s))){if(g.index>i)frag.append(s.slice(i,g.index));const m=document.createElement("mark");m.className="vp-par";m.textContent=g[0];m.title="Equivalente del término latino subrayado";frag.append(m);i=g.index+g[0].length;n++}
  if(i<s.length)frag.append(s.slice(i));nodo.parentNode.replaceChild(frag,nodo);
 }
 return n;
}
async function aplicar(par,obs){
 const la=document.querySelector(par.la),tr=document.querySelector(par.tr);if(!la||!tr)return;
 const lista=await cargar();
 obs.disconnect();
 limpiar(tr);
 const formas=[...new Set([...la.querySelectorAll("mark")].map(m=>m.textContent.trim()).filter(t=>/\p{L}{3,}/u.test(t)))];
 if(formas.length&&!tr.querySelector("mark:not(.vp-par)")){
  const lang=par.lang(),raices=new Set(),sinPar=[];
  for(const f of formas){
   const k=plegar(f).replace(/[^a-z ]/g,"");
   const voz=lista.find(v=>k.split(" ").some(p=>p.startsWith(plegar(v.raiz))));
   const eq=(voz?.equivalentes?.[lang]||[]).map(x=>plegar(x.raiz||x));
   if(eq.length)eq.forEach(r=>raices.add(r));
   else{const r=k.length>6?k.replace(/(ae|am|as|um|us|is|ibus|orum|arum|os|es|em|a|e|i|o|u)$/,""):k;if(subrayar(tr,[r]))continue;sinPar.push(f)}
  }
  subrayar(tr,[...raices]);
  if(sinPar.length&&!tr.querySelector("mark.vp-par")){
   const p=document.createElement("p");p.className="vp-nota";
   p.append("«",Object.assign(document.createElement("i"),{textContent:sinPar.join(", ")}),"» · sin equivalente registrado en "+(NOMBRE[lang]||"la traducción")+"; véase el pasaje completo.");
   tr.append(p);
  }
 }
 obs.takeRecords();
 obs.observe(la,{childList:true,subtree:true,characterData:true});obs.observe(tr,{childList:true,subtree:true});
}
function iniciar(){
 for(const par of PARES){
  const la=document.querySelector(par.la),tr=document.querySelector(par.tr);if(!la||!tr)continue;
  let t=0;const obs=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>aplicar(par,obs),60)});
  aplicar(par,obs);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar);else iniciar();
})();
