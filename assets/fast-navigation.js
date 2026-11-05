/* Intent-based preparation for this static library. Normal links, history, URLs,
 * page scripts and readers are preserved; no single-page-app replacement occurs.
 * Only small same-origin HTML/CSS/UI assets are fetched, never PDFs or folio images.
 */
(()=>{
"use strict";
if(window.top!==window.self||window.VitruviaNavigation)return;
const script=document.currentScript?.src||location.href;
const base=new URL(script.includes("/assets/")?"../":"./",script);
const seen=new Set(),queue=[];let running=0,intentTimer=null;
const connection=navigator.connection;
const constrained=connection?.saveData||/^(slow-2g|2g)$/.test(connection?.effectiveType||"");
function destination(anchor){
 if(!anchor||anchor.hasAttribute("download")||anchor.target==="_blank")return null;
 let url;try{url=new URL(anchor.href,location.href)}catch{return null}
 if(url.origin!==location.origin||!url.pathname.startsWith(base.pathname)||!(/\.html$/i.test(url.pathname)||url.pathname===base.pathname))return null;
 if(url.pathname===location.pathname)return null;
 url.hash="";return url;
}
function enqueue(url,kind="page"){
 const key=url.href;if(constrained||seen.has(key)||queue.length>=8)return;
 seen.add(key);queue.push({url,kind});pump();
}
function pump(){
 while(running<2&&queue.length){
  const item=queue.shift();running++;
  prepare(item).catch(()=>{}).finally(()=>{running--;pump()});
 }
}
async function prepare({url,kind}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetch(url.href,{credentials:"same-origin",priority:"low",signal:controller.signal});
  if(!response.ok){seen.delete(url.href);return}
  if(kind!=="page"){await response.arrayBuffer();return}
  const html=await response.text();
  const critical=[];
  for(const match of html.matchAll(/<(link|script)\b[^>]*(?:href|src)=["']([^"']+)["'][^>]*>/gi)){
   const tag=match[0],asset=new URL(match[2],url);
   if(asset.origin!==location.origin||!asset.pathname.startsWith(base.pathname))continue;
   const stylesheet=match[1].toLowerCase()==="link"&&/\brel=["']stylesheet["']/i.test(tag);
   const ui=/\/assets\/(?:bilingual|global-language|theme|site-bar|vitruvia-data)\.js$/.test(asset.pathname);
   if(stylesheet||ui)critical.push(asset);
  }
  for(const asset of critical.slice(0,6))enqueue(asset,"asset");
 }catch{seen.delete(url.href)}finally{clearTimeout(timer)}
}
function intent(event){
 const anchor=event.target?.closest?.("a[href]"),url=destination(anchor);
 clearTimeout(intentTimer);
 if(url)intentTimer=setTimeout(()=>enqueue(url),event.type==="pointerdown"?0:65);
}
document.addEventListener("pointerover",intent,{passive:true});
document.addEventListener("focusin",intent);
document.addEventListener("pointerdown",intent,{passive:true});
function ready(){document.documentElement.dataset.navigationReadyMs=String(Math.round(performance.now()))}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});else ready();
window.VitruviaNavigation={version:"20261105-navigation-1"};
})();
