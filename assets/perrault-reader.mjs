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
 $("pr-prev").disabled=current===0;$("pr-next").disabled=current===pages.length-1;
 $("pr-stage").scrollTop=0;$("pr-stage").scrollLeft=0;
 status.textContent="Cargando imagen "+(current+1)+" de "+pages.length+"…";
 image.hidden=true;
 let alternative=false;
 image.onload=()=>{
  if(serial!==stamp)return;
  baseWidth=Math.min(image.naturalWidth||1000,1200);
  applyImageStyle();image.hidden=false;
  status.textContent="Imagen "+(current+1)+" cargada. "+page.label;
 };
 image.onerror=()=>{
  if(serial!==stamp)return;
  if(!alternative&&page.backup){alternative=true;image.src=page.backup;return}
  status.textContent="El servidor institucional no permitió cargar esta imagen. Consultá el visor oficial de e-rara.";
 };
 if(page.url)image.src=page.url;
 else status.textContent="Esta imagen no tiene una URL IIIF verificable; consultá e-rara.";
 const url=new URL(location.href);
 url.searchParams.set("year",year);url.searchParams.set("image",String(current+1));
 history.replaceState(null,"",url);
}
function navigate(delta){show(current+delta)}
function findPage(){
 const term=normalize($("pr-find").value);
 if(!term){status.textContent="Escribí una etiqueta o número de imagen.";return}
 const direct=term.match(/^(?:imagen|image|pagina|página|page)\s*(\d+)$/);
 if(direct){const n=Number(direct[1]);if(n>=1&&n<=pages.length){show(n-1);return}}
 const hits=pages.map((p,i)=>({i,label:normalize(p.label)})).filter(p=>p.label===term);
 if(hits.length===1){show(hits[0].i);return}
 const partial=pages.map((p,i)=>({i,label:normalize(p.label)})).filter(p=>p.label.includes(term));
 if(partial.length===1){show(partial[0].i);return}
 status.textContent=partial.length?"Hay "+partial.length+" páginas con esa etiqueta; precisá la búsqueda.":"Etiqueta inexistente en el manifiesto. Probá «imagen 50».";
}
async function load(){
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
 const timer=AbortSignal.timeout(22000);
 try{
  const response=await fetch(copy.manifest,{headers:{Accept:"application/json,application/ld+json"},signal:timer});
  if(!response.ok)throw new Error("HTTP "+response.status);
  const body=await response.json();
  const canvases=body.sequences?.[0]?.canvases||body.items||body.canvases||[];
  if(!Array.isArray(canvases)||!canvases.length)throw new Error("Manifiesto sin imágenes");
  pages=canvases.map((c,i)=>({...canvasImage(c),label:readLabel(c.label)||"Imagen "+(i+1)}));
  $("pr-number").max=String(pages.length);$("pr-number").disabled=false;
  $("pr-next").disabled=false;$("pr-find").disabled=false;
  const number=Number(requested.get("image"))||1;
  show(Math.max(0,Math.min(pages.length-1,number-1)));
 }catch(err){
  status.textContent="No se pudo abrir el índice IIIF ("+err.message+"). La edición sigue disponible en el visor oficial de ETH-Bibliothek / e-rara.";
 }
}
$("pr-year").addEventListener("change",()=>{location.href="perrault-1673.html?year="+encodeURIComponent($("pr-year").value)});
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
