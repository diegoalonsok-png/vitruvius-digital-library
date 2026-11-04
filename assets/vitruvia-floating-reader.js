/* Vitruvia · fixed scholarly reading toolbar; proxies the original preferences. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const native={
  size:$('reading-font-size'),font:$('reading-font-family'),italic:$('reading-italic'),
  color:$('reading-text-color'),auto:$('reading-color-auto'),reset:$('reading-font-reset')
 };
 const article=$('vitruvia-article');
 if(!article||Object.values(native).some(x=>!x))return;
 const bar=document.createElement('aside');
 bar.id='vitruvia-reading-float';
 bar.className='vitruvia-reading-float';
 bar.dataset.visible='false';
 bar.innerHTML=[
  '<div class="vrf-rail" role="toolbar" aria-label="Controles de lectura">',
  '<button type="button" id="vrf-drag" class="vrf-key vrf-drag" aria-label="Mover barra de lectura" title="Arrastrar para mover · doble clic para centrar">⠿</button>',
  '<button type="button" id="vrf-decrease" class="vrf-key" aria-label="Reducir letra" title="Reducir letra">A−</button>',
  '<button type="button" id="vrf-settings" class="vrf-key vrf-key-main" aria-label="Opciones de lectura" aria-controls="vrf-panel" aria-expanded="false" title="Opciones de lectura">Aa</button>',
  '<button type="button" id="vrf-increase" class="vrf-key" aria-label="Agrandar letra" title="Agrandar letra">A+</button>',
  '<button type="button" id="vrf-colors" class="vrf-key vrf-color-key" aria-label="Elegir color del texto" aria-controls="vrf-panel" aria-expanded="false" title="Color del texto"><span class="vrf-ink-dot" aria-hidden="true"></span></button>',
  '</div>',
  '<section id="vrf-panel" class="vrf-panel" hidden aria-labelledby="vrf-heading">',
  '<div class="vrf-head"><strong id="vrf-heading">Lectura</strong><button type="button" id="vrf-close" aria-label="Cerrar opciones" title="Cerrar">×</button></div>',
  '<label for="vrf-size" id="vrf-size-label">Tamaño del texto</label>',
  '<div class="vrf-size-row"><input type="range" id="vrf-size" min="90" max="160" step="5" value="100"><output id="vrf-percent" for="vrf-size">100%</output></div>',
  '<label for="vrf-font" id="vrf-font-label">Tipografía</label>',
  '<select id="vrf-font"><option value="original">Original</option><option value="georgia">Georgia</option><option value="palatino">Palatino</option><option value="times">Times New Roman</option><option value="arial">Arial</option><option value="system">Sistema</option></select>',
  '<label for="vrf-color" id="vrf-color-label">Color del texto</label>',
  '<div class="vrf-color-row"><input type="color" id="vrf-color" value="#f8f8f8"><button type="button" id="vrf-automatic">Automático</button></div>',
  '<div class="vrf-actions"><button type="button" id="vrf-italic" aria-pressed="false">Cursiva</button><button type="button" id="vrf-reset">Restablecer</button></div>',
  '</section>'
 ].join('');
 document.body.append(bar);
 const ui={
  grip:$('vrf-drag'),minus:$('vrf-decrease'),plus:$('vrf-increase'),open:$('vrf-settings'),
  colors:$('vrf-colors'),dot:bar.querySelector('.vrf-ink-dot'),panel:$('vrf-panel'),
  close:$('vrf-close'),size:$('vrf-size'),percent:$('vrf-percent'),
  font:$('vrf-font'),color:$('vrf-color'),auto:$('vrf-automatic'),
  italic:$('vrf-italic'),reset:$('vrf-reset')
 };
 const languages={
  es:{rail:'Controles de lectura',smaller:'Reducir letra',larger:'Agrandar letra',settings:'Opciones de lectura',colorShortcut:'Elegir color del texto',title:'Lectura',close:'Cerrar opciones',size:'Tamaño del texto',font:'Tipografía',color:'Color del texto',auto:'Automático',italic:'Cursiva',reset:'Restablecer',original:'Original',system:'Sistema'},
  en:{rail:'Reading controls',smaller:'Decrease text size',larger:'Increase text size',settings:'Reading options',colorShortcut:'Choose text color',title:'Reading',close:'Close options',size:'Text size',font:'Typeface',color:'Text color',auto:'Automatic',italic:'Italic',reset:'Reset',original:'Original',system:'System'},
  fr:{rail:'Commandes de lecture',smaller:'Réduire le texte',larger:'Agrandir le texte',settings:'Options de lecture',colorShortcut:'Choisir la couleur du texte',title:'Lecture',close:'Fermer les options',size:'Taille du texte',font:'Police',color:'Couleur du texte',auto:'Automatique',italic:'Italique',reset:'Réinitialiser',original:'Originale',system:'Système'}
 };
 function translate(){
  const l=languages[document.documentElement.lang?.slice(0,2)]||languages.es;
  bar.querySelector('.vrf-rail').setAttribute('aria-label',l.rail);
  const tongue=document.documentElement.lang?.slice(0,2);
  ui.grip.title=tongue==='en'?'Drag to move · double-click to reset':tongue==='fr'?'Glisser pour déplacer · double-clic pour réinitialiser':'Arrastrar para mover · doble clic para restaurar';
  ui.grip.setAttribute('aria-label',tongue==='en'?'Move reading toolbar':tongue==='fr'?'Déplacer la barre de lecture':'Mover barra de lectura');
  for(const [el,label] of [[ui.minus,l.smaller],[ui.plus,l.larger],[ui.open,l.settings],[ui.colors,l.colorShortcut]]){
   el.setAttribute('aria-label',label);el.title=label;
  }
  $('vrf-heading').textContent=l.title;
  ui.close.setAttribute('aria-label',l.close);ui.close.title=l.close;
  $('vrf-size-label').textContent=l.size;
  $('vrf-font-label').textContent=l.font;
  $('vrf-color-label').textContent=l.color;
  ui.auto.textContent=l.auto;ui.italic.textContent=l.italic;ui.reset.textContent=l.reset;
  ui.font.options[0].textContent=l.original;ui.font.options[5].textContent=l.system;
 }
 function sync(){
  ui.size.value=native.size.value;
  ui.percent.textContent=native.size.value+'%';
  ui.font.value=native.font.value;
  ui.color.value=native.color.value;
  ui.dot.style.backgroundColor=native.color.value;
  ui.italic.setAttribute('aria-pressed',native.italic.getAttribute('aria-pressed')||'false');
  ui.auto.setAttribute('aria-pressed',native.auto.getAttribute('aria-pressed')||'false');
 }
 const notify=(el,type)=>el.dispatchEvent(new Event(type,{bubbles:true}));
 function resize(amount){
  const value=Number(native.size.value)||100;
  native.size.value=String(Math.max(Number(native.size.min)||90,Math.min(Number(native.size.max)||160,value+amount)));
  notify(native.size,'input');sync();
 }
 ui.minus.addEventListener('click',()=>resize(-5));
 ui.plus.addEventListener('click',()=>resize(5));
 ui.size.addEventListener('input',()=>{native.size.value=ui.size.value;notify(native.size,'input');sync()});
 ui.font.addEventListener('change',()=>{native.font.value=ui.font.value;notify(native.font,'change');sync()});
 function changeColor(){native.color.value=ui.color.value;notify(native.color,'input');sync()}
 ui.color.addEventListener('input',changeColor);
 ui.color.addEventListener('change',changeColor);
 ui.auto.addEventListener('click',()=>{native.auto.click();sync()});
 ui.italic.addEventListener('click',()=>{native.italic.click();sync()});
 ui.reset.addEventListener('click',()=>{native.reset.click();sync()});
 function expand(yes,colorFocus=false){
  ui.panel.hidden=!yes;
  ui.open.setAttribute('aria-expanded',String(yes));
  ui.colors.setAttribute('aria-expanded',String(yes));
  if(yes){sync();(colorFocus?ui.color:ui.size).focus()}
 }
 ui.open.addEventListener('click',()=>expand(ui.panel.hidden));
 ui.colors.addEventListener('click',()=>expand(true,true));
 ui.close.addEventListener('click',()=>{expand(false);ui.open.focus()});
 document.addEventListener('pointerdown',event=>{
  if(!ui.panel.hidden&&!bar.contains(event.target))expand(false);
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!ui.panel.hidden){expand(false);ui.open.focus()}
 });
 // Movable reading toolbar: a dedicated grip avoids hijacking A+/Aa/color clicks.
 const positionKey='vitruvia-reader-toolbar-position-v1';
 const clamp=(n,lo,hi)=>Math.max(lo,Math.min(n,Math.max(lo,hi)));
 function place(x,y,persist=false){
  const width=bar.getBoundingClientRect().width||52;
  const height=bar.getBoundingClientRect().height||245;
  const left=clamp(x,8,window.innerWidth-width-8);
  const top=clamp(y,8,window.innerHeight-height-8);
  bar.style.right='auto';bar.style.bottom='auto';
  bar.style.left=left+'px';bar.style.top=top+'px';
  bar.classList.add('vrf-user-positioned');
  if(persist)try{localStorage.setItem(positionKey,JSON.stringify({x:left,y:top}))}catch{}
  adjustPanelSide();
 }
 function adjustPanelSide(){
  if(bar.getBoundingClientRect().left<360)ui.panel.classList.add('vrf-panel-right');
  else ui.panel.classList.remove('vrf-panel-right');
 }
 function resetPlacement(){
  for(const key of ['left','right','top','bottom'])bar.style.removeProperty(key);
  bar.classList.remove('vrf-user-positioned');
  ui.panel.classList.remove('vrf-panel-right');
  try{localStorage.removeItem(positionKey)}catch{}
 }
 let drag=null;
 ui.grip.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  event.preventDefault();
  const r=bar.getBoundingClientRect();
  drag={pointer:event.pointerId,dx:event.clientX-r.left,dy:event.clientY-r.top};
  place(r.left,r.top);
  bar.classList.add('vrf-dragging');
 });
 window.addEventListener('pointermove',event=>{
  if(!drag||drag.pointer!==event.pointerId)return;
  event.preventDefault();
  place(event.clientX-drag.dx,event.clientY-drag.dy);
 },{passive:false});
 const finish=event=>{
  if(!drag||drag.pointer!==event.pointerId)return;
  drag=null;bar.classList.remove('vrf-dragging');
  const r=bar.getBoundingClientRect();place(r.left,r.top,true);
 };
 window.addEventListener('pointerup',finish);
 window.addEventListener('pointercancel',finish);
 ui.grip.addEventListener('dblclick',resetPlacement);
 ui.grip.addEventListener('keydown',event=>{
  if(event.key==='Home'){event.preventDefault();resetPlacement();return}
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const v=directions[event.key];if(!v)return;
  event.preventDefault();
  const r=bar.getBoundingClientRect(),step=event.shiftKey?30:10;
  place(r.left+v[0]*step,r.top+v[1]*step,true);
 });
 window.addEventListener('vitruvia:reader-open',()=>{
  bar.dataset.userVisible='true';
  bar.dataset.visible='true';
  adjustPanelSide();
  expand(true);
 });
 try{
  const stored=JSON.parse(localStorage.getItem(positionKey)||'null');
  if(Number.isFinite(stored?.x)&&Number.isFinite(stored?.y)){
   bar.dataset.userVisible='true';
   place(stored.x,stored.y);
  }
 }catch{}
 function visibility(){
  // The rail is fixed and should accompany the reader throughout the entire
  // results page; viewport checks could incorrectly hide it mid-article.
  const visible=bar.dataset.userVisible==='true'||document.body.classList.contains('vitruvia-reading')&&!article.hidden;
  bar.dataset.visible=String(visible);
  if(!visible&&!ui.panel.hidden)expand(false);
 }
 let raf=false;
 function schedule(){
  if(raf)return;
  raf=true;requestAnimationFrame(()=>{raf=false;visibility()});
 }
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',()=>{if(bar.classList.contains('vrf-user-positioned')){const r=bar.getBoundingClientRect();place(r.left,r.top)}schedule()},{passive:true});
 window.addEventListener('vitruvia:search',schedule);
 window.addEventListener('vitruvia:clear',schedule);
 new MutationObserver(schedule).observe(article,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
 new MutationObserver(records=>{
  if(records.some(r=>r.attributeName==='lang'))translate();
  sync();
 }).observe(document.documentElement,{
  attributes:true,attributeFilter:['lang','style','data-reading-font','data-reading-italic','data-reading-color','data-reading-background','data-theme']
 });
 for(const el of [native.size,native.font,native.color]){
  el.addEventListener('input',sync);el.addEventListener('change',sync);
 }
 translate();sync();schedule();
})();
