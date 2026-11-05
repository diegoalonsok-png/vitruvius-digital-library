/* VITRUVIA WEB DOSSIER
   Domain-organized evidence from Open Library, Apple iTunes catalogue and indexed results.
   Does not claim to index the entire web or fabricate works, descriptions or shop inventory.
*/
(()=>{
'use strict';
const normalized=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const language=()=>['en','fr'].includes(document.documentElement.lang)?document.documentElement.lang:'es';
const L=(es,en,fr)=>language()==='en'?en:language()==='fr'?fr:es;
const el=(t,c,v)=>{const x=document.createElement(t);if(c)x.className=c;if(v!==undefined)x.textContent=String(v);return x};
const link=(value,url)=>{const a=el('a',null,value);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a};
const remember=new Map();
async function getJSON(url){
 if(!/^https:\/\//.test(url))return null;
 const control=new AbortController();
 const timeout=setTimeout(()=>control.abort(),6500);
 try{const res=await fetch(url,{signal:control.signal,headers:{Accept:'application/json'}});if(!res.ok)throw Error('HTTP '+res.status);return await res.json()}
 finally{clearTimeout(timeout)}
}
function cached(url){
 if(!remember.has(url))remember.set(url,getJSON(url).catch(()=>null));
 return remember.get(url);
}
function isAbout(subject,title){
 const a=normalized(subject).split(' ').filter(x=>x.length>2&&!['richard','marcus','jose','joseph','saint','santo','santa'].includes(x));
 const b=normalized(title).split(' ');
 const significant=a.filter(x=>x.length>=4);
 return significant.length?significant.some(x=>b.includes(x)):normalized(title).includes(normalized(subject));
}
function identity(query,rows){
 const plan=window.VitruviaSemanticQuery?.plan(query);
 const terms=(plan?.terms||normalized(query).split(' ')).filter(x=>x.length>2);
 const identities=rows.filter(r=>r.type==='wikipedia'&&r.link&&(
  r.preferredWiki||r.pageid||r.wikidataId
 ));
 const matches=identities.map(x=>{
  const title=normalized(x.title||'');
  const parts=title.split(' ');
  const overlap=terms.filter(t=>parts.includes(t)||parts.some(p=>t.length>=5&&p.length>=5&&(
   t===p||p.startsWith(t)||t.startsWith(p)))).length;
  const exact=title===normalized(query)||title===normalized(plan?.subject||query);
  return{x,score:(exact?250:0)+overlap*60+Number(!!x.preferredWiki)*25};
 }).sort((a,b)=>b.score-a.score);
 const first=matches[0];
 if(!first||first.score<75||(!first.x.preferredWiki&&first.score<120))return null;
 return first.x;
}
function topicType(query,rows){
 const person=identity(query,rows);
 const desc=normalized([person?.entityDescription,person?.excerpt,person?.fullExtract?.slice(0,350)].filter(Boolean).join(' '));
 const q=normalized(query);
 if(person){
  // A literary title is a WORK, not the writer mentioned in its description.
  const literary=/\b(novel|novella|book|books|poem|epic|epopeya|poema|poes(i|í)a|novela|libro|tragedia|comedia|play|drama|literary work|obra literaria|texto literario|treatise|tratado|cuento|relato)\b/i;
  const title=normalized(person.title||person.entityCanonical||'');
  if(literary.test(desc)&&(title===q||normalized(person.entityCanonical||'')===q)&&
    !/\b(writer|author|poet|poeta|escritor|escritora|novelist|singer|cantante|musician|musico|arquitecto|architect)\b/.test(desc.slice(0,75))){
   return{kind:'literary-work',name:person.entityCanonical||person.title,person};
  }
  if(/\b(singer|musician|composer|vocalist|cantante|musico|musica|compositor|compositora|rapero|rapper|band|grupo musical|banda|rock band|cantautor|pianista|guitarrista|interprete)\b/.test(desc))
   return {kind:'music',name:person.entityCanonical||person.title,person};
  if(/\b(architect|arquitecto|arquitecta|urbanista|engineer|ingeniero|ingeniera)\b/.test(desc))
   return {kind:'architect',name:person.entityCanonical||person.title,person};
  if(/\b(writer|author|poet|poeta|escritor|escritora|novelist|filosofo|philosopher|humanist|historiador|historian|dramaturgo|playwright)\b/.test(desc))
   return {kind:'author',name:person.entityCanonical||person.title,person};
 }
 if(/\b(arquitectura|arquitectos|arquitectas|architects|architecture|architettura)\b/.test(q))
  return{kind:'architecture',name:query,person};
 if(/\b(cantante|cantantes|musicos|bandas|albums|albumes|discos|musica|music|singers|musicians)\b/.test(q))
  return{kind:'music-topic',name:query,person};
 if(/\b(escritor|escritora|poeta|poetas|autores|libros|books|literatura|writers|poets|authors)\b/.test(q))
  return{kind:'literature',name:query,person};
 return{kind:'general',name:person?.title||query,person};
}
function header(root,text){
 const h=el('h4','context-section-title',text);root.append(h);return h;
}
function info(root,text){root.append(el('p','context-note',text))}
function card(root,title,href,description,cover,metadata,cta){
 const item=el('article','web-dossier-card');
 const body=el('div','web-dossier-card-body');
 if(cover&&/^https:\/\//.test(cover)){
  const a=link('',href);a.className='web-dossier-cover-link';
  const image=el('img','web-dossier-cover');image.src=cover;image.alt=title;
  image.loading='lazy';image.decoding='async';image.addEventListener('error',()=>a.remove());
  a.append(image);item.append(a);
 }
 body.append(link(title,href));
 if(metadata)body.append(el('p','web-dossier-meta',metadata));
 if(description)body.append(el('p','web-dossier-description',description));
 body.append(link(cta||L('Consultar ficha y disponibilidad ↗','View record and availability ↗','Consulter la notice et la disponibilité ↗'),href));
 item.append(body);root.append(item);return item;
}
function libraryAuthor(name){
 const url='https://openlibrary.org/search.json?'+new URLSearchParams({
  author:name,limit:'70',fields:'key,title,author_name,first_publish_year,edition_count,cover_i,first_sentence,publisher,isbn'
 });
 return cached(url);
}
function isAuthor(book,name){
 const bs=(book.author_name||[]).map(normalized);
 const subject=normalized(name),parts=subject.split(' ').filter(x=>x.length>2);
 const surname=parts.at(-1);
 return !!surname&&bs.some(a=>{
  const aParts=a.split(' ');
  return aParts.includes(surname)&&(
   parts.length===1||parts.slice(0,-1).some(x=>aParts.includes(x))||
   // A catalog can abbreviate given names ("R. Buckminster Fuller").
   (parts.length>=3&&aParts.includes(parts[parts.length-2]))
  );
 });
}
function bookDescription(book){
 const first=typeof book.first_sentence==='string'?book.first_sentence:
  Array.isArray(book.first_sentence)?book.first_sentence[0]:'';
 if(first)return String(first).slice(0,260);
 const year=book.first_publish_year;
 const count=Number(book.edition_count)||0;
 return L(
  'Referencia bibliográfica catalogada'+(year?' desde '+year:'')+(count?' · '+count+' ediciones registradas':'')+'. No se dispone de una reseña editorial verificada.',
  'Catalogued bibliographic record'+(year?' from '+year:'')+(count?' · '+count+' editions recorded':'')+'. No verified editorial synopsis available.',
  'Référence bibliographique cataloguée'+(year?' depuis '+year:'')+(count?' · '+count+' éditions recensées':'')+'. Résumé éditorial non vérifié.'
 );
}

/* Short catalog descriptions are displayed as catalog statements, not
   generated critical reviews; first publication dates are source-labelled. */
async function enrichWorkSynopsis(cardNode,record,valid){
 if(!/^\/works\/OL\d+W$/.test(record.key||''))return;
 const doc=await cached('https://openlibrary.org'+record.key+'.json');
 if(!valid()||!cardNode.isConnected)return;
 const raw=typeof doc?.description==='string'?doc.description:
  typeof doc?.description?.value==='string'?doc.description.value:'';
 const synopsis=String(raw||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 if(!synopsis)return;
 let paragraph=cardNode.querySelector('.web-dossier-description');
 if(!paragraph){paragraph=el('p','web-dossier-description');cardNode.querySelector('.web-dossier-card-body')?.append(paragraph)}
 // At most 24 words of externally supplied synopsis, credited to its catalogue.
 paragraph.textContent=L('Descripción del catálogo: ','Catalogue description: ','Description du catalogue : ')+
  synopsis.split(/\s+/).slice(0,24).join(' ')+(synopsis.split(/\s+/).length>24?'…':'');
}
function normalizedWorkTitle(s){return normalized(s).replace(/\b(the|a|an|la|el|le|les)\b/g,'').trim()}
async function books(root,topic,valid){
 const heading=header(root,L('Libros y publicaciones','Books and publications','Livres et publications'));
 const section=el('div','web-dossier-list');root.append(section);
 const isPerson=!!topic.person;
 if(!isPerson&&topic.kind!=='literature'){heading.remove();section.remove();return}
 const status=el('p','context-note',L('Consultando catálogos bibliográficos…','Checking bibliographic catalogues…','Consultation des catalogues bibliographiques…'));section.append(status);
 try{
  const response=await libraryAuthor(topic.name);
  if(!valid()||!root.isConnected)return;
  section.replaceChildren();
  const docs=(response?.docs||[]).filter(x=>/^\/works\/OL\d+W$/.test(x.key||'')&&isAuthor(x,topic.name));
  const seen=new Set(),books=[];
  for(const record of docs){
   const key=normalizedWorkTitle(record.title||'');
   if(key.length<3||seen.has(key))continue;
   seen.add(key);books.push(record);
  }
  books.sort((a,b)=>(Number(a.first_publish_year)||9999)-(Number(b.first_publish_year)||9999));
  if(!books.length){
   info(section,L('No se recuperaron títulos atribuibles con seguridad a este autor en Open Library. Puedes consultar el catálogo externo.',
    'No titles reliably attributable to this author were recovered in Open Library. Check the external catalogue.',
    'Aucun titre attribuable avec certitude à cet auteur dans Open Library. Consultez le catalogue externe.'));
  }else{
   const note=el('p','web-dossier-count',
    L('Obras catalogadas: ','Catalogue works: ','Œuvres cataloguées : ')+books.length+
    L(' · ordenadas por el primer año de publicación registrado, no necesariamente por fecha de composición.',
      ' · ordered by first catalogued publication year, which may differ from composition date.',
      ' · classées par première date de publication répertoriée, distincte de la date de composition.'));section.append(note);
   const stack=el('div','web-dossier-stack');section.append(stack);
   for(const book of books.slice(0,50)){
    const url='https://openlibrary.org'+book.key;
    const isbn=(Array.isArray(book.isbn)?book.isbn:[]).find(x=>/^(?:97[89])?[0-9Xx]{10,13}$/.test(String(x).replace(/[- ]/g,'')));
    const cover=Number(book.cover_i)>0?'https://covers.openlibrary.org/b/id/'+book.cover_i+'-M.jpg?default=false':
     isbn?'https://covers.openlibrary.org/b/isbn/'+encodeURIComponent(isbn)+'-M.jpg?default=false':'';
    const metadata=[book.first_publish_year?L('Primera publicación catalogada: ','First catalogued publication: ','Première publication cataloguée : ')+book.first_publish_year:'',
      (book.author_name||[])[0],'Open Library'].filter(Boolean).join(' · ');
    const recordCard=card(stack,book.title,url,bookDescription(book),cover,metadata);
    if(books.indexOf(book)<10)void enrichWorkSynopsis(recordCard,book,valid).catch(()=>{});
   }
   if(books.length>50)info(section,L('Se presentan 50 registros; consulta el catálogo para continuar.','Showing 50 records; continue in the catalogue.','50 notices affichées ; poursuivre dans le catalogue.'));
  }
  section.append(link(L('Buscar más obras del autor en Open Library ↗','Search more works in Open Library ↗','Chercher d’autres œuvres dans Open Library ↗'),
   'https://openlibrary.org/search?'+new URLSearchParams({author:topic.name})));
 }catch(err){if(valid()){section.replaceChildren();info(section,L('Catálogo temporalmente no disponible.','Catalogue temporarily unavailable.','Catalogue temporairement indisponible.'));}}
}
async function albums(root,topic,valid){
 if(topic.kind!=='music'&&!/^(musica|music|musicos|cantantes|musicians|singers)$/.test(normalized(topic.name)))return;
 header(root,L('Álbumes y discografía','Albums and discography','Albums et discographie'));
 const section=el('div','web-dossier-list');root.append(section);
 const status=el('p','context-note',L('Consultando discografía…','Checking discography…','Consultation de la discographie…'));section.append(status);
 const artistName=topic.name;
 try{
  const params=new URLSearchParams({term:artistName,entity:'album',limit:'90',country:'US',media:'music'});
  const d=await cached('https://itunes.apple.com/search?'+params);
  if(!valid()||!root.isConnected)return;
  section.replaceChildren();
  const matches=(d?.results||[]).filter(x=>x.wrapperType==='collection'&&x.collectionName&&x.collectionViewUrl&&x.artistName&&
    normalized(x.artistName).replace(/^(the|los|las|el|la) /,'')===normalized(artistName).replace(/^(the|los|las|el|la) /,''));
  const seen=new Set(),records=[];
  for(const x of matches){
   const key=String(x.collectionId||x.collectionName);
   if(seen.has(key))continue;seen.add(key);records.push(x);
  }
  records.sort((a,b)=>String(a.releaseDate||'').localeCompare(String(b.releaseDate||'')));
  if(!records.length){info(section,L('No hay álbumes atribuibles con certeza a este artista en el catálogo consultado.','No confidently attributed albums were found in the consulted catalogue.','Aucun album attribuable avec certitude dans le catalogue interrogé.'))}
  else{
   info(section,L('Catálogo de Apple Music/iTunes. Disponibilidad de compra según país y edición.','Apple Music/iTunes catalogue. Purchase availability varies by country and edition.','Catalogue Apple Music/iTunes. Disponibilité variable selon le pays et l’édition.'));
   const stack=el('div','web-dossier-stack');section.append(stack);
   for(const rec of records.slice(0,45)){
    const cover=String(rec.artworkUrl100||'').replace(/100x100bb/,'200x200bb');
    const meta=[rec.releaseDate?.slice(0,4),rec.primaryGenreName,rec.trackCount?String(rec.trackCount)+' '+L('temas','tracks','titres'):''].filter(Boolean).join(' · ');
    const descr=L('Álbum registrado en el catálogo musical, con fecha, género y cantidad de pistas cuando están disponibles.','Album listed in the music catalogue with release, genre and track count where available.','Album répertorié dans le catalogue musical avec date, genre et nombre de titres disponibles.');
    card(stack,rec.collectionName,rec.collectionViewUrl,descr,cover,meta,L('Ver álbum y opciones disponibles ↗','View album and available options ↗','Voir l’album et les options disponibles ↗'));
   }
  }
  section.append(link(L('Buscar más discos en MusicBrainz ↗','Find more releases in MusicBrainz ↗','Chercher d’autres disques sur MusicBrainz ↗'),
   'https://musicbrainz.org/search?'+new URLSearchParams({query:artistName,type:'artist',method:'indexed'})));
 }catch{if(valid()){section.replaceChildren();info(section,L('Catálogo musical no disponible ahora.','Music catalogue unavailable at the moment.','Catalogue musical temporairement indisponible.'))}}
}

/* Literary WORK queries show documented editions, not unrelated books.
   Publication chronology is bibliographic and distinct from composition date. */
function titleEquals(a,b){
 const clean=s=>normalized(s).replace(/^(the|a|an|el|la|los|las|le|les|l|il|lo|der|die|das) /,'');
 return clean(a)===clean(b);
}
function yearOfEdition(publishDate){
 const m=String(publishDate||'').match(/(?:^|\D)(1[4-9]\d{2}|20\d{2})(?:\D|$)/);
 return m?Number(m[1]):null;
}
function bookCoverFromEdition(e){
 const coverId=(e.covers||[]).find(x=>Number(x)>0);
 if(coverId)return'https://covers.openlibrary.org/b/id/'+coverId+'-M.jpg?default=false';
 const isbn=(e.isbn_13||e.isbn_10||[]).find(x=>/^[\dXx-]{10,17}$/.test(x));
 return isbn?'https://covers.openlibrary.org/b/isbn/'+encodeURIComponent(isbn)+'-M.jpg?default=false':'';
}
async function literaryEditions(root,topic,valid){
 header(root,L('Ediciones de la obra','Editions of this work','Éditions de cette œuvre'));
 const section=el('div','web-dossier-list');root.append(section);
 section.append(el('p','context-note',L('Consultando ediciones catalogadas…','Retrieving catalogued editions…','Recherche des éditions répertoriées…')));
 try{
  const url='https://openlibrary.org/search.json?'+new URLSearchParams({
   title:topic.name,limit:'35',fields:'key,title,author_name,first_publish_year,edition_count,cover_i'
  });
  const results=await cached(url);if(!valid()||!section.isConnected)return;
  const matches=(results?.docs||[]).filter(x=>/^\/works\/OL\d+W$/.test(x.key||'')&&titleEquals(x.title||'',topic.name));
  matches.sort((a,b)=>(Number(b.edition_count)||0)-(Number(a.edition_count)||0));
  const work=matches[0];
  if(!work){
   section.replaceChildren(el('p','context-note',L(
    'No se recuperaron ediciones con el título exacto en este catálogo. Consulta los registros externos.',
    'No editions with a matching title were retrieved from this catalogue. Check external records.',
    'Aucune édition correspondant exactement au titre n’a été récupérée. Consultez les notices externes.')));
  }else{
   const edURL='https://openlibrary.org'+work.key+'/editions.json?limit=100';
   const ed=await cached(edURL);if(!valid()||!section.isConnected)return;
   const records=(ed?.entries||[]).filter(e=>e.key&&String(e.key).startsWith('/books/OL'));
   records.sort((a,b)=>(yearOfEdition(a.publish_date)||9999)-(yearOfEdition(b.publish_date)||9999));
   section.replaceChildren();
   section.append(el('p','web-dossier-count',L(
    'Ediciones registradas ordenadas por año de publicación conocido; este listado no implica la fecha de composición ni reúne necesariamente todas las ediciones.',
    'Catalogued editions sorted by known publication year; these are not composition dates and the list may be incomplete.',
    'Éditions cataloguées classées par année de publication connue, non par date de composition ; la liste peut être incomplète.')));
   const stack=el('div','web-dossier-stack');section.append(stack);
   const seen=new Set();let shown=0;
   for(const item of records){
    const editionName=String(item.title||work.title),date=String(item.publish_date||'');
    const publisher=(item.publishers||[]).map(x=>typeof x==='string'?x:x.name).filter(Boolean).join(', ');
    const key=normalized(editionName)+'|'+date+'|'+normalized(publisher);
    if(seen.has(key))continue;seen.add(key);
    const publicRecord='https://openlibrary.org'+item.key;
    const cover=bookCoverFromEdition(item);
    const annotation=L('Edición registrada en un catálogo bibliográfico. Consulta la ficha para verificar traductor, editorial y disponibilidad.','Edition recorded in a bibliographic catalogue. Consult the record for translator, publisher and availability.','Édition inscrite dans un catalogue bibliographique. Consultez la notice pour traducteur, éditeur et disponibilité.');
    card(stack,editionName,publicRecord,annotation,cover,[date,publisher,'Open Library'].filter(Boolean).join(' · '));
    shown++;if(shown>=50)break;
   }
   if(!shown)info(stack,L('No hay fichas de edición identificables en la muestra consultada.','No identifiable edition records in the retrieved sample.','Aucune notice d’édition identifiable dans l’échantillon consulté.'));
  }
  section.append(link(L('Consultar todas las ediciones en Open Library ↗','Browse the full edition catalogue ↗','Consulter toutes les éditions sur Open Library ↗'),
   'https://openlibrary.org/search?'+new URLSearchParams({title:topic.name})));
 }catch{
  if(!valid()||!section.isConnected)return;
  section.replaceChildren(el('p','context-note',L('El catálogo de ediciones no responde ahora.','Edition catalogue temporarily unavailable.','Catalogue des éditions temporairement indisponible.')));
 }
}
function relatedImages(root,topic,rows){
 if(topic.kind==='architect'||topic.kind==='architecture')return; // dedicated architecture plates
 const matches=rows.filter(x=>x.image&&x.link&&(x.type==='wikipedia'||x.type==='museum'||x.type==='authority')&&
   (normalized(x.title||'')===normalized(topic.name)||
    (topic.person&&x.wikidataId&&x.wikidataId===topic.person.wikidataId)));
 if(!matches.length)return;
 header(root,L('Imágenes y documentación','Images and documentation','Images et documentation'));
 const seen=new Set(),gallery=el('div','web-dossier-images');
 for(const x of matches){
  if(seen.has(x.image))continue;seen.add(x.image);
  const fig=el('figure','web-dossier-image');
  const a=link('',x.imageRights||x.link);const img=el('img');img.src=x.image;img.alt=x.title;
  img.loading='lazy';img.decoding='async';a.append(img);fig.append(a);
  const caption=el('figcaption',null,x.title+' · '+(x.source||'Wikipedia'));fig.append(caption);
  gallery.append(fig);if(seen.size>=4)break;
 }
 root.append(gallery);
}
function render(panel,query,rows,isCurrent){
 const topic=topicType(query,rows||[]);
 const eligible=topic.person||topic.kind!=='general';
 if(!eligible)return;
 const section=el('section','web-dossier');panel.append(section);
 if(topic.person){
  header(section,L('Dossier de obras y fuentes','Works and sources dossier','Dossier des œuvres et sources'));
  info(section,L('Registros de catálogos externos, organizados por tipo. Las fichas comerciales o bibliográficas no equivalen a una reseña crítica.',
   'External catalogue records organized by type. Commercial and bibliographic descriptions are not critical reviews.',
   'Notices de catalogues externes organisées par type. Les descriptions commerciales ou bibliographiques ne constituent pas des recensions critiques.'));
 }else{
  header(section,L('Investigación complementaria','Additional research','Recherche complémentaire'));
 }
 const valid=()=>isCurrent()&&section.isConnected;
 if(['author','architect','literature'].includes(topic.kind))void books(section,topic,valid);
 if(topic.kind==='literary-work')void literaryEditions(section,topic,valid);
 if(['music','music-topic'].includes(topic.kind))void albums(section,topic,valid);
 relatedImages(section,topic,rows||[]);
}
window.VitruviaWebDossier={render,topicType};
})();