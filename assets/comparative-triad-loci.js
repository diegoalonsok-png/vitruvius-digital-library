/* Collatio triplex — verified provenance, machine-only candidates, no manuscript claims. */
(()=>{"use strict";
const jsonUrl="data/apparatus/triad-lexical-candidates-731.json";
let records=new Map(),current=null;
const q=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const normalLocus=s=>{s=String(s||"").trim().toLowerCase();const m=s.match(/^([ivx]+)\./);if(m){let n=0,p=0;for(const ch of [...m[1]].reverse()){const v={i:1,v:5,x:10}[ch];n+=v<p?-v:v;p=v}s=n+s.slice(m[1].length)}return s.replace(/\.praefatio\./g,".praef.").replace(/\.preface\./g,".praef.")};
const getLocus=()=>normalLocus(new URLSearchParams(location.search).get("locus")||q("bude-locus")?.value||"1.1.1");
function table(name,item){
 if(!item)return "<p>Testimonio no disponible.</p>";
 const entries=item.chunks||[];
 const body=entries.length?"<ol>"+entries.map(v=>"<li><i>"+esc(v.lemma)+"</i> ] "+esc(v.lectio)+"</li>").join("")+"</ol>":"<p>Sin diferencias léxicas tras normalización.</p>";
 return "<section><h4>"+esc(name)+" · "+entries.length+" grupos de diferencias candidatas</h4>"+body+"</section>";
}
function render(){
 const root=q("vdl-triad-readings");if(!root||!records.size)return;
 const locus=getLocus(),row=records.get(locus);
 if(!row){root.innerHTML="<p>No existe un cotejo registrado para el locus "+esc(locus)+".</p>";return;}
 root.innerHTML="<p><strong>"+esc(locus)+"</strong> · lectura base: Kurilo V514. Las diferencias de puntuación, mayúsculas, i/j, u/v y grafías de sigma se normalizan sólo para localizar variantes; las fuentes originales permanecen intactas.</p>"+table("Krohn 1912",row.krohn)+table("Rose 1899",row.rose);
 current=locus;
}
function init(){
 const anchor=q("bude-content")||q("bude-unit");if(!anchor||q("vdl-triad-audit"))return;
 const section=document.createElement("section");section.id="vdl-triad-audit";section.style.cssText="margin:24px 0;padding:16px 22px;border:1px solid #a99d88;border-radius:8px";
 section.innerHTML='<h3>Collatio triplex · Rose / Krohn / Kurilo</h3><p>Índice de diferencias léxicas candidatas sobre las tres transcripciones digitales. <strong>Pendiente de verificación filológica en impresos.</strong> No atribuir estas diferencias a manuscritos ni a emendaciones de los editores sin cotejo documental.</p><p id="vdl-triad-status" role="status">Cargando cotejos por locus…</p><div id="vdl-triad-readings"></div>';
 anchor.insertAdjacentElement("afterend",section);
 ["bude-go","bude-prev","bude-next"].forEach(id=>q(id)?.addEventListener("click",()=>setTimeout(render,80)));
 q("bude-locus")?.addEventListener("change",render);
 window.addEventListener("popstate",render);
 window.addEventListener("hashchange",render);
 // Covers changes made by chapter and section selectors, including programmatic changes.
 const observer=new MutationObserver(()=>{const v=getLocus();if(v!==current)render()});
 observer.observe(q("bude-unit")||section,{childList:true,subtree:true});
 fetch(jsonUrl,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{
 if(!data||!Array.isArray(data.loci)||data.loci.length!==731)throw Error("Cobertura de loci inesperada");
 records=new Map(data.loci.map(p=>[p.locus,p]));const c=data.summary;
 q("vdl-triad-status").textContent="Cobertura: "+c.loci+"/731 loci · Krohn: "+c.krohn_equal_normalized+" loci iguales tras normalización · Rose: "+c.rose_equal_normalized+" · "+c.loci_with_candidate_differences+" loci con diferencias candidatas. Lecturas impresas sin cotejo integral.";
 render();
 }).catch(e=>{q("vdl-triad-status").textContent="Cotejo no disponible: "+e.message});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();