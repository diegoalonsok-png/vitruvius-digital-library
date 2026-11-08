/* Galería contextual de obras y testimonios. Sin imágenes ficticias, con fuentes. */
(()=>{'use strict';
const get=id=>document.getElementById(id);
const norm=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const L=(es,en,fr)=>(document.documentElement.lang||'es').startsWith('en')?en:(document.documentElement.lang||'es').startsWith('fr')?fr:es;
const el=(tag,cl,t)=>{const x=document.createElement(tag);if(cl)x.className=cl;if(t!=null)x.textContent=t;return x;};
const link=(title,url)=>{const a=el('a','',title);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;};
const verifiedUrl=u=>{try{const x=new URL(u,location.href);return /^https?:$/.test(x.protocol)?x.href:''}catch{return ''}};
const doc=get('vitruvia-article'),preview=get('article-image-preview');
if(!doc||!preview)return;
const gallery=el('section','vitruvia-heritage-gallery');gallery.id='vitruvia-heritage-gallery';gallery.hidden=true;
gallery.setAttribute('aria-label','Obras, códices, álbumes y distinciones documentadas');
preview.after(gallery);
let sequence=0,query='',resultRows=[];
const cached=new Map();
async function json(url){
 if(cached.has(url))return cached.get(url);
 const pending=(async()=>{const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),8000);try{
 const res=await fetch(url,{signal:abort.signal});if(!res.ok)throw Error('HTTP '+res.status);return res.json();
 }finally{clearTimeout(timeout)}})().catch(()=>null);
 cached.set(url,pending);return pending;
}
function card(parent,r){
 const url=verifiedUrl(r.url);if(!url)return;
 const art=el('article','vhg-card'),poster=link(r.title,url),desc=el('div','vhg-info');
 poster.className='vhg-image-link';
 if(verifiedUrl(r.image)){
  const img=el('img','vhg-image');img.src=r.image;img.alt=r.title;img.loading='lazy';img.decoding='async';
  img.onerror=()=>{poster.replaceChildren(el('span','vhg-placeholder',r.kind==='music'?'♫':r.kind==='award'?'★':'▤'))};
  poster.append(img);
 }else poster.append(el('span','vhg-placeholder',r.kind==='music'?'♫':r.kind==='award'?'★':'▤'));
 const name=link(r.title,url);name.className='vhg-name';desc.append(name);
 const detail=[r.date,r.location,r.description].filter(Boolean).join(' · ');
 if(detail)desc.append(el('p','vhg-detail',detail));
 const src=link(L('Consultar fuente ↗','Source record ↗','Notice d’origine ↗'),url);src.className='vhg-source';desc.append(src);
 art.append(poster,desc);parent.append(art);
}
function block(root,title,records,note){
 if(!records.length)return;
 const sec=el('section','vhg-block');sec.append(el('h4','',title));
 if(note)sec.append(el('p','vhg-caption',note));
 const rows=el('div','vhg-cards');records.forEach(r=>card(rows,r));sec.append(rows);
 const info=el('p','vhg-caption',L('Registros documentados: ','Documented records: ','Notices documentées : ')+records.length);
 sec.append(info);root.append(sec);
}
const leonardo=[
 {title:'Codex Atlanticus',location:'Biblioteca Ambrosiana · Milán',date:'Siglos XV–XVI',url:'https://www.ambrosiana.it/en/discover/masterpieces/codex-atlanticus/',kind:'codex'},
 {title:'Codex Arundel · MS 263',location:'British Library · Londres',date:'1478–1518',url:'https://searcharchives.bl.uk/catalog/040-002039546',kind:'codex'},
 {title:'Códices Madrid I y II',location:'Biblioteca Nacional de España · Madrid',url:'https://www.bne.es/es/publicaciones/leonardo-interactivo',kind:'codex'}
];
function classify(name,description){
 const n=norm(name),d=norm(description);
 if(/\b(futbol|football|soccer|athlete|sportsperson|futbolista|deportista|tennis|tenista|basketball|boxer)\b/.test(d)||/^(lionel|leo) messi$/.test(n))return 'athlete';
 if(/\b(composer|compositor|compositora)\b/.test(d))return 'composer';
 if(/\b(musician|singer|cantante|band|rock|music group|grupo musical|banda)\b/.test(d)||/the beatles|rolling stones|nirvana|radiohead/.test(n))return 'music';
 if(/\b(writer|novelist|author|poet|escritor|poeta|dramaturg|filosofo)\b/.test(d))return 'author';
 if(/\b(painter|artist|sculptor|pintor|pintora|escultor)\b/.test(d)||/leonardo da vinci|vinci leonardo/.test(n))return 'visual';
 if(/\b(architect|arquitecto)\b/.test(d))return 'architect';
 return 'general';
}
async function awards(qid){
 if(!/^Q\d+$/.test(qid||''))return [];
 const wd=await json('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:qid,props:'claims',format:'json',origin:'*'}));
 const ids=[...new Set((wd?.entities?.[qid]?.claims?.P166||[]).filter(x=>x.rank!=='deprecated').map(x=>x.mainsnak?.datavalue?.value?.id).filter(x=>/^Q\d+$/.test(x||'')))].slice(0,15);
 if(!ids.length)return [];
 const data=await json('https://www.wikidata.org/w/api.php?'+new URLSearchParams({action:'wbgetentities',ids:ids.join('|'),props:'claims|labels',languages:'es|en|fr',format:'json',origin:'*'}));
 return ids.map(id=>{const x=data?.entities?.[id],name=x?.labels?.es?.value||x?.labels?.en?.value;const pic=x?.claims?.P18?.find(a=>a.mainsnak?.datavalue?.value)?.mainsnak?.datavalue?.value;return name?{title:name,kind:'award',url:'https://www.wikidata.org/wiki/'+id,
 image:typeof pic==='string'?'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(pic):'',location:'Wikidata · distinción registrada'}:null}).filter(Boolean);
}
/* Artista identificado por catálogo de autoridad MusicBrainz; recorrer todas
   las páginas de release-groups, no limitar la discografía a diez resultados
   de la búsqueda comercial de iTunes. */
const musicKey=n=>norm(n).replace(/^(the|los|las|el|la) /,'');
const musicType=rg=>{
 const primary=String(rg['primary-type']||'Other').toLowerCase();
 const secondary=(rg['secondary-types']||[]).map(x=>String(x).toLowerCase());
 if(secondary.includes('compilation'))return 'compilation';
 if(secondary.includes('live'))return 'live';
 if(secondary.includes('soundtrack'))return 'soundtrack';
 if(secondary.includes('remix'))return 'remix';
 return primary==='album'?'album':primary==='ep'?'ep':primary==='single'?'single':'other';
};
const sortChrono=(a,b)=>String(a.sortDate||'9999').localeCompare(String(b.sortDate||'9999'))||a.title.localeCompare(b.title);
async function appleAlbums(name){
 const raw=await json('https://itunes.apple.com/search?'+new URLSearchParams({term:name,entity:'album',limit:'200',country:'US',media:'music'}));
 return (raw?.results||[]).filter(r=>r.wrapperType==='collection'&&r.collectionViewUrl&&r.collectionName&&musicKey(r.artistName)===musicKey(name))
 .map(r=>({title:r.collectionName,sortDate:r.releaseDate||'',date:r.releaseDate?.slice(0,4),kind:'music',category:'album',
 image:r.artworkUrl100?.replace('100x100bb','300x300bb'),location:'Apple Music / iTunes · edición registrada',url:r.collectionViewUrl}));
}
async function musicBrainzAlbums(name){
 const found=await json('https://musicbrainz.org/ws/2/artist/?'+new URLSearchParams({query:'artist:"'+name.replace(/"/g,'')+'"',fmt:'json',limit:'10'}));
 const candidates=found?.artists||[];
 const selected=candidates.find(a=>musicKey(a.name)===musicKey(name)&&Number(a.score)>=80);
 if(!selected?.id)return {items:[],complete:false,total:0,source:''};
 const pages=[],PAGE=100,MAX=2000;let total=Infinity,offset=0;
 while(offset<total&&offset<MAX){
  const data=await json('https://musicbrainz.org/ws/2/release-group/?'+new URLSearchParams({artist:selected.id,fmt:'json',limit:String(PAGE),offset:String(offset)}));
  if(!data?.['release-groups'])break;
  total=Number(data['release-group-count'])||data['release-groups'].length;
  const batch=data['release-groups'];if(!batch.length)break;
  pages.push(...batch);offset+=batch.length;
  // MusicBrainz public API is rate limited to approximately 1 request/second.
  if(offset<total)await new Promise(resolve=>setTimeout(resolve,1100));
 }
 const unique=new Map();
 for(const rg of pages){
  if(!rg.id||!rg.title)continue;
  // MusicBrainz groups releases, so remasters of the same album don't each
  // become a new original work; explicit reissue groups stay separately sourced.
  unique.set(rg.id,{title:rg.title,sortDate:rg['first-release-date']||'',date:rg['first-release-date']?.slice(0,4)||'',
   kind:'music',category:musicType(rg),image:'https://coverartarchive.org/release-group/'+rg.id+'/front-250',
   location:'MusicBrainz · grupo de publicaciones',url:'https://musicbrainz.org/release-group/'+rg.id});
 }
 return {items:[...unique.values()].sort(sortChrono),complete:offset>=total,total,source:'https://musicbrainz.org/artist/'+selected.id};
}
async function albums(name){
 const [authority,store]=await Promise.all([musicBrainzAlbums(name),appleAlbums(name)]);
 if(authority.items.length){
  const art=new Map(store.map(r=>[musicKey(r.title),r]));
  for(const item of authority.items){
   const match=art.get(musicKey(item.title));
   if(match){item.image=match.image||item.image;item.purchaseUrl=match.url;}
  }
  return {items:authority.items,complete:authority.complete,source:authority.source,total:authority.total,provider:'MusicBrainz'};
 }
 const seen=new Map();for(const r of store)if(!seen.has(musicKey(r.title)))seen.set(musicKey(r.title),r);
 return {items:[...seen.values()].sort(sortChrono),complete:false,total:0,source:'https://musicbrainz.org/search?'+new URLSearchParams({query:name,type:'artist',method:'indexed'}),provider:'Apple Music / iTunes'};
}
const musicTitles={
 album:['Álbumes de estudio y otros álbumes','Studio and other albums','Albums studio et autres albums'],
 soundtrack:['Bandas sonoras','Soundtracks','Bandes originales'],
 live:['Álbumes en vivo','Live albums','Albums live'],
 compilation:['Recopilatorios','Compilations','Compilations'],
 ep:['EP','EPs','EP'],
 single:['Sencillos','Singles','Singles'],
 remix:['Remixes','Remixes','Remixes'],
 other:['Otras publicaciones','Other releases','Autres publications']
};
async function authoredBooks(name){
 // Direct author identifier + paginated works. Avoid truncated text searches
 // falsely presented as a complete oeuvre.
 const found=await json('https://openlibrary.org/search/authors.json?'+new URLSearchParams({q:name,limit:'20'}));
 const author=(found?.docs||[]).find(a=>norm(a.name)===norm(name)&&/^OL\d+A$/.test(a.key||''));
 if(!author)return {items:[],complete:false,source:'https://openlibrary.org/search/authors?'+new URLSearchParams({q:name})};
 const items=[],PAGE=100,MAX=3000;let offset=0,total=Infinity;
 while(offset<total&&offset<MAX){
  const data=await json('https://openlibrary.org/authors/'+author.key+'/works.json?'+new URLSearchParams({limit:String(PAGE),offset:String(offset)}));
  if(!Array.isArray(data?.entries))break;
  total=Number(data.size)||data.entries.length;
  const batch=data.entries;if(!batch.length)break;
  for(const w of batch){
   if(!/^\/works\/OL\d+W$/.test(w.key||'')||!w.title)continue;
   const cover=(w.covers||[]).find(x=>Number.isInteger(x)&&x>0);
   const year=String(w.first_publish_date||'').match(/(?:1[0-9]{3}|20[0-9]{2})/);
   items.push({title:w.title,kind:'book',sortDate:year?.[0]||'',date:year?.[0]||'',image:cover?'https://covers.openlibrary.org/b/id/'+cover+'-M.jpg?default=false':'',
    location:'Open Library · obra atribuida',url:'https://openlibrary.org'+w.key});
  }
  offset+=batch.length;
 }
 const seen=new Map();for(const w of items)if(!seen.has(w.url))seen.set(w.url,w);
 return {items:[...seen.values()].sort(sortChrono),complete:offset>=total,source:'https://openlibrary.org/authors/'+author.key+'/works'};
}
async function works(qid,kind){
 if(!window.VitruviaCulturalWorks?.catalogue)return [];
 const data=await window.VitruviaCulturalWorks.catalogue({wikidataId:qid},kind).catch(()=>null);
 return (data?.works||[]).filter(w=>w.href).slice(0,16).map(w=>({title:w.title,date:w.date,kind:'work',description:w.description,
 image:w.image,url:w.href,location:'Wikidata / Commons · verificar ubicación en ficha'}));
}
function manuscripts(rows){
 const seen=new Set();
 return rows.filter(x=>x.type==='manuscript'&&verifiedUrl(x.codexViewer||x.viewerUrl||x.link)&&x.codexShelfmark)
 .filter(x=>{const id=x.codexShelfmark;if(seen.has(id))return false;seen.add(id);return true}).slice(0,8)
 .map(x=>({title:[x.title,x.codexShelfmark].filter(Boolean).join(' · '),date:x.codexDate,location:x.codexRepository,kind:'codex',
 url:x.codexViewer||x.viewerUrl||x.link,image:x.imageRights?x.image:''}));
}
async function render(name,entity,rows){
 const id=++sequence,container=el('div','vhg-content'),kind=classify(name,entity?.description||entity?.authorityDescription||'');
 const qid=entity?.qid||entity?.wikidataId;
 gallery.replaceChildren();gallery.hidden=false;
 const title=el('div','vhg-header');title.append(el('h3','',L('Obras y testimonios documentados','Documented works and witnesses','Œuvres et témoins documentés')));
 title.append(el('p','vhg-caption',L('Imágenes de catálogos reales y vínculos a registros de origen. Las colecciones no se infieren por semejanza visual.',
 'Images from source catalogues and direct records. Collections are not inferred from appearance.',
 'Images de catalogues documentés et liens directs.')));gallery.append(title,container);
 if(/leonardo da vinci|leonardo di ser piero da vinci/.test(norm(name)))block(container,L('Cuadernos y códices conservados','Surviving notebooks and codices','Carnets et codex conservés'),leonardo);
 if(kind==='author'||kind==='general')block(container,L('Testimonios manuscritos del catálogo','Manuscript witnesses in the catalogue','Témoins manuscrits du catalogue'),manuscripts(rows));
 const tasks=[];
 if(kind==='athlete'&&qid)tasks.push(awards(qid).then(items=>({label:L('Distinciones documentadas','Documented awards','Distinctions documentées'),items,note:L('Las distinciones individuales registradas no constituyen una lista completa de copas o títulos de equipo.','Individual awards are not an exhaustive list of team trophies.','Les distinctions individuelles ne représentent pas tous les titres collectifs.')})));
 if(kind==='music')tasks.push(albums(name).then(result=>({kind:'music',label:L('Discografía y portadas','Discography and album covers','Discographie et pochettes'),...result})));
 if(kind==='author')tasks.push(authoredBooks(name).then(result=>({kind:'books',label:L('Bibliografía documentada','Documented bibliography','Bibliographie documentée'),...result})));
 if(qid&&!['athlete','music','author'].includes(kind))tasks.push(works(qid,kind).then(items=>({label:kind==='visual'?L('Pinturas y obras atribuidas','Attributed artworks','Œuvres attribuées'):kind==='composer'?L('Composiciones documentadas','Documented compositions','Compositions documentées'):L('Obras de la persona','Works by this person','Œuvres de la personne'),items})));
 if(!tasks.length&&!container.children.length){gallery.hidden=true;return}
 const loaded=await Promise.allSettled(tasks);
 if(id!==sequence)return;
 for(const entry of loaded){
  if(entry.status!=='fulfilled')continue;
  const result=entry.value;
  if(result.kind==='music'){
   const note=result.complete?L('Catálogo paginado de MusicBrainz: ', 'Paged MusicBrainz catalogue: ', 'Catalogue MusicBrainz paginé : ')+result.items.length+
    L(' publicaciones registradas. Fechas de primeras ediciones catalogadas.', ' documented release groups. Dates refer to first catalogued release.', ' publications documentées. Dates de première parution.') :
    L('Catálogo parcial recuperado; consultar la fuente para posibles obras adicionales.', 'Partial catalogue returned; consult the source for further works.', 'Catalogue partiel ; consulter la source pour d’autres œuvres.');
   container.append(el('p','vhg-caption',note));
   for(const type of ['album','soundtrack','live','compilation','ep','single','remix','other']){
    const group=result.items.filter(r=>r.category===type);
    if(group.length)block(container,L(...musicTitles[type])+' ('+group.length+')',group);
   }
  }else if(result.kind==='books'){
   block(container,result.label+' ('+result.items.length+')',result.items,result.complete?
    L('Obras recuperadas mediante el índice paginado del autor.','Works retrieved from the author’s paginated catalogue.','Œuvres issues du catalogue paginé de l’auteur.'):
    L('Resultados parciales. El catálogo de origen puede contener más obras.','Partial results. The source catalogue may contain further works.','Résultats partiels ; le catalogue peut contenir davantage d’œuvres.'));
  }else block(container,result.label,result.items,result.note);
  if(result.source&&['music','books'].includes(result.kind)){
   const source=link(L('Consultar catálogo completo ↗','Browse source catalogue ↗','Consulter le catalogue complet ↗'),result.source);
   source.className='vhg-catalogue-link';container.append(source);
  }
 }
 if(!container.children.length)gallery.hidden=true;
}
function schedule(q,rows){
 query=String(q||'').trim();resultRows=Array.isArray(rows)?rows:[];
 if(!query){sequence++;gallery.hidden=true;gallery.replaceChildren();return}
 const entity=window.VitruviaCurrentEntity;
 const current=entity?.qid||entity?.wikidataId?entity:null;
 const name=current?.label||current?.catalogName||current?.canonical||query;
 void render(name,current,resultRows);
}
window.addEventListener('vitruvia:results',e=>schedule(e.detail?.query||get('query')?.value,e.detail?.rows));
window.addEventListener('vitruvia:entity',e=>schedule(get('query')?.value||query,resultRows));
window.addEventListener('vitruvia:clear',()=>schedule('',[]));
const initial=window.VitruviaSearchSnapshot;
if(initial?.query)schedule(initial.query,initial.rows);
})();
