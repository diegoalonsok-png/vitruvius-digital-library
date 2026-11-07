/* Regression checks for static-site security and bibliographic integrity.
 * This does not replace the browser smoke tests or establish philological accuracy.
 */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import vm from "node:vm";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(resolve(root,p),"utf8");
const json=p=>JSON.parse(read(p));
const mainPages=["index.html","vitruvia.html","bibliotheca-graeca-latina.html","classics-text-reader.html","classics-parallel-reader.html"];
for(const page of mainPages){
 const html=read(page);
 assert.match(html,/<meta\\s+name="referrer"\\s+content="strict-origin-when-cross-origin">/i,"Missing referrer policy: "+page);
 assert.equal((html.match(/<meta\\s+name="referrer"/gi)||[]).length,1,"Duplicate referrer policy: "+page);
}
const catalogue=json("data/bibliotheca-graeca-latina-I-bce-I-ce.json");
const registry=json("data/classics-corpus/search-registry.json");
const report=json("data/classics-corpus/coverage-audit.json");
assert(Array.isArray(catalogue.works)&&catalogue.works.length>0,"Classical catalogue empty");
const workIds=catalogue.works.map(w=>w.id);
assert.equal(new Set(workIds).size,workIds.length,"Duplicate work identifiers");
const listed=new Set(workIds),indexed=new Set();
const languages=new Set(["la","grc","es","en","fr","de","it","pt"]);
for(const entry of registry.entries){
 assert(listed.has(entry.workId),"Index references unknown work "+entry.workId);
 assert(languages.has(entry.language),"Unrecognized language "+entry.language);
 assert(typeof entry.path==="string"&&!entry.path.startsWith("/")&&!entry.path.includes(".."),"Unsafe corpus path");
 assert(existsSync(resolve(root,entry.path)),"Missing indexed text "+entry.path);
 if(entry.format==="json-passages"){
  assert(/^data\\/classics-corpus\\/[a-z0-9-]+\\.json$/.test(entry.path),"Unexpected corpus pathname");
  const source=json(entry.path);
  assert.equal(source.workId,entry.workId,"Work ID differs: "+entry.path);
  assert.equal(source.language,entry.language,"Wrong translation language: "+entry.path);
  assert(Array.isArray(source.passages)&&source.passages.length>0,"Empty indexed corpus: "+entry.path);
 }
 indexed.add(entry.workId);
}
for(const work of catalogue.works){
 for(const [language,path] of Object.entries(work.corpusFiles||{})){
  assert(languages.has(language),"Unsupported language for "+work.id);
  assert(new RegExp("^data/classics-corpus/[a-z0-9-]+-"+language+"\\\\.json$").test(path),"Unexpected work text path "+path);
  assert(registry.entries.some(e=>e.workId===work.id&&e.language===language&&e.path===path),
   "Unregistered reader text "+path);
 }
}
assert.equal(registry.entries.length,registry.count,"Registry version total differs");
assert.equal(indexed.size,registry.works,"Registry distinct work total differs");
assert.equal(report.counts.cataloguedWorks,catalogue.works.length,"Published catalogue audit stale");
assert.equal(report.counts.indexedTextVersions,registry.entries.length,"Published text count stale");
const source=read("assets/bibliotheca-graeca-latina.js");
const begin=source.indexOf("function safePublicHref(value){");
const end=source.indexOf("function navLink(url,txt)",begin);
assert(begin!==-1&&end>begin,"Safe URL guard not present");
const sandbox={URL};vm.runInNewContext(source.slice(begin,end)+"\\nthis.check=safePublicHref;",sandbox);
for(const unsafe of ["javascript:alert(1)","data:text/html,foo","http://example.org/","//evil.example/p","../secret.html","https://user:pass@example.org/x"]){
 assert.equal(sandbox.check(unsafe),"","Unsafe destination was allowed: "+unsafe);
}
assert.equal(sandbox.check("https://atlas.perseus.tufts.edu/"),"https://atlas.perseus.tufts.edu/");
assert.equal(sandbox.check("classics-text-reader.html?work=didache"),"classics-text-reader.html?work=didache");
console.log("PASS public pages: referrer policies, safe outbound URL schemes, "+catalogue.works.length+" catalogue records, "+registry.entries.length+" registered text versions.");
