import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectRecords} from '../assets/history-core.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('../data/corpus-expansion-inventory.json',import.meta.url))).records;
const find=(query,group='all')=>selectRecords(rows,{query,group});
assert.equal(rows.length,74);assert.equal(new Set(rows.map(r=>r.id)).size,74);
for(const q of ['Harleianus','harlesianus','HARLESINUS','Codex Harley','harley'])assert.deepEqual(find(q).map(r=>r.id).sort(),['hist-001','hist-016']);
assert.equal(find('harlesianus','other').length,0);assert.equal(find('harlesianus').length,2); // UI must disclose matches hidden by a filter.
assert.equal(find('H')[0].id,'hist-001');assert.equal(find('h')[0].id,'hist-016');assert.equal(find('H').length,1);
for(const q of ['Gudianus 132','codex guelferbytanus 132','gudiano 132','Cod. Guelf. 132 Gud. lat.'])assert.equal(find(q)[0].id,'hist-003');
assert.equal(find('Sélestat')[0].id,'hist-002');assert.equal(find('Selestat')[0].id,'hist-002');assert.equal(find('1153 bis')[0].id,'hist-002');
assert.ok(find('Wolfenbuttel').length>=2);assert.ok(find('1511').some(r=>r.id==='hist-020'));assert.equal(find('zzqxnonexistent').length,0);
assert.equal(find('G')[0].id,'hist-004');assert.equal(find('gudianus').length,2);
for(const r of rows){assert.ok(r.id&&r.display_title&&r.date_display&&r.citation_text&&r.history_note);assert.ok(r.date_start<=r.date_end);if(r.metadata_status==='documented')assert.ok(r.sources.length>0,r.id);if(r.group==='manuscripts')assert.ok(r.shelfmark&&r.institution&&r.conservation_place&&r.siglum);}
assert.equal(rows[2].date_display,'mediados del s. IX');assert.ok(rows[2].scope.includes('Compilación'));
assert.equal(rows[64].pdf_url,undefined);assert.ok(rows[64].text_url.endsWith('.txt'));
const cat=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url))),hist=JSON.parse(fs.readFileSync(new URL('../data/historical.json',import.meta.url)));
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(html.includes('id="stat-records">'+(cat.editions.length+hist.length)));assert.ok(html.includes('id="stat-pages">'+cat.searchable_pages.toLocaleString('es-AR')));
console.log('Historical catalogue checks passed: aliases, sigla case, hidden matches, dates, provenance and initial counters.');
