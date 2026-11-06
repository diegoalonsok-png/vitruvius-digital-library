/* Reproducible audit: catalogue vs real locally hosted files and full-text registry.
   Does not claim that a PDF is OCRed or that all ancient works have survived. */
import assert from "node:assert/strict";
import {readFileSync,readdirSync,existsSync,statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const pathOf=p=>resolve(root,p);
const read=p=>JSON.parse(readFileSync(pathOf(p),"utf8"));
const catalog=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json");
const registry=read("data/classics-corpus/search-registry.json");
assert(Array.isArray(catalog.works)&&catalog.works.length>0);
assert.equal(registry.schema,"vitruvia-classics-search-registry-v1");
const works=catalog.works,byId=new Map(works.map(w=>[w.id,w]));
assert.equal(byId.size,works.length,"Duplicate work ID");
const groups=Object.fromEntries([...new Set(works.map(w=>w.publicStatus||"sin-estado"))].map(k=>[k,works.filter(w=>(w.publicStatus||"sin-estado")===k).length]));
const invalid=[],checked=[];
function fileReference(id,label,p){
 if(typeof p!=="string"||!p||/^https?:\/\//i.test(p))return;
 let clean=p.replace(/^\.\//,"").split(/[?#]/,1)[0];
 if(clean.startsWith("/")||clean.includes("..")||!existsSync(pathOf(clean)))invalid.push({id,label,path:clean});
 else checked.push({id,label,path:clean});
}
for(const w of works){
 fileReference(w.id,"localHtml",w.localHtml);
 fileReference(w.id,"pdf",w.pdf?.url);
 if(w.localReader?.verified){
  fileReference(w.id,"reader-original",w.localReader.original);
  for(const p of w.localReader.translations||[])fileReference(w.id,"reader-translation",p);
 }
 for(const [lang,p] of Object.entries(w.corpusFiles||{}))fileReference(w.id,"corpus-"+lang,p);
 for(const v of w.localVersions||[])fileReference(w.id,"localVersion",v.path);
 for(const v of w.pdfEditions||[])fileReference(w.id,"pdfEdition",v.url);
}
assert.deepEqual(invalid,[],"Broken local references: "+JSON.stringify(invalid));
const unique=new Set(),languages={},formats={};
for(const entry of registry.entries){
 assert(byId.has(entry.workId),"Search record has unknown work "+entry.workId);
 assert(["la","grc","es","en","fr","it","de","pt"].includes(entry.language),"Invalid language");
 assert(["html-text","json-passages"].includes(entry.format),"Invalid index format");
 assert(!unique.has(entry.path),"Duplicate indexed file "+entry.path);
 unique.add(entry.path);
 assert(existsSync(pathOf(entry.path)),"Missing indexed file "+entry.path);
 assert(statSync(pathOf(entry.path)).size>250,"Empty indexed file "+entry.path);
 languages[entry.language]=(languages[entry.language]||0)+1;formats[entry.format]=(formats[entry.format]||0)+1;
 if(entry.format==="json-passages"){
  const text=read(entry.path);
  assert.equal(text.workId,entry.workId,"Mismatched work ID in "+entry.path);
  assert.equal(text.language,entry.language,"Mismatched text language in "+entry.path);
  assert(Array.isArray(text.passages)&&text.passages.length>0,"No searchable passages in "+entry.path);
  assert(text.attribution&&text.source,"Missing attribution/source in "+entry.path);
 }
}
for(const w of works)for(const p of Object.values(w.corpusFiles||{}))
 assert(unique.has(p),"Local text exists but is not included in classical search: "+p);
const corpusJson=readdirSync(pathOf("data/classics-corpus")).filter(p=>/-(?:grc|la|es|en|fr|it|de|pt)\.json$/.test(p));
for(const file of corpusJson)assert(unique.has("data/classics-corpus/"+file),"Unindexed classical corpus asset: "+file);
const htmlFiles=readdirSync(pathOf("corpus")).filter(p=>p.endsWith(".html"));
const unindexedHtml=htmlFiles.filter(p=>!unique.has("corpus/"+p));
const classicPDF=readdirSync(pathOf("documents/classics")).filter(p=>p.endsWith(".pdf"));
const vitruviusPageTexts=readdirSync(pathOf("data/text")).filter(p=>p.endsWith(".json"));
const pdfInventory=read("data/classics-corpus/pdf-inventory.json");
assert.equal(pdfInventory.schema,"vitruvia-classics-pdf-inventory-v1");
assert.equal(pdfInventory.files.length,classicPDF.length,"PDF inventory count is stale");
const inventoried=new Map(pdfInventory.files.map(x=>[x.path,x]));
for(const filename of classicPDF){
 const path="documents/classics/"+filename,entry=inventoried.get(path);
 assert(entry&&entry.repositoryFilePresent,"Unlisted classical PDF: "+path);
 assert(entry.linkedWorkIds?.length,"Uploaded PDF must link to at least one catalogue work: "+path);
 assert.equal(statSync(pathOf(path)).size,entry.bytes,"PDF inventory size changed: "+path);
 for(const id of entry.linkedWorkIds)assert(byId.has(id),"Unknown work for PDF: "+id);
}

const localWorks=works.filter(w=>w.publicStatus==="lectura-local-completa"||w.publicStatus==="lectura-local-parcial");
const published=read("data/classics-corpus/coverage-audit.json");
assert.equal(published.schema,"vitruvia-classics-coverage-audit-v1");
assert.equal(published.works.length,works.length,"Public coverage report is stale (work count)");
assert.equal(published.counts.indexedTextVersions,registry.entries.length,"Public coverage report is stale (indexed versions)");
const publicMap=new Map(published.works.map(w=>[w.id,w]));
assert.equal(publicMap.size,works.length,"Duplicate/missing entry in public coverage audit");
for(const w of works){
 const p=publicMap.get(w.id);
 assert(p&&p.title===w.title&&p.catalogueStatus===w.publicStatus,
  "Public coverage report differs from catalogue: "+w.id);
 const expected=registry.entries.filter(e=>e.workId===w.id).map(e=>e.path).sort();
 assert.deepEqual([...p.indexedTextFiles].sort(),expected,"Public indexed-file list is stale: "+w.id);
}

const summary={cataloguedWorks:works.length,distinctAuthorLabels:new Set(works.map(w=>w.author)).size,status:groups,
 localReadingRecords:localWorks.length,checkedFileReferences:checked.length,
 fulltextSearchWorks:new Set(registry.entries.map(e=>e.workId)).size,fulltextSearchVersions:registry.entries.length,
 languages,formats,unindexedHtml,classicPDF:classicPDF.length,vitruviusPageTextIndexes:vitruviusPageTexts.length,
 note:"Binary PDFs were checked for repository presence, not OCR completeness or browser rendering. Unknown works worldwide cannot be counted from this local catalogue."};
console.log(JSON.stringify(summary,null,2));
console.log("PASS: classical corpus references and per-language source search registry are internally consistent.");
