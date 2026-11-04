/* Marca durante un instante el botón de universidad, base o sugerencia que se acaba de pulsar,
   porque esos botones abren otra pestaña y la página no cambia. No altera la búsqueda. */
(()=>{'use strict';
document.addEventListener('click',e=>{
 const b=e.target.closest('.academic-pill,.suggestions button');
 if(!b)return;
 b.classList.add('is-clicked');
 setTimeout(()=>b.classList.remove('is-clicked'),900);
},true);
})();
