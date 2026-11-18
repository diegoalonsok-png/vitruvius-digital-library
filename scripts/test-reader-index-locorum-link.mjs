#!/usr/bin/env node
// Non-destructive reader toolbar regression: preserve existing buttons.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync("classics-text-reader.html","utf8");
const index=readFileSync("index-locorum.html","utf8");
const beginning=html.indexOf('<div class="reader-appearance"');
const end=html.indexOf('</div>\n<section id="search-results-section"',beginning);
assert(beginning>0&&end>beginning,"Reader appearance toolbar missing");
const bar=html.slice(beginning,end);
for(const id of ["reader-lexicon-palette","reader-ui-language","reader-ivory","reader-sepia",
 "reader-night","reader-invert","reader-bg","reader-fg","reader-font",
 "reader-smaller","reader-larger","reader-italic","reader-align","reader-reset","simple-reading-link"])
 assert(bar.includes('id="'+id+'"'),"Existing reader control removed: "+id);
assert.equal((bar.match(/id="reader-index-locorum"/g)||[]).length,1,"Index locorum link must be unique");
assert.match(bar, /<a id="reader-index-locorum" href="index-locorum\.html"[^>]*>Índice locorum<\/a>/);
assert(bar.indexOf('id="reader-index-locorum"')>bar.indexOf('id="simple-reading-link"'),"Index link must be at the end of toolbar buttons");
assert.match(index, /<title>Index locorum/,"Destination must be real index page");
assert(html.includes('#reader-index-locorum:hover')&&html.includes('#reader-index-locorum:focus-visible'),"Missing pointer/keyboard styles");
console.log("PASS: Index locorum link at end of reader toolbar; destination exists; previous controls preserved.");
