import {searchCorpus,parseLocus} from './search-core.mjs?v=20261030-stability';
const cache=new Map();
async function corpus(edition,baseURL){
 if(!cache.has(edition.id))cache.set(edition.id,(async()=>{
  const response=await fetch(new URL('data/structured/'+edition.id+'.json',baseURL));
  if(!response.ok)throw Error('No se pudo cargar '+edition.version+'. Volvé a intentar.');
  const data=await response.json();
  if(!Array.isArray(data.passages)||data.edition!==edition.id)throw Error('Índice estructurado inválido: '+edition.version);
  return data;
 })().catch(error=>{cache.delete(edition.id);throw error;}));
 return cache.get(edition.id);
}
self.onmessage=async({data:m})=>{
 if(m.type!=='search')return;
 try{
  if(m.kind==='semantic')throw Error('La búsqueda por IA todavía no tiene un índice publicado. Usá palabras, frases o loci.');
  const selected=m.editions.filter(e=>m.scope==='all'||m.scope==='principal'||e.id===m.scope);
  if(!selected.length)throw Error('Elegí una edición con índice DOCX.');
  self.postMessage({type:'progress',requestId:m.requestId,message:'Consultando pasajes por libro, capítulo y sección…'});
  const loaded=await Promise.allSettled(selected.map(e=>corpus(e,m.baseURL)));
  const datasets=loaded.filter(x=>x.status==='fulfilled').map(x=>x.value);
  if(!datasets.length)throw loaded[0].reason;
  const resolved=parseLocus(m.query);const effective=resolved&&m.kind==='words'?{...m,kind:'locus'}:m;
  const output=searchCorpus(datasets,effective),warnings=loaded.flatMap((x,i)=>x.status==='rejected'?['No se pudo consultar '+selected[i].version]:[]);
  self.postMessage({type:'results',requestId:m.requestId,...output,warnings});
 }catch(error){self.postMessage({type:'error',requestId:m.requestId,message:error.message||'No se pudo completar la consulta.'});}
};
