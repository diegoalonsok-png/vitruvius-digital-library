#!/usr/bin/env node
/* Sincroniza la cola de indexación con el estado real de los índices.
 *
 * La cola de data/classics-corpus/indexing-queue-2026-11-08.json era una
 * instantánea manual y se había quedado atrás: declaraba 44 obras pendientes
 * cuando seis ya se habían indexado. Este guion la recalcula a partir de los
 * datos, no de la memoria:
 *
 *   · indexado léxicamente  → aparece en data/index/classics/manifest.json;
 *   · registrado para la búsqueda  → aparece en search-registry.json;
 *   · indexado semánticamente  → aparece en semantic-conceptus-postings.json,
 *     que cubre sólo los términos del Conceptus y por eso se cuenta aparte.
 *
 * Mantiene la política del proyecto: una URL o una referencia a un PDF no es
 * prueba de indexación. Una obra con fuente declarada pero sin texto indexado
 * sigue siendo pendiente, y se distingue de la que no tiene ni fuente
 * identificada, que es el caso más difícil y el que conviene ver separado.
 *
 * Uso: node scripts/sync-indexing-queue.mjs [--check]
 */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from "node:fs";

const CHECK=process.argv.includes("--check");
const QUEUE="data/classics-corpus/indexing-queue-2026-11-08.json";
const OUT="data/classics-corpus/indexing-queue.json";
const REPORT="reports/cola-de-indexacion.md";
const read=path=>JSON.parse(readFileSync(path,"utf8"));

const catalogue=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json");
const works=(catalogue.works||[]).filter(work=>work.id&&work.title);
const manifest=existsSync("data/index/classics/manifest.json")?read("data/index/classics/manifest.json"):{index:[]};
const registry=existsSync("data/classics-corpus/search-registry.json")?read("data/classics-corpus/search-registry.json"):{entries:[]};
const previous=existsSync(QUEUE)?read(QUEUE):{pending:[]};

const lexical=new Map();
const add=(id,entry)=>{
 if(!id)return;
 if(!lexical.has(id))lexical.set(id,[]);
 lexical.get(id).push({lang:entry.lang,passages:entry.passages,tokens:entry.tokens});
};
for(const entry of manifest.index||[]){
 add(entry.id,entry);
 /* Las ediciones propias se indexan con su propio id —vitruvius-recensio-la—
    y declaran en «gate» con qué claves las conoce el registro. Sin resolver
    esos alias, Vitruvio figuraba como obra sin indexar teniendo su texto
    indexado. */
 for(const key of entry.gate||[])add(String(key).split("|")[0],entry);
}
const registered=new Set((registry.entries||[]).map(entry=>entry.workId));

/* El índice semántico cubre sólo los términos del Conceptus: su ausencia no
   significa que falte el texto, sino que ese texto no tiene todavía ninguna
   ocurrencia de esos términos indexada. Se cuenta, no se confunde. */
