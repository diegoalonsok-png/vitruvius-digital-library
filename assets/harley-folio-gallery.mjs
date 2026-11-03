/* Galería integrada del Codex H: folios debajo del visor principal. */
const manifestURLs=[
 'https://bl.digirati.io/iiif/ark:/81055/vdc_100056038850.0x000001',
 'https://api.bl.uk/metadata/iiif/ark:/81055/vdc_100056038850.0x000001/manifest.json'
];
const byId=id=>document.getElementById(id);
const grid=byId('h-folio-grid'),search=byId('h-gallery-query'),status=byId('h-gallery-status');
let canvases=[],filtered=[],count=0;const chunk=48;
function label(c){const l=c?.label;if(typeof l==='string')return l;if(l&&typeof l==='object')return Object.values(l).flat().join(' · ');return 'Sin etiqueta';}
function thumb(c){const r=c?.images?.[0]?.resource||c?.items?.[0]?.items?.[0]?.body;const v=r?.service||r?.services;const s=Array.isArray(v)?v[0]:v;const base=(typeof s==='string'?s:s?.id||s?.['@id']||'').replace(/\/$/,'');return base?base+'/full/220,/0/default.jpg':r?.id||r?.['@id']||'';}
function highlight(){const selected=Number(byId('page')?.value);grid.querySelectorAll('button[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.page)===selected)));}
function openPage(i){const input=byId('page');input.value=String(i+1);input.dispatchEvent(new Event('change',{bubbles:true}));highlight();byId('folio-identification').scrollIntoView({behavior:'smooth',block:'start'});}
function add(){const frag=document.createDocumentFragment();for(const i of filtered.slice(count,count+chunk)){
 const b=document.createElement('button');b.type='button';b.className='h-folio-card';b.dataset.page=String(i+1);b.setAttribute('aria-label','Abrir imagen '+(i+1)+' '+label(canvases[i]));
 const im=document.createElement('img');im.loading='lazy';im.decoding='async';im.alt='Miniatura del Codex H: '+label(canvases[i]);im.src=thumb(canvases[i]);
 const n=document.createElement('strong');n.textContent='Imagen '+(i+1);
 const l=document.createElement('span');l.textContent=label(canvases[i]);
 b.append(im,n,l);b.addEventListener('click',()=>openPage(i));frag.append(b);
 }grid.append(frag);count=Math.min(filtered.length,count+chunk);byId('h-gallery-more').hidden=count>=filtered.length;status.textContent=filtered.length+' imágenes coincidentes · '+count+' miniaturas desplegadas de '+canvases.length+' imágenes digitales';highlight();}
function runFilter(){const q=search.value.trim().toLowerCase().replace(/[^a-z0-9]/g,'').replace(/^(imagen|image)/,'');filtered=canvases.map((_,i)=>i).filter(i=>!q||String(i+1)===q||label(canvases[i]).toLowerCase().replace(/[^a-z0-9]/g,'').includes(q));count=0;grid.replaceChildren();if(filtered.length)add();else{status.textContent='Sin coincidencias: probá con otra etiqueta o número de imagen.';byId('h-gallery-more').hidden=true;}}
byId('h-gallery-search').addEventListener('click',runFilter);
search.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runFilter();}});
byId('h-gallery-reset').addEventListener('click',()=>{search.value='';runFilter();});
byId('h-gallery-more').addEventListener('click',add);
byId('page').addEventListener('change',highlight);
byId('prev').addEventListener('click',()=>requestAnimationFrame(highlight));
byId('next').addEventListener('click',()=>requestAnimationFrame(highlight));
async function init(){const errors=[];for(const url of manifestURLs){try{const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status);const json=await r.json();const list=json.sequences?.[0]?.canvases||json.items;if(!Array.isArray(list)||!list.length)throw Error('sin imágenes');canvases=list;runFilter();return;}catch(e){errors.push(e.message)}}status.textContent='No se pudo cargar el índice de miniaturas ('+errors.join('; ')+'). El lector superior puede seguir utilizándose.';}
init();
