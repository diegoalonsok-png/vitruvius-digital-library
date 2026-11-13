/* Test index-first Bibliotheca without HTTP or full-corpus downloads. */
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const require=createRequire(import.meta.url);
const fast=require("../assets/bibliotheca-fast-index.js");
const index=require("../assets/classics-lexical-index.js");

const readPaths=[];
index.setReader(async file=>{
 readPaths.push(file);
 assert.ok(file.startsWith("data/index/classics/"),"Never fetch an edition in index mode: "+file);
 return JSON.parse(readFileSync(file,"utf8"));
});
const result=await fast.candidates(index,"domus");
assert.ok(result.terms.includes("domus"));
assert.ok(result.indexedVersions>50,"Expected real lexical index, not empty stub");
assert.ok(result.total>0,"A well-attested Latin term must return real candidate editions");
assert.equal(result.rows.length,result.total);
assert.equal(result.exactPhraseVerified,false);
assert.ok(result.rows.every(row=>row.workId&&row.sourceFile&&row.language));
assert.ok(readPaths.length<14,"Index preview must read few small lexical shards, not all books");
assert.ok(!readPaths.some(p=>p.startsWith("data/classics-corpus/")));
const allowed=result.rows[0].workId;
const filtered=await fast.candidates(index,"domus",{allowedWorks:[allowed]});
assert.ok(filtered.rows.every(x=>x.workId===allowed),"Work filter must be authoritative");
const phrase=await fast.candidates(index,"domus architectura");
assert.equal(phrase.exactPhraseVerified,false);
assert.ok(phrase.rows.every(x=>x.isPhrase),"Words in one edition never imply the literal phrase");
assert.deepEqual(fast.tokens("de la domus et architectura"),["domus","architectura"]);

const html=readFileSync("bibliotheca-graeca-latina.html","utf8");
const source=readFileSync("assets/bibliotheca-simple.js","utf8");
const philology=html.indexOf('src="assets/vitruvia-philology.js');
const lexical=html.indexOf('src="assets/classics-lexical-index.js');
const fastModule=html.indexOf('src="assets/bibliotheca-fast-index.js');
const reader=html.indexOf('src="assets/bibliotheca-simple.js');
assert.ok(philology>=0&&lexical>philology&&fastModule>lexical&&reader>fastModule,
 "Modules must load in dependency order before Bibliotheca search");
assert.ok(source.includes("if(!workId&&!options.exhaustive)"),"Global searches must use fast index");
assert.ok(source.includes("await showFastIndex(q,id,allowedWorkIds)"),"Global searches must avoid corpus fetches");
assert.ok(source.includes('allMatches:false,maxPerEdition:workId?200:70,limit:600'),
 "Explicit text verification must have bounded memory and render budget");
assert.ok(source.includes('options.exhaustive:true')||source.includes('search(true,{exhaustive:true})'),
 "Wide text verification must require deliberate user interaction");
console.log("PASS: index-first, explicit bounded verification, precise source labels and no full-text download on default global query. Loaded "+readPaths.length+" lexical files for test queries.");
