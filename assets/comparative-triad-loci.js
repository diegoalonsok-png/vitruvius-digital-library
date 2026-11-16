/* Collatio triplex: per-locus digital readings, deliberately separate from the manuscript apparatus.
 * Editorial conventions: lemma ] lectio; Kurilo V514 is the comparison base.
 * This module does not assign any readings to H/G/E/S and never asserts autopsy. */
(()=>{"use strict";
const url="data/apparatus/triad-lexical-candidates-731.json";
const q=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm=s=>{
 s=String(s||"").trim().toLowerCase();
 const m=s.match(/^([ivx]+)\./);
 if(m){let n=0,p=0;for(const ch of [...m[1]].reverse()){const v={i:1,v:5,x:10}[ch];n+=v<p?-v:v;p=v}s=n+s.slice(m[1].length)}
 return s.replace(/\.praefatio\./g,".praef.").replace(/\.preface\./g,".praef.");
};
let data=null,current="1.1.1",selection="all",checked=new Map(),relations=new Map();
const getLocus=()=>norm(new URLSearchParams(location.search).get("locus")||q("bude-locus")?.value||current);
function sources(locus){
 const qp=encodeURIComponent(locus);
 return '<p class="triad-provenance"><a href="apparatus-bude.html?locus='+qp+'">Abrir lectura enfrentada</a> · <a href="data/critical-editions/rose-1899-transcribed-loci.json">Transcripción Rose 1899</a> · <a href="data/critical-editions/krohn-1912-tei-loci.json">TEI Krohn 1912</a> · <a href="data/structured/recensio-es.json">Kurilo V514</a> · <a href="data/apparatus/triad-lexical-candidates-731.json">Datos del cotejo</a></p>';
}
function readings(label,edition,entry){
 const n=entry?.chunks?.length||0;
 const div=document.createElement("section");div.className="triad-edition";
 const h=document.createElement("h4");h.textContent=label+" · "+n+" diferencias candidatas";div.append(h);
 if(entry?.state!=="candidate-only"){const p=document.createElement("p");p.textContent="Locus extenso o transcripción no cotejada: requiere revisión manual.";div.append(p);return div}
 if(!n){const p=document.createElement("p");p.textContent="Sin diferencias léxicas normalizadas respecto de Kur. V514. Esto no implica identidad paleográfica.";div.append(p);return div}
 const list=document.createElement("ol");
 for(const v of entry.chunks){
  const li=document.createElement("li");li.lang="la";
  const lemma=document.createElement("i");lemma.textContent=v.lemma;
  const reading=document.createElement("span");reading.textContent=" ] "+v.lectio+" "+edition;
  li.append(lemma,reading);list.append(li);
 }
 div.append(list);return div;
}
function render(locus){
 current=norm(locus||getLocus());
 const root=q("vdl-triad-readings");if(!root||!data)return;
 const row=data.get(current);root.replaceChildren();
 const verified=checked.get(current);
 if(verified){const documentary=document.createElement("section");documentary.className="triad-printed-evidence";const h=document.createElement("h4");h.textContent="Cotejo documentado de ediciones impresas · "+current;documentary.append(h);for(const entry of verified){const p=document.createElement("p");p.lang="la";const strong=document.createElement("strong");strong.textContent=entry.lemma+" — ";p.append(strong,document.createTextNode(entry.criticalLine));documentary.append(p);const note=document.createElement("p");note.className="triad-proof";note.textContent=entry.evidence+" · Cotejos: "+(entry.printCheckIds||[]).join(", ")+". Estado: lectura editorial contrastada en los impresos indicados; atribuciones manuscritas sólo secundum editores.";documentary.append(note);}root.append(documentary)}
 if(!row){const p=document.createElement("p");p.textContent="Sin datos para el locus "+current;root.append(p);return}
 const heading=document.createElement("h4");heading.textContent="Collatio digitalis · "+current;root.append(heading);
 const rel=relations.get(current);
 if(rel){const info=document.createElement("p");info.className="triad-relationship";const names={
 coincidencia_triple_normalizada:"Coincidencia textual normalizada de las tres ediciones",
 kurilo_sigue_krohn_rose_difiere:"Kurilo y Krohn coinciden; Rose presenta otra lectura digital",
 kurilo_sigue_rose_krohn_difiere:"Kurilo y Rose coinciden; Krohn presenta otra lectura digital",
 kurilo_difiere_de_ambos:"Kurilo difiere de ambas transcripciones digitales"
 };info.textContent="Relación editorial observada: "+(names[rel.category]||rel.category)+". "+(rel.printed_comparison_checked?"Hay cotejo documental de impresos para este locus.":"Causa paleográfica y decisión editorial todavía no verificadas.");root.append(info)}
 const introductory=document.createElement("p");introductory.className="triad-explainer";
 introductory.textContent="Lema: Kur. V514. A continuación figuran diferencias calculadas entre transcripciones digitales, únicamente para orientar la revisión. No son decisiones ecdóticas atribuidas a los editores, ni variantes manuscritas verificadas. Una divergencia gráfica o de segmentación puede carecer de valor crítico.";
 root.append(introductory);
 if(selection==="all"||selection==="krohn")root.append(readings("Kurilo / Krohn","Kr.",row.krohn));
 if(selection==="all"||selection==="rose")root.append(readings("Kurilo / Rose","Rose",row.rose));
 const ref=document.createElement("div");ref.innerHTML=sources(current);root.append(ref);
}
function init(){
 const anchor=q("bude-content")||q("bude-unit");if(!anchor||q("vdl-triad-audit"))return;
 const section=document.createElement("section");section.id="vdl-triad-audit";
 section.setAttribute("aria-labelledby","vdl-triad-title");
 section.innerHTML='<h3 id="vdl-triad-title">Collatio triplex · diferencias de Rose, Krohn y Kurilo</h3><p class="triad-method"><strong>Estado científico: cotejo de transcripciones digitales, no colación autóptica.</strong> El aparato de testimonios manuscritos H, G, E y S permanece separado. Las diferencias de puntuación, mayúsculas, i/j, u/v y formas gráficas de sigma se normalizaron para localizar cambios léxicos, sin modificar los textos originales.</p><div class="triad-toolbar"><label for="vdl-triad-filter">Ver diferencias <select id="vdl-triad-filter"><option value="all">Rose y Krohn</option><option value="krohn">Krohn frente a Kurilo</option><option value="rose">Rose frente a Kurilo</option></select></label></div><p id="vdl-triad-status" role="status">Cargando cotejo por los 731 loci…</p><div id="vdl-triad-readings" aria-live="polite"></div>';
 // Put differences inside the critical dossier, above authorial/documentary notes.
 anchor.insertAdjacentElement("beforebegin",section);
 q("vdl-triad-filter").addEventListener("change",e=>{selection=e.target.value;render(current)});
 window.addEventListener("vdl:comparative-locus-render",e=>render(e.detail?.locus));
 window.addEventListener("vdl:comparative-locus-select",e=>render(e.detail?.locus));
 window.addEventListener("popstate",()=>render(getLocus()));
 // The main navigator also changes via form and prev/next.
 ["bude-go","bude-prev","bude-next"].forEach(id=>q(id)?.addEventListener("click",()=>setTimeout(()=>render(getLocus()),50)));
 ["bude-book","bude-chapter","bude-section"].forEach(id=>q(id)?.addEventListener("change",()=>setTimeout(()=>render(getLocus()),50)));
 Promise.all([url,"data/apparatus/source-print-checks.json","data/apparatus/relaciones-editoriales-731.json"].map(path=>fetch(path,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error(path+" HTTP "+r.status);return r.json()}))).then(([obj,print,relationship])=>{
  if(!Array.isArray(obj.loci)||obj.loci.length!==731||!obj.summary)throw Error("Índice incompleto");
  data=new Map(obj.loci.map(p=>[p.locus,p]));
  relations=new Map((relationship.loci||[]).map(p=>[p.locus,p]));
  checked=new Map();for(const row of print.comparisons||[]){const list=checked.get(row.locus)||[];list.push(row);checked.set(row.locus,list)}
  const s=obj.summary;
  q("vdl-triad-status").textContent="731 loci indexados · "+s.loci_with_candidate_differences+" loci con diferencias normalizadas · "+s.total_candidate_chunks_krohn+" grupos frente a Krohn y "+s.total_candidate_chunks_rose+" frente a Rose. Candidatos pendientes de cotejo impreso.";
  render(getLocus());
 }).catch(e=>{q("vdl-triad-status").textContent="No se pudo cargar la colación digital: "+e.message});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();