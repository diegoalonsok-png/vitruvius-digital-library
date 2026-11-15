/* Controls for the same-page Bibliotheca search. The actual retrieval is in
 * bibliotheca-simple.js; no false claim of neural semantic search. */
(()=>{"use strict";
const mode=document.getElementById("classic-search-mode");
const locus=document.getElementById("classic-locus-filter");
const form=document.getElementById("search-form");
const query=document.getElementById("classic-query");
const note=document.getElementById("classic-advanced-note");
if(!mode||!locus||!form||!query||!note)return;
const copy={
 literal:"Búsqueda en textos disponibles. La coincidencia no implica cotejo crítico.",
 lemma:"Amplía con paradigmas documentados cuando existen; no es lematización universal.",
 concept:"Equivalencias del tesauro Conceptus, no embeddings neuronales ni parentesco etimológico.",
 passage:"Recupera párrafos indexados y permite restringirlos por referencia o locus."
};
let debounce;
const update=()=>{
 note.textContent=copy[mode.value]||copy.literal;
 locus.disabled=false;
};
const run=()=>{update();if(query.value.trim())form.requestSubmit()};
mode.addEventListener("change",run);
locus.addEventListener("change",run);
locus.addEventListener("input",()=>{clearTimeout(debounce);debounce=setTimeout(run,650)});
const params=new URLSearchParams(location.search);
if(["literal","lemma","concept","passage"].includes(params.get("searchMode")))mode.value=params.get("searchMode");
if(params.get("locusFilter"))locus.value=params.get("locusFilter").slice(0,150);
update();
})();
