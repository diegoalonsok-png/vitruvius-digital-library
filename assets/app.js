const $ = (q, root=document) => root.querySelector(q);
const $$ = (q, root=document) => [...root.querySelectorAll(q)];
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/æ/gi,'ae').replace(/œ/gi,'oe').replace(/ſ/g,'s').toLowerCase();
const languages = {la:'Latín',es:'Castellano',fr:'Français',en:'English',it:'Italiano',de:'Deutsch'};
const pageCache = new Map();
const documentCache = new Map();
let readerRevision=0;
let catalog, records=[], category='recensio', worker, requestId=0, results=[], shown=0, lastQuery='', currentReader=null, currentPage=1;
let searchKind='words',countSummary=null;

async function fetchJSON(path){ const r=await fetch(path); if(!r.ok)throw new Error(`No se pudo abrir ${path}`);return r.json(); }
function edition(id){return records.find(e=>e.id===id);}
function languageLabel(e){return e.languages.map(l=>languages[l]??l).join('–');}
function showError(target,message){target.textContent=message;}
function searchInternet(query,provider='web',includeVitruvio=true){
  query=query.trim();if(!query)return;
  if(includeVitruvio&&!/vitruv/i.test(query))query=`Vitruvio ${query}`;
  const url=new URL(provider==='scholar'?'https://scholar.google.com/scholar':'https://www.google.com/search');url.searchParams.set('q',query);window.open(url.href,'_blank','noopener,noreferrer');
}
function resultSnippet(r){if(!Number.isInteger(r.context_start))return escapeHTML(r.snippet);const start=r.context_start,end=start+r.context_length;return escapeHTML(r.snippet.slice(0,start))+'<mark>'+escapeHTML(r.snippet.slice(start,end))+'</mark>'+escapeHTML(r.snippet.slice(end));}
function renderCountSummary(summary){
  const box=$('#term-count-summary');box.hidden=!summary;box.replaceChildren();if(!summary)return;
  const rows=summary.editions.map(row=>{const e=edition(row.edition);return `<tr><th scope="row">${escapeHTML(e.title)} <span>${escapeHTML(e.version)}</span></th><td>${row.total.toLocaleString('es-AR')}</td><td>${row.pages.toLocaleString('es-AR')}</td></tr>`;}).join('');
  const grouped=new Map();
  for(const r of results){
    const e=edition(r.edition);
    const book=r.book??r.liber,chapter=r.chapter??r.caput,section=r.section??r.paragraph;
    const valid=book!=null&&chapter!=null&&section!=null;
    const locus=valid?'Vitr., De arch. '+book+'.'+chapter+'.'+section:'Locus pendiente de cotejo';
    const key=r.edition+'|'+locus+'|'+r.page;
    if(!grouped.has(key))grouped.set(key,{edition:e,locus,page:r.page,count:0});
    grouped.get(key).count++;
  }
  const concordance=[...grouped.values()].sort((a,b)=>String(a.edition?.version).localeCompare(String(b.edition?.version))||a.page-b.page);
  const locusRows=concordance.map(x=>'<tr><td>'+escapeHTML(x.edition?.version||x.edition?.year||'Edición')+'</td><td>'+escapeHTML(x.locus)+'</td><td>'+x.page+'</td><td>'+x.count+'</td></tr>').join('');
  box.innerHTML=`<table><caption>Recuento en el texto de las ediciones seleccionadas</caption><thead><tr><th scope="col">Edición</th><th scope="col">Apariciones</th><th scope="col">Páginas</th></tr></thead><tbody>${rows}</tbody></table><p>Se cuenta todo el texto extraído del PDF, incluidas notas y comentarios. Se ignoran mayúsculas y acentos; ${summary.mode==='prefix'?'se incluyen las palabras que empiezan por la raíz escrita':'se buscan palabras completas o la secuencia de palabras escrita'}. Comprobá cada contexto en el documento.</p>${summary.forms.length?`<details><summary>Formas encontradas (${summary.forms.length})</summary><ul>${summary.forms.map(item=>`<li><em>${escapeHTML(item.form)}</em> <strong>${item.count.toLocaleString('es-AR')}</strong></li>`).join('')}</ul></details>`:''}<details open><summary>Concordancia por edición, locus y página (${concordance.length} registros)</summary><table><thead><tr><th>Edición</th><th>Locus verificado</th><th>Página PDF</th><th>Apariciones</th></tr></thead><tbody>${locusRows}</tbody></table><p>El total es del texto indexado, no necesariamente solo del tratado: puede incluir notas, índice y aparato editorial. Los loci sin correspondencia documentada se mantienen pendientes.</p></details>`;
}
function sourceURL(e,page=1){
  if(e.external){const raw=e.read_url||e.source_url;if(!raw)return '#';return /archive\.org\/details\//.test(raw)?raw.replace(/\/$/,'')+'/page/n'+Math.max(0,Math.floor(Number(page)||1)-1):raw;}
  if(!e.pdf_chunks?.length)return new URL(`${e.pdf}#page=${page}`,location.href).href;
  const url=new URL('./',location.href);url.searchParams.set('edition',e.id);url.searchParams.set('page',page);return url.href;
}
async function documentURL(e,format='pdf'){
  const chunks=e[`${format}_chunks`];if(!chunks?.length)return e[format];
  const key=`${e.id}:${format}`;
  if(!documentCache.has(key))documentCache.set(key,(async()=>{
    const parts=await Promise.all(chunks.map(async path=>{const response=await fetch(path);if(!response.ok)throw new Error('No se pudo descargar el documento completo.');return response.arrayBuffer();}));
    const type=format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const blob=new Blob(parts,{type});
    if(blob.size!==e[`${format}_bytes`])throw new Error('La descarga quedó incompleta.');
    if(globalThis.crypto?.subtle&&e[`${format}_sha256`]){
      const hash=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
      const digest=[...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
      if(digest!==e[`${format}_sha256`])throw new Error('No se pudo verificar el documento descargado.');
    }
    return URL.createObjectURL(blob);
  })().catch(error=>{documentCache.delete(key);throw error;}));
  return documentCache.get(key);
}
function downloadLink(e,format){return e[`${format}_chunks`]?.length?sourceURL(e):e[format];}
async function downloadDocument(control,e,format){
  const originalText=control.textContent;control.setAttribute('aria-busy','true');control.textContent='Preparando…';
  try{const url=await documentURL(e,format);const link=document.createElement('a');link.href=url;link.download=`${e.id}.${format}`;link.click();}
  catch(error){window.alert(`${error.message} Volvé a intentar la descarga.`);}
  finally{control.removeAttribute('aria-busy');control.textContent=originalText;}
}

function renderCatalog(){
  const term=normalize($('#catalog-filter').value.trim());
  const aliases=term==='gudiano'?['gudian','gudiano']:term==='harlesiano'?['harleian','harlesiano']:[term];
  const list=records.filter(e=>(term?aliases.some(t=>normalize([e.title,e.subtitle,e.author,e.publisher,e.year,languageLabel(e)].join(' ')).includes(t)):(category==='all'||e.category===category)));
  if(category==='historical')list.sort((a,b)=>Number((a.year.match(/\d{4}/)||['9999'])[0])-Number((b.year.match(/\d{4}/)||['9999'])[0]));
  const container=$('#catalog-list');container.className=`catalog-list ${category}`;
  container.innerHTML=list.map(e=>{
    const external=Boolean(e.external);
    const cover=external?`<div class="edition-date">${escapeHTML(e.dateShort||e.year)}</div>`:e.cover?`<button type="button" class="cover-link" data-read="${e.id}" aria-label="Leer ${escapeHTML(e.title)}"><img src="${escapeHTML(e.cover)}" alt="Portada de ${escapeHTML(e.title)}" loading="lazy" width="123" height="188"></button>`:`<div class="edition-date" aria-label="Portada original pendiente de incorporación">${escapeHTML(e.version||e.year)}</div>`;
    const label=e.category==='recensio'?'Edición principal':e.category==='manuscripts'?'Testimonio manuscrito':e.category==='studies'?'Estudio':e.languages.length===1&&e.languages[0]==='la'?'Edición del texto latino':e.languages.includes('la')?'Edición bilingüe':'Traducción histórica';
    let actions=external?`<a class="button outline" href="${escapeHTML(e.read_url||e.source_url)}" target="_blank" rel="noopener">${e.access==='catalog'?'Ficha institucional':e.access==='public_pdf'?'Leer PDF completo':'Leer en la institución'} ↗</a>`:e.pdf||e.pdf_chunks?.length?`<button type="button" class="button primary" data-read="${e.id}">Leer en línea →</button><a href="${downloadLink(e,'pdf')}" data-download="${e.id}" data-format="pdf" download>PDF ↓</a>${e.docx?`<a href="${downloadLink(e,'docx')}" data-download="${e.id}" data-format="docx" download>DOCX ↓</a>`:''}<button type="button" data-compare="${e.id}">Comparar</button>`:`<span class="pending-source" aria-label="Documento pendiente de incorporación">Documento en incorporación</span>`;
    if(external&&e.pdf_url&&e.access!=='public_pdf')actions+=`<a href="${escapeHTML(e.pdf_url)}" target="_blank" rel="noopener">PDF${e.pdf_size_mb?` (${Math.round(e.pdf_size_mb)} MB)`:''} ↗</a>`;
    if(external&&e.read_url&&e.source_url!==e.read_url)actions+=`<a href="${escapeHTML(e.source_url)}" target="_blank" rel="noopener">Ficha ↗</a>`;
    if(!external&&e.source_url)actions+=`<a href="${escapeHTML(e.source_url)}" target="_blank" rel="noopener">Fuente ↗</a>`;
    return `<article class="catalog-card${external?' external':''}">${cover}<div><div class="record-label"><span class="primary-label">${label}</span><span>${escapeHTML(e.version||e.year)}</span></div><h3>${escapeHTML(e.title)}</h3><p class="subtitle">${escapeHTML(e.subtitle)}</p><p class="book-meta">${escapeHTML(e.author)}<br>${escapeHTML(languageLabel(e))}${e.pages?` · ${e.pages.toLocaleString('es-AR')} páginas`:''} · ${escapeHTML(e.year)}<br>${escapeHTML(e.publisher)}</p><p class="book-description">${escapeHTML(e.description)}</p><div class="catalog-actions">${actions}</div>${e.attribution?`<p class="book-source">${escapeHTML(e.attribution)}</p>`:''}</div></article>`;
  }).join('');
  $('#catalog-empty').hidden=list.length!==0;
  $('#catalog-status').textContent=`${list.length} ${list.length===1?'ficha':'fichas'} en esta selección · ${records.filter(e=>!e.external&&(e.pdf||e.pdf_chunks?.length)).length} PDF incorporados · ${records.filter(e=>e.external).length} fuentes enlazadas`;
}

async function getPages(e){
  if(!e.text_index)return null;
  if(!pageCache.has(e.id))pageCache.set(e.id,fetchJSON(e.text_index).catch(err=>{pageCache.delete(e.id);throw err;}));
  return pageCache.get(e.id);
}

async function openReader(id,page=1){
  const e=edition(id);if(!e)return;
  if(!e.external&&!e.pdf&&!e.pdf_chunks?.length){window.alert('Esta edición todavía no tiene un documento incorporado al sitio.');return;}
  // Las ediciones externas también se leen en el visor propio: OCR + facsímil enlazado.
  if(e.external){
    currentReader=e;$('#reader-title').textContent=e.title;
    $('#reader-edition').textContent=`${e.version||e.year} · ${languageLabel(e)} · OCR histórico`;
    $('#reader-download').hidden=true;$('#reader-download').removeAttribute('data-download');
    if(!$('#reader-dialog').open)$('#reader-dialog').showModal();
    await setReaderPage(page);return;
  }
  $('#reader-download').hidden=false;
  currentReader=e;$('#reader-title').textContent=e.title;$('#reader-edition').textContent=`${e.version} · ${languageLabel(e)}`;
  $('#reader-download').href=downloadLink(e,'pdf');$('#reader-download').download=`${e.id}.pdf`;$('#reader-download').dataset.download=e.id;$('#reader-download').dataset.format='pdf';
  if(!$('#reader-dialog').open)$('#reader-dialog').showModal();
  await setReaderPage(page);
}

async function setReaderPage(page){
  const e=currentReader;if(!e)return;
  const revision=++readerRevision;
  const requestedPage=Math.min(e.pages,Math.max(1,Math.round(Number(page)||1)));currentPage=requestedPage;
  $('#reader-page').value=currentPage;$('#reader-page').max=e.pages;
  $('#reader-page-total').textContent=`de ${e.pages.toLocaleString('es-AR')}`;
  $('#reader-edition').textContent=citationLine(e,requestedPage);
  $('#reader-prev').disabled=currentPage<=1;$('#reader-next').disabled=currentPage>=e.pages;
  $('#reader-frame').removeAttribute('src');$('#reader-external').href=sourceURL(e,requestedPage);
  if(e.external){
    const archive=(e.read_url||e.source_url||'').match(/archive\.org\/details\/([^/?#]+)/);
    if(archive)$('#reader-frame').src='https://archive.org/embed/'+encodeURIComponent(archive[1])+'/page/n'+Math.max(0,requestedPage-1);
    const drive=(e.read_url||e.source_url||'').match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
    if(drive)$('#reader-frame').src='https://drive.google.com/file/d/'+encodeURIComponent(drive[1])+'/preview';
    $('#reader-external').textContent='Abrir facsímil original ↗';
    if(e.access==='public_pdf'){$('#reader-text').textContent='Edición íntegra disponible en el visor. Para navegar por loci necesitamos finalizar la indexación de los libros y las correspondencias entre versiones.';return;}
    $('#reader-text').textContent='Cargando la transcripción histórica de esta página…';
    try{const pages=await getPages(e);if(revision===readerRevision&&currentReader?.id===e.id)$('#reader-text').textContent=pages?.[requestedPage-1]?.text||'No hay texto OCR en esta página. Abrí el facsímil original.';}
    catch{if(revision===readerRevision)$('#reader-text').textContent='No se pudo cargar el OCR. Abrí la fuente original.';}
    return;
  }
  $('#reader-external').textContent='Abrir PDF en otra pestaña ↗';
  documentURL(e).then(url=>{if(revision!==readerRevision||currentReader?.id!==e.id||!$('#reader-dialog').open)return;const pdfURL=`${url}#page=${requestedPage}&view=FitH`;$('#reader-frame').src=pdfURL;$('#reader-external').href=pdfURL;}).catch(error=>{if(revision===readerRevision)$('#reader-text').textContent=`${error.message} Volvé a abrir la edición para intentarlo de nuevo.`;});
  $('#reader-text').textContent=e.id==='krohn-1912'?'Edición Krohn (1912): consultá el facsímil visible. El OCR original contiene errores de caracteres griegos y signos críticos; se utiliza solo para localizar páginas.':e.searchable?'Cargando el texto de esta página…':'Facsímil en imagen. Consultá el PDF para ver el testimonio manuscrito.';
  if(!e.searchable||e.id==='krohn-1912')return;
  try{const pages=await getPages(e);if(revision===readerRevision&&currentReader?.id===e.id)$('#reader-text').textContent=pages?.[requestedPage-1]?.text||'Esta página no contiene texto extraíble. Consultá el PDF.';}catch{if(revision===readerRevision)$('#reader-text').textContent='El texto de consulta no se pudo cargar. Podés abrir el PDF de esta página.';}
}

function closeReader(){ readerRevision++;$('#reader-dialog').close();$('#reader-frame').removeAttribute('src'); }

function openComparison(id='recensio-es',page=1){
  if($('#reader-dialog').open)closeReader();
  const available=records.filter(e=>e.external||e.pdf||e.pdf_chunks?.length).filter((e,i,a)=>a.findIndex(x=>x.id===e.id)===i);
  if(!available.length){window.alert('La consulta comparada estará disponible cuando las ediciones estén incorporadas.');return;}
  const first=available.find(e=>e.id===id)||available[0];
  const second=available.find(e=>e.id!==first.id)||first;
  const paneContainer=$('#comparison-panes');paneContainer.replaceChildren();
  [first,second].forEach((e,i)=>{
    const pane=document.createElement('section');pane.className='compare-pane';pane.dataset.mode='pdf';
    const optionList=available.map(x=>`<option value="${x.id}" ${x.id===e.id?'selected':''}>${escapeHTML(x.title)} · ${escapeHTML(x.version||x.year)} · ${escapeHTML(languageLabel(x))}${x.external?' [fuente externa]':''}</option>`).join('');
    pane.innerHTML=`<div class="compare-controls"><label class="sr-only" for="compare-edition-${i}">Edición ${i+1}</label><select id="compare-edition-${i}">${optionList}</select><button type="button" class="compare-prev" aria-label="Página anterior">←</button><label>Página PDF <input type="number" class="compare-page" value="${i===0?page:1}" min="1"></label><span class="compare-total"></span><button type="button" class="compare-next" aria-label="Página siguiente">→</button><button type="button" class="compare-mode">Ver PDF</button><a class="compare-external" target="_blank" rel="noopener">Abrir fuente ↗</a></div><div class="compare-body"></div>`;
    $('select',pane).addEventListener('change',()=>{const selected=edition($('select',pane).value);$('.compare-page',pane).value=1;pane.dataset.mode='pdf';renderComparePane(pane);});
    $('.compare-page',pane).addEventListener('change',()=>renderComparePane(pane));
    $('.compare-page',pane).addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();renderComparePane(pane);}});
    $('.compare-prev',pane).addEventListener('click',()=>{$('.compare-page',pane).value=Math.max(1,Number($('.compare-page',pane).value)-1);renderComparePane(pane);});
    $('.compare-next',pane).addEventListener('click',()=>{$('.compare-page',pane).value=Number($('.compare-page',pane).value)+1;renderComparePane(pane);});
    $('.compare-mode',pane).addEventListener('click',()=>{pane.dataset.mode=pane.dataset.mode==='text'?'pdf':'text';renderComparePane(pane);});
    paneContainer.append(pane);renderComparePane(pane);
  });
  const note=$('.comparison-note');
  let locusForm=$('#comparison-locus-form');
  if(!locusForm){
    locusForm=document.createElement('form');locusForm.id='comparison-locus-form';
    locusForm.className='compare-controls';
    locusForm.innerHTML='<label>Libro <select id="comparison-book"><option value="">Elegir libro</option>'+Array.from({length:10},(_,i)=>'<option value="'+(i+1)+'">Libro '+(i+1)+'</option>').join('')+'</select></label><label>Locus latino (libro.capítulo.sección) <input id="comparison-locus" type="text" placeholder="I.1.1" aria-label="Locus latino"></label><button type="submit">Localizar locus →</button><span id="comparison-locus-status" role="status"></span>';
    note.after(locusForm);
    $('#comparison-book').addEventListener('change',()=>{$('#comparison-locus').value=$('#comparison-book').value?$('#comparison-book').value+'.1.1':'';});
    locusForm.addEventListener('submit',async event=>{
      event.preventDefault();
      const val=($('#comparison-locus').value.trim()||($('#comparison-book').value?$('#comparison-book').value+'.1':'')).toUpperCase();
      const match=val.match(/^([IVX]+|10|[1-9])\s*[.·,]\s*(praef|praefatio|\d{1,2})(?:\s*[.·,]\s*(\d{1,3}))?$/i);
      const status=$('#comparison-locus-status');
      if(!match){status.textContent='Usá una referencia como I.1.1 o III.1.2.';return;}
      const romans={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};
      const book=romans[match[1]]||Number(match[1]),isPreface=/^praef/i.test(match[2]),chapter=isPreface?null:Number(match[2]),section=match[3]==null?null:Number(match[3]);
      if(book<1||book>10||(!isPreface&&chapter<1)){status.textContent='Referencia fuera de los diez libros.';return;}
      status.textContent='Buscando referencias editoriales verificadas…';
      let mapped=0;
      for(const pane of $('.compare-pane',$('#comparison-panes'))){
        const e=edition($('select',pane).value);
        if(!e?.text_index)continue;
        try{
          const pages=await getPages(e);
          const found=pages.find(p=>Number(p.book??p.liber)===book&&(isPreface?/praef/i.test(String(p.chapter??p.caput??p.locus??'')):Number(p.chapter??p.caput)===chapter)&&(section==null||Number(p.section??p.paragraph)===section));
          if(found){$('.compare-page',pane).value=found.page;renderComparePane(pane);mapped++;}
        }catch{}
      }
      status.textContent=mapped?('Locus identificado en '+mapped+' edición(es); comprobá cada facsímil. '+(mapped<2?'La otra edición aún no tiene correspondencia validada.':'')):'Locus no indexado: todavía no hay correspondencias libro/capítulo/sección verificadas. No se asignan páginas por aproximación.';
    });
  }
  $('#comparison-dialog').showModal();
}

async function renderComparePane(pane){
  const e=edition($('select',pane).value),body=$('.compare-body',pane);body.replaceChildren();
  const external=$('.compare-external',pane),pageInput=$('.compare-page',pane),modeButton=$('.compare-mode',pane);
  const page=Math.max(1,Math.min(e.pages||1,Math.round(Number(pageInput.value)||1)));pageInput.value=page;pageInput.max=e.pages||1;
  $('.compare-total',pane).textContent=e.pages?`/ ${e.pages}`:'';
  let citation=$('.compare-citation',pane);
  if(!citation){citation=document.createElement('p');citation.className='compare-source-note compare-citation';$('.compare-controls',pane).after(citation);}
  citation.textContent=citationLine(e,page);
  for(const c of [pageInput,$('.compare-prev',pane),$('.compare-next',pane)])c.disabled=false;
  external.href=sourceURL(e,page);
  if(e.id==='krohn-1912')pane.dataset.mode='pdf';
  modeButton.hidden=!e.searchable||e.id==='krohn-1912';
  modeButton.textContent=pane.dataset.mode==='text'?'Ver facsímil':'Ver OCR sin revisar';
  if(e.external){
    if(pane.dataset.mode==='text'&&e.searchable){
      body.textContent='OCR AUTOMÁTICO NO REVISADO — puede presentar caracteres corruptos y no debe citarse sin cotejar el facsímil.\n\nCargando transcripción…';
      try{const pages=await getPages(e);if($('select',pane).value===e.id&&Number(pageInput.value)===page)body.textContent='OCR AUTOMÁTICO NO REVISADO — no citar sin cotejar el facsímil.\n\n'+(pages?.[page-1]?.text||'Sin OCR en esta página. Consultá el facsímil.');}
      catch{body.textContent='OCR no disponible. Consultá el facsímil original.';}
    }else{
      const url=e.read_url||e.source_url,archive=(url||'').match(/archive\.org\/details\/([^/?#]+)/),drive=(url||'').match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
      if(archive){const frame=document.createElement('iframe');frame.title=e.title+' · página '+page;frame.src='https://archive.org/embed/'+encodeURIComponent(archive[1])+'/page/n'+Math.max(0,page-1);body.replaceChildren(frame);}
      else if(drive){const frame=document.createElement('iframe');frame.title=e.title+' · libro completo';frame.src='https://drive.google.com/file/d/'+encodeURIComponent(drive[1])+'/preview';body.replaceChildren(frame);}
      else body.textContent='Consultá el facsímil en la institución mediante «Abrir fuente».';
    }return;
  }
  if(pane.dataset.mode==='pdf'||!e.searchable){
    const loading=document.createElement('p');loading.className='compare-source-note';loading.textContent='Preparando el facsímil…';body.append(loading);
    try{const url=await documentURL(e);if($('select',pane).value!==e.id||Number(pageInput.value)!==page||(pane.dataset.mode!=='pdf'&&e.searchable))return;const frame=document.createElement('iframe');frame.title=`${e.title}, página PDF ${page}`;frame.src=`${url}#page=${page}&view=FitH`;external.href=frame.src;body.replaceChildren(frame);}catch(error){loading.textContent=`${error.message} Volvé a seleccionar la edición para intentarlo de nuevo.`;}return;
  }
  const p=document.createElement('p');p.textContent='Cargando la página…';body.append(p);
  try{const pages=await getPages(e);if($('select',pane).value===e.id&&Number(pageInput.value)===page)p.textContent=(e.id==='krohn-1912'?'OCR AUTOMÁTICO SIN REVISAR — cotejar facsímil antes de citar.\n\n':'')+(pages?.[page-1]?.text||'Sin texto extraíble en esta página. Usá «Ver PDF».');}catch{p.textContent='No se pudo cargar el texto. Usá «Ver PDF» para consultar el documento.';}
}

function ensureWorker(){
  if(worker)return worker;
  worker=new Worker(new URL('./search-worker.js?v=20261030-loci-03',import.meta.url),{type:'module'});
  worker.onmessage=event=>{
    const data=event.data;if(data.requestId!==requestId)return;
    if(data.type==='progress'){$('#search-status').textContent=data.message;return;}
    $('#search-button').disabled=false;$('#search-button').textContent='Buscar →';
    if(data.type==='error'){$('#search-status').textContent=data.message;return;}
    if(data.type==='results'){
      results=data.results;countSummary=data.countSummary||null;shown=0;$('#search-results').replaceChildren();renderCountSummary(countSummary);
      const label=searchKind==='semantic'?'pasajes por afinidad de significado':'páginas con coincidencias';
      $('#search-status').textContent=countSummary?`${countSummary.total.toLocaleString('es-AR')} ${countSummary.total===1?'aparición':'apariciones'} de «${lastQuery}» en ${countSummary.pages.toLocaleString('es-AR')} ${countSummary.pages===1?'página':'páginas'}.`:results.length?`${results.length.toLocaleString('es-AR')} ${label} para «${lastQuery}».`:`Palabra o frase no encontrada: «${lastQuery}» en la selección actual. Probá otra grafía, una palabra aislada o elegí «Todos los textos incorporados».`;
      renderMore();$('#export-tools').hidden=results.length===0;
    }
  };
  worker.onerror=()=>{$('#search-status').textContent='La búsqueda no pudo iniciarse. Recargá la página e intentá de nuevo.';$('#search-button').disabled=false;};
  return worker;
}

function startSearch(){
  const query=$('#query').value.trim();if(!query)return;
  if($('#search-kind').value==='internet'){ searchInternet(query,$('#internet-provider-main').value,true);$('#search-status').textContent='Consulta abierta en el buscador externo en otra pestaña.';return; }
  if(!records.some(e=>e.searchable&&e.text_index)){
    $('#search-status').textContent='Todavía no hay PDF con índice textual publicado. Usá las opciones Google o Google Académico; las ediciones están en incorporación.';
    return;
  }
  lastQuery=query;searchKind=$('#search-kind').value;results=[];countSummary=null;renderCountSummary(null);shown=0;requestId++;
  $('#export-tools').hidden=true;$('#more-results').hidden=true;$('#search-results').replaceChildren();
  $('#search-status').textContent=searchKind==='semantic'?'Preparando la búsqueda por significado…':searchKind==='count'?'Preparando el recuento del término…':'Preparando la búsqueda en las ediciones seleccionadas…';
  $('#search-button').disabled=true;$('#search-button').textContent='Buscando…';
  ensureWorker().postMessage({type:'search',requestId,query,kind:searchKind,mode:$('#search-mode').value,countMode:$('#count-mode').value,scope:$('#scope').value,baseURL:new URL('./',location.href).href,editions:records.filter(e=>e.searchable&&e.text_index),semantic:catalog.semantic});
}

function locusLabel(r){
  // Libro/capítulo/sección solo cuando constan explícitamente en el índice verificado.
  const book=r.book??r.liber, chapter=r.chapter??r.caput, section=r.section??r.paragraph;
  if(book==null||chapter==null)return 'Locus vitruviano: pendiente de identificación';
  return 'Vitruvio, De architectura '+book+'.'+chapter+(section==null?'':'.'+section);
}
function knownLocus(e,page){
  // Only individually cross-checked Krohn locations are displayed as verified.
  if(e?.id==='krohn-1912'&&Number(page)===27)return 'Vitr., De arch. I.2.1';
  if(e?.id==='krohn-1912'&&Number(page)===77)return 'Vitr., De arch. III.1.1';
  return 'Libro, capítulo y sección: pendientes de cotejo';
}
function citationLine(e,page){return (e?.version||e?.year||'Edición')+' · '+knownLocus(e,page)+' · p. PDF '+page;}
function locusReference(r){return locusLabel(r)+' · página PDF '+r.page;}
function renderMore(){
  const next=results.slice(shown,shown+16);const container=$('#search-results');
  for(const r of next){const e=edition(r.edition);const article=document.createElement('article');article.className='result';const ordinal=shown+next.indexOf(r)+1;const isOcr=Boolean(e.searchable&&(e.external||e.id==='krohn-1912'));
    article.innerHTML=`<div class="result-meta">N.º ${ordinal} · ${escapeHTML(e.version)} · ${escapeHTML(languageLabel(e))}${isOcr?' · TRANSCRIPCIÓN OCR':''}${searchKind==='semantic'?' · AFINIDAD SEMÁNTICA':searchKind==='count'?` · APARICIÓN ${r.occurrence}`:''}</div><h3>${escapeHTML(e.title)}</h3><p class="result-locus"><strong>${escapeHTML(locusLabel(r))}</strong> · p. PDF ${r.page}</p><p lang="${e.languages?.includes('la')?'la':''}">${e.id==='krohn-1912'?`Coincidencia de <mark>${escapeHTML($('#query').value.trim())}</mark> localizada en el índice OCR. Abrí el facsímil para verificar la palabra en su página original.`:resultSnippet(r)}</p>${isOcr?'<p class="book-source">Transcripción automática sin revisión filológica: puede contener letras griegas mal reconocidas, números de línea y palabras partidas. Verificá la lectura en el facsímil.</p>':''}<div class="result-actions"><button type="button" data-read="${e.id}" data-page="${r.page}">Leer el pasaje →</button><button type="button" data-compare="${e.id}" data-page="${r.page}">Comparar</button><a href="${escapeHTML(sourceURL(e,r.page))}" target="_blank" rel="noopener">Ver facsímil ↗</a><span class="result-page">Página PDF ${r.page}</span></div>`;container.append(article);
  }
  shown+=next.length;$('#more-results').hidden=shown>=results.length;
  if(shown<results.length)$('#more-results').textContent=`Mostrar más resultados (${shown} de ${results.length})`;
}

function resultExportRows(){if($('#export-limit').value==='all')return results;const limit=Number($('#export-limit').value)||50;return results.slice(0,limit);}
function printResults(){
  const rows=resultExportRows();if(!rows.length)return;
  const popup=window.open('','_blank');if(!popup){$('#search-status').textContent='Permití abrir la vista de impresión en tu navegador para guardar los resultados como PDF.';return;}
  const date=new Intl.DateTimeFormat('es-AR',{dateStyle:'long'}).format(new Date());
  const content=rows.map((r,i)=>{const e=edition(r.edition);const link=sourceURL(e,r.page);return `<article><div class="n">${i+1} · ${escapeHTML(e.version)} · ${escapeHTML(languageLabel(e))}</div><h2>${escapeHTML(e.title)}</h2><p class="ref">${escapeHTML(e.author)}. ${escapeHTML(e.subtitle)}. ${escapeHTML(e.publisher)}, ${escapeHTML(e.year)}. ${escapeHTML(locusReference(r))}.</p><blockquote>${resultSnippet(r)}</blockquote><p class="url">Fuente: ${escapeHTML(link)}</p></article>`;}).join('');
  popup.document.open();popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Vitruvius — Resultados de ${escapeHTML(lastQuery)}</title><style>body{max-width:760px;margin:40px auto;color:#172b3c;font-family:Georgia,serif;line-height:1.65;padding:0 25px}h1{font-size:31px;font-weight:400;margin-bottom:6px}h2{font-size:20px;margin:5px 0;font-weight:400}.sub,.ref,.n,.url{font-family:Arial,sans-serif;font-size:10px;color:#626969}.n{font-size:9px;letter-spacing:.6px}article{border-top:1px solid #bbb;padding:20px 0;break-inside:avoid}blockquote{font-size:16px;margin:12px 0}.url{overflow-wrap:anywhere;font-size:8px}.tools{font-family:Arial,sans-serif;margin:25px 0;padding:15px;background:#eeece5}.tools button{background:#122a42;color:#fff;border:0;padding:12px;cursor:pointer}.tools p{font-size:11px}@page{size:A4;margin:20mm 18mm}@media print{body{margin:0;max-width:none;padding:0}.tools{display:none}h1{font-size:26px}}</style></head><body><h1>Vitruvius Digital Library</h1><p class="sub">LISTADO DE RESULTADOS · ${escapeHTML(date)}</p><p>Consulta: <strong>${escapeHTML(lastQuery)}</strong><br>Modo: ${searchKind==='semantic'?'Afinidad semántica':searchKind==='count'?'Recuento literal':'Búsqueda textual'}. ${rows.length} resultados incluidos de ${results.length}.${countSummary?`<br>Recuento: ${countSummary.total} apariciones en ${countSummary.pages} páginas. ${countSummary.mode==='prefix'?'Palabras que empiezan por la raíz escrita.':'Palabra o secuencia exacta.'} Incluye notas y comentarios; se ignoran mayúsculas y acentos.`:''}</p><div class="tools"><button id="print">Imprimir / guardar como PDF</button><p>En el cuadro de impresión del navegador, elegí «Guardar como PDF». Las páginas indicadas corresponden al archivo PDF consultado.</p></div>${content}<p class="sub">Proyecto y edición de Diego Kurilo. Verificá las citas en los documentos de referencia.</p></body></html>`);popup.document.close();popup.document.getElementById('print').addEventListener('click',()=>popup.print());
}

function downloadCSV(){
  const rows=resultExportRows();const csvValue=s=>{s=String(s??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const values=[['Consulta','Tipo de búsqueda','Título','Edición','Idioma','Autor','Página PDF','Pasaje','Forma encontrada','Aparición en la edición','Enlace'],...rows.map(r=>{const e=edition(r.edition);return[lastQuery,searchKind==='semantic'?'Semántica':searchKind==='count'?'Recuento literal':'Textual',e.title,e.version,languageLabel(e),e.author,r.page,r.snippet,r.form||'',r.occurrence||'',sourceURL(e,r.page)];})];
  const blob=new Blob(['\ufeff'+values.map(row=>row.map(csvValue).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='Vitruvius_Resultados.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}

function emailResults(){
  const rows=resultExportRows();
  if(!rows.length)return;
  const subject='Vitruvius Digital Library — consulta: '+lastQuery.slice(0,100);
  const limit=Math.min(rows.length,8);
  const lines=[
    'VITRUVIUS DIGITAL LIBRARY — RESULTADOS DE INVESTIGACIÓN',
    'Consulta: '+lastQuery,
    'Tipo: '+(searchKind==='semantic'?'Búsqueda por significado':searchKind==='count'?'Recuento de términos':'Búsqueda textual'),
    'Resultados de la selección: '+rows.length+' (total: '+results.length+')',
    countSummary?'Total de apariciones: '+countSummary.total+' en '+countSummary.pages+' páginas':'',
    '',
    'REFERENCIAS Y PASAJES'
  ];
  rows.slice(0,limit).forEach((r,i)=>{
    const e=edition(r.edition);
    lines.push((i+1)+'. '+e.title+' ('+e.version+'), '+locusReference(r));
    lines.push(r.snippet.replace(/\s+/g,' ').slice(0,170));
    lines.push(sourceURL(e,r.page));
    lines.push('');
  });
  lines.push('Para enviar el PDF completo con todos los contextos: primero elegí «Imprimir / guardar PDF» en el sitio, guardá el archivo y adjuntalo manualmente a este correo. La página no puede adjuntar archivos automáticamente desde un enlace mailto.');
  window.location.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.filter(Boolean).join('\n'));
}

function addSearchControls(){
  const options=$('.search-options');
  const label=document.createElement('label');label.innerHTML='Búsqueda<select id="search-kind"><option value="words" selected>Buscar palabras y frases en los libros</option><option value="count">Contar término y ver contextos</option><option value="semantic">Por significado · IA local</option><option value="internet">Buscar en internet</option></select>';const provider=document.createElement('label');provider.id='internet-provider-main-label';provider.hidden=true;provider.innerHTML='Buscador<select id="internet-provider-main"><option value="web">Google</option><option value="scholar">Google Académico</option></select>';options.append(provider);options.prepend(label);
  const countLabel=document.createElement('label');countLabel.id='count-mode-label';countLabel.hidden=true;countLabel.innerHTML='Recuento<select id="count-mode"><option value="exact">Palabra o frase exacta</option><option value="prefix">Raíz · empieza por</option></select>';options.append(countLabel);
  const countNote=document.createElement('p');countNote.id='count-note';countNote.className='search-note';countNote.hidden=true;countNote.textContent='Ejemplo latino: symmetria para la palabra completa; symmetr en modo raíz para incluir sus terminaciones. El recuento muestra cada aparición y su contexto, con la página de origen.';$('.search-note').before(countNote);
  const summary=document.createElement('div');summary.id='term-count-summary';summary.className='term-count-summary';summary.hidden=true;$('#search-status').after(summary);
  const note=document.createElement('p');note.id='semantic-note';note.className='search-note';note.textContent='La primera búsqueda por significado descarga un modelo gratuito (aprox. 150 MB). La consulta se procesa en este dispositivo; los resultados son pasajes del corpus, con su página de origen.';$('.search-note').before(note);
  $('#search-mode').parentElement.hidden=false;$('#semantic-note').hidden=true;
  $('#search-kind').addEventListener('change',()=>{const kind=$('#search-kind').value;$('#semantic-note').hidden=kind!=='semantic';$('#search-mode').parentElement.hidden=kind!=='words';$('#count-mode-label').hidden=kind!=='count';$('#count-note').hidden=kind!=='count';$('#internet-provider-main-label').hidden=kind!=='internet';$('#scope').parentElement.hidden=kind==='internet';});
  const tools=document.createElement('div');tools.id='export-tools';tools.className='export-tools';tools.hidden=true;tools.innerHTML='<label>Resultados del listado <select id="export-limit"><option value="20">Primeros 20</option><option value="50" selected>Primeros 50</option><option value="100">Primeros 100</option><option value="all">Todos</option></select></label><button type="button" class="button outline" id="print-results">Imprimir / guardar PDF</button><button type="button" class="text-link" id="csv-results">Descargar listado CSV ↓</button><button type="button" class="text-link" id="email-results">Preparar correo ↗</button>';
  $('#search-status').after(tools);$('#print-results').addEventListener('click',printResults);$('#csv-results').addEventListener('click',downloadCSV);$('#email-results').addEventListener('click',emailResults);
}

async function initialize(){
  addSearchControls();
  $('#internet-form').addEventListener('submit',event=>{
    event.preventDefault();
    searchInternet($('#internet-query').value,$('#internet-provider').value,$('#internet-vitruvio').checked);
  });
  const loads=await Promise.allSettled([fetchJSON('data/catalog.json'),fetchJSON('data/historical.json'),fetchJSON('data/supplements.json')]);
  if(loads[0].status!=='fulfilled'){showError($('#catalog-status'),'No se pudo cargar el catálogo. Recargá la página para intentarlo de nuevo.');return;}
  catalog=loads[0].value;records=[...catalog.editions,...(loads[1].status==='fulfilled'?loads[1].value:[])];
  for(const e of records)if(e.id.startsWith('gudianus'))e.category='manuscripts';
  $('#stat-records').textContent=records.length;$('#stat-pages').textContent=catalog.searchable_pages.toLocaleString('es-AR');
  $('#historic-count').textContent=records.filter(e=>e.category==='historical').length;$('#manuscript-count').textContent=records.filter(e=>e.category==='manuscripts').length;
  renderCatalog();
  // Select a real searchable edition by default, without changing the visual layout.
  const scopeControl=$('#scope');
  if(scopeControl){
    const indexed=records.filter(e=>e.searchable&&e.text_index);
    for(const option of scopeControl.options){
      if(option.value!=='all'&&option.value!=='principal')option.disabled=!indexed.some(e=>e.id===option.value);
      if(option.value==='principal')option.disabled=!indexed.some(e=>['recensio-es','recensio-fr','theory-en'].includes(e.id));
    }
    for(const e of indexed){if(![...scopeControl.options].some(option=>option.value===e.id)){const option=new Option(`${e.version||e.year} · ${languageLabel(e)}`,e.id);scopeControl.add(option);}}
    if(scopeControl.selectedOptions[0]?.disabled)scopeControl.value='all';
  }
  // Verify the actual repository inventory before exposing publication links.
  const primaryIds=['recensio-es','recensio-fr','theory-en'];
  for(const id of primaryIds){
    const e=edition(id);
    const control=document.querySelector('.principal-edition [data-read="'+id+'"]');
    const link=document.querySelector('.principal-edition a[href="documents/'+id+'.pdf"]');
    if(!e?.available||!e?.pdf){
      if(control){control.disabled=true;control.title='PDF en incorporación';control.setAttribute('aria-label','PDF en incorporación');}
      if(link){link.removeAttribute('href');link.removeAttribute('download');link.setAttribute('aria-disabled','true');link.title='PDF en incorporación';link.style.cursor='not-allowed';}
    }else if(link){link.href=e.pdf;}
  }
  if(!records.some(e=>e.searchable&&e.text_index)){
    const input=document.querySelector('#query');
    if(input)input.placeholder='Corpus textual en incorporación; podés buscar en Google y Google Académico';
    $('#search-status').textContent='Los índices textuales todavía no están publicados. La búsqueda dentro de los libros estará disponible cuando se incorporen. Mientras tanto, podés consultar las fuentes externas.';
  }
  if(loads[1].status==='rejected')$('#catalog-status').textContent+=' · El catálogo externo no se pudo cargar.';
  const supplements=loads[2].status==='fulfilled'?loads[2].value:[];
  $('#supplement-list').innerHTML=supplements.map(e=>`<article class="supplement"><time datetime="${e.date}">${escapeHTML(e.dateLabel)}</time><div><h3>${escapeHTML(e.title)}</h3><p>${escapeHTML(e.description)}</p></div><a class="text-link" href="${e.file}" download>Descargar ${escapeHTML(e.format)} ↓</a></article>`).join('');
  if(!supplements.length)$('#investigacion').hidden=true;
  $('#search-form').addEventListener('submit',event=>{event.preventDefault();startSearch();});
  $$('[data-search-web]').forEach(button=>button.addEventListener('click',()=>{const query=$('#query').value.trim();if(!query){$('#query').reportValidity();return;}searchInternet(query,button.dataset.searchWeb);$('#search-status').textContent='Se abrió la consulta en el buscador externo.';}));
  $$('[data-query]').forEach(b=>b.addEventListener('click',()=>{$('#query').value=b.dataset.query;$('#search-kind').value='words';$('#search-kind').dispatchEvent(new Event('change'));$('#search-mode').value='words';const target=b.dataset.scope;if(target&&[...$('#scope').options].some(o=>o.value===target&&!o.disabled))$('#scope').value=target;else $('#scope').value='all';startSearch();document.getElementById('search-status').scrollIntoView({block:'nearest',behavior:'smooth'});}));
  $$('.catalog-tabs button').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;$$('.catalog-tabs button').forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false'));renderCatalog();}));
  $('.catalog-tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=$$('.catalog-tabs button');let i=tabs.indexOf(document.activeElement);i=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[i].focus();tabs[i].click();});
  $('#catalog-filter').addEventListener('input',renderCatalog);
  $$('[data-catalog-focus]').forEach(link=>link.addEventListener('click',()=>{const e=edition(link.dataset.catalogFocus);if(!e)return;const tab=$(`.catalog-tabs button[data-category="${e.category}"]`);if(tab)tab.click();$('#catalog-filter').value=e.title;renderCatalog();}));
  document.addEventListener('click',event=>{const download=event.target.closest('[data-download]');if(download){const e=edition(download.dataset.download),format=download.dataset.format||'pdf';if(e?.[`${format}_chunks`]?.length){event.preventDefault();if(download.getAttribute('aria-busy')!=='true')downloadDocument(download,e,format);}return;}const b=event.target.closest('[data-read],[data-compare]');if(!b)return;const p=Number(b.dataset.page)||1;if(b.dataset.read)openReader(b.dataset.read,p);else openComparison(b.dataset.compare,p);});
  for(const id of ['open-comparison','open-comparison-bottom'])$('#'+id).addEventListener('click',()=>openComparison());
  $('#close-reader').addEventListener('click',closeReader);$('#reader-dialog').addEventListener('close',()=>$('#reader-frame').removeAttribute('src'));
  $('#reader-page').addEventListener('change',event=>setReaderPage(event.target.value));$('#reader-page').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();setReaderPage(event.target.value);}});$('#reader-prev').addEventListener('click',()=>setReaderPage(currentPage-1));$('#reader-next').addEventListener('click',()=>setReaderPage(currentPage+1));
  $('#reader-compare').addEventListener('click',()=>openComparison(currentReader.id,currentPage));
  $('#close-comparison').addEventListener('click',()=>$('#comparison-dialog').close());$('#comparison-dialog').addEventListener('close',()=>$('#comparison-panes').replaceChildren());
  $('#more-results').addEventListener('click',renderMore);
  const params=new URLSearchParams(location.search);if(params.has('edition'))openReader(params.get('edition'),Number(params.get('page'))||1);
}
initialize().catch(()=>showError($('#catalog-status'),'No se pudo iniciar el catálogo. Recargá la página.'));
