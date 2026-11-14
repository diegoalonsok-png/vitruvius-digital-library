/* Scriptorium: tres lectores independientes para Krohn, Kurilo y Rose.

   El OCR se identifica siempre como OCR. No se alinea por número de página,
   que no significa nada entre ediciones distintas, pero sí por la concordancia
   documentada en data/collation-loci.json, que para cada uno de los 731 loci
   registra la página de Rose y la de Krohn con un índice de semejanza obtenido
   por trigramas sobre el flujo de páginas. Esa concordancia se declara con su
   grado y nunca como colación verificada. */
(()=>{"use strict";
const root=document.getElementById("script-triple");
if(!root)return;
const initialParams=new URLSearchParams(location.search);
const keyFor=id=>({"recensio-es":"kurilo","recensio-fr":"fr","theory-en":"en","krohn-1912":"krohn","rose-1899":"rose"})[id]||id;
const requestedEditions=(initialParams.get("readers")||"").split(",");
const primaryKey=keyFor(initialParams.get("edition"));
let stateReady=false,urlTimer=0;
const editions={
 krohn:{name:"Krohn · 1912 · OCR latín",file:"data/text/krohn-1912.json",format:"ocr",pdf:"documents/krohn-1912.pdf"},
 kurilo:{name:"Kurilo · V514 · Latín y castellano",file:"data/structured/recensio-es.json",format:"structured",pdf:"documents/kurilo-recensio-es.pdf"},
 rose:{name:"Rose · 1899 · OCR latín",file:"data/text/rose-1899.json",format:"ocr",pdf:"https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf"},
 fr:{name:"Kurilo · V554 · Latín y francés",file:"data/structured/recensio-fr.json",format:"structured",pdf:"documents/kurilo-recensio-fr.pdf"},
 en:{name:"Kurilo · V297 · Latín e inglés",file:"data/structured/theory-en.json",format:"structured",pdf:"documents/kurilo-theory-en.pdf"}
};
/* Ficha bibliográfica de cada testigo, visible bajo el título del visor. */
const FICHA={
 krohn:"Vitruvii De architectura libri decem, ed. F. Krohn. Leipzig: Teubner, 1912 · OCR del ejemplar digitalizado",
 rose:"Vitruvii De architectura libri decem, ed. V. Rose, 2.ª ed. Leipzig: Teubner, 1899 · OCR del ejemplar de Internet Archive",
 kurilo:"Kurilo, D. A. De architectura. Recensio V514 (latín–castellano). Buenos Aires: Sophia Lux, 2026",
 fr:"Kurilo, D. A. De architectura. Recensio V554 (latin–français). Buenos Aires: Sophia Lux, 2026",
 en:"Kurilo, D. A. The Architect of Theory, V297. Buenos Aires: Sophia Lux, 2026"
};
const cache=new Map(),grid=root.querySelector(".script-triple-grid"),fold=v=>String(v||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
/* Testigo de collation-loci.json que corresponde a cada visor. */
const TESTIGO={krohn:"krohn-1912",rose:"rose-1899"};
/* Grado de la concordancia según el índice de semejanza del cotejo por trigramas. */
function gradoConcordancia(score){
 if(!(score>0))return null;
 if(score>=0.90)return {clave:"firma",texto:"semejanza automática alta"};
 if(score>=0.80)return {clave:"probabilis",texto:"semejanza automática intermedia"};
 return {clave:"dubia",texto:"semejanza automática baja; verificar localización"};
}
let concordanciaPromise=null;
function concordanciaLoci(){
 if(!concordanciaPromise)concordanciaPromise=fetch("data/collation-loci.json")
  .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(d=>{
   if(d.schema!=="vitruvia-collation-v1"||!d.loci)throw Error("Formato de concordancia inválido");
   return d;
  }).catch(err=>{concordanciaPromise=null;throw err});
 return concordanciaPromise;
}
async function loadEdition(id){
 if(!cache.has(id)){
  const ed=editions[id];
  cache.set(id,fetch(ed.file).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{
   const raw=ed.format==="ocr"?d:d.passages;
   if(!Array.isArray(raw)||!raw.length)throw Error("Sin contenido de lectura");
   const pages=raw.map((p,i)=>ed.format==="ocr"?
    {locus:String(p.page||i+1),page:Number(p.page)||i+1,text:String(p.text||""),translation:""}:
    {locus:String(p.locus||i+1),page:Number(p.pdf_pages?.latin||p.pdf_pages?.translation||0),latinPage:Number(p.pdf_pages?.latin||0),translationPage:Number(p.pdf_pages?.translation||0),text:String(p.latin||p.text||""),translation:String(p.translation||"")});
   return {ed,pages};
  }).catch(err=>{cache.delete(id);throw err}));
 }
 return cache.get(id);
}
/* Los OCR históricos incluyen guardas en blanco y ruido del escáner.
   Para la primera apertura se prefiere una página realmente legible;
   todas las páginas se conservan en el selector, sin descartar testimonio. */
function openingPageIndex(pages,format){
 if(format!=="ocr")return 0;
 const score=p=>{
  const value=String(p.text||"");
  const latinWords=value.match(/[A-Za-zÀ-ÿ]{4,}/g)||[];
  const letters=(value.match(/[A-Za-zÀ-ÿ]/g)||[]).length;
  const visible=value.replace(/\s/g,"").length;
  return latinWords.length>=35&&letters>=220&&letters/Math.max(visible,1)>.72;
 };
 const first=pages.findIndex(score);
 return first>=0?first:Math.max(0,pages.findIndex(p=>String(p.text||"").trim().length>150));
}
const states=[];
function savePosition(){
 if(!stateReady)return;
 clearTimeout(urlTimer);urlTimer=setTimeout(()=>{
  const u=new URL(location.href);
  u.searchParams.set("readers",states.map(s=>s.editionId()).join(","));
  states.forEach((s,i)=>{const p=s.context();if(p.locus||p.page)u.searchParams.set("p"+(i+1),p.locus||String(p.page));if(p.translation)u.searchParams.set("tr"+(i+1),"1");else u.searchParams.delete("tr"+(i+1));if(s.view()==="pdf")u.searchParams.set("v"+(i+1),"pdf");else u.searchParams.delete("v"+(i+1))});
  const base=states.find(s=>s.context().locus);if(base)u.searchParams.set("locus",base.context().locus);
  if(!syncToggle.checked)u.searchParams.set("sync","0");else u.searchParams.delete("sync");
  history.replaceState(null,"",u);
 },30);
}
/* Ubica en la página OCR el tramo que el cotejo atribuye al locus: se buscan las
   primeras palabras del tramo (plegadas, tolerando cortes y ruido del OCR) y se
   marca desde ahí la extensión del tramo. Si no se halla con seguridad, no se marca. */
const plegarOCR=v=>fold(v).replace(/j/g,"i").replace(/v/g,"u");
function ubicarTramo(texto,tramo){
 const pal=[...String(texto).matchAll(/[A-Za-zÀ-ÿ]+/g)].map(m=>({w:plegarOCR(m[0]),a:m.index,b:m.index+m[0].length}));
 const obj=String(tramo||"").split("|")[0].match(/[A-Za-zÀ-ÿ]+/g)?.map(plegarOCR)||[];
 if(pal.length<3||obj.length<3)return null;
 const k=Math.min(8,obj.length);let mejor=-1,puntos=0;
 for(let i=0;i<pal.length;i++){
  let n=0;for(let j=0;j<k&&i+j<pal.length;j++)if(pal[i+j].w===obj[j]||(pal[i+j].w.length>4&&obj[j].startsWith(pal[i+j].w.slice(0,4))))n++;
  if(n>puntos){puntos=n;mejor=i}
 }
 if(puntos<Math.ceil(k*0.5))return null;
 const fin=Math.min(pal.length-1,mejor+obj.length-1);
 return {a:pal[mejor].a,b:String(tramo).includes("|")?String(texto).length:pal[fin].b};
}
const esc=v=>String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
let sincronizadoAlAbrir=false;
function sincronizarAlAbrir(){
 if(sincronizadoAlAbrir||states.length<3||states.some(st=>!st.data))return;
 const base=states.find(st=>st.data.ed.format==="structured");
 if(!base){sincronizadoAlAbrir=true;stateReady=true;savePosition();return}
 sincronizadoAlAbrir=true;
 const wanted=initialParams.get("locus");if(wanted&&!initialParams.has("p2"))base.seekLocus(wanted);
 stateReady=true;
 if(!initialParams.has("p1"))synchronize(base);
 savePosition();
}
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
const syncToggle=document.createElement("input");syncToggle.type="checkbox";syncToggle.checked=initialParams.get("sync")!=="0";
const syncLabel=document.createElement("label");syncLabel.append(syncToggle,document.createTextNode(" Sincronizar los visores por locus"));
const syncStatus=document.createElement("span");syncStatus.setAttribute("role","status");
syncStatus.textContent="Krohn y Rose se leen por OCR de página. La semejanza calculada propone una localización; no certifica una lectura filológica.";
const candidateToggle=document.createElement("input");candidateToggle.type="checkbox";candidateToggle.checked=true;
const candidateLabel=document.createElement("label");
candidateLabel.append(candidateToggle,document.createTextNode(" Llevar Krohn y Rose a la página concordante del locus"));
candidateLabel.title="Usa la concordancia documentada por cotejo de trigramas; se indica su grado y no equivale a una colación verificada.";
/* Ir a un locus o a una palabra: los tres visores se colocan juntos. */
const irBox=document.createElement("div");irBox.className="script-triple-ir";
const irLocus=document.createElement("select");irLocus.setAttribute("aria-label","Elegir locus para sincronizar los tres visores");
irLocus.append(new Option("Elegir locus…",""));
const irPalabra=document.createElement("input");irPalabra.type="search";irPalabra.placeholder="o una palabra latina: symmetria, decor…";irPalabra.setAttribute("aria-label","Palabra latina para sincronizar los visores");
const irBoton=document.createElement("button");irBoton.type="button";irBoton.textContent="Sincronizar los tres visores";
const irLabel=document.createElement("span");irLabel.textContent="Ir a:";irLabel.className="script-triple-ir-label";
irBox.append(irLabel,irLocus,irPalabra,irBoton);
loadEdition("kurilo").then(d=>{for(const p of d.pages)irLocus.append(new Option(p.locus,p.locus))}).catch(()=>{});
let ultimaPalabra={q:"",i:-1};
function irA(){
 const base=states.find(st=>st.data?.ed.format==="structured");
 if(!base){syncStatus.textContent="Ningún visor tiene cargada una edición por loci (Kurilo V514, V554 o V297).";return}
 const q=irPalabra.value.trim();
 let locus=irLocus.value;
 if(q){
  const f=fold(q).replace(/j/g,"i").replace(/v/g,"u"),r=f.length>6?f.replace(/(ae|am|as|um|us|is|es|em|a|e|i|o)$/,""):f;
  const re=new RegExp("(^|[^a-z])"+r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  const hits=base.data.pages.map((p,i)=>[p,i]).filter(([p])=>re.test(fold(p.text).replace(/j/g,"i").replace(/v/g,"u")));
  if(!hits.length){syncStatus.textContent="«"+q+"» no aparece en el latín de "+editions[base.editionId()].name+".";return}
  if(ultimaPalabra.q!==q)ultimaPalabra={q,i:-1};
  ultimaPalabra.i=(ultimaPalabra.i+1)%hits.length;
  locus=hits[ultimaPalabra.i][0].locus;
  irBoton.textContent="Siguiente aparición ("+(ultimaPalabra.i+1)+"/"+hits.length+") →";
 }
 if(!locus){syncStatus.textContent="Elija un locus o escriba una palabra.";return}
 irLocus.value=locus;
 if(!base.seekLocus(locus)){syncStatus.textContent="Locus "+locus+" no figura en "+editions[base.editionId()].name+".";return}
 const prev=syncToggle.checked;syncToggle.checked=true;synchronize(base);syncToggle.checked=prev;
}
irBoton.addEventListener("click",irA);
irLocus.addEventListener("change",()=>{irPalabra.value="";irBoton.textContent="Sincronizar los tres visores";irA()});
irPalabra.addEventListener("input",()=>{ultimaPalabra={q:"",i:-1};irBoton.textContent="Sincronizar los tres visores"});
irPalabra.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();irA()}});
toolbar.append(irBox,syncLabel,candidateLabel,syncStatus);grid.before(toolbar);
let syncActive=false;
/* Desde una página de Krohn o Rose: el primer locus que el cotejo sitúa en esa
   página lleva a Kurilo a ese locus y al otro OCR a su página concordante. */
