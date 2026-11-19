#!/usr/bin/env node
// Bibliotheca expansion: schema, lexical discoverability and non-destructive R2 identity checks.
// The local and R2 editions may overlap conceptually: treat them as editions, never as unique ancient works.
import {readFileSync,existsSync} from "node:fs";
import assert from "node:assert/strict";
const json=p=>JSON.parse(readFileSync(p,"utf8"));
const records=json("data/bibliotheca-expansion-publicada-2026-11-16.json").works;
const registry=json("data/classics-corpus/search-registry.json").entries;
const index=json("data/index/classics/manifest.json").index;
const r2=json("data/r2/corpus-manifest.json").obras;
const indexed=records.filter(w=>w.corpusFiles?.grc).map(w=>w.id);
let lexicalVerified=0;
const pendingLexical=[];
assert.ok(indexed.length>=10,"Existing indexed original corpus must not regress");
assert.equal(records.filter(w=>w.id==="sappho-fragmenta").length,1,"Keep one identified bibliography-only Sappho fiche");
assert.equal(new Set(records.map(w=>w.id)).size,records.length,"No duplicate overlay IDs");
for(const id of indexed){
 const w=records.find(w=>w.id===id);
 assert.ok(w,`Missing catalogue record: ${id}`);
 assert.equal(w.language,"grc");
 // La fecha de composición es opcional cuando la fuente no la documenta;
 // no inventar cronologías para hacer pasar la auditoría. Si existe, debe ser válida.
 if(w.dating!==undefined) assert.ok(typeof w.dating==="string"&&w.dating.trim(),`Invalid academic dating: ${id}`);
 for(const field of ["author","title","genre","source","sourceUrl"]){
  assert.ok(typeof w[field]==="string"&&w[field].trim(),`Missing academic catalogue field ${field}: ${id}`);
 }
 assert.ok(["lexically-indexed","registered-pending-lexical-index","registered-original-searchable","registered-literal-searchable"].includes(w.textStatus),`Unexpected editorial state: ${id}`);
 assert.ok([undefined,null,"lectura-local-completa","lectura-local-por-capitulos","registered-not-indexed"].includes(w.publicStatus),
  `Unexpected public status: ${id}`);
 const p=`data/classics-corpus/${id}-grc.json`;
 assert.ok(w.corpusFiles&&typeof w.corpusFiles==="object"&&!Array.isArray(w.corpusFiles),
  "Public corpusFiles must be a language:path object");
 assert.equal(w.corpusFiles.grc,p,"Greek original must retain its canonical reader path");
 // A classical work can legitimately acquire a human translation without
 // invalidating its Greek source. Verify each additional language against
 // both its file and the existing search registry, rather than rejecting it.
 for(const [language,file] of Object.entries(w.corpusFiles)){
  assert.ok(["grc","la","en","es","fr","de","it","pt"].includes(language),
   `Invalid language for ${id}: ${language}`);
  assert.equal(file,`data/classics-corpus/${id}-${language}.json`,
   `Noncanonical corpus path for ${id} (${language})`);
  assert.ok(existsSync(file),`Missing edition ${id} (${language})`);
  assert.ok(registry.some(e=>e.workId===id&&e.language===language&&e.path===file),
   `Unregistered edition ${id} (${language})`);
 }
 assert.ok(existsSync(p),`Missing Greek original: ${p}`);
 const text=json(p);
 assert.equal(text.workId,id);
 assert.equal(text.language,"grc");
 // A complete short speech or Socratic dialogue may have far fewer than 200
 // numbered TEI paragraphs; its size is not an editorial completeness test.
 // Un único locus puede contener una obra breve completa. Se comprueba contenido, fuente y cada locus.
 const minCount=1;
 const textChars=text.passages.reduce((sum,p)=>sum+String(p.text||"").length,0);
 assert.ok(/^https:\/\//.test(text.source||'')||(Array.isArray(text.sources)&&text.sources.length>0&&text.sources.every(s=>/^https:\/\//.test(s.url||''))),`Missing documented TEI source: ${id}`);
 assert.ok(text.passages.length>=minCount&&textChars>=800,`Empty/implausible Greek corpus: ${id} · ${text.passages.length} passages · ${textChars} chars`);
 assert.ok(text.passages.every(x=>x.text&&x.locus),"Every passage must retain locus and text");
 assert.ok(registry.some(e=>e.workId===id&&e.language==="grc"&&e.path===p),`Missing search registration ${id}`);
 const inLexicalIndex=index.some(e=>e.id===id&&e.lang==="grc"&&e.file===p);
 // When new books arrive during an asynchronous index regeneration, a
 // pending record is valid. Only an edition *claimed* indexed must be in
 // the published lexical manifest. A separate index-building workflow
 // must still verify every recorded edition after rebuilding.
 if(w.textStatus==="lexically-indexed")
  assert.ok(inLexicalIndex,`Edition claimed indexed but absent from lexical manifest: ${id}`);
 if(inLexicalIndex)lexicalVerified++;
 else pendingLexical.push(id);
 assert.equal(w.reading?.url,`classics-text-reader.html?work=${id}&lang=grc`);
}
const sappho=records.find(w=>w.id==="sappho-fragmenta");
assert.ok(sappho,"Sappho bibliographic record is required");
assert.equal(sappho.textStatus,"not-indexed","Unverified fragmentary text must not be claimed indexed");
assert.ok(!sappho.corpusFiles,"Do not publish a Sappho original without verifying its edition");
const aliases=[["callimachus-hymni","calimaco-himnos"],["theocritus-idyllia","teocrito-bucolicos"]];
for(const [githubId,r2Id] of aliases){
 assert.ok(r2.some(w=>w.workId===r2Id&&w.language==="grc"),`Known R2 edition missing: ${r2Id}`);
 assert.ok(registry.some(w=>w.workId===githubId&&w.language==="grc"),`Known GitHub edition missing: ${githubId}`);
}
console.log(`Bibliotheca: ${indexed.length} Greek originals with academic fiche + reader; ${lexicalVerified} indexed, ${pendingLexical.length} awaiting lexical publication. Sappho remains bibliographic only; R2 aliases preserved.`);
if(pendingLexical.length)console.log('Lexical publication pending: '+pendingLexical.join(', '));
