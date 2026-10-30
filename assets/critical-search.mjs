import {parseLocus,findMatches,roman} from './search-core.mjs?v=20261030-prefix-roots';
const $=s=>document.querySelector(s);
const editions=[{id:'recensio-es',name:'V514 · Diego Kurilo · Latín / Castellano',pdf:'https://drive.google.com/file/d/19qZMjNezQqAdrzH9aLt3N4PN_UfxfxwZ/view'},{id:'recensio-fr',name:'V554 · Diego Kurilo · Latín / Francés',pdf:'https://drive.google.com/file/d/12P4-4hADEpR67DfeqOfN9DVntgnOx0DE/view'},{id:'theory-en',name:'V297 · Diego Kurilo · Latín / Inglés',pdf:'https://drive.google.com/file/d/1b5sSpZuxpp3QUyradY_l-OJaY09rbir1/view'}];
const cache=new Map();let krohnCache=null;let notesCache=null;let results=[],shown=0,revision=0,lastQuery='';
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function getNotes(){if(!notesCache)notesCache=fetch('data/critical-notes.json').then(r=>r.ok?r.json():{entries:[]}).catch(()=>({entries:[]}));return notesCache;}
async function getKrohn(){if(!krohnCache)krohnCache=fetch('data/text/krohn-1912.json').then(r=>{if(!r.ok)throw Error('No se pudo cargar Krohn');return r.json()}).catch(e=>{krohnCache=null;throw e});return krohnCache;}
async function getCorpus(e){if(!cache.has(e.id))cache.set(e.id,fetch('data/structured/'+e.id+'.json').then(r=>{if(!r.ok)throw Error('No se puede abrir '+e.id);return r.json()}).catch(err=>{cache.delete(e.id);throw err}));return cache.get(e.id);}
function highlight(text,q){const matches=findMatches(text,q,{phrase:false});if(!matches.length)return escape(text);const spans=matches.slice(0,120).sort((a,b)=>a.start-b.start);let at=0,s='';for(const m of spans){if(m.start<at)continue;s+=escape(text.slice(at,m.start))+'<mark>'+escape(text.slice(m.start,m.end))+'</mark>';at=m.end;}return s+escape(text.slice(at));}
function label(p){return roman(p.book)+'.'+(p.chapter==='praef'?'praef':p.chapter)+'.'+p.section+(p.section_end?'–'+p.section_end:'');}
function render(){
 const target=$('#critical-results'),batch=results.slice(shown,shown+15);
 for(const r of batch){
  const e=r.edition,p=r.passage,article=document.createElement('article');
  article.className='critical-result';
  const link='lector-bilingue.html?edition='+encodeURIComponent(e.id)+'&locus='+encodeURIComponent(p.locus)+'&q='+encodeURIComponent(lastQuery);
  const page=p.pdf_pages?.translation||p.pdf_pages?.latin;
  const title=r.ocr?'Krohn 1912 · página OCR '+p.section:'Vitr., De arch. '+label(p);
  const source=r.ocr?e.pdf+'/page/n'+Math.max(0,p.section-1):e.pdf;
  article.innerHTML='<div class="meta">'+escape(e.name)+'</div><h2>'+escape(title)+'</h2><p lang="la"><strong>'+(r.ocr?'OCR no revisado':'Latín')+'.</strong> '+highlight(p.latin,lastQuery)+'</p>'+
   (r.ocr?'':'<p><strong>Traducción.</strong> '+highlight(p.translation,lastQuery)+'</p>')+
   '<p class="source-note">'+(r.ocr?'OCR histórico sin locus verificado':'Referencia canónica: '+escape(p.locus))+(page?' · Página PDF: '+page:'')+'</p><div class="actions">'+
   (r.ocr?'':'<a href="'+escape(link)+'">Leer pasaje →</a><button type="button" data-critical-compare="'+escape(p.locus)+'">Comparar tres ediciones</button>')+
   '<a href="'+escape(source)+'" target="_blank" rel="noopener">Consultar edición fuente (PDF) ↗</a></div>';
  target.append(article);
 }
 shown+=batch.length;$('#critical-more').hidden=shown>=results.length;$('#critical-more').textContent='Mostrar más ('+shown+' de '+results.length+')';
}
async function compareLocus(locus){
 const panel=$('#critical-comparison');if(!panel)return;
 panel.hidden=false;panel.replaceChildren();const title=document.createElement('h2');title.textContent='Cotejo paralelo · '+locus;panel.append(title);
 const notes=await getNotes();const noteEntries=(notes.entries||[]).filter(n=>n.locus===locus);
 const datasets=await Promise.allSettled(editions.map(getCorpus));
 const grid=document.createElement('div');grid.className='critical-parallel';
 datasets.forEach((res,i)=>{
  const card=document.createElement('article');card.className='critical-parallel-edition';
  const heading=document.createElement('h3');heading.textContent=editions[i].name;card.append(heading);
  if(res.status==='fulfilled'){
   const p=res.value.passages.find(p=>p.locus===locus);
   if(p){for(const [label,value] of [['Texto latino',p.latin],['Traducción',p.translation]]){const strong=document.createElement('strong');strong.textContent=label;const paragraph=document.createElement('p');paragraph.textContent=value;card.append(strong,paragraph);}}
   else{const p=document.createElement('p');p.textContent='Locus no individualizado en esta edición.';card.append(p);}
  }else{const p=document.createElement('p');p.textContent='No fue posible cargar esta edición.';card.append(p);}
  const ownNotes=noteEntries.filter(n=>n.edition===editions[i].id);
  const subtitle=document.createElement('h4');subtitle.textContent='Aparato crítico';card.append(subtitle);
  if(ownNotes.length)for(const n of ownNotes){const p=document.createElement('p');p.textContent=n.text;card.append(p);}
  else{const p=document.createElement('p');p.textContent='Notas no extraídas aún del original; consultar PDF de esta edición.';card.append(p);}
  grid.append(card);
 });panel.append(grid);
 const source=document.createElement('p');source.className='source-note';source.textContent='Comparación de textos indexados, no colación independiente de manuscritos. Krohn y Budé deben citarse por la lección comprobada, no inferirse automáticamente.';panel.append(source);
 panel.scrollIntoView({block:'start',behavior:'smooth'});
}
async function search(){const q=$('#critical-query').value.trim(),selection=$('#critical-edition').value,lang=$('#critical-mode').value;if(!q)return;const id=++revision;lastQuery=q;results=[];shown=0;$('#critical-results').replaceChildren();$('#critical-more').hidden=true;$('#critical-submit').disabled=true;$('#critical-status').textContent='Cargando índices textuales…';try{const chosen=editions.filter(e=>selection==='all'||e.id===selection);const found=await Promise.allSettled(chosen.map(getCorpus));if(id!==revision)return;const ref=parseLocus(q);for(let k=0;k<found.length;k++){if(found[k].status!=='fulfilled')continue;const data=found[k].value;for(const p of data.passages||[]){if(ref){if(p.book!==ref.book||ref.chapter!==null&&String(p.chapter)!==String(ref.chapter)||ref.section!==null&&(ref.section<p.section||ref.section>(p.section_end||p.section)))continue;}else{const source=lang==='la'?p.latin:lang==='translation'?p.translation:p.latin+' '+p.translation;if(!findMatches(source,q).length)continue;}results.push({edition:chosen[k],passage:p});}}results.sort((a,b)=>a.passage.book-b.passage.book||Number(a.passage.chapter||0)-Number(b.passage.chapter||0)||a.passage.section-b.passage.section);if(selection==='krohn-1912'){const pages=await getKrohn();for(const p of pages){const text=String(p.text||'');if(findMatches(text,q).length){results.push({edition:{id:'krohn-1912',name:'Fritz Krohn · Teubner 1912 · OCR no revisado',pdf:'https://archive.org/details/vitruviidearchit00vitr'},passage:{book:0,chapter:0,section:p.page,locus:'PDF '+p.page,latin:text.slice(0,3500),translation:'',pdf_pages:{latin:p.page}},ocr:true});}}}
const failures=found.filter(v=>v.status==='rejected').length;$('#critical-status').textContent=results.length+' pasajes encontrados en los índices disponibles.'+(failures?' No fue posible consultar '+failures+' edición(es).':'')+(results.length?' Los resultados no equivalen a variantes manuscritas.':'');render();}catch(error){$('#critical-status').textContent='Error de consulta: '+error.message;}finally{if(id===revision)$('#critical-submit').disabled=false;}}
$('#critical-form').addEventListener('submit',e=>{e.preventDefault();search()});$('#critical-more').addEventListener('click',render);document.querySelectorAll('[data-example]').forEach(b=>b.addEventListener('click',()=>{$('#critical-query').value=b.dataset.example;search()}));
document.querySelector('#critical-results').addEventListener('click',e=>{const b=e.target.closest('[data-critical-compare]');if(b)compareLocus(b.dataset.criticalCompare);});
