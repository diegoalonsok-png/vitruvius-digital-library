(async()=>{
 const input=document.getElementById('query')||document.getElementById('term');if(!input)return;
 const form=input.form;if(!form)return;
 const host=document.createElement('div');host.id='latin-suggest';host.hidden=true;host.className='dictionary-entry';host.setAttribute('aria-label','Sugerencias léxicas latinas');form.append(host);
 const gloss=document.createElement('section');gloss.id='latin-gloss';gloss.className='dictionary-entry';gloss.hidden=true;gloss.setAttribute('aria-live','polite');form.after(gloss);
 let entries=[],passageData=null;const derivedForms=[];
 const occurrences=document.createElement('section');occurrences.id='lexical-occurrences';occurrences.className='dictionary-entry';occurrences.hidden=true;occurrences.setAttribute('aria-live','polite');gloss.after(occurrences);
 const {lexicalSuggestions}=await import('./lexical-suggestions.mjs?v=20261105-ortho-v1');
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
 // Display both sides of the SAME indexed locus, never a guessed translation.
 function contextualSnippet(text,forms,max=280){
  const raw=String(text||'').replace(/\s+/g,' ').trim();
  if(raw.length<=max)return raw;
  const match=[...raw.matchAll(/[\p{L}\p{M}]+/gu)].find(m=>forms.has(normalizeWord(m[0])));
  const start=match?Math.max(0,match.index-65):0;
  const end=Math.min(raw.length,start+max);
  return (start?'… ':'')+raw.slice(start,end)+(end<raw.length?' …':'');
 }
 const translationLanguage={'recensio-es':'Castellano','recensio-fr':'Français','theory-en':'English'};
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
      const counts=document.createElement('span');counts.className='lexical-locus-count';counts.textContent=' · '+details;li.append(counts);
      const latin=document.createElement('p');latin.className='lexical-locus-latin';latin.lang='la';
      const latLabel=document.createElement('strong');latLabel.textContent='Latín · '+edition.label.split(' · ')[0]+'. ';
      latin.append(latLabel,document.createTextNode(contextualSnippet(p.latin,forms)));
      li.append(latin);
      const translated=document.createElement('p');translated.className='lexical-locus-translation';
      translated.lang={'recensio-es':'es','recensio-fr':'fr','theory-en':'en'}[edition.id]||'es';
      const trLabel=document.createElement('strong');trLabel.textContent=(translationLanguage[edition.id]||'Traducción')+' · '+edition.label.split(' · ')[0]+'. ';
      translated.append(trLabel,document.createTextNode(String(p.translation||'').trim()
       ?contextualSnippet(p.translation,forms)
       :'Traducción no disponible en este registro; consultar el lector bilingüe para comprobar el locus.'));
      li.append(translated);
      const source=document.createElement('p');source.className='lexical-locus-provenance';
      source.textContent='Fuente: edición '+edition.label.split(' · ')[0]+' · '+(p.pdf_pages?.latin?'latín PDF p. '+p.pdf_pages.latin:'página latina sin identificar')+' · '+(p.pdf_pages?.translation?'traducción PDF p. '+p.pdf_pages.translation:'página de traducción sin identificar')+'.';
      li.append(source);
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

 // El léxico (≈90 KB) se pide cuando la persona va a escribir o, si no, unos segundos después de la carga.
 await new Promise(r=>{if(document.activeElement===input||input.value)return r();input.addEventListener('focus',r,{once:true});input.addEventListener('pointerenter',r,{once:true});setTimeout(r,3500)});
 try{const response=await fetch('data/latin-lexicon.json');if(!response.ok)throw Error();entries=(await response.json()).entries;
  // Todas las formas del texto latino (CLTK + Lewis & Short) para las sugerencias ortográficas y de grafía.
  const loadDerived=()=>fetch('data/classics-lexicon/vitruvius-la.json').then(r=>r.ok?r.json():null).then(g=>{if(!g?.forms)return;const by=new Map();for(const [f,ls] of Object.entries(g.forms))for(const l of ls){if(!by.has(l))by.set(l,[]);by.get(l).push(f)}
   for(const [l,fs] of by)derivedForms.push({lemma:String(g.lemmas?.[l]?.h||l).split(/[\s,]/)[0].replace(/-/g,'').normalize('NFD').replace(/\p{M}/gu,'').replace(/\d+$/,''),forms:fs,derived:true})}).catch(()=>{});
  // Carga diferida: solo cuando la persona empieza a escribir.
  input.addEventListener('focus',loadDerived,{once:true});if(document.activeElement===input||input.value)loadDerived();}catch{gloss.hidden=false;gloss.textContent='El léxico local no pudo cargarse. Vuelve a intentarlo al recargar.';return;}
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
   if(!details.isConnected||!dictionaryTerms(input.value.trim()).some(w=>norm(w)===norm(term)))return;
   message.textContent=result.definitions.length?'Acepciones de Wikcionario (en inglés), presentadas dentro de la biblioteca:':result.status||'Sin acepciones extraíbles para esta forma.';
   if(result.grammar?.length){const p=document.createElement('p');p.textContent='Clasificación: '+result.grammar.join(' · ');details.append(p);}
   if(result.definitions.length){const ol=document.createElement('ol');for(const d of result.definitions){const li=document.createElement('li');li.textContent=d;ol.append(li);}details.append(ol);}
   // Automatically follow the lemma of inflected Latin forms. This works
   // for any form whose dictionary entry explicitly identifies a lemma,
   // rather than requiring one handwritten definition per Latin word.
   if(language==='Latin'&&result.definitions.length){
     const first=result.definitions.find(d=>/\b(?:of|from)\s+[\p{L}\p{M}]{3,}/iu.test(d));
     const lemma=first?.match(/\b(?:of|from)\s+([\p{L}\p{M}]{3,})/iu)?.[1];
     if(lemma&&lemma.toLocaleLowerCase()!==term.toLocaleLowerCase()){
       const lemmaPanel=document.createElement('section');lemmaPanel.className='dictionary-lemma';
       const head=document.createElement('h4');head.textContent='Lema latino detectado automáticamente: '+lemma;lemmaPanel.append(head);
       const loading=document.createElement('p');loading.textContent='Consultando las acepciones del lema…';lemmaPanel.append(loading);
       details.append(lemmaPanel);
       const lemmaLink=document.createElement('a');lemmaLink.href='https://es.wiktionary.org/wiki/'+encodeURIComponent(lemma);lemmaLink.target='_blank';lemmaLink.rel='noopener';lemmaLink.textContent='Consultar el lema en Wikcionario en castellano ↗';lemmaPanel.append(lemmaLink);
       const api=new URL('https://en.wiktionary.org/w/api.php');
       for(const [k,v] of Object.entries({action:'parse',page:lemma,prop:'text',format:'json',formatversion:'2',origin:'*'}))api.searchParams.set(k,v);
       fetch(api).then(x=>x.ok?x.json():Promise.reject(Error('Lema no disponible'))).then(data=>{
         if(!lemmaPanel.isConnected||!dictionaryTerms(input.value.trim()).some(w=>norm(w)===norm(term)))return;
         if(!data.parse?.text)throw Error('No hay acepciones disponibles');
         const doc=new DOMParser().parseFromString(data.parse.text,'text/html');
         const h=[...doc.querySelectorAll('h2')].find(x=>x.textContent.toLowerCase().includes('latin'));
         let node=(h?.closest('.mw-heading')||h)?.nextElementSibling,found=[];
         while(node&&node.tagName!=='H2'&&!node.matches?.('.mw-heading2')){
           for(const li of node.querySelectorAll('ol > li')){
             const copy=li.cloneNode(true);copy.querySelectorAll('ol,ul,.reference').forEach(x=>x.remove());
             const meaning=copy.textContent.replace(/\s+/g,' ').trim();
             if(meaning.length>2&&!found.includes(meaning))found.push(meaning.slice(0,250));
           }
           node=node.nextElementSibling;
         }
         loading.textContent=found.length?'Acepciones del lema (fuente lexicográfica, inglés):':'No fue posible extraer las acepciones del lema.';
         if(found.length){const list=document.createElement('ol');for(const meaning of found.slice(0,8)){const li=document.createElement('li');li.textContent=meaning;list.append(li);}lemmaPanel.append(list);}
       }).catch(()=>{if(loading.isConnected)loading.textContent='No se pudo consultar automáticamente el lema. Utiliza el enlace al diccionario.';});
     }
   }
   // Greek inflected forms: follow attested lemma links from the dictionary,
   // not a hand-maintained list. Never treat the lemma as a textual attestation.
   if(language==='Ancient Greek'&&result.definitions.length){
     const first=result.definitions.find(d=>/(?:inflection of|form of|of)\s+[\p{Script=Greek}\p{M}]{2,}/iu.test(d));
     const lemma=first?.match(/(?:inflection of|form of|of)\s+([\p{Script=Greek}\p{M}]{2,})/iu)?.[1];
     if(lemma&&lemma!==term){
       const panel=document.createElement('section');panel.className='dictionary-lemma';
       const heading=document.createElement('h4');heading.textContent='Lema griego probable: '+lemma;panel.append(heading);
       const note=document.createElement('p');note.textContent='Identificado a partir de la entrada lexicográfica. No implica presencia literal del lema en Vitruvio.';panel.append(note);
       const link=document.createElement('a');link.href='https://en.wiktionary.org/wiki/'+encodeURIComponent(lemma)+'#Ancient_Greek';link.target='_blank';link.rel='noopener';link.textContent='Ver acepciones del lema griego ↗';panel.append(link);
       const button=document.createElement('button');button.type='button';button.className='dictionary-form';button.textContent='Consultar lema dentro de la biblioteca';button.addEventListener('click',()=>{input.value=lemma;displayGloss();form.requestSubmit();});panel.append(button);
       const loading=document.createElement('p');loading.textContent='Consultando las acepciones del lema griego…';panel.append(loading);
       const url=new URL('https://en.wiktionary.org/w/api.php');
       for(const [k,v] of Object.entries({action:'parse',page:lemma,prop:'text',format:'json',formatversion:'2',origin:'*'}))url.searchParams.set(k,v);
       fetch(url).then(x=>x.ok?x.json():Promise.reject(Error('Fuente no disponible'))).then(data=>{
         if(!panel.isConnected||!dictionaryTerms(input.value.trim()).some(w=>norm(w)===norm(term)))return;
         if(!data.parse?.text)throw Error('No hay entrada del lema');
         const doc=new DOMParser().parseFromString(data.parse.text,'text/html');
         const heading=[...doc.querySelectorAll('h2')].find(h=>h.textContent.toLowerCase().includes('ancient greek'));
         let node=(heading?.closest('.mw-heading')||heading)?.nextElementSibling,definitions=[];
         while(node&&node.tagName!=='H2'&&!node.matches?.('.mw-heading2')){
           for(const li of node.querySelectorAll('ol > li')){
             const clone=li.cloneNode(true);clone.querySelectorAll('ol,ul,.reference').forEach(x=>x.remove());
             const definition=clone.textContent.replace(/\s+/g,' ').trim();
             if(definition.length>2&&!definitions.includes(definition))definitions.push(definition.slice(0,260));
           }
           node=node.nextElementSibling;
         }
         loading.textContent=definitions.length?'Acepciones del lema en inglés (Wikcionario):':'No fue posible extraer las acepciones del lema.';
         if(definitions.length){const list=document.createElement('ol');for(const definition of definitions.slice(0,8)){const item=document.createElement('li');item.textContent=definition;list.append(item);}panel.append(list);}
       }).catch(()=>{if(loading.isConnected)loading.textContent='No se pudo consultar el lema. Utiliza el enlace a la fuente.';});
       details.append(panel);
     }
   }
   const foot=document.createElement('p');foot.className='source';foot.textContent='Fuente: Wikcionario en inglés (Wikimedia, CC BY-SA). La forma consultada puede requerir buscar su lema; verifica las acepciones según el contexto vitruviano.';details.append(foot);
  });
 }
 const fullDictionaryPromises=new Map();
 function loadFullDictionary(language){
   if(!fullDictionaryPromises.has(language)){
     const request=fetch('data/dictionaries/'+language+'.json',{cache:'force-cache'}).then(async response=>{
       if(!response.ok)throw Error('Índice '+language+' no publicado (HTTP '+response.status+')');
       const data=await response.json();
       if(data?.schema!==1||!data.entries||typeof data.entries!=='object')throw Error('Índice '+language+' incompleto');
       return data.entries;
     }).catch(error=>({error:error.message||'Índice no disponible'}));
     fullDictionaryPromises.set(language,request);
   }
   return fullDictionaryPromises.get(language);
 }
 async function showLocalDictionary(term,isGreek){
   const language=isGreek?'greek':'latin';
   const full=await loadFullDictionary(language);
   if(!dictionaryTerms(input.value.trim()).some(w=>norm(w)===norm(term)))return;
   if(full.error){const info=document.createElement('p');info.className='source';info.textContent='Diccionario local: '+full.error+'. Consulta externa de respaldo disponible; los loci no se ven afectados.';gloss.prepend(info);gloss.hidden=false;return;}
   const matches=full[norm(term)]||[];
   if(!matches.length){const info=document.createElement('p');info.className='source';info.textContent='No hay entrada lexicográfica para esta grafía en el índice local; consultando diccionario externo.';gloss.prepend(info);gloss.hidden=false;return;}
   const pane=document.createElement('details');pane.open=true;pane.className='dictionary-live';
   const title=document.createElement('summary');title.textContent='Diccionario clásico indexado · '+term;pane.append(title);
   for(const entry of matches.slice(0,6)){
     const p=document.createElement('p');
     const strong=document.createElement('strong');strong.textContent=entry.lemma+' · '+(entry.pos||'sin clasificación');
     p.append(strong,document.createTextNode(' — '+(entry.glosses||[]).slice(0,3).join('; ')));
     pane.append(p);
   }
   const foot=document.createElement('p');foot.className='source';foot.textContent='Fuente: índice léxico editorial local, de cobertura selectiva; una definición no acredita una aparición textual en los manuscritos.';pane.append(foot);
   gloss.prepend(pane);gloss.hidden=false;
 }
 const greekScript=/[\u0370-\u03ff\u1f00-\u1fff]/u;
 function dictionaryTerms(value){
   const words=value.match(/[\p{L}\p{M}]+/gu)||[];
   return [...new Map(words.filter(w=>w.length>1).map(w=>[norm(w),w])).values()].slice(0,8);
 }
 function dictionaryLinks(words,isGreek){
   const pane=document.createElement('details');pane.open=true;pane.className='dictionary-live';
   const summary=document.createElement('summary');summary.textContent='Diccionarios clásicos · consultas por lema';pane.append(summary);
   const intro=document.createElement('p');intro.textContent='Consulta cada término en fuentes lexicográficas externas. El enlace no representa una definición verificada en esta biblioteca.';pane.append(intro);
   for(const word of words){
     const line=document.createElement('p');const strong=document.createElement('strong');strong.textContent=word+' · ';line.append(strong);
     for(const [label,link] of [
       ['Logeion','https://logeion.uchicago.edu/'+encodeURIComponent(word)],
       ['Wikcionario','https://en.wiktionary.org/wiki/'+encodeURIComponent(word)+(isGreek?'#Ancient_Greek':'#Latin')]
     ]){const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label+' ↗';a.style.marginRight='14px';line.append(a);}
     pane.append(line);
   }
   gloss.append(pane);gloss.hidden=false;
 }
