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

// Source consistency: compare excerpts by exact V514 locus, not by a shared
// label alone. This checks publication against its editorial master, but
// DOES NOT certify readings against manuscripts, Rose or Krohn.
const editorial=JSON.parse(read("data/structured/recensio-es.json"));
assert.equal(editorial.version,"V514","Unexpected editorial baseline");
const originals=new Map(editorial.passages.map(p=>[p.locus,p]));
const plain=s=>String(s||"").replace(/<[^>]*>/g,"")
 .replace(/&[a-z]+;/g," ").replace(/…/g," ")
 .replace(/\s+/g," ").trim();
const normalized=s=>plain(s).toLowerCase().normalize("NFC").replace(/\s+/g," ");
const excerptOK=(fragment,whole)=>{
 const head=normalized(fragment).split(" ").filter(Boolean).slice(0,10).join(" ");
 return Boolean(head)&&normalized(whole).includes(head);
};
let checked=0;
for(const word of terms){
 const source=read(word+"-en-vitruvio.html");
 const articles=[...source.matchAll(/<article class="passage"[^>]*>[\s\S]*?<\/article>/g)];
 for(const match of articles){
  const article=match[0],id=(article.match(/id="locus-([^"]+)"/)||[])[1];
  assert(id,"Passage without a locus ID in "+word);
  const locus=id.replace(/-/g,".");
  const base=originals.get(locus);
  assert(base,word+": locus absent in V514: "+locus);
  const latin=(article.match(/<p lang="la"[^>]*>([\s\S]*?)<\/p>/)||[])[1];
  const spanish=(article.match(/<p lang="es"[^>]*>([\s\S]*?)<\/p>/)||[])[1];
  assert(latin&&spanish,word+": incomplete bilingual excerpt at "+locus);
  assert(excerptOK(latin,base.latin),word+": Latin excerpt differs at "+locus);
  assert(excerptOK(spanish,base.translation),word+": Spanish excerpt differs at "+locus);
  checked++;
 }
}
assert(checked>=48,"The original 48 evidenced excerpt pairs were reduced");

console.log("PASS: "+terms.length+" cited static studies; "+
 engines.length+" engine entrypoints; "+checked+" V514 bilingual excerpts; valid unique sitemap.");
