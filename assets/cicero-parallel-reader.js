/* Cicerón, De officiis: comparación lateral sin declarar alineación por párrafo. */
(()=>{'use strict';
 const main=document.querySelector('main'),search=document.getElementById('local-find');
 if(!main||!search)return;
 const latin=document.documentElement.lang==='la';
 const peer=latin?'cicero-de-officiis-en.html':'cicero-de-officiis-la.html';
 const heading=document.createElement('div');heading.className='cicero-parallel-tools';heading.setAttribute('role','group');heading.setAttribute('aria-label','Lectura bilingüe');
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent=latin?'Latín + inglés':'English + Latine';toggle.setAttribute('aria-pressed','false');
 const other=document.createElement('a');other.href=peer;other.textContent=latin?'Abrir traducción inglesa ↗':'Abrir original latino ↗';other.target='_blank';other.rel='noopener noreferrer';
 const note=document.createElement('small');note.textContent='Edición de Walter Miller (1913). Ambas versiones se leen en paralelo, sin afirmar una alineación automática de capítulos o párrafos.';
 heading.append(toggle,other,note);
 const holder=document.createElement('div');holder.className='cicero-parallel-grid';
 const frame=document.createElement('iframe');frame.className='cicero-parallel-frame';frame.hidden=true;frame.loading='lazy';frame.title=latin?'De officiis · traducción inglesa Miller 1913':'De officiis · texto latino';
 main.before(heading);main.replaceWith(holder);holder.append(main,frame);
 toggle.addEventListener('click',()=>{
  const shown=toggle.getAttribute('aria-pressed')!=='true';
  toggle.setAttribute('aria-pressed',String(shown));
  document.body.classList.toggle('cicero-parallel-on',shown);
  frame.hidden=!shown;
  if(shown&&!frame.src)frame.src=peer;
 });
})();
