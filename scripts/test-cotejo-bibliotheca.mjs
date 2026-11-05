/* Batería de integridad estructural; no sustituye cotejo filológico ni verificación HTTP.
 * node scripts/test-cotejo-bibliotheca.mjs
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const exists=p=>existsSync(new URL(p,root));
const editions=['recensio-es','recensio-fr','theory-en'].map(x=>read('data/structured/'+x+'.json'));
const loci=ed=>{
 const out=new Set();
 for(const p of ed.passages){
  assert.ok(p.latin?.trim()&&p.translation?.trim(),ed.edition+': empty text '+p.locus);
  assert.equal(Number(p.locus.split('.')[0]),p.book,'Book mismatch '+p.locus);
  for(let i=p.section;i<=(p.section_end||p.section);i++){
   const key=[p.book,p.chapter,i].join('.');
   assert.ok(!out.has(key),'Duplicate locus '+key);out.add(key);
  }
 }
 return [...out].sort();
};
const canonical=loci(editions[0]);
assert.equal(canonical.length,731);
for(const ed of editions){
 assert.deepEqual(loci(ed),canonical,'Inconsistent loci '+ed.edition);
 assert.match(ed.source?.sha256||'',/^[a-f0-9]{64}$/,'Missing source SHA');
}
const catalogue=read('data/bibliotheca-graeca-latina-I-bce-I-ce.json').works;
const extra=read('data/clasicos-perseus-extra.json').works;
const errors=[],samples=[];
const validStatus=new Set(['lectura-local-completa','lectura-local-parcial','repertoriado-busqueda-externa','fuente-externa-identificada','pendiente-de-incorporar']);
const ids=new Set();
let originals=0,localFiles=0,withoutDeclaredSpanish=0;
function inspect(w,origin){
 const key=origin+':'+w.id;
 assert.ok(w.id&&w.author&&w.title,'Incomplete entry '+key);
 assert.ok(!ids.has(key),'Duplicate id '+key);ids.add(key);
 assert.ok(['la','grc'].includes(w.language),'Unknown original language '+key);
 originals++;
 if(origin==='catalogue')assert.ok(validStatus.has(w.publicStatus),'Unclassified availability '+key);
 const langs=new Set([w.language]);
 const versions=origin==='external'? [{language:w.language,url:w.original},...(w.translations||[])] : [...(w.localVersions||[])];
 if(origin==='catalogue'&&w.localReader?.original)versions.push({language:w.language,path:w.localReader.original});
 if(origin==='catalogue')for(const path of (w.localReader?.translations||[])){
  const tag=path.includes('recensio-es')?'es':path.includes('recensio-fr')?'fr':path.includes('theory-en')?'en':null;
  if(!tag){errors.push(key+' translation language unknown: '+path);continue;}
  versions.push({language:tag,path});
 }
 for(const v of versions){
  assert.ok(v.language,'Missing version language '+key);
  langs.add(v.language);
  if(v.path){localFiles++;if(!exists(v.path))errors.push(key+' missing local file: '+v.path);}
  if(v.url&&!/^https:\/\//.test(v.url))errors.push(key+' invalid external URL: '+v.url);
 }
 if(!langs.has('es'))withoutDeclaredSpanish++;
 if(['cicero-officiis','lucretius','homer-iliad','plato-republic','stoa0275.stoa009','stoa0079.stoa001','phi0836.phi002','ll.petronius-satyrica'].includes(w.id))
  samples.push({id:key,author:w.author,title:w.title,languages:[...langs],spanishNotListed:!langs.has('es')});
}
catalogue.forEach(w=>inspect(w,'catalogue'));
extra.forEach(w=>inspect(w,'external'));
console.log(JSON.stringify({vitruvius:{editions:editions.map(e=>({id:e.edition,blocks:e.passages.length,loci:canonical.length})),canonicalLoci:canonical.length},bibliotheca:{catalogueWorks:catalogue.length,externalWorks:extra.length,originalEntries:originals,localFileReferences:localFiles,withoutDeclaredSpanish,examples:samples},errors},null,2));
assert.deepEqual(errors,[],'Broken local records or external URL metadata');
