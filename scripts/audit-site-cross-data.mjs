/* Auditoría unificada de solo lectura: páginas, corpus, búsquedas y metadatos.
   Genera un reporte reproducible. Nunca modifica testimonios ni originales. */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),warnings=[],errors=[];
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const has=p=>fs.existsSync(path.join(root,p));
const assert=(condition,message)=>{if(!condition)errors.push(message)};
const warn=(condition,message)=>{if(!condition)warnings.push(message)};
const scan=(dir,extension,items=[])=>{
 for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  if(e.name.startsWith('.')||['node_modules','vendor','__pycache__'].includes(e.name))continue;
  const f=path.join(dir,e.name);
  if(e.isDirectory())scan(f,extension,items);
  else if(e.name.endsWith(extension))items.push(path.relative(root,f));
 }
 return items;
};
const pages=scan(root,'.html');
const htmlReport={pages:pages.length,missingTitles:[],duplicateIds:[],missingAlt:[],unsafeLocalLinks:[]};
for(const file of pages){
 const doc=fs.readFileSync(path.join(root,file),'utf8');
 if(!/<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title>/i.test(doc))htmlReport.missingTitles.push(file);
 const ids=[...doc.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(m=>m[1]);
 const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);
 if(duplicates.length)htmlReport.duplicateIds.push({page:file,ids:[...new Set(duplicates)].slice(0,12)});
 for(const img of doc.matchAll(/<img\b([^>]*)>/gi)){
  if(!/\balt\s*=\s*["'][^"']*["']/i.test(img[1]))htmlReport.missingAlt.push(file);
 }
 for(const href of doc.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)){
  if(/^\s*(?:javascript:|data:text\/html)/i.test(href[1]))
   htmlReport.unsafeLocalLinks.push({page:file,href:href[1].slice(0,90)});
 }
}
assert(pages.length>=120,'Se esperaban >=120 páginas HTML');
assert(htmlReport.unsafeLocalLinks.length===0,'Enlaces href peligrosos en HTML');

const catalog=json('data/bibliotheca-graeca-latina-I-bce-I-ce.json');
const reg=json('data/classics-corpus/search-registry.json');
const road=json('data/classics-corpus/indexation-roadmap-222.json');
const ext=json('data/classics-corpus/external-index-reconciliation.json');
const works=new Map(catalog.works.map(w=>[w.id,w]));
const workIds=catalog.works.map(w=>w.id);
const unique=new Set(workIds);
assert(unique.size===workIds.length,'IDs duplicados en catálogo clásico');
assert(catalog.works.length===222,'No se conservan las 222 fichas catalogadas');
assert(reg.entries.length===reg.count,'El conteo declarado no coincide con las versiones registradas');
assert(road.items.length===catalog.works.length,'Roadmap de indexación incompleto');
assert(ext.remoteEntries.length===ext.counts.remoteOriginalsIndexed,'Índices externos desincronizados');
const registryDuplicate=[],registryBad=[];
const seen=new Set(),originals=new Set(),versions=new Set();
for(const e of reg.entries){
 const key=[e.workId,e.language,e.edition||'',e.path].join('|');
 if(seen.has(key))registryDuplicate.push(key);seen.add(key);
 if(!works.has(e.workId)||!e.path||!has(e.path)||!['la','grc','es','en','fr','de','it','pt'].includes(e.language))
  registryBad.push({id:e.workId,language:e.language,path:e.path});
 if(['la','grc'].includes(e.language))originals.add(e.workId);
 versions.add(e.workId);
}
assert(registryDuplicate.length===0,'Entradas duplicadas en registro de búsquedas');
assert(registryBad.length===0,'Corpus sin archivo, idioma válido o ficha de catálogo');
const remoteSet=new Set(ext.remoteEntries.map(e=>e.workId));
const remoteDuplicates=[...remoteSet].filter(id=>originals.has(id));
assert(remoteSet.size===ext.remoteEntries.length,'Originales externos duplicados');
assert(remoteDuplicates.length===0,'Original externo cuenta por duplicado con otro local');
const totalOriginals=new Set([...originals,...remoteSet]).size;
assert(totalOriginals===ext.counts.combinedOriginalsIndexed,'Conteo combinado original no reconciliado');
assert(ext.counts.originalsStillWithoutIndex===catalog.works.length-totalOriginals,'Pendientes del roadmap incorrectos');
const flags=road.items.filter(w=>w.effectiveOriginalIndexed).length;
assert(flags===totalOriginals,'Flags de indexación efectiva divergentes');
const roadmapOrphans=road.items.filter(w=>!works.has(w.id));
assert(roadmapOrphans.length===0,'Roadmap hace referencia a obras inexistentes');

