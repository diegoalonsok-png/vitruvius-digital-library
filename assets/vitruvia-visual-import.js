/* Vitruvia · visual entry, strictly per visitor.
 * A static GitHub Pages site has no image recognition endpoint. This UI:
 *  - accepts temporary local photos/documents and direct HTTPS photo URLs,
 *  - searches uploaded PDFs locally via PDF.js only after explicit request,
 *    and searches Vitruvia publicly only with visitor-supplied text or filename
 *    (NEVER sends image/file bytes or private PDF passages to public APIs),
 *  - offers Google Lens as an EXPLICIT external upload destination,
 *  - revokes object URLs and drops file references when searching, leaving,
 *    resetting, or hiding the page.
 * It never uses localStorage, sessionStorage, IndexedDB, canvas or base64.
 */
(()=>{
 'use strict';
 const MAX_IMAGE=10*1024*1024,MAX_DOC=15*1024*1024;
 const IMAGE_MIME=new Set(['image/jpeg','image/png','image/webp','image/gif','image/avif']);
 const DOCUMENT_MIME=new Set(['application/pdf','text/plain','text/markdown','text/html','application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
 function filenameQuery(filename){
  const raw=String(filename||'').replace(/\.(?:jpg|jpeg|png|webp|gif|avif|pdf|docx|txt|md|html)$/i,'')
    .replace(/^(?:img|dsc|dscn|photo|scan|screenshot|captura[- _]?de[- _]?pantalla)[-_ ]*(?:\d{3,}|[-_\d ]{6,})/i,'')
    .replace(/[_+.]+/g,' ').replace(/[-]+/g,' ').replace(/\s+/g,' ').trim();
  if(!raw||raw.length>140||!/[\p{L}]/u.test(raw))return '';
  const discard=/^(?:img|photo|image|scan|captura|screenshot|untitled|documento|document|archivo|file|download|whatsapp image|foto)(?:\s+\d+)?$/i;
  if(discard.test(raw)||/^(?:[0-9 ]+|[a-z]*\d{5,}[a-z]*)$/i.test(raw))return '';
  return raw;
 }
 function directPhotoURL(value){
  try{
   if(typeof value!=='string'||value.length>1200)return null;
   const u=new URL(value.trim());
   if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)return null;
   if(!/\.(?:jpe?g|png|webp|gif|avif)$/i.test(u.pathname))return null;
   return u.href;
  }catch{return null}
 }
 window.VitruviaVisualImport={filenameQuery,directPhotoURL,version:'1.0'};
 function init(){
  const form=document.getElementById('search-form'),query=document.getElementById('query');
  const wrap=document.querySelector('.search-wrap'),camera=document.getElementById('vr-visual-camera'),plus=document.getElementById('vr-visual-add');
  if(!form||!query||!wrap||!camera||!plus||document.getElementById('vr-visual-panel'))return;
  const panel=document.createElement('div');
  panel.id='vr-visual-panel';panel.className='vr-visual-panel';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');
  panel.setAttribute('aria-labelledby','vr-visual-title');
  panel.innerHTML=[
   '<div class="vr-visual-head"><strong id="vr-visual-title">Buscar con imagen o archivo</strong>',
   '<button type="button" id="vr-visual-close" class="vr-visual-close" aria-label="Cerrar">×</button></div>',
   '<div class="vr-visual-actions">',
   '<button type="button" id="vr-visual-pick-photo">▧ Agregar imágenes</button>',
   '<button type="button" id="vr-visual-pick-document">♧ Agregar archivos</button>',
   '<button type="button" id="vr-visual-pick-pdf">▤ Agregar PDF</button>',
   '<a id="vr-visual-lens" href="https://lens.google.com/" target="_blank" rel="noopener noreferrer">⌕ Google Lens ↗</a>',
   '</div>',
   '<input type="file" id="vr-visual-photo-input" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden>',
   '<input type="file" id="vr-visual-document-input" accept=".pdf,.txt,.md,.html,.docx" hidden>',
   '<input type="file" id="vr-visual-pdf-input" accept=".pdf,application/pdf" hidden>',
   '<div class="vr-visual-preview" id="vr-visual-preview" hidden>',
   '<img id="vr-visual-thumbnail" alt="Vista previa temporal" referrerpolicy="no-referrer" hidden>',
   '<div class="vr-visual-file-copy"><strong id="vr-visual-file-name"></strong>',
   '<small id="vr-visual-file-note"></small></div>',
   '<button type="button" id="vr-visual-remove" aria-label="Quitar archivo">×</button></div>',
   '<label for="vr-visual-url" id="vr-visual-url-label">O pega el enlace directo de una imagen HTTPS</label>',
   '<div class="vr-visual-url-row"><input id="vr-visual-url" type="url" placeholder="https://…/imagen.jpg" autocomplete="off" spellcheck="false">',
   '<button type="button" id="vr-visual-preview-url">Vista previa</button></div>',
   '<label for="vr-visual-description" id="vr-visual-description-label">¿Qué quieres investigar sobre la imagen?</label>',
   '<input id="vr-visual-description" type="text" maxlength="180" placeholder="Ej.: mapamundi medieval, moneda romana…" autocomplete="off">',
   '<button type="button" id="vr-visual-search" class="vr-visual-submit">Buscar descripción en Vitruvia</button>',
   '<section id="vr-visual-pdf-search" class="vr-visual-pdf-search" hidden>',
   '<strong id="vr-visual-pdf-heading">Buscar dentro del PDF · privado</strong>',
   '<label for="vr-visual-pdf-term" id="vr-visual-pdf-term-label">Palabra o frase en el documento</label>',
   '<div class="vr-visual-pdf-line"><input type="search" id="vr-visual-pdf-term" maxlength="180" autocomplete="off">',
   '<button type="button" id="vr-visual-pdf-go">Buscar en PDF</button></div>',
   '<p id="vr-visual-pdf-info" role="status" aria-live="polite"></p>',
   '<ol id="vr-visual-pdf-results" class="vr-visual-pdf-results"></ol>',
   '</section>',
   '<p class="vr-visual-note" id="vr-visual-privacy">',
   'Vitruvia no recibe ni reconoce automáticamente los píxeles: busca tu descripción o un nombre de archivo identificable. Para analizar visualmente la foto, abre Google Lens y elige subirla allí. Ningún archivo se envía desde Vitruvia.</p>',
   '<p class="vr-visual-status" id="vr-visual-status" role="status" aria-live="polite"></p>'
  ].join('');
  wrap.append(panel);
  const $=id=>panel.querySelector('#'+id);
  const ui={close:$('vr-visual-close'),photo:$('vr-visual-pick-photo'),doc:$('vr-visual-pick-document'),pdfPick:$('vr-visual-pick-pdf'),
   lens:$('vr-visual-lens'),photoInput:$('vr-visual-photo-input'),docInput:$('vr-visual-document-input'),pdfInput:$('vr-visual-pdf-input'),
   preview:$('vr-visual-preview'),thumb:$('vr-visual-thumbnail'),name:$('vr-visual-file-name'),
   note:$('vr-visual-file-note'),remove:$('vr-visual-remove'),url:$('vr-visual-url'),
   previewURL:$('vr-visual-preview-url'),description:$('vr-visual-description'),search:$('vr-visual-search'),
   title:$('vr-visual-title'),urlLabel:$('vr-visual-url-label'),descLabel:$('vr-visual-description-label'),
   privacy:$('vr-visual-privacy'),status:$('vr-visual-status'),
   pdfArea:$('vr-visual-pdf-search'),pdfHeading:$('vr-visual-pdf-heading'),pdfLabel:$('vr-visual-pdf-term-label'),
   pdfTerm:$('vr-visual-pdf-term'),pdfGo:$('vr-visual-pdf-go'),pdfInfo:$('vr-visual-pdf-info'),
   pdfResults:$('vr-visual-pdf-results')};
  let selection=null,previewURL=null,sequence=0,pdfPages=null,pdfIndexed=null,pdfAbort=null;
  const copy={
   es:{title:'Buscar con imagen o archivo',photo:'▧ Agregar imágenes',doc:'♧ Agregar archivos',pdf:'▤ Agregar PDF',
    lens:'⌕ Google Lens ↗',url:'O pega el enlace directo de una imagen HTTPS',preview:'Vista previa',
    desc:'¿Qué quieres investigar sobre la imagen?',submit:'Buscar descripción en Vitruvia',
    note:'Vitruvia busca descripciones o nombres de archivos. Los PDF con texto se pueden consultar localmente con Buscar en PDF. Las fotos se identifican mediante Google Lens solo si decidís subirlas allí. Vitruvia nunca envía archivos.',
    image:'Foto temporal · se descarta al buscar o salir',document:'Archivo temporal · solo se usa el nombre; PDF con buscador de texto local',
    urlimage:'Imagen externa temporal · su servidor recibe una solicitud de vista previa',
    empty:'Escribe una descripción o selecciona un archivo con un nombre identificable.',
    invalid:'La URL debe ser HTTPS directa a una imagen JPG, PNG, WebP, GIF o AVIF y no contener parámetros ni credenciales.',
    loading:'Cargando vista previa…',failed:'No se pudo mostrar la imagen. Comprueba el enlace.',
    type:'Tipo de archivo no permitido.',size:'La imagen debe ser menor de 10 MB y el documento menor de 15 MB.',
    cleared:'Imagen descartada. No se conservó ninguna copia en Vitruvia.',
    lensExplain:'Google Lens se abrirá aparte. Si decidís usarlo, deberás cargar la imagen allí por tu cuenta.',
    pdfHeading:'Buscar dentro del PDF · privado',pdfLabel:'Palabra o frase en el documento',pdfGo:'Buscar en PDF',
    pdfReady:'PDF seleccionado. El documento se leerá en tu navegador cuando busques una palabra.',
    pdfWorking:'Extrayendo texto del PDF en este navegador…',pdfProgress:p=>'Leyendo página '+p.page+' de '+Math.min(p.total,150)+'…',
    pdfResults:n=>n+' coincidencias locales · no se enviaron datos a buscadores.',
    pdfNoHits:'No se encontró esa expresión en las páginas analizadas.',
    pdfScanned:'No se encontró una capa de texto. Puede ser un PDF escaneado; esta función no realiza OCR.',
    pdfPartial:p=>'Se analizaron '+p.scanned+' de '+p.total+' páginas (límite por rendimiento).',
    pdfFail:'No se pudo leer el PDF. Puede estar protegido, dañado o no contar con un formato compatible.',
    pdfNeed:'Escribe una palabra o frase para buscar dentro del PDF.',
    pdfReset:'El PDF y sus fragmentos se descartan al cerrar, salir o hacer otra búsqueda.'},
   en:{title:'Search with a photo or file',photo:'▧ Add images',doc:'♧ Add files',pdf:'▤ Add PDF',
    lens:'⌕ Google Lens ↗',url:'Or paste a direct HTTPS image URL',preview:'Preview',
    desc:'What do you want to research?',submit:'Search description in Vitruvia',
    note:'Vitruvia searches descriptions or filenames. Text-based PDFs can be searched locally. To identify a photo visually, open Google Lens and choose to upload it yourself. Vitruvia never sends files.',
    image:'Temporary photo · discarded when searching or leaving',document:'Temporary file · PDFs can be searched locally',
    urlimage:'Temporary external image · preview requests its source host',
    empty:'Enter a description or choose a file with a meaningful name.',
    invalid:'Use a direct HTTPS image URL ending in JPG, PNG, WebP, GIF or AVIF, with no query or credentials.',
    loading:'Loading preview…',failed:'Image could not be previewed; check the link.',
    type:'Unsupported file type.',size:'Photos must be under 10 MB, documents under 15 MB.',
    cleared:'Image discarded. Vitruvia retained no copy.',
    lensExplain:'Google Lens opens separately. You decide if you want to upload the photo there.',
    pdfHeading:'Search inside PDF · private',pdfLabel:'Word or phrase in this document',pdfGo:'Search PDF',
    pdfReady:'PDF selected. It is read inside your browser when you search.',pdfWorking:'Extracting PDF text locally…',
    pdfProgress:p=>'Reading page '+p.page+' of '+Math.min(p.total,150)+'…',
    pdfResults:n=>n+' local matches · nothing sent to external search providers.',
    pdfNoHits:'No matches in the analyzed pages.',pdfScanned:'No searchable text layer. The PDF may be scanned; OCR is not enabled.',
    pdfPartial:p=>'Analyzed '+p.scanned+' of '+p.total+' pages (performance limit).',
    pdfFail:'Unable to read this PDF. It may be protected or incompatible.',
    pdfNeed:'Enter a word or phrase to search inside the PDF.',
    pdfReset:'The PDF and excerpts are discarded on close, navigation or new search.'},
   fr:{title:'Rechercher avec une image ou un fichier',photo:'▧ Ajouter des images',doc:'♧ Ajouter des fichiers',pdf:'▤ Ajouter un PDF',
    lens:'⌕ Google Lens ↗',url:'Ou coller une URL HTTPS directe vers une image',preview:'Aperçu',
    desc:'Que souhaitez-vous rechercher ?',submit:'Rechercher la description',
    note:'Vitruvia recherche des descriptions ou noms de fichiers. Les PDF contenant du texte peuvent être recherchés localement. Google Lens est facultatif ; Vitruvia ne transmet aucun fichier.',
    image:'Photo temporaire · effacée après la recherche',document:'Fichier temporaire · PDF consultable localement',
    urlimage:'Image externe temporaire · requête au serveur de l’image',
    empty:'Saisissez une description ou choisissez un fichier bien nommé.',
    invalid:'Utilisez une URL HTTPS directe vers un fichier JPG, PNG, WebP, GIF ou AVIF, sans paramètres.',
    loading:'Chargement de l’aperçu…',failed:'Impossible de prévisualiser cette image.',
    type:'Type de fichier non pris en charge.',size:'Photos de moins de 10 Mo ; documents de moins de 15 Mo.',
    cleared:'Image oubliée. Vitruvia ne conserve aucune copie.',
    lensExplain:'Google Lens s’ouvre séparément ; vous décidez de téléverser la photo ou non.',
    pdfHeading:'Rechercher dans le PDF · privé',pdfLabel:'Mot ou expression du document',pdfGo:'Chercher dans le PDF',
    pdfReady:'PDF sélectionné. Lecture locale au moment de la recherche.',pdfWorking:'Extraction locale du texte…',
    pdfProgress:p=>'Page '+p.page+' sur '+Math.min(p.total,150)+'…',
    pdfResults:n=>n+' occurrences locales · aucun envoi à des moteurs externes.',
    pdfNoHits:'Aucun résultat dans les pages analysées.',pdfScanned:'Pas de couche texte. PDF probablement numérisé ; OCR désactivé.',
    pdfPartial:p=>p.scanned+' sur '+p.total+' pages analysées (limite de performance).',
    pdfFail:'PDF illisible, protégé ou incompatible.',
    pdfNeed:'Saisissez un mot ou une expression pour chercher dans le PDF.',
    pdfReset:'Le PDF et ses extraits sont effacés à la fermeture ou à une nouvelle recherche.'}
  };
  const locale=()=>copy[document.documentElement.lang?.slice(0,2)]||copy.es;
  function status(message){ui.status.textContent=message}
  function labels(){
   const t=locale();ui.title.textContent=t.title;ui.photo.textContent=t.photo;ui.doc.textContent=t.doc;ui.pdfPick.textContent=t.pdf;
   ui.lens.textContent=t.lens;ui.urlLabel.textContent=t.url;ui.previewURL.textContent=t.preview;
   ui.descLabel.textContent=t.desc;ui.search.textContent=t.submit;ui.privacy.textContent=t.note;
   ui.pdfHeading.textContent=t.pdfHeading;ui.pdfLabel.textContent=t.pdfLabel;ui.pdfGo.textContent=t.pdfGo;
   camera.title=t.title;camera.setAttribute('aria-label',t.title);
   plus.title=t.title;plus.setAttribute('aria-label',t.title);
  }
  function discard({clearDescription=false}={}){
   sequence++;
   pdfAbort?.abort();pdfAbort=null;pdfPages=null;pdfIndexed=null;
   ui.pdfArea.hidden=true;ui.pdfTerm.value='';ui.pdfGo.disabled=false;
   ui.pdfResults.replaceChildren();ui.pdfInfo.textContent='';ui.pdfInput.value='';
   const prev=previewURL;
   ui.thumb.removeAttribute('src');ui.thumb.hidden=true;
   ui.thumb.onload=null;ui.thumb.onerror=null;
   ui.preview.hidden=true;ui.name.textContent='';ui.note.textContent='';
   ui.photoInput.value='';ui.docInput.value='';ui.url.value='';
   selection=null;previewURL=null;
   if(prev?.startsWith('blob:'))URL.revokeObjectURL(prev);
   if(clearDescription)ui.description.value='';
  }
  function close({reset=true}={}){
   if(reset)discard({clearDescription:true});
   panel.hidden=true;
   camera.setAttribute('aria-expanded','false');plus.setAttribute('aria-expanded','false');
  }
  function open(){
   labels();panel.hidden=false;
   camera.setAttribute('aria-expanded','true');plus.setAttribute('aria-expanded','true');
   status('');ui.photo.focus();
  }
  function setSelected(file,kind){
   discard();
   const t=locale();
   if(!file)return;
   if(kind==='image'&&!IMAGE_MIME.has(file.type)||kind==='document'&&!(/\.(?:pdf|docx|txt|md|html)$/i.test(file.name)||file.type&&!DOCUMENT_MIME.has(file.type))){
    status(t.type);return;
   }
   if(file.size>(kind==='image'?MAX_IMAGE:MAX_DOC)){status(t.size);return}
   const isPDF=kind==='document'&&(/\.pdf$/i.test(file.name)||file.type==='application/pdf');
   selection={file,kind,name:file.name,isPDF};
   ui.pdfArea.hidden=!isPDF;
   if(isPDF)ui.pdfInfo.textContent=t.pdfReady+' '+t.pdfReset;
   ui.preview.hidden=false;
   ui.name.textContent=file.name;ui.note.textContent=kind==='image'?t.image:t.document;
   if(kind==='image'){
    previewURL=URL.createObjectURL(file);
    ui.thumb.src=previewURL;ui.thumb.hidden=false;
   }
   status('');
  }

  async function searchPdf(){
   const t=locale();
   const term=ui.pdfTerm.value.trim();
   if(term.length<2){ui.pdfInfo.textContent=t.pdfNeed;ui.pdfTerm.focus();return}
   if(!selection?.isPDF){ui.pdfInfo.textContent=t.pdfFail;return}
   const parser=window.VitruviaPDFLocal;
   if(!parser){ui.pdfInfo.textContent=t.pdfFail;return}
   const ticket=sequence;
   if(!pdfPages){
    if(!selection.file){ui.pdfInfo.textContent=t.pdfFail;return}
    const ctrl=new AbortController();pdfAbort=ctrl;
    ui.pdfGo.disabled=true;ui.pdfResults.replaceChildren();
    ui.pdfInfo.textContent=t.pdfWorking;
    try{
     const extracted=await parser.extract(selection.file,{
      signal:ctrl.signal,
      onProgress:progress=>{if(ticket===sequence&&!ctrl.signal.aborted)ui.pdfInfo.textContent=t.pdfProgress(progress)}
     });
     if(ticket!==sequence||ctrl.signal.aborted)return;
     pdfPages=extracted.pages;pdfIndexed=extracted;
     selection.file=null; // Keep only extracted text, release original PDF file.
    }catch(error){
     if(ticket!==sequence||ctrl.signal.aborted)return;
     ui.pdfInfo.textContent=t.pdfFail;
     return;
    }finally{
     if(ticket===sequence){ui.pdfGo.disabled=false;pdfAbort=null}
    }
   }
   if(ticket!==sequence||!pdfIndexed)return;
   const matches=parser.search(pdfPages,term,{limit:30});
   ui.pdfResults.replaceChildren();
   for(const item of matches){
    const li=document.createElement('li');
    const heading=document.createElement('strong');
    heading.textContent='p. '+item.page;
    const excerpt=document.createElement('p');
    excerpt.textContent=item.excerpt;
    li.append(heading,excerpt);
    ui.pdfResults.append(li);
   }
   const scanned=pdfIndexed.scanned;
   ui.pdfInfo.textContent=(pdfIndexed.characters===0?t.pdfScanned:matches.length?t.pdfResults(matches.length):t.pdfNoHits)+
    (pdfIndexed.truncated?' '+t.pdfPartial(pdfIndexed):'')+
    ' '+t.pdfReset;
  }
  function addURL(){
   const uri=directPhotoURL(ui.url.value);
   if(!uri){status(locale().invalid);return}
   discard();
   const current=++sequence;
   ui.preview.hidden=false;ui.name.textContent=uri.split('/').pop();ui.note.textContent=locale().urlimage;
   ui.thumb.referrerPolicy='no-referrer';
   ui.thumb.hidden=false;
   status(locale().loading);
   ui.thumb.onload=()=>{if(current===sequence){selection={kind:'url',name:uri.split('/').pop()};previewURL=uri;status('')}};
   ui.thumb.onerror=()=>{if(current===sequence){discard();status(locale().failed)}};
   ui.thumb.src=uri;
  }
  function runTextSearch(){
   const description=ui.description.value.trim();
   const filename=selection?.name||'';
   const term=description||filenameQuery(filename);
   if(term.length<2){status(locale().empty);ui.description.focus();return}
   // No file, pixel data, blob URL or remote photo URL reaches the
   // search API. Only the chosen description or safe filename is submitted.
   discard({clearDescription:true});close({reset:false});
   query.value=term.slice(0,query.maxLength||180);
   query.dispatchEvent(new Event('input',{bubbles:true}));
   if(typeof form.requestSubmit==='function')form.requestSubmit();
   else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  }
  camera.addEventListener('click',()=>panel.hidden?open():close());
  plus.addEventListener('click',()=>panel.hidden?open():close());
  ui.close.addEventListener('click',()=>close());
  ui.remove.addEventListener('click',()=>{discard();status(locale().cleared)});
  ui.photo.addEventListener('click',()=>ui.photoInput.click());
  ui.doc.addEventListener('click',()=>ui.docInput.click());
  ui.pdfPick.addEventListener('click',()=>ui.pdfInput.click());
  ui.photoInput.addEventListener('change',()=>setSelected(ui.photoInput.files?.[0],'image'));
  ui.docInput.addEventListener('change',()=>setSelected(ui.docInput.files?.[0],'document'));
  ui.pdfInput.addEventListener('change',()=>setSelected(ui.pdfInput.files?.[0],'document'));
  ui.pdfGo.addEventListener('click',()=>{void searchPdf()});
  ui.pdfTerm.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();void searchPdf()}});
  ui.previewURL.addEventListener('click',addURL);
  ui.url.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addURL()}});
  ui.search.addEventListener('click',runTextSearch);
  ui.description.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();runTextSearch()}});
  ui.lens.addEventListener('click',()=>{
   // Opening external visual search does NOT transmit the selected file.
   discard({clearDescription:true});close({reset:false});
  });
  for(const name of ['vitruvia:search','vitruvia:clear']){
   window.addEventListener(name,()=>close());
  }
  form.addEventListener('submit',()=>close(),true);
  window.addEventListener('pagehide',()=>close());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)close()});
  document.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!panel.hidden){event.stopPropagation();close();camera.focus()}
  },true);
  document.addEventListener('pointerdown',event=>{
   if(panel.hidden||panel.contains(event.target)||camera.contains(event.target)||plus.contains(event.target))return;
   close();
  });
  // Drag and drop stays in this browser tab. Do not intercept normal text drags.
  form.addEventListener('dragover',event=>{
   if(event.dataTransfer?.types?.includes('Files'))event.preventDefault();
  });
  form.addEventListener('drop',event=>{
   const file=event.dataTransfer?.files?.[0];if(!file)return;
   event.preventDefault();open();
   setSelected(file,IMAGE_MIME.has(file.type)?'image':'document');
  });
  const observer=new MutationObserver(records=>{
   if(records.some(r=>r.attributeName==='lang'))labels();
  });
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  labels();
  window.VitruviaVisualImport.reset=()=>close();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
