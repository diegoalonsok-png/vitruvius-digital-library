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
 ".classics-tally{padding:14px 0;border-top:1px solid #5555;border-bottom:1px solid #5555;color:inherit}",
 ".classics-tally-inner{width:min(1240px,calc(100% - 112px));margin:auto}",
 ".classics-tally h2{font:400 clamp(20px,2.1vw,27px)/1.2 \"Gentium Book Plus\",\"Cardo\",Georgia,serif;letter-spacing:-.025em;margin:0 0 5px}",
 ".classics-tally p{font:11px/1.55 Arial,sans-serif;margin:4px 0;opacity:.9}",
 ".classics-tally dl{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:12px 0}",
 ".classics-tally dl>div{padding:11px 12px 10px;border:1px solid #62636a;border-radius:9px;min-width:0;background:rgba(255,255,255,.018);transition:border-color .2s ease,background .2s ease}",
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
 ".classics-tally .tally-details a{color:inherit;text-decoration:underline;text-underline-offset:2px}",
  "body:has(.bibliotheca-suite) .classics-tally{background:#121214;color:#e9e9ea}",
 "body:has(.bibliotheca-suite) .classics-tally dl>div{border-color:#45454a;background:#19191b}",
 "@media(hover:hover){.classics-tally dl>div:hover{border-color:#8b8b90;background:rgba(255,255,255,.04)}}",
 "@media(max-width:800px){.classics-tally-inner{width:calc(100% - 36px)}.classics-tally dl{grid-template-columns:repeat(2,minmax(0,1fr))}}",
 "@media(max-width:480px){.classics-tally dl{gap:9px}.classics-tally dl>div{padding:10px 9px}.classics-tally dd{font-size:29px}}",
 "@media print{.classics-tally{break-inside:avoid}}"
 ].join("\n");document.head.append(el);
}
function recordLabel(w){return [w?.author,w?.title].filter(Boolean).join(" — ") || w?.id || "Registro sin título";}
function detailLink(entry){
 const link=entry?.reader;
 return typeof link==="string" && /^(?:classics-text-reader|classics-remote-[a-z-]+-reader)\.html\?/.test(link)?link:null;
}
function detailGroup(i,data){
 const rows=i===0?data.road.items:i===1?data.road.items.filter(w=>w.originalIndexed||data.extraIds.has(w.id)):
 i===2?data.road.items.filter(w=>w.translationHosted):
 i===3?[...data.registry.entries,...data.remoteEntries]:
 data.road.items.filter(w=>!w.originalIndexed&&!data.extraIds.has(w.id));
 return rows.map(w=>{
  const id=w.workId||w.id;
  const title=recordLabel(w.author? w:data.byId.get(id)||w);
  const edition=i===3?(" · "+(w.language||"idioma no consignado")):"";
  const url=detailLink(w) || (i===3?null:detailLink(data.registry.entries.find(e=>e.workId===id && (i!==2||e.language!==(data.byId.get(id)?.originalLanguage)))));
  return {title:title+edition,url,meta:i===4?"Pendiente de original indexado":(i===3?(w.sourceDescription||"Versión textual"):(w.dating||""))};
 });
}
function paint(a,data){
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
  group.append(dd,dt);
  const details=document.createElement("details");details.className="tally-details";
  const summary=document.createElement("summary");summary.textContent="Ver listado académico";details.append(summary);
  const ol=document.createElement("ol");
  ol.tabIndex=0;
  ol.setAttribute("aria-label","Lista académica desplazable; utilice las flechas del teclado o la rueda del ratón");
  const records=detailGroup(i,data);
  records.sort((a,b)=>a.title.localeCompare(b.title,"es",{sensitivity:"base"}));
  for(const rec of records){
   const li=document.createElement("li");
   if(rec.url){const link=document.createElement("a");link.href=rec.url;link.textContent=rec.title;li.append(link);}
   else li.append(document.createTextNode(rec.title));
   if(rec.meta){const meta=document.createElement("small");meta.textContent=" · "+rec.meta;li.append(meta);}
   ol.append(li);
  }
  const note=document.createElement("p");note.textContent=records.length+" registros listados (según inventarios consultados).";details.append(note,ol);
  group.append(details);dl.append(group);
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
  const byId=new Map(road.items.map(w=>[w.id,w]));
  const remoteEntries=[...greek,...latin].filter(e=>e?.format==="remote-json-passages"&&["la","grc"].includes(e.language)&&pending.has(e.workId));
  style();paint(counts,{road,registry,extraIds:seen,remoteEntries,byId});window.ClassicsCorpusCounts=counts;
 }catch(e){
  console.warn("No se pudo auditar el contador clásico:",e.message);
  const p=document.createElement("p");p.textContent="Cifras pendientes de verificación; consulta el inventario académico.";
  (document.querySelector(".stats-band")||document.querySelector(".hero"))?.insertAdjacentElement("afterend",p);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",begin,{once:true});else begin();
})();