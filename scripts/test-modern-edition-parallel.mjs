import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import * as core from '../assets/modern-edition-parallel-core.mjs';
import * as search from '../assets/modern-edition-search.mjs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const es=read('data/structured/recensio-es.json'),fr=read('data/structured/recensio-fr.json');
const rows=core.combineEditions(es,fr);assert.equal(rows.length,731);
assert.equal(core.locusLabel('2.praef.5'),'II, praef. 5');
for(const id of ['rose-1899','krohn-1912']){
 const map=read('data/r2/folios/'+id+'-parallel.json');
 assert.equal(new Set(map.pages.flatMap(p=>p.loci.map(x=>x.locus))).size,731,'Keep every indexed locus');
 const query=core.createParallelSearch(rows,map);
 assert.ok(query('symétrie','concept','fr').length>0,'French concepts find actual French text, including retained Latin terminology');
 assert.ok(query('solidez','concept','es').length>0);
 assert.ok(query('convenance','concept','la').length>0);
 assert.ok(query('science de','phrase','fr').some(p=>p.locus==='1.1.1'));
 assert.equal(query('I.2.3')[0].page,id==='rose-1899'?47:28);
 assert.equal(query('II.praef.5')[0].locus,'2.praef.5');
 assert.ok(query('II.praef').length>=5);
 assert.equal(core.pageReadings(map,rows,1).length,0,'No editorial Latin is invented for the cover');
 assert.ok(query('symmetria').every(p=>p.page>=1&&p.page<=map.pages.length));
}
const krohnMap=read('data/r2/folios/krohn-1912-parallel.json');
const continuation=core.pageReadings(krohnMap,rows,32).find(p=>p.locus==='1.4.2');
assert.equal(continuation.continuation,true);assert.deepEqual(continuation.images,[31,32]);
const large='Architectura et symmetria. '.repeat(550),pieces=core.translationPieces(large);
assert.ok(pieces.length>1);assert.equal(pieces.join(' ').replace(/\s+/g,' ').trim(),large.replace(/\s+/g,' ').trim(),'Translate the full source, including text beyond 4500 characters');
const html=readFileSync('lectura-comparada.html','utf8');
const ui=readFileSync('assets/modern-edition-parallel.mjs','utf8').replace(/^import .*;$/gm,'').replace(/^await import\(.+\);$/m,'').replace('const parallelReady=initialize();','const parallelReady=initialize();window.parallelReady=parallelReady;');
const reader=readFileSync('assets/rose-krohn-harleianus-reader.mjs','utf8').replace(/^import .*;$/m,'').replace('const readingTask=load();','const readingTask=load();window.readerReady=readingTask;');
const settle=async()=>{for(let i=0;i<3;i++)await new Promise(r=>setImmediate(r));};
for(const id of ['rose-1899','krohn-1912']){
 const image=id==='rose-1899'?47:28;
 const dom=new JSDOM(html,{url:`https://example.edu/library/lectura-comparada.html?edition=${id}&image=${image}`,runScripts:'outside-only'}),w=dom.window;
 Object.assign(w,core,search);w.AbortSignal=AbortSignal;w.HTMLElement.prototype.scrollIntoView=()=>{};
 const manifest=read('data/r2/folios/'+id+'.json'),ocr=read('data/r2/folios/'+id+'-ocr.json'),loci=read('data/r2/folios/'+id+'-loci.json'),map=read('data/r2/folios/'+id+'-parallel.json');
 let calls=[],pendingA=null;
 w.VitruviaInlineTranslation={translate:async(text,source,target)=>{calls.push({text,source,target});if(text==='FOLIO A LATINUM')return new Promise(resolve=>pendingA=resolve);return{text:'VERSION '+target+' '+text,provider:'Test translator',partial:false};}};
 w.fetch=async url=>{
  const path=String(url).split('?')[0];let data;
  if(path==='data/structured/recensio-es.json')data=es;
  else if(path==='data/structured/recensio-fr.json')data=fr;
  else if(path===`data/r2/folios/${id}-parallel.json`)data=map;
  else if(path===`data/r2/folios/${id}.json`)data=manifest;
  else if(path===`data/r2/folios/${id}-ocr.json`)data=ocr;
  else if(path===`data/r2/folios/${id}-loci.json`)data=loci;
  else {const f=manifest.folios.find(x=>x.texto===path);if(f)data={schema:'vdl-page-ocr-1',edition:id,page:f.imagenDigital,text:ocr.pages[f.imagenDigital-1].text,words:[]};}
  return {ok:!!data,status:data?200:404,json:async()=>data};
 };
 w.eval('(()=>{'+ui+'})()');w.eval('(()=>{'+reader+'})()');await Promise.all([w.parallelReady,w.readerReady]);await settle();
 const $=id=>w.document.getElementById(id);
 assert.equal(w.document.body.dataset.edition,id);assert.equal($('page').value,String(image));
 assert.match($('parallel-source-note').textContent,/Diego Kurilo/);
 assert.match($('parallel-text').textContent,/conmensurabilidad/i);
 assert.equal(calls.length,0,'Editorial translations work without any external translator');
 $('parallel-language').value='fr';$('parallel-language').dispatchEvent(new w.Event('change'));assert.match($('parallel-text').textContent,/proportion|symmetria/);assert.equal($('parallel-text').lang,'fr');
 $('parallel-language').value='la';$('parallel-language').dispatchEvent(new w.Event('change'));assert.match($('parallel-text').textContent,/symmetria/);
 $('parallel-language').value='es';$('parallel-language').dispatchEvent(new w.Event('change'));
 const paragraph=$('parallel-text').querySelector('article p:last-child'),textNode=paragraph.firstChild;
 const range=w.document.createRange();range.setStart(textNode,0);range.setEnd(textNode,Math.min(12,textNode.length));
 const selection=w.getSelection();selection.removeAllRanges();selection.addRange(range);w.document.dispatchEvent(new w.Event('selectionchange'));
 $('text-mark').click();assert.ok($('parallel-text').querySelector('mark[data-user-mark]'),'Selected words receive a saved local mark');
 $('parallel-language').value='fr';$('parallel-language').dispatchEvent(new w.Event('change'));
 $('parallel-language').value='es';$('parallel-language').dispatchEvent(new w.Event('change'));assert.ok($('parallel-text').querySelector('mark[data-user-mark]'),'Marks persist per leaf and language');
 $('text-clear-marks').click();assert.equal($('parallel-text').querySelector('mark[data-user-mark]'),null);
 $('parallel-query').value='I.2.3';$('parallel-search-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();assert.equal($('parallel-results').querySelectorAll('article').length,1,$('parallel-search-status').textContent);
 $('parallel-results').querySelector('button').click();await settle();assert.equal($('page').value,String(image));assert.ok($('parallel-text').querySelector('[data-locus="1.2.3"]'));
 $('parallel-query').value='symétrie';$('parallel-scope').value='fr';$('parallel-search-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await settle();assert.ok($('parallel-results').querySelector('mark'));
 $('parallel-results').querySelector('button').click();await settle();assert.equal($('parallel-language').value,'fr');
 $('parallel-layout').click();assert.ok($('parallel-workspace').classList.contains('stacked'));$('parallel-layout').click();
 const original=Number($('parallel-splitter').getAttribute('aria-valuenow'));$('parallel-splitter').dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',cancelable:true}));assert.equal(Number($('parallel-splitter').getAttribute('aria-valuenow')),original-5);
 $('text-larger').click();assert.equal($('parallel-text-viewport').style.getPropertyValue('--parallel-font'),'22px');
 $('text-background').value='#eeeeee';$('text-background').dispatchEvent(new w.Event('input'));assert.equal($('parallel-text-viewport').style.getPropertyValue('--parallel-bg'),'#eeeeee');
 // Late machine results from leaf A must never overwrite leaf B.
 $('parallel-reading').value='automatic';$('parallel-reading').dispatchEvent(new w.Event('change'));
 $('parallel-language').value='es';$('parallel-language').dispatchEvent(new w.Event('change'));
 const emit=(image,text)=>w.document.dispatchEvent(new w.CustomEvent('vdl:edition-text',{detail:{edition:id,image,total:manifest.imagenes,text,sha256_pdf:manifest.sha256_pdf,terms:[]}}));
 emit(7,'FOLIO A LATINUM');$('parallel-translate').click();await settle();assert.ok(pendingA);
 emit(8,'FOLIO B LATINUM');await settle();assert.match($('parallel-text').textContent,/VERSION es FOLIO B/);
 pendingA({text:'STALE TRANSLATION A',provider:'Test',partial:false});await settle();assert.doesNotMatch($('parallel-text').textContent,/STALE TRANSLATION/);assert.match($('parallel-page-label').textContent,/8/);
 const before=calls.length;$('parallel-language').value='la';$('parallel-language').dispatchEvent(new w.Event('change'));await settle();assert.equal(calls.length,before);assert.match($('parallel-text').textContent,/FOLIO B LATINUM/);
 $('parallel-stop').click();emit(9,'FOLIO C LATINUM');await settle();assert.equal(calls.length,before,'Stopping prevents new automatic requests');
 // Missing editorial pages expose their actual OCR instead of another locus.
 $('parallel-reading').value='edition';$('parallel-reading').dispatchEvent(new w.Event('change'));emit(1,'REAL COVER OCR');await settle();assert.match($('parallel-text').textContent,/REAL COVER OCR/);assert.match($('parallel-source-note').textContent,/no tiene loci/);
 dom.window.close();
}
console.log('PASS: 731 loci in LA/ES/FR, real page mappings and continuations, semantic/phrase/locus search, both split readers, no external requests for author translations, full-source chunking and stale-translation protection');
