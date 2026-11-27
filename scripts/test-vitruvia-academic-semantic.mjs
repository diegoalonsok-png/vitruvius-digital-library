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
assert.equal(negative.rows.length,0);
console.log("Academic retrieval: 8 sourced loci, 3 routing checks, 1 negative query. E5 not exercised.");
