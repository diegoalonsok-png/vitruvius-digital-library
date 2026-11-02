/**
 * Cesariano 1521: gallery by IIIF sequence / book, editorial topic discovery,
 * and separate OCR results from the Getty copy. No inferred page alignment.
 * This module adds controls without modifying the working IIIF reader.
 */
const $ = id => document.getElementById(id);
const ROOT = 'data/iiif/';
const manifestPath = ROOT + 'cesariano-1521.json';
const sectionsPath = ROOT + 'cesariano-1521-sections.json';
const ocrPath = 'data/text/cesariano-1521.json';
const GETTY = 'https://archive.org/details/gri_33125008262210';
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
 const entry=$('ces-page');entry.value=String(number);
 entry.dispatchEvent(new Event('change',{bubbles:true}));
 document.querySelectorAll('[data-ces-image]').forEach(b=>{
  const active=Number(b.dataset.cesImage)===number;
  b.classList.toggle('is-current',active);
  if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
 $('ces-stage').scrollIntoView({block:'start',behavior:'smooth'});
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
 entry.type='button';entry.className='ces-image-card';
 entry.dataset.cesImage=String(p.page);
 entry.setAttribute('aria-label','Abrir imagen digital '+p.page+', '+(sectionForPage(p.page)?.label||'Cesariano 1521'));
 const img=document.createElement('img');
 img.loading='lazy';img.decoding='async';
 img.alt='Miniatura de imagen '+p.page+' · facsímil Cesariano 1521';
 img.src=thumbnailURL(p);
 img.addEventListener('error',()=>{
  if(img.src!==new URL(p.local_url,location.href).href)img.src=p.local_url;
 },{once:true});
 const caption=document.createElement('span');caption.className='ces-image-number';caption.textContent='Imagen '+p.page;
 const detail=document.createElement('small');detail.textContent=(sectionForPage(p.page)?.label||'Edición 1521').replace(' · ',' · ');
 entry.append(img,caption,detail);
 entry.addEventListener('click',()=>openPage(p.page));
 if(Number($('ces-page').value)===p.page){entry.classList.add('is-current');entry.setAttribute('aria-current','page');}
 return entry;
}
function renderMore(){
 const frag=document.createDocumentFragment();
 for(const p of filtered.slice(shown,shown+24))frag.append(galleryCard(p));
 $('ces-gallery-results').append(frag);
 shown=Math.min(filtered.length,shown+24);
 $('ces-gallery-more').hidden=shown>=filtered.length;
 $('ces-gallery-more').textContent='Mostrar más imágenes ('+shown+' de '+filtered.length+')';
}
function updateGallery(){
 if(!sourceReady)return;
 const section=$('ces-gallery-section').value;
 const raw=$('ces-gallery-query').value.trim();
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
 $('ces-gallery-results').replaceChildren();
 const title=filtered.length+' imágenes en orden original IIIF.';
 let note='';
 if(locus?.chapter!==null)note=' El capítulo '+roman[locus.book]+'.'+locus.chapter+' no está identificado por página en el manifiesto; se muestran las imágenes del libro completo para cotejo.';
 else if(conceptual)note=' Selección temática orientativa por libro, no identificación visual automática ni transcripción verificada.';
 else if(raw&&!number&&!matchedByLabel.length)note=' Los temas remiten a intervalos de libros, no a páginas donde se haya certificado una palabra.';
 $('ces-gallery-count').textContent=title+note;
 if(locus?.chapter){
  const a=document.createElement('a');
  a.href='lector-bilingue.html?locus='+locus.book+'.'+locus.chapter+'.1';
  a.textContent='Consultar capítulo '+roman[locus.book]+'.'+locus.chapter+' en el lector bilingüe (otra edición) ↗';
  a.className='ces-cross-ref';$('ces-gallery-results').append(a);
 }
 renderMore();
}
async function load(){
 try{
  const [manifest,toc]=await Promise.all([readJSON(manifestPath),readJSON(sectionsPath)]);
  pages=manifest.canvases||[];sections=toc.sections||[];
  if(pages.length!==390||sections.length<12||!pages.every((p,i)=>p.page===i+1))
   throw Error('El índice no conserva la secuencia oficial esperada de 390 imágenes');
  const chooser=$('ces-gallery-section');
  const labels=[['','Todas las imágenes'],...sections.map(s=>[s.id,s.label+' · '+s.start+'–'+s.end])];
  chooser.replaceChildren(...labels.map(([v,title])=>{const opt=document.createElement('option');opt.value=v;opt.textContent=title;return opt;}));
  sourceReady=true;
  $('ces-gallery-start').hidden=true;
  $('ces-gallery-panel').hidden=false;
  updateGallery();
 }catch(err){
  $('ces-gallery-start').textContent='No se pudo cargar la galería: '+err.message;
 }
}
function findNormalized(raw,needle){
 const text=String(raw||'');
 const projected=[],offset=[];
 for(let i=0;i<text.length;){
  const char=String.fromCodePoint(text.codePointAt(i)),len=char.length;
  const simple=char.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
  for(const ch of simple){projected.push(ch);offset.push(i);}
  i+=len;
 }
 const wanted=fold(needle);
 if(!wanted)return null;
 const i=projected.join('').indexOf(wanted);
 return i<0?null:[offset[i],offset[i+wanted.length]??text.length];
}
function excerpt(text,needle){
 const src=String(text||'').replace(/\s+/g,' ').trim(),pair=findNormalized(src,needle);
 const start=pair?Math.max(0,pair[0]-125):0;
 const end=pair?Math.min(src.length,pair[1]+270):Math.min(src.length,450);
 if(!pair)return escape(src.slice(0,450))+(src.length>450?'…':'');
 return (start?'… ':'')+escape(src.slice(start,pair[0]))+'<mark class="ces-hit">'+escape(src.slice(pair[0],pair[1]))+'</mark>'+escape(src.slice(pair[1],end))+(end<src.length?' …':'');
}
const ocrCache={promise:null};
async function readOCR(){
 if(!ocrCache.promise)ocrCache.promise=readJSON(ocrPath).catch(e=>{ocrCache.promise=null;throw e;});
 const data=await ocrCache.promise;
 return Array.isArray(data)?data:data.pages||data.entries||[];
}
async function searchOCR(){
 const q=$('ces-ocr-query').value.trim(),mode=$('ces-ocr-mode').value;
 if(q.length<2){$('ces-ocr-status').textContent='Escribí al menos dos caracteres.';return;}
 $('ces-ocr-results').replaceChildren();$('ces-ocr-status').textContent='Consultando OCR del ejemplar Getty…';
 try{
  const pagesOCR=await readOCR();
  const conceptual=mode==='concept'?activeConcept(q):null;
  const terms=[q,...(conceptual?.terms||[])];
  const hits=[];
  for(const p of pagesOCR){
   const body=String(p.text||'');
   const match=terms.find(t=>fold(body).includes(fold(t)));
   if(match)hits.push({p,match});
  }
  $('ces-ocr-status').textContent=hits.length+' páginas con coincidencia en el OCR del ejemplar Getty. '+(conceptual?'Equivalencias temáticas documentales orientativas; ':'')+'La paginación del Getty NO está alineada con las 390 imágenes e-rara.';
  let count=0;
  const more=$('ces-ocr-more');
  const add=()=>{
   for(const hit of hits.slice(count,count+12)){
    const article=document.createElement('article');article.className='ces-ocr-hit';
    const p=Number(hit.p.page);
    const link=Number.isInteger(p)&&p>0?GETTY+'/page/n'+(p-1)+'/mode/1up':GETTY;
    article.innerHTML='<h4>Getty · imagen OCR '+escape(hit.p.page)+'</h4><p>'+excerpt(hit.p.text,hit.match)+'</p><p><a href="'+escape(link)+'" target="_blank" rel="noopener noreferrer">Examinar el facsímil Getty ↗</a></p>';
    $('ces-ocr-results').append(article);
   }
   count=Math.min(hits.length,count+12);
   more.hidden=count>=hits.length;
   more.textContent='Ver más coincidencias ('+count+' de '+hits.length+')';
  };
  more.onclick=add;add();
 }catch(e){$('ces-ocr-status').textContent='OCR no disponible: '+e.message+'. La galería IIIF sigue operativa.';}
}
$('ces-gallery-form').addEventListener('submit',e=>{e.preventDefault();updateGallery();});
$('ces-gallery-section').addEventListener('change',updateGallery);
$('ces-gallery-more').addEventListener('click',renderMore);
$('ces-gallery-clear').addEventListener('click',()=>{$('ces-gallery-query').value='';$('ces-gallery-section').value='';updateGallery();});
$('ces-ocr-form').addEventListener('submit',e=>{e.preventDefault();searchOCR();});
$('ces-gallery-results').addEventListener('keydown',e=>{if(e.key==='Escape')$('ces-gallery-query').focus();});
const watch=new MutationObserver(()=>{
 const page=Number($('ces-page').value);
 document.querySelectorAll('[data-ces-image]').forEach(b=>{
  const active=Number(b.dataset.cesImage)===page;
  b.classList.toggle('is-current',active);
  if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
});
watch.observe($('ces-counter'),{childList:true,subtree:true,characterData:true});
load();
