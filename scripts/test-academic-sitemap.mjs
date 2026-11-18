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

// HOME CORPUS STATUS CONTRACT: statistical coverage is not certified collation.
const home=fs.readFileSync("index.html","utf8");
const reader=fs.readFileSync("lector-bilingue.html","utf8");
const search=fs.readFileSync("vitruvia.html","utf8");
const citationGuide=fs.readFileSync("como-citar.html","utf8");
const counts=JSON.parse(fs.readFileSync("data/cifras-corpus.json","utf8"));
const snapshot=JSON.parse(fs.readFileSync("data/corpus-snapshot-2026-11-14.json","utf8"));
assert(counts.schema==="vdl-cifras-corpus-1"&&counts.obrasConTextoIndexado<=counts.obrasTotalesDeclaradas,
  "Corpus counters must remain self-consistent");
assert(home.includes('id="estado-corpus"')&&home.includes('data-cifra="obrasConTextoIndexado"')&&home.includes('data-cifra="obrasTotalesDeclaradas"'),
  "Home must expose indexed works and total catalogued works in the compact Bibliotheca strip");
assert.equal(counts.obrasTotalesDeclaradas,counts.obras+(counts.obrasSuplementarias||0)+counts.obrasAdicionales,
  "Published total must equal main repertoire, supplementary works and documented additional works");
assert(home.includes('data-cifra-fecha')&&home.includes('assets/cifra-obras.js'),
  "Corpus date and totals must update from the shared published JSON");
assert(home.includes('href="concordancia-folios.html"')&&home.includes('href="como-citar.html#corpus-version"'),
  "Home research path must reach evidence and citation guidance");
assert(reader.includes('id="reader-certainty-note"')&&reader.includes('no un cotejo manuscrito independiente'),
  "Bilingual reader must explain limits of structural alignment");
assert(search.includes('id="semantic-scope-note"')&&search.includes("no toda Bibliotheca"),
  "Vitruvia must disclose semantic coverage before the user opens the technical details");
assert(snapshot.schema==="vdl-corpus-snapshot-metadata-v1"&&snapshot.records.length===3
 &&snapshot.canonical_loci===731&&/^[a-f0-9]{64}$/.test(snapshot.source_fingerprint_sha256)
 &&/^[a-f0-9]{40}$/.test(snapshot.source_commit)
 &&snapshot.records.every(record=>/^[a-f0-9]{40}$/.test(record.git_blob_sha1)&&/^[a-f0-9]{64}$/.test(record.source_docx_sha256)),
  "Dated editorial snapshot needs versioned commit and verifiable edition fingerprints");
assert(citationGuide.includes('id="corpus-version"')&&citationGuide.includes('data/corpus-snapshot-2026-11-14.json')
 &&citationGuide.includes('lector-bilingue.html?edition=recensio-es&amp;locus=3.1.2'),
  "Citations must expose verifiable dated source and a real locus link");
assert(!/Recensio provisional y aparato crítico comparativo selectivo/.test(citationGuide),
  "Citation guide must not label published books generically as provisional");
console.log("PASS: "+pages.length+" scholarly research pages have a canonical URL, heading and a unique sitemap entry. External indexing is not asserted.");
