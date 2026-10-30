(async()=>{
 const input=document.getElementById('query');if(!input)return;
 const host=document.createElement('div');host.id='latin-suggest';host.hidden=true;
 host.setAttribute('role','listbox');host.setAttribute('aria-label','Sugerencias léxicas latinas');
 host.style.cssText='position:relative;z-index:5;border:1px solid #c4c1b8;background:#faf8f4;padding:12px 16px;max-height:245px;overflow:auto;font-size:14px;line-height:1.6';
 const form=document.getElementById('search-form');form?.append(host);
 const gloss=document.createElement('div');gloss.id='latin-gloss';gloss.hidden=true;
 gloss.setAttribute('aria-live','polite');
 gloss.style.cssText='font-size:13px;line-height:1.65;padding:10px 16px;border:1px solid #d4d0c7;border-top:0;background:transparent;color:#34475a';
 form?.after(gloss);

 let entries=[{lemma:'dispositio',forms:['dispositionis','dispositionem','dispositione'],es:'disposición, ordenación'},{lemma:'symmetria',forms:['symmetriae','symmetriam'],es:'proporción'},{lemma:'architectura',forms:['architecturae','architecturam'],es:'arquitectura'},{lemma:'verbum',forms:['verba','verbi','verbis','verborum'],es:'palabra'}];
 try{const res=await fetch('data/latin-lexicon.json',{cache:'no-store'});if(res.ok){const loaded=(await res.json()).entries;if(Array.isArray(loaded)&&loaded.length)entries=loaded;}}catch{ /* Leave the useful embedded fallback active. */ }
 const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const displayGloss=()=>{
  const token=norm(input.value.trim().split(/\s+/).slice(-1)[0]||'');
  const entry=entries.find(e=>[e.lemma,...e.forms].some(w=>norm(w)===token));
  if(!entry){gloss.hidden=true;gloss.replaceChildren();return;}
  gloss.replaceChildren();
  const line=(label,value)=>{
    if(!value)return;
    const p=document.createElement('p');p.style.cssText='margin:4px 0';
    const strong=document.createElement('strong');strong.textContent=label+' ';
    p.append(strong,document.createTextNode(value));gloss.append(p);
  };
  const title=document.createElement('div');title.style.cssText='font-family:Georgia,serif;font-size:21px;color:#122a42;margin-bottom:6px';title.textContent=entry.headword||entry.lemma;gloss.append(title);
  line('Gramática:',entry.pos);
  line('Castellano:',entry.es);
  line('English:',entry.en);
  line('Français:',entry.fr);
  line('Griego relacionado:',entry.greek);
  if(entry.senses?.length)line('Acepciones:',entry.senses.join(' · '));
  if(entry.vitruvian)line('Uso vitruviano (nota editorial):',entry.vitruvian);
  if(entry.references?.length)line('Testimonios citados:',entry.references.join('; '));
  line('Formas para buscar:',[entry.lemma,...entry.forms].filter((v,i,a)=>a.indexOf(v)===i).slice(0,12).join(' · '));
  const source=document.createElement('p');source.style.cssText='margin:7px 0';
  const a=document.createElement('a');a.href=entry.source_url||'https://logeion.uchicago.edu/'+encodeURIComponent(entry.lemma);
  a.target='_blank';a.rel='noopener noreferrer';a.textContent=entry.source?'Fuente: '+entry.source+' ↗':'Contrastar la entrada en Logeion (Universidad de Chicago) ↗';
  source.append(a);gloss.append(source);
  const note=document.createElement('small');note.style.cssText='display:block;color:#68716d';
  note.textContent=entry.verified?'Datos lexicográficos cotejados; las notas técnicas son interpretación editorial.':'Glosas y notas orientativas; falta cotejar esta entrada con una edición lexicográfica concreta.';
  gloss.append(note);gloss.hidden=false;
 };
 const hide=()=>{host.hidden=true;host.replaceChildren();input.setAttribute('aria-expanded','false');};
 const update=()=>{
  const q=norm(input.value.trim().split(/\s+/).slice(-1)[0]||'');
  displayGloss();
  if(q.length<3){hide();return;}
  const results=[];
  for(const entry of entries){
   const matched=[entry.lemma,...entry.forms].filter(v=>norm(v).startsWith(q));
   if(!matched.length)continue;
   for(const form of [...new Set(matched)])results.push({form,lemma:entry.lemma,meaning:entry.es});
  }
  results.sort((a,b)=>(a.form===q?-1:b.form===q?1:0)||a.form.length-b.form.length||a.form.localeCompare(b.form));
  host.replaceChildren();
  if(!results.length){hide();return;}
  const label=document.createElement('div');label.textContent='Sugerencias de formas latinas · selección para buscar';label.style.cssText='color:#67716a;font-size:12px;margin-bottom:7px';host.append(label);
  for(const item of results.slice(0,15)){
   const button=document.createElement('button');button.type='button';button.setAttribute('role','option');
   button.style.cssText='display:block;width:100%;text-align:left;background:transparent;border:0;border-top:1px solid #e2dfd8;padding:6px 3px;cursor:pointer;color:#122a42;font:inherit';
   button.textContent=item.form+' · '+item.lemma+' ('+item.meaning+')';
   button.addEventListener('click',()=>{const pieces=input.value.trim().split(/\s+/);pieces[pieces.length-1]=item.form;input.value=pieces.join(' ');hide();displayGloss();input.focus();});
   host.append(button);
  }
  const note=document.createElement('small');note.textContent='Lista orientativa, no diccionario morfológico completo. Las apariciones se verifican al buscar en cada edición.';note.style.cssText='display:block;color:#68716d;margin-top:6px';host.append(note);
  host.hidden=false;input.setAttribute('aria-expanded','true');
 };
 input.setAttribute('aria-autocomplete','list');
 input.setAttribute('aria-controls','latin-suggest');
 input.addEventListener('input',update);
 input.addEventListener('change',displayGloss);
 input.addEventListener('focus',update);
 input.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 document.addEventListener('click',e=>{if(e.target!==input&&!host.contains(e.target))hide();});
 form?.addEventListener('submit',()=>{hide();displayGloss();});
 displayGloss();
})();