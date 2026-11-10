import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const source=readFileSync("assets/vitruvia-academic-order.js","utf8");
const scope={window:{}};
runInNewContext(source,scope);
const order=scope.window.VitruviaAcademicOrder;
for(const mode of ["all","external","site","concept","ai"]){
 const groups=Array.from(order.groups(mode));
 assert.equal(groups[groups.length-2],"encyclopedia","Encyclopedia belongs behind document and institutional source groups");
 assert(groups.indexOf("library")<groups.indexOf("encyclopedia"));
 assert(groups.indexOf("universities")<groups.indexOf("encyclopedia"));
 assert(groups.indexOf("apparatus")<groups.indexOf("encyclopedia"));
 assert.equal(new Set(groups).size,groups.length);
 if(mode==="ai")assert.equal(groups[0],"semantic");
}
assert.equal(Array.from(order.groups("wiki"))[0],"encyclopedia","Explicit wiki mode retains its meaning");
const first=order.groups("all");first.splice(0,first.length);
assert.equal(order.groups("all")[0],"library","Group order must not mutate across progressive searches");
const v=readFileSync("assets/vitruvia-search.js","utf8");
const l=readFileSync("assets/vitruvia-lexicon.js","utf8");
const page=readFileSync("vitruvia.html","utf8");
assert(v.includes("window.VitruviaAcademicOrder?.groups(S.mode)"));
assert(v.includes("vitruvia-order-method-note"));
assert(page.includes("assets/vitruvia-academic-order.js"));
assert(l.includes("lx-hit-provenance"));
assert(l.includes("Edición no especificada en la ficha local"));
assert(l.includes('new URLSearchParams({work:p[0]})'));
console.log("Academic-first source groups and per-locus lexical provenance: PASS");
