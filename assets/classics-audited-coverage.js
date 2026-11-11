/* Bibliotheca / inicio: cifras auditables, solo lectura.
 * Nunca modifica originales, Codex H, folios, imágenes ni ediciones.
 * No se confunden las obras catalogadas con versiones o manuscritos físicos.
 */
(()=>{
"use strict";
const host=document.getElementById("classics-audit-coverage");
if(!host)return;
const base="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/";
const manifestSources=[
 {language:"grc",branch:"corpus-originales-griegos-20261108",path:"data/offsite-originals/manifest.json",
  schema:"vitruvius-offsite-greek-originals-manifest-v1",prefix:"data/offsite-originals/",suffix:"-grc.json"},
 {language:"la",branch:"corpus-originales-latinos-20261108",path:"data/offsite-latin/manifest.json",
  schema:"vitruvius-offsite-latin-originals-manifest-v1",prefix:"data/offsite-latin/",suffix:"-la.json"}
];
const byId=id=>host.querySelector('[data-classics="'+id+'"]');
const set=(id,value)=>{const e=byId(id);if(e)e.textContent=value};
const fmt=n=>Number.isInteger(n)?n.toLocaleString("es-AR"):"—";
const lookup=(url)=>fetch(url,{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status+" "+url);return r.json()});
async function remote(spec,known,local){
 const doc=await lookup(base+spec.branch+"/"+spec.path);
 if(doc?.schema!==spec.schema||doc.branch!==spec.branch||
   !Array.isArray(doc.entries)||doc.entries.length!==doc.count||doc.entries.length<1)
   throw Error("Manifiesto remoto inválido");
 const seen=new Map();
 for(const e of doc.entries){
  if(!e||!known.has(e.workId)||local.has(e.workId)||seen.has(e.workId)||
     e.language!==spec.language||e.path!==spec.prefix+e.workId+spec.suffix||
     !/^[0-9a-f]{64}$/.test(e.sourceSha256||"")||
     typeof e.source!=="string"||
     !(/^(?:https:\/\/raw\.githubusercontent\.com\/(?:PerseusDL|OpenGreekAndLatin|cltk)\/|https:\/\/la\.wikisource\.org\/wiki\/De_condicionibus_agrorum$)/).test(e.source)||
     !Number.isInteger(e.passages)||e.passages<1)
   throw Error("Original remoto incompatible con el catálogo");
  seen.set(e.workId,{language:e.language,path:e.path,source:e.source,sourceSha256:e.sourceSha256,passages:e.passages});
 }
 return seen;
}
(async()=>{
 try{
  const j=await lookup("data/classics-corpus/indexation-roadmap-222.json");
  if(j?.schema!=="vitruvius-classics-indexation-roadmap-v1"||
     !Array.isArray(j.items)||!j.counts||j.items.length!==j.targetWorks||
     j.counts.originalsIndexed+j.counts.originalsMissing!==j.targetWorks)
    throw Error("Inventario de obras inconsistente");
  const known=new Set(j.items.map(w=>w.id));
  const local=new Set(j.items.filter(w=>w.originalIndexed).map(w=>w.id));
  if(known.size!==j.targetWorks||local.size!==j.counts.originalsIndexed||
     j.items.filter(w=>w.translationHosted).length!==j.counts.worksWithHostedTranslation)
    throw Error("Recuento local no verificable");
  set("catalog",fmt(j.targetWorks));
  set("local",fmt(local.size));
  set("versions",fmt(j.counts.textVersions));
  set("translations",fmt(j.counts.worksWithHostedTranslation));
  set("updated",j.updated||"sin fechar");
  set("remote","Comprobando…");
  set("searchable","Comprobando…");
  set("pending","Comprobando…");
  host.dataset.state="local-valid";
  const responses=await Promise.allSettled(manifestSources.map(s=>remote(s,known,local)));
  if(responses.some(r=>r.status!=="fulfilled")){
   set("remote","No verificado");
   set("searchable",fmt(local.size)+" locales");
   set("pending","Sin verificar");
   set("method","No se pudo verificar la cobertura remota. Se muestran separadamente las cifras locales auditadas; nunca se presume que una edición externa esté alojada en Pages.");
   host.dataset.state="remote-unavailable";
   return;
  }
  const snapshot=await lookup("data/classics-corpus/external-index-reconciliation.json");
  if(snapshot?.schema!=="vitruvius-classics-external-index-reconciliation-v1"||
    !snapshot.counts||!Array.isArray(snapshot.remoteEntries))
    throw Error("No hay conciliación documental válida");
  const external=new Map();
  for(const r of responses){
   for(const [id,entry] of r.value){
    if(external.has(id))throw Error("Duplicación de ID entre manifiestos");
    external.set(id,entry);
   }
  }
  const claims=snapshot.remoteEntries;
  const expected=new Map(claims.map(e=>[e.workId,e]));
  if(expected.size!==claims.length||external.size!==claims.length||
    j.counts.offsiteOriginalsIndexed!==external.size||
    j.counts.effectiveOriginalsIndexed!==local.size+external.size||
    j.counts.effectiveOriginalsMissing!==j.targetWorks-local.size-external.size||
    snapshot.counts.hostedOriginalsIndexed!==local.size||
    snapshot.counts.remoteOriginalsIndexed!==external.size||
    snapshot.counts.combinedOriginalsIndexed!==local.size+external.size||
    snapshot.counts.originalsStillWithoutIndex!==j.targetWorks-local.size-external.size)
    throw Error("Diferencia entre inventario, conciliación y manifiestos externos");
  for(const [id,entry] of external){
   const claim=expected.get(id);
   if(!claim||claim.language!==entry.language||claim.textPath!==entry.path||
      claim.sourceUrl!==entry.source||claim.sourceSha256!==entry.sourceSha256||
      claim.passages!==entry.passages)
    throw Error("Fuente remota discrepante: "+id);
  }
  set("remote",fmt(external.size));
  set("searchable",fmt(local.size+external.size));
  set("pending",fmt(j.targetWorks-local.size-external.size));
  set("method","Cobertura documental: índices locales y dos manifiestos externos contrastados con la conciliación editorial. Los textos externos no están alojados en Pages. La coincidencia de metadatos NO certifica integridad, lectura en navegador, traducción ni colación de manuscritos.");
  host.dataset.state="verified";
 }catch(error){
  host.dataset.state="unavailable";
  set("remote","Sin certificar");
  set("searchable","Sin certificar");
  set("pending","Sin certificar");
  set("method","No fue posible certificar la conciliación documental: "+error.message+". Los números pendientes no deben citarse hasta comprobar los inventarios.");
 }
})();
})();
