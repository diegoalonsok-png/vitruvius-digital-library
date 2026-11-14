/* Harley MS 2767: supplementary philological search.
 * This searches the EDITORIAL Latin transcription (V514), not the pixels
 * of manuscript H. Material folio correspondence comes only from its evidence
 * register; no locus-to-folio alignment is fabricated.
 */
(()=>{
"use strict";
const byId=id=>document.getElementById(id);
const root=byId("h-search-academic");
if(!root)return;
const input=byId("h-search-query"),mode=byId("h-search-mode"),scope=byId("h-search-scope");
const form=byId("h-search-form"),status=byId("h-search-status"),results=byId("h-search-results"),more=byId("h-search-more");
const VITRUVIAN=[
 {lemma:"symmetria",aliases:["symmetria","simetría","simetria","proporción modular","modular proportion","symmetry","proportion modulaire"],forms:["symmetria","symmetriae","symmetriam","symmetrias","symmetriarum","symmetriis","symmetriarumque"]},
 {lemma:"decor",aliases:["decor","decoro","decorum","appropriateness","propriety","convenance"],forms:["decor","decore","decoris","decorum","decori","decores","decoribus"]},
 {lemma:"eurythmia",aliases:["eurythmia","euritmia","eurythmy","eurythmie"],forms:["eurythmia","eurythmiae","eurythmiam","eurythmias"]},
 {lemma:"ordinatio",aliases:["ordinatio","ordenación","ordenacion","ordering","ordonnance"],forms:["ordinatio","ordinatione","ordinationem","ordinationis","ordinationes","ordinationum","ordinationibus"]},
 {lemma:"dispositio",aliases:["dispositio","disposición","disposicion","arrangement","disposition"],forms:["dispositio","dispositione","dispositionem","dispositionis","dispositiones","dispositionum"]},
 {lemma:"distributio",aliases:["distributio","distribución","distribution"],forms:["distributio","distributione","distributionem","distributionis","distributiones"]},
 {lemma:"firmitas",aliases:["firmitas","solidez","firmeza","stability","firmness","solidité"],forms:["firmitas","firmitatis","firmitate","firmitatem"]},
 {lemma:"utilitas",aliases:["utilitas","utilidad","utility","usefulness","utilité"],forms:["utilitas","utilitatis","utilitate","utilitatem"]},
 {lemma:"venustas",aliases:["venustas","belleza","beauty","beauté"],forms:["venustas","venustatis","venustate","venustatem"]},
 {lemma:"modulus",aliases:["modulus","módulo","modulo","module"],forms:["modulus","modulo","moduli","modulum","modulos","modulorum","modulis"]},
 {lemma:"architectura",aliases:["architectura","arquitectura","architecture"],forms:["architectura","architecturae","architecturam","architecturas"]},
 {lemma:"ratiocinatio",aliases:["ratiocinatio","razonamiento","reasoning","raisonnement"],forms:["ratiocinatio","ratiocinationis","ratiocinationem","ratiocinatione"]},
 {lemma:"fabrica",aliases:["fabrica","práctica constructiva","construction practice","pratique constructive"],forms:["fabrica","fabricae","fabricam","fabricarum"]},
 {lemma:"numen",aliases:["numen","divinidad","divine will","volonté divine"],forms:["numen","numinis","numine","numina","numinum","numinibus"]},
 {lemma:"proportio",aliases:["proportio","proporción","proportion"],forms:["proportio","proportionis","proportione","proportionem","proportiones"]},
 {lemma:"ichnographia",aliases:["ichnographia","icnografía","planta arquitectónica","plan drawing","plan au sol"],forms:["ichnographia","ichnographiae","ichnographiam"]},
 {lemma:"orthographia",aliases:["orthographia","ortografía arquitectónica","alzado","elevation drawing","élévation"],forms:["orthographia","orthographiae","orthographiam"]},
 {lemma:"scaenographia",aliases:["scaenographia","escenografía","perspective","perspectiva"],forms:["scaenographia","scaenographiae","scaenographiam"]}
];
let passages=[],folioMap=null,visible=[],shown=0,lastMatches=[];
const foldChars=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u");
const fold=s=>foldChars(s).replace(/[\u00a0\s]+/gu," ").trim();
function foldMap(text){
 const source=String(text||"");let norm="",map=[];
 for(let i=0;i<source.length;){
  const ch=String.fromCodePoint(source.codePointAt(i));
  let bit=foldChars(ch).replace(/[\u00a0\s]/gu," ");
  if(bit===" "&&(!norm||norm.endsWith(" "))){i+=ch.length;continue}
  for(const c of bit){norm+=c;map.push(i)}
  i+=ch.length;
 }
 map.push(source.length);return{norm,map};
}
const letter=c=>!!c&&/\p{L}/u.test(c);
function occurrences(text,term,strictWord=true){
 const source=String(text||""),target=fold(term);if(!target)return[];
 const {norm,map}=foldMap(source),hits=[];
 let start=0;
 while(start<norm.length){
  const i=norm.indexOf(target,start);if(i<0)break;
  const end=i+target.length;
  if(!strictWord||(!letter(norm[i-1])&&!letter(norm[end]))){
   const a=map[i],b=map[end]??source.length;
   if(b>a)hits.push([a,b]);
  }
  start=i+Math.max(1,target.length);
 }
 return hits;
}
function uniqueRanges(spans){
 const sorted=spans.sort((a,b)=>a[0]-b[0]||b[1]-a[1]),out=[];
 for(const span of sorted){if(out.some(p=>span[0]<p[1]&&span[1]>p[0]))continue;out.push(span)}
 return out;
}
function findConcept(term){
 const key=fold(term);
 return VITRUVIAN.find(c=>[c.lemma,...c.aliases].some(alias=>fold(alias)===key))||null;
}
const citations={visual_rubric:"Rúbrica identificada visualmente",visual_text:"Texto identificado visualmente",collatio_autoral:"Cotejo consignado en la edición",catalogue:"Referencia de catálogo",provisional:"Hipótesis provisional",lectura:"Lectura registrada"};
function evidence(locus){
 if(!folioMap?.entries)return[];
 return folioMap.entries.flatMap(e=>{
  const matches=(e.loci||[]).filter(x=>x.locus===locus);
  return matches.map(m=>({folio:e.folio,image:e.image_number,status:m.status||e.folio_status,notes:m.note||e.notes||""}));
 });
}
function scopePassage(p){
 if(scope.value==="praef")return String(p.locus).includes(".praef.");
 if(/^[1-9]$|^10$/.test(scope.value))return +p.book===+scope.value;
 return true;
}
function search(){
 const q=input.value.trim(),type=mode.value;
 const isLocus=/^(?:[ivx]+|\d{1,2})(?:\.|$)/i.test(q)&&/^[ivx0-9.praef]+$/i.test(q.toLowerCase());
 let locusQuery="";
 if(isLocus){
  const parts=q.toLowerCase().split(".");
  const roman={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
  if(roman[parts[0]])parts[0]=String(roman[parts[0]]);
  locusQuery=parts.join(".");
 }
 const concept=type==="concept"?findConcept(q):null;
 // No query? Listing prefaces is useful; otherwise ask for a term.
 if(!q&&scope.value!=="praef"){
  status.textContent="Escriba una palabra, un concepto, una frase o un locus (por ejemplo, 1.praef.1).";
  results.replaceChildren();more.hidden=true;return;
 }
 const found=[];
 for(const passage of passages){
  if(!scopePassage(passage))continue;
  let hits=[],via="";
  if(q){
   if(type==="locus"||locusQuery&&type!=="phrase"){
    if(String(passage.locus).toLowerCase()===locusQuery||String(passage.locus).toLowerCase().startsWith(locusQuery+".")){
     via="locus";hits=[];
    }else continue;
   }else if(concept){
    hits=uniqueRanges(concept.forms.flatMap(w=>occurrences(passage.latin,w)));
    if(!hits.length)continue;via="concepto: "+concept.lemma;
   }else{
    hits=occurrences(passage.latin,q,!/\s/.test(q));
    if(!hits.length)continue;via=type==="concept"?"forma textual (sin equivalencia en el glosario controlado)":"frase o forma literal";
   }
  }else via="prefacio";
  found.push({passage,hits,via});
 }
 visible=found;shown=0;results.replaceChildren();
 const matches=found.reduce((n,x)=>n+x.hits.length,0);
 status.textContent=found.length+" loci editoriales encontrados · "+matches+" apariciones resaltables"+(concept?" · término controlado: "+concept.lemma:"")+
  ". Los resultados corresponden al texto latino V514, no a una transcripción íntegra del códice H.";
 if(type==="concept"&&q&&!concept){
  const note=document.createElement("p");note.className="h-s-note";
  note.textContent="No se encontró el concepto en el vocabulario controlado. Se aplicó una búsqueda textual literal, sin añadir equivalencias supuestas.";
  results.append(note);
 }
 showMore();
}
function highlightedSpan(text,ranges){
 const box=document.createElement("span");box.lang="la";
 if(!ranges.length){box.textContent=text.slice(0,310)+(text.length>310?"…":"");return box}
 // Show the first three attestations within their original contexts, without changing source.
 for(const [a,b] of ranges.slice(0,3)){
  const p=document.createElement("p");p.className="h-s-excerpt";
  const left=Math.max(0,a-90),right=Math.min(text.length,b+150);
  if(left)p.append(document.createTextNode("…"));
  p.append(document.createTextNode(text.slice(left,a)));
  const mark=document.createElement("mark");mark.textContent=text.slice(a,b);
  p.append(mark,document.createTextNode(text.slice(b,right)));
  if(right<text.length)p.append(document.createTextNode("…"));
  box.append(p);
 }
 if(ranges.length>3){
  const note=document.createElement("small");note.textContent="+"+(ranges.length-3)+" apariciones adicionales en este locus";box.append(note);
 }
 return box;
}
function showMore(){
 const batch=visible.slice(shown,shown+20),fragment=document.createDocumentFragment();
 for(const entry of batch){
  const p=entry.passage,row=document.createElement("article");row.className="h-s-hit";
  const title=document.createElement("h3");title.textContent="Vitr. "+p.locus+(String(p.locus).includes(".praef.")?" · Prefacio":"");
  row.append(title);
  const excerpt=highlightedSpan(p.latin,entry.hits);row.append(excerpt);
  const provenance=document.createElement("p");provenance.className="h-s-provenance";
  provenance.textContent="V514 · "+entry.via+" · "+entry.hits.length+" aparición(es) en el locus";row.append(provenance);
  const links=document.createElement("div");links.className="h-s-actions";
  const editorial=document.createElement("a");editorial.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(p.locus);editorial.textContent="Leer locus latino y traducción";editorial.target="_blank";editorial.rel="noopener";links.append(editorial);
  const col=document.createElement("a");col.href="concordancia-folios.html?locus="+encodeURIComponent(p.locus);col.textContent="Consultar correspondencia con H";col.target="_blank";col.rel="noopener";links.append(col);
  const maps=evidence(p.locus);
  if(maps.length){
   const list=document.createElement("p");list.className="h-s-evidence";
   list.textContent=maps.map(m=>"H · f. "+m.folio+" · "+(citations[m.status]||m.status)).join(" | ")+". La relación de locus no garantiza la posición exacta de las palabras en la imagen.";
   row.append(list);
   for(const map of maps){
    if(!Number.isInteger(map.image)||map.image<1)continue;
    const btn=document.createElement("button");btn.type="button";btn.textContent="Abrir H · f. "+map.folio;
    btn.addEventListener("click",()=>{
     const page=byId("page");page.value=String(map.image);
     page.dispatchEvent(new Event("change",{bubbles:true}));
     byId("folio-identification").scrollIntoView({block:"start",behavior:"smooth"});
    });links.append(btn);
   }
  }else{
   const note=document.createElement("p");note.className="h-s-evidence";
   note.textContent="Sin folio H documentado para este locus: no se atribuye una imagen material por conjetura.";
   row.append(note);
  }
  row.append(links);fragment.append(row);
 }
 results.append(fragment);shown+=batch.length;
 more.hidden=shown>=visible.length;more.textContent="Mostrar más loci ("+(visible.length-shown)+" restantes)";
}
async function init(){
 const sources=await Promise.allSettled([
  fetch("data/structured/recensio-es.json").then(r=>{if(!r.ok)throw Error("texto latino HTTP "+r.status);return r.json()}),
  fetch("data/codex-h/folio-locus-map.json").then(r=>{if(!r.ok)throw Error("mapa H HTTP "+r.status);return r.json()})
 ]);
 if(sources[0].status!=="fulfilled"||!Array.isArray(sources[0].value?.passages)){
  status.textContent="No se pudo cargar el índice latino editorial. El visor IIIF permanece disponible.";
  form.querySelector("button[type=submit]").disabled=true;return;
 }
 passages=sources[0].value.passages.filter(x=>x.locus&&typeof x.latin==="string"&&x.latin.trim());
 if(sources[1].status==="fulfilled")folioMap=sources[1].value;
 status.textContent=passages.length+" loci latinos disponibles. Busque por palabra, frase, prefacio o locus; el visor original se conserva.";
 const params=new URLSearchParams(location.search);
 if(params.get("q")){input.value=params.get("q").slice(0,120);search()}
}
form.addEventListener("submit",e=>{e.preventDefault();search()});
more.addEventListener("click",showMore);
byId("h-search-clear").addEventListener("click",()=>{input.value="";mode.value="concept";scope.value="all";visible=[];results.replaceChildren();more.hidden=true;status.textContent=passages.length+" loci latinos disponibles. Escriba un término para buscar.";});
root.querySelectorAll("[data-h-term]").forEach(btn=>btn.addEventListener("click",()=>{input.value=btn.dataset.hTerm;mode.value="concept";search();}));
scope.addEventListener("change",()=>{if(input.value.trim()||scope.value==="praef")search()});
mode.addEventListener("change",()=>{if(input.value.trim())search()});
init().catch(e=>{console.warn("Búsqueda complementaria H",e);status.textContent="El visor de folios sigue disponible; no se pudo abrir la búsqueda editorial.";});
})();