import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {canonicalLocus,ocrCandidate,ocrBlocksForLocus,pdfPage} from "../assets/krohn-locus-sync.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const index=JSON.parse(read("data/structured/krohn-1912-ocr-locus-candidates.json"));
const krohn=JSON.parse(read("data/text/krohn-1912.json"));
const v514=JSON.parse(read("data/structured/recensio-es.json"));
const page=number=>krohn.find(p=>p.page===number);
const content=read("assets/critical-search.mjs");
const html=read("aparato-critico.html");

assert.equal(index.schema,"vitruvius-krohn-ocr-locus-candidates-v1");
assert.equal(index.counts.loci,v514.passages.length);
assert.equal(index.counts.loci,Object.keys(index.loci).length);
assert.ok(index.counts.strong_textual_candidate>=.9*v514.passages.length,"Not enough OCR loci reach a strong textual-candidate threshold");
assert.match(index.note,/NOT verified page-to-locus anchors/);
assert.match(content,/ocrCandidate\(index,locus\)/);
assert.match(content,/ocrBlocksForLocus\(pages,referenceLatin,anchor.page\)/);
assert.match(content,/compareId!==compareRevision/);
assert.match(content,/Krohn 1912 · Vitr\., De arch\./);
assert.match(html,/assets\/critical-search\.mjs\?v=/);
const example=ocrCandidate(index,"I.4.1");
assert.ok(example);
assert.equal(example.page,31,"I.4.1 should locate the original scanned PDF page 31");
assert.equal(example.confidence,"strong");
assert.equal(example.locus,"1.4.1");
const latin=v514.passages.find(x=>x.locus==="1.4.1").latin;
const aligned=ocrBlocksForLocus(krohn,latin,example.page);
assert.equal(aligned.length,1,"I.4.1 falls on one OCR PDF page");
assert.equal(aligned[0].page,31);
assert.match(aligned[0].text,/In\s+ipsis\s+vero\s+moenibus/i);
assert.ok(aligned[0].referenceCoverage>75,"OCR block needs distinctive contiguous Latin matches");
const latin142=v514.passages.find(p=>p.locus==="1.4.2").latin;
const continuation=ocrBlocksForLocus(krohn,latin142,ocrCandidate(index,"I.4.2").page);
assert.deepEqual(continuation.map(b=>b.page),[31,32],"I.4.2 must include both scanned pages");
const latinPref=v514.passages.find(p=>p.locus==="2.praef.5").latin;
const pref=ocrBlocksForLocus(krohn,latinPref,ocrCandidate(index,"2.praef.5").page);
assert.deepEqual(pref.map(b=>b.page),[46,47],"II, praef. 5 runs across pages 46–47");
assert.ok([...continuation,...pref].every(b=>b.text.length>80),"Large OCR blocks should not be empty");
assert.equal(canonicalLocus("III.1.2"),"3.1.2");
assert.equal(canonicalLocus("2.pr.5"),"2.praef.5");
assert.equal(ocrCandidate(index,"III.1.2")?.page,77);
assert.equal(ocrCandidate(index,"X.1.1")?.page,242);
assert.equal(ocrCandidate(index,"unexpected"),null);
assert.equal(pdfPage("/documents/krohn-1912.pdf",31),"/documents/krohn-1912.pdf#page=31&zoom=page-width");
assert.equal(pdfPage("https://example.edu/krohn.pdf#page=1",31),"https://example.edu/krohn.pdf#page=31&zoom=page-width");
assert.equal(pdfPage("/documents/krohn.pdf",-1),null);
let previous=0;
for(const p of v514.passages){
 const item=ocrCandidate(index,p.locus);
 assert.ok(item,"Unresolved page candidate: "+p.locus);
 assert.ok(page(item.page),"PDF page missing from registered OCR: "+p.locus);
 assert.ok(item.page>=previous,"Page sequence is not monotonic at "+p.locus);
 previous=item.page;
}
const unrelated=ocrBlocksForLocus([{page:9,text:"altera omnia alio loco"}],"domus atrium parietes fenestra laborant",9);
assert.equal(unrelated.length,0);
let spanning=0;
for(const p of v514.passages){
 const candidate=ocrCandidate(index,p.locus);
 const blocks=ocrBlocksForLocus(krohn,p.latin,candidate.page);
 assert.ok(blocks.length>=1&&blocks.length<=3,"Expected at least one coherent paragraph OCR block: "+p.locus);
 assert.ok(blocks.every(b=>b.text.length>0),"No blank or inverted OCR windows: "+p.locus);
 assert.ok(blocks.some(b=>b.page===candidate.page),"Keep primary Krohn page: "+p.locus);
 if(blocks.length>1)spanning++;
}
assert.ok(spanning>100,"Expected genuine multi-page OCR continuations");
console.log("PASS Krohn: 731 OCR loci, contiguous Latin reading windows, multi-page continuations, I.4.1 → p.31, I.4.2 → pp.31–32, pref. II.5 → pp.46–47; unverified matches explicitly labelled.");
