/** Scriptorium Barb.: galería y buscador por libro, imagen y familias temáticas editoriales. IIIF remoto; OCR no disponible. */
const $ = id => document.getElementById(id);
const ROOT = 'data/iiif/';
const manifestPath = ROOT + 'barbaro-1567.json';
const sectionsPath = ROOT + 'barbaro-1567-sections.json';
const roman = ['','I','II','III','IV','V','VI','VII','VIII','IX','X'];
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold = s => String(s ?? '').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
let pages=[],sections=[],filtered=[],shown=0,query='',selection='',sourceReady=false;
const concepts = [
 {label:'Arquitectura y ciudad',aliases:['arquitectura','architecture','architettura','architectura','urbanismo','citta','ciudad'],terms:['architectura','architettura','architecto','citta']},
 {label:'Proporción y simetría',aliases:['simetria','simetría','symmetria','symmetrie','proporcion','proporción','proportio','proportione'],terms:['symmetria','symmetrie','simetria','proportione','proportio']},
 {label:'Templos y órdenes',aliases:['templo','templos','templi','columna','columnas','colonne','columne','ordenes','órdenes','dorico','dórico','corintio'],terms:['templo','templi','columne','dorici','corynthie']},
 {label:'Teatros y edificios públicos',aliases:['teatro','teatros','theatro','basilica','basílica','foro','forum'],terms:['theatro','basilica','foro']},
 {label:'Materiales y construcción',aliases:['materiales','ladrillo','piedra','madera','cal','construccion','construcción'],terms:['pietra','legno','muri','matoni']},
 {label:'Agua e hidráulica',aliases:['agua','acqua','hidraulica','hidráulica','acueducto','aqueducto','fontana','fuente'],terms:['acqua','aqua','fontana','aqueducto']},
 {label:'Máquinas y mecánica',aliases:['maquina','máquina','maquinas','máquinas','machina','machine','mecanica','mecánica','grua','grúa'],terms:['machine','machina','argano']},
 {label:'Astronomía y relojes',aliases:['astronomia','astronomía','reloj','relojes','horologio','gnomon','gnomonica'],terms:['gnomonice','horologii','horologio']}
];
function activeConcept(str){
 const t=fold(str);
 return concepts.find(c=>c.aliases.some(a=>fold(a)===t))||null;
}
async function readJSON(path){
 const r=await fetch(path);if(!r.ok)throw Error(path+': HTTP '+r.status);return r.json();
}
function normalNumber(text){
 const v=String(text||'').trim().replace(/^\[|\]$/g,'');
 const m=v.match(/^(?:imagen|image|img|pagina|página|folio|fol\.)?\s*#?\s*(\d{1,3})$/i);
 return m?Number(m[1]):null;
}
function parseBookChapter(value){
 const q=String(value||'').trim();
 const m=q.match(/^(?:libro\s*)?([IVX]{1,4}|\d{1,2})(?:\s*(?:\.|:|cap(?:ítulo|\.)?)\s*(\d{1,2}))?$/i);
 if(!m)return null;
 const r=m[1].toUpperCase(),book=/^\d+$/.test(r)?Number(r):roman.indexOf(r);
 return book>=1&&book<=10?{book,chapter:m[2]?Number(m[2]):null}:null;
}
function sectionForPage(number){
 return sections.find(s=>number>=s.start&&number<=s.end);
}
function openPage(number){
 if(!Number.isInteger(number)||number<1||number>pages.length)return;
 const entry=$('bar-page');entry.value=String(number);
 entry.dispatchEvent(new Event('change',{bubbles:true}));
 document.querySelectorAll('[data-bar-image]').forEach(b=>{
  const active=Number(b.dataset.barImage)===number;
  b.classList.toggle('is-current',active);
  if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
 $('bar-stage').scrollIntoView({block:'start',behavior:'smooth'});
}
function thumbnailURL(p){
 if(p.image_url){
  // IIIF Image API: small JPEG on demand, without downloading full-resolution images in the grid.
  return p.image_url.replace(/\/full\/[^/]+\/0\/default\.jpg(?:\?.*)?$/,'/full/240,/0/default.jpg');
 }
 return p.local_url||'';
}
function galleryCard(p){
 const entry=document.createElement('button');
 entry.type='button';entry.className='bar-image-card';
 entry.dataset.barImage=String(p.page);
 entry.setAttribute('aria-label','Abrir imagen digital '+p.page+', '+(sectionForPage(p.page)?.label||'Barbaro 1567'));
 const img=document.createElement('img');
 img.loading='lazy';img.decoding='async';
 img.alt='Miniatura de imagen '+p.page+' · facsímil Barbaro 1567';
 img.src=thumbnailURL(p);
 img.addEventListener('error',()=>{
  if(p.image_url&&img.src!==new URL(p.image_url,location.href).href)img.src=p.image_url;
 },{once:true});
 const caption=document.createElement('span');caption.className='bar-image-number';caption.textContent='Imagen '+p.page;
 const detail=document.createElement('small');detail.textContent=(sectionForPage(p.page)?.label||'Edición 1567').replace(' · ',' · ');
 entry.append(img,caption,detail);
 entry.addEventListener('click',()=>openPage(p.page));
 if(Number($('bar-page').value)===p.page){entry.classList.add('is-current');entry.setAttribute('aria-current','page');}
 return entry;
}
function renderMore(){
 const frag=document.createDocumentFragment();
 for(const p of filtered.slice(shown,shown+24))frag.append(galleryCard(p));
 $('bar-gallery-results').append(frag);
 shown=Math.min(filtered.length,shown+24);
 $('bar-gallery-more').hidden=shown>=filtered.length;
 $('bar-gallery-more').textContent='Mostrar más imágenes ('+shown+' de '+filtered.length+')';
}
function updateGallery(){
 if(!sourceReady)return;
 const section=$('bar-gallery-section').value;
 const raw=$('bar-gallery-query').value.trim();
 const terms=fold(raw);
 const number=normalNumber(raw);
 const locus=parseBookChapter(raw);
 const conceptual=activeConcept(raw);
 let group=sections.find(x=>x.id===section);
 if(!group&&locus)group=sections.find(x=>x.id===String(locus.book));
 let matches=pages.filter(p=>!group||(p.page>=group.start&&p.page<=group.end));
 const matchedByLabel=raw&&!number&&!locus&&!conceptual
  ?matches.filter(p=>fold(p.iiif_label||p.label).includes(terms))
  :[];
 if(number!==null){
  matches=matches.filter(p=>p.page===number);
 }else if(!group&&conceptual){
  const related=sections.filter(s=>conceptual.aliases.some(a=>s.keywords?.some(k=>fold(k)===fold(a)))||
   conceptual.terms.some(t=>s.keywords?.some(k=>fold(k).includes(fold(t)))));
  if(related.length)matches=matches.filter(p=>related.some(s=>p.page>=s.start&&p.page<=s.end));
 }else if(matchedByLabel.length)matches=matchedByLabel;
 else if(raw&&!locus&&!conceptual&&!section&&number===null){
  const related=sections.filter(s=>fold([s.label,s.source_label,...(s.keywords||[])].join(' ')).includes(terms));
  if(related.length)matches=matches.filter(p=>related.some(s=>p.page>=s.start&&p.page<=s.end));
  else matches=[];
 }
 filtered=matches;shown=0;
 $('bar-gallery-results').replaceChildren();
 const title=filtered.length+' imágenes en orden original IIIF.';
 let note='';
 if(locus && locus.chapter !== null)note=' El capítulo '+roman[locus.book]+'.'+locus.chapter+' no está identificado por página en el manifiesto; se muestran las imágenes del libro completo para cotejo.';
 else if(conceptual)note=' Selección temática orientativa por libro, no identificación visual automática ni transcripción verificada.';
 else if(raw&&!number&&!matchedByLabel.length)note=' Los temas remiten a intervalos de libros, no a páginas donde se haya certificado una palabra.';
 $('bar-gallery-count').textContent=title+note;
 if(locus?.chapter){
  const a=document.createElement('a');
  a.href='lector-bilingue.html?locus='+locus.book+'.'+locus.chapter+'.1';
  a.textContent='Consultar capítulo '+roman[locus.book]+'.'+locus.chapter+' en el lector bilingüe (otra edición) ↗';
  a.className='bar-cross-ref';$('bar-gallery-results').append(a);
 }
 renderMore();
}
async function load(){
 try{
  const [manifest,toc]=await Promise.all([readJSON(manifestPath),readJSON(sectionsPath)]);
  pages=manifest.canvases||[];sections=toc.sections||[];
  if(pages.length!==522||sections.length<12||!pages.every((p,i)=>p.page===i+1))
   throw Error('El índice no conserva la secuencia oficial esperada de 522 imágenes');
  const chooser=$('bar-gallery-section');
  const labels=[['','Todas las imágenes'],...sections.map(s=>[s.id,s.label+' · '+s.start+'–'+s.end])];
  chooser.replaceChildren(...labels.map(([v,title])=>{const opt=document.createElement('option');opt.value=v;opt.textContent=title;return opt;}));
  sourceReady=true;
  // Crear las miniaturas antes de mostrar el panel evita un estado visible vacío.
  updateGallery();
  $('bar-gallery-start').hidden=true;
  $('bar-gallery-panel').hidden=false;
 }catch(err){
  $('bar-gallery-start').textContent='No se pudo cargar la galería: '+err.message;
 }
}

$('bar-gallery-form').addEventListener('submit',e=>{e.preventDefault();updateGallery();});
$('bar-gallery-section').addEventListener('change',updateGallery);
$('bar-gallery-more').addEventListener('click',renderMore);
$('bar-gallery-clear').addEventListener('click',()=>{$('bar-gallery-query').value='';$('bar-gallery-section').value='';updateGallery();});
const watcher=new MutationObserver(()=>{
 const page=Number($('bar-page').value);
 document.querySelectorAll('[data-bar-image]').forEach(b=>{
  const active=Number(b.dataset.barImage)===page;
  b.classList.toggle('is-current',active);
  if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
});
watcher.observe($('bar-counter'),{childList:true,subtree:true,characterData:true});
load();
