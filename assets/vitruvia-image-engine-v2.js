/* Vitruvia: broad documentary image discovery via open Wikimedia APIs.
   No commercial image scraping. Every item links to its source and rights. */
(()=>{"use strict";
const section=document.getElementById("vitruvia-images"),grid=document.getElementById("vitruvia-image-grid"),actions=document.getElementById("vitruvia-image-actions");
const status=document.getElementById("image-results-status"),heading=document.getElementById("image-results-title");
// Only the compact strip is visible by default; the full gallery is opt-in.
grid.hidden=true;
if(!section||!grid||!actions||!status||!heading)return;
let active=0,controller=null,currentImageQuery="";
const quick=document.createElement("section");
quick.id="vitruvia-quick-images";
quick.className="article-image-preview";
quick.hidden=true;
quick.setAttribute("aria-label","Imágenes del resultado");
const article=document.getElementById("vitruvia-article");
if(article?.parentNode)article.parentNode.insertBefore(quick,article);

const create=(parent,tag,cls,content)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(content!==undefined)el.textContent=content;parent.append(el);return el;
};
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const stop=new Set("de del la las los el una un the and for with images image fotos foto fotografias photography photos paintings painting cuadros pintura obras file".split(" "));
const tokens=s=>fold(s).split(/\s+/).filter(x=>x.length>2&&!stop.has(x));
const distinct=a=>[...new Set(a.map(x=>String(x||"").trim()).filter(Boolean))];

const childhoodPhoto=/\b(baby|infant|infancy|childhood|as a child|as a baby|as a boy|as a girl|toddler|newborn|bebe|nino|nina|infancia|infantil|enfant|bambino|bambina|kindheit|als kind)\b/i;
const isChildhoodPhoto=item=>childhoodPhoto.test(fold([item?.name,item?.caption,item?.page].filter(Boolean).join(" ")));


/* Prefer documented creation date; never use Commons upload timestamps to date artwork. */
function documentedYear(value){
 const raw=String(value||"").replace(/<[^>]*>/g," ").replace(/&[^;]+;/g," ").trim();
 if(!raw)return null;
 const m=raw.match(/(?:^|[^\d])((?:1[0-9]{3}|20[0-9]{2}|[1-9][0-9]{2}))(?!\d)/);
 if(!m)return null;
 const y=Number(m[1]);
 return y<=new Date().getFullYear()+1?y:null;
}

const genericImageWords=/\b(pinturas?|cuadros?|paintings?|artworks?|obras?|retratos?|portraits?|fotografias?|photos?|pictures?|images?|imagenes|sculptures?|esculturas?|estatuas?|statues?)\b/;
const paintingWords=/\b(pinturas?|cuadros?|paintings?|artworks?|obras?)\b/;
const photoWords=/\b(fotografias?|photos?|pictures?|imagenes|images?)\b/;
const safeLink=u=>{try{const x=new URL(u,location.href);return x.protocol==="https:"?x.href:null}catch{return null}};
const locale=(es,en,fr)=>document.documentElement.lang==="en"?en:document.documentElement.lang==="fr"?fr:es;
const groupLabel=group=>window.VitruviaDiscovery?.groups[group]?.[document.documentElement.lang||"es"]||window.VitruviaDiscovery?.groups[group]?.es||group;
function external(label,url){const a=create(actions,"a","",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer"}
function reset(){active++;if(controller)controller.abort();controller=null;section.hidden=true;grid.hidden=true;grid.replaceChildren();actions.replaceChildren();status.textContent="";quick.replaceChildren();quick.hidden=true;const preview=document.getElementById("article-image-preview");if(preview){preview.replaceChildren();preview.hidden=true}}
async function getJSON(params,signal){
 const url="https://commons.wikimedia.org/w/api.php?"+new URLSearchParams({...params,format:"json",origin:"*"});
 // Centralize Commons requests: the shared transport deduplicates identical
 // requests, bounds its memory cache, honours cancellation and throttles 429s.
 if(window.VitruviaData?.remoteJSON)return window.VitruviaData.remoteJSON(url,{signal,timeoutMs:9000,maxAge:120000});
 const r=await fetch(url,{signal,headers:{Accept:"application/json"}});
 if(!r.ok)throw Error("Wikimedia Commons HTTP "+r.status);
 const d=await r.json();if(d.error)throw Error(d.error.info||d.error.code);return d;
}
function imageParams(extra){
 return {...extra,prop:"imageinfo",iiprop:"url|mime|size|extmetadata",iiurlwidth:"360"};
}
function matchingScore(page,aliases,query){
 const name=fold(page.title||"").replace(/^file /,"").replace(/\b(jpg|jpeg|png|webp|svg|tiff)\b/g,"");
 const titleTokens=tokens(name),desc=fold(page.imageinfo?.[0]?.extmetadata?.ImageDescription?.value||"").replace(/<[^>]*>/g," ");
 let score=0;
 for(const alias of aliases){
  const phrase=fold(alias),terms=tokens(alias);
  if(!phrase||!terms.length)continue;
  // Coincidencia parcial de palabras sueltas solo cuenta para nombres de una palabra; con varias, hace falta la frase.
  const overlap=terms.length>1&&!name.includes(terms.join(" "))?0:terms.filter(w=>titleTokens.includes(w)||name.includes(w)).length/terms.length;
  score=Math.max(score,(name.includes(phrase)?75:0)+Math.round(overlap*85)+(desc.includes(phrase)?15:0));
 }
 const qtokens=tokens(query);
 if(qtokens.length===1&&name.includes(qtokens[0])||qtokens.length>1&&name.includes(qtokens.join(" ")))score=Math.max(score,65);
 if(page.fromTrustedCategory)score+=90;
 return score;
}
function displayItem(item,parent=grid){
 const button=create(parent,"button","vitruvia-image-card");
 button.type="button";button.setAttribute("aria-label",locale("Ampliar ","View ","Agrandir ")+item.name);
 const img=create(button,"img");img.alt=item.name;img.loading=parent===grid?"lazy":"eager";img.decoding="async";
 if(parent!==grid)img.fetchPriority="high";
 let fallbackAttempted=false;
 img.addEventListener("error",()=>{
  if(!fallbackAttempted&&item.original&&item.original!==item.preview&&safeLink(item.original)){
   fallbackAttempted=true;img.src=item.original;return;
  }
  const link=document.createElement("a");link.className="vitruvia-image-card vitruvia-image-unavailable";
  link.href=safeLink(item.page)||"#vitruvia-images";link.target="_blank";link.rel="noopener noreferrer";
  link.textContent=locale("Imagen no disponible · Consultar fuente","Image unavailable · Open source","Image indisponible · Voir la source");
  link.setAttribute("aria-label",link.textContent+": "+item.name);
  button.replaceWith(link);
 });
 img.src=item.preview;
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
 image.src=item.large||item.original||item.preview;image.alt=item.name;
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
  const historicalDate=clean(meta.DateTimeOriginal?.value||meta.DateTimeDigitized?.value||"").slice(0,70);
  const year=documentedYear(historicalDate);
  const date=historicalDate;
  const name=String(page.title||"").replace(/^File:/,"").replace(/_/g," ");
  const objectName=clean(meta.ObjectName?.value||"");
  const caption=(objectName&&objectName.length<170&&!/QS:|\{\{/.test(objectName)?objectName:name)
   .replace(/\.(jpe?g|png|webp|tiff?|svg)$/i,"").replace(/^\d{3,}\s*[-–]\s*/,"").replace(/\s*[-–]\s*(?:foto|photo|photograph)\b.*$/i,"");
  items.push({name,caption,preview:info.thumburl,large:(info.width>1200?info.thumburl.replace(/\/\d+px-/,"/1200px-"):safeLink(info.url)||info.thumburl),original:safeLink(info.url)||info.thumburl,page:info.descriptionurl,license,
   credit:["Wikimedia Commons",creator,date,license].filter(Boolean).join(" · "),year,score:rank.score,group:rank.group,verifiedIdentity:!!page.fromEntityImage});
 }
 return window.VitruviaDiscovery?.sortImages(items,topic)||items.sort((a,b)=>b.score-a.score);
}
function displayGroups(items,topic){
 // Childhood photos are historical documents, but never lead a person's gallery
 // when adult photographs are available. If all imagery is childhood, retain it.
 if(topic.kind==="person"&&items.some(item=>!isChildhoodPhoto(item)))
  items=items.filter(item=>!isChildhoodPhoto(item));
 // Multiple API pages may represent the same photo under alternative records.
 const seen=new Set();
 items=items.filter(item=>{
  const key=String(item.page||item.original||item.preview||item.name||"").toLowerCase().replace(/[#?].*$/,"");
  if(seen.has(key))return false;seen.add(key);return true;
 });
 grid.replaceChildren();let previous=null;
 for(const item of items){
  if(item.group!==previous){groupTitle(groupLabel(item.group));previous=item.group}
  displayItem(item);
 }
 const quick=document.getElementById("vitruvia-quick-images");
 if(quick){
  quick.replaceChildren();
  window.VitruviaMathematics?.render(quick,topic.subject);
  window.VitruviaColors?.render(quick,currentImageQuery||topic.subject);
  const bar=create(quick,"div","article-image-preview-heading");
  create(bar,"span","",locale("Imágenes del resultado: ","Result images: ","Images du résultat : ")+topic.subject);
  const jump=create(bar,"a","",locale("Todas las imágenes y fuentes","All images and sources","Toutes les images et sources"));
  jump.href="#vitruvia-images";
  jump.addEventListener("click",()=>{grid.hidden=false});
  const strip=create(quick,"div","article-image-preview-grid");
  (window.VitruviaDiscovery?.previewImages(items,topic)||items.slice(0,5)).slice(0,5).forEach(item=>displayItem(item,strip));
  quick.hidden=false;
 }
 // Keep one quick image strip above the article, not a duplicate inside it.
 const preview=document.getElementById("article-image-preview");
 if(preview){preview.replaceChildren();preview.hidden=true}
 // Only already-vetted Wikimedia files are shared with the featured illustration.
 window.dispatchEvent(new CustomEvent("vitruvia:documentary-images",{
  detail:{query:currentImageQuery,kind:topic.kind,items:items.slice(0,12)}
 }));
}
async function localCodex(id){
 heading.textContent="Codex Harleianus · Harley MS 2767";
 external("341 imágenes · galería local","codex-h-folios-local.html");
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
function entityFor(q,ms){
 const same=e=>e&&[e.query,e.corrected,e.label].some(x=>fold(x||"")===fold(q));
 if(same(window.VitruviaCurrentEntity))return Promise.resolve(window.VitruviaCurrentEntity);
 return new Promise(done=>{const t=setTimeout(()=>{window.removeEventListener("vitruvia:entity",on);done(null)},ms);
  function on(ev){if(same(ev.detail)){clearTimeout(t);window.removeEventListener("vitruvia:entity",on);done(ev.detail)}}
  window.addEventListener("vitruvia:entity",on)});
}
/* Imágenes que usa el propio artículo de Wikipedia (castellano e inglés): incluye material con derechos
   (afiches, tapas, fotogramas) que Wikipedia publica como cita. Se muestra como referencia, enlazado a su
   ficha, sin filtrar por licencia y con el aviso de que no es reutilizable sin permiso. */
const ICONISH=/(icon|logo|symbol|flag|commons-|wiki|question|ambox|disambig|edit|padlock|ooui|portal|stub|star|crystal|nuvola|gnome|pictogram|semi-protection|red pencil|folder|speaker|sound|audio)/i;
async function addArticleImages(id,identity,seen){
 if(!identity?.canonical)return 0;
 const pairs=[[identity.language||"es",identity.canonical]];
 const en=identity.originalCanonical&&identity.originalCanonical!==identity.canonical?identity.originalCanonical:identity.commonsSearchName;
 if(en)pairs.push(["en",en]);
 const out=[];
 await Promise.all(pairs.map(async([lang,title])=>{
  const params=new URLSearchParams({action:"query",format:"json",origin:"*",redirects:"1",generator:"images",titles:title,gimlimit:"40",prop:"imageinfo",iiprop:"url|mime|size|extmetadata",iiurlwidth:"360"});
  const d=await fetch("https://"+lang+".wikipedia.org/w/api.php?"+params,{headers:{Accept:"application/json"}}).then(r=>r.ok?r.json():null).catch(()=>null);
  for(const p of Object.values(d?.query?.pages||{})){
   const info=p.imageinfo?.[0];if(!info?.thumburl||!/^image\/(jpeg|png|webp|gif)$/.test(info.mime||""))continue;
   if(ICONISH.test(p.title)||(info.width&&info.width<160)||(info.height&&info.height<160))continue;
   const key=info.thumburl.replace(/\/\d+px-.*$/,"");if(seen.has(key))continue;seen.add(key);
   const meta=info.extmetadata||{},nonfree=/true/i.test(meta.NonFree?.value||"")||!/commons\.wikimedia\.org/.test(info.descriptionurl||"");
   const lic=String(meta.LicenseShortName?.value||"").replace(/<[^>]*>/g,"");
   out.push({name:p.title.replace(/^[^:]+:/,""),caption:p.title.replace(/^[^:]+:/,"").replace(/\.[a-z]+$/i,""),preview:info.thumburl,
    large:info.width>1600?info.thumburl.replace(/\/\d+px-/,"/1600px-"):info.url,original:info.url,page:info.descriptionurl,license:nonfree?"":lic,
    credit:nonfree?locale("Wikipedia · imagen con derechos de autor, mostrada como referencia; no reutilizar sin permiso","Wikipedia · copyrighted image shown for reference; do not reuse without permission","Wikipédia · image protégée, affichée à titre de référence"):
     locale("Wikipedia · ","Wikipedia · ","Wikipédia · ")+(lic||locale("licencia en la ficha","license at source","licence sur la notice")),score:0,group:"article"});
  }
 }));
 if(id!==active||!out.length)return 0;
 groupTitle(locale("Imágenes del artículo de Wikipedia · con y sin derechos de autor","Images used in the Wikipedia article · free and copyrighted","Images de l’article Wikipédia · libres et protégées"));
 for(const item of out.slice(0,40))displayItem(item);
 return out.length;
}
/* Libros: tapas de ediciones (Open Library), del primer año de publicación en adelante.
   Se agregan a la galería, después de las imágenes de Commons, con enlace a la ficha de cada edición. */
const BOOKISH=/\b(novela|libro|libros|obra literaria|poema|poemario|ensayo|tratado|cuento|saga|novel|book|books|literary work|poem|essay|treatise|roman|livre|ouvrage)\b/;
async function addBookCovers(id,topic,identity,q){
 const desc=fold((identity?.authorityDescription||"")+" "+(identity?.description||"").slice(0,200));
 if(!(topic.intent==="books"||BOOKISH.test(desc)||/\b(libro|libros|book|books|novela|novel)\b/.test(fold(q))))return 0;
 const title=String(identity?.originalCanonical||identity?.canonical||topic.subject||q).replace(/\s*\((?:novela|libro|novel|book)[^)]*\)\s*$/i,"").replace(/^(?:libros?|books?|novela|novel)\s+(?:de|del|of|sobre|about)?\s*/i,"");
 const params=new URLSearchParams({q:title,limit:"40",fields:"key,title,author_name,first_publish_year,cover_i,edition_count"});
 const data=await fetch("https://openlibrary.org/search.json?"+params,{headers:{Accept:"application/json"}}).then(r=>r.ok?r.json():null).catch(()=>null);
 if(id!==active||!data)return 0;
 const docs=(data.docs||[]).filter(d=>d.cover_i&&d.title).sort((a,b)=>(a.first_publish_year??99999)-(b.first_publish_year??99999)||String(a.title).localeCompare(String(b.title))).slice(0,16);
 if(!docs.length)return 0;
 groupTitle(locale("Tapas de ediciones · Open Library","Edition covers · Open Library","Couvertures d’éditions · Open Library"));
 for(const d of docs){
  const author=(d.author_name||[]).slice(0,2).join(", ");
  displayItem({name:d.title,caption:[d.title,d.first_publish_year,author].filter(Boolean).join(" · "),
   year:Number(d.first_publish_year)||null,preview:"https://covers.openlibrary.org/b/id/"+d.cover_i+"-M.jpg",original:"https://covers.openlibrary.org/b/id/"+d.cover_i+"-L.jpg",
   page:"https://openlibrary.org"+d.key,license:"",credit:locale("Open Library · tapa de edición; derechos de la editorial","Open Library · edition cover; publisher’s rights","Open Library · couverture ; droits de l’éditeur"),score:0,group:"book"});
 }
 return docs.length;
}
/* Quickly retrieve a documentary image tied to the exact identified Wikidata item.
   Calls run concurrently; never use an unrelated page with the same date/words. */
async function verifiedLeadImage(identity,topic,id){
 if(!identity?.wikidataId)return [];
 const languages=distinct([identity.language,document.documentElement.lang,"en","es","fr"])
  .filter(x=>/^(en|es|fr|de|it|pt)$/.test(x)).slice(0,4);
 const candidates=distinct([identity.originalCanonical,identity.canonical,identity.wikiTitle,
  identity.commonsSearchName,topic.subject]).slice(0,5);
 async function wikipedia(lang){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),5500);
  try{
   const params=new URLSearchParams({action:"query",format:"json",origin:"*",redirects:"1",
    titles:candidates.join("|"),prop:"pageimages|pageprops",piprop:"thumbnail|name",
    pithumbsize:"480",pilicense:"any"});
   const response=await fetch("https://"+lang+".wikipedia.org/w/api.php?"+params,{signal:ctl.signal});
   if(!response.ok)return null;
   const data=await response.json();
   const page=Object.values(data.query?.pages||{}).find(p=>p.pageprops?.wikibase_item===identity.wikidataId&&
    p.thumbnail?.source&&p.pageimage&&safeLink(p.thumbnail.source));
   if(!page)return null;
   const file=page.pageimage.replace(/_/g," ");
   return {name:file,caption:page.title,preview:page.thumbnail.source,
    original:page.thumbnail.source,page:"https://"+lang+".wikipedia.org/wiki/File:"+encodeURIComponent(file),
    license:"",credit:"Wikipedia · "+lang.toUpperCase()+" · archivo y derechos",
    score:300,group:"context",verifiedIdentity:true};
  }catch{return null}finally{clearTimeout(timer)}
 }
 const all=await Promise.all(languages.map(wikipedia));
 if(id!==active)return [];
 const found=all.filter(Boolean);
 if(found.length)return [found[0]];
 // Wikidata P18 is a second authority route for people, paintings, buildings, objects.
 if(identity.imageFiles?.length){
  try{
   const names=identity.imageFiles.filter(x=>typeof x==="string").slice(0,3);
   const data=await getJSON(imageParams({action:"query",titles:names.map(x=>"File:"+x).join("|")}));
   if(id!==active)return [];
   const items=Object.values(data.query?.pages||{}).filter(p=>p.imageinfo?.[0]?.thumburl)
    .map(p=>({...p,fromEntityImage:true}));
   return collectedImages(items,topic).slice(0,3).map(x=>({...x,verifiedIdentity:true}));
  }catch{}
 }
 return [];
}
async function searchImages(query){
 const q=String(query||"").trim();reset();currentImageQuery=q;if(!q)return;
 const id=++active;section.hidden=false;
 // Screen colors and documented mathematical relations are available
 // immediately, even if a remote image service is unreachable.
 quick.replaceChildren();
 const hasColor=window.VitruviaColors?.render(quick,q);
 const hasFormula=window.VitruviaMathematics?.render(quick,q);
 if(hasColor||hasFormula)quick.hidden=false;
 heading.textContent=locale("Imágenes y fuentes visuales","Images and visual sources","Images et sources visuelles");
 status.textContent=locale("Buscando obras y fotografías documentadas…","Searching documented artworks and photographs…","Recherche d’œuvres et de photographies documentées…");
 const isCodex=/\b(harleianus|harley(?:\s+ms)?\s*2767|codex\s*h\b|harleian(?:us)?)\b/i.test(q);
 if(isCodex){await localCodex(id);return}
 // Química: «molécula de carbono», «átomo de oxígeno» → la galería busca la sustancia identificada por su
 // nombre inglés (el de Commons) y su categoría, no la frase literal.
 let chem=null;
 if(window.VitruviaScience?.subject(q).explicit){
  chem=await window.VitruviaScience.resolveCached(q).catch(()=>null);
  if(id!==active)return;
 }
 const chemName=chem?.entity?.labels?.en?.value||null;
 external("Wikimedia Commons","https://commons.wikimedia.org/w/index.php?search="+encodeURIComponent(q)+"&title=Special:MediaSearch&type=image");
 external("Google Imágenes","https://www.google.com/search?tbm=isch&q="+encodeURIComponent(q));
 external("Europeana","https://www.europeana.eu/es/search?query="+encodeURIComponent(q));
 const language=document.documentElement.lang||"es";
 let identity=await window.VitruviaEntityResolver?.resolve(chemName||q,chemName?"en":language).catch(()=>null);
 if(chemName&&identity&&!identity.commonsCategory&&chem.entity.claims?.P373?.[0])identity.commonsCategory=chem.entity.claims.P373[0].mainsnak?.datavalue?.value;
 if(id!==active)return;
 // Consulta con errores o en otro idioma («2001 odisea en el espacio», «A Pace Odyssey»): si el resolvedor
 // directo no identifica nada, se usa la entidad que identificó la ficha de Vitruvia (Wikidata) y se
 // resuelve por su título; así llegan sus nombres en todos los idiomas y su categoría de Commons.
 if(!identity){
  const ce=await entityFor(q,2500);
  if(id!==active)return;
  if(ce){const again=await window.VitruviaEntityResolver?.resolve(ce.wiki||ce.label,ce.wikiLang||language).catch(()=>null);
   if(id!==active)return;if(again)identity=again}
 }
 const topic=window.VitruviaDiscovery?.plan(q,identity||{})||{kind:"topic",subject:identity?.canonical||q,aliases:distinct([q,identity?.canonical]),queries:[q]};
 // A one-word stage name can also denote religious figures or unrelated art.
 // Search the verified person's profession, never an ambiguous bare keyword.
 const occupation=fold(identity?.authorityDescription||identity?.description||"");
 const creatorRole=/\b(singer|cantante|musician|musico|composer|compositor|rapper|band|banda|actor|actress|actriz|director de cine|filmmaker|cineasta|writer|escritor|architect|arquitecto|painter|pintor)\b/.test(occupation);
 if(identity?.kind==="person"&&creatorRole){
  const base=String(identity?.commonsSearchName||identity?.originalCanonical||identity?.canonical||"").trim();
  const role=/\b(singer|cantante|musician|musico|composer|compositor|rapper|band|banda)\b/.test(occupation)?"singer musician":
   /\b(actor|actress|actriz|director de cine|filmmaker|cineasta)\b/.test(occupation)?"actor film director":
   /\b(writer|escritor)\b/.test(occupation)?"writer author":/\b(painter|pintor)\b/.test(occupation)?"artist":"portrait";
  if(tokens(base).length===1){
   topic.queries=distinct([base+" "+role,base+" portrait photograph",base+" performing",base+" photographed"]).slice(0,4);
   topic.aliases=distinct([base,identity?.originalCanonical,identity?.canonical]);
  }
 }

 const role=fold(identity?.authorityDescription||identity?.description||"");
 const isArchitect=Boolean(identity?.wikidataId&&(identity.kind==="person"||identity.instanceOf?.includes("Q5"))&&
  /\b(arquitect\w*|architect\w*|ingenier\w*|engineer\w*|architet\w*)\b/.test(role));
 if(isArchitect){
  const full=String(identity.commonsSearchName||identity.originalCanonical||identity.canonical||"").trim();
  const local=String(identity.canonical||"").trim();
  const fullNames=distinct([full,local,...(identity.aliases||[])]).filter(n=>tokens(n).length>=2);
  topic.aliases=fullNames.length?fullNames.slice(0,7):[full];
  topic.queries=distinct([full+" architecture",full+" buildings",full+" bridges",full+" architect",local+" arquitectura"]).slice(0,5);
  topic.architect=true;
 }

 const isFilm=Boolean(identity?.instanceOf?.includes("Q11424")||
  /\b(?:film|movie|pelicula|largometraje|motion picture|feature film)\b/.test(fold(identity?.authorityDescription||identity?.description||"")));
 if(isFilm){
  const canonical=String(identity?.originalCanonical||identity?.canonical||"").replace(/\s*\((?:pelicula|film|movie)[^)]*\)\s*$/i,"").trim();
  const english=String(identity?.commonsSearchName||"").trim();
  topic.aliases=distinct([canonical,english,identity?.canonical].filter(x=>fold(x).replace(/\b(film|movie|pelicula)\b/g,"").trim().length>4));
  topic.queries=distinct([english+" film",canonical+" film",canonical].filter(Boolean)).slice(0,3);
 }
 section.dataset.entityId=identity?.wikidataId||"";section.dataset.commonsCategory=identity?.commonsCategory||"";
 const subject=topic.subject,paintings=paintingWords.test(fold(q)),photos=photoWords.test(fold(q));
 const aliases=distinct([q,subject,identity?.originalCanonical,...(identity?.aliases||[])]);
 if(identity?.url)external(locale("Artículo enciclopédico","Encyclopedia article","Article encyclopédique"),identity.url);
 // Start the verified article image lookup at once, instead of waiting for Commons.
 let leadItems=[];
 const leadPromise=verifiedLeadImage(identity,topic,id).then(items=>{
  if(id!==active)return [];
  leadItems=items;
  if(items.length&&!grid.querySelector(".vitruvia-image-card")&&!(topic.kind==="person"&&items.every(isChildhoodPhoto)))displayGroups(items,topic);
  return items;
 }).catch(()=>[]);
 const requests=topic.queries;
 controller=new AbortController();const signal=controller.signal;
 const timeout=setTimeout(()=>controller.abort(),18500);
 try{
  // Fetch only two high-relevance query sets before showing the first images.
  const queryImages=term=>getJSON(imageParams({
   action:"query",generator:"search",gsrsearch:term,gsrnamespace:"6",gsrlimit:"50"
  }),signal);
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
  const firstSettled=await Promise.allSettled(requests.slice(0,2).map(queryImages));
  if(id!==active)return;
  const pages=firstSettled.filter(v=>v.status==="fulfilled").flatMap(v=>Object.values(v.value.query?.pages||{}));
  // Show useful images while remaining sources and category searches are pending.
  // Preserve strict identity filtering for ambiguous people, architects and films.
  if(!isArchitect&&!isFilm&&!(identity?.kind==="person"&&creatorRole)&&!grid.querySelector(".vitruvia-image-card")){
   const early=collectedImages(pages,topic).slice(0,24);
   if(early.length){displayGroups(early,topic);status.textContent=locale("Primeras imágenes; se siguen sumando las de las colecciones relacionadas…","First images; related collections are still loading…","Premières images ; chargement des collections liées…")}
  }
  const remaining=await Promise.allSettled(requests.slice(2).map(queryImages));
  if(id!==active)return;
  pages.push(...remaining.filter(v=>v.status==="fulfilled").flatMap(v=>Object.values(v.value.query?.pages||{})));
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
  const categoryTitles=distinct(exactCategory?[exactCategory,...children.slice(0,8).map(c=>c.title)]:accepted.map(c=>c.title)).slice(0,9);
  if(categoryTitles.length){
   const records=await Promise.allSettled(categoryTitles.map(title=>getJSON(imageParams({
    action:"query",generator:"categorymembers",gcmtitle:title,gcmtype:"file",gcmlimit:"50"
   }),signal).then(data=>({data,title}))));
   if(id!==active)return;
   for(const record of records)if(record.status==="fulfilled")
    pages.push(...Object.values(record.value.data.query?.pages||{}).map(x=>({...x,sourceCategory:record.value.title,fromTrustedCategory:true})));
  }
  if(isArchitect){
   const parts=tokens(identity.commonsSearchName||identity.originalCanonical||identity.canonical);
   const first=parts[0]||"",surname=parts[parts.length-1]||"";
   const built=/\b(architecture|architectural|building|buildings|bridge|bridges|station|railway|airport|museum|museo|puente|estacion|estadio|stadium|tower|torre|terminal|ciudad|city|pavilion|pabellon|viaduct|viaducto|auditorium|auditorio|guillemins|construction)\b/;
   const filtered=pages.filter(page=>{
    if(page.fromEntityImage)return true;
    const title=fold(page.title||""),context=fold(page.sourceCategory||"");
    const fullName=first&&surname&&title.includes(first)&&title.includes(surname);
    const architecture=title.includes(surname)&&built.test(title+" "+context);
    const verifiedCategory=page.fromTrustedCategory&&context.includes(first)&&context.includes(surname);
    return Boolean(fullName||architecture||verifiedCategory);
   });
   pages.splice(0,pages.length,...filtered);
  }
  // When the identified person has a one-word name, a title match alone
  // cannot identify artwork: require career context or a verified source.
  if(identity?.kind==="person"&&creatorRole){
   const full=String(identity?.commonsSearchName||identity?.originalCanonical||identity?.canonical||"").trim();
   if(tokens(full).length===1){
    const musical=/\b(concert|tour|singer|musician|music|album|song|stage|performance|performing|sings|cantante|musica|concierto|gira|disco)\b/;
    const visual=/\b(portrait|photograph|photo|photography|headshot|retrato|fotografia)\b/;
    const cultural=/\b(film|movie|cinema|actor|actress|book|author|writer|artist|painter|painting|artwork)\b/;
    const career=/\b(singer|cantante|musician|musico|compositor|rapper|band|banda)\b/.test(occupation)?musical:
      /\b(filmmaker|director|actor|actress|cineasta)\b/.test(occupation)?cultural:
      visual;
    const label=fold(full);
    const original=pages.filter(p=>{
     if(p.fromEntityImage)return true;
     if(p.fromTrustedCategory&&identity.commonsCategory&&fold(p.sourceCategory||"").includes(fold(identity.commonsCategory)))return true;
     const title=fold(p.title||"");
     return title.includes(label)&&career.test(title+" "+fold(p.sourceCategory||""));
    });
    pages.splice(0,pages.length,...original);
   }
  }
  let candidatePages=pages;
   if(isFilm){
    const names=topic.aliases.map(fold).filter(x=>x.length>4);
    candidatePages=pages.filter(page=>{
     if(page.fromEntityImage||page.fromTrustedCategory)return true;
     const title=fold(page.title||"").replace(/^file /,"");
     return names.some(name=>name.split(" ").filter(w=>w.length>3).length>=2 && title.includes(name));
    });
   }
   const items=collectedImages(candidatePages,topic);
  if(items.length){
   const selected=items.slice(0,150);
   // Show the verified film image first; Commons matches may be incomplete.
   const exactLead=isFilm?(leadItems.length?leadItems:await leadPromise):[];
   if(id!==active)return;
   if(exactLead.length){
    displayGroups([...exactLead,...selected.filter(x=>x.preview!==exactLead[0].preview)].slice(0,150),topic);
   }else displayGroups(selected,topic);
   status.textContent=locale(selected.length+" imágenes con ficha de origen. Abre una para ampliar; confirma los derechos antes de reutilizarla.",
    selected.length+" source-linked images. Select one to enlarge; check rights before reuse.",
    selected.length+" images avec notice. Agrandissez-les et vérifiez les droits avant réutilisation.");
   if(topic.ancient)status.textContent+=" "+locale("Las representaciones posteriores no acreditan la apariencia real del personaje.","Later representations do not establish the person’s actual appearance.","Les représentations postérieures ne prouvent pas l’apparence réelle du personnage.");
  }else{
   const lead=leadItems.length?leadItems:await leadPromise;
   if(id!==active)return;
   if(lead.length){
    displayGroups(lead,topic);
    status.textContent=locale("Imagen enciclopédica identificada; consulta su archivo para verificar autoría y derechos.","Identified encyclopedia image; check its source for attribution and rights.","Image encyclopédique identifiée ; vérifiez sa source.");
   }else status.textContent=locale("No se recuperaron imágenes pertinentes con ficha de origen. Prueba los catálogos externos.",
    "No sufficiently identified images were retrieved. Try the external collections.",
    "Aucune image suffisamment documentée. Consulter les collections externes.");
  }
  const seen=new Set([...grid.querySelectorAll("img")].map(i=>String(i.src).replace(/\/\d+px-.*$/,"")));
  const fromArticle=await addArticleImages(id,identity,seen);
  if(fromArticle&&!items.length&&!leadItems.length)status.textContent=locale(fromArticle+" imágenes del artículo de Wikipedia (algunas con derechos de autor).",fromArticle+" images from the Wikipedia article (some copyrighted).",fromArticle+" images de l’article Wikipédia.");
  const covers=await addBookCovers(id,topic,identity,q);
  if(covers&&!items.length&&!leadItems.length)status.textContent=locale(covers+" tapas de ediciones en Open Library.",covers+" edition covers from Open Library.",covers+" couvertures d’éditions (Open Library).");
 }catch(error){
  if(id===active)status.textContent=locale("El servicio de imágenes no respondió; usa los enlaces a los archivos.",
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
 grid.hidden=false;
 section.scrollIntoView({behavior:"smooth",block:"start"});
});
})();

