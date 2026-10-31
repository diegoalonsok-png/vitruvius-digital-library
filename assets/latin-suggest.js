(async()=>{
 const input=document.getElementById('query')||document.getElementById('term');if(!input)return;
 const form=input.form;if(!form)return;
 const host=document.createElement('div');host.id='latin-suggest';host.hidden=true;host.className='dictionary-entry';host.setAttribute('aria-label','Sugerencias léxicas latinas');form.append(host);
 const gloss=document.createElement('section');gloss.id='latin-gloss';gloss.className='dictionary-entry';gloss.hidden=true;gloss.setAttribute('aria-live','polite');form.after(gloss);
 let entries=[],passageData=null;
 const occurrences=document.createElement('section');occurrences.id='lexical-occurrences';occurrences.className='dictionary-entry';occurrences.hidden=true;occurrences.setAttribute('aria-live','polite');gloss.after(occurrences);
 const {lexicalSuggestions}=await import('./lexical-suggestions.mjs?v=20261030-history');
 const normalizeWord=v=>String(v).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
 function wordMatches(text,words){
  const tokens=String(text||'').match(/[\p{L}\p{M}]+/gu)||[];
  return tokens.reduce((n,t)=>n+(words.has(normalizeWord(t))?1:0),0);
 }
 const corpora=[
  {id:'recensio-es',label:'V514 · latín/castellano'},
  {id:'recensio-fr',label:'V554 · latín/francés'},
  {id:'theory-en',label:'V297 · latín/inglés'}
 ];
 let corpusPromise=null;
 const loadCorpora=()=>corpusPromise||(corpusPromise=Promise.allSettled(corpora.map(async e=>{
  const response=await fetch('data/structured/'+e.id+'.json');
  if(!response.ok)throw Error(e.id);
  return {...e,passages:(await response.json()).passages||[]};
 })));
 function matchingTokens(text,forms){
  const found=[];
  for(const match of String(text||'').matchAll(/[\p{L}\p{M}]+/gu)){
   const token=normalizeWord(match[0]);
   if(forms.has(token))found.push(match[0]);
  }
  return found;
 }
 async function showOccurrences(){
  const searched=input.value.trim(),token=normalizeWord(searched);
  occurrences.replaceChildren();occurrences.hidden=true;
  if(!searched||searched.length>90||!/[\p{L}]/u.test(searched))return;
  const queryWords=[...searched.matchAll(/[\p{L}\p{M}]+/gu)].map(x=>normalizeWord(x[0]));
  if(queryWords.length!==1)return;
  const entry=entries.find(e=>[e.lemma,...(e.forms||[]),e.greek,e.transliteration].filter(Boolean).some(v=>normalizeWord(v)===token));
  const forms=new Set([searched,...(entry?[entry.lemma,...(entry.forms||[]),entry.transliteration,entry.greek]:[])].filter(Boolean).map(normalizeWord));
  const title=document.createElement('h3');title.textContent='Concordancia de las ediciones · '+searched;occurrences.append(title);occurrences.hidden=false;
  const status=document.createElement('p');status.textContent='Consultando latín y traducciones en las tres ediciones…';occurrences.append(status);
  try{
   const loaded=await loadCorpora();if(input.value.trim()!==searched)return;
   let total=0,passages=0,sections=[],failures=0;
   for(const outcome of loaded){
    if(outcome.status!=='fulfilled'){failures++;continue;}
    const edition=outcome.value;let editionCount=0,editionPassages=0;
    const hits=[];
    for(const p of edition.passages){
     const latin=matchingTokens(p.latin,forms),translation=matchingTokens(p.translation,forms);
     if(latin.length||translation.length){
      editionCount+=latin.length+translation.length;editionPassages++;
      hits.push({p,latin,translation});
     }
    }
    total+=editionCount;passages+=editionPassages;
    if(hits.length){
     const group=document.createElement('details');group.open=true;
     const summary=document.createElement('summary');summary.textContent=edition.label+' · '+editionCount+' apariciones · '+editionPassages+' pasajes';group.append(summary);
     const list=document.createElement('ol');
     for(const hit of hits.slice(0,20)){
      const li=document.createElement('li'),a=document.createElement('a'),p=hit.p;
      a.href='lector-bilingue.html?edition='+encodeURIComponent(edition.id)+'&locus='+encodeURIComponent(p.locus)+'&q='+encodeURIComponent(searched);
      a.textContent='Vitr., De arch. '+p.locus;li.append(a);
      const details=['latín: '+hit.latin.length,'traducción: '+hit.translation.length].join(' · ');
      const source=hit.translation.length&&!hit.latin.length?p.translation:p.latin;
      const tokenMatch=[...String(source||'').matchAll(/[\p{L}\p{M}]+/gu)].find(m=>forms.has(normalizeWord(m[0])));
      const at=tokenMatch?.index||0;
      li.append(document.createTextNode(' ('+details+') — '+String(source||'').slice(Math.max(0,at-55),at+125)));
      list.append(li);
     }
     group.append(list);
     if(hits.length>20){const p=document.createElement('p');p.textContent='Primeros 20 resultados de esta edición.';group.append(p);}
     sections.push(group);
    }
   }
   status.textContent=total+' apariciones en '+passages+' pasajes indexados (latín y traducciones, por edición).'+(entry?' Equivalencias del léxico local incluidas.':'')+(failures?' No se pudieron cargar '+failures+' edición(es).':'');
   for(const section of sections)occurrences.append(section);
   if(!total){const p=document.createElement('p');p.textContent='No hubo coincidencias literales en las ediciones indexadas. Puede tratarse de una forma morfológica distinta o de un texto no incorporado; cero no significa ausencia en el tratado.';occurrences.append(p);}
  }catch(error){status.textContent='No se pudo consultar el corpus: '+error.message;}
 }

 try{const response=await fetch('data/latin-lexicon.json?v=20261030-dictionary-6');if(!response.ok)throw Error();entries=(await response.json()).entries;}catch{gloss.hidden=false;gloss.textContent='El léxico local no pudo cargarse. Volvé a intentarlo al recargar.';return;}
 const norm=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
 function textLine(parent,label,value){if(!value)return;const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+' ';p.append(b,document.createTextNode(value));parent.append(p);}
 function corpusContext(value){
  const section=document.createElement('details'),summary=document.createElement('summary');
  section.open=true;summary.textContent='Concordancia textual · '+value;section.append(summary);
  const status=document.createElement('p');status.textContent='Buscando la forma exacta en los pasajes indexados…';section.append(status);
  if(!passageData)fetch('data/structured/recensio-es.json').then(r=>r.ok?r.json():Promise.reject(Error('Índice no disponible'))).then(d=>{passageData=d.passages||[];fill()}).catch(()=>{status.textContent='No se pudo cargar el índice textual.'});else fill();
  function fill(){
   if(input.value.trim()!==value)return;
   const q=norm(value),hits=[];
   for(const p of passageData){const ts=String(p.latin||'').matchAll(/[\p{L}\p{M}]+/gu);for(const m of ts)if(norm(m[0])===q){hits.push({p,index:m.index,term:m[0]});break;}}
   status.textContent=hits.length+' pasajes del texto latino V514 con esta grafía.';
   for(const {p,index,term} of hits.slice(0,12)){const para=document.createElement('p'),a=document.createElement('a');a.href='lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(p.locus)+'&q='+encodeURIComponent(value);a.textContent='Vitr., De arch. '+p.locus+' →';const snippet=String(p.latin||'').slice(Math.max(0,index-55),index+term.length+95);para.append(a,document.createTextNode(' · '+snippet));section.append(para);}
  }
  return section;
 }

 // Wide-coverage dictionary: on-demand Wiktionary lookup, not a 42-word whitelist.
 // Only textContent from the remote document is shown; no remote HTML is inserted.
 const liveCache=new Map();let liveTicket=0;
 function externalDictionary(term,isGreek){
  const ticket=++liveTicket, language=isGreek?'Ancient Greek':'Latin';
  const details=document.createElement('details');details.open=true;details.className='dictionary-live';
  const sum=document.createElement('summary');sum.textContent='Diccionario amplio · '+language+' · '+term;details.append(sum);
  const message=document.createElement('p');message.textContent='Consultando el diccionario…';details.append(message);
  gloss.append(details);gloss.hidden=false;
  const key=language+':'+term.toLowerCase();
  if(!liveCache.has(key)){
   const url=new URL('https://en.wiktionary.org/w/api.php');
   url.searchParams.set('action','parse');url.searchParams.set('page',term);
   url.searchParams.set('prop','text');url.searchParams.set('format','json');url.searchParams.set('formatversion','2');url.searchParams.set('origin','*');
   liveCache.set(key,fetch(url.toString()).then(r=>{if(!r.ok)throw Error('Fuente no disponible');return r.json()}).then(data=>{
    if(data.error||!data.parse?.text)throw Error('No se encontró una entrada para esta grafía');
    const documentHTML=new DOMParser().parseFromString(data.parse.text,'text/html');
    const headings=[...documentHTML.querySelectorAll('h2')];
    const heading=headings.find(h=>[h.id,h.querySelector('[id]')?.id,h.textContent.trim()].some(v=>v&&v.toLowerCase().replace(/[_ ]/g,'')===language.toLowerCase().replace(/ /g,'')));
    if(!heading)return {definitions:[],status:'La página existe, pero no contiene una sección de '+language+'.'};
    let node=(heading.closest('.mw-heading')||heading).nextElementSibling,definitions=[],grammar=[];
    while(node&&node.tagName!=='H2'&&!node.matches?.('.mw-heading2')){
     if(node.matches?.('h3,h4,.mw-heading3,.mw-heading4'))grammar.push(node.textContent.trim());
     for(const list of (node.matches?.('ol')?[node]:[...node.querySelectorAll('ol')].filter(x=>!x.closest('li'))))for(const li of [...list.children].filter(x=>x.tagName==='LI')){
      const clone=li.cloneNode(true);clone.querySelectorAll('ul,ol,.reference,.mw-cite-backlink,.nyms-toggle').forEach(n=>n.remove());
      const value=clone.textContent.replace(/\\s+/g,' ').trim();
      if(value.length>2&&!definitions.includes(value))definitions.push(value.slice(0,330));
     }
     node=node.nextElementSibling;
    }
    return {definitions:definitions.slice(0,12),grammar:grammar.slice(0,6)};
   }).catch(error=>({definitions:[],status:error.message||'Consulta no disponible'})));
  }
  liveCache.get(key).then(result=>{
   if(ticket!==liveTicket||!details.isConnected)return;
   message.textContent=result.definitions.length?'Acepciones de Wikcionario (en inglés), presentadas dentro de la biblioteca:':result.status||'Sin acepciones extraíbles para esta forma.';
   if(result.grammar?.length){const p=document.createElement('p');p.textContent='Clasificación: '+result.grammar.join(' · ');details.append(p);}
   if(result.definitions.length){const ol=document.createElement('ol');for(const d of result.definitions){const li=document.createElement('li');li.textContent=d;ol.append(li);}details.append(ol);}
   // Automatically follow the lemma of inflected Latin forms. This works
   // for any form whose dictionary entry explicitly identifies a lemma,
   // rather than requiring one handwritten definition per Latin word.
   if(language==='Latin'&&result.definitions.length){
     const first=result.definitions.find(d=>/\\b(?:of|from)\\s+[\\p{L}\\p{M}]{3,}/iu.test(d));
     const lemma=first?.match(/\\b(?:of|from)\\s+([\\p{L}\\p{M}]{3,})/iu)?.[1];
     if(lemma&&lemma.toLocaleLowerCase()!==term.toLocaleLowerCase()){
       const lemmaPanel=document.createElement('section');lemmaPanel.className='dictionary-lemma';
       const head=document.createElement('h4');head.textContent='Lema latino detectado automáticamente: '+lemma;lemmaPanel.append(head);
       const loading=document.createElement('p');loading.textContent='Consultando las acepciones del lema…';lemmaPanel.append(loading);
       details.append(lemmaPanel);
       const lemmaLink=document.createElement('a');lemmaLink.href='https://es.wiktionary.org/wiki/'+encodeURIComponent(lemma);lemmaLink.target='_blank';lemmaLink.rel='noopener';lemmaLink.textContent='Consultar el lema en Wikcionario en castellano ↗';lemmaPanel.append(lemmaLink);
       const api=new URL('https://en.wiktionary.org/w/api.php');
       for(const [k,v] of Object.entries({action:'parse',page:lemma,prop:'text',format:'json',formatversion:'2',origin:'*'}))api.searchParams.set(k,v);
       fetch(api).then(x=>x.ok?x.json():Promise.reject(Error('Lema no disponible'))).then(data=>{
         if(ticket!==liveTicket||!lemmaPanel.isConnected)return;
         if(!data.parse?.text)throw Error('No hay acepciones disponibles');
         const doc=new DOMParser().parseFromString(data.parse.text,'text/html');
         const h=[...doc.querySelectorAll('h2')].find(x=>x.textContent.toLowerCase().includes('latin'));
         let node=(h?.closest('.mw-heading')||h)?.nextElementSibling,found=[];
         while(node&&node.tagName!=='H2'&&!node.matches?.('.mw-heading2')){
           for(const li of node.querySelectorAll('ol > li')){
             const copy=li.cloneNode(true);copy.querySelectorAll('ol,ul,.reference').forEach(x=>x.remove());
             const meaning=copy.textContent.replace(/\\s+/g,' ').trim();
             if(meaning.length>2&&!found.includes(meaning))found.push(meaning.slice(0,250));
           }
           node=node.nextElementSibling;
         }
         loading.textContent=found.length?'Acepciones del lema (fuente lexicográfica, inglés):':'No fue posible extraer las acepciones del lema.';
         if(found.length){const list=document.createElement('ol');for(const meaning of found.slice(0,8)){const li=document.createElement('li');li.textContent=meaning;list.append(li);}lemmaPanel.append(list);}
       }).catch(()=>{if(loading.isConnected)loading.textContent='No se pudo consultar automáticamente el lema. Utilizá el enlace al diccionario.';});
     }
   }
   const foot=document.createElement('p');foot.className='source';foot.textContent='Fuente: Wikcionario en inglés (Wikimedia, CC BY-SA). La forma consultada puede requerir buscar su lema; verificá las acepciones según el contexto vitruviano.';details.append(foot);
  });
 }
 function displayGloss(){
  const value=input.value.trim(),token=norm(value.split(/\s+/).at(-1)||'');gloss.replaceChildren();gloss.hidden=true;if(!token||/^[IVX\d.,]+$/i.test(value))return; if(value.split(/\s+/).length===1)externalDictionary(value,/[\u0370-\u03ff\u1f00-\u1fff]/u.test(value));
  const entry=entries.find(e=>[e.lemma,...e.forms||[]].some(w=>norm(w)===token));
  const greekMatches=/[\u0370-\u03ff\u1f00-\u1fff]/u.test(value)?entries.filter(e=>e.greek&&norm(e.greek)===token):[];
  if(greekMatches.length){
   const details=document.createElement('details'),summary=document.createElement('summary');details.open=true;summary.textContent='Griego y léxico vitruviano · '+value;details.append(summary);
   for(const e of greekMatches){
    textLine(details,'Término griego:',e.greek);textLine(details,'Equivalente latino:',e.lemma);
    textLine(details,'Castellano:',e.es);textLine(details,'English:',e.en);textLine(details,'Français:',e.fr);
    const b=document.createElement('button');b.type='button';b.className='dictionary-form';b.textContent='Buscar «'+e.lemma+'» en Vitruvio';b.addEventListener('click',()=>{input.value=e.lemma;hide();displayGloss();form.requestSubmit();});details.append(b);
   }
   const note=document.createElement('p');note.className='source';note.textContent='Correspondencia terminológica orientativa; no implica que la grafía griega aparezca literalmente en el tratado. La búsqueda del equivalente latino permite comprobar sus pasajes.';details.append(note);gloss.append(details);gloss.hidden=false;return;
  }
  if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(value)){
   const documentedGreek={'αρχιτεκτονικη':{lemma:'ἀρχιτεκτονική',meaning:'arquitectura; arte o técnica del arquitecto',en:'architecture; the art of building',fr:'architecture; art de bâtir',latin:'architectura',note:'Equivalencia terminológica griego-latín; no acredita la aparición literal de esta grafía en el texto latino.'},'αρχιτεκτων':{lemma:'ἀρχιτέκτων',meaning:'arquitecto, maestro de obras',en:'architect, master builder',fr:'architecte, maître d’œuvre',latin:'architectus',note:'Equivalencia lexicográfica; la presencia en el corpus debe comprobarse por separado.'},'φθογγοι':{lemma:'φθόγγος',meaning:'sonido, tono musical, nota',en:'sound, musical tone',fr:'son, ton musical',locus:'V.4.5',note:'En V.4.5 Vitruvio explica que los sonitus se llaman φθόγγοι en griego; este significado se apoya en el texto y la traducción de la edición V514, no en una identificación automática.'}};
   const documented=documentedGreek[token];
   if(documented){const details=document.createElement('details'),summary=document.createElement('summary');details.open=true;summary.textContent='Diccionario griego vitruviano · '+value;details.append(summary);textLine(details,'Lema:',documented.lemma);textLine(details,'Castellano:',documented.meaning);textLine(details,'English:',documented.en);textLine(details,'Français:',documented.fr);textLine(details,'Referencia:',documented.locus);textLine(details,'Equivalente latino:',documented.latin);textLine(details,'Alcance:',documented.note);if(documented.latin){const b=document.createElement('button');b.type='button';b.className='dictionary-form';b.textContent='Buscar «'+documented.latin+'» en las ediciones';b.addEventListener('click',()=>{input.value=documented.latin;hide();displayGloss();form.requestSubmit();});details.append(b);}if(documented.locus){const a=document.createElement('a');a.href='lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(documented.locus)+'&q='+encodeURIComponent(value);a.textContent='Leer pasaje documentado →';details.append(a);}gloss.append(details);gloss.hidden=false;return;}
   const details=document.createElement('details'),summary=document.createElement('summary');details.open=true;summary.textContent='Consulta griega · '+value;details.append(summary);
   textLine(details,'','No hay equivalencia documentada en el léxico griego local para esta forma. La búsqueda textual puede seguir comprobando coincidencias literales.');
   const a=document.createElement('a');a.href='https://logeion.uchicago.edu/'+encodeURIComponent(value);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Consultar diccionarios griegos en Logeion ↗';details.append(a);gloss.append(details);gloss.hidden=false;return;
  }
  if(!entry){
   if(value.split(/\s+/).length!==1)return;
   const reverse=entries.filter(e=>['es','en','fr'].some(lang=>String(e[lang]||'').split(/[;,]/).some(part=>norm(part.trim())===token)));
   if(reverse.length){
    const details=document.createElement('details'),summary=document.createElement('summary');details.open=true;summary.textContent='Equivalencias latinas de «'+value+'»';details.append(summary);
    for(const e of reverse){const p=document.createElement('p'),b=document.createElement('strong');b.textContent=e.headword||e.lemma;p.append(b,document.createTextNode(' — '+[e.es,e.en,e.fr].filter(Boolean).join(' · ')));details.append(p);const btn=document.createElement('button');btn.type='button';btn.className='dictionary-form';btn.textContent='Buscar «'+e.lemma+'» en el tratado';btn.addEventListener('click',()=>{input.value=e.lemma;hide();displayGloss();form.requestSubmit();});details.append(btn);}
    const note=document.createElement('p');note.className='source';note.textContent='Equivalencias del léxico local; la presencia en el texto se comprueba al buscar.';details.append(note);gloss.append(details);gloss.hidden=false;return;
   }
   if(/^levissim(?:us|a|um|i|o|am|os|as|orum|arum|is)$/i.test(value)){
     const details=document.createElement('details');details.open=true;
     const summary=document.createElement('summary');summary.textContent='Análisis morfológico latino · '+value;details.append(summary);
     textLine(details,'Lema:','levis, leve (adjetivo de tercera declinación)');
     textLine(details,'Grado:','superlativo: levissimus, -a, -um');
     textLine(details,'Forma:','levissimum: acusativo singular masculino o nominativo/acusativo singular neutro');
     textLine(details,'Castellano:','muy ligero, ligerísimo; muy liviano (según el sustantivo al que califique)');
     textLine(details,'English:','very light; lightest');
     textLine(details,'Français:','très léger; le plus léger');
     textLine(details,'Nota:','El significado preciso debe cotejarse con el pasaje; la forma no es un verbo.');
     const b=document.createElement('button');b.type='button';b.className='dictionary-form';b.textContent='Buscar «'+value+'» y ver sus pasajes';b.addEventListener('click',()=>form.requestSubmit());details.append(b);
     gloss.append(details);gloss.hidden=false;return;
   }
   // Derive the dictionary headword from common fourth-declension forms.
   // Keep this as a morphological suggestion, not a claimed corpus attestation.
   if(/^aqua?educt(?:u|ui|um|uum|ibus|us)$/i.test(value)){
     const details=document.createElement('details');details.open=true;
     const summary=document.createElement('summary');summary.textContent='Análisis morfológico latino · '+value;details.append(summary);
     textLine(details,'Lema probable:','aquaeductus, -ūs (sustantivo masculino, cuarta declinación)');
     textLine(details,'Sentido:','acueducto; conducción o canalización de agua');
     textLine(details,'Forma consultada:','aquaeductu: ablativo singular de aquaeductus');
     textLine(details,'Criterio filológico:','La identificación morfológica no acredita que esta forma aparezca literalmente en De architectura.');
     const btn=document.createElement('button');btn.type='button';btn.className='dictionary-form';btn.textContent='Buscar pasajes relacionados en Vitruvio';btn.addEventListener('click',()=>{form.requestSubmit();});details.append(btn);
     gloss.append(details);gloss.hidden=false;return;
   }
   const details=document.createElement('details'),summary=document.createElement('summary');details.open=true;summary.textContent='Léxico latino selectivo: «'+value+'»';details.append(summary);textLine(details,'','Esta forma no tiene una definición revisada en el léxico local. Se ofrece su concordancia textual sin atribuirle un significado no documentado.');for(const word of lexicalSuggestions(value,entries)){const b=document.createElement('button');b.type='button';b.className='dictionary-form';b.textContent='Buscar «'+word+'»';b.addEventListener('click',()=>{input.value=word;hide();displayGloss();form.requestSubmit();});details.append(b);}const a=document.createElement('a');a.href='https://logeion.uchicago.edu/'+encodeURIComponent(value);a.target='_blank';a.rel='noopener';a.textContent='Consultar esta forma en Logeion ↗';details.append(a);gloss.append(details);gloss.hidden=false;return;
  }
  const details=document.createElement('details');details.open=true;const summary=document.createElement('summary');summary.textContent='Léxico latino selectivo · '+(entry.headword||entry.lemma);details.append(summary);
  const h=document.createElement('h3');h.textContent=entry.headword||entry.lemma;details.append(h);
  textLine(details,'Forma buscada:',value);textLine(details,'Análisis:',entry.morphology?.[Object.keys(entry.morphology||{}).find(k=>norm(k)===token)]);textLine(details,'Gramática:',entry.pos);
  textLine(details,'Castellano:',entry.es);textLine(details,'English:',entry.en);textLine(details,'Français:',entry.fr);
  if(entry.senses?.length){const list=document.createElement('ol');for(const sense of entry.senses){const li=document.createElement('li');li.textContent=sense;list.append(li);}details.append(list);}
  textLine(details,'Nota de uso vitruviano:',entry.vitruvian);
  textLine(details,'Testimonios:',entry.references?.join('; '));
  const forms=document.createElement('details'),formsSummary=document.createElement('summary');formsSummary.textContent='Formas de esta entrada para buscar en el tratado';forms.append(formsSummary);
  for(const value of [...new Set([entry.lemma,...entry.forms||[]])]){const b=document.createElement('button');b.type='button';b.className='dictionary-form';b.textContent=value;b.addEventListener('click',()=>{input.value=value;host.hidden=true;displayGloss();form.requestSubmit();});forms.append(b);}details.append(forms);
  const p=document.createElement('p');p.className='source';const a=document.createElement('a');a.href=entry.source_url||'https://logeion.uchicago.edu/'+encodeURIComponent(entry.lemma);a.target='_blank';a.rel='noopener noreferrer';a.textContent=entry.source?'Fuente: '+entry.source+' ↗':'Consultar la entrada en Logeion · Universidad de Chicago ↗';p.append(a);details.append(p);
  textLine(details,'',entry.verified?'Síntesis castellana de la entrada citada; las notas de uso son editoriales.':'Glosa orientativa del léxico local. La entrada lexicográfica completa se consulta en la fuente enlazada.');gloss.append(details);gloss.hidden=false;
 }
 function hide(){host.hidden=true;host.replaceChildren();input.setAttribute('aria-expanded','false');}
 function update(){
  displayGloss();const q=norm(input.value.trim().split(/\s+/).at(-1)||'');hide();if(q.length<3)return;
  const matches=entries.flatMap(e=>[...new Set([e.lemma,...e.forms||[]])].filter(v=>norm(v).startsWith(q)&&norm(v)!==q).map(form=>({entry:e,form}))).slice(0,8);if(!matches.length)return;
  for(const{entry,form:word}of matches){const b=document.createElement('button');b.type='button';b.className='dictionary-suggestion';b.textContent=word+' · '+entry.lemma+' — '+entry.es;b.addEventListener('click',()=>{input.value=word;hide();displayGloss();input.focus();});host.append(b);}host.hidden=false;input.setAttribute('aria-expanded','true');
 }
 input.setAttribute('aria-controls','latin-suggest');input.setAttribute('aria-autocomplete','list');input.addEventListener('input',update);input.addEventListener('change',displayGloss);input.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if(e.key==='ArrowDown'&&!host.hidden){e.preventDefault();host.querySelector('button')?.focus();}});form.addEventListener('submit',()=>{hide();displayGloss();showOccurrences();});document.addEventListener('click',e=>{if(e.target!==input&&!host.contains(e.target))hide();});displayGloss();
})();
