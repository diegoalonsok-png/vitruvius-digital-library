/* Editorial reports, printed checks and independent manuscript autopsy must
 * remain distinct, including when changing locus and loading another book. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
const read=p=>readFileSync(p,'utf8'),json=p=>JSON.parse(read(p));
const m=json('data/apparatus/rose-1899-critical-register.json'),checks=json('data/apparatus/source-print-checks.json');
const all=[];
for(const book of Object.values(m.books)){
 assert.equal(createHash('sha256').update(readFileSync(book.path)).digest('hex'),book.sha256);
 const data=json(book.path);assert.equal(data.source.sha256,m.source.sha256);all.push(...data.entries);
}
const entries=new Map([...all,...m.unassignedEntries].map(e=>[e.id,e]));
assert.equal(entries.size,m.counts.apparatusEntries);
assert.equal(m.loci.filter(l=>l.entries.length).length,m.counts.lociWithApparatus);
assert.equal(m.loci.length,731);
for(const e of entries.values()){
 assert.equal(e.witnessReadingStatus,'reported_by_Rose_not_independent_autopsy');
 assert.equal(e.evidenceClass,'published_editorial_apparatus');
 assert.equal(e.sourceUrl.endsWith('#Page_'+e.printedPage),true);
}
const verified=new Set();
for(const c of checks.entries.filter(c=>c.source==='Rose1899'))for(const id of c.entryIds){
 const e=entries.get(id);assert(e);assert.equal(e.printedPage,c.printedPage);
 assert.equal(e.locusMapping,'printed_source_line');verified.add(id);
}
assert(verified.size>0&&verified.size<entries.size,'An imported note is not automatically a printed check');
assert(!verified.has('Rose1899-p1-n2'),'Checking one note must not certify the whole page');
assert.match(entries.get('Rose1899-p15-n4').sourceText,/exugendo HSG\^c \(exsugendo GS\^c\)/);
assert.deepEqual(entries.get('Rose1899-p15-n4').loci,['1.4.3']);
assert.match(entries.get('Rose1899-p1-n3').sourceText,/constitutione/);
assert.deepEqual(entries.get('Rose1899-p1-n3').loci,['1.praef.2']);
assert.equal(m.counts.independentManuscriptReadingsRatified,0);

const dom=new JSDOM(read('apparatus-bude.html'),{url:'https://example.org/apparatus-bude.html?locus=1.1.1',runScripts:'outside-only'});
const w=dom.window,d=w.document,requested=[],errors=[];
w.fetch=async url=>{const path=String(url).split('?')[0];requested.push(path);return {ok:existsSync(path),status:existsSync(path)?200:404,json:async()=>json(path)}};
w.addEventListener('error',e=>errors.push(e.message));w.eval(read('assets/source-critical-register.js'));
async function until(test){for(let i=0;i<150;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}assert(test(),'Critical apparatus did not finish loading');}
const rows=()=>[...d.querySelectorAll('.ab-source-entry')];
await until(()=>rows().length===4);
assert(rows().every(e=>e.textContent.includes('cotejada con la página impresa')));
assert(!requested.some(p=>p.endsWith('liber-10.json')),'Other books should not delay initial reading');
function locus(value){w.dispatchEvent(new w.CustomEvent('vitruvius:bude-locus',{detail:{locus:value}}));}
locus('1.4.3');await until(()=>rows().length===3);
assert(rows().some(e=>e.textContent.includes('exugendo')));
locus('1.praef.2');await until(()=>rows().length===2);
const evidence=d.getElementById('source-critical-evidence');evidence.value='documentary';evidence.dispatchEvent(new w.Event('change'));
assert(rows().length>2);assert(rows().some(e=>e.textContent.includes('cotejo del impreso pendiente')));
const last=m.loci.find(l=>l.locus.startsWith('10.')&&l.entries.length);locus(last.locus);
await until(()=>requested.some(p=>p.endsWith('liber-10.json'))&&rows().some(e=>e.querySelector('h4').textContent.startsWith('X.')));
assert.deepEqual(errors,[]);w.close();
console.log(`PASS: ${entries.size} attributed Rose reports, ${m.counts.lociWithApparatus} documentary loci, ${verified.size} individually checked notes; evidence filter and lazy book navigation.`);
