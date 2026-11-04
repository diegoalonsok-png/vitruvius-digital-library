/* Vitruvia: broad documentary image discovery via open Wikimedia APIs.
   No commercial image scraping. Every item links to its source and rights. */
(()=>{"use strict";
const section=document.getElementById("vitruvia-images"),grid=document.getElementById("vitruvia-image-grid"),actions=document.getElementById("vitruvia-image-actions");
const status=document.getElementById("image-results-status"),heading=document.getElementById("image-results-title");
if(!section||!grid||!actions||!status||!heading)return;
let active=0,controller=null,currentImageQuery="";
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
const groupLabel=group=>window.VitruviaDiscovery?.groups[group]?.[document.documentElement.lang||"es"]||window.VitruviaDiscovery?.groups[group]?.es||group;
function external(label,url){const a=create(actions,"a","",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer"}
function reset(){active++;if(controller)controller.abort();controller=null;section.hidden=true;grid.replaceChildren();actions.replaceChildren();status.textContent="";const preview=document.getElementById("article-image-preview");if(preview){preview.replaceChildren();preview.hidden=true}}
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
function displayItem(item,parent=grid){
 const button=create(parent,"button","vitruvia-image-card");
 button.type="button";button.setAttribute("aria-label",locale("Ampliar ","View ","Agrandir ")+item.name);
 const img=create(button,"img");img.src=item.preview;img.alt=item.name;img.loading="lazy";img.decoding="async";
 const caption=create(button,"div","image-caption",item.caption||item.name);
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
 dialog.querySelector(".vitruvia-image-large-rights").textContent=item.credit+(item.license?"":" · "+locale("Licencia y atribución en ficha original","Check license and attribution at source","Licence et attribution dans la notice"));
 dialog.querySelector(".vitruvia-image-large-original").href=item.original||item.preview;
 dialog.querySelector(".vitruvia-image-large-source").href=item.page;
 dialog.showModal();
}
function groupTitle(label){
 const h=create(grid,"h4","vitruvia-gallery-heading",label);
 h.style.gridColumn="1/-1";
}
function collectedImages(pages,topic){
 const merged=new Map();
 for(const page of pages){
  const key=page.imageinfo?.[0]?.descriptionurl||page.title;
  const previous=merged.get(key);
  merged.set(key,previous?{...previous,fromEntityImage:previous.fromEntityImage||page.fromEntityImage,
   fromTrustedCategory:previous.fromTrustedCategory||page.fromTrustedCategory,sourceCategory:previous.sourceCategory||page.sourceCategory}:page);
 }
 const subjectCollection=[...merged.values()].filter(p=>p.fromTrustedCategory);
 // Generic file search can find a namesake (for example a ship named Frying
 // Pan). Once an entity collection is available, it is the object authority.
 const candidates=topic.kind==="object"&&subjectCollection.length>=8?[...merged.values()].filter(p=>p.fromTrustedCategory||p.fromEntityImage):[...merged.values()];
 const items=[];
 for(const page of candidates){
  const info=page.imageinfo?.[0];
  if(!info?.thumburl||!safeLink(info.thumburl)||!safeLink(info.descriptionurl))continue;
  if(!/^image\/(?:jpeg|png|webp|gif|svg\+xml)$/i.test(info.mime||""))continue;
  const rank=window.VitruviaDiscovery?.imageRank(page,topic)||{accepted:matchingScore(page,topic.aliases,topic.subject)>=50,score:matchingScore(page,topic.aliases,topic.subject),group:"context"};
  if(!rank.accepted)continue;
  const clean=window.VitruviaDiscovery?.plain||String;
  const meta=info.extmetadata||{},license=clean(info.extmetadata?.LicenseShortName?.value||"").slice(0,90);
  const creator=clean(meta.Artist?.value||"").slice(0,140);
  const date=clean(meta.DateTimeOriginal?.value||meta.DateTime?.value||"").slice(0,70);
  const name=String(page.title||"").replace(/^File:/,"").replace(/_/g," ");
  const objectName=clean(meta.ObjectName?.value||"");
  const caption=(objectName&&objectName.length<170&&!/QS:|\{\{/.test(objectName)?objectName:name)
   .replace(/\.(jpe?g|png|webp|tiff?|svg)$/i,"").replace(/^\d{3,}\s*[-–]\s*/,"").replace(/\s*[-–]\s*(?:foto|photo|photograph)\b.*$/i,"");
  items.push({name,caption,preview:info.thumburl,original:safeLink(info.url)||info.thumburl,page:info.descriptionurl,license,
   credit:["Wikimedia Commons",creator,date,license].filter(Boolean).join(" · "),score:rank.score,group:rank.group});
 }
 return window.VitruviaDiscovery?.sortImages(items,topic)||items.sort((a,b)=>b.score-a.score);
}
function displayGroups(items,topic){
 grid.replaceChildren();let previous=null;
 for(const item of items){
  if(item.group!==previous){groupTitle(groupLabel(item.group));previous=item.group}
  displayItem(item);
 }
 const preview=document.getElementById("article-image-preview");
 if(preview&&items.length){
  preview.replaceChildren();preview.hidden=false;
  const bar=create(preview,"div","article-image-preview-heading");
  create(bar,"span","",locale("Imágenes: ","Images: ","Images : ")+topic.subject);
  const link=create(bar,"a","",locale("Ver galería y fuentes","View gallery and sources","Voir la galerie et les sources"));link.href="#vitruvia-images";
  const strip=create(preview,"div","article-image-preview-grid");
  const selected=window.VitruviaDiscovery?.previewImages(items,topic)||items.slice(0,5);
  selected.forEach(item=>displayItem(item,strip));
 }
 // Only already-vetted Wikimedia files are shared with the featured illustration.
 window.dispatchEvent(new CustomEvent("vitruvia:documentary-images",{
  detail:{query:currentImageQuery,kind:topic.kind,items:items.slice(0,12)}
 }));
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
 const q=String(query||"").trim();reset();currentImageQuery=q;if(!q)return;
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
 const topic=window.VitruviaDiscovery?.plan(q,identity||{})||{kind:"topic",subject:identity?.canonical||q,aliases:distinct([q,identity?.canonical]),queries:[q]};
 section.dataset.entityId=identity?.wikidataId||"";section.dataset.commonsCategory=identity?.commonsCategory||"";
 const subject=topic.subject,paintings=paintingWords.test(fold(q)),photos=photoWords.test(fold(q));
 const aliases=distinct([q,subject,identity?.originalCanonical,...(identity?.aliases||[])]);
 if(identity?.url)external(locale("Artículo enciclopédico","Encyclopedia article","Article encyclopédique"),identity.url);
 const requests=topic.queries;
 controller=new AbortController();const signal=controller.signal;
 const timeout=setTimeout(()=>controller.abort(),18500);
 try{
  const searchJobs=requests.map(term=>getJSON(imageParams({
   action:"query",generator:"search",gsrsearch:term,gsrnamespace:"6",gsrlimit:"24"
  }),signal));
  const entityImages=(identity?.imageFiles||[]).filter(x=>typeof x==="string").map(x=>"File:"+x);
  const representativeJob=entityImages.length&&topic.intent==="overview"?getJSON(imageParams({action:"query",titles:entityImages.join("|")}),signal).then(data=>{
   const pages=Object.values(data.query?.pages||{}).map(p=>({...p,fromEntityImage:true}));
   if(id===active){const first=collectedImages(pages,topic);if(first.length)displayGroups(first,topic)}
   return pages;
  }).catch(()=>[]):Promise.resolve([]);
  const categorySubject=identity?.commonsSearchName||subject;
  const categoryTerm=paintings?"paintings by "+categorySubject:photos?"photographs of "+categorySubject:categorySubject;
  const categoriesJob=getJSON({action:"query",list:"search",srnamespace:"14",srsearch:categoryTerm,srlimit:"12"},signal).catch(()=>null);
  const subcategoriesJob=identity?.commonsCategory?getJSON({action:"query",list:"categorymembers",cmtitle:"Category:"+identity.commonsCategory,cmtype:"subcat",cmlimit:"30"},signal).catch(()=>null):Promise.resolve(null);
  const settled=await Promise.allSettled(searchJobs);
  if(id!==active)return;
  const pages=settled.filter(v=>v.status==="fulfilled").flatMap(v=>Object.values(v.value.query?.pages||{}));
  pages.push(...await representativeJob);
  const categories=(await categoriesJob)?.query?.search||[];
  const children=(await subcategoriesJob)?.query?.categorymembers||[];
  if(id!==active)return;
  const exactCategory=identity?.commonsCategory?"Category:"+identity.commonsCategory:null;
  const accepted=categories.filter(c=>{
   const name=fold(c.title);
   const related=topic.aliases.some(alias=>{const phrase=fold(alias);return phrase.length>3&&(" "+name+" ").includes(" "+phrase+" ")});
   return related&&
    (!paintings||/painting|artwork|portrait|pintur|obra/.test(name))&&
    (!photos||/photo|portrait|picture|image/.test(name));
  });
  const priority=title=>/bust|sculpture|statue/.test(fold(title))?0:/portrait|painting|engraving/.test(fold(title))?1:/book|manuscript/.test(fold(title))?2:3;
  children.sort((a,b)=>priority(a.title)-priority(b.title));
  const categoryTitles=distinct(exactCategory?[exactCategory,...children.slice(0,5).map(c=>c.title)]:accepted.map(c=>c.title)).slice(0,6);
  if(categoryTitles.length){
   const records=await Promise.allSettled(categoryTitles.map(title=>getJSON(imageParams({
    action:"query",generator:"categorymembers",gcmtitle:title,gcmtype:"file",gcmlimit:"24"
   }),signal).then(data=>({data,title}))));
   if(id!==active)return;
   for(const record of records)if(record.status==="fulfilled")
    pages.push(...Object.values(record.value.data.query?.pages||{}).map(x=>({...x,sourceCategory:record.value.title,fromTrustedCategory:true})));
  }
  const items=collectedImages(pages,topic);
  if(items.length){
   const selected=items.slice(0,80);
   displayGroups(selected,topic);
   status.textContent=locale(selected.length+" imágenes con ficha de origen. Abrí una para ampliar; confirmá los derechos antes de reutilizarla.",
    selected.length+" source-linked images. Select one to enlarge; check rights before reuse.",
    selected.length+" images avec notice. Agrandissez-les et vérifiez les droits avant réutilisation.");
   if(topic.ancient)status.textContent+=" "+locale("Las representaciones posteriores no acreditan la apariencia real del personaje.","Later representations do not establish the person’s actual appearance.","Les représentations postérieures ne prouvent pas l’apparence réelle du personnage.");
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

