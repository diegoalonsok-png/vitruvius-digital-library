/* Vitruvia · representative documentary illustration for each query.
 * Reuses verified Wikipedia thumbnails and Commons gallery rankings.
 * Never infers a likeness, photographer, creator or license.
 */
(()=>{
 'use strict';
 const block=document.getElementById('featured');
 const label=document.getElementById('featured-label');
 if(!block||!label)return;
 const visual=document.createElement('figure');
 visual.id='featured-documentary-visual';
 visual.className='featured-documentary-visual';
 visual.hidden=true;
 visual.innerHTML=[
  '<a class="featured-documentary-photo" target="_blank" rel="noopener noreferrer">',
  '<img alt="" decoding="async" loading="eager"></a>',
  '<figcaption><span class="featured-documentary-caption"></span>',
  '<a class="featured-documentary-credit" target="_blank" rel="noopener noreferrer"></a></figcaption>'
 ].join('');
 // Arriba del panel destacado: ocupa el espacio libre sobre el título.
 block.prepend(visual);
 const photo=visual.querySelector('img'),open=visual.querySelector('.featured-documentary-photo');
 const caption=visual.querySelector('.featured-documentary-caption'),credit=visual.querySelector('.featured-documentary-credit');
 const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const hasKind=(type,groups)=>groups.includes(type);
 // Regla de seguridad patrimonial: para personas históricas no se permiten
 // imágenes improvisadas procedentes de búsquedas por texto o coincidencias
 // de nombre. Una imagen ilustrativa no es una identidad documentada.
 const historicalBiographyQuery=q=>{
  const t=fold(q);
  return !!historicalEntityId||/\b(san martin|martin de porres|julio cesar|julius caesar|jose de san martin)\b/.test(t)||
   /\b(libertador|procer|politico|militar|emperador|emperatriz|santo|santa|philosopher|filosofo|general romano|politician|revolutionary)\b/.test(t);
 };


 const childhood=/\b(baby|infant|infancy|childhood|as a child|as a baby|as a boy|as a girl|toddler|newborn|beb[eé]|niñ[oa]|infancia|infantil|enfant|bambin[oa]|kindheit|als kind)\b/i;
 const isChildhood=item=>childhood.test([item?.caption,item?.name,item?.alt,item?.page].filter(Boolean).map(value=>{try{return decodeURIComponent(value)}catch{return value}}).join(" ").normalize("NFD").replace(/\p{M}/gu,""));

 function validImage(url){
  try{
   const u=new URL(url);
   return u.protocol==='https:' && (/(^|\.)wikimedia\.org$/.test(u.hostname)||/^[a-z-]+\.wikipedia\.org$/.test(u.hostname)||u.hostname==='pubchem.ncbi.nlm.nih.gov'||u.hostname==='covers.openlibrary.org');
  }catch{return false}
 }
 function validSource(url){
  try{
   const u=new URL(url);
   return u.protocol==='https:'&&(u.hostname==='commons.wikimedia.org'||/^[a-z-]+\.wikipedia\.org$/.test(u.hostname)||u.hostname==='pubchem.ncbi.nlm.nih.gov'||u.hostname==='openlibrary.org');
  }catch{return false}
 }
 const locale=(es,en,fr)=>document.documentElement.lang?.startsWith('en')?en:document.documentElement.lang?.startsWith('fr')?fr:es;
 let historicalEntityId='',currentEntityId='',query='',token=0,featured=null,gallery=[],selected='',rank=0,attempted=new Set(),ready=false,childFallback=null,fallbackTimer=null;
 function setQuery(value){
  query=fold(value);historicalEntityId='';currentEntityId='';token++;featured=null;gallery=[];selected='';rank=0;ready=false;childFallback=null;clearTimeout(fallbackTimer);fallbackTimer=null;attempted.clear();
  photo.removeAttribute('src');photo.alt='';visual.hidden=true;
 }
 function preferImage(item){
  const score=Number(item.score)||0;
  if(isChildhood(item))return score-1500;
   if(item.verifiedIdentity)return score+1000+(item.colourEvidence==='documented-colour'?350:0);
  const person=item.kind==='person',group=item.group||'';
  const boost=person?(group==='sculpture'?230:group==='portrait'?160:group==='book'?45:0):
   item.kind==='object'?(group==='object'?230:group==='historic'?195:group==='technical'?30:0):
   (hasKind(group,['artwork','object','historic'])?150:0);
  return score+boost;
 }
 function show(item,weight){
  // Cuarentena de imágenes históricas sin certificación de identidad/obra.
  if(historicalBiographyQuery(query)&&!item?.verifiedHistoricalPortrait)return false;
  if(!validImage(item.preview)||!validSource(item.page))return false;
  if(weight<rank||attempted.has(item.preview))return false;
  attempted.add(item.preview);selected=item.preview;rank=weight;
  visual.classList.toggle('is-diagram',!!item.diagram);
  const request=++token;
  photo.onload=()=>{
   if(request!==token)return;
   visual.hidden=false;
   ready=true;
  };
  photo.onerror=()=>{
   if(request!==token)return;
   visual.hidden=true;ready=false;rank=0;
   const backups=(item.backupFiles||[]).filter(x=>typeof x==='string'&&x.length<250).map(file=>{
    const name=encodeURIComponent(file.replace(/ /g,'_'));
    return {...item,objectTitle:undefined,discoveryDate:undefined,discoverySource:undefined,museum:undefined,inventory:undefined,creationDate:undefined,name:file,caption:file,preview:'https://commons.wikimedia.org/wiki/Special:FilePath/'+name+'?width=640',page:'https://commons.wikimedia.org/wiki/File:'+name,credit:'Wikimedia Commons · '+file+' · ficha y licencia'};
   });
   const backup=backups.find(x=>!attempted.has(x.preview));
   if(backup&&show(backup,weight))return;
   const next=gallery.filter(x=>x.preview!==item.preview&&!attempted.has(x.preview))[0];
   if(next)show(next,Math.max(25,100+preferImage(next)));
   else if(featured?.preview!==item.preview&&featured&&!attempted.has(featured.preview))show(featured,25);
  };
  open.href=item.page;
  photo.alt=item.alt||item.caption||locale('Imagen documental del tema consultado','Documentary image of the searched topic','Image documentaire du sujet');
  caption.textContent=window.VitruviaMuseumCaption?.(item)||String(item.caption||'').slice(0,165);
  visual.querySelector('.featured-discovery-source')?.remove();
  if(item.discoveryDate&&/^https:\/\//.test(item.discoverySource||'')&&window.VitruviaMuseumCaption?.(item)){
   const a=document.createElement('a');a.className='featured-discovery-source';a.href=item.discoverySource;a.target='_blank';a.rel='noopener noreferrer';a.textContent=locale(' · Fuente del hallazgo',' · Discovery record',' · Notice de découverte');credit.after(a);
  }
  credit.href=item.page;
  credit.textContent=item.credit||locale('Ficha, autor y licencia · Wikimedia','File, creator and license · Wikimedia','Notice, auteur et licence · Wikimedia');
  photo.src=item.preview;
  return true;
 }
 function fromRow(row){
  if(!row||!validImage(row.image)||!validSource(row.imageRights))return null;
  return {preview:row.image,page:row.imageRights,caption:row.title||'',name:row.title||'',recordKind:row.recordKind,objectTitle:row.objectTitle,museum:row.museum,inventory:row.inventory,creationDate:row.creationDate,discoveryDate:row.discoveryDate,discoverySource:row.discoverySource,
   alt:row.title||'',group:row.recordKind==='museum-object'?'object':'',kind:'',score:0};
 }
 // Imagen principal del artículo destacado (retrato del personaje, tapa del libro, portada del álbum…).
 // pilicense=any incluye las portadas de uso legítimo de Wikipedia; se muestran enlazadas a su ficha.
 async function leadImage(row,current){
  let u;try{u=new URL(row.link)}catch{return}
  if(!/^[a-z-]+\.wikipedia\.org$/.test(u.hostname)||!u.pathname.startsWith('/wiki/'))return;
  const title=decodeURIComponent(u.pathname.slice(6));
  try{
   const api='https://'+u.hostname+'/w/api.php?'+new URLSearchParams({action:'query',prop:'pageimages',piprop:'thumbnail|name',pithumbsize:'640',pilicense:'any',redirects:'1',titles:title,format:'json',origin:'*'});
   const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),8000);
   const data=await fetch(api,{signal:ctrl.signal}).then(r=>r.ok?r.json():null).finally(()=>clearTimeout(t));
   if(current!==query)return;
   const page=Object.values(data?.query?.pages||{})[0];
   if(!page?.thumbnail?.source||!page.pageimage)return;
   const item={preview:page.thumbnail.source,page:'https://'+u.hostname+'/wiki/File:'+encodeURIComponent(page.pageimage),caption:row.title||'',alt:row.title||'',group:'',kind:'',score:0,
    credit:locale('Imagen principal del artículo · ficha y derechos en Wikipedia','Lead image of the article · file and rights on Wikipedia','Image principale de l’article · fiche et droits sur Wikipédia')};
   if(!isChildhood(item))show(item,900);
  }catch{}
 }
 function onHero(event){
  const d=event.detail||{};
  if(!query||fold(d.query)!==query||!d.item)return;
  if(historicalBiographyQuery(query)&&!(d.item.verifiedHistoricalPortrait&&currentEntityId&&d.item.entityId===currentEntityId))return;
  show(d.item,Number(d.weight)||5000);
 }
 function onFeatured(event){
  const d=event.detail||{};
  if(!query||fold(d.query)!==query)return;
  if(/^Q\d+$/.test(d.row?.wikidataId||''))currentEntityId=d.row.wikidataId;
  if(d.row?.entityHistorical&&currentEntityId&&historicalEntityId!==currentEntityId){
   historicalEntityId=currentEntityId;
   visual.hidden=true;photo.removeAttribute('src');rank=0;ready=false;attempted.clear();
  }
  if(historicalBiographyQuery(query))return;
  if(d.row?.type==='wikipedia')leadImage(d.row,query);
  const item=fromRow(d.row);
  if(!item)return;
  featured=item;
  if(isChildhood(item)){
    childFallback=item;
    const current=token;
    clearTimeout(fallbackTimer);
    fallbackTimer=setTimeout(()=>{
     if(token===current&&!ready&&!gallery.some(x=>!isChildhood(x)))show(item,25);
    },9000);
   }else if(!ready&&rank<26)show(item,25);
 }
 function onGallery(event){
  const d=event.detail||{};
  if(!query||fold(d.query)!==query)return;
  if(historicalBiographyQuery(query))return;
  const results=(d.items||[]).filter(x=>validImage(x.preview)&&validSource(x.page));
  if(!results.length)return;
  const safeKind=['person','object','topic'].includes(d.kind)?d.kind:'topic';
  gallery=results.map(x=>({...x,kind:safeKind})).sort((a,b)=>preferImage(b)-preferImage(a));
  const adults=gallery.filter(x=>!isChildhood(x));
  const candidate=(adults.length?adults:gallery).find(x=>!attempted.has(x.preview));
  if(candidate){
   if(!isChildhood(candidate))clearTimeout(fallbackTimer);
   show(candidate,Math.max(25,100+preferImage(candidate)));
  }
 }
 window.addEventListener('vitruvia:search',e=>setQuery(e.detail?.query||''));
 window.addEventListener('vitruvia:featured-result',onFeatured);
 window.addEventListener('vitruvia:documentary-images',onGallery);
 window.addEventListener('vitruvia:hero-visual',onHero);
 window.addEventListener('vitruvia:clear',()=>setQuery(''));
 // A results-page deep link triggers the same search event after all defer scripts load.
 window.VitruviaFeaturedVisual={version:'1.1',validImage,validSource};
})();
