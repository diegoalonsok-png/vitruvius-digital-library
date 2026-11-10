#!/usr/bin/env node
/**
 * Academic regression: literal search and exact Vitruvian locus lookup.
 * A candidate note, a similar string and a physical manuscript reading
 * are NOT evidence of an explicit locus attribution.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const src=readFileSync("assets/critical-unified-exegesis.js","utf8");
new Script(src,{filename:"critical-unified-exegesis.js"});
const begin=src.indexOf("const locusKey=value=>");
const cut=src.indexOf("function pdfLink",begin);
const recordBegin=src.indexOf("function record(source,e,content,opts){",cut);
const recordEnd=src.indexOf("function countAndList(){",recordBegin);
assert(begin>0&&cut>begin&&recordBegin>cut&&recordEnd>recordBegin,"Unable to locate academic query helpers");
const lexical=src.slice(begin,cut),record=src.slice(recordBegin,recordEnd);
const sandbox={};
new Script(`
${lexical}
let currentLocusQuery=null,currentQuery="domus";
const phrase={checked:false};
const positions=(text,q)=>text.includes(q)?[[text.indexOf(q),text.indexOf(q)+q.length]]:[];
${record}
this.setQuery=q=>{currentQuery=q;currentLocusQuery=locusKey(q)};
this.lookup=locusKey;this.match=record;
`).runInNewContext(sandbox);
const normalize=sandbox.lookup;
for(const [input,expected] of [
 ["III.1.2","3.1.2"],["3.1.2","3.1.2"],
 ["II.pr.1","2.praef.1"],["2.praef.1","2.praef.1"],
 ["X.16.1","10.16.1"],["10.16.1","10.16.1"],
 ["Vitr. III.1.2","3.1.2"],
 ["prefacion","*.praef.*"],["prefación","*.praef.*"],
 ["prefacio","*.praef.*"],["praefatio","*.praef.*"],
 ["prefacion II","2.praef.*"],["prefación del libro II","2.praef.*"],
 ["prefacion II.1","2.praef.1"],["II.prefacion.1","2.praef.1"],
 ["domus",null],["III.1.2.3",null],["XI.1.2",null],
 ["3.0.1",null],["3.1.0",null],["3.1.2000",null]
])assert.equal(normalize(input),expected,input);
const ed={id:"recensio-es"};
sandbox.setQuery("III.1.2");
assert(sandbox.match("passage",ed,"locus text with no Latin query", {locus:"3.1.2"}),"Passage should match by locus");
assert.equal(sandbox.match("passage",ed,"same text",{locus:"3.1.20"}),null,"Do not confuse 3.1.2 with 3.1.20");
assert(sandbox.match("note",ed,"documented note",{locus:"III.1.2",verified:true}),"Explicit note should match");
assert.equal(sandbox.match("note",ed,"candidate note",{locus:"III.1.2",verified:false}),null,"Candidate note must not be treated as verified");
assert(sandbox.match("apparatus",ed,"documented heading",{locus:"III.1.2",verified:true}),"Explicit PDF heading should match");
assert.equal(sandbox.match("apparatus",ed,"incidental mention",{locus:"III.1.2",verified:false}),null,"Incidental PDF mention must not be treated as verified");
sandbox.setQuery("prefacion");
assert(sandbox.match("passage",ed,"prefacio latino",{locus:"1.praef.1"}),"Bare prefacion must find prefatory passages");
assert.equal(sandbox.match("passage",ed,"ordinary chapter",{locus:"1.1.1"}),null,"Bare prefacion cannot match non-preface chapters");
assert.equal(sandbox.match("note",ed,"unverified candidate",{locus:"1.praef.1",verified:false}),null,"Preface candidates must not be promoted");
sandbox.setQuery("prefacion II");
assert(sandbox.match("passage",ed,"book II preface",{locus:"2.praef.1"}),"Prefacion II must select book II");
assert.equal(sandbox.match("passage",ed,"book I preface",{locus:"1.praef.1"}),null,"Prefacion II cannot select book I");
sandbox.setQuery("domus");
assert(sandbox.match("passage",ed,"domus romana",{locus:"3.1.2"}),"Literal search should still work");
assert.equal(sandbox.match("passage",ed,"symmetria",{locus:"3.1.2"}),null,"Literal search should not fabricate matches");
assert(src.includes("if(currentLocusQuery&&['all','passages'].includes(field.value)&&fieldName==='translation')continue;"),
 "Facing passages should not be doubled for a locus search");
const es=JSON.parse(readFileSync("data/structured/recensio-es.json","utf8"));
const en=JSON.parse(readFileSync("data/structured/theory-en.json","utf8"));
for(const edition of [es,en]) {
 assert(edition.passages.some(p=>p.locus==="3.1.2"&&p.latin),"3.1.2 absent in "+edition.version);
 assert(edition.passages.some(p=>p.locus==="2.praef.1"),"Preface 2.praef.1 absent in "+edition.version);
}
console.log("PASS: Roman and Arabic loci, prefatory loci, explicit source status, no false candidate notes, literal search preserved.");
