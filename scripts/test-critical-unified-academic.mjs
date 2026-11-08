#!/usr/bin/env node
/* Academic integrity of Vitruvius critical apparatus and source relationships. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('assets/critical-unified-exegesis.js'),html=read('aparato-critico.html'),css=read('assets/critical-lexicon-theme.css');
const notes=JSON.parse(read('data/critical-notes.json')).entries;
const near=JSON.parse(read('data/apparatus-nearby.json')).entries;
const idx=JSON.parse(read('data/apparatus-index.json')).entries;
new vm.Script(js,{filename:'assets/critical-unified-exegesis.js'});
assert.equal(notes.length,811,'Original DOCX notes must be preserved');
assert.equal(idx.filter(e=>e.source==='nota').length,811,'Apparatus index cannot drop original notes');
assert.equal(near.length,58,'58 conservative proximity links must exist');
const editions=['recensio-es','recensio-fr','theory-en'];
const ids=new Set(),counts={};
for(const n of near){
 assert.ok(editions.includes(n.edition));
 assert.ok([0,1].includes(n.distance));
 const id=n.edition+'|'+n.footnote_id;assert.ok(!ids.has(id),'duplicate '+id);ids.add(id);
 const original=notes.find(e=>e.edition===n.edition&&String(e.footnote_id)===String(n.footnote_id));
 assert.ok(original,'source note exists: '+id);
 assert.ok(!original.locus&&!original.candidate_locus,'proximity must not override explicit/candidate locus');
 assert.equal(original.source_paragraph,n.source_paragraph,'original DOCX paragraph must match');
 const passages=JSON.parse(read('data/structured/'+n.edition+'.json')).passages;
 const p=passages.find(x=>x.locus===n.locus);
 assert.ok(p,'target passage must exist');
 assert.equal(Math.min(...p.source_paragraphs.map(x=>Math.abs(x-n.source_paragraph))),n.distance);
 counts[n.edition]=(counts[n.edition]||0)+1;
}
assert.deepEqual(counts,{'recensio-es':25,'recensio-fr':25,'theory-en':8});
for(const ed of editions){
 const ps=JSON.parse(read('data/structured/'+ed+'.json')).passages;
 const pages=JSON.parse(read('data/'+ed+'-pages.json'));
 assert.ok(ps.length>=725);
 assert.ok(pages.length>500);
}
for(const id of ['critical-unified-form','critical-unified-query','critical-unified-results',
 'critical-unified-pdf','critical-unified-pdf-search','critical-unified-pdf-status',
 'critical-unified-pdf-results','critical-unified-pdf-more'])assert.ok(html.includes('id="'+id+'"'),id+' required');
assert.ok(html.includes('critical-lexicon-theme.css'));
assert.ok(html.includes('critical-unified-exegesis.js'));
for(const string of ['data/apparatus-nearby.json','proximity','fullPageControl','searchEntirePdfs','data/','-pages.json'])
 assert.ok(js.includes(string),'missing integration '+string);
assert.ok(css.includes('#ffe34f')&&css.includes('#242528'),'Lexicon colors and restrained controls');
console.log('OK · 811 notas conservadas; 58 relaciones no certificadas; versiones ES/FR/EN; búsqueda PDF, fuentes e interfaz Lexicon documentadas.');