function desdeOCR(source,current){
 const testigo=TESTIGO[source.editionId()];
 concordanciaLoci().then(d=>{
  if(source.data.pages[source.index]!==current)return;
  const loci=Object.entries(d.loci).filter(([,f])=>f[testigo]?.page===current.page);
  if(!loci.length){syncStatus.textContent=(editions[source.editionId()].name.split(" ·")[0])+" p. "+current.page+": el cotejo no sitúa ningún locus en esta página (prefacio del editor, índice o aparato).";return}
  const [locus,fila]=loci[0];
  source.marcar(fila[testigo].text,fila[testigo].score,fila[testigo].pageEnd);
  const partes=[];
  for(const target of states){
   if(target===source||!target.data)continue;
   if(target.data.ed.format==="structured"){syncActive=true;const ok=target.seekLocus(locus);syncActive=false;if(ok)partes.push(editions[target.editionId()].name.split(" ·").slice(0,2).join(" ·")+" "+locus);continue}
   const t2=TESTIGO[target.editionId()],dato=t2&&fila[t2];
   if(!dato?.page)continue;
   const pos=target.data.pages.findIndex(p=>p.page===dato.page);if(pos<0)continue;
   target.marcarEn(pos,dato.text,dato.score,dato.pageEnd);syncActive=true;target.seek(pos);syncActive=false;
   partes.push(editions[target.editionId()].name.split(" ·")[0]+" p. "+dato.page+" · "+gradoConcordancia(dato.score).texto);
  }
  syncStatus.textContent="Locus "+locus+(loci.length>1?" (y "+(loci.length-1)+" más en esta página)":"")+" → "+partes.join(" · ")+". Localización automática por trigramas; comprobar el tramo y su continuación en el facsímil.";savePosition();
 }).catch(err=>{syncStatus.textContent="Concordancia de loci no disponible: "+err.message});
}
function synchronize(source){
 if(!syncToggle.checked||syncActive||!source.data)return;
 const current=source.data.pages[source.index],from=source.data.ed;
 if(from.format==="ocr"&&TESTIGO[source.editionId()]){desdeOCR(source,current);return}
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
 /* La concordancia es un instrumento de navegación con grado declarado, no una
    colación: lleva el visor a la página donde el cotejo mecánico sitúa el locus. */
 concordanciaLoci().then(d=>{
  if(!source.data||source.data.pages[source.index]?.locus!==requestedLocus)return;
  const fila=d.loci[requestedLocus];
  const partes=[];
  for(const target of ocrTargets){
   if(!target.data)continue;
   const testigo=TESTIGO[target.editionId()];
   const dato=testigo&&fila?fila[testigo]:null;
   if(!dato||!dato.page)continue;
   const pos=target.data.pages.findIndex(p=>p.page===dato.page);
   if(pos<0)continue;
   target.marcarEn(pos,dato.text,dato.score,dato.pageEnd);
   syncActive=true;target.seek(pos);syncActive=false;
   const g=gradoConcordancia(dato.score);
   const nombre=(editions[target.editionId()]||{}).name||testigo;
   partes.push(nombre.split(" ·")[0]+" · página digital "+dato.page+(dato.pageEnd?"–"+dato.pageEnd:"")+(g?" · "+g.texto+" (índice "+dato.score.toFixed(2)+")":""));
  }
  syncStatus.textContent=partes.length
   ?("Locus "+requestedLocus+" → "+partes.join(" · ")+". Concordancia por cotejo de trigramas sobre el OCR: "
     +"propone una localización digital, no sustituye la colación del texto.")
   :("Locus "+requestedLocus+": sin página concordante registrada para los visores de OCR.");savePosition();
 }).catch(err=>{syncStatus.textContent="Concordancia de loci no disponible: "+err.message;});
}

