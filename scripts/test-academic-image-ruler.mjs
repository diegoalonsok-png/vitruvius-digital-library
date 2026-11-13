/* Academic-image ruler: source-pixel geometry and honest manual calibration. */
import {JSDOM} from "jsdom";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";

const html='<!doctype html><html lang="es"><head></head><body>'+
'<div id="stage" data-academic-ruler-image="#folio"><img id="folio" src="scan-1.jpg"></div>'+
'</body></html>';
const dom=new JSDOM(html,{url:"https://vitruvius-digital-library.org/obras-notables",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window,stage=w.document.getElementById("stage"),img=w.document.getElementById("folio");
Object.defineProperty(img,"naturalWidth",{configurable:true,value:1000});
Object.defineProperty(img,"naturalHeight",{configurable:true,value:2000});
stage.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,width:900,height:800,right:900,bottom:800});
img.getBoundingClientRect=()=>({x:100,y:100,left:100,top:100,width:500,height:600,right:600,bottom:700});
w.eval(readFileSync("assets/academic-image-ruler.js","utf8"));
w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
const toggle=stage.querySelector(".vdl-ar-controls button");
assert.ok(toggle,"Mounted ruler toggle on image stage");
assert.equal(toggle.textContent,"Regla");
assert.equal(toggle.getAttribute("aria-pressed"),"false");

toggle.click();
assert.equal(toggle.getAttribute("aria-pressed"),"true");
function fire(type,x,y){
 stage.dispatchEvent(new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0}));
}
fire("pointerdown",200,200);fire("pointermove",300,320);fire("pointerup",300,320);
const info=stage.querySelector(".vdl-ar-info");
assert.match(info.textContent,/447,2 px digitales/);
assert.match(info.textContent,/sin escala física verificada/);
assert.equal(stage.querySelector(".vdl-ar-overlay").hidden,false);
const mm=stage.querySelector(".vdl-ar-controls input");
mm.value="10";
const btn=[...stage.querySelectorAll(".vdl-ar-controls button")].find(b=>b.textContent==="Calibrar");
btn.click();
assert.match(info.textContent,/10 mm/);
assert.match(info.textContent,/orientativa/);
img.setAttribute("src","scan-2.jpg");
await new Promise(r=>setTimeout(r,50));
assert.match(info.textContent,/Arrastra entre dos puntos/,"Never carry calibration across folios");
assert.equal(stage.querySelector(".vdl-ar-overlay").hidden,true);
w.VitruviusAcademicImageRuler.start();
assert.equal(stage.querySelectorAll(".vdl-ar-controls").length,1,"No duplicate ruler controls");
toggle.click();
assert.equal(toggle.getAttribute("aria-pressed"),"false");
dom.window.close();

for(const path of [
 "obras-notables.html","codex-h-doble-folio.html","cesariano-1521.html",
 "giocondo-1511.html","barbaro-1567.html","perrault-1673.html","taccola-de-machinis.html"
]){
 const h=readFileSync(path,"utf8");
 assert.match(h,/assets\/academic-image-ruler\.js/,"Missing shared ruler script: "+path);
 assert.match(h,/data-academic-ruler-image=/,"Missing image target: "+path);
}
console.log("PASS: academic ruler measures source pixels, supports explicit calibration, resets on image change, and is installed on historical image viewers.");
