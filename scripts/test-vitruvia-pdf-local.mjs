import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('assets/vitruvia-pdf-local.js');
const visual=read('assets/vitruvia-visual-import.js');
const css=read('assets/vitruvia-visual-import.css');
const html=read('vitruvia.html');
const window={};
vm.runInNewContext(js,{window,console,URL},{timeout:1000});
const pdf=window.VitruviaPDFLocal;
assert.equal(pdf.version,'1.0');
assert.equal(pdf.MAX_FILE_SIZE,15*1024*1024);
assert.equal(pdf.MAX_PAGES,150);
assert.equal(pdf.fold('Filosofía griega'), 'filosofia griega');
const pages=[
 {page:1,text:'Este capítulo trata de arquitectura romana y sus fundamentos en el tratado de Vitruvio.'},
 {page:2,text:'Lucrecio explica el movimiento y la teoría de los átomos de la naturaleza.'},
 {page:3,text:'De rerum natura ofrece versos filosóficos escritos en lengua latina.'},
 {page:4,text:'La filosofía griega es importante para el pensamiento antiguo.'}
];
const match=pdf.search(pages,'filosofia griega');
assert.equal(match.length,1);
assert.equal(match[0].page,4);
assert.match(match[0].excerpt,/filosofía griega/);
assert.equal(pdf.search(pages,'No existe esta expresión').length,0);
assert.equal(pdf.search(pages,'De rerum natura')[0].page,3);
assert.equal(pdf.search(pages,'arquitectura romana')[0].page,1);
assert(js.includes('await file.arrayBuffer()'),'PDF must be read locally from a File/Blob');
assert(js.includes('data:binary'),'PDF bytes must never be sent to an external URL');
assert(js.includes('await task?.destroy()'),'PDF worker/document must be cleaned up');
assert(js.includes('binary.fill(0)'),'Attempt to wipe the temporary byte array');
assert(js.includes("if(signal?.aborted)"),'Processing must be cancellable');
assert(js.includes('Math.min(MAX_PAGES'),'PDF pages must be bounded');
assert(js.includes('MAX_CHARACTERS'),'Extracted text must be bounded');
assert(js.includes('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/'),'Pinned lazily loaded PDF.js required');
assert(!/localStorage|sessionStorage|indexedDB|XMLHttpRequest|fetch\(|sendBeacon|FormData|navigator\.sendBeacon/.test(js),'No persistence or upload in parser');
assert(visual.includes('id="vr-visual-pick-pdf"'),'PDF upload must have a dedicated button');
assert(visual.includes('id="vr-visual-pdf-search"'),'Search inside PDF must be independent of public Vitruvia search');
assert(visual.includes('parser.extract(selection.file'),'PDF must actually be parsed, not just filename-searched');
assert(visual.includes('parser.search(pdfPages,term'),'PDF search must operate on local text');
assert(visual.includes('selection.file=null'),'Original file reference must be dropped after extraction');
assert(visual.includes('pdfAbort?.abort();pdfAbort=null;pdfPages=null'),'PDF indexing and excerpts must clear on close/search');
assert(visual.includes('ui.pdfResults.replaceChildren()'),'No result snippets should persist after closing');
assert(visual.includes('document.createElement(\\'li\\')'),'Results should be safely escaped as text nodes');
assert(visual.includes('excerpt.textContent=item.excerpt'),'Never parse PDF text as HTML');
assert(!visual.includes('fetch(')&&!visual.includes('XMLHttpRequest'),'Attachment UI must not upload content');
assert(css.includes('.vr-visual-pdf-results'),'Local PDF search results styled');
assert(html.indexOf('assets/vitruvia-pdf-local.js?v=20261104-private-pdf-v1')>0);
assert(html.indexOf('assets/vitruvia-visual-import.js?v=20261104-private-pdf-v2')>html.indexOf('assets/vitruvia-pdf-local.js?v=20261104-private-pdf-v1'));
console.log('PASS: independent, bounded, offline-file PDF extraction and local search; no uploads or persistent file storage');
