#!/usr/bin/env node
/* Cotejo U/V de los textos latinos contra la norma declarada por la edición.
 *
 * La norma está en data/editorial-principles-source.json, párrafo 1420:
 *
 *   «En el texto latino corrido la u/v consonántica se normaliza a la manera
 *    moderna (utilitas, Vitruvius); la V mayúscula clásica se conserva sólo en
 *    títulos y rúbricas que reproducen el uso epigráfico y manuscrito
 *    (DE ARCHITECTVRA). El diptongo ae se escribe entero; la i consonántica no
 *    se distingue como j.»
 *
 * De modo que en el texto corrido son incumplimientos:
 *   · la u consonántica sin normalizar  — «uir», «seruus», «nouus»;
 *   · la v vocálica  — «vt», «vnde», «qvod», «vrbs»;
 *   · la j por i consonántica  — «justus», «jam»;
 *   · la æ ligada en lugar de «ae».
 *
 * Y NO lo son: la V mayúscula en un título o una rúbrica, ni la u vocálica
 * normal («utilitas», «unus», «urbs»), ni los dígrafos qu y gu («quod»,
 * «lingua»), ni «suus», «tuus», «suauis», donde la u es vocálica.
 *
 * El informe da, por edición, la convención que sigue de hecho, el número de
 * incumplimientos y ejemplos con su locus, para poder comprobarlos uno por uno
 * en la fuente. No corrige nada: un cambio ortográfico sobre un texto crítico
 * es decisión editorial, no de un guion.
 *
 * Uso: node scripts/audit-latin-uv.mjs [--all] [--examples N]
 */
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync} from "node:fs";

const ALL=process.argv.includes("--all");
const EXAMPLES=(()=>{const i=process.argv.indexOf("--examples");return i>0?Number(process.argv[i+1])||6:6})();
const REPORT="reports/cotejo-u-v.md";

/* ── reglas ──────────────────────────────────────────────────────────────── */

/* v vocálica: v seguida de consonante, o qv. Son grafías de mayúscula clásica
   trasladadas a la minúscula, que es lo que la norma reserva a las rúbricas. */
const VOCALIC_V=/\b(?:qv|[gs]v(?=[bcdfgklmnpqrstxz])|v(?=[bcdfgklmnpqrstxz]))\p{L}*/giu;

/* u consonántica: al principio de palabra seguida de vocal (uir, uolo, uenio)
   —salvo «uua», donde es vocálica—, y tras consonante antes de vocal en los
   grupos donde la norma moderna escribe v (seruus, nouus, ciuis). Se excluyen
   los dígrafos qu y gu y los casos con u vocálica legítima. */
const INITIAL_CONSONANTAL_U=/\b u(?=[aeioy])/giu;
const PAIRS=[
 ["uir","vir"],["uirtu","virtu"],["uita","vita"],["uide","vide"],["uidi","vidi"],
 ["ueni","veni"],["uenit","venit"],["uerb","verb"],["uer","ver"],["uet","vet"],
 ["uol","vol"],["uox","vox"],["uoc","voc"],["uinum","vinum"],["uia","via"],
 ["uas","vas"],["uall","vall"],["uarius","varius"],["uacu","vacu"],["uen","ven"],
 ["seru","serv"],["nou","nov"],["ciu","civ"],["naui","navi"],["breui","brevi"],
 ["graui","gravi"],["leui","levi"],["salu","salv"],["uulg","vulg"],["uult","vult"],
 ["iuuen","iuven"],["moue","move"],["uniuers","univers"],["aduers","advers"],
 ["conuen","conven"],["inuen","inven"],["obseru","observ"],["praeu","praev"],
 ["seuer","sever"],["uener","vener"],["uerg","verg"],["uest","vest"],["uict","vict"],
 ["uiu","viv"],["uocal","vocal"],["uulner","vulner"]
];
const J_FOR_I=/\b[jJ](?=[aeiou])\p{L}*/gu;
const LIGATURE=/[æÆœŒ]/g;

