/* Bibliotheca simple: single search, single work selector, actual attested paragraphs.
   No readers, facsimile frames, palettes or undocumented translation alignments. */
(()=>{"use strict";
const CATALOG="data/bibliotheca-graeca-latina-I-bce-I-ce.json";
const REGISTRY="data/classics-corpus/search-registry.json";
/* Mostrar todas las ediciones textuales ya acreditadas en el registro, sin crear copias.
   Cada traduccion conserva su procedencia y los loci no equivalen a cotejo filologico. */
const bibliothecaLanguagePolicy=e=>["la","grc","en","es","fr"].includes(e.language);
/* Fichas de ediciones existentes: el índice ya utiliza el identificador común vitruvius.
   Conservar ficha individual, pero consultar sólo la edición realmente disponible. */
const editionAliases={
 "vitruvio-v514-pdf":{workId:"vitruvius",edition:"recensio-es"},
 "vitruvio-v554-pdf":{workId:"vitruvius",edition:"recensio-fr"},
 "theory-v297-pdf":{workId:"vitruvius",edition:"theory-en"}
};
const $=id=>document.getElementById(id);
const dict={
 es:{home:"Inicio",search:"Buscar",placeholder:"Una palabra o frase, por ejemplo: domus",
 intro:"Busca originales griegos y latinos y traducciones documentadas disponibles en castellano, inglés o francés. Los loci son editoriales; no se presumen traducciones alineadas.",
 work:"Obra",all:"Todos los libros indexados",wait:"Cargando el catálogo de obras…",
 ready:(c,v,n)=>c+" obras catalogadas · "+v+" versiones indexadas · "+n+" obras sin texto indexado.",
 missing:"(no indexada)",label:"Párrafos encontrados",lexicon:"Estudiar etimología en Lexicon",
 method:"Concordancias documentadas; versiones originales y traducciones contadas por separado. Chicago 18 cuando hay datos editoriales; referencias parciales identificadas.",
 short:"Escribe al menos dos letras o cifras.",loading:"Buscando en las versiones indexadas…",
 unavailable:"No fue posible verificar el índice: búsqueda no disponible.",failed:"Búsqueda parcial: algunas versiones fallaron.",
 none:"No se hallaron coincidencias en los textos examinados.",
 stats:(n,p,w)=>n+" apariciones en versiones indexadas · "+p+" pasajes · "+w+" obras",groupCount:n=>n+" apariciones",
 outside:n=>n+" obras catalogadas sin texto indexado; no examinadas.",
 wrong:"Esta obra no tiene texto indexado; no se buscó.",citation:"Edición y procedencia",loc:"Locus",noDate:"Datación no determinada",translit:forms=>"Transliteración griega documentada: "+forms.join(", ")},
 en:{home:"Home",search:"Search",placeholder:"One word or phrase, for example: domus",
 intro:"Search Greek and Latin originals with documented English, Spanish and French translations, where available. Shared loci do not prove textual alignment.",
 work:"Work",all:"All indexed books",wait:"Loading the work catalogue…",
 ready:(c,v,n)=>c+" catalogued works · "+v+" indexed versions · "+n+" works with no indexed text.",
 missing:"(not indexed)",label:"Matching paragraphs",lexicon:"Study etymology in Lexicon",
 method:"Documentary concordance of indexed texts; versions counted separately. Chicago 18 where source metadata are sufficient; partial references identified.",
 short:"Enter at least two letters or digits.",loading:"Searching indexed editions…",
 unavailable:"Could not verify the index; search unavailable.",failed:"Partial results: some text versions failed.",
 none:"No matches in the texts examined.",
 stats:(n,p,w)=>n+" occurrences in indexed versions · "+p+" passages · "+w+" works",groupCount:n=>n+" occurrences",
 outside:n=>n+" catalogued works without indexed text, not searched.",
 wrong:"This work has no indexed text; it was not searched.",citation:"Edition and provenance",loc:"Locus",noDate:"Undated",translit:forms=>"Documented Greek transliteration: "+forms.join(", ")},
 fr:{home:"Accueil",search:"Chercher",placeholder:"Un mot ou une expression, par exemple : domus",
 intro:"Recherchez les originaux grecs et latins et les traductions documentées en français, anglais ou espagnol, lorsqu’elles existent. Aucun alignement n’est présumé.",
 work:"Œuvre",all:"Tous les livres indexés",wait:"Chargement du catalogue…",
 ready:(c,v,n)=>c+" œuvres cataloguées · "+v+" versions indexées · "+n+" œuvres sans texte indexé.",
 missing:"(non indexée)",label:"Paragraphes trouvés",lexicon:"Étudier l’étymologie dans Lexicon",
 method:"Concordance des textes indexés; versions comptées séparément. Chicago 18 lorsque les références sont vérifiées; références partielles signalées.",
 short:"Saisissez deux lettres ou chiffres au minimum.",loading:"Recherche dans les éditions indexées…",
 unavailable:"Index non vérifiable ; recherche indisponible.",failed:"Résultats partiels : certaines éditions n'ont pu être chargées.",
 none:"Aucune correspondance dans les textes consultés.",
 stats:(n,p,w)=>n+" occurrences dans les versions indexées · "+p+" passages · "+w+" œuvres",groupCount:n=>n+" occurrences",
 outside:n=>n+" œuvres cataloguées sans texte indexé, non examinées.",
 wrong:"Cette œuvre n'a pas de texte indexé ; aucune recherche.",citation:"Édition et provenance",loc:"Locus",noDate:"Datation inconnue",translit:forms=>"Translittération grecque documentée : "+forms.join(", ")}
};
const languages={la:"Latín",grc:"Griego",es:"Castellano",en:"English",fr:"Français"};
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").replace(/j/g,"i").replace(/v/g,"u");
/* Equivalencia ortográfica griego ↔ transliteración, solo con lemas documentados
   en Conceptus; no sustituye una traducción ni una alineación por locus. */
const greekRoman={α:"a",β:"b",γ:"g",δ:"d",ε:"e",ζ:"z",η:"e",θ:"th",ι:"i",κ:"k",λ:"l",μ:"m",ν:"n",ξ:"x",ο:"o",π:"p",ρ:"r",σ:"s",τ:"t",υ:"y",φ:"ph",χ:"ch",ψ:"ps",ω:"o"};
const romanizeGreek=s=>[...String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ")].map(c=>greekRoman[c]||c).join("");
let greekFormsTask=null;
async function attestedGreekForms(query){
 if(!/^[a-z]{3,35}$/i.test(query))return [];
 if(!greekFormsTask)greekFormsTask=fetch("data/lexicon/conceptus.json")
  .then(r=>{if(!r.ok)throw Error("Conceptus unavailable");return r.json()})
  .then(j=>Array.isArray(j?.concepts)?j.concepts:[]).catch(()=>[]);
 const concepts=await greekFormsTask,found=new Set(),key=fold(query);
 for(const c of concepts)for(const g of (Array.isArray(c.grc)?c.grc:[])){
  if(typeof g==="string"&&/^[\p{Script=Greek}\p{M}]+$/u.test(g)&&fold(romanizeGreek(g))===key)found.add(g);
 }
 return [...found].slice(0,8);
}
const roman=x=>{let n=0,last=0;for(const c of [...String(x).toUpperCase()].reverse()){const z={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}[c]||0;n+=z<last?-z:z;last=z}return n};
/* Prioridad: fecha de composición, NUNCA año de publicación de la traducción.
   Los rangos usan el extremo más antiguo; siglos debatidos se ordenan solo
   aproximadamente, mostrando siempre la datación original sin falsear precisión. */
function dating(w){
 // Las grafías cronológicas no comparten normalización u/v con el buscador.
 const s=String(w?.dating||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[–—−]/g,"-").replace(/\s+/g," ");
 if(/edicion editorial|edicion critica impresa|composicion y atribuciones debatidas/.test(s))return Infinity;
 if(/tradicion arcaica|epoca arcaica/.test(s))return /homer|odyssey|iliad/.test(w.id||"")?-780:-720;
 const numeric=s.match(/(\d{1,4})(?:\s*-\s*\d{1,4})?\s*(a\.\s*c\.|d\.\s*c\.)/);
 if(numeric)return Number(numeric[1])*(numeric[2].startsWith("a")?-1:1);
 const century=s.match(/(?:siglos?|s\.)\s+([ivxlcdm]+)/);
 if(century){
  const c=roman(century[1]);if(!c)return Infinity;
  // La primera era explícita prevalece en períodos que cruzan a.C./d.C.
  const era=(s.match(/a\.\s*c\.|d\.\s*c\./)||[])[0]||"d. c.";
  const start=era.startsWith("a")?-100*c:100*(c-1)+1;
  const beforeCentury=s.slice(0,century.index);
  const offset=/finales|final|ultim/.test(beforeCentury)?75:
   /mediados|mitad/.test(beforeCentury)?50:
   /primera mitad|principios|comienzos/.test(beforeCentury)?25:0;
  return start+offset;
 }
 return Infinity;
}
/* Taxonomía editorial descriptiva; no atribuye una forma literaria a un manuscrito.
 * Se basa exclusivamente en el campo genre del catálogo, nunca en palabras buscadas.
 * Las fechas son de composición según la ficha, no de copia manuscrita. */
const eras=[
 ["archaic",{es:"Hasta 500 a. C. · época arcaica",en:"Before 500 BCE · archaic",fr:"Avant 500 av. n. è. · archaïque"}],
 ["classical",{es:"500–323 a. C. · época clásica",en:"500–323 BCE · classical",fr:"500–323 av. n. è. · classique"}],
 ["hellenistic",{es:"322–31 a. C. · helenística/republicana",en:"322–31 BCE · Hellenistic/republican",fr:"322–31 av. n. è. · hellénistique/républicaine"}],
 ["imperial",{es:"30 a. C.–284 d. C. · época imperial",en:"30 BCE–284 CE · imperial",fr:"30 av.–284 de n. è. · impériale"}],
 ["late",{es:"285–700 d. C. · Antigüedad tardía",en:"285–700 CE · Late Antiquity",fr:"285–700 de n. è. · Antiquité tardive"}],
 ["later",{es:"Posterior a 700 d. C.",en:"After 700 CE",fr:"Après 700 de n. è."}],
 ["uncertain",{es:"Datación no determinada o debatida",en:"Undetermined or disputed date",fr:"Datation indéterminée ou discutée"}]
];
const genres=[
 ["architecture",{es:"Arquitectura, ingeniería y agrimensura",en:"Architecture, engineering and surveying",fr:"Architecture, ingénierie et arpentage"}],
 ["wisdom",{es:"Filosofía, ética y textos sapienciales",en:"Philosophy, ethics and wisdom texts",fr:"Philosophie, éthique et textes sapientiaux"}],
 ["religion",{es:"Religión, cristianismo y exégesis",en:"Religion, Christianity and exegesis",fr:"Religion, christianisme et exégèse"}],
 ["history",{es:"Historia, historiografía y biografía",en:"History, historiography and biography",fr:"Histoire, historiographie et biographie"}],
 ["literature",{es:"Poesía, épica y teatro",en:"Poetry, epic and drama",fr:"Poésie, épopée et théâtre"}],
 ["rhetoric",{es:"Retórica, oratoria y educación",en:"Rhetoric, oratory and education",fr:"Rhétorique, art oratoire et éducation"}],
 ["science",{es:"Matemática, astronomía y ciencias naturales",en:"Mathematics, astronomy and natural sciences",fr:"Mathématiques, astronomie et sciences naturelles"}],
 ["medicine",{es:"Medicina y farmacología",en:"Medicine and pharmacology",fr:"Médecine et pharmacologie"}],
 ["agriculture",{es:"Agricultura, agronomía y botánica",en:"Agriculture, agronomy and botany",fr:"Agriculture, agronomie et botanique"}],
 ["geography",{es:"Geografía, cartografía y etnografía",en:"Geography, cartography and ethnography",fr:"Géographie, cartographie et ethnographie"}],
 ["linguistics",{es:"Lengua, gramática y erudición",en:"Language, grammar and erudition",fr:"Langue, grammaire et érudition"}],
 ["music",{es:"Música y teoría armónica",en:"Music and harmonic theory",fr:"Musique et théorie harmonique"}],
 ["other",{es:"Otros géneros documentados",en:"Other catalogued genres",fr:"Autres genres documentés"}]
];
function periodOf(w){
 const d=dating(w);if(!Number.isFinite(d))return "uncertain";
 if(d < -500)return "archaic";if(d < -322)return "classical";
 if(d < -30)return "hellenistic";if(d <= 284)return "imperial";
 if(d <= 700)return "late";return "later";
}
function genreOf(w){
 const s=String(w?.genre||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
 if(/arquitectura|ingenieria|agrimensura|mecanica|hidraulica/.test(s))return "architecture";
 if(/cristian|religion|exegesis|mitologia|mitografia/.test(s))return "religion";
 if(/filosofia|estoic|sapiencial|moral/.test(s))return "wisdom";
 if(/medicina|farmacologia/.test(s))return "medicine";
 if(/agricultur|agronomia|botanica/.test(s))return "agriculture";
 if(/geografia|cartografia|etnografia/.test(s))return "geography";
 if(/retorica|oratoria|educacion/.test(s))return "rhetoric";
 if(/astronomia|matematica|historia natural|filosofia natural/.test(s))return "science";
 if(/musica|armonica|teoria musical/.test(s))return "music";
 if(/historia|historiografia|biografia|militar|calendario/.test(s))return "history";
 if(/epica|poesia|tragedia|comedia|satira|elegia|fabula|novela|narrativa|poetica|epistolografia|ficcion/.test(s))return "literature";
 if(/linguistica|erudita|erudicion/.test(s))return "linguistics";
 return "other";
}
const era=$("classic-era"),genre=$("classic-genre");
function chosenWorks(){return works.filter(w=>(!era.value||periodOf(w)===era.value)&&(!genre.value||genreOf(w)===genre.value))}
function refreshFacets(){
 const labels=locale==="fr"?{period:"Époque",genre:"Matière / genre",allPeriod:"Toutes les époques",allGenre:"Toutes les matières"}:locale==="en"?
  {period:"Period",genre:"Subject / genre",allPeriod:"All periods",allGenre:"All subjects"}:
  {period:"Época",genre:"Materia / género",allPeriod:"Todas las épocas",allGenre:"Todas las materias"};
 $("era-label").textContent=labels.period;$("genre-label").textContent=labels.genre;
 const oldEra=era.value,oldGenre=genre.value;
 era.replaceChildren(new Option(labels.allPeriod,""));
 for(const [key,names] of eras)if(works.some(w=>periodOf(w)===key))era.append(new Option(names[locale],key));
 genre.replaceChildren(new Option(labels.allGenre,""));
 for(const [key,names] of genres)if(works.some(w=>genreOf(w)===key))genre.append(new Option(names[locale],key));
 era.value=oldEra;genre.value=oldGenre;
 $("filter-method").textContent=locale==="en"?"Editorial categories from catalogue genres; approximate composition date (not manuscript or edition date). Disputed datings remain identified.":
  locale==="fr"?"Catégories tirées du catalogue ; date approximative de composition, non de copie ou d'édition. Datations discutées signalées.":
  "Categorías según el género catalogado y la fecha aproximada de composición, no la copia manuscrita ni la edición. Dataciones discutidas identificadas.";
}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const foldedMap=text=>{
 let f="",index=[];
 for(let i=0;i<text.length;){const c=String.fromCodePoint(text.codePointAt(i)),v=fold(c);for(let j=0;j<v.length;j++){f+=v[j];index.push(i)}i+=c.length}
 return {f,index};
};
function decorate(parent,text,query){
 const {f,index}=foldedMap(text),key=fold(query);
 if(!key){parent.textContent=text;return}
 const out=document.createDocumentFragment();let cursor=0,at=f.indexOf(key),count=0;
 const letter=c=>!!c&&/[\p{L}\p{N}]/u.test(c);
 while(at>=0&&count<500){
  const stop=at+key.length;
  if(!letter(f[at-1])&&!letter(f[stop])){
   const start=index[at],last=index[stop-1];
   if(start!==undefined&&last!==undefined){
    const end=last+(text.codePointAt(last)>65535?2:1);
    if(start>=cursor){out.append(document.createTextNode(text.slice(cursor,start)));const highlighted=el("mark","lexical-hit",text.slice(start,end));highlighted.tabIndex=0;highlighted.setAttribute("role","button");highlighted.setAttribute("aria-label","Consultar significado de "+highlighted.textContent);out.append(highlighted);cursor=end;count++}
   }
  }
  at=f.indexOf(key,at+Math.max(1,key.length));
 }
 out.append(document.createTextNode(text.slice(cursor)));parent.append(out);
}
let works=[],entries=[],byId=new Map(),indexed=new Set(),locale="es",previous=[],current="",diag={},serial=0;
/* Expansión morfológica controlada y optativa. Paradigmas explícitos,
   sin suponer que las coincidencias son una lematización exhaustiva. */
const attestedParadigms=[
 {lang:"la",lemma:"architectura",forms:["architectura","architecturae","architecturam","architecturarum","architecturis","architecturas"]},
 {lang:"la",lemma:"domus",forms:["domus","domum","domui","domo","domorum","domibus","domos"]},
 {lang:"la",lemma:"aedifico",forms:["aedifico","aedificas","aedificat","aedificamus","aedificant","aedificare","aedificandi","aedificando","aedificatum","aedificavit"]},
 {lang:"grc",lemma:"λόγος",forms:["λόγος","λόγου","λόγῳ","λόγον","λόγε","λόγοι","λόγων","λόγοις","λόγους"]}
];
function morphologicalForms(q){
 if(!/^[\p{L}\p{M}]+$/u.test(q))return [];
 const key=fold(q);
 const record=attestedParadigms.find(p=>p.forms.some(form=>fold(form)===key));
 return record?record.forms.filter(form=>fold(form)!==key):[];
}
const input=$("classic-query"),work=$("classic-work"),coverage=$("catalogue-status"),status=$("search-status"),
 root=$("result"),list=$("classic-results"),lex=$("lexicon-link"),bar=$("lexicon-bar");

/* Traducciones remotas: sólo vínculos y metadatos de ediciones verificadas.
   Jamás contar como corpus local ni intentar descargar indiscriminadamente textos. */
const morphControl=document.createElement("label");
morphControl.style.cssText="display:inline-flex;align-items:center;gap:8px;margin:9px 0;color:#bfc0c2;font:12px/1.5 Arial,sans-serif;cursor:pointer";
const morphCheckbox=document.createElement("input");
morphCheckbox.type="checkbox";morphCheckbox.id="morphology-opt-in";
morphControl.append(morphCheckbox,document.createTextNode(" Incluir formas flexionadas documentadas (cobertura parcial)"));
document.querySelector(".searcharea")?.append(morphControl);
const remoteBox=el("aside","remote-translations");
remoteBox.hidden=true;
document.querySelector(".searcharea")?.append(remoteBox);
const sourceBox=el("aside","remote-original-source");
sourceBox.hidden=true;document.querySelector(".searcharea")?.append(sourceBox);
let remoteEntries=[];
function drawRemote(){
 remoteBox.replaceChildren();
 const id=work.value||new URLSearchParams(location.search).get("work")||"";
 sourceBox.replaceChildren();sourceBox.hidden=id!=="ennius-annales";
 if(id==="ennius-annales"){
  const heading=el("p","remote-title",({es:"Original latino fragmentario · acceso externo bajo demanda",en:"Fragmentary Latin original · on-demand external source",fr:"Original latin fragmentaire · source externe à la demande"})[locale]||"Original latino fragmentario");
  const line=el("p","remote-row");
  const reader=el("a","remote-link",({es:"Leer y buscar en los fragmentos de Ennio",en:"Read and search Ennius fragments",fr:"Lire et chercher les fragments d’Ennius"})[locale]||"Leer fragmentos");
  reader.href="classics-external-source-reader.html?work=ennius-annales";line.append(reader);
  const note=el("p","remote-note","Transcripción alojada por CLTK, sin copia en Vitruvius. Lectura externa sin índice central ni edición crítica cotejada; los números de verso requieren comprobación.");
  sourceBox.append(heading,line,note);
 }

 const rows=remoteEntries.filter(e=>e.workId===id);
 remoteBox.hidden=!rows.length;
 if(!rows.length)return;
 const labels={
  es:{head:"Traducciones externas con lectura identificada",open:"Consultar traducción",note:"El enlace lleva a un índice de lectura externo comprobado. No implica búsqueda dentro de Bibliotheca ni cotejo de loci, no se incluye en el recuento de concordancias y no constituye un inventario exhaustivo de traducciones existentes."},
  en:{head:"External translations with identified reading access",open:"Read translation",note:"This links to a checked external reading index; it is neither indexed by Bibliotheca nor collated by locus, and the list is not exhaustive."},
  fr:{head:"Traductions externes avec accès identifié",open:"Consulter la traduction",note:"Accès à un index externe vérifié, sans recherche locale ni collation par locus. La liste n'est pas exhaustive."}
 }[locale]||{head:"Traducciones externas",open:"Consultar",note:""};
 remoteBox.append(el("p","remote-title",labels.head));
 for(const e of rows){
  let target;
  try{target=new URL(e.url)}catch{continue}
  if(target.protocol!=="https:"||target.hostname!=="penelope.uchicago.edu")continue;
  const line=el("p","remote-row");
  const a=el("a","remote-link",labels.open+" · "+(languages[e.language]||e.language));
  a.href=target.href;a.target="_blank";a.rel="noopener noreferrer";
  line.append(a,document.createTextNode(" · "+e.translator+" · "+e.edition+" · "+e.host+(e.verifiedIndexOn?" · "+(locale==="es"?"índice consultado":locale==="fr"?"index consulté":"index checked")+" "+e.verifiedIndexOn:"")));
  remoteBox.append(line);
 }
 remoteBox.append(el("p","remote-note",labels.note));
}
fetch("data/classics-corpus/remote-translations.json")
 .then(r=>{if(!r.ok)throw Error("remote catalogue");return r.json()})
 .then(d=>{if(d.schema!=="vitruvius-classics-remote-translations-v1"||!Array.isArray(d.entries))throw Error("registry malformed");remoteEntries=d.entries;drawRemote()})
 .catch(()=>{remoteEntries=[];remoteBox.hidden=true});

function refresh(){
 refreshFacets();
 const t=dict[locale],selected=work.value||new URLSearchParams(location.search).get("work")||"";
 work.replaceChildren(new Option(t.all,""));
 for(const w of chosenWorks().slice().sort((a,b)=>dating(a)-dating(b)||String(a.title).localeCompare(String(b.title),"es"))){
  const docxAvailable=window.ClassicsUploadedDocuments?.workIds?.has(w.id);
  const name=[w.title,w.author].filter(Boolean).join(" · ")+(indexed.has(w.id)?"":" "+t.missing)+(docxAvailable?" · DOCX":"");
  work.append(new Option(name,w.id));
 }
 for(const document of window.ClassicsUploadedDocuments?.uncataloguedDocs||[])
  work.append(new Option(document.label,"docx:"+document.id));
 if([...work.options].some(option=>option.value===selected))work.value=selected;
 coverage.textContent=t.ready(works.length,entries.length,works.length-indexed.size);
 drawRemote();
}
function switchLanguage(k){
 locale=Object.hasOwn(dict,k)?k:"es";
 const t=dict[locale];document.documentElement.lang=locale;
 $("home").textContent=t.home;$("search-submit").textContent=t.search;
 const chapters=$("capitula-nav");if(chapters)chapters.textContent=({es:"Lectura por capítulos",en:"Chapter reading",fr:"Lecture par chapitres"})[locale];
 input.placeholder=t.placeholder;$("intro").textContent=t.intro;$("work-label").textContent=t.work;
 $("results-heading").textContent=t.label;$("method-note").textContent=t.method;lex.textContent=t.lexicon;
 const button=$("language-toggle");if(button){
  button.textContent=({es:"Idioma · ES",en:"Language · EN",fr:"Langue · FR"})[locale];
  button.setAttribute("aria-label",({es:"Cambiar idioma: español, inglés o francés",en:"Switch language: English, French or Spanish",fr:"Changer de langue : français, espagnol ou anglais"})[locale]);
  button.title=({es:"Cambiar idioma: ES → EN → FR",en:"Switch language: ES → EN → FR",fr:"Changer de langue : ES → EN → FR"})[locale];
 }
 if(works.length)refresh();else coverage.textContent=t.wait;
 drawRemote();
 if(current)render(previous,current,diag);
 window.ClassicsUploadedDocuments?.refresh();
 updateLexicon();
 try{localStorage.setItem("vitruvius-ui-lang",locale)}catch{}
}
function updateLexicon(){
 const q=input.value.trim();bar.hidden=!q;
 if(q){const u=new URL("vitruvia-lexicon.html",location.href);u.searchParams.set("q",q);u.searchParams.set("mode","palabra");lex.href=u.href;lex.textContent=dict[locale].lexicon+" · "+q;lex.setAttribute("aria-label",dict[locale].lexicon+": "+q);}
}
const metadata=Promise.all([
 fetch(CATALOG).then(r=>{if(!r.ok)throw Error("catalogue");return r.json()}),
 (window.VitruviaIndexCache?.json(REGISTRY)||fetch(REGISTRY).then(r=>{if(!r.ok)throw Error("registry");return r.json()})),
 window.ClassicsOffsiteGreek?.entries()||Promise.resolve([]),
 window.ClassicsOffsiteLatin?.entries()||Promise.resolve([])
]).then(([catalog,registry,offsite,latinOffsite])=>{
 if(!Array.isArray(catalog.works)||registry.schema!=="vitruvia-classics-search-registry-v1"||
 !Array.isArray(registry.entries)||registry.entries.length!==registry.count)throw Error("inconsistent registry");
 works=catalog.works;
  entries=registry.entries.filter(bibliothecaLanguagePolicy).concat(offsite,latinOffsite);
  byId=new Map(works.map(w=>[w.id,w]));
 indexed=new Set(entries.filter(e=>e.format!=="historical-ocr-pages"&&byId.has(e.workId)).map(e=>e.workId));
  for(const [alias,target] of Object.entries(editionAliases))
   if(entries.some(e=>e.workId===target.workId&&e.edition===target.edition))indexed.add(alias);
 refresh();
}).catch(error=>{coverage.textContent=dict[locale].unavailable;throw error});
function provenance(w,r){
 const versions=(w?.localVersions||[]).filter(v=>v.language===r.language&&typeof v.citationChicago18==="string"&&v.citationChicago18.trim());
 if(versions.length===1)return {citation:versions[0].citationChicago18.trim(),chicago:true};
 // No inventar editorial, traductor, fecha o paginación para completar la cita.
 const partial=(r.attribution||"").trim()||
  (r.language===w?.language?w?.bibliography?.originalEditionCitation:w?.bibliography?.translationCitation)||"";
 const label=[w?.author||r.author||"Autor no identificado",w?.title||r.title||"Obra sin título"].join(". ");
 return {citation:partial||label+" Fuente digital: "+(r.source||"sin identificar"),chicago:false};
}

/* Exportar el pasaje documentado, sin generar un PDF inexistente.
   El navegador ofrece "Guardar como PDF" desde su diálogo de impresión. */
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function printPassage(record,workInfo,passageNode){
 const page=window.open("","_blank");
 if(!page){window.alert("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para guardar el pasaje como PDF.");return}
 const title=workInfo.title||record.title||"Bibliotheca";
 const credit=workInfo.author||record.author||"";
 const locus=record.locus||"—";
 const source=provenance(workInfo,record).citation;
 const url=typeof record.link==="string"?new URL(record.link,location.href).href:location.href;
 const html='<!doctype html><html lang="'+escapeHtml(record.language==="grc"?"el":record.language||"es")+'"><head><meta charset="utf-8"><title>'+
  escapeHtml(title+' · '+locus)+'</title><style>@page{size:A4;margin:20mm}body{font:12pt/1.65 Georgia,serif;color:#171717}header{padding-bottom:10mm;border-bottom:1px solid #aaa;margin-bottom:10mm}h1{font-size:20pt;margin:0 0 3mm}small{font:10pt/1.6 Arial,sans-serif;color:#444}main{text-align:justify;text-align-last:left;white-space:normal;overflow-wrap:break-word}mark{color:#111;background:#ffe34f;text-decoration:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}footer{font:9pt/1.5 Arial,sans-serif;border-top:1px solid #bbb;padding-top:5mm;margin-top:13mm;overflow-wrap:anywhere}</style></head><body><header><h1>'+
  escapeHtml(title)+'</h1><small>'+escapeHtml([credit,locus,languages[record.language]||record.language].filter(Boolean).join(" · "))+
  '</small></header><main>'+passageNode.innerHTML+'</main><footer>'+escapeHtml(source)+'<p>'+escapeHtml(url)+'</p></footer></body></html>';
 page.document.open();page.document.write(html);page.document.close();
 page.addEventListener("load",()=>{page.focus();page.print()},{once:true});
}
function passageActions(record,workInfo,passageNode){
 const actions=el("div","passage-actions");
 const pdf=el("button","passage-action",locale==="en"?"PDF":locale==="fr"?"PDF":"PDF");
 pdf.type="button";pdf.title=locale==="es"?"Imprimir o guardar este pasaje como PDF":"Print or save passage as PDF";
 pdf.setAttribute("aria-label",pdf.title);
 pdf.addEventListener("click",()=>printPassage(record,workInfo,passageNode));
 const mail=el("a","passage-action","Mail");
 mail.title=locale==="es"?"Enviar este pasaje por correo":"Email this passage";
 mail.setAttribute("aria-label",mail.title);
 const title=workInfo.title||record.title||"Bibliotheca";
 const origin=typeof record.link==="string"?new URL(record.link,location.href).href:location.href;
 const sourceText=String(passageNode.textContent||"").trim();
 const shortText=sourceText.length>1400?sourceText.slice(0,1400).replace(/\s+\S*$/,"")+"…":sourceText;
 const citation=provenance(workInfo,record).citation;
 const header=[title,[workInfo.author||record.author,record.locus,languages[record.language]||record.language].filter(Boolean).join(" · ")].filter(Boolean).join("\n");
 const message=[header,shortText,citation,origin].filter(Boolean).join("\n\n");
 mail.href="mailto:?subject="+encodeURIComponent(title+" · "+(record.locus||"pasaje"))+"&body="+encodeURIComponent(message);
 const whats=el("a","passage-action","WhatsApp");whats.href="https://wa.me/?text="+encodeURIComponent(message);whats.target="_blank";whats.rel="noopener noreferrer";whats.title="Compartir pasaje por WhatsApp";actions.append(pdf,mail,whats);return actions;
}
/* Diccionario contextual: emplea únicamente fichas editoriales verificables del Lexicon. */
let etymTask=null;
function etymEntries(){
 if(!etymTask)etymTask=fetch("data/lexicon/etymologicum.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>Array.isArray(d.entries)?d.entries:[]).catch(e=>{etymTask=null;throw e});
 return etymTask;
}
const dictionaryPanel=el("aside","bibliotheca-dictionary");
dictionaryPanel.hidden=true;
dictionaryPanel.setAttribute("role","dialog");
dictionaryPanel.setAttribute("aria-modal","false");
dictionaryPanel.setAttribute("aria-label","Diccionario contextual");
dictionaryPanel.tabIndex=-1;
document.body.append(dictionaryPanel);
const dictLink=(term)=>{const u=new URL("vitruvia-lexicon.html",location.href);u.searchParams.set("q",term);u.searchParams.set("mode","palabra");return u.href};
async function openDictionary(term,language){
 dictionaryPanel.replaceChildren();
 const head=el("div","dictionary-heading");
 const name=el("h3","",term);
 const close=el("button","dictionary-close","×");close.type="button";close.setAttribute("aria-label","Cerrar diccionario");
 close.addEventListener("click",()=>{dictionaryPanel.hidden=true});
 head.append(name,close);dictionaryPanel.append(head);
 dictionaryPanel.append(el("p","dictionary-status","Consultando fichas del Lexicon…"));
 dictionaryPanel.hidden=false;dictionaryPanel.focus();
 const actions=el("div","dictionary-actions");
 const link=el("a","passage-action","Estudiar en Lexicon");link.href=dictLink(term);
 actions.append(link);
 const text=()=>dictionaryPanel.querySelector(".dictionary-definition")?.innerText||("Consulta léxica: "+term);
 const makePrint=()=>{const popup=window.open("","_blank");if(!popup){window.alert("Permite ventanas emergentes para guardar como PDF.");return}
  popup.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Diccionario · '+escapeHtml(term)+'</title><style>@page{size:A4;margin:20mm}body{font:13pt/1.6 Georgia,serif}main{white-space:pre-wrap}</style></head><body><h1>'+escapeHtml(term)+'</h1><main>'+escapeHtml(text())+'</main><p>Vitruvius Digital Library · Lexicon</p></body></html>');
  popup.document.close();popup.focus();popup.print()};
 const p=el("button","passage-action","PDF");p.type="button";p.addEventListener("click",makePrint);
 const mail=el("a","passage-action","Mail");const whats=el("a","passage-action","WhatsApp");
 function refreshShare(){
  const content=term+"\n"+text()+"\n"+dictLink(term);
  mail.href="mailto:?subject="+encodeURIComponent("Lexicon · "+term)+"&body="+encodeURIComponent(content);
  whats.href="https://wa.me/?text="+encodeURIComponent(content);
 }
 mail.addEventListener("click",refreshShare);whats.addEventListener("click",refreshShare);
 whats.target="_blank";whats.rel="noopener noreferrer";
 actions.append(p,mail,whats);dictionaryPanel.append(actions);
 const definition=el("div","dictionary-definition");dictionaryPanel.insertBefore(definition,actions);
 try{
  const entries=await etymEntries();
  if(dictionaryPanel.querySelector("h3")?.textContent!==term)return;
  const key=fold(term).replace(/j/g,"i").replace(/v/g,"u");
  const hits=entries.filter(e=>(!language||e.l===language||language==="el"&&e.l==="grc")&&[e.lemma,e.id,e.head].some(v=>fold(v||"").replace(/j/g,"i").replace(/v/g,"u")===key));
  const entry=hits[0];
  if(entry){
   definition.append(el("p","dictionary-meta",[entry.l==="grc"?"Griego":"Latín",entry.pos,entry.morph].filter(Boolean).join(" · ")));
   for(const sense of entry.sens||[])definition.append(el("p","",sense));
   if(entry.etym)definition.append(el("p","", "Etimología: "+entry.etym));
   if(entry.refs?.length)definition.append(el("p","dictionary-meta","Fuentes: "+entry.refs.join("; ")));
  }else definition.append(el("p","","No hay una ficha lexicográfica verificada para esta forma exacta en el repertorio local. Consulta Lexicon para analizar variantes, lemas y diccionarios adicionales."));
 }catch(err){definition.append(el("p","","No se pudo cargar el diccionario: "+err.message+". Puede abrir Lexicon mediante el enlace."))}
 dictionaryPanel.querySelector(".dictionary-status")?.remove();
}
list.addEventListener("click",event=>{
 const mark=event.target.closest("mark.lexical-hit");if(!mark)return;
 openDictionary(mark.textContent,mark.closest("[lang]")?.getAttribute("lang")||"");
});
list.addEventListener("keydown",event=>{
 if((event.key==="Enter"||event.key===" ")&&event.target.matches("mark.lexical-hit")){event.preventDefault();openDictionary(event.target.textContent,event.target.closest("[lang]")?.getAttribute("lang")||"")}
});
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&!dictionaryPanel.hidden)dictionaryPanel.hidden=true});

/* Acciones de la biblioteca: exportan únicamente las coincidencias visibles. */
const printAll=$("bibliotheca-print"),mailAll=$("bibliotheca-mail"),whatsappAll=$("bibliotheca-whatsapp");
function bibliographyExport(){
 const selection=window.getSelection()?.toString().trim();
 const text=selection||Array.from(list.querySelectorAll(".hit")).map(hit=>hit.innerText).join("\n\n");
 return text||"No hay resultados para exportar.";
}
function bibliographyShare(){
 const q=input.value.trim(),exported=bibliographyExport();
 const permalink=new URL(location.href);if(q)permalink.searchParams.set("q",q);
 const provenance="Bibliotheca Graeca et Latina · "+q+"\n";
 const mailPayload=provenance+exported.slice(0,4500)+(exported.length>4500?"… [extracto]":"")+"\n"+permalink.href;
 const whatsappPayload=provenance+exported.slice(0,1400)+(exported.length>1400?"… [extracto]":"")+"\n"+permalink.href;
 mailAll.href="mailto:?subject="+encodeURIComponent("Bibliotheca · "+q)+"&body="+encodeURIComponent(mailPayload);
 whatsappAll.href="https://wa.me/?text="+encodeURIComponent(whatsappPayload);
}
printAll?.addEventListener("click",()=>{
 const text=bibliographyExport();
 if(text==="No hay resultados para exportar."){window.alert("Busca primero una palabra o frase.");return}
 const pop=window.open("","_blank");
 if(!pop){window.alert("El navegador bloqueó la ventana de impresión.");return}
 pop.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Bibliotheca · Resultados</title><style>@page{size:A4;margin:18mm}body{font:12pt/1.6 Georgia,serif;color:#151515}h1{font:22pt Georgia,serif}main{white-space:pre-wrap;overflow-wrap:anywhere}small{font:10pt Arial,sans-serif}</style></head><body><h1>Bibliotheca Graeca et Latina</h1><small>Consulta: '+escapeHtml(input.value.trim())+' · '+escapeHtml(location.href)+'</small><main>'+escapeHtml(text)+'</main></body></html>');
 pop.document.close();pop.focus();pop.print();
});
mailAll?.addEventListener("click",bibliographyShare);
whatsappAll?.addEventListener("click",bibliographyShare);

function originalRank(language){return ({la:0,grc:0,es:1,fr:2,en:3})[language]??4}
function attestedLexeme(row,q){
 const passage=String(row.passageText||row.excerpt||"");
 const target=fold(row.term||q).replace(/j/g,"i").replace(/v/g,"u");
 const tokens=passage.match(/[\\p{L}\\p{M}]+/gu)||[];
 const match=tokens.find(w=>fold(w).replace(/j/g,"i").replace(/v/g,"u")===target);
 if(match)return match.normalize("NFC");
 if(row.language==="grc"){
  const roman=fold(romanizeGreek(row.term||q));
  const greek=tokens.find(w=>/[\\p{Script=Greek}]/u.test(w)&&fold(romanizeGreek(w))===roman);
  if(greek)return greek.normalize("NFC");
 }
 return row.term||q;
}
function render(rows,q,details){
 previous=rows;current=q;diag=details||{};
 const t=dict[locale],sorted=rows.slice().sort((a,b)=>{
  const wa=byId.get(a.workId)||{},wb=byId.get(b.workId)||{};
  return dating(wa)-dating(wb)||String(wa.title||a.title).localeCompare(String(wb.title||b.title),"es")||
   a.workId.localeCompare(b.workId)||String(a.locus).localeCompare(String(b.locus),undefined,{numeric:true})||
   (originalRank(a.language)-originalRank(b.language));
 });
 root.hidden=false;list.replaceChildren();
 const groupCounts=new Map();
 for(const r of sorted)groupCounts.set(r.workId,(groupCounts.get(r.workId)||0)+(r.hitsInPassage||1));
 const total=[...groupCounts.values()].reduce((sum,n)=>sum+n,0);
  const originalTotal=sorted.filter(r=>["la","grc"].includes(r.language)).reduce((n,r)=>n+(r.hitsInPassage||1),0);
 status.textContent=(locale==="fr"?"Original grec/latin : ":locale==="en"?"Original Greek/Latin: ":"Original griego/latino: ")+originalTotal+" · "+t.stats(total,sorted.length,new Set(sorted.map(r=>r.workId)).size)+
  (details?.transliterations?.length?" · "+t.translit(details.transliterations):"")+
  (details?.failed?" · "+t.failed:"");
 if(!sorted.length)list.append(el("p","",t.none));
 let last="",section=null,passages=null;const frag=document.createDocumentFragment();
 for(const r of sorted){
  if(last!==r.workId){
   last=r.workId;const w=byId.get(last)||{};section=el("section","group");
   section.append(el("h3","",w.title||r.title));
   section.append(el("p","meta",[w.author||r.author,w.dating||t.noDate,t.groupCount(groupCounts.get(last)||0)].filter(Boolean).join(" · ")));
   // Un libro puede contener más de una edición o lengua: no se confunden sus recuentos.
   const relevant=sorted.filter(z=>z.workId===last);
   const countsByVersion=new Map(),references=new Map();
   for(const edition of relevant){
    const key=[edition.language,edition.source,edition.edition].join("|");
    countsByVersion.set(key,(countsByVersion.get(key)||0)+(edition.hitsInPassage||1));
    if(!references.has(key))references.set(key,{language:edition.language,record:provenance(w,edition)});
   }
   const versionInfo=[...countsByVersion].map(([key,n])=>{
    const lang=key.split("|")[0];return (languages[lang]||lang)+": "+n;
   }).join(" · ");
   section.append(el("p","version-counts",versionInfo));
    const originalCount=relevant.filter(z=>["la","grc"].includes(z.language)).reduce((n,z)=>n+(z.hitsInPassage||1),0);
    section.append(el("p","version-counts",(locale==="en"?"Original occurrences: ":locale==="fr"?"Occurrences dans l’original : ":"Apariciones en el original: ")+originalCount+" · "+(locale==="es"?"Traducciones contadas por separado":locale==="fr"?"Traductions comptées séparément":"Translations counted separately")));
   // Navegación cruzada: conservar el identificador real de obra y la grafía
   // efectivamente hallada; no afirmar concordancias alineadas entre ediciones.
   const sourceRow=relevant.find(z=>["grc","la"].includes(z.language))||relevant[0];
    const term=attestedLexeme(sourceRow,q);
   const cross=el("p","version-counts");
   const toVitruvia=new URL("vitruvia.html",location.href);
   toVitruvia.searchParams.set("q",term);
   toVitruvia.searchParams.set("mode","all");
   const vitruvia=el("a","passage-link",locale==="en"?"Find term in Vitruvia":locale==="fr"?"Chercher dans Vitruvia":"Consultar término en Vitruvia");
   vitruvia.href=toVitruvia.href;
   const toLexicon=new URL("vitruvia-lexicon.html",location.href);
   toLexicon.searchParams.set("q",term);
   toLexicon.searchParams.set("mode","palabra");
   const lexicon=el("a","passage-link",locale==="en"?"Study term in Lexicon":locale==="fr"?"Étudier dans Lexicon":"Estudiar término en Lexicon");
   lexicon.href=toLexicon.href;
   cross.append(vitruvia,document.createTextNode(" · "),lexicon);
   section.append(cross);
   const referenceDetails=el("details","references");
   referenceDetails.append(el("summary","",locale==="es"?"Referencias bibliográficas · Chicago 18":locale==="fr"?"Références bibliographiques · Chicago 18":"Bibliographic references · Chicago 18"));
   const referenceList=el("ul","reference-list");
   for(const {language,record} of references.values()){
    const prefix=record.chicago?"":"["+(locale==="es"?"Referencia parcial: datos insuficientes para Chicago 18":locale==="fr"?"Référence partielle : données insuffisantes pour Chicago 18":"Partial reference: insufficient data for Chicago 18")+"] ";
    referenceList.append(el("li","",(languages[language]||language)+" · "+prefix+record.citation));
   }
   referenceDetails.append(referenceList);section.append(referenceDetails);
   passages=el("ol","hits");section.append(passages);frag.append(section);
  }
  const li=el("li","hit");li.lang=r.language==="grc"?"el":r.language||"es";
  li.append(el("span","locus",t.loc+" "+(r.locus||"—")+" · "+(languages[r.language]||r.language)+" · "+(r.hitsInPassage||1)));
  if(["la","grc"].includes(r.language)){
    const lexeme=el("p","lexeme-attested",attestedLexeme(r,q));
    lexeme.lang=r.language==="grc"?"grc":"la";
    lexeme.title="Grafía documentada en el pasaje; no reconstrucción editorial";
    li.append(lexeme);
   }
   const p=el("p","");decorate(p,r.passageText||r.excerpt||"",r.term||q);li.append(p);
   // Optional micro-translation: original and documented parallels stay intact.
   // No external request happens until the reader presses the translation button.
   if(["la","grc"].includes(r.language)){
    window.VitruviaInlineTranslation?.attach(p,{
     sourceLanguage:r.language,originalText:r.passageText||r.excerpt||""
    });
   }
   if(r.parallelTranslations?.length){
    const panel=el("div","parallel-attested");
    for(const tr of r.parallelTranslations){
     const box=el("div","parallel-attested-language");
     box.append(el("strong","",(languages[tr.language]||tr.language)+" · "+tr.edition));
     if(tr.available){const txt=el("p","",tr.text);txt.lang=tr.language;box.append(txt)}
     else box.append(el("p","parallel-unavailable",tr.note||"Traducción no alineada"));
     panel.append(box);
    }
    li.append(panel);
   }
  // Enlace auténtico al pasaje citado; no crear nuevos loci ni duplicar visores.
  if(typeof r.link==="string"){
   try{const target=new URL(r.link,location.href);
    if(target.origin===location.origin&&/^https?:$/.test(target.protocol)){
     const label=({es:"Abrir pasaje",en:"Open passage",fr:"Ouvrir le passage"})[locale];
     const a=el("a","passage-link",label);a.href=target.href;li.append(a);
    }
   }catch{}
  }
  // Lectura en contexto: abre el pasaje en el lector por capítulos (original y traducción) cuando hay locus.
  // Solo loci canónicos numerados (1.2.3, 2.praef.1, 4.12): los segmentos HTML sin numeración común no se enlazan.
  if(r.workId&&r.locus&&/^\d+(?:\.(?:praef|\d+))*(?:\.\d+)?$/.test(String(r.locus).trim())){
   const ctx=new URL("bibliotheca-capitula.html",location.href);ctx.searchParams.set("work",r.workId);ctx.searchParams.set("locus",String(r.locus));
   ctx.searchParams.set("side",["la","grc"].includes(r.language)?"left":"right");
   const a=el("a","passage-link",({es:"Leer en contexto (original · traducción)",en:"Read in context (original · translation)",fr:"Lire en contexte (original · traduction)"})[locale]);a.href=ctx.href;li.append(a);
  }
  li.append(passageActions(r,byId.get(r.workId)||{},p));
  passages.append(li);
 }
 list.append(frag);
 $("unindexed").textContent=t.outside(works.length-indexed.size)+(details?.failed?" "+t.failed:"");
}
async function search(updateHistory=true){
 const id=++serial,q=input.value.trim();updateLexicon();root.hidden=true;list.replaceChildren();
 window.ClassicsUploadedDocuments?.clear();
 if(q.length>180||fold(q).replace(/[^\p{L}\p{N}]/gu,"").length<2){status.textContent=dict[locale].short;return}
 status.textContent=dict[locale].loading;$("search-submit").disabled=true;
 try{
  await metadata;if(id!==serial)return;
  const selectedWork=work.value;
  const alias=editionAliases[selectedWork];
  const workId=alias?.workId||selectedWork;
  const allowedWorkIds=chosenWorks().map(w=>w.id);
  const added=window.ClassicsUploadedDocuments;
  if(selectedWork.startsWith("docx:")){
   if(!added?.documentIds?.has(selectedWork.slice(5))){status.textContent=dict[locale].wrong;return}
   root.hidden=false;
   status.textContent=locale==="en"?"Search in an uploaded DOCX document (not an accredited manuscript locus).":
    locale==="fr"?"Recherche dans un document DOCX déposé (sans locus manuscrit vérifié).":
    "Búsqueda en documento DOCX subido (sin locus manuscrito cotejado).";
   void added.search(q,selectedWork,()=>id===serial);
   const docUrl=new URL(location.href);docUrl.searchParams.set("q",q);docUrl.searchParams.set("work",selectedWork);
   if(updateHistory&&docUrl.href!==location.href)history.pushState(null,"",docUrl);return;
  }
  if(selectedWork&&!indexed.has(selectedWork)){
   if(added?.workIds?.has(workId)){
    root.hidden=false;
    status.textContent=locale==="en"?"Original edition not yet indexed. Searching the already uploaded DOCX separately.":
     locale==="fr"?"Édition originale non encore indexée. Recherche séparée dans le DOCX disponible.":
     "Edición original aún no indexada. Buscando por separado en el DOCX ya alojado.";
    void added.search(q,workId,()=>id===serial);
    return;
   }
   status.textContent=dict[locale].wrong;return;
  }
  if(added)void added.search(q,workId,()=>id===serial);
  if(typeof window.ClassicsCorpusSearch?.searchPassages!=="function")throw Error("engine unavailable");
  const transliterations=await attestedGreekForms(/^gr:/i.test(q)?q.slice(3).trim():q);
  if(id!==serial)return;
  let lastPaint=0;
  const onProgress=(partial,progress)=>{
   const now=Date.now();if(!progress.complete&&progress.examined>4&&now-lastPaint<600)return;
   lastPaint=now;
   if(id!==serial)return;
   render(partial,q,{...progress,partial:true,transliterations});
   status.textContent=dict[locale].stats(partial.reduce((n,row)=>n+(row.hitsInPassage||1),0),partial.length,new Set(partial.map(row=>row.workId)).size)+
    " · "+progress.examined+"/"+progress.targeted+" versiones examinadas"+
    (progress.failed?" · "+progress.failed+" fuentes no disponibles":"")+
    (!progress.complete?" · buscando…":"");
  };
  const hits=await window.ClassicsCorpusSearch.searchPassages([q,...transliterations,...(morphCheckbox.checked?morphologicalForms(q):[])],{workId,allowedWorkIds,allMatches:true,includeFullText:true,includeOCR:false,edition:alias?.edition||"",onProgress});
  if(id!==serial)return;
  const details={...(window.ClassicsCorpusSearch.diagnostics?.()||{}),transliterations};render(hits,q,details);
  const url=new URL(location.href);url.searchParams.set("q",q);
  if(selectedWork)url.searchParams.set("work",selectedWork);else url.searchParams.delete("work");
  if(era.value)url.searchParams.set("era",era.value);else url.searchParams.delete("era");
  if(genre.value)url.searchParams.set("genre",genre.value);else url.searchParams.delete("genre");
  if(updateHistory&&url.href!==location.href)history.pushState(null,"",url);
 }catch{if(id===serial)status.textContent=dict[locale].unavailable}
 finally{if(id===serial)$("search-submit").disabled=false}
}
$("search-form").addEventListener("submit",ev=>{ev.preventDefault();void search()});
work.addEventListener("change",()=>{drawRemote();if(input.value.trim())void search()});
for(const facet of [era,genre])facet.addEventListener("change",()=>{refresh();if(input.value.trim())void search()});
input.addEventListener("input",updateLexicon);
morphCheckbox.addEventListener("change",()=>{if(input.value.trim())void search()});
$("language-toggle").addEventListener("click",()=>{
 const next=({es:"en",en:"fr",fr:"es"})[locale]||"es";
 switchLanguage(next);
});
const params=new URLSearchParams(location.search),initial=(params.get("q")||params.get("term")||"").trim();
if(initial)input.value=initial;
const initialEra=params.get("era")||"",initialGenre=params.get("genre")||"";
let stored="es";try{stored=localStorage.getItem("vitruvius-ui-lang")||"es"}catch{}
switchLanguage(params.get("ui")||stored);updateLexicon();
metadata.then(()=>{
 if(initialEra&&[...era.options].some(x=>x.value===initialEra))era.value=initialEra;
 if(initialGenre&&[...genre.options].some(x=>x.value===initialGenre))genre.value=initialGenre;
 refresh();window.dispatchEvent(new Event("bibliotheca:filters-ready"));
 if(initial&&serial===0&&input.value.trim()===initial)void search(false);
}).catch(()=>{});
// GitHub Pages needs client-side URL restoration when a reader navigates
// between search queries without reloading the document.
window.addEventListener("popstate",()=>{
 const params=new URLSearchParams(location.search);
 const q=(params.get("q")||params.get("term")||"").trim();
 const restore=++serial; // invalidate pending searches and progressive paints
 input.value=q;
 updateLexicon();
 metadata.then(()=>{
  if(restore!==serial)return;
  const eraValue=params.get("era")||"",genreValue=params.get("genre")||"";
  if(params.get("ui"))switchLanguage(params.get("ui"));
  if([...era.options].some(x=>x.value===eraValue))era.value=eraValue;
  if([...genre.options].some(x=>x.value===genreValue))genre.value=genreValue;
  refresh();
  const workValue=params.get("work")||"";
  if([...work.options].some(x=>x.value===workValue))work.value=workValue;
  drawRemote();
  if(q)void search(false);
  else{
   root.hidden=true;
   list.replaceChildren();
   status.textContent="";
   $("search-submit").disabled=false;
  }
 }).catch(()=>{if(restore===serial)status.textContent=dict[locale].unavailable});
});
})();
