/* Modern editions use their own bibliographic record, not empty ancient-codex fields. */
(()=>{
 'use strict';
 const editions={'vitruvio-v514-pdf':'recensio-es','vitruvio-v554-pdf':'recensio-fr','theory-v297-pdf':'theory-en'};
 const siteId='vitruvius-digital-library';
 const siteDOI='10.5281/zenodo.23868911';
 let catalogue;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);return n};
 const link=(text,url)=>{const n=el('a',text);n.href=url;if(/^https:/.test(url)){n.target='_blank';n.rel='noopener noreferrer'}return n};
 const row=(root,label,value)=>{const p=el('p');p.className='cwd-row';p.append(el('strong',label+': '),document.createTextNode(String(value)));root.append(p)};
 async function render(root,id){
  root.replaceChildren(el('p','Cargando la ficha editorial…'));
  try{
   if(!catalogue)catalogue=fetch('data/catalog.json').then(r=>{if(!r.ok)throw Error('Catálogo no disponible');return r.json()}).catch(e=>{catalogue=null;throw e});
   const catalog=await catalogue;
   const book=(catalog.editions||[]).find(e=>e.id===editions[id]);
   const site=id===siteId;
   if(!site&&!book)throw Error('Edición no identificada');
   root.replaceChildren();root.classList.add('classic-work-dossier');root.dataset.workId=id;
   const title=site?'Vitruvius Digital Library':book.bibliographic_title||book.title;
   const doi=site?siteDOI:book.doi;
   root.append(el('p','VITRUVIUS · FICHA BIBLIOGRÁFICA Y EDITORIAL'),el('h2',title));
   row(root,'Autoría editorial',site?'Diego A. Kurilo · dirección y desarrollo del proyecto':book.editorial_role+' · '+book.bibliographic_author);
   row(root,'Naturaleza',site?'Biblioteca digital e instrumento de investigación':'Edición moderna de investigación · '+book.version);
   if(!site)row(root,'Autor del tratado antiguo','Marcus Vitruvius Pollio · De architectura');
   row(root,'Lugar y sello editorial',site?'Buenos Aires · Vitruvius Digital Library':[book.publication_place,book.publisher].filter(Boolean).join(' · '));
   row(root,'Publicación',site?'2026 · registro Zenodo publicado el 1 de noviembre de 2026':book.year+' · '+book.edition_statement);
   const identifier=el('p');identifier.append(el('strong','DOI: '),link(doi,'https://doi.org/'+doi));root.append(identifier);
   if(!site){
    row(root,'ISBN',book.isbn||'Pendiente de cotejo: el catálogo y el paratexto de referencia consultado no consignan el ISBN de esta edición');
    if(book.isbn_note)row(root,'Nota del ISBN',book.isbn_note);
    row(root,'Lenguas',book.languages.map(l=>({la:'latín',es:'castellano',fr:'francés',en:'inglés'})[l]||l).join(' / '));
    row(root,'Extensión del PDF',book.pages+' páginas; la paginación editorial no se confunde con foliación manuscrita');
    row(root,'Alcance textual indexado',book.indexed_passages+' unidades editoriales por locus · '+book.structured_index);
    row(root,'Descripción',book.description);
    row(root,'Texto de referencia',book.metadata_source.filename+' · paratexto editorial; índice estructurado de la misma versión');
    const access=el('p');access.className='cwd-links';access.append(link('Leer latín y traducción','lector-bilingue.html?edition='+book.id),document.createTextNode(' · '),link('Leer PDF completo',book.pdf),document.createTextNode(' · '),link('Tradición manuscrita de De architectura','classics-work-record.html?work=vitruvius'));root.append(access);
    const citation=book.bibliographic_author+'. '+title+'. '+book.edition_statement+'. '+book.publication_place+': '+book.publisher+', '+book.year+'. '+(book.isbn?'ISBN '+book.isbn+'. ':'')+'https://doi.org/'+doi+'.';
    row(root,'Cita bibliográfica',citation);
   }else{
    row(root,'Lenguas de consulta','Latín, griego antiguo, castellano, francés e inglés, según el recurso');
    row(root,'Identificación editorial','DOI propio del proyecto. Los identificadores de sus libros se citan por edición.');
    row(root,'Cita bibliográfica','Kurilo, Diego A. Vitruvius Digital Library. 2026. https://doi.org/'+siteDOI+'.');
   }
   root.append(el('h3','Ediciones que fundamentan la biblioteca'));
   for(const [workId,editionId] of Object.entries(editions)){
    const e=catalog.editions.find(x=>x.id===editionId),p=el('p');
    p.append(link(e.version+' · '+e.bibliographic_title,'classics-work-record.html?work='+workId),document.createTextNode(' · '),link(e.doi,'https://doi.org/'+e.doi));root.append(p);
   }
   root.append(link('Ficha del proyecto y DOI','classics-work-record.html?work='+siteId));
   row(root,'Control de los datos','DOI de cada edición contrastado con el registro público de Zenodo el 11-11-2026. Los datos de impresión y el ISBN proceden del catálogo editorial y de su fuente declarada; los campos ausentes siguen pendientes de cotejo.');
   return {id,title,doi,...(book||{})};
  }catch(error){root.replaceChildren(el('p','No se pudo cargar la ficha editorial: '+error.message));return null}
 }
 window.EditorialWorkRecords={has:id=>id===siteId||Object.hasOwn(editions,id),render,siteId};
})();
