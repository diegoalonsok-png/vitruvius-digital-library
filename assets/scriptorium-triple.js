/* Scriptorium: three independent readers for Krohn, Kurilo and Rose.
   OCR is identified as OCR and never aligned to editorial loci by page number. */
(()=>{"use strict";
const root=document.getElementById("script-triple");
if(!root)return;
const editions={
 krohn:{name:"Krohn · 1912 · OCR latín",file:"data/text/krohn-1912.json",format:"ocr",pdf:"documents/krohn-1912.pdf"},
 kurilo:{name:"Kurilo · V514 · Latín y castellano",file:"data/structured/recensio-es.json",format:"structured",pdf:"documents/kurilo-recensio-es.pdf"},
 rose:{name:"Rose · 1899 · OCR latín",file:"data/text/rose-1899.json",format:"ocr",pdf:"https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf"},
 fr:{name:"Kurilo · V554 · Latín y francés",file:"data/structured/recensio-fr.json",format:"structured",pdf:"documents/kurilo-recensio-fr.pdf"},
 en:{name:"Kurilo · V297 · Latín e inglés",file:"data/structured/theory-en.json",format:"structured",pdf:"documents/kurilo-theory-en.pdf"}
};
const cache=new Map(),grid=root.querySelector(".script-triple-grid"),fold=v=>String(v||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
async function loadEdition(id){
 if(!cache.has(id)){
  const ed=editions[id];
  cache.set(id,fetch(ed.file).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{
   const raw=ed.format==="ocr"?d:d.passages;
   if(!Array.isArray(raw)||!raw.length)throw Error("Sin contenido de lectura");
   const pages=raw.map((p,i)=>ed.format==="ocr"?
    {locus:String(p.page||i+1),page:Number(p.page)||i+1,text:String(p.text||""),translation:""}:
    {locus:String(p.locus||i+1),page:Number(p.pdf_pages?.translation||0),text:String(p.latin||p.text||""),translation:String(p.translation||"")});
   return {ed,pages};
  }).catch(err=>{cache.delete(id);throw err}));
 }
 return cache.get(id);
}
const states=[];
let candidatePromise=null;
function candidateIndex(){
 if(!candidatePromise)candidatePromise=fetch("data/text/krohn-rose-locus-candidates.json")
  .then(r=>{if(!r.ok)throw Error("Concordancias HTTP "+r.status);return r.json()})
  .then(data=>{
   if(data.schema!=="vitruvia-ocr-locus-candidates-v1"||!Array.isArray(data.entries))throw Error("Formato de concordancia inválido");
   return new Map(data.entries.map(e=>[e.edition+"|"+e.locus,e]));
  }).catch(err=>{candidatePromise=null;throw err});
 return candidatePromise;
}
const wordPattern=/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu;
const termsOf=t=>String(t||"").match(wordPattern)||[];
const normalizeToken=t=>fold(t).replace(/j/g,"i").replace(/v/g,"u").replace(/ς/g,"σ");
function countMatches(text,term,lexical=false){
 const words=termsOf(text),target=termsOf(term);
 if(!target.length)return 0;
 const source=words.map(x=>lexical?normalizeToken(x):fold(x));
 const sought=target.map(x=>lexical?normalizeToken(x):fold(x));
 let count=0;
 for(let i=0;i<=source.length-sought.length;i++){
  if(sought.every((w,k)=>source[i+k]===w))count++;
 }
 return count;
}
let conceptCache=null;
async function conceptTerms(q,language){
 if(!conceptCache)conceptCache=fetch("data/lexicon/conceptus.json")
 .then(r=>{if(!r.ok)throw Error("Conceptus HTTP "+r.status);return r.json()})
 .then(j=>Array.isArray(j.concepts)?j.concepts:[]);
 const concepts=await conceptCache,needle=fold(q.trim());
 const concept=concepts.find(c=>
  [c.id,...Object.values(c.modern||{}).flat(),...(c.la||[]),...(c.grc||[])]
  .some(v=>typeof v==="string"&&fold(v)===needle));
 return concept?{id:concept.id,terms:(concept[language]||[]).filter(t=>typeof t==="string"&&t.length>1)}:null;
}
const toolbar=document.createElement("div");toolbar.className="script-triple-sync";
const syncToggle=document.createElement("input");syncToggle.type="checkbox";syncToggle.checked=true;
const syncLabel=document.createElement("label");syncLabel.append(syncToggle,document.createTextNode(" Sincronizar ediciones por locus idéntico"));
const syncStatus=document.createElement("span");syncStatus.setAttribute("role","status");
syncStatus.textContent="Krohn y Rose: solo OCR por página; no se presume alineación con Kurilo.";
const candidateToggle=document.createElement("input");candidateToggle.type="checkbox";
const candidateLabel=document.createElement("label");candidateLabel.append(candidateToggle,document.createTextNode(" Permitir saltos provisionales a páginas OCR (no cotejados)"));
toolbar.append(syncLabel,candidateLabel,syncStatus);grid.before(toolbar);
let syncActive=false;
function synchronize(source){
 if(!syncToggle.checked||syncActive||!source.data)return;
 const current=source.data.pages[source.index],from=source.data.ed;
 const requestedLocus=current.locus,structured=from.format==="structured";
 let exact=0,unmapped=0,ocrTargets=[];
 for(const target of states){
  if(target===source||!target.data)continue;
  if(structured&&target.data.ed.format==="ocr"){
   if(candidateToggle.checked)ocrTargets.push(target);
   else unmapped++;
   continue;
  }
  if(!structured||target.data.ed.format!=="structured"){unmapped++;continue}
  const pos=target.data.pages.findIndex(p=>p.locus===requestedLocus);
  if(pos<0){unmapped++;continue}
  syncActive=true;target.seek(pos);syncActive=false;exact++;
 }
 syncStatus.textContent=exact
   ?("Locus "+requestedLocus+" compartido por "+exact+" edición(es) textuales. Cotejo editorial pendiente.")
   :("Sin vínculo de locus verificado. Los visores no se desplazan por semejanza de número.");
 if(!ocrTargets.length)return;
 // A concordance candidate is NOT a verified collation; it is an opt-in navigation shortcut.
 candidateIndex().then(map=>{
  if(!source.data||source.data.pages[source.index]?.locus!==requestedLocus)return;
  let hits=0;
  for(const target of ocrTargets){
   if(!target.data)continue;
   const edition=target.editionId();
   const hit=map.get(edition+"|"+requestedLocus);
   if(!hit||hit.status!=="machine-candidate-not-verified")continue;
   const pos=target.data.pages.findIndex(p=>p.page===hit.page);
   if(pos<0)continue;
   syncActive=true;target.seek(pos);syncActive=false;hits++;
  }
  syncStatus.textContent="Locus "+requestedLocus+": "+hits+" salto(s) tentativos por frases latinas OCR coincidentes. NO son equivalencias filológicas verificadas; "+unmapped+" visor(es) sin ajuste.";
 }).catch(err=>{syncStatus.textContent="Concordancias provisionales no disponibles: "+err.message;});
}

for(const [slot,defaultKey] of ["krohn","kurilo","rose"].entries()){
 const panel=document.createElement("section");panel.className="script-triple-pane";grid.append(panel);
 const title=document.createElement("h3");title.textContent=["I · Krohn","II · Kurilo","III · Rose"][slot];
 const edition=document.createElement("select");edition.setAttribute("aria-label","Elegir edición del visor "+(slot+1));
 Object.entries(editions).forEach(([key,ed])=>{const o=document.createElement("option");o.value=key;o.textContent=ed.name;edition.append(o)});
 edition.value=defaultKey;
 const head=document.createElement("div");head.className="script-triple-head";head.append(title,edition);panel.append(head);
 const bar=document.createElement("div");bar.className="script-triple-tools";
 const prev=document.createElement("button");prev.type="button";prev.textContent="←";
 const locus=document.createElement("select");locus.setAttribute("aria-label","Página o locus del visor "+(slot+1));
 const next=document.createElement("button");next.type="button";next.textContent="→";
 const minus=document.createElement("button");minus.type="button";minus.textContent="A−";
 const plus=document.createElement("button");plus.type="button";plus.textContent="A+";
 bar.append(prev,locus,next,minus,plus);panel.append(bar);
 const mode=document.createElement("select");mode.setAttribute("aria-label","Tipo de búsqueda en este visor");
 for(const [value,label] of [["literal","Palabra o frase · exacta"],["lexical","Variantes gráficas latinas"],["semantic","Conceptus · semántica documentada"]]){
  const o=document.createElement("option");o.value=value;o.textContent=label;mode.append(o);
 }
 mode.className="script-triple-search-mode";panel.append(mode);
 const search=document.createElement("input");search.type="search";search.placeholder="Buscar término o frase · Enter";search.setAttribute("aria-label","Buscar en este libro");panel.append(search);
 const tally=document.createElement("p");tally.className="script-triple-count";tally.setAttribute("role","status");panel.append(tally);
 const message=document.createElement("p");message.className="script-triple-status";message.setAttribute("role","status");panel.append(message);
 const body=document.createElement("div");body.className="script-triple-text";panel.append(body);
 const foot=document.createElement("div");foot.className="script-triple-footer";
 const translation=document.createElement("button");translation.type="button";translation.textContent="Mostrar traducción";translation.hidden=true;
 const pdf=document.createElement("a");pdf.target="_blank";pdf.rel="noopener noreferrer";pdf.textContent="Abrir PDF histórico ↗";
 foot.append(translation,pdf);panel.append(foot);
 let data=null,index=0,token=0,translated=false,size=18;
 const state={
  get data(){return data},
  get index(){return index},
  editionId(){return edition.value},
  seek(i){index=i;show()}
 };
 function content(p){return translated?p.translation:p.text}
 function recount(){
  if(!data){tally.textContent="";return}
  const cacheKey=translated?"translation":"latin";
  if(data[cacheKey+"WordCount"]==null)data[cacheKey+"WordCount"]=data.pages.reduce((n,p)=>n+termsOf(translated?p.translation:p.text).length,0);
  const total=data[cacheKey+"WordCount"];
  const here=termsOf(content(data.pages[index])).length;
  tally.textContent=total.toLocaleString("es-AR")+" palabras en esta versión · "+here.toLocaleString("es-AR")+" en el pasaje actual.";
 }

 function show(){
  if(!data)return;
  const item=data.pages[index];locus.value=String(index);
  body.textContent=translated?item.translation:(item.text||"Esta página carece de OCR legible. Consultar facsímil.");
  message.textContent=(data.ed.format==="ocr"?"Página digital ":"Locus ")+item.locus+" · "+(index+1)+" / "+data.pages.length+
   (data.ed.format==="ocr"?" · OCR no corregido":" · Edición indexada por loci");
  prev.disabled=index===0;next.disabled=index===data.pages.length-1;
  pdf.href=new URL(data.ed.pdf,location.href).href+(data.ed.format==="ocr"?"#page="+item.page:item.page?"#page="+item.page:"");
  translation.hidden=data.ed.format!=="structured";
  translation.textContent=translated?"Mostrar latín":"Mostrar traducción";
  body.scrollTop=0;
  recount();
 }
 async function load(){
  const current=++token;data=null;index=0;translated=false;
  message.textContent="Cargando texto indexado…";body.textContent="";
  try{
   const resolved=await loadEdition(edition.value);if(current!==token||!panel.isConnected)return;
   data=resolved;locus.replaceChildren();
   data.pages.forEach((p,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=p.locus;locus.append(o)});
   show();
  }catch(err){if(current!==token)return;message.textContent="No se pudo cargar esta edición: "+err.message;body.textContent="Probá otra edición en el selector."}
 }
 edition.addEventListener("change",load);
 prev.addEventListener("click",()=>{index=Math.max(0,index-1);show();synchronize(state)});
 next.addEventListener("click",()=>{index=Math.min(data.pages.length-1,index+1);show();synchronize(state)});
 locus.addEventListener("change",()=>{index=Number(locus.value)||0;show();synchronize(state)});
 minus.addEventListener("click",()=>{size=Math.max(13,size-2);body.style.fontSize=size+"px"});
 plus.addEventListener("click",()=>{size=Math.min(32,size+2);body.style.fontSize=size+"px"});
 translation.addEventListener("click",()=>{translated=!translated;show()});
 search.addEventListener("keydown",async ev=>{
  if(ev.key!=="Enter"||!data)return;
  ev.preventDefault();
  const q=search.value.trim();if(!q)return;
  const selectedEdition=edition.value;
  let terms=[q],concept=null;
  if(mode.value==="semantic"){
   message.textContent="Consultando Conceptus…";
   try{
    const language=translated?(selectedEdition==="fr"?"fr":selectedEdition==="en"?"en":"es"):"la";
    concept=await conceptTerms(q,language);terms=concept?.terms||[];
   }
   catch(err){message.textContent="No se pudo consultar Conceptus: "+err.message;return}
   if(!terms.length){message.textContent="Concepto no documentado en Conceptus o sin equivalente para la lengua seleccionada. No se inventan términos.";return}
  }
  if(!data||edition.value!==selectedEdition)return;
  const counts=data.pages.map(p=>terms.reduce((n,t)=>n+countMatches(content(p),t,mode.value==="lexical"),0));
  const total=counts.reduce((a,b)=>a+b,0),found=counts.findIndex(n=>n>0);
  if(found<0){message.textContent="Sin coincidencias en esta edición y lengua. "+(mode.value==="semantic"?"La búsqueda semántica usa equivalencias editoriales, no IA vectorial.":"");return}
  index=found;show();synchronize(state);
  const passages=counts.filter(n=>n>0).length;
  message.textContent+=" · "+total+" coincidencia(s) en "+passages+" pasaje(s). "+
    (concept?"Conceptus: "+concept.id+" · términos "+terms.join(", ")+" (equivalencia editorial, no lematización certificada).":"");
 });
 states.push(state);load();
}
})();