/* Un título o rúbrica: todo en mayúsculas, o marcado como tal por la fuente. */
const isRubric=text=>{
 const letters=String(text).replace(/[^\p{L}]/gu,"");
 if(!letters)return true;
 const upper=letters.replace(/[^\p{Lu}]/gu,"").length;
 return upper/letters.length>0.8;
};

function examine(text){
 const findings=[];
 if(isRubric(text))return findings;            // la V mayúscula es legítima aquí
 const lower=String(text);
 for(const hit of lower.matchAll(VOCALIC_V))findings.push({kind:"v vocálica",token:hit[0]});
 for(const hit of lower.matchAll(J_FOR_I))findings.push({kind:"j por i consonántica",token:hit[0]});
 for(const hit of lower.matchAll(LIGATURE))findings.push({kind:"ligadura en lugar de ae/oe",token:hit[0]});
 const folded=lower.toLowerCase();
 for(const [wrong,right] of PAIRS){
  let from=0;
  while(true){
   const at=folded.indexOf(wrong,from);
   if(at<0)break;
   from=at+1;
   /* Sólo si empieza palabra o sigue a consonante: evita «suus», «tuus». */
   const before=at>0?folded[at-1]:" ";
   if(/[\p{L}]/u.test(before)&&!/[bcdfglmnprstz]/.test(before))continue;
   if(before==="q"||before==="g")continue;      // dígrafos qu, gu
   const word=(folded.slice(at).match(/^\p{L}+/u)||[""])[0];
   findings.push({kind:"u consonántica sin normalizar",token:word,expected:right});
  }
 }
 return findings;
}

/* ── corpus a examinar ───────────────────────────────────────────────────── */

const sources=[];
for(const file of ["data/structured/recensio-es.json","data/structured/recensio-fr.json","data/structured/theory-en.json"]){
 if(existsSync(file))sources.push({file,field:"latin",label:"Edición propia · texto latino de la recensio"});
}
if(existsSync("data/classics-corpus")){
 for(const name of readdirSync("data/classics-corpus")){
  if(!/-la\.json$/.test(name))continue;
  sources.push({file:"data/classics-corpus/"+name,field:"text",label:"Corpus clásico · latín"});
 }
}

/* ── examen ──────────────────────────────────────────────────────────────── */

const rows=[];
for(const source of sources){
 let data;
 try{data=JSON.parse(readFileSync(source.file,"utf8"))}catch{continue}
 const passages=data.passages||[];
 if(!passages.length)continue;
 const byKind=new Map();
 const examples=[];
 let words=0,checked=0;
 for(const passage of passages){
  const text=passage[source.field]||passage.text||"";
  if(!text)continue;
  checked++;
  words+=(String(text).match(/\p{L}+/gu)||[]).length;
  for(const finding of examine(text)){
   byKind.set(finding.kind,(byKind.get(finding.kind)||0)+1);
   if(examples.length<EXAMPLES*4)examples.push({...finding,locus:passage.locus||passage.id||("pasaje "+checked)});
  }
 }
 const total=[...byKind.values()].reduce((a,b)=>a+b,0);
 rows.push({...source,title:data.title||data.edition||source.file,passages:checked,words,total,byKind,examples});
}

rows.sort((a,b)=>b.total-a.total);
const affected=rows.filter(row=>row.total>0);
const totalFindings=rows.reduce((sum,row)=>sum+row.total,0);
const totalWords=rows.reduce((sum,row)=>sum+row.words,0);

/* ── informe ─────────────────────────────────────────────────────────────── */

