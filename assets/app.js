import {bookTitle,bibliographyHTML,bibliographyText} from './edition-citation.mjs?v=20261030-history';
import {citation, roman, parseLocus} from './search-core.mjs?v=20261030-docx-1';
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
const authorIds=['recensio-es','recensio-fr','theory-en'];
function readerURL(id,locus='1.1.1'){const url=new URL('lector-bilingue.html',location.href);url.searchParams.set('edition',id);url.searchParams.set('locus',locus);if(lastQuery&&!parseLocus(lastQuery))url.searchParams.set('q',lastQuery);return url.href;}

async function fetchJSON(path){ const r=await fetch(path); if(!r.ok)throw new Error(`No se pudo abrir ${path}`);return r.json(); }
function edition(id){return records.find(e=>e.id===id);}
function languageLabel(e){return e.languages.map(l=>languages[l]??l).join('–');}
function showError(target,message){target.textContent=message;}
function searchInternet(query,provider='web',includeVitruvio=true){
  query=query.trim();if(!query)return;
  if(includeVitruvio&&!/vitruv/i.test(query))query=`Vitruvio ${query}`;
  const url=new URL(provider==='scholar'?'https://scholar.google.com/scholar':'https://www.google.com/search');url.searchParams.set('q',query);window.open(url.href,'_blank','noopener,noreferrer');
}
function resultSnippet(r){
 const snippet=String(r.snippet||'');
 if(!snippet)return '';
 const query=String(lastQuery||document.querySelector('#query')?.value||'').trim();
 // A multiword quotation must be highlighted as one contiguous match,
 // never as arbitrary substrings of later words.
 const fold=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/æ/gi,'ae').replace(/œ/gi,'oe').replace(/ſ/g,'s').toLowerCase().replace(/v/g,'u').replace(/j/g,'i');
 const ranges=[];
 const multi=/[\p{L}\p{M}]+(?:[^\p{L}\p{M}]+[\p{L}\p{M}]+){1,}/u.test(query);
 const addExact=(term)=>{
  const words=[...String(term).matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map(m=>fold(m[0])).filter(Boolean);
  if(!words.length)return;
  const tokens=[...snippet.matchAll(/[\p{L}\p{M}\p{N}]+/gu)];
  for(let i=0;i<=tokens.length-words.length;i++){
   if(words.every((w,j)=>fold(tokens[i+j][0])===w))
    ranges.push([tokens[i].index,tokens[i+words.length-1].index+tokens[i+words.length-1][0].length]);
  }
 };
 if(multi){
  addExact(query);
  if(!ranges.length && r.form && String(r.form).trim().split(/\s+/).length>1)addExact(r.form);
 }else{
  const terms=[query,String(r.form||''),...String(r.semantic_term||'').split(/\s*·\s*/)].filter(x=>x.trim().length>=2);
  for(const term of terms)addExact(term);
 }
 // The worker offset identifies one source span when the excerpt contains it.
 // Only use it when the excerpt is the original snippet (not a full passage).
 if(!ranges.length&&Number.isInteger(r.context_start)&&Number.isInteger(r.context_length)&&r.context_length>0&&!r.partial_match&&!r.match_type){
  const at=r.context_start,end=at+r.context_length;
  if(at>=0&&end<=snippet.length)ranges.push([at,end]);
 }
 ranges.sort((x,y)=>x[0]-y[0]||y[1]-x[1]);
 let out='',cursor=0;
 for(const [start,end] of ranges){if(start<cursor||end>snippet.length)continue;out+=escapeHTML(snippet.slice(cursor,start))+'<mark class="search-hit">'+escapeHTML(snippet.slice(start,end))+'</mark>';cursor=end;}
 return out+escapeHTML(snippet.slice(cursor));
}
function renderCountSummary(summary){
 const box=$('#term-count-summary');box.hidden=!summary;box.replaceChildren();if(!summary)return;
 box.innerHTML='<table><caption>Apariciones en el tratado, por edición</caption><thead><tr><th>Edición</th><th>Apariciones</th><th>Pasajes</th></tr></thead><tbody>'+summary.editions.map(row=>'<tr><th>'+escapeHTML(edition(row.edition)?.version)+'</th><td>'+row.total+'</td><td>'+row.passages+'</td></tr>').join('')+'</tbody></table><p>Recuento del texto latino y/o la traducción según el filtro de idioma. Cada edición se cuenta por separado. Se excluyen el estudio preliminar, las notas y los índices. Se normalizan acentos, u/v e i/j.</p>';
 if(summary.forms.length)box.innerHTML+='<details><summary>Formas encontradas</summary><p>'+summary.forms.map(x=>escapeHTML(x.form)+' ('+x.count+')').join(' · ')+'</p></details>';
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
  const aliases=term==='harleianus'?['harley','harleian']:term==='gudiano'?['gudian','gudiano']:term==='harlesiano'?['harleian','harlesiano']:[term];
  const list=records.filter(e=>(category==='all'||e.category===category)&&(!term||aliases.some(t=>normalize([e.id,e.title,e.subtitle,e.author,e.description,e.publisher,e.year,languageLabel(e)].join(' ')).includes(t))));
  if(category==='historical')list.sort((a,b)=>Number((String(a.year).match(/\d{4}/)||['9999'])[0])-Number((String(b.year).match(/\d{4}/)||['9999'])[0]));
  const container=$('#catalog-list');container.className=`catalog-list ${category}`;
  container.innerHTML=list.map(e=>{
    const external=Boolean(e.external);
    const cover=external?`<div class="edition-date">${escapeHTML(e.dateShort||e.year)}</div>`:e.cover?`<button type="button" class="cover-link" data-read="${e.id}" aria-label="Leer ${escapeHTML(e.title)}"><img src="${escapeHTML(e.cover)}" alt="Portada de ${escapeHTML(e.title)}" loading="lazy" width="123" height="188"></button>`:`<div class="edition-date" aria-label="Portada original pendiente de incorporación">${escapeHTML(e.version||e.year)}</div>`;
    const label=e.category==='recensio'?'Edición principal':e.category==='manuscripts'?'Testimonio manuscrito':e.category==='studies'?'Estudio':e.languages.length===1&&e.languages[0]==='la'?'Edición del texto latino':e.languages.includes('la')?'Edición bilingüe':'Traducción histórica';
    let actions=external?`<a class="button outline" href="${escapeHTML(e.read_url||e.source_url)}" target="_blank" rel="noopener">${e.access==='catalog'?'Ficha institucional':e.access==='public_pdf'?'Leer PDF completo':'Leer en la institución'} ↗</a>`:e.pdf||e.pdf_chunks?.length?`<button type="button" class="button primary" data-read="${e.id}">Leer en línea →</button><a href="${downloadLink(e,'pdf')}" data-download="${e.id}" data-format="pdf" download>PDF ↓</a>${e.docx?`<a href="${downloadLink(e,'docx')}" data-download="${e.id}" data-format="docx" download>DOCX ↓</a>`:''}<button type="button" data-compare="${e.id}">Comparar</button>`:`<span class="pending-source" aria-label="Documento pendiente de incorporación">Documento en incorporación</span>`;
    if(authorIds.includes(e.id))actions='<a class="button outline" href="'+readerURL(e.id)+'">Leer y comparar →</a>'+actions;
    if(external&&e.pdf_url&&e.access!=='public_pdf')actions+=`<a href="${escapeHTML(e.pdf_url)}" target="_blank" rel="noopener">PDF${e.pdf_size_mb?` (${Math.round(e.pdf_size_mb)} MB)`:''} ↗</a>`;
    if(external&&e.read_url&&e.source_url!==e.read_url)actions+=`<a href="${escapeHTML(e.source_url)}" target="_blank" rel="noopener">Ficha ↗</a>`;
    if(!external&&e.source_url)actions+=`<a href="${escapeHTML(e.source_url)}" target="_blank" rel="noopener">Fuente ↗</a>`;
    return `<article class="catalog-card${external?' external':''}">${cover}<div><div class="record-label"><span class="primary-label">${label}</span><span>${escapeHTML(e.version||e.year)}</span></div><h3>${escapeHTML(e.title)}</h3><p class="subtitle">${escapeHTML(e.subtitle)}</p><p class="book-meta">${escapeHTML(e.author)}<br>${escapeHTML(languageLabel(e))}${e.pages?` · ${e.pages.toLocaleString('es-AR')} páginas`:''} · ${escapeHTML(e.year)}<br>${escapeHTML(e.publisher)}</p><p class="book-description">${escapeHTML(e.description)}</p>${authorIds.includes(e.id)?`<details class="catalog-citation"><summary>Referencia bibliográfica e ISBN</summary><p>${bibliographyHTML(e)}</p><p>${escapeHTML(e.isbn_note||'')}</p></details>`:''}<div class="catalog-actions">${actions}</div>${e.attribution?`<p class="book-source">${escapeHTML(e.attribution)}</p>`:''}</div></article>`;
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
  if(authorIds.includes(id)){location.href=readerURL(id);return;}
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
  const textPrimary=e.access==='public_pdf'&&e.searchable;
  $('.reader-content').classList.toggle('text-primary',textPrimary);
  $('#reader-frame').removeAttribute('src');$('#reader-external').href=sourceURL(e,requestedPage);
  if(e.external){
    const archive=(e.read_url||e.source_url||'').match(/archive\.org\/details\/([^/?#]+)/);
    if(archive)$('#reader-frame').src='https://archive.org/embed/'+encodeURIComponent(archive[1])+'/page/n'+Math.max(0,requestedPage-1);
    const drive=(e.read_url||e.source_url||'').match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
    if(drive&&!textPrimary)$('#reader-frame').src='https://drive.google.com/file/d/'+encodeURIComponent(drive[1])+'/preview';
    $('#reader-external').textContent='Abrir facsímil original ↗';
    if(e.access==='public_pdf'){
      $('#reader-text').textContent='Localizando la palabra en el texto indexado de esta página…';
      try{
        const pages=await getPages(e);
        if(revision!==readerRevision||currentReader?.id!==e.id)return;
        const text=pages?.[requestedPage-1]?.text||'';
        const query=(lastQuery||$('#query').value||'').trim();
        const pos=query?normalize(text).indexOf(normalize(query)):-1;
        const start=pos>=0?Math.max(0,pos-200):0;
        const excerpt=text;
        // PDF extraction contains visual line breaks. Reflow single lines, retain paragraph breaks.
        const reflowed=excerpt.replace(/([^\n])\n(?!\n)/g,'$1 ').replace(/\n{3,}/g,'\n\n');
        $('#reader-text').innerHTML=resultSnippet({snippet:reflowed});
        const mark=$('#reader-text').querySelector('mark');if(mark)mark.scrollIntoView({block:'center'});
        if(!text)$('#reader-text').textContent='No hay texto extraíble en esta página. Consultá el PDF.';
      }catch{
        if(revision===readerRevision)$('#reader-text').textContent='No se pudo cargar el fragmento textual. El PDF original sigue disponible.';
      }
      return;
    }
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
 if(authorIds.includes(id)){location.href=readerURL(id);return;}
 if($('#reader-dialog').open)closeReader();
 const available=records.filter(e=>e.external||e.pdf||e.pdf_chunks?.length),container=$('#comparison-panes');container.replaceChildren();
 for(const [i,selected]of [edition('recensio-es'),edition(id)].entries()){
  if(!selected)continue;const pane=document.createElement('section');pane.className='compare-pane';pane.dataset.mode=authorIds.includes(selected.id)?'text':'pdf';
  pane.innerHTML='<div class="compare-controls"><label>Edición<select>'+available.map(e=>'<option value="'+e.id+'"'+(e.id===selected.id?' selected':'')+'>'+escapeHTML(e.title)+' · '+escapeHTML(e.version||e.year)+'</option>').join('')+'</select></label><button type="button" class="compare-prev">←</button><label>Página PDF<input class="compare-page" type="number" min="1" value="'+(i?page:205)+'"></label><span class="compare-total"></span><button type="button" class="compare-next">→</button><button type="button" class="compare-mode">PDF original</button><a class="compare-external" target="_blank" rel="noopener">Abrir fuente ↗</a></div><div class="compare-body"></div>';
  $('select',pane).addEventListener('change',()=>{pane.dataset.mode=authorIds.includes($('select',pane).value)?'text':'pdf';$('.compare-page',pane).value=1;renderComparePane(pane);});
  $('.compare-page',pane).addEventListener('change',()=>renderComparePane(pane));
  for(const[selector,delta]of [['.compare-prev',-1],['.compare-next',1]])$(selector,pane).addEventListener('click',()=>{$('.compare-page',pane).value=Math.max(1,Number($('.compare-page',pane).value)+delta);renderComparePane(pane);});
  $('.compare-mode',pane).addEventListener('click',()=>{const e=edition($('select',pane).value);window.open(e.read_url||e.pdf||e.source_url,'_blank','noopener');});container.append(pane);renderComparePane(pane);
 }
 $('.comparison-note').textContent='Consulta del facsímil histórico y una edición de Kurilo. Cada página se selecciona por separado: no se presupone equivalencia entre las paginaciones. Para traducciones sincronizadas por locus, usá el lector bilingüe.';
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
  modeButton.hidden=!(e.external&&e.access==='public_pdf'&&e.searchable);
  modeButton.textContent='Abrir PDF original ↗';
  if(e.external&&e.access==='public_pdf'&&e.searchable&&pane.dataset.mode==='text'){
    // Stable page-precise text for born-digital editions; historical facsimiles remain separate.
    // Display the exact page from the born-digital text index instead.
    body.textContent='Cargando página PDF '+page+' del texto digital…';
    const request=(pane.dataset.renderRevision=String(Number(pane.dataset.renderRevision||0)+1));
    try{
      const pages=await getPages(e);
      if(pane.dataset.renderRevision!==request||$('select',pane).value!==e.id||Number(pageInput.value)!==page)return;
      const text=pages?.[page-1]?.text||'';
      const heading=document.createElement('p');heading.className='compare-source-note';
      heading.textContent=e.version+' · Página '+page+' · texto extraído (latín, traducción y notas pueden coexistir)';
      const passage=document.createElement('div');passage.className='compare-transcription';
      passage.style.cssText='';
      // Preserve paragraph breaks but reflow PDF line wrapping for readable text.
      const readable=text.replace(/([^\n])\n(?!\n)/g,'$1 ').replace(/\n{3,}/g,'\n\n');
      passage.textContent=readable||'Esta página no contiene texto extraíble. Abrí el documento original para consultar la imagen.';
      body.replaceChildren(heading,passage);
      citation.textContent=e.version+' · Página PDF '+page+' · texto digital (no imagen del PDF)';
    }catch(error){body.textContent='No se pudo consultar el texto de esta página: '+error.message+'. Usá «Abrir fuente» para leer el PDF original.';}
    return;
  }
  if(e.external){
    if(e.access==='public_pdf'&&e.searchable){
      body.textContent='El visor externo no admite navegar automáticamente a esta página. Para lectura navegable elegí «Leer texto indexado». El PDF original se abre desde «Abrir fuente». ';
      return;
    }
    if(false){
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
 worker=new Worker(new URL('./search-worker.js?v=20261030-auto-alignment-18',import.meta.url),{type:'module'});
 worker.onmessage=event=>{
  const data=event.data;if(data.requestId!==requestId)return;
  if(data.type==='progress'){$('#search-status').textContent=data.message;return;}
  $('#search-button').disabled=false;$('#search-button').textContent='Buscar →';
  if(data.type==='error'){$('#search-status').textContent=data.message;return;}
  if(data.type==='results'){
   results=data.results;countSummary=data.countSummary||null;shown=0;$('#search-results').replaceChildren();renderCountSummary(countSummary);
   $('#search-status').textContent=(countSummary?countSummary.total.toLocaleString('es-AR')+' apariciones en '+countSummary.passages+' pasajes de las ediciones seleccionadas.':results.length?results.length.toLocaleString('es-AR')+(results.length===1?' coincidencia':' coincidencias')+' con libro, capítulo y sección para «'+lastQuery+'».':'Palabra, frase o locus no encontrado: «'+lastQuery+'» en esta selección. Revisá los filtros o la grafía. Algunas secciones inglesas se conservan agrupadas como en el original.')+(data.warnings?.length?' '+data.warnings.join('. '):'');
   renderMore();$('#export-tools').hidden=!results.length;
  }
 };
 worker.onerror=()=>{$('#search-status').textContent='No se pudo iniciar el buscador. Volvé a buscar para reintentarlo.';$('#search-button').disabled=false;$('#search-button').textContent='Buscar →';worker.terminate();worker=null;};
 return worker;
}
function startSearch(){
 $('#query').dispatchEvent(new Event('change'));
 const query=$('#query').value.trim(),kind=$('#search-kind').value;
 if(!query&&kind!=='locus'){$('#search-status').textContent='Escribí una palabra o frase.';$('#query').focus();return;}
 if(kind==='internet'){searchInternet(query,$('#internet-provider-main').value,true);$('#search-status').textContent='Consulta abierta en el buscador externo en otra pestaña.';return;}
 lastQuery=query||(roman(Number($('#filter-book').value))+( $('#filter-chapter').value?'.'+$('#filter-chapter').value:''));searchKind=kind;results=[];countSummary=null;renderCountSummary(null);shown=0;requestId++;
 $('#export-tools').hidden=true;$('#more-results').hidden=true;$('#search-results').replaceChildren();$('#search-status').textContent='Consultando el índice de los DOCX…';$('#search-button').disabled=true;$('#search-button').textContent='Buscando…';
 const parsedReference=parseLocus(query);
 const canonicalQuery=parsedReference?roman(parsedReference.book)+(parsedReference.chapter!=null?'.'+parsedReference.chapter+(parsedReference.section!=null?'.'+parsedReference.section:''):''):query||lastQuery;
 try{ensureWorker().postMessage({type:'search',requestId,query:canonicalQuery,kind:parsedReference?'locus':kind,mode:$('#search-mode').value,countMode:$('#count-mode').value,scope:$('#scope').value,book:$('#filter-book').value,chapter:$('#filter-chapter').value,language:$('#text-language').value,baseURL:new URL('./',location.href).href,editions:records.filter(e=>authorIds.includes(e.id)&&e.searchable)});}catch(error){$('#search-button').disabled=false;$('#search-button').textContent='Buscar →';$('#search-status').textContent=error.message;}
}

function locusLabel(r){
  // Libro/capítulo/sección solo cuando constan explícitamente en el índice verificado.
  const book=r.book??r.liber, chapter=r.chapter??r.caput, section=r.section??r.paragraph;
  if(book==null||chapter==null)return 'Libro y locus: pendientes de cotejo';
  return 'Vitr., De arch. '+book+'.'+chapter+(section==null?'':'.'+section);
}
function passageReference(r,e){
  const b=r.book??r.liber,c=r.chapter??r.caput,p=r.section??r.paragraph;
  if(b!=null&&c!=null&&p!=null)return 'Libro '+escapeHTML(String(b))+' · Capítulo '+escapeHTML(String(c))+' · Sección '+escapeHTML(String(p))+' · Vitr., De arch. '+escapeHTML(String(b))+'.'+escapeHTML(String(c))+'.'+escapeHTML(String(p));
  const verified=(e.id==='krohn-1912'&&r.page===27)?[1,2,1]:(e.id==='krohn-1912'&&r.page===77)?[3,1,1]:null;
  if(verified)return 'Libro '+verified[0]+' · Capítulo '+verified[1]+' · Sección '+verified[2]+' · Vitr., De arch. '+verified.join('.');
  return 'Libro: por identificar · Capítulo: por identificar · Sección (locus): por cotejar';
}
function knownLocus(e,page){
  // Only individually cross-checked Krohn locations are displayed as verified.
  if(e?.id==='krohn-1912'&&Number(page)===27)return 'Vitr., De arch. I.2.1';
  if(e?.id==='krohn-1912'&&Number(page)===77)return 'Vitr., De arch. III.1.1';
  if(e?.id==='recensio-es'&&Number(page)===978)return 'Libro X (identificación preliminar) · capítulo y sección por cotejar';
  return 'Libro, capítulo y sección: pendientes de cotejo';
}
function citationLine(e,page){return (e?.version||e?.year||'Edición')+' · '+knownLocus(e,page)+' · p. PDF '+page;}
function locusReference(r){return citation(r)+(r.page?' · página PDF '+r.page:' · texto del DOCX');}
function scholarlyExcerpt(r,e){
  // Faithful correction checked against V514 DOCX, paragraph I.2.3.
  if(e.id==='recensio-es'&&r.page===235&&/symmetria|adecuaci[oó]n|eurythmia/i.test(lastQuery||$('#query').value)){
    return '<span class="book-source">Texto cotejado con el DOCX original · nota exegética de I.2.3</span> '+resultSnippet({snippet:'Relaciones dimensionales: Vitruvio menciona expresamente la adecuación de altura a anchura y de anchura a longitud, y concluye que el conjunto debe responder a su symmetria. El pasaje describe correspondencias proporcionales; no formula una ecuación tridimensional abstracta X:Y:Z.'});
  }
  const raw=String(r.snippet||'');
  const glued=/(?:[a-záéíóúñü]{24,}|[a-záéíóúñü]{8,}-\s*[a-záéíóúñü]{1,})/i.test(raw);
  if(glued&&['recensio-es','recensio-fr','theory-en'].includes(e.id)){
    return '<span class="book-source">La extracción del PDF contiene palabras pegadas o cortadas; no se muestra como transcripción académica. Consultá el documento original o el índice DOCX en preparación.</span>';
  }
  return resultSnippet(r);
}
function renderMore(){
 const next=results.slice(shown,shown+16),container=$('#search-results');
 for(const r of next){const e=edition(r.edition),article=document.createElement('article');article.className='result';
  const url=readerURL(e.id,r.locus);
  article.innerHTML='<div class="result-meta">'+(r.match_type==='aligned_locus'?'Texto paralelo por locus · no implica equivalencia literal · ':(r.partial_match?'Coincidencia parcial de la cita · verificar variante textual · ':''))+escapeHTML(e.version)+' · '+escapeHTML(languages[r.language]||r.language)+'</div><h3>'+escapeHTML(citation(r))+'</h3><p class="result-biblio">'+bibliographyHTML(e)+'</p><p class="result-locus">Libro '+roman(r.book)+' · '+(r.chapter==='praef'?'Prólogo':'Capítulo '+r.chapter)+' · Sección '+r.section+(r.page?' · PDF p. '+r.page:'')+'</p>'+(r.semantic_term?'<p class="semantic-term">Término relacionado: <strong>'+escapeHTML(r.semantic_term)+'</strong></p>':'')+'<p lang="'+r.language+'">'+resultSnippet({...r,snippet:r.text||r.snippet,form:r.semantic_term||r.form,context_start:null,context_length:null})+'</p><details class="result-translation"><summary>Desplegar texto latino y traducción</summary><p lang="la"><strong>Latín</strong><br>'+escapeHTML(r.latin)+'</p><p lang="'+e.languages.find(l=>l!=='la')+'"><strong>'+escapeHTML(languageLabel(e))+'</strong><br>'+escapeHTML(r.translation)+'</p></details><div class="result-actions"><a href="'+escapeHTML(url)+'">Leer el pasaje →</a><a href="'+escapeHTML(url)+'">Comparar traducciones →</a><a href="aparato-critico.html?locus='+encodeURIComponent(r.locus)+'">Aparato crítico →</a><a href="'+escapeHTML(sourceURL(e,r.page||1))+'" target="_blank" rel="noopener">PDF original ↗</a></div>';
  container.append(article);
 }
 shown+=next.length;$('#more-results').hidden=shown>=results.length;
 if(shown<results.length)$('#more-results').textContent='Mostrar más resultados ('+shown+' de '+results.length+')';
}

function resultExportRows(){if($('#export-limit').value==='all')return results;const limit=Number($('#export-limit').value)||50;return results.slice(0,limit);}
function printResults(){
  const rows=resultExportRows();if(!rows.length)return;
  const popup=window.open('','_blank');if(!popup){$('#search-status').textContent='Permití abrir la vista de impresión en tu navegador para guardar los resultados como PDF.';return;}
  const date=new Intl.DateTimeFormat('es-AR',{dateStyle:'long'}).format(new Date());
  const content=rows.map((r,i)=>{const e=edition(r.edition);const link=sourceURL(e,r.page);return `<article><div class="n">${i+1} · ${escapeHTML(e.version)} · ${escapeHTML(languageLabel(e))}</div><h2>${escapeHTML(bookTitle(e))}</h2><p class="ref">${bibliographyHTML(e)} ${escapeHTML(locusReference(r))}.</p><blockquote>${resultSnippet(r)}</blockquote><p class="url">Fuente: ${escapeHTML(link)}</p></article>`;}).join('');
  popup.document.open();popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Vitruvius — Resultados de ${escapeHTML(lastQuery)}</title><style>body{max-width:760px;margin:40px auto;color:#172b3c;font-family:Georgia,serif;line-height:1.65;padding:0 25px}h1{font-size:31px;font-weight:400;margin-bottom:6px}h2{font-size:20px;margin:5px 0;font-weight:400}.sub,.ref,.n,.url{font-family:Arial,sans-serif;font-size:10px;color:#626969}.n{font-size:9px;letter-spacing:.6px}article{border-top:1px solid #bbb;padding:20px 0;break-inside:avoid}blockquote{font-size:16px;margin:12px 0;text-align:justify;text-align-last:left;hyphens:none}.url{overflow-wrap:anywhere;font-size:8px}.tools{font-family:Arial,sans-serif;margin:25px 0;padding:15px;background:#eeece5}.tools button{background:#122a42;color:#fff;border:0;padding:12px;cursor:pointer}.tools p{font-size:11px}@page{size:A4;margin:20mm 18mm}@media print{body{margin:0;max-width:none;padding:0}.tools{display:none}h1{font-size:26px}}</style></head><body><h1>Vitruvius Digital Library</h1><p class="sub">LISTADO DE RESULTADOS · ${escapeHTML(date)}</p><p>Consulta: <strong>${escapeHTML(lastQuery)}</strong><br>Modo: ${searchKind==='semantic'?'Afinidad semántica':searchKind==='count'?'Recuento literal':'Búsqueda textual'}. ${rows.length} resultados incluidos de ${results.length}.${countSummary?`<br>Recuento: ${countSummary.total} apariciones en ${countSummary.passages} pasajes. ${countSummary.mode==='prefix'?'Palabras que empiezan por la raíz escrita.':'Palabra o secuencia exacta.'} Excluye notas y comentarios; se normalizan mayúsculas, acentos, u/v e i/j.`:''}</p><div class="tools"><button id="print">Imprimir / guardar como PDF</button><p>En el cuadro de impresión del navegador, elegí «Guardar como PDF». Las páginas indicadas corresponden al archivo PDF consultado.</p></div>${content}<p class="sub">Proyecto y edición de Diego Kurilo. Verificá las citas en los documentos de referencia.</p></body></html>`);popup.document.close();popup.document.getElementById('print').addEventListener('click',()=>popup.print());
}

function downloadCSV(){
  const rows=resultExportRows();const csvValue=s=>{s=String(s??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const values=[['Consulta','Tipo de búsqueda','Título','Edición','Idioma','Autor','Página PDF','Locus','Pasaje','Forma encontrada','Aparición en la edición','Enlace'],...rows.map(r=>{const e=edition(r.edition);return[lastQuery,searchKind==='semantic'?'Semántica':searchKind==='count'?'Recuento literal':'Textual',e.title,e.version,languageLabel(e),e.author,r.page||'',citation(r),r.snippet,r.form||'',r.occurrence||'',sourceURL(e,r.page)];})];
  const blob=new Blob(['\ufeff'+values.map(row=>row.map(csvValue).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='Vitruvius_Resultados.csv';document.body.append(link);link.click();link.remove();$('#search-status').textContent='CSV preparado con '+rows.length+' resultados y sus loci.';setTimeout(()=>URL.revokeObjectURL(link.href),30000);
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
    countSummary?'Total de apariciones: '+countSummary.total+' en '+countSummary.passages+' pasajes':'',
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
  let dialog=$('#email-dialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='email-dialog';dialog.className='reader-dialog';document.body.append(dialog);}dialog.replaceChildren();const title=document.createElement('h2');title.textContent='Correo preparado';const close=document.createElement('button');close.type='button';close.textContent='Cerrar';close.addEventListener('click',()=>dialog.close());const text=document.createElement('textarea');text.readOnly=true;text.style.cssText='width:100%;min-height:320px;padding:20px';text.value=subject+'\n\n'+lines.filter(Boolean).join('\n');const open=document.createElement('a');open.textContent='Abrir mi aplicación de correo ↗';open.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(lines.filter(Boolean).join('\n'));dialog.append(title,close,text,open);dialog.showModal();
}

function addSearchControls(){
 const options=$('.search-options');
 const label=document.createElement('label');label.innerHTML='Búsqueda<select id="search-kind"><option value="words">Palabras y frases</option><option value="locus">Libro, capítulo o locus</option><option value="count">Contar término y contextos</option><option value="internet">Buscar en internet</option><option value="semantic">IA · términos similares (local y gratuita)</option></select>';options.prepend(label);
 const provider=document.createElement('label');provider.id='internet-provider-main-label';provider.hidden=true;provider.innerHTML='Buscador<select id="internet-provider-main"><option value="web">Google</option><option value="scholar">Google Académico</option></select>';options.append(provider);
 const count=document.createElement('label');count.id='count-mode-label';count.hidden=true;count.innerHTML='Recuento<select id="count-mode"><option value="exact">Palabra o frase exacta</option><option value="prefix">Raíz · empieza por</option></select>';options.append(count);
 const filters=document.createElement('div');filters.id='scholarly-filters';filters.className='search-options';filters.innerHTML='<label>Libro de Vitruvio<select id="filter-book"><option value="">Los diez libros</option>'+Array.from({length:10},(_,i)=>'<option value="'+(i+1)+'">Libro '+roman(i+1)+'</option>').join('')+'</select></label><label>Capítulo<select id="filter-chapter"><option value="">Todos los capítulos</option><option value="praef">Prólogo</option></select></label><label>Texto<select id="text-language"><option value="all">Latín y traducciones</option><option value="la">Solo latín</option><option value="es">Solo castellano</option><option value="fr">Solo francés</option><option value="en">Solo inglés</option></select></label>';$('#search-form').append(filters);
 $('#filter-book').addEventListener('change',()=>{const n=[0,7,10,5,9,12,8,14,6,8,16][Number($('#filter-book').value)]||16;$('#filter-chapter').innerHTML='<option value="">Todos los capítulos</option><option value="praef">Prólogo</option>'+Array.from({length:n},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+'</option>').join('');});
 const summary=document.createElement('div');summary.id='term-count-summary';summary.className='term-count-summary';summary.hidden=true;$('#search-status').after(summary);
 $('#query').required=false;
 $('#search-kind').addEventListener('change',()=>{const kind=$('#search-kind').value;$('#search-mode').parentElement.hidden=kind!=='words';$('#count-mode-label').hidden=kind!=='count';$('#internet-provider-main-label').hidden=kind!=='internet';$('#scope').parentElement.hidden=kind==='internet';filters.hidden=kind==='internet';$('#query').placeholder=kind==='locus'?'III.1.2 · VIII.1 · I.praef.1':'symmetria · architecti est scientia · proporción…';});
 const tools=document.createElement('div');tools.id='export-tools';tools.className='export-tools';tools.hidden=true;tools.innerHTML='<label>Resultados del listado <select id="export-limit"><option value="20">Primeros 20</option><option value="50" selected>Primeros 50</option><option value="100">Primeros 100</option><option value="all">Todos</option></select></label><button type="button" class="button outline" id="print-results">Imprimir / guardar PDF</button><button type="button" class="text-link" id="csv-results">Descargar listado CSV ↓</button><button type="button" class="text-link" id="email-results">Preparar correo ↗</button>';
 $('#search-status').after(tools);$('#print-results').addEventListener('click',printResults);$('#csv-results').addEventListener('click',downloadCSV);$('#email-results').addEventListener('click',emailResults);
}

async function initialize(){
  addSearchControls();
  $('#internet-form').addEventListener('submit',event=>{
    event.preventDefault();
    searchInternet($('#internet-query').value,$('#internet-provider').value,$('#internet-vitruvio').checked);
  });
  const loads=await Promise.allSettled([fetchJSON('data/catalog.json?v=20261030-citations'),fetchJSON('data/historical.json'),fetchJSON('data/supplements.json')]);
  if(loads[0].status!=='fulfilled'){showError($('#catalog-status'),'No se pudo cargar el catálogo. Recargá la página para intentarlo de nuevo.');return;}
  catalog=loads[0].value;records=[...catalog.editions,...(loads[1].status==='fulfilled'?loads[1].value:[])];
  for(const e of records)if(e.id.startsWith('gudianus'))e.category='manuscripts';
  $('#stat-records').textContent=records.length;$('#stat-pages').textContent=catalog.searchable_pages.toLocaleString('es-AR');
  $('#historic-count').textContent=records.filter(e=>e.category==='historical').length;$('#manuscript-count').textContent=records.filter(e=>e.category==='manuscripts').length;
  renderCatalog();
  // Select a real searchable edition by default, without changing the visual layout.
  const scopeControl=$('#scope');
  if(scopeControl){
    const authorCorpus=new Set(['recensio-es','recensio-fr','theory-en']);
    const indexed=records.filter(e=>authorCorpus.has(e.id)&&e.searchable&&e.text_index);
    for(const option of [...scopeControl.options]){
      if(option.value!=='all'&&option.value!=='principal'&&!authorCorpus.has(option.value))option.remove();
    }
    for(const option of scopeControl.options){
      if(option.value!=='all'&&option.value!=='principal')option.disabled=!indexed.some(e=>e.id===option.value);
      if(option.value==='principal')option.disabled=!indexed.some(e=>['recensio-es','recensio-fr','theory-en'].includes(e.id));
    }
    const editionLabel=e=>{
      const year=e.year||'',lang=languageLabel(e);
      if(e.id==='krohn-1912')return 'Vitruvio · Fritz Krohn (editor, 1912) · Latín';
      if(e.id==='ortiz-1787')return 'Vitruvio · Joseph Ortiz y Sanz (traductor, 1787) · Castellano';
      if(e.id==='cesariano-1521')return 'Vitruvio · Cesare Cesariano (traductor, 1521) · Italiano';
      if(['recensio-es','recensio-fr','theory-en'].includes(e.id))return 'Diego Kurilo · '+e.version+' ('+year+') · '+lang;
      return (e.author||'Responsable por verificar')+' · '+(e.version||year)+' · '+lang;
    };
    for(const e of indexed){
      let option=[...scopeControl.options].find(o=>o.value===e.id);
      if(!option){option=new Option('',e.id);scopeControl.add(option);}
      option.textContent=editionLabel(e);
    }
    if(scopeControl.selectedOptions[0]?.disabled)scopeControl.value='all';
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
  $$('.catalog-tabs button').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;$('#catalog-filter').value='';$$('.catalog-tabs button').forEach(x=>x.setAttribute('aria-selected',x===b?'true':'false'));renderCatalog();}));
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

