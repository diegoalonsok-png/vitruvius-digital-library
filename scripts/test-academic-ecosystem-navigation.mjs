#!/usr/bin/env node
/**
 * Regresión transversal del ecosistema académico.
 * Verifica enlaces de navegación locales, presencia de módulos críticos
 * y contratos mínimos de descubrimiento. NO prueba búsqueda en vivo,
 * autenticidad textual, R2 ni exactitud filológica.
 */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const load=file=>readFileSync(join(root,file),"utf8");
const network={
  "index.html":["vitruvia.html","vitruvia-lexicon.html","bibliotheca-graeca-latina.html","indices-locorum.html","apparatus-bude.html"],
  "vitruvia.html":["bibliotheca-graeca-latina.html","vitruvia-lexicon.html"],
  "vitruvia-lexicon.html":["vitruvia.html","bibliotheca-graeca-latina.html"],
  "bibliotheca-graeca-latina.html":["vitruvia.html","vitruvia-lexicon.html"],
  "classics-text-reader.html":["bibliotheca-graeca-latina.html","vitruvia.html","vitruvia-lexicon.html"],
};
const report={test:"ecosystem-navigation-contract",routes:{},links:0};
for(const [source,targets] of Object.entries(network)){
 assert(existsSync(join(root,source)),`Missing page: ${source}`);
 const html=load(source);
 const links=[...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)].map(m=>m[1].replaceAll("&amp;","&"));
 const destinations=new Set(links.map(href=>{
  try {const u=new URL(href,"https://vitruvius-digital-library.org/"+source);
   return u.origin==="https://vitruvius-digital-library.org"?u.pathname.replace(/^\//,""):null;
  }catch{return null;}
 }));
 for(const target of targets){
  assert(destinations.has(target),`Missing navigable link: ${source} -> ${target}`);
  assert(existsSync(join(root,target)),`Broken repository destination: ${target}`);
 }
 report.routes[source]=targets.length;
 report.links+=links.length;
}
for(const path of ["data/structured/recensio-es.json","data/structured/recensio-fr.json","data/structured/theory-en.json","data/classics-corpus/search-registry.json","METODOLOGIA-FILOLOGICA.md","CITATION.cff"]){
 assert(existsSync(join(root,path)),`Critical academic resource missing: ${path}`);
}
const citation=load("CITATION.cff");
assert(/doi:\s*["']?10\./i.test(citation),"Project DOI absent in CITATION.cff");
const methods=load("METODOLOGIA-FILOLOGICA.md");
assert(/OCR/i.test(methods)&&/CTS/i.test(methods)&&/TEI/i.test(methods),"Methodology must declare OCR, CTS and TEI constraints");
console.log(JSON.stringify({...report,status:"pass",note:"Structural audit only; live reading, search and scholarly claims require separate tests."},null,2));
