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
