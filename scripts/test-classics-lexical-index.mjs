#!/usr/bin/env node
/* Pruebas de assets/classics-lexical-index.js contra el índice real.
 * Se inyecta un lector de archivos en lugar de fetch, de modo que la prueba
 * recorre exactamente los mismos archivos que servirá GitHub Pages.
 * Ejecutar: node scripts/test-classics-lexical-index.mjs
 */
import {readFileSync,existsSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const P=require("../assets/vitruvia-philology.js");
const Index=require("../assets/classics-lexical-index.js");

if(!existsSync("data/index/classics/manifest.json")){
 console.error("Falta el índice. Ejecutar: node scripts/build-classics-lexical-index.mjs");
 process.exit(1);
}
let requests=0,bytes=0;
Index.setReader(async path=>{
 requests++;
 const text=readFileSync(path,"utf8");
 bytes+=Buffer.byteLength(text);
 return JSON.parse(text);
});

let pass=0,fail=0;
function yes(name,value,detail){if(value)pass++;else{fail++;console.log("  FALLA  "+name+(detail?"\n     "+detail:""))}}
function ok(name,got,want){const g=String(got),w=String(want);if(g===w)pass++;else{fail++;console.log("  FALLA  "+name+"\n     obtenido: "+g+"\n     esperado: "+w)}}
const group=t=>console.log("\n"+t);

const manifest=await Index.manifest();
group("Manifiesto");
yes("ediciones indexadas",manifest.works>200,"obras: "+manifest.works);
yes("pasajes",manifest.passages>100000,"pasajes: "+manifest.passages);
yes("declara que no es lematización",/no es lematizacion|no afirma analisis/i.test(manifest.method));
yes("declara el límite de pasajes por obra",/hasta \d+ pasajes por obra/i.test(manifest.method),manifest.method.slice(0,200));
yes("cada obra lleva su atribución",manifest.index.every(w=>typeof w.attribution==="string"));
yes("cada obra lleva su licencia",manifest.index.filter(w=>w.license).length>manifest.works*0.8);
const conHuella=manifest.index.filter(w=>w.sha256).length;
yes("la mayoría de las ediciones externas traen huella de su fuente",conHuella>150,
 "con sha256: "+conHuella+" de "+manifest.works+" (las ediciones propias no la llevan: su fuente es el repositorio)");
yes("las ediciones propias de Vitruvio están indexadas",
 manifest.index.filter(w=>/^vitruvius-/.test(w.id)).length>=4,
 "propias: "+manifest.index.filter(w=>/^vitruvius-/.test(w.id)).map(w=>w.id).join(", "));

group("Latín · la flexión encuentra la forma de diccionario");
const before=requests;
const symmetria=await Index.lookup("symmetria");
yes("peticiones por consulta: catálogo, fragmento y manifiesto",requests-before<=3,"peticiones: "+(requests-before));
yes("symmetria aparece en el corpus",symmetria.total>0,"apariciones: "+symmetria.total+" en "+symmetria.works+" ediciones");
yes("y aparece en el propio Vitruvio",symmetria.hits.some(h=>/^vitruvius-/.test(h.work.id)),
 "ediciones: "+symmetria.hits.map(h=>h.work.id+" ("+h.count+")").slice(0,4).join(", "));
const flexionada=await Index.lookup("symmetriae");
ok("symmetriae cae en la misma raíz",flexionada.stem,symmetria.stem);
ok("y da el mismo recuento",flexionada.total,symmetria.total);
const arch=await Index.lookup("architecti");
yes("architecti encuentra architectus y familia",arch.total>0,"apariciones: "+arch.total);
yes("frecuencia normalizada por obra",arch.hits.every(h=>h.per10k===null||h.per10k>=0));

group("Griego");
const logos=await Index.lookup("λόγος");
yes("λόγος aparece",logos.total>0,"apariciones: "+logos.total+" en "+logos.works+" ediciones");
const logou=await Index.lookup("λόγου");
ok("λόγου cae en la misma raíz",logou.stem,logos.stem);
const sinAcentos=await Index.lookup("λογος");
ok("sin acentos, misma raíz",sinAcentos.stem,logos.stem);

group("Distribución");
const dist=Index.distribution(logos);
yes("agrupa por lengua",dist.length>=1&&dist[0].language==="grc");
yes("declara frecuencia por diez mil palabras",dist[0].per10k>0,"por 10k: "+dist[0].per10k);

group("Concordancia verificada contra la edición");
const kwic=await Index.concordance(logos,{works:2,perWork:3});
yes("devuelve líneas de concordancia",kwic.length>0,"líneas: "+kwic.length);
yes("cada línea trae su locus",kwic.every(r=>typeof r.locus==="string"));
yes("la coincidencia está en el texto real",kwic.every(r=>P.fold(r.hit).includes(logos.stem)||P.fold(r.left+r.hit+r.right).includes(logos.stem)),
 "primera: "+JSON.stringify(kwic[0]&&kwic[0].hit));
yes("queda marcada como verificada",kwic.every(r=>r.verified===true));

group("Forma exacta: el índice propone, la edición decide");
const exacta=await Index.concordance(await Index.lookup("architectus"),{works:3,perWork:4,exact:"architectus"});
yes("sólo pasajes con la forma exacta",exacta.every(r=>P.fold(r.left+r.hit+r.right).split(" ").includes(P.fold("architectus"))),
 "líneas: "+exacta.length);

group("Frase");
const frase=await Index.phraseSearch("ratiocinatione et fabrica");
yes("intersecta por obra antes de bajar texto",frase.candidateWorks>=0,"obras candidatas: "+frase.candidateWorks);
/* Dos niveles, y cada uno con su exigencia: la línea rotulada como frase
   literal tiene que contener la frase; la rotulada como otro orden, todas sus
   palabras. Una línea del segundo nivel no debe presentarse como la frase. */
const buscada="ratiocinatione et fabrica";
yes("cada línea cumple lo que su rótulo promete",
 frase.rows.every(r=>{
  const texto=P.fold(r.left+r.hit+r.right);
  if(r.match==="frase literal")return texto.includes(P.fold(buscada));
  const palabras=P.fold(buscada).split(" ").filter(w=>w.length>=3);
  const presentes=new Set(texto.split(" "));
  const raices=new Set([...presentes].map(w=>P.stem(w)));
  return palabras.every(w=>presentes.has(w)||raices.has(P.stem(w)));
 }),
 "líneas: "+frase.rows.length+" (literales "+frase.literal+", en otro orden "+frase.reordered+")");
yes("las líneas en otro orden se rotulan como tales",
 frase.rows.filter(r=>r.match!=="frase literal").every(r=>/otro orden/.test(r.match||"")));

group("Coste");
console.log("  "+requests+" peticiones · "+(bytes/1048576).toFixed(2)+" MB leídos en toda la batería");
yes("una consulta léxica no descarga el corpus",bytes/1048576<30,"MB: "+(bytes/1048576).toFixed(1));

console.log("\n"+pass+" correctas · "+fail+" fallidas");
process.exit(fail?1:0);
