/* Accessible feedback for Vitruvia actions; never blocks the search pipeline. */
(()=>{'use strict';
document.addEventListener('click',e=>{
 const b=e.target.closest?.('.academic-pill,.suggestions button');
 if(!b)return;
 b.classList.add('is-clicked');
 setTimeout(()=>b.classList.remove('is-clicked'),900);
},true);
const start=()=>{
 const form=document.getElementById('search-form');
 const button=document.getElementById('submit');
 const query=document.getElementById('query');
 if(!form||!button||!query)return;
 const style=document.createElement('style');
 style.id='vr-submit-feedback-style';
 style.textContent=`
 #search-form #submit{position:relative;transform:translateY(0) scale(1);transition:transform .13s ease,box-shadow .13s ease,background-color .18s ease!important;will-change:transform}
 #search-form #submit:hover{box-shadow:0 3px 12px #0005}
 #search-form #submit:active,#search-form #submit.vr-press{transform:translateY(2px) scale(.967)!important;box-shadow:inset 0 2px 6px #0007!important}
 #search-form #submit.vr-busy{background:#355948!important;color:#fff!important;box-shadow:inset 0 0 0 1px #91b8a5}
 #search-form #submit.vr-busy::before{content:"";display:inline-block;width:11px;height:11px;margin-right:8px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;vertical-align:-2px;animation:vr-submit-spin .7s linear infinite}
 @keyframes vr-submit-spin{to{transform:rotate(360deg)}}
 @media(prefers-reduced-motion:reduce){#search-form #submit{transition:none!important}#search-form #submit.vr-busy::before{animation:none;border-right-color:currentColor}}
 `;
 document.head.append(style);
 let cycle=0,clock=null;
 const idle=()=>{
  cycle++;if(clock)clearTimeout(clock);
  button.classList.remove('vr-busy','vr-press');
  button.removeAttribute('aria-busy');button.textContent=button.dataset.vrIdleLabel||'Buscar ↗';
 };
 const busy=()=>{
  if(!query.value.trim())return;
  cycle++;const id=cycle;
  button.dataset.vrIdleLabel ||= button.textContent;
  button.classList.add('vr-press','vr-busy');
  button.setAttribute('aria-busy','true');
  button.textContent='Buscando…';
  // Never disable or stop event propagation: search remains usable.
  requestAnimationFrame(()=>requestAnimationFrame(()=>button.classList.remove('vr-press')));
  if(clock)clearTimeout(clock);
  clock=setTimeout(()=>{if(id===cycle)idle()},9000);
 };
 form.addEventListener('submit',busy);
 button.addEventListener('pointerdown',()=>button.classList.add('vr-press'));
 for(const name of ['pointerup','pointercancel','pointerleave'])button.addEventListener(name,()=>button.classList.remove('vr-press'));
 window.addEventListener('vitruvia:results',idle);
 window.addEventListener('vitruvia:clear',idle);
 query.addEventListener('input',()=>{if(button.classList.contains('vr-busy'))idle()});
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
