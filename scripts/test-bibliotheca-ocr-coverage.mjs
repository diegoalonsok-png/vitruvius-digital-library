/* Control de cobertura real: ediciones textuales ≠ OCR de facsímil.
 * No reclama calidad filológica ni modifica archivos.
 */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const load=p=>JSON.parse(readFileSync(p,"utf8"));
const master=load("data/bibliotheca-graeca-latina-I-bce-I-ce.json").works;
const registry=load("data/classics-corpus/search-registry.json").entries;
const pdfs=load("data/r2/catalogo-clasicos-r2.json").items;
const report=load("data/r2/bibliotheca-ocr-coverage.json");
const records=new Set(master.map(w=>w.id));
const textWorks=new Set(registry.map(e=>e.workId).filter(id=>records.has(id))); // count only works from the master catalogue
const r2=new Map(pdfs.map(e=>[e.id,e]));
const ocr=report.ocrSearchableWithoutTranscription,aliases=report.alreadyIndexedAsStructuredEdition,missing=report.needsTextOrVerifiableFacsimile;
const uniq=new Set([...ocr,...aliases,...missing].map(e=>e.id));
assert.equal(uniq.size,ocr.length+aliases.length+missing.length,"Tipos de cobertura solapados");
assert.equal(report.counts.masterWorks,master.length);
assert.equal(report.counts.withRegisteredText,textWorks.size);
assert.equal(report.counts.withoutRegisteredText,master.length-textWorks.size);
assert.equal(ocr.length+aliases.length+missing.length,report.counts.withoutRegisteredText);
assert.equal(ocr.length,report.counts.withoutTextButWithR2OcrIndex);
assert.equal(aliases.length,report.counts.withoutOwnRegistryButWithLinkedStructuredEdition);
assert.equal(missing.length,report.counts.withoutTextOrLinkedR2OcrIndex);
for(const row of [...ocr,...aliases,...missing]){
 assert(records.has(row.id),"Ficha inexistente "+row.id);
 assert(!textWorks.has(row.id),"Una obra ya indexada se cuenta como pendiente: "+row.id);
}
for(const row of ocr){
 assert(row.facsimileReaders?.length,"Falta edición OCR: "+row.id);
 for(const ed of row.facsimileReaders){
  const record=r2.get(ed.editionId);
  assert(record&&record.texto&&record.pdf,"Edición sin PDF y OCR registrado: "+ed.editionId);
  assert(ed.reader.includes("buscador-facsimiles-clasicos.html?obra="+ed.editionId));
 }
}
for(const row of aliases){
 const edition=registry.find(e=>e.workId===row.indexedUnderWorkId&&e.edition===row.edition&&e.path===row.indexedPath);
 assert(edition&&existsSync(edition.path),"Alias de edición sin índice verificable: "+row.id);
 assert(row.reader.startsWith("lector-bilingue.html?edition="));
}
console.log("PASS Bibliotheca OCR/corpus · fichas:",master.length,
 "texto propio:",textWorks.size,"solo OCR:",ocr.length,
 "ediciones estructuradas:",aliases.length,"sin índice:",missing.length);
