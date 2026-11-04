/* Generic local manuscript-reader launcher. Embeds only explicitly catalogued
   same-origin readers. The host is never assumed to own historical manuscripts. */
(()=>{"use strict";
const supported=/^(?:codex-h-folios-local|harleianus)\.html(?:\?(?:[a-z0-9_.%=&+-]+))?$/i;
function locate(link){
 const url=String(link||"").trim();
 if(!supported.test(url))return null;
 try{
  const absolute=new URL(url,location.href);
  return absolute.origin===location.origin?absolute.href:null
 }catch{return null}
}
function dialog(){
 let el=document.getElementById("vitruvia-manuscript-dialog");if(el)return el;
 el=document.createElement("dialog");el.id="vitruvia-manuscript-dialog";
 el.className="vitruvia-manuscript-dialog";
 const panel=document.createElement("section");panel.className="vitruvia-manuscript-panel";
 const header=document.createElement("header");header.className="vitruvia-manuscript-toolbar";
 const title=document.createElement("strong");title.id="vitruvia-manuscript-title";
 title.textContent="Codex H · Harley MS 2767";
 const actions=document.createElement("div");actions.className="vitruvia-manuscript-actions";
 const full=document.createElement("a");full.target="_blank";full.rel="noopener noreferrer";full.className="vitruvia-manuscript-open";
 full.textContent="Abrir visor completo";
 const close=document.createElement("button");close.type="button";close.className="vitruvia-manuscript-close";close.textContent="×";
 close.setAttribute("aria-label","Cerrar lector");close.addEventListener("click",()=>el.close());
 actions.append(full,close);header.append(title,actions);
 const note=document.createElement("p");note.className="vitruvia-manuscript-note";
 note.textContent="Las 341 imágenes están alojadas en la biblioteca. Folio histórico e imagen digital no siempre coinciden. Custodia: British Library.";
 const iframe=document.createElement("iframe");iframe.className="vitruvia-manuscript-iframe";iframe.title="Lector de folios originales de Harley MS 2767";iframe.loading="lazy";
 panel.append(header,note,iframe);el.append(panel);document.body.append(el);
 el.addEventListener("click",event=>{if(event.target===el)el.close()});
 el.addEventListener("close",()=>{iframe.removeAttribute("src")});
 // Al abrir, ir directamente a la zona de lectura (folio y comandos) y permitir Esc.
 iframe.addEventListener("load",()=>{try{
  const d=iframe.contentDocument;if(!d)return;
  const target=d.getElementById("label")?.closest("section,.reader,.viewer,div")||d.getElementById("stage");
  if(target)target.scrollIntoView({block:"start"});
  d.addEventListener("keydown",e=>{if(e.key==="Escape")el.close()});
 }catch{}});
 return el;
}
function open(link,title){
 const url=locate(link);if(!url)return false;
 const el=dialog();
 el.querySelector("#vitruvia-manuscript-title").textContent=title||"Manuscrito digitalizado";
 el.querySelector(".vitruvia-manuscript-open").href=url;
 el.querySelector(".vitruvia-manuscript-iframe").src=url;
 if(!el.open)el.showModal();
 return true;
}
window.VitruviaLocalManuscripts={open};
})();
