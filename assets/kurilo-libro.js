/* Visor de los libros de Diego Kurilo: PDF con índice de capítulos, cambio de lengua (castellano ⇄ inglés)
 * conservando el capítulo, búsqueda dentro del libro con resultados por página, cita Chicago 18 y descarga.
 * Datos: data/kurilo-libros/<id>.json y data/text/<id>-<lengua>.json (generados por scripts/build-kurilo-book.py).
 */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const root=document.querySelector('[data-kurilo-book]');if(!root)return;
 const params=new URLSearchParams(location.search);
 const id=root.dataset.kuriloBook||params.get('id');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
 const UI={es:{contents:'Índice',search:'Buscar en el libro',ph:'Palabra o frase…',cite:'Citar (Chicago 18)',copied:'Cita copiada ✓',download:'Descargar PDF',other:'Read in English',pages:'páginas',hits:'resultados en',none:'Sin resultados en esta edición.',page:'p.',read:'Leer',highlights:'Ediciones de textos',asText:'Leer como texto',asPdf:'Ver PDF',prev:'‹ Anterior',next:'Siguiente ›',noPdf:'Este navegador no muestra PDF incrustados: se abre la lectura como texto (la maquetación completa está en «Descargar PDF»).',also:'Leer también'},
  en:{contents:'Contents',search:'Search the book',ph:'Word or phrase…',cite:'Cite (Chicago 18)',copied:'Citation copied ✓',download:'Download PDF',other:'Leer en castellano',pages:'pages',hits:'results in',none:'No results in this edition.',page:'p.',read:'Read',highlights:'Text editions',asText:'Read as text',asPdf:'View PDF',prev:'‹ Previous',next:'Next ›',noPdf:'This browser does not display embedded PDFs: the book opens as text (full layout via «Download PDF»).',also:'Also read'}};
 let mode=params.get('modo')==='texto'?'text':'pdf',book=null,lang=params.get('lang')||((document.documentElement.lang||'es').startsWith('en')?'en':'es'),page=Number(params.get('page'))||0,texts={};
 const ed=()=>book.editions[lang]||book.editions.es;
 const t=k=>(UI[lang]||UI.es)[k];
 function setPage(p,push=true){
  page=Math.max(1,Math.min(ed().pages,p|0||1));
  if(mode==='text')showText();else $('kb-frame').src=ed().pdf+'#page='+page+'&view=FitH';
  const u=new URL(location.href);u.searchParams.set('lang',lang);u.searchParams.set('page',page);if(!root.dataset.kuriloBook)u.searchParams.set('id',id);
  if(push)history.replaceState(null,'',u);
  for(const a of document.querySelectorAll('#kb-toc a'))a.classList.toggle('current',+a.dataset.page<=page&&+a.dataset.next>page);
 }
 // Capítulo equivalente en la otra lengua: posición entre las entradas de primer nivel del índice.
 function topIndex(e,p){const top=e.toc.filter(x=>x[0]===1);let i=0;top.forEach((x,k)=>{if(x[2]<=p)i=k});return {i,top}}
 function switchLang(){
  const {i,top}=topIndex(ed(),page||1);const from=top[i];const offset=from?Math.max(0,(page||1)-from[2]):0;
  lang=lang==='es'?'en':'es';const other=topIndex(ed(),1).top;const target=other[Math.min(i,other.length-1)];
  render();if($('kb-mode'))$('kb-mode').textContent=t(mode==='text'?'asPdf':'asText');setPage(target?target[2]+Math.min(offset,(other[i+1]?.[2]||ed().pages)-target[2]-1):1);
 }
 function render(){
  const e=ed();document.documentElement.lang=lang;
  $('kb-title').textContent=e.title;$('kb-sub').textContent=e.subtitle||'';
  $('kb-meta').textContent=['Diego Kurilo',book.publisher,book.year,book.edition,book.isbn?'ISBN '+book.isbn+(Object.keys(book.editions).length>1?(lang==='en'?' (shared by the Spanish and English editions)':' (compartido por las ediciones castellana e inglesa)'):''):'',e.pages+' '+t('pages')].filter(Boolean).join(' · ');
  $('kb-lang').textContent=t('other');$('kb-lang').hidden=!book.editions[lang==='es'?'en':'es'];
  $('kb-dl').textContent=t('download');$('kb-dl').href=e.pdf;$('kb-dl').setAttribute('download','');
  $('kb-cite').textContent=t('cite');$('kb-q').placeholder=t('ph');$('kb-search-label').textContent=t('search');$('kb-contents').textContent=t('contents');
  const toc=$('kb-toc');toc.replaceChildren();
  const items=e.toc.filter(x=>x[0]<=2);
  items.forEach((x,k)=>{const a=document.createElement('a');a.href='#';a.dataset.page=x[2];a.dataset.next=(items.slice(k+1).find(y=>y[0]<=x[0])||[0,0,e.pages+1])[2];a.className='lvl'+x[0];a.innerHTML=`<span>${esc(x[1])}</span><small>${x[2]}</small>`;a.onclick=ev=>{ev.preventDefault();setPage(x[2])};toc.append(a)});
  const hl=(book.highlights||{})[lang]||[];const box=$('kb-highlights');box.replaceChildren();box.hidden=!hl.length;
  if(hl.length){const h=document.createElement('p');h.className='kb-h';h.textContent=t('highlights');box.append(h);
   for(const [label,prefix,extra] of hl){const x=e.toc.find(y=>y[1].startsWith(prefix));if(!x)continue;const a=document.createElement('a');a.href='#';a.textContent=label+' · '+t('page')+' '+x[2];a.onclick=ev=>{ev.preventDefault();setPage(x[2])};box.append(a);
    for(const [l,href] of extra||[]){const b=document.createElement('a');b.href=href;b.className='kb-also';b.textContent='↳ '+t('also')+': '+l;box.append(b)}}}
 }
 async function search(){
  const q=$('kb-q').value.trim();const out=$('kb-hits');out.replaceChildren();if(!q)return;
  const e=ed();out.textContent='…';
  try{texts[lang]??=await fetch(e.text).then(r=>r.json())}catch{out.textContent='No se pudo cargar el índice del texto.';return}
  const words=fold(q).split(/\s+/).filter(Boolean);const hits=[];
  for(const p of texts[lang]){const f=fold(p.text);if(words.every(w=>f.includes(w)))hits.push(p)}
  out.replaceChildren();const n=document.createElement('p');n.className='kb-n';n.textContent=hits.length?`${hits.length} ${t('hits')} ${e.title}`:t('none');out.append(n);
  const chap=p=>{let c='';for(const x of e.toc)if(x[0]<=2&&x[2]<=p)c=x[1];return c};
  for(const p of hits.slice(0,80)){const f=fold(p.text);const at=f.indexOf(words[0]);const a0=Math.max(0,at-90);
   const raw=p.text.slice(a0,a0+260);
   const a=document.createElement('a');a.href='#';a.innerHTML=`<b>${t('page')} ${p.page}</b> <i>${esc(chap(p.page))}</i><br>${a0?'… ':''}${highlightFolded(raw,words)} …`;
   a.onclick=ev=>{ev.preventDefault();setPage(p.page)};out.append(a)}
  if(mode==='text')showText();
 }
 // Subrayado tolerante a acentos: se marcan las posiciones del texto original que coinciden sin diacríticos.
 function highlightFolded(raw,words){
  const f=fold(raw);const marks=new Array(raw.length).fill(false);
  for(const w of words){let i=f.indexOf(w);while(i>=0){for(let k=i;k<i+w.length;k++)marks[k]=true;i=f.indexOf(w,i+w.length)}}
  let out='',open=false;[...raw].forEach((ch,k)=>{if(marks[k]&&!open){out+='<mark>';open=true}if(!marks[k]&&open){out+='</mark>';open=false}out+=esc(ch)});return out+(open?'</mark>':'');
 }

 // Lectura como texto (página a página, desde data/text): funciona donde el navegador no muestra PDF
 // incrustados (Android, algunos iOS) y permite subrayar la búsqueda en la página.
 function ensureTextUI(){
  if($('kb-text'))return;
  const st=document.createElement('style');st.textContent='#kb-text{border:1px solid rgba(150,130,95,.45);padding:18px 22px;min-height:60vh}#kb-text .kb-tnav{display:flex;gap:8px;align-items:center;justify-content:space-between;font:13px Arial,sans-serif;margin:0 0 12px}#kb-text .kb-tnav button{padding:6px 12px;border:1px solid #b49a6e;border-radius:999px;background:transparent;color:inherit;cursor:pointer}#kb-text .kb-tbody{white-space:pre-wrap;font:17px/1.65 Georgia,serif;max-width:46em}#kb-text mark{background:#f2dc8a;color:#16130b}.kb-also{font-size:13px!important;opacity:.85;padding-left:10px!important}';document.head.append(st);
  const box=document.createElement('section');box.id='kb-text';box.hidden=true;box.setAttribute('aria-live','polite');
  box.innerHTML='<div class="kb-tnav"><button type="button" data-d="-1"></button><span></span><button type="button" data-d="1"></button></div><div class="kb-tbody"></div>';
  box.querySelectorAll('button').forEach(b=>b.onclick=()=>setPage(page+Number(b.dataset.d)));
  const wrap=document.createElement('div');wrap.style.minWidth='0';$('kb-frame').before(wrap);wrap.append($('kb-frame'),box);
  const tb=document.createElement('button');tb.type='button';tb.id='kb-mode';tb.onclick=()=>setMode(mode==='text'?'pdf':'text');$('kb-cite').after(tb);
 }
 async function showText(){
  ensureTextUI();const e=ed(),box=$('kb-text'),body=box.querySelector('.kb-tbody');
  box.querySelector('[data-d="-1"]').textContent=t('prev');box.querySelector('[data-d="1"]').textContent=t('next');
  box.querySelector('span').textContent=t('page')+' '+page+' / '+e.pages;
  try{texts[lang]??=await fetch(e.text).then(r=>r.json())}catch{body.textContent='No se pudo cargar el texto.';return}
  const p=texts[lang].find(x=>x.page===page);const words=fold($('kb-q').value.trim()).split(/\s+/).filter(Boolean);
  body.innerHTML=p?(words.length?highlightFolded(p.text,words):esc(p.text)):'—';
 }
 function setMode(m){
  ensureTextUI();mode=m;$('kb-text').hidden=m!=='text';$('kb-frame').hidden=m==='text';
  $('kb-mode').textContent=t(m==='text'?'asPdf':'asText');
  const u=new URL(location.href);if(m==='text')u.searchParams.set('modo','texto');else u.searchParams.delete('modo');history.replaceState(null,'',u);
  setPage(page||1,!!page);
 }
 async function cite(){
  const e=ed();const d=new Date().toLocaleDateString(lang,{day:'numeric',month:'long',year:'numeric'});
  const plain=`Kurilo, Diego. ${e.title}${e.subtitle?': '+e.subtitle:''}. ${book.publisher}, ${book.year}${book.isbn?'. ISBN '+book.isbn:''}. ${location.origin+location.pathname}${lang==='en'?', accessed ':', consultado el '}${d}.`;
  const note=`Diego Kurilo, ${e.title}${e.subtitle?': '+e.subtitle:''} (${book.publisher}, ${book.year}), ${page||1}.`;
  const html=`Kurilo, Diego. <i>${esc(e.title)}${e.subtitle?': '+esc(e.subtitle):''}</i>. ${esc(book.publisher)}, ${esc(book.year)}${book.isbn?'. ISBN '+esc(book.isbn):''}.`;
  try{if(window.ClipboardItem)await navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([plain],{type:'text/plain'}),'text/html':new Blob([html],{type:'text/html'})})]);else await navigator.clipboard.writeText(plain)}catch{}
  $('kb-cite-out').innerHTML=`<b>${lang==='en'?'Bibliography':'Bibliografía'}:</b> ${esc(plain)}<br><b>${lang==='en'?'Note':'Nota'}:</b> ${esc(note)}`;$('kb-cite-out').hidden=false;
  $('kb-cite').textContent=t('copied');setTimeout(()=>$('kb-cite').textContent=t('cite'),1800);
 }
 (async()=>{
  try{book=await fetch(`data/kurilo-libros/${id}.json`).then(r=>r.json())}catch{$('kb-title').textContent='No se pudo cargar el libro.';return}
  if(!book.editions[lang])lang='es';
  if(params.get('embed')==='1')document.documentElement.classList.add('kb-embed');
  render();ensureTextUI();
  if(mode!=='text'&&navigator.pdfViewerEnabled===false){mode='text';const n=document.createElement('p');n.className='kb-n';n.textContent=t('noPdf');$('kb-text').before(n)}
  setMode(mode);
  $('kb-lang').onclick=switchLang;$('kb-cite').onclick=cite;
  $('kb-form').onsubmit=ev=>{ev.preventDefault();search()};
  if(params.get('q')){$('kb-q').value=params.get('q');search()}
 })();
})();
