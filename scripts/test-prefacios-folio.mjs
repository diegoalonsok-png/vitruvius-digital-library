/* Simula el clic en cada botón de prefacio: carga la página con el mismo enlace que
   produce la tarjeta y comprueba qué folio queda abierto en el visor. */
import {readFileSync,existsSync} from "node:fs";
import {JSDOM} from "jsdom";
const mapa=JSON.parse(readFileSync("data/codex-h/folio-locus-map.json","utf8"));
const pref=mapa.entries.flatMap(e=>(e.loci||[]).filter(l=>/^\d+\.praef\.1$/.test(l.locus)).map(l=>[l.locus,e.folio]))
  .sort((a,b)=>parseInt(a[0])-parseInt(b[0]));
let fallos=0;
for(const [locus,folio] of pref){
  // el enlace que arma assets/codex-h-preface-search.js
  const url="https://e.org/codex-h-folios-local.html?"+new URLSearchParams({folio:"f."+folio});
  const dom=new JSDOM(readFileSync("codex-h-folios-local.html","utf8"),
    {url,runScripts:"outside-only",pretendToBeVisual:true});
  const {window}=dom;
  window.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  window.fetch=async u=>{const p=String(u).split("?")[0].replace(/^https?:\/\/[^/]+\//,"");
    return existsSync(p)?{ok:true,status:200,json:async()=>JSON.parse(readFileSync(p,"utf8"))}
                        :{ok:false,status:404,json:async()=>({})}};
  for(const s of window.document.querySelectorAll("script[src]")){
    const p=s.getAttribute("src").split("?")[0];
    if(existsSync(p)){try{window.eval(readFileSync(p,"utf8"))}catch{}}
  }
  for(const s of window.document.querySelectorAll("script:not([src])")){
    try{window.eval(s.textContent)}catch{}
  }
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  await new Promise(r=>setTimeout(r,500));
  const etiqueta=window.document.getElementById("label")?.textContent||"";
  const abierto=(etiqueta.match(/f\.?\s*(\d+[rv])/i)||[])[1]||"—";
  const ok=abierto.replace(/\s/g,"")===folio;
  if(!ok)fallos++;
  console.log(`  ${ok?"✓":"✗"} ${locus.padEnd(12)} enlace ?folio=f.${folio.padEnd(5)} → abre «${etiqueta.trim()||"(sin folio)"}»`);
}
console.log(fallos?`\n${fallos} de ${pref.length} prefacios NO abren su folio`:`\nlos ${pref.length} prefacios abren su folio`);
