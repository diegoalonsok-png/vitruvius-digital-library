/* VITRUVIA: búsqueda documental + enciclopedias públicas, sin claves privadas.
   Los resultados nunca se inventan. El modo conceptual es expansión terminológica,
   NO un modelo generativo de lenguaje. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const S={mode:"all",lang:"es",theme:"dark",works:[],pages:[],witnesses:[],editions:[],passages:null,passagePromise:null,searchId:0,ready:false,privateMode:false,visibleResultCount:60,people:[],historical:[],academicRecords:[],currentAuthorities:[]};
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
 es:{lead:"Vitruvia es un buscador universal con orientación académica. Puedes investigar cualquier persona, obra, lugar o tema; combina enciclopedias, fuentes institucionales, bibliografía, documentos e imágenes con procedencia identificable.",placeholder:"Pregunta sobre cualquier tema, obra, autor o concepto…",submit:"Buscar",modes:["◎ Todo","Biblioteca","Wikipedia","Internet y academia","⌁ Conceptos"],explain:["Busca en la biblioteca, Wikipedia y fuentes de Internet verificables, sin salir de Vitruvia cuando existe una API pública.","Consulta libros, manuscritos, pasajes en latín y traducciones de la Biblioteca Vitruviana.","Resultados de Wikipedia en el idioma elegido y en inglés como referencia complementaria.","Busca en catálogos, museos, Wikidata y registros académicos. Para la web general ofrecemos enlaces de búsqueda directa.","Relacioná términos, sinónimos y lenguas en los documentos internos; no se afirma utilizar IA generativa."],heading:"Resultados documentados",idle:"Consulta la biblioteca y las enciclopedias",waiting:"Consultando fuentes verificables…",none:"No se obtuvieron resultados comprobados; puedes usar las búsquedas institucionales directas.",book:"LIBRO DEL CATÁLOGO",edition:"EDICIÓN HISTÓRICA",preface:"PREFACIO · DE ARCHITECTURA",passage:"TEXTO · LOCUS",section:"DOCUMENTO DEL SITIO",wikipedia:"ENCICLOPEDIA · WIKIPEDIA",wikidata:"DATOS · WIKIDATA",openlibrary:"CATÁLOGO · OPEN LIBRARY",museum:"ARTE · THE MET",article:"ARTÍCULO CIENTÍFICO",googlebook:"LIBRO · GOOGLE BOOKS",read:"Leer en la biblioteca",document:"Abrir documento",source:"Consultar fuente",pdf:"Leer PDF",unpublished:"Ficha en preparación · lector no disponible",synthesis:"Síntesis de resultados documentados",detail:"Selección de fragmentos recuperados; verifica las afirmaciones en cada fuente. No es una respuesta generativa de IA.",external:"Búsquedas adicionales en fuentes reconocidas",searching:"La búsqueda continúa en fuentes externas…"},
 en:{lead:"Vitruvia is a universal search tool with an academic focus. Explore people, books, places and any topic through encyclopedias, institutional sources, scholarly records, documents and source-linked images.",placeholder:"Search any topic, author, book or concept…",submit:"Search",modes:["◎ All","Library","Wikipedia","Web & research","⌁ Concepts"],explain:["Search this library, Wikipedia and verifiable web sources in one place when public APIs allow it.","Search books, manuscripts, Latin passages and translations in this library.","Search Wikipedia in your selected language, plus English results when useful.","Explore open catalogs, museum records, Wikidata and scholarly sources; use direct links for the wider web.","Explore related terms and languages in local documents; this is not generative AI."],heading:"Documented results",idle:"Explore library and encyclopedias",waiting:"Searching verifiable sources…",none:"No confirmed results; use the direct institutional searches.",book:"CATALOG BOOK",edition:"HISTORICAL EDITION",preface:"PREFACE · DE ARCHITECTURA",passage:"TEXT · LOCUS",section:"SITE DOCUMENT",wikipedia:"ENCYCLOPEDIA · WIKIPEDIA",wikidata:"DATA · WIKIDATA",openlibrary:"CATALOG · OPEN LIBRARY",museum:"ART · THE MET",article:"RESEARCH ARTICLE",googlebook:"BOOK · GOOGLE BOOKS",read:"Read in library",document:"Open document",source:"View original",pdf:"Read PDF",unpublished:"Catalog entry pending · no reader",synthesis:"Source-based synthesis",detail:"Selected excerpts from retrieved documents; verify claims at the source. Not generative AI.",external:"Additional reputable sources",searching:"External sources are still loading…"},
 fr:{lead:"Vitruvia est un moteur de recherche universel à vocation académique. Explorez les personnes, œuvres, lieux et sujets grâce aux encyclopédies, institutions, références scientifiques, documents et images sourcées.",placeholder:"Chercher n’importe quel sujet, auteur ou ouvrage…",submit:"Rechercher",modes:["◎ Tout","Bibliothèque","Wikipédia","Web et recherche","⌁ Concepts"],explain:["Rechercher dans cette bibliothèque, Wikipédia et les sources web vérifiables disposant d’API ouvertes.","Explorer les livres, manuscrits, passages latins et traductions de la bibliothèque.","Consulter Wikipédia dans la langue choisie et, en complément, en anglais.","Explorer les catalogues ouverts, musées, Wikidata et références scientifiques ; liens directs pour le web général.","Relier les termes et synonymes des documents internes ; ce service n’est pas une IA générative."],heading:"Résultats documentés",idle:"Explorer les fonds",waiting:"Interrogation des sources vérifiables…",none:"Aucun résultat confirmé ; utiliser les recherches institutionnelles directes.",book:"LIVRE DU CATALOGUE",edition:"ÉDITION HISTORIQUE",preface:"PRÉFACE · DE ARCHITECTURA",passage:"TEXTE · LOCUS",section:"DOCUMENT DU SITE",wikipedia:"ENCYCLOPÉDIE · WIKIPÉDIA",wikidata:"DONNÉES · WIKIDATA",openlibrary:"CATALOGUE · OPEN LIBRARY",museum:"ART · THE MET",article:"ARTICLE SCIENTIFIQUE",googlebook:"LIVRE · GOOGLE BOOKS",read:"Lire dans la bibliothèque",document:"Ouvrir document",source:"Voir la source",pdf:"Lire PDF",unpublished:"Notice en attente · pas de lecteur",synthesis:"Synthèse sourcée",detail:"Extraits récupérés ; vérifier les sources. Ce n'est pas une IA générative.",external:"Autres références de qualité",searching:"Interrogation des sources externes en cours…"}
};
const UI_TEXT={"es":{"navLibrary":"Biblioteca Vitruviana","navAuthors":"Autores y libros","navCodices":"Códices","navMethod":"Método académico","otherAI":"CONSULTAR OTRAS IA","explore":"Explorar","universities":"UNIVERSIDADES","research":"INVESTIGACIÓN","academicHint":"Cada botón busca el término escrito arriba dentro del dominio académico seleccionado.","metricWorks":"fichas de obras","metricPages":"secciones documentadas","metricImages":"imágenes del Codex H","metricRead":"lecturas disponibles","headingIdle":"Consultar la biblioteca","print":"Imprimir / PDF","email":"Correo","copy":"Copiar enlace","sourcesMethod":"Fuentes y método","sidebarIntro":"Los resultados internos enlazan a documentos del repositorio y distinguen los títulos disponibles de las fichas pendientes. Los resultados externos se abren en sus instituciones de origen.","sideGraeco":"Biblioteca griega y latina ↗","sideReader":"Lector latino y traducciones ↗","sideCodex":"Galería Codex H ↗","sideBib":"Bibliografía académica ↗","sidePhilology":"Criterio filológico ↗","sidebarCaveat":"No se inventan traducciones. La búsqueda conceptual utiliza relaciones temáticas y recuperación textual; no es un chatbot generativo. El contenido de los PDF escaneados sin OCR sigue requiriendo lectura de facsímiles.","footerDesc":"Biblioteca digital abierta para las ciencias, las artes y las humanidades. Búsqueda documental con fuentes identificadas.","footerAuthors":"Autores y obras clásicas","footerCodices":"Índice de códices","footerBib":"Bibliografía","footerCite":"Cómo citar","footerLegal":"© 2026 Diego A. Kurilo · Todos los derechos reservados sobre los contenidos originales y el diseño editorial. Las fuentes externas conservan sus propias licencias.","footerMain":"Biblioteca principal"},"en":{"navLibrary":"Vitruvian Library","navAuthors":"Authors and books","navCodices":"Codices","navMethod":"Scholarly methodology","otherAI":"OTHER AI SERVICES","explore":"Explore","universities":"UNIVERSITIES","research":"RESEARCH","academicHint":"Each button searches the selected academic domain for your query.","metricWorks":"work records","metricPages":"documented sections","metricImages":"Codex H images","metricRead":"readable works","headingIdle":"Explore the library","print":"Print / PDF","email":"Email","copy":"Copy link","sourcesMethod":"Sources and method","sidebarIntro":"Local results link to repository documents, distinguishing available texts from pending records. External results open on the source institution's site.","sideGraeco":"Greek and Latin library ↗","sideReader":"Latin reader and translations ↗","sideCodex":"Codex H gallery ↗","sideBib":"Scholarly bibliography ↗","sidePhilology":"Philological criteria ↗","sidebarCaveat":"No translations are invented. Conceptual search uses related terms and text retrieval; it is not a generative chatbot. Scanned PDFs without OCR still require reading facsimiles.","footerDesc":"Open digital library for science, arts and humanities. Documentary research with identified sources.","footerAuthors":"Classical authors and works","footerCodices":"Codex index","footerBib":"Bibliography","footerCite":"How to cite","footerLegal":"© 2026 Diego A. Kurilo · All rights reserved for original content and editorial design. External sources retain their own licenses.","footerMain":"Main library"},"fr":{"navLibrary":"Bibliothèque vitruvienne","navAuthors":"Auteurs et livres","navCodices":"Codex","navMethod":"Méthode académique","otherAI":"AUTRES IA","explore":"Explorer","universities":"UNIVERSITÉS","research":"RECHERCHE","academicHint":"Chaque bouton recherche dans le domaine académique sélectionné.","metricWorks":"notices d’œuvres","metricPages":"sections documentées","metricImages":"images du Codex H","metricRead":"œuvres consultables","headingIdle":"Consulter la bibliothèque","print":"Imprimer / PDF","email":"Courriel","copy":"Copier le lien","sourcesMethod":"Sources et méthode","sidebarIntro":"Les résultats locaux renvoient aux documents du dépôt et distinguent les textes accessibles des notices en attente. Les résultats externes s’ouvrent sur le site de leur institution.","sideGraeco":"Bibliothèque grecque et latine ↗","sideReader":"Lecteur latin et traductions ↗","sideCodex":"Galerie Codex H ↗","sideBib":"Bibliographie académique ↗","sidePhilology":"Critères philologiques ↗","sidebarCaveat":"Aucune traduction n’est inventée. La recherche conceptuelle relie des termes et retrouve des textes ; ce n’est pas un agent génératif. Les PDF numérisés sans OCR nécessitent la lecture des fac-similés.","footerDesc":"Bibliothèque numérique ouverte pour les sciences, les arts et les humanités. Recherche documentaire avec sources identifiées.","footerAuthors":"Auteurs et œuvres classiques","footerCodices":"Index des codex","footerBib":"Bibliographie","footerCite":"Comment citer","footerLegal":"© 2026 Diego A. Kurilo · Tous droits réservés sur les contenus originaux et la conception éditoriale. Les sources externes conservent leurs licences.","footerMain":"Bibliothèque principale"}};
const RESULT_TEXT={"es":{"encyclopedia":"Enciclopedia, biografía y contexto","semantic":"IA semántica · fragmentos documentales","universities":"Universidades y centros de investigación","manuscripts":"Códices conservados · orden por antigüedad","apparatus":"Aparato crítico · ediciones de Diego Kurilo (V514 · V554 · V297)","fragments":"Papiros y fragmentos antiguos","editions":"Ediciones y traducciones · orden cronológico","scholars":"Investigadores y estudios fundamentales","library":"Obras y pasajes de la Biblioteca Vitruviana","external-texts":"Textos digitalizados · Wikisource","research":"Investigación, bibliografía y catálogos externos","matching":"coincidencias","visible":"visibles","sourceNote":"Los enlaces de búsqueda externa no son resultados verificados ni textos recuperados íntegramente."},"en":{"encyclopedia":"Encyclopedia, biography and context","semantic":"Semantic AI · documentary passages","universities":"Universities and research centers","manuscripts":"Surviving codices · earliest indexed first","apparatus":"Critical apparatus · Diego Kurilo editions (V514 · V554 · V297)","fragments":"Ancient papyri and fragments","editions":"Editions and translations · chronological","scholars":"Scholars and key studies","library":"Works and passages in the Vitruvian Library","external-texts":"Digitized texts · Wikisource","research":"Research, bibliography and external catalogues","matching":"matches","visible":"shown","sourceNote":"External search links are not verified results or fully retrieved texts."},"fr":{"encyclopedia":"Encyclopédie, biographies et contexte","semantic":"IA sémantique · extraits documentés","universities":"Universités et centres de recherche","manuscripts":"Codex conservés · par ancienneté","apparatus":"Apparat critique · éditions de Diego Kurilo (V514 · V554 · V297)","fragments":"Papyrus et fragments anciens","editions":"Éditions et traductions · chronologie","scholars":"Chercheurs et études fondamentales","library":"Œuvres et passages de la Bibliothèque vitruvienne","external-texts":"Textes numérisés · Wikisource","research":"Recherche, bibliographie et catalogues externes","matching":"résultats","visible":"affichés","sourceNote":"Les liens de recherche externe ne sont pas des résultats vérifiés ou des textes intégraux."}};
const WELCOME_I18N={
 es:{
  kicker:"UNA HERRAMIENTA DE INVESTIGACIÓN ABIERTA",
  headline:"Un punto de encuentro entre los textos antiguos y la investigación actual",
  intro:"Vitruvia es el instrumento de búsqueda de Vitruvius Digital Library, un proyecto editorial independiente dedicado a estudiar, consultar y relacionar textos clásicos, tratados de arquitectura, manuscritos históricos y bibliografía especializada.",
  purpose:"Nació para ir más allá de encontrar palabras: vincular autores y obras con sus testimonios manuscritos, sus ediciones históricas, los pasajes originales y las traducciones disponibles, siempre que se puedan identificar sus fuentes.",
  methodTitle:"¿Cómo consultar?",
  methodBody:"Busca un autor, una obra, una palabra latina o griega, un lugar, un manuscrito o una pregunta. Las referencias locales y los registros de instituciones externas se distinguen; un enlace de catálogo no implica que se haya leído el texto completo.",
  scope:"La búsqueda en IA es experimental y depende de los documentos realmente indexados. Los facsímiles sin texto reconocible no ofrecen todavía búsqueda íntegra.",
  readingTitle:"Textos originales y traducciones",
  readingText:"Lee y coteja pasajes del De architectura en latín y en las versiones editoriales disponibles, con referencias a libro y capítulo.",
  codexTitle:"Manuscritos y códices",
  codexText:"Explora testimonios conservados, signaturas y vínculos a bibliotecas custodias y visores digitales acreditados.",
  booksTitle:"Autores, obras y bibliografía",
  booksText:"Accede al repertorio de obras griegas y latinas, ediciones históricas y recursos de consulta vinculados.",
  tryTitle:"Empieza por una consulta:"
 },
 en:{
  kicker:"AN OPEN RESEARCH INSTRUMENT",
  headline:"Connecting ancient texts with contemporary scholarship",
  intro:"Vitruvia is the discovery tool of Vitruvius Digital Library, an independent editorial project dedicated to classical texts, architectural treatises, historical manuscripts and scholarly bibliography.",
  purpose:"Its purpose goes beyond keyword matching: connecting authors and works to manuscript witnesses, historical editions, original passages and available translations whenever their sources can be identified.",
  methodTitle:"How to search",
  methodBody:"Enter an author, work, Latin or Greek term, place, manuscript or question. Local records are distinguished from institutional catalogues; a catalogue link does not imply that the full text has been consulted.",
  scope:"AI-based searching is experimental and limited to documents actually indexed. Scanned facsimiles without recognized text cannot yet be searched in full.",
  readingTitle:"Original texts and translations",
  readingText:"Read and compare passages of De architectura in Latin and available editorial translations, with book and chapter references.",
  codexTitle:"Manuscripts and codices",
  codexText:"Explore manuscript witnesses, shelfmarks and links to holding libraries and documented digital viewers.",
  booksTitle:"Authors, works and bibliography",
  booksText:"Consult Greek and Latin works, historical editions and linked research resources.",
  tryTitle:"Start with a search:"
 },
 fr:{
  kicker:"UN INSTRUMENT DE RECHERCHE OUVERT",
  headline:"Relier les textes anciens à la recherche contemporaine",
  intro:"Vitruvia est l'outil de recherche de Vitruvius Digital Library, un projet éditorial indépendant consacré aux textes classiques, aux traités d'architecture, aux manuscrits anciens et à la bibliographie savante.",
  purpose:"Son objectif dépasse la recherche de mots : relier les auteurs et les œuvres aux témoins manuscrits, aux éditions historiques, aux passages originaux et aux traductions disponibles, lorsque leurs sources sont identifiables.",
  methodTitle:"Comment chercher",
  methodBody:"Saisissez un auteur, une œuvre, un terme latin ou grec, un lieu, un manuscrit ou une question. Les documents locaux et les catalogues institutionnels sont distingués ; une notice ne signifie pas que le texte intégral a été consulté.",
  scope:"La recherche par IA est expérimentale et limitée aux documents effectivement indexés. Les fac-similés numérisés sans texte reconnu ne sont pas encore intégralement consultables par recherche.",
  readingTitle:"Textes originaux et traductions",
  readingText:"Lire et comparer des passages du De architectura en latin et dans les traductions éditoriales disponibles, avec références aux livres et chapitres.",
  codexTitle:"Manuscrits et codex",
  codexText:"Explorer les témoins manuscrits, cotes et liens vers les bibliothèques de conservation et leurs visionneuses numériques.",
  booksTitle:"Auteurs, œuvres et bibliographie",
  booksText:"Consulter les œuvres grecques et latines, les éditions historiques et les ressources bibliographiques associées.",
  tryTitle:"Pour commencer :"
 }
};
const T=()=>I18N[S.lang]||I18N.es;
function related(q){const set=new Set(words(q));const n=norm(q);for(const [key,terms] of Object.entries(lex))if(n.includes(key)||words(terms).some(w=>n.includes(w)))for(const w of words(terms))set.add(w);return [...set].slice(0,48)}
/* Word-aware ranking: "auto" must not match "autor"; phrase matches outrank loose terms. */
function hasTerm(hay,term){const h=" "+norm(hay)+" ",t=" "+norm(term)+" ";return !!t.trim()&&h.includes(t)}
function score(s,q,expand=false){
 const txt=norm(s),n=norm(q);if(!n||!txt)return 0;
 const queryWords=words(q),unique=[...new Set(queryWords)];
 let r=hasTerm(txt,n)?35:0;
 const matched=unique.filter(w=>hasTerm(txt,w));
 if(unique.length>1&&matched.length===unique.length)r+=14;
 for(const word of matched)r+=word.length>=5?7:4;
 if(expand){for(const w of related(q))if(!unique.includes(w)&&hasTerm(txt,w))r+=1.25}
 return r;
}
const verified=w=>["lectura-local-completa","lectura-local-parcial"].includes(w.publicStatus)&&!!(w.localReader?.verified||w.pdf?.url||w.localHtml||w.localVersions?.length);
const libraryURL=(id,view,ms)=>"bibliotheca-graeca-latina.html?"+new URLSearchParams({work:id,...(view?{view}:{}),...(ms?{ms}:{})});
const workString=w=>[w.title,w.author,w.genre,w.dating,w.language,...(w.aliases||[])].join(" ");
const witnessesFor=id=>S.witnesses.filter(ms=>(ms.workIds||[]).includes(id));
const editionsFor=id=>S.editions.filter(ed=>ed.workId===id);
/* Chronological manuscript ordering: known dates before undated witnesses.
   Century estimates remain estimates; no manuscript is labeled an autograph. */
