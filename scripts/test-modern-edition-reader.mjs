import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import * as search from '../assets/modern-edition-search.mjs';
const source=readFileSync('assets/rose-krohn-harleianus-reader.mjs','utf8').replace(/^import .*;$/m,'').replace('const readingTask=load();','const readingTask=load(); window.readerReady=readingTask;');
const pause=()=>new Promise(r=>setImmediate(r));
for(const id of ['rose-1899','krohn-1912']){
 const dom=new JSDOM(readFileSync(id+'.html','utf8'),{url:'https://example.edu/library/'+id+'.html',runScripts:'outside-only'});
 const w=dom.window;Object.assign(w,search);w.AbortSignal=AbortSignal;w.HTMLElement.prototype.scrollIntoView=()=>{};
 const base='https://libros.vitruvius-digital-library.org/folios/'+id+'/';
 const folios=Array.from({length:55},(_,i)=>({imagenDigital:i+1,imagen:base+'imagen-'+(i+1)+'.jpg',miniatura:base+'miniatura-'+(i+1)+'.jpg',texto:base+'ocr/'+(i+1)+'.json'}));
 const text='Symmetria et decor. Firmitas, utilitas, venustas.';
 const pages=folios.map((_,i)=>({page:i+1,text}));
 const words=[{text:'Symmetria',start:0,end:9,x:.2,y:.2,w:.15,h:.02},{text:'decor',start:13,end:18,x:.4,y:.2,w:.08,h:.02}];
 w.fetch=async url=>{
  const path=String(url);let value=null;
  if(path===`data/r2/folios/${id}.json`)value={schema:'vdl-folios-obra-1',obra:id,imagenes:55,folios};
  if(path.endsWith(id+'-ocr.json'))value={schema:'vdl-edition-ocr-1',edition:id,pages};
  if(path.endsWith(id+'-loci.json'))value={loci:{'1.2.3':{page:7,status:'strong_textual_candidate'},'2.praef.1':{page:15,status:'ambiguous_textual_candidate',runner_up_page:16}}};
  if(path.startsWith(base+'ocr/')){const page=Number(path.match(/(\d+)\.json$/)[1]);value={schema:'vdl-page-ocr-1',edition:id,page,text,words};}
  return {ok:value!==null,status:value?200:404,json:async()=>value};
 };
 w.eval(source);await w.readerReady;await pause();
 const $=id=>w.document.getElementById(id);
 assert.equal(w.document.querySelectorAll('#h-folio-grid button').length,48);
 assert.equal($('page').value,'5');
 const img=$('folio');Object.defineProperty(img,'naturalWidth',{value:1200});Object.defineProperty(img,'naturalHeight',{value:1800});img.dispatchEvent(new w.Event('load'));
 w.document.querySelector('#h-folio-grid [data-page="7"]').click();await pause();
 assert.equal($('page').value,'7');assert.equal(w.document.querySelector('[data-page="7"]').getAttribute('aria-pressed'),'true');
 assert.equal($('folio').getAttribute('src'),folios[6].imagen);
 $('zoom-in').click();assert.equal($('zval').textContent,'125%');
 $('negative').checked=true;$('negative').dispatchEvent(new w.Event('change'));assert.match(img.style.filter,/invert\(1\)/);
 $('zoom-fit').click();assert.equal($('zval').textContent,'100%');
 $('h-gallery-more').click();assert.equal(w.document.querySelectorAll('#h-folio-grid button').length,55);
 $('h-gallery-query').value='imagen 55';$('gallery-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.equal(w.document.querySelectorAll('#h-folio-grid button').length,1);
 w.document.querySelector('[data-term="symmetria"]').click();await pause();assert.match($('search-status').textContent,/55 páginas/);assert.ok($('search-results').querySelector('mark'));assert.ok($('image-highlights').querySelector('.image-hit'));
 $('search-results').querySelector('button').click();await pause();assert.equal($('page').value,'1');
 $('edition-query').value='I.2.3';$('edition-search-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await pause();assert.match($('search-results').textContent,/Vitr\. 1\.2\.3/);
 $('search-results').querySelector('button').click();await pause();assert.equal($('page').value,'7');
 $('preface-pick').value='2.praef';$('preface-pick').dispatchEvent(new w.Event('change'));await pause();assert.match($('search-results').textContent,/ambigua/);assert.equal($('search-results').querySelectorAll('button').length,2);
 $('search-clear').click();assert.equal($('search-results').childElementCount,0);
 // User marks remain page-specific and can be cleared without altering the scan.
 w.localStorage.setItem('vdl-marks-'+id+'-7',JSON.stringify([{x:.2,y:.3,w:.1,h:.004}]));$('key-highlights').dispatchEvent(new w.Event('change'));assert.ok($('image-highlights').querySelector('.manual'));
 $('clear-marks').click();assert.equal($('image-highlights').querySelector('.manual'),null);
 dom.window.close();
}
console.log('PASS: both viewers boot, 55 thumbnails, click-to-open, zoom, inversion, image highlights, phrases/loci/prefaces, pagination and local annotations');
