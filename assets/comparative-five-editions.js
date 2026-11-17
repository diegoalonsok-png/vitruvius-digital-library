/* Five-edition Latin coverage: independent index comparison, not a critical edition. */
(()=>{"use strict";
const id="vdl-five-latin";
const $=x=>document.getElementById(x);
const norm=s=>{s=String(s||"").trim().toLowerCase();const m=s.match(/^([ivx]+)\./);if(m){let n=0,p=0;for(const c of [...m[1]].reverse()){const v={i:1,v:5,x:10}[c];n+=v<p?-v:v;p=v}s=n+s.slice(m[1].length)}return s.replace(/\.praefatio\./g,".praef.").replace(/\.preface\./g,".praef.")};
const name={"kurilo-v554":"Diego Kurilo, Vitruve. De architectura. Nouvelle recensio académique bilingue: L’architecte de la théorie (V554); DOI 10.5281/zenodo.23885110; ISBN 978-631-01-6651-3 (declarado, pendiente de verificación)","kurilo-v297":"Diego Kurilo, The Architect of Theory: Vitruvius and the Intellectual World of Roman Antiquity (V297); DOI 10.5281/zenodo.23885404; ISBN 978-631-01-6651-3 (declarado, pendiente de verificación)","krohn-1912":"Marco Vitruvio Polión, Vitruvii De architectura libri decem, ed. Fritz Krohn (Leipzig: Teubner, 1912; sin ISBN/DOI de edición histórica)","rose-1899":"Marco Vitruvio Polión, Vitruvii De architectura libri decem, ed. Valentin Rose (Leipzig: Teubner, 1899; sin ISBN/DOI de edición histórica)"};
let source=null,rows=new Map(),current="";
function findLocus(){
 const fromUrl=new URLSearchParams(location.search).get("locus");
 return norm(fromUrl||$("bude-locus")?.value||"1.1.1");
}
function show(locus){
 if(!source)return;const root=$(id+"-body");if(!root)return;
 const resolved=norm(locus||findLocus());if(resolved===current&&root.childNodes.length)return;current=resolved;root.replaceChildren();
 const note=source.locus_alignment_notes?.[resolved];if(note){const n=document.createElement("p");n.textContent="Correspondencia de segmentación: "+note+". No es una omisión del texto ni una variante ecdótica.";root.append(n)}
 const row=rows.get(resolved);if(!row){root.textContent="Locus no disponible en el cotejo de cinco ediciones.";return}
 const h=document.createElement("h4");h.textContent="Locus "+resolved;root.append(h);
 const table=document.createElement("table");table.style.cssText="width:100%;border-collapse:collapse;font:13px/1.55 system-ui";
 const top=document.createElement("tr");for(const t of ["Edición","Estado del latín indexado","Diferencia léxica normalizada con V514"]){const th=document.createElement("th");th.textContent=t;th.style.cssText="text-align:left;border-bottom:1px solid #999;padding:7px";top.append(th)}table.append(top);
 for(const [id2,v] of Object.entries(row.comparisons)){const tr=document.createElement("tr");for(const t of [name[id2]||id2,!v.available?"Sin locus indexado":v.normalized_identical?"Coincide en palabras normalizadas":"Difiere en el texto digital",!v.available?"No calculable":v.edit_distance+" operación(es) de edición de palabras"]){const td=document.createElement("td");td.textContent=t;td.style.cssText="padding:7px;border-bottom:1px solid #aaa5";tr.append(td)}table.append(tr)}root.append(table);
 const p=document.createElement("p");p.style.cssText="font:12px/1.6 system-ui";p.textContent="Las operaciones de edición miden palabras añadidas, omitidas o sustituidas en los índices normalizados. No prueban decisiones paleográficas; el aparato histórico y la comprobación del impreso conservan prioridad.";root.append(p);
}
function init(){
 const anchor=$("bude-unit")||$("bude-content");if(!anchor||$(id))return;
 const section=document.createElement("section");section.id=id;section.style.cssText="padding:14px 18px;margin:18px 0;border:1px solid #9998;border-radius:8px";
 section.innerHTML='<h3>Concordantia quinque editionum · Rose, Krohn, Kurilo V514/V554/V297</h3><p>Cotejo de cinco índices latinos por locus. Se mantienen separadas las diferencias digitales y las variantes del aparato crítico. Las coincidencias no se convierten en notas ficticias.</p><p id="'+id+'-state" role="status">Cargando comparación de cinco ediciones…</p><div id="'+id+'-body"></div>';
 anchor.insertAdjacentElement("beforebegin",section);
 window.addEventListener("vdl:comparative-locus-render",e=>show(e.detail?.locus));
 window.addEventListener("vdl:comparative-locus-select",e=>show(e.detail?.locus));
 window.addEventListener("popstate",()=>{current="";show(findLocus())});
 fetch("data/apparatus/cotejo-cinco-ediciones-latinas-731.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{
  if(!Array.isArray(d.loci)||d.loci.length!==731)throw Error("Cobertura inesperada");
  source=d;rows=new Map(d.loci.map(p=>[p.locus,p]));
  $(id+"-state").textContent="731 loci base · V554: 731 · V297: 728 entradas (tres loci fusionados con entradas vecinas: VII.7.2, VII.7.3, VII.7.5) · Krohn: 731 · Rose: 731.";
  show(findLocus());
 }).catch(e=>{$(id+"-state").textContent="No se pudo recuperar el índice: "+e.message});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();