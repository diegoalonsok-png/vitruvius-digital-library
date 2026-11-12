#!/usr/bin/env node
/* Validación de las URN CTS del catálogo.
 *
 * Motivo: Perseus comunicó un error de sintaxis CTS en todo el catálogo.
 *
 * Gramática CTS (CITE Architecture, CTS URN 3.0):
 *
 *   urn:cts:<espacio>:<obra>[:<pasaje>]
 *   obra   = grupo[.obra[.versión[.ejemplar]]]      ← como máximo CUATRO
 *   pasaje = cita[-cita]                            ← tras DOS PUNTOS
 *   subreferencia = @…                              ← dentro de la cita
 *
 * Es decir: puntos entre grupo, obra y versión, y dos puntos antes del pasaje:
 *
 *   urn:cts:greekLit:tlg0086.tlg031.1st1K-grc1:2.2
 *
 * El catálogo usa en cambio guiones bajos entre los componentes y un punto
 * donde debería haber dos puntos:
 *
 *   urn:cts:greekLit:tlg0086.tlg031.1st1K-grc1:2.2
 *
 * Leída así, la referencia no resuelve en ningún servidor CTS: el grupo pasa a
 * llamarse «tlg0086_tlg031_1st1K-grc1» y el pasaje se interpreta como obra,
 * versión y ejemplar, y cuando hay más de cuatro componentes la URN es además
 * sintácticamente inválida.
 *
 * Uso: node scripts/validate-cts-urns.mjs [--list N] [--report]
 */
import {readFileSync,readdirSync,statSync,writeFileSync,mkdirSync,existsSync} from "node:fs";
import {join} from "node:path";

const LIST=(()=>{const i=process.argv.indexOf("--list");return i>0?Number(process.argv[i+1])||5:5})();
const WRITE=process.argv.includes("--report");
const REPORT="reports/validacion-cts.md";

/* Caracteres admitidos en un componente: alfanuméricos ASCII, guion y guion
   bajo. El punto es separador y los dos puntos delimitan el pasaje. */
const COMPONENT=/^[A-Za-z0-9_-]+$/;
const CITATION=/^[A-Za-z0-9_.-]+(@[^-]*)?$/;

function validate(urn){
 const problems=[];
 if(!urn.startsWith("urn:cts:"))return [{code:"prefijo",detail:"no empieza por urn:cts:"}];
 const rest=urn.slice("urn:cts:".length);
 const parts=rest.split(":");
 if(parts.length>3)problems.push({code:"dos-puntos",detail:parts.length+" segmentos separados por dos puntos; como máximo espacio, obra y pasaje"});
 const [namespace,work,passage]=parts;
 if(!namespace||!COMPONENT.test(namespace))problems.push({code:"espacio",detail:"espacio de nombres inválido: "+JSON.stringify(namespace||"")});
 if(!work){
  problems.push({code:"obra-ausente",detail:"falta el identificador de obra"});
  return problems;
 }
 const components=work.split(".");
 if(components.length>4)problems.push({code:"exceso-componentes",detail:components.length+" componentes en el identificador de obra; el máximo es cuatro (grupo.obra.versión.ejemplar)"});
 for(const component of components)
  if(!COMPONENT.test(component))problems.push({code:"componente",detail:"componente inválido: "+JSON.stringify(component)});
 if(passage!==undefined&&passage!==""){
  for(const citation of passage.split("-"))
   if(!CITATION.test(citation))problems.push({code:"pasaje",detail:"cita inválida: "+JSON.stringify(citation)});
 }
 /* Diagnóstico de resolución: un identificador de obra cuyo primer componente
    contiene guiones bajos que parecen unir grupo, obra y versión, y cuyos
    componentes siguientes son números, es la forma que Perseus no resuelve. */
 const first=components[0]||"";
 const joined=/^(tlg|phi|stoa)\d+_/.test(first)||/_(tlg|phi)\d+_/.test(first);
 const numericTail=components.slice(1).some(component=>/^\d+$/.test(component));
 if(joined)problems.push({code:"guiones-bajos",detail:"grupo, obra y versión unidos por guion bajo en lugar de punto: "+first});
 if(joined&&numericTail)problems.push({code:"pasaje-sin-dos-puntos",detail:"el pasaje va tras un punto y no tras dos puntos, de modo que se lee como obra o versión"});
 if(/\.segment-\d+$/.test(work))problems.push({code:"segmento",detail:"cola «segment-N» dentro del identificador de obra; en CTS una subreferencia va con @ dentro de la cita"});
 return problems;
}

/* ── recolección ─────────────────────────────────────────────────────────── */

const URN=/urn:cts:[A-Za-z0-9_.:@\-]+/g;
const skip=new Set([".git","node_modules","images","documents"]);
/* El registro de migración guarda a propósito las URN antiguas como claves, y
   los informes las citan como ejemplo: no son usos del catálogo y no se
   validan. Los guiones de este directorio también las citan en sus
   comentarios, por eso se excluyen. */
