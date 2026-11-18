#!/usr/bin/env node
/* Bibliotheca Greek translation coverage. Only references actually declared
   in search-registry.json count. No machine translation masquerades as edition. */
import {readFileSync,writeFileSync,existsSync} from "node:fs";
const registryFile="data/classics-corpus/search-registry.json";
const reportFile="data/classics-corpus/greek-translation-coverage.json";
const importedIds=["plato-euthyphro","plato-statesman","plato-ion","plato-menexenus","plato-laches","plato-charmides","plato-lysis","plato-euthydemus","plato-hippias-minor","plato-philebus","euripides-andromache","euripides-heracleidae","euripides-heracles","aristophanes-aves","aeschylus-oresteia","isocrates-aegineticus","isocrates-busiris","isocrates-callimachus","isocrates-euthynus","isocrates-helen","isocrates-lochites","isocrates-plataicus","isocrates-sophists","isocrates-team-horses","isocrates-trapeziticus"];
const registry=JSON.parse(readFileSync(registryFile,"utf8"));
const by=new Map(),seen=new Set();
for(const entry of registry.entries||[]){
 const key=entry.workId+"|"+entry.language;
 if(!entry.workId||!entry.path||!entry.language||seen.has(key))throw Error("Registro duplicado/inválido: "+key);
 seen.add(key);
 if(!by.has(entry.workId))by.set(entry.workId,{id:entry.workId,author:entry.author||null,title:entry.title||null,greek:null,translations:{}});
 const w=by.get(entry.workId),v={path:entry.path,source:entry.sourceDescription||null};
 if(entry.language==="grc")w.greek=v;
 if(["en","es","fr"].includes(entry.language))w.translations[entry.language]=v;
}
const greek=[...by.values()].filter(w=>w.greek).sort((a,b)=>a.id.localeCompare(b.id));
const withModern=greek.filter(w=>Object.keys(w.translations).length).length;
const summary={
 greekWorks:greek.length,
 withRegisteredModernVersion:withModern,
 withoutRegisteredModernVersion:greek.length-withModern,
 byLanguage:Object.fromEntries(["en","es","fr"].map(l=>[l,greek.filter(w=>w.translations[l]).length])),
 newHistoricalEnglishEditions:importedIds.length
};
const out={
 schema:"vdl-greek-translation-coverage-v2",generated:"2026-11-18",basis:registryFile,
 method:"Only language versions declared in the searchable corpus registry. This inventory does not certify full text coverage, publisher permission outside the recorded license, Greek-English locus alignment, or remote R2 object health.",
 summary,importedIds,
 works:greek.map(w=>({...w,status:Object.keys(w.translations).length?"registered-edited-translation":"missing-registered-edited-translation",preferredLanguage:["es","en","fr"].find(l=>w.translations[l])||null,alignmentCertified:false}))
};
for(const id of importedIds){
 const w=by.get(id),file="data/classics-corpus/"+id+"-en.json";
 if(!w?.greek||w?.translations?.en?.path!==file||!existsSync(file))throw Error("Falta pareja griego/inglés o fichero: "+id);
 const raw=JSON.parse(readFileSync(file,"utf8"));
 if(raw.workId!==id||raw.language!=="en"||!raw.license?.includes("CC BY-SA 4.0")||!raw.attribution||!raw.translator||!raw.editorialStatus||
    !Array.isArray(raw.passages)||raw.passages.length<5||raw.passages.some(p=>!p.locus||typeof p.text!=="string"||p.text.trim().length<2))throw Error("Edición incompleta o sin procedencia: "+id);
 const keys=raw.passages.map(p=>p.locus);
 if(new Set(keys).size!==keys.length)throw Error("Loci repetidos: "+id);
 if(!raw.alignment||!/not |no |unverified|uncertified|sin alineaci[oó]n/i.test(raw.alignment))throw Error("Falta aviso de alineación: "+id);
}
const payload=JSON.stringify(out,null,2);
if(process.argv.includes("--check")){
 const current=JSON.parse(readFileSync(reportFile,"utf8"));
 if(JSON.stringify(current)!==JSON.stringify(out))throw Error("Inventario griego desactualizado: regenerar sin --check");
 console.log(JSON.stringify({status:"ok",summary},null,2));
}else{writeFileSync(reportFile,payload);console.log(JSON.stringify(summary,null,2))}
