/* Subrayado de rúbricas: que los datos midan lo que dicen medir y que el visor
   pinte una marca sobre cada banda detectada del folio abierto. */
import {readFileSync,existsSync} from "node:fs";
import {JSDOM} from "jsdom";
let fallos=0;
const check=(c,m)=>{if(!c){console.error("  ✗ "+m);fallos++}else console.log("  ✓ "+m)};
const rub=JSON.parse(readFileSync("data/codex-h/rubricas.json","utf8"));

console.log("datos de rúbricas");
check(rub.recuentos.imagenes>300,`${rub.recuentos.imagenes} imágenes analizadas`);
const PREF={"1r":"1.praef.1","18r":"2.praef.1","36r":"3.praef.1","47r":"4.praef.1","58v":"5.praef.1",
 "75v":"6.praef.1","90v":"7.praef.1","107v":"8.praef.1","123r":"9.praef.1","139v":"10.praef.1"};
const F=new Map(rub.folios.filter(f=>f.folio).map(f=>[f.folio,f]));
const detectados=Object.keys(PREF).filter(f=>(F.get(f)?.rubricas||[]).length);
check(detectados.length===10,`los diez prefacios tienen rúbrica detectada (${detectados.length})`);
check(rub.folios.every(f=>f.rubricas.every(b=>b.x>=0&&b.y>=0&&b.x+b.w<=1.001&&b.y+b.h<=1.001)),
  "toda caja cae dentro de la imagen, en coordenadas relativas");
check(rub.folios.every(f=>f.rubricas.every(b=>b.pixeles>=rub.umbrales.pixelesMinimosPorBanda)),
  "ninguna banda está por debajo del umbral de densidad declarado");
const medias=rub.folios.filter(f=>f.rubricas.length).map(f=>f.rubricas.length);
check(Math.max(...medias)<=6,`ningún folio acumula más de 6 bandas (máximo ${Math.max(...medias)})`);
check(/no afirma qué dice|mide tinta, no lee texto/.test(rub.advertencia),
  "los datos declaran que miden tinta y no leen texto");

console.log("\nvisor");
const url="https://e.org/codex-h-folios-local.html?"+new URLSearchParams({folio:"f.123r"});
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
for(const s of window.document.querySelectorAll("script:not([src])")){try{window.eval(s.textContent)}catch{}}
window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
await new Promise(r=>setTimeout(r,700));
const abierto=(window.document.getElementById("label")?.textContent||"").trim();
check(/123r/.test(abierto),`el visor abrió «${abierto}»`);
const marcas=window.document.querySelectorAll(".rubrica-mark");
check(marcas.length===F.get("123r").rubricas.length,
  `se pintaron ${marcas.length} marcas, las mismas que bandas detectadas`);
const uno=marcas[0];
check(uno&&/%/.test(uno.style.top)&&/%/.test(uno.style.height),
  "las marcas se posicionan en porcentaje, de modo que acompañan al zoom");
const nota=window.document.getElementById("rubrica-note")?.textContent||"";
check(/no se ha leído la escritura/.test(nota),"el visor aclara que no se leyó la escritura");
check(/Vitr\./.test(nota),"la nota cita los loci documentados del folio");
const boton=window.document.getElementById("rubrica-toggle");
check(!!boton,"hay botón para activar y desactivar el subrayado");
if(boton){
  boton.dispatchEvent(new window.Event("click"));
  await new Promise(r=>setTimeout(r,60));
  check(window.document.querySelectorAll(".rubrica-mark").length===0,"al desactivarlo, el subrayado desaparece");
}
console.log(fallos?`\n${fallos} comprobaciones fallidas`:"\nTodas las comprobaciones pasaron");
process.exit(fallos?1:0);
