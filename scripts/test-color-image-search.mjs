import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const ctx={window:{}};
vm.runInNewContext(readFileSync(new URL('../assets/vitruvia-discovery.js',import.meta.url),'utf8'),ctx);
const d=ctx.window.VitruviaDiscovery;
const generic=d.plan('ejemplo imagenes a color');
assert.equal(generic.visualStyle,'color');
assert.ok(generic.queries.some(q=>q.includes('color photography')));
const brutal=d.plan('arquitectura brutalista');
assert.equal(brutal.visualStyle,'prefer-color');
assert.ok(brutal.queries.some(q=>q.includes('brutalist architecture')));
const page=title=>({title:'File:'+title,imageinfo:[{extmetadata:{}}]});
const photo=d.imageRank(page('Brutalist architecture concrete building color photograph.jpg'),brutal);
const bw=d.imageRank(page('Brutalist architecture building black and white monochrome photograph.jpg'),brutal);
assert.equal(photo.accepted,true);
assert.ok(photo.score>bw.score);
const sorted=d.sortImages([
 {name:'monochrome',group:'context',score:bw.score,year:1960},
 {name:'color',group:'context',score:photo.score,year:2022}
],brutal);
assert.equal(sorted[0].name,'color');
assert.equal(d.plan('Radiohead',{canonical:'Radiohead',authorityDescription:'English rock band'}).kind,'music-group');
assert.equal(d.plan('Cicerón',{kind:'person',canonical:'Cicerón'}).kind,'person');
console.log('Color searches, brutalist architecture and unrelated entity regression passed.');
