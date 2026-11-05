/* Companion web apps share documents, reader preferences and one offline worker.
 * The native installation prompt is opened only after an explicit user gesture. */
(()=>{
"use strict";
if(window.top!==window.self||!("serviceWorker" in navigator))return;
if(!(location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1"))return;
const me=document.currentScript?.src||"";const root=me.replace(/assets\/pwa\.js.*$/,"");
const register=()=>navigator.serviceWorker.register(root+"sw.js",{scope:root}).catch(()=>{});
if(document.readyState==="complete")register();else window.addEventListener("load",register,{once:true});
const standalone=()=>window.matchMedia?.("(display-mode: standalone)").matches||navigator.standalone===true;
const name=location.pathname.endsWith("vitruvia.html")?"Vitruvia":"Vitruvius";
let pending=null,button=null;
const controls=[...document.querySelectorAll('[data-pwa-install]')];
const language=()=>document.documentElement.lang||"es";
const label=()=>language()==="en"?"Install "+name:language()==="fr"?"Installer "+name:"Instalar "+name;
const frontLabel=()=>name==="Vitruvia"?label():language()==="en"?"Install mobile app":language()==="fr"?"Installer l’app mobile":"Instalar app en el celular";
function update(){for(const control of controls){control.textContent=frontLabel();control.hidden=standalone()}}
async function install(event){
 if(pending){
  event?.preventDefault();const prompt=pending;pending=null;
  try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==="accepted"){button?.remove();button=null;for(const control of controls)control.hidden=true}}catch{}
  return;
 }
 if(!event?.currentTarget?.href)location.href=root+"instalar-apps.html";
}
for(const control of controls)control.addEventListener("click",install);update();
document.addEventListener("DOMContentLoaded",update,{once:true});
function show(){
 if(standalone()||button||controls.length)return;
 button=document.createElement("button");button.type="button";button.className="pwa-install-button";button.textContent=label();button.setAttribute("aria-label",label());
 const style=document.createElement("style");style.textContent='.pwa-install-button{position:fixed;right:16px;bottom:calc(66px + env(safe-area-inset-bottom));z-index:7900;padding:11px 16px;border:1px solid #c6ad7b;border-radius:24px;background:#142b24;color:#fff;font:600 13px system-ui,sans-serif;box-shadow:0 3px 16px #0003;cursor:pointer}.pwa-install-button:focus-visible{outline:3px solid #c6ad7b;outline-offset:3px}@media print{.pwa-install-button{display:none}}';
 document.head.append(style);document.body.append(button);
 button.addEventListener("click",install);
}
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();pending=event;if(document.body)show();else document.addEventListener("DOMContentLoaded",show,{once:true})});
window.addEventListener("appinstalled",()=>{pending=null;button?.remove();button=null;for(const control of controls)control.hidden=true});
document.addEventListener("vitruvius:language-changed",()=>{update();if(button){button.textContent=label();button.setAttribute("aria-label",label())}});
document.addEventListener("change",event=>{if(event.target?.matches?.('#ui-language,.header-languages select,.site-global-language select'))setTimeout(update,0)});
const mobile=/Android|iPhone|iPad|iPod/.test(navigator.userAgent||"")||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
if(mobile){if(document.body)show();else document.addEventListener("DOMContentLoaded",show,{once:true})}
})();

