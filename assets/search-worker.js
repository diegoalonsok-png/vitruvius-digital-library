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
  const warnings=loaded.flatMap((x,i)=>x.status==='rejected'?['No se pudo consultar '+selected[i].version]:[]);
  let requested=String(m.query||'').trim();
  const direct=parseLocus(requested);
  const heading=requested.match(/\\b(?:liber|libro|book)\\s+(10|IX|VIII|VII|VI|IV|V|III|II|I|X|[1-9])(?:\\s+(?:caput|capítulo|capitulo|chapter)\\s+(\\d+))?/i);
  let effective={...m,query:requested};
  if(direct && (m.kind==='words'||m.kind==='locus'))effective.kind='locus';
  else if(heading){
   effective={...m,kind:'locus',query:heading[1]+(heading[2]?'.'+heading[2]:'')};
   if(requested.length>heading[0].length+15)warnings.push('Consulta interpretada como referencia al libro o capítulo. Las notas editoriales y los argumenta no están indexados como texto de Vitruvio.');
  }
  const greekLexicon={
   'συμμετρια':'symmetria','ευρυθμια':'eurythmia','μηχανη':'machina','αρχιτεκτονια':'architectura'
  };
  const normalizeGreek=value=>String(value).normalize('NFD').replace(/\\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ');
  if(!direct&&!heading&&/[\\u0370-\\u03ff\\u1f00-\\u1fff]/u.test(requested)){
   const equivalent=greekLexicon[normalizeGreek(requested)];
   if(equivalent){
    effective={...effective,query:equivalent,kind:'words'};
    warnings.push('Correspondencia griego–latín: '+requested+' → '+equivalent+'. Se buscan las formas latinas, no apariciones literales del griego.');
   }else warnings.push('El término griego no tiene aún una correspondencia verificada en el índice selectivo.');
  }
  const output=searchCorpus(datasets,effective);
  self.postMessage({type:'results',requestId:m.requestId,...output,warnings});
 }catch(error){self.postMessage({type:'error',requestId:m.requestId,message:error.message||'No se pudo completar la consulta.'});}
};
