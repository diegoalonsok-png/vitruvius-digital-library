/* Editorial integrity, not a substitute for philological collation or peer review.
 * Checks source identity, canonical coverage, grouped translations, manuscript
 * identification and the explicit certainty levels of the apparatus index.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const paths=['data/structured/recensio-es.json','data/structured/recensio-fr.json','data/structured/theory-en.json'];
const corpora=paths.map(read),catalog=read('data/catalog.json');
function coverage(corpus){
 const loci=new Set();
 for(const p of corpus.passages){
  assert.match(p.locus,/^[1-9]\d?\.(?:praef|[1-9]\d*)\.[1-9]\d*$/,'Malformed reference: '+p.locus);
  assert.ok(p.latin?.trim()&&p.translation?.trim(),'Empty original or translation: '+corpus.edition+' '+p.locus);
  assert.ok(p.book>=1&&p.book<=10,'Book outside the treatise: '+p.locus);
  assert.equal(p.locus,[p.book,p.chapter,p.section].join('.'),'Locator fields disagree: '+p.locus);
  for(let section=p.section;section<=(p.section_end||p.section);section++){
   const locus=[p.book,p.chapter,section].join('.');
   assert.ok(!loci.has(locus),'Overlapping or duplicate reference: '+corpus.edition+' '+locus);loci.add(locus);
  }
 }
 return [...loci].sort();
}
const canonical=coverage(corpora[0]);
assert.equal(canonical.length,731,'The canonical corpus must retain all 731 references');
const editions=corpora.map(c=>{
 const declared=catalog.editions.find(e=>e.id===c.edition);
 assert.equal(declared?.version,c.version,'Catalogue and reading edition disagree');
 assert.deepEqual(coverage(c),canonical,'A translation loses or invents canonical references: '+c.edition);
 assert.equal(typeof c.source?.filename,'string','Identify the source document');
 assert.match(c.source?.sha256||'',/^[a-f0-9]{64}$/,'Identify the source document fingerprint');
 return {id:c.edition,version:c.version,language:c.language,blocks:c.passages.length,loci:canonical.length,grouped:c.passages.filter(p=>p.section_end).map(p=>({from:p.locus,to:[p.book,p.chapter,p.section_end].join('.')}))};
});
const witnesses=read('data/bibliotheca-testimonia-verified.json');
const incompleteWitnesses=witnesses.records.filter(w=>!w.library||!w.shelfmark||!w.date||!(w.record||w.viewer||w.manifest)).map(w=>w.id);
assert.equal(incompleteWitnesses.length,0,'A manuscript lacks repository, shelfmark, date or source: '+incompleteWitnesses.join(', '));
const apparatus=read('data/apparatus-index.json'),relations={};
for(const entry of apparatus.entries){
 assert.ok(editions.some(e=>e.id===entry.edition),'Unidentified apparatus edition: '+entry.id);
 if(entry.page&&entry.pdf?.includes('#page='))assert.equal(Number(entry.pdf.split('#page=')[1]),Number(entry.page),'PDF page and apparatus link disagree: '+entry.id);
 const relation=entry.locusLink||'sin clasificación';relations[relation]=(relations[relation]||0)+1;
}
const works=read('data/bibliotheca-graeca-latina-I-bce-I-ce.json').works;
assert.equal(new Set(works.map(w=>w.id)).size,works.length,'Duplicate work identifiers');
const local=works.filter(w=>/^lectura-local-/.test(w.publicStatus||''));
const extra=read('data/clasicos-perseus-extra.json').works;
// Metrics are derived from existing immutable sources; never fill an empty
// manuscript field with invented data just to improve an academic score.
const matrix=read('data/classics-corpus/tei-codicology-research-matrix-89.json');
assert.equal(matrix.records.length,witnesses.records.length,
  'The codicological research matrix and witness register must describe the same number of records');
const matrixFields=matrix.records.map(r=>Object.values(r.fields||{}).flatMap(g=>Object.values(g)));
assert.ok(matrixFields.every(f=>f.length===matrix.fieldCount),
  'The codicological field matrix is structurally incomplete');
const missingCodicologicalFields=matrixFields.reduce((n,fields)=>n+
 fields.filter(f=>f?.value==null||String(f.value).trim()==='').length,0);
const linkedIds=new Set(witnesses.records.flatMap(w=>w.workIds||[]));
const worksWithWitness=works.filter(w=>linkedIds.has(w.id)).length;
const directWitnessKinds=new Set(['direct_original_latin','direct_original_greek']);
const directOriginalWitnesses=witnesses.records.filter(w=>directWitnessKinds.has(w.witnessKind)).length;
const fingerprint=createHash('sha256').update(JSON.stringify(corpora)).digest('hex');
const hasLocalTranslation=w=>w.localVersions?.some(v=>/translation/.test(v.kind||''))||w.localReader?.translations?.length||paths.includes(w.localReader?.original);
const report={schema:2,generated:new Date().toISOString().slice(0,10),scope:'Integridad del índice y trazabilidad editorial; no certifica cotejo filológico, calidad de traducción ni disponibilidad de servidores externos.',sourceFingerprint:fingerprint,sourceFingerprintMethod:'SHA-256 de JSON.stringify([recensio-es, recensio-fr, theory-en]); sin dependencia de espacios o saltos de línea.',
 editions,canonicalLoci:canonical.length,canonicalReferences:canonical,
 manuscripts:{
  records:witnesses.records.length,
  withRepositoryShelfmarkDateAndSource:witnesses.records.length-incompleteWitnesses.length,
  catalogueWorksWithLinkedWitness:worksWithWitness,
  catalogueWorksWithoutLinkedWitness:works.length-worksWithWitness,
  directOriginalWitnesses,
  note:'Una signatura documentada no acredita por sí sola que el códice sea el más antiguo conservado ni el testigo crítico más importante.'
 },
 apparatus:{entries:apparatus.entries.length,relations,method:apparatus.method},
 catalogue:{
  records:works.length,
  declaredLocalReadings:local.length,
  declaredCompleteLocalReadings:works.filter(w=>w.publicStatus==='lectura-local-completa').length,
  declaredPartialLocalReadings:works.filter(w=>w.publicStatus==='lectura-local-parcial').length,
  withLocalTranslation:local.filter(hasLocalTranslation).length,
  withExplicitEditionCitation:local.filter(w=>w.bibliography?.editionCitation).length,
  caveat:'El estado público de lectura es un dato de catálogo; no equivale a verificar el texto completo contra una edición crítica.'
 },
 codicology:{
  registeredWitnessRecords:matrix.records.length,
  uniquePhysicalObjects:matrix.uniquePhysicalObjects,
  fieldsPerWitness:matrix.fieldCount,
  fieldSlots:matrixFields.reduce((n,f)=>n+f.length,0),
  filledFieldSlots:matrixFields.reduce((n,f)=>n+f.length,0)-missingCodicologicalFields,
  pendingFieldSlots:missingCodicologicalFields,
  allFieldsFilled:matrixFields.filter(f=>f.every(x=>x?.value!=null&&String(x.value).trim()!=='')).length,
  caveat:'Pendiente no significa necesariamente aplicable; por ejemplo, la filigrana puede no corresponder al pergamino. Datos no comprobados no se infieren.'
 },
 externalClassicalRepertory:{records:extra.length,withTranslationLinks:extra.filter(w=>w.translations?.length).length,availability:'Fuentes enlazadas; este recuento no prueba lectura local completa ni cotejo de cada traducción.'},
 priorities:[
  'Cotejar los vínculos candidatos del aparato antes de elevarlos a correspondencias explícitas.',
  'Completar editor, traductor, fecha y edición concreta de todas las lecturas; no sustituir estos datos por la fecha antigua de composición.',
  'Verificar folio, página y locus individualmente; conservar separados manuscrito, edición, transcripción y OCR.',
  'Resolver las dudas vitruvianas mediante testimonio manuscrito y controles de Krohn y Budé, documentando las variantes.',
  'Revisar muestras de traducción por disciplina y por obra con fuentes críticas identificadas.'
 ]};
if(process.argv.includes('--write')&&process.argv.includes('--check'))throw Error('Use --write or --check, not both');
if(process.argv.includes('--write')){
 writeFileSync(new URL('../data/academic-integrity.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
}
if(process.argv.includes('--check')){
 const saved=read('data/academic-integrity.json');
 const {generated:ignoredSavedDate,...published}=saved;
 const {generated:ignoredFreshDate,...current}=report;
 assert.match(saved.generated||'',/^\d{4}-\d{2}-\d{2}$/,
  'Published integrity report needs an explicit generation date');
 assert.deepEqual(published,current,
  'The published academic integrity report is stale. Run: node scripts/academic-integrity.mjs --write');
 console.log('PASS: published academic integrity report agrees with catalogue, manuscripts, codicological matrix, apparatus and original-edition fingerprints.');
}
console.log(JSON.stringify({...report,canonicalReferences:undefined},null,2));
console.log('PASS: 731 canonical references in each edition, grouped English passages preserved, source identity and manuscript identification checked.');
