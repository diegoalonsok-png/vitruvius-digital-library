import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {highlightSearchTerms} from '../assets/search-term-highlight.mjs';
import {pdfReferenceAnchor,resolvedPDFPage} from '../assets/search-pdf-reference.mjs';
import * as linked from '../assets/classics-linked-highlight-core.mjs';
const read=p=>readFileSync(p,'utf8'),json=p=>JSON.parse(read(p));
const references=json('data/search-pdf-references.json');
for(const [id,page] of [['recensio-es',226],['recensio-fr',228],['theory-en',274]]){
 const p=json(`data/structured/${id}.json`).passages.find(p=>p.locus==='1.2.4');
 assert.equal(resolvedPDFPage(p,'latin',references.editions[id].loci[p.locus]),page);
 assert.equal(resolvedPDFPage({...p,pdf_pages:{},latin:'A different passage'},'latin',references.editions[id].loci[p.locus]),null,'Never reuse another passage’s PDF anchor');
}
for(const [id,edition] of Object.entries(references.editions)){
 const normal=s=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/æ/g,'ae').replace(/œ/g,'oe').replace(/ſ/g,'s').replace(/v/g,'u').replace(/j/g,'i').replace(/[^\p{L}]/gu,'');
 const pages=json(edition.pdfTextPath).map(p=>({page:p.page,text:normal(p.text)}));
 for(const [locus,fields] of Object.entries(edition.loci))for(const e of Object.values(fields)){
  assert(e.anchor.length>=80,locus);assert.deepEqual(pages.filter(p=>p.text.includes(e.anchor)).map(p=>p.page),[e.page],id+' '+locus+' must have exactly one matching PDF page');
 }
}
assert.equal(pdfReferenceAnchor('uni-\nversae 25 figu\ufb01ra'),pdfReferenceAnchor('universae figufira'));
const h=highlightSearchTerms('Symmetria et symmetriarvm <script>fuga</script>.','symmetria');
assert.equal((h.match(/<mark /g)||[]).length,2);assert(!h.includes('<script>'));assert(h.includes('&lt;script&gt;'));
assert(!highlightSearchTerms('asymmetria','symmetria').includes('<mark'));
assert.match(highlightSearchTerms('opus est. Opus magnum est.','opus magnum',{mode:'phrase'}),/>Opus magnum<\/mark>/);
for(const [lang,text,word] of [['es','El sacerdote invoca a Apolo.','Apolo'],['en','The priest invokes Apollo.','Apollo'],['fr','Le prêtre invoque Apollon.','Apollon']]){
 const c=linked.equivalentCandidates({word:'Ἀπόλλωνα',lemmas:['Ἀπόλλων'],sourceLanguage:'grc',targetLanguage:lang,entries:[{gloss:'wnos, o(, Apollo, the god'}]});
 assert.deepEqual(linked.equivalentSpans(text,c).map(s=>s.text),[word]);
 assert.deepEqual(linked.equivalentSpans('The priest returns safely.',c),[]);
 assert.deepEqual(linked.equivalentSpans('O goddess, hear.',c),[],'A dictionary’s grammatical article must not be marked as a name equivalent');
}
assert.deepEqual(linked.equivalentSpans('La casa contiene un atrio.',linked.equivalentCandidates({word:'domum',sourceLanguage:'la',targetLanguage:'es'})).map(s=>s.text),['casa']);

