/* Latin is first by default. Moving the existing leaves preserves their locus,
   notes, selected translation, highlights and every original text node. */
(()=>{"use strict";
const leaves=document.getElementById("ab-reading-leaves"),button=document.getElementById("ab-swap-readers"),status=document.getElementById("ab-reading-order-status");
const latin=document.getElementById("latin-leaf"),translation=document.getElementById("translation-leaf");
if(!leaves||!button||!latin||!translation)return;
let reversed=false;
try{reversed=localStorage.getItem("vitruvius-apparatus-reading-order")==="translation-first"}catch{}
function apply(){
 leaves.append(...(reversed?[translation,latin]:[latin,translation]));
 button.setAttribute("aria-pressed",String(reversed));
 if(status)status.textContent=reversed?"Traducción primero · latín después":"Latín primero · traducción después";
}
button.addEventListener("click",()=>{
 reversed=!reversed;apply();
 try{localStorage.setItem("vitruvius-apparatus-reading-order",reversed?"translation-first":"latin-first")}catch{}
});
apply();
})();
