/* Vitruvia academic corpus integrity audit. Node 20+, standard library only.
 Usage: node scripts/audit-classics-integrity.cjs --out data/audits/integrity.json
 Structural testing does NOT substitute comparison against manuscripts.
*/
"use strict";
const fs=require("node:fs"),path=require("node:path"),ROOT=path.resolve(__dirname,"..");
const args=process.argv.slice(2),issue=[];
function get(rel){
 if(typeof rel!=="string"||!rel||rel.startsWith("/")||rel.includes("..")||rel.includes("\\"))throw Error("Invalid local path "+rel);
 const file=path.resolve(ROOT,rel.split("?")[0]);
 if(!file.startsWith(ROOT+path.sep))throw Error("Out of repo "+rel);
 return file;
}
const read=rel=>JSON.parse(fs.readFileSync(get(rel),"utf8"));
const flag=(level,code,work,detail)=>issue.push({level,code,work:work||null,detail});
const catalog=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json");
const registry=read("data/classics-corpus/search-registry.json");
const manuscript=read("data/bibliotheca-testimonia-verified.json");
const provenance=read("data/perseus-provenance-audit.json");
const corrigenda=read("data/classics-corpus/philological-corrigenda.json");
const works=catalog.works||[],editions=registry.entries||[],witnesses=manuscript.records||[];
const idSet=new Set(),pairSet=new Set(),registered=new Set(),witnessWorks=new Set();
for(const w of works){
 if(!w.id||idSet.has(w.id))flag("error","duplicate-work",w.id,"Duplicate or empty ID");
 idSet.add(w.id);
 if(!["la","grc"].includes(w.language))flag("review","original-language",w.id,w.language);
 if(!w.title||!w.author||!w.dating)flag("review","metadata",w.id,"Author/title/date incomplete");
 if(w.language==="grc"&&!/[\u0370-\u03ff\u1f00-\u1fff]/u.test(w.title))flag("review","original-title",w.id,"Greek title not verified");
 if(!w.bibliography?.editionCitation&&!w.bibliography?.originalEditionCitation&&!w.bibliography?.translationCitation)flag("review","chicago-edition",w.id,"No complete concrete-edition citation");
}
let scanned=0,passages=0,duplicateLoci=0,generatedLoci=0,nonJson=0,failedFiles=0;
for(const e of editions){
 const id=e.workId||"";
 if(!idSet.has(id))flag("error","unregistered-work",id,e.path);
 registered.add(id);pairSet.add(id+"|"+e.language);
 let file;try{file=get(e.path)}catch(err){flag("error","invalid-path",id,err.message);continue}
 if(!fs.existsSync(file)){failedFiles++;flag("error","missing-file",id,e.path);continue}
 if(!["json-passages","structured-bilingual"].includes(e.format)){nonJson++;flag("review","non-json-format",id,e.format);continue}
 let data;try{data=JSON.parse(fs.readFileSync(file,"utf8"))}catch(err){failedFiles++;flag("error","json-parse",id,e.path+": "+err.message);continue}
 scanned++;
 if(e.format==="structured-bilingual")continue;
 if(data.workId!==(e.sourceWorkId||id)||data.language!==e.language)flag("error","work-or-language-mismatch",id,e.path);
 if(!data.source&&!data.attribution)flag("review","missing-source",id,e.path);
 if(!data.license)flag("review","missing-license",id,e.path);
 if(!Array.isArray(data.passages)){flag("error","passages-array",id,e.path);continue}
 const locSet=new Set();let sus=0;
 for(const p of data.passages){
  passages++;const locus=String(p?.locus||"");
  if(!locus||typeof p?.text!=="string"||!p.text.trim()){flag("error","empty-locus-or-text",id,locus);continue}
  if(locSet.has(locus)){duplicateLoci++;flag("review","repeated-locus",id,locus)}
  locSet.add(locus);
  if(p.locusKind?.includes("generated"))generatedLoci++;
  if(/[\uFFFD\u0000]/u.test(p.text))flag("error","invalid-character",id,locus);
  if(sus<4){const m=p.text.match(/\b(?:Oapiunt|nenias|[a-z]{4,}\d+|ueHern)\b/iu);
   if(m){flag("review","possible-ocr",id,locus+": "+m[0]);sus++}
  }
 }
}
for(const w of works){
 if(!registered.has(w.id))flag("review","not-indexed",w.id,"No local text in registry");
 else if(!pairSet.has(w.id+"|"+w.language))flag("review","no-original",w.id,"Original in catalogue language missing");
}
const msIDs=new Set();
for(const ms of witnesses){
 if(!ms.id||msIDs.has(ms.id))flag("error","duplicate-manuscript",ms.id,"Invalid ID");
 msIDs.add(ms.id);
 if(!ms.shelfmark||!ms.library||!ms.date||!ms.coverage||!ms.verification)flag("review","incomplete-witness",ms.id,"Missing library/signature/dating/coverage/verification");
 if(!ms.record&&!ms.verificationUrl)flag("review","missing-catalog-record",ms.id,"No institutional catalogue link");
 if(!ms.viewer&&!ms.manifest)flag("review","unavailable-facsimile",ms.id,"Catalogue may still exist");
 for(const id of ms.workIds||[]){witnessWorks.add(id);if(!idSet.has(id))flag("error","orphan-witness",id,ms.id)}
}
for(const id of idSet)if(!witnessWorks.has(id))flag("review","manuscript-unverified",id,"Institutional manuscript reference still required");
for(const correction of corrigenda.corrections||[]){
 const ed=editions.find(e=>e.workId===correction.workId&&e.language===correction.language&&e.format==="json-passages");
 if(!ed)continue;
 const x=read(ed.path),p=x.passages.find(x=>x.locus===correction.locus);
 if(!p?.text.includes(correction.correctedReading))flag("error","correction-not-propagated",correction.workId,correction.locus);
}
const stats={
 workRecords:works.length,registeredVersions:editions.length,registeredWorks:registered.size,
 originalVersions:[...pairSet].filter(s=>s.endsWith("|la")||s.endsWith("|grc")).length,
 unindexedWorks:works.length-registered.size,witnessRecords:witnesses.length,
 worksWithWitness:witnessWorks.size,iiifManifests:witnesses.filter(x=>x.manifest).length,
 worksWithBibliographicMetadata:works.filter(x=>x.bibliography).length,
 candidatePHITLG:(provenance.records||[]).filter(x=>x.candidateWorkCodes?.length).length,
 verifiedEditionCTS:(provenance.records||[]).filter(x=>x.ctsEditionUrn).length,
 jsonVersionsInspected:scanned,nonJsonFormats:nonJson,missingOrBrokenFiles:failedFiles,
 passagesExaminedStructurally:passages,repeatedLoci:duplicateLoci,generatedSegmentLoci:generatedLoci,
 errors:issue.filter(x=>x.level==="error").length,reviewItems:issue.filter(x=>x.level==="review").length
};
const report={schema:"vitruvia-classics-integrity-audit-v1",generatedAt:new Date().toISOString(),
 scope:"Local structure, provenance, catalogue; NOT manuscript-level textual collation",stats,issues:issue};
const where=args.indexOf("--out");
if(where>=0&&args[where+1]){const out=get(args[where+1]);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n")}
console.log(JSON.stringify(stats,null,2));
for(const x of issue.slice(0,25))console.log(x.level+" "+x.code+" "+x.work+": "+x.detail);
if(args.includes("--strict")&&stats.errors)process.exitCode=1;