function codexDateStart(date){
 const raw=norm(date||"");
 const match=raw.match(/(?:^|\s)(\d{3,4})\s*(?:[–-]\s*\d{3,4})?/);
 if(match)return Number(match[1]);
 const roman={"i":1,"ii":2,"iii":3,"iv":4,"v":5,"vi":6,"vii":7,"viii":8,"ix":9,"x":10,"xi":11,"xii":12,"xiii":13,"xiv":14,"xv":15,"xvi":16,"xvii":17,"xviii":18,"xix":19,"xx":20};
 const century=raw.match(/(?:siglos?|century|siecle|sec)\s+([ivx]+)/);
 if(century&&roman[century[1]])return (roman[century[1]]-1)*100;
 return 9999;
}
function matchingWorkIds(q){
 const query=norm(topicQuery(q));
 const queryWords=query.split(/\s+/).filter(x=>x.length>=4);
 const found=S.works.filter(w=>{
  const names=[w.title,w.author,...(w.aliases||[])].map(norm);
  return names.some(name=>name===query||name.includes(query)&&query.length>=5)||
   queryWords.length>0&&names.some(name=>queryWords.every(t=>name.split(" ").includes(t)));
 });
 return new Set(found.map(w=>w.id));
}
/* Earliest INDEXED witness with a documented reader for the searched work.
   Source dates refer to extant copies, never to the composition of the work.
   The selection works generically for every work subsequently catalogued. */
function primaryManuscriptFor(query){
 const ids=matchingWorkIds(query);
 if(!ids.size)return null;
 const witnesses=S.witnesses.filter(ms=>(ms.workIds||[]).some(id=>ids.has(id))&&
  (ms.localViewer||ms.viewer||ms.manifest));
 if(!witnesses.length)return null;
 return witnesses.slice().sort((a,b)=>
  codexDateStart(a.date)-codexDateStart(b.date)||
  Number(!!b.localViewer)-Number(!!a.localViewer)||
  String(a.shelfmark||"").localeCompare(String(b.shelfmark||"")))[0];
}
function promotePrimaryManuscript(query){
 const ms=primaryManuscriptFor(query);if(!ms)return;
 S.featureWeight=Number.POSITIVE_INFINITY; // No general Wikipedia result can replace this.
 $("featured-label").textContent=S.lang==="en"?"PRIMARY SOURCE · MANUSCRIPT":S.lang==="fr"?"SOURCE PRIMAIRE · MANUSCRIT":"FUENTE PRIMARIA · MANUSCRITO";
 $("featured-title").textContent=ms.title||ms.shelfmark;
 $("featured-description").textContent=[
  ms.shelfmark,ms.date,ms.library,
  ms.localFolioCount?ms.localFolioCount+" imágenes en la biblioteca":""
 ].filter(Boolean).join(" · ");
 $("featured-link").href=ms.localViewer||ms.viewer||ms.record;
 $("featured-link").textContent=ms.localViewer?
  (S.lang==="en"?"Read original folios ›":S.lang==="fr"?"Lire les folios originaux ›":"Leer folios originales ›"):
  (S.lang==="en"?"Open institutional viewer ›":"Abrir visor institucional ›");
 $("featured-credit").textContent=(ms.library||"")+(ms.record?" · Signatura documentada":"");
 highlightFeatured(ms.shelfmark||"");
}

function liveManuscripts(q){
 const out=[],workIds=matchingWorkIds(q);
 // Highlight the oldest INDEXED witness per work, never assert it is the oldest surviving manuscript.
 const earliest=new Map();
 for(const ms of S.witnesses){
  const date=codexDateStart(ms.date);
  for(const id of ms.workIds||[])if(!earliest.has(id)||date<earliest.get(id).date)earliest.set(id,{id:ms.id,date});
 }
 for(const ms of S.witnesses){
  const titles=(ms.workIds||[]).map(id=>S.works.find(w=>w.id===id)).filter(Boolean);
  const description=[ms.title,ms.shelfmark,ms.library,ms.date,ms.coverage,...titles.flatMap(w=>[w.title,w.author,...(w.aliases||[])])].join(" ");
  const belongs=(ms.workIds||[]).some(id=>workIds.has(id));
  const rating=score(description,q,false)+(belongs?80:0),nameRating=score(ms.title+" "+ms.shelfmark,q,false);
  if(rating<3)continue;
  const target=titles.find(w=>workIds.has(w.id))||titles[0];
  const exact=norm(ms.shelfmark)===norm(q)||norm(ms.title)===norm(q);
  const primary=belongs&&(ms.workIds||[]).some(id=>earliest.get(id)?.id===ms.id);
  out.push({type:"manuscript",workIds:ms.workIds||[],title:ms.title+" · "+ms.shelfmark,author:ms.library,excerpt:ms.coverage,
   meta:"TESTIMONIO MANUSCRITO · "+(ms.date||"sin fecha documentada")+" · "+(ms.shelfmark||"sin signatura")+" · "+(ms.manifest?"IIIF":"visor institucional"),
   codexDate:ms.dateStart??codexDateStart(ms.date),codexShelfmark:ms.shelfmark,codexRepository:ms.library,
   primaryWitness:primary,primaryLabel:primary?"TESTIMONIO MÁS ANTIGUO INDEXADO · "+(target?.title||"obra documentada"):"",
   rating:Math.max(rating,nameRating)+(exact?350:nameRating>15?55:0),
   link:target?libraryURL(target.id,"manuscript",ms.id):ms.record,
   viewerUrl:ms.localViewer||ms.viewer||ms.record,
   localViewer:ms.localViewer||null,
   localFolioCount:ms.localFolioCount||null,
   localFolioStart:ms.localFolioStart||null,
   iiifManifest:ms.manifest||null,
   codexViewer:ms.localViewer||(ms.manifest?"visor-codex.html?"+new URLSearchParams({manifest:ms.manifest,title:ms.title,official:ms.viewer||ms.record,...(ms.startFolio?{folio:ms.startFolio}:{})}).toString():(ms.viewer||ms.record||null)),
   citationText:[ms.library,ms.shelfmark,ms.title,ms.date,ms.record].filter(Boolean).join(". "),
   links:[ms.localViewer?{label:"Leer folio a folio · biblioteca local",url:ms.localViewer}:null,
     {label:"Ficha codicológica institucional",url:ms.record},
     {label:"Visor oficial de la institución",url:ms.viewer}].filter(x=>x?.url),
   source:ms.localViewer?"Vitruvius Digital Library · fotos locales; British Library · custodia":"Bibliotheca Graeca et Latina"});
 }
 return out.sort((a,b)=>Number(!!b.primaryWitness)-Number(!!a.primaryWitness)||a.codexDate-b.codexDate||b.rating-a.rating).slice(0,30);
}


/* Vetted institutional records: same pipeline for ALL indexed works, no fake manuscript claims. */
function currentAuthorityFor(query){
 const q=norm(topicQuery(query));
 return S.currentAuthorities.find(a=>(a.queries||[]).some(t=>norm(t)===q))||null;
}
function academicRows(query){
 const ids=matchingWorkIds(String(query||"").replace(/^(la|el|the)\s+/i,""));
 if(!ids.size)return [];
 const records=S.academicRecords.filter(r=>(r.workIds||[]).some(id=>ids.has(id)));
 return records.map(r=>{
  const manuscript=r.kind==="codex",fragment=r.kind==="papyrus",edition=["edition","translation"].includes(r.kind);
  const extra=[r.date,r.shelfmark,r.language,r.source].filter(Boolean).join(" · ");
  const title=r.title;
  return {type:manuscript?"manuscript":fragment?"fragment":edition?"edition":r.kind,
   title,author:r.library||r.editor||r.source,excerpt:r.coverage||"",
   meta:extra,recordKind:r.kind,curatedAcademic:true,
   codexDate:Number.isFinite(r.dateStart)?r.dateStart:9999,
   codexShelfmark:r.shelfmark||"",codexRepository:r.library||"",
   primaryWitness:!!r.highlight,primaryLabel:r.highlight||"",
   editionYear:Number.isFinite(r.year)?r.year:9999,
   rating:r.highlight?4000:manuscript?1800:fragment?1500:r.kind==="university"?1250:r.kind==="scholar"?1200:1100,
   link:r.url,viewerUrl:manuscript?(r.viewer||r.url):null,
   links:[r.institutionUrl?{label:"Institución custodiante",url:r.institutionUrl}:null,
          r.viewer?{label:"Digitalización institucional",url:r.viewer}:null].filter(Boolean),
   source:r.source||"Institución académica",verifiedAsOf:"2026-11-04"};
 });
}
function authorityRows(query){
 const record=currentAuthorityFor(query);if(!record)return [];
 return [{type:"authority",title:record.title,author:record.source,
  excerpt:record.description+" · Comprobado en la fuente oficial el "+record.verifiedAsOf+".",
  meta:"AUTORIDAD VIGENTE · consulta ambigua resuelta por fuente oficial; otras figuras históricas se conservan.",
  rating:5000,link:record.url,source:record.source,curatedAcademic:true,
  links:[{label:"Biografía oficial",url:record.biography}]}];
}

