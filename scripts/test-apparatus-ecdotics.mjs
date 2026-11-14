import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isbnDocumented,locusDetail,sourceEvidence,interventions,reference} from '../assets/apparatus-ecdotics.mjs';

const cat=JSON.parse(readFileSync('data/catalog.json','utf8'));
const eds=cat.editions.filter(e=>['recensio-es','recensio-fr','theory-en'].includes(e.id));
assert.equal(eds.length,3,'Three verified editorial records must be available');
assert.ok(isbnDocumented('978-631-01-6651-3'),'Catalogue ISBN checksum');
assert.equal(isbnDocumented('978-631-01-6651-2'),false,'Reject wrong check digit');
const chapter=locusDetail('6.2');
assert.equal(chapter.display,'Vitr. VI.2');
assert.equal(chapter.kind,'chapter');
assert.equal(chapter.reliable,false,'Do not invent VI.2.1 from chapter label');
assert.equal(locusDetail('6.2.1').reliable,true);
assert.equal(locusDetail('6.2.5').kind,'section');
assert.equal(locusDetail('6.praef.1').kind,'preface-section');
const record={
 edition:'recensio-es',editionName:'V514 · Castellano',
 source:'bloque',locusMention:'6.2',locusCertified:true,page:606,
 type:'comparativa',text:'APARATO CRÍTICO COMPARATIVO [F] — VI.2. Se señalan los suplementos <et detractionibus aut> y <et latitudinis>.'
};
const supplements=interventions(record);
assert.deepEqual(supplements.map(x=>x.marked),['〈et detractionibus aut〉','〈et latitudinis〉']);
assert.equal(sourceEvidence(record).grade,'localizador-explicito');
assert.match(sourceEvidence(record).witness,/No se documenta/);
const url='https://vitruvius-digital-library.org/documents/kurilo-recensio-es.pdf#page=606';
const cite=reference(record,eds.find(e=>e.id===record.edition),url);
assert.match(cite.citation,/Vitr\. VI\.2/);
assert.match(cite.citation,/página 606 del archivo PDF/);
assert.ok(cite.citation.includes(eds[0].bibliographic_title));
assert.ok(cite.citation.includes('10.5281/zenodo.23884757'));
assert.ok(cite.citation.includes('978-631-01-6651-3'));
assert.match(cite.citation,/Observación ISBN/);
assert.match(cite.citation,/no prueba una variante de un códice/);
assert.ok(cite.citation.includes(url));
assert.equal(cite.locus.reliable,false);
const french=reference({...record,edition:'recensio-fr'},eds.find(e=>e.id==='recensio-fr'));
assert.ok(french.citation.includes('10.5281/zenodo.23885110'));
assert.ok(!french.citation.includes('10.5281/zenodo.23884757'));
const english=reference({...record,edition:'theory-en'},eds.find(e=>e.id==='theory-en'));
assert.ok(english.citation.includes('10.5281/zenodo.23885404'));
assert.equal(english.isbn,eds.find(e=>e.id==='theory-en').isbn||'',
 'V297 must reflect the current recorded edition metadata, not a historical assumption');
assert.match(english.citation,/Observación ISBN:/,
 'Shared ISBN is an editorial declaration with a transparent caveat');
assert.match(english.citation,/ISBN común declarado por el editor/,
 'Never turn a shared ISBN into independently verified edition-specific ISBN');
const noMetadata=reference(record,null,url);
assert.equal(noMetadata.doi,'');
assert.equal(noMetadata.isbn,'');
assert.match(noMetadata.citation,/datos bibliográficos completos no recuperados/);
const html=readFileSync('aparato-critico.html','utf8');
const bridge=readFileSync('assets/critical-lexical-bridge.js','utf8');
const apparatus=readFileSync('assets/apparatus-catalog.mjs','utf8');
assert.ok(html.includes('assets/critical-lexical-bridge.js?v=20261113-direct-dictionary-v2'));
assert.ok(html.includes('assets/apparatus-catalog.mjs?v=20261113-cite-ecdotics-v1'));
assert.match(html,/#apparatus-catalog-results .ac-ficha mark/);
assert.match(bridge,/#apparatus-catalog-results .ac-ficha mark/);
assert.match(bridge,/VitruviusLexicalCard/);
assert.match(bridge,/event\.key!=="Enter"/);
assert.match(apparatus,/const ref=reference\(e,editionMetadata.get\(e.edition\),pdfLink\)/);
assert.match(apparatus,/Autor antiguo: Marco Vitruvio Polión/);
assert.match(apparatus,/editionInfo\?\.editorial_role/);
assert.match(apparatus,/editionInfo\?\.publication_place/);
assert.match(apparatus,/editionInfo\?\.isbn_note/);
assert.match(apparatus,/ref\.grade\.display/);
assert.match(apparatus,/ref\.locus\.reliable/);
assert.match(apparatus,/doiLink\.href='https:\/\/doi\.org\/'\+ref\.doi/);

assert.match(apparatus,/interventions\(e\)/);
assert.match(apparatus,/const copy=document\.createElement\('button'\)/);
assert.match(apparatus,/if\(readLocus&&!ref\.locus\.reliable\)/);
// Critical-apparatus edition selectors must not create overwide native menus.
// Metadata is retained, but in bibliographic panels underneath each selector.
const compact=readFileSync('assets/apparatus-edition-bibliography.js','utf8');
for(const id of ['critical-unified-edition','critical-edition','kw-ed','apparatus-catalog-edition']){
 const fragment=html.match(new RegExp('<select\\b[^>]*\\bid="'+id+'"[^>]*>([\\s\\S]*?)<\\/select>'));
 assert.ok(fragment,'Required edition filter missing: '+id);
 const optionLabels=[...fragment[1].matchAll(/<option\b[^>]*>([^<]*)<\/option>/g)].map(x=>x[1]);
 assert.ok(optionLabels.length>=2,'Expected edition choices: '+id);
 for(const label of optionLabels){
  assert.ok(label.length<55,'Native select label must remain compact: '+id+' '+label);
  assert.doesNotMatch(label,/DOI|ISBN|10\.5281|[A-Z].*Intellectual World/);
 }
 assert.ok(compact.includes('"'+id+'"'),'Missing bibliographic panel for '+id);
}
assert.match(compact,/fetch\("data\/catalog\.json"/);
assert.match(compact,/aria-describedby/);
assert.match(compact,/insertAdjacentElement\("afterend",host\)/);
assert.match(compact,/new Set\(Object\.values\(map\)\)/);
assert.match(compact,/book\.isbn_note/);

console.log('PASS: VI.2 chapter not fabricated as section, source-grade transparent, supplement signs, catalogued DOI/ISBN, page and clickable highlighted Lexicon forms.');
