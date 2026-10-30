import {searchCorpus,parseLocus} from './search-core.mjs?v=20261030-prefix-roots';
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
  
  const selected=m.editions.filter(e=>m.scope==='all'||m.scope==='principal'||e.id===m.scope);
  if(!selected.length)throw Error('Elegí una edición con índice DOCX.');
  self.postMessage({type:'progress',requestId:m.requestId,message:'Consultando pasajes por libro, capítulo y sección…'});
  const loaded=await Promise.allSettled(selected.map(e=>corpus(e,m.baseURL)));
  const datasets=loaded.filter(x=>x.status==='fulfilled').map(x=>x.value);
  if(!datasets.length)throw loaded[0].reason;
  const warnings=loaded.flatMap((x,i)=>x.status==='rejected'?['No se pudo consultar '+selected[i].version]:[]);
  let requested=String(m.query||'').trim().replace(/^(?:\d{1,3}[.)]\s+)(?=[\p{L}])/u,'').replace(/[<>†‡]/g,' ').replace(/\s+/g,' ').trim();
  const direct=parseLocus(requested);
  const heading=requested.match(/\b(?:liber|libro|book)\s+(10|IX|VIII|VII|VI|IV|V|III|II|I|X|[1-9])(?:\s+(?:caput|capítulo|capitulo|chapter)\s+(\d+))?/i);
  let effective={...m,query:requested};
  if(direct && (m.kind==='words'||m.kind==='locus'))effective.kind='locus';
  else if(heading){
   effective={...m,kind:'locus',query:heading[1]+(heading[2]?'.'+heading[2]:'')};
   if(requested.length>heading[0].length+15)warnings.push('Consulta interpretada como referencia al libro o capítulo. Las notas editoriales y los argumenta no están indexados como texto de Vitruvio.');
  }
  const greekLexicon={
   'συμμετρια':'symmetria','ευρυθμια':'eurythmia','μηχανη':'machina','αρχιτεκτονια':'architectura'
  };
  const normalizeGreek=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ');
  if(!direct&&!heading&&/[\u0370-\u03ff\u1f00-\u1fff]/u.test(requested)){
   const equivalent=greekLexicon[normalizeGreek(requested)];
   if(equivalent){
    effective={...effective,query:equivalent,kind:'words'};
    warnings.push('Correspondencia griego–latín: '+requested+' → '+equivalent+'. Se buscan las formas latinas, no apariciones literales del griego.');
   }else warnings.push('El término griego no tiene aún una correspondencia verificada en el índice selectivo.');
  }
  if(m.kind==='semantic'){
    // Local lexical-semantic retrieval. Grounded only in corpus passages and
    // curated Latin terms, without remote AI services or invented quotations.
    const response=await fetch(new URL('data/latin-lexicon.json',m.baseURL));
    if(!response.ok)throw Error('No se pudo cargar el vocabulario semántico.');
    const dictionary=(await response.json()).entries||[];
    const norm=x=>String(x||'').normalize('NFD').replace(/\\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
    const words=x=>String(x||'').split(/[;,/·()\\s]+/).filter(x=>x.length>=3);
    const queryWords=words(requested).map(norm);
    const related=dictionary.filter(e=>{
      const candidates=[e.lemma,...(e.forms||[]),...(e.aliases||[]),e.es,e.en,e.fr,e.greek];
      return candidates.some(v=>v&&(queryWords.includes(norm(v))||words(v).some(t=>queryWords.includes(norm(t)))));
    });
    const searchTerms=[requested];
    for(const entry of related){
      searchTerms.push(entry.lemma,...(entry.forms||[]),...(entry.aliases||[]));
      for(const value of [entry.es,entry.en,entry.fr])if(value)searchTerms.push(...words(value).filter(x=>x.length>=4));
    }
    const unique=[...new Map(searchTerms.filter(x=>x&&x.length>=3).map(x=>[norm(x),x])).values()].slice(0,55);
    const merged=new Map();
    for(let i=0;i<unique.length;i++){
      const term=unique[i];
      const found=searchCorpus(datasets,{...effective,kind:'words',mode:'words',query:term});
      for(const hit of found.results){
        const key=hit.edition+'|'+hit.locus+'|'+hit.language;
        const score=i===0?100:related.some(e=>norm(e.lemma)===norm(term))?75:related.some(e=>(e.forms||[]).some(f=>norm(f)===norm(term)))?65:35;
        const prior=merged.get(key);
        if(!prior||score>prior.score)merged.set(key,{...hit,score,semantic_term:term});
      }
    }
    const ranked=[...merged.values()].sort((a,b)=>b.score-a.score||a.book-b.book||Number(a.chapter||0)-Number(b.chapter||0)||a.section-b.section).slice(0,600);
    warnings.push('Búsqueda conceptual local: '+(related.length?related.map(x=>x.lemma).join(', '):'sin equivalencias del léxico; se muestran coincidencias textuales')+'. Las equivalencias son orientativas, no verificaciones filológicas automáticas.');
    self.postMessage({type:'results',requestId:m.requestId,results:ranked,countSummary:null,warnings,semanticTerms:unique});
    return;
  }
  let output=searchCorpus(datasets,effective);
  if(!output.results.length && !direct && !heading && m.kind==='words' && /^[\p{L}\p{M}]{3,}$/u.test(requested)){
   output=searchCorpus(datasets,{...effective,prefixFallback:true});
   if(output.results.length)warnings.push('Búsqueda ampliada por raíz: se incluyen palabras que comienzan por «'+requested+'».');
  }
  // For a single technical term, also locate documented Latin inflections
  // and translate an exact Spanish/French/English dictionary equivalent.
  if(!direct&&!heading&&requested.split(/\s+/).length===1&&m.kind==='words'){
   try{
    const response=await fetch(new URL('data/latin-lexicon.json',m.baseURL));
    if(response.ok){
     const entries=(await response.json()).entries||[];
     const norm=x=>String(x||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
     const token=norm(requested);
     const entry=entries.find(e=>[e.lemma,...(e.forms||[]),...(e.aliases||[]),e.es,e.en,e.fr].filter(Boolean).some(x=>norm(x)===token));
     if(entry){
      const forms=[...new Set([requested,entry.lemma,...(entry.forms||[])])];
      const seen=new Set(output.results.map(x=>x.edition+'|'+x.locus+'|'+x.language));
      for(const form of forms){
       if(norm(form)===token)continue;
       const extra=searchCorpus(datasets,{...effective,query:form,kind:'words'});
       for(const hit of extra.results){const key=hit.edition+'|'+hit.locus+'|'+hit.language;if(!seen.has(key)){seen.add(key);output.results.push(hit);}}
      }
      output.results.sort((a,b)=>a.book-b.book||Number(a.chapter||0)-Number(b.chapter||0)||a.section-b.section);
      warnings.push('Lema '+entry.lemma+': se incluyeron las formas registradas del léxico; el recuento mostrado es de pasajes distintos.');
     }
    }
   }catch{warnings.push('No se pudo cargar el léxico de formas; se muestran coincidencias literales.');}
  }
  self.postMessage({type:'results',requestId:m.requestId,...output,warnings});
 }catch(error){self.postMessage({type:'error',requestId:m.requestId,message:error.message||'No se pudo completar la consulta.'});}
};
