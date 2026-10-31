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
  const heading=requested.match(/\b(?:liber|liver|livre|libro|lib\.?|book)\s+(10|VIII|VII|VI|IV|IX|III|II|I|V|X|[1-9])(?:\s+(?:caput|capítulo|capitulo|chapter|chapitre)\s+(\d+))?/i);
  let effective={...m,query:requested};
  if(direct && (m.kind==='words'||m.kind==='locus'||m.kind==='semantic'))effective.kind='locus';
  else if(heading){
   effective={...m,kind:'locus',query:heading[1]+(heading[2]?'.'+heading[2]:'')};
   if(requested.length>heading[0].length+15)warnings.push('Consulta interpretada como referencia al libro o capítulo. Las notas editoriales y los argumenta no están indexados como texto de Vitruvio.');
  }
  // Identify a well-known work outside the indexed Vitruvian corpus, rather than
  // fabricating an exact match or silently returning zero.
  const identifyOtherWork=v=>/\\bde\\s+aqu(?:ae|e)ductu\\s+urbis\\s+rom(?:ae|e)\\b/i.test(v.replace(/æ/g,'ae').replace(/Æ/g,'Ae'))||/\\bde\\s+aquis\\s+urbis\\s+rom(?:ae|e)\\b/i.test(v.replace(/æ/g,'ae'));
  if(identifyOtherWork(requested)){
    warnings.push('Esta expresión es el título de una obra de Sexto Julio Frontino (De aquaeductu urbis Romae), no una cita literal de De architectura. Para consultar el tema en Vitruvio, buscá aqua, aquaeductus o el Libro VIII.');
    self.postMessage({type:'results',requestId:m.requestId,results:[],countSummary:null,warnings,semanticTerms:[]});
    return;
  }
  const greekLexicon={
   'συμμετρια':'symmetria','ευρυθμια':'eurythmia','μηχανη':'machina','αρχιτεκτονια':'architectura','αρχιτεκτονικη':'architectura','αρχιτεκτων':'architectus'
  };
  const normalizeGreek=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ');
  if(!direct&&!heading&&/[\u0370-\u03ff\u1f00-\u1fff]/u.test(requested)){
   const equivalent=greekLexicon[normalizeGreek(requested)];
   if(equivalent){
    effective={...effective,query:equivalent,kind:'words'};
    warnings.push('Correspondencia griego–latín: '+requested+' → '+equivalent+'. Se buscan las formas latinas, no apariciones literales del griego.');
   }else warnings.push('El término griego no tiene aún una correspondencia verificada en el índice selectivo.');
  }
  // A Greek dictionary equivalence is a multilingual corpus query, not a literal Greek hit.
  // Run each target-language equivalent separately so a Greek lookup can find the Latin
  // originals and their actual ES/FR/EN translations without inventing Greek quotations.
  if(!direct&&!heading&&m.kind==='words'&&/[Ͱ-Ͽἀ-῿]/u.test(requested)){
    const greekConcepts={
      'αρχιτεκτονικη':{la:['architectura','architectus','architecti'],es:['arquitectura','arquitecto'],fr:['architecture','architecte'],en:['architecture','architect']},
      'αρχιτεκτων':{la:['architectus','architecti','architectura'],es:['arquitecto','arquitectura'],fr:['architecte','architecture'],en:['architect','architecture']},
      'αρχιτεκτονια':{la:['architectura','architectus'],es:['arquitectura'],fr:['architecture'],en:['architecture']}
    };
    const concept=greekConcepts[normalizeGreek(requested)];
    if(concept){
      const found=new Map();
      for(const [language,terms] of Object.entries(concept)){
        if(m.language&&m.language!=='all'&&m.language!==language)continue;
        for(const term of terms){
          const matches=searchCorpus(datasets,{...effective,kind:'words',query:term,language,mode:'words'});
          for(const hit of matches.results){
            const key=hit.edition+'|'+hit.locus+'|'+hit.language;
            if(!found.has(key))found.set(key,{...hit,semantic_term:term,match_type:'greek_equivalent'});
          }
        }
      }
      const results=[...found.values()].sort((a,b)=>a.book-b.book||Number(a.chapter||0)-Number(b.chapter||0)||a.section-b.section);
      warnings.push('Equivalencias documentales de «'+requested+'» en latín y traducciones. Los resultados son pasajes que contienen esas palabras; no se afirma que la grafía griega figure literalmente en ellos.');
      self.postMessage({type:'results',requestId:m.requestId,results,countSummary:null,warnings,semanticTerms:Object.values(concept).flat()});
      return;
    }
  }
  if(m.kind==='semantic'&&!direct&&!heading){
    // Local lexical-semantic retrieval. Grounded only in corpus passages and
    // curated Latin terms, without remote AI services or invented quotations.
    const response=await fetch(new URL('data/latin-lexicon.json',m.baseURL));
    if(!response.ok)throw Error('No se pudo cargar el vocabulario semántico.');
    const dictionary=(await response.json()).entries||[];
    const norm=x=>String(x||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
    const words=x=>String(x||'').split(/[;,/·()\s]+/).filter(x=>x.length>=3);
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
    // For multiword queries, search individual words across every indexed
    // passage; return grounded excerpts and rank by phrase-word coverage.
    if(queryWords.length>1){
      const stop=new Set(['para','como','sobre','entre','desde','hasta','donde','which','with','from','about','that','this','the','and','del','las','los','una','uno','por','que','con','de','la','el','en','un','y','et','cum','in','ad','est']);
      const meaningful=[...new Set(words(requested).filter(t=>!stop.has(norm(t))))].slice(0,12);
      const coverage=new Map();
      for(const term of meaningful){
        const found=searchCorpus(datasets,{...effective,kind:'words',mode:'words',query:term});
        for(const hit of found.results){
          const key=hit.edition+'|'+hit.locus+'|'+hit.language;
          const previous=coverage.get(key)||{hit,terms:new Set()};
          previous.terms.add(norm(term));coverage.set(key,previous);
        }
      }
      for(const [key,item] of coverage){
        const score=Math.round(20+65*item.terms.size/Math.max(1,meaningful.length));
        const prior=merged.get(key);
        if(!prior||score>prior.score)merged.set(key,{...item.hit,score,semantic_term:[...item.terms].join(' · ')});
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
  // Long quotations pasted from other editions: rank real passages by
  // significant-word overlap, not invented exact textual correspondence.
  const quoteTokens=String(requested).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i').match(/[\p{L}]{3,}/gu)||[];
  if(!output.results.length&&quoteTokens.length>=7&&m.kind!=='count'&&m.kind!=='locus'){
   const stop=new Set(['que','los','las','con','por','para','del','una','uno','the','and','with','from','this','that','est','cum','qui','quae','quod','autem','sunt','non','sur','dans','des','les','une','mais']);
   const querySet=new Set(quoteTokens.filter(t=>!stop.has(t)));
   const matches=[];
   for(const data of datasets)for(const p of data.passages){
    if(m.book&&Number(m.book)!==p.book)continue;
    for(const [language,textValue] of [['la',p.latin],[data.language,p.translation]]){
     if(m.language&&m.language!=='all'&&m.language!==language)continue;
     const source=String(textValue||'');
     const indexed=new Set((source.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i').match(/[\p{L}]{3,}/gu)||[]).filter(t=>!stop.has(t)));
     let shared=0;for(const word of querySet)if(indexed.has(word))shared++;
     const ratio=shared/Math.max(1,querySet.size);
     if(shared>=4&&ratio>=0.35)matches.push({edition:data.edition,locus:p.locus,book:p.book,chapter:p.chapter,section:p.section,section_end:p.section_end,language,latin:p.latin,translation:p.translation,text:source,snippet:source.slice(0,650),context_start:0,context_length:0,partial_match:true,form:'',page:p.pdf_pages?.[language==='la'?'latin':'translation']||null,score:Math.round(ratio*100),match_type:'approximate_quote'});
    }
   }
   matches.sort((a,b)=>b.score-a.score||a.book-b.book||a.section-b.section);
   output.results=matches.slice(0,30);
   if(matches.length)warnings.push('Cita aproximada de otra edición: resultados ordenados por vocabulario compartido; verificá el locus y el texto original antes de citar.');
  }
  if(!output.results.length&&m.kind!=='count'&&m.kind!=='locus'&&!direct&&!heading){
   // Graceful lexical fallback for phrases: return real source passages only.
   const meaningful=[...new Set((requested.match(/[\p{L}]{4,}/gu)||[]).map(x=>x.toLowerCase()))].filter(t=>!['para','sobre','entre','como','desde','with','from','that','this','quae','quod','sunt','delle','dans','avec','pour','libro','livre','book','liber','liver'].includes(t)).slice(0,8);
   const candidates=new Map();
   for(const term of meaningful){
    const found=searchCorpus(datasets,{...effective,kind:'words',mode:'words',query:term});
    for(const hit of found.results){
     const key=hit.edition+'|'+hit.locus+'|'+hit.language;
     const item=candidates.get(key)||{hit,terms:new Set()};
     item.terms.add(term);candidates.set(key,item);
    }
   }
   const minHits=meaningful.length>=3?2:1;
   const approximate=[...candidates.values()].filter(x=>x.terms.size>=minHits).sort((a,b)=>b.terms.size-a.terms.size).slice(0,50);
   if(approximate.length){
    output.results=approximate.map(x=>({...x.hit,score:Math.round(100*x.terms.size/Math.max(1,meaningful.length)),partial_match:true,match_type:'partial_terms'}));
    warnings.push('No se encontró la frase literal. Se muestran pasajes reales que comparten varios términos de la consulta; estas no son coincidencias textuales exactas.');
   }
  }
  if(!output.results.length)warnings.push('Sin coincidencias en los documentos indexados con esta consulta. Probá otra forma, un lema más breve o un locus como IV.1.');
  self.postMessage({type:'results',requestId:m.requestId,...output,warnings});
 }catch(error){self.postMessage({type:'error',requestId:m.requestId,message:error.message||'No se pudo completar la consulta.'});}
};
