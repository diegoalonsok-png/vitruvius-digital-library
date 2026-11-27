/* Author reading order: biography, dated manuscript witnesses, then scholarly translations.
 * Only catalogue-linked witnesses and identified editions enter this section. */
(()=>{'use strict';
const fold=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
let registryEntries=null,registryPromise=null,latestRequest=0;
const authorKey=s=>fold(String(s||'').replace(/\s*\([^)]*\)/g,''));
const subjectKey=s=>authorKey(String(s||'').replace(/^(?:biograf[ií]a|vida y obra|vida|historia|obras|libros|biography|works)\s+(?:de[l]?\s+|of\s+)?/i,''));
function authorMatches(author,names){
 const a=authorKey(author);return names.some(n=>n===a||n.length>=5&&!n.includes(' ')&&a.split(' ').includes(n));
}
function registeredBooks(rows,query,person,entries){
 const names=[query,person?.name,...rows.filter(r=>r.preferredWiki||r.preferredAuthority).map(r=>r.entityCanonical)].map(subjectKey).filter(Boolean);
 const groups=new Map();
 for(const e of entries||[]){
  if(!e.workId||!e.title||!e.reader||!['json-passages','structured-bilingual','html-text','critical-indexed-latin'].includes(e.format))continue;
  if(!groups.has(e.workId))groups.set(e.workId,[]);
  groups.get(e.workId).push(e);
 }
 const out=[];
 for(const [id,all] of groups){
  if(!all.some(e=>authorMatches(e.author,names)))continue;
  const original=all.find(e=>['la','grc'].includes(e.language));
  if(!original)continue;
  const readings=all.filter(e=>e.language===original.language).map(e=>({url:e.reader,kind:'reader',language:e.language,label:e.sourceDescription||'',path:e.path}));
  const translations=all.filter(e=>!['la','grc'].includes(e.language)).map(e=>({url:e.reader,title:e.language.toUpperCase()+' · '+(e.sourceDescription||e.title),language:e.language,kind:'translation',fulltext:true,path:e.path}));
  out.push({type:'book',workId:id,title:original.title,author:original.author,originalLanguage:original.language,originalReadings:readings,catalogueReadings:translations,originalEditionStatus:'indexed-coverage-unverified',link:'bibliotheca-graeca-latina.html?work='+encodeURIComponent(id),registryBacked:true});
 }
 return out;
}
function select(rows,query,person,entries=registryEntries){
 const resolved=rows.find(r=>r.entityCanonical);
 const names=[query,person?.name,resolved?.entityCanonical].map(subjectKey).filter(Boolean);
 const merged=new Map();
 for(const b of rows.filter(r=>r.type==='book'&&r.workId&&authorMatches(r.author,names)))merged.set(b.workId,b);
 for(const b of registeredBooks(rows,query,person,entries)){
  const old=merged.get(b.workId);
  merged.set(b.workId,old?{...old,registryBacked:true,originalLanguage:b.originalLanguage,originalReadings:[...b.originalReadings,...(old.originalReadings||[])],catalogueReadings:[...b.catalogueReadings,...(old.catalogueReadings||[])]}:b);
 }
 const books=[...merged.values()];
 const ids=new Set(books.map(r=>r.workId));
 // Uncertain/undated copies must never receive an invented earliest rank.
 const datedYear=r=>{const y=Number(r?.codexDate);return Number.isFinite(y)&&y>=1&&y<=new Date().getFullYear()?y:null};
 const witnesses=rows.filter(r=>r.type==='manuscript'&&(r.workIds||[]).some(id=>ids.has(id)))
  .sort((a,b)=>(datedYear(a)??Infinity)-(datedYear(b)??Infinity));
 const earliestVerified=witnesses.find(r=>datedYear(r)!==null)||null;
 const seen=new Set();
 const translations=books.flatMap(b=>(b.catalogueReadings||[]).map(r=>({...r,workTitle:b.title}))).filter(r=>{
  if(!r.url||seen.has(r.url))return false;seen.add(r.url);return true;
 });
 return {books,witnesses,translations,earliestVerified};
}
function render(rows,query,person){
 const request=++latestRequest;
 const body=document.getElementById('article-body');if(!body)return false;
 if(!registryEntries){
  registryPromise??=fetch('data/classics-corpus/search-registry.json').then(r=>{if(!r.ok)throw Error('registry');return r.json()}).then(d=>{registryEntries=Array.isArray(d.entries)?d.entries:[];return registryEntries}).catch(()=>{registryPromise=null;return null});
  registryPromise.then(entries=>{if(entries&&request===latestRequest&&body.isConnected)render(rows,query,person)});
 }
 const data=select(rows,query,person);if(!data.books.length)return false;
 // Progressive source updates must replace, never duplicate, the reading dossier.
 body.querySelector('#article-author-reading')?.remove();
 body.querySelectorAll('.article-original-reading-card.is-contextual').forEach(el=>el.remove());
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
    ['pendiente-de-incorporar','indexed-coverage-unverified'].includes(b.originalEditionStatus)?
    text('Texto original indexado por pasajes; cotejo editorial y cobertura pendientes de verificar.','Original text indexed by passage; editorial collation and coverage not yet verified.','Texte original indexé par passages ; collation et couverture à vérifier.'):
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
  const translations=(b.catalogueReadings||[]).filter(r=>r.fulltext&&r.url);
  const byLanguage=new Map();
  for(const tr of translations)if(tr.language&&!byLanguage.has(tr.language))byLanguage.set(tr.language,tr);
  const languages={es:'Castellano',en:'English',fr:'Français',de:'Deutsch',it:'Italiano',pt:'Português'};
  for(const [language,tr] of byLanguage){
   const label=languages[language]||language;
   link(controls,text('Leer traducción · ','Read translation · ','Lire la traduction · ')+label,tr.url);
   if(b.workId!=='vitruvius'&&reading?.path&&tr.path){
    const u='classics-simple-parallel.html?'+new URLSearchParams({work:b.workId,left:b.originalLanguage,right:language});
    link(controls,text('Original y traducción · ','Original and translation · ','Original et traduction · ')+label,u);
   }
  }
  if(reading?.path&&/^(?:data\/|https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/).+\.json$/.test(reading.path)){
   const preview=add(details,'details',undefined,'article-reading-preview');
   add(preview,'summary',text('Ver primer pasaje del texto','View first textual passage','Voir le premier passage'));
   preview.addEventListener('toggle',async()=>{
    if(!preview.open||preview.dataset.loaded)return;preview.dataset.loaded='1';
    try{
     const r=await fetch(reading.path);if(!r.ok)throw Error('text');const d=await r.json();
     const p=(d.passages||[]).find(p=>p.locus&&(p.latin||p.greek||p.original||p.text));
     if(!p)throw Error('passage');add(preview,'small',text('Locus: ','Locus: ','Locus : ')+p.locus);
     const original=add(preview,'p',String(p.latin||p.greek||p.original||p.text).slice(0,1200));original.lang=b.originalLanguage;
     if(p.translation)add(preview,'p',String(p.translation).slice(0,1200));
     else add(preview,'small',text('Las traducciones separadas se consultan en sus lectores; no se presume alineación.','Separate translations are available in their readers; alignment is not assumed.','Les traductions séparées sont accessibles dans leurs lecteurs ; alignement non présumé.'));
    }catch{delete preview.dataset.loaded;add(preview,'p',text('Texto temporalmente no disponible; abrir el lector.','Text temporarily unavailable; open the reader.','Texte temporairement indisponible ; ouvrir le lecteur.'))}
   });
  }
  // Distinguish hosted indexed transcription from separately identified
  // historical editions; both remain accessible only on explicit click.
  const external=(b.originalReadings||[]).find(r=>r.kind==='external'&&r.url!==reading?.url);
  if(external){
   const a=link(controls,text('Consultar edición original externa','Consult external original edition','Consulter édition originale externe'),external.url);
   if(a)a.className='article-original-reading-record';
  }
  const oldest=window.VitruviaOldestSource?.forWork(b.workId);
  if(oldest){
   const a=link(controls,oldest.label,oldest.url);
   if(a)a.className='article-original-reading-record';
  }
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
   const more=add(showcase,'details',undefined,'article-reading-more');
   add(more,'summary',text('Ver las restantes obras indexadas','View the remaining indexed works','Voir les autres œuvres indexées')+' ('+(data.books.length-primaryBooks.length)+')');
   more.addEventListener('toggle',()=>{if(more.open&&!more.dataset.loaded){more.dataset.loaded='1';for(const b of data.books.slice(primaryBooks.length))more.append(makeReadingCard(b))}});

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
   const li=add(ol,'li',null,r===data.earliestVerified?'principal-reference-work':null);
   link(li,r.title,r.codexViewer||r.viewerUrl||r.link);
   add(li,'p',[r.codexRepository,r.meta,r.excerpt].filter(Boolean).join(' · '),'article-note');
   link(li,text('Abrir visor','Open viewer','Ouvrir la visionneuse'),r.codexViewer||r.viewerUrl||r.link);
   const record=r.links?.find(x=>/ficha/i.test(x.label));if(record){add(li,'span',' · ');link(li,text('Ficha institucional','Institutional record','Notice institutionnelle'),record.url)}
  }
 }
 add(section,'h4',text('2 · Textos originales y fichas de obras','2 · Original texts and work records','2 · Textes originaux et notices des œuvres'));
 const originals=add(section,'ul');for(const b of data.books){const li=add(originals,'li');link(li,b.title,b.link);if(b.citationText)add(li,'small',' · '+b.citationText);else if(!b.localHosted)add(li,'small',text('Ficha de obra · lectura según disponibilidad de la fuente','Work record · reading depends on source availability','Notice de l’œuvre · lecture selon la disponibilité de la source'))}
 if(data.translations.length){add(section,'h4',text('3 · Traducciones académicas identificadas','3 · Identified scholarly translations','3 · Traductions scientifiques identifiées'));const ol=add(section,'ol');for(const r of data.translations){const li=add(ol,'li');link(li,r.workTitle+' · '+r.title,r.url);add(li,'p',r.note,'article-note');add(li,'small',r.fulltext?text('Lectura enlazada · edición identificada','Linked reading · identified edition','Lecture liée · édition identifiée'):text('Ficha bibliográfica · acceso al texto según la institución','Bibliographic record · text access depends on the institution','Notice bibliographique · accès au texte selon l’institution'));}}
 const lead=body.querySelector(':scope > .article-lead');if(lead)lead.after(section);else body.prepend(section);return true;
}
window.VitruviaAuthorReading={select,render,registeredBooks};
window.addEventListener('vitruvia:search',()=>{latestRequest++});
window.addEventListener('vitruvia:clear',()=>{latestRequest++});
})();
