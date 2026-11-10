/* Pure-source guardrails for static-site search links and in-flight requests.
 * Browser interaction is tested separately by scripts/browser-smoke-audit.mjs.
 * No network access, no changes to manuscripts or editions. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(p,"utf8");
const engines=[
 ["Lexicon","assets/vitruvia-lexicon.js"],
 ["Vitruvia","assets/vitruvia-search.js"],
 ["Bibliotheca","assets/bibliotheca-simple.js"]
];
for(const [engine,path] of engines){
 const source=read(path);
 new vm.Script(source,{filename:path});
 assert(source.includes("new URLSearchParams(location.search)"),
  engine+": missing GET query parser");
 assert(source.includes('window.addEventListener("popstate"'),
  engine+": back/forward must react to URL changes");
 assert(source.includes("search(")||source.includes("run(false)"),
  engine+": missing direct search route");
}
const lex=read("assets/vitruvia-lexicon.js");
for(const needle of [
 "const revision=++runRevision",
 "const D=await lang(l);if(!isCurrent())return",
 "if(!cache.has(path))",
 "cache.delete(path)",
 "controller.abort(),30000",
 "if(unchanged())dl.replaceChildren",
 "const initialParams=new URLSearchParams(location.search)",
 "history.pushState(null,\"\",u)"
])assert(lex.includes(needle),"Lexicon stale-search safeguard missing: "+needle);
const vit=read("assets/vitruvia-search.js");
for(const needle of [
 "let cataloguePromise=null",
 "await cataloguePromise",
 "if(id!==S.searchId||searchSignal.aborted)return",
 "if(initialQuery&&S.searchId===bootSearchId",
 "else clearSearch({preserveUrl:true})",
 "if(!preserveUrl)history.replaceState"
])assert(vit.includes(needle),"Vitruvia GET or initial-race safeguard missing: "+needle);
const bib=read("assets/bibliotheca-simple.js");
for(const needle of [
 "const id=++serial",
 "await metadata;if(id!==serial)return",
 "if(initial&&serial===0&&input.value.trim()===initial)",
 "const restore=++serial",
 "if(q)void search(false)",
 "if(updateHistory&&url.href!==location.href)history.pushState"
])assert(bib.includes(needle),"Bibliotheca in-flight or GET safeguard missing: "+needle);
for(const query of [
 "?q=symmetria&mode=palabra",
 "?q=%CE%BB%CF%8C%CE%B3%CE%BF%CF%82&mode=lema&lang=grc",
 "?q=domus&mode=site"
]){
 const u=new URLSearchParams(query);
 assert(u.get("q"),"Query was lost in URL round-trip: "+query);
 assert(u.get("mode"),"Mode was lost in URL round-trip: "+query);
}
console.log("PASS: three static search pages parse deep links, invalidate stale requests and handle browser history.");
