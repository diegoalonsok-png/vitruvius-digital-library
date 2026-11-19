// Verifies the existing Latin critical-edition indexes by locus.
// This test intentionally does not require OCR, re-extract PDF pages,
// or change the separately maintained historical page-image search.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const json=path=>JSON.parse(readFileSync(new URL("../"+path,import.meta.url),"utf8"));
const registry=json("data/classics-corpus/search-registry.json");
const editions=[
 {id:"krohn-1912-indexed",edition:"krohn-1912",path:"data/critical-editions/krohn-1912-tei-loci.json"},
 {id:"rose-1899-indexed",edition:"rose-1899",path:"data/critical-editions/rose-1899-transcribed-loci.json"}
];
const lociByEdition=[];
for(const spec of editions){
 const entry=registry.entries.find(e=>e.workId===spec.id);
 assert.ok(entry,"Missing critical-edition registry entry: "+spec.id);
 assert.equal(entry.language,"la");
 assert.equal(entry.format,"critical-indexed-latin");
 assert.equal(entry.path,spec.path);
 const text=json(spec.path);
 assert.equal(text.edition,spec.edition);
 assert.equal(text.passages.length,731,"Expected 731 existing Latin loci: "+spec.edition);
 assert.equal(text.summary.records,731);
 const loci=text.passages.map(p=>p.locus);
 assert.equal(new Set(loci).size,731,"Duplicate loci in "+spec.edition);
 assert(text.passages.every(p=>typeof p.locus==="string"&&typeof p.latin==="string"&&p.latin.trim().length>25),"Missing Latin passage: "+spec.edition);
 assert.equal(loci[0],"1.praef.1");
 assert.equal(loci.at(-1),"10.16.12");
 assert(text.passages.some(p=>/architectura/i.test(p.latin)),"Latin architectural text absent: "+spec.edition);
 lociByEdition.push(loci);
}
assert.deepEqual(lociByEdition[0],lociByEdition[1],"Krohn and Rose must share the same 731 navigation loci");
const krohn=json(editions[0].path);
const rose=json(editions[1].path);
assert.match(krohn.provenance?.method||"",/NOT OCR/i,"Krohn's TEI index must not be presented as OCR");
assert.match(krohn.provenance?.source_urn||"",/^urn:cts:latinLit:/);
assert.match(rose.provenance?.source||"",/text-only transcription/i);
assert.match(rose.provenance?.method||"",/not compared exhaustively/i,"Rose's editorial verification limits must remain explicit");
console.log("PASS: Krohn (TEI) and Rose (digital transcription) retain 731 independent indexed Latin loci, without any OCR dependency");
