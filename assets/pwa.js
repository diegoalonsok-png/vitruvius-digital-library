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
const language=()=>document.documentElement.lang||"es";
const label=()=>language()==="en"?"Install "+name:language()==="fr"?"Installer "+name:"Instalar "+name;
function show(){
 if(standalone()||button)return;
 button=document.createElement("button");button.type="button";button.className="pwa-install-button";button.textContent=label();button.setAttribute("aria-label",label());
 const style=document.createElement("style");style.textContent='.pwa-install-button{position:fixed;right:16px;bottom:calc(66px + env(safe-area-inset-bottom));z-index:7900;padding:11px 16px;border:1px solid #c6ad7b;border-radius:24px;background:#142b24;color:#fff;font:600 13px system-ui,sans-serif;box-shadow:0 3px 16px #0003;cursor:pointer}.pwa-install-button:focus-visible{outline:3px solid #c6ad7b;outline-offset:3px}@media print{.pwa-install-button{display:none}}';
 document.head.append(style);document.body.append(button);
 button.addEventListener("click",async()=>{
  if(pending){const prompt=pending;pending=null;try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==="accepted"){button.remove();button=null}}catch{};return}
  location.href=root+"instalar-apps.html";
 });
}
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();pending=event;if(document.body)show();else document.addEventListener("DOMContentLoaded",show,{once:true})});
window.addEventListener("appinstalled",()=>{pending=null;button?.remove();button=null});
document.addEventListener("vitruvius:language-changed",()=>{if(button){button.textContent=label();button.setAttribute("aria-label",label())}});
const mobile=/Android|iPhone|iPad|iPod/.test(navigator.userAgent||"")||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
if(mobile){if(document.body)show();else document.addEventListener("DOMContentLoaded",show,{once:true})}
})();

