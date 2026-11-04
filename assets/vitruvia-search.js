/* VITRUVIA: búsqueda documental + enciclopedias públicas, sin claves privadas.
   Los resultados nunca se inventan. El modo conceptual es expansión terminológica,
   NO un modelo generativo de lenguaje. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const S={mode:"all",lang:"es",theme:"dark",works:[],pages:[],witnesses:[],editions:[],passages:null,passagePromise:null,searchId:0,ready:false,privateMode:false,visibleResultCount:44,people:[],historical:[]};
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
 es:{lead:"Buscador universal especializado en arte, historia, arquitectura y patrimonio cultural. Libros, códices, Wikipedia y fuentes académicas.",placeholder:"Preguntá sobre cualquier tema, obra, autor o concepto…",submit:"Buscar",modes:["◎ Todo","Biblioteca","Wikipedia","Internet y academia","⌁ Conceptos"],explain:["Buscá en la biblioteca, Wikipedia y fuentes de Internet verificables, sin salir de Vitruvia cuando existe una API pública.","Consultá libros, manuscritos, pasajes en latín y traducciones de la Biblioteca Vitruviana.","Resultados de Wikipedia en el idioma elegido y en inglés como referencia complementaria.","Buscá en catálogos, museos, Wikidata y registros académicos. Para la web general ofrecemos enlaces de búsqueda directa.","Relacioná términos, sinónimos y lenguas en los documentos internos; no se afirma utilizar IA generativa."],heading:"Resultados documentados",idle:"Consultá la biblioteca y las enciclopedias",waiting:"Consultando fuentes verificables…",none:"No se obtuvieron resultados comprobados; podés usar las búsquedas institucionales directas.",book:"LIBRO DEL CATÁLOGO",edition:"EDICIÓN HISTÓRICA",preface:"PREFACIO · DE ARCHITECTURA",passage:"TEXTO · LOCUS",section:"DOCUMENTO DEL SITIO",wikipedia:"ENCICLOPEDIA · WIKIPEDIA",wikidata:"DATOS · WIKIDATA",openlibrary:"CATÁLOGO · OPEN LIBRARY",museum:"ARTE · THE MET",article:"ARTÍCULO CIENTÍFICO",googlebook:"LIBRO · GOOGLE BOOKS",read:"Leer en la biblioteca",document:"Abrir documento",source:"Consultar fuente",pdf:"Leer PDF",unpublished:"Ficha en preparación · lector no disponible",synthesis:"Síntesis de resultados documentados",detail:"Selección de fragmentos recuperados; verificá las afirmaciones en cada fuente. No es una respuesta generativa de IA.",external:"Búsquedas adicionales en fuentes reconocidas",searching:"La búsqueda continúa en fuentes externas…"},
 en:{lead:"Universal search with a focus on art, history, architecture and cultural heritage. Books, manuscripts, Wikipedia and scholarly sources.",placeholder:"Search any topic, author, book or concept…",submit:"Search",modes:["◎ All","Library","Wikipedia","Web & research","⌁ Concepts"],explain:["Search this library, Wikipedia and verifiable web sources in one place when public APIs allow it.","Search books, manuscripts, Latin passages and translations in this library.","Search Wikipedia in your selected language, plus English results when useful.","Explore open catalogs, museum records, Wikidata and scholarly sources; use direct links for the wider web.","Explore related terms and languages in local documents; this is not generative AI."],heading:"Documented results",idle:"Explore library and encyclopedias",waiting:"Searching verifiable sources…",none:"No confirmed results; use the direct institutional searches.",book:"CATALOG BOOK",edition:"HISTORICAL EDITION",preface:"PREFACE · DE ARCHITECTURA",passage:"TEXT · LOCUS",section:"SITE DOCUMENT",wikipedia:"ENCYCLOPEDIA · WIKIPEDIA",wikidata:"DATA · WIKIDATA",openlibrary:"CATALOG · OPEN LIBRARY",museum:"ART · THE MET",article:"RESEARCH ARTICLE",googlebook:"BOOK · GOOGLE BOOKS",read:"Read in library",document:"Open document",source:"View original",pdf:"Read PDF",unpublished:"Catalog entry pending · no reader",synthesis:"Source-based synthesis",detail:"Selected excerpts from retrieved documents; verify claims at the source. Not generative AI.",external:"Additional reputable sources",searching:"External sources are still loading…"},
 fr:{lead:"Recherche universelle privilégiant l’art, l’histoire, l’architecture et le patrimoine. Livres, codex, Wikipédia et sources scientifiques.",placeholder:"Chercher n’importe quel sujet, auteur ou ouvrage…",submit:"Rechercher",modes:["◎ Tout","Bibliothèque","Wikipédia","Web et recherche","⌁ Concepts"],explain:["Rechercher dans cette bibliothèque, Wikipédia et les sources web vérifiables disposant d’API ouvertes.","Explorer les livres, manuscrits, passages latins et traductions de la bibliothèque.","Consulter Wikipédia dans la langue choisie et, en complément, en anglais.","Explorer les catalogues ouverts, musées, Wikidata et références scientifiques ; liens directs pour le web général.","Relier les termes et synonymes des documents internes ; ce service n’est pas une IA générative."],heading:"Résultats documentés",idle:"Explorer les fonds",waiting:"Interrogation des sources vérifiables…",none:"Aucun résultat confirmé ; utiliser les recherches institutionnelles directes.",book:"LIVRE DU CATALOGUE",edition:"ÉDITION HISTORIQUE",preface:"PRÉFACE · DE ARCHITECTURA",passage:"TEXTE · LOCUS",section:"DOCUMENT DU SITE",wikipedia:"ENCYCLOPÉDIE · WIKIPÉDIA",wikidata:"DONNÉES · WIKIDATA",openlibrary:"CATALOGUE · OPEN LIBRARY",museum:"ART · THE MET",article:"ARTICLE SCIENTIFIQUE",googlebook:"LIVRE · GOOGLE BOOKS",read:"Lire dans la bibliothèque",document:"Ouvrir document",source:"Voir la source",pdf:"Lire PDF",unpublished:"Notice en attente · pas de lecteur",synthesis:"Synthèse sourcée",detail:"Extraits récupérés ; vérifier les sources. Ce n'est pas une IA générative.",external:"Autres références de qualité",searching:"Interrogation des sources externes en cours…"}
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
 const century=raw.match(/(?:siglo|century|siecle|sec)\s+([ivx]+)/);
 if(century&&roman[century[1]])return (roman[century[1]]-1)*100;
 return 9999;
}
function matchingWorkIds(q){
 const query=norm(topicQuery(q));
 const queryWords=query.split(/\\s+/).filter(x=>x.length>=4);
 const found=S.works.filter(w=>{
  const names=[w.title,w.author,...(w.aliases||[])].map(norm);
  return names.some(name=>name===query||name.includes(query)&&query.length>=5)||
   queryWords.length>0&&names.some(name=>queryWords.every(t=>name.split(" ").includes(t)));
 });
 return new Set(found.map(w=>w.id));
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
  out.push({type:"manuscript",title:ms.title+" · "+ms.shelfmark,author:ms.library,excerpt:ms.coverage,
   meta:"TESTIMONIO MANUSCRITO · "+(ms.date||"sin fecha documentada")+" · "+(ms.shelfmark||"sin signatura")+" · "+(ms.manifest?"IIIF":"visor institucional"),
   codexDate:codexDateStart(ms.date),codexShelfmark:ms.shelfmark,codexRepository:ms.library,
   primaryWitness:primary,primaryLabel:primary?"TESTIMONIO MÁS ANTIGUO INDEXADO · "+(target?.title||"obra documentada"):"",
   rating:Math.max(rating,nameRating)+(exact?350:nameRating>15?55:0),
   link:target?libraryURL(target.id,"manuscript",ms.id):ms.record,
   viewerUrl:ms.viewer||ms.record,
   iiifManifest:ms.manifest||null,
   codexViewer:ms.manifest?"visor-codex.html?"+new URLSearchParams({manifest:ms.manifest,title:ms.title,official:ms.viewer||ms.record}).toString():(ms.viewer||ms.record||null),
   links:[{label:"Ficha codicológica",url:ms.record},{label:"Visor oficial de la institución",url:ms.viewer}].filter(x=>x.url),
   source:"Bibliotheca Graeca et Latina"});
 }
 return out.sort((a,b)=>Number(!!b.primaryWitness)-Number(!!a.primaryWitness)||a.codexDate-b.codexDate||b.rating-a.rating).slice(0,30);
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
 return {type:"book",title:w.title,author:w.author,aliases:w.aliases||[],excerpt:[w.genre,w.dating,status].filter(Boolean).join(" · "),
  meta:"BIBLIOTHECA GRAECA ET LATINA · "+(w.language==="grc"?"GRIEGO":"LATÍN"),
  rating:rating+(local?4:0)+(witnesses.length?3:0),link:libraryURL(w.id),pdf,
  links:extras,readable:local,source:"Bibliotheca Graeca et Latina"};
 }).filter(x=>x.rating>2).sort((a,b)=>b.rating-a.rating).slice(0,90)}

function livePages(q,concept){return S.pages.map(p=>({type:"section",title:p.title,excerpt:p.description,meta:"Documento HTML · GitHub Pages",rating:score(p.title+" "+p.description+" "+p.path,q,concept),link:p.path})).filter(x=>x.rating>2)}
async function fetchJSON(url,ms=12500){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);try{const r=await fetch(url,{signal:controller.signal,headers:{"Accept":"application/json"}});if(!r.ok)throw Error("HTTP "+r.status+" · "+new URL(url).host);const d=await r.json();if(d.error)throw Error(d.error.info||d.error.code);return d}finally{clearTimeout(timer)}}
async function load(){try{
 const urls=["data/bibliotheca-graeca-latina-I-bce-I-ce.json","data/witruvia-pages.json","data/bibliotheca-testimonia-verified.json","data/onomasticon-vitruvianum.json","data/catalog-completo.json"];
 const results=await Promise.allSettled(urls.map(u=>fetchJSON(u)));
 if(results[0].status!=="fulfilled")throw results[0].reason;
 const books=results[0].value,pages=results[1].status==="fulfilled"?results[1].value:{pages:[]},testimonia=results[2].status==="fulfilled"?results[2].value:{records:[],editions:[]};
 S.works=(books.works||[]).filter(w=>w.id&&w.title);S.pages=pages.pages||[];
 S.witnesses=testimonia.records||[];S.editions=testimonia.editions||[];S.historical=results[4]?.status==="fulfilled"&&Array.isArray(results[4].value)?results[4].value.filter(x=>x.category==="historical"):[];S.people=results[3].status==="fulfilled"?(results[3].value.entities||[]).filter(x=>x.kind==="person"):[];S.ready=true;
 $("metric-works").textContent=S.works.length;$("metric-pages").textContent=S.pages.length;$("metric-read").textContent=S.works.filter(verified).length;
 const mw=$("metric-witnesses"),me=$("metric-editions");
 if(mw)mw.textContent=S.witnesses.length;if(me)me.textContent=S.editions.length;
 $("result-state").textContent=S.works.length+" obras · "+S.witnesses.length+" códices · "+S.editions.length+" ediciones y "+S.pages.length+" secciones documentales";
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
 const params=new URLSearchParams({q,maxResults:"8",printType:"books"});
 const d=await fetchJSON("https://www.googleapis.com/books/v1/volumes?"+params,11000);
 return (d.items||[]).filter(item=>item.volumeInfo?.title&&item.volumeInfo?.infoLink).map((item,i)=>{
  const v=item.volumeInfo;const info=String(v.infoLink||"");
  if(!/^https:\/\//i.test(info))return null;
  return {type:"googlebook",title:v.title,author:(v.authors||[]).slice(0,3).join(", "),
   excerpt:brief(htmlText(v.description||""),340)||[v.publisher,v.publishedDate].filter(Boolean).join(" · "),
   meta:[v.publisher,v.publishedDate].filter(Boolean).join(" · ")||"Google Books · registro bibliográfico",
   rating:24-i+culturalWeight(v.title,v.subtitle||""),link:info,source:"Google Books",year:v.publishedDate||null,publisher:v.publisher||"",recordKind:"book"};
 }).filter(Boolean)
}

async function museum(generalQuery){
 const params=new URLSearchParams({q,limit:"4",offset:"0"});
 const d=await fetchJSON("https://collectionapi.metmuseum.org/public/collection/v1.1/search?"+params,12500);
 const ids=(d.objectIDs||[]).slice(0,3);
 const details=await Promise.allSettled(ids.map(id=>fetchJSON("https://collectionapi.metmuseum.org/public/collection/v1/objects/"+id,9000)));
 return details.filter(x=>x.status==="fulfilled").map((x,i)=>{const o=x.value;return {type:"museum",title:o.title||"Objeto de museo",author:[o.artistDisplayName,o.objectDate].filter(Boolean).join(" · "),excerpt:[o.culture,o.period,o.medium,o.department].filter(Boolean).join(" · "),meta:"Colección del Metropolitan Museum of Art",rating:29-i+culturalWeight(o.title,o.department),link:o.objectURL||"https://www.metmuseum.org",source:"The Met",year:o.objectBeginDate||null,recordKind:"museum-object",image:o.primaryImageSmall||o.primaryImage||null,imageRights:o.objectURL||"https://www.metmuseum.org",imageCredit:"The Metropolitan Museum of Art · verificar licencia de la obra",imageKind:"artwork"}});
}

/* Distinción académica: resultados de revistas y ciencias no se presentan como texto íntegro salvo enlace de acceso. */
async function crossref(generalQuery){
 const params=new URLSearchParams({query:generalQuery,rows:"8",select:"DOI,title,author,published,issued,type,publisher,URL,container-title,volume,issue,page"});
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
 const card=node("article","result-card"+(d.primaryWitness?" primary-codex-card":"")+(d.historicalEdition?" historical-edition-card":"")),head=node("div","result-head"),title=node("div");
 if(d.primaryWitness){card.setAttribute("aria-label","Testimonio manuscrito destacado: "+d.title);title.append(node("span","primary-codex-label",d.primaryLabel||"Testimonio principal"))}
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
 if(d.aiEvidence){card.classList.add("ai-evidence-card");card.append(node("div","ai-evidence-label",d.aiSemantic?"Reranking neuronal + texto documentado":"BM25 · búsqueda textual de respaldo"))}
 if(d.meta)card.append(node("div","meta-line",d.meta));
 const acts=node("div","actions");
 if(d.type==="manuscript"&&(d.codexViewer||d.viewerUrl)){const viewer=makeLink("Ver códice",d.codexViewer||d.viewerUrl);if(viewer){viewer.classList.add("codex-viewer-button");if(d.primaryWitness)viewer.classList.add("primary-codex-viewer");acts.append(viewer)}}
 if(d.link){const a=makeLink(d.type==="book"&&!d.readable?(S.lang==="en"?"Open bibliographic record":S.lang==="fr"?"Consulter la notice bibliographique":"Consultar ficha bibliográfica"):d.type==="passage"||d.type==="book"||d.type==="manuscript"||d.type==="edition"?T().read:d.type==="section"?T().document:T().source,d.link);if(a)acts.append(a)}
 if(Array.isArray(d.links)){for(const extra of d.links.slice(0,3)){const a=makeLink(extra.label,extra.url);if(a)acts.append(a)}}
 if(d.type==="book"&&!d.link)acts.append(node("span","disabled",T().unpublished));
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
 const romanVitruvius=/^(vitruvio|vitruvius|vitruve|marco vitruvio polion|marcus vitruvius pollio)$/i.test(norm(query));
 const scored=rows.filter(r=>(!romanVitruvius||!(/agustin vitruvio|agustín vitruvio|augustin vitruvio/i.test(r.title||"")))&&entityEvidence(r,query)).slice().sort((a,b)=>((b.rating||0)+titleMatch(b,query)+(S.mode==="ai"&&b.aiEvidence?2800:0))-((a.rating||0)+titleMatch(a,query)+(S.mode==="ai"&&a.aiEvidence?2800:0))),deduped=[],seen=new Set();
 for(const r of scored){const k=r.type+":"+norm(r.title)+(r.type==="passage"?":"+norm(r.edition||r.author||r.meta||""):"");if(seen.has(k))continue;seen.add(k);deduped.push(r)}
 const list=$("result-list");list.replaceChildren();
 // Present library evidence after encyclopedic context without hiding editions.
 const encyclopediaTypes=new Set(["wikipedia","wikidata","topic"]);
 const libraryTypes=new Set(["passage","book","manuscript","edition","preface","section"]);
 const ordered=S.mode==="ai"
  ? [...deduped.filter(r=>encyclopediaTypes.has(r.type)).slice(0,2),
     ...deduped.filter(r=>r.aiEvidence).sort((a,b)=>(b.aiScore||0)-(a.aiScore||0)),
     ...deduped.filter(r=>r.type==="manuscript").sort((a,b)=>Number(!!b.primaryWitness)-Number(!!a.primaryWitness)||(a.codexDate??9999)-(b.codexDate??9999)),
     ...deduped.filter(r=>!r.aiEvidence&&r.type!=="manuscript"&&!encyclopediaTypes.has(r.type)),
     ...deduped.filter(r=>encyclopediaTypes.has(r.type)).slice(2)]
  : S.mode==="all"
  ? [...deduped.filter(r=>encyclopediaTypes.has(r.type)).slice(0,8),
     ...deduped.filter(r=>r.type==="manuscript").sort((a,b)=>Number(!!b.primaryWitness)-Number(!!a.primaryWitness)||(a.codexDate??9999)-(b.codexDate??9999)||b.rating-a.rating),
     ...deduped.filter(r=>r.historicalEdition).sort((a,b)=>a.editionYear-b.editionYear),
     ...deduped.filter(r=>libraryTypes.has(r.type)&&r.type!=="manuscript"&&!r.historicalEdition),
     ...deduped.filter(r=>!encyclopediaTypes.has(r.type)&&!libraryTypes.has(r.type)),
     ...deduped.filter(r=>encyclopediaTypes.has(r.type)).slice(8)]
  : deduped;
 if(!ordered.length)list.append(node("div","empty",T().none));
 else {
  let lastGroup="";
  for(const r of ordered.slice(0,S.visibleResultCount)){
   if(S.mode==="all"||S.mode==="ai"){
    const group=r.aiEvidence?"semantic":encyclopediaTypes.has(r.type)?"encyclopedia":libraryTypes.has(r.type)?"library":"research";
    if(group!==lastGroup){
     const section=node("h3","vitruvia-result-group",group==="semantic"?"IA semántica · fragmentos auténticos del corpus":group==="encyclopedia"?"Enciclopedia y contexto histórico":group==="library"?"Dentro de la Biblioteca Vitruviana":"Investigación y catálogos externos");
     section.setAttribute("data-result-group",group);list.append(section);lastGroup=group;
    }
   }
   if((S.mode==="all"||S.mode==="ai")&&r.historicalEdition&&!list.querySelector(".historical-editions-heading")){const heading=node("h4","historical-editions-heading","Ediciones y traducciones históricas · orden cronológico");list.append(heading)}
   const card=renderCard(r);markTerms(card,query);list.append(card)
  }
 }
 if(deduped.length>S.visibleResultCount){
  const left=deduped.length-S.visibleResultCount;
  const label=S.lang==="en"?"View "+Math.min(left,44)+" more results":S.lang==="fr"?"Voir "+Math.min(left,44)+" résultats supplémentaires":"Ver "+Math.min(left,44)+" resultados más";
  const more=node("button","show-more-results",label);more.type="button";
  more.addEventListener("click",()=>{S.visibleResultCount+=44;display(rows,query,phase)});
  list.append(more);
 }
 if(window.VitruviaArticles){$("answer").hidden=true;window.VitruviaArticles.render(deduped,query,identifyHistoricalPerson(query))}else synthesize(deduped);
 $("results-heading").textContent=T().heading;
 $("result-state").textContent=deduped.length+" coincidencias · "+Math.min(S.visibleResultCount,deduped.length)+" visibles"+(phase?" · "+phase:"")
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
 ["Open Library","https://openlibrary.org/search?"+new URLSearchParams({q:query})]
 ];
 const h=node("h3",null,T().external);parent.append(h);
 for(const [label,url] of links){const a=makeLink(label+" ↗",url);if(a)parent.append(a)}
 const p=node("p",null,"Britannica y Stanford: enlace a búsquedas externas; no se presentan resultados como si fueran API propias.");parent.append(p)
}
async function search(){
 const q=$("query").value.trim(),id=++S.searchId;S.visibleResultCount=44;if(!q)return;
 const person=identifyHistoricalPerson(q);
 const generalQuery=topicQuery(q);
 document.body.classList.add("vitruvia-reading");
 window.dispatchEvent(new CustomEvent("vitruvia:search",{detail:{query:q}}));
 $("clear-search").hidden=false;
 restoreFeature();
 history.replaceState(null,"",S.privateMode?"vitruvia.html":"vitruvia.html?"+new URLSearchParams({q,mode:S.mode}));
 const mode=S.mode,concept=(mode==="concept"||mode==="all"),internal=["all","site","concept"].includes(mode);
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
  rows=focused?[...liveManuscripts(q),...liveHistoricalEditions(q),...liveEditions(q)]:[...liveBooks(q,concept),...liveManuscripts(q),...liveHistoricalEditions(q),...liveEditions(q),...livePages(q,concept)];
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
 const pending=[];
 if(mode==="ai"&&window.VitruviaAI){
  pending.push(window.VitruviaAI.search(generalQuery).then(v=>({
   name:v.mode==="neural"?"IA semántica multilingüe · BM25 + embeddings":v.mode==="bm25-fallback"?"BM25: modelo de IA no disponible":"Búsqueda de documentos",
   rows:v.rows||[],warnings:v.warning?[v.warning]:[]
  })).catch(e=>({name:"Modo IA · índice no disponible",rows:[],warnings:[String(e.message||e)]})));
 }
 // Resolve the subject independently of matching catalog titles.
 // Wikipedia titles and redirects supply canonical names for external retrieval.
 if(window.VitruviaEntityResolver&&wikiEnabled){
  pending.push(window.VitruviaEntityResolver.resolve(generalQuery).then(identity=>{
   if(!identity)return {name:"No se resolvió una entidad enciclopédica",rows:[]};
   const link=identity.url;
   return {name:"Entidad enciclopédica · "+identity.canonical,rows:[{
    type:"wikipedia",title:identity.canonical,author:"Wikipedia · "+identity.language.toUpperCase(),
    excerpt:identity.description,fullExtract:identity.extract,
    meta:"Entidad identificada mediante Wikipedia · "+identity.language.toUpperCase(),
    rating:280,link,source:"Wikipedia ("+identity.language.toUpperCase()+")",
    pageid:identity.pageid,wikiLang:identity.language,entityCanonical:identity.canonical
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
 }
 if(!pending.length){display(rows,q,"Índice interno");return}
 let completed=0;
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
 if(typeof renderPrivacy==="function")renderPrivacy();
 try{localStorage.setItem("vitruvius-ui-lang",S.lang)}catch{}
}
function mode(m){S.mode=["all","site","wiki","external","concept","ai"].includes(m)?m:"all";
 document.body.classList.toggle("vitruvia-ai-active",S.mode==="ai");
 if(S.mode!=="ai"){const status=document.getElementById("ai-status");if(status)status.hidden=true;}
 document.querySelectorAll("button.tab").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===S.mode)));
 $("mode-note").textContent=S.mode==="ai"?"IA semántica multilingüe: combina BM25 y embeddings locales sobre documentos indexados; primera carga del modelo ≈120 MB. Los resultados externos son bibliográficos y no equivalen a análisis IA de toda la web.":T().explain[["all","site","wiki","external","concept"].indexOf(S.mode)];
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
  for(const w of S.works){
   const title=w.title||"",author=w.author||"",aliases=w.aliases||[];
   const joined=norm([title,author,...aliases].join(" "));
   if(joined.includes(q)){
    const alias=aliases.find(a=>norm(a).includes(q));
    add(title,alias&&norm(title).indexOf(q)<0?alias:title,
      author+" · "+(verified(w)?"lectura local":"ficha de obra"),65+(norm(title).startsWith(q)?18:0)+(alias?8:0));
   }
  }
  for(const ms of S.witnesses){
   if(norm([ms.title,ms.shelfmark,ms.library].join(" ")).includes(q))
    add(ms.title+" · "+ms.shelfmark,ms.shelfmark,ms.library+" · manuscrito",100+(norm(ms.shelfmark).startsWith(q)?22:0));
  }
  for(const ed of S.editions){
   if(norm([ed.title,ed.editor,ed.year].join(" ")).includes(q))
    add(ed.title,ed.title,ed.year+" · "+(ed.langs||[]).join("/"),50);
  }
  for(const p of S.pages){const title=p.title||"";
   if(norm(title+" "+p.description).includes(q))add(title,title,"Biblioteca digital",35+(norm(title).startsWith(q)?10:0));
  }
  suggestions.sort((a,b)=>b.rank-a.rank||a.label.localeCompare(b.label));
  const h=node("div","search-suggestions-title",S.lang==="en"?"Works, manuscripts and editions":S.lang==="fr"?"Œuvres, manuscrits et éditions":"Libros, códices y ediciones históricas");
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

/* Clear the query, cancel old requests and restore the landing page. */
const clearControl=$("clear-search"),clearAll=$("clear-all"),searchInput=$("query"),privacy=$("search-privacy");
function updateClearControl(){
 const empty=!searchInput.value.trim();
 clearControl.hidden=empty;clearAll.hidden=empty;
}
function clearSearch(){
 ++S.searchId;searchInput.value="";updateClearControl();
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