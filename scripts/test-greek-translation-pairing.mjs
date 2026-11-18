#!/usr/bin/env node
/** Regresión: original griego intacto, traducción humana por locus y sin duplicados ficticios. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const prefix="data/classics-corpus/";
const registry=read(prefix+"search-registry.json");
const fiches=read(prefix+"bibliotheca-academic-fiches-2026-11-16.json");
const works=[
 ["plato-republic",278,310],
 ["plato-laws",327,366],
 ["xenophon-anabasis",1469,1469],
 ["aristotle-metaphysics",142,300]
];
assert.equal(registry.entries.length,registry.count);
const key=locus=>String(locus).split(":").at(-1);
for(const [work,uniqueGreek,greekCards] of works){
 const gr=read(prefix+work+"-grc.json"),en=read(prefix+work+"-en.json");
 assert.equal(gr.language,"grc");assert.equal(en.language,"en");
 assert.equal(gr.workId,work);assert.equal(en.workId,work);
 assert.equal(gr.passages.length,greekCards);
 const a=new Set(gr.passages.map(p=>key(p.locus)));
 const b=new Set(en.passages.map(p=>key(p.locus)));
 assert.equal(a.size,uniqueGreek);assert.equal(b.size,uniqueGreek);
 assert.deepEqual([...a].sort(),[...b].sort(),"Loci missing for "+work);
 assert.ok(en.passages.every(p=>p.text.length>25&&!/<[^>]+>/.test(p.text)),work+" malformed translated text");
 assert.equal(registry.entries.filter(e=>e.workId===work&&e.language==="grc").length,1);
 assert.equal(registry.entries.filter(e=>e.workId===work&&e.language==="en").length,1);
 assert.ok(fiches.records.find(w=>w.workId===work)?.textualIndex?.readers?.some(e=>e.language==="en"));
 const ref=key(gr.passages[0].locus);
 const translated=en.passages.find(p=>key(p.locus)===ref);
 assert.ok(translated,work+" missing opening passage");
 console.log("PASS "+work+" grc "+greekCards+" cards / en "+uniqueGreek+" loci: "+ref);
}
// Exhaustive formal coverage is a registry measure, not a guarantee of philological accuracy.
const greek=fiches.records.filter(w=>w.originalLanguage==="grc");
assert.equal(greek.length,160);
const withTranslation=greek.filter(w=>w.textualIndex?.readers?.some(e=>["en","es","fr"].includes(e.language)));
assert.equal(withTranslation.length,46);
console.log("PASS: 46/160 Greek records have ≥1 hosted historic translation; originals retained.");
