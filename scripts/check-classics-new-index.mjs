#!/usr/bin/env node
/** Post-build identity and coverage check: new works must have text, registry, lexical posting metadata. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const registry=JSON.parse(readFileSync('data/classics-corpus/search-registry.json','utf8'));
const manifest=JSON.parse(readFileSync('data/index/classics/manifest.json','utf8'));
const ids=['galen-adhortatio-artes','galen-optimus-medicus-philosophus','hippocrates-de-prisca-medicina'];
for(const id of ids){
 const e=registry.entries.find(x=>x.workId===id&&x.language==='grc');
 assert.ok(e&&e.format==='json-passages',id+': missing from literal-search registry');
 const raw=JSON.parse(readFileSync(e.path,'utf8'));
 assert.equal(raw.workId,id);
 assert.ok(raw.passages?.length>0);
 assert.ok(raw.passages.every(p=>p.locus&&typeof p.text==='string'&&p.text.trim()),id+': missing text/locus');
 const m=manifest.index.find(x=>x.id===id&&x.lang==='grc');
 assert.ok(m,id+': missing from inverted lexical index');
 assert.equal(m.passages,raw.passages.length,id+': index passage count mismatch');
 assert.ok(m.tokens>0);
 console.log(id+': '+m.passages+' passages, '+m.tokens+' tokens');
}
assert.equal(registry.count,registry.entries.length);
assert.equal(registry.works,new Set(registry.entries.map(x=>x.workId)).size);
console.log('PASS: all three new original Greek texts catalogued and lexically indexed');
