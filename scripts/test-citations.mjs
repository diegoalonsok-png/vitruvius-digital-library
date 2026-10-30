import assert from 'node:assert/strict';import fs from 'node:fs';
import {bibliographyText,bibliographyHTML,bookTitle} from '../assets/edition-citation.mjs';
import {lexicalSuggestions,lexicalForms} from '../assets/lexical-suggestions.mjs';
import {searchCorpus} from '../assets/search-core.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../data/'+name,import.meta.url)));
const editions=read('catalog.json').editions.slice(0,3),lex=read('latin-lexicon.json').entries;
for(const e of editions){const ref=bibliographyText(e);assert.ok(ref.startsWith('Kurilo, Diego. '));assert.ok(ref.includes(e.bibliographic_title));assert.ok(ref.includes(e.version));assert.ok(ref.includes('2026'));assert.ok(bibliographyHTML(e).includes('<em>'));}
assert.ok(bibliographyText(editions[0]).includes('ISBN 978-631-01-6651-3.'));assert.equal(editions[2].isbn,null);assert.ok(!bibliographyText(editions[2]).includes('ISBN'));
assert.ok(bookTitle(editions[1]).includes('L’architecte de la théorie'));assert.ok(!bibliographyText(editions[1]).includes('<em>'));
assert.ok(lexicalForms('symmetria',lex).includes('symmetriam'));assert.deepEqual(lexicalForms('symmetrya',lex),[]);assert.ok(lexicalSuggestions('symmetrya',lex).includes('symmetria'));assert.deepEqual(lexicalSuggestions('symmetria',lex),[]);assert.deepEqual(lexicalSuggestions('scientia pluribus disciplinis',lex),[]);
for(const id of ['recensio-es','recensio-fr','theory-en']){const data=read('structured/'+id+'.json');const run=query=>searchCorpus([data],{query,kind:'words',mode:'all',language:'all'}).results;assert.ok(run('symmetria').length>0);assert.equal(run('symmetrya').length,0);}
console.log('Citation and lower-reader search checks passed: full titles, version, ISBN provenance and explicit spelling suggestions.');
