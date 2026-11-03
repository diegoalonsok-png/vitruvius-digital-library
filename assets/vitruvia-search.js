/* VITRUVIA: búsqueda documental + enciclopedias públicas, sin claves privadas.
   Los resultados nunca se inventan. El modo conceptual es expansión terminológica,
   NO un modelo generativo de lenguaje. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const S={mode:"all",lang:"es",theme:"dark",works:[],pages:[],passages:null,passagePromise:null,searchId:0,ready:false};
const lex={
 arquitectura:"architectura architecture arquitectura architecturae edificios aedificia edificaciones construcción building architettura",
 historia:"historia history historique histoire historien history historical roman romain antiguo ancient antigüedad antiquity",
 arte:"art arte ars artist artista painting pintura sculpture escultura scultura",
 agua:"aqua aquae aquarum agua water eau hidráulica hydraulica aqueduct acueducto fontem fuentes",
 acueducto:"aquaeductus aquaeductus aqua agua water aqueducts aqueduc acueductos conducción",
 simetria:"symmetria symmetry simetría simetria proporción proportio proportion symétrie modulus",
 templo:"templum temple templo temples sanctuary santuario aedes sagrado",
 columna:"columna columnae columns column colonne capital capitel capiteles",
 ciudad:"urbs civitas urbanismo urban plan città ciudad city cities ville polis",
 teatro:"theatrum theatre theater teatro acoustic acustica acústica",
 maquina:"machina machinae máquina maquinas machines mechanica mecanismo",
 muro:"murus paries paredes muro wall masonry opus caementicium",
 manuscrito:"codex codices códice codice manuscript manuscrito palaeography paleografía medieval carolingio folio folios harley",
 griego:"greek griego griega greco hellenic hellenikos greek ancient",
 latin:"latin latín latine latino latina lingua linguae",
 filosofía:"philosophia philosophy filosofía philosophie epicuro stoic ética ethics",
 vitruvio:"vitruvius vitruvio vitruve de architectura libri decem firmitas utilitas venustas",
 lucrecio:"lucretius lucrecio natura rerum naturae filosofía atomismo epicuro",
 ciceron:"cicero cicerón cicéron de officiis retórica roman",
 renacimiento:"renaissance rinascimento renacimiento cesariano barbaro giocondo arquitectura arquitectura",
 roma:"rome roma rome roman romano romana romanos ancient antiquity antica"
};
const stop=new Set("de del la las los el un una unos unas que con por para como cual quién quien sobre donde es en a y o e the of or and to in le des les sur de et on du ou aus und der die das".split(" "));
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^\p{L}\p{N}.]+/gu," ").replace(/\s+/g," ").trim();
const words=s=>norm(s).split(" ").filter(x=>x.length>=3&&!stop.has(x));
const brief=(s,n=255)=>{const v=String(s||"").replace(/\s+/g," ").trim();return v.length>n?v.slice(0,n).replace(/\s+\S*$/,"")+"…":v};
const node=(tag,cls,content)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=content;return x;};
const localUrl=/^(?:[a-z0-9/_-]+\.html(?:\?[^#]*)?(?:#[a-z0-9=&_-]+)?|documents\/[a-z0-9/_-]+\.pdf(?:#page=\d+)?)$/i;
function anchor(text,url){const a=node("a",null,text);if(!url)return null;const external=/^https:\/\//i.test(url);
 if(!external&&!localUrl.test(url))return null;a.href=url;if(external){a.target="_blank";a.rel="noopener noreferrer"}return a}
const I18N={
 es:{lead:"Buscador universal especializado en arte, historia, arquitectura y patrimonio cultural. Libros, códices, Wikipedia y fuentes académicas.",placeholder:"Preguntá sobre cualquier tema, obra, autor o concepto…",submit:"Buscar",modes:["◎ Todo","Biblioteca","Wikipedia","Internet y academia","⌁ Conceptos"],explain:["Buscá en la biblioteca, Wikipedia y fuentes de Internet verificables, sin salir de Vitruvia cuando existe una API pública.","Consultá libros, manuscritos, pasajes en latín y traducciones de la Biblioteca Vitruviana.","Resultados de Wikipedia en el idioma elegido y en inglés como referencia complementaria.","Buscá en catálogos, museos, Wikidata y registros académicos. Para la web general ofrecemos enlaces de búsqueda directa.","Relacioná términos, sinónimos y lenguas en los documentos internos; no se afirma utilizar IA generativa."],heading:"Resultados documentados",idle:"Consultá la biblioteca y las enciclopedias",waiting:"Consultando fuentes verificables…",none:"No se obtuvieron resultados comprobados; podés usar las búsquedas institucionales directas.",book:"LIBRO DEL CATÁLOGO",passage:"TEXTO · LOCUS",section:"DOCUMENTO DEL SITIO",wikipedia:"ENCICLOPEDIA · WIKIPEDIA",wikidata:"DATOS · WIKIDATA",openlibrary:"CATÁLOGO · OPEN LIBRARY",museum:"ARTE · THE MET",article:"ARTÍCULO CIENTÍFICO",read:"Leer en la biblioteca",document:"Abrir documento",source:"Consultar fuente",pdf:"Leer PDF",unpublished:"Ficha en preparación · lector no disponible",synthesis:"Síntesis de resultados documentados",detail:"Selección de fragmentos recuperados; verificá las afirmaciones en cada fuente. No es una respuesta generativa de IA.",external:"Búsquedas adicionales en fuentes reconocidas",searching:"La búsqueda continúa en fuentes externas…"},
 en:{lead:"Universal search with a focus on art, history, architecture and cultural heritage. Books, manuscripts, Wikipedia and scholarly sources.",placeholder:"Search any topic, author, book or concept…",submit:"Search",modes:["◎ All","Library","Wikipedia","Web & research","⌁ Concepts"],explain:["Search this library, Wikipedia and verifiable web sources in one place when public APIs allow it.","Search books, manuscripts, Latin passages and translations in this library.","Search Wikipedia in your selected language, plus English results when useful.","Explore open catalogs, museum records, Wikidata and scholarly sources; use direct links for the wider web.","Explore related terms and languages in local documents; this is not generative AI."],heading:"Documented results",idle:"Explore library and encyclopedias",waiting:"Searching verifiable sources…",none:"No confirmed results; use the direct institutional searches.",book:"CATALOG BOOK",passage:"TEXT · LOCUS",section:"SITE DOCUMENT",wikipedia:"ENCYCLOPEDIA · WIKIPEDIA",wikidata:"DATA · WIKIDATA",openlibrary:"CATALOG · OPEN LIBRARY",museum:"ART · THE MET",article:"RESEARCH ARTICLE",read:"Read in library",document:"Open document",source:"View original",pdf:"Read PDF",unpublished:"Catalog entry pending · no reader",synthesis:"Source-based synthesis",detail:"Selected excerpts from retrieved documents; verify claims at the source. Not generative AI.",external:"Additional reputable sources",searching:"External sources are still loading…"},
 fr:{lead:"Recherche universelle privilégiant l’art, l’histoire, l’architecture et le patrimoine. Livres, codex, Wikipédia et sources scientifiques.",placeholder:"Chercher n’importe quel sujet, auteur ou ouvrage…",submit:"Rechercher",modes:["◎ Tout","Bibliothèque","Wikipédia","Web et recherche","⌁ Concepts"],explain:["Rechercher dans cette bibliothèque, Wikipédia et les sources web vérifiables disposant d’API ouvertes.","Explorer les livres, manuscrits, passages latins et traductions de la bibliothèque.","Consulter Wikipédia dans la langue choisie et, en complément, en anglais.","Explorer les catalogues ouverts, musées, Wikidata et références scientifiques ; liens directs pour le web général.","Relier les termes et synonymes des documents internes ; ce service n’est pas une IA générative."],heading:"Résultats documentés",idle:"Explorer les fonds",waiting:"Interrogation des sources vérifiables…",none:"Aucun résultat confirmé ; utiliser les recherches institutionnelles directes.",book:"LIVRE DU CATALOGUE",passage:"TEXTE · LOCUS",section:"DOCUMENT DU SITE",wikipedia:"ENCYCLOPÉDIE · WIKIPÉDIA",wikidata:"DONNÉES · WIKIDATA",openlibrary:"CATALOGUE · OPEN LIBRARY",museum:"ART · THE MET",article:"ARTICLE SCIENTIFIQUE",read:"Lire dans la bibliothèque",document:"Ouvrir document",source:"Voir la source",pdf:"Lire PDF",unpublished:"Notice en attente · pas de lecteur",synthesis:"Synthèse sourcée",detail:"Extraits récupérés ; vérifier les sources. Ce n'est pas une IA générative.",external:"Autres références de qualité",searching:"Interrogation des sources externes en cours…"}
};
const T=()=>I18N[S.lang]||I18N.es;
function related(q){const set=new Set(words(q));const n=norm(q);for(const [key,terms] of Object.entries(lex))if(n.includes(key)||words(terms).some(w=>n.includes(w)))for(const w of words(terms))set.add(w);return [...set].slice(0,48)}
function score(s,q,expand=false){const txt=norm(s),n=norm(q);if(!n||!txt)return 0;let r=txt.includes(n)?18:0;for(const word of words(q))if(txt.includes(word))r+=word.length>=5?6:3;
 if(expand){for(const w of related(q))if(txt.includes(w)&&!words(q).includes(w))r+=1.75}return r}
const verified=w=>w.publicStatus==="lectura-local-completa";
const bookLinks={
 vitruvius:"bibliotheca-graeca-latina.html?work=vitruvius",
 "cicero-officiis":"bibliotheca-graeca-latina.html?work=cicero-officiis",
 lucretius:"bibliotheca-graeca-latina.html?work=lucretius",
 "vitruvio-v514-pdf":"documents/edicion-v514.html",
 "vitruvio-v554-pdf":"documents/edicion-v554.html",
 "theory-v297-pdf":"documents/edicion-v297.html",
 "krohn-1912-pdf":"documents/krohn-1912.pdf"
};
const pdfs={"vitruvio-v514-pdf":"documents/kurilo-recensio-es.pdf","vitruvio-v554-pdf":"documents/kurilo-recensio-fr.pdf","theory-v297-pdf":"documents/kurilo-theory-en.pdf","krohn-1912-pdf":"documents/krohn-1912.pdf"};
function liveBooks(q,concept){return S.works.map(w=>{
 const sc=score([w.title,w.author,w.genre,w.dating,w.language,w.manuscript?.status].join(" "),q,concept);
 return {type:"book",title:w.title,author:w.author,excerpt:[w.genre,w.dating,w.reading?.status].filter(Boolean).join(" · "),meta:verified(w)?"Edición consultable en la biblioteca":"Ficha bibliográfica en preparación",rating:sc+(verified(w)?3:0),link:verified(w)?bookLinks[w.id]:null,pdf:verified(w)?pdfs[w.id]:null}
 }).filter(x=>x.rating>2)}
function livePages(q,concept){return S.pages.map(p=>({type:"section",title:p.title,excerpt:p.description,meta:"Documento HTML · GitHub Pages",rating:score(p.title+" "+p.description+" "+p.path,q,concept),link:p.path})).filter(x=>x.rating>2)}
async function fetchJSON(url,ms=12500){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);try{const r=await fetch(url,{signal:controller.signal,headers:{"Accept":"application/json"}});if(!r.ok)throw Error("HTTP "+r.status+" · "+new URL(url).host);const d=await r.json();if(d.error)throw Error(d.error.info||d.error.code);return d}finally{clearTimeout(timer)}}
async function load(){try{const [books,pages]=await Promise.all(["data/bibliotheca-graeca-latina-I-bce-I-ce.json","data/witruvia-pages.json"].map(url=>fetchJSON(url)));
 S.works=books.works||[];S.pages=pages.pages||[];S.ready=true;
 $("metric-works").textContent=S.works.length;$("metric-pages").textContent=S.pages.length;
 $("metric-read").textContent=S.works.filter(verified).length;
 $("result-state").textContent="Índices internos disponibles: "+S.works.length+" fichas y "+S.pages.length+" secciones";}catch(e){$("result-state").textContent="Índices internos no disponibles: "+e.message}}
const dataPaths=["data/structured/recensio-es.json","data/structured/recensio-fr.json","data/structured/theory-en.json"];
function passages(){if(S.passages)return Promise.resolve(S.passages);if(S.passagePromise)return S.passagePromise;
 S.passagePromise=Promise.allSettled(dataPaths.map(url=>fetchJSON(url))).then(results=>{
 const ok=results.filter(x=>x.status==="fulfilled");if(!ok.length)throw Error("Ningún corpus estructurado accesible");
 S.passages=ok.flatMap(x=>(x.value.passages||[]).map(p=>({locus:p.locus,latin:p.latin||"",translation:p.translation||"",edition:x.value.edition,lang:x.value.language,book:p.book})));
 return S.passages;
 }).catch(e=>{S.passagePromise=null;throw e});return S.passagePromise}
function livePassages(ps,q,concept){
 const rows=[];for(const p of ps){const a=score(p.latin,q,concept),b=score(p.translation,q,concept),l=score(p.locus,q,concept);
 const rating=Math.max(a,b,l);if(rating<4)continue;
 const text=(b>a?p.translation:p.latin)||p.translation;
 rows.push({type:"passage",title:"Vitruvio · De architectura · "+p.locus,author:p.lang.toUpperCase()+" · "+p.edition,excerpt:brief(text,335),meta:"Locus "+p.locus+" · latín + versión "+p.lang.toUpperCase(),rating,link:"lector-bilingue.html?edition="+encodeURIComponent(p.edition)+"&locus="+encodeURIComponent(p.locus)});
 }return rows.sort((a,b)=>b.rating-a.rating).slice(0,18)
}
const htmlText=s=>new DOMParser().parseFromString(String(s||""),"text/html").body.textContent||"";
function culturalWeight(title,description){const s=norm(title+" "+description);const all=["architecture","arquitectura","architect","history","historia","histoire","arte","artist","artistic","roman","romano","ancient","antiguo","greek","griego","archaeology","arqueologia","patrimonio","heritage","cultural","medieval","renaissance","renacimiento","manuscript","manuscrito","architecture"];return all.some(x=>s.includes(x))?7:0}
async function wiki(q,language){
 const lang=["es","en","fr"].includes(language)?language:"es";
 const p=new URLSearchParams({action:"query",list:"search",srsearch:q,srlimit:"7",srprop:"snippet|wordcount",format:"json",utf8:"1",origin:"*"});
 const d=await fetchJSON("https://"+lang+".wikipedia.org/w/api.php?"+p);
 const found=(d.query?.search||[]).filter(w=>Number.isInteger(w.pageid)&&w.pageid>0);
 let pictures={};
 if(found.length){
  const picturesParams=new URLSearchParams({action:"query",prop:"pageimages",pageids:found.map(x=>x.pageid).join("|"),piprop:"thumbnail|name",pithumbsize:"720",format:"json",origin:"*"});
  const photos=await fetchJSON("https://"+lang+".wikipedia.org/w/api.php?"+picturesParams,9500).catch(()=>null);
  pictures=photos?.query?.pages||{};
 }
 return found.map((w,i)=>{
  const photo=pictures[w.pageid],name=photo?.pageimage;
  const image=photo?.thumbnail?.source;
  const picturePage=name?"https://"+lang+".wikipedia.org/wiki/File:"+encodeURIComponent(name.replace(/ /g,"_")):null;
  return {type:"wikipedia",title:w.title,author:"Wikipedia · "+lang.toUpperCase(),excerpt:brief(htmlText(w.snippet),260),meta:"Artículo enciclopédico · Wikimedia",rating:42-i*2+culturalWeight(w.title,w.snippet),link:"https://"+lang+".wikipedia.org/?curid="+w.pageid,source:"Wikipedia ("+lang.toUpperCase()+")",image,imageRights:picturePage,imageCredit:"Wikipedia / Wikimedia Commons · consultar autor y licencia",imageKind:"documentary",pageid:w.pageid,wikiLang:lang};
 })
}
async function wikidata(q){
 const p=new URLSearchParams({action:"wbsearchentities",search:q,language:S.lang,uselang:S.lang,type:"item",limit:"6",format:"json",origin:"*"});
 const d=await fetchJSON("https://www.wikidata.org/w/api.php?"+p);
 return (d.search||[]).map((x,i)=>({type:"wikidata",title:x.label||x.id,excerpt:x.description||"Identificador de entidad · Wikidata",author:x.id,meta:"Datos enlazados · Wikimedia",rating:30-i+culturalWeight(x.label,x.description),link:"https://www.wikidata.org/wiki/"+x.id,source:"Wikidata"}))
}
async function openLibrary(q){
 const p=new URLSearchParams({q,limit:"6",fields:"key,title,author_name,first_publish_year,edition_count,has_fulltext,public_scan_b,cover_i"});
 const d=await fetchJSON("https://openlibrary.org/search.json?"+p);
 return (d.docs||[]).filter(x=>/^\/works\/OL\d+W$/.test(x.key||"")).map((x,i)=>({type:"openlibrary",title:x.title||"Libro sin título",author:(x.author_name||[]).slice(0,2).join(", "),excerpt:"Primera publicación registrada: "+(x.first_publish_year||"sin datos")+" · "+(x.edition_count||0)+" ediciones catalogadas. Consultar disponibilidad de lectura en Open Library.",meta:"Catálogo externo · disponibilidad sujeta al proveedor",rating:27-i+culturalWeight(x.title,(x.author_name||[]).join(" ")),link:"https://openlibrary.org"+x.key,source:"Open Library",image:Number.isInteger(x.cover_i)?"https://covers.openlibrary.org/b/id/"+x.cover_i+"-L.jpg":null,imageRights:"https://openlibrary.org"+x.key,imageCredit:"Open Library · derechos de portada según ficha",imageKind:"book"}))
}
async function museum(q){
 const params=new URLSearchParams({q,limit:"4",offset:"0"});
 const d=await fetchJSON("https://collectionapi.metmuseum.org/public/collection/v1.1/search?"+params,12500);
 const ids=(d.objectIDs||[]).slice(0,3);
 const details=await Promise.allSettled(ids.map(id=>fetchJSON("https://collectionapi.metmuseum.org/public/collection/v1/objects/"+id,9000)));
 return details.filter(x=>x.status==="fulfilled").map((x,i)=>{const o=x.value;return {type:"museum",title:o.title||"Objeto de museo",author:[o.artistDisplayName,o.objectDate].filter(Boolean).join(" · "),excerpt:[o.culture,o.period,o.medium,o.department].filter(Boolean).join(" · "),meta:"Colección del Metropolitan Museum of Art",rating:29-i+culturalWeight(o.title,o.department),link:o.objectURL||"https://www.metmuseum.org",source:"The Met",image:o.primaryImageSmall||o.primaryImage||null,imageRights:o.objectURL||"https://www.metmuseum.org",imageCredit:"The Metropolitan Museum of Art · verificar licencia de la obra",imageKind:"artwork"}});
}

/* Distinción académica: resultados de revistas y ciencias no se presentan como texto íntegro salvo enlace de acceso. */
async function crossref(q){
 const params=new URLSearchParams({query:q,rows:"6",select:"DOI,title,author,published,issued,type,publisher,URL,container-title"});
 const d=await fetchJSON("https://api.crossref.org/works?"+params,12000);
 const items=d.message?.items||[];
 return items.filter(x=>x.DOI&&Array.isArray(x.title)&&x.title[0]).map((x,i)=>{
  const date=(x.published?.["date-parts"]||x.issued?.["date-parts"]||[])[0]||[];
  const author=(x.author||[]).slice(0,2).map(y=>[y.given,y.family].filter(Boolean).join(" ")).join(", ");
  return {type:"article",title:x.title[0],author:author||x.publisher||"",excerpt:[x["container-title"]?.[0],date[0],x.type].filter(Boolean).join(" · ")+" · Registro bibliográfico con DOI: "+x.DOI,
   meta:"Crossref · DOI verificado en el registro · acceso al texto según editor",rating:26-i+culturalWeight(x.title[0],x["container-title"]?.[0]||""),
   link:"https://doi.org/"+encodeURIComponent(x.DOI),source:"Crossref"};
 })
}
async function europePmc(q){
 const params=new URLSearchParams({query:q,format:"json",pageSize:"6",resultType:"core"});
 const d=await fetchJSON("https://www.ebi.ac.uk/europepmc/webservices/rest/search?"+params,12000);
 return (d.resultList?.result||[]).filter(x=>x.title&&(x.pmid||x.pmcid||x.doi)).map((x,i)=>{
  const journal=x.journalTitle||"",isOpen=x.isOpenAccess==="Y"||x.isOpenAccess===true;
  const link=x.pmcid?"https://europepmc.org/articles/"+encodeURIComponent(x.pmcid):
    x.pmid?"https://europepmc.org/article/MED/"+encodeURIComponent(x.pmid):
    "https://doi.org/"+encodeURIComponent(x.doi);
  return {type:"article",title:x.title,author:x.authorString||"",excerpt:[x.pubYear,journal,x.journalInfo?.journalIssueId].filter(Boolean).join(" · ")+". "+brief(x.abstractText||"",180),
   meta:"Europe PMC · "+(isOpen?"acceso abierto indicado por el proveedor":"comprobar acceso al artículo"),rating:28-i+culturalWeight(x.title,x.abstractText||""),
   link,source:"Europe PMC"}
 })
}
/* Editorial featured column: matches the sourced textual entries; no image/book cover. */
const originalFeature={
 title:"Codex Harleianus",description:"Harley MS 2767. Testimonio carolingio de De architectura, conservado en la British Library.",
 link:"harleianus.html",credit:"British Library · Harley MS 2767",label:"DESTACADO · BIBLIOTECA VITRVVIVS"
};
function highlightFeatured(term){
 document.querySelectorAll(".featured-reading-item").forEach(a=>{
  const t=norm(term||""),v=norm(a.dataset.featureTerm||"");
  a.classList.toggle("is-current",!!t&&!!v&&(t.includes(v)||v.includes(t)));
 });
}
function restoreFeature(){
 S.featureWeight=-Infinity;
 $("featured-label").textContent=originalFeature.label;
 $("featured-title").textContent=originalFeature.title;
 $("featured-description").textContent=originalFeature.description;
 $("featured-link").textContent="Consultar el manuscrito ›";
 $("featured-link").href=originalFeature.link;
 $("featured-credit").textContent=originalFeature.credit;
 highlightFeatured("");
}
function allowedFeaturedImage(){return false}
function considerFeatured(rows,query){
 const q=norm(query||"");if(!q)return;
 const tokens=q.split(/\s+/).filter(t=>t.length>=4);
 const picks=(rows||[]).filter(r=>r.link&&r.title).map(r=>{
  const title=norm(r.title),matched=tokens.filter(t=>title.includes(t)).length,exact=title===q;
  // Wikipedia describes the subject; a same-titled Open Library book is NOT the subject.
  const originBoost=r.type==="wikipedia"?180:r.type==="manuscript"?90:r.type==="passage"?35:
    r.type==="openlibrary"?-180:r.type==="article"?-45:r.type==="museum"?-35:0;
  const weight=(exact?160:0)+(matched?60*matched/Math.max(1,tokens.length):0)+(title.includes(q)&&q.length>2?70:0)+originBoost;
  return {row:r,weight}
 }).filter(x=>x.weight>=95 && x.row.type!=="openlibrary").sort((a,b)=>b.weight-a.weight);
 if(!picks.length||picks[0].weight<=(S.featureWeight??-Infinity))return;
 const {row,weight}=picks[0];S.featureWeight=weight;
 $("featured-label").textContent=row.type==="wikipedia"?"DESTACADO · WIKIPEDIA":row.type==="manuscript"?"DESTACADO · MANUSCRITO":"DESTACADO · DOCUMENTACIÓN";
 $("featured-title").textContent=row.title;
 $("featured-description").textContent=brief(row.excerpt||row.meta||"",230);
 $("featured-link").href=row.link;
 $("featured-link").textContent=row.type==="wikipedia"?"Leer el artículo ›":"Consultar la fuente ›";
 $("featured-credit").textContent=[row.source||row.author,row.meta].filter(Boolean).join(" · ").slice(0,200);
 highlightFeatured(q);
}

