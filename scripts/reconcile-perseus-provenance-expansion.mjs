#!/usr/bin/env node
/** Reconcile only public bibliographic provenance after a verified R2 TEI ingest.
 * Never downloads, rewrites, or stores full classical texts in GitHub.
 * Never invents edition URNs: uses TEI-header URNs already validated by
 * expand-classics-r2.py and checked against the published corpus manifest.
 */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=resolve(fileURLToPath(new URL("..",import.meta.url)));
const path=p=>join(ROOT,p);
const read=p=>JSON.parse(readFileSync(path(p),"utf8"));
const reportPath="data/perseus-provenance-audit.json";
const htmlPath="perseus-procedencia-textual.html";
const catalogue=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json").works;
const registry=read("data/classics-corpus/search-registry.json").entries;
const expansion=read("data/r2/classics-expansion-manifest.json").editions;
const provenance=read(reportPath);
assert.equal(provenance.schema,"vitruvius-perseus-provenance-audit-v1");
const goodSha=value=>/^[0-9a-f]{64}$/i.test(value||"");
const goodURN=value=>/^urn:cts:(?:latinLit|greekLit):[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value||"");
const workCode=urn=>{
 const m=/^urn:cts:(?:latinLit|greekLit):([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\./.exec(urn||"");
 assert(m,"Edición sin identificador CTS de fuente TEI");
 return m[1].toLowerCase();
};
const ids=new Set(),codes=new Map();
for(const row of provenance.records){
 assert(!ids.has(row.workId),"Duplicated prior provenance ID "+row.workId);
 ids.add(row.workId);
 if(row.ctsStatus==="declared_and_checked_in_source_tei_header"&&row.ctsEditionUrn){
  const code=workCode(row.ctsEditionUrn);
  assert(!codes.has(code),"Prior TEI original duplicated CTS: "+code);
  codes.set(code,row.workId);
 }
}
const catalogIds=new Set(catalogue.map(w=>w.id));
assert.equal(catalogIds.size,catalogue.length,"Duplicate work ID in catalogue");
assert([...ids].every(id=>catalogIds.has(id)),"Provenance contains missing old work ID");
const expansionById=new Map();
for(const row of expansion){
 const prev=expansionById.get(row.workId);
 if(prev)assert(prev.sha256===row.sha256,"Two conflicting expansion editions for "+row.workId);
 else expansionById.set(row.workId,row);
}
const inserted=[];
for(const work of catalogue){
 if(ids.has(work.id))continue;
 const e=expansionById.get(work.id);
 assert(e,"New catalogue work without verified R2 expansion: "+work.id);
 assert(goodSha(e.sha256),"R2 corpus SHA256 absent: "+work.id);
 assert(/^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/[a-z0-9-]+\.json$/.test(e.url||""),"Unverifiable R2 corpus URI");
 assert(work.corpusFiles?.[e.language]===e.url,"Catalogued original does not match R2 manifest: "+work.id);
 assert(work.language===e.language,"Original language and R2 edition mismatch");
 const registered=registry.filter(r=>r.workId===work.id);
 assert(registered.some(r=>r.path===e.url&&r.language===e.language),"Reader search entry missing");
 assert(e.sources?.length,"No source TEI edition for "+work.id);
 const sources=e.sources.map(src=>{
  assert(goodURN(src.editionUrn),"Source TEI edition URN not documented: "+work.id);
  assert(goodSha(src.sourceSha256),"Source TEI checksum absent: "+work.id);
  assert(/^https:\/\/raw\.githubusercontent\.com\/(?:PerseusDL\/canonical-(?:greek|latin)Lit|OpenGreekAndLatin\/First1KGreek)\//.test(src.sourceUrl||""),
   "Source outside approved TEI repositories");
  assert(src.licences?.length&&src.licences.every(l=>/^https:\/\/creativecommons\.org\/(?:licenses\/by(?:-sa)?\/[1-4]\.0|publicdomain\/(?:zero\/1\.0|mark\/1\.0))\/$/.test(l.url)),
   "Source TEI license invalid or absent: "+work.id);
  const code=workCode(src.editionUrn);
  const prior=codes.get(code);
  assert(!prior||prior===work.id,"Duplicate ancient original under distinct IDs: "+code+" = "+prior+" vs "+work.id);
  codes.set(code,work.id);
  return {editionUrn:src.editionUrn,sourceUrl:src.sourceUrl,sourceSha256:src.sourceSha256,
   editors:src.editors||[],licences:src.licences};
 });
 const rights=[...new Set(sources.flatMap(src=>src.licences.map(l=>l.url)))];
 const candidateWorkCodes=[...new Set(sources.map(s=>workCode(s.editionUrn)))];
 const versions=registered.map(r=>({language:r.language,path:r.path,sourceDescription:r.sourceDescription||"",reader:r.reader||""}));
 const original=sources[0];
 const row={workId:work.id,author:work.author,title:work.title,originalLanguage:work.language,
  sourceReadiness:"original_r2_tei_publicado_con_sha256",originalIndexed:false,originalR2Registered:true,
  translationHosted:versions.some(v=>!["grc","la"].includes(v.language)),
  candidateWorkCodes,versions,
  ctsEditionUrn:original.editionUrn,ctsStatus:"declared_and_checked_in_source_tei_header",
  ctsSourceUri:original.sourceUrl,
  ctsEvidence:"TEI XML original, div[@type=edition]/@n, edición y SHA256 verificados mediante fuente R2: "+original.sourceSha256,
  ctsNote:"URN de edición declarada en TEI; no implica resolución CTS pública ni cotejo de manuscritos.",
  sourceRights:rights.join(" · "),otherSourceEditions:sources.slice(1),
  r2TextUrl:e.url,r2Sha256:e.sha256,perseusAffiliation:false};
 provenance.records.push(row);ids.add(work.id);inserted.push(work.id);
}
assert.equal(provenance.records.length,catalogue.length,"Historical provenance missing catalogue works");
const counts={
 works:provenance.records.length,
 worksWithCandidateWorkCodes:provenance.records.filter(r=>r.candidateWorkCodes?.length).length,
 versions:provenance.records.reduce((n,r)=>n+(r.versions?.length||0),0),
 worksWithPerseusSourceDescription:provenance.records.filter(r=>r.versions?.some(v=>/Perseus/i.test(v.sourceDescription||""))).length,
 verifiedEditionUrns:provenance.records.filter(r=>["verified","declared_and_checked_in_source_tei_header"].includes(r.ctsStatus)).length
};
provenance.counts=counts;
provenance.generated=new Date().toISOString().slice(0,10);
provenance.scope="Catálogo principal y ediciones TEI originales acreditadas y archivadas en R2; no certifica servicios externos";
provenance.method=(provenance.method||"")+
 (inserted.length?" Incorporaciones R2: edición declarada en TEI fuente, SHA256, licencia y localizador comprobados; no se presume afiliación externa.":"");
let html=readFileSync(path(htmlPath),"utf8");
for(const [id,count] of [
 ["prov-works",counts.works],
 ["prov-candidates",counts.worksWithCandidateWorkCodes],
 ["prov-mentions",counts.worksWithPerseusSourceDescription],
 ["prov-verified",counts.verifiedEditionUrns]
]){
 const pattern=new RegExp('(<b id="'+id+'">)\\d+(<\\/b>)');
 assert(pattern.test(html),"Missing provenance dashboard fallback: "+id);
 html=html.replace(pattern,(_,head,tail)=>head+count+tail);
}
// Avoid stale hardcoded legacy publication totals while preserving page design.
html=html.replace(/de los 227 textos clásicos del catálogo Vitruvius/,"de las obras clásicas del catálogo Vitruvius");
html=html.replace(/Hay una URN de edición declarada y comprobada en el encabezado TEI de las <i>Confessiones<\/i> de Agustín \(CSEL\); esa comprobación no acredita un servicio de resolución CTS público, un cotejo de códices ni una vinculación institucional con Perseus\./,
 "Las URN de edición documentadas en encabezados TEI de origen no acreditan un servicio de resolución CTS público, un cotejo de códices ni una vinculación institucional con Perseus.");
html=html.replace(/Las 246 versiones textuales locales se cuentan aparte;/,
 "Las versiones textuales locales y las ediciones R2 se cuentan por separado;");
html=html.replace(/El conjunto completo de <b><span data-cifra="obras">227<\/span> registros<\/b>/,
 'El conjunto completo de <b>'+counts.works+' registros</b>');
writeFileSync(path(reportPath),JSON.stringify(provenance,null,2)+"\n");
writeFileSync(path(htmlPath),html);
console.log(JSON.stringify({newProvenanceRecords:inserted.length,added:inserted,counts,
 rule:"Only source-documented CTS originals; no duplicate work or TEI code"}));
