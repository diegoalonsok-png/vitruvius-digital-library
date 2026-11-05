(()=>{
 const base=(document.currentScript?.src||new URL('assets/theme.js',location.href).href).replace(/theme\.js(?:\?.*)?$/,'');
 if(!document.querySelector('link[href*="assets/theme.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href=base+'theme.css?v=20261103-loci-contrast-01';document.head.append(css)}
 const viewerNames=new Set(['harleianus.html','sulpizio-1486.html','giocondo-1511.html','cesariano-1521.html','barbaro-1567.html','laboratorio-h.html']);
 if(viewerNames.has(location.pathname.split('/').pop())&&!document.querySelector('script[data-viewer-actions]')){
  const share=document.createElement('script');share.src=base+'viewer-actions.js?v=20261103-live-image';share.defer=true;share.dataset.viewerActions='1';document.head.append(share);
 }
 if(!document.querySelector('script[data-pdf-assist]')){const pdf=document.createElement('script');pdf.src=base+'pdf-assist.js?v=20261102-visible';pdf.defer=true;pdf.dataset.pdfAssist='1';document.head.append(pdf)}
 if(location.pathname.split('/').pop()!=='metodologia-filologica.html'&&!document.querySelector('script[data-global-language]')){const lang=document.createElement('script');lang.src=base+'global-language.js?v=20261103-3lang3';lang.defer=true;lang.dataset.globalLanguage='1';document.head.append(lang)}
 const key='vitruvius-color-theme';
 const frontKey='vitruvius-front-color-mode';
 /* La portada tiene negro por defecto; el tema del resto del sitio queda independiente. */
 const isFront=!!document.querySelector('.hero-academic .hero-latin-title');
 let choice=isFront?'dark':'light';
 try{const saved=localStorage.getItem(isFront?frontKey:key);if(saved==='dark'||saved==='light')choice=saved;}catch{}
 document.documentElement.dataset.theme=choice;
 function mount(){
  const target=document.querySelector('.research-nav-controls')||document.querySelector('.research-nav-inner')||document.querySelector('.header-inner')||document.querySelector('main')||document.body;if(!target)return;
  const buttons=[...target.querySelectorAll('.theme-switch')];
  if(!buttons.length){const b=document.createElement('button');b.type='button';b.className='theme-switch';target.append(b);if(!target.closest('header')){b.classList.add('theme-floating');b.style.cssText='position:fixed;right:18px;top:14px;z-index:9999;cursor:pointer'}buttons.push(b);}
  const paint=()=>{const dark=document.documentElement.dataset.theme==='dark';for(const b of buttons){
   b.replaceChildren();
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','19');svg.setAttribute('height','19');
   svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.65');
   svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');
   path.setAttribute('d',dark?'M12 3a9 9 0 1 0 9 9A7 7 0 0 1 12 3Z':'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8L17 7m-10 10-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z');
   svg.append(path);b.append(svg);
   b.setAttribute('aria-label',dark?'Activar fondo claro':'Activar fondo oscuro');
   b.setAttribute('title',dark?'Activar modo claro':'Activar modo oscuro');
   b.setAttribute('aria-pressed',String(dark));
 }};
  for(const b of buttons){b.type='button';b.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem(isFront?frontKey:key,next);}catch{}paint();});}paint();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
 /* Shared usability enhancements: keyboard navigation, semantics and reading comfort. */
 function enhance(){
  const main=document.querySelector('main');
  if(main){
   if(!main.id)main.id='main-content';
   if(!document.querySelector('.library-skip-link')){
    const skip=document.createElement('a');skip.className='library-skip-link';
    skip.href='#'+main.id;skip.textContent='Ir al contenido principal';
    document.body.insertBefore(skip,document.body.firstChild);
   }
   if(!main.hasAttribute('tabindex'))main.setAttribute('tabindex','-1');
  }
  document.querySelectorAll('a[target="_blank"]').forEach(a=>{
   const rel=new Set((a.getAttribute('rel')||'').split(/\s+/).filter(Boolean));
   rel.add('noopener');rel.add('noreferrer');a.setAttribute('rel',[...rel].join(' '));
  });
  document.querySelectorAll('img:not([alt])').forEach(img=>{
   if(img.getAttribute('role')==='presentation'||img.getAttribute('aria-hidden')==='true')img.alt='';
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();

})();
