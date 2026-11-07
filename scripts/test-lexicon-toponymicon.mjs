import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const d=JSON.parse(readFileSync("data/lexicon/toponymicon.json","utf8"));
assert.equal(d.schema,"vitruvia-toponymicon-v1");
assert.ok(Array.isArray(d.places)&&d.places.length>=3);
const ids=new Set(),normalized=s=>s.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[ςϲ]/g,"σ");
for(const place of d.places){
 assert.ok(!ids.has(place.id),"Duplicate place identity: "+place.id);ids.add(place.id);
 assert.match(place.source,/^https:\/\/pleiades\.stoa\.org\/places\/\d+$/);
 assert.equal(place.source,"https://pleiades.stoa.org/places/"+place.pleiades);
 assert.ok(place.label&&place.nameAncient&&place.aliases.length>=3&&place.searchForms.length>=3);
 assert.ok(place.aliases.some(a=>normalized(a)===normalized(place.label)));
 assert.ok(!place.searchForms.includes(""),"Empty form");
}
const athens=d.places.find(p=>p.id==="athenae");assert.ok(athens);
for(const spelling of ["Atenas","Athens","Ἀθῆναι","Αθηναι"])
 assert.ok(athens.aliases.some(x=>normalized(x)===normalized(spelling)),"Missing Athens alias: "+spelling);
assert.equal(athens.pleiades,"579885");
console.log("Toponymicon: verified IDs, bilingual ancient aliases and Pleiades primary identifiers.");
