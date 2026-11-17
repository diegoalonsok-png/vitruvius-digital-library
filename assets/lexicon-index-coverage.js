/* Lexicon: public corpus coverage measured from the current lexical manifest.
 * Distinct Greek/Latin work IDs only; not editions, translation counts or lemmatized works.
 * Does not fetch large shards or modify the underlying corpus.
 */
(()=>{"use strict";
 const node=document.getElementById("lx-indexed-works");
 if(!node)return;
 fetch("data/index/classics/manifest.json",{cache:"no-cache"})
  .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(data=>{
   if(data.schema!=="vitruvia-classics-lexical-index-v1"||!Array.isArray(data.index))throw Error("Manifiesto inválido");
   const works=new Set();
   for(const entry of data.index){
    if((entry.lang==="la"||entry.lang==="grc")&&typeof entry.id==="string"&&entry.id.trim())works.add(entry.id);
   }
   if(!works.size)throw Error("Sin originales indexados verificados");
   node.textContent=new Intl.NumberFormat("es-AR").format(works.size);
   node.title="Obras distintas con entradas en el índice general griego/latino; no afirma lematización completa, texto íntegro ni colación autóptica.";
  })
  .catch(()=>{
   node.textContent="s/d";
   node.title="No se pudo verificar la cobertura actual del índice general. Consultar el manifiesto técnico.";
  });
})();