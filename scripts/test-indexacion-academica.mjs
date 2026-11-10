#!/usr/bin/env node
/**
 * Contract for crawlable academic search entries.
 * This validates discoverability and documented source links, not a
 * manuscript collation, scholarly peer review or Google index status.
 * Does not modify original texts, manuscripts, folios, or PDFs.
 */
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const base="https://diegoalonsok-png.github.io/vitruvius-digital-library/";
const hub="indice-busquedas-academicas.html";
const terms=["domus","aedes","symmetria","locus","architectura"];
const engines=["index.html","vitruvia.html","vitruvia-lexicon.html",
 "bibliotheca-graeca-latina.html","index-locorum.html"];
const sitemap=read("sitemap.xml");
const listed=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
assert.equal(new Set(listed).size,listed.length,"Duplicate sitemap URLs");
assert(listed.includes(base+hub),"Academic search hub absent from sitemap");
const hubHtml=read(hub);
const head=html=>html.split(/<\/head>/i)[0];
const canonical=(html,url)=>assert(
 head(html).includes('<link rel="canonical" href="'+url+'">'),
 "Missing expected canonical URL: "+url
);
canonical(hubHtml,base+hub);
assert(/<meta name="description" content="[^"]{30,}"/.test(head(hubHtml)),
 "Missing meaningful hub description");
assert(!/noindex/i.test(head(hubHtml)),"Hub inadvertently noindexed");
assert.equal((hubHtml.match(/<article class="entry"/g)||[]).length,terms.length,
 "Hub and audited studies out of sync");
for(const term of terms){
 const path=term+"-en-vitruvio.html";
 assert(existsSync(path),path+" missing");
 const source=read(path);
 assert(listed.includes(base+path),path+" missing from sitemap");
 canonical(source,base+path);
 assert(!/noindex/i.test(head(source)),path+" inadvertently noindexed");
 assert(/10\.5281\/zenodo\./.test(source),path+" lacks citable DOI");
 assert(/<h1\b/i.test(source),path+" has no document heading");
 assert(/locus=|\bloci\b|\blocus\b/i.test(source),path+" lacks locus context");
 assert(hubHtml.includes('href="'+path+'"'),path+" unlinked from hub");
 for(const [engine,label] of [["vitruvia.html","web search"],
 ["vitruvia-lexicon.html","lexical search"],
 ["bibliotheca-graeca-latina.html","classical search"]]){
  assert(hubHtml.includes('href="'+engine+'?q='+encodeURIComponent(term)),
   "Academic bridge missing "+label+" for "+term);
 }
}
for(const engine of engines){
 const source=read(engine);
 assert(source.includes('href="'+hub+'"'),engine+" does not link the hub");
 for(const term of terms)assert(
  source.includes('href="'+term+'-en-vitruvio.html"'),
  engine+" lacks stable academic link to "+term
 );
}
assert(!/sin (?:cotejo|fuente) documentad[ao].*verificad[ao]/i.test(hubHtml),
 "Do not treat unsupported source claims as verified");
console.log("PASS: "+terms.length+" cited static studies; "+
 engines.length+" engine entrypoints; valid unique sitemap and canonical links.");
