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
const localUrl=/^(?:[a-z0-9/_-]+\.html(?:\?[^#]*)?|documents\/[a-z0-9/_-]+\.pdf)$/i;
function anchor(text,url){const a=node("a",null,text);if(!url)return null;const external=/^https:\/\//i.test(url);
 if(!external&&!localUrl.test(url))return null;a.href=url;if(external){a.target="_blank";a.rel="noopener noreferrer"}return a}
const I18N={
 es:{lead:"Buscador universal especializado en arte, historia, arquitectura y patrimonio cultural. Libros, códices, Wikipedia y fuentes académicas.",placeholder:"Preguntá sobre cualquier tema, obra, autor o concepto…",submit:"Buscar",modes:["◎ Todo","Biblioteca interna","⌁ Modo conceptual","↗ Enciclopedias"],explain:["Buscá cualquier tema en Wikipedia y otras fuentes públicas. Arte, historia y arquitectura reciben prioridad.","Busca en el catálogo, los pasajes en latín y sus traducciones, y las secciones alojadas en GitHub.","Relaciona conceptos, sinónimos y lenguas; ofrece una síntesis extractiva basada en citas, sin inventar respuestas.","Consulta en vivo Wikipedia, Wikidata y catálogos abiertos, independientemente de la materia."],heading:"Resultados documentados",idle:"Consultá la biblioteca y las enciclopedias",waiting:"Consultando fuentes verificables…",none:"No se obtuvieron resultados comprobados; podés usar las búsquedas institucionales directas.",book:"LIBRO DEL CATÁLOGO",passage:"TEXTO · LOCUS",section:"DOCUMENTO DEL SITIO",wikipedia:"ENCICLOPEDIA · WIKIPEDIA",wikidata:"DATOS · WIKIDATA",openlibrary:"CATÁLOGO · OPEN LIBRARY",museum:"ARTE · THE MET",read:"Leer en la biblioteca",document:"Abrir documento",source:"Consultar fuente",pdf:"Leer PDF",unpublished:"Ficha en preparación · lector no disponible",synthesis:"Síntesis de resultados documentados",detail:"Selección de fragmentos recuperados; verificá las afirmaciones en cada fuente. No es una respuesta generativa de IA.",external:"Búsquedas adicionales en fuentes reconocidas",searching:"La búsqueda continúa en fuentes externas…"},
 en:{lead:"Universal search with a focus on art, history, architecture and cultural heritage. Books, manuscripts, Wikipedia and scholarly sources.",placeholder:"Search any topic, author, book or concept…",submit:"Search",modes:["◎ All","This library","⌁ Concept mode","↗ Encyclopedias"],explain:["Search any topic in Wikipedia and public sources, prioritising art, history and architecture.","Search the catalog, Latin passages, translations and pages hosted on GitHub.","Link related terms across languages with source-based extracts, without inventing answers.","Live search of Wikipedia, Wikidata and open catalogs, on any topic."],heading:"Documented results",idle:"Explore library and encyclopedias",waiting:"Searching verifiable sources…",none:"No confirmed results; use the direct institutional searches.",book:"CATALOG BOOK",passage:"TEXT · LOCUS",section:"SITE DOCUMENT",wikipedia:"ENCYCLOPEDIA · WIKIPEDIA",wikidata:"DATA · WIKIDATA",openlibrary:"CATALOG · OPEN LIBRARY",museum:"ART · THE MET",read:"Read in library",document:"Open document",source:"View original",pdf:"Read PDF",unpublished:"Catalog entry pending · no reader",synthesis:"Source-based synthesis",detail:"Selected excerpts from retrieved documents; verify claims at the source. Not generative AI.",external:"Additional reputable sources",searching:"External sources are still loading…"},
 fr:{lead:"Recherche universelle privilégiant l’art, l’histoire, l’architecture et le patrimoine. Livres, codex, Wikipédia et sources scientifiques.",placeholder:"Chercher n’importe quel sujet, auteur ou ouvrage…",submit:"Rechercher",modes:["◎ Tout","Bibliothèque","⌁ Concepts","↗ Encyclopédies"],explain:["Tous les sujets sur Wikipédia et autres ressources ouvertes ; priorité à l’art, l’histoire et l’architecture.","Recherche dans les livres, passages latins, traductions et pages hébergées sur GitHub.","Relie synonymes et langues ; synthèse documentaire fondée sur des sources.","Recherche en direct dans Wikipédia, Wikidata et des catalogues ouverts pour tous les sujets."],heading:"Résultats documentés",idle:"Explorer les fonds",waiting:"Interrogation des sources vérifiables…",none:"Aucun résultat confirmé ; utiliser les recherches institutionnelles directes.",book:"LIVRE DU CATALOGUE",passage:"TEXTE · LOCUS",section:"DOCUMENT DU SITE",wikipedia:"ENCYCLOPÉDIE · WIKIPÉDIA",wikidata:"DONNÉES · WIKIDATA",openlibrary:"CATALOGUE · OPEN LIBRARY",museum:"ART · THE MET",read:"Lire dans la bibliothèque",document:"Ouvrir document",source:"Voir la source",pdf:"Lire PDF",unpublished:"Notice en attente · pas de lecteur",synthesis:"Synthèse sourcée",detail:"Extraits récupérés ; vérifier les sources. Ce n'est pas une IA générative.",external:"Autres références de qualité",searching:"Interrogation des sources externes en cours…"}
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
 S.passagePromise=Promise.allSettled(dataPaths.map(fetchJSON)).then(results=>{
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
 return (d.query?.search||[]).map((w,i)=>({type:"wikipedia",title:w.title,author:"Wikipedia · "+lang.toUpperCase(),excerpt:brief(htmlText(w.snippet),260),meta:"Artículo enciclopédico · Wikimedia",rating:42-i*2+culturalWeight(w.title,w.snippet),link:"https://"+lang+".wikipedia.org/?curid="+w.pageid,source:"Wikipedia ("+lang.toUpperCase()+")"}))
}
async function wikidata(q){
 const p=new URLSearchParams({action:"wbsearchentities",search:q,language:S.lang,uselang:S.lang,type:"item",limit:"6",format:"json",origin:"*"});
 const d=await fetchJSON("https://www.wikidata.org/w/api.php?"+p);
 return (d.search||[]).map((x,i)=>({type:"wikidata",title:x.label||x.id,excerpt:x.description||"Identificador de entidad · Wikidata",author:x.id,meta:"Datos enlazados · Wikimedia",rating:30-i+culturalWeight(x.label,x.description),link:"https://www.wikidata.org/wiki/"+x.id,source:"Wikidata"}))
}
async function openLibrary(q){
 const p=new URLSearchParams({q,limit:"6",fields:"key,title,author_name,first_publish_year,edition_count,has_fulltext,public_scan_b"});
 const d=await fetchJSON("https://openlibrary.org/search.json?"+p);
 return (d.docs||[]).filter(x=>/^\/works\/OL\d+W$/.test(x.key||"")).map((x,i)=>({type:"openlibrary",title:x.title||"Libro sin título",author:(x.author_name||[]).slice(0,2).join(", "),excerpt:"Primera publicación registrada: "+(x.first_publish_year||"sin datos")+" · "+(x.edition_count||0)+" ediciones catalogadas. Consultar disponibilidad de lectura en Open Library.",meta:"Catálogo externo · disponibilidad sujeta al proveedor",rating:27-i+culturalWeight(x.title,(x.author_name||[]).join(" ")),link:"https://openlibrary.org"+x.key,source:"Open Library"}))
}
async function museum(q){
 const params=new URLSearchParams({q,limit:"4",offset:"0"});
 const d=await fetchJSON("https://collectionapi.metmuseum.org/public/collection/v1.1/search?"+params,12500);
 const ids=(d.objectIDs||[]).slice(0,3);
 const details=await Promise.allSettled(ids.map(id=>fetchJSON("https://collectionapi.metmuseum.org/public/collection/v1/objects/"+id,9000)));
 return details.filter(x=>x.status==="fulfilled").map((x,i)=>{const o=x.value;return {type:"museum",title:o.title||"Objeto de museo",author:[o.artistDisplayName,o.objectDate].filter(Boolean).join(" · "),excerpt:[o.culture,o.period,o.medium,o.department].filter(Boolean).join(" · "),meta:"Colección del Metropolitan Museum of Art",rating:29-i+culturalWeight(o.title,o.department),link:o.objectURL||"https://www.metmuseum.org",source:"The Met"}});
}
function makeLink(label,url){const a=anchor(label,url);return a}
function renderCard(d){
 const card=node("article","result-card"),head=node("div","result-head"),title=node("div");
 title.append(node("span","kind",T()[d.type]||d.type.toUpperCase()),node("h3",null,d.title));head.append(title);card.append(head);
 if(d.author)card.append(node("div","author",d.author));
 if(d.excerpt)card.append(node("p",null,d.excerpt));
 if(d.meta)card.append(node("div","meta-line",d.meta));
 const acts=node("div","actions");
 if(d.link){const a=makeLink(d.type==="passage"||d.type==="book"?T().read:d.type==="section"?T().document:T().source,d.link);if(a)acts.append(a)}
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
 const scored=rows.slice().sort((a,b)=>b.rating-a.rating),deduped=[],seen=new Set();
 for(const r of scored){const k=r.type+":"+norm(r.title);if(seen.has(k))continue;seen.add(k);deduped.push(r)}
 const list=$("result-list");list.replaceChildren();
 if(!deduped.length)list.append(node("div","empty",T().none));
 else for(const r of deduped.slice(0,44))list.append(renderCard(r));
 synthesize(deduped);
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
 history.replaceState(null,"","vitruvia.html?"+new URLSearchParams({q,mode:S.mode}));
 const mode=S.mode,concept=mode==="concept",internal=mode!=="external",outside=mode==="all"||mode==="external";
 $("results-heading").textContent=T().heading;$("result-state").textContent=T().waiting;
 $("result-list").replaceChildren(node("div","empty",T().waiting));$("answer").hidden=true;
 sourceLinks(q);
 let rows=[];
 if(internal){rows=[...liveBooks(q,concept),...livePages(q,concept)];display(rows,q,T().searching)}
 const pending=[];
 if(internal)pending.push(passages().then(ps=>({name:"Corpus de Vitruvio",rows:livePassages(ps,q,concept)})).catch(e=>({name:"Corpus no disponible: "+e.message,rows:[]})));
 if(outside){pending.push(wiki(q,S.lang).then(rows=>({name:"Wikipedia",rows})).catch(e=>({name:"Wikipedia sin respuesta: "+e.message,rows:[]})));
  if(S.lang!=="en")pending.push(wiki(q,"en").then(rows=>({name:"Wikipedia EN",rows})).catch(e=>({name:"Wikipedia EN sin respuesta: "+e.message,rows:[]})));
  pending.push(wikidata(q).then(rows=>({name:"Wikidata",rows})).catch(e=>({name:"Wikidata sin respuesta: "+e.message,rows:[]})));
  pending.push(openLibrary(q).then(rows=>({name:"Open Library",rows})).catch(e=>({name:"Open Library sin respuesta: "+e.message,rows:[]})));
  pending.push(museum(q).then(rows=>({name:"The Met",rows})).catch(e=>({name:"The Met sin respuesta: "+e.message,rows:[]})));
 }
 if(!pending.length){display(rows,q,"Índice interno");return}
 let completed=0;
 await Promise.all(pending.map(p=>p.then(value=>{
  if(id!==S.searchId)return;rows.push(...value.rows);completed++;
  display(rows,q,completed+"/"+pending.length+" fuentes procesadas · "+value.name);
 })));
 if(id===S.searchId)display(rows,q,"Búsqueda finalizada");
}
function language(lang){S.lang=I18N[lang]?lang:"es";document.documentElement.lang=S.lang;
 const t=T();$("lead").textContent=t.lead;$("query").placeholder=t.placeholder;$("submit").textContent=t.submit;
 document.querySelectorAll("button.tab").forEach((b,i)=>b.textContent=t.modes[i]);
 $("mode-note").textContent=t.explain[["all","site","concept","external"].indexOf(S.mode)];
 $("ui-language").value=S.lang;
 try{localStorage.setItem("vitruvius-ui-lang",S.lang)}catch{}
}
function mode(m){S.mode=["all","site","concept","external"].includes(m)?m:"all";
 document.querySelectorAll("button.tab").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===S.mode)));
 $("mode-note").textContent=T().explain[["all","site","concept","external"].indexOf(S.mode)];
}
function theme(th){S.theme=th;document.documentElement.dataset.theme=th;$("theme").textContent=th==="dark"?"☀":"☾";
 try{localStorage.setItem("vitruvia-theme",th)}catch{}
}
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