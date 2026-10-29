const pageCache=new Map();let extractorPromise,vectorPromise,passagePromise;
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/æ/gi,'ae').replace(/œ/gi,'oe').replace(/ſ/g,'s').toLowerCase();
const words=s=>(norm(s).match(/[\p{L}\p{N}]+/gu)||[]);
const phrase=s=>words(s).join(' ');
function chooseEditions(editions,scope){return editions.filter(e=>scope==='all'||(scope==='principal'?['recensio-es','recensio-fr','theory-en'].includes(e.id):e.id===scope));}
function progress(requestId,message){self.postMessage({type:'progress',requestId,message});}
async function readJSON(path){const r=await fetch(path);if(!r.ok)throw Error('No se pudo cargar un índice del corpus.');return r.json();}
async function pagesFor(e,baseURL){if(!e.text_index)throw Error('La edición '+e.id+' no dispone de índice textual.');if(!pageCache.has(e.id))pageCache.set(e.id,readJSON(new URL(e.text_index,baseURL)).then(p=>{if(!Array.isArray(p)||!p.every(x=>Number.isInteger(x.page)&&typeof x.text==='string'))throw Error('Índice inválido para '+e.id+'.');return p.map(x=>({...x,normalized:phrase(x.text)}));}).catch(err=>{pageCache.delete(e.id);throw err;}));return pageCache.get(e.id);}
function excerpt(text,terms){let offset=-1;const n=norm(text);for(const t of terms){const pos=n.indexOf(t);if(pos>=0&&(offset<0||pos<offset))offset=pos;}const start=offset>100?offset-90:0,end=Math.min(text.length,start+460);return(start?'…':'')+text.slice(start,end).trim()+(end<text.length?'…':'');}

async function textualSearch(m){
  const selected=chooseEditions(m.editions,m.scope),terms=words(m.query),needle=terms.join(' ');if(!terms.length)return[];if(!selected.length)throw Error('Todavía no hay textos indexados para esta selección. Elegí otra edición o consultá las fuentes externas.');
  progress(m.requestId,`Consultando ${selected.length} ediciones…`);
  const all=await Promise.all(selected.map(async e=>({edition:e,pages:await pagesFor(e,m.baseURL)})));
  const results=[];
  for(const {edition:e,pages}of all){for(const p of pages){const padded=' '+p.normalized+' ';let match;
    if(m.mode==='phrase')match=padded.includes(' '+needle+' ');else match=terms.every(t=>padded.includes(' '+t+' '));
    if(!match)continue;
    const exact=padded.includes(' '+needle+' ')?1:0;
    const score=exact*4+terms.reduce((sum,t)=>sum+Math.min(8,padded.split(' '+t+' ').length-1),0)+(e.category==='recensio'?.2:0);
    results.push({edition:e.id,page:p.page,snippet:excerpt(p.text,terms),score});
  }}
  return results.sort((a,b)=>b.score-a.score||a.edition.localeCompare(b.edition)||a.page-b.page);
}

async function countTerms(m){
  const selected=chooseEditions(m.editions,m.scope),terms=words(m.query);
  if(!terms.length)throw Error('Escribí una palabra o frase para contar.');if(!selected.length)throw Error('No hay textos indexados disponibles para el recuento en esta selección.');
  if(m.countMode==='prefix'&&terms.length!==1)throw Error('Para contar por raíz, escribí un solo comienzo de palabra, por ejemplo symmetr.');
  progress(m.requestId,`Contando las apariciones en ${selected.length} ediciones…`);
  const results=[],forms=new Map(),editionCounts=[];let pageCount=0;
  for(const e of selected){
    const pages=await pagesFor(e,m.baseURL);let total=0,matchedPages=0;
    for(const page of pages){
      const tokens=[...page.text.matchAll(/[\p{L}\p{N}\p{M}]+/gu)].map(match=>({value:norm(match[0]),raw:match[0],start:match.index,end:match.index+match[0].length}));
      let pageMatches=0;
      for(let i=0;i<=tokens.length-terms.length;i++){
        const found=m.countMode==='prefix'?tokens[i].value.startsWith(terms[0]):terms.every((term,j)=>tokens[i+j].value===term);
        if(!found)continue;
        const first=tokens[i],last=tokens[i+terms.length-1],start=Math.max(0,first.start-140),end=Math.min(page.text.length,last.end+220),prefix=start?'…':'';
        const key=tokens.slice(i,i+terms.length).map(t=>t.value).join(' '),form=tokens.slice(i,i+terms.length).map(t=>t.raw).join(' ');
        const previous=forms.get(key);forms.set(key,{form:previous?.form||form,count:(previous?.count||0)+1});
        total++;pageMatches++;
        results.push({edition:e.id,page:page.page,snippet:prefix+page.text.slice(start,end)+(end<page.text.length?'…':''),context_start:prefix.length+first.start-start,context_length:last.end-first.start,form,occurrence:total});
      }
      if(pageMatches)matchedPages++;
    }
    pageCount+=matchedPages;editionCounts.push({edition:e.id,total,pages:matchedPages});
  }
  return {results,countSummary:{total:results.length,pages:pageCount,editions:editionCounts,forms:[...forms.values()].sort((a,b)=>b.count-a.count||a.form.localeCompare(b.form)),mode:m.countMode||'exact'}};
}

