/* Vitruvia IA minimal-interface regression. Run with: node scripts/test-vitruvia-ia-interface.mjs */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../vitruvia-ia.html',import.meta.url),'utf8');
for(const id of ['ia-palette','ia-theme','ia-custom-color','file','question','send','clear','conversation','file-info']){
 assert.match(html,new RegExp('id="'+id+'"'),id+' control missing');
}
assert.equal((html.match(/class="ia-swatch"/g)||[]).length,9,'Same 3x3 swatch layout as Lexicon');
assert.match(html,/\.pdf,\.docx,\.txt/,'Document input must retain PDF/DOCX/TXT');
assert.match(html,/fileInput\.addEventListener\('change'/,'Actual document loading handler must remain');
assert.match(html,/getDocument\(\{data:bytes/,'PDF extraction must remain local');
assert.match(html,/document\.getElementById\('send'\)\.addEventListener\('click'/,'Send button must submit');
assert.match(html,/q\.addEventListener\('keydown'/,'Enter must continue to submit');
assert.match(html,/palette\.open=false/,'Swatch closes palette after selection');
assert.match(html,/brightness>\.62\?'light':'dark'/,'Dark/light contrast must follow chosen color');
assert.match(html,/root\.style\.setProperty\('--ia-paper',hex\)/,'Palette must change background');
assert.match(html,/async function webResearch/,'Internet search must remain');
assert.match(html,/async function ask\(/,'Question dispatch must remain');
assert.match(html,/window\.addEventListener\('pagehide'/,'Temporary data cleanup must remain');
assert.doesNotMatch(html,/localStorage\.|sessionStorage\./,'No persistence of document data');
assert.match(html,/max-width:100%|width:min\(100%,920px\)/,'Responsive content width');
console.log('PASS Vitruvia IA: chat layout, 9 swatches, light/dark, send, local PDF/DOCX/TXT and web research preserved.');
