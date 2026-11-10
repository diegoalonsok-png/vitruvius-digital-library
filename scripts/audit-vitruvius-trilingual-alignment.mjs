/* Cotejo preliminar V514 ES / V554 FR / V297 EN.
   Solo lecturas e informes. Nunca reescribe archivos originales.
   Las diferencias de loci o extensión no son pruebas de error editorial. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const sources=[
 {id:'V514-ES',path:'data/structured/recensio-es.json',language:'es',editorialPriority:'referencia inicial'},
 {id:'V554-FR',path:'data/structured/recensio-fr.json',language:'fr',editorialPriority:'segunda edición consolidada'},
 {id:'V297-EN',path:'data/structured/theory-en.json',language:'en',editorialPriority:'requiere revisión comparativa'}
];
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase()
 .replace(/v/g,'u').replace(/j/g,'i').replace(/æ/g,'ae')
 .replace(/\s+/g,' ').trim();
const wordTokens=s=>(fold(s).match(/[a-z]{2,}/g)||[]);
const contentKey=p=>String(p.book)+'|'+String(p.chapter);
const bucket=(items)=>{
 const m=new Map();
 for(const p of items){const key=contentKey(p);if(!m.has(key))m.set(key,[]);m.get(key).push(p);}
 return m;
};
const parse=source=>{
 const d=JSON.parse(fs.readFileSync(path.join(root,source.path),'utf8'));
 if(!Array.isArray(d.passages)||!d.passages.length)throw new Error('Corpus ausente o no segmentado: '+source.path);
 const byId=new Map(),duplicates=[];
 for(const p of d.passages){
  if(!p.locus||!p.book||p.chapter===undefined)throw new Error('Locus mal definido en '+source.id);
  if(byId.has(p.locus))duplicates.push(p.locus);
  byId.set(p.locus,p);
 }
 if(duplicates.length)throw new Error('Identificadores duplicados en '+source.id+': '+duplicates.slice(0,9));
 return {...source,edition:d.edition,version:d.version,passages:d.passages,byId,chapters:bucket(d.passages),
  emptyLatin:d.passages.filter(x=>!x.latin?.trim()).map(x=>x.locus),
  emptyTranslation:d.passages.filter(x=>!x.translation?.trim()).map(x=>x.locus)};
};
const eds=sources.map(parse);
const commonWords=(a,b)=>{
 const A=new Set(wordTokens(a)),B=new Set(wordTokens(b));
 if(!A.size||!B.size)return {score:0,common:0,coverage:0};
 let intersection=0;for(const x of A)if(B.has(x))intersection++;
 return{score:Number((intersection/(A.size+B.size-intersection)).toFixed(3)),
  coverage:Number((intersection/A.size).toFixed(3)),common:intersection};
};
const pair=(a,b)=>{
 const onlyA=a.passages.filter(p=>!b.byId.has(p.locus)).map(p=>p.locus);
 const onlyB=b.passages.filter(p=>!a.byId.has(p.locus)).map(p=>p.locus);
 let sameLatin=0,differentLatin=0,shared=0;
 const sample=[];
 for(const p of a.passages){
  const other=b.byId.get(p.locus);if(!other)continue;
  shared++;
  if(fold(p.latin)===fold(other.latin))sameLatin++;else{
   differentLatin++;
   if(sample.length<18)sample.push({locus:p.locus,similarity:commonWords(p.latin,other.latin)});
  }
 }
 return {left:a.id,right:b.id,sharedLocusIds:shared,uniqueToLeftCount:onlyA.length,
  uniqueToRightCount:onlyB.length,onlyLeft:onlyA.slice(0,80),
  onlyRight:onlyB.slice(0,80),normalizedLatinSameAtSharedId:sameLatin,
  normalizedLatinDifferentAtSharedId:differentLatin,
  differenceSamples:sample,
  caution:'Las diferencias son candidatos para revisión, NO errores demostrados'};
};
const pairing=[pair(eds[0],eds[1]),pair(eds[0],eds[2]),pair(eds[1],eds[2])];
// Para cada locus sin homónimo, buscar solo posibles vecinos de su mismo capítulo.
// NO reasignar contenido automáticamente, aun cuando la coincidencia sea alta.
const unmatched=[];
for(const [source,target] of [[eds[0],eds[2]],[eds[1],eds[2]],[eds[2],eds[0]]]){
 for(const p of source.passages){
  if(target.byId.has(p.locus))continue;
  const candidates=(target.chapters.get(contentKey(p))||[])
   .map(q=>({locus:q.locus,...commonWords(p.latin,q.latin)}))
   .sort((a,b)=>b.coverage-a.coverage||b.score-a.score)
   .slice(0,3);
  unmatched.push({edition:source.id,locus:p.locus,language:source.language,
   target:target.id,chapter:String(p.book)+'.'+String(p.chapter),
   candidateSameChapter:candidates,
   status:'SIN LOCUS HOMÓNIMO; revisar contenido, no equivale a omisión'});
 }
}
const report={
 schema:'vitruvius-trilingual-alignment-preliminary-v1',
 generatedAt:new Date().toISOString(),
 editorialRule:'Castellano V514 como referencia inicial; francés V554 edición consolidada; inglés V297 más breve y con menor revisión. Las tres lecturas latinas necesitan cotejo de edición antes de resolver discrepancias.',
 scope:'Comparación de JSON segmentados por locus y latín; NO analiza aún de forma exhaustiva el aparato crítico de DOCX/PDF y NO certifica traducciones.',
 editions:eds.map(e=>({id:e.id,language:e.language,version:e.version,
  passages:e.passages.length,chapters:e.chapters.size,emptyLatin:e.emptyLatin,
  emptyTranslation:e.emptyTranslation,
  editorialPriority:e.editorialPriority})),
 pairwiseLocusComparisons:pairing,
 unmatchedLociCandidates:unmatched,
 policy:{
  noAutomaticEdits:true,noManuscriptEdits:true,
  priorityOrder:['pasaje omitido realmente','traducción asociada a otro pasaje','segmentación diferente','aparato crítico y notas'],
  distinction:'Falta de locus homónimo ≠ falta de texto; coincidencia de locus ≠ traducción correcta',
  nextStep:'Cotejo humano por capítulo y por frase latina, después de recuperar libro y aparato crítico de los DOCX/PDF originales'
 }
};
const output=path.join(root,'reports','vitruvius-trilingual-alignment.json');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n','utf8');
console.log('COTEJO PRELIMINAR ES/FR/EN');
for(const edition of report.editions)
 console.log(edition.id+' '+edition.passages+' loci / '+edition.chapters+' capítulos; transcripciones latinas vacías '+edition.emptyLatin.length);
for(const c of pairing)console.log(c.left+' vs '+c.right+': '+c.sharedLocusIds+' ID comunes; '+c.uniqueToLeftCount+' exclusivos izquierda, '+c.uniqueToRightCount+' exclusivos derecha; '+c.normalizedLatinDifferentAtSharedId+' lecturas latinas distintas (no son errores confirmados).');
console.log('Casos con ID no coincidente para revisión: '+unmatched.length);
console.log('Informe: reports/vitruvius-trilingual-alignment.json. No hubo modificaciones textuales.');
