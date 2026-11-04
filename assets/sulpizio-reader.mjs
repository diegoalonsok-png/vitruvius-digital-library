/* Sulpizio BSB 205 folios: lector de copia local con respaldo IIIF, sin inferir loci. */
const $=id=>document.getElementById(id);
const INDEX='data/iiif/sulpizio-1486.json';
let pages=[],current=5,shown=0,filtered=[],requestId=0;
const img=$('su-image'),loupe=$('su-loupe'),magnified=$('su-loupe-image');
const fold=s=>String(s??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
const remote=p=>p?.image_url||'';
const local=p=>p?.local_url||'';
const label=p=>String(p?.iiif_label||'');
function selectedPage(){return Number($('su-page').value);}
function updateFilter(){
 const zoom=Number($('su-zoom').value)||100;
 img.style.width=(zoom*11)+'px';
 const fx='brightness('+$('su-bright').value+'%) contrast('+$('su-contrast').value+'%)'+($('su-gray').checked?' grayscale(1)':'')+($('su-invert').checked?' invert(1) hue-rotate(180deg)':'');
 img.style.filter=fx;magnified.style.filter=fx;
}
function loadImage(num){
 if(!pages.length)return;
 if(!Number.isInteger(num)||num<1||num>pages.length){$('su-status').textContent='Número fuera del intervalo 1–'+pages.length;return;}
 current=num;$('su-page').value=String(num);
 const c=pages[num-1],serial=++requestId;let fallback=false;
 $('su-status').textContent='Abriendo imagen '+num+' de 205…';
 $('su-status').setAttribute('data-current',label(c));
 img.onload=()=>{if(serial!==requestId)return;magnified.src=img.src;updateFilter();$('su-status').textContent='Imagen '+num+'/205 · folio '+label(c)+' · original BSB (copia de consulta)';};
 img.onerror=()=>{if(serial!==requestId)return;if(!fallback&&remote(c)){fallback=true;img.src=remote(c);return;}$('su-status').textContent='No se pudo cargar la imagen '+num+'. Consulta el enlace institucional BSB.';};
 img.src=local(c)||remote(c);
 for(const button of $('su-grid').querySelectorAll('button[data-page]')){
  const active=Number(button.dataset.page)===num;
  if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
}
function byFolio(raw){
 const str=fold(raw).replace(/^(?:folio|fol\.?|f\.?)\s*/i,'').replace(/\s+/g,'');
 const match=str.match(/^0*(\d{1,2})([rv])$/);
 if(!match)return null;
 const n=Number(match[1]);
 if(n<1||n>98)return null;
 const target=n+match[2];
 const found=pages.find(p=>fold(label(p)).startsWith(target+' (')||fold(label(p))===target);
 return found?.page||null;
}
function byNumber(raw){
 const s=fold(raw);
 const match=s.match(/^(?:(?:imagen|image|pagina|página|pag|pág)\s*#?\s*)?(\d{1,3})$/);
 if(!match)return null;
 const n=Number(match[1]);return n>=1&&n<=205?n:null;
}
function folioSearch(){
 const raw=$('su-folio').value.trim();
 const n=byFolio(raw)||byNumber(raw);
 if(n){loadImage(n);$('su-stage').scrollIntoView({block:'center',behavior:'smooth'});}
 else $('su-status').textContent='Folio no encontrado: '+raw+'. Prueba 1r, 27v o 98v.';
}
function thumb(p){
 const b=document.createElement('button');b.type='button';b.dataset.page=String(p.page);
 const image=document.createElement('img');image.loading='lazy';image.decoding='async';image.alt='Miniatura imagen '+p.page+' · '+label(p);
 const src=remote(p).replace('/full/1200,/0/default.jpg','/full/240,/0/default.jpg');
 image.src=src||local(p);
 image.addEventListener('error',()=>{if(local(p)&&!image.dataset.fallback){image.dataset.fallback='1';image.src=local(p);}}, {once:true});
 const t=document.createElement('strong');t.textContent='Imagen '+p.page;
 const sub=document.createElement('small');sub.textContent=label(p);
 b.append(image,t,sub);
 if(p.page===current)b.setAttribute('aria-current','page');
 b.addEventListener('click',()=>{loadImage(p.page);$('su-stage').scrollIntoView({block:'start',behavior:'smooth'});});
 return b;
}
function renderNext(){
 const frag=document.createDocumentFragment();
 for(const p of filtered.slice(shown,shown+24))frag.append(thumb(p));
 $('su-grid').append(frag);
 shown=Math.min(filtered.length,shown+24);
 $('su-more').hidden=shown>=filtered.length;
 $('su-more').textContent='Mostrar más ('+shown+' de '+filtered.length+')';
}
function applySearch(){
 if(!pages.length)return;
 const raw=$('su-query').value.trim(),section=$('su-section').value;
 const part=section==='covers'?[1,4]:section==='text'?[5,200]:section==='end'?[201,205]:[1,205];
 const n=raw?(byFolio(raw)||byNumber(raw)):null;
 filtered=pages.filter(p=>p.page>=part[0]&&p.page<=part[1]&&(!raw||n===p.page||(n===null&&fold(label(p)).includes(fold(raw)))));
 shown=0;$('su-grid').replaceChildren();
 $('su-results').textContent=filtered.length+' imágenes encontradas en orden institucional.'+(raw&&!filtered.length?' No se halló folio o etiqueta: '+raw:'');
 renderNext();
}
async function start(){
 try{
  const r=await fetch(INDEX);if(!r.ok)throw Error('HTTP '+r.status);
  const x=await r.json();pages=x.canvases||[];
  if(pages.length!==205||!pages.every((p,i)=>p.page===i+1))throw Error('Índice de 205 imágenes fuera de secuencia');
  applySearch();loadImage(Math.min(205,Math.max(1,Number(new URLSearchParams(location.search).get('image'))||5)));
 }catch(e){$('su-status').textContent='No se pudo leer el índice IIIF: '+e.message;$('su-results').textContent='Consulta el facsímil institucional.';}
}
$('su-open').addEventListener('click',()=>loadImage(selectedPage()));
$('su-page').addEventListener('change',()=>loadImage(selectedPage()));
$('su-prev').addEventListener('click',()=>loadImage(Math.max(1,current-1)));
$('su-next').addEventListener('click',()=>loadImage(Math.min(205,current+1)));
$('su-find').addEventListener('click',folioSearch);
$('su-folio').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();folioSearch();}});
$('su-search').addEventListener('click',applySearch);
$('su-query').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applySearch();}});
$('su-section').addEventListener('change',applySearch);
$('su-clear').addEventListener('click',()=>{$('su-query').value='';$('su-section').value='';applySearch();});
$('su-more').addEventListener('click',renderNext);
for(const id of ['su-zoom','su-contrast','su-bright','su-gray','su-invert'])$(id).addEventListener('input',updateFilter);
$('su-stage').addEventListener('pointermove',e=>{
 if(!$('su-magnify').checked||!img.naturalWidth)return;
 const box=img.getBoundingClientRect(),px=e.clientX-box.left,py=e.clientY-box.top;
 if(px<0||py<0||px>box.width||py>box.height){loupe.style.display='none';return;}
 const diameter=190,k=3;
 loupe.style.display='block';
 loupe.style.left=Math.max(5,Math.min(innerWidth-diameter-5,e.clientX+14))+'px';
 loupe.style.top=Math.max(5,Math.min(innerHeight-diameter-5,e.clientY-diameter/2))+'px';
 magnified.style.width=(box.width*k)+'px';magnified.style.height=(box.height*k)+'px';
 magnified.style.left=(diameter/2-px*k)+'px';magnified.style.top=(diameter/2-py*k)+'px';
});
$('su-stage').addEventListener('pointerleave',()=>{loupe.style.display='none';});
updateFilter();start();
