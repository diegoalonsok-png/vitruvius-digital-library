/* Academic integrity gate. Tests metadata assertions, not manuscript truth.
   Never edits manuscripts, transcriptions, editions, translations or locus alignments.
   Run: node scripts/audit-academic-readiness.mjs */
import assert from "node:assert/strict";
import {readFileSync,existsSync,mkdirSync,writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const load=p=>JSON.parse(readFileSync(resolve(root,p),"utf8"));
const catalog=load("data/classics-corpus/coverage-audit.json");
const align=load("data/classics-alignment/manifest.json");
const latin=load("data/structured/latin-collation-audit.json");
const etym=load("data/lexicon/etymologicum.json");
const problems=[],advisories=[];
const fail=(id,description)=>problems.push({id,description});
const advise=(id,description)=>advisories.push({id,description});
const counts=catalog.counts;
assert(counts&&Array.isArray(catalog.works),"Coverage report structure missing");
const statuses=counts.catalogueStatuses||{};
if(Object.values(statuses).reduce((a,b)=>a+b,0)!==counts.cataloguedWorks)fail("catalogue-count","The catalogue status categories do not add up to the catalogued work count");
if(catalog.works.length!==counts.cataloguedWorks)fail("catalogue-records","Coverage records do not match reported catalogue works");
if(counts.indexedDistinctWorks>counts.cataloguedWorks)fail("corpus-count","Indexable works cannot exceed catalogued works");
if(!Array.isArray(align.pairs)||align.count!==align.pairs.length)fail("alignment-count","Alignment manifest count is stale");
const noShared=[];
for(const p of align.pairs){
 if(!p.workId||!["la","grc"].includes(p.original)||!["en","es","fr","de","it","pt"].includes(p.translation))fail("invalid-language","Invalid original or translation language in aligned pair");
 if(!Number.isInteger(p.sharedLoci)||p.sharedLoci<0||p.sharedLoci>Math.min(p.originalPassages,p.translationPassages))fail("invalid-overlap","Impossible count of shared loci for "+p.workId);
 if(p.status==="verified"||p.status==="semantic-aligned"||p.status==="philologically-verified")fail("unsupported-verification","Unsubstantiated verified status for "+p.workId);
 if(p.sharedLoci===0){noShared.push({workId:p.workId,languages:p.original+"-"+p.translation});if(p.status==="verified")fail("zero-shared-verified","A pair without shared loci cannot be marked verified");}
 if(typeof p.path!=="string"||!p.path.startsWith("data/classics-alignment/")||!existsSync(resolve(root,p.path)))fail("missing-pair-file","Missing aligned-pair source "+String(p.path));
}
if(noShared.length)advise("no-shared-loci",noShared.length+" language pairs lack shared passage identifiers; retain full independent reading, do not infer missing texts");
assert(Array.isArray(etym.entries),"Etymology entries missing");
const seen=new Set(),missingRefs=[],missingLoci=[],citationNeedsDetail=[];
for(const e of etym.entries){
 if(!e.id||seen.has(e.id))fail("duplicate-etymology-id","Missing or repeated etymological entry identifier "+e.id);
 seen.add(e.id);
 if(!["la","grc"].includes(e.l))fail("unsupported-etymology-language","Unsupported source language on "+e.id);
 if(!Array.isArray(e.refs)||e.refs.length===0)missingRefs.push(e.lemma);
 if(!Array.isArray(e.loci)||e.loci.length===0)missingLoci.push(e.lemma);
 if(e.refs?.every(x=>!/\b(?:p\.|pp\.|s\.v\.|vol\.|col\.|§)\b|s\.v\./i.test(x)))citationNeedsDetail.push(e.lemma);
}
if(missingRefs.length)fail("missing-bibliography","Etymological entries without bibliographic source: "+missingRefs.slice(0,15).join(", "));
if(missingLoci.length)advise("uncited-loci",missingLoci.length+" etymological entries lack local cited passages; do not state these are independently attested here");
if(citationNeedsDetail.length)advise("citation-resolution",citationNeedsDetail.length+" entries need specific bibliographic resolution");
const s=latin.summary||{};
if(!Number.isInteger(s.totalReferenceLoci)||s.totalReferenceLoci<=0)fail("latin-review-missing","Latin collation scope undefined");
if(!Array.isArray(latin.latinDiscrepancies))fail("latin-discrepancy-list","No Latin discrepancy list");
if(s.alert>0)advise("latin-collation-alerts",s.alert+" heuristic Latin discrepancy alerts require editorial examination; they are not proven textual mistakes");
const report={
 schema:"vitruvia-academic-readiness-v1",generated:"CI execution",scope:"Catalogue metadata, etymological references, location overlap and automated Latin collation. No human verification of manuscript readings.",
 counts:{cataloguedWorks:counts.cataloguedWorks,indexedDistinctWorks:counts.indexedDistinctWorks,indexedTextVersions:counts.indexedTextVersions,manuscriptWitnesses:counts.manuscriptWitnesses,lexiconEntries:etym.entries.length,etymologicalEntriesWithoutLocalLoci:missingLoci.length,alignmentPairs:align.pairs.length,pairsWithoutSharedLoci:noShared.length,latinLoci:s.totalReferenceLoci,latinAlerts:s.alert},
 failures:problems,editorialBacklog:advisories,unalignedPairs:noShared,
 rules:["Original texts, editions and translations remain unchanged.","An identical locus identifier does not establish semantic or textual equivalence.","A lexical or etymological tree does not establish historical descent without source-based phonological evidence.","Machine-reported discrepancies must not be labelled manuscript errors without specialist collation."]
};
const path=resolve(root,"reports/academic-readiness.json");
mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if(problems.length){console.error("FAIL: academic metadata integrity violations");process.exitCode=1}
else console.log("PASS: academic metadata structurally consistent; editorial backlog is still explicit and not certified.");
