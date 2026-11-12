/* Subraya en el facsímil las rúbricas detectadas por color de tinta.

   Fuente: data/codex-h/rubricas.json (scripts/detect-rubricas.py), que mide
   dónde hay tinta roja en cada folio y devuelve la caja en coordenadas
   relativas. El subrayado señala la rúbrica: no afirma qué dice, porque no se
   ha leído la escritura. Cuando el folio tiene loci documentados en el mapa,
   se nombran junto al subrayado, con su grado de verificación.

   Las cajas van en porcentaje sobre un contenedor del tamaño de la imagen, de
   modo que acompañan al zoom sin recalcular nada. */
(()=>{
"use strict";
const URL_DATA="data/codex-h/rubricas.json?v=20261112";
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const $=id=>document.getElementById(id);
let datos=null,activo=true,capa=null;

const cita=l=>{const [b,...r]=String(l).split(".");return "Vitr. "+(R[+b]||b)+"."+r.join(".")};
const clave=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]/g,"");

function monta(){
 const img=$("image");if(!img||capa)return;
 const caja=document.createElement("div");
 caja.id="rubrica-layer";
 caja.setAttribute("aria-hidden","true");
 // El contenedor se superpone a la imagen y la sigue en tamaño y posición.
 const envoltorio=document.createElement("div");
 envoltorio.id="rubrica-wrap";
 img.parentNode.insertBefore(envoltorio,img);
 envoltorio.append(img,caja);
 capa=caja;
}

function folioActual(){
 const etiqueta=$("label")?.textContent||"";
 const m=/f\.?\s*(\d+\s*[rv])/i.exec(etiqueta);
 return m?m[1].replace(/\s+/g,""):null;
}

function pinta(){
 if(!capa||!datos)return;
 capa.replaceChildren();
 const folio=folioActual();
 const reg=datos.folios.find(f=>f.folio&&clave(f.folio)===clave(folio));
 const aviso=$("rubrica-note");
 if(!reg||!reg.rubricas.length||!activo){
  if(aviso)aviso.textContent=!activo?"Subrayado de rúbricas desactivado."
   :folio?`En f. ${folio} no se detectó tinta roja de rúbrica.`:"";
  return;
 }
 for(const b of reg.rubricas){
  const marca=document.createElement("span");
  marca.className="rubrica-mark";
  // Un poco de holgura vertical, para que el trazo no quede pegado a la letra.
  const holgura=b.h*0.45;
  marca.style.cssText=`left:${(b.x*100).toFixed(2)}%;top:${((b.y-holgura)*100).toFixed(2)}%;`
   +`width:${(b.w*100).toFixed(2)}%;height:${((b.h+holgura*2)*100).toFixed(2)}%`;
  capa.append(marca);
 }
 if(aviso){
  const loci=reg.loci?.length?" · loci documentados en este folio: "+reg.loci.map(cita).join(", "):"";
  aviso.textContent=`${reg.rubricas.length} rúbrica${reg.rubricas.length===1?"":"s"} detectada`
   +`${reg.rubricas.length===1?"":"s"} por color de tinta en f. ${folio}${loci}. `
   +"El subrayado señala dónde hay tinta roja; no se ha leído la escritura.";
 }
}

function controles(){
 if($("rubrica-toggle"))return;
 const barra=document.getElementById("single-ruler")||document.querySelector(".toolbar");
 if(!barra)return;
 const caja=document.createElement("div");
 caja.id="rubrica-controls";
 const b=document.createElement("button");
 b.id="rubrica-toggle";b.type="button";b.setAttribute("aria-pressed","true");
 b.textContent="Subrayar rúbricas";
 b.addEventListener("click",()=>{activo=!activo;b.setAttribute("aria-pressed",String(activo));pinta()});
 const nota=document.createElement("p");nota.id="rubrica-note";
 caja.append(b,nota);
 barra.insertAdjacentElement("afterend",caja);
}

async function init(){
 if(!$("image"))return;
 monta();controles();
 try{
  const r=await fetch(URL_DATA);
  if(!r.ok)throw Error("HTTP "+r.status);
  datos=await r.json();
 }catch(e){
  const n=$("rubrica-note");
  if(n)n.textContent="No se pudo cargar la detección de rúbricas ("+e.message+").";
  return;
 }
 pinta();
 // El visor cambia de folio sin recargar: se observa el rótulo.
 const label=$("label");
 if(label&&window.MutationObserver)new MutationObserver(pinta).observe(label,{childList:true,characterData:true,subtree:true});
}
document.addEventListener("DOMContentLoaded",init,{once:true});
})();
