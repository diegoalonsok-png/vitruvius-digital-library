/* Author reading order: biography, dated manuscript witnesses, then scholarly translations.
 * Only catalogue-linked witnesses and identified editions enter this section. */
(()=>{'use strict';
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
function select(rows,query,person){
 const resolved=rows.find(r=>r.entityCanonical);
 const names=[query,person?.name,resolved?.entityCanonical].map(fold).filter(Boolean);
 const books=rows.filter(r=>r.type==='book'&&r.workId&&names.some(n=>fold(r.author)===n));
 const ids=new Set(books.map(r=>r.workId));
 const witnesses=rows.filter(r=>r.type==='manuscript'&&(r.workIds||[]).some(id=>ids.has(id)))
  .sort((a,b)=>(a.codexDate??9999)-(b.codexDate??9999));
 const seen=new Set();
 const translations=books.flatMap(b=>(b.catalogueReadings||[]).map(r=>({...r,workTitle:b.title}))).filter(r=>{
  if(!r.url||seen.has(r.url))return false;seen.add(r.url);return true;
 });
 return {books,witnesses,translations};
}
function render(rows,query,person){
 const data=select(rows,query,person);if(!data.books.length)return false;
 const body=document.getElementById('article-body');if(!body)return false;
 const lang=document.documentElement.lang||'es';
 const text=(es,en,fr)=>lang==='en'?en:lang==='fr'?fr:es;
 const section=document.createElement('section');section.className='article-author-reading';section.id='article-author-reading';
 function add(parent,tag,value,cls){const e=document.createElement(tag);if(value)e.textContent=value;if(cls)e.className=cls;parent.append(e);return e}
 function link(parent,label,url){try{const u=new URL(url,location.href);if(!['https:','http:'].includes(u.protocol))return;const a=add(parent,'a',label);a.href=u.href;if(u.origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer'}return a}catch{}}
 add(section,'h3',text('Leer sus obras · manuscritos y traducciones','Read the works · manuscripts and translations','Lire les œuvres · manuscrits et traductions'));
 // Visible original-language reading access for each indexed classical work.
 // A catalogue record alone is never advertised as readable text.
 function originalReading(b){
  const items=(b.originalReadings||[]).filter(x=>x?.url&&x.language===b.originalLanguage);
  return items.find(x=>x.kind==='text')||items.find(x=>x.kind==='reader')||items.find(x=>x.kind==='pdf')||items[0]||null;
 }
 function originalLanguage(b){
  return b.originalLanguage==='grc'?
   text('griego original','Ancient Greek','grec ancien'):
   text('latín original','original Latin','latin original');
 }
 function makeReadingCard(b,compact=false){
  const reading=originalReading(b);
  const card=document.createElement('div');
  card.className='article-original-reading-card'+(compact?' is-contextual':'');
  const details=add(card,'div',undefined,'article-original-reading-details');
  add(details,'span',reading?
   text('OBRA · TEXTO ORIGINAL','WORK · ORIGINAL TEXT','ŒUVRE · TEXTE ORIGINAL'):
   text('OBRA · FICHA BIBLIOGRÁFICA','WORK · BIBLIOGRAPHIC RECORD','ŒUVRE · NOTICE BIBLIOGRAPHIQUE'),
   'article-original-reading-eyebrow');
  add(details,'strong',b.title,'article-original-reading-title');
  const note=reading?
   (b.originalEditionStatus==='lectura-local-parcial'?
    text('Edición o fragmento parcial; consultar cobertura.','Partial edition or excerpt; check coverage.','Édition ou extrait partiel ; vérifier la couverture.'):
    reading.kind==='external'?
    text('Lectura en institución externa; comprobar edición y cobertura.','Read at external institution; check edition and coverage.','Lecture à une institution externe ; vérifier édition et couverture.'):
    text('Acceso al texto en la biblioteca.','Text available through the library.','Accès au texte dans la bibliothèque.')):
   text('Texto original no disponible en el catálogo; consultar la ficha y los testimonios.','Original text not available in this catalogue; consult the work record and witnesses.','Texte original indisponible dans le catalogue ; consulter la notice et les témoins.');
  add(details,'small',note,'article-original-reading-note');
  const controls=add(card,'div',undefined,'article-original-reading-actions');
  let linkTitle;
  if(reading){
   const prefix=b.originalEditionStatus==='lectura-local-parcial'?
    text('Ver fragmento en ','View excerpt in ','Voir extrait en '):
    reading.kind==='external'?
    text('Consultar en ','Read at source in ','Consulter en '):
    text('Leer en ','Read in ','Lire en ');
   linkTitle=prefix+originalLanguage(b)+' →';
  }else linkTitle=text('Consultar ficha y códices →','View record and manuscripts →','Consulter notice et manuscrits →');
  const primary=link(controls,linkTitle,reading?.url||b.link);
  if(primary)primary.className='article-original-reading-cta';
  if(reading&&b.link&&b.link!==reading.url){
   const record=link(controls,text('Ficha de la obra','Work record','Notice de l’œuvre'),b.link);
   if(record)record.className='article-original-reading-record';
  }
  return card;
 }
 const primaryBooks=data.books.slice(0,12);
 if(primaryBooks.length){
  const showcase=add(section,'div',undefined,'article-original-readings');
  add(showcase,'h4',text('Leer las obras en su lengua original','Read the works in their original language','Lire les œuvres dans leur langue originale'));
  for(const b of primaryBooks)showcase.append(makeReadingCard(b));
  if(data.books.length>primaryBooks.length){
   add(showcase,'small',text('Más títulos y testimonios en el catálogo inferior.','More works and witnesses in the catalogue below.','Autres œuvres et témoins dans le catalogue ci-dessous.'),'article-note');
  }
 }
 // Near the first mention in the biography, highlight a readable work without
 // rewriting, linking or corrupting the encyclopedia's source paragraph.
 const priorParagraphs=[...body.querySelectorAll('p')].filter(p=>!p.closest('.article-author-reading,.article-bibliography-list'));
 let contextualCount=0;
 const anchorsUsed=new Set();
 for(const b of data.books){
  if(contextualCount>=3)break;
  if(!originalReading(b))continue;
  const names=[b.title,...(b.aliases||[])].map(fold).filter(n=>n.length>=8);
  const mention=priorParagraphs.find(p=>!anchorsUsed.has(p)&&names.some(n=>fold(p.textContent).includes(n)));
  if(!mention)continue;
  mention.after(makeReadingCard(b,true));
  anchorsUsed.add(mention);contextualCount++;
 }
 if(data.witnesses.length){
 add(section,'h4',text('1 · Testimonios manuscritos, del más antiguo al más reciente','1 · Manuscript witnesses, earliest first','1 · Témoins manuscrits, du plus ancien au plus récent'));
  add(section,'p',text('Ordenados por la fecha de la copia documentada. Un testimonio parcial no equivale a un libro completo; la antigüedad se compara entre los registros identificados.','Ordered by the documented date of the copy. A partial witness is not a complete book; chronology applies to identified records.','Classés selon la date documentée de la copie. Un témoin partiel ne correspond pas à un livre complet ; la chronologie concerne les notices identifiées.'),'article-note');
  const ol=add(section,'ol');
  for(const [i,r] of data.witnesses.entries()){
   const li=add(ol,'li',null,i===0?'principal-reference-work':null);
   link(li,r.title,r.codexViewer||r.viewerUrl||r.link);
   add(li,'p',[r.codexRepository,r.meta,r.excerpt].filter(Boolean).join(' · '),'article-note');
   link(li,text('Abrir visor','Open viewer','Ouvrir la visionneuse'),r.codexViewer||r.viewerUrl||r.link);
   const record=r.links?.find(x=>/ficha/i.test(x.label));if(record){add(li,'span',' · ');link(li,text('Ficha institucional','Institutional record','Notice institutionnelle'),record.url)}
  }
 }
 add(section,'h4',text('2 · Textos originales y fichas de obras','2 · Original texts and work records','2 · Textes originaux et notices des œuvres'));
 const originals=add(section,'ul');for(const b of data.books){const li=add(originals,'li');link(li,b.title,b.link);if(b.citationText)add(li,'small',' · '+b.citationText);else if(!b.localHosted)add(li,'small',text('Ficha de obra · lectura según disponibilidad de la fuente','Work record · reading depends on source availability','Notice de l’œuvre · lecture selon la disponibilité de la source'))}
 if(data.translations.length){add(section,'h4',text('3 · Traducciones académicas identificadas','3 · Identified scholarly translations','3 · Traductions scientifiques identifiées'));const ol=add(section,'ol');for(const r of data.translations){const li=add(ol,'li');link(li,r.workTitle+' · '+r.title,r.url);add(li,'p',r.note,'article-note');add(li,'small',r.fulltext?text('Lectura enlazada · edición identificada','Linked reading · identified edition','Lecture liée · édition identifiée'):text('Ficha bibliográfica · acceso al texto según la institución','Bibliographic record · text access depends on the institution','Notice bibliographique · accès au texte selon l’institution'));}}
 body.append(section);return true;
}
window.VitruviaAuthorReading={select,render};
})();