for(const [slot,defaultKey] of ["krohn","kurilo","rose"].entries()){
 const panel=document.createElement("section");panel.className="script-triple-pane";grid.append(panel);
 const title=document.createElement("h3");title.textContent=["I · Krohn","II · Kurilo","III · Rose"][slot];
 const edition=document.createElement("select");edition.setAttribute("aria-label","Elegir edición del visor "+(slot+1));
 Object.entries(editions).forEach(([key,ed])=>{const o=document.createElement("option");o.value=key;o.textContent=ed.name;edition.append(o)});
 edition.value=editions[requestedEditions[slot]]?requestedEditions[slot]:(editions[primaryKey]&&((slot===1&&editions[primaryKey].format==="structured")||(slot===0&&primaryKey==="krohn")||(slot===2&&primaryKey==="rose"))?primaryKey:defaultKey);
 const ficha=document.createElement("p");ficha.className="script-triple-ficha";ficha.textContent=FICHA[defaultKey]||"";
 const head=document.createElement("div");head.className="script-triple-head";head.append(title,ficha,edition);panel.append(head);
 edition.addEventListener("change",()=>{ficha.textContent=FICHA[edition.value]||""});
 const bar=document.createElement("div");bar.className="script-triple-tools";
 const prev=document.createElement("button");prev.type="button";prev.textContent="←";
 const locus=document.createElement("select");locus.setAttribute("aria-label","Página o locus del visor "+(slot+1));
 const next=document.createElement("button");next.type="button";next.textContent="→";
 const minus=document.createElement("button");minus.type="button";minus.textContent="A−";
 const plus=document.createElement("button");plus.type="button";plus.textContent="A+";
 prev.setAttribute("aria-label","Pasaje anterior del visor "+(slot+1));next.setAttribute("aria-label","Pasaje siguiente del visor "+(slot+1));
 minus.setAttribute("aria-label","Reducir letra del visor "+(slot+1));plus.setAttribute("aria-label","Ampliar letra del visor "+(slot+1));
 bar.append(prev,locus,next,minus,plus);panel.append(bar);
 const mode=document.createElement("select");mode.setAttribute("aria-label","Tipo de búsqueda en este visor");
 const searchDetails=document.createElement("details");searchDetails.className="script-in-book-search";
 const searchSummary=document.createElement("summary");searchSummary.textContent="Buscar dentro de esta edición";searchDetails.append(searchSummary);panel.append(searchDetails);
 for(const [value,label] of [["literal","Palabra o frase · grafías normalizadas"],["lexical","Variantes gráficas latinas"],["semantic","Conceptus · semántica documentada"]]){
  const o=document.createElement("option");o.value=value;o.textContent=label;mode.append(o);
 }
 mode.className="script-triple-search-mode";searchDetails.append(mode);
 const search=document.createElement("input");search.type="search";search.placeholder="Buscar término o frase · Enter";search.setAttribute("aria-label","Buscar en este libro");searchDetails.append(search);
 const searchNext=document.createElement("button");searchNext.type="button";searchNext.textContent="Buscar / siguiente coincidencia";searchDetails.append(searchNext);
 let lastSearchKey="",searchCursor=-1;
 const tally=document.createElement("p");tally.className="script-triple-count";tally.setAttribute("role","status");panel.append(tally);
 const message=document.createElement("p");message.className="script-triple-status";message.setAttribute("role","status");panel.append(message);
 const viewBar=document.createElement("div");viewBar.className="script-triple-view-options";
 const showText=document.createElement("button");showText.type="button";showText.textContent="Texto OCR / edición";showText.setAttribute("aria-pressed","true");
 const showFacsimile=document.createElement("button");showFacsimile.type="button";showFacsimile.textContent="Ver PDF original";showFacsimile.setAttribute("aria-pressed","false");
 viewBar.append(showText,showFacsimile);panel.append(viewBar);
 const body=document.createElement("div");body.className="script-triple-text notranslate";body.translate=false;body.tabIndex=0;body.setAttribute("aria-label","Texto del visor "+(slot+1));panel.append(body);
 const facsimile=document.createElement("iframe");facsimile.className="script-triple-pdf";facsimile.title="Facsímil PDF de la edición seleccionada";facsimile.loading="lazy";facsimile.hidden=true;panel.append(facsimile);
 const foot=document.createElement("div");foot.className="script-triple-footer";
 const translation=document.createElement("button");translation.type="button";translation.textContent="Mostrar traducción";translation.hidden=true;
 const pdf=document.createElement("a");pdf.target="_blank";pdf.rel="noopener noreferrer";pdf.textContent="Abrir PDF de esta edición ↗";
 foot.append(translation,pdf);panel.append(foot);
 let data=null,index=0,token=0,translated=false,size=18,view="text",resalte=null;
 const reference=document.createElement("div");reference.className="script-reference";panel.append(reference);
 let referenceUI=null;
 const pageFor=item=>data?.ed.format==="ocr"?item.page:translated?(item.translationPage||null):(item.latinPage||null);
 function setView(next){
  view=next;body.hidden=next==="pdf";facsimile.hidden=next!=="pdf";
  showText.setAttribute("aria-pressed",String(next==="text"));
  showFacsimile.setAttribute("aria-pressed",String(next==="pdf"));
  if(next==="pdf")updatePdf();savePosition();
 }
 function updatePdf(){
  if(!data||view!=="pdf")return;
  const item=data.pages[index];
  const page=Number(pageFor(item))||null;
  const source=new URL(data.ed.pdf,location.href).href;
  const url=source+(page?"#page="+page+"&zoom=page-width":"");
  if(facsimile.dataset.currentPdf!==url){facsimile.src=url;facsimile.dataset.currentPdf=url;}
 }
 showText.addEventListener("click",()=>setView("text"));
 showFacsimile.addEventListener("click",()=>setView("pdf"));
 const state={
  get data(){return data},
  get index(){return index},
  view(){return view},
  context(){const item=data?.pages[index];return {editionId:edition.value,locus:data?.ed.format==="structured"?item?.locus:null,page:item?pageFor(item):null,pageEnd:resalte?.index===index?resalte.pageEnd:null,translation:translated,readerOnly:data?.ed.format==="ocr"}},
  editionId(){return edition.value},
  selectEdition(id){if(!editions[id])return Promise.resolve();if(edition.value===id&&data)return Promise.resolve();edition.value=id;return load()},
  focusReader(){panel.scrollIntoView({behavior:"smooth",block:"start"})},
  seek(i){index=i;show()},
  marcar(t,score,pageEnd){resalte={index,t,score,pageEnd};show()},
  marcarEn(i,t,score,pageEnd){resalte={index:i,t,score,pageEnd}},
  seekLocus(locus){if(!data||data.ed.format!=="structured")return false;const i=data.pages.findIndex(p=>p.locus===locus);if(i<0)return false;index=i;show();return true},
  seekChapter(locus){const prefix=String(locus).split('.').slice(0,2).join('.')+'.';const i=data?.pages.findIndex(p=>p.locus.startsWith(prefix))??-1;if(i<0)return false;index=i;show();return true},
  explain(text){message.textContent=text}
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
  body.lang=translated?({kurilo:"es",fr:"fr",en:"en"}[edition.value]||"es"):"la";
  title.textContent=["I","II","III"][slot]+" · "+editions[edition.value].name.split(" · ").slice(0,2).join(" · ");
  ficha.textContent=FICHA[edition.value]||"";
  body.textContent=translated?item.translation:(item.text||"Esta página carece de OCR legible. Consultar facsímil.");
  let marca=null;
  if(!translated&&resalte&&resalte.index===index&&data.ed.format==="ocr"){
   const r=ubicarTramo(item.text,resalte.t);
   if(r){body.innerHTML=esc(item.text.slice(0,r.a))+'<mark class="st-pasaje" title="Tramo que el cotejo atribuye al locus · '+esc(gradoConcordancia(resalte.score).texto)+'">'+esc(item.text.slice(r.a,r.b))+'</mark>'+esc(item.text.slice(r.b));marca=body.querySelector(".st-pasaje")}
  }
  message.textContent=(data.ed.format==="ocr"?"Página digital ":"Locus ")+item.locus+" · "+(index+1)+" / "+data.pages.length+
   (data.ed.format==="ocr"?" · OCR no corregido"+(resalte?.index===index&&resalte.pageEnd?" · pasaje candidato continúa hasta página digital "+resalte.pageEnd:""):" · Edición indexada por loci"+(pageFor(item)?" · página digital "+pageFor(item):" · sin página PDF vinculada a este texto"));
  showFacsimile.textContent=pageFor(item)?"Ver esta página en PDF":"Ver PDF completo";
  pdf.textContent=pageFor(item)?"Abrir esta página del PDF ↗":"Abrir PDF completo · página del texto sin verificar ↗";
  prev.disabled=index===0;next.disabled=index===data.pages.length-1;
  pdf.href=new URL(data.ed.pdf,location.href).href+(pageFor(item)?"#page="+pageFor(item):"");
  translation.hidden=data.ed.format!=="structured";
  translation.textContent=translated?"Mostrar latín":"Mostrar traducción";
  body.scrollTop=0;
  if(marca)requestAnimationFrame(()=>{body.scrollTop=Math.max(0,marca.offsetTop-body.offsetTop-40)});
  updatePdf();
  recount();
  referenceUI?.refresh();referenceUI?.updateLink();savePosition();
 }
 async function load(){
  const firstLoad=token===0,previousLocus=data?.ed.format==="structured"?data.pages[index]?.locus:null;const current=++token;data=null;index=0;translated=false;title.textContent=["I","II","III"][slot]+" · "+editions[edition.value].name.split(" · ").slice(0,2).join(" · ");facsimile.removeAttribute("src");delete facsimile.dataset.currentPdf;
  message.textContent="Cargando texto indexado de "+editions[edition.value].name+"…";body.textContent="";pdf.href=new URL(editions[edition.value].pdf,location.href).href;
  try{
   const resolved=await loadEdition(edition.value);if(current!==token||!panel.isConnected)return;
   data=resolved;index=openingPageIndex(data.pages,data.ed.format);locus.replaceChildren();
   data.pages.forEach((p,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=p.locus;locus.append(o)});
   const wanted=firstLoad?(initialParams.get("p"+(slot+1))||initialParams.get("locus")):previousLocus;
   if(wanted){const pos=data.pages.findIndex(p=>p.locus===wanted);if(pos>=0)index=pos}
   if(firstLoad)translated=data.ed.format==="structured"&&(initialParams.get("tr"+(slot+1))==="1"||(slot===1&&initialParams.get("translation")==="1"));
   show();if(firstLoad&&initialParams.get("v"+(slot+1))==="pdf")setView("pdf");sincronizarAlAbrir();
  }catch(err){if(current!==token)return;message.textContent="No se pudo cargar el texto de "+editions[edition.value].name+": "+err.message;body.textContent="El índice textual no está disponible. Puede abrir el PDF histórico mediante el enlace inferior.";pdf.href=new URL(editions[edition.value].pdf,location.href).href;pdf.textContent="Abrir PDF de esta edición ↗";setView("text");}
 }
 edition.addEventListener("change",load);
 prev.addEventListener("click",()=>{resalte=null;index=Math.max(0,index-1);show();synchronize(state)});
 next.addEventListener("click",()=>{resalte=null;index=Math.min(data.pages.length-1,index+1);show();synchronize(state)});
 locus.addEventListener("change",()=>{resalte=null;index=Number(locus.value)||0;show();synchronize(state)});
 minus.addEventListener("click",()=>{size=Math.max(13,size-2);body.style.fontSize=size+"px"});
 plus.addEventListener("click",()=>{size=Math.min(32,size+2);body.style.fontSize=size+"px"});
 translation.addEventListener("click",()=>{translated=!translated;show()});
 const runReaderSearch=async ev=>{
  if((ev.type==="keydown"&&ev.key!=="Enter")||!data)return;
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
  const total=counts.reduce((a,b)=>a+b,0),hits=counts.map((n,i)=>n>0?i:-1).filter(i=>i>=0);
  const searchKey=[selectedEdition,translated,mode.value,q].join("|");if(lastSearchKey!==searchKey){lastSearchKey=searchKey;searchCursor=-1}
  searchCursor=hits.length?(searchCursor+1)%hits.length:-1;
  const found=hits[searchCursor]??-1;
  if(found<0){message.textContent="Sin coincidencias en esta edición y lengua. "+(mode.value==="semantic"?"La búsqueda semántica usa equivalencias editoriales, no IA vectorial.":"");return}
  index=found;show();synchronize(state);
  const passages=counts.filter(n=>n>0).length;
  message.textContent+=" · Pasaje "+(searchCursor+1)+" de "+passages+" con coincidencias; "+total+" coincidencia(s) en total. "+
    (concept?"Conceptus: "+concept.id+" · términos "+terms.join(", ")+" (equivalencia editorial, no lematización certificada).":"");
 };
 search.addEventListener("keydown",runReaderSearch);searchNext.addEventListener("click",runReaderSearch);
 if(window.ScriptoriumScholar)referenceUI=window.ScriptoriumScholar.mount(reference,()=>state.context(),{compact:true});
 states.push(state);load();
}
syncToggle.addEventListener("change",()=>{if(syncToggle.checked){const base=states.find(s=>s.data?.ed.format==="structured");if(base)synchronize(base)}savePosition()});
/* Vincula selección superior de PDF con los visores OCR por página. */
const mainSource=document.getElementById("source");
if(mainSource)mainSource.addEventListener("change",()=>{
 const key={"pdf:krohn":"krohn","pdf:rose-1899":"rose"}[mainSource.value];
 if(!key)return;
 const slot=key==="krohn"?0:2;
 states[slot]?.selectEdition(key);
});
window.ScriptTripleCompare={
 async compareEditorialLocus(locus){
  await Promise.all([states[1].selectEdition("kurilo"),states[2].selectEdition("en")]);
  if(!states[1].seekLocus(locus))return {ok:false,reason:"Locus no disponible en V514."};
  const exact=states[2].seekLocus(locus),chapter=exact||states[2].seekChapter(locus);
  synchronize(states[1]);savePosition();
  const notice=exact?"Abierto "+locus+" en V514 y V297. Coincidencia de identificadores; cotejo editorial pendiente.":chapter?"V297 no tiene el identificador "+locus+". Se abre el capítulo correspondiente para comparar su segmentación, sin presumir una omisión.":"V297 no tiene un pasaje enlazable para "+locus+"; consultar manualmente su texto completo.";
  if(!exact)states[2].explain(notice);
  return {ok:true,notice};
 },
 jumpToLocus(locus){
  const matches=states.filter(st=>st.data?.ed.format==="structured");
  if(!matches.length)return {ok:false,reason:"No hay un visor estructurado cargado."};
  const moved=matches.filter(st=>st.seekLocus(locus));
  if(!moved.length)return {ok:false,reason:"Ese locus no aparece en las versiones estructuradas actualmente seleccionadas."};
  synchronize(moved[0]);
  return {ok:true,count:moved.length};
 }
};
})();
