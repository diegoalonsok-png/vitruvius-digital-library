/* El repertorio onomástico: que se pueda hojear sin escribir, que las cifras sean las
   del archivo de datos y que cada ficha distinga lo verificado de lo pendiente. */
import {readFileSync,existsSync} from "node:fs";
import {JSDOM} from "jsdom";
const plenum=JSON.parse(readFileSync("data/onomasticon-plenum.json","utf8"));
const ono=JSON.parse(readFileSync("data/onomasticon-vitruvianum.json","utf8"));
const st=JSON.parse(readFileSync("data/structured/recensio-es.json","utf8"));
let fallos=0;
const check=(c,m)=>{if(!c){console.error("  ✗ "+m);fallos++}else console.log("  ✓ "+m)};

console.log("cifras del onomasticon, recalculadas desde el texto");
const GR=/[Ͱ-Ͽἀ-῿]+/g, LAT=/[A-Za-zÀ-ÿ]+/g;
let lat=0,grk=0;
for(const p of st.passages){const t=p.latin||"";grk+=(t.match(GR)||[]).length;lat+=((t.replace(GR," ")).match(LAT)||[]).length}
check(ono.totals.latinWords===lat,`palabras latinas: ${ono.totals.latinWords} = recuento ${lat}`);
check(ono.totals.greekWords===grk,`palabras griegas: ${ono.totals.greekWords} = recuento ${grk}`);
check(ono.totals.passages===st.passages.length,`pasajes: ${ono.totals.passages}`);
check(ono.totals.persons===ono.entities.filter(e=>e.kind==="person").length,`personas: ${ono.totals.persons}`);
check(ono.totals.places===ono.entities.filter(e=>e.kind==="place").length,`lugares: ${ono.totals.places}`);
check(typeof ono.countingConvention==="string"&&ono.countingConvention.length>80,"la convención de recuento está declarada");

console.log("\nrepertorio");
check(plenum.nombres.length>400,`${plenum.nombres.length} grupos de nombres propios`);
check(plenum.vocesGriegas.length>100,`${plenum.vocesGriegas.length} voces griegas`);
const funcion=new Set(["sin","his","sunt","fiunt","eadem","columnae"]);
check(!plenum.nombres.some(n=>funcion.has(n.formaPrincipal.toLowerCase())),
  "ninguna palabra de función ni nombre común entre los nombres propios");
check(plenum.nombres.every(n=>n.loci.length>0),"todo grupo tiene al menos un locus");
check(plenum.nombres.every(n=>!/\s/.test(n.formaPrincipal)||n.formasAtestiguadas.every(f=>/\s/.test(f.forma))),
  "el rótulo del grupo es una forma de una sola palabra cuando existe");
const conFicha=plenum.nombres.filter(n=>n.ficha);
check(conFicha.length>0,`${conFicha.length} grupos con ficha del autor`);
check(conFicha.every(n=>n.ficha.atestiguacionTextual&&n.ficha.autoridadProsopografica),
  "toda ficha separa atestiguación textual de autoridad prosopográfica");
check(conFicha.every(n=>n.ficha.autoridadProsopografica.citada||n.ficha.autoridadProsopografica.nota),
  "la ficha sin autoridad citada explica qué falta");
const ecd=plenum.nombres.filter(n=>n.aparatoQueLoMenciona.length);
check(ecd.length>0,`${ecd.length} grupos con glosa ecdótica`);
check(ecd.every(n=>n.aparatoQueLoMenciona.every(a=>a.texto&&a.locus)),
  "cada glosa ecdótica trae su texto y su locus");

