import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const path="assets/lexicon-ngram-engine.js";
const code=readFileSync(path,"utf8");
new vm.Script(code,{filename:path});
const window={};
vm.runInNewContext(code,{window,setTimeout});
const ngrams=window.VitruviaNgramEngine;
assert.ok(ngrams?.compare&&ngrams.scan&&ngrams.fold,"N-gram engine is not available");
assert.equal(ngrams.fold("Vēnustās"),"uenustas");
assert.equal(ngrams.fold("Μῆνιν"),"μηνιν");
const corpus=[
 ["A","1.1","Firmitas utilitas venustas. Firmitas utilitas venustas"],
 ["B","1.1","Firmitas utilitas. Venustas firmitas"],
 ["A","1.2","Firmitas utilitas venustas"],
 ["B","1.2","Venustas firmitas"], // no artificial cross-locus bigram
 ["C","3.1","Firmitas utilitas, ars"]
];
const a=await ngrams.compare(corpus,{workA:"A",workB:"B",size:2,yieldEvery:1});
assert.equal(a.tokensA,9);
assert.equal(a.tokensB,6);
assert.equal(a.passagesA,2);
assert.equal(a.passagesB,2);
const phrase=a.rows.find(r=>r.key==="firmitas utilitas");
assert.ok(phrase,"Repeated attested bigram not found");
assert.equal(phrase.a,3);
assert.equal(phrase.b,1);
assert.equal(phrase.locus,"1.1");
assert.equal(phrase.phrase,"Firmitas utilitas");
assert.equal(phrase.rateA,3/9*10000);
assert.equal(phrase.rateB,1/6*10000);
assert.equal(a.rows.find(r=>r.key==="utilitas uenustas")?.a,3);
assert.equal(a.rows.find(r=>r.key==="uenustas firmitas"),undefined,
 "Must not falsely connect adjacent sentences or separate loci");
const rest=await ngrams.compare(corpus,{workA:"A",workB:"",size:2});
assert.equal(rest.tokensB,9,"Rest-of-corpus must include B and C only");
assert.equal(rest.rows.find(r=>r.key==="firmitas utilitas")?.b,2);
const tri=await ngrams.compare(corpus,{workA:"A",workB:"B",size:3});
assert.equal(tri.rows.find(r=>r.key==="firmitas utilitas uenustas")?.a,3);
assert.equal(tri.rows.find(r=>r.key==="firmitas utilitas uenustas")?.b,0);
for(const length of [4,5]){
 const no=await ngrams.compare(corpus,{workA:"A",workB:"B",size:length});
 assert.equal(no.rows.length,0,"Do not invent unattested longer phrase sequences");
}
const greek=[
 ["greekA","1.1","Μῆνιν ἄειδε, θεά. Μῆνιν ἄειδε θεά"],
 ["greekB","1.1","μῆνιν ἄειδε θεά"]
];
const g=await ngrams.compare(greek,{workA:"greekA",workB:"greekB",size:2});
assert.equal(g.rows.find(r=>r.key==="μηνιν αειδε")?.a,2);
assert.equal(g.rows.find(r=>r.key==="μηνιν αειδε")?.b,1);
assert.rejects(()=>ngrams.compare(corpus,{workA:"A",workB:"A",size:2}));
assert.rejects(()=>ngrams.compare(corpus,{workA:"A",workB:"B",size:1}));
assert.rejects(()=>ngrams.compare(corpus,{workA:"no-work",workB:"B",size:2}));
const lex=readFileSync("assets/vitruvia-lexicon.js","utf8");
new vm.Script(lex,{filename:"assets/vitruvia-lexicon.js"});
const html=readFileSync("vitruvia-lexicon.html","utf8");
assert.match(html,/id="ng-size"/);
assert.match(html,/id="ng-go"/);
assert.match(html,/id="ng-out"/);
assert.match(html,/lexicon-ngram-engine\.js\?v=/);
assert.ok(html.indexOf("lexicon-ngram-engine.js")<html.indexOf("assets/vitruvia-lexicon.js"),
 "The dependent Lexicon UI must load after its engine");
assert.ok(lex.includes("ngramLocusURL(row.phrase")&&lex.includes('u.searchParams.set("locus",locus)'),
 "Expression results must retain their authentic locus");
assert.ok(lex.includes("toCSV(data)"),"CSV export must reuse existing export utility");
assert.ok(lex.includes("renderNgramComparatio()"),"N-gram workflow not connected to UI");
console.log("PASS: Latin/Greek 2–5 n-grams, authentic loci, no sentence crossing, denominators, comparison, UI and CSV");
