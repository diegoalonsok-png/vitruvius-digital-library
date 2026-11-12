/* Trae a la botonera .lx-tools los controles que otros guiones montan por su
   cuenta (idioma y tema en una caja flotante; Aa), para que todo quede en una
   línea como en el Lexicon. Ver lexicon-toolbar.css. */
(()=>{"use strict";
function adoptar(){
 const destino=document.querySelector(".lx-tools");if(!destino)return;
 const traer=()=>{
  const tb=document.getElementById("vitruvius-secondary-toolbar");
  if(tb&&tb.parentNode!==destino){destino.append(tb);document.body.classList.remove("vitruvius-secondary-controls")}
  const aa=document.querySelector(".site-typeface-tool");
  if(aa&&aa.parentNode!==destino)destino.append(aa);
 };
 traer();
 const obs=new MutationObserver(traer);obs.observe(document.body,{childList:true,subtree:true});
 setTimeout(()=>obs.disconnect(),8000);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",adoptar,{once:true});else adoptar();
})();
