/* Láminas históricas con referencia codicológica (folio, lámina o página, ejemplar y derechos).
   Datos: data/laminas-historicas.json. Imagen local si ya fue importada; si no, miniatura de Commons
   o aviso de importación pendiente (nunca una imagen sustituta). */
(()=>{
"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const cite=l=>{if(!l)return"";const [b,...r]=String(l).split(".");return "Vitr. "+(R[+b]||b)+"."+r.join(".").replace(/^praef\./,"praef. ")};
function thumb(e){
 if(e.status==="en el repositorio")return e.local;
 if(e.commons)return "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(e.commons.replace(/ /g,"_"))+"?width=640";
 return null
}
async function mount(target){
 if(!target)return;let d;
 try{const r=await fetch("data/laminas-historicas.json?v=20261105-v1");if(!r.ok)throw Error("HTTP "+r.status);d=await r.json()}
 catch(e){target.textContent="Catálogo de láminas no disponible: "+e.message;return}
 const groups=Object.entries(d.groups);
 const head=document.createElement("div");
 head.innerHTML='<h2 id="laminas-titulo">Láminas históricas · codicología y arquitectura clásica</h2><p class="laminas-policy">'+esc(d.policy)+'</p>';
 target.append(head);
 for(const [g,label] of groups){
  const list=d.entries.filter(e=>e.group===g);if(!list.length)continue;
  const sec=document.createElement("section");sec.className="laminas-group";sec.innerHTML='<h3>'+esc(label)+'</h3>';
  const grid=document.createElement("div");grid.className="laminas-grid";
  for(const e of list){
   const src=thumb(e),ref=[e.folio,e.plate].filter(Boolean).join(" · ");
   const viewer=e.group==="codicologia"&&e.folio?'codex-h-folios-local.html?folio='+encodeURIComponent(e.folio):null;
   const fig=document.createElement("figure");fig.className="lamina";fig.id="lamina-"+e.id;
   fig.innerHTML=(src?'<a href="'+esc(viewer||src)+'"'+(viewer?'':' target="_blank" rel="noopener"')+'><img loading="lazy" src="'+esc(src)+'" alt="'+esc(e.title+(ref?" · "+ref:""))+'"></a>'
     :'<div class="lamina-pendiente">Imagen pendiente de importación desde la institución (derechos verificados en origen).</div>')+
    '<figcaption><strong>'+esc(e.title)+'</strong>'+
    '<span>'+[e.author&&esc(e.author),e.work&&('<i>'+esc(e.work)+'</i>')].filter(Boolean).join(", ")+'</span>'+
    (e.edition?'<span>'+esc(e.edition)+'</span>':'')+
    (e.witness?'<span>'+esc(e.witness)+(e.date?' · '+esc(e.date):'')+'</span>':'')+
    (ref?'<span class="lamina-ref">'+esc(ref)+'</span>':'')+
    (e.locus?'<span><a href="lector-bilingue.html?edition=recensio-es&amp;locus='+encodeURIComponent(e.locus)+'">'+esc(cite(e.locus))+'</a>'+(e.relation?' · '+esc(e.relation):'')+'</span>':(e.relation?'<span>'+esc(e.relation)+'</span>':''))+
    (e.note?'<span>'+esc(e.note)+'</span>':'')+
    '<span class="lamina-rights"><a href="'+esc(e.source)+'" target="_blank" rel="noopener">Fuente ↗</a> · '+esc(e.rights)+'</span></figcaption>';
   grid.append(fig)}
  sec.append(grid);target.append(sec)}
 const st=document.createElement("style");st.textContent=".laminas-policy{font-size:.92em;max-width:70ch}.laminas-group h3{margin:26px 0 10px;font-size:13px;letter-spacing:1.6px;text-transform:uppercase}.laminas-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px}.lamina{margin:0;border:1px solid rgba(150,130,95,.4);padding:10px;background:rgba(255,255,255,.04)}.lamina img{width:100%;height:220px;object-fit:contain;background:#f3eee4}.lamina figcaption{display:flex;flex-direction:column;gap:3px;font-size:.86em;margin-top:8px}.lamina-ref{font-weight:600}.lamina-rights{opacity:.8;font-size:.92em}.lamina-pendiente{height:220px;display:grid;place-items:center;text-align:center;padding:14px;font-size:.88em;background:rgba(150,130,95,.12)}";
 document.head.append(st);
}
window.LaminasHistoricas={mount};
document.addEventListener("DOMContentLoaded",()=>mount(document.getElementById("laminas-historicas")));
})();
