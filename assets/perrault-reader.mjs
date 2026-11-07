/* Perrault 1673 and 1684: paginated IIIF viewing of documented e-rara copies.
 * This is not an OCR transcription or an assertion of canonical folio alignment.
 * Images are loaded one at a time from the institutional image server.
 */
const $=id=>document.getElementById(id);
const COPIES={
 "1673":{
  manifest:"https://www.e-rara.ch/i3f/v20/16797458/manifest",
  catalogue:"https://www.e-rara.ch/zut/content/titleinfo/16797458",
  doi:"https://doi.org/10.3931/e-rara-61952",
  shelfmark:"ETH-Bibliothek Zürich, Rar 264",
  backups:[{
   manifest:"https://www.e-rara.ch/i3f/v20/6152828/manifest",
   catalogue:"https://www.e-rara.ch/oec/content/titleinfo/6152828",
   doi:"https://doi.org/10.3931/e-rara-19627",
   shelfmark:"Stiftung Bibliothek Werner Oechslin, A05c; app. 47"
  }],
  description:"Les Dix Livres d'Architecture de Vitruve · première édition française commentée · Paris, Jean Baptiste Coignard, 1673"
 },
 "1684":{
  manifest:"https://www.e-rara.ch/i3f/v20/14701133/manifest",
  catalogue:"https://www.e-rara.ch/zut/content/titleinfo/14701133",
  doi:"https://doi.org/10.3931/e-rara-54059",
  shelfmark:"ETH-Bibliothek Zürich, Rar 9852",
  description:"Les Dix Livres d'Architecture de Vitruve · seconde édition revue, corrigée et augmentée · Paris, Jean Baptiste Coignard, 1684"
 }
};
const requested=new URLSearchParams(location.search);
const year=Object.hasOwn(COPIES,requested.get("year"))?requested.get("year"):"1673";
const copy=COPIES[year];let pages=[],current=0,stamp=0,baseWidth=1000;
const image=$("pr-image"),status=$("pr-status");
let localMirror=new Set();
async function readLocalMirror(){
 try{
  const r=await fetch("data/perrault-local-1673.json",{cache:"no-cache"});
  if(!r.ok)return;
  const d=await r.json();
  if(d.year==="1673"&&d.source===COPIES["1673"].manifest&&d.image_count===370)
   localMirror=new Set((d.available||[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=370));
 }catch{}
}
function localPage(n){return "images/perrault/1673/page-"+String(n).padStart(4,"0")+".webp";}
// Cache only the exact verified copy's IIIF page index (not page images).
// This avoids re-downloading large manifests on repeat visits.
const indexCacheKey="vitruvia-perrault-iiif-index-v2-"+year;
function readCachedIndex(){
 try{
  const c=JSON.parse(localStorage.getItem(indexCacheKey)||"null");
  if(c?.manifest!==copy.manifest||c?.year!==year||!Array.isArray(c.pages)||
     c.pages.length<30||c.pages.length>1800)return null;
  if(!c.pages.every(p=>p&&validHttps(p.url)&&typeof p.label==="string"&&p.label.length<400))return null;
  return c.pages;
 }catch{return null}
}
function storeCachedIndex(pagesToCache){
 try{
  localStorage.setItem(indexCacheKey,JSON.stringify({
   manifest:copy.manifest,year,pages:pagesToCache,created:new Date().toISOString()
  }));
 }catch{/* Private browsing and quota restrictions should not block reading. */}
}
const LOCAL_INDEXES={
 "1673":{path:"data/perrault-iiif-pages.json",count:370},
 "1684":{path:"data/perrault-1684-iiif-pages.json",count:390}
};
// These files contain verified IIIF image IDs, not a fabricated printed foliation.
// Only one image is requested when its numbered button is selected.
async function loadLocalIndex(){
 const index=LOCAL_INDEXES[year];
 const response=await fetch(index.path,{cache:"force-cache"});
 if(!response.ok)throw Error("Índice local HTTP "+response.status);
 const saved=await response.json();
 if(saved.source!==copy.manifest||!Array.isArray(saved.pages)||saved.pages.length!==index.count)
  throw Error("El índice local no corresponde al ejemplar "+year);
 if(!saved.pages.every(x=>/^\d+$/.test(String(x.id))&&
   typeof x.fallback==="string"&&
   /^https:\/\/www\.e-rara\.ch\/download\/webcache\/1000\/\\d+$/.test(x.fallback)&&
   x.fallback.endsWith("/"+x.id)))
  throw Error("Índice local contiene identificadores de imagen no válidos");
 const folios=saved.pages.map((x,i)=>({
  url:"https://www.e-rara.ch/i3f/v20/"+x.id+"/full/1100,/0/default.jpg",
  backup:x.fallback,
  label:"Imagen digital "+(i+1)+(x.folio?" · etiqueta "+String(x.folio).slice(0,80):"")
 }));
 activatePages(folios);
 status.textContent="Índice local verificado: "+folios.length+" imágenes. Selecciona una y solo se descargará esa página.";
 return true;
}
function renderFolioGrid(){
 // One folio catalogue only: the revised 1684 edition.
 
 const grid=$("pr-folio-grid");
 $("pr-folios").hidden=false;
 grid.replaceChildren();
 const frag=document.createDocumentFragment();
 for(let i=0;i<pages.length;i++){
  const b=document.createElement("button");
  b.type="button";b.className="pr-folio-button";b.dataset.index=String(i);
  b.textContent=String(i+1);b.title=pages[i].label;
  b.setAttribute("aria-label","Abrir "+pages[i].label);
  if(i===current){b.classList.add("is-current");b.setAttribute("aria-current","page")}
  frag.appendChild(b);
 }
 grid.appendChild(frag);
 $("pr-folio-total").textContent=pages.length+" imágenes digitales disponibles · índice completo sin precargar las fotografías.";
}
$("pr-folio-grid").addEventListener("click",e=>{
 const button=e.target.closest("button[data-index]");
 if(button)show(Number(button.dataset.index));
});
function activatePages(nextPages){
 pages=nextPages;
 renderFolioGrid();
 $("pr-number").max=String(pages.length);
 $("pr-number").disabled=false;
 $("pr-next").disabled=false;
 $("pr-find").disabled=false;
 const number=Number(requested.get("image"))||1;
 show(Math.max(0,Math.min(pages.length-1,number-1)));
}
const normalize=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/\s+/g," ").trim();
const readLabel=label=>typeof label==="string"?label:(label?.none?.[0]||label?.fr?.[0]||label?.en?.[0]||Object.values(label||{}).flat()[0]||"");
const validHttps=url=>{try{return new URL(url).protocol==="https:"}catch{return false}};
function canvasImage(canvas){
 const entry=canvas?.images?.[0]||canvas?.items?.[0]?.items?.find(x=>x.body);
 const body=Array.isArray(entry?.body)?entry.body[0]:entry?.resource||entry?.body;
 const service=Array.isArray(body?.service)?body.service[0]:body?.service;
 const root=typeof service==="string"?service:(service?.id||service?.["@id"]);
 const fallback=body?.id||body?.["@id"]||null;
 const derived=root&&validHttps(root)?String(root).replace(/\/$/,"")+"/full/1100,/0/default.jpg":null;
 const direct=validHttps(fallback)?fallback:null;
 return {url:derived||direct,backup:derived&&direct&&derived!==direct?direct:null};
}
function applyImageStyle(){
 const zoom=Number($("pr-zoom").value);
 image.style.width=Math.max(250,Math.round(baseWidth*zoom/100))+"px";
 image.style.filter="brightness("+$("pr-brightness").value+"%) contrast("+$("pr-contrast").value+"%)"+
  ($("pr-grayscale").checked?" grayscale(1)":"")+
  ($("pr-negative").checked?" invert(1) hue-rotate(180deg)":"");
 $("pr-zoom-value").textContent=zoom+" %";
}
function show(n){
 if(!pages.length)return;
 current=Math.max(0,Math.min(pages.length-1,Number(n)||0));
 const page=pages[current],serial=++stamp;
 $("pr-number").value=String(current+1);
 $("pr-counter").textContent=(current+1)+" / "+pages.length;
 $("pr-label").textContent=page.label;
 const currentButton=$("pr-folio-grid").querySelector(".is-current");
 if(currentButton){currentButton.classList.remove("is-current");currentButton.removeAttribute("aria-current")}
 const targetButton=$("pr-folio-grid").querySelector(`button[data-index="${current}"]`);
 if(targetButton){targetButton.classList.add("is-current");targetButton.setAttribute("aria-current","page")}
 $("pr-prev").disabled=current===0;$("pr-next").disabled=current===pages.length-1;
 $("pr-stage").scrollTop=0;$("pr-stage").scrollLeft=0;
 status.textContent="Cargando imagen "+(current+1)+" de "+pages.length+"…";
 image.hidden=true;
 let alternative=false;
 const isLocal=localMirror.has(current+1);
 image.onload=()=>{
  if(serial!==stamp)return;
  baseWidth=Math.min(image.naturalWidth||1000,1200);
  applyImageStyle();image.hidden=false;
  status.textContent="Imagen "+(current+1)+" cargada. "+page.label;
 };
 image.onerror=()=>{
  if(serial!==stamp)return;
  if(!alternative){alternative=true;image.src=isLocal?page.url:(page.backup||page.url);return}
  status.textContent="El servidor institucional no permitió cargar esta imagen. Consulta el visor oficial de e-rara.";
 };
 if(page.url)image.src=isLocal?localPage(current+1):page.url;
 else status.textContent="Esta imagen no tiene una URL IIIF verificable; consulta e-rara.";
 const url=new URL(location.href);
 url.searchParams.set("year",year);url.searchParams.set("image",String(current+1));
 history.replaceState(null,"",url);
}
function navigate(delta){show(current+delta)}
function findPage(){
 const term=normalize($("pr-find").value);
 if(!term){status.textContent="Escribe una etiqueta o número de imagen.";return}
 const direct=term.match(/^(?:imagen|image|pagina|página|page)\s*(\d+)$/);
 if(direct){const n=Number(direct[1]);if(n>=1&&n<=pages.length){show(n-1);return}}
 const hits=pages.map((p,i)=>({i,label:normalize(p.label)})).filter(p=>p.label===term);
 if(hits.length===1){show(hits[0].i);return}
 const partial=pages.map((p,i)=>({i,label:normalize(p.label)})).filter(p=>p.label.includes(term));
 if(partial.length===1){show(partial[0].i);return}
 status.textContent=partial.length?"Hay "+partial.length+" páginas con esa etiqueta; precisá la búsqueda.":"Etiqueta inexistente en el manifiesto. Prueba «imagen 50».";
}
async function load(){
 await readLocalMirror();
 $("pr-year").value=year;
 $("pr-title").textContent="Scriptorium Perrault · "+year;
 $("pr-edition").textContent=copy.description;
 $("pr-shelfmark").textContent=copy.shelfmark;
 $("pr-source").href=copy.catalogue;
 $("pr-doi").href=copy.doi;
 $("pr-manifest").href=copy.manifest;
 for(const y of Object.keys(COPIES)){
  const option=document.querySelector('option[value="'+y+'"]');if(option)option.textContent="Perrault "+y;
 }
 try{
  // Fast path: the complete, edition-specific folio index ships with GitHub Pages.
  // No large external manifest is requested for the two verified copies.
  try{
   if(await loadLocalIndex())return;
  }catch(localError){
   status.textContent="Índice local no disponible ("+localError.message+"); intentando índice institucional…";
  }
  const cached=readCachedIndex();
  if(cached){
   activatePages(cached);
   status.textContent="Índice IIIF guardado en este navegador. La imagen se solicita al servidor institucional.";
   return;
  }
  status.textContent="Solicitando índice IIIF de "+year+" a e-rara… Puedes usar mientras tanto el enlace al visor oficial.";
  // A second public-domain 1673 copy is available from Werner Oechslin.
  // Probe both authenticated institutional manifests, but load only one
  // image per page. Record which institution actually supplied the copy.
  const sources=[copy,...(copy.backups||[])];
  const {source,canvases}=await Promise.any(sources.map(async source=>{
   const response=await fetch(source.manifest,{
    headers:{Accept:"application/json,application/ld+json"},
    signal:AbortSignal.timeout(16000)
   });
   if(!response.ok)throw new Error("IIIF "+response.status);
   const body=await response.json();
   const canvases=body.sequences?.[0]?.canvases||body.items||body.canvases||[];
   if(!Array.isArray(canvases)||canvases.length<2)throw new Error("Manifiesto sin imágenes");
   return {source,canvases};
  }));
  if(source!==copy){
   $("pr-shelfmark").textContent=source.shelfmark;
   $("pr-source").href=source.catalogue;
   $("pr-doi").href=source.doi;
   $("pr-manifest").href=source.manifest;
  }
  pages=canvases.map((c,i)=>({...canvasImage(c),label:readLabel(c.label)||"Imagen "+(i+1)}));
  // Do not cache an alternate 1673 institution under the primary source key.
  if(source===copy&&pages.every(p=>validHttps(p.url)))storeCachedIndex(pages);
  activatePages(pages);
 }catch(err){
  // The official IIIF host may temporarily reject cross-origin requests or time out.
  // The 1673 copy has an independently documented local index of real IIIF image IDs.
  // Only use it for its exact verified source, never for the distinct 1684 edition.
  if(year==="1673"){
   try{
    const response=await fetch("data/perrault-iiif-pages.json");
    if(!response.ok)throw Error("índice local HTTP "+response.status);
    const saved=await response.json();
    if(saved.source!==copy.manifest||!Array.isArray(saved.pages)||saved.pages.length!==370||
      !saved.pages.every(p=>/^\d+$/.test(String(p.id))&&validHttps(p.fallback)))
      throw Error("el índice alternativo no pasó validación");
    pages=saved.pages.map(p=>({
     url:"https://www.e-rara.ch/i3f/v20/"+p.id+"/full/1100,/0/default.jpg",
     backup:p.fallback,
     label:"Imagen IIIF "+p.folio+" · referencia PDF provisional "+p.page
    }));
    $("pr-number").max=String(pages.length);$("pr-number").disabled=false;
    $("pr-next").disabled=false;$("pr-find").disabled=false;
    const number=Number(requested.get("image"))||1;
    show(Math.max(0,Math.min(pages.length-1,number-1)));
    status.textContent="Índice IIIF de contingencia (370 imágenes verificadas). La fuente institucional no respondió; se conservan el enlace y la atribución.";
    return;
   }catch(localErr){
    status.textContent="El manifiesto y el índice alternativo no están disponibles ("+localErr.message+"). Consulta el ejemplar oficial en e-rara.";
    return;
   }
  }
  status.textContent="No se pudo abrir el índice IIIF ("+err.message+"). La edición sigue disponible en el visor oficial de ETH-Bibliothek / e-rara.";
 }
}

$("pr-prev").addEventListener("click",()=>navigate(-1));
$("pr-next").addEventListener("click",()=>navigate(1));
$("pr-go").addEventListener("click",()=>show(Number($("pr-number").value)-1));
$("pr-number").addEventListener("keydown",e=>{if(e.key==="Enter"){$("pr-go").click()}});
$("pr-find-button").addEventListener("click",findPage);
$("pr-find").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();findPage()}});
for(const k of ["pr-zoom","pr-brightness","pr-contrast","pr-grayscale","pr-negative"])
 $(k).addEventListener("input",applyImageStyle);
document.addEventListener("keydown",e=>{
 if(["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName))return;
 if(e.key==="ArrowRight")navigate(1);
 if(e.key==="ArrowLeft")navigate(-1);
});
load();
