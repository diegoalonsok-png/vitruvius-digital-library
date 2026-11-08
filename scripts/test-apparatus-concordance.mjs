#!/usr/bin/env node
/* Regression check: sources, lexicon UI, nearby-note evidence, syntax.
   Run: node scripts/test-apparatus-concordance.mjs */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));
const html=read('aparato-critico.html');
const js=read('assets/vitruvius-apparatus-concordance.js');
const css=read('assets/apparatus-lexicon-theme.css');
const proximity=json('data/apparatus-nearby.json');
const notes=json('data/critical-notes.json').entries;
const apparatus=json('data/apparatus-index.json');
const editions=['recensio-es','recensio-fr','theory-en'];

new vm.Script(js,{filename:'vitruvius-apparatus-concordance.js'});
for(const id of ['critical-form','critical-query','critical-edition','critical-mode',
 'critical-integrated','critical-integrated-status','critical-integrated-results']){
 assert.match(html,new RegExp('id="'+id+'"'),id+' must exist');
}
assert.match(html,/apparatus-lexicon-theme\.css/);
assert.match(html,/vitruvius-apparatus-concordance\.js/);
assert.match(css,/#080809/);
assert.match(css,/#ffe34f/);
assert.match(css,/background:#242427/);
assert.match(js,/function entirePdfConcordance/);
assert.match(js,/function fullEditorialPage/);
assert.match(js,/function occurrences/);
assert.match(js,/Proximidad del párrafo DOCX/);
assert.equal(notes.length,811,'Editorial DOCX notes unchanged');
assert.equal(apparatus.entries.filter(e=>e.source==='nota').length,811,'All notes preserved in full apparatus');
assert.equal(proximity.entries.length,58,'58 conservative new proximity links expected');
const identities=new Set();
const counts={};
for(const entry of proximity.entries){
 assert.ok(editions.includes(entry.edition));
 assert.ok(Number.isInteger(entry.source_paragraph));
 assert.ok([0,1].includes(entry.distance));
 const key=entry.edition+':'+entry.footnote_id;
 assert.ok(!identities.has(key),'Duplicate proximity relationship: '+key);
 identities.add(key);
 const note=notes.find(n=>n.edition===entry.edition&&String(n.footnote_id)===entry.footnote_id);
 assert.ok(note,'Source DOCX note must exist: '+key);
 assert.equal(note.source_paragraph,entry.source_paragraph);
 assert.ok(!note.locus&&!note.candidate_locus,'Do not override documented or proposed loci');
 counts[entry.edition]=(counts[entry.edition]||0)+1;
}
assert.deepEqual(counts,{'recensio-es':25,'recensio-fr':25,'theory-en':8});
for(const ed of editions){
 const passages=json('data/structured/'+ed+'.json').passages;
 const pages=json('data/'+ed+'-pages.json');
 assert.ok(passages.length>700,'Source edition must contain substantial passages');
 assert.ok(pages.length>500,'Source edition must contain complete PDF page extraction');
 const m=proximity.entries.filter(x=>x.edition===ed);
 for(const n of m){
  const src=passages.find(p=>p.locus===n.locus);
  assert.ok(src,'Each linked Vitruvian locus must exist: '+n.locus);
  const distance=Math.min(...src.source_paragraphs.map(x=>Math.abs(x-n.source_paragraph)));
  assert.equal(distance,n.distance,'Source-document proximity must be reproducible');
 }
}
console.log('Aparato integral ✓: 811 notes unchanged, 1393 apparatus records, 58 conservative nearby links, 3 digitized Latin/translation corpora and full PDF page extraction, dark Lexicon UI and executable JavaScript.');
