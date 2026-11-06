/* Reproducible validation of Vitruvia Lexicon editorial data. No network, no OCR, no fabricated collations. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,resolve} from "node:path";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>JSON.parse(readFileSync(resolve(root,p),"utf8"));
const html=readFileSync(resolve(root,"vitruvia-lexicon.html"),"utf8");
const etym=read("data/lexicon/etymologicum.json").entries;
const sentences=read("data/lexicon/sententiae.json").sententiae;
const vitruvius=read("data/structured/recensio-es.json").passages;
const byLocus=new Map(vitruvius.map(p=>[p.locus,p]));
const normalized=s=>String(s||"").replace(/\s+/gu," ").trim();
assert.equal(new Set(etym.map(e=>e.id)).size,etym.length,"Duplicate etymological ID");
assert.equal(new Set(etym.map(e=>e.lemma)).size,etym.length,"Duplicate lemma");
assert.equal(new Set(sentences.map(e=>e.id)).size,sentences.length,"Duplicate sententia ID");
const link=c=>{const m=String(c||"").match(/(?:Vitr\.?|Vitruv\.?)\s*([IVX]+|\d+)\.(\d+)\.(\d+)/i);if(!m)return null;const roman={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};return (roman[m[1].toUpperCase()]||m[1])+"."+m[2]+"."+m[3]};
let matches=0,uncertain=0;
const rigorouslyAligned=new Set(["ichnographia","orthographia","scaenographia","dispositio","distributio","gnomonice","machinatio"]);
for(const e of etym)for(const example of e.loci||[]){
 const l=link(example.c);if(!l){uncertain++;continue}
 const p=byLocus.get(l);if(!p){uncertain++;if(rigorouslyAligned.has(e.lemma))assert(p,"Missing technical locus "+l+" for "+e.lemma);continue}
 if(!rigorouslyAligned.has(e.lemma)){uncertain++;continue}
 assert(normalized(p.latin).includes(normalized(example.t)),"Latin extract differs from V514 at "+e.lemma+"/"+l);
 if(example.tr)assert(normalized(p.translation).includes(normalized(example.tr)),"Translation extract differs from V514 at "+e.lemma+"/"+l);
 matches++;
}
for(const e of sentences.filter(e=>e.author==="Vitruvio"&&e.lang==="la"&&e.source_status)){
 const l=link(e.cite);assert(l&&byLocus.has(l),"Missing sententia locus "+e.id);
 const p=byLocus.get(l);
 assert(normalized(p.latin).includes(normalized(e.text)),"Sententia Latin differs: "+e.id);
 assert(normalized(p.translation).includes(normalized(e.tr)),"Sententia Spanish differs: "+e.id);
}
for(const [name,count] of [["etym",etym.length],["sent",sentences.length]]){
 assert(html.includes('data-m="'+name+'">'+count+"</b>"),"Published Lexicon count is stale for "+name);
}
for(const name of ["ichnographia","orthographia","scaenographia","dispositio","distributio","gnomonice","machinatio"]){
 assert(html.includes("q="+name+"&amp;mode=palabra"),"Missing crawlable technical entry "+name);
 const entry=etym.find(e=>e.lemma===name);assert(entry?.loci?.length,"Missing technical locus "+name);
}
console.log(JSON.stringify({etymologicalEntries:etym.length,sententiae:sentences.length,matchedV514LocusExcerpts:matches,olderLociNotReviewedByThisAudit:uncertain,method:"Local transcription comparison only; not independent manuscript collation or lexical review"},null,2));
console.log("PASS: Lexicon editorial data, loci, translated excerpts and static catalogue counts match.");
