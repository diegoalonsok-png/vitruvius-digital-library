#!/usr/bin/env node
/* Historical OCR search contract. Tests provenance, Unicode normalization,
 * separation between OCR page and Cesariano IIIF image, and lexical/expanded
 * matching. Does not validate readings or change source OCR/PDFs. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('assets/vitruvia-historical-paragraphs.js','utf8');
const context={window:{}};
vm.runInNewContext(source,context,{filename:'vitruvia-historical-paragraphs.js'});
const x=context.window.VitruviaHistoricalParagraphs;
assert.ok(x,'Historical OCR browser search should expose its documented API');

assert.equal(x.norm('Ædificatio ſymmetria VITRVVIVS'),'aedificatio symmetria uitruuius');
assert.equal(x.norm('Œconomia atque coërcitio'),'oeconomia atque coercitio');
const raw='Architectura est scientia pluribus disciplinis et variis eruditionibus ornata. '
 +'Symmetria et proportio in architectura sunt notiones ad textum illustrandum.';
const pages=[{page:12,text:raw},{page:13,text:'Aqua et ventus ad aedificium pertinent in architectura et constructione veteri.'}];
const idx=x.paragraphIndex('krohn',pages);
assert.equal(idx.sourcePages,2);
assert.ok(idx.units.length>=2);
for(const row of idx.units){
 assert.equal(row.evidence,'ocr_unverified');
 assert.equal(row.locus,null);
 assert.equal(row.locusStatus,'not_aligned');
 assert.ok(row.sourceFile.endsWith('krohn-1912.json'));
 assert.ok(Number.isInteger(row.page));
}
const literal=x.rankRows(idx.units,'symmetria','literal',5);
assert.ok(literal.length>=1);
assert.equal(literal[0].page,12);
assert.equal(literal[0].method,'bm25_ocr_text');
const expanded=x.rankRows(idx.units,'proporción','conceptual',5);
assert.ok(expanded.some(r=>r.page===12),'Controlled concept expansion should find Latin proportio');
assert.equal(x.rankRows(idx.units,'proporción','literal',5).length,0,
 'A Spanish concept must not be mislabeled as a literal Latin OCR match');
assert.equal(x.pageURL({edition:'krohn',page:12}),'documents/krohn-1912.pdf#page=12');
assert.equal(x.pageURL({edition:'rose',page:12}),
 'https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf#page=12');
assert.equal(x.pageURL({edition:'cesariano',page:12}),'cesariano-1521.html',
 'Never conflate Cesariano OCR page with unverified IIIF image position');
const html=readFileSync('buscador-parrafos-vitruvio.html','utf8');
assert.match(html,/imagen aún no alineada con página OCR/);
assert.match(readFileSync('vitruvia.html','utf8'),/vitruvia-historical-paragraphs\.js/);
console.log('PASS: historical OCR Unicode, ranking, provenance and unverified Cesariano IIIF safeguards');
