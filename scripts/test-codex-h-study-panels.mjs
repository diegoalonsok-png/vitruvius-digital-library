/* Scholarly Codex H reader: real photographed folio and edition sources only. */
import {JSDOM} from "jsdom";
import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const map=JSON.parse(readFileSync("data/codex-h/folio-locus-map.json","utf8"));
const edition=JSON.parse(readFileSync("data/structured/recensio-es.json","utf8"));
const folio=map.entries.find(x=>x.folio==="1v"&&x.image_number===10);
assert.ok(folio);
assert.ok(folio.loci.some(x=>x.locus==="1.1.1"));
assert.equal(edition.edition,"recensio-es");
assert.equal(edition.version,"V514");
const source=readFileSync("assets/codex-h-study-panels.js","utf8");
const page=readFileSync("codex-h-doble-folio.html","utf8");
assert.ok(page.includes('src="assets/codex-h-study-panels.js'));
assert.ok(source.includes('NO de una transcripción diplomática del Codex H.'));
const fixture=[
'<!doctype html><html><head></head><body>',
'<div id="left-label">f.1v</div><div id="left-meta">Imagen digital 10</div>',
'<div id="right-label">f.2v</div><div id="right-meta">Imagen digital 12</div>',
'<section class="book">',
'<div class="leaf left"><div id="left-stage"><img id="left-image" src="1v.jpg"></div></div>',
'<div class="leaf right"><div id="right-stage"><img id="right-image" src="2v.jpg"></div></div>',
'</section></body></html>'
].join("");
const dom=new JSDOM(fixture,{
 url:"https://vitruvius-digital-library.org/codex-h-doble-folio",
 runScripts:"outside-only",pretendToBeVisual:true
});
const w=dom.window;
let count=0;
w.fetch=async url=>{
 count++;
 const content=String(url).includes("folio-locus-map")?map:edition;
 return {ok:true,json:async()=>content};
};
w.eval(source);
const book=w.document.querySelector(".book");
assert.equal(book.dataset.chStudy,"spread");
assert.equal(count,0,"Do not fetch 1MB structured edition in default facsimile mode");
const buttons=[...w.document.querySelectorAll(".ch-study-tools button")];
const byText=t=>buttons.find(b=>b.textContent===t);
assert.ok(byText("Doble folio")&&byText("Folio + latín")&&byText("Folio + latín + traducción"));
byText("Folio + latín + traducción").click();
await new Promise(resolve=>setTimeout(resolve,45));
assert.equal(book.dataset.chStudy,"triple");
assert.equal(count,2,"Lazy-load one map and one V514 edition");
const latin=w.document.querySelector(".ch-study-latin").textContent;
const trans=w.document.querySelector(".ch-study-translation").textContent;
assert.ok(latin.includes("NO de una transcripción diplomática"));
assert.ok(latin.includes("1.1.1"));
assert.ok(latin.includes("Architecti est scientia"),"Real editorial Latin 1.1.1");
assert.ok(trans.includes("DOI: 10.5281/zenodo.23884757"));
assert.ok(trans.length>100);
assert.ok(book.querySelector('a[href*="edition=recensio-es&locus=1.1.1"]'));
w.document.getElementById("left-label").textContent="f.100r";
w.document.getElementById("left-meta").textContent="Imagen digital 999";
await new Promise(resolve=>setTimeout(resolve,45));
assert.ok(w.document.querySelector(".ch-study-latin").textContent.includes("No hay correspondencia"),
 "Never infer a reading for an unrecorded witness folio");
byText("Doble folio").click();
assert.equal(book.dataset.chStudy,"spread");
assert.equal(count,2,"Returning to facsimile does not duplicate requests");
assert.equal(w.document.querySelectorAll(".ch-study-tools").length,1);
w.close();
console.log("PASS: documented witness, V514 editorial reading, 3-pane mode, no false diplomatic text or alignment.");
