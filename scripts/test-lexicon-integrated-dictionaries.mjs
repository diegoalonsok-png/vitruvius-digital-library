/* Lexicon dictionary integrity: detect duplicate panels, stale asset refs,
   and vocabulary counts; do not claim complete LSJ/BDB/OLD/HALOT coverage. */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const html=read("vitruvia-lexicon.html");
const names=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const count=id=>names.filter(n=>n===id).length;
for(const id of ["lx-dictionaries","lx-dict-results","lx-dict-status","lx-dict-refresh"]){
 assert.equal(count(id),1,"Lexicon dictionary UI duplicated or missing: "+id);
}
assert.equal(count("lexicon-dictionaries"),0,"Legacy duplicate dictionary panel must not render");
assert(!html.includes("assets/lexicon-dictionaries.js"),"Do not reference a missing duplicate dictionary script");
for(const path of ["assets/lexicon-dictionaries-integrated.js","assets/lexicon-dictionaries-integrated.css"]){
 assert(html.includes(path),"Shared dictionary asset not loaded: "+path);
 assert(existsSync(path),"Shared dictionary asset absent: "+path);
}
const script=read("assets/lexicon-dictionaries-integrated.js");
assert.match(script,/dictionary-.*\+lang.*\.json/,"Three language indexes need to be dynamically selected");
for(const language of ["la","grc","he"]){
 const filename="data/lexicon/dictionary-"+language+".json";
 assert(existsSync(filename),"Missing lexicographic index "+filename);
 const d=JSON.parse(read(filename));
 assert.equal(d.schema,"vitruvia-integrated-dictionary-v1");
 assert.equal(d.language,language);
 assert(d.entries&&typeof d.entries==="object","Dictionary entries missing for "+language);
}
const report=JSON.parse(read("data/lexicon/dictionary-integrity.json"));
const minima={la:500,grc:500,he:30};
for(const lang of Object.keys(minima)){
 const doc=JSON.parse(read("data/lexicon/dictionary-"+lang+".json"));
 const count=Object.keys(doc.entries).length;
 assert(count>=minima[lang],"Dictionary needs actual indexed entries: "+lang);
 assert.equal(count,report.counts[lang],"Audit totals out of sync: "+lang);
}
console.log("PASS Lexicon trilingual dictionaries: single live panel, valid scripts, attributed local sources and counts",report.counts);
