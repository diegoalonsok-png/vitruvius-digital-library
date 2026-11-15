import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
for(const path of ["assets/front-classics-search.js","assets/bibliotheca-simple.js"]){
 const code=readFileSync(path,"utf8");
 new vm.Script(code,{filename:path});
 for(const field of ["searchParams.set(\"q\"","searchParams.set(\"mode\"","searchParams.set(\"work\"","searchParams.set(\"locus\""])
  assert.ok(code.includes(field),path+" does not retain "+field);
 assert.ok(code.includes("frase"),path+" does not recognize phrase mode");
}
const index=readFileSync("index-locorum.html","utf8");
const inline=index.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline,"Index locorum script missing");
new vm.Script(inline,{filename:"index-locorum.inline.js"});
assert.ok(inline.includes('searchParams.set("locus"')&&inline.includes('Continuar en Lexicon'));
const lexicon=readFileSync("assets/vitruvia-lexicon.js","utf8");
for(const param of ['p.get("mode")','p.get("lang")','p.get("work")','p.get("locus")','p.get("q")'])
 assert.ok(lexicon.includes(param),"Lexicon URL receiver missing "+param);
console.log("PASS: syntax and query/mode/work/locus continuation in three classical search surfaces");
