#!/usr/bin/env node
/* Audit indexed Greek editions against registered edited EN/ES/FR text versions.
   Never translate ancient Greek by silently treating modern Greek as equivalent.
   Generates a discovery inventory, not validated parallel loci or translations. */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from "node:fs";
import {dirname} from "node:path";
const source="data/classics-corpus/search-registry.json";
const destination=process.argv[2]||"data/classics-corpus/greek-translation-coverage.json";
const registry=JSON.parse(readFileSync(source,"utf8"));
const languages=["es","en","fr"];
if(!Array.isArray(registry.entries))throw Error("Registro de búsqueda inválido");
const byWork=new Map();
for(const entry of registry.entries){
 if(!entry.workId||!entry.language||!entry.path)throw Error("Registro incompleto");
 if(!byWork.has(entry.workId))byWork.set(entry.workId,{id:entry.workId,author:entry.author||null,title:entry.title||null,greek:null,translations:{}});
 const work=byWork.get(entry.workId);
 const version={path:entry.path,source:entry.sourceDescription||null};
 if(entry.language==="grc")work.greek=version;
 if(languages.includes(entry.language))work.translations[entry.language]=version;
}
const works=[...byWork.values()].filter(w=>w.greek).sort((a,b)=>a.id.localeCompare(b.id));
const existing=works.filter(w=>Object.keys(w.translations).length).length;
const summary={
 greekWorks:works.length,
 withExistingModernVersion:existing,
 withoutRegisteredModernVersion:works.length-existing,
 registeredByLanguage:Object.fromEntries(["en","es","fr"].map(lang=>[lang,works.filter(w=>w.translations[lang]).length]))
};
const report={
 schema:"vdl-greek-translation-coverage-v1",
 generated:"2026-11-17",
 basis:source,
 method:"Registered local versions only; no existence, locus alignment, translation completeness or licensing audit is implied. Remote R2 OCR and bilingual PDFs are not counted as verified parallel text.",
 summary,
 works:works.map(w=>({...w,status:Object.keys(w.translations).length?"has-registered-translation":"needs-edited-translation",preferredExisting:languages.find(l=>w.translations[l])||null,alignmentVerified:false}))
};
for(const w of works){
 for(const p of [w.greek.path,...Object.values(w.translations).map(t=>t.path)])
  if(!existsSync(p))throw Error("Missing registered text: "+p);
}
mkdirSync(dirname(destination),{recursive:true});
writeFileSync(destination,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(summary,null,2));
