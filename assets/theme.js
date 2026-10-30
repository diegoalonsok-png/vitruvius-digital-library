(()=>{
 const key='vitruvius-color-theme';
 let choice='light';
 try{choice=localStorage.getItem(key)==='dark'?'dark':'light'}catch{}
 document.documentElement.dataset.theme=choice;
 function mount(){
  const existing=document.querySelector('.theme-switch');
  const target=document.querySelector('.header-inner');
  if(!target)return;
  const button=existing||document.createElement('button');button.type='button';button.className='theme-switch';
  const label=()=>{const dark=document.documentElement.dataset.theme==='dark';button.textContent=dark?'☀ Claro':'☾ Oscuro';button.setAttribute('aria-label',dark?'Activar fondo claro':'Activar fondo oscuro');button.setAttribute('aria-pressed',String(dark));};
  button.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';try{localStorage.setItem(key,dark?'dark':'light')}catch{};label();});
  if(!existing)target.append(button);label();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();