let semantic=new Set();
const postings="data/classics-corpus/semantic-conceptus-postings.json";
if(existsSync(postings)){
 const text=readFileSync(postings,"utf8");
 for(const hit of text.matchAll(/"workId"\s*:\s*"([^"]+)"/g))semantic.add(hit[1]);
 if(!semantic.size)for(const hit of text.matchAll(/urn:cts:[^":]+:([a-z0-9]+)\./g))semantic.add(hit[1]);
}

/* Fuente declarada en la cola anterior: se conserva, es trabajo editorial. */
const declared=new Map();
for(const item of previous.pending||[])if(item&&item.id)declared.set(item.id,item);

const rows=works.map(work=>{
 const lex=lexical.get(work.id)||[];
 const item=declared.get(work.id)||{};
 return {
  id:work.id,
  author:work.author||"",
  title:work.title,
  language:work.language||"",
  lexical:lex.length?lex:null,
  passages:lex.reduce((sum,entry)=>sum+(entry.passages||0),0),
  registered:registered.has(work.id),
  semantic:semantic.has(work.id),
  sourceUrl:item.sourceUrl||work.links&&work.links.source||null,
  sourceType:item.sourceType||null
 };
});

const indexed=rows.filter(row=>row.lexical);
const pending=rows.filter(row=>!row.lexical);
const pendingWithSource=pending.filter(row=>row.sourceUrl);
const pendingNoSource=pending.filter(row=>!row.sourceUrl);
const indexedNotRegistered=indexed.filter(row=>!row.registered);
const registeredNotIndexed=rows.filter(row=>row.registered&&!row.lexical);

const snapshot={
 schema:"vitruvia-indexing-queue-v2",
 generated:new Date().toISOString().slice(0,10),
 supersedes:QUEUE,
 method:"Recalculado por scripts/sync-indexing-queue.mjs a partir de data/index/classics/manifest.json, search-registry.json y semantic-conceptus-postings.json. Una URL o una referencia a un PDF no es prueba de indexacion: una obra con fuente declarada y sin texto indexado sigue pendiente.",
 counts:{
  catalogue:works.length,
  lexicallyIndexed:indexed.length,
  pending:pending.length,
  pendingWithDeclaredSource:pendingWithSource.length,
  pendingWithoutIdentifiedSource:pendingNoSource.length,
  registeredForSearch:rows.filter(row=>row.registered).length,
  semanticallyIndexed:rows.filter(row=>row.semantic).length,
  indexedButNotRegistered:indexedNotRegistered.length,
  registeredButNotIndexed:registeredNotIndexed.length
 },
 pending:pending.map(row=>({id:row.id,author:row.author,title:row.title,language:row.language,
  sourceUrl:row.sourceUrl,sourceType:row.sourceType,
  state:row.sourceUrl?"fuente declarada, texto sin indexar":"sin fuente identificada"}))
};

const lines=["# Cola de indexación","",
 "Generado por `scripts/sync-indexing-queue.mjs` el "+snapshot.generated+".","",
 "## Estado","","| | |","| --- | --- |",
 "| Obras del catálogo | "+works.length+" |",
 "| Con texto indexado léxicamente | **"+indexed.length+"** |",
 "| Pendientes | "+pending.length+" |",
 "| · con fuente declarada | "+pendingWithSource.length+" |",
 "| · **sin fuente identificada** | "+pendingNoSource.length+" |",
 "| Registradas para la búsqueda | "+snapshot.counts.registeredForSearch+" |",
 "| Con alguna entrada en el índice semántico del *Conceptus* | "+snapshot.counts.semanticallyIndexed+" |","",
 "El índice semántico cubre sólo los 74 términos del *Conceptus*: que una obra no",
 "aparezca en él no significa que falte su texto, sino que no tiene ocurrencias",
 "indexadas de esos términos. La búsqueda por palabra de cualquier otro término va",
 "por el índice léxico, que cubre las "+indexed.length+" obras con texto.","",
 "## Desajustes entre índice y registro de búsqueda",""];
if(!indexedNotRegistered.length&&!registeredNotIndexed.length)lines.push("Ninguno: lo indexado está registrado y lo registrado está indexado.","");
else{
 if(indexedNotRegistered.length){
  lines.push("### Indexadas pero no registradas para la búsqueda","",
   "El texto está, pero el motor no lo recorre.","","| Obra | Lengua | Pasajes |","| --- | --- | --- |");
  for(const row of indexedNotRegistered)lines.push("| "+row.title.slice(0,54)+" | "+row.language+" | "+row.passages+" |");
  lines.push("");
 }
 if(registeredNotIndexed.length){
  lines.push("### Registradas pero sin texto indexado","",
   "El motor las recorre y no encuentra nada que recorrer.","","| Obra | Lengua |","| --- | --- |");
  for(const row of registeredNotIndexed)lines.push("| "+row.title.slice(0,54)+" | "+row.language+" |");
  lines.push("");
 }
}
lines.push("## Pendientes sin fuente identificada","",
 "Son **"+pendingNoSource.length+"**. Es el caso más difícil: no hay todavía una edición de",
 "referencia señalada de la que partir, de modo que antes de indexar hay que decidir",
 "cuál se usa y con qué derechos.","",
 "| Obra | Autor | Lengua |","| --- | --- | --- |");
for(const row of pendingNoSource)lines.push("| "+row.title.slice(0,58)+" | "+(row.author||"—")+" | "+row.language+" |");
lines.push("","## Pendientes con fuente declarada","",
 "Son **"+pendingWithSource.length+"**. Hay una fuente señalada; falta transcribir o analizar y",
 "verificar. Una URL no es prueba de indexación.","",
 "| Obra | Lengua | Fuente |","| --- | --- | --- |");
for(const row of pendingWithSource)lines.push("| "+row.title.slice(0,46)+" | "+row.language+" | "+String(row.sourceUrl).slice(0,62)+" |");

if(CHECK){
 console.log(lines.slice(0,28).join("\n"));
 console.log("\n— comprobación, sin escribir —");
}else{
 writeFileSync(OUT,JSON.stringify(snapshot,null,1));
 mkdirSync("reports",{recursive:true});
 writeFileSync(REPORT,lines.join("\n")+"\n");
 console.log("Catálogo: "+works.length+" · indexadas: "+indexed.length+" · pendientes: "+pending.length+
  " (con fuente "+pendingWithSource.length+", sin fuente "+pendingNoSource.length+")");
 console.log("Desajustes · indexadas sin registrar: "+indexedNotRegistered.length+
  " · registradas sin indexar: "+registeredNotIndexed.length);
 console.log("Cola: "+OUT+"\nInforme: "+REPORT);
}
