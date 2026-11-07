/* Preferencias independientes del diccionario-concordancia, sin modificar el texto fuente. */
(()=>{
'use strict';
const KEY='vitruvius-concordance-reader-v1';
const defaults={bg:'#faf8f2',fg:'#182b3b',font:'Georgia, serif',size:17};
const fonts={'Georgia':'Georgia, serif','Garamond':'Garamond, "Times New Roman", serif','Palatino':'Palatino, "Palatino Linotype", serif','Times New Roman':'"Times New Roman", serif','Arial':'Arial, sans-serif','Verdana':'Verdana, sans-serif','OpenDyslexic':'OpenDyslexic, Arial, sans-serif'};
const valid=c=>/^#[0-9a-f]{6}$/i.test(c);
let preferences={...defaults};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(valid(saved.bg))preferences.bg=saved.bg;if(valid(saved.fg))preferences.fg=saved.fg;if(Object.values(fonts).includes(saved.font))preferences.font=saved.font;if(Number.isFinite(saved.size)&&saved.size>=13&&saved.size<=28)preferences.size=saved.size;}catch{}
function apply(){
 const root=document.documentElement;
 root.style.setProperty('--concordance-background',preferences.bg);
 root.style.setProperty('--concordance-foreground',preferences.fg);
 root.style.setProperty('--concordance-font',preferences.font);
 root.style.setProperty('--concordance-size',preferences.size+'px');
 try{localStorage.setItem(KEY,JSON.stringify(preferences))}catch{}
}
apply();
function mount(){
 const filters=document.querySelector('.filters');if(!filters||document.getElementById('concordance-personalize'))return;
 const panel=document.createElement('details');panel.id='concordance-personalize';panel.className='concordance-personalize';
 const head=document.createElement('summary');head.textContent='🎨 Personalizar fondo y tipografía';panel.append(head);
 const controls=document.createElement('div');controls.className='concordance-personalize-controls';panel.append(controls);
 function color(label,field){
  const wrap=document.createElement('label');wrap.textContent=label;
  const input=document.createElement('input');input.type='color';input.value=preferences[field];input.setAttribute('aria-label',label);
  input.addEventListener('input',()=>{preferences[field]=input.value;apply()});
  wrap.append(input);controls.append(wrap);return input;
 }
 const bg=color('Color de fondo', 'bg'),fg=color('Color de las letras','fg');
 const fontLabel=document.createElement('label');fontLabel.textContent='Tipografía';
 const select=document.createElement('select');select.setAttribute('aria-label','Tipografía de lectura');
 for(const [label,value] of Object.entries(fonts)){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option)}
 select.value=preferences.font;select.addEventListener('change',()=>{preferences.font=select.value;apply()});fontLabel.append(select);controls.append(fontLabel);
 const sizeLabel=document.createElement('label');sizeLabel.textContent='Tamaño de letra';
 const size=document.createElement('input');size.type='range';size.min='13';size.max='28';size.step='1';size.value=String(preferences.size);
 const sizeValue=document.createElement('output');sizeValue.textContent=preferences.size+' px';
 size.addEventListener('input',()=>{preferences.size=Number(size.value);sizeValue.textContent=size.value+' px';apply()});
 sizeLabel.append(size,sizeValue);controls.append(sizeLabel);
 const preset=document.createElement('div');preset.className='concordance-presets';
 for(const [label,bgColor,fgColor] of [['Papel','#faf8f2','#182b3b'],['Blanco','#ffffff','#141414'],['Sepia','#efe1c4','#382b20'],['Azul noche','#152638','#f5eddf'],['Negro','#101114','#f2f2f2']]){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.title='Fondo '+label;b.style.borderBottom='3px solid '+bgColor;
  b.addEventListener('click',()=>{preferences.bg=bgColor;preferences.fg=fgColor;bg.value=bgColor;fg.value=fgColor;apply()});preset.append(b);
 }
 controls.append(preset);
 const reset=document.createElement('button');reset.type='button';reset.textContent='Restaurar diseño original';reset.addEventListener('click',()=>{preferences={...defaults};bg.value=preferences.bg;fg.value=preferences.fg;select.value=preferences.font;size.value=String(preferences.size);sizeValue.textContent=preferences.size+' px';apply()});controls.append(reset);
 filters.before(panel);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();