import {parseLocus,findMatches,roman} from './search-core.mjs?v=20261109-prefacion-v2';
const $=s=>document.querySelector(s);
const editions=[{id:'recensio-es',name:'V514 · Diego Kurilo · Latín / Castellano',pdf:'documents/kurilo-recensio-es.pdf'},{id:'recensio-fr',name:'V554 · Diego Kurilo · Latín / Francés',pdf:'documents/kurilo-recensio-fr.pdf'},{id:'theory-en',name:'V297 · Diego Kurilo · Latín / Inglés',pdf:'documents/kurilo-theory-en.pdf'}];
const cache=new Map();let krohnCache=null;let notesCache=null;let results=[],shown=0,revision=0,lastQuery='';
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function getNotes(){if(!notesCache)notesCache=fetch('data/critical-notes.json').then(r=>r.ok?r.json():{entries:[]}).catch(()=>({entries:[]}));return notesCache;}
async function getKrohn(){if(!krohnCache)krohnCache=fetch('data/text/krohn-1912.json').then(r=>{if(!r.ok)throw Error('No se pudo cargar Krohn');return r.json()}).catch(e=>{krohnCache=null;throw e});return krohnCache;}
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
async function compareLocus(locus){
 const panel=$('#critical-comparison');if(!panel)return;
 panel.hidden=false;panel.replaceChildren();const title=document.createElement('h2');title.textContent='Cotejo paralelo · '+locus;panel.append(title);
 const notes=await getNotes();const locusRef=parseLocus(locus);const noteEntries=(notes.entries||[]).filter(n=>locusRef&&sameReference(n.locus||n.candidate_locus,locusRef));
 const datasets=await Promise.allSettled(editions.map(getCorpus));
 const grid=document.createElement('div');grid.className='critical-parallel';
 let referenceLatin='';
 const ref=parseLocus(locus);
 const findP=res=>res.status==='fulfilled'?res.value.passages.find(p=>p.locus===locus||(ref&&p.book===ref.book&&String(p.chapter)===String(ref.chapter)&&ref.section>=p.section&&ref.section<=(p.section_end||p.section))):null;
 const passages=datasets.map(findP);
 referenceLatin=(passages.find(p=>p?.latin)||{}).latin||'';
 /* Cada recuadro elige su versión: ediciones críticas históricas (Krohn, Rose: texto OCR localizado por
    coincidencia con el latín del locus) o el latín y la traducción de cada edición de Kurilo. */
 const VERSIONS=[
  {id:'krohn',label:'Krohn 1912 · latín (OCR)',ocr:'krohn-1912',pdf:'https://archive.org/details/vitruviidearchit00vitr/page/n'},
  {id:'rose',label:'Rose 1899 · latín (OCR)',ocr:'rose-1899',pdf:'https://archive.org/details/vitruviidearchit00vitr_0/page/n'},
  {id:'es-la',label:'V514 · latín (Kurilo)',ed:0,field:'latin'},{id:'es-tr',label:'V514 · castellano (Kurilo)',ed:0,field:'translation'},
  {id:'fr-la',label:'V554 · latín (Kurilo)',ed:1,field:'latin'},{id:'fr-tr',label:'V554 · francés (Kurilo)',ed:1,field:'translation'},
  {id:'en-la',label:'V297 · latín (Kurilo)',ed:2,field:'latin'},{id:'en-tr',label:'V297 · inglés (Kurilo)',ed:2,field:'translation'}];
 let saved=['krohn','es-la','en-tr'];try{const v=JSON.parse(localStorage.getItem('vitruvius-cotejo-versiones')||'null');if(Array.isArray(v)&&v.length===3&&v.every(x=>VERSIONS.some(y=>y.id===x)))saved=v}catch{}
 const ocrCache={};
 const ocrPages=id=>ocrCache[id]||(ocrCache[id]=fetch('data/text/'+id+'.json').then(r=>r.ok?r.json():[]).catch(()=>[]));
 // Tramo del OCR que mejor coincide con el latín del locus (ventana de palabras con más coincidencias).
 const fold=x=>String(x||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
 async function ocrPassage(id){
  const pages=await ocrPages(id);const want=new Set((fold(referenceLatin).match(/[a-z]{5,}/g)||[]));if(!want.size||!pages.length)return null;
  let best=null;
  for(const pg of pages){const words=String(pg.text||'').split(/\s+/);const hits=words.map(w=>want.has(fold(w).replace(/[^a-z]/g,''))?1:0);
   const span=Math.max(40,Math.round(referenceLatin.split(/\s+/).length*1.15));let sum=0;
   for(let i=0;i<words.length;i++){sum+=hits[i];if(i>=span)sum-=hits[i-span];if(!best||sum>best.sum)best={sum,page:pg.page,words,end:i,span}}}
  if(!best||best.sum<Math.max(4,want.size*0.3))return null;
  const a=Math.max(0,best.end-best.span+1);const win=best.words.slice(a,best.end+1);const got=new Set(win.map(w=>fold(w).replace(/[^a-z]/g,'')).filter(w=>want.has(w)));return {page:best.page,text:win.join(' '),share:Math.min(100,Math.round(100*got.size/want.size))};
 }
 function cardFor(slot){
  const card=document.createElement('article');card.className='critical-parallel-edition';
  const head=document.createElement('div');head.className='critical-version-head';
  const sel=document.createElement('select');sel.setAttribute('aria-label','Versión del recuadro '+(slot+1));
  for(const v of VERSIONS){const o=document.createElement('option');o.value=v.id;o.textContent=v.label;sel.append(o)}sel.value=saved[slot];
  head.append(sel);card.append(head);const body=document.createElement('div');card.append(body);
  async function paint(){
   const v=VERSIONS.find(x=>x.id===sel.value);body.replaceChildren();
   if(v.ocr){
    const sourceId=v.ocr==='krohn-1912'?'vitruviidearchit00vitr':'vitruviidearchit00vitr_0';
    const pdfPath=v.ocr==='krohn-1912'?'documents/krohn-1912.pdf':'https://archive.org/download/'+sourceId+'/'+sourceId+'.pdf';
    const pdfBase=new URL(pdfPath,location.href).href;
    const original='https://archive.org/details/'+sourceId;
    const status=document.createElement('p');status.className='source-note';
    status.textContent='Facsímil histórico disponible. Buscando página candidata en el OCR…';body.append(status);
    const nav=document.createElement('div');nav.className='critical-pdf-tools';
    const prev=document.createElement('button');prev.type='button';prev.textContent='←';
    const label=document.createElement('label');label.textContent='Página digital ';
    const number=document.createElement('input');number.type='number';number.min='1';number.step='1';number.value='1';number.setAttribute('aria-label','Página del PDF histórico');
    label.append(number);
    const next=document.createElement('button');next.type='button';next.textContent='→';
    const go=document.createElement('button');go.type='button';go.textContent='Ir a página';
    nav.append(prev,label,next,go);body.append(nav);
    const frame=document.createElement('iframe');frame.className='critical-pdf-frame';frame.title=v.label+' · facsímil PDF';
    frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';body.append(frame);
    const links=document.createElement('p');links.className='critical-pdf-links';
    const full=document.createElement('a');full.target='_blank';full.rel='noopener noreferrer';
    full.textContent='Abrir PDF completo ↗';
    const archive=document.createElement('a');archive.href=original;archive.target='_blank';archive.rel='noopener noreferrer';archive.textContent='Registro y visor de Internet Archive ↗';
    links.append(full,document.createTextNode(' · '),archive);body.append(links);
    function navigate(page){
     const value=Math.max(1,Math.min(10000,Math.round(Number(page)||1)));
     number.value=String(value);
     const target=pdfBase+'#page='+value+'&zoom=page-width';
     frame.src=target;full.href=target;
    }
    prev.addEventListener('click',()=>navigate(Number(number.value)-1));
    next.addEventListener('click',()=>navigate(Number(number.value)+1));
    go.addEventListener('click',()=>navigate(number.value));
    number.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();navigate(number.value)}});
    // No inventar equivalencia locus-página: si el OCR no da un candidato
    // inequívoco, comenzar en la página 1 y dejar navegación manual.
    navigate(1);
    const hit=await ocrPassage(v.ocr);if(sel.value!==v.id||!body.isConnected)return;
    if(!hit){
     status.textContent='No se identificó una página fiable para '+locus+'. El PDF está disponible desde el comienzo; selecciona manualmente el folio. No se presume alineación entre OCR y locus.';
     return;
    }
    status.textContent='Página candidata '+hit.page+' del PDF · '+hit.share+' % de coincidencia OCR. Ubicación orientativa, no cotejo filológico verificado.';
    navigate(hit.page);
    const excerpt=document.createElement('details');const title=document.createElement('summary');title.textContent='Ver fragmento OCR no revisado';excerpt.append(title);
    const para=document.createElement('p');para.lang='la';para.textContent=hit.text;excerpt.append(para);body.append(excerpt);
    return;
   }
   const p=passages[v.ed];
   if(!p){const x=document.createElement('p');x.textContent=datasets[v.ed].status==='fulfilled'?'Locus no individualizado en esta edición.':'No fue posible cargar esta edición.';body.append(x);return}
   const strong=document.createElement('strong');strong.textContent=v.field==='latin'?'Texto latino':'Traducción';
   const para=document.createElement('p');para.textContent=p[v.field]||'—';if(v.field==='latin')para.lang='la';body.append(strong,para);
   const ownNotes=noteEntries.filter(n=>n.edition===editions[v.ed].id);
   const subtitle=document.createElement('h4');subtitle.textContent='Aparato crítico · '+editions[v.ed].name.split(' · ')[0];body.append(subtitle);
   if(ownNotes.length)for(const n of ownNotes){const q=document.createElement('p');const evidence=anchorEvidence(n,p);
    q.textContent=(n.locus?'Locus citado expresamente en nota':evidence.status==='strong_unreviewed'?'Locus probable: anclaje textual fuerte (sin cotejo editorial)':'Locus propuesto, requiere cotejo')+' · Nota '+n.footnote_id+': '+n.text;body.append(q)}
   else{const q=document.createElement('p');q.textContent='No hay notas vinculadas a este locus en el índice actual de esta edición.';body.append(q)}
  }
  sel.addEventListener('change',()=>{saved[slot]=sel.value;try{localStorage.setItem('vitruvius-cotejo-versiones',JSON.stringify(saved))}catch{}paint()});
  paint();return card;
 }
 for(let slot=0;slot<3;slot++)grid.append(cardFor(slot));
 panel.append(grid);
 const sources=document.createElement('section');sources.className='critical-parallel-edition';
 const sourceTitle=document.createElement('h3');sourceTitle.textContent='Cotejo con ediciones críticas históricas';sources.append(sourceTitle);
 const details=document.createElement('p');details.textContent='Krohn (1912): consultar la edición crítica y su aparato original. La transcripción OCR del sitio no posee una correspondencia de locus verificada, por lo que no se atribuyen variantes automáticamente.';sources.append(details);
 const krohn=document.createElement('a');krohn.href='https://archive.org/details/vitruviidearchit00vitr';krohn.target='_blank';krohn.rel='noopener';krohn.textContent='Consultar Krohn 1912 (facsímil) ↗';sources.append(krohn);
 const budeTitle=document.createElement('p');budeTitle.textContent='Collection Budé: consultar el volumen correspondiente al libro '+locus.split('.')[0]+' y cotejar las referencias citadas en las notas de Kurilo. No se reproducen textos protegidos.';sources.append(budeTitle);
 const bude=document.createElement('a');bude.href='bibliografia.html#chicago-18';bude.textContent='Ver referencias bibliográficas y Budé →';sources.append(bude);panel.append(sources);
 const source=document.createElement('p');source.className='source-note';source.textContent='Comparación de textos indexados, no colación independiente de manuscritos. Krohn y Budé deben citarse por la lección comprobada, no inferirse automáticamente.';panel.append(source);
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
async function search(){const q=$('#critical-query').value.trim(),selection=$('#critical-edition').value,lang=$('#critical-mode').value;if(!q)return;const id=++revision;lastQuery=q;results=[];shown=0;$('#critical-results').replaceChildren();$('#critical-more').hidden=true;$('#critical-submit').disabled=true;$('#critical-status').textContent='Cargando índices textuales…';try{const chosen=editions.filter(e=>selection==='all'||e.id===selection);const [notesLoaded,found]=await Promise.all([getNotes().then(data=>({data})).catch(error=>({error})),Promise.allSettled(chosen.map(getCorpus))]);if(id!==revision)return;if(notesLoaded.data)renderNotes(notesLoaded.data.entries||[],q,parseLocus(q));else $('#critical-note-status').textContent='No se pudieron cargar las notas; la consulta de pasajes sigue disponible.';if(id!==revision)return;const ref=parseLocus(q);for(let k=0;k<found.length;k++){if(found[k].status!=='fulfilled')continue;const data=found[k].value;for(const p of data.passages||[]){if(ref){if(p.book!==ref.book||ref.chapter!==null&&String(p.chapter)!==String(ref.chapter)||ref.section!==null&&(ref.section<p.section||ref.section>(p.section_end||p.section)))continue;}else{const source=lang==='la'?p.latin:lang==='translation'?p.translation:p.latin+' '+p.translation;if(!findMatches(source,q).length)continue;}results.push({edition:chosen[k],passage:p});}}results.sort((a,b)=>a.passage.book-b.passage.book||Number(a.passage.chapter||0)-Number(b.passage.chapter||0)||a.passage.section-b.passage.section);if(selection==='krohn-1912'){const pages=await getKrohn();for(const p of pages){const text=String(p.text||'');if(findMatches(text,q).length){results.push({edition:{id:'krohn-1912',name:'Fritz Krohn · Teubner 1912 · OCR no revisado',pdf:'https://archive.org/details/vitruviidearchit00vitr'},passage:{book:0,chapter:0,section:p.page,locus:'PDF '+p.page,latin:text.slice(0,3500),translation:'',pdf_pages:{latin:p.page}},ocr:true});}}}
const failures=found.filter(v=>v.status==='rejected').length;$('#critical-status').textContent=results.length+' pasajes encontrados en los índices disponibles.'+(failures?' No fue posible consultar '+failures+' edición(es). Recarga la página y vuelve a intentar.':'')+(results.length?' Los resultados no equivalen a variantes manuscritas.':'');render();if(ref&&results.length){const first=results.find(x=>!x.ocr);if(first)compareLocus(first.passage.locus);}}catch(error){$('#critical-status').textContent='Error de consulta: '+error.message;}finally{if(id===revision)$('#critical-submit').disabled=false;}}
$('#critical-form').addEventListener('submit',e=>{e.preventDefault();search()});$('#critical-more').addEventListener('click',render);document.querySelectorAll('[data-example]').forEach(b=>b.addEventListener('click',()=>{$('#critical-query').value=b.dataset.example;search()}));
document.querySelector('#critical-note-results')?.addEventListener('click',e=>{const b=e.target.closest('[data-critical-compare]');if(b)compareLocus(b.dataset.criticalCompare);});
document.querySelector('#critical-results').addEventListener('click',e=>{const b=e.target.closest('[data-critical-compare]');if(b)compareLocus(b.dataset.criticalCompare);});

$('#critical-notes-file')?.addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{const parsed=JSON.parse(await f.text());if(!Array.isArray(parsed.entries))throw Error('Falta la lista de notas');notesCache=Promise.resolve(parsed);$('#critical-notes-status').textContent='Índice cargado: '+parsed.entries.length+' notas originales. Consulta un locus para cotejar las notas disponibles.';}catch(err){$('#critical-notes-status').textContent='No se pudo leer el índice: '+err.message;}});

// Deep links permit citation-to-apparatus navigation from the main search and reader.
const initial=new URLSearchParams(location.search);const initialLocus=initial.get('locus')||initial.get('q');if(initialLocus){$('#critical-query').value=initialLocus;search();}
