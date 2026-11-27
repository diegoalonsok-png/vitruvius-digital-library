import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const read=p=>fs.readFile(new URL("../"+p,import.meta.url),"utf8");
const set=JSON.parse(await read("data/academic-semantic-calibration-philosophy.json"));
const registry=JSON.parse(await read("data/classics-corpus/search-registry.json"));
const manifest=JSON.parse(await read("data/ai-corpora.json"));
const code=await read("assets/vitruvia-ai.js");
const data=new Map([["data/classics-corpus/search-registry.json",registry],["data/ai-corpora.json",manifest]]);
for(const p of new Set(set.cases.map(c=>c.sourcePath)))data.set(p,JSON.parse(await read(p)));
function engine(source){
 const window={dispatchEvent(){}};
 const context={window,document:{getElementById(){return null}},CustomEvent:class{},navigator:{},fetch:async path=>{
  const d=data.get(path.replace(/^\.\//,""));
  return d?{ok:true,json:async()=>d}:{ok:false,status:404};
 }};
 vm.runInNewContext(source,context);return window.VitruviaAI;
}
const marker='for(const group of matchedPhilosophy(query))if(group.work===workId)for(const hint of group.hints)for(const t of terms(hint))if(!weights.has(t))weights.set(t,.35);';
assert(code.includes(marker),"Calibration baseline switch not found");
const baseline=engine(code.replace(marker,"")),calibrated=engine(code);
const sources=registry.entries.filter(e=>["json-passages","structured-bilingual"].includes(e.format)).map(e=>({url:e.path,workId:e.workId,workTitle:e.title,author:e.author,language:e.language}));
const rows=[];
for(const c of set.cases){
 const match=x=>x.workId===c.workId&&c.loci.some(t=>x.locus===t||x.locus.endsWith(":"+t));
 assert(data.get(c.sourcePath).passages.some(p=>match({...p,workId:c.workId})));
 const selected=calibrated.sourceSelection(c.query,sources);
 assert(selected.explicit&&selected.sources.length>0&&selected.sources.every(s=>s.workId===c.workId));
 const pos=r=>{const i=r.rows.findIndex(match);return i<0?null:i+1};
 const before=pos(await baseline.search(c.query,{method:"bm25",targetedOnly:true}));
 const after=pos(await calibrated.search(c.query,{method:"bm25",targetedOnly:true}));
 rows.push({query:c.query,before,after});assert.equal(after,1);
}
for(const q of set.negativeRouting)assert.equal(calibrated.sourceSelection(q,sources).explicit,false,q);
console.table(rows);console.log({top5Before:rows.filter(r=>r.before&&r.before<=5).length,top5After:rows.filter(r=>r.after&&r.after<=5).length,negativeRouting:set.negativeRouting.length,scope:"Four local English translations; other sources deliberately unavailable; no neural inference"});
