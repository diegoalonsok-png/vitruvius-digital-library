#!/usr/bin/env node
/** Discoverability of editorial research pages, not a claim of indexing by
 * Google, Google Scholar, or an institutional catalogue. */
import assert from "node:assert/strict";
import fs from "node:fs";
const base="https://vitruvius-digital-library.org/";
const pretty=p=>p.replace(/(^|\/)index\.html$/,"$1").replace(/\.html$/,"");
const pages=[
 "buscador-parrafos-vitruvio.html",
 "centro-control-academico.html",
 "citas-laboratorio.html",
 "classics-collation.html",
 "classics-facsimile-gallery.html",
 "classics-manuscript-coverage.html",
 "concordancia-ocr-vitruvio.html",
 "indexacion-historica-parrafos.html",
 "inventario-aparato-autoral.html",
 "morfologia-laboratorio.html"
];
const xml=fs.readFileSync("sitemap.xml","utf8");
assert(xml.startsWith('<?xml version="1.0"'),"Sitemap XML header missing");
const urlList=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(urlList).size,urlList.length,"Duplicate sitemap URLs");
assert(!urlList.some(url=>/\/google[a-z0-9]+\.html$|\/offline\.html$|\/escritorio-h-prueba\.html$/.test(url)),
 "Verification, offline and test pages must not appear in the academic sitemap");
for(const path of pages){
 assert(fs.existsSync(path),"Missing research page "+path);
 const text=fs.readFileSync(path,"utf8");
 const expected=base+pretty(path);
 assert(urlList.includes(expected),"Research page missing from sitemap: "+path);
 assert(/<title\b[^>]*>[^<]{8,}<\/title>/i.test(text),"Missing page title: "+path);
 assert(/<h1\b/i.test(text),"Missing H1: "+path);
 assert(text.includes('<link rel="canonical" href="'+expected+'">'),
  "Missing canonical URL: "+path);
 assert(!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(text),
  "A noindex research page is falsely listed: "+path);
}

/* Persistent discovery gate for the three flagship research tools.
 * This tests HTML metadata and links, never external search rankings. */
const flagshipPages=[
 ["index.html",base],
 ["bibliotheca-graeca-latina.html",base+"bibliotheca-graeca-latina"],
 ["vitruvia.html",base+"vitruvia"],
 ["vitruvia-lexicon.html",base+"vitruvia-lexicon"],
 ["index-auctorum-operum.html",base+"index-auctorum-operum.html"],
 ["classics-manuscript-coverage.html",base+"classics-manuscript-coverage"]
];
for(const [path,canonicalUrl] of flagshipPages){
 const document=fs.readFileSync(path,"utf8");
 const head=document.split(/<\/head>/i)[0];
 assert(urlList.includes(canonicalUrl),"Flagship URL missing from sitemap: "+path);
 assert(head.includes('<link rel="canonical" href="'+canonicalUrl+'">'),
   "Flagship canonical URL mismatch: "+path);
 assert(/<title\b[^>]*>[^<]{8,}<\/title>/i.test(head),
   "Missing meaningful title: "+path);
 assert(/<meta\s+name="description"\s+content="[^"]{55,}"/i.test(head),
   "Missing full search description: "+path);
 assert(/<h1\b/i.test(document),"Missing main heading: "+path);
 assert(!/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(head),
   "Core academic page accidentally excluded: "+path);
 if(path==="bibliotheca-graeca-latina.html"||path==="index-auctorum-operum.html"){
  assert(/property="og:title"/.test(head)&&/property="og:description"/.test(head),
    "Academic catalogue lacks link preview metadata: "+path);
 }
}
assert(fs.readFileSync("vitruvia.html","utf8").includes('href="index-auctorum-operum.html"'),
  "Vitruvia must provide a crawlable route to the static author/work index");
assert(fs.readFileSync("bibliotheca-graeca-latina.html","utf8").includes('href="index-auctorum-operum.html"'),
  "Bibliotheca must link to its static academic index");
console.log("PASS: "+pages.length+" scholarly research pages have a canonical URL, heading and a unique sitemap entry. External indexing is not asserted.");
