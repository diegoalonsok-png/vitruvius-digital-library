#!/usr/bin/env node
/**
 * Regression: the Latin collation is always Krohn 1912 | Rose 1899 | Kurilo V514.
 * Reads indexed source data only; no OCR, translation generation or source mutation.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const js = read("assets/scriptorium-triple.js");
const html = read("scriptorium.html");

assert.match(js, /const COMPARISON_READERS=Object\.freeze\(\["krohn","rose","kurilo"\]\)/);
assert.match(js, /for\(const \[slot,defaultKey\] of COMPARISON_READERS\.entries\(\)\)/);
assert.match(js, /edition\.value=defaultKey;edition\.disabled=true/);
assert.match(js, /selectEdition\(id\)\{if\(id!==defaultKey\)return Promise\.resolve\(false\)/);
assert.doesNotMatch(js, /requestedEditions|states\[2\]\.selectEdition\("en"\)/);
assert.match(js, /compareEditorialLocus\(locus\)/);
assert.match(html, /Krohn \(1912, TEI\)/);
assert.match(html, /Rose \(1899, transcripción digital\)/);
assert.match(html, /Kurilo \(V514, texto latino\)/);

const sources = [
  ["krohn", "data/critical-editions/krohn-1912-tei-loci.json"],
  ["rose", "data/critical-editions/rose-1899-transcribed-loci.json"],
  ["kurilo", "data/structured/recensio-es.json"]
];
const sets = [];
for (const [name, path] of sources) {
  const doc = JSON.parse(read(path));
  assert(Array.isArray(doc.passages), name + " has no indexed passages");
  assert.equal(doc.passages.length, 731, name + ": expected 731 indexed loci");
  const loci = new Set(doc.passages.map(p => p.locus));
  assert.equal(loci.size, 731, name + ": duplicate loci");
  assert(doc.passages.every(p => String(p.latin || p.text || "").trim()), name + ": empty Latin passage");
  assert(loci.has("1.1.3"), name + ": missing screenshot locus 1.1.3");
  sets.push(loci);
}
for (const locus of sets[0]) {
  assert(sets[1].has(locus) && sets[2].has(locus), "Locus missing from the fixed triad: " + locus);
}
console.log("PASS: fixed Latin triad; 3 distinct indexed editions; 731 shared loci; legacy reader overrides disabled; no OCR fallback.");
