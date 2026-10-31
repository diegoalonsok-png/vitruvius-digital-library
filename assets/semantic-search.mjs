// Genuine E5 retrieval. Scores indicate relative affinity, never word counts.
import{parseLocusRange,inLocusRange}from'./search-core.mjs';
let resourcePromise;
async function resources(baseURL,onProgress=()=>{}){
 if(!resourcePromise)resourcePromise=(async()=>{
  onProgress('Cargando el índice semántico del corpus…');
  const response=await fetch(new URL('data/embeddings-e5-small-index.json',baseURL));if(!response.ok)throw Error('El índice E5 no está disponible.');const index=await response.json();
  if(index.schema!==2||index.dtype!=='int8'||index.dimensions!==384)throw Error('Índice semántico incompatible.');
  const matrixResponse=await fetch(new URL('data/'+index.matrix,baseURL));if(!matrixResponse.ok)throw Error('No se pudo cargar la matriz E5.');const matrix=new Int8Array(await matrixResponse.arrayBuffer());
  if(matrix.length!==index.rows.length*index.dimensions)throw Error('Matriz semántica incompleta.');
  onProgress('Preparando E5 en este navegador. La primera consulta descarga el modelo; las consultas siguientes reutilizan la caché.');
  const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
  env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;
  const embed=await pipeline('feature-extraction',index.runtime_model,{dtype:'q8',device:'wasm',progress_callback:p=>{if(p.status==='progress'&&p.total)onProgress('Descargando modelo E5: '+Math.round(p.loaded*100/p.total)+' % · '+p.file);}});
  const norms=new Float32Array(index.rows.length);
  for(let row=0;row<norms.length;row++){let sum=0;for(let j=0;j<384;j++)sum+=matrix[row*384+j]**2;norms[row]=Math.sqrt(sum)||1;}
  return{index,matrix,norms,embed};
 })().catch(error=>{resourcePromise=null;throw error;});
 return resourcePromise;
}
export async function findRelatedUnits(query,{baseURL,editions,language='all',content='full',book='',chapter='',range='',limit=80,onProgress}={}){
 const locusRange=parseLocusRange(range);
 const{index,matrix,norms,embed}=await resources(baseURL,onProgress);onProgress?.('Buscando pasajes relacionados por significado…');
 const output=await embed('query: '+query,{pooling:'mean',normalize:true});const vector=output.data;const selected=new Set(editions);const hits=new Map();
 for(let row=0;row<index.rows.length;row++){
  const meta=index.rows[row];if(!selected.has(meta.edition)||language!=='all'&&meta.language!==language)continue;
  if(content==='notes'&&meta.type!=='note'||content==='commentary'&&!['commentary','table','paratext'].includes(meta.type)||content==='treatise'&&meta.type!=='treatise')continue;
  const parts=meta.locus?.split('.');if(book&&Number(parts?.[0])!==Number(book)||chapter&&parts?.[1]!==String(chapter))continue;
  if(!inLocusRange({book:Number(parts?.[0]),chapter:parts?.[1],section:Number(parts?.[2])},locusRange))continue;
  let score=0;for(let j=0;j<384;j++)score+=vector[j]*matrix[row*384+j];score/=norms[row];
  const key=meta.edition+':'+meta.unit_id;if(!hits.has(key)||score>hits.get(key).score)hits.set(key,{...meta,score});
 }
 return [...hits.values()].sort((a,b)=>b.score-a.score).slice(0,limit);
}