const filenames=['recensio-es','recensio-fr','theory-en'];
const editions={};for(const name of filenames){
 const data=json('data/structured/'+name+'.json');
 const items=Array.isArray(data.passages)?data.passages:[];
 const loci=items.map(p=>p.locus);
 const dup=loci.filter((l,i)=>loci.indexOf(l)!==i);
 editions[name]={count:items.length,distinctLoci:new Set(loci).size,duplicates:[...new Set(dup)],
  books:[...new Set(items.map(p=>p.book))].sort((a,b)=>a-b),
  missingLatin:items.filter(p=>!p.latin||typeof p.latin!=='string').map(p=>p.locus).slice(0,25),
  missingTranslation:items.filter(p=>!p.translation||typeof p.translation!=='string').map(p=>p.locus).slice(0,25)};
 assert(!dup.length,'Loci duplicados en '+name);
 assert(editions[name].missingLatin.length===0,'Pasajes sin latino en '+name);
 assert(items.length>650,'Cobertura textual demasiado baja en '+name);
}
const es=json('data/structured/recensio-es.json').passages;
const en=json('data/structured/theory-en.json').passages;
const enMap=new Map(en.map(p=>[p.locus,p]));
const esMap=new Map(es.map(p=>[p.locus,p]));
const mismatches=es.filter(p=>enMap.has(p.locus)&&p.latin!==enMap.get(p.locus).latin);
const missingEnglish=es.filter(p=>!enMap.has(p.locus)).map(p=>p.locus);
const missingSpanish=en.filter(p=>!esMap.has(p.locus)).map(p=>p.locus);
const normalized=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,' ').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
const normalizedDifferences=mismatches.filter(p=>normalized(p.latin)!==normalized(enMap.get(p.locus).latin));
const alignment={missingEnglishLoci:missingEnglish,missingSpanishLoci:missingSpanish,
 latinTextLiteralDifferences:mismatches.length,latinTextNormalizedDifferences:normalizedDifferences.length,
 interpretation:'Advertencias, no errores automáticos: las ediciones y divisiones de párrafos pueden ser diferentes; cotejo editorial obligatorio antes de reasignar traducciones.'};
if(missingEnglish.length)warnings.push('Diferencias de segmentación o cobertura EN/ES: '+missingEnglish.join(', '));
if(normalizedDifferences.length)warnings.push('Latín de versiones inglesas y españolas difiere en '+normalizedDifferences.length+' loci después de normalización; no cambiar sin cotejo');

const report={
 schema:'vitruvius-unified-site-audit-v1',generatedAt:new Date().toISOString(),
 method:'Comprobación estática y estructural; no sustituye navegador real, HTTP ni cotejo manuscrito',
 html:htmlReport,
 bibliotheca:{catalogueWorks:catalog.works.length,registeredTextVersions:reg.entries.length,
  locallyIndexedOriginalWorks:originals.size,externalIndexedOriginalWorks:remoteSet.size,
  distinctOriginalWorksIndexed:totalOriginals,notIndexed:catalog.works.length-totalOriginals,
  registryDuplicate,registryBad,roadmapOrphans},
 vitruvius:{editions,alignment},warnings,errors
};
fs.mkdirSync(path.join(root,'reports'),{recursive:true});
const filename=path.join(root,'reports','site-audit-unified.json');
fs.writeFileSync(filename,JSON.stringify(report,null,2)+'\n','utf8');
console.log('Sitio: '+pages.length+' páginas HTML; catálogo '+catalog.works.length+
 ' obras; '+reg.entries.length+' versiones; '+totalOriginals+' originales locales/remotos.');
console.log('HTML: '+htmlReport.missingTitles.length+' títulos ausentes, '+
 htmlReport.duplicateIds.length+' páginas con IDs duplicados, '+
 htmlReport.missingAlt.length+' imágenes sin alt, '+htmlReport.unsafeLocalLinks.length+' enlaces inseguros.');
console.log('Textos: ES '+editions['recensio-es'].count+
 ', FR '+editions['recensio-fr'].count+', EN '+editions['theory-en'].count+
 '; EN sin equivalente 1:1 '+missingEnglish.length+', diferencias latinas normalizadas '+normalizedDifferences.length);
for(const x of warnings.slice(0,30))console.warn('REVIEW',x);
for(const x of errors)console.error('FAIL',x);
console.log('REPORTE '+path.relative(root,filename)+' · '+errors.length+' errores estructurales · '+warnings.length+' avisos filológicos');
if(errors.length)process.exitCode=1;