function inlineLexicalTranslations(words){
  const pane=document.createElement('details');pane.open=true;pane.className='dictionary-live';
  const summary=document.createElement('summary');summary.textContent='Traducción y significado de los términos';pane.append(summary);
  let found=0;
  for(const word of words){
    const candidates=entries.filter(e=>[e.lemma,...(e.forms||[]),e.greek].filter(Boolean).some(v=>norm(v)===norm(word)));
    for(const e of candidates.slice(0,2)){
      found++;
      const p=document.createElement('p'),b=document.createElement('strong');
      b.textContent=word+' → '+(e.headword||e.lemma)+' · ';p.append(b);
      p.append(document.createTextNode('Español: '+(e.es||'sin traducción')+' · Inglés: '+(e.en||'sin traducción')+' · Francés: '+(e.fr||'sin traducción')));
      pane.append(p);
    }
  }
  if(!found){const p=document.createElement('p');p.textContent='No hay traducción local verificada para esta grafía. Consulta las acepciones de las entradas externas que se muestran debajo; pueden estar en inglés.';pane.append(p);}
  gloss.prepend(pane);gloss.hidden=false;
}
async function showExpressionContexts(value){
  const words=dictionaryTerms(value).map(norm);
  if(words.length<2)return;
  const pane=document.createElement('details');pane.open=true;pane.className='dictionary-live';
  const title=document.createElement('summary');title.textContent='Pasajes de Vitruvio con traducción · '+value;pane.append(title);
  const info=document.createElement('p');info.textContent='Buscando la expresión en los textos y traducciones…';pane.append(info);
  gloss.append(pane);gloss.hidden=false;
  try{
    const loaded=await loadCorpora();if(input.value.trim()!==value||!pane.isConnected)return;
    const needle=words.join(' ');let count=0;
    for(const result of loaded){
      if(result.status!=='fulfilled')continue;
      for(const p of result.value.passages){
        if(!norm(p.latin||'').includes(needle)&&!norm(p.translation||'').includes(needle))continue;
        count++;if(count>15)continue;
        const article=document.createElement('article'),link=document.createElement('a');
        link.href='lector-bilingue.html?edition='+encodeURIComponent(result.value.id)+'&locus='+encodeURIComponent(p.locus)+'&q='+encodeURIComponent(value);
        link.textContent=result.value.label+' · '+p.locus;article.append(link);
        const latin=document.createElement('p');latin.textContent='Latín: '+String(p.latin||'').slice(0,650);
        const translation=document.createElement('p');translation.textContent='Traducción: '+String(p.translation||'').slice(0,650);
        article.append(latin,translation);pane.append(article);
      }
    }
    info.textContent=count?count+' pasajes con la expresión (se muestran hasta 15).':'No hay coincidencia exacta de la expresión completa; las palabras pueden consultarse por separado.';
  }catch(error){info.textContent='No fue posible cargar las traducciones: '+error.message;}
}
function displayGloss(){
  const value=input.value.trim(),token=norm(value.split(/\s+/).at(-1)||'');
  gloss.replaceChildren();gloss.hidden=true;
  if(!token||/^[IVX\d.,]+$/i.test(value))return;
  const words=dictionaryTerms(value);
  const greek=greekScript.test(value);
  if(words.length){
    dictionaryLinks(words,greek);
    inlineLexicalTranslations(words);
    if(words.length>1)showExpressionContexts(value);
    // Each part of a multiword expression is looked up independently.
    // A missing local dictionary must never hide the remote lookup.
    for(const word of words.slice(0,4)){
      if(word.length>=2){
        showLocalDictionary(word,greekScript.test(word));
        externalDictionary(word,greekScript.test(word));
      }
    }
  }
  // Vincular las variantes españolas e inglesas y los errores leves al mismo lema.
  const candidates=entries.flatMap(e=>[e.lemma,...(e.forms||[]),...(e.aliases||[]),e.es,e.en,e.fr,e.greek].filter(Boolean).map(w=>({e,w,n: norm(w)})));
  const exactEntry=candidates.find(c=>c.n===token);
  let guessed=null;
  if(!exactEntry&&token.length>=4){
   const max=token.length>=9?2:1;
   const nearby=candidates.map(c=>({...c,d:editDistance(token,c.n,max)})).filter(c=>c.d<=max).sort((a,b)=>a.d-b.d||a.n.length-b.n.length);
   if(nearby.length&&(!nearby[1]||nearby[0].d<nearby[1].d||nearby[0].e===nearby[1].e))guessed=nearby[0];
  }
  if(guessed){
   const box=document.createElement('p'),button=document.createElement('button');button.type='button';button.className='dictionary-suggestion';
   button.textContent='¿Quisiste decir «'+guessed.w+'»? · '+guessed.e.lemma+' — '+(guessed.e.es||'');
   button.addEventListener('click',()=>{input.value=guessed.w;hide();displayGloss();form.requestSubmit();});
   box.append('Sugerencia ortográfica (no coincidencia literal): ',button);
   gloss.prepend(box);gloss.hidden=false;
  }
  const entry=exactEntry?.e||null;
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
   const details=document.createElement('details'),summary=document.createElement('summary');details.open=true;summary.textContent='Léxico latino selectivo: «'+value+'»';details.append(summary);textLine(details,'','Esta forma no tiene una definición revisada en el léxico local. Se ofrece su concordancia textual sin atribuirle un significado no documentado.');for(const word of lexicalSuggestions(value,entries.concat(derivedForms))){const b=document.createElement('button');b.type='button';b.className='dictionary-form';b.textContent='Buscar «'+word+'»';b.addEventListener('click',()=>{input.value=word;hide();displayGloss();form.requestSubmit();});details.append(b);}const a=document.createElement('a');a.href='https://logeion.uchicago.edu/'+encodeURIComponent(value);a.target='_blank';a.rel='noopener';a.textContent='Consultar esta forma en Logeion ↗';details.append(a);gloss.append(details);gloss.hidden=false;return;
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
 function editDistance(a,b,max=3){if(Math.abs(a.length-b.length)>max)return max+1;let previous=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let current=[i],minimum=i;for(let j=1;j<=b.length;j++){const substitution=previous[j-1]+(a[i-1]===b[j-1]?0:1);current[j]=Math.min(previous[j]+1,current[j-1]+1,substitution);minimum=Math.min(minimum,current[j]);}if(minimum>max)return max+1;previous=current;}return previous[b.length];}
 const aliasMap=new Map();
 function indexAliases(){for(const entry of entries){const candidates=[[entry.lemma,'Latín'],...(entry.forms||[]).map(v=>[v,'Latín']),[entry.es,'Castellano'],[entry.en,'Inglés'],[entry.fr,'Francés'],[entry.greek,'Griego'],[entry.transliteration,'Transliteración'],...(entry.aliases||[]).map(v=>[v,'Variante'])];for(const [raw,language] of candidates){if(!raw)continue;const alias=norm(raw);if(alias.length<3)continue;if(!aliasMap.has(alias))aliasMap.set(alias,[]);aliasMap.get(alias).push({entry,raw,language});}}}
 indexAliases();
 function update(){
  const raw=input.value.trim(),tokens=raw.split(/\s+/),q=norm(tokens.at(-1)||'');hide();if(q.length<3||tokens.length>1)return;
  const results=[];for(const [alias,candidates] of aliasMap){let score=alias.startsWith(q)?0:alias.includes(q)?1:99;if(score===99&&q.length>=4){const d=editDistance(q,alias,q.length<7?1:2);if(d<=(q.length<7?1:2))score=2+d;}if(score===99)continue;for(const candidate of candidates){const key=candidate.entry.lemma+'|'+candidate.raw;if(results.some(x=>x.key===key))continue;results.push({...candidate,score,key});}}
  results.sort((a,b)=>a.score-b.score||a.raw.length-b.raw.length||a.raw.localeCompare(b.raw));
  const shown=results.slice(0,10);if(!shown.length)return;
  for(const item of shown){const b=document.createElement('button');b.type='button';b.className='dictionary-suggestion';b.textContent=item.raw+' · '+item.language+' — '+(item.entry.lemma||'')+(item.entry.es?' · '+item.entry.es:'');b.addEventListener('click',()=>{input.value=item.raw;hide();displayGloss();form.requestSubmit();});host.append(b);}
  host.hidden=false;input.setAttribute('aria-expanded','true');
 }

 input.setAttribute('aria-controls','latin-suggest');input.setAttribute('aria-autocomplete','list');input.addEventListener('input',update);input.addEventListener('change',displayGloss);input.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if(e.key==='ArrowDown'&&!host.hidden){e.preventDefault();host.querySelector('button')?.focus();}});form.addEventListener('submit',()=>{hide();displayGloss();showOccurrences();});document.addEventListener('click',e=>{if(e.target!==input&&!host.contains(e.target))hide();});displayGloss();
})();
