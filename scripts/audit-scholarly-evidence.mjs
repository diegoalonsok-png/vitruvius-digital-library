#!/usr/bin/env node
/**
 * Source-status academic audit. Read-only with respect to original editions,
 * folios, manuscripts and transcriptions. Machine checks are NOT peer review.
 */
import {readFileSync,existsSync,mkdirSync,writeFileSync} from "node:fs";
import {dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const load=p=>JSON.parse(readFileSync(resolve(root,p),"utf8"));
const failures=[],advisories=[];
const requireThat=(condition,code,detail)=>{if(!condition)failures.push({code,detail})};
const note=(code,detail)=>advisories.push({code,detail});
const road=load("data/classics-corpus/indexation-roadmap-222.json");
const tr=load("data/classics-corpus/translation-availability-222.json");
const reg=load("data/classics-corpus/search-registry.json");
const coverage=load("data/classics-corpus/coverage-audit.json");
const ed=load("data/ecdotic-decisions.json");
const witness=load("data/bibliotheca-testimonia-verified.json");
const concepts=load("data/lexicon/conceptus.json");
const localIds=new Set(road.items.filter(x=>x.originalIndexed).map(x=>x.id));
const ids=new Set(road.items.map(x=>x.id));
const registryIds=new Set(reg.entries.map(x=>x.workId));
const translatedIds=new Set(road.items.filter(x=>x.translationHosted).map(x=>x.id));
requireThat(Array.isArray(road.items)&&road.items.length===road.targetWorks&&ids.size===road.targetWorks,"catalogue-unique","El catálogo y los IDs únicos no coinciden");
requireThat(road.counts.originalsIndexed===localIds.size&&road.counts.originalsMissing===road.targetWorks-localIds.size,"original-coverage","El inventario de originales no coincide con los registros individuales");
requireThat(reg.count===reg.entries.length&&reg.works===registryIds.size,"registry-count","El registro de versiones no coincide con su resumen");
requireThat(registryIds.size===localIds.size&&[...registryIds].every(id=>localIds.has(id)),"registry-roster","Las obras locales del registro y las obras originales del inventario no coinciden; revisar fichas antes de publicar");
requireThat(road.counts.effectiveOriginalsIndexed===road.counts.originalsIndexed+road.counts.offsiteOriginalsIndexed&&
  road.counts.effectiveOriginalsMissing===road.targetWorks-road.counts.effectiveOriginalsIndexed,
 "offsite-coverage","Los originales externos y locales no coinciden con la cobertura total documentada.");
requireThat(reg.entries.every(x=>ids.has(x.workId)),"orphan-versions","Hay versiones cuyo identificador de obra no está en el catálogo");
requireThat(tr.totals.cataloguedWorks===road.targetWorks&&tr.totals.originalTextIndexed===localIds.size,"translation-audit","Las cifras de traducciones y las de originales discrepan");
requireThat(translatedIds.size===road.counts.worksWithHostedTranslation&&translatedIds.size===tr.totals.translatedWorksLocal,"hosted-translation","El número de obras con traducción alojada es inconsistente");
requireThat(coverage.counts.cataloguedWorks===road.targetWorks&&coverage.counts.indexedTextVersions===reg.count&&coverage.counts.indexedDistinctWorks===reg.works,"historical-coverage","La auditoría publicada no corresponde al registro actual");
requireThat(Array.isArray(ed.decisions),"decision-schema","El registro de decisiones ecdóticas no es una lista");
requireThat(ed.baseline?.extractedNotes===ed.baseline.explicitLocus+ed.baseline.candidateLocus+ed.baseline.unlocated,"note-baseline","La instantánea de notas ecdóticas no cierra");
for(const d of ed.decisions||[]){
 if(d.recordStatus!=="verified_with_source")continue;
 const source=(d.primarySourceUri&&d.institution&&d.shelfmark&&d.folio)||d.secondaryReference;
 requireThat(Boolean(d.locus&&d.baseReading&&d.adoptedReading&&d.responsibleEditor&&d.reviewedOn&&d.justification&&source),
 "ecdotic-evidence","Una decisión se presenta como verificada sin lectura, fuente, editor, fecha y justificación: "+(d.id||"sin ID"));
}
const unverified=ed.decisions.filter(d=>d.recordStatus!=="verified_with_source");
const verified=(ed.decisions||[]).length-unverified.length;
if(verified===0)note("ecdotic-backlog","No existen decisiones de variantes verificadas en este registro; 811 notas extraídas no constituyen 811 colaciones.");
if(road.counts.effectiveOriginalsMissing)note("originals-pending",road.counts.effectiveOriginalsMissing+" registros aún no tienen índice original local ni externo reconocido.");
if(road.counts.worksMissingTranslation)note("translations-pending",road.counts.worksMissingTranslation+" obras carecen de traducción local, no necesariamente de traducción externa.");
const indexedOnly=road.items.filter(x=>x.originalIndexed&&!x.translationHosted).length;
/* Conceptus entries may be regenerated separately. Keep the primary source-status
 * audit independent of an unrelated semantic build; never claim verified NLP. */
const semanticPath="data/classics-corpus/semantic-conceptus-postings.json";
const conceptus={method:"Conceptus: correspondencias editoriales, no embeddings neuronales",
 status:"validación individual de postulaciones semánticas no acreditada por este control"};
note("semantic-review","Los resultados Conceptus necesitan pruebas de cobertura y relevancia separadas.");
const report={
 schema:"vitruvius-scholarly-evidence-v1",generated:new Date().toISOString(),
 purpose:"Integridad verificable de inventarios y grados de evidencia; no certifica calidad filológica ni vinculación con universidades.",
 sourcePaths:["data/classics-corpus/indexation-roadmap-222.json","data/classics-corpus/translation-availability-222.json","data/classics-corpus/search-registry.json","data/classics-corpus/coverage-audit.json","data/ecdotic-decisions.json",semanticPath],
 counts:{cataloguedWorks:road.targetWorks,localOriginalWorks:localIds.size,missingLocalOriginals:road.counts.originalsMissing,hostedTranslationWorks:translatedIds.size,originalOnlyWorks:indexedOnly,effectiveOriginalWorks:road.counts.effectiveOriginalsIndexed,missingEffectiveOriginals:road.counts.effectiveOriginalsMissing,externalOriginalsIndexed:road.counts.offsiteOriginalsIndexed,textVersions:reg.count,registeredWitnesses:witness.records?.length??null,conceptEntries:concepts.concepts?.length??null,ecdoticNotesExtracted:ed.baseline.extractedNotes,notesExplicitLocus:ed.baseline.explicitLocus,notesCandidateLocus:ed.baseline.candidateLocus,notesUnlocated:ed.baseline.unlocated,verifiedTextualDecisions:verified},
 semantic:conceptus,
 sourceReadiness:road.counts.sourceReadinessForMissingOriginals,
 evidentiaryLimits:[
  "La búsqueda Conceptus usa términos del tesauro; no se anuncia como recuperación neuronal ni como equivalencia filológica probada.",
  "Un enlace o manifiesto externo puede ofrecer texto consultable, pero no es texto alojado e indexado localmente.",
  "No atribuir transcripción diplomática, colación de manuscritos ni revisión por pares sin documentos de evidencia.",
  "El estado de lectura y autenticidad de cada pasaje exige verificación humana independiente."
 ],failures,advisories
};
const dest=resolve(root,"reports/scholarly-evidence.json");
mkdirSync(dirname(dest),{recursive:true});
writeFileSync(dest,JSON.stringify(report,null,2)+"\n","utf8");
console.log(JSON.stringify({counts:report.counts,semantic:report.semantic,failures,advisories},null,2));
if(failures.length)process.exitCode=1;
