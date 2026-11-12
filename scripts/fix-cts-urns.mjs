#!/usr/bin/env node
/* Corrección de las URN CTS a la sintaxis de la especificación.
 *
 * Perseus comunicó un error de sintaxis CTS en todo el catálogo.
 * scripts/validate-cts-urns.mjs lo cuantificó: 84.134 de 86.315 URN mal
 * formadas en 123 archivos. La forma del catálogo era
 *
 *   urn:cts:greekLit:tlg0058.tlg001.perseus-grc2:praef.1
 *
 * y la de la especificación (CTS URN 3.0) es
 *
 *   urn:cts:greekLit:tlg0058.tlg001.perseus-grc2:praef.1
 *
 * La transformación es mecánica y reversible:
 *   · los guiones bajos que unen grupo, obra y versión pasan a puntos;
 *   · el pasaje pasa de ir tras un punto a ir tras dos puntos;
 *   · la cola «segment-N», que viene del atributo @n de la fuente XML y no es
 *     parte de la cita CTS, sale de la URN y se conserva en el registro de
 *     migración, de modo que no se pierde ningún dato.
 *
 * No se inventa ninguna referencia: cada URN nueva se compone con las piezas
 * de la antigua. El registro queda en data/index/cts-urn-migration.json para
 * poder deshacer la operación o cotejarla pieza por pieza.
 *
 * Uso: node scripts/fix-cts-urns.mjs [--check]
 */
import {readFileSync,writeFileSync,readdirSync,statSync,mkdirSync} from "node:fs";
import {join} from "node:path";

const CHECK=process.argv.includes("--check");
const MIGRATION="data/index/cts-urn-migration.json";
const URN=/urn:cts:[A-Za-z0-9_.:@\-]+/g;
const skip=new Set([".git","node_modules","images","documents","reports"]);

/* Grupos de la forma del catálogo: prefijo conocido + número. */
const GROUP=/^((?:tlg|phi|stoa)\d+)_((?:tlg|phi|stoa)\d+)_(.+)$/;

/* Devuelve {urn, segment} o null si no hay nada que corregir. */
function repair(urn){
 if(!urn.startsWith("urn:cts:"))return null;
 const rest=urn.slice(8);
 const segments=rest.split(":");
 if(segments.length<2)return null;
 const namespace=segments[0];
 let work=segments[1];
 const passageGiven=segments.length>2?segments.slice(2).join(":"):"";
 const components=work.split(".");
 const head=components[0];
 const parsed=head.match(GROUP);
 if(!parsed)return null;                       // ya está bien formada, o es otra cosa
 const [,textgroup,workId,version]=parsed;
 let tail=components.slice(1);
 /* La cola «segment-N» no es una cita: se aparta. */
 let segment=null;
 if(tail.length&&/^segment-\d+$/.test(tail[tail.length-1])){
  segment=tail[tail.length-1].slice("segment-".length);
  tail=tail.slice(0,-1);
 }
 const passage=[tail.join("."),passageGiven].filter(Boolean).join(".");
 const identifier=[textgroup,workId,version].join(".");
 const fixed="urn:cts:"+namespace+":"+identifier+(passage?":"+passage:"");
 if(fixed===urn&&!segment)return null;
 return {urn:fixed,segment};
}

/* ── recorrido ───────────────────────────────────────────────────────────── */

const files=[];
function walk(dir){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  if(skip.has(entry.name))continue;
  const path=join(dir,entry.name);
  if(entry.isDirectory()){walk(path);continue}
  if(!/\.(json|js|mjs|html|md|py|xml)$/.test(entry.name))continue;
  if(statSync(path).size>40*1024*1024)continue;
  files.push(path);
 }
}
walk(".");

const mapping=new Map();
let touchedFiles=0,replacements=0,withSegment=0;
const perFile=[];

for(const path of files){
 let text;
 try{text=readFileSync(path,"utf8")}catch{continue}
 if(!text.includes("urn:cts:"))continue;
 let count=0;
 const next=text.replace(URN,match=>{
  /* La puntuación final puede pertenecer al documento y no a la URN. */
  const trailing=match.match(/[.,;)\]]+$/);
  const core=trailing?match.slice(0,-trailing[0].length):match;
  const result=repair(core);
  if(!result)return match;
  count++;
  if(!mapping.has(core)){
   mapping.set(core,{to:result.urn,segment:result.segment});
   if(result.segment)withSegment++;
  }
  return result.urn+(trailing?trailing[0]:"");
 });
 if(!count)continue;
 replacements+=count;
 touchedFiles++;
 perFile.push({path,count});
 if(!CHECK)writeFileSync(path,next);
}

if(!CHECK){
 mkdirSync("data/index",{recursive:true});
 writeFileSync(MIGRATION,JSON.stringify({
  schema:"vitruvia-cts-urn-migration-v1",
  date:new Date().toISOString().slice(0,10),
  reason:"Correccion de la sintaxis CTS comunicada por Perseus. Los guiones bajos que unian grupo, obra y version pasan a puntos; el pasaje pasa a ir tras dos puntos; la cola segment-N, procedente del atributo @n de la fuente XML y ajena a la cita CTS, sale de la URN y se conserva aqui.",
  specification:"CTS URN 3.0, CITE Architecture",
  entries:mapping.size,
  withSegment,
  map:Object.fromEntries([...mapping].map(([from,value])=>[from,value.segment?[value.to,value.segment]:[value.to]]))
 }));
}

console.log((CHECK?"[comprobación] ":"")+"URN corregidas: "+replacements.toLocaleString("es-AR")+
 " · distintas: "+mapping.size.toLocaleString("es-AR")+" · con cola segment-N: "+withSegment.toLocaleString("es-AR"));
console.log("archivos afectados: "+touchedFiles);
for(const entry of perFile.sort((a,b)=>b.count-a.count).slice(0,8))
 console.log("  "+String(entry.count).padStart(6)+"  "+entry.path);
const sample=[...mapping].slice(0,4);
console.log("\nEjemplos:");
for(const [from,value] of sample){
 console.log("  antes:   "+from);
 console.log("  después: "+value.to+(value.segment?"   (segment "+value.segment+" conservado en el registro)":""));
}
if(!CHECK)console.log("\nRegistro de migración: "+MIGRATION);
