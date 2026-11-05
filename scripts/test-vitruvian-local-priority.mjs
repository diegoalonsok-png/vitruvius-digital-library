import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const catalog=JSON.parse(read("data/bibliotheca-graeca-latina-I-bce-I-ce.json"));
const catullus=catalog.works.find(w=>w.id==="catullus-carmina");
assert.ok(catullus,"Catullus must be in the general classics catalogue");
assert.equal(catullus.publicStatus,"lectura-local-completa");
assert.equal(catullus.localHtml,"corpus/catullus-carmina-la.html");
const poems=read(catullus.localHtml);
for(const feature of ['id="find"','id="jump"','id="smaller"','id="larger"','id="print"'])assert.ok(poems.includes(feature),"Local reader missing "+feature);
const ctx={window:{}};vm.runInNewContext(read("assets/vitruvia-local-priority.js"),ctx);
const P=ctx.window.VitruviaLocalPriority;
for(const q of ["Vitruvio","prefacios de vitruvio","libro III capitulo 1","III.1.1"])
 assert.equal(P.plan(q).focused,true,q+" should prefer Vitruvius database");
const entries=[{lemma:"symmetria",forms:["symmetriae"]},{lemma:"eurythmia",greek:"εὐρυθμία"}];
assert.equal(P.plan("symmetria",entries).reason,"lexicon");
assert.equal(P.plan("symmetriae",entries).lemma,"symmetria");
assert.equal(P.plan("εὐρυθμία",entries).lemma,"eurythmia");
assert.equal(P.plan("cafetera",entries).focused,false);
const sorted=P.promote([
 {type:"wikipedia",title:"Catullus"},
 {type:"book",workId:"catullus-carmina",title:"Carmina",author:"Catulo",localReader:catullus.localHtml},
 {type:"article",title:"A paper"}
],"Catulo",entries);
assert.equal(sorted[0].workId,"catullus-carmina");
const pref=P.promote([{type:"wikipedia"},{type:"preface",title:"De architectura",edition:"recensio-es"}],"prefacios de vitruvio",entries);
assert.equal(pref[0].type,"preface");
const corpus=P.promote([{type:"wikipedia"},{type:"passage",edition:"recensio-es",title:"Vitruvio 3.1.1"}],"symmetria",entries);
assert.equal(corpus[0].type,"passage");
const x={window:{},URL,location:{href:"https://library.test/vitruvia.html",origin:"https://library.test"}};
vm.runInNewContext(read("assets/vitruvia-classics-viewer.js"),x);
assert.equal(x.window.VitruviaClassicsViewer.locate("corpus/catullus-carmina-la.html"),"https://library.test/corpus/catullus-carmina-la.html");
assert.equal(x.window.VitruviaClassicsViewer.locate("https://evil.test/inject.html"),null);
assert.equal(x.window.VitruviaClassicsViewer.locate("../private.html"),null);
const main=read("assets/vitruvia-search.js");
const html=read("vitruvia.html");
assert.match(main,/window\.VitruviaClassicsViewer\.open\(d\.localReader/);
assert.match(main,/window\.VitruviaLocalPriority\?\.promote\(firstOrdered,query,S\.lexicon\)/);
assert.match(main,/const corpusTask=\(\)=>window\.VitruviaAgentic\.search/);
assert.ok(html.indexOf("assets/vitruvia-local-priority.js")<html.indexOf("assets/vitruvia-search.js"));
assert.ok(html.indexOf("assets/vitruvia-classics-viewer.js")<html.indexOf("assets/vitruvia-search.js"));
new vm.Script(main);
console.log("PASS: Vitruvius-first and Greek/Latin catalogue reader, Catullus search and verified local reader");
