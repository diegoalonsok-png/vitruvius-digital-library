import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=p=>readFileSync(p,'utf8');
const dom=new JSDOM(read('apparatus-bude.html'),{url:'https://example.org/apparatus-bude.html',runScripts:'outside-only'});
const w=dom.window,d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
w.eval(read('assets/apparatus-locus-search.js'));
const rows=JSON.parse(read('data/structured/recensio-es.json')).passages;
let opened='',terms=[];w.VDLApparatusLocusSearch.init(rows,locus=>opened=locus,values=>terms=values);
for(const [query,locus] of [['simmetria','1.1.4'],['symmetria','1.1.4'],['decor','1.2.1'],['firmitas','1.3.2'],['utilitas','1.3.2'],['architect','1.1.1'],['venustas','1.3.2'],['VENUSTAS','1.3.2'],['uenustas','1.3.2'],['belleza','1.3.2'],['beauty','1.3.2']]){
 d.getElementById('ab-search-query').value=query;d.getElementById('ab-search-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 assert.equal(opened,locus,query+' must include the earliest inflected occurrence');
 assert(d.querySelectorAll('#ab-search-results mark.ab-search-highlight').length,query+' should highlight a real source word');
 if(/venustas|uenustas|belleza|beauty/i.test(query))assert(terms.includes('uenustatis'),'Genitive venustatis must belong to the concept');
}
dom.window.close();console.log('PASS: seven live synchronization cases and v/u, case and translated aliases recover the earliest inflected locus.');
