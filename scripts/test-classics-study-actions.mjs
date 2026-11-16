import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const vm=require("node:vm");
const script="assets/classics-study-actions.js";
new vm.Script(readFileSync(script,"utf8"),{filename:script});
for(const path of ["classics-simple-parallel.html","buscador-facsimiles-clasicos.html"]){
 const html=readFileSync(path,"utf8");
 assert.match(html,/assets\/classics-study-actions\.js\?v=/,"Missing actions module in "+path);
 const matches=html.match(/assets\/classics-study-actions\.js\?v=/g)||[];
 assert.equal(matches.length,1,"Actions module loaded more than once in "+path);
}
const source=readFileSync(script,"utf8");
for(const label of ["Citar","Copiar textos","Descargar TXT","Analizar palabra"])
 assert.ok(source.includes(label),"Missing "+label);
// The lexical jump must not lose the identity of the source passage.
for(const field of ['u.searchParams.set("work",ctx.work)','u.searchParams.set("locus",locus)','u.searchParams.set("lang",lang)']){
 assert.ok(source.includes(field),"Lexicon navigation missing context: "+field);
}
assert.ok(source.includes('if(isSimple){'),"Do not imply a canonical locus from PDF page numbers");
console.log("PASS: reader actions and contextual Lexicon navigation (work/locus/lang)");
