#!/usr/bin/env node
/* Each imported work is marked indexed only when original passages,
 * academic fiche, registry, lexical index and reader metadata agree.
 * No R2 data is touched by this test.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
const load=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const manifest=load("data/classics-corpus/lote-50-fuentes-academicas-2026-11-16.json");
const supplementPath="data/bibliotheca-expansion-publicada-2026-11-16.json";
const supplement=load(supplementPath);
const registry=load("data/classics-corpus/search-registry.json");
const index=load("data/index/classics/manifest.json");
const auditPath="data/classics-corpus/lote-50-ingestion-audit.json";
const audit=load(auditPath);
const names=new Set();
const normalized=new Map(supplement.works.map(w=>[w.id,w]));
const indexKeys=new Map(index.index.map(e=>[e.id+"|"+e.lang,e]));
const registryKeys=new Map(registry.entries.map(e=>[e.workId+"|"+e.language,e]));
assert.equal(manifest.works.length,50,"Expected 50 curated independent works");
assert.equal(audit.editions.length,50,"Source audit must cover all 50");
assert.equal(new Set(audit.editions.map(x=>x.id)).size,50,"Source audit IDs must be unique");
for(const w of manifest.works){
  assert.ok(!names.has(w.id),"Repeated work "+w.id);
  names.add(w.id);
  const path="data/classics-corpus/"+w.id+"-grc.json";
  assert.ok(fs.existsSync(path),"Missing original "+w.id);
  const data=load(path),fiche=normalized.get(w.id);
  assert.equal(data.workId,w.id);
  assert.equal(data.language,"grc");
  assert.equal(data.sourceUrn,w.sourceUrn);
  assert.equal(data.source,w.sourceXml);
  assert.equal(data.sourceRevision,manifest.sourceRevision);
  assert.equal(data.license,"CC BY-SA 4.0");
  assert.match(data.sourceSha256,/^[0-9a-f]{64}$/);
  assert.ok(Array.isArray(data.passages)&&data.passages.length>=5,"Missing numbered passages "+w.id);
  assert.ok(data.passages.every(p=>p.locus.startsWith(w.sourceUrn+":")&&typeof p.text==="string"&&p.text.length>2),"Bad passage/locus "+w.id);
  assert.equal(new Set(data.passages.map(p=>p.locus)).size,data.passages.length,"Duplicate loci "+w.id);
  assert.ok(fiche&&fiche.author&&fiche.dating&&fiche.genre&&fiche.title,"Incomplete academic fiche "+w.id);
  assert.equal(fiche.bibliography?.canonicalReference,w.sourceUrn);
  assert.equal(fiche.bibliography?.sourceSha256,data.sourceSha256);
  assert.equal(fiche.bibliography?.license,"CC BY-SA 4.0");
  assert.equal(fiche.corpusFiles?.grc,path);
  assert.equal(fiche.reading?.url,"classics-text-reader.html?work="+w.id+"&lang=grc");
  const reg=registryKeys.get(w.id+"|grc"),idx=indexKeys.get(w.id+"|grc");
  assert.equal(reg?.path,path,"Missing edition in search registry "+w.id);
  assert.equal(reg?.sourceUrn,w.sourceUrn);
  assert.equal(idx?.file,path,"Missing edition in lexical index "+w.id);
  assert.ok(audit.editions.some(e=>e.id===w.id&&e.sha256===data.sourceSha256),"Missing source audit "+w.id);
  if(process.argv.includes("--write")){
    fiche.textStatus="lexically-indexed";
    fiche.publicStatus="lectura-local-completa";
    fiche.status="Texto griego de Perseus incorporado, catalogado y con índice léxico local; cotejo crítico independiente pendiente";
  }
}
if(process.argv.includes("--write")){
  fs.writeFileSync(supplementPath,JSON.stringify(supplement,null,2)+"\n");
  audit.status="source-verified-50-indexed-and-catalogued";
  audit.lexicalManifest="data/index/classics/manifest.json";
  audit.indexedCount=50;
  audit.indexGenerated=index.generated;
  fs.writeFileSync(auditPath,JSON.stringify(audit,null,2)+"\n");
}
console.log(JSON.stringify({
  result:"valid",originalEditions:50,searchableClassics:50,localIndexEntries:index.index.length,
  distinctRegisteredWorks:registry.works,registeredEditions:registry.entries.length,
  status:process.argv.includes("--write")?"certified":"read-only-verification"
},null,2));
