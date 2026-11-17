/* Shared compact bibliography explorer for the home page and Bibliotheca.
   Uses the per-work indexed-source inventory; never treats an R2 facsimile
   registration as proof of a reviewed, searchable Latin/Greek transcription. */
(()=>{"use strict";
const URL="data/classics-corpus/indexation-roadmap-222.json";
const labels={local:"Original griego o latino indexado"};
let dataPromise=null;
function catalog(){
 if(!dataPromise)dataPromise=Promise.all([
  fetch(URL).then(r=>{if(!r.ok)throw Error("Inventario: HTTP "+r.status);return r.json()}),
  fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro editorial: HTTP "+r.status);return r.json()}),
  fetch("data/bibliotheca-expansion-publicada-2026-11-16.json").then(r=>{if(!r.ok)throw Error("Catálogo complementario: HTTP "+r.status);return r.json()}),
  fetch("data/index/classics/manifest.json").then(r=>{if(!r.ok)throw Error("Índice léxico: HTTP "+r.status);return r.json()})
 ]).then(([j,registry,supplement,lexical])=>{
  if(!Array.isArray(j.items)||j.items.length!==j.targetWorks)throw Error("Inventario de obras inconsistente");
  const sources=new Map();
  for(const entry of registry.entries||[]){
   if(!entry.workId||!["json-passages","structured-bilingual","html-text"].includes(entry.format))continue;
   const valid=entry.format==="html-text"
    ? /^corpus\/[a-z0-9/_-]+\.html$/.test(entry.reader||entry.path||"")
    : /^data\/(?:classics-corpus|structured|lexicon\/fontes)\/[a-z0-9/_-]+\.json$/.test(entry.path||"")||
      /^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/[a-z0-9_-]+\.json$/.test(entry.path||"");
   if(valid){if(!sources.has(entry.workId))sources.set(entry.workId,[]);sources.get(entry.workId).push(entry)}
  }
  const lexicalIds=new Set((lexical.index||[]).filter(e=>e.lang==="grc"||e.lang==="la").map(e=>e.id+"|"+e.lang));
  const hasIndexedOriginal=(id,lang)=>["la","grc"].includes(lang)&&lexicalIds.has(id+"|"+lang)&&(sources.get(id)||[]).some(e=>e.language===lang);
  const merged=new Map(j.items.map(x=>[x.id,{id:x.id,author:x.author||"Autor no indicado",title:x.title||x.id,kind:"local",language:x.originalLanguage||"",originalIndexed:hasIndexedOriginal(x.id,x.originalLanguage),indexedLanguages:hasIndexedOriginal(x.id,x.originalLanguage)?[x.originalLanguage]:[],readers:sources.get(x.id)||[]}]));
  // Supplementary works are fully catalogued, not anonymous "registry-only" rows.
  // Search results are labelled indexed only when the actual lexical manifest agrees.
  for(const w of supplement.works||[]){
   if(!w?.id||merged.has(w.id))continue;
   const lang=w.language;
   const originalIndexed=hasIndexedOriginal(w.id,lang);
   merged.set(w.id,{id:w.id,author:w.author||"Autor no indicado",title:w.title||w.id,
    kind:"local",language:lang,originalIndexed,
    indexedLanguages:originalIndexed?[lang]:[],readers:sources.get(w.id)||[]});
  }
  // An uncatalogued text must remain discoverable, but is never passed off as
  // having an authenticated scholarly fiche or a verified lexical index.
  for(const [id,versions] of sources){
   if(merged.has(id))continue;
   const ancient=versions.find(e=>["la","grc"].includes(e.language));
   const first=ancient||versions[0];
   merged.set(id,{id,author:first.author||"Autor no indicado",title:first.title||id,
    kind:"pending",language:ancient?.language||"",originalIndexed:false,indexedLanguages:[],readers:versions});
  }
  // Show only original Greek/Latin indexed in BOTH lexical manifest and source registry.
  // Catalog-only, external searches, OCR facsimiles and translations are never shown as originals.
  // Preserve rigorous indexed counts, but make every catalogued author and work discoverable.
  // Missing an exact original-index certificate must not mean "author not found".
  const all=[...merged.values()];
  return {indexed:all.filter(w=>w.originalIndexed),all};
 }).catch(e=>{dataPromise=null;throw e});
 return dataPromise;
}
function add(tag,cls,text,parent){const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;parent.append(el);return el}
function mount(host){
 if(host.dataset.indexExplorerMounted)return;
 host.dataset.indexExplorerMounted="1";
 host.classList.add("vdl-works-explorer");
 const panel=add("div","vdl-works-explorer-panel",null,host);
 const heading=add("label","vdl-works-explorer-heading","Buscar un libro para leer",panel);
 const toolbar=add("div","vdl-works-filterbar",null,panel);
 const search=add("input","vdl-works-search",null,toolbar);
 search.type="search";search.placeholder="Autor o título: Homero, Platón, Eneida…";
 search.autocomplete="off";search.setAttribute("aria-label","Buscar una obra por autor o título");
 heading.append(search);toolbar.remove();
 const count=add("p","vdl-works-result-count","Escribí un autor o título para abrir el lector.",panel);count.setAttribute("role","status");
 const listing=add("div","vdl-works-list",null,panel);listing.setAttribute("role","list");listing.hidden=true;
 let items=null;
 const normalize=x=>String(x||"").normalize("NFD").replace(/\\p{M}/gu,"").toLowerCase().trim();
 const aliases={vitruvius:"vitruvio vitruve",caesar:"julio cesar julius caesar",cicero:"ciceron cicerone",plinius:"plinio",vergilius:"virgilio virgil",horatius:"horacio",ovidius:"ovidio",homer:"homero homere",plato:"platon",aristoteles:"aristotle aristote",strabo:"estrabon"};
 function score(w,q){
  const author=normalize(w.author),title=normalize(w.title),id=normalize(w.id.replaceAll("-"," "));
  const alias=Object.entries(aliases).filter(([key])=>author.includes(key)||id.includes(key)).map(([,v])=>v).join(" ");
  if(author===q||title===q)return 150;
  if(author.startsWith(q)||title.startsWith(q))return 110;
  if(alias.split(" ").some(x=>x.startsWith(q)))return 95;
  if(author.split(/\\s+/).some(x=>x.startsWith(q)))return 85;
  if(title.split(/\\s+/).some(x=>x.startsWith(q)))return 75;
  if(q.length>1&&(author.includes(q)||alias.includes(q)))return 55;
  if(q.length>1&&(title.includes(q)||id.includes(q)))return 40;
  return -1;
 }
 function render(){
  if(!items)return;
  const q=normalize(search.value);
  listing.replaceChildren();
  if(!q){listing.hidden=true;count.textContent="Escribí un autor o título para abrir el lector.";return}
  const found=items.all.map((item,i)=>({item,i,rank:score(item,q)})).filter(x=>x.rank>=0)
   .sort((a,b)=>b.rank-a.rank||Number(b.item.originalIndexed)-Number(a.item.originalIndexed)||a.i-b.i);
  listing.hidden=!found.length;
  for(const {item} of found.slice(0,12)){
   const readers=item.readers||[];
   const source=readers.find(x=>x.language===item.language)||readers.find(x=>["la","grc"].includes(x.language))||readers[0];
   const path=source?.reader||source?.path;
   const html=source?.format==="html-text"&&/^corpus\\/[a-z0-9/_-]+\\.html$/.test(path||"");
   const structured=source&&["json-passages","structured-bilingual"].includes(source.format);
   const canRead=item.originalIndexed&&(html||structured);
   const row=add("div","vdl-works-row",null,listing);row.setAttribute("role","listitem");
   const link=add("a","vdl-works-name",item.author+" · "+item.title,row);
   link.href=canRead?(html?path:"classics-text-reader.html?"+new URLSearchParams({work:item.id,lang:source.language}))
    :"classics-work-record.html?"+new URLSearchParams({work:item.id});
   link.title=canRead?"Abrir lector de la obra":"Ver ficha académica y fuentes disponibles";
  }
  count.textContent=found.length?found.length+" coincidencia"+(found.length===1?"":"s")+(found.length>12?" · primeras 12":"")+". Elegí una obra para abrirla.":"No se encontraron obras con ese autor o título.";
 }
 async function load(){
  if(items)return;
  count.textContent="Cargando catálogo…";
  try{items=await catalog();render()}
  catch(e){count.textContent="El catálogo no se pudo cargar. Abrí Bibliotheca Graeca et Latina."}
 }
 search.addEventListener("focus",load,{once:true});
 search.addEventListener("input",()=>{if(items)render();else load()});
}
function init(){
 document.querySelectorAll("[data-vdl-works-explorer]").forEach(mount);
 // This number is computed from BOTH the source registry and the published
 // inverted lexical index; never infer it from the number of catalogue cards.
 const display=document.querySelector('[data-cifra="obrasConTextoIndexado"]');
 if(display){
  const refresh=()=>catalog().then(items=>{
   display.textContent=String(items.indexed.length);
   display.title="Obras con original griego o latino comprobado en el registro y en el índice léxico";
  }).catch(()=>{display.textContent="—";display.title="Recuento no disponible: no se muestran datos antiguos como actuales."});
  if("requestIdleCallback" in window)window.requestIdleCallback(refresh,{timeout:2800});
  else setTimeout(refresh,300);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();