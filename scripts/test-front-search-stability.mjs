#!/usr/bin/env node
// Regression guard: the home search must never contain the expansive notes bridge.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('index.html','utf8');
const start=html.indexOf('<form id="search-form"');
const end=html.indexOf('</form>',start);
assert.ok(start>=0&&end>start,'Missing primary search form');
const form=html.slice(start,end);
for(const id of ['query','search-button','scope','search-mode']) {
 assert.ok(form.includes('id="'+id+'"'),'Missing functional search control: '+id);
}
assert.ok(!html.includes('src="assets/critical-note-bridge.js'),'Expandable editorial note bridge must not load on homepage');
assert.ok(!html.includes('id="notes-critical-bridge"'),'Expanded note panel must not appear on homepage');
assert.ok(!form.includes('<details'),'No expanding notes panels inside search form');
assert.ok(html.includes('id="search-results"'),'Locus result list must remain present');
assert.ok(html.includes('id="more-results"'),'Result pagination must remain present');
console.log('Home search structural regression: PASS');
