#!/usr/bin/env node
/** Candado: la traducción histórica alojada nunca reemplaza el griego. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const base = 'data/classics-corpus/';
const greek = read(base + 'plato-laws-grc.json');
const english = read(base + 'plato-laws-en.json');
const registry = read(base + 'search-registry.json');
const catalogue = read('data/bibliotheca-graeca-latina-I-bce-I-ce.json');
const fiches = read(base + 'bibliotheca-academic-fiches-2026-11-16.json');
const keys = records => new Set(records.map(p => String(p.locus || '').split(':').at(-1)));
assert.equal(greek.language, 'grc');
assert.equal(english.language, 'en');
assert.equal(english.sourceType, 'historical-translation-tei');
assert.equal(english.alignmentStatus, 'stephanus-page');
assert.equal(english.passages.length, 327);
assert.equal(keys(english.passages).size, 327);
assert.deepEqual([...keys(english.passages)].sort(), [...keys(greek.passages)].sort(), 'Every Greek Stephanus reference must have an English counterpart');
assert.ok(english.passages.every(p => p.text.length > 60 && !/<[^>]*>/.test(p.text)));
assert.equal(registry.count, registry.entries.length);
assert.equal(registry.entries.filter(p => p.workId === 'plato-laws' && p.language === 'grc').length, 1);
assert.equal(registry.entries.filter(p => p.workId === 'plato-laws' && p.language === 'en').length, 1);
const work = catalogue.works.find(w => w.id === 'plato-laws');
assert.equal(work?.corpusFiles?.grc, base + 'plato-laws-grc.json', 'Original Greek file must remain linked in the protected catalogue');
// Las nuevas traducciones se anuncian mediante el registro derivado; no modificar el catálogo madre.
const fiche = fiches.records.find(w => w.workId === 'plato-laws');
assert.ok(fiche?.textualIndex?.readers?.some(r => r.language === 'en' && r.source === base + 'plato-laws-en.json'));
console.log('OK: griego intacto; 327 loci únicos con versión histórica inglesa; lector y catálogos sincronizados.');