/* Iconografía de autoridad para casos históricos homónimos.
   No convertir una semejanza de nombre en identidad del personaje. */
async function curatedHistoricalImage(query){
 const q=norm(query);
 let target=null;
 if(/\b(pitagoras|pythagoras)\b/.test(q)&&!/\b(regio|rhegium|reggio)\b/.test(q)){
  target={name:"Pythagoras Bust Vatican Museum.jpg",title:"Pitágoras de Samos",
   description:"Busto tradicionalmente identificado con Pitágoras, conservado en los Museos Vaticanos. Representación posterior: no es un retrato contemporáneo del filósofo."};
 }else if(/\b(vitruvio|vitruvius|vitruve)\b/.test(q)&&!/\b(hombre|man|leonardo)\b/.test(q)){
  target={name:"Vitruvius, Florence, Plut. 30.10.jpg",title:"Vitruvio · manuscrito histórico",
   description:"Folio ilustrado de De architectura, Florencia, Biblioteca Medicea Laurenziana, Plut. 30.10. Testimonio histórico, no retrato contemporáneo de Vitruvio."};
 }
 if(!target)return {name:"Iconografía histórica",rows:[]};
 const p=new URLSearchParams({action:"query",prop:"imageinfo",titles:"File:"+target.name,iiprop:"url|extmetadata",iiurlwidth:"720",iilimit:"1",format:"json",origin:"*"});
 const d=await fetchJSON("https://commons.wikimedia.org/w/api.php?"+p,12000);
 const page=Object.values(d.query?.pages||{})[0],info=page?.imageinfo?.[0];
 const image=info?.thumburl||info?.url;
 if(!allowedFeaturedImage(image))throw Error("La fotografía patrimonial no está disponible");
 const pageLink=info.descriptionurl||"https://commons.wikimedia.org/wiki/File:"+encodeURIComponent(target.name.replace(/ /g,"_"));
 const license=htmlText(info.extmetadata?.LicenseShortName?.value||"licencia en ficha institucional");
 const record={type:"wikipedia",title:target.title,author:"Wikimedia Commons",excerpt:target.description,
  meta:"Iconografía histórica identificada por objeto e institución",
  rating:2200,link:pageLink,image,imageRights:pageLink,
  imageCredit:"Wikimedia Commons · "+license+" · consultar autor y ficha",imageKind:"documentary",source:"FONDO ICONOGRÁFICO"};
 return {name:"Iconografía histórica · autor y obra identificados",rows:[],featured:record};
}

