/* Bibliotheca direct discovery controls; delegates to existing corpus and catalog filters. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const note=$("bibliotheca-shortcut-note");
const info=s=>{if(note)note.textContent=s;};
function go(id){
 const q=$("classic-query"),mode=$("classic-search-mode"),era=$("classic-era");
 if(id==="greek-phrase"){
  if(mode)mode.value="literal";
  if(q){q.placeholder="Escribe una frase griega exacta: ἄνδρα μοι ἔννεπε";q.focus();}
  info("Modo literal: introduce una frase griega en el buscador y pulsa Buscar. Las coincidencias deben proceder de originales griegos indexados; una coincidencia parcial no acredita traducción.");
 }else if(id==="lemma"){
  if(mode){mode.value="lemma";mode.dispatchEvent(new Event("change",{bubbles:true}));}
  q?.focus();info("Modo lema: se consultan las formas documentadas por el índice; no supone un lematizador exhaustivo.");
 }else if(id==="concept"){
  if(mode){mode.value="concept";mode.dispatchEvent(new Event("change",{bubbles:true}));}
  q?.focus();info("Modo conceptual: equivalencias documentadas y búsquedas multilingües; resultados con procedencia y límites de indexación.");
 }else if(id==="period"){
  era?.scrollIntoView({behavior:"smooth",block:"center"});
  era?.focus();info("Elige una época de composición; también puedes filtrar por siglo y períodos específicos de Grecia y Roma en «Buscar obras clásicas».");
 }else if(id==="bibliography"){
  const section=$("bibliotheca-work-search");
  if(section){
   const advanced=section.querySelector("details.bws-advanced");if(advanced)advanced.open=true;
   section.scrollIntoView({behavior:"smooth",block:"start"});
   section.querySelector("#bws-query")?.focus();
  }else{
   $("classic-work")?.focus();
  }
  info("Catálogo: busca obras por autor o título; filtros de siglo, período histórico, género, idioma y alfabeto visibles.");
 }
}
document.querySelectorAll("[data-biblio-quick]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.biblioQuick)));
})();