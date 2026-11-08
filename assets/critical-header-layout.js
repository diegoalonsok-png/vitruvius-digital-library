/* Local to aparato-critico.html: keep the global typography control in the header. */
(()=>{
 'use strict';
 const place=()=>{
  const head=document.querySelector('body.critical-lexicon-theme .site-header .header-inner');
  const tool=document.getElementById('site-typeface-toggle')?.closest('.site-typeface-tool');
  if(!head||!tool)return false;
  if(tool.parentElement!==head)head.appendChild(tool);
  const selects=[...head.querySelectorAll('select')].filter(x=>x.id!=='site-typeface-select');
  const seen=new Set();
  for(const s of selects){const signature=(s.getAttribute('aria-label')||s.name||'').toLowerCase();
   if(/idioma|language|langue|language-select/.test(signature)){if(seen.has('language'))s.style.display='none';else seen.add('language')}
  }
  return true;
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',place,{once:true});else place();
 const watcher=new MutationObserver(()=>{if(place())watcher.disconnect()});
 const start=()=>{watcher.observe(document.body,{childList:true,subtree:true});place();setTimeout(()=>watcher.disconnect(),2500)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();