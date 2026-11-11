import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildParagraphCandidates,segmentOcrPage,searchParagraphCandidates,fold} from "../assets/historical-paragraph-core.mjs";
const example={page:7,text:"Aqua pura in urbe.\nMulta sunt opera.\n\nColumnae et architectura in basilica.\n\n"};
const parts=segmentOcrPage("test",example,200);
assert.equal(parts.length,2,"Two OCR blank-line blocks expected");
for(const row of parts){assert.equal(example.text.slice(row.startOffset,row.endOffset),row.text);assert.equal(row.status,"ocr_unverified");assert.equal(row.locus,null);}
assert.equal(fold("Ædificatio ſymmetria VITRVVIVS"),"aedificatio symmetria uitruuius");
assert.ok(searchParagraphCandidates(parts,"columnae architectura",3)[0].text.includes("basilica"));
assert.deepEqual(searchParagraphCandidates(parts,"inexistente","test").length,0);
const long=segmentOcrPage("test",{page:10,text:"architectura ".repeat(340)},600);
assert.ok(long.length>=2);
for(const id of ["krohn-1912","rose-1899","cesariano-1521"]){
 const pages=JSON.parse(readFileSync("data/text/"+id+".json","utf8"));
 assert.ok(Array.isArray(pages)&&pages.length>=150,id+": source page coverage unexpectedly short");
 const rows=buildParagraphCandidates(id,pages);
 assert.ok(rows.length>=70,id+": no indexable OCR");
 const seen=new Set();
 for(const r of rows) {
  assert.ok(Number.isInteger(r.page)&&r.page>0);
  assert.ok(r.text.trim());
  assert.ok(!seen.has(r.id));seen.add(r.id);
  assert.ok(r.status==="ocr_unverified"&&r.locus===null);
 }
 console.log(id+": "+pages.length+" OCR pages, "+rows.length+" candidate text blocks");
}
console.log("PASS: OCR paragraph candidates; no source texts altered or loci invented.");