function bindAcademia(){
 for(const b of document.querySelectorAll("button.academic-pill[data-domain]")){
  b.addEventListener("click",()=>{
   const raw=$("query").value.trim();
   const query=raw||"Vitruvius architecture history art";
   const domain=b.dataset.domain;
   if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(domain))return;
   const url="https://www.google.com/search?"+new URLSearchParams({q:"site:"+domain+" "+query});
   const popup=window.open(url,"_blank","noopener,noreferrer");
   const hint=$("academic-hint");if(hint)hint.textContent="Consulta externa: "+query+" · "+domain+". Los resultados se abren en la universidad o repositorio elegido.";
  })
 }
}
function makeLink(label,url){const a=anchor(label,url);return a}
function matchVariants(q){
 const stop=new Set(["para","como","donde","cuando","sobre","entre","desde","hasta","with","from","where","what","which","the","and","los","las","del","una","unos","unas","que","por","con","dans","pour","les","des"]);
 const terms=String(q||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>=3&&!stop.has(w));
 const expanded=new Set(terms);
 for(const w of terms){
  if(w.length>=7){const stem=w.replace(/(ciones|cion|mente|idades|idad|ismos|ismo|istas|ista|icos|icas|ico|ica|orum|arum|ibus|ium|iones|eans|ean|iens|ien|ales|ales|ales|es|os|as|us|um|is|ae|am|em|en|s)$/,"");if(stem.length>=5&&stem.length>=w.length-5)expanded.add(stem)}
  if(/^pitagor|^pythagor/.test(w)){expanded.add("pitagor");expanded.add("pythagor")}
 }
 return [...expanded].slice(0,18)
}
function markTerms(root,query){
 const words=matchVariants(query);
 if(!words.length)return;
 const normText=x=>String(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walker.nextNode()){const n=walker.currentNode;if(n.parentElement?.closest("a,button,mark,script,style"))continue;if(n.textContent.trim())nodes.push(n)}
 for(const n of nodes){const original=n.textContent,normalized=normText(original);let hits=[];
 for(const term of words){let from=0,i;while((i=normalized.indexOf(term,from))!==-1){hits.push([i,i+term.length]);from=i+term.length;if(hits.length>100)break}}
 if(!hits.length)continue;hits.sort((x,y)=>x[0]-y[0]);const frag=document.createDocumentFragment();let end=0;
 for(const [start,stop] of hits){if(start<end)continue;if(start>end)frag.append(document.createTextNode(original.slice(end,start)));const m=document.createElement("mark");m.className="query-hit";m.textContent=original.slice(start,stop);frag.append(m);end=stop}
 if(end<original.length)frag.append(document.createTextNode(original.slice(end)));n.replaceWith(frag);
 }
}
function renderCard(d){
 const card=node("article","result-card"),head=node("div","result-head"),title=node("div");
 title.append(node("span","kind",T()[d.type]||d.type.toUpperCase()),node("h3",null,d.title));head.append(title);card.append(head);
 if(d.author)card.append(node("div","author",d.author));
 if(d.excerpt)card.append(node("p",null,d.excerpt));
 if(d.type==="passage"&&d.latin&&d.translation){
  const bilingual=node("div","passage-bilingual");
  const latin=node("p","passage-latin",d.latin.slice(0,700));
  const translation=node("p","passage-translation",d.translation.slice(0,700));
  bilingual.append(node("div","passage-language","LATÍN"),latin,node("div","passage-language","TRADUCCIÓN"),translation);
  card.append(bilingual);
 }
 if(d.meta)card.append(node("div","meta-line",d.meta));
 const acts=node("div","actions");
 if(d.link){const a=makeLink(d.type==="passage"||d.type==="book"||d.type==="manuscript"?T().read:d.type==="section"?T().document:T().source,d.link);if(a)acts.append(a)}
 if(Array.isArray(d.links)){for(const extra of d.links.slice(0,3)){const a=makeLink(extra.label,extra.url);if(a)acts.append(a)}}
 else if(d.type==="book")acts.append(node("span","disabled",T().unpublished));
 if(d.pdf){const a=makeLink(T().pdf,d.pdf);if(a)acts.append(a)}
 card.append(acts);return card
}
function synthesize(rows){const box=$("answer");box.replaceChildren();
 const evidence=rows.filter(r=>r.type==="passage"||r.type==="wikipedia"||r.type==="wikidata"||r.type==="museum").slice(0,3);
 if(!evidence.length){box.hidden=true;return}
 box.hidden=false;box.append(node("h3",null,T().synthesis));
 for(const r of evidence){const p=node("p");const l=makeLink(r.title,r.link);if(l)p.append(l,document.createTextNode(": "));p.append(document.createTextNode(brief(r.excerpt,220)));box.append(p)}
 box.append(node("p","detail",T().detail))
}
function display(rows,query,phase){
 const scored=rows.slice().sort((a,b)=>(b.rating||0)-(a.rating||0)),deduped=[],seen=new Set();
 for(const r of scored){const k=r.type+":"+norm(r.title);if(seen.has(k))continue;seen.add(k);deduped.push(r)}
 const list=$("result-list");list.replaceChildren();
 if(!deduped.length)list.append(node("div","empty",T().none));
 else for(const r of deduped.slice(0,44)){const card=renderCard(r);markTerms(card,query);list.append(card)}
 if(window.VitruviaArticles){$("answer").hidden=true;window.VitruviaArticles.render(deduped,query)}else synthesize(deduped);
 $("results-heading").textContent=T().heading;
 $("result-state").textContent=deduped.length+" coincidencias · "+Math.min(44,deduped.length)+" visibles"+(phase?" · "+phase:"")
}
function sourceLinks(query){const parent=$("source-links");parent.replaceChildren();
 if(!query)return;
 const links=[
 ["Encyclopaedia Britannica","https://www.google.com/search?"+new URLSearchParams({q:"site:britannica.com "+query})],
 ["Stanford Encyclopedia of Philosophy","https://www.google.com/search?"+new URLSearchParams({q:"site:plato.stanford.edu "+query})],
 ["World History Encyclopedia","https://www.google.com/search?"+new URLSearchParams({q:"site:worldhistory.org "+query})],
 ["Internet Archive","https://archive.org/search?"+new URLSearchParams({query})],
 ["Google Books","https://books.google.com/books?"+new URLSearchParams({vid:"",q:query})],
 ["Wikipedia en español","https://es.wikipedia.org/w/index.php?"+new URLSearchParams({search:query})],
 ["Wikipedia in English","https://en.wikipedia.org/w/index.php?"+new URLSearchParams({search:query})],
 ["Open Library","https://openlibrary.org/search?"+new URLSearchParams({q:query})]
 ];
 const h=node("h3",null,T().external);parent.append(h);
 for(const [label,url] of links){const a=makeLink(label+" ↗",url);if(a)parent.append(a)}
 const p=node("p",null,"Britannica y Stanford: enlace a búsquedas externas; no se presentan resultados como si fueran API propias.");parent.append(p)
}
async function search(){
 const q=$("query").value.trim(),id=++S.searchId;if(!q)return;
 restoreFeature();
 history.replaceState(null,"","vitruvia.html?"+new URLSearchParams({q,mode:S.mode}));
 const mode=S.mode,concept=(mode==="concept"||mode==="all"),internal=["all","site","concept"].includes(mode);
 const engine=window.VitruviaResearchEngine;
 const intent=engine?.classify(q);
 // Una signatura, un manuscrito identificado o un locus exacto se resuelven
 // antes que las coincidencias externas de vocabulario general.
 const focused=!!(intent?.harley||intent?.vitruvian||intent?.locus);
 const wikiEnabled=["all","wiki","external"].includes(mode);
 const academicEnabled=["all","external"].includes(mode);
 $("results-heading").textContent=T().heading;$("result-state").textContent=T().waiting;
 $("result-list").replaceChildren(node("div","empty",T().waiting));$("answer").hidden=true;
 if(window.VitruviaArticles)window.VitruviaArticles.render([],q);
 sourceLinks(q);
 let rows=[];
 if(internal){
  rows=focused?[]:[...liveBooks(q,concept),...livePages(q,concept)];
  if(rows.length)display(rows,q,T().searching)
 }
 const pending=[];
 if(internal){
  if(engine)pending.push(engine.query(q,{concept}).then(value=>({name:"Loci, léxico y códices",rows:value.rows||[],warnings:value.warnings||[]})).catch(e=>({name:"Índice documental no disponible",rows:[],warnings:[e.message]})));
  else pending.push(passages().then(ps=>({name:"Corpus de Vitruvio",rows:livePassages(ps,q,concept)})).catch(e=>({name:"Corpus no disponible: "+e.message,rows:[]})));
 }
 if(wikiEnabled){
  /* Wikipedia is queried even for precise codex/locus searches in All mode. */
  pending.push(wiki(q,S.lang).then(rows=>({name:"Wikipedia",rows})).catch(e=>({name:"Wikipedia sin respuesta: "+e.message,rows:[]})));
  if(S.lang!=="en")pending.push(wiki(q,"en").then(rows=>({name:"Wikipedia EN",rows})).catch(e=>({name:"Wikipedia EN sin respuesta: "+e.message,rows:[]})));
 }
 if(academicEnabled){
  pending.push(wikidata(q).then(rows=>({name:"Wikidata",rows})).catch(e=>({name:"Wikidata sin respuesta: "+e.message,rows:[]})));
  pending.push(openLibrary(q).then(rows=>({name:"Open Library",rows})).catch(e=>({name:"Open Library sin respuesta: "+e.message,rows:[]})));
  pending.push(museum(q).then(rows=>({name:"The Met",rows})).catch(e=>({name:"The Met sin respuesta: "+e.message,rows:[]})));
  pending.push(crossref(q).then(rows=>({name:"Crossref",rows})).catch(e=>({name:"Crossref sin respuesta: "+e.message,rows:[]})));
  pending.push(europePmc(q).then(rows=>({name:"Europe PMC",rows})).catch(e=>({name:"Europe PMC sin respuesta: "+e.message,rows:[]})));
 }
 if(!pending.length){display(rows,q,"Índice interno");return}
 let completed=0;
 await Promise.all(pending.map(p=>p.then(value=>{
  if(id!==S.searchId)return;
  const incoming=value.rows||[];
  rows.push(...incoming);
  if(value.featured)considerFeatured([value.featured],q);else considerFeatured(incoming,q)
  completed++;
  display(rows,q,completed+"/"+pending.length+" fuentes procesadas · "+value.name);
  if(value.warnings?.length)$("result-state").title=value.warnings.join("; ");
 })));
 if(id===S.searchId)display(rows,q,"Búsqueda finalizada");
}
function language(lang){S.lang=I18N[lang]?lang:"es";document.documentElement.lang=S.lang;
 const t=T();$("lead").textContent=t.lead;$("query").placeholder=t.placeholder;$("submit").textContent=t.submit;
 document.querySelectorAll("button.tab").forEach((b,i)=>b.textContent=t.modes[i]);
 $("mode-note").textContent=t.explain[["all","site","wiki","external","concept"].indexOf(S.mode)];
 $("ui-language").value=S.lang;
 try{localStorage.setItem("vitruvius-ui-lang",S.lang)}catch{}
}
function mode(m){S.mode=["all","site","wiki","external","concept"].includes(m)?m:"all";
 document.querySelectorAll("button.tab").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===S.mode)));
 $("mode-note").textContent=T().explain[["all","site","wiki","external","concept"].indexOf(S.mode)];
}
function theme(th){S.theme=th;document.documentElement.dataset.theme=th;
 const control=$("theme");
 control.replaceChildren();
 const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");
 icon.setAttribute("viewBox","0 0 24 24");icon.setAttribute("width","19");icon.setAttribute("height","19");icon.setAttribute("aria-hidden","true");
 icon.setAttribute("fill","none");icon.setAttribute("stroke","currentColor");icon.setAttribute("stroke-width","1.65");
 icon.setAttribute("stroke-linecap","round");icon.setAttribute("stroke-linejoin","round");
 const path=document.createElementNS("http://www.w3.org/2000/svg","path");
 path.setAttribute("d",th==="dark"?"M12 3a9 9 0 1 0 9 9A7 7 0 0 1 12 3Z":"M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8L17 7m-10 10-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z");
 icon.append(path);control.append(icon);
 control.setAttribute("aria-label",th==="dark"?"Activar modo claro":"Activar modo oscuro");
 control.setAttribute("title",th==="dark"?"Modo claro":"Modo oscuro");
 try{localStorage.setItem("vitruvia-theme",th)}catch{}
}

