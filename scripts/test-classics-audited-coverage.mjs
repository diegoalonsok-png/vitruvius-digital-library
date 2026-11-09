import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const roadmap=JSON.parse(fs.readFileSync("data/classics-corpus/indexation-roadmap-222.json","utf8"));
const code=fs.readFileSync("assets/classics-audited-coverage.js","utf8");
assert.equal(roadmap.targetWorks,222);
assert.equal(roadmap.counts.originalsIndexed,181);
const ids=new Set(roadmap.items.map(x=>x.id));
const missing=new Set(roadmap.items.filter(x=>!x.originalIndexed).map(x=>x.id));
const greek=["thucydides-war","cassius-dio-historia","athenaeus-deipnosophistae",
"theophrastus-historia-plantarum","archimedes-fluitantibus","ps-aristotle-mechanica",
"euclid-optica","euclid-phaenomena","cleonides-harmonica","hero-belopoeica",
"geminus-isagoge","aristarchus-magnitudines","apollonius-conica","pappus-synagoge"];
const latin=["seneca-de-ira","seneca-de-tranquillitate"];
assert.equal(greek.length,14);
for(const id of greek.concat(latin))assert(missing.has(id),"Remote source must have a catalogue entry not locally indexed: "+id);
const specs=[
{branch:"corpus-originales-griegos-20261108",path:"data/offsite-originals/manifest.json",
 schema:"vitruvius-offsite-greek-originals-manifest-v1",lang:"grc",source:"OpenGreekAndLatin/First1KGreek",ids:greek,prefix:"data/offsite-originals/"},
{branch:"corpus-originales-latinos-20261108",path:"data/offsite-latin/manifest.json",
 schema:"vitruvius-offsite-latin-originals-manifest-v1",lang:"la",source:"PerseusDL/canonical-latinLit",ids:latin,prefix:"data/offsite-latin/"}
];
const manifests=specs.map(v=>({
schema:v.schema,branch:v.branch,count:v.ids.length,
entries:v.ids.map(id=>({workId:id,language:v.lang,
 path:v.prefix+id+"-"+v.lang+".json",
 sourceSha256:"f".repeat(64),source:"https://raw.githubusercontent.com/"+v.source+"/master/data/example.xml",
 passages:10}))
}));
const els=new Map();
const host={dataset:{},querySelector(sel){
 const match=sel.match(/^\[data-classics="([^"]+)"\]$/);
 if(!match)return null;
 if(!els.has(match[1]))els.set(match[1],{textContent:""});
 return els.get(match[1]);
}};
const urls=specs.map(x=>"https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/"+x.branch+"/"+x.path);
const requested=[];
const fetch=async url=>{
 requested.push(url);
 const obj=url==="data/classics-corpus/indexation-roadmap-222.json"?roadmap:manifests[urls.indexOf(url)];
 return {ok:!!obj,status:obj?200:404,json:async()=>obj};
};
vm.runInNewContext(code,{document:{getElementById:id=>id==="classics-audit-coverage"?host:null},fetch,console,Intl,Set});
await new Promise(resolve=>setTimeout(resolve,100));
const value=k=>els.get(k)?.textContent;
assert.equal(host.dataset.state,"verified");
assert.equal(value("catalog"),"222");
assert.equal(value("local"),"181");
assert.equal(value("remote"),"16");
assert.equal(value("searchable"),"197");
assert.equal(value("pending"),"25");
assert.equal(value("translations"),"59");
assert.equal(value("versions"),"246");
assert.equal(requested.length,3);
for(const file of ["index.html","bibliotheca-graeca-latina.html"]){
 const html=fs.readFileSync(file,"utf8");
 assert(html.includes('id="classics-audit-coverage"'),file+" missing counter");
 assert(html.includes('assets/classics-audited-coverage.js'),file+" missing linked script");
}
console.log("PASS inventory 222, original local 181, remote 16, searchable 197, missing 25; metadata provenance checked.");
