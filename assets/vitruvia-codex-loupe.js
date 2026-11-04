/* Vitruvia · local magnifier for IIIF codices and the Harley MS 2767 folio reader.
   Uses the displayed manuscript source as a CSS background: no canvas/CORS,
   no image modifications, no network calls or manuscript text substitutions. */
(()=>{
 'use strict';
 const configs=[
  {image:'folio',viewport:'viewport',next:'reset'},
  {image:'image',viewport:'stage',next:'fit'}
 ];
 const config=configs.find(c=>document.getElementById(c.image)&&document.getElementById(c.viewport));
 if(!config)return;
 const img=document.getElementById(config.image);
 const stage=document.getElementById(config.viewport);
 const control=document.getElementById(config.next);
 const toolbar=control?.parentElement;
 if(!toolbar||document.getElementById('codex-local-loupe'))return;
 const button=document.createElement('button');
 button.id='codex-local-loupe';
 button.type='button';
 button.className='codex-local-loupe-button';
 button.setAttribute('aria-pressed','false');
 button.setAttribute('aria-controls','codex-local-loupe-lens');
 button.textContent='⌕ Lupa';
 control.after(button);
 const lens=document.createElement('div');
 lens.id='codex-local-loupe-lens';
 lens.className='codex-local-loupe-lens';
 lens.hidden=true;
 lens.setAttribute('role','img');
 lens.setAttribute('aria-label','Detalle ampliado de la fotografía del folio');
 const imageSurface=document.createElement('div');
 imageSurface.id='codex-local-loupe-image';
 imageSurface.className='codex-local-loupe-image';
 const strength=document.createElement('span');
 strength.className='codex-local-loupe-scale';
 strength.textContent='2,5×';
 lens.append(imageSurface,strength);
 document.body.append(lens);
 let enabled=false,touchPinned=false;
 const factor=2.5;
 const clamp=(x,min,max)=>Math.min(Math.max(x,min),Math.max(min,max));
 const isReady=()=>!!(img.complete&&img.naturalWidth>0&&!img.hidden&&!img.classList.contains('hidden'));
 function hide(){lens.hidden=true;touchPinned=false}
 function labels(){
  const lang=document.documentElement.lang?.slice(0,2);
  if(lang==='en')return {off:'Magnifier · inspect manuscript details',on:'Magnifier active · point at the folio',name:'Magnifier'};
  if(lang==='fr')return {off:'Loupe · examiner les détails du manuscrit',on:'Loupe active · viser le folio',name:'Loupe'};
  return {off:'Lupa · ampliar un detalle del folio',on:'Lupa activa · señalá una zona del folio',name:'Lupa'};
 }
 function translate(){
  const t=labels();button.textContent='⌕ '+t.name;
  button.title=enabled?t.on:t.off;
  button.setAttribute('aria-label',enabled?t.on:t.off);
 }
 function toggle(active){
  enabled=Boolean(active);
  button.setAttribute('aria-pressed',String(enabled));
  stage.classList.toggle('codex-local-loupe-enabled',enabled);
  if(!enabled)hide();
  translate();
 }
 function showAt(clientX,clientY,pin=false){
  if(!enabled||!isReady())return;
  const rect=img.getBoundingClientRect();
  if(rect.width<10||rect.height<10)return;
  const within=clientX>=rect.left&&clientX<=rect.right&&clientY>=rect.top&&clientY<=rect.bottom;
  if(!within)return;
  const diameter=window.innerWidth<650?190:245;
  // Pointer anchored to image geometry rather than scroll offsets, so that
  // this works after panning the folio inside the original scrollable viewer.
  const fx=clientX-rect.left,fy=clientY-rect.top;
  imageSurface.style.backgroundImage='url('+JSON.stringify(img.currentSrc||img.src)+')';
  imageSurface.style.filter=img.style.filter||'none';
  imageSurface.style.backgroundSize=(rect.width*factor)+'px '+(rect.height*factor)+'px';
  imageSurface.style.backgroundPosition=(diameter/2-fx*factor)+'px '+(diameter/2-fy*factor)+'px';
  lens.style.width=diameter+'px';lens.style.height=diameter+'px';
  let x=clientX+30,y=clientY-diameter/2;
  if(x+diameter+12>window.innerWidth)x=clientX-diameter-30;
  x=clamp(x,8,window.innerWidth-diameter-8);
  y=clamp(y,8,window.innerHeight-diameter-8);
  lens.style.left=x+'px';lens.style.top=y+'px';
  lens.hidden=false;
  touchPinned=pin;
 }
 button.addEventListener('click',()=>toggle(!enabled));
 img.addEventListener('pointermove',event=>{
  if(!enabled||event.pointerType==='touch'||touchPinned)return;
  showAt(event.clientX,event.clientY);
 });
 img.addEventListener('pointerdown',event=>{
  if(!enabled)return;
  if(event.pointerType==='touch'){
   // Let native scrolling continue. One tap places the lens; it never opens a
   // modal or changes the current folio.
   showAt(event.clientX,event.clientY,true);
  }
 });
 img.addEventListener('pointerleave',event=>{
  if(!touchPinned&&event.pointerType!=='touch')hide();
 });
 img.addEventListener('click',event=>{
  if(!enabled)return;
  // Codex H already uses image clicks to zoom the entire folio; when the
  // lens is active this click must mean "inspect" instead.
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  showAt(event.clientX,event.clientY,event.detail===0||event.pointerType==='touch');
 },true);
 img.tabIndex=0;
 img.addEventListener('keydown',event=>{
  if(!enabled||!['Enter',' '].includes(event.key))return;
  event.preventDefault();
  const rect=img.getBoundingClientRect();
  showAt(clamp(rect.left+rect.width/2,rect.left+1,rect.right-1),
         clamp(rect.top+Math.min(rect.height/2,window.innerHeight/2),rect.top+1,rect.bottom-1),true);
 });
 // Folio switches and full-image zoom invalidate the previous point of
 // inspection. Leave the loupe mode on for the next folio.
 img.addEventListener('load',hide);
 stage.addEventListener('scroll',hide,{passive:true});
 window.addEventListener('resize',hide,{passive:true});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&enabled){toggle(false);button.focus()}
 });
 new MutationObserver(records=>{
  if(records.some(record=>record.attributeName==='lang'))translate();
 }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 translate();
 window.VitruviaCodexLoupe={version:'1.0',toggle,hide};
})();
