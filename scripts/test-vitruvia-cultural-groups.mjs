#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=path=>readFileSync(path,'utf8');
for(const file of ['assets/vitruvia-search.js','assets/vitruvia-entity-resolver.js','assets/vitruvia-cultural-works.js'])
 new vm.Script(read(file),{filename:file});

const search=read('assets/vitruvia-search.js');
assert.match(search,/cataloguePromise=load\(\);[\s\S]*?if\(initialQuery[^\n]*void search\(\)/,
 'URL queries should begin before the catalogue finishes loading');
assert.doesNotMatch(search,/cataloguePromise\.then\(\(\)=>\{/,
 'Do not defer a linked query until all catalogues are loaded');
const resolver=read('assets/vitruvia-entity-resolver.js');
assert.match(resolver,/const verified=await completeIdentity\(direct\)/);
assert.match(resolver,/verified\?\.kind==="person"/);
const works=read('assets/vitruvia-cultural-works.js');
assert.match(works,/function mediumOf\(entity,description,building\)/);
assert.match(works,/cultural-medium-group/);
assert.match(works,/LIMIT 40 OFFSET /);
assert.match(works,/Cargar más obras documentadas/);
assert.match(works,/not an exhaustive catalogue/i);
console.log('PASS: progressive authority lookup and sourced cultural media groups');
