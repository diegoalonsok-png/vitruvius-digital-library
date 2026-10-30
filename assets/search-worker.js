import {searchCorpus,parseLocus} from './search-core.mjs?v=20261030-locus-formats2';
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
  let output=searchCorpus(datasets,effective);
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
