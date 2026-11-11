import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Script,createContext} from 'node:vm';
const root=new URL('../',import.meta.url);
const data=JSON.parse(fs.readFileSync(new URL('tests/vitruvia-100-subjects.json',root),'utf8'));
const js=fs.readFileSync(new URL('assets/vitruvia-entity-resolver.js',root),'utf8');
const win={};
const ctx=createContext({window:win,URLSearchParams,URL,AbortController,console});
new Script(js,{filename:'vitruvia-entity-resolver.js'}).runInContext(ctx);
assert.ok(win.VitruviaEntityResolver?.subject,'Subject resolver not registered');
const fold=s=>String(s||'').normalize('NFD').replace(/\\p{M}/gu,'').toLowerCase().replace(/[^\\p{L}\\p{N}]+/gu,' ').trim();
let passed=0;
for(const c of data.cases){
 const actual=win.VitruviaEntityResolver.subject(c.query);
 const ok=fold(actual)===fold(c.expectedSubject);
 if(ok)passed++;else console.error('FAIL #'+c.id+' '+JSON.stringify({query:c.query,expected:c.expectedSubject,actual}));
}
console.log('Vitruvia query interpretation: '+passed+'/'+data.cases.length+' passed.');
if(data.cases.length!==100||passed!==100)process.exitCode=1;
