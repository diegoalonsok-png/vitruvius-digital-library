import {parseLocus,findMatches,roman} from './search-core.mjs?v=20261109-prefacion-v2';
import {canonicalLocus,ocrCandidate,ocrBlocksForLocus,pdfPage} from './krohn-locus-sync.mjs?v=20261110-long-ocr-blocks-v2';
const $=s=>document.querySelector(s);
const editions=[{id:'recensio-es',name:'V514 · Diego Kurilo · Latín / Castellano',pdf:'documents/kurilo-recensio-es.pdf'},{id:'recensio-fr',name:'V554 · Diego Kurilo · Latín / Francés',pdf:'documents/kurilo-recensio-fr.pdf'},{id:'theory-en',name:'V297 · Diego Kurilo · Latín / Inglés',pdf:'documents/kurilo-theory-en.pdf'}];
const cache=new Map();let krohnCache=null;let krohnIndexCache=null;let compareRevision=0;let notesCache=null;let results=[],shown=0,revision=0,lastQuery='';
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function getNotes(){if(!notesCache)notesCache=fetch('data/critical-notes.json').then(r=>r.ok?r.json():{entries:[]}).catch(()=>({entries:[]}));return notesCache;}
async function getKrohn(){if(!krohnCache)krohnCache=fetch('data/text/krohn-1912.json').then(r=>{if(!r.ok)throw Error('No se pudo cargar Krohn');return r.json()}).catch(e=>{krohnCache=null;throw e});return krohnCache;}
async function getKrohnIndex(){if(!krohnIndexCache)krohnIndexCache=fetch('data/structured/krohn-1912-ocr-locus-candidates.json').then(r=>{if(!r.ok)throw Error('Índice de loci Krohn no disponible');return r.json()}).catch(e=>{krohnIndexCache=null;throw e});return krohnIndexCache;}
async function getCorpus(e){if(!cache.has(e.id))cache.set(e.id,fetch('data/structured/'+e.id+'.json').then(r=>{if(!r.ok)throw Error('No se puede abrir '+e.id);return r.json()}).catch(err=>{cache.delete(e.id);throw err}));return cache.get(e.id);}
function highlight(text,q){const matches=findMatches(text,q,{phrase:false});if(!matches.length)return escape(text);const spans=matches.slice(0,120).sort((a,b)=>a.start-b.start);let at=0,s='';for(const m of spans){if(m.start<at)continue;s+=escape(text.slice(at,m.start))+'<mark>'+escape(text.slice(m.start,m.end))+'</mark>';at=m.end;}return s+escape(text.slice(at));}
function norm(s){return String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();}
function label(p){return roman(p.book)+'.'+(p.chapter==='praef'?'praef':p.chapter)+'.'+p.section+(p.section_end?'–'+p.section_end:'');}
function ocrExcerpt(text,q){const t=String(text||'').replace(/\s+/g,' ').trim(),n=String(q||'').trim(),i=t.toLowerCase().indexOf(n.toLowerCase()),p=Math.max(0,i-150),e=Math.min(t.length,Math.max(0,i)+n.length+220);return (p?'… ':'')+t.slice(p,e)+(e<t.length?' …':'');}
function render(){
 const target=$('#critical-results'),batch=results.slice(shown,shown+15);
 for(const r of batch){
  const e=r.edition,p=r.passage,article=document.createElement('article');
  article.className='critical-result';
  const link='lector-bilingue.html?edition='+encodeURIComponent(e.id)+'&locus='+encodeURIComponent(p.locus)+'&q='+encodeURIComponent(lastQuery);
  const page=p.pdf_pages?.translation||p.pdf_pages?.latin;
  const title=r.ocr?'Krohn 1912 · página OCR '+p.section:'Vitr., De arch. '+label(p);
  const source=r.ocr?e.pdf+'/page/n'+Math.max(0,p.section-1):e.pdf;
  article.innerHTML='<div class="meta">'+escape(e.name)+'</div><h2>'+escape(title)+'</h2>'+(r.ocr?'<p class="source-note"><strong>OCR no revisado:</strong> reconocimiento defectuoso, verificar el facsímil.</p><p lang="la">'+highlight(ocrExcerpt(p.latin,lastQuery),lastQuery)+'</p><details><summary>Ver OCR completo (texto defectuoso)</summary><p lang="la">'+highlight(p.latin,lastQuery)+'</p></details>':'<p lang="la"><strong>Latín.</strong> '+highlight(p.latin,lastQuery)+'</p>')+
   (r.ocr?'':'<p><strong>Traducción.</strong> '+highlight(p.translation,lastQuery)+'</p>')+
   '<p class="source-note">'+(r.ocr?'OCR histórico sin locus verificado':'Referencia canónica: '+escape(p.locus))+(page?' · Página PDF: '+page:'')+'</p><div class="actions">'+
   (r.ocr?'':'<a href="'+escape(link)+'">Leer pasaje →</a><button type="button" data-critical-compare="'+escape(p.locus)+'">Comparar con ediciones y Krohn</button>')+
   '<a href="'+escape(source)+'" target="_blank" rel="noopener">Consultar edición fuente (PDF) ↗</a></div>';
  target.append(article);
 }
 shown+=batch.length;$('#critical-more').hidden=shown>=results.length;$('#critical-more').textContent='Mostrar más ('+shown+' de '+results.length+')';
}
// The Krohn source is raw page OCR, not a critical transcription. Match word sequences
// conservatively and never label an OCR hit as a verified manuscript variant.
function krohnCandidates(pages,latin){
 const words=String(latin||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().match(/[a-z]{4,}/g)||[];
 const starts=[];for(let i=0;i<Math.min(words.length-3,95);i+=3){const part=words.slice(i,i+4);if(part.length===4)starts.push(part.join(' '));}
 if(!starts.length)return [];
 return pages.map(p=>{
  const raw=String(p.text||'');const normalized=raw.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z]+/g,' ');
  const hits=starts.filter(x=>normalized.includes(x)).length;
  return {page:p.page,text:raw,hits};
 }).filter(p=>p.hits>=2).sort((a,b)=>b.hits-a.hits).slice(0,3);
}
async function appendKrohnComparison(sources,latin){
 const section=document.createElement('section');section.className='critical-parallel-edition';
 const heading=document.createElement('h3');heading.textContent='Krohn 1912 · búsqueda de paralelos en OCR';section.append(heading);
 const status=document.createElement('p');status.textContent='Buscando secuencias latinas dentro del OCR histórico…';section.append(status);sources.append(section);
 try{
  const pages=await getKrohn();const found=krohnCandidates(pages,latin);
  status.textContent=found.length?'Candidatos localizados por coincidencias de al menos dos secuencias latinas; cotejo visual pendiente. No son variantes certificadas.':'No se pudo alinear automáticamente este locus con suficiente confianza en el OCR. Consulta el facsímil original.';
  for(const p of found){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Página OCR '+p.page+' · '+p.hits+' secuencias coincidentes';details.append(summary);
   const excerpt=document.createElement('p');excerpt.textContent=p.text.slice(0,1700);details.append(excerpt);
   const link=document.createElement('a');link.href='https://archive.org/details/vitruviidearchit00vitr/page/n'+Math.max(0,p.page-1)+'/mode/1up';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Abrir esta página del facsímil de Krohn';details.append(link);section.append(details);}
 }catch(error){status.textContent='No se pudo consultar el OCR de Krohn: '+error.message;}
}
let collatedLociPromise=null;
async function getCollatedLoci(){
 if(!collatedLociPromise)collatedLociPromise=fetch('data/collation-loci.json')
  .then(r=>{if(!r.ok)throw new Error('No se pudo abrir el cotejo por locus');return r.json()})
  .catch(e=>{collatedLociPromise=null;throw e});
 return collatedLociPromise;
}
async function compareLocus(locus){
 const compareId=++compareRevision;
 const panel=$('#critical-comparison');if(!panel)return;
 panel.hidden=false;panel.replaceChildren();
 const title=document.createElement('h2');title.textContent='Cotejo paralelo latino · '+(canonicalLocus(locus)||locus);panel.append(title);
 const note=document.createElement('p');note.className='source-note';
 note.textContent='Tres textos latinos del mismo locus: Rose (1899), Krohn (1912) y Kurilo. Los tramos históricos del índice proceden de OCR alineado automáticamente; requieren cotejo contra la edición impresa antes de afirmar variantes.';
 panel.append(note);
 const grid=document.createElement('div');grid.className='critical-parallel';panel.append(grid);
 const versions=[['Rose · 1899','rose-1899'],['Krohn · 1912','krohn-1912'],['Kurilo · latín','kurilo']];
 const cells=versions.map(([label])=>{
  const card=document.createElement('article');card.className='critical-parallel-edition';
  const heading=document.createElement('h3');heading.textContent=label;card.append(heading);
  const para=document.createElement('p');para.lang='la';para.className='critical-latin-text';
  para.textContent='Cargando texto…';card.append(para);grid.append(card);return para;
 });
 const reference=parseLocus(locus);
 try{
  const [historical,kurilo]=await Promise.all([getCollatedLoci(),getCorpus(editions[0])]);
  if(compareId!==compareRevision)return;
  const standardized=canonicalLocus(locus)||locus;
  const candidates=[standardized,String(locus),reference?(reference.book+'.'+reference.chapter+'.'+reference.section):''];
  const foundKey=candidates.find(key=>historical.loci&&Object.hasOwn(historical.loci,key));
  const record=foundKey?historical.loci[foundKey]:null;
  const passage=kurilo.passages.find(p=>p.locus===locus||p.locus===standardized||
   (reference&&Number(p.book)===Number(reference.book)&&String(p.chapter)===String(reference.chapter)&&
    Number(reference.section)>=Number(p.section)&&Number(reference.section)<=Number(p.section_end||p.section)));
  const contents=[
   record?.['rose-1899']?.text,
   record?.['krohn-1912']?.text,
   passage?.latin
  ];
  contents.forEach((value,i)=>{
   cells[i].textContent=value&&String(value).trim()?String(value).trim():
    'No hay un texto vinculado con seguridad a este locus en el índice consultado.';
  });
  for(const i of [0,1]){
   const item=record?.[versions[i][1]];
   if(!item)continue;
   const metadata=document.createElement('p');metadata.className='source-note';
   metadata.textContent='Transcripción OCR alineada · coincidencia automática '+Math.round((Number(item.score)||0)*100)+' % · no constituye variante verificada';
   cells[i].parentElement.append(metadata);
  }
 }catch(error){
  if(compareId!==compareRevision)return;
  cells.forEach(p=>{p.textContent='No se pudo recuperar el texto indexado: '+error.message});
 }
 panel.scrollIntoView({block:'start',behavior:'smooth'});
}
function anchorEvidence(note,passage){
 if(!passage)return {status:'unmatched',score:0};
 const fold=t=>String(t||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ');
 const input=fold(note.anchor).split(/\s+/).filter(w=>w.length>=4).slice(0,35);
 const text=new Set(fold(passage.translation).split(/\s+/));
 const common=input.filter(w=>text.has(w)).length;
 return {status:input.length>=8&&common>=7&&common/input.length>=0.7?'strong_unreviewed':'unconfirmed',score:Math.round(100*common/Math.max(1,input.length))};
}
function sameReference(noteLocus,ref){
 const parsed=parseLocus(noteLocus);
 return !!parsed&&parsed.book===ref.book&&(ref.chapter==null||String(parsed.chapter)===String(ref.chapter))&&(ref.section==null||parsed.section===ref.section);
}
function renderNotes(notes,q,ref){
 const container=$('#critical-note-results');if(!container)return;
 container.replaceChildren();
 const selected=$('#critical-edition')?.value||'all';
 const filtered=notes.filter(n=>{
  if(selected!=='all'&&selected!==n.edition)return false;
  const locus=n.locus||n.candidate_locus||'';
  if(ref)return sameReference(locus,ref);
  const hay=[n.text,n.anchor,n.locus,n.candidate_locus,n.footnote_id].join(' ');
  const queryWords=[...new Set(norm(q).match(/[\p{L}\p{N}]{3,}/gu)||[])];
  if(!queryWords.length)return norm(hay).includes(norm(q));
  const words=new Set(norm(hay).match(/[\p{L}\p{N}]{3,}/gu)||[]);
  return queryWords.every(word=>words.has(word));

 });
 // Rank commentary and editorial analysis ahead of raw passage references.
 filtered.sort((a,b)=>{
  const score=n=>{
    const body=norm(n.text||''),anchor=norm(n.anchor||'');
    const terms=[...new Set(norm(q).match(/[\p{L}\p{N}]{3,}/gu)||[])];
    const exact=norm(q);
    return (n.locus?12:n.candidate_locus?6:0)
      +(new Set(body.match(/[\p{L}\p{N}]+/gu)||[]).has(exact)?30:0)
      +(new Set(anchor.match(/[\p{L}\p{N}]+/gu)||[]).has(exact)?18:0)
      +terms.reduce((sum,t)=>sum+(new Set(body.match(/[\p{L}\p{N}]+/gu)||[]).has(t)?4:0)+(new Set(anchor.match(/[\p{L}\p{N}]+/gu)||[]).has(t)?2:0),0);
  };
  return score(b)-score(a);
 });
 const count=$('#critical-note-status');if(count)count.textContent=filtered.length+' notas críticas encontradas en el corpus de 811 notas. '+(ref?'Se indican los loci explícitos o candidatos, sin tratarlos como variantes verificadas.':'');
 for(const n of filtered.slice(0,70)){
  const card=document.createElement('article');card.className='critical-result';
  const locus=n.locus||n.candidate_locus;const status=n.locus?'Locus explícito en la fuente':n.candidate_locus?'Locus sugerido, pendiente de cotejo':'Sin locus verificado';
  const ed=editions.find(e=>e.id===n.edition);const textNote=String(n.text||'');
  card.innerHTML='<p class="meta">'+escape(ed?.name||n.edition)+' · Nota '+escape(n.footnote_id)+' · '+escape(status)+'</p>'+
   '<h3>'+escape(locus?'Vitr., De arch. '+locus:'Nota crítica sin locus asignado')+'</h3>'+
   (n.anchor?'<p><strong>Argumento o contexto de la edición.</strong> '+highlight(String(n.anchor),ref?'':q)+'</p>':'')+
   '<p><strong>Nota del autor.</strong> '+highlight(textNote,ref?'':q)+'</p>'+
   '<p class="source-note">Fuente: '+escape(n.source_file)+' · Párrafo DOCX '+escape(n.source_paragraph)+'</p>'+
   (locus?'<button type="button" data-critical-compare="'+escape(locus)+'">Comparar este locus y sus ediciones →</button>':'');
  container.append(card);
 }
 if(filtered.length>70){const p=document.createElement('p');p.textContent='Se muestran las primeras 70 notas. Afiná la consulta para localizar las restantes.';container.append(p);}
}
async function search(){const q=$('#critical-query').value.trim(),selection=$('#critical-edition').value,lang=$('#critical-mode').value;if(!q)return;const id=++revision;compareRevision++;const oldPanel=$('#critical-comparison');if(oldPanel){oldPanel.hidden=true;oldPanel.replaceChildren()}lastQuery=q;results=[];shown=0;$('#critical-results').replaceChildren();$('#critical-more').hidden=true;$('#critical-submit').disabled=true;$('#critical-status').textContent='Cargando índices textuales…';try{const chosen=editions.filter(e=>selection==='all'||e.id===selection);const [notesLoaded,found]=await Promise.all([getNotes().then(data=>({data})).catch(error=>({error})),Promise.allSettled(chosen.map(getCorpus))]);if(id!==revision)return;if(notesLoaded.data)renderNotes(notesLoaded.data.entries||[],q,parseLocus(q));else $('#critical-note-status').textContent='No se pudieron cargar las notas; la consulta de pasajes sigue disponible.';if(id!==revision)return;const ref=parseLocus(q);for(let k=0;k<found.length;k++){if(found[k].status!=='fulfilled')continue;const data=found[k].value;for(const p of data.passages||[]){if(ref){if(p.book!==ref.book||ref.chapter!==null&&String(p.chapter)!==String(ref.chapter)||ref.section!==null&&(ref.section<p.section||ref.section>(p.section_end||p.section)))continue;}else{const source=lang==='la'?p.latin:lang==='translation'?p.translation:p.latin+' '+p.translation;if(!findMatches(source,q).length)continue;}results.push({edition:chosen[k],passage:p});}}results.sort((a,b)=>a.passage.book-b.passage.book||Number(a.passage.chapter||0)-Number(b.passage.chapter||0)||a.passage.section-b.passage.section);if(selection==='krohn-1912'){const pages=await getKrohn();for(const p of pages){const text=String(p.text||'');if(findMatches(text,q).length){results.push({edition:{id:'krohn-1912',name:'Fritz Krohn · Teubner 1912 · OCR no revisado',pdf:'https://archive.org/details/vitruviidearchit00vitr'},passage:{book:0,chapter:0,section:p.page,locus:'PDF '+p.page,latin:text.slice(0,3500),translation:'',pdf_pages:{latin:p.page}},ocr:true});}}}
const failures=found.filter(v=>v.status==='rejected').length;$('#critical-status').textContent=results.length+' pasajes encontrados en los índices disponibles.'+(failures?' No fue posible consultar '+failures+' edición(es). Recarga la página y vuelve a intentar.':'')+(results.length?' Los resultados no equivalen a variantes manuscritas.':'');render();if(ref&&results.length){const first=results.find(x=>!x.ocr);if(first)compareLocus(first.passage.locus);}}catch(error){$('#critical-status').textContent='Error de consulta: '+error.message;}finally{if(id===revision)$('#critical-submit').disabled=false;}}
$('#critical-form').addEventListener('submit',e=>{e.preventDefault();search()});$('#critical-more').addEventListener('click',render);document.querySelectorAll('[data-example]').forEach(b=>b.addEventListener('click',()=>{$('#critical-query').value=b.dataset.example;search()}));
document.querySelector('#critical-note-results')?.addEventListener('click',e=>{const b=e.target.closest('[data-critical-compare]');if(b)compareLocus(b.dataset.criticalCompare);});
document.querySelector('#critical-results').addEventListener('click',e=>{const b=e.target.closest('[data-critical-compare]');if(b)compareLocus(b.dataset.criticalCompare);});

$('#critical-notes-file')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const parsed=JSON.parse(await f.text());if(!Array.isArray(parsed.entries))throw Error('Falta la lista de notas');notesCache=Promise.resolve(parsed);$('#critical-notes-status').textContent='Índice cargado: '+parsed.entries.length+' notas originales. Consulta un locus para cotejar las notas disponibles.';}catch(err){$('#critical-notes-status').textContent='No se pudo leer el índice: '+err.message;}});

// Deep links permit citation-to-apparatus navigation from the main search and reader.
const initial=new URLSearchParams(location.search);const initialLocus=initial.get('locus')||initial.get('q');if(initialLocus){$('#critical-query').value=initialLocus;search();}
