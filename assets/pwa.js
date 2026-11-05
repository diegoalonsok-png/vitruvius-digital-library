/* Registro de la aplicación web instalable (PWA). No actúa dentro de iframes ni en pruebas automatizadas. */
(()=>{
"use strict";
if(window.top!==window.self||!("serviceWorker" in navigator)||navigator.webdriver)return;
if(!(location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1"))return;
const me=document.currentScript?.src||"";const root=me.replace(/assets\/pwa\.js.*$/,"");
window.addEventListener("load",()=>{navigator.serviceWorker.register(root+"sw.js",{scope:root}).catch(()=>{})});
})();
