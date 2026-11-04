/* Local reading preferences; independent of queries and dynamically loaded content. */
(()=>{
 'use strict';
 const root=document.documentElement;
 const options=document.getElementById('reading-options');
 if(!options)return;
 const slider=document.getElementById('reading-font-size');
 const family=document.getElementById('reading-font-family');
 const italic=document.getElementById('reading-italic');
 const color=document.getElementById('reading-text-color');
 const automatic=document.getElementById('reading-color-auto');
 const summary=document.getElementById('reading-options-toggle');
 const fonts={original:null,georgia:'Georgia, "Times New Roman", serif',palatino:'Palatino, "Palatino Linotype", "Book Antiqua", serif',times:'"Times New Roman", Times, serif',arial:'Arial, Helvetica, sans-serif',system:'system-ui, -apple-system, "Segoe UI", sans-serif'};
 const key='vitruvia-reading-appearance-v1';
 const sizeKey='vitruvia-reading-font-percent-v1';
 const labels={
  es:{title:'Opciones de lectura',size:'Tamaño de letra',font:'Tipografía',original:'Original',system:'Sistema',style:'Estilo',italic:'Cursiva',color:'Color del texto',automatic:'Automático',preview:'Así se verá el texto.',hint:'Se aplica a artículos y resultados.',reset:'Restablecer ajustes'},
  en:{title:'Reading options',size:'Text size',font:'Typeface',original:'Original',system:'System',style:'Style',italic:'Italic',color:'Text color',automatic:'Automatic',preview:'This is how the text will look.',hint:'Applies to articles and results.',reset:'Reset settings'},
  fr:{title:'Options de lecture',size:'Taille du texte',font:'Police',original:'Originale',system:'Système',style:'Style',italic:'Italique',color:'Couleur du texte',automatic:'Automatique',preview:'Voici l’apparence du texte.',hint:'S’applique aux articles et aux résultats.',reset:'Réinitialiser les réglages'}
 };
 const validFont=value=>Object.hasOwn(fonts,value);
 const validColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
 function normalizeSize(value){const n=Number(value);return Number.isFinite(n)&&n>0?Math.min(160,Math.max(90,Math.round(n/5)*5)):100}
 let state={size:100,font:'original',italic:false,color:null};
 try{
  state.size=normalizeSize(localStorage.getItem(sizeKey));
  const saved=JSON.parse(localStorage.getItem(key)||localStorage.getItem('vitruvia-reading-typography-v1')||'null');
  if(saved&&typeof saved==='object'){
   if(saved.size!=null)state.size=normalizeSize(saved.size);
   if(validFont(saved.font))state.font=saved.font;
   state.italic=saved.italic===true;
   if(validColor(saved.color))state.color=saved.color.toLowerCase();
  }
 }catch{}
 function refreshLabels(){
  const t=labels[root.lang?.slice(0,2)]||labels.es;
  options.querySelectorAll('[data-reading-label]').forEach(el=>{el.textContent=t[el.dataset.readingLabel]});
  summary.setAttribute('aria-label',t.title);summary.title=t.title;
  color.setAttribute('aria-label',t.color);
 }
 function refreshColor(){color.value=state.color||(root.dataset.theme==='light'?'#242424':'#d0d0ce')}
 function apply(){
  slider.value=String(state.size);slider.setAttribute('aria-valuenow',String(state.size));
  slider.setAttribute('aria-valuetext',state.size+'%');
  document.getElementById('reading-font-value').textContent=state.size+'%';
  document.getElementById('reading-size-value').value=state.size+'%';
  root.style.setProperty('--vitruvia-reading-zoom',String(state.size/100));
  family.value=state.font;
  if(state.font==='original'){delete root.dataset.readingFont;root.style.removeProperty('--vitruvia-reading-family')}
  else{root.dataset.readingFont=state.font;root.style.setProperty('--vitruvia-reading-family',fonts[state.font])}
  root.dataset.readingItalic=String(state.italic);
  italic.setAttribute('aria-pressed',String(state.italic));
  if(state.color){root.dataset.readingColor='custom';root.style.setProperty('--vitruvia-reading-color',state.color)}
  else{delete root.dataset.readingColor;root.style.removeProperty('--vitruvia-reading-color')}
  automatic.setAttribute('aria-pressed',String(!state.color));
  refreshColor();
  try{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(sizeKey,String(state.size))}catch{}
 }
 slider.addEventListener('input',()=>{state.size=normalizeSize(slider.value);apply()});
 family.addEventListener('change',()=>{state.font=validFont(family.value)?family.value:'original';apply()});
 italic.addEventListener('click',()=>{state.italic=!state.italic;apply()});
 function chooseColor(){if(validColor(color.value)){state.color=color.value.toLowerCase();apply()}}
 color.addEventListener('input',chooseColor);color.addEventListener('change',chooseColor);
 automatic.addEventListener('click',()=>{state.color=null;apply()});
 document.getElementById('reading-font-reset').addEventListener('click',()=>{state={size:100,font:'original',italic:false,color:null};apply()});
 document.addEventListener('click',event=>{if(options.open&&!options.contains(event.target))options.open=false});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&options.open){options.open=false;summary.focus()}});
 new MutationObserver(records=>{
  if(records.some(record=>record.attributeName==='lang'))refreshLabels();
  if(records.some(record=>record.attributeName==='data-theme'))refreshColor();
 }).observe(root,{attributes:true,attributeFilter:['lang','data-theme']});
 refreshLabels();apply();
})();
