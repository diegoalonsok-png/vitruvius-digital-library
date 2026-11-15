/* Panel documental GitHub ↔ R2; no acredita disponibilidad si falta auditoría. */
(()=>{
"use strict";
const mount=document.getElementById("bibliotheca-federated-status");if(!mount)return;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat("es-AR").format(n):"—";
const get=url=>fetch(url,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()});
Promise.all([get("data/r2/bibliotheca-panel-sync.json"),get("data/r2/r2-object-status.json").catch(()=>null)]).then(([data,live])=>{
if(data.schema!=="vdl-bibliotheca-federated-status-v1"||!data.summary)throw Error("Inventario incompatible");
const s=data.summary;mount.replaceChildren();
mount.append(el("h2","Bibliotheca · estado del catálogo e índices"));
mount.append(el("p","Corte documental: "+(data.generated||"no declarado")+" · Las obras, ediciones PDF, transcripciones e índices son categorías independientes.","bfs-note"));
const metrics=[["Obras del repertorio",s.masterWorks],["Adiciones declaradas",s.additionalWorks],["Versiones textuales",s.textVersions],["Obras con texto",s.indexedWorks],["Obras sin texto",s.worksWithoutAnyText],["PDF R2 catalogados",s.r2PdfEditions],["Textos remotos declarados",s.remoteTextFilesDeclared],["Entradas del índice R2",s.r2IndexWorksDeclared]];
const dl=el("dl",undefined,"bfs-grid");
for(const [label,n] of metrics){const cell=el("div");cell.append(el("dt",label),el("dd",fmt(n)));dl.append(cell)}mount.append(dl);
const details=el("details");details.append(el("summary","Controles documentales y discrepancias"));
details.append(el("p","El índice utiliza raíces y Conceptus: es un índice léxico/conceptual, no una edición filológica revisada ni una representación semántica integral del corpus.","bfs-note"));
details.append(el("p","Pendientes: "+fmt(s.worksWithoutAnyText)+" obras sin texto registrado, "+fmt(s.candidateEditionsNotInR2)+" candidatos PDF no incorporados y "+fmt(s.externalMetadataPending)+" fichas con datos externos por confirmar.","bfs-note"));
const verified=live&&["verified_structurally","verified_with_findings"].includes(live.status);
details.append(el("p",verified?"Objetos R2 comprobados con HEAD: "+live.status+" · "+live.generated+". El control de identidad textual es independiente.":"Disponibilidad de los objetos R2 no certificada en esta instantánea; las URL del inventario no son una prueba física.","bfs-note"));
const links=el("p",undefined,"bfs-note");for(const [href,label] of [["data/r2/bibliotheca-panel-sync.json","Inventario por obra"],["data/r2/bibliotheca-indexation-status.json","Auditoría de indexación"],["data/r2/indice-semantico-manifest.json","Manifiesto R2"]]){const a=el("a",label);a.href=href;links.append(a,document.createTextNode(" · "))}details.append(links);
if(data.issues?.length)details.append(el("p",data.issues.length+" discrepancia(s) de inventario, sin borrar ni fusionar registros automáticamente.","bfs-note"));
mount.append(details);
}).catch(()=>mount.replaceChildren(el("p","No se pudo consultar el estado unificado; utilizar las fichas y el inventario para verificar cada edición.","bfs-note")));
const style=el("style");
style.textContent=[
"#bibliotheca-federated-status{margin:20px auto;padding:16px;border:1px solid #8888;border-radius:9px;color:inherit}",
"#bibliotheca-federated-status h2{font:normal 22px/1.3 Georgia,serif;margin:0 0 7px}",
"#bibliotheca-federated-status .bfs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:9px;margin:12px 0}",
"#bibliotheca-federated-status .bfs-grid>div{border:1px solid #8886;border-radius:6px;padding:9px}",
"#bibliotheca-federated-status dt{font:12px/1.3 system-ui;opacity:.8}",
"#bibliotheca-federated-status dd{margin:4px 0 0;font:normal 25px/1.2 Georgia,serif}",
"#bibliotheca-federated-status .bfs-note{font:13px/1.65 system-ui;opacity:.85}",
"#bibliotheca-federated-status details summary{font:600 13px system-ui;cursor:pointer;padding:7px 0}"
].join("\n");
document.head.append(style);
})();
