#!/usr/bin/env node
/** Literal phrase checks; verify exact Greek/Latin spans, not semantic equivalence. */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=readFileSync('assets/classical-lexicon.js','utf8');
const context={window:{},document:{currentScript:null}};
vm.runInNewContext(source,context);
const {find}=context.window.ClassicalLexicon;
const greek='Ἰατρικὴ ἐπιστήμη ὑγιεινῶν καὶ νοσωδῶν.';
const hit=find(greek,'ιατρικη επιστημη',{prefix:false});
assert.equal(hit.length,1,'Greek polytonic phrase must match unaccented query');
assert.equal(greek.slice(...hit[0]),'Ἰατρικὴ ἐπιστήμη','Highlight must preserve original Greek offsets');
const latin='Gallia est omnis divisa in partes tres.';
const hit2=find(latin,'GALLIA EST OMNIS',{prefix:false});
assert.equal(hit2.length,1,'Latin phrase must ignore case');
assert.equal(latin.slice(...hit2[0]),'Gallia est omnis');
assert.equal(find(latin,'Gallia est omni',{prefix:false}).length,0,'No partial word masquerading as exact phrase');
console.log('PASS: polytonic Greek phrase, Latin phrase, offsets and whole-word boundaries.');