function liveEditions(q){
 const out=[];
 for(const ed of S.editions){
  const w=S.works.find(x=>x.id===ed.workId);if(!w)continue;
  const rating=score([ed.title,ed.editor,ed.year,ed.provider,w.author,w.title,...(w.aliases||[])].join(" "),q,false);
  if(rating<4)continue;
  const pdf=ed.url&&/^documents\/(?:classics\/)?[a-z0-9-]+\.pdf$/i.test(ed.url)?ed.url:null;
  out.push({type:"edition",title:ed.title,author:ed.editor+" · "+ed.year,excerpt:ed.note,
   meta:(pdf?"PDF LOCAL · ":"EDICIÓN DOCUMENTADA · ")+(ed.langs||[]).join("/"),
   rating:rating+(pdf?4:0),link:ed.url||libraryURL(w.id,pdf?"pdf":""),pdf,source:ed.provider,
   historicalEdition:Number.parseInt(ed.year,10)<2000,editionYear:Number.parseInt(ed.year,10)||9999,
   links:ed.url?[{label:"Abrir edición o traducción documentada",url:ed.url}]:[]});
 }return out.sort((a,b)=>b.rating-a.rating).slice(0,12);
}
/* Bibliographic chronology from the site's actual historical-editions catalogue.
   Printed editions are not manuscripts; translations are not necessarily critical editions. */
