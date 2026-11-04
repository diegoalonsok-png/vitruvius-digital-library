/* Vitruvia: broad documentary image discovery via open Wikimedia APIs.
   No commercial image scraping. Every item links to its source and rights. */
(()=>{"use strict";
const section=document.getElementById("vitruvia-images"),grid=document.getElementById("vitruvia-image-grid"),actions=document.getElementById("vitruvia-image-actions");
const status=document.getElementById("image-results-status"),heading=document.getElementById("image-results-title");
if(!section||!grid||!actions||!status||!heading)return;
let active=0,controller=null;
const create=(parent,tag,cls,content)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(content!==undefined)el.textContent=content;parent.append(el);return el;
};
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const stop=new Set("de del la las los el una un the and for with images image fotos foto fotografias photography photos paintings painting cuadros pintura obras file".split(" "));
const tokens=s=>fold(s).split(/\s+/).filter(x=>x.length>2&&!stop.has(x));
const distinct=a=>[...new Set(a.map(x=>String(x||"").trim()).filter(Boolean))];
const genericImageWords=/\b(pinturas?|cuadros?|paintings?|artworks?|obras?|retratos?|portraits?|fotografias?|photos?|pictures?|images?|imagenes|sculptures?|esculturas?|estatuas?|statues?)\b/;
const paintingWords=/\b(pinturas?|cuadros?|paintings?|artworks?|obras?)\b/;
const photoWords=/\b(fotografias?|photos?|pictures?|imagenes|images?)\b/;
const safeLink=u=>{try{const x=new URL(u,location.href);return x.protocol==="https:"?x.href:null}catch{return null}};
const locale=(es,en,fr)=>document.documentElement.lang==="en"?en:document.documentElement.lang==="fr"?fr:es;
function external(label,url){const a=create(actions,"a","",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer"}
function reset(){active++;if(controller)controller.abort();controller=null;section.hidden=true;grid.replaceChildren();actions.replaceChildren();status.textContent=""}
async function getJSON(params,signal){
 const r=await fetch("https://commons.wikimedia.org/w/api.php?"+new URLSearchParams({...params,format:"json",origin:"*"}),{signal,headers:{Accept:"application/json"}});
 if(!r.ok)throw Error("Wikimedia Commons HTTP "+r.status);
 const d=await r.json();if(d.error)throw Error(d.error.info||d.error.code);return d;
}
function imageParams(extra){
 return {...extra,prop:"imageinfo",iiprop:"url|mime|extmetadata",iiurlwidth:"900"};
}
function matchingScore(page,aliases,query){
 const name=fold(page.title||"").replace(/^file /,"").replace(/\b(jpg|jpeg|png|webp|svg|tiff)\b/g,"");
 const titleTokens=tokens(name),desc=fold(page.imageinfo?.[0]?.extmetadata?.ImageDescription?.value||"").replace(/<[^>]*>/g," ");
 let score=0;
 for(const alias of aliases){
  const phrase=fold(alias),terms=tokens(alias);
  if(!phrase||!terms.length)continue;
  const overlap=terms.filter(w=>titleTokens.includes(w)||name.includes(w)).length/terms.length;
  score=Math.max(score,(name.includes(phrase)?75:0)+Math.round(overlap*85)+(desc.includes(phrase)?15:0));
 }
 const qtokens=tokens(query);
 if(qtokens.length&&qtokens.every(w=>name.includes(w)))score=Math.max(score,65);
 if(page.fromTrustedCategory)score+=90;
 return score;
}
function displayItem(item){
 const button=create(grid,"button","vitruvia-image-card");
 button.type="button";button.setAttribute("aria-label",locale("Ampliar ","View ","Agrandir ")+item.name);
 const img=create(button,"img");img.src=item.preview;img.alt=item.name;img.loading="lazy";img.decoding="async";
 const caption=create(button,"div","image-caption",item.name);
 create(caption,"span","image-origin",item.credit);
 button.addEventListener("click",()=>showLarge(item));
}
function viewer(){
 let dialog=document.getElementById("vitruvia-image-large");
 if(dialog)return dialog;
 dialog=document.createElement("dialog");dialog.id="vitruvia-image-large";dialog.className="vitruvia-image-large";
 const content=create(dialog,"div","vitruvia-image-large-inner");
 const close=create(content,"button","vitruvia-image-close","×");close.type="button";
 close.setAttribute("aria-label",locale("Cerrar","Close","Fermer"));
 close.addEventListener("click",()=>dialog.close());
 const image=create(content,"img","vitruvia-image-large-photo");image.alt="";
 const body=create(content,"div","vitruvia-image-large-info");
 create(body,"h3","vitruvia-image-large-title");
 create(body,"p","vitruvia-image-large-rights");
 const nav=create(body,"nav","vitruvia-image-large-actions");
 const original=create(nav,"a","vitruvia-image-large-original",locale("Abrir original / guardar imagen","Open original / save image","Ouvrir l’original / enregistrer"));
 original.target="_blank";original.rel="noopener noreferrer";
 const source=create(nav,"a","vitruvia-image-large-source",locale("Ficha, autor y licencia","File, author and license","Notice, auteur et licence"));
 source.target="_blank";source.rel="noopener noreferrer";
 dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
 document.body.append(dialog);return dialog;
}
function showLarge(item){
 const dialog=viewer();
 const image=dialog.querySelector(".vitruvia-image-large-photo");
 image.src=item.original||item.preview;image.alt=item.name;
 dialog.querySelector(".vitruvia-image-large-title").textContent=item.name;
 dialog.querySelector(".vitruvia-image-large-rights").textContent=item.credit+" · "+(item.license||locale("Licencia y atribución en ficha original","Check license and attribution at source","Licence et attribution dans la notice"));
 dialog.querySelector(".vitruvia-image-large-original").href=item.original||item.preview;
 dialog.querySelector(".vitruvia-image-large-source").href=item.page;
 dialog.showModal();
}
function groupTitle(label){
 const h=create(grid,"h4","vitruvia-gallery-heading",label);
 h.style.gridColumn="1/-1";
}
async function localCodex(id){
 heading.textContent="Codex Harleianus · Harley MS 2767";
 external("341 folios · galería local","codex-h-folios-local.html");
 external("Ficha codicológica","harleianus.html");
 const base="images/CODEX_H_HARLEY_2767_ARCHIVO_MAESTRO_NO_BORRAR/";
 try{
  controller=new AbortController();
  const r=await fetch(base+"indice-folios.json",{signal:controller.signal});
  if(!r.ok)throw Error("index unavailable");
  const list=(await r.json()).imagenes||[];
  if(id!==active)return;
  for(const [i,f] of list.filter(x=>/^H_\d{3}_[a-z0-9-]+\.jpg$/i.test(x.archivo||"")).slice(0,30).entries()){
   const n=Number(f.numeroImagen)||i+1;
   const a=create(grid,"a","vitruvia-image-card");a.href="codex-h-folios-local.html#imagen="+n;
   const img=create(a,"img");img.src=base+encodeURIComponent(f.archivo);img.loading="lazy";img.alt=f.etiquetaOriginal||"Harley MS 2767";
   const cap=create(a,"div","image-caption","Harley MS 2767 · "+(f.etiquetaOriginal||n));
   create(cap,"span","image-origin","Archivo local · British Library");
  }
  status.textContent=list.length+" imágenes del Codex H · colección local";
 }catch{if(id===active)status.textContent="Abrir galería local de manuscritos."}
}
async function searchImages(query){
 const q=String(query||"").trim();reset();if(!q)return;
 const id=++active;section.hidden=false;
 heading.textContent=locale("Imágenes y fuentes visuales","Images and visual sources","Images et sources visuelles");
 status.textContent=locale("Buscando obras y fotografías documentadas…","Searching documented artworks and photographs…","Recherche d’œuvres et de photographies documentées…");
 const isCodex=/\b(harleianus|harley(?:\s+ms)?\s*2767|codex\s*h\b|harleian(?:us)?)\b/i.test(q);
 if(isCodex){await localCodex(id);return}
 external("Wikimedia Commons","https://commons.wikimedia.org/w/index.php?search="+encodeURIComponent(q)+"&title=Special:MediaSearch&type=image");
 external("Google Imágenes","https://www.google.com/search?tbm=isch&q="+encodeURIComponent(q));
 external("Europeana","https://www.europeana.eu/es/search?query="+encodeURIComponent(q));
 const language=document.documentElement.lang||"es";
 const identity=await window.VitruviaEntityResolver?.resolve(q,language).catch(()=>null);
 if(id!==active)return;
 const subject=identity?.canonical||q,paintings=paintingWords.test(fold(q)),photos=photoWords.test(fold(q));
 const aliases=distinct([q,subject,identity?.originalCanonical,...(identity?.aliases||[])]);
 if(identity?.url)external(locale("Artículo enciclopédico","Encyclopedia article","Article encyclopédique"),identity.url);
 const requests=distinct([subject,q,...aliases.slice(1,4),
  ...(paintings?["paintings by "+subject,"paintings of "+subject]:[]),
  ...(photos?["photographs of "+subject,"portraits of "+subject]:[]) ]).slice(0,6);
 controller=new AbortController();const signal=controller.signal;
 const timeout=setTimeout(()=>controller.abort(),18500);
 try{
  const searchJobs=requests.map(term=>getJSON(imageParams({
   action:"query",generator:"search",gsrsearch:term,gsrnamespace:"6",gsrlimit:"50"
  }),signal));
  const categoryTerm=paintings?"paintings by "+subject:photos?"photographs of "+subject:subject;
  const categoriesJob=getJSON({action:"query",list:"search",srnamespace:"14",srsearch:categoryTerm,srlimit:"12"},signal).catch(()=>null);
  const settled=await Promise.allSettled([...searchJobs,categoriesJob]);
  if(id!==active)return;
  let pages=settled.slice(0,-1).filter(v=>v.status==="fulfilled").flatMap(v=>Object.values(v.value.query?.pages||{}));
  const categories=settled.at(-1).status==="fulfilled"?settled.at(-1).value?.query?.search||[]:[];
  const subjectTokens=tokens(subject).filter(x=>x.length>3);
  const accepted=categories.filter(c=>{
   const name=fold(c.title);
   const overlap=subjectTokens.filter(w=>name.includes(w)).length;
   return !!subjectTokens.length&&overlap>=Math.max(1,Math.ceil(subjectTokens.length*.65))&&
    (!paintings||/painting|artwork|portrait|pintur|obra/.test(name))&&
    (!photos||/photo|portrait|picture|image/.test(name));
  }).slice(0,4);
  if(accepted.length){
   const records=await Promise.allSettled(accepted.map(c=>getJSON(imageParams({
    action:"query",generator:"categorymembers",gcmtitle:c.title,gcmtype:"file",gcmlimit:"50"
   }),signal)));
   if(id!==active)return;
   for(const record of records)if(record.status==="fulfilled")
    pages.push(...Object.values(record.value.query?.pages||{}).map(x=>({...x,fromTrustedCategory:true})));
  }
  const items=[],seen=new Set();
  for(const page of pages){
   const info=page.imageinfo?.[0],name=String(page.title||"").replace(/^File:/,"").replace(/_/g," ");
   if(!info?.thumburl||!info?.descriptionurl||!safeLink(info.thumburl)||!safeLink(info.descriptionurl))continue;
   if(!/^image\/(?:jpeg|png|webp|gif|svg\+xml)$/i.test(info.mime||""))continue;
   if(seen.has(info.descriptionurl))continue;
   const score=matchingScore(page,aliases,subject);
   if(score<(page.fromTrustedCategory?85:35))continue;
   seen.add(info.descriptionurl);
   const license=String(info.extmetadata?.LicenseShortName?.value||"").replace(/<[^>]*>/g,"").slice(0,90);
   items.push({name,preview:info.thumburl,original:safeLink(info.url)||info.thumburl,
    page:info.descriptionurl,license,credit:"Wikimedia Commons · "+(page.fromTrustedCategory?"colección temática":"archivo identificado"),score});
  }
  items.sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
  if(items.length){
   const selected=items.slice(0,80);
   groupTitle(locale("Colección visual documentada · "+selected.length,"Documented image collection · "+selected.length,"Collection iconographique documentée · "+selected.length));
   selected.forEach(displayItem);
   status.textContent=locale(selected.length+" imágenes con ficha de origen. Abrí una para ampliar; confirmá los derechos antes de reutilizarla.",
    selected.length+" source-linked images. Select one to enlarge; check rights before reuse.",
    selected.length+" images avec notice. Agrandissez-les et vérifiez les droits avant réutilisation.");
  }else status.textContent=locale("No se recuperaron imágenes pertinentes con ficha de origen. Probá los catálogos externos.",
   "No sufficiently identified images were retrieved. Try the external collections.",
   "Aucune image suffisamment documentée. Consulter les collections externes.");
 }catch(error){
  if(id===active)status.textContent=locale("El servicio de imágenes no respondió; usá los enlaces a los archivos.",
   "The image service did not respond; use the linked archives.",
   "Le service d’images ne répond pas ; consulter les archives.");
 }finally{clearTimeout(timeout)}
}
window.addEventListener("vitruvia:search",event=>{void searchImages(event.detail?.query)});
window.addEventListener("vitruvia:clear",reset);
document.getElementById("search-images-button")?.addEventListener("click",()=>{
 const q=document.getElementById("query")?.value?.trim();
 if(!q){document.getElementById("query")?.focus();return}
 document.body.classList.add("vitruvia-reading");
 void searchImages(q);
 section.scrollIntoView({behavior:"smooth",block:"start"});
});
})();
