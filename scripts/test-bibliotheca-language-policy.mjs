/* Verify language restrictions do not delete original source records. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const ui=readFileSync(new URL("../assets/bibliotheca-simple.js",import.meta.url),"utf8");
const search=readFileSync(new URL("../assets/bibliotheca-corpus-search.js",import.meta.url),"utf8");
const registry=JSON.parse(readFileSync(new URL("../data/classics-corpus/search-registry.json",import.meta.url),"utf8"));
for(const script of [ui,search]){
 const line=script.match(/const bibliothecaLanguagePolicy=.*?;/)?.[0];
 assert(line,"Missing Bibliotheca edition-language policy");
 const allowed=Function("return "+line.replace(/^const bibliothecaLanguagePolicy=/,"").replace(/;$/,""))();
 for(const id of ["aristotle-poetics","pliny","seneca-de-brevitate"]){
  for(const lang of ["la","grc","en"])assert(allowed({workId:id,language:lang}),id+"/"+lang);
  for(const lang of ["es","fr"])assert(!allowed({workId:id,language:lang}),id+"/"+lang);
 }
 for(const lang of ["la","grc","en","es","fr"])assert(allowed({workId:"vitruvius",language:lang}),"Vitruvius "+lang);
}
assert(ui.includes("registry.entries.filter(bibliothecaLanguagePolicy)"));
assert(search.includes("registered=registered.filter(bibliothecaLanguagePolicy)"));
const archived=registry.entries.filter(e=>e.workId!=="vitruvius"&&["es","fr"].includes(e.language));
assert(archived.length>0,"Test expects legacy translations to remain available in sources");
console.log("PASS: Bibliotheca displays Greek, Latin, English; Vitruvius retains Spanish/French; source records are not deleted.");
