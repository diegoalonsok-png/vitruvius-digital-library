/* Cifras auditables de los originales, versiones y traducciones de Bibliotheca.
 * No modifica materiales madre, códices, folios ni ediciones.
 */
(()=>{"use strict";
const ROOT="data/classics-corpus/";
const read=async path=>{const r=await fetch(path,{cache:"no-cache"});if(!r.ok)throw Error(path+" HTTP "+r.status);return r.json();};
const metricLabels=[
 "obras y tratados catalogados","originales con índice efectivo en repertorio principal","obras con traducción local",
 "registros textuales combinados (incluye fuentes externas)","fichas principales sin original indexado"
];
function style(){
 if(document.getElementById("classics-corpus-counts-style"))return;
 const el=document.createElement("style");el.id="classics-corpus-counts-style";
 el.textContent=[
 ".classics-tally{padding:14px 0;border-top:1px solid #5555;border-bottom:1px solid #5555;color:inherit}",
 ".classics-tally-inner{width:min(1240px,calc(100% - 112px));margin:auto}",
 ".classics-tally h2{font:400 clamp(20px,2.1vw,27px)/1.2 \"Gentium Book Plus\",\"Cardo\",Georgia,serif;letter-spacing:-.025em;margin:0 0 5px}",
 ".classics-tally p{font:11px/1.55 Arial,sans-serif;margin:4px 0;opacity:.9}",
 ".classics-tally dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px 16px;margin:8px 0;align-items:stretch}",
 ".classics-tally dl>div{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:auto auto;column-gap:9px;align-items:baseline;min-width:0}",
 ".classics-tally .tally-catalogue-link{grid-column:1/-1;display:inline-block;font:500 11px/1.3 system-ui;margin-top:3px;text-decoration:underline;color:inherit}",
 ".classics-tally .tally-r2-note{grid-column:1/-1;font-size:10px!important;margin-top:2px!important}",

 ".classics-tally dl>div dd{grid-column:1;grid-row:1;font-size:clamp(21px,2vw,28px);margin:0}",
 ".classics-tally dl>div dt{grid-column:2;grid-row:1;font-size:11px;line-height:1.3}",
 ".classics-tally dl>div .tally-details{grid-column:1/-1;grid-row:2;margin-top:2px;border-top:0;padding-top:0}",
 ".classics-tally dl>div .tally-details summary{font-size:10px;opacity:.8}",

 ".classics-tally dl>div{padding:9px 8px;border:0;border-bottom:1px solid #62636a;border-radius:0;min-width:0;background:transparent;transition:border-color .2s ease,background .2s ease}",
 ".classics-tally dd{margin:0 0 4px;font:400 clamp(25px,2.8vw,35px)/1.07 \"Gentium Book Plus\",\"Cardo\",Georgia,serif;letter-spacing:-.035em;font-variant-numeric:lining-nums tabular-nums}",
 ".classics-tally dt{font:400 clamp(10px,.86vw,12px)/1.35 Arial,Helvetica,sans-serif;letter-spacing:.005em;opacity:.85}",
 ".classics-tally a{color:inherit;text-underline-offset:3px}",
 ".classics-tally .tally-details{margin-top:8px;border-top:1px solid #7775;padding-top:5px}",
 ".classics-tally .tally-details summary{cursor:pointer;font:500 11px/1.4 Arial,Helvetica,sans-serif;list-style:revert;color:inherit}",
 ".classics-tally .tally-details[open]{grid-column:1/-1}",
 ".classics-tally .tally-details ol{margin:7px 0 0;padding:0 11px 0 18px;max-height:245px;overflow-y:auto;overflow-x:hidden;scrollbar-width:auto;scrollbar-color:#929399 #25272c;scrollbar-gutter:stable;font:11px/1.55 Arial,Helvetica,sans-serif}",
 ".classics-tally .tally-details ol::-webkit-scrollbar{width:14px}",
 ".classics-tally .tally-details ol::-webkit-scrollbar-track{background:#25272c;border-radius:9px}",
 ".classics-tally .tally-details ol::-webkit-scrollbar-thumb{background:#929399;border:2px solid #25272c;border-radius:9px;min-height:36px}",
 ".classics-tally .tally-details li{margin-bottom:5px;overflow-wrap:anywhere}",
 ".classics-tally .tally-details li small{opacity:.75}",
 ".classics-tally .tally-editions{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin:2px 0 8px;font:11px/1.5 Arial,Helvetica,sans-serif}",
 ".classics-tally .tally-editions a{display:inline-block;white-space:normal;overflow-wrap:anywhere}",
 ".classics-tally .tally-editions .tally-parallel{font-weight:700;text-decoration:underline}",
 ".classics-tally a.tally-record{color:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}",
 ".classics-tally .tally-editions small{opacity:.75}",
 ".classics-tally .tally-details a{color:inherit;text-decoration:underline;text-underline-offset:2px}",
  "body:has(.bibliotheca-suite) .classics-tally{background:#121214;color:#e9e9ea}",
 "body:has(.bibliotheca-suite) .classics-tally dl>div{border-color:#45454a;background:transparent}",
 "@media(hover:hover){.classics-tally dl>div:hover{border-color:#8b8b90;background:rgba(255,255,255,.025)}}",
 "@media(max-width:800px){.classics-tally-inner{width:calc(100% - 36px)}.classics-tally dl{grid-template-columns:repeat(2,minmax(0,1fr))}}",
 "@media(max-width:480px){.classics-tally dl{grid-template-columns:1fr;gap:4px}.classics-tally dl>div{padding:6px 5px}.classics-tally dd{font-size:23px}}",
 "@media print{.classics-tally{break-inside:avoid}}"
 ].join("\n");document.head.append(el);
}
function recordLabel(w){return [w?.author,w?.title].filter(Boolean).join(" — ") || w?.id || "Registro sin título";}
const sourceLanguageLabels={la:"latín",grc:"griego antiguo",es:"castellano",en:"inglés",fr:"francés",it:"italiano",de:"alemán",pt:"portugués"};
const trustedReader=/^(?:classics-text-reader|classics-remote-[a-z-]+-reader|lector-bilingue)\.html\?/;
function detailLink(entry){
 const link=entry?.reader;
 return typeof link==="string" && trustedReader.test(link)?link:null;
}
function workVersions(id,data){
 const rows=data.registry.entries.filter(e=>e.workId===id && detailLink(e) &&
  ["json-passages","structured-bilingual"].includes(e.format) &&
  sourceLanguageLabels[e.language]);
 const byLanguage=new Map();
 for(const entry of rows)if(!byLanguage.has(entry.language))byLanguage.set(entry.language,entry);
 const originals=[...byLanguage.values()].filter(e=>["la","grc"].includes(e.language));
 const translations=[...byLanguage.values()].filter(e=>!["la","grc"].includes(e.language));
 const links=[...originals,...translations].map(e=>({
  url:detailLink(e),language:e.language,
  label:(["la","grc"].includes(e.language)?"Original: ":"Traducción: ")+
   (sourceLanguageLabels[e.language]||e.language)
 }));
 // Only offer a paired reader when both original and a hosted
 // translation exist. Never turn a missing translation into a claimed edition.
 const pair=originals[0]&&translations[0]?{
  url:id==="vitruvius"?detailLink(translations[0]):
   "classics-parallel-reader.html?work="+encodeURIComponent(id)+
   "&left="+encodeURIComponent(originals[0].language)+
   "&right="+encodeURIComponent(translations[0].language),
  label:"Leer original y traducción en dos visores"
 }:null;
 return {links,pair,translationHosted:!!translations.length};
}
function detailGroup(i,data){
 const rows=i===0?data.road.items:i===1?data.road.items.filter(w=>w.originalIndexed||data.extraIds.has(w.id)):
 i===2?data.road.items.filter(w=>w.translationHosted):
 i===3?[...data.registry.entries,...data.remoteEntries]:
 data.road.items.filter(w=>!w.originalIndexed&&!data.extraIds.has(w.id));
 return rows.map(w=>{
  const id=w.workId||w.id;
  const main=data.byId.get(id)||w;
  const title=recordLabel(w.author?w:main);
  const edition=i===3?(" · "+(sourceLanguageLabels[w.language]||w.language||"idioma no consignado")):"";
  const url=detailLink(w)|| (i===3?null:detailLink(data.registry.entries.find(e=>e.workId===id)));
  const versions=i===3||i===4?null:workVersions(id,data);
  return {
   id,title:title+edition,url,versions,
   meta:i===4?"Pendiente de original indexado":
    i===3?(w.sourceDescription||"Versión textual"):
    (w.dating||"")
  };
 });
}
function paint(a,data){
 const old=document.getElementById("classics-tally");if(old)old.remove();
 const section=document.createElement("section");section.id="classics-tally";section.className="classics-tally";
 section.setAttribute("aria-label","Estado académico del corpus de textos clásicos");
 const wrap=document.createElement("div");wrap.className="classics-tally-inner";
 const bar=document.createElement("div");bar.className="tally-line";
 const name=document.createElement("strong");name.className="tally-line-name";name.textContent="Corpus en cifras";bar.append(name);
 const dl=document.createElement("dl");
 [a.catalogued,a.indexed,a.translated,a.versions,a.pending].forEach((val,i)=>{
  const group=document.createElement("div"),dd=document.createElement("dd"),dt=document.createElement("dt");
  dd.textContent=new Intl.NumberFormat("es-AR").format(val);dt.textContent=metricLabels[i];
  group.append(dd,dt);
  dl.append(group);
 });bar.append(dl);
 const details=document.createElement("details");details.className="tally-line-details";
 const summary=document.createElement("summary");summary.textContent="Detalle";summary.setAttribute("aria-label","Ver explicación y fuentes de las cifras");
 details.append(summary);bar.append(details);wrap.append(bar);
 const foot=document.createElement("p");foot.textContent=a.complete?
  "Base: 271 obras principales; las 10 incorporaciones en facsímil se añaden solo al total de obras. Los originales efectivos se calculan como 182 locales + índices externos clasificados aparte. Los registros de versiones suman el registro textual y las fuentes remotas adicionales; NO equivalen a obras distintas ni a textos completos cotejados. El inventario federado utiliza otra cobertura (226 obras con texto registrado, 291 versiones del registro) y no debe confundirse con esta métrica.":
  "Cobertura parcial: algún índice externo no fue verificable en esta carga; los originales no accesibles no se presentan como indexados.";
 details.append(foot);
 const link=document.createElement("a");
 link.href=document.querySelector(".stats-band")?"bibliotheca-graeca-latina.html":"cobertura-traducciones-clasicas.html";
 link.textContent=document.querySelector(".stats-band")?"Consultar obras y tratados clásicos":"Ver desglose de traducciones";details.append(link);
 section.append(wrap);
 const anchor=document.querySelector(".stats-band")||document.querySelector(".hero");
 if(anchor)anchor.insertAdjacentElement("afterend",section);
 // Catalogue search is a separate instrument, never nested in the metric bar.
 const catalogueRegion=document.createElement("div");catalogueRegion.id="bibliotheca-catalogue-region";
 section.insertAdjacentElement("afterend",catalogueRegion);
 window.BibliothecaWorkSearch?.mount?.(catalogueRegion,data);
}
async function begin(){
 try{
  const [road,translations,registry]=await Promise.all([
   read(ROOT+"indexation-roadmap-222.json"),read(ROOT+"translation-availability-222.json"),
   read(ROOT+"search-registry.json")
  ]);
  if(road?.schema!=="vitruvius-classics-indexation-roadmap-v1"||
    !Array.isArray(road.items)||road.items.length!==road.targetWorks||
    translations?.totals?.cataloguedWorks!==road.targetWorks||
    registry?.schema!=="vitruvia-classics-search-registry-v1"||
    !Array.isArray(registry.entries)||registry.entries.length!==registry.count)
   throw Error("Inventarios inconsistentes");
  const pending=new Set(road.items.filter(w=>!w.originalIndexed).map(w=>w.id));
  const greek=await (window.ClassicsOffsiteGreek?.entries?.()||Promise.resolve([]));
  const latin=await (window.ClassicsOffsiteLatin?.entries?.()||Promise.resolve([]));
  const remote=new Set(),seen=new Set();
  for(const e of [...greek,...latin])if(e?.format==="remote-json-passages"&&["la","grc"].includes(e.language)&&pending.has(e.workId)){
   seen.add(e.workId);remote.add(e.workId+"|"+e.language);
  }
  const local=road.counts.originalsIndexed,extra=seen.size;
  const counts={catalogued:road.targetWorks,indexed:local+extra,pending:road.targetWorks-local-extra,
    translated:translations.totals.translatedWorksLocal,
    versions:registry.count+remote.size,
    complete:greek.length===(window.ClassicsOffsiteGreek?.allowedWorkIds?.length||0)&&
      latin.length===(window.ClassicsOffsiteLatin?.allowedWorkIds?.length||0)};
  const byId=new Map(road.items.map(w=>[w.id,w]));
  const remoteEntries=[...greek,...latin].filter(e=>e?.format==="remote-json-passages"&&["la","grc"].includes(e.language)&&pending.has(e.workId));
  style();paint(counts,{road,registry,extraIds:seen,remoteEntries,byId});window.ClassicsCorpusCounts=counts;
  ampliar(road.targetWorks);
 }catch(e){
  console.warn("No se pudo auditar el contador clásico:",e.message);
  const p=document.createElement("p");p.textContent="Cifras pendientes de verificación; consulta el inventario académico.";
  (document.querySelector(".stats-band")||document.querySelector(".hero"))?.insertAdjacentElement("afterend",p);
 }
}
/* Capa aditiva R2 (Bibliotheca ampliada): suma las obras nuevas al total de obras y
 * agrega la tarjeta de facsímiles PDF. No altera el cálculo auditado de las fichas del repertorio.
 * Si el registro R2 no carga, las tarjetas quedan como estaban. */
async function ampliar(fichas){
 try{
  const [v,cat]=await Promise.all([read("data/r2/vinculos-repertorio.json"),read("data/r2/catalogo-clasicos-r2.json")]);
  const c=v?.recuentos;const dl=document.querySelector("#classics-tally dl");
  if(v?.schema!=="vdl-r2-vinculos-repertorio-1"||!c||c.fichasRepertorio!==fichas||!dl||!Array.isArray(cat?.items))return;
  const fmt=n=>new Intl.NumberFormat("es-AR").format(n);
  const first=dl.querySelector("div");
  if(first){
   first.querySelector("dd").textContent=fmt(c.obrasTotales);
   const note=document.createElement("small");note.className="tally-r2-note";
   note.textContent=fmt(c.fichasRepertorio)+" con ficha académica + "+fmt(c.obrasNuevas)+" nuevas en facsímil";
   const detail=document.querySelector("#classics-tally .tally-line-details");if(detail)detail.append(note);

  }
  const g=document.createElement("div"),dd=document.createElement("dd"),dt=document.createElement("dt");
  dd.textContent=fmt(cat.items.length);dt.textContent="facsímiles PDF de dominio público";g.append(dd,dt);
  const all=document.createElement("a");all.href="bibliotheca-ampliada.html";all.className="tally-catalogue-link";all.textContent="Ver facsímiles";
  g.append(all);dl.append(g);
  // Supplement catalogue matches with real R2 titles and identified facsimile editions.
  window.BibliothecaWorkSearch?.addFacsimiles?.(v,cat);
 }catch(e){console.warn("Capa R2 no disponible:",e.message)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",begin,{once:true});else begin();
})();