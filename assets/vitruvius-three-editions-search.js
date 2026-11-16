/* Edition-aware Latin discovery across Kurilo, Krohn and Rose.
   Supplemental to the existing main search; never replaces its results.
   "Semantic" here means documented lexical/concept expansion, not embeddings. */
(()=>{"use strict";
const form=document.getElementById("search-form"),input=document.getElementById("query");
const home=document.getElementById("buscar"),vitruvia=document.getElementById("results");
if(!form||!input||(!home&&!vitruvia))return;
const create=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n;};
const panel=create("section",null,"vdl-three-editions");
panel.id="vdl-three-editions-search";panel.setAttribute("aria-label","Búsqueda latina conjunta en Kurilo Krohn y Rose");
const css=create("style");css.textContent=`
.vdl-three-editions{margin:20px 0 28px;padding:17px 18px;background:transparent;color:inherit;border:1px solid #b6aa93;border-radius:8px;max-width:100%;box-sizing:border-box}
.vdl-three-editions h2{font:500 clamp(20px,2vw,26px)/1.3 Georgia,serif;margin:0 0 10px}
.vdl-three-editions p{font:13px/1.6 system-ui;margin:5px 0 10px}
.vdl-three-editions .vdl-tabs{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}
.vdl-three-editions .vdl-tabs button{border:1px solid #a99e8e;border-radius:5px;padding:7px 10px;font:12px/1.4 system-ui;cursor:pointer;color:inherit;background:transparent}
.vdl-three-editions .vdl-tabs button[aria-pressed="true"]{font-weight:700;outline:1px solid currentColor}
.vdl-three-editions .vdl-entry{padding:12px 0;border-top:1px solid #bbb2a3;font:13px/1.65 system-ui}
.vdl-three-editions .vdl-entry strong{font:600 14px/1.4 Georgia,serif}
.vdl-three-editions .vdl-entry p{font:14px/1.6 Georgia,serif;overflow-wrap:anywhere}
.vdl-three-editions .vdl-links{display:flex;flex-wrap:wrap;gap:8px 16px;font:12px system-ui}
.vdl-three-editions a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.vdl-three-editions .vdl-status{font:12px/1.55 system-ui;opacity:.8}
`;document.head.append(css);
panel.append(create("h2","Resultados latinos por edición"),create("p","Kurilo V514 / V554 / V297 · Krohn 1912 · Rose 1899. Búsqueda en textos latinos por locus, con equivalencias léxicas controladas; se respetan las lecturas de cada edición."));
const status=create("p","", "vdl-status");status.setAttribute("role","status");
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
   box.append(create("p",findExcerpt(lexical(hit.p.latin,document.getElementById("query").value,document.getElementById("search-mode")?.value||"words")?hit.p.latin:textFor(hit.p,hit.ed),document.getElementById("query").value)));
   const actions=create("div",null,"vdl-links");const ap="apparatus-bude.html?locus="+encodeURIComponent(hit.p.locus)+"&edition=v514&translation=es";
   actions.append(link("Comparar Kurilo · Krohn · Rose",ap),link("Leer "+hit.ed.label,hit.ed.reader+encodeURIComponent(hit.p.locus)));
   box.append(actions);
   if(hit.p.status==="alignment_needs_editorial_review")box.append(create("p","Rose: segmentación de locus candidata; revisar facsímil.","vdl-status"));
   list.append(box);
 }
 if(filtered.length>ordered.length)list.append(create("p","Se muestran "+ordered.length+" resultados; refine la búsqueda o seleccione una edición.","vdl-status"));
}
async function search(q){
 const n=++sequence,q0=String(q||"").trim();if(!q0){status.textContent="";list.replaceChildren();tabs.replaceChildren();lastHits=[];return}
 status.textContent="Consultando textos latinos de Kurilo, Krohn y Rose por locus…";let data;
 try{data=await getData()}catch(error){if(n===sequence)status.textContent="Los índices no están disponibles: "+error.message;return}
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
