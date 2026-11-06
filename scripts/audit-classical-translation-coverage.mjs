/* Corpus coverage and semantic-vocabulary integrity audit.
   Reports gaps; never treats an external link as a verified aligned translation. */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const catalogue=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json").works;
const extra=read("data/clasicos-perseus-extra.json").works;
const registry=read("data/classics-corpus/search-registry.json");
const concepts=read("data/lexicon/conceptus.json").concepts;
const originals=new Set(["la","grc"]);
const targetLanguages=new Set(["en","es","fr"]);
const entries=new Map();
for(const e of registry.entries){
 assert(e.workId&&e.language&&e.path,"Incomplete indexed record");
 assert(existsSync(new URL("../"+e.path,import.meta.url)),"Indexed source absent: "+e.path);
 if(!entries.has(e.workId))entries.set(e.workId,new Map());
 const languages=entries.get(e.workId);
 assert(!languages.has(e.language),"Repeated indexed language: "+e.workId+"/"+e.language);
 languages.set(e.language,e.path);
}
const local= catalogue.filter(w=>originals.has(w.language)&&entries.get(w.id)?.has(w.language));
const missingLocal=local.filter(w=>![...entries.get(w.id).keys()].some(l=>targetLanguages.has(l)));
const external=extra.filter(w=>originals.has(w.language));
const externalWith=external.filter(w=>(w.translations||[]).some(t=>targetLanguages.has(t.language)&&typeof t.url==="string"&&t.url));
const missingExternal=external.filter(w=>!externalWith.includes(w));
const ids=new Set();
let ancientTerms=0,modernTerms=0;
for(const c of concepts){
 assert(c.id&&!ids.has(c.id),"Missing/duplicate semantic concept: "+c.id);
 ids.add(c.id);
 for(const language of ["la","grc"]){
  assert(!c[language]||Array.isArray(c[language]),"Malformed semantic forms: "+c.id);
  ancientTerms+=(c[language]||[]).filter(x=>typeof x==="string"&&x.trim()).length;
 }
 for(const vals of Object.values(c.modern||{})){
  assert(Array.isArray(vals),"Modern equivalents must be arrays: "+c.id);
  modernTerms+=vals.filter(x=>typeof x==="string"&&x.trim()).length;
 }
}
const report={
 generatedFrom:"GitHub repository JSON; metadata coverage, not critical collation",
 catalogueWorks:catalogue.length,
 locallyIndexedWorks:entries.size,
 indexedVersions:registry.entries.length,
 locallyIndexedOriginalWorks:local.length,
 locallyIndexedOriginalsWithoutIndexedEnEsFr:missingLocal.map(w=>({id:w.id,title:w.title,language:w.language})),
 externalGreekLatinRecords:external.length,
 externalRecordsWithDeclaredEnEsFr:externalWith.length,
 externalRecordsWithoutDeclaredEnEsFr:missingExternal.length,
 priorityExternalWithoutTranslation:missingExternal.slice(0,20).map(w=>({id:w.id,author:w.author,title:w.title})),
 semanticConcepts:concepts.length,ancientSemanticForms:ancientTerms,modernSemanticForms:modernTerms,
 limitations:"Links and translation metadata are not validation of file access, copyright, complete text, chapter-level alignment, or word-by-word equivalence."
};
console.log(JSON.stringify(report,null,2));
assert(concepts.length>0&&ancientTerms>0&&modernTerms>0,"Semantic repertory missing");
console.log("PASS: translation coverage reported and semantic source structurally checked; missing translations remain explicit.");