const exempt=[/data\/index\/cts-urn-migration\.json$/,/^reports[/\\]/,/^scripts[/\\]/,/ESPECIFICACION-|PROPUESTAS-|ESTADO-DEL-TRABAJO/];
const occurrences=new Map();   // urn → Set(archivos)
function walk(dir){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(skip.has(entry.name))continue;
  const path=join(dir,entry.name);
  if(entry.isDirectory()){walk(path);continue}
  if(!/\.(json|js|mjs|html|md|py|xml)$/.test(entry.name))continue;
  if(exempt.some(pattern=>pattern.test(path.replace(/^\.\//,""))))continue;
  if(statSync(path).size>40*1024*1024)continue;
  let text;
  try{text=readFileSync(path,"utf8")}catch{continue}
  if(!text.includes("urn:cts:"))continue;
  for(const hit of text.matchAll(URN)){
   const urn=hit[0].replace(/[.,;)\]]+$/,"");
   if(!occurrences.has(urn))occurrences.set(urn,new Set());
   occurrences.get(urn).add(path);
  }
 }
}
walk(".");

/* ── censo ───────────────────────────────────────────────────────────────── */

const byCode=new Map();
const filesWithProblems=new Map();
let valid=0,invalid=0;
const samples=new Map();
for(const [urn,files] of occurrences){
 const problems=validate(urn);
 if(!problems.length){valid++;continue}
 invalid++;
 for(const problem of problems){
  byCode.set(problem.code,(byCode.get(problem.code)||0)+1);
  if(!samples.has(problem.code))samples.set(problem.code,[]);
  if(samples.get(problem.code).length<LIST)samples.get(problem.code).push({urn,detail:problem.detail,file:[...files][0]});
 }
 for(const file of files)filesWithProblems.set(file,(filesWithProblems.get(file)||0)+1);
}

const CODE_LABEL={
 "guiones-bajos":"Grupo, obra y versión unidos por guion bajo",
 "pasaje-sin-dos-puntos":"Pasaje tras un punto en lugar de dos puntos",
 "segmento":"Cola «segment-N» dentro del identificador de obra",
 "exceso-componentes":"Más de cuatro componentes en el identificador de obra",
 "componente":"Carácter no admitido en un componente",
 "pasaje":"Cita de pasaje inválida",
 "espacio":"Espacio de nombres inválido",
 "dos-puntos":"Demasiados segmentos separados por dos puntos",
 "obra-ausente":"Falta el identificador de obra",
 "prefijo":"No empieza por urn:cts:"
};

console.log("URN CTS distintas: "+occurrences.size.toLocaleString("es-AR"));
console.log("  válidas: "+valid.toLocaleString("es-AR"));
console.log("  inválidas: "+invalid.toLocaleString("es-AR"));
console.log("archivos afectados: "+filesWithProblems.size);
console.log("\nPor tipo de problema:");
for(const [code,count] of [...byCode].sort((a,b)=>b[1]-a[1]))
 console.log("  "+String(count).padStart(7)+"  "+(CODE_LABEL[code]||code));
console.log("\nEjemplos:");
for(const [code,list] of samples){
 console.log("  "+(CODE_LABEL[code]||code));
 for(const sample of list)console.log("     "+sample.urn.slice(0,84));
}

if(WRITE){
 const lines=["# Validación de las URN CTS","",
  "Generado por `scripts/validate-cts-urns.mjs` el "+new Date().toISOString().slice(0,10)+".","",
  "## Gramática aplicada","",
  "CTS URN 3.0 (CITE Architecture): `urn:cts:<espacio>:<grupo>[.<obra>[.<versión>[.<ejemplar>]]][:<pasaje>]`.",
  "Puntos entre los componentes de la obra, como máximo cuatro, y **dos puntos** antes del pasaje.","",
  "## Censo","","| | |","| --- | --- |",
  "| URN distintas | "+occurrences.size.toLocaleString("es-AR")+" |",
  "| Válidas | "+valid.toLocaleString("es-AR")+" |",
  "| Inválidas | **"+invalid.toLocaleString("es-AR")+"** |",
  "| Archivos afectados | "+filesWithProblems.size+" |","",
  "## Por tipo de problema","","| Apariciones | Problema |","| --- | --- |"];
 for(const [code,count] of [...byCode].sort((a,b)=>b[1]-a[1]))
  lines.push("| "+count.toLocaleString("es-AR")+" | "+(CODE_LABEL[code]||code)+" |");
 lines.push("","## Ejemplos por tipo","");
 for(const [code,list] of samples){
  lines.push("### "+(CODE_LABEL[code]||code),"");
  lines.push("| URN | Archivo |","| --- | --- |");
  for(const sample of list)lines.push("| `"+sample.urn+"` | `"+sample.file+"` |");
  lines.push("");
 }
 lines.push("## Archivos con más URN inválidas","","| Archivo | URN inválidas |","| --- | --- |");
 for(const [file,count] of [...filesWithProblems].sort((a,b)=>b[1]-a[1]).slice(0,25))
  lines.push("| `"+file+"` | "+count+" |");
 mkdirSync("reports",{recursive:true});
 writeFileSync(REPORT,lines.join("\n")+"\n");
 console.log("\nInforme: "+REPORT);
}
process.exitCode=invalid?1:0;
