#!/usr/bin/env node
/* Reproducible audit of bibliographical attribution and scholarly source claims.
 * Metadata checks do NOT prove manuscript collation, accuracy of a citation,
 * textual completeness, philological review, or current external availability.
 * Original DOCX/PDF/folios and all source texts are read-only here. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const local=p=>resolve(ROOT,p);
const read=p=>JSON.parse(readFileSync(local(p),'utf8'));
const works=read('data/bibliotheca-graeca-latina-I-bce-I-ce.json').works;
const registry=read('data/classics-corpus/search-registry.json');
const witnesses=read('data/bibliotheca-testimonia-verified.json');
const documents=read('data/classics-documents/manifest.json');
const available=read('data/classics-corpus/translation-availability-222.json');
const failures=[],warnings=[];
const failure=(id,msg)=>failures.push({id,message:msg});
const warn=(id,msg)=>warnings.push({id,message:msg});
const filled=v=>typeof v==='string'&&v.trim().length>0;
const ids=new Set(works.map(w=>w.id));
if(ids.size!==works.length)failure('duplicate-work','Duplicate IDs in classical catalogue');
if(works.length!==available.totals.cataloguedWorks)failure('catalogue-count','Catalogue and translation coverage counts differ');
if(registry.count!==registry.entries.length)failure('registry-count','Registry count differs from actual entries');
if(registry.works!==new Set(registry.entries.map(e=>e.workId)).size)failure('registry-works','Registry work count differs from its entries');

const byWork=new Map();
for(const entry of registry.entries){
 if(!ids.has(entry.workId))failure('orphan-index','Indexed work has no catalogue record: '+entry.workId);
 if(!filled(entry.path)||entry.path.includes('..')||!entry.path.startsWith('data/')&&!entry.path.startsWith('assets/')&&!entry.path.endsWith('.html'))
  failure('unsafe-index-path','Unsafe or missing index path: '+String(entry.path));
 else if(!existsSync(local(entry.path)))failure('missing-index','Missing indexed text: '+entry.path);
 if(!filled(entry.sourceDescription)&&!filled(entry.attribution))warn('index-attribution','Text index lacks source description: '+entry.workId+' '+entry.path);
 if(!byWork.has(entry.workId))byWork.set(entry.workId,[]);
 byWork.get(entry.workId).push(entry);
}
const citationOfWork=w=>filled(w.bibliography?.editionCitation)||filled(w.bibliography?.originalEditionCitation);
const citationOfVersion=w=>(w.localVersions||[]).some(v=>filled(v.citationChicago18));
const citable=works.filter(w=>citationOfWork(w)||citationOfVersion(w));
const localClaims=works.filter(w=>/^lectura-local-/.test(w.publicStatus||''));
const localWithoutCitation=localClaims.filter(w=>!citationOfWork(w)&&!citationOfVersion(w));
const incompleteBiblio=works.filter(w=>w.bibliography&&!citationOfWork(w));
const noStructuredCitation=works.filter(w=>!citationOfWork(w)&&!citationOfVersion(w));
const editionLinks=[];
for(const ed of witnesses.editions){
 if(!ids.has(ed.workId))failure('orphan-edition','Historical edition points to non-catalogued work: '+ed.workId);
 if(!filled(ed.title)||!filled(String(ed.year||''))||!filled(ed.editor))
  warn('edition-metadata','Historical edition lacks bibliographic details: '+ed.workId+' / '+ed.title);
 if(filled(ed.url)){
  const uri=ed.url.trim();
  // Scholarly catalogue may link to an institutional URL or to a local PDF/reader.
  if(/^https?:\/\//i.test(uri)){
   try{const u=new URL(uri);if(!['http:','https:'].includes(u.protocol))throw Error('protocol');editionLinks.push(u.href)}
   catch{failure('edition-url','Malformed external edition URL: '+ed.workId)}}
  else if(/^[a-z0-9][a-z0-9/_-]*\.(?:html|pdf)(?:[?#].*)?$/i.test(uri)){
   const path=uri.split(/[?#]/,1)[0];
   if(!existsSync(local(path)))failure('edition-local-file','Local historical edition target missing: '+ed.workId+' / '+path);
   else editionLinks.push(uri);
  } else failure('edition-url','Unrecognized edition URL form: '+ed.workId+' / '+uri);
 }
}
for(const witness of witnesses.records){
 if(!filled(witness.library)||!filled(witness.shelfmark)||!filled(witness.date)||!(witness.record||witness.viewer||witness.manifest))
  failure('witness-identity','Manuscript missing repository, shelfmark, dating or source: '+witness.id);
 for(const id of witness.workIds||[])if(!ids.has(id))failure('orphan-witness','Witness refers to unknown work: '+witness.id+' / '+id);
}
for(const doc of documents.records){
 if(!filled(doc.id)||!filled(doc.sha256)||!filled(doc.index)||!filled(doc.source))
  failure('document-provenance','DOCX record lacks provenance fields: '+doc.id);
 if(!/^[a-f0-9]{64}$/i.test(doc.sha256||''))failure('document-hash','Invalid DOCX SHA-256: '+doc.id);
 for(const p of [doc.index,doc.source,doc.pdf].filter(Boolean)){
  if(!/^(?:data\/classics-documents\/|documents\/clasicos\/)[a-z0-9-]+\.(?:json|docx|pdf)$/.test(p)||!existsSync(local(p)))
   failure('document-path','Missing or unsafe existing-document path: '+doc.id+' / '+p);
 }
}
if(citable.length<54)failure('citation-regression','Structured edition-citation coverage regressed below the 54 works observed in the 2026-11-08 baseline.');
if(localWithoutCitation.length)warn('local-bibliography',localWithoutCitation.length+' works labelled locally readable do not yet have a structured edition citation in the work catalogue/localVersions; other reader-level sources may exist.');
if(noStructuredCitation.length)warn('bibliography-backlog',noStructuredCitation.length+' catalogue records lack a work-level or local-version structured edition citation; do not fabricate one.');
const report={
 schema:'vitruvius-scholarly-citation-transparency-v1',
 generated:new Date().toISOString(),
 method:'Static metadata consistency check. Paths checked for existence, not textual accuracy, copyright status, editorial collation or external URL availability.',
 counts:{
  cataloguedWorks:works.length,
  indexedTextVersions:registry.entries.length,
  worksWithAtLeastOneIndexedVersion:byWork.size,
  catalogueWorksWithStructuredEditionCitation:citable.length,
  catalogueWorksWithoutStructuredEditionCitation:noStructuredCitation.length,
  localReadingClaims:localClaims.length,
  localReadingClaimsWithoutStructuredEditionCitation:localWithoutCitation.length,
  catalogueWorksWithPartialBibliography:incompleteBiblio.length,
  manuscriptWitnesses:witnesses.records.length,
  historicalEditions:witnesses.editions.length,
  historicalEditionUrls:editionLinks.length,
  extractedUploadedDocuments:documents.records.length,
  uploadedDocumentParagraphs:documents.records.reduce((n,d)=>n+d.paragraphs,0),
  hostedTranslationWorks:available.totals.translatedWorksLocal,
  worksWithoutHostedTranslation:available.totals.worksWithoutHostedTranslation
 },
 priorityEditorialReview:localWithoutCitation.map(w=>({
  workId:w.id,title:w.title,author:w.author,publicStatus:w.publicStatus,
  indexedVersions:(byWork.get(w.id)||[]).map(e=>({language:e.language,format:e.format,path:e.path})),
  remedy:'Find and verify the exact editor/translation, edition date, publisher or institutional URI and responsible reviewer. Do not infer from ancient composition dating.'
 })),
 bibliographyBacklog:noStructuredCitation.map(w=>({
  workId:w.id,title:w.title,author:w.author,status:w.publicStatus,
  indexedVersions:(byWork.get(w.id)||[]).length
 })),
 warnings,failures,
 evidenceLevels:{
  bibliographicDescription:'Work-level description; not a source edition',
  structuredCitation:'Verbatim citation stored in catalogue/localVersions; not independently verified as correct',
  manuscriptEvidence:'Institution, shelfmark and linked catalogue record; not a collation of readings',
  documentaryExtraction:'DOCX paragraph index with source identity; not a certified original text or translation alignment',
  editorialDecision:'Requires separately recorded witnesses, readings, responsible editor and review'
 },
 nextSteps:[
  'Resolve missing structured citations first among locally readable titles (without inventing data).',
  'Verify primary witnesses and reading variants at specific folios/loci, recording responsible specialist.',
  'Publish a stable citeable reference per original-language locus and separate original, edition, translation and facsimile.',
  'Retain independent unaligned full texts and disclose partial editions and translations.',
  'Invite independent philological review with dated publicly recorded recommendations.'
 ]
};
mkdirSync(local('reports'),{recursive:true});
writeFileSync(local('reports/scholarly-citation-coverage.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts:report.counts,failures:report.failures,warnings:report.warnings},null,2));
if(failures.length)process.exitCode=1;
else console.log('PASS: scholarly citation and source-provenance metadata consistent; gaps remain explicit, not certified.');
