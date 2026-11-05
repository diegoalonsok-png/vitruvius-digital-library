/* Paleta opcional exclusiva de la portada; no cambia lectores ni contenidos. */
(()=>{
 'use strict';
 const key='vitruvius-front-bg';
 const defaultBg='#0b0e12';
 const presets=[
  ['Negro','#0b0e12'],['Grafito','#15191e'],['Pizarra','#222a32'],
  ['Azul noche','#101b2c'],['Sepia','#292019'],['Verde tinta','#182720']
 ];
 const valid=v=>/^#[0-9a-f]{6}$/i.test(v);
 const root=document.documentElement;
 function fromStore(){
  try{const saved=localStorage.getItem(key);return valid(saved)?saved.toLowerCase():defaultBg;}catch{return defaultBg;}
 }
 function darken(value){
  if(!valid(value))return defaultBg;
  const rgb=[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
  return '#'+rgb.map(c=>c.toString(16).padStart(2,'0')).join('');
 }
 function ensureContrast(value){
  if(!valid(value))value=defaultBg;
  const linear=hex=>{const c=parseInt(hex,16)/255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
  const luminance=0.2126*linear(value.slice(1,3))+0.7152*linear(value.slice(3,5))+0.0722*linear(value.slice(5,7));
  root.classList.toggle('front-color-light',luminance>0.32);
 }
 root.style.setProperty('--front-page-bg',fromStore());
 ensureContrast(fromStore());
 function mount(){
  const controls=document.querySelector('.research-nav-controls');
  const moon=controls&&controls.querySelector('.theme-switch');
  if(!controls||!moon||document.getElementById('home-palette-toggle'))return;
  const wrapper=document.createElement('div');
  wrapper.className='home-color-tools';
  wrapper.innerHTML=
    '<button type="button" class="home-palette-toggle" id="home-palette-toggle" '+
    'aria-label="Elegir el color del fondo de la portada" aria-expanded="false" aria-controls="home-color-panel" title="Elegir colores de fondo">'+
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
    '<path d="M12 3a9 9 0 1 0 0 18h1.7a2.3 2.3 0 0 0 1.7-3.9 1.7 1.7 0 0 1 1.3-2.9H18A3 3 0 0 0 21 11a8 8 0 0 0-9-8Z"/>'+
    '<circle cx="7.5" cy="11.5" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/><circle cx="17" cy="11.5" r="1"/>'+
    '</svg></button>'+
    '<div class="home-color-panel" id="home-color-panel" hidden role="group" aria-label="Colores de fondo de la portada">'+
    '<h2>Color de fondo</h2><p>Elegí un tono para la portada. La selección se guarda en este navegador.</p>'+
    '<div class="home-swatch-grid" id="home-swatch-grid"></div>'+
    '<label class="home-color-custom" for="home-custom-color">Color personalizado <input id="home-custom-color" type="color" value="#15191e"></label>'+
    '<button class="home-color-reset" id="home-color-reset" type="button">Restaurar negro original</button>'+
    '</div>';
  controls.append(wrapper); // Always the final control, after the language selector.
  const toggle=wrapper.querySelector('#home-palette-toggle');
  const panel=wrapper.querySelector('#home-color-panel');
  const grid=wrapper.querySelector('#home-swatch-grid');
  const custom=wrapper.querySelector('#home-custom-color');
  const reset=wrapper.querySelector('#home-color-reset');
  function paint(){
   const selected=fromStore();
   grid.querySelectorAll('[data-bg]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bg===selected)));
  }
  function close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
  function setColor(value){
   const color=darken(value);
   root.style.setProperty('--front-page-bg',color);
   ensureContrast(color);
   try{localStorage.setItem(key,color);}catch{}
   if(root.dataset.theme!=='dark')moon.click();
   paint();close();toggle.focus();
  }
  presets.forEach(([label,color])=>{
   const button=document.createElement('button');
   button.className='home-swatch';button.type='button';button.dataset.bg=color;
   button.setAttribute('aria-label','Fondo '+label);
   const dot=document.createElement('span');dot.className='home-swatch-dot';dot.style.background=color;dot.setAttribute('aria-hidden','true');
   const words=document.createElement('span');words.textContent=label;
   button.append(dot,words);button.addEventListener('click',()=>setColor(color));grid.append(button);
  });
  toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));});
  custom.addEventListener('change',()=>setColor(custom.value));
  reset.addEventListener('click',()=>{try{localStorage.removeItem(key);}catch{} root.style.setProperty('--front-page-bg',defaultBg);ensureContrast(defaultBg);paint();close();toggle.focus();});
  document.addEventListener('pointerdown',event=>{if(!wrapper.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){close();toggle.focus();}});
  paint();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
 else mount();
})();