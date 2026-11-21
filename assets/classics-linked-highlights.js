/* Selection and saved source marks share lexical highlights with the facing
 * translation. Local dictionaries first; a machine lookup is made only after
 * automatic translation has been activated or the reader requests it here. */
(()=>{'use strict';
const source=document.getElementById('passages'),target=document.querySelector('.cl-translation-output');
if(!source||!target)return;
const work=new URLSearchParams(location.search).get('work')||'';
const core=import('./classics-linked-highlight-core.mjs?v=20261121-linked-words-v1');
const concepts=fetch('data/lexicon/conceptus.json').then(r=>r.ok?r.json():null).then(j=>j?.concepts||[]).catch(()=>[]);
const support=!!(window.CSS?.highlights&&window.Highlight);
const feedback=document.createElement('p');feedback.className='cl-linked-highlight-note';feedback.hidden=true;
feedback.style.cssText='font:12px/1.5 system-ui,sans-serif;margin:6px 0';
feedback.title='Equivalencia léxica orientativa; no constituye alineación filológica palabra por palabra.';
target.insertAdjacentElement('afterend',feedback);
const css=document.createElement('style');css.textContent='::highlight(vdl-linked-equivalent){background:#ffe56b;color:#171717;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}';document.head.append(css);
let sequence=0,timer=0,last=null;
const original=()=>source.querySelector('p > span:not(.locus)');
function clear(){if(support)CSS.highlights.delete('vdl-linked-equivalent');delete target.dataset.linkedEquivalent;feedback.hidden=true;}
function range(a,b){
 const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);let n,at=0,start=null,end=null;
 while((n=walker.nextNode())){const next=at+n.textContent.length;
  if(!start&&a>=at&&a<next)start=[n,a-at];if(b>at&&b<=next){end=[n,b-at];break}at=next;
 }
 if(!start||!end)return null;const r=document.createRange();r.setStart(...start);r.setEnd(...end);return r;
}
function selection(){
 const host=original(),s=window.getSelection();if(!host||!s||s.isCollapsed||!s.rangeCount)return null;
 const r=s.getRangeAt(0);if(!host.contains(r.startContainer)||!host.contains(r.endContainer))return null;
 const word=s.toString().trim();if(!/^[\p{L}\p{M}]+(?:[\s’'\-]+[\p{L}\p{M}]+){0,3}$/u.test(word)||word.length>100)return null;
 const before=document.createRange();before.selectNodeContents(host);before.setEnd(r.startContainer,r.startOffset);
 return {word,a:before.toString().length,b:before.toString().length+r.toString().length,sourceText:host.textContent,locus:new URLSearchParams(location.search).get('locus')||''};
}
function valid(chosen){return chosen&&original()?.textContent===chosen.sourceText&&(new URLSearchParams(location.search).get('locus')||'')===chosen.locus;}
async function sync(chosen,requested=false){
 if(!valid(chosen))return;const stamp=++sequence;clear();
 const language=target.lang||'es',sourceLanguage=source.lang||'grc';
 if(!target.querySelector(':scope > p:not(.cl-caution)')||target.hasAttribute('aria-busy'))return;
 const body=target.textContent,translationNodes=[...target.querySelectorAll(':scope > p:not(.cl-caution)')];
 let entries=[];
 try{const result=await window.ClassicalLexicon?.lookup(chosen.word,{lang:sourceLanguage,work,online:false});if(!['stem','related-attested'].includes(result?.via))entries=result?.entries||[]}catch{}
 const api=await core,terms=await concepts;
 let candidates=api.equivalentCandidates({word:chosen.word,lemmas:entries.map(e=>e.lemma),entries,concepts:terms,sourceLanguage,targetLanguage:language});
 const find=values=>api.equivalentSpans(body,values).filter(s=>{const r=range(s.a,s.b);return r&&translationNodes.some(p=>p.contains(r.startContainer)&&p.contains(r.endContainer));});
 let spans=find(candidates);
 if(!spans.length&&(requested||target.dataset.automaticEnabled==='true')){
  try{const result=await window.VitruviaInlineTranslation?.translate(chosen.word,sourceLanguage,language);if(result?.text)spans=find([result.text]);}catch{}
 }
 if(stamp!==sequence||!valid(chosen)||target.lang!==language||target.textContent!==body)return;
 feedback.replaceChildren();feedback.hidden=false;
 if(!spans.length){
  feedback.textContent='No se identificó un equivalente para «'+chosen.word+'» en esta traducción. ';
  if(!requested&&target.dataset.automaticEnabled!=='true'){
   const button=document.createElement('button');button.type='button';button.textContent='Buscar equivalente automáticamente';
   button.addEventListener('click',()=>void sync(chosen,true));feedback.append(button);
  }
  return;
 }
 const labels=[...new Set(spans.map(s=>s.text))];target.dataset.linkedEquivalent=labels.join(' · ');
 if(support)CSS.highlights.set('vdl-linked-equivalent',new Highlight(...spans.map(s=>range(s.a,s.b)).filter(Boolean)));
 feedback.textContent='Equivalencia léxica: '+labels.join(' · ')+'.';
 if(chosen.saved)window.ClassicsTranslationAnnotations?.markLinked(spans,{mode:chosen.mode,color:chosen.color,source:{a:chosen.a,b:chosen.b}});
}
document.addEventListener('selectionchange',()=>{
 clearTimeout(timer);const chosen=selection();
 if(!chosen)return;last=chosen;timer=setTimeout(()=>void sync(chosen),180);
});
document.addEventListener('vitruvia:source-annotation',event=>{
 const info=event.detail;if(!info)return;
 if(info.action==='clear'||info.action==='erase'){window.ClassicsTranslationAnnotations?.removeLinked(info.action==='clear'?null:info);sequence++;last=null;clear();return;}
 const host=original();if(!host)return;
 last={...info,word:host.textContent.slice(info.a,info.b).trim(),sourceText:host.textContent,locus:new URLSearchParams(location.search).get('locus')||'',saved:true};
 void sync(last);
});
document.addEventListener('vitruvia:classics-passage',()=>{sequence++;last=null;clear();});
let update=0;
new MutationObserver(()=>{clearTimeout(update);update=setTimeout(()=>{if(valid(last))void sync(last);else{sequence++;last=null;clear();}},120);}).observe(target,{childList:true,subtree:true,characterData:true});
})();
