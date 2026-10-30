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
 async function showOccurrences(){
  const searched=input.value.trim(),token=normalizeWord(searched);
  occurrences.replaceChildren();occurrences.hidden=true;
  if(!searched||searched.includes(' ')||searched.length>90)return;
  const match=entries.find(e=>[e.lemma,...(e.forms||[]),e.greek,e.transliteration].filter(Boolean).some(v=>normalizeWord(v)===token));
  const reversed=entries.find(e=>['es','en','fr'].some(lang=>String(e[lang]||'').split(/[;,]/).some(v=>normalizeWord(v.trim())===token)));
  const entry=match||reversed, greek=/[\u0370-\u03ff\u1f00-\u1fff]/u.test(searched);
  const forms=new Set((entry?[entry.lemma,...(entry.forms||[]),...(entry.greek?[entry.greek]:[])]:[searched]).map(normalizeWord));
  const heading=document.createElement('h3');heading.textContent='Pasajes del tratado · '+searched;occurrences.append(heading);occurrences.hidden=false;
  if(!forms.size){const p=document.createElement('p');p.textContent='Todavía no hay una correspondencia latina verificada para consultar este término griego en el corpus.';occurrences.append(p);return;}
  const status=document.createElement('p');status.textContent='Consultando las referencias del texto latino…';occurrences.append(status);
  try{
   if(!passageData){const response=await fetch('data/structured/recensio-es.json');if(!response.ok)throw Error('Índice no disponible');passageData=(await response.json()).passages;}
   if(input.value.trim()!==searched)return;
   let loci=[],count=0;
   for(const p of passageData){const n=wordMatches(p.latin,forms);if(n){count+=n;loci.push(p);}}
   status.textContent=count+' ocurrencias en '+loci.length+' pasajes del texto latino V514'+(entry?' · lema: '+entry.lemma:'')+'.';
   if(!count){const p=document.createElement('p');p.textContent='No se encontraron coincidencias en el texto latino indexado. Esto no demuestra que el concepto esté ausente de Vitruvio.';occurrences.append(p);return;}
   const list=document.createElement('ol');
   for(const p of loci.slice(0,15)){const li=document.createElement('li'),a=document.createElement('a');const ref=String(p.book)+'.'+p.chapter+'.'+p.section;a.href='lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(ref)+'&q='+encodeURIComponent(searched);a.textContent='Vitr., De arch. '+['','I','II','III','IV','V','VI','VII','VIII','IX','X'][p.book]+'.'+p.chapter+'.'+p.section;
    li.append(a,document.createTextNode(' — '+String(p.latin||'').slice(0,190)+(String(p.latin||'').length>190?'…':'')));list.append(li);}
   occurrences.append(list);
   if(loci.length>15){const p=document.createElement('p');p.textContent='Se muestran los primeros 15 loci; el buscador principal permite consultar más resultados.';occurrences.append(p);}
  }catch{status.textContent='No se pudo cargar el índice de pasajes. Probá nuevamente con Buscar.';}
 }
 try{const response=await fetch('data/latin-lexicon.json?v=20261030-docx-1');if(!response.ok)throw Error();entries=(await response.json()).entries;}catch{gloss.hidden=false;gloss.textContent='El léxico local no pudo cargarse. Volvé a intentarlo al recargar.';return;}
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
   for(const p of passageData){const ts=String(p.latin||'').matchAll(/[\\p{L}\\p{M}]+/gu);for(const m of ts)if(norm(m[0])===q){hits.push({p,index:m.index,term:m[0]});break;}}
   status.textContent=hits.length+' pasajes del texto latino V514 con esta grafía.';
   for(const {p,index,term} of hits.slice(0,12)){const para=document.createElement('p'),a=document.createElement('a');a.href='lector-bilingue.html?edition=recensio-es&locus='+encodeURIComponent(p.locus)+'&q='+encodeURIComponent(value);a.textContent='Vitr., De arch. '+p.locus+' →';const snippet=String(p.latin||'').slice(Math.max(0,index-55),index+term.length+95);para.append(a,document.createTextNode(' · '+snippet));section.append(para);}
  }
  return section;
 }
 function displayGloss(){
  const value=input.value.trim(),token=norm(value.split(/\s+/).at(-1)||'');gloss.replaceChildren();gloss.hidden=true;if(!token||/^[IVX\d.,]+$/i.test(value))return;
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
   const documentedGreek={'φθογγοι':{lemma:'φθόγγος',meaning:'sonido, tono musical, nota',en:'sound, musical tone',fr:'son, ton musical',locus:'V.4.5',note:'En V.4.5 Vitruvio explica que los sonitus se llaman φθόγγοι en griego; este significado se apoya en el texto y la traducción de la edición V514, no en una identificación automática.'}};
   const documented=documentedGreek[token];
   if(documented){const details=document.createElement('details'),summary=document.createElement('summary');details.open=true;summary.textContent='Diccionario griego vitruviano · '+value;details.append(summary);textLine(details,'Lema:',documented.lemma);textLine(details,'Castellano:',documented.meaning);textLine(details,'English:',documented.en);textLine(details,'Français:',documented.fr);textLine(details,'Referencia:',documented.locus);textLine(details,'Uso documentado:',documented.note);const a=document.createElement('a');a.href='lector-bilingue.html?edition=recensio-es&locus=5.4.5&q='+encodeURIComponent(value);a.textContent='Leer el pasaje con la palabra resaltada →';details.append(a);gloss.append(details);gloss.hidden=false;return;}
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
   const details=document.createElement('details'),summary=document.createElement('summary');details.open=true;summary.textContent='Léxico latino selectivo: «'+value+'»';details.append(summary);textLine(details,'','Esta forma no tiene una definición revisada en el léxico local. Se ofrece su concordancia textual sin atribuirle un significado no documentado.');details.append(corpusContext(value));for(const word of lexicalSuggestions(value,entries)){const b=document.createElement('button');b.type='button';b.className='dictionary-form';b.textContent='Buscar «'+word+'»';b.addEventListener('click',()=>{input.value=word;hide();displayGloss();form.requestSubmit();});details.append(b);}const a=document.createElement('a');a.href='https://logeion.uchicago.edu/'+encodeURIComponent(value);a.target='_blank';a.rel='noopener';a.textContent='Consultar esta forma en Logeion ↗';details.append(a);gloss.append(details);gloss.hidden=false;return;
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
