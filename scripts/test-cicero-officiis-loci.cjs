#!/usr/bin/env node
/* Regression: printed book.section loci, not incidental <p> offsets. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const viewer=fs.readFileSync('classics-simple-parallel.html','utf8');
assert.match(viewer,/async function getHistoricalHtmlEdition/);
assert.match(viewer,/if\(entry\?\.format==="html-text"\)/);
assert.match(viewer,/\/\^\(\?:\\\[\\d\+\\\]\\s\*\)\*\(\\d\+\)/);
assert.match(viewer,/work==="cicero-officiis"/);
for(const lang of ['la','en']){
 const file='corpus/cicero-de-officiis-'+lang+'.html';
 const html=fs.readFileSync(file,'utf8');
 const main=html.slice(html.indexOf('<main>'),html.indexOf('</main>'));
 assert.ok(main.length>100000,lang+' must have the actual source text');
 let book=1,part=0;const loci=new Set();
 for(const m of main.matchAll(/<h2 id="book(\d+)">[\s\S]*?<\/h2>|<p>([\s\S]*?)<\/p>/g)){
  if(m[1]){book=Number(m[1]);part=0;continue}
  const line=m[2].replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  const match=line.match(/^(?:\[\d+\]\s*)*(\d+)(?=\s|[.)])/);
  if(match&&Number(match[1])>part){part=Number(match[1]);loci.add(book+'.'+part)}
 }
 for(const locus of ['1.1','1.5','2.1','3.1','3.121'])assert.ok(loci.has(locus),lang+' missing '+locus);
 assert.ok(loci.size>=280,lang+' parsed too few text units');
 console.log(lang+': '+loci.size+' numbered loci, book 1/2/3 and 3.121 reachable');
}
