(async()=>{
 const input=document.getElementById('query')||document.getElementById('term');if(!input)return;
 const form=input.form;if(!form)return;
 const host=document.createElement('div');host.id='latin-suggest';host.hidden=true;host.className='dictionary-entry';host.setAttribute('aria-label','Sugerencias léxicas latinas');form.append(host);
 const gloss=document.createElement('section');gloss.id='latin-gloss';gloss.className='dictionary-entry';gloss.hidden=true;gloss.setAttribute('aria-live','polite');form.after(gloss);
 let entries=[];
 try{const response=await fetch('data/latin-lexicon.json?v=20261030-docx-1');if(!response.ok)throw Error();entries=(await response.json()).entries;}catch{gloss.hidden=false;gloss.textContent='El diccionario local no pudo cargarse. Volvé a intentarlo al recargar.';return;}
 const norm=s=>String(s).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
 function textLine(parent,label,value){if(!value)return;const p=document.createElement('p'),b=document.createElement('strong');b.textContent=label+' ';p.append(b,document.createTextNode(value));parent.append(p);}
 function displayGloss(){
  const value=input.value.trim(),token=norm(value.split(/\s+/).at(-1)||'');gloss.replaceChildren();gloss.hidden=true;if(!token||/^[IVX\d.,]+$/i.test(value))return;
  const entry=entries.find(e=>[e.lemma,...e.forms||[]].some(w=>norm(w)===token));
  if(!entry){
   if(value.split(/\s+/).length!==1)return;
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Diccionario latino: «'+value+'»';details.append(summary);textLine(details,'','Esta forma no tiene una entrada incorporada en el léxico local.');const a=document.createElement('a');a.href='https://logeion.uchicago.edu/'+encodeURIComponent(value);a.target='_blank';a.rel='noopener';a.textContent='Consultar esta forma en Logeion ↗';details.append(a);gloss.append(details);gloss.hidden=false;return;
  }
  const details=document.createElement('details');details.open=true;const summary=document.createElement('summary');summary.textContent='Diccionario latino · '+(entry.headword||entry.lemma);details.append(summary);
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
 input.setAttribute('aria-controls','latin-suggest');input.setAttribute('aria-autocomplete','list');input.addEventListener('input',update);input.addEventListener('change',displayGloss);input.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if(e.key==='ArrowDown'&&!host.hidden){e.preventDefault();host.querySelector('button')?.focus();}});form.addEventListener('submit',()=>{hide();displayGloss();});document.addEventListener('click',e=>{if(e.target!==input&&!host.contains(e.target))hide();});displayGloss();
})();
