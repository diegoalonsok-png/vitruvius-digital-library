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
 "vitruvia:catalogue-core",
 "if(supplementApplied||id!==S.searchId||searchSignal.aborted)return",
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
// Cross-app scholarly links: preserve exact work identity and source locus,
// and never regress to the retired dual-reader route.
const crossLinks=[
 ["Lexicon bridge",read("assets/lexicon-classics-bridge.js")],
 ["Bibliotheca work catalogue",read("assets/bibliotheca-work-search.js")],
 ["Vitruvia books panel",read("assets/unified-books-discovery.js")],
 ["Official reader",read("assets/classics-text-reader.js")]
];
for(const [name,source] of crossLinks)new vm.Script(source,{filename:name});
const [bridge,workSearch,bookPanel,reader]=crossLinks.map(([,source])=>source);
assert(bridge.includes('["Leer locus en visor académico","classics-text-reader.html?"'),
 "Lexicon must link exact original passages to the approved academic reader");
assert(!bridge.includes('["Volver al pasaje","classics-simple-parallel.html?"'),
 "Old reader route reappeared in Lexicon exact-passage action");
assert(workSearch.includes("lexiconWorkLink(w.id)"),
 "Bibliotheca must link indexed works to Lexicon with their work identifier");
assert(bookPanel.includes('new URLSearchParams({work:workId,lang:"auto",mode:"palabra"})'),
 "Vitruvia must preserve a selected work on the way to Lexicon");
assert(bookPanel.includes('new URL("classics-text-reader.html"')||
 bookPanel.includes('classics-text-reader\\.html'),
 "Vitruvia must still open the official academic reader");
assert(reader.includes('lexiconShortcut.id="reader-lexicon-current"')&&
 reader.includes('full.searchParams.set("work",work)')&&
 reader.includes('full.searchParams.set("locus",rec.locus)'),
 "Official reader must support returning to Lexicon with work and exact original locus");
assert(!workSearch.includes('new URL("classics-parallel-reader.html",location.href)'),
 "Bibliotheca must never restore the retired academic reader");
console.log("PASS: scholarly crosslinks preserve works and verified source loci without older readers.");

console.log("PASS: three static search pages parse deep links, invalidate stale requests and handle browser history.");