/* Autocompletado local auténtico, con coincidencia de títulos y alias académicos.
   No solicita credenciales ni simula búsquedas remotas. */
function setupAutocomplete(){
 const input=$("query"),menu=$("search-suggestions");if(!input||!menu)return;
 let index=-1,options=[];
 const canonical=[
  ["Codex H · Harley MS 2767","Codex H",["harleianus","harlesianus","harley","codex h","2767","harl"] , "Manuscrito"],
  ["Codex H · doble hoja","Codex H doble folio",["codex h","harleianus","doble hoja","doble folio"],"Lector"],
  ["Códices de Vitruvio","códices de Vitruvio",["vitruvius","vitruvio","codice","codex","manuscrito","testigos"],"Catálogo"],
  ["Daniele Barbaro · edición 1567","Barbaro 1567",["barbaro","barbaro 1567","codex barbaro"],"Edición"],
  ["Cesare Cesariano · edición 1521","Cesariano 1521",["cesariano","cesarino","1521"],"Edición"],
  ["Fra Giocondo · edición 1511","Giocondo 1511",["giocondo","jocundus","1511"],"Edición"],
  ["Sulpizio · edición príncipe 1486","Sulpizio 1486",["sulpizio","sulpicio","1486"],"Edición"],
  ["Lucrecio · De rerum natura","Lucrecio",["lucrecio","lucretius","rerum natura"],"Libro"],
  ["Cicerón · De officiis","Cicerón De officiis",["ciceron","cicero","officiis"],"Libro"],
  ["Vitruvio · De architectura","Vitruvio",["vitruvio","vitruvius","de architectura"],"Tratado"]
 ];
 const hide=()=>{menu.hidden=true;input.setAttribute("aria-expanded","false");input.removeAttribute("aria-activedescendant");index=-1;options=[]};
 const choose=v=>{input.value=v;hide();search()};
 function build(){
  const q=norm(input.value);menu.replaceChildren();index=-1;options=[];
  if(q.length<2){hide();return}
  const suggestions=[];
  const seen=new Set();
  const add=(label,value,subtitle,rank)=>{const key=norm(value);if(seen.has(key))return;seen.add(key);suggestions.push({label,value,subtitle,rank})};
  for(const [label,value,aliases,type] of canonical){
   const norms=aliases.map(norm);
   if(norms.some(a=>a.includes(q)||q.includes(a))||norm(label).includes(q))
    add(label,value,type,norm(label).startsWith(q)?120:75);
  }
  for(const w of S.works){const title=w.title||"",author=w.author||"";
   if(norm(title+" "+author).includes(q))add(title,title,author||"Obra",55+(norm(title).startsWith(q)?15:0));
  }
  for(const p of S.pages){const title=p.title||"";
   if(norm(title+" "+p.description).includes(q))add(title,title,"Biblioteca digital",35+(norm(title).startsWith(q)?10:0));
  }
  suggestions.sort((a,b)=>b.rank-a.rank||a.label.localeCompare(b.label));
  const h=node("div","search-suggestions-title","Obras y consultas relacionadas");
  menu.append(h);
  for(const [i,hit] of suggestions.slice(0,7).entries()){
   const btn=node("button","search-suggestion");
   btn.type="button";btn.id="search-suggestion-"+i;btn.role="option";btn.setAttribute("aria-selected","false");
   btn.append(node("span",null,hit.label),node("small",null,hit.subtitle));
   btn.addEventListener("pointerdown",e=>e.preventDefault());
   btn.addEventListener("click",()=>choose(hit.value));
   options.push(btn);menu.append(btn);
  }
  if(!options.length){hide();return}
  menu.hidden=false;input.setAttribute("aria-expanded","true");
 }
 const paint=()=>{options.forEach((b,i)=>b.setAttribute("aria-selected",String(i===index)));if(index>=0){input.setAttribute("aria-activedescendant",options[index].id);options[index].scrollIntoView({block:"nearest"})}else input.removeAttribute("aria-activedescendant")};
 input.addEventListener("input",build);
 input.addEventListener("focus",()=>{if(input.value.trim().length>=2)build()});
 input.addEventListener("keydown",e=>{
  if(menu.hidden)return;
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();index=(index+(e.key==="ArrowDown"?1:-1)+options.length)%options.length;paint()}
  else if(e.key==="Escape"){e.preventDefault();hide()}
  else if(e.key==="Enter"&&index>=0){e.preventDefault();options[index].click()}
 });
 document.addEventListener("pointerdown",e=>{if(!menu.contains(e.target)&&e.target!==input)hide()});
 $("search-form").addEventListener("submit",hide);
}
setupAutocomplete();

bindAcademia();
$("search-form").addEventListener("submit",e=>{e.preventDefault();search()});
$("ui-language").addEventListener("change",e=>{language(e.target.value);if($("query").value.trim())search()});
$("theme").addEventListener("click",()=>theme(S.theme==="dark"?"light":"dark"));
document.querySelectorAll("button.tab").forEach(b=>b.addEventListener("click",()=>{mode(b.dataset.mode);if($("query").value.trim())search()}));
document.querySelectorAll("button[data-q]").forEach(b=>b.addEventListener("click",()=>{$("query").value=b.dataset.q;search();document.querySelector("#results").scrollIntoView({behavior:"smooth",block:"start"})}));
try{const saved=localStorage.getItem("vitruvius-ui-lang");if(I18N[saved])S.lang=saved;const savedTheme=localStorage.getItem("vitruvia-theme");if(savedTheme==="light")S.theme="light"}catch{}
theme(S.theme);
const params=new URLSearchParams(location.search);mode(params.get("mode")||"all");language(S.lang);
load().then(()=>{const q=params.get("q");if(q){$("query").value=q;search()}}) ;
})();