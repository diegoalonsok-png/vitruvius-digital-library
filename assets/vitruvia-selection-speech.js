/* Vitruvia · contextual text-to-speech.
 * The player is hidden until the visitor selects article text, never visible
 * before a selection. No remote API or query submission by this script.
 */
(()=>{
 'use strict';
 function splitText(value,limit=235){
  const source=String(value||'').replace(/\s+/g,' ').trim();
  if(!source)return [];
  const max=Math.max(80,Math.min(400,Math.round(limit)||235));
  const words=source.split(' '),out=[];
  let part='';
  for(const w of words){
   if(w.length>max){
    if(part){out.push(part);part=''}
    for(let i=0;i<w.length;i+=max)out.push(w.slice(i,i+max));
    continue;
   }
   if(part.length+w.length+1>max){out.push(part);part=w}
   else part=part?part+' '+w:w;
  }
  if(part)out.push(part);
  return out;
 }
 window.VitruviaSelectionSpeech={splitText,version:'2.0-site-wide'};
 function init(){
  const root=document.body;
  if(!root||document.getElementById('vr-selection-speech'))return;
  const supported=typeof window.SpeechSynthesisUtterance==='function'&&!!window.speechSynthesis;
  const speech=window.speechSynthesis;
  const ui=document.createElement('div');
  ui.id='vr-selection-speech';
  ui.className='vr-selection-speech';
  ui.hidden=true;
  ui.setAttribute('role','group');
  ui.setAttribute('aria-label','Reproducir texto seleccionado');
  const play=document.createElement('button');
  play.type='button';play.className='vr-selection-speech-play';
  play.textContent='▶';
  const pause=document.createElement('button');
  pause.type='button';pause.className='vr-selection-speech-pause';pause.textContent='Ⅱ';
  const stop=document.createElement('button');
  stop.type='button';stop.className='vr-selection-speech-stop';stop.textContent='■';
  const status=document.createElement('span');
  status.className='vr-selection-speech-status';
  status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  ui.append(play,pause,stop,status);
  document.body.append(ui);
  let selectedText='',selectedLang='es',active=false,paused=false,serial=0,chunks=[],next=0;
  let selectionTimer=0;
  const dict={
   es:{group:'Lectura del texto seleccionado',play:'Escuchar selección',pause:'Pausar lectura',resume:'Continuar lectura',stop:'Detener lectura',unsupported:'Voz no disponible',reading:'Leyendo',paused:'Pausado',ready:'Texto seleccionado',complete:'Lectura terminada',error:'Voz no disponible en este navegador'},
   en:{group:'Read selected text aloud',play:'Read selection aloud',pause:'Pause reading',resume:'Resume reading',stop:'Stop reading',unsupported:'Voice unavailable',reading:'Reading',paused:'Paused',ready:'Text selected',complete:'Reading complete',error:'Speech unavailable in this browser'},
   fr:{group:'Lecture du texte sélectionné',play:'Lire la sélection',pause:'Mettre en pause',resume:'Reprendre',stop:'Arrêter',unsupported:'Voix indisponible',reading:'Lecture',paused:'En pause',ready:'Texte sélectionné',complete:'Lecture terminée',error:'Synthèse vocale indisponible'}
  };
  const words=()=>dict[document.documentElement.lang?.slice(0,2)]||dict.es;
  function update(){
   const t=words();
   ui.setAttribute('aria-label',t.group);
   play.title=t.play;play.setAttribute('aria-label',t.play);
   pause.title=paused?t.resume:t.pause;
   pause.setAttribute('aria-label',paused?t.resume:t.pause);
   stop.title=t.stop;stop.setAttribute('aria-label',t.stop);
   pause.textContent=paused?'▶':'Ⅱ';
   play.hidden=active;
   pause.hidden=!active;
   stop.hidden=!active;
   status.textContent=active?(paused?t.paused:t.reading):supported?t.ready:t.unsupported;
   play.disabled=!supported;
  }
  function stopReading(){
   serial++;active=false;paused=false;chunks=[];next=0;
   try{speech?.cancel()}catch{}
   update();
  }
  function hide(){
   if(active)return;  // Keep pause/stop visible while the selected text plays.
   ui.hidden=true;
  }
  function validSelection(){
   const selection=window.getSelection?.();
   if(!selection||selection.isCollapsed||!selection.rangeCount)return null;
   const text=selection.toString().replace(/\s+/g,' ').trim();
   if(text.length<2||text.length>30000)return null;
   const range=selection.getRangeAt(0);
   const ancestor=range.commonAncestorContainer;
   const parent=ancestor.nodeType===1?ancestor:ancestor.parentElement;
   if(!parent||!root.contains(parent))return null;
   // Never offer to read editorial control labels or linked actions.
   if(parent.closest('button, input, select, textarea, [contenteditable], .article-toolbar, .vr-pm-dialog, .vr-selection-speech, .site-bar, nav, [role="toolbar"], [role="menu"], .research-folder-fab'))return null;
   const point=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentElement;
   let lang=point?.closest('[lang]')?.getAttribute('lang')||document.documentElement.lang||'es';
   // Detect the Latin column even on legacy readers whose heading is the only language cue.
   if(!point?.closest('[lang]')&&point?.closest('#latin-text, .latin-text, [data-language="latin"]'))lang='la';
   if(!point?.closest('[lang]')&&point?.closest('#translation-text')&&document.getElementById('lang'))lang=document.getElementById('lang').value||lang;
   const boxes=range.getClientRects();
   const rect=boxes.length?boxes[boxes.length-1]:range.getBoundingClientRect();
   if(!rect||(!rect.width&&!rect.height))return null;
   return {text,lang,rect};
  }
  function place(rect){
   const width=ui.offsetWidth||142;
   const left=Math.max(7,Math.min(window.innerWidth-width-7,rect.right-width/2));
   const above=rect.top-53;
   const top=above>10?above:Math.min(window.innerHeight-56,rect.bottom+9);
   ui.style.left=left+'px';ui.style.top=Math.max(8,top)+'px';
  }
  function checkSelection(){
   if(active)return;
   const data=validSelection();
   if(!data){selectedText='';hide();return}
   selectedText=data.text;selectedLang=data.lang;
   ui.hidden=false;update();place(data.rect);
  }
  function schedule(){
   clearTimeout(selectionTimer);
   selectionTimer=setTimeout(checkSelection,100);
  }
  function nextChunk(expected){
   if(expected!==serial||!active||paused)return;
   if(next>=chunks.length){
    active=false;paused=false;chunks=[];next=0;
    update();ui.hidden=true;return;
   }
   const utterance=new SpeechSynthesisUtterance(chunks[next++]);
   utterance.lang=selectedLang;
   utterance.rate=.94;
   utterance.pitch=1;
   const language=selectedLang.split('-')[0].toLowerCase();
   const voices=speech.getVoices?.()||[];
   const voice=voices.find(v=>v.lang.toLowerCase()===selectedLang.toLowerCase())
    ||voices.find(v=>v.lang.toLowerCase().split('-')[0]===language);
   if(voice)utterance.voice=voice;
   utterance.onend=()=>nextChunk(expected);
   utterance.onerror=event=>{
    if(expected!==serial||event.error==='canceled'||event.error==='interrupted')return;
    stopReading();status.textContent=words().error;
   };
   try{speech.speak(utterance)}
   catch{stopReading();status.textContent=words().error}
  }
  // Preserve the selection when the player is clicked with a mouse.
  ui.addEventListener('mousedown',event=>event.preventDefault());
  play.addEventListener('click',()=>{
   if(!selectedText||!supported)return;
   stopReading();
   chunks=splitText(selectedText);
   if(!chunks.length)return;
   active=true;paused=false;next=0;const expected=serial;
   update();nextChunk(expected);
  });
  pause.addEventListener('click',()=>{
   if(!active)return;
   try{
    if(paused){speech.resume();paused=false;nextChunkIfNeeded()}
    else{speech.pause();paused=true}
   }catch{}
   update();
  });
  function nextChunkIfNeeded(){
   // When paused during a live utterance, resume() continues it; no
   // second speak() is queued, avoiding skipped/repeated sentences.
  }
  stop.addEventListener('click',()=>{
   stopReading();
   ui.hidden=true;
  });
  document.addEventListener('selectionchange',schedule);
  document.addEventListener('mouseup',schedule);
  document.addEventListener('touchend',schedule,{passive:true});
  document.addEventListener('keyup',event=>{
   if(event.key.startsWith('Arrow')||event.key==='Shift')schedule();
  });
  document.addEventListener('pointerdown',event=>{
   if(ui.contains(event.target)||root.contains(event.target))return;
   if(!active){clearTimeout(selectionTimer);ui.hidden=true}
  },true);
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!ui.hidden){
    stopReading();ui.hidden=true;
   }
  });
  for(const name of ['vitruvia:search','vitruvia:clear']){
   window.addEventListener(name,()=>{
    clearTimeout(selectionTimer);stopReading();selectedText='';ui.hidden=true;
   });
  }
  window.addEventListener('pagehide',()=>stopReading());
  window.addEventListener('resize',()=>{if(!ui.hidden&&!active)schedule()},{passive:true});
  new MutationObserver(records=>{
   if(records.some(r=>r.attributeName==='lang'))update();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
