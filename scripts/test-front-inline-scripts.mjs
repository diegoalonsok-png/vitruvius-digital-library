import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync("index.html","utf8");
const tags=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
assert(tags.length>10,"No se encontraron los scripts de la portada");
let checked=0;
for(const [i,tag] of tags.entries()){
  const attrs=tag[1];
  const body=tag[2];
  if(/type\s*=\s*["']application\/ld\+json["']/i.test(attrs))continue;
  if(/\bsrc\s*=/.test(attrs))continue;
  if(!body.trim())continue;
  assert(!/<script\b/i.test(body),"Etiqueta de script anidada en inline JS: "+i);
  new vm.Script(body,{filename:"index.html inline #"+i});
  checked++;
}
assert(checked>0,"No se verificó ningún inline JS");
assert.equal(html.split('src="assets/classics-audited-coverage.js?v=').length-1,1,
  "La auditoría debe cargarse exactamente una vez, fuera de la plantilla de impresión");
console.log("PASS portada: "+checked+" scripts inline y etiqueta de contadores no anidada");

const lexical=readFileSync("assets/inline-lexical-card.js","utf8");
new vm.Script(lexical,{filename:"assets/inline-lexical-card.js"});
assert(html.includes("assets/inline-lexical-card.js"),"La portada debe cargar la ficha contextual");
assert(lexical.includes('event.target.closest?.("#search-results mark.search-hit")'),
 "Las palabras resaltadas deben abrir una ficha por clic");
const match=lexical.match(/if\(!((?:\/\^\[[^\n]+?\$\/u))\.test\(term\)\)return;/);
assert(match,"Falta validación Unicode de vocablos clicables");
const accept=new Function("term","return "+match[1]+".test(term)");
for(const word of ["domus","loci","campus","λόγος","οἶκος","τέχνη"]){
 assert(accept(word),"La ficha debe aceptar el vocablo "+word);
}
assert(!accept("1234"),"La ficha no debe tratar números como lemas");
console.log("PASS fichas: clic en resaltado y vocablos latinos/griegos válidos");

/* Academic integrity gates: claim only what is actually documented. */
const editorial=readFileSync("metodologia.html","utf8");
const review=readFileSync("programa-revision-academica.html","utf8");
const staticDomus=readFileSync("domus-en-vitruvio.html","utf8");
const tei=readFileSync("data/tei/v514-I-praef-1-example.xml","utf8");
const lexSample=JSON.parse(readFileSync("data/academic-lexical-review-100.json","utf8"));
const ecdotic=JSON.parse(readFileSync("data/ecdotic-decisions.json","utf8"));
const fourDois=[
  "10.5281/zenodo.23868911",
  "10.5281/zenodo.23884757",
  "10.5281/zenodo.23885110",
  "10.5281/zenodo.23885404"
];
for(const doi of fourDois){
 assert(editorial.includes(doi),"La metodología debe citar DOI "+doi);
 assert(review.includes(doi),"El protocolo debe distinguir DOI "+doi);
}
assert(!editorial.includes("No se asignan DOI individuales a V514, V554 o V297"),
 "Política de DOI contradice las fichas editoriales");
assert(html.includes('id="copy-portal-citation"'),
 "Falta botón visible de cita de biblioteca");
assert(html.includes('domus-en-vitruvio.html'),
 "Falta acceso a lectura sin JavaScript");
assert(staticDomus.includes("10.5281/zenodo.23884757"),
 "La ficha Domus debe citar la edición V514");
assert(staticDomus.includes('lang="la"')&&staticDomus.includes('lang="es"'),
 "La lectura indexable debe mostrar latín y traducción sin JavaScript");
assert(tei.includes('xmlns="http://www.tei-c.org/ns/1.0"')&&tei.includes('xml:id="vitr-1-praef-1"'),
 "Falta identificación TEI del locus");
assert(!/<app\b|<rdg\b/.test(tei),"La muestra TEI no debe inventar variantes");
assert.equal(lexSample.items.length,100,"La muestra léxica debe contener 100 formas");
assert.equal(lexSample.reviewed,0,"No declarar revisión lingüística sin evidencia");
assert(lexSample.items.every(x=>x.status==="awaiting_independent_review" &&
 x.firstLocus && x.occurrences>0 && x.lemma===null && x.syntax===null),
 "No inventar lemas, sintaxis ni revisión de la muestra");
assert.equal(new Set(lexSample.items.map(x=>x.form)).size,100,"Formas de muestra repetidas");
assert(Array.isArray(ecdotic.decisions),"El registro ecdótico debe existir");
assert(ecdotic.decisions.every(x=>x.primarySourceUri&&x.locus&&x.justification&&x.responsibleEditor),
 "Una decisión real requiere testimonio o fuente, locus, argumento y responsable");
const app=readFileSync("assets/app.js","utf8");
assert(app.includes("Citar / DOI")&&app.includes("criticalPassageCitation"),
 "Cada pasaje debe poder copiarse con su DOI editorial");
console.log("PASS academia: cuatro DOI, citación, TEI, corpus léxico y estado de evidencia");
