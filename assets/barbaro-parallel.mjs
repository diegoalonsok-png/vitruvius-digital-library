/* Barbaro 1567 parallel reader: Italian and Latin historical print editions.
   Image sequence is digital and is not a critical foliation concordance. */
const $=id=>document.getElementById(id);
const config={
 it:{file:"data/iiif/barbaro-1567.json",manifest:"https://www.e-rara.ch/i3f/v20/6125674/manifest",record:"https://doi.org/10.3931/e-rara-19468",label:"Italiano"},
 la:{file:"data/iiif/barbaro-latin-1567.json",manifest:"https://www.e-rara.ch/i3f/v20/6105281/manifest",record:"https://doi.org/10.3931/e-rara-19438",label:"Latín"}
};
const state={it:{pages:[],number:1,zoom:100},la:{pages:[],number:1,zoom:100}};
const escaping=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function textLabel(x){let t=x.iiif_label||x.label||"";return typeof t==="string"?t:Object.values(t).flat().join(" · ");}
function getPages(doc){
 if(doc.canvases)return doc.canvases;
 const list=doc.sequences?.[0]?.canvases||doc.items||[];
 return list.map((c,i)=>{
  const body=c.images?.[0]?.resource||c.items?.[0]?.items?.[0]?.body||{};
  let s=body.service||body.services||{};
  if(Array.isArray(s))s=s[0]||{};
  const id=String(s["@id"]||s.id||"").replace(/\/$/,"");
  return {page:i+1,iiif_label:textLabel(c),image_url:id?id+"/full/1200,/0/default.jpg":body["@id"]||body.id||""};
 });
}
async function fetchPages(which){
 let errors=[];
 for(const uri of [config[which].file,config[which].manifest]){
  try{
   let response=await fetch(uri,{headers:{"Accept":"application/json,application/ld+json"}});
   if(!response.ok)throw Error("HTTP "+response.status);
   const list=getPages(await response.json());
   if(!list.length)throw Error("manifiesto sin páginas");
   state[which].pages=list;
   $(which+"-page").max=list.length;
   $(which+"-status").textContent=list.length+" imágenes digitales indexadas ("+(uri===config[which].file?"índice GitHub":"manifiesto institucional")+").";
   loadPage(which,1);
   return;
  }catch(e){errors.push(e.message);}
 }
 $(which+"-status").textContent="No fue posible cargar la edición: "+errors.join("; ")+". Consultar fuente institucional.";
}
function urls(c){
 // El índice contiene rutas locales propuestas, pero la carpeta
 // images/barbaro-1567 no se encuentra publicada. No solicitar 404
 // cuando existe la URL IIIF de la institución conservadora.
 return [...new Set([c.image_url].filter(Boolean))];
}
function loadPage(which,number,origin="user"){
 const s=state[which];
 number=Math.max(1,Math.min(s.pages.length||1,Math.round(Number(number)||1)));
 s.number=number;
 $(which+"-page").value=number;
 const canvas=s.pages[number-1];if(!canvas)return;
 const image=$(which+"-image"),label=$(which+"-label"),status=$(which+"-status");
 label.textContent="Imagen digital "+number+" / "+s.pages.length+" · "+textLabel(canvas)+" · folio tipográfico por cotejar";
 image.alt=config[which].label+" · facsímil digital "+number;
 const candidates=urls(canvas);let at=0;
 const serial=String(number)+":"+Date.now();image.dataset.serial=serial;
 image.onload=()=>{if(image.dataset.serial===serial){image.hidden=false;status.textContent="Imagen "+number+" cargada.";setZoom(which,s.zoom);}};
 image.onerror=()=>{
  if(image.dataset.serial!==serial)return;
  at++;
  if(at<candidates.length){image.src=candidates[at];return;}
  image.hidden=true;status.textContent="La imagen "+number+" no se pudo cargar. Consultar el facsímil institucional.";
 };
 image.hidden=false;
 if(candidates.length){image.src=candidates[0];status.textContent="Abriendo imagen "+number+"…";}
 else{image.hidden=true;status.textContent="Sin reproducción identificada.";}
 const link=$(which+"-direct");link.href=config[which].record;
 // Aviso para la sincronización y el resaltado (assets/barbaro-sync.mjs).
 document.dispatchEvent(new CustomEvent("barbaro:page",{detail:{which,number,origin}}));
}
function step(which,amount){loadPage(which,state[which].number+amount);}
function setZoom(which,value){
 let s=state[which];s.zoom=Math.max(50,Math.min(250,Math.round(Number(value)||100)));
 const img=$(which+"-image"),box=img.parentElement?.classList.contains("hl-wrap")?img.parentElement:null;
 if(box){box.style.width=s.zoom+"%";img.style.width="100%"}else img.style.width=s.zoom+"%";
 $(which+"-zoom").value=s.zoom;
 $(which+"-zoom-output").textContent=s.zoom+"%";
}
function init(which){
 $(which+"-previous").addEventListener("click",()=>step(which,-1));
 $(which+"-next").addEventListener("click",()=>step(which,1));
 $(which+"-open").addEventListener("click",()=>loadPage(which,$(which+"-page").value));
 $(which+"-page").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();loadPage(which,e.target.value);}});
 $(which+"-zoom").addEventListener("input",e=>setZoom(which,e.target.value));
 $(which+"-save").addEventListener("click",()=>{const img=$(which+"-image");if(img.currentSrc)window.open(img.currentSrc,"_blank","noopener");});
 fetchPages(which);
}
init("it");init("la");
$("parallel-home").addEventListener("click",()=>{loadPage("it",1,"home");loadPage("la",1,"home");});
window.BarbaroParallel={loadPage,state,setZoom};
document.dispatchEvent(new CustomEvent("barbaro:ready"));
