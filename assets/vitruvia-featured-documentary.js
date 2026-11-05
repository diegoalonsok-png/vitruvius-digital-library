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
 label.after(visual);
 const photo=visual.querySelector('img'),open=visual.querySelector('.featured-documentary-photo');
 const caption=visual.querySelector('.featured-documentary-caption'),credit=visual.querySelector('.featured-documentary-credit');
 const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const hasKind=(type,groups)=>groups.includes(type);

 const childhood=/\b(baby|infant|infancy|childhood|as a child|as a baby|as a boy|as a girl|toddler|newborn|beb[eé]|niñ[oa]|infancia|infantil|enfant|bambin[oa]|kindheit|als kind)\b/i;
 const isChildhood=item=>childhood.test([item?.caption,item?.name,item?.alt,item?.page].filter(Boolean).join(" ").normalize("NFD").replace(/\p{M}/gu,""));

 function validImage(url){
  try{
   const u=new URL(url);
   return u.protocol==='https:' && (u.hostname==='upload.wikimedia.org'||u.hostname==='commons.wikimedia.org'||/^[a-z-]+\.wikipedia\.org$/.test(u.hostname));
  }catch{return false}
 }
 function validSource(url){
  try{
   const u=new URL(url);
   return u.protocol==='https:'&&(u.hostname==='commons.wikimedia.org'||/^[a-z-]+\.wikipedia\.org$/.test(u.hostname));
  }catch{return false}
 }
 const locale=(es,en,fr)=>document.documentElement.lang?.startsWith('en')?en:document.documentElement.lang?.startsWith('fr')?fr:es;
 let query='',token=0,featured=null,gallery=[],selected='',rank=0,attempted=new Set(),ready=false,childFallback=null,fallbackTimer=null;
 function setQuery(value){
  query=fold(value);token++;featured=null;gallery=[];selected='';rank=0;ready=false;childFallback=null;clearTimeout(fallbackTimer);fallbackTimer=null;attempted.clear();
  photo.removeAttribute('src');photo.alt='';visual.hidden=true;
 }
 function preferImage(item){
  const score=Number(item.score)||0;
  if(isChildhood(item))return score-1500;
   if(item.verifiedIdentity)return score+1000;
  const person=item.kind==='person',group=item.group||'';
  const boost=person?(group==='sculpture'?230:group==='portrait'?160:group==='book'?45:0):
   item.kind==='object'?(group==='object'?230:group==='historic'?195:group==='technical'?30:0):
   (hasKind(group,['artwork','object','historic'])?150:0);
  return score+boost;
 }
 function show(item,weight){
  if(!validImage(item.preview)||!validSource(item.page))return false;
  if(weight<rank||attempted.has(item.preview))return false;
  attempted.add(item.preview);selected=item.preview;rank=weight;
  const request=++token;
  photo.onload=()=>{
   if(request!==token)return;
   visual.hidden=false;
   ready=true;
  };
  photo.onerror=()=>{
   if(request!==token)return;
   visual.hidden=true;ready=false;rank=0;
   const next=gallery.filter(x=>x.preview!==item.preview&&!attempted.has(x.preview))[0];
   if(next)show(next,Math.max(25,100+preferImage(next)));
   else if(featured?.preview!==item.preview&&featured&&!attempted.has(featured.preview))show(featured,25);
  };
  open.href=item.page;
  photo.alt=item.alt||item.caption||locale('Imagen documental del tema consultado','Documentary image of the searched topic','Image documentaire du sujet');
  caption.textContent=String(item.caption||'').slice(0,165);
  credit.href=item.page;
  credit.textContent=locale('Ficha, autor y licencia · Wikimedia','File, creator and license · Wikimedia','Notice, auteur et licence · Wikimedia');
  photo.src=item.preview;
  return true;
 }
 function fromRow(row){
  if(!row||!validImage(row.image)||!validSource(row.imageRights))return null;
  return {preview:row.image,page:row.imageRights,caption:row.title||'',
   alt:row.title||'',group:'',kind:'',score:0};
 }
 function onFeatured(event){
  const d=event.detail||{};
  if(!query||fold(d.query)!==query)return;
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
 window.addEventListener('vitruvia:clear',()=>setQuery(''));
 // A results-page deep link triggers the same search event after all defer scripts load.
 window.VitruviaFeaturedVisual={version:'1.0',validImage,validSource};
})();