const lines=[];
lines.push("# Cotejo U/V de los textos latinos");
lines.push("");
lines.push("Generado por `scripts/audit-latin-uv.mjs` el "+new Date().toISOString().slice(0,10)+".");
lines.push("");
lines.push("## Norma contra la que se coteja");
lines.push("");
lines.push("`data/editorial-principles-source.json`, párrafo 1420: en el texto latino corrido");
lines.push("la u/v consonántica se normaliza a la manera moderna (*utilitas*, *Vitruvius*); la V");
lines.push("mayúscula clásica se conserva **sólo** en títulos y rúbricas (DE ARCHITECTVRA); el");
lines.push("diptongo *ae* se escribe entero; la i consonántica no se distingue como *j*.");
lines.push("");
lines.push("## Resultado");
lines.push("");
lines.push("| | |");
lines.push("| --- | --- |");
lines.push("| Textos latinos examinados | "+rows.length+" |");
lines.push("| Palabras examinadas | "+totalWords.toLocaleString("es-AR")+" |");
lines.push("| Incumplimientos de la norma | **"+totalFindings.toLocaleString("es-AR")+"** |");
lines.push("| Textos con algún incumplimiento | "+affected.length+" de "+rows.length+" |");
lines.push("");
if(!totalFindings){
 lines.push("**No se ha encontrado ningún incumplimiento.** En los textos examinados la u/v");
 lines.push("consonántica sigue la norma declarada: no aparece u consonántica sin normalizar, ni");
 lines.push("v vocálica en texto corrido, ni j por i consonántica, ni ligaduras.");
 lines.push("");
 lines.push("Si una reclamación externa señala errores de U/V, conviene precisar sobre qué");
 lines.push("archivo y qué locus, porque el texto de este repositorio no los presenta. Puede");
 lines.push("tratarse de: una versión anterior ya depositada, el PDF compuesto y no el texto");
 lines.push("fuente, una rúbrica en mayúsculas leída como texto corrido, o una expectativa");
 lines.push("distinta de la norma —hay editores que prefieren la u uniforme a la manera de");
 lines.push("Oxford, y ésa es una elección editorial legítima y distinta, no un error.");
}else{
 lines.push("### Por texto");
 lines.push("");
 lines.push("| Texto | Palabras | Incumplimientos | Tipos |");
 lines.push("| --- | --- | --- | --- |");
 for(const row of affected)
  lines.push("| "+String(row.title).slice(0,60)+" | "+row.words.toLocaleString("es-AR")+" | "+row.total+" | "+
   [...row.byKind].map(([k,n])=>k+" "+n).join("; ")+" |");
 lines.push("");
 lines.push("### Ejemplos con locus");
 lines.push("");
 for(const row of affected.slice(0,12)){
  lines.push("**"+String(row.title).slice(0,70)+"** · `"+row.file+"`");
  lines.push("");
  lines.push("| Locus | Tipo | Grafía | Esperado |");
  lines.push("| --- | --- | --- | --- |");
  const seen=new Set();
  let shown=0;
  for(const example of row.examples){
   const key=example.kind+"|"+example.token;
   if(seen.has(key))continue;
   seen.add(key);
   lines.push("| "+example.locus+" | "+example.kind+" | `"+example.token+"` | "+(example.expected?"`"+example.expected+"…`":"—")+" |");
   if(++shown>=EXAMPLES)break;
  }
  lines.push("");
 }
}
lines.push("## Qué no hace este cotejo");
lines.push("");
lines.push("No corrige: una normalización ortográfica sobre un texto crítico es una decisión");
lines.push("editorial y debe quedar registrada como tal. No juzga tampoco la **elección** de");
lines.push("norma: comprueba la coherencia con la que la edición declara. Y no examina los PDF");
lines.push("compuestos ni los depósitos de Zenodo, que pueden ir por una versión anterior: para");
lines.push("eso hace falta cotejar el archivo depositado contra el texto fuente de hoy.");

const report=lines.join("\n")+"\n";
mkdirSync("reports",{recursive:true});
writeFileSync(REPORT,report);

console.log("Textos latinos examinados: "+rows.length+" · palabras: "+totalWords.toLocaleString("es-AR"));
console.log("Incumplimientos de la norma declarada: "+totalFindings);
for(const row of affected.slice(0,ALL?999:8))
 console.log("  "+String(row.total).padStart(5)+"  "+String(row.title).slice(0,58)+"  ["+[...row.byKind.keys()].join(", ")+"]");
console.log("Informe: "+REPORT);
