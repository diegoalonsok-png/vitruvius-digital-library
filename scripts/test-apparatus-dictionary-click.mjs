/* Browser-like regression: an actual click on a highlighted search term
 * must display the existing scholarly dictionary card, including results
 * added asynchronously by the critical apparatus catalogue. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const html='<!doctype html><html lang="es"><head></head><body>'+
 '<div id="critical-results"></div>'+
 '<div id="critical-unified-results"></div>'+
 '<div id="critical-comparison"></div>'+
 '<div id="apparatus-catalog-results"><article class="ac-ficha">'+
 '<p>... <mark>symmetria</mark> et eurythmia ...</p></article></div>'+
 '</body></html>';
const dom=new JSDOM(html,{url:'https://vitruvius-digital-library.org/aparato-critico',
 runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;
let dictionaryRequests=0;
w.fetch=async path=>{
 assert.match(String(path),/data\/latin-lexicon\.json$/,'Only the lexical file is requested by this test');
 dictionaryRequests++;
 return {ok:true,json:async()=>({entries:[
  {lemma:'symmetria',es:'correspondencia proporcional',pos:'sustantivo femenino',forms:[]},
  {lemma:'domus',es:'casa o vivienda',pos:'sustantivo femenino',forms:[]}
 ]})};
};
w.eval(readFileSync('assets/inline-lexical-card.js','utf8'));
w.eval(readFileSync('assets/critical-lexical-bridge.js','utf8'));
const root=w.document.getElementById('apparatus-catalog-results');
const first=root.querySelector('mark');
assert.equal(first.dataset.criticalLexicalReady,'1','Existing catalog highlight must be bound');
assert.equal(first.getAttribute('role'),'button');
assert.equal(first.getAttribute('tabindex'),'0');
assert.match(first.getAttribute('aria-label'),/Abrir diccionario/);
assert.equal(dictionaryRequests,0,'Dictionary loads only on click');
first.click();
await new Promise(resolve=>setTimeout(resolve,40));
const popup=w.document.getElementById('vitruvius-lexical-card');
assert.ok(popup,'Existing scholarly card exists');
assert.equal(popup.hidden,false,'Click on highlighted symmetria must open the card');
assert.equal(popup.querySelector('h3').textContent,'symmetria');
assert.match(popup.querySelector('.vlc-content').textContent,/correspondencia proporcional/);
assert.equal(dictionaryRequests,1);
const dynamic=w.document.createElement('article');
dynamic.className='ac-ficha';
dynamic.innerHTML='<p>... <mark>domus</mark> ...</p>';
root.append(dynamic);
await new Promise(resolve=>setTimeout(resolve,10));
const second=dynamic.querySelector('mark');
assert.equal(second.dataset.criticalLexicalReady,'1','Dynamic article highlight must be bound');
second.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
await new Promise(resolve=>setTimeout(resolve,30));
assert.equal(popup.hidden,false);
assert.equal(popup.querySelector('h3').textContent,'domus');
assert.equal(dictionaryRequests,1,'The lexical data should be cached');
w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
assert.equal(popup.hidden,true,'Escape closes the dictionary');
first.click();
assert.equal(popup.hidden,false,'Reopening the same word should work');
w.close();
console.log('PASS: direct click, keyboard access, dynamic apparatus search marks, live glossary card, no initial lexical download.');
