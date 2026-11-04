/* Vitruvia · navegación académica, búsqueda local y procedencia documentada. */
(()=>{
 'use strict';
 function fold(raw){
  const text=String(raw||'');let value='';const begin=[],end=[];
  for(let i=0;i<text.length;){
   const ch=String.fromCodePoint(text.codePointAt(i));
   const part=ch.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
   for(let j=0;j<part.length;j++){value+=part[j];begin.push(i);end.push(i+ch.length)}
   i+=ch.length;
  }
  return {value,begin,end};
 }
 function findMatches(text,query,limit=300){
  const source=fold(text),needle=fold(String(query||'').trim()).value;
  if(needle.length<2)return [];
  const out=[];let offset=0;
  while(out.length<limit){
   const i=source.value.indexOf(needle,offset);
   if(i<0)break;
   out.push([source.begin[i],source.end[i+needle.length-1]]);
   offset=i+Math.max(1,needle.length);
  }
  return out;
 }
 window.VitruviaAcademicReader={findMatches,version:'1.0'};
 const article=document.getElementById('vitruvia-article');
 const body=document.getElementById('article-body'),aside=document.getElementById('article-aside');
 if(!article||!body||!aside)return;
 const panel=document.createElement('section');
 panel.id='vr-academic-tools';panel.className='vr-academic-tools';
 panel.innerHTML=[
  '<div class="vr-study-heading"><strong id="vr-heading">Navegación del artículo</strong><span id="vr-progress">0%</span></div>',
  '<div class="vr-progress-track"><div id="vr-progress-fill"></div></div>',
  '<div id="vr-source-snapshot" class="vr-source-snapshot" aria-live="polite"></div>',
  '<details id="vr-study-collapse" open><summary id="vr-summary">Índice y búsqueda</summary>',
  '<div class="vr-study-inner"><label for="vr-find" id="vr-find-label">Buscar dentro del artículo</label>',
  '<div class="vr-find-row"><input id="vr-find" type="search" autocomplete="off" spellcheck="false" placeholder="Palabra o frase"><button id="vr-clear" type="button" aria-label="Borrar">×</button></div>',
  '<div class="vr-find-nav"><span id="vr-count" role="status" aria-live="polite">Sin búsqueda</span><div><button id="vr-prev" type="button" aria-label="Anterior">↑</button><button id="vr-next" type="button" aria-label="Siguiente">↓</button></div></div>',
  '<nav id="vr-index" aria-label="Secciones del artículo"></nav>',
  '<div class="vr-source-footer"><a id="vr-sources-link" href="#article-sources">Fuentes y bibliografía ↓</a><small id="vr-source-note">Procedencia señalada solo donde está documentada.</small></div>',
  '</div></details>'
 ].join('');
 const q=selector=>panel.querySelector(selector);
 const ui={heading:q('#vr-heading'),progress:q('#vr-progress'),fill:q('#vr-progress-fill'),snapshot:q('#vr-source-snapshot'),collapse:q('#vr-study-collapse'),summary:q('#vr-summary'),label:q('#vr-find-label'),input:q('#vr-find'),clear:q('#vr-clear'),prev:q('#vr-prev'),next:q('#vr-next'),count:q('#vr-count'),index:q('#vr-index'),sources:q('#vr-sources-link'),note:q('#vr-source-note')};
 const languages={
  es:['Navegación del artículo','Índice y búsqueda','Buscar dentro del artículo','Palabra o frase','Sin búsqueda','Escribí al menos 2 caracteres','Sin coincidencias','coincidencias','Fuentes y bibliografía ↓','Procedencia señalada solo donde está documentada.','Fuente: Wikipedia','Procedencia general de este párrafo: artículo original de Wikipedia. Las citas específicas se consultan en sus notas.','Resultado anterior','Resultado siguiente','Borrar búsqueda','secciones','enlaces documentales','Abrir fuente original'],
  en:['Article navigation','Contents and search','Find within this article','Word or phrase','No search','Enter at least 2 characters','No matches','matches','Sources and bibliography ↓','Provenance shown only when documented.','Source: Wikipedia','General provenance of this paragraph: original Wikipedia article. Check its footnotes for specific claims.','Previous match','Next match','Clear search','sections','documentary links','Open original source'],
  fr:['Navigation de l’article','Sommaire et recherche','Chercher dans cet article','Mot ou expression','Aucune recherche','Saisir au moins 2 caractères','Aucun résultat','occurrences','Sources et bibliographie ↓','Provenance indiquée uniquement si documentée.','Source : Wikipédia','Provenance générale de ce paragraphe : article Wikipédia. Consultez les notes pour les références précises.','Occurrence précédente','Occurrence suivante','Effacer','sections','liens documentaires','Ouvrir la source originale']
 };
 const labels=()=>languages[document.documentElement.lang?.slice(0,2)]||languages.es;
 let headings=[],links=[],marks=[],current=-1,lastTitle=null,buildTimer=0,searchTimer=0,scrollQueued=false;
 /* Movable scholarly navigator: only the handle drags, never the text area. */
 const headingRow=panel.querySelector('.vr-study-heading');
 const toolbar=document.createElement('span');toolbar.className='vr-study-controls';
 const dragButton=document.createElement('button');
 dragButton.type='button';dragButton.className='vr-drag-handle';dragButton.textContent='⠿';
 dragButton.setAttribute('aria-label','Mover índice');dragButton.title='Arrastrar para mover';
 const homeButton=document.createElement('button');
 homeButton.type='button';homeButton.className='vr-dock-button';homeButton.textContent='↩';
 homeButton.setAttribute('aria-label','Volver al lateral');homeButton.title='Volver al lateral';
 homeButton.hidden=true;
 ui.progress.replaceWith(toolbar);toolbar.append(ui.progress,dragButton,homeButton);
 const saveKey='vitruvia-study-position-v1';
 const clamp=(value,min,max)=>Math.min(Math.max(value,min),Math.max(min,max));
 function positionFloating(x,y,save=false){
  const rect=panel.getBoundingClientRect();
  const width=rect.width||280,height=rect.height||250;
  const left=clamp(x,8,window.innerWidth-width-8);
  const top=clamp(y,8,window.innerHeight-height-8);
  panel.style.left=left+'px';panel.style.top=top+'px';
  if(save){try{localStorage.setItem(saveKey,JSON.stringify({x:left,y:top}))}catch{}}
 }
 function constrainFloating(){
  if(!panel.classList.contains('vr-is-floating'))return;
  const rect=panel.getBoundingClientRect();
  positionFloating(rect.left,rect.top);
 }
 function placeFloating(x,y){
  if(!panel.classList.contains('vr-is-floating')){
   const width=panel.getBoundingClientRect().width||290;
   panel.classList.add('vr-is-floating');
   document.body.append(panel);
   panel.style.width=Math.min(Math.max(width,245),Math.max(245,window.innerWidth-16))+'px';
  }
  homeButton.hidden=false;
  positionFloating(x,y);
 }
 function dockIndex(){
  panel.classList.remove('vr-is-floating','vr-is-dragging');
  for(const prop of ['left','top','width'])panel.style.removeProperty(prop);
  homeButton.hidden=true;
  try{localStorage.removeItem(saveKey)}catch{}
  mount();
 }
 let moving=null;
 dragButton.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'&&event.button!==0)return;
  event.preventDefault();
  const rect=panel.getBoundingClientRect();
  moving={pointerId:event.pointerId,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top};
  placeFloating(rect.left,rect.top);
  panel.classList.add('vr-is-dragging');
 });
 window.addEventListener('pointermove',event=>{
  if(!moving||moving.pointerId!==event.pointerId)return;
  event.preventDefault();
  positionFloating(event.clientX-moving.offsetX,event.clientY-moving.offsetY);
 },{passive:false});
 function finishMove(event){
  if(!moving||moving.pointerId!==event.pointerId)return;
  moving=null;panel.classList.remove('vr-is-dragging');
  const rect=panel.getBoundingClientRect();
  positionFloating(rect.left,rect.top,true);
 }
 window.addEventListener('pointerup',finishMove);
 window.addEventListener('pointercancel',finishMove);
 dragButton.addEventListener('keydown',event=>{
  const offsets={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(!offsets[event.key])return;
  event.preventDefault();
  if(!panel.classList.contains('vr-is-floating')){
   const rect=panel.getBoundingClientRect();placeFloating(rect.left,rect.top);
  }
  const rect=panel.getBoundingClientRect(),step=event.shiftKey?30:10;
  positionFloating(rect.left+offsets[event.key][0]*step,rect.top+offsets[event.key][1]*step,true);
 });
 homeButton.addEventListener('click',dockIndex);
 function translate(){
  const t=labels();
  ui.heading.textContent=t[0];ui.summary.textContent=t[1];ui.label.textContent=t[2];
  ui.input.placeholder=t[3];ui.sources.textContent=t[8];ui.note.textContent=t[9];
  ui.prev.setAttribute('aria-label',t[12]);ui.next.setAttribute('aria-label',t[13]);ui.clear.setAttribute('aria-label',t[14]);
  dragButton.title=document.documentElement.lang==='en'?'Drag navigator':document.documentElement.lang==='fr'?'Déplacer le panneau':'Arrastrar navegador';
  homeButton.title=document.documentElement.lang==='en'?'Dock to sidebar':document.documentElement.lang==='fr'?'Replacer dans la colonne':'Volver al lateral';
  if(!ui.input.value)ui.count.textContent=t[4];
  for(const el of body.querySelectorAll('.vr-source-citation')){el.textContent=t[10];el.title=t[11]}
 }
 function mount(){
  if(panel.classList.contains('vr-is-floating')){
   if(!panel.isConnected)document.body.append(panel);
   constrainFloating();
   return;
  }
  const small=window.matchMedia('(max-width:1020px)').matches;
  const target=small?article.querySelector('.scholar-article-header'):aside;
  if(!target)return;
  if(small){
   if(panel.parentElement!==article)target.after(panel);
  }else if(panel.parentElement!==aside||aside.firstElementChild!==panel)aside.prepend(panel);
  if(!panel.dataset.initialized){
   ui.collapse.open=!small;panel.dataset.initialized='true';
   try{
    const last=JSON.parse(localStorage.getItem('vitruvia-study-position-v1')||'null');
    if(Number.isFinite(last?.x)&&Number.isFinite(last?.y))placeFloating(last.x,last.y);
   }catch{}
  }
 }
 function sourceAllowed(url){
  try{const u=new URL(url);return u.protocol==='https:'&&/^[a-z-]+\.wikipedia\.org$/i.test(u.hostname)&&/^\/(?:wiki\/|w\/index\.php)/.test(u.pathname)}
  catch{return false}
 }
 function addCitations(){
  const t=labels();
  for(const p of body.querySelectorAll('p[data-vr-origin]')){
   const source=p.getAttribute('data-vr-origin');
   if(!sourceAllowed(source)||p.querySelector('.vr-source-citation'))continue;
   const a=document.createElement('a');a.href=source;a.target='_blank';a.rel='noopener noreferrer';
   a.className='vr-source-citation';a.textContent=t[10];a.title=t[11];a.setAttribute('aria-label',t[11]);
   p.append(document.createTextNode(' '),a);
  }
 }
 function expandAncestors(node){
  for(let x=node.closest('details');x;x=x.parentElement?.closest('details'))x.open=true;
 }
 function unmark(){
  for(const mark of body.querySelectorAll('mark.vr-study-match')){
   const parent=mark.parentNode;mark.replaceWith(document.createTextNode(mark.textContent));parent?.normalize();
  }
  marks=[];current=-1;
 }
 function rebuild(){
  if(article.hidden||!document.body.classList.contains('vitruvia-reading'))return;
  mount();
  const title=document.getElementById('article-title')?.textContent||'';
  if(lastTitle!==title){
   lastTitle=title;ui.input.value='';unmark();ui.count.textContent=labels()[4];
  }
  headings=[...body.querySelectorAll('h3,h4')].filter(h=>!h.closest('.article-inline-contents'));
  links=[];ui.index.replaceChildren();
  for(const [i,h] of headings.entries()){
   if(!h.id)h.id='vr-section-'+i;
   const a=document.createElement('a');a.href='#'+encodeURIComponent(h.id);
   a.textContent=h.textContent.trim();a.className='vr-section'+(h.tagName==='H4'?' vr-subsection':'');
   a.addEventListener('click',()=>expandAncestors(h));
   ui.index.append(a);links.push(a);
  }
  addCitations();
  // Google's useful at-a-glance overview, restricted to observed DOM facts:
  // headings, linked records, and an original-source URL that actually exists.
  const t=labels();
  const sourceLinks=[...document.querySelectorAll('#article-sources .article-source-list a[href]')];
  ui.snapshot.replaceChildren(document.createTextNode(headings.length+' '+t[15]+' · '+sourceLinks.length+' '+t[16]));
  const original=body.querySelector('p[data-vr-origin]')?.getAttribute('data-vr-origin');
  if(sourceAllowed(original)){
   const link=document.createElement('a');link.href=original;
   link.target='_blank';link.rel='noopener noreferrer';
   link.textContent=t[17];link.className='vr-original-link';
   ui.snapshot.append(link);
  }
  if(ui.input.value.trim().length>=2)search(false);
  scheduleScroll();
 }
 function scheduleBuild(){
  clearTimeout(buildTimer);
  buildTimer=setTimeout(rebuild,120);
 }
 function allowedText(node){
  return !!node.nodeValue?.trim()&&!node.parentElement?.closest('a,button,script,style,noscript,textarea,mark,.article-inline-contents,.vr-source-citation');
 }
 function search(jump=true){
  unmark();
  const value=ui.input.value.trim(),t=labels();
  if(value.length<2){
   ui.count.textContent=value?t[5]:t[4];ui.prev.disabled=true;ui.next.disabled=true;return;
  }
  const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT),nodes=[];
  while(walker.nextNode())if(allowedText(walker.currentNode))nodes.push(walker.currentNode);
  for(const n of nodes){
   if(marks.length>=300)break;
   const locations=findMatches(n.nodeValue,value,300-marks.length);
   if(!locations.length)continue;
   const fragment=document.createDocumentFragment(),original=n.nodeValue;let start=0;
   for(const [a,b] of locations){
    fragment.append(document.createTextNode(original.slice(start,a)));
    const mark=document.createElement('mark');mark.className='vr-study-match';mark.textContent=original.slice(a,b);
    fragment.append(mark);marks.push(mark);start=b;
   }
   fragment.append(document.createTextNode(original.slice(start)));n.replaceWith(fragment);
  }
  current=marks.length?0:-1;ui.prev.disabled=!marks.length;ui.next.disabled=!marks.length;
  showCurrent();
  if(jump&&marks.length)goto(0);
 }
 function showCurrent(){
  for(const [i,mark] of marks.entries())mark.classList.toggle('vr-study-current',i===current);
  ui.count.textContent=marks.length?(current+1)+' / '+marks.length+' '+labels()[7]+(marks.length===300?' (max 300)':''):labels()[6];
 }
 function goto(n){
  if(!marks.length)return;
  current=(n+marks.length)%marks.length;
  expandAncestors(marks[current]);showCurrent();
  marks[current].scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 function updateScroll(){
  scrollQueued=false;
  if(article.hidden||!headings.length)return;
  let index=0;
  for(let i=0;i<headings.length;i++)if(headings[i].getClientRects().length&&headings[i].getBoundingClientRect().top<=190)index=i;
  for(let i=0;i<links.length;i++){
   links[i].classList.toggle('is-active',i===index);
   if(i===index)links[i].setAttribute('aria-current','location');else links[i].removeAttribute('aria-current');
  }
  const r=body.getBoundingClientRect();
  const fraction=Math.max(0,Math.min(1,(window.innerHeight*.4-r.top)/Math.max(1,r.height-window.innerHeight*.55)));
  const percent=Math.round(100*fraction);
  ui.progress.textContent=percent+'%';ui.fill.style.width=percent+'%';
 }
 function scheduleScroll(){if(scrollQueued)return;scrollQueued=true;requestAnimationFrame(updateScroll)}
 ui.input.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>search(false),160)});
 ui.input.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();goto(current<0?0:current+(e.shiftKey?-1:1))}
  if(e.key==='Escape'){ui.input.value='';unmark();ui.count.textContent=labels()[4]}
 });
 ui.prev.addEventListener('click',()=>goto(current-1));
 ui.next.addEventListener('click',()=>goto(current+1));
 ui.clear.addEventListener('click',()=>{ui.input.value='';unmark();ui.count.textContent=labels()[4];ui.prev.disabled=true;ui.next.disabled=true;ui.input.focus()});
 ui.sources.addEventListener('click',e=>{const s=document.getElementById('article-sources');if(s){e.preventDefault();s.scrollIntoView({block:'start',behavior:'smooth'})}});
 ui.prev.disabled=true;ui.next.disabled=true;
 window.addEventListener('scroll',scheduleScroll,{passive:true});
 window.addEventListener('resize',()=>{mount();scheduleScroll()},{passive:true});
 window.addEventListener('vitruvia:search',scheduleBuild);
 window.addEventListener('vitruvia:clear',()=>{unmark();panel.remove();headings=[];links=[];lastTitle=null});
 new MutationObserver(scheduleBuild).observe(body,{childList:true});
 new MutationObserver(scheduleBuild).observe(aside,{childList:true});
 new MutationObserver(scheduleBuild).observe(article,{attributes:true,attributeFilter:['hidden']});
 new MutationObserver(records=>{if(records.some(r=>r.attributeName==='lang')){translate();scheduleBuild()}}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 translate();scheduleBuild();
})();
