/* Chronology regression: do not apply Latin orthographic u/v folding to Roman numerals. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const js=readFileSync(new URL("../assets/bibliotheca-simple.js",import.meta.url),"utf8");
const start=js.indexOf("const roman="),end=js.indexOf("/* Taxonomía editorial descriptiva;",start);
assert(start>=0&&end>start,"Chronology parser must be available as a complete function");
const date=vm.runInNewContext(js.slice(start,end)+"\n;dating",Object.create(null));
const cases=[
 ["siglo IX a. C.",-900],["siglo VIII a. C.",-800],
 ["siglo V a. C.",-500],["siglo IV a. C.",-400],
 ["finales del siglo IV a. C.",-325],
 ["44 a. C.",-44],["c. 30–20 a. C.",-30],
 ["siglo I d. C.",1],["siglo II d. C.",101],
 ["siglo V d. C.",401]
];
for(const [dating,want] of cases)assert.equal(date({dating}),want,"Wrong ancient composition date: "+dating);
assert.equal(date({dating:"época arcaica",id:"homer-iliad"}),-780);
const sorted=[
 {id:"latemed",dating:"siglo V d. C."},
 {id:"earlymed",dating:"siglo IV a. C."},
 {id:"archaic",dating:"siglo VIII a. C."},
 {id:"republic",dating:"44 a. C."}
].sort((a,b)=>date(a)-date(b)).map(x=>x.id);
assert.deepEqual(sorted,["archaic","earlymed","republic","latemed"]);
console.log("PASS: chronological Bibliotheca order retains IV/V/VIII and true BCE/CE signs.");
