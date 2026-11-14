/* Cifras auditables de los originales, versiones y traducciones de Bibliotheca.
 * No modifica materiales madre, códices, folios ni ediciones.
 */
(()=>{"use strict";
const ROOT="data/classics-corpus/";
const read=async path=>{const r=await fetch(path,{cache:"no-cache"});if(!r.ok)throw Error(path+" HTTP "+r.status);return r.json();};
const metricLabels=[
 "obras y tratados catalogados","originales indexados","obras con traducción alojada",
 "versiones textuales indexadas","fichas sin índice original propio"
];
function style(){
 if(document.getElementById("classics-corpus-counts-style"))return;
 const el=document.createElement("style");el.id="classics-corpus-counts-style";
 el.textContent=[
 ".classics-tally{padding:14px 0;border-top:1px solid #5555;border-bottom:1px solid #5555;color:inherit}",
 ".classics-tally-inner{width:min(1240px,calc(100% - 112px));margin:auto}",
 ".classics-tally h2{font:400 clamp(20px,2.1vw,27px)/1.2 \"Gentium Book Plus\",\"Cardo\",Georgia,serif;letter-spacing:-.025em;margin:0 0 5px}",
 ".classics-tally p{font:11px/1.55 Arial,sans-serif;margin:4px 0;opacity:.9}",
 ".classics-tally dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px;margin:12px 0}",
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
 ".classics-tally .tally-editions{display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;margin:2px 0 8px;font:11px/1.5 Arial,Helvetica,sans-serif}",
 ".classics-tally .tally-editions a{display:inline-block;white-space:normal;overflow-wrap:anywhere}",
 ".classics-tally .tally-editions .tally-parallel{font-weight:700;text-decoration:underline}",
 ".classics-tally a.tally-record{color:inherit;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}",
 ".classics-tally .tally-editions small{opacity:.75}",
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
 const head=document.createElement("h2");head.textContent="Bibliotheca Graeca et Latina · corpus en cifras";wrap.append(head);
 const intro=document.createElement("p");intro.textContent="Obras catalogadas, textos buscables y traducciones son magnitudes distintas. Las fichas pendientes incluyen versiones editoriales de una misma obra; no equivalen a obras antiguas distintas.";wrap.append(intro);
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
   // Cada registro abre su ficha crítica (autoría, datación, tradición manuscrita,
   // ediciones y estado documental), también los pendientes de original indexado.
   // A selected work opens its hosted text first, whenever it exists.
   // Bibliographic records remain accessible through a separate link.
   const preferred=rec.versions?.pair?.url||
     rec.versions?.links?.find(v=>!["la","grc"].includes(v.language))?.url||
     rec.versions?.links?.find(v=>["la","grc"].includes(v.language))?.url||
     rec.url;
   const strong=(preferred||rec.id)?document.createElement("a"):document.createElement("span");
   strong.textContent=rec.title;
   if(preferred){strong.href=preferred;strong.className="tally-record";strong.title="Leer la obra en el visor disponible";}
   else if(rec.id){strong.href="classics-work-record.html?work="+encodeURIComponent(rec.id);strong.className="tally-record";strong.title="Solo ficha crítica: texto no alojado";}
   li.append(strong);
   if(rec.id && i!==3){
    const record=document.createElement("a");record.className="tally-record-link";
    record.href="classics-work-record.html?work="+encodeURIComponent(rec.id);
    record.textContent="Ficha crítica";record.title="Autoría, fuentes, ediciones y estado de la obra";
    li.append(" · ",record);
   }
   if(rec.meta){const meta=document.createElement("small");meta.textContent=" · "+rec.meta;li.append(meta);}
   if(rec.versions?.links.length){
    const versions=document.createElement("div");versions.className="tally-editions";
    const readLabel=document.createElement("small");readLabel.textContent="Lectura disponible:";versions.append(readLabel);
    for(const edition of rec.versions.links){
     const a=document.createElement("a");a.href=edition.url;
     a.textContent=edition.label;versions.append(a);
    }
    if(rec.versions.pair){
     const together=document.createElement("a");
     together.href=rec.versions.pair.url;
     together.className="tally-parallel";
     together.textContent=rec.versions.pair.label;versions.append(together);
    }
    li.append(versions);
   }else if(rec.url){
    // The title above already opens this hosted reading.
    const link=document.createElement("a");link.href=rec.url;link.textContent="Leer texto";li.append(" · ",link);
   }else if(!preferred&&rec.id){
    const notice=document.createElement("small");notice.className="tally-unavailable";
    notice.textContent=" · Texto no disponible para lectura en el sitio";
    li.append(notice);
   }
   ol.append(li);
  }
  const note=document.createElement("p");note.textContent=records.length+" registros listados (según inventarios consultados).";details.append(note,ol);
  group.append(details);dl.append(group);
 });wrap.append(dl);
 // The title finder reuses the already audited catalogue and version registry.
 window.BibliothecaWorkSearch?.mount?.(wrap,data);
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
   const note=document.createElement("small");note.className="tally-r2-note";note.style.cssText="display:block;font-size:12px;line-height:1.4;opacity:.75;margin-top:4px";
   note.textContent=fmt(c.fichasRepertorio)+" con ficha académica + "+fmt(c.obrasNuevas)+" nuevas en facsímil";
   first.querySelector("dt").after(note);
   const ol=first.querySelector("ol");
   for(const n of v.obrasNuevas||[]){
    const li=document.createElement("li");const a=document.createElement("a");a.href="buscador-facsimiles-clasicos.html?obra="+encodeURIComponent(n.r2||"");a.title="Leer la obra en el visor de facsímiles";
    a.textContent=n.autor+" — "+n.obra;a.className="tally-record";li.append(a);
    const m=document.createElement("small");m.textContent=" · obra nueva · ";li.append(m);
    const leer=document.createElement("a");leer.href="buscador-facsimiles-clasicos.html?obra="+encodeURIComponent(n.r2||"");
    leer.textContent="Leer en el visor";li.append(leer);
    const pdf=document.createElement("a");pdf.href=n.pdf;pdf.textContent="PDF";li.append(document.createTextNode(" · "),pdf);ol.prepend(li);
   }
   const p=first.querySelector("details p");if(p)p.textContent=fmt(c.obrasTotales)+" registros listados ("+fmt(c.fichasRepertorio)+" fichas y "+fmt(c.obrasNuevas)+" obras nuevas).";
  }
  const g=document.createElement("div"),dd=document.createElement("dd"),dt=document.createElement("dt");
  dd.textContent=fmt(cat.items.length);dt.textContent="facsímiles PDF de dominio público";g.append(dd,dt);
  const det=document.createElement("details");det.className="tally-details";
  const sum=document.createElement("summary");sum.textContent="Ver listado académico";det.append(sum);
  const p=document.createElement("p");p.textContent=fmt(cat.items.length)+" ediciones en libros.vitruvius-digital-library.org; texto por página con OCR sin revisar.";
  const ol=document.createElement("ol");ol.tabIndex=0;
  [...cat.items].sort((x,y)=>x.autor.localeCompare(y.autor,"es")).forEach(x=>{
   const li=document.createElement("li");const a=document.createElement("a");
   a.href="buscador-facsimiles-clasicos.html?obra="+encodeURIComponent(x.id);a.className="tally-record";
   a.title="Leer la edición página a página en el visor del sitio";
   a.textContent=x.autor+" — "+x.obra;li.append(a);
   const m=document.createElement("small");m.textContent=" · "+x.anio+(x.bilingueLoeb?" · Loeb bilingüe":"")+(x.alcance?" · "+x.alcance:"")+" · ";li.append(m);
   const pdf=document.createElement("a");pdf.href=x.pdf;pdf.textContent="PDF";li.append(pdf);ol.append(li);
  });
  const all=document.createElement("a");all.href="bibliotheca-ampliada.html";all.textContent="Abrir Bibliotheca ampliada";
  det.append(p,ol,all);g.append(det);dl.append(g);
  // Supplement catalogue matches with real R2 titles and identified facsimile editions.
  window.BibliothecaWorkSearch?.addFacsimiles?.(v,cat);
 }catch(e){console.warn("Capa R2 no disponible:",e.message)}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",begin,{once:true});else begin();
})();