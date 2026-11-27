/* Vitruvia · source-linked visual records for identified buildings.
   Photos match an exact Wikipedia building page. Commons drawings need both a
   drawing-type word and building-name terms. No speculative attribution. */
(()=>{'use strict';
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const words=s=>norm(s).split(' ').filter(w=>w.length>=4&&!['house','casa','building','museum','museo','temple','west','east','studio','school'].includes(w));
const type=/\b(plan|plans|floor.?plan|planta|plano|grundriss|pianta|section|seccion|sección|corte|schnitt|coupe|sezione|elevation|fa[cç]ade|fachada|ansicht|alzato)\b/i;
const localized=(es,en,fr)=>document.documentElement.lang==='en'?en:document.documentElement.lang==='fr'?fr:es;
const element=(tag,cl,txt)=>{const e=document.createElement(tag);if(cl)e.className=cl;if(txt!==undefined)e.textContent=txt;return e};
const a=(label,href)=>{const x=element('a',null,label);x.href=href;x.target='_blank';x.rel='noopener noreferrer';return x};
const cache=new Map();
async function read(url){let p=cache.get(url);if(!p){p=(async()=>{const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),6500);try{const r=await fetch(url,{signal:ctl.signal,headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}finally{clearTimeout(timer)}})().catch(()=>null);cache.set(url,p)}return p}
function commonsPlate(item,src,caption,cls){
 const file=decodeURIComponent(src.split('/Special:FilePath/')[1]||'');
 const page='https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file.replace(/ /g,'_'));
 const fig=a('',page);fig.className=cls;
 const image=element('img',cls==='architecture-work-photo-link'?'architecture-work-photo':'architecture-work-plan');
 image.alt=caption;image.loading='lazy';image.decoding='async';
 // Commons thumbnails convert TIFF/PDF drawings to a browser-readable image.
 // Special:FilePath alone can redirect to an original TIFF the browser cannot display.
 const api='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',titles:'File:'+file,prop:'imageinfo',iiprop:'url',iiurlwidth:'520',format:'json',origin:'*'});
 void read(api).then(data=>{if(!image.isConnected)return;const info=Object.values(data?.query?.pages||{}).find(x=>x.imageinfo?.[0])?.imageinfo?.[0];
  const thumbnail=info?.thumburl||(/\.(?:jpe?g|png|webp|gif|svg)$/i.test(file)?info?.url||src:'');
  if(/^https:\/\//.test(thumbnail||''))image.src=thumbnail;else fig.remove();
 });
 image.addEventListener('error',()=>fig.remove());fig.append(image);
 if(cls!=='architecture-work-photo-link'){const f=element('figure','architecture-plate');f.append(fig);f.append(element('figcaption',null,caption));return f}
 return fig;
}
async function photo(item,work){
 // Imagen declarada en Wikidata (P18) para esta misma obra: prioridad sobre la búsqueda por título.
 if(/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(work.image||'')){
  const fig=commonsPlate(item,work.image,localized('Foto documentada de ','Documentary photo of ','Photo documentaire de ')+work.title,'architecture-work-photo-link');
  item.append(fig);return;
 }
 const title=work.photoTitle||work.title;
 if(!title||!item.isConnected)return;
 const api='https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',titles:title,redirects:'1',prop:'pageimages',piprop:'thumbnail|name',pithumbsize:'480',pilicense:'any',format:'json',origin:'*'});
 const data=await read(api);if(!item.isConnected)return;
 const target=norm(title),redirection=(data?.query?.redirects||[]).find(x=>norm(x.from)===target);
 const final=norm(redirection?.to||title);
 const page=Object.values(data?.query?.pages||{}).find(x=>norm(x.title)===final&&x.thumbnail?.source);
 if(!page||!/^https:\/\//.test(page.thumbnail.source))return;
 const source=page.pageimage?'https://en.wikipedia.org/wiki/File:'+encodeURIComponent(page.pageimage.replace(/ /g,'_')):
  'https://en.wikipedia.org/wiki/'+encodeURIComponent(page.title.replace(/ /g,'_'));
 const fig=a('',source);fig.className='architecture-work-photo-link';
 const image=element('img','architecture-work-photo');
 image.src=page.thumbnail.source;image.alt=localized('Foto documentada de ','Documentary photo of ','Photo documentaire de ')+work.title;
 image.loading='lazy';image.decoding='async';
 image.addEventListener('error',()=>fig.remove());fig.append(image);
 const body=item.querySelector('.architecture-work-content');
 item.append(fig);
}
const drawingKinds={
 plan:{label:['Plantas','Floor plans','Plans'],terms:'("floor plan" OR Grundriss OR planta OR pianta OR "ground floor" OR "plan du rez")',pattern:/\b(floor plans?|floorplans?|ground floor|first floor plan|upper floor plan|grundrisse?|plantas?|piante?|pianta|planimetr\w*|plan du rez|plan d.etage)\b/i},
 section:{label:['Cortes','Sections','Coupes'],terms:'("section drawing" OR "cross section" OR Schnitt OR corte OR coupe OR sezione)',pattern:/\b(sections?|schnitt\w*|cortes?|seccion(?:es)?|coupes?|sezione|sezioni)\b/i},
 elevation:{label:['Vistas / alzados','Elevations','Élévations'],terms:'("elevation drawing" OR elevation OR alzado OR ansicht OR elevation architecturale)',pattern:/\b(elevations?|elevaciones?|alzado[s]?|ansicht\w*|alzato|alzati)\b/i},
 perspective:{label:['Perspectivas y axonometrías','Perspective and axonometric drawings','Perspectives et axonométries'],terms:'("perspective drawing" OR axonometric OR axonometry OR axonometria OR isometric OR "perspective sketch" OR "perspectiva dibujada")',pattern:/\b(perspectives?|perspectivas?|perspektiv\w*|axonometr\w*|isometr\w*|prospettiv\w*)\b/i},
 sketch:{label:['Croquis y dibujos de proyecto','Sketches and design drawings','Croquis et dessins de projet'],terms:'(sketch OR croquis OR dessin OR schizzo OR entwurf OR "design drawing")',pattern:/\b(sketch(?:es)?|croquis|dessins?|schizz[oi]|entwurf\w*|design drawing|presentation drawing|dibujo[s]? de proyecto)\b/i}
};
const institutional={
 'curutchet': 'https://www.fondationlecorbusier.fr/en/work-architecture/achievements-docteur-curutchets-house-la-plata-argentina-1949/',
 'robie house':'https://www.loc.gov/resource/hhh.il0039.sheet?st=gallery',
 'ennis house':'https://www.loc.gov/item/ca0227/'
};
function classifyDrawing(title,description){
 const t=norm(title),d=norm(description);
 if(/\b(tourist map|locator map|location map|carte routiere|aerial photo|street view|photograph of facade|photo de facade|photograph|photography|fotografia|foto|street photograph|rendering|render|cgi|ai generated)\b/.test(t))return [];
 // The drawing type must occur in the filename or in an explicitly identified drawing.
 // A photograph's description mentioning a floor plan does not make it a drawing.
 const drawingEvidence=/\b(drawing|drawings|measured drawing|architectural drawing|dessin|zeichnung|dibujo|habs|blueprint|planche|lamina|sketch|croquis|schizzo|entwurf|watercolor|watercolour|acuarela)\b/.test(t+' '+d);
 return Object.entries(drawingKinds).filter(([k,v])=>{if(k==='perspective')return drawingEvidence&&(v.pattern.test(t)||v.pattern.test(d));if(k==='sketch')return v.pattern.test(t);return v.pattern.test(t)||(drawingEvidence&&v.pattern.test(d));}).map(([k])=>k);
}
function drawingRecord(page,work){
 const info=page.imageinfo?.[0],title=String(page.title||'').replace(/^File:/,'').replace(/\.[^.]+$/,'');
 const description=String(info?.extmetadata?.ImageDescription?.value||'').replace(/<[^>]*>/g,' ');
 const names=[work.title,work.photoTitle].filter(Boolean),hay=new Set(words(title+' '+description));
 const matched=names.some(name=>{const ts=words(name);return ts.length>0&&ts.every(t=>hay.has(t))});
 if(!matched||!/^https:\/\/commons\.wikimedia\.org\//.test(info?.descriptionurl||'')||!/^https:\/\//.test(info?.thumburl||'')||!/^image\/(jpeg|png|webp|gif|svg\+xml)$/.test(String(info?.mime||'')))return null;
 const kinds=classifyDrawing(title,description);return kinds.length?{title,preview:info.thumburl,href:info.descriptionurl,kinds}:null;
}
function makeDrawingSlots(target,work){
 target.replaceChildren();
 const slots={};
 for(const [kind,config] of Object.entries(drawingKinds)){
  const group=element('section','architecture-drawing-slot');group.dataset.drawingKind=kind;
  group.append(element('strong','architecture-drawing-label',localized(...config.label)));
  const results=element('div','architecture-drawing-results');
  const status=element('p','architecture-drawing-status',localized('Buscando documentación…','Searching records…','Recherche documentaire…'));
  group.append(results,status);target.append(group);slots[kind]={group,results,status};
 }
 return slots;
}
let running=0;const queue=[];
function queued(task){return new Promise((resolve,reject)=>{queue.push({task,resolve,reject});pump()})}
function pump(){while(running<3&&queue.length){const entry=queue.shift();running++;Promise.resolve().then(entry.task).then(entry.resolve,entry.reject).finally(()=>{running--;pump()})}}
async function drawings(target,work){
 const name=work.photoTitle||work.title,slots=makeDrawingSlots(target,work);
 const clean=name.replace(/["“”]/g,'');
 const source=Object.entries(institutional).find(([key])=>norm(work.title+' '+(work.photoTitle||'')).includes(key))?.[1]||work.url||work.href;
 const pages=await Promise.all(Object.entries(drawingKinds).map(async ([kind,config])=>{
  const search='"'+clean+'" '+config.terms;
  const url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({action:'query',generator:'search',gsrsearch:search,gsrnamespace:'6',gsrlimit:'18',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'640',format:'json',origin:'*'});
  const data=await queued(()=>target.isConnected?read(url):null);
  return {kind,data,search};
 }));
 if(!target.isConnected)return;
 const records=new Map();
 for(const {data} of pages)for(const page of Object.values(data?.query?.pages||{})){
  const record=drawingRecord(page,work);if(record)records.set(record.href,record);
 }
 for(const {kind,data,search} of pages){
  const slot=slots[kind];
  const candidates=[...records.values()].filter(r=>r.kinds.includes(kind)).sort((a,b)=>a.title.localeCompare(b.title)).slice(0,2);
  const addPlate=x=>{
   const plate=element('figure','architecture-plate'),ref=a('',x.href),img=element('img');
   img.src=x.preview;img.loading='lazy';img.decoding='async';img.alt=x.title;ref.append(img);plate.append(ref);
   plate.append(element('figcaption',null,x.title),a(localized('Ficha y licencia ↗','Record and license ↗','Notice et licence ↗'),x.href));slot.results.append(plate);
   img.addEventListener('error',()=>{plate.remove();if(!slot.results.children.length){slot.status.hidden=false;slot.status.textContent=localized('Miniatura no disponible; consultar la fuente.','Thumbnail unavailable; consult source.','Vignette indisponible ; consulter la source.')}},{once:true});
  };
  for(const x of candidates)addPlate(x);
  const registered=kind==='plan'&&/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(work.plan||'');
  if(registered){const plate=commonsPlate(target,work.plan,localized('Planta registrada · ','Registered floor plan · ','Plan enregistré · ')+work.title,'architecture-plan-link');slot.results.prepend(plate);}
  slot.status.hidden=candidates.length>0||registered;
  slot.status.textContent=data?localized('No se recuperó una lámina verificada de este tipo.','No verified drawing of this type returned.','Aucun dessin vérifié de ce type retrouvé.'):localized('Fuente temporalmente no disponible.','Source temporarily unavailable.','Source temporairement indisponible.');
  if(source&&/^https:\/\//.test(source))slot.group.append(a(localized('Consultar archivo de la obra ↗','Consult building record ↗','Consulter le dossier ↗'),source));
  slot.group.append(a(localized('Buscar láminas de este tipo ↗','Find drawings of this type ↗','Chercher ce type de dessin ↗'),'https://commons.wikimedia.org/wiki/Special:MediaSearch?'+new URLSearchParams({type:'image',search})));
 }
}
function attachDrawings(target,work){
 if(!target||!work?.title||target.dataset.drawingReady)return;
 target.dataset.drawingReady='true';target.classList.add('architecture-plate-stack');
 makeDrawingSlots(target,work);
 let started=false;
 const start=()=>{if(started||!target.isConnected)return;started=true;void drawings(target,work).catch(()=>{if(target.isConnected)for(const x of target.querySelectorAll('.architecture-drawing-status'))x.textContent=localized('Documentación temporalmente no disponible.','Documentation temporarily unavailable.','Documentation temporairement indisponible.')})};
 if(typeof IntersectionObserver!=='undefined'){
  const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)&&target.isConnected){observer.disconnect();start()}},{rootMargin:'180px'});
  observer.observe(target);
 }else queueMicrotask(start);
}
function enhance(item,work){
 if(!item||!work?.title||item.dataset.visualReady)return;
 item.dataset.visualReady='true';item.classList.add('architecture-work-visual');
 const content=element('div','architecture-work-content');
 while(item.firstChild)content.append(item.firstChild);
 item.append(content);
 if(work.description)content.append(element('p','architecture-work-review',work.description));
 // Planta declarada en Wikidata (P3311) para esta obra: se muestra sin desplegar nada.
 const box=element('div','architecture-plate-stack');item.insertBefore(box,content);
 attachDrawings(box,work);
 // Load photos when a card is about to enter the visible right-hand scroll pane.
 if(typeof IntersectionObserver!=='undefined'){
  const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){observer.disconnect();void photo(item,work).catch(()=>{})}},{rootMargin:'220px'});
  observer.observe(item);
 }else void photo(item,work).catch(()=>{});
}
window.VitruviaArchitectVisuals={enhance,attachDrawings,classifyDrawing,drawingRecord};
})();