#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const read=file=>readFileSync(file,"utf8");
const architecture=read("assets/vitruvia-architecture-panel.js");
const visuals=read("assets/vitruvia-architect-visuals.js");
const dossier=read("assets/vitruvia-web-dossier.js");
const css=read("assets/vitruvia-context-panel.css");
const page=read("vitruvia.html");

for(const [name,source] of [
 ["architecture-panel",architecture],["architect-visuals",visuals],["web-dossier",dossier]
 ])new vm.Script(source,{filename:name+".js"});

const start=architecture.indexOf("const KEY=");
const classificationEnd=architecture.indexOf("const el=",start);
const profileStart=architecture.indexOf("const palladioProfile={");
const profileEnd=architecture.indexOf("async function findArchitectQid",profileStart);
assert(start>=0&&classificationEnd>start&&profileStart>0&&profileEnd>profileStart);

const runtime={};
vm.runInNewContext(architecture.slice(start,classificationEnd)+"\n"+
 architecture.slice(profileStart,profileEnd)+
 "\nglobalThis.profile=palladioProfile;globalThis.sites=certifiedSites;globalThis.subject=classify;",runtime);
const sites=runtime.sites,profile=runtime.profile,works=profile.items;
assert.equal(sites.palladio,sites["andrea palladio"],"Palladio aliases must share one source catalogue");
assert.equal(works.length,9,"Source-checked Palladio sample has nine dated records");
assert.match(profile.source,/Palladio Museum/);
assert.equal(profile.url,"https://mediateca.palladiomuseum.org/palladio/opere.php");
assert.equal(profile.unesco,"https://whc.unesco.org/en/list/712/");
assert.match(profile.archive,/palladiomuseum\.org\/en\/mediateca/);
assert.equal(new Set(works.map(w=>w[0])).size,works.length,"Duplicated works");

let prior=0;
for(const item of works){
 const [title,date,place,source,description,photograph]=item;
 assert(title&&place&&description&&photograph);
 assert(/^https:\/\/mediateca\.palladiomuseum\.org\/palladio\/opera_(?:bibliografia\.)?php\?id=\d+$/.test(source)||
  /^https:\/\/mediateca\.palladiomuseum\.org\/palladio\/opera\.php\?id=\d+$/.test(source),
  "Every work must link to its own Palladio Museum record: "+title);
 assert(/proyecto|anterior|antes/.test(date),"Do not conflate architectural design with building completion");
 const first=Number(date.match(/\d{4}/)?.[0]);
 assert(Number.isInteger(first)&&first>=1500&&first<=1600,"Unknown or impossible project year");
 assert(first>=prior,"The first documented project-year labels must stay chronological");
 prior=first;
}
assert(works.some(x=>/La Rotonda/.test(x[0])&&/1566/.test(x[1])));
assert(works.some(x=>/Olimpico/.test(x[0])&&/1580/.test(x[1])));
assert(works.some(x=>/Basilica Palladiana/.test(x[0])&&/1546/.test(x[1])));

for(const query of ["Palladio","Andrea Palladio"]){
 assert.equal(runtime.subject(query,[]).kind,"person","No external provider should be required for a verified profile");
}
assert.equal(runtime.subject("Andrea Palladio",[{preferredWiki:true,entityKind:"person",link:"https://example.org/verified",
 title:"Andrea Palladio",excerpt:"Architectural history",entityDescription:"Italian Renaissance figure"}]).kind,"person");
assert.equal(runtime.subject("arquitectura",[]).kind,"general");
assert.equal(runtime.subject("Villa desconocida",[]),null,"Do not fabricate an architect for an unknown building");

assert.match(architecture,/palladioPortrait\(section,valid\)/);
assert.match(architecture,/date,place,sourceUrl,descriptionText,sourcePhoto/);
assert.match(architecture,/Palladio Museum \(87 fichas\)/);
assert.match(architecture,/Plantas|planos y modelos|relevamientos/);
assert.match(visuals,/const selected=items\.map/);
assert.match(visuals,/nameTerms\.length>=2&&hits>=2/);
assert.match(visuals,/documented|documentada/i);
assert.match(dossier,/!architectureOwnWorks/,"Generic works must not duplicate the architect's catalogue");
assert.match(css,/architecture-subject-portrait/);
assert.match(css,/architecture-work-drawings summary:focus-visible/);
for(const file of ["vitruvia-architecture-panel.js","vitruvia-architect-visuals.js",
 "vitruvia-web-dossier.js","vitruvia-context-panel.css"]){
 assert(page.includes("assets/"+file+"?v=20261109-palladio-dossier-v1"),
  "Update cache key for deployed site: "+file);
}
console.log("PASS: 9 Palladio Museum dates and work records; museum/UNESCO provenance; portrait, drawings and images linked, no duplicate architectural catalogue");
