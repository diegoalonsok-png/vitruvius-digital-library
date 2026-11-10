/* Lexicon: URL, Unicode and asynchronous-index defensive contracts.
   Pure Node regression: no internet, no book or manuscript modifications. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const source=readFileSync("assets/vitruvia-lexicon.js","utf8");
new vm.Script(source,{filename:"assets/vitruvia-lexicon.js"});
const a=source.indexOf("function fold(s){"),b=source.indexOf("function foldMap(text){",a);
assert(a>=0&&b>a,"Lexicon normalization missing");
const fold=vm.runInNewContext(source.slice(a,b)+"\nfold");
for(const [left,right] of [
 ["λόγος","λογοσ"],["λόγος","λο\u0301γος"],
 ["Ἀθῆναι","Αθηναι"],["ὕδωρ","υδωρ"],
 ["Ῥώμη","Ρωμη"],["ἔργον","ε\u0301ργον"],
 ["āēīōū","aeiou"],["Vītrūvius","Vitruvius"],
 ["Iūlius","Julius"],["symmetriā","symmetria"]
])assert.equal(fold(left),fold(right),"Diacritics or editorial spelling: "+left+" / "+right);
assert.notEqual(fold("Ἀθηνῶν"),fold("Ἀθῆναι"),
 "Do not confuse separate Greek inflected forms under accent normalization");
assert(source.includes("const revision=++runRevision"),
 "Every normal Lexicon search must receive a monotonic revision");
for(const mark of [
 "const D=await lang(l);if(!isCurrent())return;",
 "const G=await lang(\"grc\");if(!isCurrent())return;",
 "await renderEntry(S.D,parsed.steps[0].term,res);",
 "if(!isCurrent())return;",
 "if(rev!==routeRevision)return;",
 "window.addEventListener(\"popstate\"",
 "async function applyLexiconLocation(){",
 "await run(false);",
 "history.pushState(null,\"\",u)"
])assert(source.includes(mark),"Missing stale-result or URL safeguard: "+mark);
assert(source.includes("const initialParams=new URLSearchParams(location.search)"),
 "Deep-link query must display before metadata loading");
assert(source.includes("if(!cache.has(path))"),
 "Only one request per index at a time");
assert(source.includes("cache.delete(path)"),
 "A failed fetch must be retryable");
assert(source.includes("controller.abort(),30000"),
 "Hanging JSON fetch must be bounded");
assert(source.includes("if(unchanged())dl.replaceChildren"),
 "Autocomplete must discard stale responses");
console.log("PASS Lexicon: Greek polytonic and decomposed accents, Latin macrons, query revisions, URL history, and bounded data loading.");
