/* Contextual documentary shelf for Vitruvia: author works, later editions
 * and manuscript discovery are always distinguished. Covers are optional;
 * a search link never implies a manuscript has been verified. */
(()=>{'use strict';
const RECORDS=[{"keys":["andrea palladio","palladio"],"name":"Andrea Palladio","items":[{"title":"I quattro libri dell'architettura","year":1570,"kind":"autor","note":"Tratado de arquitectura en cuatro libros; edición príncipe de Venecia.","query":"I quattro libri dell'architettura Palladio 1570"},{"title":"Le antichità di Roma","year":1554,"kind":"autor","note":"Guía de las antigüedades romanas publicada por Palladio.","query":"Palladio Le antichità di Roma 1554"},{"title":"The Architecture of A. Palladio","year":1715,"kind":"sobre","note":"Edición inglesa histórica vinculada a Giacomo Leoni; no es un libro nuevo escrito por Palladio.","query":"The Architecture of A Palladio Leoni 1715"},{"title":"Manuscritos y dibujos originales de Palladio","kind":"manuscrito","note":"Localizador de fondos y dibujos atribuidos; no se afirma una signatura ni autenticidad sin comprobación.","query":"Andrea Palladio manuscripts architectural drawings"}]},{"keys":["le corbusier","lecorbusier","charles edouard jeanneret"],"name":"Le Corbusier","items":[{"title":"Vers une architecture","year":1923,"kind":"autor","note":"Ensayo de teoría arquitectónica.","query":"Le Corbusier Vers une architecture 1923"},{"title":"Urbanisme","year":1925,"kind":"autor","note":"Ensayo sobre ciudad y urbanismo.","query":"Le Corbusier Urbanisme 1925"},{"title":"Le Modulor","year":1950,"kind":"autor","note":"Proporción arquitectónica y sistema del Modulor.","query":"Le Corbusier Le Modulor 1950"}]},{"keys":["frank lloyd wright","wright"],"name":"Frank Lloyd Wright","items":[{"title":"An Autobiography","year":1932,"kind":"autor","note":"Autobiografía del arquitecto.","query":"Frank Lloyd Wright An Autobiography 1932"},{"title":"The Natural House","year":1954,"kind":"autor","note":"Reflexiones sobre la vivienda y la arquitectura orgánica.","query":"Frank Lloyd Wright The Natural House"}]},{"keys":["vitruvio","vitruvius","vitruve"],"name":"Vitruvio","items":[{"title":"De architectura libri decem","kind":"autor","note":"Tratado antiguo en diez libros. Manuscritos y ediciones históricas se distinguen en el catálogo.","query":"Vitruvius De architectura libri decem"},{"title":"De architectura · Codex H","kind":"manuscrito","note":"Testimonio manuscrito identificado en la sección codicológica del sitio.","local":"codex-h-folios-local.html","query":"Vitruvius Harley MS 2767"}]},{"keys":["leon battista alberti","alberti"],"name":"Leon Battista Alberti","items":[{"title":"De re aedificatoria","year":1485,"kind":"autor","note":"Tratado de arquitectura, edición impresa póstuma de 1485.","query":"Alberti De re aedificatoria 1485"},{"title":"De pictura","year":1435,"kind":"autor","note":"Tratado sobre pintura y perspectiva.","query":"Alberti De pictura"}]},{"keys":["gustave eiffel","eiffel"],"name":"Gustave Eiffel","items":[{"title":"La Tour de trois cents mètres","year":1900,"kind":"autor","note":"Publicación técnica de Eiffel sobre la torre; consultar sus volúmenes y láminas.","query":"Gustave Eiffel La Tour de trois cents mètres 1900"}]}];
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const make=(t,c,v)=>{const x=document.createElement(t);if(c)x.className=c;if(v!=null)x.textContent=v;return x};
const label={autor:'Escrito por el autor',sobre:'Edición / estudio histórico',manuscrito:'Manuscritos · localizador'};
const searches=q=>({
 archive:'https://archive.org/search?'+new URLSearchParams({query:q}),
 commons:'https://commons.wikimedia.org/wiki/Special:MediaSearch?'+new URLSearchParams({type:'image',search:q+' book title page'}),
 catalogue:'https://openlibrary.org/search?'+new URLSearchParams({q})
});
function init(){
 const body=document.getElementById('article-body'),article=document.getElementById('vitruvia-article');
 if(!body||!article||document.getElementById('vr-author-books'))return;
 const root=make('section','vr-author-books');root.id='vr-author-books';root.hidden=true;
 const head=make('div','vr-ab-head'),heading=make('h3',null,'Libros, tratados y manuscritos');
 const desc=make('p',null,'Obras del autor, ediciones históricas y localizadores de manuscritos: se distinguen sus responsabilidades bibliográficas.');
 head.append(heading,desc);
 const cards=make('div','vr-ab-grid');
 const note=make('p','vr-ab-note','Las imágenes de cubierta son orientativas y pertenecen a ediciones identificadas por catálogos externos. Los enlaces de búsqueda no constituyen localizaciones verificadas de códices.');
 root.append(head,cards,note);
 body.append(root);
 let active='',request=0,observerLock=false,coverController=null;
 async function enrich(person,token){
  if(coverController)coverController.abort();
  const activeController=new AbortController();coverController=activeController;
  const books=person.items.filter(e=>e.kind!=='manuscrito').slice(0,5);
  for(const entry of books){
   if(token!==request||activeController.signal.aborted)return;
   const card=[...cards.children][person.items.indexOf(entry)];
   if(!card)continue;
   try{
    const params=new URLSearchParams({title:entry.title,limit:'4',fields:'key,title,cover_i,author_name,first_publish_year'});
    const response=await fetch('https://openlibrary.org/search.json?'+params,{signal:activeController.signal,referrerPolicy:'no-referrer'});
    if(!response.ok)continue;
    const json=await response.json();
    if(token!==request||activeController.signal.aborted)return;
    const item=(json.docs||[]).find(d=>Number.isInteger(d.cover_i)&&normalize(d.title).includes(normalize(entry.title).slice(0,12)));
    if(!item)continue;
    const cover=card.querySelector('.vr-ab-cover');
    const img=make('img',null);img.loading='lazy';img.decoding='async';
    img.alt='Cubierta catalogada de '+item.title+'; edición concreta por verificar';
    img.src='https://covers.openlibrary.org/b/id/'+item.cover_i+'-M.jpg';
    img.onerror=()=>img.remove();
    cover.append(img);cover.classList.add('vr-ab-cover-found');
    const anchor=make('a',null,'Ficha Open Library');
    const key=String(item.key||'');
    if(/^\/works\/OL[0-9]+W$/.test(key)){anchor.href='https://openlibrary.org'+key;anchor.target='_blank';anchor.rel='noopener noreferrer';card.querySelector('.vr-ab-links').append(anchor)}
   }catch(e){if(activeController.signal.aborted)return}
  }
 }
 function itemCard(entry,i){
  const card=make('article','vr-ab-card');
  const cover=make('div','vr-ab-cover');
  const symbol=make('span','vr-ab-monogram',entry.kind==='manuscrito'?'MS':entry.kind==='sobre'?'ED':'LIB');
  cover.append(symbol);cover.setAttribute('aria-label','Cubierta no comprobada');
  const info=make('div','vr-ab-info');
  const type=make('small','vr-ab-kind',label[entry.kind]);const title=make('strong',null,entry.title+(entry.year?' · '+entry.year:''));
  const description=make('p',null,entry.note);
  const links=make('div','vr-ab-links');
  const targets=searches(entry.query||entry.title);
  const link=(text,url)=>{const a=make('a',null,text);a.href=url;a.rel='noopener noreferrer';a.target='_blank';return a};
  links.append(link('Buscar edición',targets.archive),link('Ver imágenes',targets.commons));
  if(entry.local){const local=make('a',null,'Visor del sitio');local.href=entry.local;links.append(local)}
  info.append(type,title,description,links);card.append(cover,info);
  return card;
 }
 function show(q){
  const term=normalize(q);
  const person=RECORDS.find(p=>p.keys.some(k=>term.includes(normalize(k))));
  const key=person?.name||'';
  if(key===active)return;
  active=key;if(coverController)coverController.abort();cards.replaceChildren();root.hidden=!person;
  if(!person)return;
  heading.textContent='Libros, tratados y códices · '+person.name;
  person.items.forEach((e,i)=>cards.append(itemCard(e,i)));
  if(root.parentElement!==body){observerLock=true;body.append(root);observerLock=false}
  const token=++request;void enrich(person,token);
 }
 function current(){return new URLSearchParams(location.search).get('q')||document.getElementById('query')?.value||''}
 let queued=false;
 function mount(){
  if(observerLock||queued)return;
  queued=true;queueMicrotask(()=>{queued=false;if(root.parentElement!==body){observerLock=true;body.append(root);observerLock=false}});
 }
 new MutationObserver(mount).observe(body,{childList:true});
 window.addEventListener('vitruvia:search',e=>show(e.detail?.query||current()));
 window.addEventListener('vitruvia:clear',()=>show(''));
 window.addEventListener('popstate',()=>show(current()));
 document.getElementById('search-form')?.addEventListener('submit',()=>setTimeout(()=>show(document.getElementById('query')?.value||current()),120));
 show(current());
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
