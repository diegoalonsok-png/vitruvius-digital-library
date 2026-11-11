/* Lexicon -> Codex H lexical navigation.
 * Links to editorial Latin V514 candidate folios, not manuscript-attested OCR.
 */
(()=>{"use strict";
function init(){
 const form=document.getElementById("lx-form"),input=document.getElementById("lx-q");
 if(!form||!input||document.getElementById("lx-h-folio-link"))return;
 const panel=document.createElement("div");panel.id="lx-h-folio-link";
 panel.style.cssText="margin:10px 0 16px;padding:10px 13px;border:1px solid #8b806a;border-radius:7px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;font:13px/1.5 system-ui;color:inherit";
 const a=document.createElement("a");a.style.cssText="font-weight:650;text-decoration:underline;text-underline-offset:3px;color:inherit";
 a.setAttribute("aria-label","Abrir el índice léxico y los folios candidatos de Codex H");
 const note=document.createElement("small");note.textContent="Los folios se relacionan mediante V514; la lectura de la palabra en H requiere cotejo.";
 note.style.cssText="font:12px/1.4 system-ui;opacity:.82";
 panel.append(a,note);form.after(panel);
 function refresh(){
  const q=input.value.trim();
  a.href="codex-h-folios-local.html"+(q?"?"+new URLSearchParams({q}):"#h-chapter-terms");
  a.textContent=q?"Examinar folios candidatos del códice H para «"+q.slice(0,45)+(q.length>45?"…":"")+"»":
   "Ver índice de términos y folios del códice H";
 }
 input.addEventListener("input",refresh);
 form.addEventListener("submit",refresh);
 refresh();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();