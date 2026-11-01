(()=>{
 const base=(document.currentScript?.src||new URL('assets/theme.js',location.href).href).replace(/theme\.js(?:\?.*)?$/,'');
 if(!document.querySelector('link[href*="assets/theme.css"]')){const css=document.createElement('link');css.rel='stylesheet';css.href=base+'theme.css?v=20261101';document.head.append(css)}
 if(!document.querySelector('script[data-pdf-assist]')){const pdf=document.createElement('script');pdf.src=base+'pdf-assist.js?v=20261101';pdf.defer=true;pdf.dataset.pdfAssist='1';document.head.append(pdf)}
 const key='vitruvius-color-theme';let choice='light';
 try{choice=localStorage.getItem(key)==='dark'?'dark':'light';}catch{}
 document.documentElement.dataset.theme=choice;
 function mount(){
  const target=document.querySelector('.research-nav-inner')||document.querySelector('.header-inner')||document.querySelector('main')||document.body;if(!target)return;
  const buttons=[...target.querySelectorAll('.theme-switch')];
  if(!buttons.length){const b=document.createElement('button');b.type='button';b.className='theme-switch';target.append(b);if(!target.closest('header')){b.classList.add('theme-floating');b.style.cssText='position:fixed;right:18px;top:14px;z-index:9999;background:#263f54;color:#fff;border:1px solid #aeb7b4;padding:10px 14px;border-radius:5px;cursor:pointer'}buttons.push(b);}
  const paint=()=>{const dark=document.documentElement.dataset.theme==='dark';for(const b of buttons){b.textContent=dark?'☀ Claro':'☾ Oscuro';b.setAttribute('aria-label',dark?'Activar fondo claro':'Activar fondo oscuro');b.setAttribute('aria-pressed',String(dark));}};
  for(const b of buttons){b.type='button';b.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem(key,next);}catch{}paint();});}paint();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
