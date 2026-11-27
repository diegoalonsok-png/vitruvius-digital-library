/* Vitruvia · bibliographic reading shelf.
 * Sourced editorial examples + conservative title-based Open Library discovery.
 * A catalogue link is NOT a promise of full-text access or historical influence.
 * No user searches or external book data are stored persistently.
 */
(()=>{
 "use strict";
 const root=document.getElementById("vitruvia-reading-shelf");
 if(!root)return;
 const normalize=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/g," ").trim();
 const language=()=>["es","en","fr"].includes(document.documentElement.lang)?document.documentElement.lang:"es";
 const t=(es,en,fr)=>({es,en,fr})[language()]||es;
 const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n};
 const official="Pink Floyd · bibliografía oficial";
 const pinkFloyd=[
  {kind:"about",title:"Inside Out: A Personal History of Pink Floyd",author:"Nick Mason",year:2004,coverISBN:"0297843877",
   note:{es:"Memorias del baterista: los orígenes del grupo, la trayectoria de Syd Barrett, la evolución musical y las tensiones posteriores.",
    en:"The drummer's memoir traces the band's beginnings, Syd Barrett, its musical evolution and later tensions.",
    fr:"Mémoires du batteur sur les débuts du groupe, Syd Barrett, l'évolution musicale et les tensions ultérieures."},
   source:official,url:"https://archive.pinkfloyd.com/history/books_inside_out"},
  {kind:"about",title:"Pigs Might Fly: The Inside Story of Pink Floyd",author:"Mark Blake",year:2007,
   note:{es:"Historia de la banda elaborada mediante entrevistas con músicos, colaboradores y personas de su entorno.",
    en:"A history of the band based on interviews with musicians, collaborators and people close to the group.",
    fr:"Histoire du groupe fondée sur des entretiens avec les musiciens, collaborateurs et proches."},
   source:official,url:"https://archive.pinkfloyd.com/history/books_pigs_might_fly"},
  {kind:"about",title:"Echoes: The Complete History of Pink Floyd",author:"Glenn Povey",
   note:{es:"Crónica histórica con conciertos, repertorios, apariciones y material gráfico de la trayectoria del grupo.",
    en:"A chronology of the group's concerts, set lists, appearances and visual documentation.",
    fr:"Chronique des concerts, répertoires, apparitions et archives visuelles du groupe."},
   source:official,url:"https://archive.pinkfloyd.com/history/books_complete_history"},
  {kind:"about",title:"Mind Over Matter 4: The Images of Pink Floyd",author:"Storm Thorgerson",year:2007,
   note:{es:"Historia visual de las cubiertas y la identidad gráfica vinculadas con los discos de Pink Floyd.",
    en:"The visual story of Pink Floyd album sleeves and graphic identity.",
    fr:"L'histoire visuelle des pochettes et de l'identité graphique des disques de Pink Floyd."},
   source:official,url:"https://archive.pinkfloyd.com/history/books_mind_over_matter"},
  {kind:"era",title:"The Electric Kool-Aid Acid Test",author:"Tom Wolfe",year:1968,coverISBN:"9780312427597",
   note:{es:"Crónica de la contracultura estadounidense de los sesenta. Contexto histórico, no una influencia acreditada sobre Pink Floyd.",
    en:"An account of 1960s American counterculture. Historical context, not a documented influence on Pink Floyd.",
    fr:"Récit de la contre-culture américaine des années 1960 ; contexte historique, non influence démontrée sur Pink Floyd."},
   source:"WorldCat · edición de 1968",url:"https://search.worldcat.org/title/168063"},
  {kind:"era",title:"The Making of a Counter Culture",author:"Theodore Roszak",year:1969,coverISBN:"9780520201224",
   note:{es:"Estudio de las ideas y movimientos juveniles de finales de los sesenta. Lectura contextual, sin atribuir influencia directa.",
    en:"A study of ideas and youth movements in the late 1960s. Contextual reading without claiming direct influence.",
    fr:"Étude des idées et mouvements de jeunesse de la fin des années 1960, sans présumer d'influence directe."},
   source:"WorldCat · edición de 1969",url:"https://search.worldcat.org/title/1036384802"}
 ];
 const titleTerms=q=>normalize(q).split(" ").filter(w=>w.length>2&&!["the","los","las","del","des","de","les","and","por","para","una","one","que"].includes(w));
 const isPinkFloyd=q=>normalize(q).replace(/^the /,"")==="pink floyd";
 let request=0,controller=null,current="",lastItems=[],lastCurated=false,currentIdentity=null;
 const cache=new Map();
 function validWork(item){return item&&/^\/works\/OL\d+W$/.test(String(item.key||""))&&typeof item.title==="string"&&item.title.trim().length>2}
 // Title match alone does not establish a scholarly publication. Reject
 // documented children's/fiction/activity categories and require positive
 // publisher or academic publication metadata. A missing field is unknown.
 const listOf=v=>Array.isArray(v)?v.filter(x=>typeof x==="string"):typeof v==="string"?[v]:[];
 const academicPress=/\b(?:university press|university of .{2,55} press|presses universitaires|universitatsverlag|universitats press|academic press|brill|de gruyter|brepols|peeters publishers|peeters|routledge|verlag philipp von zabern|institut francais d archeologie orientale|griffith institute|oriental institute|egypt exploration society|british museum press|metropolitan museum of art|institute for the study of ancient cultures)\b/;
 const scholarlySubject=/^(?:academic dissertations|doctoral dissertations|theses|dissertations academic|conference proceedings|congres scientifiques|academic monographs|scholarly editions|critical editions|editions critiques|ediciones criticas)$/;
 const youth=/\b(?:juvenile|children|childrens|kids|young adult|picture books|comic books|activity books|coloring books|infantil|juvenil|jeune public|livres pour enfants|bande dessinee|juegos|enigmas|desafios|puzzles|quizzes|coloring|colouring)\b/;
 const fiction=/\b(?:fiction|novela|romance fiction|roman)\b/;
 const criticism=/\b(?:criticism|critica|critique|criticas|critiques)\b/;
 const boundaryMatch=(s,q)=>(" "+normalize(s)+" ").includes(" "+normalize(q)+" ");
 function academicEvidence(x,byAuthor=false){
  const subjects=listOf(x.subject).map(normalize),title=normalize(x.title);
  const audience=normalize([...listOf(x.audience),...listOf(x.genre)].join(" "));
  if(youth.test(title)||youth.test(audience)||subjects.some(s=>youth.test(s)))return null;
  if(/^(?:me llamo|em dic|my name is|je m appelle)\b/.test(title))return null;
  if(!listOf(x.author_name).some(a=>a.trim()))return null;
  const publisher=listOf(x.publisher).find(p=>academicPress.test(normalize(p)))||"";
  const subject=listOf(x.subject).find(s=>scholarlySubject.test(normalize(s)))||"";
  if(!publisher&&!subject)return null;
  // Fictional works authored by the exact resolved subject may be legitimate
  // primary literary sources in a scholarly edition. Unrelated fiction is not.
  if(!byAuthor&&[title,audience,...subjects].some(s=>fiction.test(s)&&!criticism.test(s)))return null;
  return {publisher,subject};
 }
 function selectedBooks(q,docs,identity=null){
  const verified=identity?.entityKind==="person"&&/^Q\d+$/.test(identity.wikidataId||"")&&!!(identity.preferredWiki||identity.preferredAuthority);
  const names=[...(verified?[identity.entityCanonical,identity.title]:[]),q].filter(x=>typeof x==="string"&&normalize(x).length>=4);
  if(!names.length)return [];
  const found=[],seen=new Set();
  for(const x of docs){
   if(!validWork(x))continue;
   const byAuthor=verified&&listOf(x.author_name).some(a=>names.some(n=>normalize(a)===normalize(n)));
   const evidence=academicEvidence(x,byAuthor);if(!evidence)continue;
   const titleMatch=names.some(n=>boundaryMatch(x.title,n));
   // Subject headings support relevance independently of the title, but a
   // single matching word in an unrelated multi-word query is never enough.
   const subjectMatch=names.some(n=>listOf(x.subject).some(s=>boundaryMatch(s,n)));
   if(!byAuthor&&!titleMatch&&!subjectMatch)continue;
   if(seen.has(x.key))continue;seen.add(x.key);
   const kind=byAuthor?"primary":"about";
   found.push({kind,title:x.title,author:listOf(x.author_name).slice(0,2).join(", "),
    year:Number.isInteger(x.first_publish_year)&&x.first_publish_year>0?x.first_publish_year:undefined,
    key:x.key,url:"https://openlibrary.org"+x.key,coverId:Number(x.cover_i)||null,
    publisher:evidence.publisher,evidenceSubject:evidence.subject,
    relation:byAuthor?"author":titleMatch?"title":"subject",
    note:{es:"Registro de catálogo seleccionado por evidencia editorial y relación con la consulta. No certifica una edición crítica ni revisión por pares.",
     en:"Catalogue record selected by publication evidence and relevance to the query. Does not certify a critical edition or peer review.",
     fr:"Notice sélectionnée selon les indices éditoriaux et la pertinence ; ne certifie ni édition critique ni évaluation par les pairs."},
    source:"Open Library"});
  }
  return found.sort((a,b)=>Number(b.kind==="primary")-Number(a.kind==="primary")||a.author.localeCompare(b.author,language())||a.title.localeCompare(b.title,language())).slice(0,12);
 }
 function coverUrl(id,isbn){
  if(Number.isInteger(id)&&id>0&&id<1e10)return "https://covers.openlibrary.org/b/id/"+id+"-M.jpg?default=false";
  return /^\d{10}(?:\d{3})?$/.test(String(isbn||""))?"https://covers.openlibrary.org/b/isbn/"+isbn+"-M.jpg?default=false":"";
 }
 function addCover(card,id,title,isbn){
  const box=card.querySelector(".vrs-cover");
  if(!box)return;
  const url=coverUrl(id,isbn);if(!url)return;
  const img=el("img");img.src=url;img.alt=t("Cubierta catalogada: ","Catalogued cover: ","Couverture cataloguée : ")+title;
  img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";img.width=96;img.height=138;
  let retried=false;img.onerror=()=>{if(!retried&&isbn&&Number(id)){retried=true;img.src=coverUrl(null,isbn);return}img.remove();box.classList.remove("has-image")};
  box.replaceChildren(img);box.classList.add("has-image");
 }
 function card(item,group,detail){
  const wrapper=el("article","vrs-card");
  wrapper.dataset.bookTitle=normalize(item.title);
  const button=el("button","vrs-card-open");button.type="button";button.setAttribute("aria-expanded","false");
  button.title=t("Leer explicación","Read description","Lire la présentation");
  const cover=el("span","vrs-cover");cover.setAttribute("aria-hidden","true");cover.textContent="▤";
  const body=el("span","vrs-card-body");
  body.append(el("strong","vrs-book-title",item.title));
  body.append(el("span","vrs-author",item.author+(item.year?" · "+item.year:"")));
  body.append(el("span","vrs-source",item.publisher||item.source));
  button.append(cover,body);
  button.addEventListener("click",()=>{
   for(const other of group.querySelectorAll(".vrs-card-open[aria-expanded=true]"))other.setAttribute("aria-expanded","false");
   button.setAttribute("aria-expanded","true");
   const description=item.note?.[language()]||item.note?.es||"";
   const h=el("h4",null,item.title),p=el("p",null,description);
   const link=el("a",null,t("Consultar ficha o catálogo","Open record or catalogue","Consulter la notice ou le catalogue"));
   link.href=item.url;link.target="_blank";link.rel="noopener noreferrer";
   detail.replaceChildren(h,p);
   if(item.relation){
    const relation=item.relation==="author"?t("Autoría coincidente","Matching authorship","Auteur identifié"):item.relation==="title"?t("Coincidencia temática en título","Topic match in title","Sujet dans le titre"):t("Materia de catálogo coincidente","Matching catalogue subject","Sujet de catalogue correspondant");
    detail.append(el("p",null,relation+" · "+[item.publisher,item.evidenceSubject].filter(Boolean).join(" · ")));
   }
   detail.append(link);detail.hidden=false;
  });
  wrapper.append(button);
  if(item.coverId||item.coverISBN)addCover(wrapper,item.coverId,item.title,item.coverISBN);
  return wrapper;
 }
 function group(items,title){
  const block=el("section","vrs-group"),head=el("div","vrs-group-head");
  const h=el("h3",null,title),actions=el("div","vrs-nav");
  const left=el("button",null,"←"),right=el("button",null,"→");
  for(const [btn,move] of [[left,-1],[right,1]]){
   btn.type="button";
   btn.setAttribute("aria-label",move<0?t("Desplazarse hacia atrás","Scroll backwards","Défiler vers l'arrière"):t("Desplazarse hacia adelante","Scroll forwards","Défiler vers l'avant"));
  }
  const rail=el("div","vrs-rail");rail.tabIndex=0;
  rail.setAttribute("aria-label",title+" · "+t("desplazamiento horizontal","horizontal scrolling","défilement horizontal"));
  left.onclick=()=>rail.scrollBy({left:-320,behavior:"smooth"});
  right.onclick=()=>rail.scrollBy({left:320,behavior:"smooth"});
  rail.addEventListener("keydown",e=>{if(e.target!==rail)return;if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();rail.scrollBy({left:e.key==="ArrowRight"?220:-220,behavior:"smooth"})}});
  actions.append(left,right);head.append(h,actions);
  const detail=el("div","vrs-detail");detail.hidden=true;
  for(const item of items)rail.append(card(item,block,detail));
  block.append(head,rail,detail);return block;
 }
 function draw(q,items,curated){
  if(!items.length){root.hidden=true;root.replaceChildren();return}
  root.replaceChildren();
  const top=el("div","vrs-header");
  top.append(el("h2",null,t("Lecturas relacionadas con la búsqueda","Reading related to this search","Lectures liées à la recherche")));
  top.append(el("p",null,t(
   "Libros sobre el tema y, cuando existe selección editorial, sobre su contexto histórico. Portadas y acceso a registros bibliográficos; la lectura íntegra depende de cada institución.",
   "Books about the topic and, when editorially established, its historical context. Covers link to catalogue records; full-text availability depends on each institution.",
   "Livres sur le sujet et, lorsqu'une sélection éditoriale existe, sur son contexte. Couvertures et notices ; accès intégral selon les institutions.")));
  root.append(top);
  const primary=items.filter(x=>x.kind==="primary"),about=items.filter(x=>x.kind==="about"),era=items.filter(x=>x.kind==="era");
  if(primary.length)root.append(group(primary,t("Obras del autor · registros de edición","Works by the author · edition records","Œuvres de l’auteur · notices d’édition")));
  if(about.length)root.append(group(about,curated?t("Libros sobre el tema","Books on the topic","Livres sur le sujet"):t("Bibliografía especializada · por autor","Specialist bibliography · by author","Bibliographie spécialisée · par auteur")));
  if(era.length)root.append(group(era,t("Libros para comprender la época","Books to understand the period","Livres pour comprendre l'époque")));
  const footer=el("p","vrs-footer");
  footer.textContent=curated?
   t("Selección documentada de bibliografía y contexto; compartir una época no demuestra influencia histórica.",
    "Documented bibliography and context; sharing a period is not proof of historical influence.",
    "Bibliographie et contexte documentés ; une époque commune ne prouve aucune influence historique."):
   t("Selección conservadora por pertinencia e indicios editoriales académicos; verificar cada edición. No incluye divulgación infantil ni entretenimiento identificables.",
    "Conservative selection by relevance and scholarly publishing indicators; verify each edition. Identifiable children’s and entertainment titles are excluded.",
    "Sélection prudente par pertinence et indices éditoriaux savants ; vérifier chaque édition. Titres jeunesse et divertissement identifiables exclus.");
  const browse=el("a",null,t("Ampliar en Open Library","More at Open Library","Chercher sur Open Library"));
  browse.href="https://openlibrary.org/search?"+new URLSearchParams({q});
  browse.target="_blank";browse.rel="noopener noreferrer";
  footer.append(document.createTextNode(" · "),browse);
  root.append(footer);root.hidden=false;
 }
 function addCovers(items,docs){
  for(const item of items){
   const best=docs.find(d=>{
    if(!validWork(d)||!d.cover_i)return false;
    const a=normalize(d.title),b=normalize(item.title);
    const auth=normalize(Array.isArray(d.author_name)?d.author_name.join(" "):"");
    return (a===b||b.includes(a)&&a.length>12||a.includes(b)&&b.length>12)&&
      (!item.author||auth.includes(normalize(item.author).split(" ")[0]));
   });
   if(!best)continue;
   item.coverId=Number(best.cover_i);
   for(const c of root.querySelectorAll(".vrs-card"))if(c.dataset.bookTitle===normalize(item.title))addCover(c,item.coverId,item.title,item.coverISBN);
  }
 }
 async function books(q,signal){
  if(cache.has(q))return cache.get(q);
  const url="https://openlibrary.org/search.json?"+new URLSearchParams({
   q,limit:"50",fields:"key,title,author_name,first_publish_year,cover_i,edition_count,publisher,subject"});
  const response=await fetch(url,{headers:{Accept:"application/json"},signal});
  if(!response.ok)throw Error("Open Library HTTP "+response.status);
  const json=await response.json();
  const docs=Array.isArray(json.docs)?json.docs.slice(0,50):[];
  cache.set(q,docs);if(cache.size>12)cache.delete(cache.keys().next().value);
  return docs;
 }
 function begin(q,identity=null){
  q=String(q||"").trim().slice(0,160);
  const token=++request;
  controller?.abort();controller=null;
  current=q;currentIdentity=identity;lastItems=[];lastCurated=false;
  if(!q){root.hidden=true;root.replaceChildren();return}
  const curated=isPinkFloyd(q);
  const items=curated?pinkFloyd.map(item=>({...item})):[];
  lastCurated=curated;lastItems=items;
  if(items.length)draw(q,items,true);else{root.hidden=true;root.replaceChildren()}
  const activeController=new AbortController();controller=activeController;const signal=activeController.signal;
  // Independent, bounded request: never block Vitruvia's primary search.
  setTimeout(async()=>{
   if(token!==request||signal.aborted)return;
   const timeout=setTimeout(()=>activeController.abort(),6500);
   try{
    const lookup=identity?.entityCanonical||q;
    const docs=await books(curated?"Pink Floyd":lookup,signal);
    if(token!==request||signal.aborted)return;
    if(curated)addCovers(items,docs);
    else{
     const relevant=selectedBooks(q,docs,identity);
     lastItems=relevant;
     draw(q,relevant,false);
    }
   }catch{
    // Curated records remain accessible even without a remote catalogue.
    if(token===request&&!curated)root.hidden=true;
   }finally{clearTimeout(timeout)}
  },160);
 }
 window.addEventListener("vitruvia:search",e=>begin(e.detail?.query||""));
 window.addEventListener("vitruvia:results",e=>{
  const snapshot=e.detail;if(!snapshot?.query||normalize(snapshot.query)!==normalize(current)||lastCurated)return;
  const identity=(snapshot.rows||[]).find(r=>r.entityKind==="person"&&/^Q\d+$/.test(r.wikidataId||"")&&(r.preferredWiki||r.preferredAuthority)&&r.entityCanonical);
  if(identity&&currentIdentity?.wikidataId!==identity.wikidataId)begin(current,identity);
 });
 window.addEventListener("vitruvia:clear",()=>begin(""));
 new MutationObserver(changes=>{
  if(changes.some(x=>x.attributeName==="lang")&&current&&lastItems.length)draw(current,lastItems,lastCurated);
 }).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
 if(window.VitruviaSearchSnapshot?.query){const snapshot=window.VitruviaSearchSnapshot;const identity=(snapshot.rows||[]).find(r=>r.entityKind==="person"&&/^Q\d+$/.test(r.wikidataId||"")&&(r.preferredWiki||r.preferredAuthority)&&r.entityCanonical);begin(snapshot.query,identity||null)}
})();
