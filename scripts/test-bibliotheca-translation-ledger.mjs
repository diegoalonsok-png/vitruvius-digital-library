/** Academic translation-gap ledger: static, reproducible provenance checks.
 * Read-only: no classics edited, remote text scraped, folios copied or
 * completeness inferred from a remote table of contents.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import {URL} from "node:url";
const load=path=>JSON.parse(fs.readFileSync(path,"utf8"));
const coverage=load("data/classics-corpus/translation-availability-222.json");
const remote=load("data/classics-corpus/remote-translations.json");
const witnesses=load("data/bibliotheca-testimonia-verified.json");
assert.equal(coverage.schema,"vitruvius-classics-translation-availability-v1");
assert.equal(remote.schema,"vitruvius-classics-remote-translations-v1");
assert.equal(coverage.works.length,coverage.totals.cataloguedWorks);
const pending=coverage.works.filter(x=>!x.translationLanguages?.length);
const ids=new Set(coverage.works.map(x=>x.id));
assert.equal(ids.size,coverage.works.length,"Duplicate work IDs");
assert.equal(pending.length,coverage.totals.worksWithoutHostedTranslation);
assert.equal(pending.filter(x=>x.originalIndexed).length+
 pending.filter(x=>!x.originalIndexed).length,pending.length);
const hosts=new Set(["penelope.uchicago.edu","www.attalus.org"]);
const labels=new Set(["complete-surviving","partial","coverage-to-check",undefined]);
const access=new Set(["external-reading-index","online-complete-translation",
 "online-partial-translation","reading-index","surviving-fragments-index",
 "three-books-index","bibliographic-discovery-only"]);
const seen=new Set();
for(const e of remote.entries){
 assert.ok(ids.has(e.workId),"Uncatalogued work: "+e.workId);
 assert.ok(e.language&&e.language!=="la"&&e.language!=="grc","No original-as-translation: "+e.workId);
 assert.ok(e.translator&&e.edition&&e.host&&e.verifiedIndexOn);
 assert.equal(e.status,"external-only");
 assert.equal(e.indexedLocally,false);
 assert.equal(e.alignedLocally,false);
 assert.ok(labels.has(e.coverage),"Unknown source coverage "+e.workId);
 assert.ok(access.has(e.access),"Unknown access type "+e.workId);
 const u=new URL(e.url);
 assert.equal(u.protocol,"https:");
 assert.ok(hosts.has(u.hostname),"Unexpected remote host "+u.hostname);
 const key=e.workId+"|"+e.language+"|"+e.url;
 assert.ok(!seen.has(key),"Duplicate link "+key);seen.add(key);
 if(e.access==="bibliographic-discovery-only")
  assert.ok(e.note?.match(/no|n[oó]|referencia|buscar/i),"Bibliographic-only access needs disclosure");
}
for(const item of witnesses.records){
 assert.ok(item.workIds?.every(w=>ids.has(w)),"Witness has orphaned work identifier");
}
const html=fs.readFileSync("bibliotheca-traducciones-pendientes.html","utf8");
const script=fs.readFileSync("assets/bibliotheca-translations-ledger.js","utf8");
const bibliotheca=fs.readFileSync("bibliotheca-graeca-latina.html","utf8");
const oldJs=fs.readFileSync("assets/bibliotheca-simple.js","utf8");
for(const token of ["ledger-rows","stat-total","stat-missing","stat-original",
 "stat-linked","filter-text","filter-language","filter-status","export-csv","ledger-status"])
 assert.ok(html.includes('id="'+token+'"'),"Missing DOM hook "+token);
for(const file of ["data/classics-corpus/translation-availability-222.json",
 "data/classics-corpus/remote-translations.json","data/bibliotheca-testimonia-verified.json"])
 assert.ok(script.includes(file),"Missing ledger data source "+file);
assert.match(bibliotheca,/bibliotheca-traducciones-pendientes\.html/);
assert.match(oldJs,/www\.attalus\.org/);
assert.match(script,/visor-codex\.html/);
assert.match(script,/bibliotheca-graeca-latina\.html/);
assert.match(script,/vitruvia-lexicon\.html/);
assert.ok(remote.entries.some(e=>e.workId==="cicero-oratore"));
assert.ok(remote.entries.some(e=>e.workId==="cicero-republica"));
assert.ok(remote.entries.some(e=>e.workId==="ptolemy-geographia"&&e.access==="bibliographic-discovery-only"));
const evidenced=new Set(remote.entries.filter(x=>pending.some(w=>w.id===x.workId)).map(x=>x.workId));
console.log("PASS: "+pending.length+" obras sin traducción local; "+
 pending.filter(x=>x.originalIndexed).length+" con original indexado; "+
 evidenced.size+" con lecturas o referencias externas documentadas. Sin falsificar indexación, colación o cobertura.");
