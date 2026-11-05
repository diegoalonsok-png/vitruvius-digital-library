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
 image.src=src+(src.includes('?')?'&':'?')+'width=520';image.alt=caption;image.loading='lazy';image.decoding='async';
 image.addEventListener('error',()=>fig.remove());fig.append(image);
 if(cls!=='architecture-work-photo-link'){const f=element('figure','architecture-plate');f.append(fig);f.append(element('figcaption',null,caption));return f}
 return fig;
}
async function photo(item,work){
 // Imagen declarada en Wikidata (P18) para esta misma obra: prioridad sobre la búsqueda por título.
 if(/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(work.image||'')){
  const fig=commonsPlate(item,work.image,localized('Foto documentada de ','Documentary photo of ','Photo documentaire de ')+work.title,'architecture-work-photo-link');
  item.insertBefore(fig,item.querySelector('.architecture-work-content')||item.firstChild);return;
 }
 const title=work.photoTitle||work.title;
 if(!title||!item.isConnected)return;
 const api='https://en.wikipedia.org/w/api.php?'+new URLSearchParams({action:'query',titles:title,redirects:'1',prop:'pageimages',piprop:'thumbnail|name',pithumbsize:'480',pilicense:'free',format:'json',origin:'*'});
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
 item.insertBefore(fig,body||item.firstChild);
}
async function drawings(target,work){
 const name=work.photoTitle||work.title;
 const terms=words(name),url='https://commons.wikimedia.org/w/api.php?'+new URLSearchParams({
  action:'query',generator:'search',gsrsearch:'"'+name+'" (floor plan OR section OR elevation OR facade)',
  gsrnamespace:'6',gsrlimit:'28',prop:'imageinfo',iiprop:'url|mime',iiurlwidth:'520',format:'json',origin:'*'});
 const data=await read(url);if(!target.isConnected)return;
 target.replaceChildren();
 const items=Object.values(data?.query?.pages||{}).map(x=>{
  const info=x.imageinfo?.[0],title=String(x.title||'').replace(/^File:/,'').replace(/\.[^.]+$/,'');
  const matched=terms.filter(term=>words(title).includes(term)).length>=Math.min(2,terms.length);
  return terms.length&&matched&&type.test(title)&&/^image\/(jpeg|png|webp|gif)$/.test(String(info?.mime||''))&&
   /^https:\/\//.test(info?.thumburl||'')&&/^https:\/\/commons\.wikimedia\.org\//.test(info?.descriptionurl||'')
   ?{title,preview:info.thumburl,href:info.descriptionurl}:null;
 }).filter(Boolean).slice(0,6);
 for(const x of items){
  const plate=element('figure','architecture-plate');
  const source=a('',x.href),img=element('img');img.src=x.preview;img.loading='lazy';img.alt=x.title;source.append(img);plate.append(source);
  plate.append(element('figcaption',null,x.title));
  plate.append(a(localized('Ficha, autor y licencia ↗','Record, creator and license ↗','Fiche, auteur et licence ↗'),x.href));target.append(plate);
 }
 if(!items.length)target.append(element('p','context-note',localized(
  'No se identificaron planos, cortes ni fachadas de esta obra con suficiente certeza.',
  'No confidently identified plans, sections or elevations were found for this building.',
  'Aucun plan, coupe ou élévation identifié avec une certitude suffisante.')));
 const search='https://commons.wikimedia.org/w/index.php?'+new URLSearchParams({title:'Special:MediaSearch',type:'image',search:name+' plan section elevation'});
 target.append(a(localized('Consultar más láminas en Commons ↗','Find more documentary drawings ↗','Chercher davantage de dessins ↗'),search));
}
function enhance(item,work){
 if(!item||!work?.title||item.dataset.visualReady)return;
 item.dataset.visualReady='true';item.classList.add('architecture-work-visual');
 const content=element('div','architecture-work-content');
 while(item.firstChild)content.append(item.firstChild);
 item.append(content);
 if(work.description)content.append(element('p','architecture-work-review',work.description));
 // Planta declarada en Wikidata (P3311) para esta obra: se muestra sin desplegar nada.
 if(/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//.test(work.plan||''))
  content.append(commonsPlate(item,work.plan,localized('Planta · ','Plan · ','Plan · ')+work.title,'architecture-plan-link'));
 const details=element('details','architecture-work-drawings');
 const toggle=element('summary',null,localized('Plantas, cortes y fachadas','Plans, sections and elevations','Plans, coupes et façades'));
 details.append(toggle);
 let requested=false;
 details.addEventListener('toggle',()=>{if(!details.open||requested)return;requested=true;
  const box=element('div','architecture-plate-stack');details.append(box);
  box.append(element('p','context-note',localized('Buscando documentación de esta obra…','Finding drawings for this building…','Recherche des dessins de cet édifice…')));
  void drawings(box,work).catch(()=>{if(box.isConnected)box.replaceChildren(element('p','context-note',localized('La fuente no responde.','Source unavailable.','Source indisponible.')))});
 });item.append(details);
 // Load photos when a card is about to enter the visible right-hand scroll pane.
 if(typeof IntersectionObserver!=='undefined'){
  const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){observer.disconnect();void photo(item,work).catch(()=>{})}},{rootMargin:'220px'});
  observer.observe(item);
 }else void photo(item,work).catch(()=>{});
}
window.VitruviaArchitectVisuals={enhance};
})();