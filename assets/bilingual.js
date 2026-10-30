const $=id=>document.getElementById(id);
const meta={es:['Traducción castellana','Diego Kurilo · V514 · 2026'],fr:['Traduction française','Diego Kurilo · V554 · 2026'],en:['English translation','Diego Kurilo · V297 · 2026']};
let passages=[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function highlight(value,term){if(!term)return esc(value);const normalized=value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),needle=term.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();let from=0,at,html='';while(needle&&(at=normalized.indexOf(needle,from))>=0){html+=esc(value.slice(from,at))+'<mark>'+esc(value.slice(at,at+needle.length))+'</mark>';from=at+needle.length}return html+esc(value.slice(from))}
function options(select,values){const old=select.value;select.replaceChildren(...values.map(v=>{const o=document.createElement('option');o.value=String(v);o.textContent=String(v);return o}));if(values.map(String).includes(old))select.value=old}
function refreshFilters(){
  // Navigation must not disappear merely because a book is not yet transcribed.
  options($('book'),Array.from({length:10},(_,i)=>i+1));
  const chapterNumbers=[...new Set(passages.filter(p=>String(p.book)===$('book').value).map(p=>p.chapter))];
  options($('chapter'),[...new Set([...Array.from({length:20},(_,i)=>i+1),...chapterNumbers])].sort((a,b)=>a-b));
  const sectionNumbers=[...new Set(passages.filter(p=>String(p.book)===$('book').value&&String(p.chapter)===$('chapter').value).map(p=>p.section))];
  options($('section'),[...new Set([...Array.from({length:40},(_,i)=>i+1),...sectionNumbers])].sort((a,b)=>a-b));
}
function render(){const lang=$('lang').value,term=$('term').value.trim(),locus=[$('book').value,$('chapter').value,$('section').value].join('.');const p=passages.find(p=>p.locus===locus);$('translation-title').textContent=meta[lang][0];$('translation-source').textContent=meta[lang][1];$('latin-ref').textContent=$('translation-ref').textContent=p?'Vitr., De arch. '+locus:'';$('latin-text').innerHTML=p?highlight(p.latin,term):'';$('translation-text').innerHTML=p?highlight(p.translations[lang],term):'';$('status').textContent=p?'Pasaje '+locus+' · texto latino y traducción alineados; fuente: DOCX originales.':'Referencia '+locus+' seleccionada. Esta sección todavía no está incorporada al corpus bilingüe cotejado; por eso no se muestra una traducción supuesta.'}
$('form').addEventListener('submit',event=>{event.preventDefault();render()});
$('lang').addEventListener('change',render);$('book').addEventListener('change',()=>{refreshFilters();render()});$('chapter').addEventListener('change',()=>{refreshFilters();render()});$('section').addEventListener('change',render);
try{const response=await fetch('data/bilingual-passages.json');if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();passages=data.passages||[];refreshFilters();render()}catch(error){$('status').textContent='No se pudo cargar el corpus bilingüe: '+error.message}


// Full-edition reader: all indexed pages, independent of the locus-aligned scholarly edition.
const fullIndexes={};
let lastFullSearch='';
const normalizeFull=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
const fullNames={'recensio-es':'V514 · Diego Kurilo · latín-castellano','recensio-fr':'V554 · Diego Kurilo · latín-francés','theory-en':'V297 · Diego Kurilo · latín-inglés'};
let fullSerial=0;
async function showFullPage(){
 const serial=++fullSerial,id=$('full-edition').value;
 $('full-status').textContent='Cargando texto indexado de '+fullNames[id]+'…';
 try{
   if(!fullIndexes[id]){
     const response=await fetch('data/text/'+id+'.json');
     if(!response.ok)throw Error('HTTP '+response.status);
     fullIndexes[id]=await response.json();
   }
   if(serial!==fullSerial)return;
   const pages=fullIndexes[id],page=Math.min(pages.length,Math.max(1,Number($('full-page').value)||1));
   $('full-page').value=page;$('full-page').max=pages.length;
   const raw=String(pages[page-1]?.text||'');
   // Join only explicit PDF end-of-line hyphenation; retain true compound words until source review.
   const reflow=raw.replace(/([A-Za-zÀ-ÿ])[-‐¬]\s*\n\s*([a-zà-ÿ])/g,'$1$2')
     .replace(/([^\n])\n(?!\n)/g,'$1 ')
     .replace(/\n{3,}/g,'\n\n');
   $('full-text').innerHTML=reflow?highlight(reflow,lastFullSearch):'No hay texto extraíble en esta página.';
   $('full-prev').disabled=page<=1;$('full-next').disabled=page>=pages.length;
   $('full-ref').textContent=fullNames[id]+' · página indexada '+page+'/'+pages.length+' · locus aún no cotejado';
   $('full-status').textContent='Índice completo disponible: '+pages.length+' páginas. Usá las flechas para avanzar. Los saltos de página no son límites de pasaje.';
 }catch(error){if(serial===fullSerial)$('full-status').textContent='No se pudo cargar la edición: '+error.message;}
}
$('full-edition').addEventListener('change',()=>{lastFullSearch='';$('full-page').value=1;showFullPage()});
$('full-page').addEventListener('change',showFullPage);
$('full-prev').addEventListener('click',()=>{$('full-page').value=Math.max(1,Number($('full-page').value)-1);showFullPage()});
$('full-next').addEventListener('click',()=>{$('full-page').value=Number($('full-page').value)+1;showFullPage()});
$('full-find').addEventListener('click',async()=>{
 const id=$('full-edition').value,q=$('full-query').value.trim().toLocaleLowerCase();
 if(!q){$('full-status').textContent='Escribí la palabra que querés buscar.';return;}
 if(!fullIndexes[id])await showFullPage();
 const pages=fullIndexes[id]||[],start=Math.max(0,Number($('full-page').value)-1);
 const term=normalizeFull(q);
 let found=-1;
 for(let n=0;n<pages.length;n++){const i=(start+n)%pages.length;if(normalizeFull(pages[i].text||'').includes(term)){found=i;break;}}
 if(found<0){$('full-status').textContent='No se encontró «'+q+'» en esta edición.';return;}
 lastFullSearch=q;$('full-page').value=found+1;await showFullPage();
 $('full-status').textContent='«'+q+'» localizada en página '+(found+1)+' de '+fullNames[id]+' (coincidencia resaltada).';
 $('full-text').querySelector('mark')?.scrollIntoView({block:'center'});
});
showFullPage();
