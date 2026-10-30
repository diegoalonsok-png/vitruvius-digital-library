import {searchCorpus,parseLocus} from './search-core.mjs?v=20261030-quote-fix';
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
  let output=searchCorpus(datasets,effective);
  const warnings=loaded.flatMap((x,i)=>x.status==='rejected'?['No se pudo consultar '+selected[i].version]:[]);
  // Editorial headers and book summaries are not among the numbered Latin loci.
  // Offer book-level navigation, explicitly distinguishing it from a textual match.
  if(!output.results.length && m.kind==='words' && /\\b(?:LIBER|LIBRO|BOOK)\\s+(?:X|IX|VIII|VII|VI|IV|V|III|II|I|10|[1-9])\\b/i.test(m.query)){
   const found=m.query.match(/\\b(?:LIBER|LIBRO|BOOK)\\s+(X|IX|VIII|VII|VI|IV|V|III|II|I|10|[1-9])\\b/i);
   const locus=parseLocus(found[1]);
   if(locus){
    output=searchCorpus(datasets,{...m,kind:'locus',query:found[1]});
    warnings.push('La frase completa no aparece en los párrafos numerados del índice. Se muestran los pasajes del Libro '+found[1]+' como navegación, no como coincidencias de la cita. Los encabezados, argumenta y notas editoriales requieren un índice independiente.');
   }
  }
  self.postMessage({type:'results',requestId:m.requestId,...output,warnings});
 }catch(error){self.postMessage({type:'error',requestId:m.requestId,message:error.message||'No se pudo completar la consulta.'});}
};
