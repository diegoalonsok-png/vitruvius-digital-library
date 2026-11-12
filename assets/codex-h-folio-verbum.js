/* Codex H · marcar sobre la fotografía del folio la palabra buscada.
   Sólo es posible en los folios ya leídos línea por línea (data/codex-h/lecturas):
   allí cada renglón tiene su caja sobre la imagen y la palabra se ubica en
   proporción a su posición dentro del renglón. En los demás folios se dice
   con claridad que todavía no puede marcarse, en lugar de simular una posición. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const stage=$("stage"),img=$("image"),search=$("search");
if(!stage||!img)return;
const plegar=x=>String(x||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
 .replace(/j/g,"i").replace(/v/g,"u").replace(/y/g,"i");
/* Raíz prudente: se quita la desinencia breve para hallar symmetria/symmetriae/symmetrias. */
const raiz=w=>{const t=plegar(w).replace(/[^a-z]/g,"");return t.length>6?t.replace(/(ae|am|as|um|us|is|ibus|orum|arum|os|es|em|a|e|i|o|u)$/,""):t};
const params=new URLSearchParams(location.search);
let palabra=params.get("verbum")||"";
let indice=null;const lecturas={};
const capa=document.createElement("div");capa.id="h-verbum-capa";capa.setAttribute("aria-hidden","true");
const nota=document.createElement("p");nota.id="h-verbum-nota";nota.setAttribute("role","status");nota.hidden=true;
const css=document.createElement("style");
css.textContent="#stage{position:relative}#h-verbum-capa{position:absolute;pointer-events:none;z-index:2}"+
 ".h-verbum-mark{position:absolute;border-bottom:2px solid #1b1c1f;background:rgba(255,214,0,.38);mix-blend-mode:multiply;border-radius:2px}"+
 "#h-verbum-nota{margin:6px 0 0;font:12px/1.5 system-ui,sans-serif;color:#5f6166}#h-verbum-nota i{font-family:Georgia,serif}"+
 "html[data-theme=dark] #h-verbum-nota,html[data-reader-theme=dark] #h-verbum-nota{color:#a9abb0}";
document.head.append(css);stage.append(capa);stage.insertAdjacentElement("afterend",nota);
const folioActual=()=>{const o=$("folio-select")?.selectedOptions?.[0];const m=(o?.textContent||$("label")?.textContent||"").match(/(\d+)\s*([rv])/i);return m?m[1]+m[2].toLowerCase():""};
const esPalabra=q=>/^[\p{L}\s]+$/u.test(q)&&!/^\s*(ff?\.|folio|guarda|vitr)/i.test(q)&&/[a-z]{3,}/i.test(q);
async function lectura(f){
 if(!indice)indice=await fetch("data/codex-h/lecturas/index.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{folios:{}}).catch(()=>({folios:{}}));
 if(!indice.folios?.[f])return null;
 if(!lecturas[f])lecturas[f]=await fetch("data/codex-h/lecturas/"+f+".json",{cache:"no-cache"}).then(r=>r.ok?r.json():null).catch(()=>null);
 return lecturas[f];
}
function ajustar(){capa.style.left=img.offsetLeft+"px";capa.style.top=img.offsetTop+"px";capa.style.width=img.offsetWidth+"px";capa.style.height=img.offsetHeight+"px"}
let serie=0;
async function marcar(){
 const t=++serie;capa.replaceChildren();
 const q=(palabra||"").trim();
 if(!q||img.hidden){nota.hidden=true;return}
 const f=folioActual(),lect=await lectura(f);if(t!==serie)return;
 nota.hidden=false;ajustar();
 if(!lect||!lect.lineas?.length){
  nota.innerHTML="";nota.append("«",Object.assign(document.createElement("i"),{textContent:q}),"» · f. "+f+" aún no tiene lectura renglón por renglón: la palabra no puede marcarse sobre la imagen. Folios leídos: "+Object.keys(indice?.folios||{}).map(x=>"f. "+x).join(", ")+".");
  return;
 }
 const re=new RegExp("(?<![a-z])"+raiz(q)+"[a-z]*","g");let n=0;const renglones=[];
 lect.lines.forEach((linea,i)=>{
  const caja=lect.lineas[i];if(!caja)return;
  const s=plegar(linea),L=s.length||1;let g;re.lastIndex=0;
  while((g=re.exec(s))){
   const x=caja.x+caja.w*(g.index/L),w=Math.max(caja.w*(g[0].length/L),0.03);
   const m=document.createElement("span");m.className="h-verbum-mark";m.title=linea.substr(g.index,g[0].length)+" · renglón "+(i+1);
   m.style.cssText=`left:${((x-0.006)*100).toFixed(2)}%;top:${(caja.y*100).toFixed(2)}%;width:${((w+0.012)*100).toFixed(2)}%;height:${(caja.h*100).toFixed(2)}%`;
   capa.append(m);n++;renglones.push(i+1);
  }
 });
 nota.innerHTML="";
 nota.append("«",Object.assign(document.createElement("i"),{textContent:q}),"» · "+(n?n+" "+(n===1?"marca":"marcas")+" en f. "+f+" (renglón "+[...new Set(renglones)].join(", ")+"), sobre la lectura semidiplomática; posición aproximada dentro del renglón.":"sin coincidencias en la lectura de f. "+f+" (la grafía de H puede diferir: p. ej. sinmetros por symmetros)."));
}
img.addEventListener("load",()=>requestAnimationFrame(marcar));
new ResizeObserver(ajustar).observe(img);
/* El buscador de la página también marca: una palabra latina escrita allí se lleva al folio. */
if(search){
 const tomar=()=>{const q=search.value.trim();if(esPalabra(q)){palabra=q;marcar()}else if(!q&&!params.get("verbum")){palabra="";marcar()}};
 search.addEventListener("change",tomar);search.addEventListener("keyup",e=>{if(e.key==="Enter")tomar()});
 if(!palabra&&esPalabra(params.get("q")||""))palabra=params.get("q");
}
if(img.complete&&!img.hidden)marcar();
})();