console.log("\npágina");
const html=readFileSync("onomasticon.html","utf8");
check(!/ov-share-buttons/.test(html),"los botones de compartir fueron retirados");
check(/scholarly-query-tools\.js/.test(html),"se carga el módulo académico del Lexicon");
check(/id="on-alphabet"/.test(html)&&/id="on-chips"/.test(html),"hay índice alfabético y filtros por categoría");
const tools=readFileSync("assets/scholarly-query-tools.js","utf8");
check(/"onomasticon\.html":\{input:"ov-search"/.test(tools),"la página está registrada en el módulo");

const dom=new JSDOM(html,{url:"https://e.org/onomasticon.html",runScripts:"outside-only",pretendToBeVisual:true});
const {window}=dom;
window.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
window.fetch=async u=>{const path=String(u).split("?")[0].replace(/^https?:\/\/[^/]+\//,"");
 return existsSync(path)?{ok:true,status:200,json:async()=>JSON.parse(readFileSync(path,"utf8"))}:{ok:false,status:404,json:async()=>({})}};
for(const s of window.document.querySelectorAll("script[src]")){
 const p=s.getAttribute("src").split("?")[0];
 if(!existsSync(p))continue;
 let code=readFileSync(p,"utf8");
 if(s.type==="module")code=code.replace(/^\s*export\s+/gm,"");
 try{window.eval(code)}catch(e){console.error("  ✗ "+p+": "+e.message);fallos++}
}
window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
await new Promise(r=>setTimeout(r,800));
const botones=window.document.querySelectorAll("#on-list button").length;
check(botones>0,`la lista se puebla con ${botones} entradas pulsables`);
check(window.document.querySelectorAll("#on-alphabet button").length>10,"el índice alfabético se pinta");
check(window.document.querySelectorAll("#on-chips button").length>=6,"los filtros por categoría se pintan");
window.document.querySelector("#on-list button")?.click();
await new Promise(r=>setTimeout(r,80));
const ficha=window.document.getElementById("on-card").textContent;
check(/Glosa filológica/.test(ficha),"la ficha muestra la glosa filológica");
check(/Glosa ecdótica/.test(ficha),"la ficha muestra la glosa ecdótica");
check(/Atestiguación textual verificada/.test(ficha),"la ficha declara la atestiguación verificada");
check(window.document.querySelectorAll("#on-card .on-loci a").length>0,"los loci son enlaces al lector");
console.log("\nse llega sin escribir");
const selNombre=window.document.getElementById("on-nombre");
const selLibro=window.document.getElementById("on-libro");
const selClase=window.document.getElementById("on-clase");
check(selNombre&&selNombre.options.length>100,`el desplegable de nombres trae ${selNombre?.options.length} opciones`);
check(selLibro&&selLibro.options.length>=10,`el desplegable de libros trae ${selLibro?.options.length} opciones`);
check(!!selClase,"hay desplegable de clase");
if(selNombre&&selNombre.options.length>2){
 selNombre.value=selNombre.options[2].value;
 selNombre.dispatchEvent(new window.Event("change"));
 await new Promise(r=>setTimeout(r,80));
 check(/Glosa filológica/.test(window.document.getElementById("on-card").textContent),
   "elegir en el desplegable abre la ficha, sin teclear");
}
if(selLibro&&selLibro.options.length>2){
 const antes=window.document.querySelectorAll("#on-list button").length;
 selLibro.value=selLibro.options[1].value;
 selLibro.dispatchEvent(new window.Event("change"));
 await new Promise(r=>setTimeout(r,80));
 const despues=window.document.querySelectorAll("#on-list button").length;
 check(despues>0&&despues<=antes,`filtrar por libro acota la lista (${antes} → ${despues})`);
 selLibro.value="";selLibro.dispatchEvent(new window.Event("change"));
 await new Promise(r=>setTimeout(r,60));
}

console.log("\nencabezado al modo Lexicon");
check(!!window.document.querySelector(".on-logo"),"hay logotipo del Onomasticon");
check(window.document.querySelectorAll(".on-navlinks a").length>=12,
  `la rejilla de enlaces trae ${window.document.querySelectorAll(".on-navlinks a").length} destinos`);
check(!!window.document.getElementById("lxp-palette"),"la botonera de fondo del Lexicon está montada");
check(window.document.querySelectorAll(".lxp-swatch").length===9,"la paleta ofrece los nueve fondos");
check(!!window.document.getElementById("ov-language"),"el selector de idioma se conservó");

const tool=window.document.getElementById("scholarly-query-tools");
check(!!tool,"el módulo académico se insertó en la página");
if(tool)check(/Copiar referencia/.test(tool.textContent),"el módulo ofrece copiar la referencia citable");

console.log(fallos?`\n${fallos} comprobaciones fallidas`:"\nTodas las comprobaciones pasaron");
process.exit(fallos?1:0);
