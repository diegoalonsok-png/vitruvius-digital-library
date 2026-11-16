#!/usr/bin/env node
/**
 * Read-only reconciliation of Bibliotheca's GitHub search registry and R2 declarations.
 * Checks metadata consistency, not remote HTTP availability or textual accuracy.
 * Usage: node scripts/audit-r2-search-registry.mjs
 */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const registry = read('data/classics-corpus/search-registry.json');
const r2 = read('data/r2/corpus-manifest.json');
const roadmap = read('data/classics-corpus/indexation-roadmap-222.json');
const descriptor = read('data/r2/classics-expansion-index.json');

assert.equal(registry.schema, 'vitruvia-classics-search-registry-v1');
assert.equal(r2.schema, 'vdl-corpus-r2-1');
assert.ok(r2.base.startsWith('https://libros.vitruvius-digital-library.org/corpus/'));
assert.ok(Array.isArray(registry.entries) && Array.isArray(r2.obras));
const errors = [];
const entriesByPath = new Map();
const editions = new Set();
for (const entry of registry.entries) {
  const key = entry.workId + '/' + entry.language;
  if (editions.has(key)) errors.push('Duplicated edition: ' + key);
  editions.add(key);
  if (entriesByPath.has(entry.path) && entriesByPath.get(entry.path).workId !== entry.workId)
    errors.push('Shared source path across different works: ' + entry.path);
  entriesByPath.set(entry.path, entry);
}
const r2Paths = new Set();
for (const original of r2.obras) {
  const path = r2.base + original.archivo;
  if (r2Paths.has(path)) errors.push('Duplicated R2 object key: ' + path);
  r2Paths.add(path);
  const entry = entriesByPath.get(path);
  if (!entry) { errors.push('Missing R2 search entry: ' + path); continue; }
  if (entry.workId !== original.workId || entry.language !== original.language)
    errors.push('Edition identity mismatch: ' + path);
  if (original.sha256 && entry.sha256 !== original.sha256)
    errors.push('SHA-256 metadata mismatch: ' + path);
  if (Number.isInteger(original.pasajes) && entry.passages !== original.pasajes)
    errors.push('Passage-count metadata mismatch: ' + path);
}
for (const entry of registry.entries.filter(e => e.path.startsWith(r2.base))) {
  if (!r2Paths.has(entry.path)) errors.push('Orphan R2 search entry: ' + entry.path);
}
if (registry.count !== registry.entries.length) errors.push('registry.count does not match entries');
if (registry.works !== new Set(registry.entries.map(e => e.workId)).size)
  errors.push('registry.works does not match unique work IDs');
if (roadmap.counts.registeredTextVersions !== registry.entries.length)
  errors.push('Roadmap version count is stale');
if (roadmap.counts.declaredR2OriginalWorks !== r2.obras.length)
  errors.push('Roadmap R2 count is stale');
if (descriptor.schema !== 'vdl-classics-expansion-index-v1')
  errors.push('Missing R2 lexical expansion descriptor');

console.log(JSON.stringify({
  registryVersions: registry.entries.length,
  registryWorks: registry.works,
  r2DeclaredObjects: r2.obras.length,
  r2WithRecordedSha256: r2.obras.filter(e => e.sha256).length,
  r2LexicalExpansionDeclaredWorks: descriptor.works,
  cataloguedWorks: roadmap.targetWorks,
  worksWithoutEffectiveOriginalIndex: roadmap.counts.effectiveOriginalsMissing,
  note: 'Local declarations checked; remote availability and semantic passage correctness not checked.',
  errors
}, null, 2));
if (errors.length) process.exitCode = 1;
