/* La botonera del Lexicon va en una sola línea y con un botón por función.
   Se cargan en jsdom los dos scripts que intervienen —el que inyecta el control
   de tipografía y el de apariencia— y se comprueba dónde queda cada cosa. */
import {JSDOM} from "jsdom";
import fs from "node:fs";
import assert from "node:assert/strict";

const html=fs.readFileSync("vitruvia-lexicon.html","utf8");
const siteBar=fs.readFileSync("assets/site-bar.js","utf8");
const theme=fs.readFileSync("assets/theme.js","utf8");
let failed=0;
const check=(label,fn)=>{try{fn();console.log("PASS",label)}catch(e){failed++;console.error("FAIL",label,e.message)}};

const dom=new JSDOM(html,{runScripts:"outside-only",url:"https://vitruvius-digital-library.org/vitruvia-lexicon",pretendToBeVisual:true});
const w=dom.window;
w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},removeEventListener(){}}));
try{w.eval(siteBar)}catch(e){console.error("site-bar.js:",e.message)}
try{w.eval(theme)}catch(e){console.error("theme.js:",e.message)}
w.document.dispatchEvent(new w.Event("DOMContentLoaded"));
await new Promise(r=>setTimeout(r,80));
const d=w.document;

check("la página declara dónde va el control de tipografía",()=>{
 const hueco=d.getElementById("site-typeface-slot");
 assert.ok(hueco,"falta el hueco #site-typeface-slot");
 assert.ok(hueco.closest(".navtools"),"el hueco quedó fuera de la botonera");
});
check("el control Aa queda dentro de la botonera, no suelto al final",()=>{
 const tool=d.querySelector(".site-typeface-tool");
 assert.ok(tool,"no se insertó el control de tipografía");
 assert.ok(tool.closest(".navtools"),"el Aa quedó fuera de la botonera: "+(tool.parentElement&&tool.parentElement.className));
});
check("un solo botón de apariencia en toda la página",()=>{
 const botones=d.querySelectorAll(".theme-switch,#theme");
 assert.equal(botones.length,1,`hay ${botones.length} botones de apariencia`);
});
check("un solo selector de idioma de interfaz",()=>{
 assert.equal(d.querySelectorAll('#lx-ui,[aria-label^="Idioma de la interfaz"]').length,1);
});
check("la botonera se dispone en línea, sin grilla de columnas fijas",()=>{
 assert.match(html,/\.navtools\{display:flex!important;flex-wrap:nowrap/,"la botonera no está en flex de una línea");
 assert.ok(!/\.navtools\{display:grid!important/.test(html),"quedó la grilla de 5 columnas");
});
w.close();
if(failed){console.error(`\n${failed} comprobaciones fallidas`);process.exit(1)}
console.log("\nBotonera del Lexicon: todas las comprobaciones pasaron");
