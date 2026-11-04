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
 const background=document.getElementById('reading-background-color');
 const backgroundAutomatic=document.getElementById('reading-background-auto');
 const summary=document.getElementById('reading-options-toggle');
 const fonts={original:null,georgia:'Georgia, "Times New Roman", serif',palatino:'Palatino, "Palatino Linotype", "Book Antiqua", serif',times:'"Times New Roman", Times, serif',arial:'Arial, Helvetica, sans-serif',system:'system-ui, -apple-system, "Segoe UI", sans-serif'};
 const key='vitruvia-reading-appearance-v2';
 const sizeKey='vitruvia-reading-font-percent-v1';
 const labels={
  es:{title:'Opciones de lectura',size:'Tamaño de letra',font:'Tipografía',original:'Original',system:'Sistema',style:'Estilo',italic:'Cursiva',color:'Color del texto',background:'Color del fondo',automatic:'Automático',preview:'Así se verá el texto.',hint:'Se aplica a artículos, resultados y fondo del buscador; el texto se adapta para mantener el contraste.',reset:'Restablecer ajustes'},
  en:{title:'Reading options',size:'Text size',font:'Typeface',original:'Original',system:'System',style:'Style',italic:'Italic',color:'Text color',background:'Background color',automatic:'Automatic',preview:'This is how the text will look.',hint:'Applies to articles, results and page background; text adjusts to retain contrast.',reset:'Reset settings'},
  fr:{title:'Options de lecture',size:'Taille du texte',font:'Police',original:'Originale',system:'Système',style:'Style',italic:'Italique',color:'Couleur du texte',background:'Couleur du fond',automatic:'Automatique',preview:'Voici l’apparence du texte.',hint:'S’applique aux articles, aux résultats et au fond de page ; le texte reste lisible.',reset:'Réinitialiser les réglages'}
 };
 const validFont=value=>Object.hasOwn(fonts,value);
 const validColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
 function normalizeSize(value){const n=Number(value);return Number.isFinite(n)&&n>0?Math.min(160,Math.max(90,Math.round(n/5)*5)):100}
 function luminance(hex){
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255)
   .map(v=>v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4));
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
 }
 function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
 let state={size:100,font:'original',italic:false,color:null,background:null};
 try{
  state.size=normalizeSize(localStorage.getItem(sizeKey));
  const saved=JSON.parse(localStorage.getItem(key)||localStorage.getItem('vitruvia-reading-appearance-v1')||localStorage.getItem('vitruvia-reading-typography-v1')||'null');
  if(saved&&typeof saved==='object'){
   if(saved.size!=null)state.size=normalizeSize(saved.size);
   if(validFont(saved.font))state.font=saved.font;
   state.italic=saved.italic===true;
   if(validColor(saved.color))state.color=saved.color.toLowerCase();
   if(validColor(saved.background))state.background=saved.background.toLowerCase();
  }
 }catch{}
 function refreshLabels(){
  const t=labels[root.lang?.slice(0,2)]||labels.es;
  options.querySelectorAll('[data-reading-label]').forEach(el=>{el.textContent=t[el.dataset.readingLabel]});
  summary.setAttribute('aria-label',t.title);summary.title=t.title;
  color.setAttribute('aria-label',t.color);
  background.setAttribute('aria-label',t.background);
 }
 function effectiveBackground(){return state.background||(root.dataset.theme==='light'?'#f7f5ef':'#0d0d0e')}
 function refreshColor(){
  const bg=effectiveBackground();
  color.value=state.color||(luminance(bg)>.179?'#171717':'#f8f8f8');
  background.value=bg;
 }
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
  const bg=effectiveBackground(),light=luminance(bg)>.179;
  const readable=light?'#151515':'#f8f8f8';
  const ink=state.color&&contrast(bg,state.color)>=4.5?state.color:readable;
  if(state.color){root.dataset.readingColor='custom';root.style.setProperty('--vitruvia-reading-color',ink)}
  else{delete root.dataset.readingColor;root.style.removeProperty('--vitruvia-reading-color')}
  if(state.background){
   root.dataset.readingBackground='custom';
   root.dataset.readingBackgroundTone=light?'light':'dark';
   root.style.setProperty('--vitruvia-reading-background',state.background);
   root.style.setProperty('--vitruvia-background-ink',readable);
   root.style.setProperty('--vitruvia-background-muted',light?'#252525':'#ededed');
  }else{
   delete root.dataset.readingBackground;
   delete root.dataset.readingBackgroundTone;
   for(const name of ['--vitruvia-reading-background','--vitruvia-background-ink','--vitruvia-background-muted'])root.style.removeProperty(name);
  }
  automatic.setAttribute('aria-pressed',String(!state.color));
  backgroundAutomatic.setAttribute('aria-pressed',String(!state.background));
  refreshColor();
  try{localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(sizeKey,String(state.size))}catch{}
 }
 slider.addEventListener('input',()=>{state.size=normalizeSize(slider.value);apply()});
 family.addEventListener('change',()=>{state.font=validFont(family.value)?family.value:'original';apply()});
 italic.addEventListener('click',()=>{state.italic=!state.italic;apply()});
 function chooseColor(){if(validColor(color.value)){state.color=color.value.toLowerCase();apply()}}
 color.addEventListener('input',chooseColor);color.addEventListener('change',chooseColor);
 automatic.addEventListener('click',()=>{state.color=null;apply()});
 function chooseBackground(){if(validColor(background.value)){state.background=background.value.toLowerCase();apply()}}
 background.addEventListener('input',chooseBackground);
 background.addEventListener('change',chooseBackground);
 backgroundAutomatic.addEventListener('click',()=>{state.background=null;apply()});
 document.getElementById('reading-font-reset').addEventListener('click',()=>{state={size:100,font:'original',italic:false,color:null,background:null};apply()});
 document.addEventListener('click',event=>{if(options.open&&!options.contains(event.target))options.open=false});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&options.open){options.open=false;summary.focus()}});
 new MutationObserver(records=>{
  if(records.some(record=>record.attributeName==='lang'))refreshLabels();
  if(records.some(record=>record.attributeName==='data-theme'))apply();
 }).observe(root,{attributes:true,attributeFilter:['lang','data-theme']});
 refreshLabels();apply();
})();
