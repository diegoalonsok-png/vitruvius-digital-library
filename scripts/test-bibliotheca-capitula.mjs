/* Reproducible data-and-wiring regression: shared chapter labels never imply
   semantic or word-level alignment. No external download. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=p=>readFileSync(p,"utf8");
const json=p=>JSON.parse(src(p));
const html=src("bibliotheca-capitula.html");
const js=src("assets/bibliotheca-capitula.js");
const css=src("assets/bibliotheca-capitula.css");
const registry=json("data/classics-corpus/search-registry.json").entries;
const catalogue=json("data/bibliotheca-graeca-latina-I-bce-I-ce.json").works;
assert.equal(catalogue.length,222,"No reduction of the 222-work catalog");
const idList=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(idList).size,idList.length,"Duplicate Capitula UI ids");
for(const id of ["work","left-version","right-version","left-chapter","right-chapter","chapterbar","left-text","right-text","method","status"]){
 assert(idList.includes(id),"Missing control: "+id);
}
for(const asset of ["assets/bibliotheca-capitula.js","assets/bibliotheca-capitula.css","assets/analytics-config.js","assets/analytics.js"]){
 assert(html.includes(asset),"Missing page asset: "+asset);
}
assert(html.indexOf("analytics-config.js")<html.indexOf("analytics.js"),"Privacy-aware analytics order");
assert.match(css,/--bg:#0d0d0e/);
assert.match(css,/background:#080808/);
assert.doesNotMatch(html,/<iframe\b/i,"Avoid duplicate embedded viewers");
assert.match(js,/chapterize\(passages\)/,"Chapter grouping must exist");
assert.match(js,/!k\.startsWith\("segmento:"\)&&right\.groups\.has\(k\)/,
 "Only matching editorial labels can trigger synchronized navigation");
assert.match(js,/no (?:verified|certified) alignment|No se ocultan|No demuestra alineación/i,
 "Must disclose limited correspondence and keep independent reading");
const entries=new Map(registry.map(e=>[e.workId+"|"+e.language,e]));
function passages(id,lang){
 const entry=entries.get(id+"|"+lang);
 assert(entry&&entry.format==="json-passages","Expected indexed JSON for "+id+"/"+lang);
 const doc=json(entry.path);
 assert.equal(doc.workId,id);assert.equal(doc.language,lang);
 return doc.passages;
}
const cs=(id,lang)=>new Set(passages(id,lang).map(p=>p.locus));
const caesar=cs("caesar-gallico","la"),caesarEnglish=cs("caesar-gallico","en");
assert.equal(caesar.size,404);
assert.equal(caesarEnglish.size,404);
assert(caesar.has("1.1")&&caesarEnglish.has("1.1"),"Caesar book/chapter pair must be retained");
const plato=cs("plato-apology","grc"),platoEnglish=cs("plato-apology","en");
assert.equal(plato.size,26);assert.equal(platoEnglish.size,26);
assert(plato.has("17")&&platoEnglish.has("17"),"Plato Stephanus chapter should be navigable");
const newest=["aristophanes-clouds","sophocles-oedipus","cicero-catilinariae"];
for(const work of newest){
 assert(registry.some(e=>e.workId===work&&e.language==="en"),
  "Historic translation must stay indexed and visible: "+work);
 const doc=json(entries.get(work+"|en").path);
 assert(doc.source&&doc.translator&&doc.alignmentStatus==="unaligned",
  "Historic translation provenance and non-alignment: "+work);
}
console.log("PASS: 222 catalogue entries, 3 historical translations, 404 Caesar and 26 Plato paired labels, independent non-aligned editions, unique monochrome controls.");
