import fs from "node:fs/promises";
import vm from "node:vm";
import assert from "node:assert/strict";
const read=p=>fs.readFile(new URL("../"+p,import.meta.url),"utf8");
const set=JSON.parse(await read("data/academic-semantic-calibration-v514.json"));
const corpus=JSON.parse(await read(set.sourcePath));
const window={};
vm.runInNewContext(await read("assets/vitruvia-ai.js"),{window});
const engine=window.VitruviaAI;
const normalize=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu," ").replace(/\s+/g," ").trim();
const docs=corpus.passages.map(p=>{
 const raw=p.latin+" "+p.translation, tokens=normalize(raw).split(" ").filter(t=>t.length>1&&!"de del la el los las un una unos unas y en por para a al con del sobre the of and for in on a an is are it into le les des du et il elle un une auf die der das und ein eine di degli della che".split(" ").includes(t));
 const tf=new Map();for(const t of tokens)tf.set(t,(tf.get(t)||0)+1);
 return {locus:p.locus,norm:normalize(raw),tf,len:tokens.length};
});
const df=new Map();for(const d of docs)for(const t of d.tf.keys())df.set(t,(df.get(t)||0)+1);
const avg=docs.reduce((a,d)=>a+d.len,0)/docs.length;
function rank(q,workId){
 const exact=normalize(q),weights=engine.academicTerms(q,workId);
 return docs.map(d=>{
  let score=0;
  for(const [t,w] of weights){const f=d.tf.get(t)||0;if(f)score+=w*Math.log(1+(docs.length-(df.get(t)||0)+.5)/((df.get(t)||0)+.5))*f*2.4/(f+1.4*(.28+.72*d.len/avg));}
  if(exact.length>4&&d.norm.includes(exact))score+=75;
  return {locus:d.locus,score};
 }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score);
}
const rows=set.cases.map(c=>{
 assert(docs.some(d=>d.locus===c.locus));
 const position=work=>{const p=rank(c.query,work).findIndex(d=>d.locus===c.locus);return p<0?null:p+1};
 return {...c,before:position(null),after:position(set.workId)};
});
const top5=key=>rows.filter(r=>r[key]!==null&&r[key]<=5).length;
console.table(rows);console.log({total:rows.length,top5Before:top5("before"),top5After:top5("after"),scope:"V514 unchunked lexical calibration; not E5 or independent evaluation"});
assert(top5("after")>top5("before"));
