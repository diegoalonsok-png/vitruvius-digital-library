/* Inventario filológico en la portada. Solo lectura, sin modificar corpus, códices ni folios.
 * Diferencia fichas, obras, ediciones, originales y traducciones.
 */
(()=>{
"use strict";
const host=document.getElementById("classical-coverage-detail");
if(!host)return;
const $=id=>document.getElementById(id);
const CATALOGUE="data/classics-corpus/indexation-roadmap-222.json";
const ROOT="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/corpus-originales-griegos-20261108/data/offsite-originals/";
const counts = async()=>{
 const result=await fetch(CATALOGUE,{cache:"no-cache"});
 if(!result.ok)throw Error("inventario local HTTP "+result.status);
 const j=await result.json();
 if(j.schema!=="vitruvius-classics-indexation-roadmap-v1"||j.targetWorks!==222||
   !Array.isArray(j.items)||j.items.length!==j.targetWorks||
   !j.counts||!Number.isInteger(j.counts.originalsIndexed)||
   !Number.isInteger(j.counts.originalsMissing)||
   j.counts.originalsIndexed+j.counts.originalsMissing!==j.targetWorks)
  throw Error("inventario local sin integridad");
 const known=new Set(j.items.map(w=>w.id));
 if(known.size!==j.items.length)throw Error("IDs de obras duplicados");
 const indexed=new Set(j.items.filter(w=>w.originalIndexed).map(w=>w.id));
 if(indexed.size!==j.counts.originalsIndexed)throw Error("cobertura local inconsistente");
 $("classical-catalogued").textContent=j.targetWorks.toLocaleString("es-AR");
 $("classical-indexed").textContent=indexed.size.toLocaleString("es-AR");
 $("classical-text-versions").textContent=j.counts.textVersions.toLocaleString("es-AR");
 $("classical-translated").textContent=j.counts.worksWithHostedTranslation.toLocaleString("es-AR");
 $("classical-local-missing").textContent=j.counts.originalsMissing.toLocaleString("es-AR");
 $("classical-asof").textContent=j.updated||"sin fecha";
 host.dataset.status="local-verified";
 // Los textos fuera de Pages no se declaran alojados localmente. Sólo se
 // informan cuando su manifiesto se descargó y verificó por separado.
 try{
  const response=await fetch(ROOT+"manifest.json",{cache:"no-cache"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const m=await response.json();
  if(m?.schema!=="vitruvius-offsite-greek-originals-manifest-v1"||
     m.branch!=="corpus-originales-griegos-20261108"||
     !Array.isArray(m.entries)||m.count!==m.entries.length)
    throw Error("manifiesto externo inconsistente");
  const outside=new Set();
  for(const e of m.entries){
   if(!known.has(e.workId)||indexed.has(e.workId)||outside.has(e.workId)||
      e.language!=="grc"||e.path!=="data/offsite-originals/"+e.workId+"-grc.json"||
      !/^[a-f0-9]{64}$/.test(e.sourceSha256||"")||
      !Number.isInteger(e.passages)||e.passages<2)
     throw Error("procedencia externa no verificable");
   outside.add(e.workId);
  }
  $("classical-external").textContent=outside.size.toLocaleString("es-AR");
  $("classical-unavailable").textContent=(j.targetWorks-indexed.size-outside.size).toLocaleString("es-AR");
  $("classical-external-status").textContent="originales griegos con manifiesto externo documentado; su disponibilidad de lectura depende del servidor externo";
  host.dataset.status="local-and-external-verified";
 }catch(error){
  $("classical-external").textContent="sin verificar";
  $("classical-unavailable").textContent="sin verificar";
  $("classical-external-status").textContent="la cobertura externa no pudo verificarse; no se suma al índice local";
  host.dataset.status="local-verified";
 }
};
counts().catch(()=>{
 host.dataset.status="unavailable";
 $("classical-coverage-status").textContent=
   "Inventario no disponible en este momento. Consulta el registro de auditoría antes de citar estas cantidades.";
});
})();