const settle=async(fn)=>{for(let i=0;i<180;i++){if(fn())return;await new Promise(r=>setTimeout(r,5));}assert(fn(),'Timed out waiting for a reader state');};
for(const work of ['homer-iliad','homer-odyssey','caesar-gallico']){
 const dom=new JSDOM('<article class="reader"><div id="passages" lang="grc"><p><span class="locus">1.1</span><span>Ἀπόλλωνα</span></p></div><div id="lexicon"></div><div id="hit-nav"></div></article>',{url:`https://example.org/classics-text-reader?work=${work}&lang=grc&to=es&locus=1.1`,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,calls=[],pending=[];w.matchMedia=()=>({matches:false});
 w.VitruviaInlineTranslation={translate:(text,source,target)=>{calls.push({text,source,target});return new Promise(resolve=>pending.push({target,resolve}));}};
 w.ClassicsLocusPairing={find:(entry,rows)=>({kind:'same-locus',passages:rows.filter(p=>p.locus===entry.locus)})};
 w.fetch=async()=>({ok:true,json:async()=>({passages:[{locus:'1.1',text:'Apollo returns.'}]})});
 w.eval(read('assets/classics-inline-parallel.js'));
 const select=d.querySelector('.cl-translation-tools select'),output=d.querySelector('.cl-translation-output');
 const entry={work,language:work==='caesar-gallico'?'la':'grc',locus:'1.1',text:work==='caesar-gallico'?'Apollo redit.':'Ἀπόλλωνα',editions:[{workId:work,language:'en',format:'json-passages',path:'data/classics-corpus/'+work+'-en.json'}]};
 d.dispatchEvent(new w.CustomEvent('vitruvia:classics-passage',{detail:entry}));
 assert.equal(calls.length,0,'No network translation before activation');assert(!output.textContent.includes('Apollo returns'));
 d.querySelector('.cl-translation-tools button').click();assert.equal(calls.at(-1).target,'es');
 select.value='fr';select.dispatchEvent(new w.Event('change'));assert.equal(calls.at(-1).target,'fr');
 pending.find(p=>p.target==='fr').resolve({text:'Apollon revient.',provider:'Test'});await settle(()=>output.querySelector('p'));
 pending.find(p=>p.target==='es').resolve({text:'RESPUESTA VIEJA',provider:'Test'});await new Promise(r=>setTimeout(r,5));
 assert.equal(output.querySelector('p').textContent,'Apollon revient.');assert.equal(output.lang,'fr');
 select.value='en';select.dispatchEvent(new w.Event('change'));await settle(()=>output.textContent.includes('Apollo returns.'));
 assert.equal(calls.length,2,'A published English version takes priority over the automatic provider');
 select.value='es';select.dispatchEvent(new w.Event('change'));pending.at(-1).resolve({text:'Apolo vuelve a la ciudad de la diosa.',provider:'Test'});await settle(()=>output.textContent.includes('Apolo vuelve'));
 d.documentElement.lang='en';w.Translator={availability:async()=> 'available',create:async()=>({translate:async t=>'INCORRECT UI TRANSLATION '+t})};
 w.eval(read('assets/page-autotranslate.js'));await w.PageAutoTranslate.sync();
 assert.equal(output.querySelector('p').textContent,'Apolo vuelve a la ciudad de la diosa.','UI English must never rewrite the requested Spanish reading');
 assert.equal(output.lang,'es');assert.equal(select.value,'es');
 w.close();
}

// Native selection and saved annotations must produce a matching, removable
// target mark without changing either source text.
{
 const dom=new JSDOM('<article class="reader"><div id="passages" lang="grc"><p><span class="locus">1.1</span><span>Ἀπόλλωνα</span></p></div><div id="lexicon"></div><div id="hit-nav"></div></article>',{url:'https://example.org/classics-text-reader?work=homer-iliad&lang=grc&to=es&locus=1.1',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;w.matchMedia=()=>({matches:false});w.CSS={highlights:new Map()};w.Highlight=class{constructor(...ranges){this.ranges=ranges;}};
 w.ClassicalLexicon={lookup:async()=>({via:'form',entries:[{lemma:'Ἀπόλλων',gloss:'',es:''}]})};
 w.LinkedHighlightCore=linked;w.fetch=async()=>({ok:true,json:async()=>({concepts:[]})});
 w.VitruviaInlineTranslation={translate:async()=>({text:'Apolo vuelve.',provider:'Test'})};
 w.eval(read('assets/classics-inline-parallel.js'));
 d.dispatchEvent(new w.CustomEvent('vitruvia:classics-passage',{detail:{work:'homer-iliad',language:'grc',locus:'1.1',text:'Ἀπόλλωνα',editions:[]}}));
 d.querySelector('.cl-translation-tools button').click();await settle(()=>d.querySelector('.cl-translation-output p'));
 w.eval(read('assets/classics-reader-annotations.js'));w.eval(read('assets/classics-translation-annotations.js'));
 w.eval(read('assets/classics-linked-highlights.js').replace("const core=import('./classics-linked-highlight-core.mjs?v=20261121-linked-words-v2');",'const core=Promise.resolve(window.LinkedHighlightCore);'));
 const original=d.querySelector('#passages p>span:not(.locus)'),selection=w.getSelection(),range=d.createRange();range.selectNodeContents(original);selection.removeAllRanges();selection.addRange(range);d.dispatchEvent(new w.Event('selectionchange'));
 await settle(()=>d.querySelector('.cl-translation-output').dataset.linkedEquivalent==='Apolo');
 assert(w.CSS.highlights.has('vdl-linked-equivalent'));
 d.querySelector('.vdl-annotation-bar [data-action="mark"]').click();
 const savedKey=()=>Object.keys(w.localStorage).find(k=>k.startsWith('vdl.marks.auto.')&&JSON.parse(w.localStorage.getItem(k)||'[]').some(x=>x.linkedSource));
 await settle(()=>savedKey());const key=savedKey();
 assert(JSON.parse(w.localStorage.getItem(key)).some(x=>x.linkedSource&&x.mode==='underline'));
 assert.equal(original.textContent,'Ἀπόλλωνα');assert.equal(d.querySelector('.cl-translation-output p').textContent,'Apolo vuelve.');
 d.querySelector('.vdl-annotation-bar [data-action="clear"]').click();
 assert(!JSON.parse(w.localStorage.getItem(key)).some(x=>x.linkedSource));w.close();
}

// Execute the actual catalogue renderer with the current seven local sources.
{
 const dom=new JSDOM('<div data-vdl-works-explorer></div>',{url:'https://example.org/',runScripts:'outside-only'}),w=dom.window;
 w.fetch=async path=>({ok:true,json:async()=>json(String(path))});w.eval(read('assets/bibliotheca-works-explorer.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const search=w.document.querySelector('.vdl-works-search');search.value='homero';search.dispatchEvent(new w.Event('input'));
 await settle(()=>w.document.querySelector('.vdl-works-translations'));
 const rows=[...w.document.querySelectorAll('.vdl-works-row')];
 assert(rows.some(row=>/Ilíada|Ἰλιάς/.test(row.textContent)&&/Samuel Butler/.test(row.querySelector('.vdl-works-translations').textContent)));
 assert(rows.some(row=>/Odisea|Ὀδύσσεια/.test(row.textContent)&&/inglés/.test(row.querySelector('.vdl-works-translations').textContent)));
 assert(rows.some(row=>/Himnos|ὕμνοι/.test(row.textContent)&&/Sin traducción humana registrada/.test(row.textContent)));
 assert(rows.some(row=>/Quinto de Esmirna/.test(row.textContent)&&/Arthur Sanders Way/.test(row.querySelector('.vdl-works-translations').textContent)&&row.querySelector('.vdl-works-translations a')?.href.includes('quinto-esmirna-posthomericas.pdf')),'A documented translated PDF must be disclosed even without an indexed translation');
 w.close();
}
console.log('PASS: unique PDF page anchors, escaped inflection and phrase underlines, Apollo and Latin equivalences, ES/EN/FR selection in three works, stale results discarded, English UI preserves Spanish reading, catalogue translation attribution.');