function liveHistoricalEditions(q){
 const query=norm(topicQuery(q));
 const vitruvian=/\\b(vitruvio|vitruvius|vitruve|vitruvii|de architectura|krohn|bude|budé|rose|giocondo|barbaro|cesariano)\\b/i.test(query);
 if(!vitruvian)return [];
 const result=S.historical.map(entry=>{
  const year=Number.parseInt(entry.year,10)||9999;
  const isTranslation=/traduc|tradutt|traduit|translation|traducci/i.test([entry.subtitle,entry.description].join(" "));
  const kind=isTranslation?"Traducción histórica":"Edición histórica / texto crítico";
  const link=entry.read_url||entry.source_url||"";
  if(!/^https:\/\//.test(link))return null;
  return {type:"edition",historicalEdition:true,editionYear:year,
   title:entry.title,author:[entry.author,entry.year].filter(Boolean).join(" · "),
   excerpt:[entry.subtitle,entry.publisher].filter(Boolean).join(" · "),
   meta:kind+" · "+entry.year+" · "+(entry.publisher||"Catálogo histórico"),
   link,source:"Catálogo de ediciones históricas · Vitruvia",
   rating:24+(score([entry.title,entry.author,entry.subtitle].join(" "),q,false)||0),
   links:[{label:"Abrir edición histórica · institución",url:link}]};
 }).filter(Boolean);
 // Budé is documented bibliographically; no direct digitized volume is asserted.
 if(/\\b(bude|budé|vitruvio|vitruvius|vitruve)\\b/i.test(query)){
  result.push({type:"edition",historicalEdition:true,editionYear:1969,
   title:"Collection des Universités de France · Budé · De architectura",
   author:"Les Belles Lettres · colección Budé · varios volúmenes",
   excerpt:"Ediciones críticas y traducciones francesas publicadas por libros; verificar volumen, editor y año específico.",
   meta:"Colección académica · no consta visor digital local acreditado",
   link:"https://www.google.com/search?q="+encodeURIComponent("site:lesbelleslettres.com Vitruve De l'architecture Collection des Universités de France"),
   source:"Referencia bibliográfica · consultar catálogo editorial",rating:24,
   links:[{label:"Localizar volumen en la editorial",url:"https://www.google.com/search?q="+encodeURIComponent("site:lesbelleslettres.com Vitruve De l'architecture Collection des Universités de France")}]});
 }
 return result.sort((a,b)=>a.editionYear-b.editionYear||b.rating-a.rating);
}
const bookLinks={
 vitruvius:"lector-bilingue.html?edition=recensio-es",
 "cicero-officiis":"bibliotheca-graeca-latina.html?work=cicero-officiis",
 lucretius:"bibliotheca-graeca-latina.html?work=lucretius",
 "vitruvio-v514-pdf":"documents/edicion-v514.html",
 "vitruvio-v554-pdf":"documents/edicion-v554.html",
 "theory-v297-pdf":"documents/edicion-v297.html",
 "krohn-1912-pdf":"documents/krohn-1912.pdf"
};
const pdfs={"vitruvio-v514-pdf":"documents/kurilo-recensio-es.pdf","vitruvio-v554-pdf":"documents/kurilo-recensio-fr.pdf","theory-v297-pdf":"documents/kurilo-theory-en.pdf","krohn-1912-pdf":"documents/krohn-1912.pdf"};
function identifyHistoricalPerson(query){
 const value=norm(query).replace(/^(?:biografia|biography|biographie|vida y obra de|vida de|quien fue|quien era|who was|qui etait)\s+(?:de\s+)?/,"").trim();
 if(!value||value.length<3||value.length>80)return null;
 const matches=[];
 for(const person of S.people){
  const names=[person.name,...(person.aliases||[]),...(person.latin_forms||[])];
  if(person.id==="cicero")names.push("Cicerón","Cicero","Marco Tulio Cicerón","Marcus Tullius Cicero","Cicéron");
  if(names.some(name=>norm(name)===value)){matches.push(person)}
 }
 if(matches.length)return matches.sort((a,b)=>(a.name||"").length-(b.name||"").length)[0];
 const authors=S.works.map(w=>w.author).filter(Boolean);
 for(const author of authors){
  const short=author.replace(/\s*\([^)]*\).*/,"").replace(/^(.+?)\s*[·,].*$/,"$1").trim();
  if(norm(short)===value||(/^[a-zá-ú]{5,}$/i.test(query.trim())&&norm(short).split(" ").includes(value)))
   return {id:"author-"+value,name:short,aliases:[short],source:"Bibliotheca Graeca et Latina"};
 }
 return null;
}
function liveBooks(q,concept){return S.works.map(w=>{
 const rating=score(workString(w),q,concept);
 const witnesses=witnessesFor(w.id),editions=editionsFor(w.id),local=verified(w);
 const pdf=w.pdf?.url&&/^documents\/(?:classics\/)?[a-z0-9-]+\.pdf$/i.test(w.pdf.url)?w.pdf.url:null;
 const extras=[];
 if(witnesses.length)extras.push({label:"Ver códice(s)",url:libraryURL(w.id,"manuscript",witnesses[0].id)});
 const localWitness=witnesses.find(ms=>ms.localViewer);
 if(localWitness)extras.unshift({label:"Leer "+localWitness.shelfmark+" · "+localWitness.localFolioCount+" imágenes",url:localWitness.localViewer});
 if(w.id==="vitruvius")extras.unshift({label:"Leer latín y traducciones · lector de Vitruvio",url:"lector-bilingue.html"});
 if(w.localHtml&&/^(?:corpus|documents)\/[a-z0-9/_-]+\.html$/i.test(w.localHtml))
  extras.unshift({label:"Leer texto incorporado al sitio",url:w.localHtml});
 for(const v of (w.localVersions||[]).filter(v=>/^(?:corpus|documents)\/[a-z0-9/_-]+\.html$/i.test(v.path||"")).slice(0,3))
  extras.push({label:v.label||("Lectura en "+v.language),url:v.path});
 if(pdf)extras.push({label:w.pdf?.language==="grc"?"PDF · griego original":w.pdf?.language==="la"?"PDF · latín original":"Visor PDF",url:libraryURL(w.id,"pdf")});
 for(const v of (w.pdfEditions||[]).filter(v=>v.url!==pdf&&/^documents\/(?:classics\/)?[a-z0-9-]+\.pdf$/i.test(v.url||"")).slice(0,2)){
  const label=v.language==="en"?"Traducción inglesa · PDF":v.language==="es"?"Castellano · PDF":v.language==="la"?"Latín · PDF":"Griego · PDF";
  extras.push({label,url:libraryURL(w.id,"pdf")+"&pdf="+encodeURIComponent(v.url)});
 }
 if(w.reading?.url&&/^https:\/\//.test(w.reading.url))extras.push({label:"Fuente de lectura",url:w.reading.url});
 const status=w.publicStatus==="lectura-local-parcial"?"PDF parcial · obra no íntegra":
  pdf?(w.pdf?.language==="grc"?"Texto original en griego · PDF":w.pdf?.language==="la"?"Texto original en latín · PDF":"Edición histórica · PDF"):
  local?"Texto local acreditado":witnesses.length?"Códice identificado · institución de custodia":
  w.reading?.url?"Texto externo identificado":editions.length?"Edición vinculada · revisar acceso":"Ficha bibliográfica · edición pendiente";
 const originalReadings=[];
 const readPaths=new Set();
 const addOriginal=(url,kind,editionLabel)=>{
  if(!url||readPaths.has(url))return;
  // Only catalogue-verified local transcription/PDF or an explicit text source.
  if(!/^(?:corpus|documents)\/[a-z0-9_\/.-]+\.(?:html|pdf)(?:\?.*)?$/i.test(url)
      &&!/^bibliotheca-graeca-latina\.html\?work=[a-z0-9_-]+/i.test(url)
      &&!/^https:\/\/[a-z0-9.-]+\/.+/i.test(url))return;
  readPaths.add(url);originalReadings.push({url,kind,label:editionLabel||"",language:w.language});
 };
 for(const version of w.localVersions||[]){
  if(version.language!==w.language||version.kind==="translation"||version.kind==="adaptation")continue;
  addOriginal(version.path,"text",version.label);
 }
 if(w.localHtml)addOriginal(w.localHtml,"text","Transcripción original · lectura en Vitruvia");
 if(w.pdf?.url&&(w.pdf.role==="original"||w.pdf.language===w.language)){
  addOriginal(libraryURL(w.id,"pdf"),"pdf","Edición histórica · facsímil PDF");
 }
 if(!originalReadings.length&&w.localReader?.verified)addOriginal(libraryURL(w.id,"text"),"reader","Texto original · lector del sitio");
 if(!originalReadings.length&&w.reading?.url)addOriginal(w.reading.url,"external","Edición original · fuente identificada");
 return {type:"book",workId:w.id,originalReadings,originalLanguage:w.language,originalEditionStatus:w.publicStatus,catalogueReadings:[...(w.localVersions||[]).filter(v=>v.kind==="translation").map(v=>({title:v.label,url:v.path,note:w.bibliography?.editionCitation||w.localEdition?.source||"",kind:"translation",year:w.localEdition?.year,fulltext:true})),...editions.filter(e=>(e.langs||[]).some(l=>l!==w.language)).map(e=>({title:e.title,url:e.url,note:[e.editor,e.year,e.provider,e.note].filter(Boolean).join(" · "),kind:"translation",year:e.year,fulltext:e.type!=="academic-translation-catalogue"}))],title:w.title,author:w.author,aliases:w.aliases||[],excerpt:[w.genre,w.dating,status].filter(Boolean).join(" · "),
  meta:"BIBLIOTHECA GRAECA ET LATINA · "+(w.language==="grc"?"GRIEGO":"LATÍN"),
  baseRating:rating,rating:rating+(local?4:0)+(witnesses.length?3:0),link:libraryURL(w.id),pdf,
  links:extras,readable:local,source:"Bibliotheca Graeca et Latina",
  citationText:w.bibliography?.editionCitation||"",
  localHosted:!!(w.localReader?.verified||w.localHtml||w.localVersions?.length||pdf||localWitness)};
 }).filter(x=>x.baseRating>2).sort((a,b)=>b.rating-a.rating).slice(0,90)} // la bonificación por texto local o códice no basta sin coincidencia real

function livePages(q,concept){return S.pages.map(p=>({type:"section",title:p.title,excerpt:p.description,meta:"Documento HTML · GitHub Pages",rating:score(p.title+" "+p.description+" "+p.path,q,concept),link:p.path})).filter(x=>x.rating>2)}
async function fetchJSON(url,ms=12500){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);try{const r=await fetch(url,{signal:controller.signal,headers:{"Accept":"application/json"}});if(!r.ok)throw Error("HTTP "+r.status+" · "+new URL(url).host);const d=await r.json();if(d.error)throw Error(d.error.info||d.error.code);return d}finally{clearTimeout(timer)}}
async function load(){try{
 const urls=["data/bibliotheca-graeca-latina-I-bce-I-ce.json?v=20261104-nota-v1","data/witruvia-pages.json","data/bibliotheca-testimonia-verified.json?v=20261104-readings-v1","data/onomasticon-vitruvianum.json","data/catalog-completo.json","data/vitruvia-academic-authorities.json"];
 const results=await Promise.allSettled(urls.map(u=>fetchJSON(u)));
 const books=results[0].status==="fulfilled"?results[0].value:{works:[]},pages=results[1].status==="fulfilled"?results[1].value:{pages:[]},testimonia=results[2].status==="fulfilled"?results[2].value:{records:[],editions:[]};
 S.works=(books.works||[]).filter(w=>w.id&&w.title);S.pages=pages.pages||[];
 S.witnesses=testimonia.records||[];S.editions=testimonia.editions||[];S.historical=results[4]?.status==="fulfilled"&&Array.isArray(results[4].value)?results[4].value.filter(x=>x.category==="historical"):[];S.people=results[3].status==="fulfilled"?(results[3].value.entities||[]).filter(x=>x.kind==="person"):[];S.academicRecords=results[5]?.status==="fulfilled"?(results[5].value.records||[]):[];
 S.currentAuthorities=results[5]?.status==="fulfilled"?(results[5].value.currentAuthorities||[]):[];S.ready=true;
 (typeof window!=="undefined"?window.VitruviaUnderstand:null)?.setVocabulary([...S.works.flatMap(w=>[w.title,w.author,...(w.aliases||[])]),...S.witnesses.map(w=>w.title),...(S.people||[]).flatMap(p=>[p.name,p.label,...(p.aliases||[])]),
  "Vitruvio","Vitruvius","Palladio","Alberti","Serlio","Vignola","Cesariano","Giocondo","Barbaro","Sulpizio","Perrault","Piranesi","Leonardo","Miguel Ángel","Brunelleschi","Bramante","Le Corbusier","Gaudí","Wright","Mies","Gropius","Niemeyer","Fuller","Borromini","Bernini","Augusto","Julio César","Cicerón","Lucrecio","Virgilio","Homero","Platón","Aristóteles","Teofrasto","Epicteto","Plinio","Frontino","Arquímedes","Euclides","Ptolomeo","Herón","Ctesibio"]);
 $("metric-works").textContent=S.works.length;$("metric-pages").textContent=S.pages.length;$("metric-read").textContent=S.works.filter(verified).length;
 const mw=$("metric-witnesses"),me=$("metric-editions");
 if(mw)mw.textContent=S.witnesses.length;if(me)me.textContent=S.editions.length;
 if(!document.body.classList.contains("vitruvia-reading")){
  $("result-state").textContent=S.works.length+" obras · "+S.witnesses.length+" códices · "+S.editions.length+" ediciones y "+S.pages.length+" secciones documentales";
  const unavailable=results.flatMap((r,i)=>r.status==="rejected"?[urls[i]]:[]);
  if(unavailable.length)$("result-state").textContent+=" · "+unavailable.length+" índices no disponibles";
 }
 }catch(e){$("result-state").textContent="Índice de la biblioteca no disponible: "+e.message}}

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
 const p=new URLSearchParams({action:"query",list:"search",srsearch:q,srlimit:"15",srprop:"snippet|wordcount",format:"json",utf8:"1",origin:"*"});
 const d=await fetchJSON("https://"+lang+".wikipedia.org/w/api.php?"+p);
 const found=(d.query?.search||[]).filter(w=>Number.isInteger(w.pageid)&&w.pageid>0);
 let pictures={};
 if(found.length){
  const picturesParams=new URLSearchParams({action:"query",prop:"pageimages",pageids:found.map(x=>x.pageid).join("|"),piprop:"thumbnail|name",pithumbsize:"720",format:"json",origin:"*"});
  const photos=await fetchJSON("https://"+lang+".wikipedia.org/w/api.php?"+picturesParams,2000).catch(()=>null);
  pictures=photos?.query?.pages||{};
 }
 return found.map((w,i)=>{
  const photo=pictures[w.pageid],name=photo?.pageimage;
  const image=photo?.thumbnail?.source;
  const picturePage=name?"https://"+lang+".wikipedia.org/wiki/File:"+encodeURIComponent(name.replace(/ /g,"_")):null;
  return {type:"wikipedia",title:w.title,author:"Wikipedia · "+lang.toUpperCase(),excerpt:brief(htmlText(w.snippet),260),meta:"Artículo enciclopédico · Wikimedia",rating:42-i*2+culturalWeight(w.title,w.snippet),link:"https://"+lang+".wikipedia.org/?curid="+w.pageid,source:"Wikipedia ("+lang.toUpperCase()+")",image,imageRights:picturePage,imageCredit:"Wikipedia / Wikimedia Commons · consultar autor y licencia",imageKind:"documentary",pageid:w.pageid,wikiLang:lang};
 })
}
async function wikidata(generalQuery){
 const p=new URLSearchParams({action:"wbsearchentities",search:generalQuery,language:S.lang,uselang:S.lang,type:"item",limit:"6",format:"json",origin:"*"});
 const d=await fetchJSON("https://www.wikidata.org/w/api.php?"+p);
 return (d.search||[]).map((x,i)=>({type:"wikidata",title:x.label||x.id,excerpt:x.description||"Identificador de entidad · Wikidata",author:x.id,meta:"Datos enlazados · Wikimedia",rating:30-i+culturalWeight(x.label,x.description),link:"https://www.wikidata.org/wiki/"+x.id,source:"Wikidata"}))
}
async function openLibrary(generalQuery){
 const p=new URLSearchParams({q:generalQuery,limit:"25",fields:"key,title,author_name,first_publish_year,edition_count,has_fulltext,public_scan_b,cover_i,publisher"});
 const d=await fetchJSON("https://openlibrary.org/search.json?"+p);
 return (d.docs||[]).filter(x=>/^\/works\/OL\d+W$/.test(x.key||"")).map((x,i)=>({type:"openlibrary",title:x.title||"Libro sin título",author:(x.author_name||[]).slice(0,2).join(", "),excerpt:"Primera publicación registrada: "+(x.first_publish_year||"sin datos")+" · "+(x.edition_count||0)+" ediciones catalogadas. Consultar disponibilidad de lectura en Open Library.",meta:"Catálogo externo · disponibilidad sujeta al proveedor",rating:27-i+culturalWeight(x.title,(x.author_name||[]).join(" ")),link:"https://openlibrary.org"+x.key,source:"Open Library",editionCount:Number(x.edition_count)||0,year:x.first_publish_year||null,publisher:(x.publisher||[])[0]||"",recordKind:"work",image:Number.isInteger(x.cover_i)?"https://covers.openlibrary.org/b/id/"+x.cover_i+"-L.jpg":null,imageRights:"https://openlibrary.org"+x.key,imageCredit:"Open Library · derechos de portada según ficha",imageKind:"book"}))
}
/* Google Books public volume metadata, not Google AI / Google Search results. */
async function googleBooks(generalQuery){
 const params=new URLSearchParams({q:generalQuery,maxResults:"8",printType:"books"});
 const d=await fetchJSON("https://www.googleapis.com/books/v1/volumes?"+params,11000);
 return (d.items||[]).filter(item=>item.volumeInfo?.title&&item.volumeInfo?.infoLink).map((item,i)=>{
  const v=item.volumeInfo;const info=String(v.infoLink||"");
  if(!/^https:\/\//i.test(info))return null;
  return {type:"googlebook",title:v.title,author:(v.authors||[]).slice(0,3).join(", "),
   excerpt:brief(htmlText(v.description||""),340)||[v.publisher,v.publishedDate].filter(Boolean).join(" · "),
   meta:[v.publisher,v.publishedDate].filter(Boolean).join(" · ")||"Google Books · registro bibliográfico",
   rating:24-i+culturalWeight(v.title,v.subtitle||""),link:info,source:"Google Books",year:v.publishedDate||null,publisher:v.publisher||"",recordKind:"book",
   isbn:(v.industryIdentifiers||[]).find(x=>x.type==="ISBN_13")?.identifier||(v.industryIdentifiers||[]).find(x=>x.type==="ISBN_10")?.identifier||null};
 }).filter(Boolean)
}

async function museum(generalQuery){
 const params=new URLSearchParams({q:generalQuery,hasImages:"true"});
 const d=await fetchJSON("https://collectionapi.metmuseum.org/public/collection/v1/search?"+params,12500);
 const ids=(d.objectIDs||[]).slice(0,3);
 const details=await Promise.allSettled(ids.map(id=>fetchJSON("https://collectionapi.metmuseum.org/public/collection/v1/objects/"+id,9000)));
 return details.filter(x=>x.status==="fulfilled").map((x,i)=>{const o=x.value;return {type:"museum",title:o.title||"Objeto de museo",author:[o.artistDisplayName,o.objectDate].filter(Boolean).join(" · "),excerpt:[o.culture,o.period,o.medium,o.department].filter(Boolean).join(" · "),meta:"Colección del Metropolitan Museum of Art",rating:29-i+culturalWeight(o.title,o.department),link:o.objectURL||"https://www.metmuseum.org",source:"The Met",year:o.objectBeginDate||null,recordKind:"museum-object",image:o.primaryImageSmall||o.primaryImage||null,imageRights:o.objectURL||"https://www.metmuseum.org",imageCredit:"The Metropolitan Museum of Art · verificar licencia de la obra",imageKind:"artwork"}});
}

/* Distinción académica: resultados de revistas y ciencias no se presentan como texto íntegro salvo enlace de acceso. */
async function crossref(generalQuery){
 const params=new URLSearchParams({query:generalQuery,rows:"12",select:"DOI,title,author,published,issued,type,publisher,URL,container-title,volume,issue,page"});
 const d=await fetchJSON("https://api.crossref.org/works?"+params,12000);
 const items=d.message?.items||[];
 return items.filter(x=>x.DOI&&Array.isArray(x.title)&&x.title[0]).map((x,i)=>{
  const date=(x.published?.["date-parts"]||x.issued?.["date-parts"]||[])[0]||[];
  const author=(x.author||[]).slice(0,2).map(y=>[y.given,y.family].filter(Boolean).join(" ")).join(", ");
  return {type:"article",title:x.title[0],author:author||x.publisher||"",excerpt:[x["container-title"]?.[0],date[0],x.type].filter(Boolean).join(" · ")+" · Registro bibliográfico con DOI: "+x.DOI,
   meta:"Crossref · DOI verificado en el registro · acceso al texto según editor",rating:26-i+culturalWeight(x.title[0],x["container-title"]?.[0]||""),
   link:"https://doi.org/"+encodeURIComponent(x.DOI),source:"Crossref",year:date[0]||null,publisher:x.publisher||"",journal:x["container-title"]?.[0]||"",volume:x.volume||"",issue:x.issue||"",pages:x.page||"",doi:x.DOI,recordKind:x.type||"journal-article"};
 })
}
/* OpenAlex: índice abierto de obras académicas (CORS abierto, sin clave). */
async function openAlex(generalQuery){
 const params=new URLSearchParams({search:generalQuery,"per-page":"10",select:"id,doi,title,publication_year,authorships,primary_location,type,open_access,cited_by_count"});
 const d=await fetchJSON("https://api.openalex.org/works?"+params,12000);
 return (d.results||[]).filter(x=>x.title).map((x,i)=>{
  const author=(x.authorships||[]).slice(0,2).map(a=>a.author?.display_name).filter(Boolean).join(", ");
  const venue=x.primary_location?.source?.display_name||"";
  const oa=x.open_access?.is_oa?" · acceso abierto":"";
  return {type:"article",title:x.title,author,excerpt:[venue,x.publication_year,x.type].filter(Boolean).join(" · ")+(x.cited_by_count?" · citado "+x.cited_by_count+" veces":"")+oa,
   meta:"OpenAlex · índice académico abierto"+(x.doi?" · DOI":""),rating:24-i+culturalWeight(x.title,venue),
   link:x.doi||x.open_access?.oa_url||x.id,source:"OpenAlex",year:x.publication_year||null,journal:venue,doi:(x.doi||"").replace(/^https:\/\/doi.org\//,""),recordKind:x.type||"article"};
 });
}
/* Getty AAT: término normalizado del tesauro de arte y arquitectura (SPARQL público). */
async function gettyAat(generalQuery){
 const term=String(generalQuery||"").trim().replace(/["\\]/g,"");if(!term||term.split(/\s+/).length>4)return[];
 const sparql=`select ?s ?label ?scope where { ?s a skos:Concept; skos:inScheme aat: ; luc:term "${term}"; gvp:prefLabelGVP/xl:literalForm ?label . optional { ?s skos:scopeNote/rdf:value ?scope . filter(lang(?scope)="en") } } limit 5`;
 const d=await fetchJSON("https://vocab.getty.edu/sparql.json?"+new URLSearchParams({query:sparql}),9000);
 return (d.results?.bindings||[]).map((b,i)=>({type:"topic",title:b.label?.value||term,author:"Getty Art & Architecture Thesaurus",
  excerpt:(b.scope?.value||"Término normalizado del tesauro AAT.").slice(0,320),meta:"GETTY AAT · VOCABULARIO CONTROLADO (ODC-By)",rating:40-i,
  link:b.s?.value||"https://www.getty.edu/research/tools/vocabularies/aat/",source:"Getty AAT"}));
}
async function europePmc(generalQuery){
 const params=new URLSearchParams({query:generalQuery,format:"json",pageSize:"6",resultType:"core"});
 const d=await fetchJSON("https://www.ebi.ac.uk/europepmc/webservices/rest/search?"+params,12000);
 return (d.resultList?.result||[]).filter(x=>x.title&&(x.pmid||x.pmcid||x.doi)).map((x,i)=>{
  const journal=x.journalTitle||"",isOpen=x.isOpenAccess==="Y"||x.isOpenAccess===true;
  const link=x.pmcid?"https://europepmc.org/articles/"+encodeURIComponent(x.pmcid):
    x.pmid?"https://europepmc.org/article/MED/"+encodeURIComponent(x.pmid):
    "https://doi.org/"+encodeURIComponent(x.doi);
  return {type:"article",title:x.title,author:x.authorString||"",excerpt:[x.pubYear,journal,x.journalInfo?.journalIssueId].filter(Boolean).join(" · ")+". "+brief(x.abstractText||"",180),
   meta:"Europe PMC · "+(isOpen?"acceso abierto indicado por el proveedor":"comprobar acceso al artículo"),rating:28-i+culturalWeight(x.title,x.abstractText||""),
   link,source:"Europe PMC",year:x.pubYear||null,journal:x.journalTitle||"",doi:x.doi||"",recordKind:"journal-article"}
 })
}
/* Editorial featured column: matches the sourced textual entries; no image/book cover. */
const originalFeature={
 title:"Codex Harleianus",description:"Harley MS 2767. Testimonio carolingio de De architectura, conservado en la British Library.",
 link:"codex-h-folios-local.html?folio=f.1r",credit:"British Library · Harley MS 2767 · 341 fotografías en la biblioteca local",label:"DESTACADO · BIBLIOTECA VITRVVIVS"
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
 window.dispatchEvent(new CustomEvent("vitruvia:featured-result",{detail:{query,row}}));
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
 const card=node("article","result-card"+(d.primaryWitness?" primary-codex-card":"")+(d.historicalEdition?" historical-edition-card":"")),head=node("div","result-head"),title=node("div");
 if(d.primaryWitness){card.setAttribute("aria-label","Testimonio manuscrito destacado: "+d.title);title.append(node("span","primary-codex-label",d.primaryLabel||"Testimonio principal"))}
 const kindLabels={manuscript:"CÓDICE · TESTIMONIO MANUSCRITO",apparatus:"APARATO CRÍTICO · EDICIONES DE DIEGO KURILO",authority:"FUENTE OFICIAL · AUTORIDAD ACTUAL",fragment:"PAPIRO · TESTIMONIO FRAGMENTARIO",university:"UNIVERSIDAD · INVESTIGACIÓN",scholar:"INVESTIGADOR · ESTUDIOS ESPECIALIZADOS"};
 title.append(node("span","kind",T()[d.type]||kindLabels[d.type]||d.type.toUpperCase()),node("h3",null,d.title));head.append(title);card.append(head);
 if(d.author)card.append(node("div","author",d.author));
 if(d.excerpt)card.append(node("p",null,d.excerpt));
 if(d.type==="passage"&&d.latin&&d.translation){
  const bilingual=node("div","passage-bilingual");
  const latin=node("p","passage-latin",d.latin.slice(0,700));
  const translation=node("p","passage-translation",d.translation.slice(0,700));
  bilingual.append(node("div","passage-language","LATÍN"),latin,node("div","passage-language","TRADUCCIÓN"),translation);
  card.append(bilingual);
 }
 if(d.aiEvidence){card.classList.add("ai-evidence-card");card.append(node("div","ai-evidence-label",d.aiSemantic?"Reranking neuronal + texto documentado":"BM25 · búsqueda textual de respaldo"))}
 if(d.meta)card.append(node("div","meta-line",d.meta));
 const acts=node("div","actions");
 if(d.type==="manuscript"&&d.localViewer){
  const open=node("button","codex-local-open",S.lang==="en"?"Read codex here · "+d.localFolioCount+" images":S.lang==="fr"?"Lire le codex ici · "+d.localFolioCount+" images":"Leer códice aquí · "+d.localFolioCount+" imágenes");
  open.type="button";open.addEventListener("click",()=>window.VitruviaLocalManuscripts?.open(d.localViewer,d.title));
  acts.append(open);
 }
 if(d.type==="manuscript"&&(d.codexViewer||d.viewerUrl)){
  const label=d.localViewer?(S.lang==="en"?"Open full folio reader":S.lang==="fr"?"Ouvrir le lecteur de folios":"Abrir lector completo folio a folio"):
   (d.archiveDiscovery&&!d.codexViewer?"Consultar ficha del manuscrito":"Ver códice");
  const viewer=makeLink(label,d.codexViewer||d.viewerUrl);
  if(viewer){viewer.classList.add("codex-viewer-button");if(d.primaryWitness)viewer.classList.add("primary-codex-viewer");acts.append(viewer)}
 }
 if(d.link){const a=makeLink(d.type==="book"&&!d.readable?(S.lang==="en"?"Open bibliographic record":S.lang==="fr"?"Consulter la notice bibliographique":"Consultar ficha bibliográfica"):d.type==="passage"||d.type==="book"||d.type==="manuscript"||d.type==="edition"?T().read:d.type==="section"?T().document:T().source,d.link);if(a)acts.append(a)}
 if(Array.isArray(d.links)){for(const extra of d.links.slice(0,3)){const a=makeLink(extra.label,extra.url);if(a)acts.append(a)}}
 if(d.type==="book"&&!d.link)acts.append(node("span","disabled",T().unpublished));
 if(d.pdf){const a=makeLink(T().pdf,d.pdf);if(a)acts.append(a)}
 if(d.citationText&&navigator.clipboard?.writeText){
  const copy=node("button","citation-copy",S.lang==="en"?"Copy citation":S.lang==="fr"?"Copier la référence":"Copiar cita");
  copy.type="button";copy.addEventListener("click",()=>{
   navigator.clipboard.writeText(d.citationText).then(()=>{
    copy.textContent=S.lang==="en"?"Citation copied":S.lang==="fr"?"Référence copiée":"Cita copiada";
   }).catch(()=>{copy.textContent=S.lang==="en"?"Unable to copy":S.lang==="fr"?"Copie impossible":"No se pudo copiar"});
  });acts.append(copy);
 }
 card.append(acts);return card
}
function synthesize(rows){const box=$("answer");box.replaceChildren();
 const evidence=rows.filter(r=>r.type==="passage"||r.type==="wikipedia"||r.type==="wikidata"||r.type==="museum").slice(0,3);
 if(!evidence.length){box.hidden=true;return}
 box.hidden=false;box.append(node("h3",null,T().synthesis));
 for(const r of evidence){const p=node("p");const l=makeLink(r.title,r.link);if(l)p.append(l,document.createTextNode(": "));p.append(document.createTextNode(brief(r.excerpt,220)));box.append(p)}
 box.append(node("p","detail",T().detail))
}
/* Linguistic query normalization for external retrieval. Internal authority data keeps the original query. */
function topicQuery(q){
 let out=String(q||"").trim();
 const introductions=[
  /^(?:por\s+favor[\s,]*)?(?:busca(?:me)?|buscar|encontra(?:me)?|encontrar|investiga(?:me)?|investigar|explica(?:me)?|explicar|quisiera\s+informaci[oó]n\s+sobre|informaci[oó]n\s+sobre|quiero\s+saber\s+sobre|que\s+sabes\s+sobre|qué\s+sabes\s+sobre|h[aá]blame\s+de)\s+/i,
  /^(?:please\s+)?(?:search\s+for|find|tell\s+me\s+about|information\s+about|explain)\s+/i,
  /^(?:rechercher|chercher|informations?\s+sur|parlez[- ]moi\s+de)\s+/i
 ];
 for(const re of introductions)out=out.replace(re,"");
 out=out.replace(/^[\s:;,.!?]+|[\s:;,.!?]+$/g,"").trim();
 return out.length>=2?out:String(q||"").trim();
}
/* Entity-focused ranking for EVERY query, independent of any list of famous names.
   Full title and all query tokens outrank incidental text matches. */
function queryTokens(value){return [...new Set(words(value).filter(w=>w.length>=3))]}
function rankedTitle(row,query){
 const q=norm(topicQuery(query)).replace(/^(?:biografia de|vida de|quien fue|quien es|who was|what is) /,"").trim();
 const title=norm(row.title||"");
 if(!q||!title)return -100;
 const terms=queryTokens(q),titleTerms=queryTokens(title);
 if(!terms.length)return 0;
 if(title===q)return 1600;
 const aliases=[...(row.aliases||[]),row.entityCanonical||""].map(norm).filter(Boolean);
 if(aliases.includes(q))return 1550;
 const exactCount=terms.filter(t=>titleTerms.includes(t)).length;
 const coverage=exactCount/terms.length;
 if(coverage===1){
  const extra=Math.max(0,titleTerms.length-terms.length);
  return 800-Math.min(450,extra*70);
 }
 if(coverage>=.75)return Math.round(180*coverage);
 if(coverage>=.5)return Math.round(65*coverage);
 return -220;
}
function entityEvidence(row,query){
 const q=norm(topicQuery(query));if(!q)return true;
 const title=norm(row.title||""),author=norm(row.author||""),description=norm(row.excerpt||"");
 const terms=queryTokens(q),titleTokens=queryTokens(title);
 if(!terms.length)return true;
 const allTitle=terms.every(t=>titleTokens.includes(t));
 const aliases=(row.aliases||[]).some(a=>norm(a)===q)||norm(row.entityCanonical||"")===q;
 // Long natural-language searches may also match an appropriate descriptive title.
 if(allTitle||aliases)return true;
 if(row.externalFulltext)return true; // The external full-text provider reports matches inside its indexed text.
 // Documentary corpus, catalogues and primary texts are assessed independently.
 if(["passage","book","edition","manuscript","preface","section"].includes(row.type))return true;
 const coverage=terms.filter(t=>titleTokens.includes(t)).length/terms.length;
 if(coverage<1)return false;
 return !!description||!!author;
}
function authorityWeight(row){
 if(row.type==="wikipedia")return 35;
 if(row.type==="wikidata")return 20;
 if(row.type==="passage")return 25;
 if(row.type==="article"&&row.doi)return 15;
 if(row.type==="manuscript")return 25;
 return 0;
}
function titleMatch(row,query){return rankedTitle(row,query)+authorityWeight(row)}

function display(rows,query,phase){
 // No se eliminan resultados por umbrales de coincidencia en el título:
 // los textos, alias, autores y metadatos documentales también cuentan.
 const scored=rows.filter(r=>r&&r.title).slice().sort((a,b)=>
  ((b.rating||0)+titleMatch(b,query)+(S.mode==="ai"&&b.aiEvidence?2800:0))-
  ((a.rating||0)+titleMatch(a,query)+(S.mode==="ai"&&a.aiEvidence?2800:0)));
 const deduped=[],seen=new Set();
 for(const r of scored){
  const k=r.type+":"+norm(r.title)+":"+(r.type==="wikipedia"?String(r.wikiLang||""):r.type==="passage"?norm(r.edition||r.author||r.meta||""):r.externalFulltext?norm(r.author||""):"");
  if(seen.has(k))continue;
  seen.add(k);deduped.push(r);
 }
 // Homónimos: si la consulta quedó identificada con una entidad (Wikidata), los artículos enciclopédicos
 // de otra acepción no se mezclan en la lista (siguen disponibles en «¿Buscabas otra acepción?»).
 try{const ce=window.VitruviaCurrentEntity,nq=norm(query);
  if(ce&&[ce.query,ce.corrected,ce.label].some(x=>x&&norm(x)===nq)){const lab=norm(ce.label);
   for(let i=deduped.length-1;i>=0;i--){const r=deduped[i];if(!["wikipedia","wikidata"].includes(r.type))continue;
    const t=norm(r.title||""),ex=norm(r.excerpt||"");if(t===lab||t.startsWith(lab+" ")||t.includes(lab)&&ex.includes(norm(ce.description||"").split(" ")[0]||"\u0000"))continue;
    if(!t.includes(lab)||/desambiguaci|disambiguation/.test(t+" "+ex))deduped.splice(i,1)}}}catch{}
 const list=$("result-list");list.replaceChildren();
 const selectedManuscript=["all","site","concept","ai"].includes(S.mode)?primaryManuscriptFor(query):null;
 if(selectedManuscript){
  const witness=liveManuscripts(query).find(r=>r.codexShelfmark===selectedManuscript.shelfmark&&
    r.codexRepository===selectedManuscript.library);
  if(witness){
   const section=node("h3","vitruvia-result-group",
    S.lang==="en"?"PRIMARY DOCUMENT · READ THE EARLIEST INDEXED MANUSCRIPT":
    S.lang==="fr"?"DOCUMENT PRIMAIRE · PREMIER MANUSCRIT RÉPERTORIÉ":
    "FUENTE PRINCIPAL · LEER EL TESTIMONIO MANUSCRITO MÁS ANTIGUO INDEXADO");
   section.setAttribute("data-result-group","primary-witness");
   list.append(section,renderCard({...witness,primaryWitness:true,
    primaryLabel:S.lang==="en"?"EARLIEST CATALOGUED WITNESS WITH VIEWER":
     S.lang==="fr"?"TÉMOIN LE PLUS ANCIEN RÉPERTORIÉ AVEC VISIONNEUSE":
     "TESTIMONIO MÁS ANTIGUO INDEXADO CON VISOR"}));
  }
 }
 // Orden académico estable, sin reiterar filas ni encabezados cuando llegan
 // respuestas de servicios externos en distinto orden.
 const encyclopediaTypes=new Set(["wikipedia","wikidata","topic","authority"]);
 const libraryTypes=new Set(["passage","book","manuscript","edition","preface","section"]);
 const textExternalTypes=new Set(["text-external"]);
 const byGroup=r=>S.mode==="ai"&&r.aiEvidence?"semantic":
  encyclopediaTypes.has(r.type)?"encyclopedia":
  r.type==="university"?"universities":
  r.type==="manuscript"?"manuscripts":
  r.type==="apparatus"?"apparatus":
  r.type==="fragment"?"fragments":
  r.type==="scholar"?"scholars":
  r.type==="edition"?"editions":
  textExternalTypes.has(r.type)?"external-texts":
  libraryTypes.has(r.type)?"library":"research";
 const groupOrder=S.mode==="ai"?
  ["encyclopedia","semantic","universities","manuscripts","apparatus","fragments","editions","scholars","library","external-texts","research"]:
  ["encyclopedia","universities","manuscripts","apparatus","fragments","editions","scholars","library","external-texts","research"];
 // Consulta sin intención codicológica (concepto, autor, lugar): los pasajes, obras y el
 // aparato preceden a los códices. Con signatura, sigla o folio, los códices van primero.
 const codexIntent=(()=>{try{const CQ=window.CodexQuery,cq=CQ&&CQ.parse(query);
  if(cq&&(cq.folios.length||cq.range||cq.image))return true;
  if(window.VitruviaResearchEngine?.classify(query)?.codex)return true;
  return /\b(?:ms|mss|cod|codd|vat|pal|harl(?:ey)?|gud|voss|plut|lat\.|gr\.|grec|latin)\b|\b\d{2,4}\s*[rv]?\b/i.test(query)&&deduped.some(r=>r.type==="manuscript"&&norm(r.title).includes(norm(query).split(/\s+/).find(t=>t.length>2)||"\u0000"))}catch{return false}})();
 // Con un locus explícito (Vitr. 3.1.1, III.1.1), el texto del pasaje precede a su aparato.
 const locusIntent=(()=>{try{return !!window.CodexQuery?.locus?.(query)}catch{return false}})();
 if(locusIntent){const a=groupOrder.indexOf("apparatus"),l=groupOrder.indexOf("library");if(a>=0&&l>a){groupOrder.splice(a,1);groupOrder.splice(groupOrder.indexOf("library")+1,0,"apparatus")}}
 if(!codexIntent){const i=groupOrder.indexOf("manuscripts");if(i>=0){groupOrder.splice(i,1);groupOrder.splice(groupOrder.indexOf("library")+1,0,"manuscripts")}}
 const grouped=new Map(groupOrder.map(g=>[g,[]]));
 for(const r of deduped){
  const group=byGroup(r);
  if(!grouped.has(group))grouped.set(group,[]);
  grouped.get(group).push(r);
 }
 // Para códices, primero el testimonio más antiguo INDEXADO; para ediciones,
 // año ascendente (no se confunde una edición impresa con un manuscrito).
 const msExact=r=>{const t=norm([r.title,r.codexShelfmark].join(" ")),q=norm(query);return q.length>2&&(t.includes(q)||norm(r.codexShelfmark||"")===q)?1:0};
 grouped.get("manuscripts")?.sort((a,b)=>
  msExact(b)-msExact(a)||
  Number(!!b.primaryWitness)-Number(!!a.primaryWitness)||
  (a.codexDate??9999)-(b.codexDate??9999)||b.rating-a.rating);
 grouped.get("editions")?.sort((a,b)=>
  (a.editionYear??9999)-(b.editionYear??9999)||b.rating-a.rating);
 // «Todo»: dos bloques fijos. Primero lo que está en la Biblioteca Vitruviana
 // (enlace interno o visor local), después la web académica; cada grupo conserva
 // su orden propio dentro de su bloque.
 const blockOf=r=>libraryTypes.has(r.type)&&r.type!=="manuscript"&&r.type!=="edition"?"site":
  (r.localViewer||(r.link&&!/^https?:\/\//i.test(r.link)))?"site":"web";
 const siteFirst=S.mode==="all";
 const ordered=siteFirst?
  [...[...grouped.values()].flat().filter(r=>blockOf(r)==="site"),...[...grouped.values()].flat().filter(r=>blockOf(r)==="web")]:
  S.mode==="ai"?[...grouped.values()].flat():deduped;
 const titles=RESULT_TEXT[S.lang]||RESULT_TEXT.es;
 if(!document.getElementById("vitruvia-facet-style")){const st=document.createElement("style");st.id="vitruvia-facet-style";
  st.textContent=".result-facets{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 14px}.result-facet{font:12px/1.3 system-ui,-apple-system,sans-serif;border:1px solid currentColor;border-radius:999px;background:transparent;color:inherit;opacity:.72;padding:5px 11px;cursor:pointer}.result-facet:hover{opacity:1}.result-facet.active{opacity:1;background:#1B2A4A;color:#fff;border-color:#1B2A4A}html[data-theme=dark] .result-facet.active{background:#C9A84C;color:#14120e;border-color:#C9A84C}";
  document.head.append(st)}
 // Facetas: filtrar la lista por tipo de fuente sin perder el orden académico.
 const facetGroups=[...grouped].filter(([,a])=>a.length);
 if(S.facet&&!facetGroups.some(([g])=>g===S.facet))S.facet="";
 if(facetGroups.length>1){
  const bar=node("div","result-facets");bar.setAttribute("role","toolbar");bar.setAttribute("aria-label",S.lang==="en"?"Filter by source type":S.lang==="fr"?"Filtrer par type de source":"Filtrar por tipo de fuente");
  const short=t=>String(t||"").split(" · ")[0];
  const mk=(g,label,n)=>{const b=node("button","result-facet"+(S.facet===g?" active":""),label+" · "+n);b.type="button";b.setAttribute("aria-pressed",String(S.facet===g));
   b.addEventListener("click",()=>{S.facet=g;display(rows,query,phase)});bar.append(b)};
  mk("",S.lang==="en"?"All":S.lang==="fr"?"Tout":"Todo",ordered.length);
  for(const [g,a] of facetGroups)mk(g,short(titles[g]||g),a.length);
  list.append(bar);
 }
 const shown=S.facet?ordered.filter(r=>byGroup(r)===S.facet):ordered;
 if(!shown.length)list.append(node("div","empty",T().none));
 else {
  let lastGroup="",lastBlock="";
  for(const r of shown.slice(0,S.visibleResultCount)){
   // The source-first manuscript card has already been displayed above the
   // encyclopedia: do not duplicate the same shelfmark in the regular list.
   if(selectedManuscript&&r.type==="manuscript"&&
     r.codexShelfmark===selectedManuscript.shelfmark&&
     r.codexRepository===selectedManuscript.library)continue;
   if(siteFirst){
    const block=blockOf(r);
    if(block!==lastBlock){
     const label=block==="site"?
      (S.lang==="en"?"In the Vitruvian Library · Vitruvius and classical texts":S.lang==="fr"?"Dans la Bibliothèque vitruvienne · Vitruve et textes classiques":"En la Biblioteca Vitruviana · Vitruvio y textos clásicos"):
      (S.lang==="en"?"On the academic web":S.lang==="fr"?"Sur le web académique":"En la web académica");
     const h=node("h2","vitruvia-result-group",label);h.setAttribute("data-result-block",block);h.style.cssText="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border-bottom:1px solid #C9A84C;padding-bottom:8px;margin-top:28px";list.append(h);lastBlock=block;lastGroup="";
    }
   }
   if(S.mode==="all"||S.mode==="ai"){
    const group=byGroup(r);
    if(group!==lastGroup){
     const section=node("h3","vitruvia-result-group",titles[group]||"Resultados documentados");
     section.setAttribute("data-result-group",group);list.append(section);lastGroup=group;
    }
   }
  
   const card=renderCard(r);markTerms(card,query);list.append(card)
  }
 }
 // Consulta que nombra un códice con visor local (p. ej. «Codex H», «Harley 2767»):
 // abrir una vez el mismo lector de folios, con sus comandos; se cierra con × o Esc.
 if(window.VitruviaLocalManuscripts&&S.autoCodexOpened!==query){
  const normText=x=>String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  // Consulta codicológica: «Harley MS 2767, f. 12r», «H f. 45v», «Codex H ff. 12r–14v», «London, BL, Harl. 2767, fol. 3r».
  const CQ=window.CodexQuery,cq=CQ?CQ.parse(query):null,hasFolio=!!(cq&&(cq.range||cq.folios.length||cq.image));
  const folioParam=!hasFolio?"":cq.range?"ff. "+cq.range.from+"-"+cq.range.to:cq.image?"imagen "+cq.image:cq.folios.length===1?CQ.display(cq.folios[0]):"f. "+parseInt(cq.folios[0]);
  const withFolio=(url)=>{if(!folioParam||!url)return url;try{const u=new URL(url,location.href);u.searchParams.delete("image");u.searchParams.set("folio",folioParam);return u.pathname.split("/").pop()+u.search}catch(e){return url}};
  const residual=hasFolio?cq.rest:query;
  const qTokens=normText(residual).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const exactTokens=r=>{const hay=normText([r.title,r.codexShelfmark,...(r.aliases||[])].join(" ")).split(/[^\p{L}\p{N}]+/u);
   return qTokens.length&&qTokens.every(t=>hay.some(h=>h===t||t.length>2&&h.startsWith(t)))};
  let codex=deduped.find(r=>r.type==="manuscript"&&(r.localViewer||hasFolio&&r.codexViewer)&&exactTokens(r));
  if(!codex&&hasFolio&&CQ&&residual){
   // Signatura académica con abreviaturas institucionales (BL, HAB, BAV, Harl., Gud. lat.).
   let best=null,bestScore=0;
   for(const r of deduped.filter(x=>x.type==="manuscript"&&(x.localViewer||x.codexViewer))){
    const sc=CQ.shelfmarkScore(residual,[r.title,r.codexShelfmark,r.codexRepository,...(r.aliases||[])].join(" "));if(sc>bestScore){best=r;bestScore=sc}}
   if(best&&bestScore>=.75)codex=best;
   if(!codex){ // el testimonio puede no figurar entre los resultados mostrados: se consulta el fichero de testimonios
    for(const ms of S.witnesses||[]){if(!ms.localViewer&&!ms.manifest)continue;
     const hay=[ms.title,ms.shelfmark,ms.library,ms.siglum,...(ms.aliases||[])].join(" ");
     const sc=Math.max(CQ.shelfmarkScore(residual,hay),exactTokens({title:hay})?1:0);
     if(sc>bestScore){bestScore=sc;best={title:ms.title+" · "+ms.shelfmark,localViewer:ms.localViewer||null,
      codexViewer:ms.localViewer||"visor-codex.html?"+new URLSearchParams({manifest:ms.manifest,title:ms.title,official:ms.viewer||ms.record}).toString()}}}
    if(best&&bestScore>=.75)codex=best;
   }
  }
  if(codex){S.autoCodexOpened=query;const url=withFolio(codex.localViewer||codex.codexViewer);
   setTimeout(()=>window.VitruviaLocalManuscripts.open(url,codex.title+(folioParam?" · "+folioParam:"")),350)}
 }
 if(deduped.length>S.visibleResultCount){
  const left=deduped.length-S.visibleResultCount;
  const label=S.lang==="en"?"View "+Math.min(left,50)+" more results":S.lang==="fr"?"Voir "+Math.min(left,50)+" résultats supplémentaires":"Ver "+Math.min(left,50)+" resultados más";
  const more=node("button","show-more-results",label);more.type="button";
  more.addEventListener("click",()=>{S.visibleResultCount+=50;display(rows,query,phase)});
  list.append(more);
 }
 if(window.VitruviaArticles){$("answer").hidden=true;const authority=currentAuthorityFor(query);window.VitruviaArticles.render(deduped,query,identifyHistoricalPerson(query)||(authority?{id:authority.id,name:authority.personName}:null))}else synthesize(deduped);
 $("results-heading").textContent=T().heading;
 $("result-state").textContent=deduped.length+" "+titles.matching+" · "+Math.min(S.visibleResultCount,deduped.length)+" "+titles.visible+(phase?" · "+phase:"");
 const snapshot={query,rows:deduped,phase};
 window.VitruviaSearchSnapshot=snapshot;
 window.dispatchEvent(new CustomEvent("vitruvia:results",{detail:snapshot}));
}
function sourceLinks(query){const parent=$("source-links");parent.replaceChildren();
 if(!query)return;
 const links=[
 ["Encyclopaedia Britannica","https://www.google.com/search?"+new URLSearchParams({q:"site:britannica.com "+query})],
 ["Stanford Encyclopedia of Philosophy","https://www.google.com/search?"+new URLSearchParams({q:"site:plato.stanford.edu "+query})],
 ["World History Encyclopedia","https://www.google.com/search?"+new URLSearchParams({q:"site:worldhistory.org "+query})],
 ["Internet Archive","https://archive.org/search?"+new URLSearchParams({query})],
 ["Google · búsqueda web","https://www.google.com/search?"+new URLSearchParams({q:query})],
 ["Google · Modo IA","https://www.google.com/search?"+new URLSearchParams({q:query,udm:"50"})],
 ["Grok · consulta externa","https://grok.com/"],
 ["Google Books","https://books.google.com/books?"+new URLSearchParams({q:query})],
 ["Wikipedia en español","https://es.wikipedia.org/w/index.php?"+new URLSearchParams({search:query})],
 ["Wikipedia in English","https://en.wikipedia.org/w/index.php?"+new URLSearchParams({search:query})],
 ["Open Library","https://openlibrary.org/search?"+new URLSearchParams({q:query})],
 ["Zenon · DAI (arqueología y Antigüedad)","https://zenon.dainst.org/Search/Results?"+new URLSearchParams({lookfor:query,type:"AllFields"})],
 ["Persée","https://www.persee.fr/search?"+new URLSearchParams({ta:"article",q:query})],
 ["Dialnet","https://dialnet.unirioja.es/buscar/documentos?"+new URLSearchParams({querysDismax:query})],
 ["Pleiades · lugares antiguos","https://pleiades.stoa.org/search?"+new URLSearchParams({SearchableText:query})],
 ["Getty AAT · tesauro de arquitectura","https://www.getty.edu/vow/AATServlet?"+new URLSearchParams({english:"N",find:query,logic:"AND",page:"1",note:""})],
 ["OpenAlex","https://openalex.org/works?"+new URLSearchParams({search:query})],
 ["L'Année philologique (suscripción)","https://about.brepolis.net/aph-lannee-philologique/"]
 ];
 const h=node("h3",null,T().external);parent.append(h);
 for(const [label,url] of links){const a=makeLink(label+" ↗",url);if(a)parent.append(a)}
 const p=node("p",null,RESULT_TEXT[S.lang].sourceNote);parent.append(p)
}
async function search(){
 let q=$("query").value.trim();const id=++S.searchId;S.visibleResultCount=60;S.facet="";if(!q)return;
 // Voz griega con equivalente latino documentado en el léxico (εὐρυθμία → eurythmia): se busca también la forma latina.
 if(/[\u0370-\u03ff\u1f00-\u1fff]/.test(q)&&q.split(/\s+/).length<=3){try{S.lexicon=S.lexicon||await fetch("data/latin-lexicon.json").then(r=>r.json()).then(d=>d.entries||[]);
  const fg=x=>String(x||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ");const hit=S.lexicon.find(e=>e.greek&&fg(e.greek)===fg(q));if(hit&&!q.includes(hit.lemma))q=q+" "+hit.lemma}catch{}}
 const authority=currentAuthorityFor(q);
 const person=identifyHistoricalPerson(q)||(authority?{id:authority.id,name:authority.personName}:null);
 const generalQuery=authority?authority.personName:(window.VitruviaEntityResolver?.subject(topicQuery(q))||topicQuery(q));
 document.body.classList.add("vitruvia-reading");
 window.VitruviaSearchSnapshot={query:q,rows:[]};
 window.dispatchEvent(new CustomEvent("vitruvia:search",{detail:{query:q}}));
 $("clear-search").hidden=false;
 restoreFeature();
 promotePrimaryManuscript(q);
 history.replaceState(null,"",S.privateMode?"vitruvia.html":"vitruvia.html?"+new URLSearchParams({q,mode:S.mode}));
 const mode=S.mode,concept=(mode==="concept"||mode==="all"),internal=["all","site","concept","ai"].includes(mode);
 const engine=window.VitruviaResearchEngine;
 const intent=engine?.classify(q);
 // Una signatura, un manuscrito identificado o un locus exacto se resuelven
 // antes que las coincidencias externas de vocabulario general.
 const focused=!!(intent?.harley||intent?.vitruvian||intent?.locus||intent?.preface);
 const wikiEnabled=["all","wiki","external","ai"].includes(mode)||!!person;
 const academicEnabled=["all","external","ai"].includes(mode);
 $("results-heading").textContent=T().heading;$("result-state").textContent=T().waiting;
 $("result-list").replaceChildren(node("div","empty",T().waiting));$("answer").hidden=true;
 if(window.VitruviaArticles)window.VitruviaArticles.render([],q);
 sourceLinks(generalQuery);
 let rows=[];
 if(internal){
  rows=focused?[...liveManuscripts(q),...liveHistoricalEditions(q),...liveEditions(q)]:[...academicRows(q),...liveBooks(q,concept),...liveManuscripts(q),...liveHistoricalEditions(q),...liveEditions(q),...livePages(q,concept)];
  if(intent?.preface){
   const book=intent.preface.book;
   const roman=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
   rows.push({type:"preface",prefacePlaceholder:true,book,prefaceBook:book,
    title:book?"De architectura · Prefacio del Libro "+roman[book]:"De architectura · Prefacios de los diez libros",
    author:"Marco Vitruvio Polión · Biblioteca Vitruviana",
    excerpt:"Consultando el índice filológico de los prefacios…",
    meta:"Texto latino y traducciones editoriales V514 / V554 / V297",
    rating:7000,link:"lector-bilingue.html?edition=recensio-es&locus="+(book||1)+".praef.1"});
  }
  if(rows.length)display(rows,q,T().searching)
 }
 // Official current-figure disambiguation works in every search mode, including Wikipedia.
 const official=authorityRows(q);
 if(official.length){rows.push(...official);display(rows,q,T().searching)}
 const pending=[];
 if(["all","external","ai"].includes(mode)&&window.VitruviaExternalTexts){
  pending.push(window.VitruviaExternalTexts.search(generalQuery).then(result=>({
   name:"Búsqueda dentro de textos · Wikisource "+result.sources.join("/"),
   rows:result.rows||[],warnings:result.errors||[]
  })).catch(e=>({name:"Textos externos no disponibles",rows:[],warnings:[String(e.message||e)]})));
 }
 if(["all","external","ai"].includes(mode)&&window.VitruviaArchives){
  pending.push(window.VitruviaArchives.search(generalQuery).then(value=>{
   const linked=value.rows||[];
   const portals=!linked.length&&value.reason!=="entity-not-exactly-resolved"&&value.reason!=="authority-not-found"
    ?(value.portals||[]).slice(0,3).map(p=>({
       type:"archive-portal",title:p.title+" · "+generalQuery,
       author:"Catálogo institucional externo",excerpt:"Búsqueda de manuscritos y códices en archivo externo; no se presenta como hallazgo documental verificado.",
       meta:"Consulta externa · confirmar en la institución",link:p.url,source:"Bibliotecas patrimoniales",rating:26
      })):[];
   return {name:"Manuscritos en catálogos de autoridad · "+value.reason,
    rows:[...linked,...portals],warnings:value.warning?[value.warning]:[]};
  }).catch(e=>({name:"Catálogos de manuscritos no disponibles",rows:[],warnings:[String(e.message||e)]})));
 }
 if(mode==="ai"&&window.VitruviaAI){
  pending.push(window.VitruviaAI.search(generalQuery).then(v=>({
   name:v.mode==="neural"?"IA semántica multilingüe · BM25 + embeddings":v.mode==="bm25-fallback"?"BM25: modelo de IA no disponible":"Búsqueda de documentos",
   rows:v.rows||[],warnings:v.warning?[v.warning]:[]
  })).catch(e=>({name:"Modo IA · índice no disponible",rows:[],warnings:[String(e.message||e)]})));
 }
 // Resolve the subject independently of matching catalog titles.
 // Wikipedia titles and redirects supply canonical names for external retrieval.
 if(window.VitruviaEntityResolver&&wikiEnabled){
  pending.push(window.VitruviaEntityResolver.resolve(generalQuery,S.lang).then(identity=>{
   if(!identity)return {name:"No se resolvió una entidad enciclopédica",rows:[]};
   const link=identity.url;
   return {name:"Entidad enciclopédica · "+identity.canonical,rows:[{
    type:"wikipedia",title:identity.canonical,author:"Wikipedia · "+identity.language.toUpperCase(),
    excerpt:identity.description,fullExtract:identity.extract,
    meta:"Entidad identificada mediante Wikipedia · "+identity.language.toUpperCase(),
    rating:280,link,source:"Wikipedia ("+identity.language.toUpperCase()+")",
    pageid:identity.pageid,wikiLang:identity.language,entityCanonical:identity.canonical,entityKind:identity.kind,entityDescription:identity.authorityDescription||identity.description,wikidataId:identity.wikidataId||null,preferredWiki:true,sourceLanguage:identity.language
   }]};
  }).catch(e=>({name:"Resolución de entidad no disponible",rows:[],warnings:[e.message]})));
 }
 if(internal&&window.VitruviaAgentic){
  pending.push(window.VitruviaAgentic.search(generalQuery).then(value=>({
   name:"Corpus completo y bibliografía del sitio · "+value.stats.chunks+" pasajes indexados",
   rows:value.rows||[]
  })).catch(e=>({name:"Índice académico no disponible",rows:[],warnings:[e.message]})));
 }
 if(internal){
  pending.push(fetch("data/latin-lexicon.json").then(r=>r.ok?r.json():{entries:[]}).then(d=>{
   const f=x=>norm(String(x||"")).replace(/j/g,"i").replace(/v/g,"u"),q=f(generalQuery).trim();
   const e=(d.entries||[]).find(x=>[x.lemma,...(x.forms||[]),...(x.aliases||[])].some(y=>f(y)===q));
   return {name:"Ficha de término",rows:e?[{type:"section",title:"Ficha del término «"+e.lemma+"» en Vitruvio",author:[e.es,e.fr,e.en].filter(Boolean).join(" · "),
    excerpt:"Definición de Vitruvio con las traducciones V514 · V554 · V297, todas las apariciones por prefacio y capítulo con su folio en el Codex H, aparato crítico, láminas y estudios.",
    meta:"FICHA DE TÉRMINO · BIBLIOTECA VITRUVIANA",rating:3200,link:"termino.html?t="+encodeURIComponent(e.lemma),source:"Biblioteca Vitruviana"}]:[]}}).catch(()=>({name:"Léxico no disponible",rows:[]})));
 }
 if(internal){
  pending.push(fetch("data/laminas-historicas.json?v=20261105-v1").then(r=>r.ok?r.json():{entries:[]}).then(d=>{
   const f=x=>norm(String(x||"")),q=f(generalQuery),toks=q.split(/\s+/).filter(t=>t.length>3),loc=intent?.locus||null;
   const rows=(d.entries||[]).map(e=>{const hay=f([e.title,e.author,e.work,e.edition,e.plate,e.folio,e.witness,e.relation].join(" "));
    let r=0;if(loc&&e.locus&&(e.locus===loc||e.locus.startsWith(loc.split(".").slice(0,2).join(".")+".")))r+=120;for(const t of toks)if(hay.includes(t))r+=30;
    return {e,r}}).filter(x=>x.r>=30*Math.max(1,Math.ceil(toks.length/2))||x.r>=120).sort((a,b)=>b.r-a.r).slice(0,6).map(({e,r})=>({type:"section",
     title:e.title+" · "+[e.folio,e.plate].filter(Boolean).join(" · "),author:[e.author,e.work].filter(Boolean).join(", "),
     excerpt:[e.edition,e.witness,e.relation].filter(Boolean).join(" · "),meta:"LÁMINA HISTÓRICA · "+(e.rights||""),rating:60+r,
     link:"iconografia-vitruviana.html#lamina-"+e.id,source:"Atlas iconográfico · láminas"}));
   return {name:"Láminas históricas",rows}}).catch(()=>({name:"Láminas no disponibles",rows:[]})));
 }
 if(internal&&window.ClassicsCorpusSearch){
  pending.push(window.ClassicsCorpusSearch.search(generalQuery,{limit:6}).then(rows=>({name:"Textos clásicos griegos y latinos",rows})).catch(()=>({name:"Textos clásicos no disponibles",rows:[]})));
 }
 if(internal&&window.KuriloApparatus){
  const ap=window.KuriloApparatus,apLimit=/\b(aparato|apparatus|apparat|ecd[oó]tic|nota cr[ií]tica|variante|lectio|krohn|rose)\b/i.test(generalQuery)?14:6;
  pending.push(ap.search(generalQuery,{lang:S.lang,limit:apLimit,locus:intent?.locus||null}).then(hits=>({name:"Aparato crítico · ediciones Kurilo",
   rows:(()=>{/* Un bloque por página impresa: los demás de la misma página se cuentan, no se repiten. */
    const seen=new Map(),out=[];for(const e of hits){const k=e.page?e.edition+"#"+e.page:e.id;if(seen.has(k)){seen.get(k).more++;continue}const r=ap.toRow(e,generalQuery,S.lang);r.more=0;seen.set(k,r);out.push(r)}
    for(const r of out)if(r.more){r.title=r.title.replace(/ \(\d+\)$/,"");r.meta+=" · "+(S.lang==="en"?r.more+" more block(s) on this page":S.lang==="fr"?r.more+" autre(s) bloc(s) sur cette page":r.more+(r.more===1?" bloque más en la misma página":" bloques más en la misma página"))}
    return out})()})).catch(e=>({name:"Aparato crítico no disponible",rows:[],warnings:[String(e.message||e)]})));
 }
 if(internal){
  if(engine)pending.push(engine.query(q,{concept,language:S.lang}).then(value=>({name:intent?.preface?"Prefacios y prólogos de Vitruvio":"Loci, léxico y códices",rows:value.rows||[],warnings:value.warnings||[]})).catch(e=>({name:"Índice documental no disponible",rows:[],warnings:[e.message]})));
  else pending.push(passages().then(ps=>({name:"Corpus de Vitruvio",rows:livePassages(ps,q,concept)})).catch(e=>({name:"Corpus no disponible: "+e.message,rows:[]})));
 }
 if(wikiEnabled){
  /* Wikipedia is queried even for precise codex/locus searches in All mode. */
  pending.push(wiki(person?person.name:generalQuery,S.lang).then(rows=>({name:person?"Biografía · Wikipedia":"Wikipedia",rows})).catch(e=>({name:"Wikipedia sin respuesta: "+e.message,rows:[]})));
  if(S.lang!=="en")pending.push(wiki(person?person.name:generalQuery,"en").then(rows=>({name:"Wikipedia EN",rows})).catch(e=>({name:"Wikipedia EN sin respuesta: "+e.message,rows:[]})));
 }
 if(academicEnabled){
  pending.push(wikidata(q).then(rows=>({name:"Wikidata",rows})).catch(e=>({name:"Wikidata sin respuesta: "+e.message,rows:[]})));
  pending.push(openLibrary(q).then(rows=>({name:"Open Library",rows})).catch(e=>({name:"Open Library sin respuesta: "+e.message,rows:[]})));
   pending.push(googleBooks(q).then(rows=>({name:"Google Books",rows})).catch(e=>({name:"Google Books sin respuesta: "+e.message,rows:[]})));
  pending.push(museum(q).then(rows=>({name:"The Met",rows})).catch(e=>({name:"The Met sin respuesta: "+e.message,rows:[]})));
  pending.push(crossref(q).then(rows=>({name:"Crossref",rows})).catch(e=>({name:"Crossref sin respuesta: "+e.message,rows:[]})));
  pending.push(europePmc(q).then(rows=>({name:"Europe PMC",rows})).catch(e=>({name:"Europe PMC sin respuesta: "+e.message,rows:[]})));
  pending.push(openAlex(q).then(rows=>({name:"OpenAlex",rows})).catch(e=>({name:"OpenAlex sin respuesta: "+e.message,rows:[]})));
  pending.push(gettyAat(generalQuery).then(rows=>({name:"Getty AAT",rows})).catch(e=>({name:"Getty AAT sin respuesta: "+e.message,rows:[]})));
 }
 if(!pending.length){display(rows,q,"Índice interno");return}
 let completed=0,updateTimer=null;
 const sourceWarnings=[];
 await Promise.all(pending.map(p=>p.then(value=>{
  if(id!==S.searchId)return;
  const incoming=value.rows||[];
  if(intent?.preface&&incoming.some(r=>r.type==="preface"))rows=rows.filter(r=>!r.prefacePlaceholder);
  rows.push(...incoming);
  // If an exact quotation identifies an indexed work, retrieve its actual
  // catalogued manuscripts automatically, even when the author/title was not typed.
  const workIds=[...new Set(incoming.filter(r=>r.type==="passage"&&r.exactTextMatch&&r.workId).map(r=>r.workId))].slice(0,3);
  for(const workId of workIds){
   const identified=S.works.find(w=>w.id===workId);if(!identified)continue;
   rows.push(...liveManuscripts(identified.title));
   const work=liveBooks(identified.title,false).find(w=>norm(w.title)===norm(identified.title));
   if(work)rows.push(work);
  }
  if(!intent?.preface){if(value.featured)considerFeatured([value.featured],q);else considerFeatured(incoming,q)}
  completed++;
  clearTimeout(updateTimer);
  updateTimer=setTimeout(()=>{
   if(id===S.searchId)display(rows,q,completed+"/"+pending.length+" fuentes procesadas · "+value.name);
  },180);
  if(value.warnings?.length)sourceWarnings.push(value.name+": "+value.warnings.join("; "));
  else if(/sin respuesta|no disponible/.test(value.name))sourceWarnings.push(value.name);
 })));
 clearTimeout(updateTimer);
 if(id===S.searchId){
  const failed=sourceWarnings.length;
  const phase=S.lang==="en"?`Search complete · ${completed-failed}/${pending.length} sources responded${failed?" · some sources unavailable":""}`:
   S.lang==="fr"?`Recherche terminée · ${completed-failed}/${pending.length} sources disponibles${failed?" · certaines sources indisponibles":""}`:
   `Búsqueda finalizada · ${completed-failed}/${pending.length} fuentes respondieron${failed?" · algunas fuentes no disponibles":""}`;
  display(rows,q,phase);
  $("result-state").title=sourceWarnings.join("; ");
 }
}
function language(lang){S.lang=I18N[lang]?lang:"es";document.documentElement.lang=S.lang;
 const t=T();$("lead").textContent=t.lead;$("query").placeholder=t.placeholder;$("submit").textContent=t.submit;
 document.querySelectorAll("button.tab").forEach((b,i)=>{if(t.modes[i])b.textContent=t.modes[i]});
 $("mode-note").textContent=S.mode==="ai"
  ?(S.lang==="en"?"Experimental multilingual semantic search over indexed documents. Web catalogues are not part of the local AI model.":S.lang==="fr"?"Recherche sémantique multilingue expérimentale sur les documents indexés. Les catalogues web ne font pas partie du modèle local.":"Búsqueda semántica multilingüe experimental sobre documentos indexados. Los catálogos web no forman parte del modelo local.")
  :(t.explain[["all","site","wiki","external","concept"].indexOf(S.mode)]||t.explain[0]);
 const ui=UI_TEXT[S.lang]||UI_TEXT.es;
 document.querySelectorAll("[data-i18n]").forEach(el=>{
  const value=ui[el.dataset.i18n];if(value)el.textContent=value;
 });
 const welcome=WELCOME_I18N[S.lang]||WELCOME_I18N.es;
 document.querySelectorAll("[data-landing-key]").forEach(element=>{
  const value=welcome[element.dataset.landingKey];if(value)element.textContent=value;
 });
 if(!document.body.classList.contains("vitruvia-reading"))$("results-heading").textContent=t.idle;
 $("ui-language").value=S.lang;
 if(typeof renderPrivacy==="function")renderPrivacy();
 try{localStorage.setItem("vitruvius-ui-lang",S.lang)}catch{}
}
function mode(m){S.mode=["all","site","wiki","external","concept","ai"].includes(m)?m:"all";
 document.body.classList.toggle("vitruvia-ai-active",S.mode==="ai");
 if(S.mode!=="ai"){const status=document.getElementById("ai-status");if(status)status.hidden=true;}
 document.querySelectorAll("button.tab").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===S.mode)));
 $("mode-note").textContent=S.mode==="ai"?
 (S.lang==="en"?"Experimental multilingual semantic search of indexed documents. Initial model download ≈120 MB. External catalogues are not part of the neural model.":S.lang==="fr"?"Recherche sémantique multilingue expérimentale sur les documents indexés. Premier téléchargement ≈120 Mo. Les catalogues externes ne font pas partie du modèle.":"Búsqueda semántica multilingüe experimental sobre documentos indexados; primera descarga ≈120 MB. Los catálogos externos no forman parte del modelo."):
 (T().explain[["all","site","wiki","external","concept"].indexOf(S.mode)]||T().explain[0]);
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
 let index=-1,options=[],remote={entities:[],completions:[]},remoteFor="",timer=0,serial=0,previewId="";
 const U=()=>window.VitruviaUnderstand;
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
 const hide=()=>{menu.hidden=true;menu.classList.remove("has-preview");input.setAttribute("aria-expanded","false");input.removeAttribute("aria-activedescendant");index=-1;options=[]};
 const choose=v=>{input.value=v;hide();search()};
 // Coincidencias del sitio, con tolerancia a errores de tipeo (distancia de edición sobre palabras).
 function local(q){
  const suggestions=[],seen=new Set();
  const add=(label,value,subtitle,rank)=>{const key=norm(value);if(seen.has(key))return;seen.add(key);suggestions.push({label,value,subtitle,rank})};
  const near=(text)=>{const ws=norm(text).split(" ");return q.length>=4&&ws.some(w=>w.length>=4&&U()?.dist(w.slice(0,q.length+1),q)<=(q.length>=7?2:1))};
  for(const [label,value,aliases,type] of canonical){
   const norms=aliases.map(norm);
   if(norms.some(a=>a.includes(q)||q.includes(a))||norm(label).includes(q))add(label,value,type,norm(label).startsWith(q)?120:75);
   else if(norms.some(a=>near(a)))add(label,value,type,40);
  }
  for(const w of S.works){
   const title=w.title||"",author=w.author||"",aliases=w.aliases||[];
   const joined=norm([title,author,...aliases].join(" "));
   if(joined.includes(q)){const alias=aliases.find(a=>norm(a).includes(q));
    add(title,alias&&norm(title).indexOf(q)<0?alias:title,author+" · "+(verified(w)?"lectura local":"ficha de obra"),65+(norm(title).startsWith(q)?18:0)+(alias?8:0))}
   else if(near(joined))add(title,title,author+" · "+(verified(w)?"lectura local":"ficha de obra"),30);
  }
  for(const ms of S.witnesses)if(norm([ms.title,ms.shelfmark,ms.library].join(" ")).includes(q))
   add(ms.title+" · "+ms.shelfmark,ms.shelfmark,ms.library+" · manuscrito",100+(norm(ms.shelfmark).startsWith(q)?22:0));
  for(const ed of S.editions)if(norm([ed.title,ed.editor,ed.year].join(" ")).includes(q))add(ed.title,ed.title,ed.year+" · "+(ed.langs||[]).join("/"),50);
  for(const p of S.pages){const title=p.title||"";if(norm(title+" "+p.description).includes(q))add(title,title,"Biblioteca digital",35+(norm(title).startsWith(q)?10:0))}
  return suggestions.sort((a,b)=>b.rank-a.rank||a.label.localeCompare(b.label)).slice(0,5);
 }
 const T3=(es,en,fr)=>S.lang==="en"?en:S.lang==="fr"?fr:es;
 function option(cls,children,onPick,entity){
  const btn=node("button","search-suggestion "+cls);btn.type="button";btn.id="search-suggestion-"+options.length;btn.setAttribute("role","option");btn.setAttribute("aria-selected","false");
  btn.append(...children);btn.addEventListener("pointerdown",e=>e.preventDefault());btn.addEventListener("click",onPick);
  if(entity){btn.dataset.entity=entity.id;btn.addEventListener("pointerenter",()=>preview(entity))}
  options.push(btn);return btn;
 }
 function build(){
  const raw=input.value.trim(),q=norm(raw);index=-1;options=[];menu.replaceChildren();
  if(q.length<2){hide();return}
  const list=node("div","search-suggestions-list");
  const rem=remoteFor===raw?remote:{entities:[],completions:[]};
  for(const e of rem.entities){
   const row=option("is-entity",[node("span","sg-main",e.label),node("small",null,e.description)],()=>choose(e.label),e);
   list.append(row);
  }
  for(const c of rem.completions){
   const strong=node("span","sg-main");const low=c.toLowerCase(),pre=raw.toLowerCase();
   if(low.startsWith(pre)){strong.append(c.slice(0,raw.length));strong.append(node("b",null,c.slice(raw.length)))}else strong.append(node("b",null,c));
   list.append(option("is-completion",[node("span","sg-icon","⌕"),strong],()=>choose(c)));
  }
  const loc=local(q);
  if(loc.length){list.append(node("div","search-suggestions-title",T3("En la biblioteca · libros, códices y ediciones","In the library · works, manuscripts and editions","Dans la bibliothèque · œuvres, manuscrits et éditions")));
   for(const hit of loc)list.append(option("is-local",[node("span","sg-main",hit.label),node("small",null,hit.subtitle)],()=>choose(hit.value)))}
  if(!options.length&&remoteFor!==raw){list.append(node("div","search-suggestions-title",T3("Buscando sugerencias…","Looking for suggestions…","Recherche de suggestions…")))}
  else if(!options.length){hide();return}
  const pv=node("aside","search-preview");pv.setAttribute("aria-live","polite");
  menu.append(list,pv);
  // El desplegable se abre justo debajo del campo de búsqueda, como en los buscadores generales.
  const form=$("search-form");if(form&&menu.offsetParent!==null||form){menu.style.top=(form.offsetTop+form.offsetHeight+6)+"px"}
  menu.hidden=false;input.setAttribute("aria-expanded","true");
  if(rem.entities[0])preview(rem.entities[0]);else menu.classList.remove("has-preview");
 }
 // Ficha de vista previa (columna derecha del desplegable): descripción, fechas y resumen enciclopédico.
 async function preview(e){
  const pv=menu.querySelector(".search-preview");if(!pv||!U())return;previewId=e.id;menu.classList.add("has-preview");
  pv.replaceChildren(node("h3",null,e.label),node("p","sp-desc",e.description||""));
  const f=await U().facts(e.id,S.lang).catch(()=>null);if(previewId!==e.id||!f)return;
  const yrs=[f.birth?.year,f.death?.year].filter(Boolean).join(" – ");
  const where=[f.birthPlace?.label,f.deathPlace?.label].filter(Boolean).join(" · ");
  if(yrs||where)pv.append(node("p","sp-dates",[yrs,where].filter(Boolean).join(" · ")));
  const tags=[...f.occupations.slice(0,2),...f.movements.slice(0,2),...f.genres.slice(0,2)].map(x=>x.label);
  if(tags.length)pv.append(node("p","sp-tags",tags.join(" · ")));
  if(f.wiki){const sm=await U().summary(f.wiki,f.wikiLang).catch(()=>null);if(previewId!==e.id)return;
   if(sm?.extract)pv.append(node("p","sp-extract",sm.extract.length>300?sm.extract.slice(0,300).replace(/\s\S*$/,"")+"…":sm.extract))}
  const more=node("button","sp-more",T3("Ver más ›","See more ›","Voir plus ›"));more.type="button";
  more.addEventListener("pointerdown",ev=>ev.preventDefault());more.addEventListener("click",()=>choose(e.label));pv.append(more);
  pv.append(node("p","sp-source",T3("Fuente: Wikidata y Wikipedia","Source: Wikidata and Wikipedia","Source : Wikidata et Wikipédia")));
 }
 async function fetchRemote(){
  const raw=input.value.trim(),me=++serial;if(raw.length<2||!U())return;
  const r=await U().suggest(raw,S.lang).catch(()=>null);if(me!==serial||input.value.trim()!==raw)return;
  remote=r||{entities:[],completions:[]};remoteFor=raw;if(document.activeElement===input)build();
 }
 const paint=()=>{options.forEach((b,i)=>b.setAttribute("aria-selected",String(i===index)));if(index>=0){input.setAttribute("aria-activedescendant",options[index].id);options[index].scrollIntoView({block:"nearest"});
  const id=options[index].dataset.entity;if(id){const e=remote.entities.find(x=>x.id===id);if(e)preview(e)}}else input.removeAttribute("aria-activedescendant")};
 input.addEventListener("input",()=>{build();clearTimeout(timer);timer=setTimeout(fetchRemote,230)});
 input.addEventListener("focus",()=>{if(input.value.trim().length>=2){build();if(remoteFor!==input.value.trim())fetchRemote()}});
 input.addEventListener("keydown",e=>{
  if(menu.hidden)return;
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){if(!options.length)return;e.preventDefault();index=(index+(e.key==="ArrowDown"?1:-1)+options.length)%options.length;paint()}
  else if(e.key==="Escape"){e.preventDefault();hide()}
  else if(e.key==="Enter"&&index>=0){e.preventDefault();options[index].click()}
 });
 document.addEventListener("pointerdown",e=>{if(!menu.contains(e.target)&&e.target!==input)hide()});
 $("search-form").addEventListener("submit",hide);
}
setupAutocomplete();

/* Clear the query, cancel old requests and restore the landing page. */
const clearControl=$("clear-search"),clearAll=$("clear-all"),searchInput=$("query"),privacy=$("search-privacy");
function updateClearControl(){
 const empty=!searchInput.value.trim();
 clearControl.hidden=empty;clearAll.hidden=empty;
}
function clearSearch(){
 ++S.searchId;searchInput.value="";updateClearControl();
 window.VitruviaSearchSnapshot=null;
 const menu=$("search-suggestions");menu.hidden=true;menu.replaceChildren();
 searchInput.setAttribute("aria-expanded","false");searchInput.removeAttribute("aria-activedescendant");
 document.body.classList.remove("vitruvia-reading");
 window.dispatchEvent(new Event("vitruvia:clear"));
 history.replaceState(null,"","vitruvia.html");
 $("result-list").replaceChildren(node("div","empty",T().idle));
 $("results-heading").textContent=T().idle;
 $("result-state").textContent="";
 $("source-links").replaceChildren();
 $("answer").hidden=true;
 if(window.VitruviaArticles)window.VitruviaArticles.render([],"");
 restoreFeature();searchInput.focus();
}
function renderPrivacy(){
 privacy.setAttribute("aria-pressed",String(S.privateMode));
 privacy.textContent=(S.lang==="en"?"◇ Private query: ":S.lang==="fr"?"◇ Recherche privée : ":"◇ Consulta privada: ")+(S.privateMode?(S.lang==="en"?"on":S.lang==="fr"?"activée":"activada"):(S.lang==="en"?"off":S.lang==="fr"?"désactivée":"desactivada"));
 privacy.title=S.lang==="en"?"Does not retain the query in the address bar. External providers still receive the search terms. Not end-to-end encryption.":S.lang==="fr"?"La requête n’est pas conservée dans l’URL. Les services externes reçoivent toujours les termes ; pas de chiffrement de bout en bout.":"No guarda la búsqueda en la URL. Las fuentes externas siguen recibiendo los términos; no es cifrado de extremo a extremo.";
}
searchInput.addEventListener("input",updateClearControl);
searchInput.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!ev.defaultPrevented&&searchInput.value.trim()){ev.preventDefault();clearSearch()}});
clearControl.addEventListener("click",clearSearch);
clearAll.addEventListener("click",clearSearch);
privacy.addEventListener("click",()=>{
 S.privateMode=!S.privateMode;
 try{localStorage.setItem("vitruvia-private-url",S.privateMode?"1":"0")}catch{}
 const q=searchInput.value.trim();
 history.replaceState(null,"",S.privateMode?"vitruvia.html":q?"vitruvia.html?"+new URLSearchParams({q,mode:S.mode}):"vitruvia.html");
 renderPrivacy();
});
updateClearControl();renderPrivacy();

bindAcademia();
$("search-form").addEventListener("submit",e=>{e.preventDefault();search()});
$("ui-language").addEventListener("change",e=>{language(e.target.value);if($("query").value.trim())search()});
$("theme").addEventListener("click",()=>theme(S.theme==="dark"?"light":"dark"));
document.querySelectorAll("button.tab").forEach(b=>b.addEventListener("click",()=>{mode(b.dataset.mode);if($("query").value.trim())search()}));
document.querySelectorAll("button[data-q]").forEach(b=>b.addEventListener("click",()=>{$("query").value=b.dataset.q;search();document.querySelector("#results").scrollIntoView({behavior:"smooth",block:"start"})}));
try{const saved=localStorage.getItem("vitruvius-ui-lang");if(I18N[saved])S.lang=saved;const savedTheme=localStorage.getItem("vitruvia-theme");if(savedTheme==="light")S.theme="light";S.privateMode=localStorage.getItem("vitruvia-private-url")==="1"}catch{}
theme(S.theme);
const params=new URLSearchParams(location.search);mode(params.get("mode")||"all");language(S.lang);
load().then(()=>{const q=params.get("q");if(q){$("query").value=q;search()}}) ;
})();
