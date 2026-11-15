/* Validate Krohn's independent Latin and its image/locus cross-reference.
 * Structural tests only; they do not certify facsimile fidelity or a live browser. */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const corpus=json('data/text/krohn-1912-perseus-loci-candidate.json');
const index=json('data/r2/folios/krohn-1912-parallel.json');
const html=readFileSync('lectura-comparada.html','utf8');
const code=readFileSync('assets/modern-edition-parallel.mjs','utf8');
const page=readFileSync('krohn-1912.html','utf8');
assert.equal(corpus.schema,'vdl-krohn-perseus-transcription-candidate-v1');
assert.ok(corpus.passages.length>=700);
assert.ok(html.includes('value="krohn"'));
assert.ok(code.includes("if(mode==='krohn')"));
assert.ok(code.includes('krohn-1912-perseus-loci-candidate.json'));
assert.ok(page.includes('reading=krohn&amp;lang=la&amp;locus=1.1.1'));
const byLocus=new Map(corpus.passages.map(p=>[p.locus,p.latin]));
const location=new Map();
for(const record of index.pages)for(const entry of record.loci)if(!location.has(entry.locus))location.set(entry.locus,record.image);
for(const locus of ['1.1.1','1.2.3','8.3.21','9.1.16']){
 assert.ok(byLocus.has(locus),'Missing original Latin: '+locus);
 assert.ok(location.has(locus),'No mapped image: '+locus);
 assert.ok(byLocus.get(locus).length>12,'Latin too short: '+locus);
}
assert.ok(!byLocus.has('5.1.6'),'Unresolved segmentation must not be fabricated');
console.log('PASS: Krohn non-OCR reader source, 727 loci, and sample image/locus alignments');
