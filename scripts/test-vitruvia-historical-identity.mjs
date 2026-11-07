import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const src=fs.readFileSync("assets/vitruvia-discovery.js","utf8");
const people=JSON.parse(fs.readFileSync("data/onomasticon-vitruvianum.json","utf8")).entities.filter(x=>x.kind==="person");
const context={window:{},console};vm.createContext(context);vm.runInContext(src,context);
const discovery=context.window.VitruviaDiscovery;
const pythagoras=people.find(p=>p.id==="pythagoras");
assert.ok(pythagoras?.portrait?.localImage,"Documented Capitoline portrait exists");
assert.ok(pythagoras.portrait.museum.includes("Capitolini"));
const topic=discovery.plan("Pitágoras",{kind:"person",birthYear:-570,canonical:"Pitágoras",originalCanonical:"Pythagoras",aliases:["Pitágoras","Pythagoras"]});
assert.equal(topic.ancient,true);
const cases=[
 ["File:Paola Pitagoras singer portrait photograph.jpg",false],
 ["File:Paola Pythagoras concert bust portrait.jpg",false],
 ["File:Pythagoras coin denarius.jpg",false],
 ["File:Pythagoras Bust Capitoline Museum.jpg",true],
 ["File:Pythagoras engraving in early modern edition.jpg",true],
 ["File:AI generated Pythagoras bust.jpg",false]
];
for(const [title,expected] of cases){
 const actual=discovery.imageRank({title,imageinfo:[{extmetadata:{}}]},topic).accepted;
 assert.equal(actual,expected,"Unexpected historical image verdict for "+title);
}
const visual=fs.readFileSync("assets/vitruvia-image-engine-v2.js","utf8");
assert.match(visual,/verifiedHistoricalSubject/);
assert.match(visual,/cataloguedPortrait/);
assert.match(visual,/if\(historicalSubject&&identity\)/);
const search=fs.readFileSync("assets/vitruvia-search.js","utf8");
assert.match(search,/onomasticonSubjectRows\(q\)/);
console.log("PASS historical identity: onomasticon priority; coins, singer photos and AI images rejected; historical sculpture accepted");
