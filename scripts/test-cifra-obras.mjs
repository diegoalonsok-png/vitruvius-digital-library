/* Prueba de la cifra que se actualiza sola: los rótulos marcados con data-cifra
   toman el número de data/cifras-corpus.json, y si el archivo no carga queda el
   número escrito en la página. Sin red. */
import {JSDOM} from "jsdom";
import fs from "node:fs";
import assert from "node:assert/strict";

const PAGINAS=["control-calidad-corpus.html","classics-manuscript-coverage.html","bibliotheca-graeca-latina.html"];
const cifras=JSON.parse(fs.readFileSync("data/cifras-corpus.json","utf8"));
const repertorio=JSON.parse(fs.readFileSync("data/bibliotheca-graeca-latina-I-bce-I-ce.json","utf8"));
const modulo=fs.readFileSync("assets/cifra-obras.js","utf8");
let failed=0;
const check=(label,fn)=>{try{fn();console.log("PASS",label)}catch(e){failed++;console.error("FAIL",label,e.message)}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

check("las cifras publicadas coinciden con el catálogo maestro",()=>{
 assert.equal(cifras.schema,"vdl-cifras-corpus-1");
 assert.equal(cifras.obras,repertorio.works.length,
  "data/cifras-corpus.json quedó viejo: correr scripts/cifras-corpus.py");
});

for(const pagina of PAGINAS){
 const html=fs.readFileSync(pagina,"utf8");
 check(`${pagina} marca la cifra en vez de escribirla a mano`,()=>{
  assert.match(html,/data-cifra="obras"/,"no quedó ningún rótulo marcado");
  assert.match(html,/assets\/cifra-obras\.js/,"falta el módulo que completa la cifra");
 });
 const dom=new JSDOM(html,{runScripts:"outside-only",url:"https://vitruvius-digital-library.org/"+pagina.replace(".html","")});
 const {window}=dom;
 window.fetch=async ruta=>String(ruta)==="data/cifras-corpus.json"
  ?{ok:true,status:200,json:async()=>({...cifras,obras:999})}
  :{ok:false,status:404,json:async()=>({})};
 window.eval(modulo);
 await sleep(60);
 check(`${pagina} toma la cifra del archivo, no la del texto`,()=>{
  const nodo=window.document.querySelector('[data-cifra="obras"]');
  assert.equal(nodo.textContent,"999","quedó "+nodo.textContent);
 });
 window.close();
}

/* Si el archivo no está, la página conserva su número: nunca queda en blanco. */
const html=fs.readFileSync(PAGINAS[0],"utf8");
const dom=new JSDOM(html,{runScripts:"outside-only",url:"https://vitruvius-digital-library.org/"});
dom.window.fetch=async()=>({ok:false,status:404,json:async()=>({})});
dom.window.eval(modulo);
await sleep(60);
check("sin el archivo queda la última cifra conocida",()=>{
 const nodo=dom.window.document.querySelector('[data-cifra="obras"]');
 assert.match(nodo.textContent,/^\d{2,5}$/,"el rótulo quedó vacío: "+nodo.textContent);
});
dom.window.close();

if(failed){console.error(`\n${failed} comprobaciones fallidas`);process.exit(1)}
console.log("\nCifra de obras: todas las comprobaciones pasaron");