async function getExtractor(m){
  if(!extractorPromise){extractorPromise=(async()=>{
    progress(m.requestId,'Cargando el modelo gratuito de búsqueda en este dispositivo…');
    const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js');
    env.allowLocalModels=false;env.useBrowserCache=typeof caches!=='undefined';
    env.backends.onnx.wasm.numThreads=1;
    const opts={dtype:'q8',device:'wasm',progress_callback:e=>{if(e.status==='progress'&&String(e.file).endsWith('.onnx'))progress(m.requestId,`Descargando el modelo de búsqueda: ${Math.round(e.progress||0)} %. La primera carga puede tardar.`);}};
    if(m.semantic.revision)opts.revision=m.semantic.revision;
    return pipeline('feature-extraction',m.semantic.model,opts);
  })().catch(err=>{extractorPromise=null;throw err;});}
  return extractorPromise;
}

async function semanticSearch(m){
  if(m.semantic?.status!=='ready')throw Error('El índice semántico aún no está disponible en esta versión. Podés usar la búsqueda por palabras.');
  const selected=new Set(chooseEditions(m.editions,m.scope).map(x=>x.id));
  if(!passagePromise)passagePromise=readJSON(new URL(m.semantic.passages,m.baseURL)).catch(e=>{passagePromise=null;throw e;});
  if(!vectorPromise)vectorPromise=fetch(new URL(m.semantic.vectors,m.baseURL)).then(r=>{if(!r.ok)throw Error('No se pudo cargar el índice semántico.');return r.arrayBuffer();}).then(b=>new Float32Array(b)).catch(e=>{vectorPromise=null;throw e;});
  const [extractor,passages,vectors]=await Promise.all([getExtractor(m),passagePromise,vectorPromise]);
  if(vectors.length!==passages.length*m.semantic.dimensions)throw Error('El índice semántico está incompleto. Usá la búsqueda textual.');
  progress(m.requestId,'Localizando pasajes por significado en las ediciones seleccionadas…');
  const output=await extractor('query: '+m.query,{pooling:'mean',normalize:true,truncation:true,max_length:m.semantic.max_length||288});
  const q=output.data,d=m.semantic.dimensions,best=new Map();
  for(let i=0;i<passages.length;i++){
    const p=passages[i];if(!selected.has(p.edition))continue;
    let score=0,offset=i*d;for(let j=0;j<d;j++)score+=vectors[offset+j]*q[j];
    const key=p.edition+':'+p.page,prev=best.get(key);
    if(!prev||score>prev.score)best.set(key,{edition:p.edition,page:p.page,snippet:p.text.length>650?p.text.slice(0,650)+'…':p.text,score});
  }
  return [...best.values()].sort((a,b)=>b.score-a.score).slice(0,80);
}

self.onmessage=async({data:m})=>{if(m.type!=='search')return;try{if(m.kind==='count'){self.postMessage({type:'results',requestId:m.requestId,...await countTerms(m)});return;}const results=m.kind==='semantic'?await semanticSearch(m):await textualSearch(m);self.postMessage({type:'results',requestId:m.requestId,results});}catch(err){self.postMessage({type:'error',requestId:m.requestId,message:m.kind==='semantic'?`La búsqueda por significado no pudo completarse. ${err.message||''} La búsqueda por palabras sigue disponible.`:err.message||'No se pudo completar la búsqueda.'});}};
