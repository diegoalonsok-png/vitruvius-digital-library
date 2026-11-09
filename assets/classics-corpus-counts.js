/* Cifras auditables de los originales, versiones y traducciones de Bibliotheca.
 * No modifica materiales madre, códices, folios ni ediciones.
 */
(()=>{"use strict";
const ROOT="data/classics-corpus/";
const read=async path=>{const r=await fetch(path,{cache:"no-cache"});if(!r.ok)throw Error(path+" HTTP "+r.status);return r.json();};
const metricLabels=[
 "obras y tratados catalogados","originales indexados","obras con traducción alojada",
 "versiones textuales indexadas","originales pendientes"
];
function style(){
 if(document.getElementById("classics-corpus-counts-style"))return;
 const el=document.createElement("style");el.id="classics-corpus-counts-style";
 el.textContent=[
 ".classics-tally{padding:28px 0;border-top:1px solid #5555;border-bottom:1px solid #5555;color:inherit}",
 ".classics-tally-inner{width:min(1160px,calc(100% - 36px));margin:auto}",
 ".classics-tally h2{font:400 clamp(24px,2.7vw,34px)/1.25 \"Gentium Book Plus\",\"Cardo\",Georgia,serif;letter-spacing:-.025em;margin:0 0 9px}",
 ".classics-tally p{font:12px/1.7 Arial,sans-serif;margin:6px 0;opacity:.9}",
 ".classics-tally dl{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:22px 0}",
 ".classics-tally dl>div{padding:19px 17px 16px;border:1px solid #62636a;border-radius:12px;min-width:0;background:rgba(255,255,255,.018);transition:border-color .2s ease,background .2s ease}",
 ".classics-tally dd{margin:0 0 8px;font:400 clamp(31px,3.4vw,47px)/1.05 \"Gentium Book Plus\",\"Cardo\",Georgia,serif;letter-spacing:-.035em;font-variant-numeric:lining-nums tabular-nums}",
 ".classics-tally dt{font:400 clamp(12px,1.05vw,14px)/1.45 system-ui,Arial,sans-serif;letter-spacing:.005em;opacity:.85}",
 ".classics-tally a{color:inherit;text-underline-offset:3px}",
 "body:has(.bibliotheca-suite) .classics-tally{background:#121214;color:#e9e9ea}",
 "body:has(.bibliotheca-suite) .classics-tally dl>div{border-color:#45454a;background:#19191b}",
 "@media(hover:hover){.classics-tally dl>div:hover{border-color:#8b8b90;background:rgba(255,255,255,.04)}}",\n "@media(max-width:800px){.classics-tally dl{grid-template-columns:repeat(2,minmax(0,1fr))}}",\n "@media(max-width:480px){.classics-tally dl{gap:9px}.classics-tally dl>div{padding:15px 13px}.classics-tally dd{font-size:35px}}",
 "@media print{.classics-tally{break-inside:avoid}}"
 ].join("\n");document.head.append(el);
}
function paint(a){
 const old=document.getElementById("classics-tally");if(old)old.remove();
 const section=document.createElement("section");section.id="classics-tally";section.className="classics-tally";
 section.setAttribute("aria-label","Estado académico del corpus de textos clásicos");
 const wrap=document.createElement("div");wrap.className="classics-tally-inner";
 const head=document.createElement("h2");head.textContent="Bibliotheca Graeca et Latina · corpus en cifras";wrap.append(head);
 const intro=document.createElement("p");intro.textContent="Obras catalogadas, textos buscables y traducciones son magnitudes distintas.";wrap.append(intro);
 const dl=document.createElement("dl");
 [a.catalogued,a.indexed,a.translated,a.versions,a.pending].forEach((val,i)=>{
  const group=document.createElement("div"),dd=document.createElement("dd"),dt=document.createElement("dt");
  dd.textContent=new Intl.NumberFormat("es-AR").format(val);dt.textContent=metricLabels[i];
  group.append(dd,dt);dl.append(group);
 });wrap.append(dl);
 const foot=document.createElement("p");foot.textContent=a.complete?
  "Datos desde los registros locales y manifiestos externos verificados. Se cuentan por separado las versiones; las traducciones externas solo enlazadas no se suman. Las fichas editoriales de Vitruvio pueden corresponder a versiones de la misma obra.":
  "Cobertura parcial: algún índice externo no fue verificable en esta carga; los originales no accesibles no se presentan como indexados.";
 wrap.append(foot);
 const link=document.createElement("a");
 link.href=document.querySelector(".stats-band")?"bibliotheca-graeca-latina.html":"cobertura-traducciones-clasicas.html";
 link.textContent=document.querySelector(".stats-band")?"Consultar obras y tratados clásicos":"Ver desglose de traducciones";wrap.append(link);
 section.append(wrap);
 const anchor=document.querySelector(".stats-band")||document.querySelector(".hero");
 if(anchor)anchor.insertAdjacentElement("afterend",section);
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
  style();paint(counts);window.ClassicsCorpusCounts=counts;
 }catch(e){
  console.warn("No se pudo auditar el contador clásico:",e.message);
  const p=document.createElement("p");p.textContent="Cifras pendientes de verificación; consulta el inventario académico.";
  (document.querySelector(".stats-band")||document.querySelector(".hero"))?.insertAdjacentElement("afterend",p);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",begin,{once:true});else begin();
})();