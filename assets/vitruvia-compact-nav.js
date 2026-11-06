/* Vitruvia · compact Google-like search categories, without simulating services.
   Real Vitruvia modes reuse the existing search buttons; unsupported verticals
   are clearly identified as external searches and never produce fake results.
 */
(()=>{
 'use strict';
 const utility=document.querySelector('.search-utility');
 const privacy=document.getElementById('search-privacy');
 const input=document.getElementById('query');
 if(!utility||!privacy||!input||document.getElementById('vitruvia-compact-nav'))return;
 const nav=document.createElement('nav');
 nav.id='vitruvia-compact-nav';nav.className='vitruvia-compact-nav';
 nav.setAttribute('aria-label','Categorías de búsqueda');
 const categories=[
  {kind:'mode',id:'ai'},
  {kind:'mode',id:'all'},
  {kind:'lexicon',id:'lexicon'},
  {kind:'images',id:'images'},
  {kind:'external',id:'videos'},
  {kind:'external',id:'news'},
  {kind:'external',id:'shopping'},
  {kind:'external',id:'maps'},
  {kind:'reader',id:'reading'}
 ];
 const dict={
  es:{aria:'Categorías de búsqueda',lexicon:'Lexicon',lexiconTitle:'Vitruvia Lexicon: léxico, etimología, sintaxis y frases del griego y el latín antiguos',ai:'Modo IA',all:'Todo',images:'Imágenes',videos:'Vídeos',news:'Noticias',shopping:'Shopping',maps:'Maps',reading:'Aa · Lectura',more:'Más',
   other:'Más búsquedas',site:'Biblioteca',wiki:'Wikipedia',external:'Internet y academia',concept:'Conceptos',externalTitle:'Búsqueda externa en',imagesTitle:'Buscar imágenes en Vitruvia',aiTitle:'Búsqueda semántica de documentos indexados',allTitle:'Buscar en todas las fuentes',readingTitle:'Mostrar y mover los controles de lectura'},
  en:{aria:'Search categories',lexicon:'Lexicon',lexiconTitle:'Vitruvia Lexicon: Greek and Latin vocabulary, etymology, syntax and phrases',ai:'AI mode',all:'All',images:'Images',videos:'Videos',news:'News',shopping:'Shopping',maps:'Maps',reading:'Aa · Reading',more:'More',
   other:'More search types',site:'Library',wiki:'Wikipedia',external:'Web & research',concept:'Concepts',externalTitle:'External search on',imagesTitle:'Search images in Vitruvia',aiTitle:'Semantic search of indexed documents',allTitle:'Search all available sources',readingTitle:'Show and move reading controls'},
  fr:{aria:'Catégories de recherche',lexicon:'Lexicon',lexiconTitle:'Vitruvia Lexicon : lexique, étymologie, syntaxe et phrases du grec et du latin',ai:'Mode IA',all:'Tout',images:'Images',videos:'Vidéos',news:'Actualités',shopping:'Shopping',maps:'Plans',reading:'Aa · Lecture',more:'Plus',
   other:'Autres catégories',site:'Bibliothèque',wiki:'Wikipédia',external:'Web et recherche',concept:'Concepts',externalTitle:'Recherche externe sur',imagesTitle:'Rechercher des images dans Vitruvia',aiTitle:'Recherche sémantique du corpus',allTitle:'Rechercher dans toutes les sources',readingTitle:'Afficher et déplacer les commandes de lecture'}
 };
 const lang=()=>dict[document.documentElement.lang?.slice(0,2)]||dict.es;
 const controls=new Map();
 const updateExternal=(id,q)=>{
  const term=(q||'').trim();
  const search=encodeURIComponent(term);
  if(!term)return 'https://www.google.com/';
  if(id==='videos')return 'https://www.google.com/search?'+new URLSearchParams({q:term,udm:'vids'});
  if(id==='news')return 'https://news.google.com/search?'+new URLSearchParams({q:term});
  if(id==='shopping')return 'https://www.google.com/search?'+new URLSearchParams({q:term,udm:'28'});
  if(id==='maps')return 'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:term});
  return 'https://www.google.com/search?q='+search;
 };
 const action=(id)=>{
  const button=document.querySelector('button.tab[data-mode="'+id+'"]');
  if(button){button.click();sync();return}
  input.focus();
 };
 for(const category of categories){
  const el=document.createElement(category.kind==='external'?'a':'button');
  if(el.tagName==='BUTTON')el.type='button';
  el.className='vitruvia-compact-item';
  el.dataset.category=category.id;
  if(category.kind==='external'){
   el.target='_blank';el.rel='noopener noreferrer';
   el.href=updateExternal(category.id,input.value);
   el.dataset.external='true';
   el.addEventListener('click',event=>{
    if(!input.value.trim()){event.preventDefault();input.focus();return}
    el.href=updateExternal(category.id,input.value);
   });
  }else if(category.kind==='mode'){
   el.addEventListener('click',()=>action(category.id));
  }else if(category.kind==='lexicon'){
   el.addEventListener('click',()=>{const q=input.value.trim();location.href='vitruvia-lexicon.html'+(q?'?q='+encodeURIComponent(q):'')});
  }else if(category.kind==='reader'){
   el.addEventListener('click',()=>window.dispatchEvent(new Event('vitruvia:reader-open')));
  }else{
   el.addEventListener('click',()=>{
    const imageTrigger=document.getElementById('search-images-button');
    if(!imageTrigger){input.focus();return}
    imageTrigger.click();
    for(const sibling of controls.values())sibling.removeAttribute('aria-current');
    el.setAttribute('aria-current','page');
   });
  }
  controls.set(category.id,el);nav.append(el);
 }
 const extra=document.createElement('select');
 extra.id='vitruvia-compact-more';extra.className='vitruvia-compact-more';
 const modes=['','site','wiki','external','concept'];
 for(const id of modes){
  const option=document.createElement('option');option.value=id;
  extra.append(option);
 }
 extra.addEventListener('change',()=>{
  const value=extra.value;extra.value='';
  if(value)action(value);
 });
 nav.append(extra);
 privacy.after(nav);
 const sync=()=>{
  const active=document.querySelector('button.tab[aria-pressed="true"]')?.dataset.mode||'all';
  for(const [id,el] of controls){
   if(id===active)el.setAttribute('aria-current','page');
   else if(id!=='images')el.removeAttribute('aria-current');
  }
  if(active!=='all')controls.get('images')?.removeAttribute('aria-current');
 };
 function translate(){
  const t=lang();
  nav.setAttribute('aria-label',t.aria);
  for(const c of categories){
   const el=controls.get(c.id);
   el.textContent=t[c.id]+(c.kind==='external'?' ↗':'');
   if(c.kind==='external'){
    const brand=c.id==='news'?'Google News':c.id==='maps'?'Google Maps':'Google';
    el.title=t.externalTitle+' '+brand;
    el.setAttribute('aria-label',t[c.id]+' · '+t.externalTitle+' '+brand);
   }else el.title=c.kind==='lexicon'?t.lexiconTitle:c.kind==='reader'?t.readingTitle:c.kind==='images'?t.imagesTitle:c.id==='ai'?t.aiTitle:t.allTitle;
  }
  extra.setAttribute('aria-label',t.other);
  extra.title=t.other;
  for(let i=0;i<modes.length;i++)extra.options[i].textContent=modes[i]?t[modes[i]]:t.more+' ▾';
 }
 const updateLinks=()=>{
  for(const c of categories.filter(x=>x.kind==='external'))
   controls.get(c.id).href=updateExternal(c.id,input.value);
 };
 input.addEventListener('input',updateLinks);
 window.addEventListener('vitruvia:search',()=>{updateLinks();sync()});
 window.addEventListener('vitruvia:clear',()=>{updateLinks();sync()});
 const tabs=document.querySelector('.tabs');
 if(tabs)new MutationObserver(sync).observe(tabs,{attributes:true,subtree:true,attributeFilter:['aria-pressed']});
 new MutationObserver(records=>{
  if(records.some(x=>x.attributeName==='lang'))translate();
 }).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 translate();updateLinks();sync();
 window.VitruviaCompactNav={version:'1.0',updateExternal};
})();
