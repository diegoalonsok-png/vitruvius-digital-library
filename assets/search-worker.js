import {searchCorpus,parseLocus,normalize,tokens} from './search-core.mjs';
import {searchFullText} from './fulltext-core.mjs';
import {findRelatedUnits} from './semantic-search.mjs';
const cache=new Map();let lexiconPromise;
async function corpus(edition,baseURL,type='structured'){
 const key=type+':'+edition.id;
 if(!cache.has(key))cache.set(key,(async()=>{
  const path=type==='historical'?edition.text_index:'data/'+type+'/'+edition.id+'.json';const r=await fetch(new URL(path,baseURL));if(!r.ok)throw Error('No se pudo cargar '+edition.version);const d=await r.json();
  if(type==='historical')return{edition:edition.id,language:edition.languages[0],source:{method:'historical_ocr_unreviewed'},units:d.map(p=>({id:'pdf'+p.page,page:p.page,kind:'ocr',language:edition.languages[0],text:p.text,reference:'OCR histórico · página PDF '+p.page}))};
  if(d.edition!==edition.id||!Array.isArray(d[type==='structured'?'passages':'units']))throw Error('Índice inválido de '+edition.version);return d;
 })().catch(e=>{cache.delete(key);throw e;}));return cache.get(key);
}
async function lexicon(baseURL){if(!lexiconPromise)lexiconPromise=fetch(new URL('data/latin-lexicon.json',baseURL)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(d=>d.entries).catch(()=>{lexiconPromise=null;return[];});return lexiconPromise;}
function lexicalForms(query,entries){const key=normalize(query);const e=entries.find(e=>[e.lemma,e.greek,e.transliteration,...e.forms||[],...e.aliases||[]].filter(Boolean).some(x=>normalize(x)===key));return e?[...new Set([query,e.lemma,e.greek,...e.forms||[]].filter(Boolean))]:[query];}
function identity(r){return[r.edition,r.unit_id||r.locus,r.language].join('|');}
self.onmessage=async({data:m})=>{
 if(m.type!=='search')return;const progress=message=>self.postMessage({type:'progress',requestId:m.requestId,message});
 try{
  const query=String(m.query||'').trim(),reference=parseLocus(query);const canonical=reference||m.kind==='locus'||m.content==='treatise'&&m.kind!=='semantic';
  const type=canonical?'structured':m.content==='historical'?'historical':'fulltext';
  const chosen=m.editions.filter(e=>m.content==='historical'?['krohn-1912','ortiz-1787','cesariano-1521'].includes(e.id):(m.scope==='all'||m.scope==='principal'||e.id===m.scope)&&['recensio-es','recensio-fr','theory-en'].includes(e.id));
  if(!chosen.length)throw Error('No hay ediciones disponibles en esta selección.');progress('Cargando los textos de la selección…');
  const loaded=await Promise.allSettled(chosen.map(e=>corpus(e,m.baseURL,type)));const datasets=loaded.filter(x=>x.status==='fulfilled').map(x=>x.value);if(!datasets.length)throw Error('No se pudo cargar el corpus. Volvé a intentar.');
  const warnings=loaded.flatMap((x,i)=>x.status==='rejected'?['No se pudo consultar '+chosen[i].version]:[]);
  if(type==='historical')warnings.push('OCR histórico sin revisión: las cantidades son provisionales y las lecturas deben comprobarse en el facsímil.');
  if(m.kind==='semantic'){
   if(type==='historical')throw Error('E5 está disponible para las tres ediciones del autor. Para OCR histórico elegí Palabras y frases.');
   const hits=await findRelatedUnits(query,{...m,editions:datasets.map(d=>d.edition),onProgress:progress});const byEdition=new Map(datasets.map(d=>[d.edition,new Map(d.units.map(u=>[u.id,u]))]));
   const results=hits.flatMap(h=>{const u=byEdition.get(h.edition)?.get(h.unit_id);return u?[{...u,edition:h.edition,unit_id:u.id,fulltext:true,snippet:u.text.slice(h.start,h.end),text:u.text.slice(h.start,h.end),score:h.score,match_type:'semantic',semantic_term:''}]:[];});
   self.postMessage({type:'results',requestId:m.requestId,results,countSummary:null,content:m.content,warnings:[...warnings,'Pasajes ordenados por afinidad conceptual E5. No representan apariciones literales ni una verificación filológica.']});return;
  }
  const run=(q,overrides={})=>canonical?searchCorpus(datasets,{...m,query:q,...overrides}):searchFullText(datasets,{...m,query:q,...overrides});
  let output=run(query);const broad=m.kind==='words'&&m.mode!=='phrase'&&!reference;
  if(broad){
   const forms=await lexicon(m.baseURL).then(entries=>lexicalForms(query,entries));const merged=new Map(output.results.map(r=>[identity(r),r]));
   for(const form of forms){if(normalize(form)===normalize(query))continue;for(const r of run(form).results){const k=identity(r);if(!merged.has(k))merged.set(k,{...r,expanded_form:form});}}
   if(merged.size>output.results.length)warnings.push('Se incluyen formas y equivalencias del léxico selectivo; cada resultado conserva la grafía encontrada.');output.results=[...merged.values()];
   if(!output.results.length&&tokens(query).length===1&&tokens(query)[0].value.length>=3){output=run(query,{prefixFallback:true});if(output.results.length)warnings.push('Ampliación por raíz: palabras que empiezan por «'+query+'».');}
   if(!output.results.length&&tokens(query).length>1){
    const words=[...new Set(tokens(query).map(t=>t.raw))].filter(w=>w.length>=4).slice(0,10),partial=new Map();
    for(const word of words)for(const r of run(word).results){const key=identity(r),entry=partial.get(key)||{r,words:new Set()};entry.words.add(word);partial.set(key,entry);}
    output.results=[...partial.values()].filter(x=>x.words.size>=Math.min(2,words.length)).sort((a,b)=>b.words.size-a.words.size).slice(0,80).map(x=>({...x.r,partial_match:true,match_type:'partial_terms',semantic_term:[...x.words].join(' · ')}));
    if(output.results.length)warnings.push('Sin coincidencia de todas las palabras: se muestran contextos parciales, identificados expresamente.');
   }
  }
  self.postMessage({type:'results',requestId:m.requestId,...output,content:canonical?'treatise':m.content,warnings});
 }catch(error){self.postMessage({type:'error',requestId:m.requestId,message:error.message||'No se pudo completar la consulta.'});}
};
