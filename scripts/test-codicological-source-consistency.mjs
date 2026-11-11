/* Mechanical verification of derivative codicological research metadata.
 * Neither this test nor the academic work updates original manuscripts,
 * facsimiles, folios or the 222 work catalogue.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const matrix=read('data/classics-corpus/tei-codicology-research-matrix-89.json');
const witnesses=read('data/bibliotheca-testimonia-verified.json');
const catalogue=read('data/bibliotheca-graeca-latina-I-bce-I-ce.json');
const report=read('data/academic-integrity.json');

assert.equal(catalogue.works.length,222,'Keep all 222 catalogue works intact');
assert.equal(matrix.records.length,witnesses.records.length,'Each witness must have one codicological dossier');
assert.equal(new Set(matrix.records.map(r=>r.witnessId)).size,matrix.records.length,'Duplicate witness dossier identifier');
assert.deepEqual(new Set(matrix.records.map(r=>r.witnessId)),new Set(witnesses.records.map(r=>r.id)),
  'Witness dossier identities must correspond to the witness registry');
assert.equal(matrix.fieldCount,22,'Expected 22 distinct cataloguing fields');
let allMissing=0;
for(const r of matrix.records){
 const pairs=Object.values(r.fields||{}).flatMap(group=>Object.entries(group));
 assert.equal(pairs.length,matrix.fieldCount,'Missing field definitions: '+r.witnessId);
 const empty=pairs.filter(([,f])=>f?.value==null||String(f.value).trim()==='').map(([k])=>k);
 const emptyKeys=empty.slice().sort();
 const recorded=(r.missingKeys||[]).slice().sort();
 assert.deepEqual(recorded,emptyKeys,'Incorrect missingKeys: '+r.witnessId);
 assert.equal(r.missingCount,empty.length,'Incorrect missingCount: '+r.witnessId);
 allMissing+=empty.length;
}
for(const row of matrix.globalMissing){
 const n=matrix.records.filter(r=>{const f=r.fields?.[row.category]?.[row.key];
  return !f||f.value==null||String(f.value).trim()===''}).length;
 assert.equal(row.missing,n,'Stale global missing count for '+row.category+'.'+row.key);
}
assert.equal(report.codicology?.fieldSlots,matrix.records.length*matrix.fieldCount);
assert.equal(report.codicology?.pendingFieldSlots,allMissing,'Published missing fields must match actual metadata');
assert.equal(report.codicology?.filledFieldSlots,matrix.records.length*matrix.fieldCount-allMissing);
const h=matrix.records.find(r=>r.witnessId==='vitruvius-h');
const c=matrix.records.find(r=>r.witnessId==='cicero-catilina-harley2716');
assert.ok(h&&c,'The named manuscript dossiers must remain present');
const expected={
 'vitruvius-h':{source:'https://searcharchives.bl.uk/catalog/040-002048598',paths:[['physical','dimensions'],['physical','binding']]},
 'cicero-catilina-harley2716':{source:'https://searcharchives.bl.uk/catalog/040-002048547',paths:[
  ['physical','dimensions'],['physical','binding'],['scribal','script'],['history','origin'],['history','provenance']]}
};
for(const r of [h,c]){
 const check=expected[r.witnessId];
 for(const [group,key] of check.paths){
  const f=r.fields[group][key];
  assert.ok(typeof f.value==='string'&&f.value.trim().length>12,'Verified description missing: '+r.witnessId+' '+key);
  assert.equal(f.status,'institutional_catalogue_verified','No unsupported certainty elevation: '+r.witnessId+' '+key);
  assert.equal(f.sourceUrl,check.source,'Institutional reference required: '+r.witnessId+' '+key);
 }
}
const ciceroGeneva=matrix.records.find(r=>r.witnessId==='cicero-officiis-geneva');
assert.ok(ciceroGeneva,'Geneva Cicero codex dossier must remain present');
const genevaPaths=[
 ['physical','material'],['physical','dimensions'],['physical','collationFormula'],
 ['physical','ruling'],['physical','binding'],['physical','watermarks'],
 ['scribal','script'],['paratext','glosses'],['history','provenance'],['text','folioRange']
];
const genevaSource='https://e-codices.unifr.ch/en/description/bge/lat0088/Jeger';
for(const [group,key] of genevaPaths){
 const field=ciceroGeneva.fields[group][key];
 assert.ok(typeof field.value==='string'&&field.value.trim().length>=24,
  'Detailed source-supported codicological value missing: '+group+'.'+key);
 assert.equal(field.status,'institutional_catalogue_verified','Unverified Geneva status: '+group+'.'+key);
 assert.equal(field.sourceUrl,genevaSource,'Original Geneva catalogue link missing: '+group+'.'+key);
 assert.equal(field.verificationMethod,'institutional_catalogue_metadata_not_autoptic',
  'The catalogue record must not be mislabeled as an autoptic examination');
}
assert.equal(ciceroGeneva.missingCount,8,'No unsupported completion of other Geneva codicological fields');
assert.equal(allMissing,1742,'Ten sourced Geneva fields should reduce the outstanding research backlog by exactly ten');
console.log('PASS: 222 works untouched; 100 codicological records, 22 fields, 1742 genuinely pending; Harley and ten Geneva fields sourced to institutional catalogues');
