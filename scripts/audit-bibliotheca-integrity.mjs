#!/usr/bin/env node
/**
 * Bibliotheca integrity and cataloguing audit: local texts + R2 declarations.
 * No network is required. A passing check means structural integrity, NOT
 * philological completeness or live availability of remote resources.
 * Run from the repository root: node scripts/audit-bibliotheca-integrity.mjs
 */
import fs from "node:fs";
import path from "node:path";
const load=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const registry=load("data/classics-corpus/search-registry.json");
const roadmap=load("data/classics-corpus/indexation-roadmap-222.json");
const r2=load("data/r2/catalogo-clasicos-r2.json");
const knownWorks=new Set(roadmap.items.map(w=>w.id));
const issues=[],notes=[],checked=[];
const issue=(level,code,detail)=>issues.push({level,code,...detail});
if(knownWorks.size!==roadmap.items.length)issue("error","duplicate-canonical-work-id",{});
if(roadmap.targetWorks!==roadmap.items.length)issue("error","roadmap-total-mismatch",{declared:roadmap.targetWorks,actual:roadmap.items.length});
const srcIds=new Set();
for(const entry of registry.entries||[]){
 const identity=entry.workId+"|"+entry.language+"|"+entry.format+"|"+entry.path;
 if(srcIds.has(identity))issue("error","duplicate-registry-record",{identity});
 srcIds.add(identity);
 if(!knownWorks.has(entry.workId))issue("error","orphan-registry-work",{identity});
 if(!entry.title||!entry.language||!entry.path||!entry.format)issue("error","missing-registry-fields",{identity});
 const local=entry.path.startsWith("data/")||entry.path.startsWith("corpus/");
 if(!local){
  if(!/^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/[a-z0-9_.-]+\.json$/.test(entry.path))
   issue("warning","unusual-remote-url",{identity,url:entry.path});
  continue;
 }
 const safe=path.posix.normalize(entry.path);
 if(safe!==entry.path||safe.startsWith("../")){issue("error","unsafe-local-path",{identity});continue}
 if(!fs.existsSync(entry.path)){issue("error","missing-local-source",{identity});continue}
 if(entry.format==="html-text"){
  const html=fs.readFileSync(entry.path,"utf8");
  if(!/<(?:main|article|section|p)\b/i.test(html))issue("warning","unusual-html-text-structure",{identity});
  if(!html.includes("classics-html-unified.js"))issue("warning","html-reader-layout-not-unified",{identity});
  checked.push({workId:entry.workId,language:entry.language,format:entry.format,path:entry.path,bytes:Buffer.byteLength(html)});
  continue;
 }
 if(entry.format==="historical-ocr-pages"){
  checked.push({workId:entry.workId,language:entry.language,format:entry.format,path:entry.path,bytes:fs.statSync(entry.path).size,scope:"OCR; not independently transcribed"});
  continue;
 }
 let record;
 try{record=load(entry.path)}catch(e){issue("error","invalid-local-json",{identity,error:String(e)});continue}
 const passages=record.passages;
 if(!Array.isArray(passages)||!passages.length){
  issue("error","missing-passages",{identity});continue;
 }
 if(record.workId&&record.workId!==entry.workId)issue("error","source-work-mismatch",{identity,sourceWork:record.workId});
 if(record.language&&record.language!==entry.language){
  // One shared bilingual Vitruvius JSON intentionally represents both languages.
  const allowed=entry.workId==="vitruvius"&&entry.path==="data/structured/recensio-es.json"&&["es","la"].includes(entry.language);
  if(!allowed)issue("warning","source-language-mismatch",{identity,sourceLanguage:record.language});
 }
 const seen=new Set();let empty=0,duplicate=0,missingLocus=0;
 for(const passage of passages){
  if(!passage.locus){missingLocus++;continue}
  if(seen.has(passage.locus))duplicate++;
  seen.add(passage.locus);
  const content=entry.language==="es"||entry.language==="en"||entry.language==="fr"
   ?(passage.translation||passage.text||passage.latin||""):(passage.text||passage.latin||"");
  if(typeof content!=="string"||!content.trim())empty++;
 }
 if(missingLocus)issue("error","passages-without-locus",{identity,count:missingLocus});
 if(duplicate)issue("error","duplicate-passage-loci",{identity,count:duplicate});
 if(empty)issue("warning","empty-passage-content",{identity,count:empty});
 if(entry.passages&&entry.passages!==passages.length)issue("warning","passage-count-disagrees",{identity,expected:entry.passages,actual:passages.length});
 checked.push({workId:entry.workId,language:entry.language,format:entry.format,path:entry.path,passages:passages.length,empty,duplicates:duplicate,bytes:fs.statSync(entry.path).size});
}
const pdfs=new Map();
for(const p of r2.items||[]){
 if(!p.id||!p.pdf)issue("error","incomplete-r2-catalog-record",{id:p.id});
 if(p.sha256){
  if(!pdfs.has(p.sha256))pdfs.set(p.sha256,[]);
  pdfs.get(p.sha256).push({id:p.id,title:p.tituloEdicion,source:p.fuente});
 }
 if(/\bonly\b|únicamente|tomo ii\b|volumen xiv/i.test([p.tituloEdicion,p.notaFilologica].join(" ").toLowerCase()))
  notes.push({code:"partial-or-volume-specific-facsimile",id:p.id,title:p.tituloEdicion,note:p.notaFilologica||null});
}
for(const [sha,group] of pdfs)if(group.length>1)
 notes.push({code:"shared-identical-pdf-sha",sha,records:group});
const report={
 schema:"vdl-bibliotheca-integrity-audit-v1",
 generated:new Date().toISOString(),
 disclaimer:"Local file parsing, structure and declared catalog metadata only. Not a full scholarly collation; remote R2 files are not downloaded, hashed or content-verified here. Passage counts do not prove completeness of a classical work.",
 summary:{
  cataloguedPrincipal:roadmap.items.length,
  cataloguedAdditional:10,
  registeredTextVersions:registry.entries.length,
  registeredWorks:registry.works,
  locallyChecked:checked.length,
  remoteDeclared:registry.entries.filter(x=>x.path.startsWith("https://")).length,
  localOriginalsDeclared:roadmap.counts.originalsIndexed,
  offsiteOriginalsDeclared:roadmap.counts.offsiteOriginalsIndexed,
  effectiveOriginalsDeclared:roadmap.counts.effectiveOriginalsIndexed,
  registeredOriginalCoverage:roadmap.counts.registeredProjectOriginalWorks,
  pendingEffectiveOriginals:roadmap.counts.effectiveOriginalsMissing,
  r2PdfEditions:r2.items.length,
  sharedIdenticalPdfGroups:[...pdfs.values()].filter(g=>g.length>1).length,
  structuralErrors:issues.filter(x=>x.level==="error").length,
  warnings:issues.filter(x=>x.level==="warning").length
 },
 issues,notes,checked
};
const out=process.argv[2]||"/tmp/vdl-bibliotheca-integrity-audit.json";
fs.writeFileSync(out,JSON.stringify(report,null,2)+"\n");
console.log("Bibliotheca:",JSON.stringify(report.summary,null,2));
console.log("Report:",out);
if(report.summary.structuralErrors){console.error("Structural errors:",report.issues.filter(x=>x.level==="error").slice(0,20));process.exitCode=1}
