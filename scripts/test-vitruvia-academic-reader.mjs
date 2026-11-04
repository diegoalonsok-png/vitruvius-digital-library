/* Regression checks: scholarly reading tools must not corrupt text. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const window={};
runInNewContext(load('assets/vitruvia-academic-reader.js'),{
  window, document:{getElementById:()=>null}
});
const match=window.VitruviaAcademicReader?.findMatches;
assert.equal(typeof match,'function','Academic reader matcher missing');
const text='Jerusalén y Jerusalén. Texto 📜 después: Cicerón.';
const a=match(text,'jerusalen');
assert.equal(a.length,2,'Accent-insensitive search must find both mentions');
assert.equal(text.slice(a[0][0],a[0][1]),'Jerusalén');
assert.equal(text.slice(a[1][0],a[1][1]),'Jerusalén');
const b=match(text,'CICERON');
assert.equal(b.length,1,'Case and accent folding after emoji');
assert.equal(text.slice(b[0][0],b[0][1]),'Cicerón');
assert.equal(match(text,'').length,0,'Empty query must not create marks');
assert.equal(match('Roma Roma Roma','roma',2).length,2,'Find count must remain bounded');
const editorial='Códice: Αἰθήρ. Manuscritos y ediciones.';
assert.equal(editorial.slice(...match(editorial,'codice')[0]),'Códice');
const html=load('vitruvia.html');
for(const suffix of ['vitruvia-academic-reader.js','vitruvia-academic-reader.css',
                     'vitruvia-floating-reader.js','vitruvia-floating-reader.css'])
  assert(html.includes(suffix), 'Missing linked asset: '+suffix);
const source=load('assets/vitruvia-article.js');
assert(source.includes('data-vr-origin'),'Source provenance is not propagated');
assert(source.includes('function appendBiographyExtract(raw,sourceURL='),'Missing source-aware extract rendering');
assert(load('assets/vitruvia-academic-reader.css').includes('@media print'),'Print must hide navigation');
console.log('PASS Vitruvia academic reading: Unicode search, source attribution and asset links');
