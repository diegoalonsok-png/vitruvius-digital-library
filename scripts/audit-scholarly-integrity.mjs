#!/usr/bin/env node
/* Auditoría documental: control filológico de loci, ediciones, traducciones y notas.
 * La coincidencia de locus no demuestra una colación, identidad de lecturas
 * ni equivalencia semántica entre traducciones. */
import {readFileSync, mkdirSync, writeFileSync} from "node:fs";

const read=path=>JSON.parse(readFileSync(path,"utf8"));
const corpora=[
 ["recensio-es","V514","es"],
 ["recensio-fr","V554","fr"],
 ["theory-en","V297","en"]
];
const locusSyntax=/^(?:[1-9]|10)\.(?:praef|[1-9]\d?)\.(?:[1-9]\d?)(?:[–-][1-9]\d?)?$/i;
const formatLocus=s=>String(s||"").trim().toLowerCase().replace(/^([ivx]+)\./i,m=>m).replace(/\.pr\./g,".praef.");
const report={
 schema:"vitruvius-philological-quality-audit-v1",
 description:"Integridad documental de textos y loci; no es una colación ni una evaluación de calidad de las traducciones.",
 date:new Date().toISOString(),
 editions:[],
 concordance:{},
 notes:{},
 ecdoticDecisions:{},
 errors:[],
 warnings:[]
};
const byEdition=new Map(),passages=new Map();
for(const [id,version,language] of corpora){
 const path="data/structured/"+id+".json";
 const corpus=read(path),seen=new Set();
 if(corpus.edition!==id||corpus.language!==language)
  report.errors.push(path+": metadatos incompatibles");
 if(!corpus.source?.filename||!corpus.source?.sha256)
  report.errors.push(path+": falta identidad y checksum de fuente");
 const rows=Array.isArray(corpus.passages)?corpus.passages:[];
 const edition={id,version,language,source:corpus.source?.filename,
  sourceSha256:corpus.source?.sha256,total:rows.length,latin:0,translations:0,
  invalidLoci:0,duplicateLoci:0};
 for(const p of rows){
  const locus=formatLocus(p.locus);
  if(!locusSyntax.test(locus)){edition.invalidLoci++;report.warnings.push(id+": locus no canónico "+locus);}
  if(seen.has(locus)){edition.duplicateLoci++;report.errors.push(id+": locus duplicado "+locus);}
  seen.add(locus);
  if(String(p.latin||"").trim())edition.latin++;
  else report.errors.push(id+": sin texto latino para "+locus);
  if(String(p.translation||"").trim())edition.translations++;
  if(!passages.has(locus))passages.set(locus,[]);
  passages.get(locus).push({edition:id,latin:String(p.latin||""),translation:String(p.translation||"")});
 }
 byEdition.set(id,seen);report.editions.push(edition);
}
const common=[...passages].filter(([,records])=>records.length===corpora.length);
const latinVariations=common.filter(([,records])=>new Set(records.map(r=>r.latin)).size>1);
report.concordance={
 distinctLoci:passages.size,
 availableInAllThreeEdtions:common.length,
 differingLatinStringsWithinSameLocus:latinVariations.length,
 note:"Las diferencias de cadenas latinas entre ediciones son señales para cotejo editorial; no son variantes manuscritas certificadas."
};
const data=read("data/critical-notes.json"),notes=Array.isArray(data.entries)?data.entries:[];
const grouped={explicit_in_anchor:0,requires_locus_review:0,other:0},missing=[];
let anchorWithoutLocus=0,unmatchedExplicitLoci=0,withSource=0,withText=0;
for(const n of notes){
 if(n.mapping_status in grouped)grouped[n.mapping_status]++;else grouped.other++;
 if(n.source_file&&Number.isInteger(n.source_paragraph))withSource++;
 if(String(n.text||"").trim())withText++;
 const key=formatLocus(n.locus),hasExplicit=n.mapping_status==="explicit_in_anchor";
 if(hasExplicit&&!key)anchorWithoutLocus++;
 if(hasExplicit&&key&&!byEdition.get(n.edition)?.has(key)){unmatchedExplicitLoci++;missing.push({edition:n.edition,footnote_id:n.footnote_id,locus:key});}
 if(hasExplicit&&!n.source_file)report.errors.push("Nota explícita sin fuente DOCX "+String(n.footnote_id));
 if(!hasExplicit&&n.locus&&n.mapping_status==="requires_locus_review")
  report.warnings.push("Nota candidata con locus en campo reservado a cotejados: "+String(n.footnote_id));
}
report.notes={
 total:notes.length,provenanceDocumentAndParagraph:withSource,withText,
 byMappingStatus:grouped,explicitWithoutLocus:anchorWithoutLocus,
 explicitNotFoundInMatchingEdition:unmatchedExplicitLoci,
 unresolvedExamples:missing.slice(0,30),
 editorialNote:"Las notas con locus candidato o ausente son evidencia documental, no aparato adjudicado automáticamente a un párrafo."
};
if(anchorWithoutLocus)report.errors.push("Notas con etiqueta de locus explícito pero sin locus: "+anchorWithoutLocus);
if(unmatchedExplicitLoci)report.warnings.push("Anclajes explícitos sin pasaje en el corpus de su edición: "+unmatchedExplicitLoci);
const reg=read("data/ecdotic-decisions.json"),decisions=Array.isArray(reg.decisions)?reg.decisions:[];
const invalidCertified=decisions.filter(d=>d.recordStatus==="verified_with_source"&&
 !(d.responsibleEditor&&d.reviewedOn&&d.justification&&d.baseReading&&d.adoptedReading&&
  ((d.primarySourceUri&&d.institution&&d.shelfmark&&d.folio)||d.secondaryReference)));
report.ecdoticDecisions={total:decisions.length,certified:decisions.filter(d=>d.recordStatus==="verified_with_source").length,
 invalidCertified:invalidCertified.length};
if(invalidCertified.length)report.errors.push("Decisiones ecdóticas certificadas sin evidencia obligatoria: "+invalidCertified.length);
mkdirSync("reports",{recursive:true});
writeFileSync("reports/scholarly-integrity.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({editions:report.editions.map(x=>({edition:x.version,passages:x.total,translationCoverage:x.translations,duplicateLoci:x.duplicateLoci})),concordance:report.concordance,notes:report.notes,ecdotics:report.ecdoticDecisions,errors:report.errors,warnings:report.warnings.slice(0,12)},null,2));
if(report.errors.length)process.exitCode=1;
