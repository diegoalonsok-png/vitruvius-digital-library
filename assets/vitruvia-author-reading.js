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
 add(section,'h4',text('1 · Testimonios manuscritos, del más antiguo al más reciente','1 · Manuscript witnesses, earliest first','1 · Témoins manuscrits, du plus ancien au plus récent'));
 if(data.witnesses.length){
  add(section,'p',text('Ordenados por la fecha de la copia documentada. Un testimonio parcial no equivale a un libro completo; la antigüedad se compara entre los registros identificados.','Ordered by the documented date of the copy. A partial witness is not a complete book; chronology applies to identified records.','Classés selon la date documentée de la copie. Un témoin partiel ne correspond pas à un livre complet ; la chronologie concerne les notices identifiées.'),'article-note');
  const ol=add(section,'ol');
  for(const [i,r] of data.witnesses.entries()){
   const li=add(ol,'li',null,i===0?'principal-reference-work':null);
   link(li,r.title,r.codexViewer||r.viewerUrl||r.link);
   add(li,'p',[r.codexRepository,r.meta,r.excerpt].filter(Boolean).join(' · '),'article-note');
   link(li,text('Abrir visor','Open viewer','Ouvrir la visionneuse'),r.codexViewer||r.viewerUrl||r.link);
   const record=r.links?.find(x=>/ficha/i.test(x.label));if(record){add(li,'span',' · ');link(li,text('Ficha institucional','Institutional record','Notice institutionnelle'),record.url)}
  }
 }else add(section,'p',text('Aún no hay un testimonio manuscrito verificado para estas obras en el catálogo.','No verified manuscript witness is catalogued for these works yet.','Aucun témoin manuscrit vérifié n’est encore répertorié pour ces œuvres.'),'article-note');
 add(section,'h4',text('2 · Ediciones del texto original','2 · Editions of the original text','2 · Éditions du texte original'));
 const originals=add(section,'ul');for(const b of data.books){const li=add(originals,'li');link(li,b.title,b.link);if(b.citationText)add(li,'small',' · '+b.citationText)}
 add(section,'h4',text('3 · Traducciones académicas identificadas','3 · Identified scholarly translations','3 · Traductions scientifiques identifiées'));
 if(data.translations.length){const ol=add(section,'ol');for(const r of data.translations){const li=add(ol,'li');link(li,r.workTitle+' · '+r.title,r.url);add(li,'p',r.note,'article-note');add(li,'small',r.fulltext?text('Lectura enlazada · edición identificada','Linked reading · identified edition','Lecture liée · édition identifiée'):text('Ficha bibliográfica · acceso al texto según la institución','Bibliographic record · text access depends on the institution','Notice bibliographique · accès au texte selon l’institution'));}}
 else add(section,'p',text('No hay traducciones académicas verificadas vinculadas todavía.','No verified scholarly translations have been linked yet.','Aucune traduction scientifique vérifiée n’est encore liée.'),'article-note');
 body.append(section);return true;
}
window.VitruviaAuthorReading={select,render};
})();
