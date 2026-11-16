import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source=readFileSync("assets/vitruvia-lexicon.js","utf8");
new vm.Script(source,{filename:"assets/vitruvia-lexicon.js"});
const start=source.indexOf("function sourceLanguagesForLocus(");
const end=source.indexOf("async function openLocus(",start);
assert.ok(start>=0&&end>start,"Missing context-sensitive source language resolver");
const extracted=source.slice(start,end);
const ctx={URL,location:{href:"https://vitruvius-digital-library.org/vitruvia-lexicon.html"}};
const helpers=vm.runInNewContext(extracted+";({sourceLanguagesForLocus,findLocusIndex,locusReaderURL})",ctx);
const languages=lang=>Array.from(helpers.sourceLanguagesForLocus(lang));
assert.deepEqual(languages("grc"),["grc"],"Explicit Greek must not turn into Latin");
assert.deepEqual(languages("la"),["la"],"Explicit Latin must not turn into Greek");
assert.deepEqual(languages("auto"),["la","grc"],"Old links should inspect both language corpora");
const registry=JSON.parse(readFileSync("data/classics-corpus/search-registry.json","utf8"));
const greek=registry.entries.filter(e=>e.language==="grc"&&e.workId);
assert.ok(greek.length>8,"Bibliotheca contains more Greek works than original hardcoded list");
const workId=greek.find(e=>e.workId==="aeschylus-oresteia")?.workId||greek[0].workId;
const corpus={corpus:{passages:[["cicero-officiis","1.1","decor"],[workId,"2.1","λόγος"]]}};
assert.equal(helpers.findLocusIndex(corpus,workId,"2.1"),1);
assert.equal(helpers.findLocusIndex(corpus,"cicero-officiis","1.1"),0);
assert.equal(helpers.findLocusIndex(corpus,workId,"9.9"),-1,"No invented locus");
const link=helpers.locusReaderURL(workId,"2.1","grc");
assert.equal(link.pathname,"/classics-text-reader.html");
assert.equal(link.searchParams.get("lang"),"grc");
assert.equal(link.searchParams.get("work"),workId);
assert.equal(link.searchParams.get("locus"),"2.1");
const latin=helpers.locusReaderURL("vitruvius","1.1.1","la");
assert.equal(latin.pathname,"/lector-bilingue.html");
assert.equal(latin.searchParams.get("locus"),"1.1.1");
assert.equal(latin.searchParams.get("edition"),"recensio-es");
assert.ok(source.includes('openLocus(p.get("work"),p.get("locus"),q,p.get("lang"))'),
  "Deep links must pass their language to the resolver");
assert.ok(source.includes("El locus solicitado no está localizado en el corpus léxico disponible"),
  "Missing Lexicon passages must not be described as verified");
console.log("PASS: Greek/Latin deep links respect catalogue language and preserve reader fallback");
