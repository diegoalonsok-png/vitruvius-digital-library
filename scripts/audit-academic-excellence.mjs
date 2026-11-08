#!/usr/bin/env node
/**
 * Evidencia académica reproducible: control de metadatos, NO revisión por pares.
 * El script es de solo lectura respecto de las fuentes editoriales y facsímiles.
 * Ejecutar: node scripts/audit-academic-excellence.mjs
 */
import {readFileSync,existsSync,statSync,mkdirSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const json=path=>JSON.parse(readFileSync(resolve(ROOT,path),"utf8"));
const fail=[],warnings=[];
const violation=(code,message)=>fail.push({code,message});
const pending=(code,message)=>warnings.push({code,message});
const unique=arr=>new Set(arr);
const catalog=json("data/bibliotheca-graeca-latina-I-bce-I-ce.json");
const registry=json("data/classics-corpus/search-registry.json");
const coverage=json("data/classics-corpus/coverage-audit.json");
const translations=json("data/classics-corpus/translation-availability-222.json");
const notes=json("data/critical-notes.json");
const decisions=json("data/ecdotic-decisions.json");
const witnesses=json("data/bibliotheca-testimonia-verified.json");
const docx=json("data/classics-documents/manifest.json");

if(!Array.isArray(catalog.works))throw Error("Catálogo sin lista de obras");
if(!Array.isArray(registry.entries))throw Error("Registro de búsqueda sin entradas");
if(!Array.isArray(notes.entries))throw Error("Aparato sin lista de notas");
if(!Array.isArray(decisions.decisions))throw Error("Registro ecdótico sin decisiones");
if(!Array.isArray(witnesses.records)||!Array.isArray(witnesses.editions))throw Error("Testimonios o ediciones inválidos");
if(!Array.isArray(docx.records))throw Error("Manifiesto de DOCX sin registros");
const works=new Map();
for(const w of catalog.works){
 if(!w.id||works.has(w.id))violation("catalog-id","Obra sin ID o repetida: "+String(w.id));
 else works.set(w.id,w);
 if(!w.title||!w.author)pending("catalog-description","Descripción bibliográfica incompleta: "+w.id);
}
const searchable=new Set(),versionKeys=new Set(),formats={};
let noSourceDescription=0;
for(const e of registry.entries){
 const key=[e.workId,e.language,e.edition||"",e.path].join("|");
 if(versionKeys.has(key))violation("duplicate-edition","Versión indexada repetida: "+key);
 versionKeys.add(key);
 if(!works.has(e.workId))violation("orphan-search","Edición indexada sin obra catalogada: "+e.workId);
 else searchable.add(e.workId);
 if(!/^(?:data|corpus)\/[a-zA-Z0-9_./-]+\.(?:json|html)$/.test(e.path||"")||
    (e.path||"").split("/").includes(".."))violation("unsafe-path","Ruta insegura en registro: "+e.path);
 else if(!existsSync(resolve(ROOT,e.path)))violation("missing-text","Falta el original indexado: "+e.path);
 else if(statSync(resolve(ROOT,e.path)).size<128)violation("empty-text","Archivo de índice anormalmente pequeño: "+e.path);
 if(!e.sourceDescription)noSourceDescription++;
 formats[e.format||"unknown"]=(formats[e.format||"unknown"]||0)+1;
}
if(registry.entries.length!==registry.count)violation("registry-count","Recuento de versiones del registro incoherente");
if(coverage.counts.indexedDistinctWorks!==searchable.size)violation("coverage-count","Cobertura de obras desfasada respecto del registro");
if(coverage.counts.cataloguedWorks!==works.size)violation("catalogue-count","Cobertura y catálogo discrepan");
if(translations.totals.cataloguedWorks!==works.size)violation("translation-catalogue-count","Traducciones referidas a otro tamaño de catálogo");
if(translations.totals.locallyIndexedWorks!==searchable.size)violation("translation-coverage-count","Recuento de indexación y traducciones incoherente");
const translationsWithHosted=translations.works.filter(w=>Array.isArray(w.translationLanguages)&&w.translationLanguages.length>0).length;
if(translationsWithHosted!==translations.totals.translatedWorksLocal)violation("translation-count","Traducciones locales declaradas sin respaldo en registros por obra");
const missingTexts=works.size-searchable.size;
if(missingTexts)pending("unindexed-works",missingTexts+" obras catalogadas carecen de texto indexado en el registro principal");
const missingTranslations=works.size-translationsWithHosted;
if(missingTranslations)pending("unhosted-translations",missingTranslations+" obras carecen de una traducción alojada y acreditada en el registro");
if(noSourceDescription)pending("edition-source-description",noSourceDescription+" versiones carecen de descripción de fuente en el registro; examinar JSON de origen antes de atribuir edición");

let manuscriptNoRecord=0,manuscriptNoDate=0,manuscriptNoRights=0;
const witnessIds=new Set();
for(const ms of witnesses.records){
 if(!ms.id||witnessIds.has(ms.id))violation("witness-id","Identificador de testimonio manuscrito repetido");witnessIds.add(ms.id);
 if(!ms.library||!ms.shelfmark)violation("witness-shelfmark","Falta repositorio o signatura: "+ms.id);
 if(!ms.date||!Number.isFinite(ms.dateStart)){manuscriptNoDate++;violation("witness-dating","Datación insuficiente: "+ms.id)}
 if(!ms.record)manuscriptNoRecord++;
 if(!ms.rights)manuscriptNoRights++;
 if(!ms.verification)pending("witness-verification","Procedencia institucional no documentada: "+ms.id);
 for(const id of ms.workIds||[])if(!works.has(id))violation("witness-work","Testimonio referido a obra no catalogada: "+ms.id+" / "+id);
}
if(manuscriptNoRecord)pending("witness-official-record",manuscriptNoRecord+" testimonios sin enlace de registro institucional; verificar antes de certificar");
if(manuscriptNoRights)pending("witness-rights",manuscriptNoRights+" testimonios sin campo de derechos");
for(const ed of witnesses.editions)if(!works.has(ed.workId))violation("edition-work","Edición referida a obra no catalogada: "+ed.workId);

const noteStatus={},explicit=[];
for(const n of notes.entries){
 const status=n.mapping_status||"undefined";
 noteStatus[status]=(noteStatus[status]||0)+1;
 if(status==="explicit_in_anchor"){
  explicit.push(n);
  if(!n.locus||!n.source_file||!Number.isInteger(n.source_paragraph))
   violation("explicit-note-provenance","Nota marcada con locus explícito sin trazabilidad completa: "+n.edition+" #"+n.footnote_id);
 }else if(status!=="requires_locus_review"){
  pending("note-classification","Nota con clasificación fuera de la política: "+n.edition+" #"+n.footnote_id);
 }
}
const unresolvedNotes=notes.entries.length-explicit.length;
if(unresolvedNotes)pending("unmapped-notes",unresolvedNotes+" notas del autor deben conservarse sin atribución a un locus hasta cotejar ancla y fuente");
let verifiedDecisions=0;
for(const d of decisions.decisions){
 if(!d.id||!d.edition||!d.locus||!d.recordStatus)violation("ecdotic-minimum","Decisión editorial incompleta: "+(d.id||"sin ID"));
 if(d.recordStatus==="verified_with_source"){
  verifiedDecisions++;
  if(!d.primarySourceUri&&!d.secondaryReference)
   violation("ecdotic-source","Decisión verificada sin fuente: "+d.id);
  if(!d.baseReading||!d.adoptedReading||!d.justification||!d.responsibleEditor||!d.reviewedOn)
   violation("ecdotic-rationale","Decisión verificada sin lecturas o justificación: "+d.id);
 }
}
if(!verifiedDecisions)pending("ecdotic-decisions","El registro no contiene decisiones de lectura comprobadas con fuente; no certificar variantes por inferencia");

let docxParagraphs=0;
const docSeen=new Set();
for(const d of docx.records){
 if(docSeen.has(d.id))violation("docx-duplicate","Documento duplicado: "+d.id);docSeen.add(d.id);
 if(!d.index||!d.source||!existsSync(resolve(ROOT,d.index))||!existsSync(resolve(ROOT,d.source)))
  violation("docx-missing","Falta fuente original o índice: "+d.id);
 if(!/^[a-f0-9]{64}$/i.test(d.sha256||""))violation("docx-fingerprint","No consta SHA-256 para fuente DOCX: "+d.id);
 docxParagraphs+=Number(d.paragraphs)||0;
}
if(docx.records.length!==docx.count)violation("docx-count","Recuento del manifiesto DOCX incoherente");
const cff=readFileSync(resolve(ROOT,"CITATION.cff"),"utf8");
if(!/doi:\s*["']?10\.\d{4,9}\//.test(cff))pending("citation-doi","No se detecta DOI formal en CITATION.cff");
if(/license:\s*NOASSERTION/.test(cff))pending("rights-matrix","CITATION.cff señala licencia no unificada; publicar derechos por obra/edición/testimonio, sin inventar permisos");
const report={
 schema:"vitruvius-academic-evidence-gate-v1",
 generated:new Date().toISOString(),
 method:"Auditoría automatizada de coherencia editorial y trazabilidad documental sobre archivos locales. No realiza colación autóptica, OCR, revisión por pares, verificación de URLs externas ni certificación de traducciones.",
 counts:{
  cataloguedWorks:works.size,indexedWorks:searchable.size,versions:registry.entries.length,
  pendingIndexation:missingTexts,worksWithHostedTranslations:translationsWithHosted,worksWithoutHostedTranslation:missingTranslations,
  notes:notes.entries.length,notesWithExplicitLocus:explicit.length,notesUnlocatedOrPending:unresolvedNotes,
  notesByStatus:noteStatus,registeredManuscriptWitnesses:witnesses.records.length,
  manuscriptRecordsWithoutOfficialLink:manuscriptNoRecord,registeredEditions:witnesses.editions.length,
  verifiedEcdoticDecisions:verifiedDecisions,extractedDocx:docx.records.length,
  extractedDocxParagraphs:docxParagraphs,versionFormats:formats
 },
 checks:{failures:fail.length,advisories:warnings.length},
 failures:fail,
 editorialBacklog:warnings,
 publicationRule:"Una etiqueta de fuente verificable y un locus compartido no equivalen a lectura manuscrita cotejada. Los resultados de búsqueda y sus estadísticas nunca deben presentarse como revisión por pares.",
 protectionRule:"Ningún facsímil de Vitruvio, folio, DOCX, PDF, texto original, traducción ni interfaz se altera por este control.",
 academicGrade:"No calculado: los recuentos automáticos no permiten asignar una nota universitaria ni demostrar aceptación académica externa."
};
const reportPath=resolve(ROOT,"reports/academic-evidence-gate.json");
mkdirSync(dirname(reportPath),{recursive:true});
writeFileSync(reportPath,JSON.stringify(report,null,2)+"\n","utf8");
console.log(JSON.stringify({counts:report.counts,checks:report.checks,failures:fail.slice(0,15),editorialBacklog:warnings.slice(0,16),report:"reports/academic-evidence-gate.json"},null,2));
if(fail.length){console.error("FAIL: incoherencias documentales bloqueantes");process.exitCode=1}
else console.log("PASS: integridad de metadatos académicos; la evaluación humana y la colación siguen pendientes.");
