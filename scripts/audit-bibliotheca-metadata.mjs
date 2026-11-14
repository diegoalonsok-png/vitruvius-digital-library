/* Bibliotheca: reproducible metadata audit. Read-only.
   Catalogue statements are not evidence of checking PDF/DOCX interiors. */
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const catalog=read('data/r2/catalogo-clasicos-r2.json');
const links=read('data/r2/vinculos-repertorio.json');
const items=catalog.items||[], findings=[], byHash=new Map(),byId=new Map();
const add=(severity,id,code,detail)=>findings.push({severity,id,code,detail});
for(const [index,e] of items.entries()){
 const id=e.id||'row-'+index;
 if(byId.has(id))add('error',id,'duplicate_id','ID repetido');
 byId.set(id,e);
 for(const key of ['autor','obra','tituloEdicion','pdf','fuente','anio']){
  if(e[key]===null||e[key]===undefined||String(e[key]).trim()==='')
   add('warning',id,'missing_'+key,'Falta '+key);
 }
 for(const key of ['pdf','fuente','texto']){
  if(e[key]&&!/^https:\/\//.test(e[key]))add('error',id,'invalid_'+key,'URL no HTTPS: '+e[key]);
 }
 if(e.sha256){
  const hash=String(e.sha256).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(hash))add('error',id,'invalid_sha256','Huella SHA-256 inválida');
  if(!byHash.has(hash))byHash.set(hash,[]);
  byHash.get(hash).push(id);
 }else add('warning',id,'missing_sha256','Sin huella para comprobar identidad');
 if(!Number.isInteger(e.paginas)||e.paginas<=0)add('warning',id,'page_count','Páginas desconocidas');
 if(Number.isInteger(e.paginasConTexto)&&Number.isInteger(e.paginas)&&e.paginasConTexto>e.paginas)
  add('error',id,'ocr_exceeds_pages','OCR supera el total de páginas');
 const volFromTitle=String(e.tituloEdicion||'').match(/\bvol(?:ume|umen)?\.?\s*(?:([ivxlcdm]+)|(\d+))/i);
 const volFromId=String(id).match(/(?:vol)(\d+)$/i);
 if(volFromId&&volFromTitle){
  const roman=x=>{let n=0,prev=0;for(const ch of x.toUpperCase().split('').reverse()){const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}[ch]||0;n+=v<prev?-v:v;prev=v}return n};
  const titleVolume=volFromTitle[2]?Number(volFromTitle[2]):roman(volFromTitle[1]);
  if(titleVolume!==Number(volFromId[1]))add('high',id,'volume_identity_mismatch',
   'Nombre del archivo indica volumen '+Number(volFromId[1])+' pero título catalogado indica volumen '+titleVolume+'; verificar portada antes de afirmar identidad');
 }
 if(/s\/d|sin cotejar|no cotejad|por verificar/i.test(String(e.idiomaEdicion||'')))
  add('review',id,'language_unresolved','Idioma de edición sin dato comprobado');
 if(e.estadoRevision)add('review',id,'editorial_review_status',String(e.estadoRevision));
}
for(const [hash,ids] of byHash){
 if(ids.length>1)add('high',ids.join(', '),'identical_pdf_hash',
  ids.length+' entradas comparten el mismo SHA-256. Comprobar si son referencias alternativas o duplicados antes de afirmar volúmenes distintos');
}
for(const w of links.obrasNuevas||[]){
 const e=byId.get(w.r2);
 if(!e)add('error',w.r2,'orphan_work','Registro bibliográfico sin edición R2');
 else if(w.pdf&&w.pdf!==e.pdf)add('high',w.r2,'pdf_link_disagreement','El PDF de la ficha difiere del catálogo R2');
}
for(const [work,versions] of Object.entries(links.porObra||{})){
 for(const edition of versions||[]){
  if(!byId.has(edition.r2))add('error',work,'missing_linked_edition','Edición R2 inexistente: '+edition.r2);
 }
}
const severityOrder=['error','high','warning','review'];
findings.sort((a,b)=>severityOrder.indexOf(a.severity)-severityOrder.indexOf(b.severity)||a.id.localeCompare(b.id));
const summary={editions:items.length,linkedNewWorks:(links.obrasNuevas||[]).length,
 counts:Object.fromEntries(severityOrder.map(k=>[k,findings.filter(f=>f.severity===k).length])),
 note:'Auditoría estructural del catálogo. NO confirma lectura de portadas, interior del PDF/DOCX, exactitud ecdótica, enlaces remotos ni equivalencias entre folios y loci.'};
const report={schema:'vitruvius-bibliotheca-metadata-audit-1',generatedAt:new Date().toISOString(),summary,findings};
mkdirSync('reports/bibliotheca',{recursive:true});
writeFileSync('reports/bibliotheca/catalogue-metadata-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
for(const f of findings.filter(f=>f.severity==='high'||f.severity==='error').slice(0,35))
 console.log(f.severity.toUpperCase(),f.id,f.code,f.detail);
if(summary.counts.error)process.exitCode=1;
