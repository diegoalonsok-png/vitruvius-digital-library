/**
 * Bibliotheca → Vitruvia → Lexicon: reproducible integration audit.
 * All 222 works are inventory entries, not all indexed. This intentionally
 * fails only on broken claims/paths, never on honest coverage gaps.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root=process.cwd(),read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const registry=JSON.parse(read("data/classics-corpus/search-registry.json"));
const coverage=JSON.parse(read("data/classics-corpus/translation-availability-222.json"));
assert.equal(registry.schema,"vitruvia-classics-search-registry-v1");
assert.equal(coverage.schema,"vitruvius-classics-translation-availability-v1");
assert.equal(registry.entries.length,registry.count);
assert.equal(coverage.works.length,coverage.totals.cataloguedWorks);
const byId=new Map(coverage.works.map(w=>[w.id,w]));
assert.equal(byId.size,coverage.works.length,"Duplicate works in coverage");
const seen=new Set(),seenWorks=new Set(),errors=[];
const fileCache=new Map();
for(const e of registry.entries){
 const key=[e.workId,e.language,e.path,e.edition||""].join("|");
 if(seen.has(key))errors.push("duplicate registry row: "+key);
 seen.add(key);seenWorks.add(e.workId);
 const work=byId.get(e.workId);
 if(!work){errors.push("Missing catalogue record for "+e.workId);continue}
 if(!work.localEditionLanguages.includes(e.language))
  errors.push("Unreported local language "+e.workId+"/"+e.language);
 if(!/^(data\/(?:classics-corpus|structured|text|lexicon\/fontes)\/[a-zA-Z0-9._/-]+\.json|corpus\/[a-zA-Z0-9._/-]+\.html)$/.test(e.path||""))
  {errors.push("Unsafe registry path "+e.path);continue}
 if(!fs.existsSync(path.join(root,e.path))){errors.push("Missing source: "+e.path);continue}
 if(!fileCache.has(e.path)){
  try{
   const raw=read(e.path);
   if(raw.length<150)throw Error("File too short");
   const parsed=e.path.endsWith(".json")?JSON.parse(raw):null;
   const passages=parsed?(Array.isArray(parsed)?parsed:parsed.passages):null;
   if(parsed&&(!Array.isArray(passages)||!passages.length))throw Error("No parsed passages");
   fileCache.set(e.path,{size:raw.length,passages:passages?.length||null});
  }catch(err){errors.push("Unreadable source "+e.path+": "+err.message)}
 }
 const reader=(e.reader||"").split(/[?#]/)[0];
 if(reader&&!/^https?:\/\//.test(reader)&&!fs.existsSync(path.join(root,reader)))
  errors.push("Missing reader URL target: "+reader);
}
assert.equal(seenWorks.size,coverage.totals.locallyIndexedWorks,
 "Registry and public coverage indexed-work totals disagree");
const translationCount=coverage.works.filter(w=>w.translationLanguages?.length);
assert.equal(translationCount.length,coverage.totals.translatedWorksLocal,
 "Translation totals disagree with per-work metadata");
const bridge=read("assets/lexicon-classics-bridge.js");
const lexicon=read("vitruvia-lexicon.html");
const vitruvia=read("vitruvia.html");
const coveragePage=read("cobertura-traducciones-clasicas.html");
assert.match(bridge,/ClassicsCorpusSearch\.search/);
assert.match(bridge,/ClassicsCorpusSearch\.semanticSearch/);
assert.match(lexicon,/assets\/classics-corpus-search\.js/);
assert.match(lexicon,/assets\/lexicon-classics-bridge\.js/);
assert.match(vitruvia,/assets\/classics-corpus-search\.js/);
assert.match(coveragePage,/id="missing-lang"/);
assert.match(coveragePage,/Integración/);
if(errors.length){console.error(errors.join("\n"));process.exitCode=1}
else console.log("PASS classical integration: "+registry.entries.length+
 " indexed editions in "+seenWorks.size+" works; "+translationCount.length+
 " works with local translations; Vitruvia/Lexicon coverage wiring checked. "+
 (coverage.works.length-seenWorks.size)+" works remain without local indexed originals.");
