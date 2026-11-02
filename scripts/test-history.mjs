import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectRecords} from '../assets/history-core.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('../data/corpus-expansion-inventory.json',import.meta.url))).records;
const find=(query,group='all')=>selectRecords(rows,{query,group});
assert.ok(rows.length>=74,'El inventario histórico no debe perder registros existentes');assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'Los identificadores del inventario deben ser únicos');
for(const q of ['Harleianus','harlesianus','HARLESINUS','Codex Harley','harley'])assert.deepEqual(find(q).map(r=>r.id).sort(),['hist-001','hist-016','hist-077']);
assert.equal(find('harlesianus','other').length,0);assert.equal(find('harlesianus').length,3); // UI must disclose matches hidden by a filter.
assert.equal(find('H')[0].id,'hist-001');assert.equal(find('h')[0].id,'hist-016');assert.equal(find('H').length,1);
for(const q of ['Gudianus 132','codex guelferbytanus 132','gudiano 132','Cod. Guelf. 132 Gud. lat.'])assert.equal(find(q)[0].id,'hist-003');
assert.equal(find('Sélestat')[0].id,'hist-002');assert.equal(find('Selestat')[0].id,'hist-002');assert.equal(find('1153 bis')[0].id,'hist-002');
assert.ok(find('Wolfenbuttel').length>=2);assert.ok(find('1511').some(r=>r.id==='hist-020'));assert.equal(find('zzqxnonexistent').length,0);
assert.equal(find('G')[0].id,'hist-004');assert.equal(find('gudianus').length,2);
for(const r of rows){assert.ok(r.id&&r.display_title&&r.date_display&&r.citation_text&&r.history_note);assert.ok(r.date_start<=r.date_end);if(r.metadata_status==='documented')assert.ok(r.sources.length>0,r.id);if(r.group==='manuscripts'){assert.ok(r.shelfmark&&r.institution&&r.conservation_place,'Datos topográficos obligatorios: '+r.id);if(!['hist-075','hist-077','hist-078'].includes(r.id))assert.ok(r.siglum,'Sigla del testimonio documentado: '+r.id);}}
assert.equal(rows[2].date_display,'mediados del s. IX');assert.ok(rows[2].scope.includes('Compilación'));
assert.equal(rows[64].pdf_url,undefined);assert.ok(rows[64].text_url.endsWith('.txt'));
const cat=JSON.parse(fs.readFileSync(new URL('../data/catalog.json',import.meta.url))),hist=JSON.parse(fs.readFileSync(new URL('../data/historical.json',import.meta.url)));
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const metrics=JSON.parse(fs.readFileSync(new URL('../data/site-metrics.json',import.meta.url),'utf8'));
const onomasticon=JSON.parse(fs.readFileSync(new URL('../data/onomasticon-vitruvianum.json',import.meta.url),'utf8'));
assert.equal(metrics.primary_catalog.records,cat.editions.length+hist.length,'El catálogo primario debe conservar sus 28 registros');
assert.equal(metrics.total_records_across_repertories,metrics.primary_catalog.records+metrics.expanded_historical_inventory.records+metrics.academic_studies.records);
assert.ok(html.includes('id="stat-records">'+metrics.total_records_across_repertories),'La portada debe contar los tres repertorios');
assert.ok(html.includes('id="stat-pages">'+metrics.indexed_editions.sum_declared_pages.toLocaleString('es-AR')),'La extensión editorial declarada debe estar actualizada');
assert.ok(html.includes('páginas declaradas en esas tres ediciones'),'Las páginas declaradas no deben presentarse como páginas individualmente indexadas');
assert.ok(onomasticon.totals.latinWords>50000&&onomasticon.totals.greekWords>0,'El nuevo índice debe contener estadísticas latinas y griegas');
assert.ok(onomasticon.entities.some(x=>x.id==='archimedes'&&x.loci.includes('9.praef.9')),'Arquímedes debe tener una mención real identificada por locus');
assert.ok(onomasticon.entities.some(x=>x.kind==='place'&&x.loci.length>0),'Los lugares deben tener loci documentales');
console.log('Historical catalogue and Onomasticon checks passed: aliases, provenance, repertory statistics and locus concordances.');
