(async()=>{
 const input=document.getElementById('query');if(!input)return;
 const host=document.createElement('div');host.id='latin-suggest';host.hidden=true;
 host.setAttribute('role','listbox');host.setAttribute('aria-label','Sugerencias léxicas latinas');
 host.style.cssText='position:relative;z-index:5;border:1px solid #c4c1b8;background:#faf8f4;padding:12px 16px;max-height:245px;overflow:auto;font-size:14px;line-height:1.6';
 const form=document.getElementById('search-form');form?.append(host);
 let entries=[];
 try{const res=await fetch('data/latin-lexicon.json');if(!res.ok)throw Error();entries=(await res.json()).entries||[];}catch{return;}
 const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const hide=()=>{host.hidden=true;host.replaceChildren();input.setAttribute('aria-expanded','false');};
 const update=()=>{
  const q=norm(input.value.trim().split(/\s+/).slice(-1)[0]||'');
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
   button.addEventListener('click',()=>{const pieces=input.value.trim().split(/\s+/);pieces[pieces.length-1]=item.form;input.value=pieces.join(' ');hide();input.focus();});
   host.append(button);
  }
  const note=document.createElement('small');note.textContent='Lista orientativa, no diccionario morfológico completo. Las apariciones se verifican al buscar en cada edición.';note.style.cssText='display:block;color:#68716d;margin-top:6px';host.append(note);
  host.hidden=false;input.setAttribute('aria-expanded','true');
 };
 input.setAttribute('aria-autocomplete','list');
 input.setAttribute('aria-controls','latin-suggest');
 input.addEventListener('input',update);
 input.addEventListener('focus',update);
 input.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
 document.addEventListener('click',e=>{if(e.target!==input&&!host.contains(e.target))hide();});
 form?.addEventListener('submit',hide);
})();