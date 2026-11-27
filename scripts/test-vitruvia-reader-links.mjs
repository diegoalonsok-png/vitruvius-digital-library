import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const read=p=>fs.readFile(new URL("../"+p,import.meta.url),"utf8");
const window={};vm.runInNewContext(await read("assets/vitruvia-reader-links.js"),{window,URL});
const registry=JSON.parse(await read("data/classics-corpus/search-registry.json"));
const base="https://vitruvius-digital-library.org/vitruvia.html";
let checked=0;const works=new Set();
for(const e of registry.entries){
 if(!/(?:^|\/)classics-text-reader(?:\.html)?\?/.test(e.reader||""))continue;
 const input=new URL(e.reader,base);input.searchParams.set("locus","1.1");input.searchParams.set("q","Nero");
 const out=new URL(window.VitruviaReaderLinks.parallelUrl(input.href,base,e.language,e.path));
 const side=["la","grc"].includes(e.language)?"left":"right";
 assert.equal(out.searchParams.get("work"),e.workId);assert.equal(out.searchParams.get(side),e.language);assert.equal(out.searchParams.get(side+"Edition"),e.path);assert.equal(out.searchParams.get("locus"),"1.1");assert.equal(out.searchParams.get("q"),"Nero");checked++;works.add(e.workId);
}
assert(checked>0);
assert.equal(window.VitruviaReaderLinks.parallelUrl("https://example.org/classics-text-reader.html?work=caesar-gallico&lang=la",base),"");
for(const [work,language] of [["caesar-gallico","en"],["caesar-civili","la"]]){
 const path="data/classics-corpus/"+work+"-"+language+".json";
 const d=JSON.parse(await read(path));assert.equal(d.workId,work);assert.equal(d.language,language);assert(d.passages.some(p=>p.locus==="1.1"&&p.text));
}
console.log({checked,works:works.size,scope:"URL and local Caesar source regression; not browser rendering"});
