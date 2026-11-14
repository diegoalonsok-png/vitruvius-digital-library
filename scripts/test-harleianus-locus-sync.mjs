// Regression guard for manuscript H. Protect the optional sync layer, not the IIIF source.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(path,"utf8");
const html=read("harleianus.html"),sync=read("assets/harleianus-locus-sync.mjs");
const search=read("assets/harleianus-search.mjs"),css=read("assets/harleianus-search.css");
const corpus=JSON.parse(read("data/structured/recensio-es.json"));
const codex=JSON.parse(read("data/codex-h/folio-locus-map.json"));
for(const id of ["h-locus-form","h-locus-input","h-preface-pick","h-loci-list","h-locus-status","h-locus-actions","h-folio-context","h-search-form","h-search-query","stage","folio","page"]){
 assert(html.includes('id="'+id+'"'),"Harleianus missing "+id);
}
for(const script of ["harley-reader-zoom-v2.mjs","harley-folio-gallery.mjs","harleianus-search.mjs","codex-h-concordance.js","harleianus-locus-sync.mjs"]){
 assert(html.includes(script),"Harleianus script missing "+script);
}
for(let i=1;i<=10;i++)assert(html.includes('value="'+i+'.praef"'),"Missing prefacio "+i);
assert(sync.includes("C.locate(locus)"),"Material locus-to-folio crosswalk removed");
assert(sync.includes("C.forFolio(folio)"),"Folio-to-locus synchronization removed");
assert(sync.includes("data.estimate"),"Estimated links not distinguished");
assert(sync.includes("h-sync-yellow"),"Vitruvian highlights missing");
assert(search.includes("row.dataset.locus=p.locus"),"Search results no longer link to folio mapping");
assert(css.includes("#h-folio-context mark.h-sync-yellow"),"Yellow highlighting style missing");
assert(Array.isArray(corpus.passages)&&corpus.passages.length>=700,"Editorial source truncated");
assert(Array.isArray(codex.entries)&&codex.entries.length>=55,"Codicological evidence map truncated");
const works=new Set(corpus.passages.map(p=>p.locus));
for(let i=1;i<=10;i++)assert(corpus.passages.some(p=>p.locus.startsWith(i+".praef.")),"Missing book prefacio "+i);
for(const word of ["symmetri","decor","firmit"]){
 assert(corpus.passages.some(p=>(p.latin||"").toLowerCase().includes(word)),"Term missing from indexed corpus: "+word);
}
for(const entry of codex.entries){
 assert(entry.folio&&Number.isInteger(entry.image_number));
 const m=/^(\d+)([rv])$/.exec(entry.folio);
 assert(m,"Invalid folio label "+entry.folio);
 // This manifest sequence is supported by every documented folio record.
 const expected=8+(Number(m[1])-1)*2+(m[2]==="r"?1:2);
 assert.equal(entry.image_number,expected,"Unexpected image numbering; review estimated navigation");
 for(const evidence of entry.loci||[])assert(works.has(evidence.locus)||[...works].some(l=>l.startsWith(evidence.locus+".")),"Unregistered locus or chapter "+evidence.locus);
}
console.log("Codex H: search, prefacios, loci, 62+ documented images and yellow editorial highlights preserved.");
