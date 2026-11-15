#!/usr/bin/env node
/* The image bundle must stay unloaded on explicit textual searches.
 * Visual discovery remains automatic for general/visual queries, and
 * the image button must still load on demand. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const listeners=new Map();
let imageLoads=0;
const doc={
 getElementById:id=>id==='vitruvia-feature-manifest'
   ? {textContent:JSON.stringify({images:['image.js'],reader:[]})}
   : id==='search-images-button'?{setAttribute(){},removeAttribute(){},click(){}}:null,
 addEventListener:(type,callback)=>listeners.set('document:'+type,callback),
 createElement:()=>({set src(v){this._src=v},set async(v){},set onload(v){this._onload=v}}),
 body:{append(node){if(node._src==='image.js')imageLoads++;queueMicrotask(()=>node._onload?.())}}
};
const win={
 addEventListener:(type,callback)=>listeners.set(type,callback),
 requestIdleCallback(){},
};
vm.runInNewContext(readFileSync('assets/vitruvia-features.js','utf8'),{
 window:win,document:doc,location:{search:'?q=1.1.1'},URLSearchParams,
 setTimeout(){},Promise,Error,console
});
const emit=query=>listeners.get('vitruvia:results')?.({detail:{query,rows:[{title:'result'}]}});
assert.equal(typeof win.VitruviaSearchPreferences?.textOnlyQuery,'function');
for(const q of ['locus 1.1.1','1.1.1','liber IV','concordancia firmitas','lexicon symmetria','texto latino domus','traducción de De architectura','prefacio libro I']){
 assert.equal(win.VitruviaSearchPreferences.textOnlyQuery(q),true,q);
 emit(q);
}
assert.equal(imageLoads,0,'Text queries must not fetch image bundle');
for(const q of ['retratos de Cicerón','imagenes de Vitruvio','Palladio','foto manuscrito']){
 assert.equal(win.VitruviaSearchPreferences.textOnlyQuery(q),false,q);
}
emit('retratos de Cicerón');
await Promise.resolve(); // asynchronous feature loading dispatches on a microtask
assert.equal(imageLoads,1,'Visual queries must load image bundle');
console.log('PASS: text-only Vitruvia queries skip automatic image bundle; visual query loads it');
