#!/usr/bin/env node
/* Academic quality evidence gate — quantitative metadata, not peer review.
 * Read-only: DOES NOT modify a source, folio, image, PDF, DOCX, reader or UI.
 * Produces reports/academic-excellence.json for human scholarly review.
 */
import {readFileSync, existsSync, mkdirSync, writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const absolute=p=>resolve(root,p);
const read=p=>JSON.parse(readFileSync(absolute(p),"utf8"));
const present=p=>typeof p==="string"&&p.length>0&&existsSync(absolute(p));
const problems=[],alerts=[];
const error=(code,detail)=>problems.push({code,detail});
const advisory=(code,detail)=>alerts.push({code,detail});
const catalogue=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json").works;
const coverage=read("data/classics-corpus/translation-availability-222.json");
const registry=read("data/classics-corpus/search-registry.json");
const notes=read("data/critical-notes.json").entries;
const ecdotics=read("data/ecdotic-decisions.json").decisions;
const witnesses=read("data/bibliotheca-testimonia-verified.json").records;
const lexical=read("data/lexicon/etymologicum.json").entries;
const alignments=read("data/classics-alignment/manifest.json").pairs;
const documents=read("data/classics-documents/manifest.json");

const bookIds=new Set(catalogue.map(w=>w.id));
const indexedIds=new Set(registry.entries.map(e=>e.workId));
const coverageIds=new Set(coverage.works.map(w=>w.id));
if(bookIds.size!==catalogue.length)error("duplicate-book","El catálogo contiene IDs duplicados");
if(coverageIds.size!==coverage.works.length)error("duplicate-coverage","Hay obras duplicadas en la cobertura");
if(bookIds.size!==coverageIds.size||[...bookIds].some(id=>!coverageIds.has(id)))
 error("catalogue-mismatch","Catálogo y cobertura describen conjuntos distintos de obras");
if(registry.count!==registry.entries.length)
 error("registry-count","El total del registro no coincide con sus entradas");
if(coverage.totals.cataloguedWorks!==catalogue.length)
 error("coverage-total","La cobertura declara un número de obras diferente del catálogo");
if(coverage.totals.locallyIndexedWorks!==indexedIds.size)
 error("indexed-total","El registro y el total de obras indexadas discrepan");
if(coverage.totals.originalTextNotIndexed+coverage.totals.originalTextIndexed!==catalogue.length)
 error("original-coverage-total","Originales indexados y pendientes no suman el catálogo");
const orphanRegistry=registry.entries.filter(e=>!bookIds.has(e.workId));
if(orphanRegistry.length)error("orphan-index","Ediciones sin ficha de obra: "+orphanRegistry.map(e=>e.workId).slice(0,10).join(", "));
for(const e of registry.entries){
 if(!/^(data\/[a-zA-Z0-9/_-]+\.json|corpus\/[a-zA-Z0-9/_-]+\.html)$/.test(e.path||"")||!present(e.path))
  error("missing-edition","El índice no apunta a una edición válida: "+e.path);
}
const falselyIndexed=coverage.works.filter(w=>Boolean(w.originalIndexed)!==indexedIds.has(w.id));
if(falselyIndexed.length)error("incorrect-index-flags","Se anuncian obras indexadas sin registro o viceversa: "+falselyIndexed.map(w=>w.id).slice(0,12).join(", "));
const missingOriginals=coverage.works.filter(w=>!w.originalIndexed).map(w=>({id:w.id,title:w.title}));
const missingTranslations=coverage.works.filter(w=>!w.translationLanguages?.length).map(w=>({id:w.id,title:w.title}));
const editorialCitations=[];
let localVersions=0,versionCitations=0,citableViaWork=0;
for(const w of catalogue)for(const v of w.localVersions||[]){
 localVersions++;
 if(typeof v.citationChicago18==="string"&&v.citationChicago18.trim()){versionCitations++;continue}
 if(typeof w.bibliography?.editionCitation==="string"&&w.bibliography.editionCitation.trim()){citableViaWork++;continue}
 editorialCitations.push({id:w.id,title:w.title,language:v.language,versionKind:v.kind||null,reason:"Sin cita de edición concreta verificada en la versión ni en bibliography.editionCitation"});
}
const notesA=notes.filter(n=>n.mapping_status==="explicit_in_anchor");
const notesCandidate=notes.filter(n=>n.mapping_status!=="explicit_in_anchor"&&n.candidate_locus);
const notesUnlocated=notes.filter(n=>n.mapping_status!=="explicit_in_anchor"&&!n.candidate_locus);
const notesWithoutSource=notes.filter(n=>!n.source_file||!Number.isInteger(n.source_paragraph));
if(notesWithoutSource.length)error("note-provenance","Notas sin identificación de archivo y párrafo originales: "+notesWithoutSource.length);
const unjustifiedCertification=ecdotics.filter(d=>d.recordStatus==="verified_with_source"&&
 !(d.locus&&d.baseReading&&d.adoptedReading&&d.responsibleEditor&&d.reviewedOn&&d.justification&&
 ((d.primarySourceUri&&d.institution&&d.shelfmark&&d.folio)||d.secondaryReference)));
if(unjustifiedCertification.length)error("uncorroborated-ecdotic-claim","Decisiones llamadas verificadas sin evidencia obligatoria: "+unjustifiedCertification.length);
const incompleteWitnesses=witnesses.filter(w=>!w.shelfmark||!w.library||!w.date||!(w.record||w.viewer||w.manifest));
if(incompleteWitnesses.length)error("incomplete-witness","Faltan datos codicológicos en: "+incompleteWitnesses.map(w=>w.id).join(", "));
let verifiedDocumentFingerprints=0;const badDocuments=[];
for(const doc of documents.records||[]){
 if(!present(doc.source)||!present(doc.index)||!/^[a-f0-9]{64}$/i.test(doc.sha256||"")){badDocuments.push(doc.id);continue}
 const digest=createHash("sha256").update(readFileSync(absolute(doc.source))).digest("hex");
 if(digest!==doc.sha256)badDocuments.push(doc.id);else verifiedDocumentFingerprints++;
}
if(documents.records.length!==documents.count)error("document-count","El manifiesto documental contiene un número incorrecto de libros");
if(badDocuments.length)error("changed-document-source","El origen DOCX no coincide con su extracción: "+badDocuments.join(", "));
const lexicalWithoutBibliography=lexical.filter(e=>!Array.isArray(e.refs)||e.refs.length===0);
const lexicalWithoutLoci=lexical.filter(e=>!Array.isArray(e.loci)||e.loci.length===0);
if(lexicalWithoutBibliography.length)error("unreferenced-etymologies","Etimologías sin fuente bibliográfica: "+lexicalWithoutBibliography.map(e=>e.lemma).slice(0,10).join(", "));
const alignmentsUnverified=alignments.filter(e=>e.status!=="verified_with_source"&&e.status!=="philologically-verified");
const manuscriptVariantClaims=ecdotics.filter(e=>e.recordStatus==="verified_with_source").length;
if(missingOriginals.length)advisory("originals",missingOriginals.length+" obras están catalogadas pero no cuentan con original indexado en el registro principal");
if(missingTranslations.length)advisory("translations",missingTranslations.length+" obras carecen de traducción local registrada");
if(editorialCitations.length)advisory("bibliography",editorialCitations.length+" versiones locales necesitan ficha de edición específica");
if(notesCandidate.length)advisory("candidate-notes",notesCandidate.length+" notas del autor tienen locus candidato pendiente de revisión");
if(notesUnlocated.length)advisory("unlocated-notes",notesUnlocated.length+" notas auténticas aún no están localizadas por locus");
if(lexicalWithoutLoci.length)advisory("lexicon-loci",lexicalWithoutLoci.length+" voces etimológicas no citan un locus local");
if(alignmentsUnverified.length)advisory("aligned-texts",alignmentsUnverified.length+" pares de traducción/original no están certificados por colación");
if(!manuscriptVariantClaims)advisory("ecdotic-review","El registro aún no certifica ninguna decisión de variante manuscrita; no extrapolar resultados automáticos");
const report={
 schema:"vitruvius-academic-evidence-matrix-v1",
 generated:new Date().toISOString(),
 purpose:"Auditoría reproducible de metadatos y trazabilidad; NO equivale a evaluación universitaria ni asigna nota 9,75/10.",
 limitations:"No certifica lectura humana, traducciones, derechos, sitios externos ni colación autóptica. No modifica el material de Vitruvio.",
 scope:{cataloguedWorks:catalogue.length,indexedVersions:registry.entries.length,indexedWorks:indexedIds.size,indexedOriginals:coverage.totals.originalTextIndexed,
 unindexedOriginals:missingOriginals.length,worksWithHostedTranslations:coverage.totals.translatedWorksLocal,worksWithoutHostedTranslations:missingTranslations.length},
 originalCoveragePercent:Math.round(10000*coverage.totals.originalTextIndexed/catalogue.length)/100,
 hostedTranslationCoveragePercent:Math.round(10000*coverage.totals.translatedWorksLocal/catalogue.length)/100,
 provenance:{localVersions,explicitChicago18VersionCitations:versionCitations,versionsWithWorkLevelEditionCitation:citableViaWork,versionCitationsPending:editorialCitations.length,
 manuscriptWitnesses:witnesses.length,incompleteWitnesses:incompleteWitnesses.length,
 originalDocumentFingerprintsVerified:verifiedDocumentFingerprints,documentCount:documents.count},
 apparatus:{notes:notes.length,explicitNotes:notesA.length,candidateNotes:notesCandidate.length,unlocatedNotes:notesUnlocated.length,notesWithoutSource:notesWithoutSource.length,
 ecdoticDecisions:ecdotics.length,certifiedDecisions:manuscriptVariantClaims},
 lexicon:{etymologicalEntries:lexical.length,withoutBibliographicReferences:lexicalWithoutBibliography.length,withoutLocalLoci:lexicalWithoutLoci.length},
 alignment:{pairs:alignments.length,notVerifiedWithSource:alignmentsUnverified.length},
 backlog:{missingOriginals,missingTranslations,editionCitationsPending:editorialCitations},
 failures:problems,advisories:alerts,
 publicationPolicy:[
 "No atribuir una lección manuscrita sin testigo, signatura, folio y referencia comprobable.",
 "No llamar variantes ecdóticas a divergencias entre textos digitales sin colación.",
 "No presentar la existencia de un documento o URL como traducción indexada.",
 "No alterar folios, imágenes, documentos originales, visores ni estética.",
 "La calidad académica final requiere revisión externa por especialistas; la CI solo verifica estructura y trazabilidad."
 ]};
mkdirSync(absolute("reports"),{recursive:true});
writeFileSync(absolute("reports/academic-excellence.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({scope:report.scope,provenance:report.provenance,apparatus:report.apparatus,lexicon:report.lexicon,alignment:report.alignment,failures:problems,advisories:alerts},null,2));
if(problems.length)process.exitCode=1;
else console.log("PASS: academic evidence consistent; editorial backlog remains explicit and never counts as verified.");
