/* The simple reader must send main text to translation while retaining the
 * exact imported source and its editorial notes at every locus. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>readFileSync(p,'utf8'),json=p=>JSON.parse(read(p));
const dom=new JSDOM(read('classics-simple-parallel.html'),{url:'https://example.org/classics-simple-parallel.html?work=clement-2&left=grc&right=auto-es&locus=1.2',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,d=w.document,calls=[],errors=[];
w.fetch=async url=>{const path=String(url).split('?')[0];return {ok:existsSync(path),status:existsSync(path)?200:404,json:async()=>json(path)}};
w.HTMLElement.prototype.scrollIntoView=function(){};
w.VitruviaInlineTranslation={translate:async(text,source,target)=>{calls.push({text,source,target});return {text:'Traducción de prueba: contenido del pasaje.',provider:'Prueba determinista'}}};
w.addEventListener('error',e=>errors.push(e.message));
w.eval(read('assets/classics-academic-reader.js'));
for(const script of d.querySelectorAll('script:not([src])'))w.eval(script.textContent);
async function until(test){for(let i=0;i<180;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}assert(test(),'Simple reader did not finish loading');}
await until(()=>calls.length===1&&d.querySelector('#bude-comments-body details p'));
assert(!d.querySelector('#left-text').textContent.includes('AC.'));
assert(!calls[0].text.includes('AC.'));
assert.match(d.querySelector('#bude-comments-body').textContent,/AC\./);
assert.equal(d.querySelector('#bude-comments-body details p').textContent,json('data/classics-corpus/clement-2-grc.json').passages[1].text);
assert.equal(calls[0].source,'grc');assert.equal(calls[0].target,'es');
d.getElementById('previous').click();await until(()=>calls.length===2);
assert.match(d.querySelector('#bude-comments-body').textContent,/Acts 10, 12/);
assert(!d.querySelector('#left-text').textContent.includes('Acts'));
assert(!calls[1].text.includes('Acts'));
const before=d.querySelector('#left-text').textContent;d.getElementById('go-locus').value='999.999';d.getElementById('go-button').click();
assert.equal(d.querySelector('#left-text').textContent,before);assert.match(d.getElementById('note').textContent,/No se encontró/);
assert.deepEqual(errors,[]);w.close();
console.log('PASS: simple reader separates source-identified notes, preserves raw text, translates main text and navigates Clement II 1.1–1.2.');
