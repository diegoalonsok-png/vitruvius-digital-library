#!/usr/bin/env node
/* Yellow highlighting of machine-recovered historical OCR passages.
 * Verify exact displayed text, lack of OCR-as-HTML, and non-assertion of IIIF alignment.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

class Element{
 constructor(tag){this.tag=tag;this.parts=[];this.attrs={};this.classList={items:new Set(),add:(...x)=>x.forEach(v=>this.classList.items.add(v))};this.value="";}
 set textContent(v){this.parts=[{tag:"#text",value:String(v)}]}
 get textContent(){return this.parts.map(x=>x.tag==="#text"?x.value:x.textContent).join("")}
 append(...items){this.parts.push(...items)}
 replaceChildren(...items){this.parts=[...items]}
 setAttribute(key,val){this.attrs[key]=val}
}
const document={
 createElement(tag){return new Element(tag)},
 createTextNode(value){return {tag:"#text",value:String(value),get textContent(){return this.value}}}
};
const window={};
vm.runInNewContext(readFileSync("assets/historical-ocr-highlight.js","utf8"),
 {window,document},{filename:"assets/historical-ocr-highlight.js"});
const decorate=window.VitruviaOCRHighlight.decorate;
assert.equal(window.VitruviaOCRHighlight.normalize("Ædificatio ſymmetria"),"aedificatio symmetria");
const p=new Element("p");
const original='Prima symmetria, secunda ÆDIFICATIO; <img src=x onerror=alert(1)> non HTML.';
const matched=decorate(p,original,"symmetria aedificatio");
assert.equal(matched,2);
assert.equal(p.textContent,original,"Historical source text must be preserved exactly");
assert.ok(p.classList.items.has("vdl-ocr-highlight"));
assert.equal(p.attrs["data-ocr-evidence"],"highlighted-transcription");
assert.equal(p.parts.filter(x=>x.tag==="mark").length,2);
assert.ok(!p.parts.some(x=>x.tag==="img"),"OCR content may not create DOM tags");
for(const path of [
 "buscador-parrafos-vitruvio.html",
 "indexacion-historica-parrafos.html",
 "concordancia-historica.html",
 "cesariano-1521.html"
]){
 const src=readFileSync(path,"utf8");
 assert.ok(src.includes("historical-ocr-highlight.css"),path+" missing yellow paragraph CSS");
 assert.ok(src.includes("historical-ocr-highlight.js"),path+" missing safe yellow OCR helper");
}
const css=readFileSync("assets/historical-ocr-highlight.css","utf8");
assert.match(css,/\.vdl-ocr-highlight\{/);
assert.match(css,/background:#fff1a3!important/);
const a=readFileSync("assets/historical-paragraph-search.mjs","utf8");
const b=readFileSync("assets/cesariano-visual-search.mjs","utf8");
const c=readFileSync("assets/historical-search.mjs","utf8");
const d=readFileSync("assets/historical-semantic-search.js","utf8");
assert.match(a,/VitruviaOCRHighlight\.decorate/);
assert.ok(a.includes('cesariano-1521.html"')&&!a.includes("cesariano-1521.html?image="),
 "OCR page must not be falsely mapped to Cesariano IIIF image");
assert.match(b,/classList\.add\('vdl-ocr-highlight'\)/);
assert.match(b,/const focusTerm=incoming\.get\('ocr_q'\)/);
assert.match(c,/source\.id==='rose-1899'\|\|source\.id==='cesariano-1521'/);
assert.match(d,/VitruviaOCRHighlight\.decorate/);
console.log("PASS: Rose/Cesariano OCR paragraphs highlighted yellow, original OCR preserved, no fabricated IIIF mapping.");
