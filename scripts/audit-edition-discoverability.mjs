#!/usr/bin/env node
/* Academic discoverability: verify edition landing-page metadata and PDF files.
 * Scholar's 5 MiB threshold is reported, not misrepresented as proof of exclusion.
 */
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"..");
const base="https://diegoalonsok-png.github.io/vitruvius-digital-library/";
const editions=[
 ["V514","documents/edicion-v514.html","documents/kurilo-recensio-es.pdf","10.5281/zenodo.23884757","es"],
 ["V554","documents/edicion-v554.html","documents/kurilo-recensio-fr.pdf","10.5281/zenodo.23885110","fr"],
 ["V297","documents/edicion-v297.html","documents/kurilo-theory-en.pdf","10.5281/zenodo.23885404","en"]
];
const errors=[],rows=[];
for(const [version,html,pdf,doi,lang] of editions){
 const hp=path.join(root,html),pp=path.join(root,pdf);
 if(!fs.existsSync(hp)||!fs.existsSync(pp)){errors.push(version+": missing HTML or PDF");continue}
 const content=fs.readFileSync(hp,"utf8"),size=fs.statSync(pp).size;
 const expectedCanonical=base+html,expectedPDF=base+pdf;
 const checks={
  canonical:content.includes('<link rel="canonical" href="'+expectedCanonical+'">'),
  citationTitle:/<meta name="citation_title" content="[^"]+"/.test(content),
  citationAuthor:/<meta name="citation_author" content="[^"]+"/.test(content),
  citationYear:content.includes('<meta name="citation_publication_date" content="2026">'),
  doi:content.includes('<meta name="citation_doi" content="'+doi+'">'),
  pdf:content.includes('<meta name="citation_pdf_url" content="'+expectedPDF+'">'),
  language:content.includes('<meta name="citation_language" content="'+lang+'">'),
  abstract:/<h2>(?:Resumen \/ Abstract|Résumé|Abstract)<\/h2>/.test(content),
  pdfLinked:content.includes('href="'+path.basename(pdf)+'"')
 };
 for(const [key,value] of Object.entries(checks))if(!value)errors.push(version+": "+key+" missing/incorrect");
 rows.push({version,html,pdf,doi,bytes:size,MiB:Math.round(size/1048576*100)/100,overScholarFiveMiB:size>5*1048576,checks});
}
const result={checkedAt:new Date().toISOString(),scope:"edition discovery metadata and PDF availability in repository; no live search ranking tests",scholarPolicy:"https://scholar.google.com/intl/en-US/scholar/inclusion.html",rows,errors};
const args=process.argv.slice(2);
if(args.includes("--json"))process.stdout.write(JSON.stringify(result,null,2)+"\n");
else{
 for(const row of rows)console.log(row.version+": "+row.MiB+" MiB; metadata "+(Object.values(row.checks).every(Boolean)?"OK":"FAIL")+(row.overScholarFiveMiB?"; PDF above Scholar 5 MiB guidance":""));
 console.log("Failures:",errors.length);
}
if(errors.length)process.exitCode=1;
