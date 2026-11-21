/* Edition-aware Latin discovery across Kurilo, Krohn and Rose.
   Supplemental to the existing main search; never replaces its results.
   "Semantic" here means documented lexical/concept expansion, not embeddings. */
(()=>{"use strict";
const form=document.getElementById("search-form"),input=document.getElementById("query");
const home=document.getElementById("buscar"),vitruvia=document.getElementById("results");
if(!form||!input||(!home&&!vitruvia))return;
const create=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n;};
let highlight=null;
const highlighter=import('./search-term-highlight.mjs?v=20261121-source-notes-v1').then(m=>{highlight=m.highlightSearchTerms}).catch(()=>{});
const panel=create("section",null,"vdl-three-editions");
panel.id="vdl-three-editions-search";panel.setAttribute("aria-label","Búsqueda latina conjunta en Kurilo Krohn y Rose");
const css=create("style");css.textContent=`
.vdl-three-editions{margin:8px 0 12px;padding:7px 12px;background:transparent;color:inherit;border:1px solid #b6aa93;border-radius:7px;max-width:100%;box-sizing:border-box}
.vdl-three-editions h2{font:500 16px/1.25 Georgia,serif;margin:0}
.vdl-three-editions p{font:11px/1.45 system-ui;margin:4px 0 6px}
.vdl-three-editions .vdl-tabs{display:flex;flex-wrap:wrap;gap:6px;margin:5px 0}
.vdl-three-editions .vdl-tabs button{border:1px solid #a99e8e;border-radius:5px;padding:7px 10px;font:12px/1.4 system-ui;cursor:pointer;color:inherit;background:transparent}
.vdl-three-editions .vdl-tabs button[aria-pressed="true"]{font-weight:700;outline:1px solid currentColor}
.vdl-three-editions .vdl-entry{padding:12px 0;border-top:1px solid #bbb2a3;font:13px/1.65 system-ui}
.vdl-three-editions .vdl-entry strong{font:600 14px/1.4 Georgia,serif}
.vdl-three-editions .vdl-entry p{font:14px/1.6 Georgia,serif;overflow-wrap:anywhere}
.vdl-three-editions .vdl-entry mark.search-query-underline{background:#ffe34f!important;color:#171409!important;text-decoration:underline!important;text-underline-offset:.15em;text-decoration-thickness:1px;border-radius:2px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.vdl-three-editions .vdl-links{display:flex;flex-wrap:wrap;gap:8px 16px;font:12px system-ui}
.vdl-three-editions a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.vdl-three-editions .vdl-status{font:12px/1.55 system-ui;opacity:.8}
.vdl-three-editions details summary{cursor:pointer;font:600 12px/1.4 system-ui;list-style:revert}
.vdl-three-editions .vdl-biblio{font:11px/1.55 system-ui;padding:6px 0 2px}
.vdl-three-editions .vdl-biblio div{margin:3px 0}
.vdl-three-editions .vdl-biblio a{white-space:nowrap}
.vdl-three-editions:has(.vdl-entry) {padding:11px 12px}
`;document.head.append(css);
const heading=create("details");
const summary=create("summary","Resultados latinos por edición · cinco textos");
heading.append(summary);
const biblio=create("div",null,"vdl-biblio");
const references=[
 ["Vitruvio, De architectura. Nueva recensio académica bilingüe: El arquitecto de la teoría — Diego A. Kurilo, V514, latín–castellano (Sophia Lux, 2026)","10.5281/zenodo.23884757"],
 ["Vitruve, De architectura. Nouvelle recensio académique bilingue: L’architecte de la théorie — Diego A. Kurilo, V554, latín–francés (Sophia Lux, 2026)","10.5281/zenodo.23885110"],
 ["The Architect of Theory: Vitruvius and the Intellectual World of Roman Antiquity — Diego A. Kurilo, V297 (Sophia Lux, 2026)","10.5281/zenodo.23885404"],
 ["Marcus Vitruvius Pollio, De architectura libri decem — edición de Fritz Krohn (1912)",null],
 ["Marcus Vitruvius Pollio, De architectura libri decem — edición de Valentin Rose (1899)",null]
];
for(const [full,doi] of references){const line=create("div",full+" · ");if(doi){const link=create("a","DOI "+doi);link.href="https://doi.org/"+doi;link.target="_blank";link.rel="noopener noreferrer";line.append(link)}else line.append(document.createTextNode("DOI e ISBN no documentados para esta edición histórica"));biblio.append(line)}
biblio.append(create("div","ISBN editorial declarado para las ediciones Kurilo: 978-631-01-6651-3 (asignación individual todavía pendiente de verificación)."));
heading.append(biblio);
panel.append(heading);
const status=create("p","", "vdl-status");status.setAttribute("role","status");status.hidden=true;
const tabs=create("nav",null,"vdl-tabs"),list=create("div");
panel.append(status,tabs,list);
if(home){const anchor=document.getElementById("more-results")||document.getElementById("search-results");if(anchor)anchor.after(panel);else home.append(panel)}
else vitruvia.after(panel);
const editions=[
 {id:"recensio-es",label:"Kurilo · V514",path:"data/structured/recensio-es.json",reader:"lector-bilingue.html?edition=recensio-es&locus="},
 {id:"recensio-fr",label:"Kurilo · V554",path:"data/structured/recensio-fr.json",reader:"lector-bilingue.html?edition=recensio-fr&locus="},
 {id:"theory-en",label:"Kurilo · V297",path:"data/structured/theory-en.json",reader:"lector-bilingue.html?edition=theory-en&locus="},
 {id:"krohn-1912",label:"Krohn · 1912",path:"data/critical-editions/krohn-1912-tei-loci.json",reader:"krohn-1912.html?locus="},
 {id:"rose-1899",label:"Rose · 1899",path:"data/critical-editions/rose-1899-transcribed-loci.json",reader:"rose-1899.html?locus="}
];
let datasets=null,lastHits=[],currentFilter="all",sequence=0;
const scopeSelect=document.getElementById("scope");
function allowedEdition(id){const scope=scopeSelect?.value||"all";return scope==="all"||scope==="principal"&&["recensio-es","recensio-fr","theory-en"].includes(id)||scope===id;}
function textFor(p,ed){return ed.id.startsWith("recensio-")||ed.id==="theory-en"?(p.latin||"")+" "+(p.translation||""):p.latin||"";}
const fold=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/j/g,"i").replace(/v/g,"u").replace(/[^a-z\u0370-\u03ff\u1f00-\u1fff0-9]+/g," ").replace(/\s+/g," ").trim();
const concepts=[
 {terms:["simetria","simetría","symmetria","symmetry","symmetrie"],roots:["symmetr"]},
 {terms:["arquitectura","architectura","architecture","architettura"],roots:["architectur","aedific"]},
 {terms:["arquitecto","architectus","architecti","architect","architecte"],roots:["architect"]},
 {terms:["decoro","decor","decorum","decoracion","décor"],roots:["decor"]},
 {terms:["firmeza","firmitas","firmness","stability"],roots:["firmit"]},
 {terms:["utilidad","utilitas","utility","utilité"],roots:["utilit"]},
 {terms:["belleza","venustas","beauty","beauté"],roots:["venust"]},
 {terms:["proporcion","proporción","proportio","proportion","proportione"],roots:["proportion"]},
 {terms:["modulo","módulo","modulus","module"],roots:["modul"]},
 {terms:["ordenacion","ordenación","ordinatio","ordination"],roots:["ordinat"]},
 {terms:["disposicion","disposición","dispositio","disposition"],roots:["disposit"]},
 {terms:["euritmia","eurythmia","eurhythmia"],roots:["eurythm"]},
 {terms:["agua","aqua","water","eau"],roots:["aqu"]},
 {terms:["columna","columnae","column","colonne"],roots:["column"]},
 {terms:["templo","templum","temple"],roots:["templ","aed"]},
 {terms:["muralla","muros","moenia","walls"],roots:["moen","mur"]},
 {terms:["viento","ventus","venti","wind"],roots:["vent"]},
 {terms:["maquina","máquina","machina","machine"],roots:["machin"]},
 {terms:["teatro","theatrum","theatre","theater"],roots:["theatr"]},
 {terms:["medicina","medicina","medicine"],roots:["medicin"]},
 {terms:["numen"],roots:["numen"]},
 {terms:["locus","loca","lugar","place","lieu"],roots:["loc"]}
];
function searchableForms(q){const parts=fold(q).split(" ").filter(Boolean);return parts.map(part=>{const c=concepts.find(x=>x.terms.some(t=>fold(t)===part));return c?c.roots.map(fold):[part]})}
function lexical(text,query,mode){
 const h=fold(text),needle=fold(query);if(!h||!needle)return false;
 if(mode==="phrase")return h.includes(needle);
 const groups=searchableForms(query);
 return groups.every(group=>group.some(root=>{const re=new RegExp("(^| )"+root.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"[a-z]*($| )");return re.test(h)}));
}
function findExcerpt(text,q){const tokens=searchableForms(q).flat(),source=fold(text);let pos=-1;for(const t of tokens){const x=source.indexOf(t);if(x>=0&&(pos<0||x<pos))pos=x}const before=Math.max(0,pos<0?0:pos-95);return (before?"…":"")+text.slice(before,Math.min(text.length,before+360))+(before+360<text.length?"…":"")}
function romanLocus(q){
 let t=q.trim().toLowerCase().replace(/^vitr[.]?[ ]*/i,"");
 const m=t.match(/^([ivx]+)[.](.+)$/);
 if(m){
  const values={i:1,v:5,x:10};let number=0,previous=0;
  for(const ch of [...m[1]].reverse()){const val=values[ch];number+=val<previous?-val:val;previous=val;}
  t=number+"."+m[2];
 }
 return /^(?:[1-9]|10)[.](?:praef|[0-9]+)(?:[.][0-9]+)?$/.test(t)?t:null;
}
async function getData(){if(datasets)return datasets;const values=await Promise.all(editions.map(async ed=>{try{const r=await fetch(ed.path,{headers:{Accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);const j=await r.json();if(!Array.isArray(j.passages)||!j.passages.length)throw Error("Índice vacío");return {ed,passages:j.passages.filter(p=>p.locus&&p.latin?.trim())}}catch(error){console.warn("Índice no disponible: "+ed.label,error);return null}}));datasets=values.filter(Boolean);if(!datasets.length)throw Error("Ningún índice digital disponible");return datasets}
function link(label,url){const a=create("a",label);a.href=url;return a}
function paint(){
 tabs.replaceChildren();list.replaceChildren();
 const counts=new Map(editions.map(ed=>[ed.id,lastHits.filter(h=>h.ed.id===ed.id).length]));
 const variants=[["all","Todas ("+lastHits.length+")"],...editions.filter(ed=>allowedEdition(ed.id)).map(ed=>[ed.id,ed.label+" ("+counts.get(ed.id)+")"])];
 for(const [id,label] of variants){const b=create("button",label);b.type="button";b.setAttribute("aria-pressed",String(currentFilter===id));b.addEventListener("click",()=>{currentFilter=id;paint()});tabs.append(b)}
 const filtered=lastHits.filter(h=>currentFilter==="all"||h.ed.id===currentFilter);
 const ordered=currentFilter==="all"?editions.filter(ed=>allowedEdition(ed.id)).flatMap(ed=>filtered.filter(h=>h.ed.id===ed.id).slice(0,30)):filtered.slice(0,110);
 for(const hit of ordered){
   const box=create("article",null,"vdl-entry");box.append(create("strong",hit.ed.label+" · Vitr., De arch. "+hit.p.locus));
   const query=input.value,mode=document.getElementById('search-mode')?.value||'words';
   const excerpt=findExcerpt(lexical(hit.p.latin,query,mode)?hit.p.latin:textFor(hit.p,hit.ed),query);
   const passage=create('p');
   if(highlight)passage.innerHTML=highlight(excerpt,query,{roots:searchableForms(query).flat(),mode});else passage.textContent=excerpt;
   passage.setAttribute('translate','no');box.append(passage);
   const actions=create("div",null,"vdl-links");const ap="apparatus-bude.html?locus="+encodeURIComponent(hit.p.locus)+"&edition=v514&translation=es";
   actions.append(link("Comparar Kurilo · Krohn · Rose",ap),link("Leer "+hit.ed.label,hit.ed.reader+encodeURIComponent(hit.p.locus)));
   box.append(actions);
   if(hit.p.status==="alignment_needs_editorial_review")box.append(create("p","Rose: segmentación de locus candidata; revisar facsímil.","vdl-status"));
   list.append(box);
 }
 if(filtered.length>ordered.length)list.append(create("p","Se muestran "+ordered.length+" resultados; refine la búsqueda o seleccione una edición.","vdl-status"));
}
async function search(q){
 const n=++sequence,q0=String(q||"").trim();if(!q0){status.textContent="";status.hidden=true;list.replaceChildren();tabs.replaceChildren();lastHits=[];heading.open=false;return}
 status.hidden=false;heading.open=true;status.textContent="Consultando textos latinos de Kurilo, Krohn y Rose por locus…";let data;
 try{[data]=await Promise.all([getData(),highlighter])}catch(error){if(n===sequence)status.textContent="Los índices no están disponibles: "+error.message;return}
 if(n!==sequence)return;
 const ref=romanLocus(q0),mode=document.getElementById("search-mode")?.value||"words";
 lastHits=[];for(const {ed,passages} of data){
   if(!allowedEdition(ed.id))continue;
   for(const p of passages){
     if(ref?(p.locus===ref||ref.split(".").length===2&&p.locus.startsWith(ref+".")):lexical(textFor(p,ed),q0,mode))
       lastHits.push({ed,p});
   }
 }
 if(n!==sequence)return;currentFilter="all";
 const counts=editions.filter(ed=>allowedEdition(ed.id)).map(ed=>ed.label+" "+lastHits.filter(h=>h.ed.id===ed.id).length).join(" · ");
 status.textContent=lastHits.length?counts+" · coincidencias en los índices de las ediciones seleccionadas, sin alterar los textos.":"Sin coincidencias en los índices disponibles para la edición seleccionada. Pruebe otra grafía o un ámbito más amplio.";
 paint();
}
form.addEventListener("submit",()=>{void search(input.value)},false);
const u=new URLSearchParams(location.search),initial=u.get("query")||u.get("q")||"";
if(initial){if(!input.value)input.value=initial;void search(initial)}
document.querySelectorAll("[data-example-query],[data-query]").forEach(b=>b.addEventListener("click",()=>{queueMicrotask(()=>{if(input.value.trim())void search(input.value)})}));
document.addEventListener("change",event=>{if(event.target?.id==="scope"||event.target?.id==="search-mode"){if(input.value.trim())void search(input.value)}});
})();
