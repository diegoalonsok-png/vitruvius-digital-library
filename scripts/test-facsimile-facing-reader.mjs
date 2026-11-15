import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {translationPieces} from '../assets/modern-edition-parallel-core.mjs';
const html=readFileSync('buscador-facsimiles-clasicos.html','utf8');
const catalog=JSON.parse(readFileSync('data/r2/catalogo-clasicos-r2.json','utf8'));
const item=catalog.items.find(x=>x.id==='accius-fragmenta');assert(item);
const body='Architectura ex symmetria constat et decor servatur. '.repeat(150);
const pages=['',body,'Firmitas utilitas et venustas in hac pagina.'];
const ui=readFileSync('assets/facsimile-facing-reader.mjs','utf8').replace(/^import .*;$/m,'');
const settle=async()=>{for(let i=0;i<6;i++)await new Promise(r=>setImmediate(r));};
for(const explicitCover of [false,true]){
 const dom=new JSDOM(html,{url:'https://example.org/buscador-facsimiles-clasicos?obra=accius-fragmenta'+(explicitCover?'&pagina=1':''),runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,$=id=>w.document.getElementById(id);w.translationPieces=translationPieces;w.scrollTo=()=>{};
 w.HTMLCanvasElement.prototype.getContext=()=>({});
 const pdfPages=[],calls=[];let pendingA;
 w.pdfjsLib={GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.resolve({numPages:40,getPage:async n=>{
  pdfPages.push(n);return{getViewport:({scale})=>({width:500*scale,height:750*scale}),render:()=>({promise:Promise.resolve(),cancel(){}}),getTextContent:async()=>({items:[]})};
 }})})};
 w.VitruviaInlineTranslation={translate:async(text,source,target)=>{calls.push({text,source,target});if(text==='LATIN A')return new Promise(resolve=>pendingA=resolve);return{text:'VERSIÓN '+target+' '+text,provider:'Test provider',partial:false};}};
 w.fetch=async url=>{const path=String(url);let data;
  if(path==='data/r2/catalogo-clasicos-r2.json')data=catalog;
  else if(path==='data/classics-historical-pages/coverage.json')data={records:[]};
  else if(path===item.texto)data={schema:'vdl-r2-texto-paginas-1',obra:item.id,paginas:pages};
  return{ok:!!data,status:data?200:404,json:async()=>data};
 };
 w.eval(readFileSync('assets/classics-academic-reader.js','utf8'));
 w.eval('(()=>{'+ui+'})()');
 const reader=[...w.document.querySelectorAll('script:not([src])')].map(s=>s.textContent).find(s=>s.includes('const cache=new Map();let locales='));assert(reader);
 w.eval('window.readerReady='+reader);await w.readerReady;await settle();
 assert.equal($('pageno').value,explicitCover?'1':'2');
 assert.equal($('facing-mode').value,'translation');assert.equal($('ocr-section').hidden,true);assert.equal($('translation-section').hidden,false);
 if(explicitCover){assert.equal(calls.length,0);assert.match($('facing-translation').textContent,/no contiene texto OCR/);dom.window.close();continue;}
 assert.equal($('folio').textContent,body);assert.ok(pdfPages.includes(2));assert.match($('facsimile-canvas').getAttribute('aria-label'),/Página digital 2/);
 assert.ok(calls.length>2,'Long page source must be translated in full');
 assert.equal(calls.map(x=>x.text).join(' ').replace(/\s+/g,' ').trim(),body.trim(),'No text after the provider limit may disappear');
 assert.match($('facing-translation').textContent,/VERSIÓN es/);assert.match($('translation-status').textContent,/procesada completa/);
 $('next').click();await settle();assert.equal($('pageno').value,'3');assert.match($('translation-page-label').textContent,/3/);assert.ok(pdfPages.includes(3));assert.match($('facing-translation').textContent,/Firmitas/);
 const emit=(page,text)=>w.document.dispatchEvent(new w.CustomEvent('vdl:facsimile-page',{detail:{edition:'r2:'+item.id,page,total:40,text,pdf:item.pdf,language:'la',originalLanguage:'la'}}));
 emit(4,'LATIN A');await settle();assert.ok(pendingA);
 emit(5,'LATIN B');await settle();pendingA({text:'OLD PAGE A',provider:'Test',partial:false});await settle();assert.match($('facing-translation').textContent,/LATIN B/);assert.doesNotMatch($('facing-translation').textContent,/OLD PAGE A/);
 $('facing-auto').checked=false;$('facing-auto').dispatchEvent(new w.Event('change'));const before=calls.length;emit(6,'LATIN C');await settle();assert.equal(calls.length,before,'Stopping automatic mode prevents new requests');
 $('facing-mode').value='ocr';$('facing-mode').dispatchEvent(new w.Event('change'));assert.equal($('ocr-section').hidden,false);assert.equal($('folio').textContent,'LATIN C');assert.equal($('folio').getAttribute('translate'),'no');
 $('facing-mode').value='pdf';$('facing-mode').dispatchEvent(new w.Event('change'));assert(w.document.querySelector('.cl-pdf-panel'),'PDF comparison is available beside the original');
 $('facing-mode').value='translation';$('facing-mode').dispatchEvent(new w.Event('change'));
 $('facing-editable-ocr').value='Corrected Latin text';$('facing-use-edited').click();await settle();assert.match($('facing-translation').textContent,/Corrected Latin text/);assert.equal($('folio').textContent,'LATIN C','OCR edits must not overwrite the imported original');
 dom.window.close();
}
console.log('PASS: Accius PDF/OCR identity, useful initial page, explicit covers, default facing translation, complete long-page translation, matching PDF leaf, page sync, late-response protection and stopping requests');
