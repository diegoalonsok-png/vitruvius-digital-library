/* Vitruvia · optional paragraph magnifier. Non-destructive and source-preserving.
   Works with encyclopedia articles, classical catalogue records, and original texts.
   No translation, rewriting, network requests, or injected source HTML. */
(()=>{
 'use strict';
 const MAX_LENGTH=1600;
 function excerpt(text,offset=0){
  const source=String(text??'').replace(/\r\n?/g,'\n').trim();
  if(source.length<=4800)return {text:source,partial:false};
  // Single long paragraphs (notably an entire book of Lucretius) are broken
  // into nearby verse lines without changing or reflowing the source document.
  const at=Math.max(0,Math.min(source.length,Number(offset)||0));
  const start=Math.max(0,at-650),stop=Math.min(source.length,at+950);
  let first=start,last=stop;
  const firstNewline=source.lastIndexOf('\n',start);
  if(firstNewline>=0&&start-firstNewline<240)first=firstNewline+1;
  const lastNewline=source.indexOf('\n',stop);
  if(lastNewline>=0&&lastNewline-stop<240)last=lastNewline;
  return {text:(first>0?'…\n':'')+source.slice(first,last).trim()+(last<source.length?'\n…':''),partial:true};
 }
 function isCandidate(el){
  const value=el?.textContent?.trim()||'';
  return value.length>=24&&!el.closest('header,footer,nav,form,.provenance,.article-toolbar,.vr-pm-dialog,.vr-pm-backdrop');
 }
 window.VitruviaParagraphMagnifier={excerpt,isCandidate,version:'1.0'};
 const init=()=>{
  const article=document.getElementById('article-body');
  const classics=document.getElementById('classic-detail');
  const corpus=!article&&!classics&&location.pathname.includes('/corpus/');
  const scope=article||classics||(corpus?document.body:null);
  if(!scope||document.getElementById('vr-pm-trigger'))return;
  const inRail=!!document.querySelector('#vitruvia-reading-float .vrf-rail');
  const trigger=document.createElement('button');
  trigger.type='button';
  trigger.id='vr-pm-trigger';
  trigger.className=inRail?'vrf-key vr-pm-trigger':'vr-pm-trigger vr-pm-floating-trigger';
  trigger.setAttribute('aria-pressed','false');
  trigger.setAttribute('aria-keyshortcuts','Escape');
  trigger.textContent='⌕';
  if(inRail){
   const rail=document.querySelector('#vitruvia-reading-float .vrf-rail');
   const after=rail.querySelector('#vrf-increase');
   after?.after(trigger);
   if(!after)rail.append(trigger);
  }else document.body.append(trigger);
  const box=document.createElement('div');
  box.id='vr-pm-backdrop';box.className='vr-pm-backdrop';box.hidden=true;
  box.innerHTML=[
   '<div class="vr-pm-dialog" role="dialog" aria-modal="true" aria-labelledby="vr-pm-title" tabindex="-1">',
   '<div class="vr-pm-header"><div><span class="vr-pm-eyebrow" id="vr-pm-eyebrow"></span><h2 id="vr-pm-title"></h2></div>',
   '<button type="button" id="vr-pm-close" class="vr-pm-control vr-pm-close" aria-label="Cerrar">×</button></div>',
   '<div class="vr-pm-zoom-controls"><button type="button" id="vr-pm-minus" class="vr-pm-control" aria-label="Reducir">A−</button>',
   '<input id="vr-pm-size" type="range" min="18" max="40" step="2" value="26" aria-label="Tamaño de letra ampliada">',
   '<output id="vr-pm-size-label" for="vr-pm-size">26 px</output>',
   '<button type="button" id="vr-pm-plus" class="vr-pm-control" aria-label="Ampliar">A+</button></div>',
   '<div class="vr-pm-text-scroll"><div id="vr-pm-text" class="vr-pm-text" dir="auto"></div></div>',
   '<p id="vr-pm-excerpt-note" class="vr-pm-excerpt-note" hidden></p>',
   '</div>'
  ].join('');
  document.body.append(box);
  const get=id=>box.querySelector('#'+id);
  const ui={title:get('vr-pm-title'),eyebrow:get('vr-pm-eyebrow'),close:get('vr-pm-close'),minus:get('vr-pm-minus'),plus:get('vr-pm-plus'),size:get('vr-pm-size'),sizeLabel:get('vr-pm-size-label'),text:get('vr-pm-text'),note:get('vr-pm-excerpt-note')};
  const labels={
   es:{toggle:'Lupa: ampliar un párrafo',active:'Lupa activa: toca un párrafo',title:'Lectura ampliada',passage:'PÁRRAFO ORIGINAL · SIN MODIFICACIONES',portion:'Se muestra un fragmento cercano al punto elegido. El texto completo permanece en el lector.',close:'Cerrar',smaller:'Reducir ampliación',larger:'Aumentar ampliación',size:'Tamaño de letra ampliada'},
   en:{toggle:'Magnifier: enlarge a paragraph',active:'Magnifier on: select a paragraph',title:'Enlarged reading',passage:'ORIGINAL TEXT · UNALTERED',portion:'A nearby extract is shown; the complete text remains unchanged in the reader.',close:'Close',smaller:'Smaller text',larger:'Larger text',size:'Enlarged text size'},
   fr:{toggle:'Loupe : agrandir un paragraphe',active:'Loupe active : choisir un paragraphe',title:'Lecture agrandie',passage:'TEXTE ORIGINAL · INCHANGÉ',portion:'Un extrait proche du point choisi est affiché ; le texte complet reste dans le lecteur.',close:'Fermer',smaller:'Réduire',larger:'Agrandir',size:'Taille agrandie'},
   it:{toggle:'Lente: ingrandire un paragrafo',active:'Lente attiva: scegli un paragrafo',title:'Lettura ingrandita',passage:'TESTO ORIGINALE · INALTERATO',portion:'Viene mostrato un estratto vicino al punto scelto; il testo completo resta nel lettore.',close:'Chiudi',smaller:'Riduci',larger:'Ingrandisci',size:'Dimensione del testo'},
   de:{toggle:'Lupe: Absatz vergrößern',active:'Lupe aktiv: Absatz wählen',title:'Vergrößerte Lektüre',passage:'ORIGINALTEXT · UNVERÄNDERT',portion:'Ein Ausschnitt um die gewählte Stelle wird gezeigt; der vollständige Text bleibt erhalten.',close:'Schließen',smaller:'Verkleinern',larger:'Vergrößern',size:'Schriftgröße'},
   pt:{toggle:'Lupa: ampliar um parágrafo',active:'Lupa ativa: selecione um parágrafo',title:'Leitura ampliada',passage:'TEXTO ORIGINAL · INALTERADO',portion:'É mostrado um trecho próximo do ponto escolhido; o texto completo permanece no leitor.',close:'Fechar',smaller:'Reduzir',larger:'Ampliar',size:'Tamanho do texto'}
  };
  const t=()=>labels[document.documentElement.lang?.slice(0,2)]||labels.es;
  let enabled=false,priorFocus=null,oldOverflow=null;
  function translate(){
   const L=t();
   trigger.title=enabled?L.active:L.toggle;trigger.setAttribute('aria-label',trigger.title);
   ui.title.textContent=L.title;ui.eyebrow.textContent=L.passage;
   ui.note.textContent=L.portion;ui.close.setAttribute('aria-label',L.close);
   ui.minus.setAttribute('aria-label',L.smaller);
   ui.plus.setAttribute('aria-label',L.larger);
   ui.size.setAttribute('aria-label',L.size);
  }
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  function setSize(n){
   const size=clamp(Number(n)||26,18,40);
   ui.size.value=String(size);
   ui.sizeLabel.textContent=size+' px';
   ui.text.style.fontSize=size+'px';
  }
  function toggleMode(force){
   enabled=typeof force==='boolean'?force:!enabled;
   trigger.setAttribute('aria-pressed',String(enabled));
   document.body.classList.toggle('vr-pm-active',enabled);
   translate();
   if(!enabled)closeDialog();
  }
  function detectOffset(element,event){
   try{
    const position=typeof document.caretPositionFromPoint==='function'?
     document.caretPositionFromPoint(event.clientX,event.clientY):null;
    const caret=position||typeof document.caretRangeFromPoint==='function'?
     (position||document.caretRangeFromPoint(event.clientX,event.clientY)):null;
    const node=caret?.offsetNode||caret?.startContainer;
    const offset=caret?.offset??caret?.startOffset??0;
    if(node&&element.contains(node)){
     const range=document.createRange();
     range.selectNodeContents(element);range.setEnd(node,offset);
     return range.toString().length;
    }
   }catch{}
   return 0;
  }
  function openDialog(element,event){
   const raw=element.textContent||'';
   const portion=excerpt(raw,detectOffset(element,event));
   if(!portion.text)return;
   priorFocus=document.activeElement;
   ui.text.textContent=portion.text;
   ui.text.lang=element.closest('[lang]')?.lang||document.documentElement.lang||'es';
   ui.note.hidden=!portion.partial;
   setSize(26);
   oldOverflow=document.body.style.overflow;
   document.body.style.overflow='hidden';
   box.hidden=false;
   ui.close.focus();
  }
  function closeDialog(){
   if(box.hidden)return;
   box.hidden=true;
   document.body.style.overflow=oldOverflow??'';
   priorFocus?.focus?.({preventScroll:true});
  }
  trigger.addEventListener('click',()=>toggleMode());
  ui.close.addEventListener('click',closeDialog);
  ui.minus.addEventListener('click',()=>setSize(Number(ui.size.value)-2));
  ui.plus.addEventListener('click',()=>setSize(Number(ui.size.value)+2));
  ui.size.addEventListener('input',()=>setSize(ui.size.value));
  box.addEventListener('pointerdown',event=>{if(event.target===box)closeDialog()});
  document.addEventListener('keydown',event=>{
   if(!box.hidden){
    if(event.key==='Escape'){event.preventDefault();closeDialog();return}
    if(event.key==='Tab'){
     const items=[ui.close,ui.minus,ui.size,ui.plus],index=items.indexOf(document.activeElement);
     if(index===-1){event.preventDefault();items[0].focus();return}
     if(event.shiftKey&&index===0){event.preventDefault();items.at(-1).focus()}
     else if(!event.shiftKey&&index===items.length-1){event.preventDefault();items[0].focus()}
    }
   }else if(enabled&&event.key==='Escape'){toggleMode(false);trigger.focus()}
  });
  const selector=article?'p,blockquote p,li':classics?'p,li,blockquote p':'p,pre,blockquote p';
  scope.addEventListener('click',event=>{
   if(!enabled||!box.hidden||!(event.target instanceof Element))return;
   if(event.target.closest('a,button,input,select,textarea,label,summary,[role="button"]'))return;
   const el=event.target.closest(selector);
   if(!el||!scope.contains(el)||!isCandidate(el))return;
   event.preventDefault();openDialog(el,event);
  });
  window.addEventListener('vitruvia:clear',()=>{closeDialog();toggleMode(false)});
  new MutationObserver(records=>{
   if(records.some(x=>x.attributeName==='lang'))translate();
  }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  translate();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
