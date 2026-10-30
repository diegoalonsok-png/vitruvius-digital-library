(()=>{
 const key='vitruvius-color-theme';let choice='light';
 try{choice=localStorage.getItem(key)==='dark'?'dark':'light';}catch{}
 document.documentElement.dataset.theme=choice;
 function mount(){
  const target=document.querySelector('.header-inner');if(!target)return;
  const buttons=[...target.querySelectorAll('.theme-switch')];
  if(!buttons.length){const b=document.createElement('button');b.type='button';b.className='theme-switch';target.append(b);buttons.push(b);}
  const paint=()=>{const dark=document.documentElement.dataset.theme==='dark';for(const b of buttons){b.textContent=dark?'☀ Claro':'☾ Oscuro';b.setAttribute('aria-label',dark?'Activar fondo claro':'Activar fondo oscuro');b.setAttribute('aria-pressed',String(dark));}};
  for(const b of buttons){b.type='button';b.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem(key,next);}catch{}paint();});}paint();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
