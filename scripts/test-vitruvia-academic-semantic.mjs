/* Offline academic retrieval regression test; no model download or fabricated corpus.
 * Run: node scripts/test-vitruvia-academic-semantic.mjs
 * These are calibration cases, not a held-out semantic quality measurement.
 */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const base=new URL("../",import.meta.url);
const read=path=>fs.readFile(new URL(path,base),"utf8");
const registry=JSON.parse(await read("data/classics-corpus/search-registry.json"));
const manifest=JSON.parse(await read("data/ai-corpora.json"));
const win={dispatchEvent(){}};
const context=vm.createContext({
 window:win, document:{getElementById(){return null}},
 CustomEvent:class {}, navigator:{connection:{saveData:true}},
 fetch:async path=>{
  if(/^https?:/.test(path))throw Error("Offline regression test");
  try{const data=JSON.parse(await read(path));return {ok:true,json:async()=>data}}
  catch{return {ok:false,status:404}}
 }
});
new vm.Script(await read("assets/vitruvia-ai.js")).runInContext(context);
const engine=win.VitruviaAI;
const sources=registry.entries.filter(e=>["json-passages","structured-bilingual"].includes(e.format)).map(e=>({url:e.path,workId:e.workId,workTitle:e.title,author:e.author,edition:e.edition,language:e.language}));
const cases=[
 ["1.praef.1","dedicatoria imperial"],["1.1.1","formación del arquitecto"],
 ["1.3.2","firmitas utilitas venustas"],["3.1.2","proporciones del cuerpo humano"],
 ["5.1.6","basílica de Fano"],["7.7.2","pigmentos"],
 ["8.1.1","agua"],["10.1.1","máquinas"]
];
const v514=JSON.parse(await read("data/structured/recensio-es.json"));
for(const [locus,label] of cases){
 assert(v514.passages.some(p=>p.locus===locus), "Missing source locus "+locus);
 const result=await engine.search("Vitruvio "+locus,{method:"bm25"});
 assert.equal(result.rows[0]?.locus,locus,label);
 assert(result.rows.some(r=>r.locus===locus&&r.edition==="V514"&&r.sourcePath==="data/structured/recensio-es.json"),"V514 must be attributable: "+locus);
 assert(result.warning.includes("Consulta dirigida"));
}
assert(engine.sourceSelection("1.3.2",sources).sources.every(s=>s.workId==="vitruvius"));
assert(engine.sourceSelection("Vitruvio",sources).sources.every(s=>s.workId==="vitruvius"));
assert.equal(engine.sourceSelection("zzzxqjkv",sources).explicit,false);
const negative=await engine.search("Vitruvio zzzxqjkv",{method:"bm25"});
// Metadata selects the work, but must not fabricate a matching passage.
assert(negative.rows.every(r=>!r.exactTextMatch),"Unknown phrase must not be reported as an exact match");
console.log("Academic retrieval: 8 sourced loci, 3 routing checks, 1 negative query. E5 not exercised.");

const searchSource=await read("assets/vitruvia-search.js");
const gate=searchSource.match(/function academicEvidenceClass\(row\)\{[\s\S]*?\n\}(?=\n\/\* Rank only)/)?.[0];
assert(gate,"Vitruvia evidence gate missing");
const classify=vm.runInNewContext(gate+"\nacademicEvidenceClass");
const evidenceCases=[
 [{type:"wikipedia",source:"Wikipedia",link:"https://es.wikipedia.org/wiki/Vitruvio",curatedAcademic:true},"context"],
 [{type:"authority",source:"Wikipedia",link:"https://es.wikipedia.org/wiki/Vitruvio",curatedAcademic:true},"context"],
 [{type:"googlebook",source:"Google Books",link:"https://books.google.com/",isbn:"123"},"context"],
 [{type:"article",source:"Crossref",link:"https://doi.org/10.1000/example",doi:"10.1000/example"},"context"],
 [{type:"article",source:"Crossref",author:"Author",journal:"Journal",recordKind:"journal-article",link:"https://doi.org/10.1000/example"},"research-record"],
 [{type:"passage",locus:"1.3.2",edition:"V514",latin:"firmitatis",link:"lector-bilingue.html"},"document"],
 [{type:"historical-ocr",link:"historical.html"},"context"],
 [{type:"manuscript",codexShelfmark:"Harley MS 2767",link:"codex-h-folios-local.html"},"document"],
 [{type:"section",source:"General web",link:"https://example.com/"},"context"],
 [{type:"book",workId:"vitruvius",link:"bibliotheca-graeca-latina.html?work=vitruvius"},"catalogue"],
 [{type:"museum",source:"The Met",link:"https://www.metmuseum.org/art/collection"},"institution"],
 [{type:"topic",source:"Getty AAT",link:"https://vocab.getty.edu/aat/"},"institution"]
];
for(const [row,expected] of evidenceCases)assert.equal(classify(row),expected);
console.log("Vitruvia evidence gate: 12 classification fixtures passed.");
