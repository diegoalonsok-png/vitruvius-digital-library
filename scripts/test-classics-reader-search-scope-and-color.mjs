/* Real DOM regression: exact/expanded modes, chapter vs book, yellow dictionary marks. */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {JSDOM} from "jsdom";
const read=p=>readFileSync(p,"utf8");
const corpus=JSON.parse(read("data/classics-corpus/augustine-civitate-dei-la.json"));
const text=(x)=>Array(7).fill("Hic ordo sacer de rerum ratione loquitur et de vita hominum. ").join("")+x;
const passages=[
 {locus:"1.1.1",text:text("Sapientia verbum pertinet ad humanitatem.")},
 {locus:"1.1.2",text:text("Sapientia et iustitia in eodem capitulo.")},
 {locus:"1.2.1",text:text("Sapientia secundum capitulum tractatur.")},
 {locus:"1.2.2",text:text("In hoc loco de natura sermonis legimus.")}
];
const fixture={...corpus,passages};
const url="https://example.org/classics-text-reader?work=augustine-civitate-dei&lang=la&locus=1.1.1&q=sapientia&literal=1";
const dom=new JSDOM(read("classics-text-reader.html"),{url,runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window,d=w.document,errors=[];
w.HTMLElement.prototype.scrollIntoView=function(){};
w.addEventListener("error",e=>errors.push(e.message));
w.fetch=async url=>{
 const path=String(url).split("?")[0];
 if(path.endsWith("augustine-civitate-dei-la.json"))return {ok:true,json:async()=>structuredClone(fixture)};
 if(!existsSync(path))return {ok:false,status:404,json:async()=>null};
 return {ok:true,status:200,json:async()=>JSON.parse(read(path))};
};
for(const path of ["assets/classical-lexicon.js","assets/classics-text-reader.js"])w.eval(read(path));
for(let n=0;n<120&&!d.querySelector("#passages p");n++)await new Promise(res=>setTimeout(res,15));
assert(d.querySelector("#passages p"),"Reader did not render");
assert.deepEqual(errors,[]);
const search=q=>{d.querySelector("#query").value=q;d.querySelector("#find").click();return d.querySelector(".search-summary")?.textContent||""};
const count=()=>d.querySelectorAll(".search-passage-list li").length;
assert.equal(d.querySelector("#scope-book").getAttribute("aria-pressed"),"true");
search("sapientia");assert.equal(count(),3,"Entire work must show matches from different chapters");
d.querySelector("#scope-chapter").click();
assert.equal(d.querySelector("#scope-chapter").getAttribute("aria-pressed"),"true");
assert.equal(d.querySelector("#scope-book").getAttribute("aria-pressed"),"false");
assert.equal(count(),2,"Chapter must contain two source passages, not later chapters");
assert.match(new URL(w.location.href).searchParams.get("scope"),/chapter/);
d.querySelector("#scope-book").click();
assert.equal(count(),3,"Switching back to entire work must restore all indexed matches");
assert.equal(d.querySelector("#scope-chapter").getAttribute("aria-pressed"),"false");
const mark=d.querySelector(".search-passage-jump mark.search-excerpt-hit");
assert(mark&&mark.textContent.toLowerCase()==="sapientia","Source occurrence must have yellow mark");
assert(read("classics-text-reader.html").includes("background:#ffe16b!important"),
 "Yellow marks must remain visible under theme overrides");
mark.click();
assert(d.querySelector("#lexicon h4"),"Click on highlighted source word must open dictionary");
d.querySelector("#mode-exact").click();
search("logos");assert.equal(count(),0,"Exact mode may not contain semantic substitutes");
assert.equal(d.querySelector("#mode-exact").getAttribute("aria-pressed"),"true");
d.querySelector("#mode-expanded").click();
assert.equal(d.querySelector("#mode-expanded").getAttribute("aria-pressed"),"true");
assert.equal(d.querySelector("#mode-exact").getAttribute("aria-pressed"),"false");
assert(count()>0,"Expanded mode must find indexed equivalence of logos to Verbum");
assert.deepEqual(errors,[],"No reader runtime errors");
w.close();
console.log("PASS: chapter vs whole work, exact vs expanded, selected button color state, yellow dictionary hit.");
