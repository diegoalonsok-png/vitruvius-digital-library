/* Universal chronology scope regression tests, synthetic dates only.
   Run: node scripts/test-vitruvia-chronology-scopes.mjs
   Does not verify historical claims or live API responses. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../assets/vitruvia-academic-timeline.js",import.meta.url),"utf8");
const start=source.indexOf(" function splitChronology("),end=source.indexOf(" // A separate, keyboard",start);
assert.ok(start>=0&&end>start,"Scope implementation not found");
const split=new Function("const yearOrdinal=y=>y>0?y-1:y;const ordinalYear=n=>n>=0?n+1:n;"+source.slice(start,end)+"return splitChronology;")();
const e=(year,lane="life",extra={})=>({year,lane,...extra});
const cases=[
 ["bounded biography",[e(-100),e(-50),e(1922,"documents")],true,-100,-50,2,1,0],
 ["unknown birth",[e(-50),e(-200,"family")],true,null,-20,1,0,1],
 ["unknown death",[e(-50),e(2020,"works")],true,-100,null,1,0,1],
 ["unknown both",[e(-50),e(2020,"documents"),e(1900,"family")],true,null,null,1,1,1],
 ["inverted bounds",[e(-50),e(1900,"works")],true,20,-20,1,0,1],
 ["undefined bounds",[e(-50),e(1900,"family")],true,undefined,undefined,1,0,1],
 ["zero bounds",[e(-50),e(1900,"family")],true,0,0,1,0,1],
 ["posthumous interval",[e(-80,"life",{end:10}),e(-60)],true,-100,-50,1,0,1],
 ["prebirth event",[e(-150,"events"),e(-60)],true,-100,-50,1,1,0],
 ["postdeath event",[e(-60),e(-40,"events")],true,-100,-50,1,1,0],
 ["dated personal event",[e(-60,"events",{personalDate:true}),e(1900,"works")],true,null,null,1,0,1],
 ["all documentary",[e(1900,"documents")],true,null,null,0,1,0],
 ["same year",[e(-20)],true,-20,-20,1,0,0],
 ["era transition",[e(-1),e(1)],true,-1,1,2,0,0],
 ["work",[e(-750,"works"),e(1900,"documents")],false,null,null,2,0,0],
 ["building",[e(-450,"works"),e(1900,"events")],false,null,null,2,0,0],
 ["historical event",[e(1789,"events"),e(1799,"events")],false,null,null,2,0,0],
 ["institution",[e(1800),e(2000)],false,null,null,2,0,0],
 ["empty",[],true,null,null,0,0,0],
 ["only uncertain",[e(1900,"works")],true,null,null,0,0,1]
];
for(const [name,events,person,birth,death,v,o,u] of cases){
 const s=split(events,person,birth,death);
 assert.deepEqual([s.visible.length,s.outside.length,s.uncertain.length],[v,o,u],name);
 if(v){assert.notEqual(s.low,0,name);assert.notEqual(s.high,0,name);assert.ok(s.low<=s.high,name);}
}
console.log("PASS "+cases.length+" chronology scope cases (synthetic fixtures).");
