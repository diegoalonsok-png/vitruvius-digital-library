/* A transparent, source-linked academic evidence layer; never certifies a machine inference as a manuscript reading. */
(()=>{"use strict";
const host=document.getElementById("scholarly-evidence-status");if(!host)return;
const read=async p=>{const r=await fetch(p,{cache:"no-cache"});if(!r.ok)throw Error(p+": HTTP "+r.status);return r.json()};
const link=(label,href)=>{const a=document.createElement("a");a.href=href;a.textContent=label;return a};
function p(label,value){const el=document.createElement("p");const strong=document.createElement("strong");strong.textContent=label;el.append(strong,document.createTextNode(" "+value));return el}
function badge(label,value){const e=document.createElement("div");e.className="evidence-metric";const n=document.createElement("strong");n.textContent=String(value);const d=document.createElement("span");d.textContent=label;e.append(n,d);return e}
async function run(){try{
 const [road,registry,decisions]=await Promise.all([
  read("data/classics-corpus/indexation-roadmap-222.json"),
  read("data/classics-corpus/search-registry.json"),
  read("data/ecdotic-decisions.json")]);
 const c=road.counts;
 if(road.schema!=="vitruvius-classics-indexation-roadmap-v1"||!Array.isArray(road.items)||
    road.items.length!==road.targetWorks||c.originalsIndexed+c.originalsMissing!==road.targetWorks||
    registry.schema!=="vitruvia-classics-search-registry-v1"||registry.count!==registry.entries?.length||
    !Array.isArray(decisions.decisions))throw Error("Inventarios incoherentes");
 const verified=decisions.decisions.filter(d=>d.recordStatus==="verified_with_source").length;
 host.replaceChildren();
 const intro=document.createElement("p");
 intro.textContent="Cifras del registro local, separadas de manuscritos físicos, lecturas remotas y validaciones humanas. Fecha del inventario: "+(road.updated||"no indicada")+".";
 host.append(intro);
 const metrics=document.createElement("div");metrics.className="evidence-metrics";
 metrics.append(badge("Obras catalogadas",road.targetWorks),badge("Originales locales indexados",c.originalsIndexed),
  badge("Originales locales pendientes",c.originalsMissing),badge("Traducciones locales (obras)",c.worksWithHostedTranslation),
  badge("Versiones textuales locales",registry.count),badge("Decisiones ecdóticas verificadas",verified));
 host.append(metrics);
 const details=document.createElement("div");details.className="evidence-explanation";
 details.append(
  p("Ecdótica.",decisions.baseline.extractedNotes+" notas extraídas; "+decisions.baseline.explicitLocus+
     " con locus explícito, "+decisions.baseline.candidateLocus+" con locus candidato y "+
     decisions.baseline.unlocated+" sin anclaje. Ninguna constituye por sí sola una variante cotejada."),
  p("Indexación.",registry.count+" versiones en el registro local. Las obras disponibles mediante manifiestos externos deben contarse por separado y verificarse al consultarlas."),
  p("Semántica.", "El índice Conceptus relaciona términos atestiguados con conceptos; no acredita por sí solo embeddings neuronales, comprensión histórica, equivalencia de traducciones ni colación."),
  p("Revisión.", "Las decisiones filológicas exigen fuente, testimonio o edición, signatura, locus, lectura, argumento y responsable. La revisión de especialistas sigue pendiente."));
 const foot=document.createElement("p");foot.append(document.createTextNode("Datos verificables: "),
 link("inventario de 222 obras","data/classics-corpus/indexation-roadmap-222.json"),document.createTextNode(" · "),
 link("registro de versiones","data/classics-corpus/search-registry.json"),document.createTextNode(" · "),
 link("decisiones ecdóticas","data/ecdotic-decisions.json"),document.createTextNode(" · "),
 link("control de integridad","https://github.com/diegoalonsok-png/vitruvius-digital-library/blob/main/scripts/audit-scholarly-evidence.mjs"));
 details.append(foot);host.append(details);
 host.dataset.state="verified-metadata";
 }catch(err){host.dataset.state="error";host.textContent="No fue posible verificar los inventarios académicos. No se publican cifras sustitutas: "+err.message;}}
run();
})();