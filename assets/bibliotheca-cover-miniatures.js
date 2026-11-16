/* Bibliotheca · cubiertas tipográficas de catálogo.
 * No se representan como portadas auténticas ni imágenes de una edición material.
 * Funcionan sin servidor gráfico y no exigen descargar imágenes externas.
 */
(function(global) {
  "use strict";
  const truncate=(s,n)=>{s=String(s||"").trim();return s.length>n?s.slice(0,n-1).trimEnd()+"…":s};
  function family(genre) {
    const g=String(genre||"").toLowerCase();
    if(/trag|drama|teatro/.test(g))return "theatre";
    if(/comed/.test(g))return "comedy";
    if(/filos|philos|dial|ética/.test(g))return "philosophy";
    if(/hist|biog|vitae/.test(g))return "history";
    if(/poes|épica|epic|lír|lyric|eleg|hymn|himno/.test(g))return "poetry";
    if(/arquitect|técn|ingenier|matem|scient/.test(g))return "science";
    return "classic";
  }
  function create(work, opts) {
    const w=work||{},o=opts||{},doc=(o.document||document);
    const el=doc.createElement("span"),size=o.size==="detail"?"detail":"mini";
    const title=String(w.bibliography?.uniformTitle||w.title||"Obra clásica").trim();
    const author=String(w.author||"Autor por documentar").trim();
    const language=w.language==="grc"?"GRIEGO":w.language==="la"?"LATÍN":"CLÁSICOS";
    el.className="vdl-cover vdl-cover--"+size;
    el.dataset.family=family(w.genre);
    el.setAttribute("role","img");
    el.setAttribute("aria-label","Cubierta tipográfica de catálogo de "+truncate(title,120)+"; no reproduce una portada histórica.");
    el.title="Diseño de catálogo, no fotografía ni portada de la edición";
    const band=doc.createElement("span");
    band.className="vdl-cover-band";band.textContent="BIBLIOTHECA";
    const ornament=doc.createElement("span");
    ornament.className="vdl-cover-ornament";ornament.setAttribute("aria-hidden","true");ornament.textContent="✦";
    const authorLine=doc.createElement("span");
    authorLine.className="vdl-cover-author";authorLine.textContent=truncate(author,44);
    const titleLine=doc.createElement("span");
    titleLine.className="vdl-cover-title";titleLine.textContent=truncate(title,70);
    const foot=doc.createElement("span");
    foot.className="vdl-cover-foot";foot.textContent=language+" · VDL";
    for(const item of [band,ornament,authorLine,titleLine,foot])el.appendChild(item);
    return el;
  }
  global.BibliothecaCoverMiniatures=Object.freeze({create});
})(window);
