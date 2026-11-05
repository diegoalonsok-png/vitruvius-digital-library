/* Lector bilingüe: local, independent viewer appearance preferences. */
(()=>{'use strict';
 function mount(){
  const reader=document.querySelector('#reading.scholarly-reader');
  const toolbar=reader?.querySelector('.passage-toolbar');
  if(!reader||!toolbar||document.getElementById('bilingual-appearance'))return;
  const key='vitruvius-bilingual-viewer-appearance-v1';
  const fonts={original:null,georgia:'Georgia, "Times New Roman", serif',palatino:'Palatino, "Book Antiqua", serif',times:'"Times New Roman", Times, serif',arial:'Arial, Helvetica, sans-serif',system:'system-ui, -apple-system, "Segoe UI", sans-serif'};
  const presets={original:['#ffffff','#172a3b'],black:['#000000','#ffffff'],ivory:['#fffff0','#1c2228'],sepia:['#ede0c9','#382d23']};
  const validColor=x=>typeof x==='string'&&/^#[0-9a-f]{6}$/i.test(x);
  let state={mode:'original',background:'#ffffff',ink:'#172a3b',font:'original',italic:false};
  try{
   const saved=JSON.parse(localStorage.getItem(key)||'null');
   if(saved&&validColor(saved.background)&&validColor(saved.ink)&&Object.hasOwn(fonts,saved.font)){
    state={mode:Object.hasOwn(presets,saved.mode)?saved.mode:'custom',background:saved.background,ink:saved.ink,font:saved.font,italic:saved.italic===true};
   }
  }catch{}
  const bar=document.createElement('section');bar.id='bilingual-appearance';bar.setAttribute('aria-label','Personalizar visor bilingüe');
  bar.innerHTML='<strong>Apariencia del visor</strong>'+
   '<label>Combinación <select id="bilingual-preset"><option value="original">Original</option><option value="black">Negro · blanco</option><option value="ivory">Marfil</option><option value="sepia">Sepia</option><option value="custom">Personalizado</option></select></label>'+
   '<label>Fondo <input id="bilingual-background" type="color" aria-label="Color del fondo del texto"></label>'+
   '<label>Texto <input id="bilingual-ink" type="color" aria-label="Color del texto"></label>'+
   '<label>Tipografía <select id="bilingual-font"><option value="original">Original</option><option value="georgia">Georgia</option><option value="palatino">Palatino</option><option value="times">Times New Roman</option><option value="arial">Arial</option><option value="system">Sistema</option></select></label>'+
   '<label><input id="bilingual-italic" type="checkbox"> Cursiva</label>'+
   '<button type="button" id="bilingual-reset">Restablecer</button>'+
   '<p class="bilingual-appearance-note" id="bilingual-appearance-note">Los ajustes afectan solo a las columnas de texto latino y traducciones.</p>';
  toolbar.after(bar);
  const $=id=>bar.querySelector('#'+id);
  const mode=$('bilingual-preset'),background=$('bilingual-background'),ink=$('bilingual-ink'),font=$('bilingual-font'),italic=$('bilingual-italic'),note=$('bilingual-appearance-note');
  const luminosity=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const contrast=(a,b)=>{const x=luminosity(a),y=luminosity(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  function apply(){
   const chosen=contrast(state.background,state.ink)>=4.5?state.ink:(luminosity(state.background)>.18?'#111111':'#ffffff');
   reader.classList.toggle('bilingual-user-colors',state.mode!=='original');
   reader.style.setProperty('--bilingual-panel-bg',state.background);
   reader.style.setProperty('--bilingual-panel-ink',chosen);
   reader.style.setProperty('--bilingual-panel-border',luminosity(state.background)>.18?'#958f87':'#59616b');
   reader.dataset.bilingualFont=state.font;reader.dataset.bilingualItalic=String(state.italic);
   if(fonts[state.font])reader.style.setProperty('--bilingual-text-family',fonts[state.font]);
   else reader.style.removeProperty('--bilingual-text-family');
   mode.value=state.mode;background.value=state.background;ink.value=state.ink;font.value=state.font;italic.checked=state.italic;
   note.textContent=chosen===state.ink?'Se aplica únicamente a los textos del visor bilingüe.': 'El color solicitado no ofrece suficiente contraste; se usa un tono legible para el texto.';
   try{localStorage.setItem(key,JSON.stringify(state))}catch{}
  }
  mode.addEventListener('change',()=>{if(Object.hasOwn(presets,mode.value)){state.mode=mode.value;[state.background,state.ink]=presets[mode.value];apply()}});
  background.addEventListener('input',()=>{if(validColor(background.value)){state.background=background.value;state.mode='custom';apply()}});
  ink.addEventListener('input',()=>{if(validColor(ink.value)){state.ink=ink.value;state.mode='custom';apply()}});
  font.addEventListener('change',()=>{if(Object.hasOwn(fonts,font.value)){state.font=font.value;apply()}});
  italic.addEventListener('change',()=>{state.italic=italic.checked;apply()});
  $('bilingual-reset').addEventListener('click',()=>{state={mode:'original',background:'#ffffff',ink:'#172a3b',font:'original',italic:false};apply()});
  apply();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
