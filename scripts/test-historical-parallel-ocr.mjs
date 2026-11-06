import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const get=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const html=get("concordancia-ocr-vitruvio.html");
const js=get("assets/concordancia-ocr-vitruvio.js");
const historical=get("concordancia-historica.html");
for(const [id,expected] of [["krohn-1912",314],["rose-1899",358],["perrault-1673",370]]){
 const path="data/text/"+id+".json";
 const source=JSON.parse(get(path));
 assert.equal(source.length,expected,"OCR pages changed for "+id);
 assert(source.every((r,i)=>Number.isInteger(r.page)&&typeof r.text==="string"&&
   (i===0||r.page>source[i-1].page)),"OCR page sequence invalid: "+id);
 assert(source.reduce((n,r)=>n+r.text.length,0)>100000,"OCR too short: "+id);
 assert(js.includes(path),"Historical OCR comparison omits "+id);
}
assert(js.includes('encodeURIComponent(term)')&&js.includes('concordancia-historica.html?ed='),
 "Historical results need escaped edition, query and page links");
assert(html.includes("OCR por página")&&html.includes("no establece equivalencias"),
 "Historical page must distinguish OCR from critical collation");
assert(historical.includes('href="concordancia-ocr-vitruvio.html"'),
 "Historical per-edition search must link to parallel OCR comparison");
console.log("PASS: independent historical OCR comparison references three extant page-indexed sources");
