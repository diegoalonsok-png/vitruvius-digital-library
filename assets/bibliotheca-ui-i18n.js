/* Bibliotheca · traducción de la interfaz completa (no de los datos).
   bibliotheca-simple.js traduce su propio buscador; este módulo sigue el mismo
   cambio de idioma (evento vitruvius:language-changed) para la barra de enlaces,
   el panel de cifras, la cobertura, las herramientas de cita y las fechas.
   Títulos de obras, nombres de autores y notas de procedencia se dejan como están:
   son registros bibliográficos, no interfaz. */
(()=>{
"use strict";
const T={
 "Corpus clásico · concordancias documentadas · lectura de originales y traducciones":{en:"Classical corpus · documented concordances · originals and translations",fr:"Corpus classique · concordances documentées · originaux et traductions"},
 "Biblioteca Vitruvius":{en:"Vitruvius Library",fr:"Bibliothèque Vitruvius"},
 "Vitruvia · Buscador":{en:"Vitruvia · Search",fr:"Vitruvia · Recherche"},
 "Lexicon · Etimologías":{en:"Lexicon · Etymologies",fr:"Lexicon · Étymologies"},
 "Laboratorium · investigación":{en:"Laboratorium · research",fr:"Laboratorium · recherche"},
 "Mapa general imprimible":{en:"Printable general map",fr:"Carte générale imprimable"},
 "Lectura por capítulos":{en:"Chapter reading",fr:"Lecture par chapitres"},
 "Traducciones y cobertura":{en:"Translations and coverage",fr:"Traductions et couverture"},
 "Auditoría académica":{en:"Academic audit",fr:"Audit académique"},
 "Tablas explicativas · V297":{en:"Explanatory tables · V297",fr:"Tableaux explicatifs · V297"},
 "Bibliotheca Graeca et Latina · corpus en cifras":{en:"Bibliotheca Graeca et Latina · the corpus in figures",fr:"Bibliotheca Graeca et Latina · le corpus en chiffres"},
 "Obras catalogadas, textos buscables y traducciones son magnitudes distintas. Las fichas pendientes incluyen versiones editoriales de una misma obra; no equivalen a obras antiguas distintas.":{en:"Catalogued works, searchable texts and translations are different magnitudes. Pending records include editorial versions of one work; they are not distinct ancient works.",fr:"Œuvres cataloguées, textes interrogeables et traductions sont des grandeurs distinctes. Les fiches en attente comprennent des versions éditoriales d’une même œuvre ; elles ne valent pas des œuvres antiques distinctes."},
 "obras y tratados catalogados":{en:"catalogued works and treatises",fr:"œuvres et traités catalogués"},
 "Ver listado académico":{en:"View academic list",fr:"Voir la liste académique"},
 "Traducción: no alojada en el sitio":{en:"Translation: not hosted on the site",fr:"Traduction : non hébergée sur le site"},
 "Leer original y traducción en dos visores":{en:"Read original and translation side by side",fr:"Lire l’original et la traduction côte à côte"},
 "originales indexados":{en:"indexed originals",fr:"originaux indexés"},
 "obras con traducción alojada":{en:"works with a hosted translation",fr:"œuvres avec traduction hébergée"},
 "versiones textuales indexadas":{en:"indexed textual versions",fr:"versions textuelles indexées"},
 "Abrir versión":{en:"Open version",fr:"Ouvrir la version"},
 "fichas sin índice original propio":{en:"records without their own original index",fr:"fiches sans index propre de l’original"},
 "Datos desde los registros locales y manifiestos externos verificados. Se cuentan por separado las versiones; las traducciones externas solo enlazadas no se suman. Las fichas editoriales de Vitruvio pueden corresponder a versiones de la misma obra.":{en:"Data from local records and verified external manifests. Versions are counted separately; linked-only external translations are not added. Vitruvius’ editorial records may be versions of the same work.",fr:"Données issues des registres locaux et des manifestes externes vérifiés. Les versions sont comptées séparément ; les traductions externes seulement liées ne sont pas additionnées. Les fiches éditoriales de Vitruve peuvent correspondre à des versions d’une même œuvre."},
 "Ver desglose de traducciones":{en:"View translation breakdown",fr:"Voir la ventilation des traductions"},
 "Bibliotheca · cobertura de textos clásicos":{en:"Bibliotheca · coverage of classical texts",fr:"Bibliotheca · couverture des textes classiques"},
 "obras catalogadas":{en:"catalogued works",fr:"œuvres cataloguées"},
 "con ficha académica completa":{en:"with a full academic record",fr:"avec fiche académique complète"},
 "originales locales":{en:"local originals",fr:"originaux locaux"},
 "originales externos verificados":{en:"verified external originals",fr:"originaux externes vérifiés"},
 "originales con texto buscable":{en:"originals with searchable text",fr:"originaux avec texte interrogeable"},
 "pendientes":{en:"pending",fr:"en attente"},
 "versiones textuales locales":{en:"local textual versions",fr:"versions textuelles locales"},
 "Cobertura documental: índices locales y dos manifiestos externos contrastados con la conciliación editorial. Los textos externos no están alojados en Pages. La coincidencia de metadatos NO certifica integridad, lectura en navegador, traducción ni colación de manuscritos.":{en:"Documentary coverage: local indexes and two external manifests checked against the editorial reconciliation. External texts are not hosted on Pages. Matching metadata does NOT certify completeness, in-browser reading, translation or manuscript collation.",fr:"Couverture documentaire : index locaux et deux manifestes externes confrontés à la conciliation éditoriale. Les textes externes ne sont pas hébergés sur Pages. La concordance des métadonnées ne certifie NI l’intégrité, NI la lecture dans le navigateur, NI la traduction, NI la collation des manuscrits."},
 "Método y auditoría":{en:"Method and audit",fr:"Méthode et audit"},
 "Metodología filológica":{en:"Philological methodology",fr:"Méthodologie philologique"},
 "Copiar enlace de búsqueda":{en:"Copy search link",fr:"Copier le lien de recherche"},
 "Copiar referencia":{en:"Copy reference",fr:"Copier la référence"},
 "Guía universitaria":{en:"University guide",fr:"Guide universitaire"},
 "Cómo citar":{en:"How to cite",fr:"Comment citer"},
 "Procedencia y cobertura":{en:"Provenance and coverage",fr:"Provenance et couverture"},
 "Obras del género seleccionado":{en:"Works in the selected genre",fr:"Œuvres du genre sélectionné"},
 "Incluir formas flexionadas documentadas (cobertura parcial)":{en:"Include documented inflected forms (partial coverage)",fr:"Inclure les formes fléchies documentées (couverture partielle)"},
 "PDF · Imprimir resultados":{en:"PDF · Print results",fr:"PDF · Imprimer les résultats"},
 "Perseus / Scaife · auditoría de fuentes, códigos PHI/TLG y citas CTS":{en:"Perseus / Scaife · source audit, PHI/TLG codes and CTS citations",fr:"Perseus / Scaife · audit des sources, codes PHI/TLG et citations CTS"},
 "Erratas filológicas cotejadas":{en:"Collated philological errata",fr:"Errata philologiques collationnés"},
 "Concordancias académicas:":{en:"Academic concordances:",fr:"Concordances académiques :"},
 "índice de búsquedas verificadas":{en:"index of verified searches",fr:"index des recherches vérifiées"},
 "Palabra del texto":{en:"Word in the text",fr:"Mot du texte"},
 "Cerrar ×":{en:"Close ×",fr:"Fermer ×"},
 "VITRUVIA LEXICON · LECTURA FILOLÓGICA":{en:"VITRUVIA LEXICON · PHILOLOGICAL READING",fr:"VITRUVIA LEXICON · LECTURE PHILOLOGIQUE"}
};
const LENGUA={"latín":["Latin","latin"],"griego antiguo":["Ancient Greek","grec ancien"],"inglés":["English","anglais"],"castellano":["Spanish","espagnol"],"francés":["French","français"],"griego":["Greek","grec"]};
const PATRONES=[
 [/^(\d+) registros listados \(según inventarios consultados\)\.$/,{en:"$1 records listed (according to the inventories consulted).",fr:"$1 fiches listées (selon les inventaires consultés)."}],
 [/^Matriz codicológica · (\d+) obras$/,{en:"Codicological matrix · $1 works",fr:"Matrice codicologique · $1 œuvres"}],
 [/^Descargar Excel académico · (\d+) obras$/,{en:"Download academic Excel · $1 works",fr:"Télécharger l’Excel académique · $1 œuvres"}],
 [/^Estado documental de las (\d+) obras$/,{en:"Documentary status of the $1 works",fr:"État documentaire des $1 œuvres"}],
 [/^Registro auditable de las (\d+) obras \(JSON\)$/,{en:"Auditable register of the $1 works (JSON)",fr:"Registre vérifiable des $1 œuvres (JSON)"}],
 [/^Auditoría de textos y códices · (.+) \(JSON\)$/,{en:"Audit of texts and codices · $1 (JSON)",fr:"Audit des textes et des codices · $1 (JSON)"}]
];
const lang=()=>{const l=(document.documentElement.lang||"es").slice(0,2);return l==="en"||l==="fr"?l:"es"};
const orig=new WeakMap();
function fecha(s,l){ /* «· siglo II a. C.» → «· 2nd c. BCE»: sólo el andamiaje, no la datación */
 const k=l==="en"?0:1;
 return s.replace(/\b[Ss]iglos?\b/g,k?"s.":"cent.").replace(/\bs\. /g,k?"s. ":"c. ").replace(/a\. C\./g,k?"av. J.-C.":"BCE").replace(/d\. C\./g,k?"apr. J.-C.":"CE")
  .replace(/\(datación debatida\)|\(discutido\)|\(datación discutida\)/g,k?"(datation discutée)":"(disputed date)").replace(/época arcaica y helenística/,k?"époque archaïque et hellénistique":"archaic and Hellenistic period")
  .replace(/Finales del/g,k?"Fin du":"Late").replace(/finales del/g,k?"fin du":"late").replace(/comienzos del/g,k?"début du":"early").replace(/primera mitad del/g,k?"première moitié du":"first half of the");
}
function traducir(n,l){
 const s=orig.get(n);const t=s.trim();if(!t)return;
 let out=null;
 if(T[t])out=T[t][l];
 else{for(const [re,r] of PATRONES)if(re.test(t)){out=t.replace(re,r[l]);break}}
 if(!out){const m=t.match(/^(Original|Traducción): (.+)$/);if(m){const L=LENGUA[m[2]];const v=L?L[l==="en"?0:1]:m[2];out=(m[1]==="Original"?"Original":l==="en"?"Translation":"Traduction")+(l==="fr"?" : ":": ")+v}}
 if(!out&&/^·\s/.test(t)&&/siglo|s\. |a\. C\.|d\. C\.|época|datación/.test(t)&&t.length<90)out=fecha(t,l);
 if(out)n.nodeValue=s.replace(t,out);
}
const fuera=e=>!e||e.closest("script,style,#results,#classic-work,.results,[data-no-ui-i18n]")||e.matches?.("option");
function aplicar(){
 const l=lang();
 const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 obs.disconnect();
 for(let n=w.nextNode();n;n=w.nextNode()){
  if(fuera(n.parentElement))continue;
  if(!orig.has(n))orig.set(n,n.nodeValue);
  if(l==="es"){if(n.nodeValue!==orig.get(n))n.nodeValue=orig.get(n);continue}
  traducir(n,l);
 }
 obs.observe(document.body,{childList:true,subtree:true});
}
let t=0;const obs=new MutationObserver(()=>{if(lang()==="es")return;clearTimeout(t);t=setTimeout(aplicar,120)});
document.addEventListener("vitruvius:language-changed",()=>setTimeout(aplicar,50));
const iniciar=()=>{aplicar();setTimeout(aplicar,2500)};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar);else iniciar();
/* Cobertura complementaria de controles visibles y creados dinámicamente.
   Se traducen únicamente nodos de interfaz; títulos de obras, citas, pasajes,
   etiquetas de autor y procedencias quedan en su idioma documental. */
const UI_TRANSLATIONS={
"Bibliotheca": ["Bibliotheca","Bibliotheca"],
"Graeca et Latina":["Graeca et Latina","Graeca et Latina"],
"Inicio":["Home","Accueil"],
"Buscar":["Search","Rechercher"],
"Buscar ↗":["Search ↗","Rechercher ↗"],
"Filtros":["Filters","Filtres"],
"Catálogo de obras":["Works catalogue","Catalogue des œuvres"],
"Obra o autor":["Work or author","Œuvre ou auteur"],
"Buscar obra":["Find work","Rechercher une œuvre"],
"Ver catálogo completo":["Browse full catalogue","Voir le catalogue complet"],
"Ocultar catálogo completo":["Hide full catalogue","Masquer le catalogue complet"],
"Mostrar más obras":["Show more works","Afficher davantage d’œuvres"],
"Obras · catálogo":["Works · catalogue","Œuvres · catalogue"],
"Texto · Lexicon":["Text · Lexicon","Texte · Lexicon"],
"Todas las materias":["All subjects","Toutes les matières"],
"Todas las lenguas":["All languages","Toutes les langues"],
"Todas las épocas":["All periods","Toutes les époques"],
"Todas las épocas históricas":["All historical periods","Toutes les périodes historiques"],
"Todos los siglos de composición":["All centuries of composition","Tous les siècles de composition"],
"Todos los tipos de obras":["All work genres","Tous les genres d’œuvres"],
"Todos los libros indexados":["All indexed books","Tous les livres indexés"],
"Todas las obras":["All works","Toutes les œuvres"],
"Toda la biblioteca":["Entire library","Bibliothèque entière"],
"Autor · título (A–Z)":["Author · title (A–Z)","Auteur · titre (A–Z)"],
"Orden por autor A–Z":["Sort by author A–Z","Trier par auteur A–Z"],
"Orden por título A–Z":["Sort by title A–Z","Trier par titre A–Z"],
"Título (A–Z)":["Title (A–Z)","Titre (A–Z)"],
"Orden alfabético":["Alphabetical order","Ordre alphabétique"],
"Orden del catálogo":["Catalogue order","Ordre du catalogue"],
"Materia / género":["Subject / genre","Matière / genre"],
"Época":["Period","Époque"],
"Obra":["Work","Œuvre"],
"Griego":["Greek","Grec"],
"Latín":["Latin","Latin"],
"Hebreo":["Hebrew","Hébreu"],
"Arameo":["Aramaic","Araméen"],
"Castellano":["Spanish","Espagnol"],
"Inglés":["English","Anglais"],
"Francés":["French","Français"],
"Idioma":["Language","Langue"],
"Idioma de interfaz":["Interface language","Langue de l’interface"],
"Más filtros":["More filters","Plus de filtres"],
"Tipo de consulta":["Search mode","Mode de recherche"],
"Palabra o frase en los textos":["Word or phrase in texts","Mot ou expression dans les textes"],
"Lema y formas flexionadas documentadas":["Lemma and attested inflected forms","Lemme et formes fléchies attestées"],
"Concepto multilingüe · equivalencias documentadas":["Multilingual concept · documented equivalents","Concept multilingue · équivalents documentés"],
"Palabra en párrafos y loci":["Word in paragraphs and loci","Mot dans les paragraphes et les loci"],
"Restringir por locus (opcional)":["Restrict by locus (optional)","Restreindre par locus (facultatif)"],
"Filtrar por autor en cualquier idioma":["Filter by author in any language","Filtrer par auteur dans toute langue"],
"Buscá por nombre original, castellano o transliteración":["Search by original name, Spanish or transliteration","Rechercher par nom original, espagnol ou translittération"],
"Filtros avanzados · AUTOR, género, siglo, período, idioma y alfabeto":["Advanced filters · AUTHOR, genre, century, period, language and alphabet","Filtres avancés · AUTEUR, genre, siècle, période, langue et alphabet"],
"FILTROS AVANZADOS":["ADVANCED FILTERS","FILTRES AVANCÉS"],
"AUTOR":["AUTHOR","AUTEUR"],
"Épica":["Epic poetry","Épopée"],
"Poesía lírica":["Lyric poetry","Poésie lyrique"],
"Tragedia":["Tragedy","Tragédie"],
"Comedia":["Comedy","Comédie"],
"Historiografía":["Historiography","Historiographie"],
"Biografía":["Biography","Biographie"],
"Filosofía":["Philosophy","Philosophie"],
"Retórica y oratoria":["Rhetoric and oratory","Rhétorique et art oratoire"],
"Diálogo":["Dialogue","Dialogue"],
"Sátira":["Satire","Satire"],
"Novela antigua":["Ancient novel","Roman antique"],
"Epistolografía":["Letters","Correspondance"],
"Religión y exégesis":["Religion and exegesis","Religion et exégèse"],
"Medicina":["Medicine","Médecine"],
"Ciencias y matemáticas":["Science and mathematics","Sciences et mathématiques"],
"Geografía":["Geography","Géographie"],
"Arquitectura y técnica":["Architecture and technology","Architecture et technique"],
"Agronomía":["Agronomy","Agronomie"],
"Derecho":["Law","Droit"],
"Gramática y filología":["Grammar and philology","Grammaire et philologie"],
"Otros géneros registrados":["Other recorded genres","Autres genres répertoriés"],
"Todas las materias":["All subjects","Toutes les matières"],
"Lengua de texto disponible":["Available text language","Langue du texte disponible"],
"Materia y tema de las obras":["Subject and theme of works","Matière et thème des œuvres"],
"Siglo de composición":["Century of composition","Siècle de composition"],
"Índice alfabético por autor o título":["Alphabetical index by author or title","Index alphabétique par auteur ou titre"],
"Obras del género seleccionado":["Works in the selected genre","Œuvres du genre sélectionné"],
"Consultar fuentes":["Consult sources","Consulter les sources"],
"Palabra o lema":["Word or lemma","Mot ou lemme"],
"Analizar en Lexicon":["Analyze in Lexicon","Analyser dans Lexicon"],
"Diccionarios y análisis filológico de las obras":["Dictionaries and philological analysis of works","Dictionnaires et analyse philologique des œuvres"],
"Latín clásico y medieval":["Classical and medieval Latin","Latin classique et médiéval"],
"Griego ático y koiné":["Attic and Koine Greek","Grec attique et koinè"],
"Hebreo bíblico":["Biblical Hebrew","Hébreu biblique"],
"Arameo bíblico y rabínico":["Biblical and rabbinic Aramaic","Araméen biblique et rabbinique"],
"Herramientas del corpus":["Corpus tools","Outils du corpus"],
"Índice de autores y títulos":["Authors and titles index","Index des auteurs et des titres"],
"Concordancias y búsqueda por obra":["Concordances and work search","Concordances et recherche par œuvre"],
"Lemas, flexiones y etimologías":["Lemmas, inflections and etymologies","Lemmes, flexions et étymologies"],
"Todos":["All","Tous"],
"Buscar por período histórico":["Search by historical period","Rechercher par période historique"],
"Frase griega · búsqueda literal":["Greek phrase · literal search","Expression grecque · recherche littérale"],
"Lemas y flexiones":["Lemmas and inflections","Lemmes et flexions"],
"Conceptos y equivalencias":["Concepts and equivalents","Concepts et équivalents"],
"Autor, título, siglo e idioma":["Author, title, century and language","Auteur, titre, siècle et langue"],
"Índice de autores":["Authors index","Index des auteurs"],
"Todos los autores":["All authors","Tous les auteurs"],
"Obras selectas":["Selected works","Œuvres choisies"],
"Mostrar":["Show","Afficher"],
"Ocultar":["Hide","Masquer"],
"Leer original":["Read original","Lire l’original"],
"Leer traducción":["Read translation","Lire la traduction"],
"Ficha académica":["Academic record","Fiche académique"],
"Lectura simplificada":["Simplified reading","Lecture simplifiée"],
"Cotejar versiones registradas":["Compare recorded editions","Comparer les éditions répertoriées"],
"Copiar enlace":["Copy link","Copier le lien"],
"Descargar Excel · listado de obras":["Download Excel · works list","Télécharger Excel · liste des œuvres"],
"Descargar Excel académico":["Download academic Excel","Télécharger l’Excel académique"],
"Explorar obras clásicas griegas y latinas por autor y título · fichas con texto original indexado":["Browse Greek and Latin classics by author and title · indexed original-text records","Explorer les classiques grecs et latins par auteur et titre · fiches des textes originaux indexés"],
"Índice alfabético de autores y obras":["Alphabetical index of authors and works","Index alphabétique des auteurs et des œuvres"],
"Buscar originales griegos y latinos":["Search Greek and Latin originals","Rechercher des originaux grecs et latins"],
"Consultar una palabra de Bibliotheca en Lexicon":["Look up a Bibliotheca word in Lexicon","Consulter un mot de Bibliotheca dans Lexicon"],
"Secciones":["Sections","Sections"],
"Catálogo completo":["Full catalogue","Catalogue complet"]
};
const UI_PATTERNS=[
 [/^Ver (\d+) originales R2$/,(m,l)=>l==="en"?"View "+m[1]+" R2 originals":"Voir "+m[1]+" originaux R2"],
 [/^(\d+) obras\.$/,(m,l)=>m[1]+(l==="en"?" works.":" œuvres.")],
 [/^Siglo ([IVXLCDM]+) (a\. C\.|d\. C\.)$/,(m,l)=>l==="en"?"Century "+m[1]+" "+(m[2]==="a. C."?"BCE":"CE"):"Siècle "+m[1]+" "+(m[2]==="a. C."?"av. J.-C.":"apr. J.-C.")],
 [/^Buscar en todos los libros o una obra$/,(m,l)=>l==="en"?"Search all books or one work":"Rechercher dans tous les livres ou dans une œuvre"]
];
const UI_SCOPE="nav.top,.toplinks,.bibliotheca-suite,.hero,.searcharea,.bibliotheca-search-shortcuts,.biblio-extra-filters,.bibliotheca-filters,.bws-work-search,.bibliotheca-work-search,.bws-advanced,.bws-library-filters,#bibliotheca-diccionarios-academicos,#fichas-academicas-auditadas,.bibliotheca-seo-discovery";
const UI_SKIP="script,style,code,pre,blockquote,cite,dfn,abbr,[data-no-ui-i18n],.notranslate,[translate=no],[lang=la],[lang=grc],[lang=he],[lang=arc],#results,#classic-results,#bws-results,.bws-item,.bws-meta,.bws-help";
const uiOriginal=new WeakMap(),uiTranslated=new WeakMap();
function uiText(value,l){
 const valueTrim=value.trim();if(!valueTrim)return null;
 const pair=UI_TRANSLATIONS[valueTrim];if(pair)return pair[l==="en"?0:1];
 for(const [re,fn] of UI_PATTERNS){const match=valueTrim.match(re);if(match)return fn(match,l)}
 return null;
}
function uiPaint(){
 const l=lang();
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
 for(let node=walker.nextNode();node;node=walker.nextNode()){
  const parent=node.parentElement;
  if(!parent||!parent.closest(UI_SCOPE)||parent.closest(UI_SKIP))continue;
  if(!uiOriginal.has(node))uiOriginal.set(node,node.nodeValue);
  const previous=uiTranslated.get(node);
  if(previous&&node.nodeValue!==previous&&node.nodeValue!==uiOriginal.get(node)){
   uiOriginal.set(node,node.nodeValue);uiTranslated.delete(node);
  }
  const original=uiOriginal.get(node);
  if(l==="es"){if(previous&&node.nodeValue===previous){node.nodeValue=original;uiTranslated.delete(node)}continue}
  const replacement=uiText(original,l);
  if(replacement){
   const output=original.replace(original.trim(),replacement);
   if(node.nodeValue!==output)node.nodeValue=output;
   uiTranslated.set(node,output);
  }
 }
 const attributes=[["placeholder"],["title"],["aria-label"]];
 for(const [attribute] of attributes)for(const element of document.querySelectorAll(UI_SCOPE+" ["+attribute+"],"+UI_SCOPE+"["+attribute+"]")){
  if(element.closest(UI_SKIP))continue;
  const key="data-bib-source-"+attribute;
  const current=element.getAttribute(attribute);
  if(!element.hasAttribute(key))element.setAttribute(key,current);
  const original=element.getAttribute(key);
  const expected=uiText(original,l);
  if(l==="es"&&current!==original)element.setAttribute(attribute,original);
  else if(expected&&current!==expected)element.setAttribute(attribute,expected);
 }
 // Options are interface controls, not historical title data; only change known labels.
 for(const option of document.querySelectorAll(".bws-library-filters select option,#classic-era option,#classic-genre option,#classic-order option")){
  if(!uiOriginal.has(option))uiOriginal.set(option,option.textContent);
  const original=uiOriginal.get(option);
  if(l==="es"){if(option.textContent!==original)option.textContent=original}
  else {const translated=uiText(original,l);if(translated&&option.textContent!==translated)option.textContent=translated}
 }
}
let uiTimer=0,uiPainting=false;
function scheduleUiPaint(){clearTimeout(uiTimer);uiTimer=setTimeout(()=>{if(uiPainting)return;uiPainting=true;try{uiPaint()}finally{uiPainting=false}},100)}
const uiObserver=new MutationObserver(records=>{
 if(records.some(r=>r.type==="childList"||r.type==="characterData"))scheduleUiPaint();
});
document.addEventListener("vitruvius:language-changed",scheduleUiPaint);
function initUi(){scheduleUiPaint();uiObserver.observe(document.body,{subtree:true,childList:true,characterData:true});setTimeout(scheduleUiPaint,1400)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initUi);else initUi();

})();
