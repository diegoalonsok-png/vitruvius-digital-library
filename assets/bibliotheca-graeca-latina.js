/* Classical works browser: read source-linked texts and verified manuscript facsimiles.
No fabricated digitization, translation, ISBN or PDF links. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fold=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
const searchFold=s=>fold(s).replace(/[^\p{L}\p{N}]+/gu," ").trim();
const L={es:{search:"fichas en el catálogo",select:"Seleccionar",work:"Obra",language:"Lengua",source:"Leer texto",manuscript:"Manuscrito",edition:"Edición y traducción",pdf:"PDF histórico",external:"Fuentes externas",notKnown:"No hay un facsímil ni edición concreta acreditados en esta ficha.",visit:"Consultar fuente original",open:"Abrir el lector original",notHosted:"Esta fuente no permite confirmar un lector embebido; ábrela en su plataforma oficial.",witness:"El testimonio es posterior a la composición de la obra.",noPdf:"No hay PDF identificado con edición y licencia verificadas.",noTrans:"No se ha asignado todavía una traducción con autor y edición comprobados.",archive:"Buscar ediciones escaneadas",gallica:"Buscar en Gallica",scaife:"Consultar Scaife / Perseus"},en:{search:"catalogue records",select:"Select",work:"Work",language:"Original language",source:"Read text",manuscript:"Manuscript",edition:"Edition and translation",pdf:"Historical PDF",external:"External sources",notKnown:"No individual facsimile or edition has yet been verified for this record.",visit:"View original source",open:"Open original reader",notHosted:"Embedding has not been verified for this source; open it at its official platform.",witness:"The extant witness is later than the composition of the work.",noPdf:"No specific PDF with verified edition and rights has been identified.",noTrans:"No translation with verified translator and edition has yet been linked.",archive:"Search scanned editions",gallica:"Search Gallica",scaife:"Browse Scaife / Perseus"}};

const extraTerms={
fr:{search:"notices disponibles",source:"Lire le texte",manuscript:"Manuscrit",edition:"Édition et traduction",pdf:"PDF historique",notKnown:"Aucun texte ni fac-similé attesté pour cette entrée.",visit:"Consulter la source",open:"Ouvrir le lecteur",notHosted:"Consulter la plateforme d’origine.",witness:"Ce témoin est postérieur à la composition de l’œuvre.",noPdf:"Aucun PDF identifié.",noTrans:"Traduction non encore documentée.",archive:"Chercher des éditions numérisées",gallica:"Chercher dans Gallica",scaife:"Consulter Scaife / Perseus"},
it:{search:"schede disponibili",source:"Leggi il testo",manuscript:"Manoscritto",edition:"Edizione e traduzione",pdf:"PDF storico",notKnown:"Nessun testo o facsimile verificato.",visit:"Consulta la fonte",open:"Apri il lettore",notHosted:"Consulta la piattaforma originale.",witness:"Il testimone è posteriore alla composizione dell’opera.",noPdf:"Nessun PDF identificato.",noTrans:"Traduzione non ancora documentata.",archive:"Cerca edizioni digitalizzate",gallica:"Cerca su Gallica",scaife:"Consulta Scaife / Perseus"},
de:{search:"verfügbare Einträge",source:"Text lesen",manuscript:"Handschrift",edition:"Edition und Übersetzung",pdf:"Historisches PDF",notKnown:"Keine verifizierte Ausgabe oder Handschrift vorhanden.",visit:"Quelle öffnen",open:"Lesefenster öffnen",notHosted:"Originalplattform öffnen.",witness:"Diese Handschrift entstand nach der Abfassung des Werks.",noPdf:"Kein identifiziertes PDF.",noTrans:"Keine verifizierte Übersetzung.",archive:"Digitalisierte Ausgaben suchen",gallica:"In Gallica suchen",scaife:"Scaife / Perseus öffnen"},
pt:{search:"registos disponíveis",source:"Ler o texto",manuscript:"Manuscrito",edition:"Edição e tradução",pdf:"PDF histórico",notKnown:"Nenhuma edição ou fac-símile validado.",visit:"Consultar a fonte",open:"Abrir o leitor",notHosted:"Consulte a plataforma de origem.",witness:"O testemunho é posterior à composição da obra.",noPdf:"Nenhum PDF identificado.",noTrans:"Tradução ainda não documentada.",archive:"Pesquisar edições digitalizadas",gallica:"Pesquisar em Gallica",scaife:"Consultar Scaife / Perseus"}};
for(const [k,trans] of Object.entries(extraTerms))L[k]={...L.en,...trans};
const interfaceWords={
es:{"lang-label":"Idiomas","nav-home":"← Vitruvius Digital Library","nav-editions":"Ediciones históricas","nav-cite":"Cómo citar","page-title":"Biblioteca bibliográfica griega y latina","search-label":"Buscar autor, obra o disciplina","original-label":"Idioma del original","genre-label":"Área de estudio","all-language":"Griego y latín","latin":"Latín","greek":"Griego antiguo","all-genres":"Todas las áreas","note-title":"Nota filológica.","available-title":"Colección de lectura directa."},
en:{"lang-label":"Languages","nav-home":"← Vitruvius Digital Library","nav-editions":"Historical editions","nav-cite":"How to cite","page-title":"Greek and Latin Bibliographic Library","search-label":"Search by author, work or field","original-label":"Original language","genre-label":"Research field","all-language":"Greek and Latin","latin":"Latin","greek":"Ancient Greek","all-genres":"All fields","note-title":"Philological note.","available-title":"Direct-access collection."},
fr:{"lang-label":"Langues","nav-home":"← Bibliothèque de Vitruve","nav-editions":"Éditions historiques","nav-cite":"Comment citer","page-title":"Bibliothèque bibliographique grecque et latine","search-label":"Chercher un auteur, une œuvre ou un domaine","original-label":"Langue originale","genre-label":"Domaine d’étude","all-language":"Grec et latin","latin":"Latin","greek":"Grec ancien","all-genres":"Tous les domaines","note-title":"Note philologique.","available-title":"Collection en lecture directe."},
it:{"lang-label":"Lingue","nav-home":"← Biblioteca di Vitruvio","nav-editions":"Edizioni storiche","nav-cite":"Come citare","page-title":"Biblioteca bibliografica greca e latina","search-label":"Cerca autore, opera o disciplina","original-label":"Lingua originale","genre-label":"Area di studio","all-language":"Greco e latino","latin":"Latino","greek":"Greco antico","all-genres":"Tutte le aree","note-title":"Nota filologica.","available-title":"Collezione in lettura diretta."},
de:{"lang-label":"Sprachen","nav-home":"← Vitruv-Bibliothek","nav-editions":"Historische Ausgaben","nav-cite":"Zitierhinweise","page-title":"Griechische und lateinische Bibliothek","search-label":"Autor, Werk oder Fachgebiet suchen","original-label":"Originalsprache","genre-label":"Fachgebiet","all-language":"Griechisch und Latein","latin":"Latein","greek":"Altgriechisch","all-genres":"Alle Bereiche","note-title":"Philologische Anmerkung.","available-title":"Direkt lesbare Sammlung."},
pt:{"lang-label":"Idiomas","nav-home":"← Biblioteca de Vitrúvio","nav-editions":"Edições históricas","nav-cite":"Como citar","page-title":"Biblioteca bibliográfica grega e latina","search-label":"Buscar autor, obra ou área","original-label":"Idioma original","genre-label":"Área de estudo","all-language":"Grego e latim","latin":"Latim","greek":"Grego antigo","all-genres":"Todas as áreas","note-title":"Nota filológica.","available-title":"Coleção para leitura direta."}
};
const additionalInterfaceWords={"es":{"available-title":"Obras y estados editoriales.","availability-label":"Disponibilidad de lectura","availability-all":"Todas las obras catalogadas","availability-local":"Lectura en Vitruvia","availability-source":"Fuente externa identificada","availability-catalogue":"Localización pendiente","period-label":"Época de composición","period-all":"Toda la Antigüedad","period-focus":"Siglos II–I a. C. / I–II d. C. (selección)","read-local-label":"Lectura en Vitruvia:","identified-label":"Fuente identificada:","pending-label":"Localización pendiente:","read-local-body":"texto o PDF realmente alojado y disponible aquí.","identified-body":"vínculo a un recurso institucional externo que requiere lectura en origen.","pending-body":"obra bibliográficamente identificada con búsquedas en repertorios como Perseus, Scaife, Wikisource y bibliotecas.","search-placeholder":"Buscar un libro o autor…","clear-aria":"Borrar búsqueda","count-local":"lecturas locales","count-source":"fuentes externas identificadas","no-results":"Sin resultados.","witness-count":"testimonios codicológicos individualizados"},"en":{"available-title":"Works and editorial status.","availability-label":"Reading availability","availability-all":"All catalogued works","availability-local":"Read on Vitruvia","availability-source":"Identified external source","availability-catalogue":"Location pending","period-label":"Period of composition","period-all":"All Antiquity","period-focus":"2nd–1st c. BCE / 1st–2nd c. CE (selection)","read-local-label":"Read on Vitruvia:","identified-label":"Identified source:","pending-label":"Location pending:","read-local-body":"text or PDF actually hosted and available here.","identified-body":"link to an external institutional resource to be read at its source.","pending-body":"bibliographically identified work with search references to Perseus, Scaife, Wikisource and libraries.","search-placeholder":"Search for a book or author…","clear-aria":"Clear search","count-local":"works readable here","count-source":"records with external sources","no-results":"No results.","witness-count":"individually identified manuscript witnesses"},"fr":{"available-title":"Œuvres et statut éditorial.","availability-label":"Disponibilité de lecture","availability-all":"Toutes les œuvres cataloguées","availability-local":"Lire sur Vitruvia","availability-source":"Source externe identifiée","availability-catalogue":"Localisation en attente","period-label":"Époque de composition","period-all":"Toute l’Antiquité","period-focus":"IIe–Ier s. av. J.-C. / Ier–IIe s. apr. J.-C. (sélection)","read-local-label":"Lecture sur Vitruvia :","identified-label":"Source identifiée :","pending-label":"Localisation en attente :","read-local-body":"texte ou PDF effectivement hébergé et disponible ici.","identified-body":"lien vers une ressource institutionnelle externe à consulter sur son site.","pending-body":"œuvre identifiée bibliographiquement, avec recherches dans Perseus, Scaife, Wikisource et les bibliothèques.","search-placeholder":"Rechercher un livre ou un auteur…","clear-aria":"Effacer la recherche","count-local":"œuvres lisibles ici","count-source":"notices avec sources externes","no-results":"Aucun résultat.","witness-count":"témoins manuscrits identifiés individuellement"},"it":{"available-title":"Opere e stato editoriale.","availability-label":"Disponibilità di lettura","availability-all":"Tutte le opere catalogate","availability-local":"Leggi su Vitruvia","availability-source":"Fonte esterna identificata","availability-catalogue":"Localizzazione da verificare","period-label":"Epoca di composizione","period-all":"Tutta l’antichità","period-focus":"II–I sec. a.C. / I–II sec. d.C. (selezione)","read-local-label":"Lettura su Vitruvia:","identified-label":"Fonte identificata:","pending-label":"Localizzazione da verificare:","read-local-body":"testo o PDF effettivamente ospitato e disponibile qui.","identified-body":"collegamento a una risorsa istituzionale esterna da consultare alla fonte.","pending-body":"opera identificata bibliograficamente, con ricerche in Perseus, Scaife, Wikisource e biblioteche.","search-placeholder":"Cerca un libro o un autore…","clear-aria":"Cancella la ricerca","count-local":"opere leggibili qui","count-source":"schede con fonti esterne","no-results":"Nessun risultato.","witness-count":"testimonianze manoscritte identificate"},"de":{"available-title":"Werke und Editionsstatus.","availability-label":"Leseverfügbarkeit","availability-all":"Alle katalogisierten Werke","availability-local":"In Vitruvia lesen","availability-source":"Externe Quelle nachgewiesen","availability-catalogue":"Standort noch zu prüfen","period-label":"Entstehungszeit","period-all":"Gesamte Antike","period-focus":"2.–1. Jh. v. Chr. / 1.–2. Jh. n. Chr. (Auswahl)","read-local-label":"In Vitruvia lesen:","identified-label":"Nachgewiesene Quelle:","pending-label":"Standort noch zu prüfen:","read-local-body":"Text oder PDF, der hier tatsächlich bereitgestellt wird.","identified-body":"Link zu einer externen institutionellen Quelle, die dort eingesehen werden muss.","pending-body":"bibliografisch erfasstes Werk mit Suchverweisen auf Perseus, Scaife, Wikisource und Bibliotheken.","search-placeholder":"Buch oder Autor suchen…","clear-aria":"Suche löschen","count-local":"hier lesbare Werke","count-source":"Einträge mit externen Quellen","no-results":"Keine Ergebnisse.","witness-count":"einzeln nachgewiesene Handschriftenzeugen"},"pt":{"available-title":"Obras e estado editorial.","availability-label":"Disponibilidade de leitura","availability-all":"Todas as obras catalogadas","availability-local":"Ler no Vitruvia","availability-source":"Fonte externa identificada","availability-catalogue":"Localização pendente","period-label":"Época de composição","period-all":"Toda a Antiguidade","period-focus":"Séculos II–I a.C. / I–II d.C. (seleção)","read-local-label":"Leitura no Vitruvia:","identified-label":"Fonte identificada:","pending-label":"Localização pendente:","read-local-body":"texto ou PDF efetivamente hospedado e disponível aqui.","identified-body":"link para um recurso institucional externo que deve ser consultado na origem.","pending-body":"obra identificada bibliograficamente, com buscas em Perseus, Scaife, Wikisource e bibliotecas.","search-placeholder":"Buscar livro ou autor…","clear-aria":"Limpar busca","count-local":"obras disponíveis aqui","count-source":"registros com fontes externas","no-results":"Nenhum resultado.","witness-count":"testemunhos manuscritos identificados"}};
for(const [code,words] of Object.entries(additionalInterfaceWords))Object.assign(interfaceWords[code],words);
const longInterfaceWords={"es":{"intro":"Repertorio académico de obras griegas y latinas, desde la época arcaica hasta la Antigüedad tardía. Consulta textos originales, traducciones documentadas y testimonios manuscritos. El estado de cada ficha indica qué puede leerse aquí y qué requiere consultar una institución externa.","note-body":"Una obra compuesta en el siglo I no implica que conservemos un manuscrito de ese siglo. Las copias suelen ser medievales o posteriores. Los vínculos a Perseus, Scaife, Gallica e Internet Archive son repertorios de consulta; no equivalen a identificar una edición, una traducción o un PDF concreto. Solo se activa un visor de facsímil cuando contamos con un testimonio identificado. No se mostrarán fichas vacías ni pestañas PDF sin un archivo realmente disponible. El repertorio de trabajo no equivale al inventario de obras publicadas.","academic-warning":"Ninguna ficha pendiente se presenta como un manuscrito digitalizado, una traducción cotejada ni un PDF disponible. Las primeras ediciones completas incluyen las V514, V554, V297 y Krohn 1912."},"en":{"intro":"Academic catalogue of Greek and Latin works from the Archaic period to Late Antiquity. Consult original texts, documented translations and manuscript witnesses. Each record indicates what can be read here and what requires consultation with an external institution.","note-body":"A work composed in the first century does not mean a manuscript from that century survives. Copies are often medieval or later. Perseus, Scaife, Gallica and Internet Archive are research repositories; their links alone do not establish a specific edition, translation or PDF. A facsimile viewer is activated only for an identified witness. Empty records and unverified PDFs are not displayed. This working catalogue is not an inventory of published works.","academic-warning":"Pending records are not presented as digitized manuscripts, verified translations or available PDFs. Complete editions include V514, V554, V297 and Krohn 1912."},"fr":{"intro":"Répertoire scientifique des œuvres grecques et latines, de l’époque archaïque à l’Antiquité tardive. Consultez les textes originaux, les traductions documentées et les témoins manuscrits. Chaque notice précise ce qui peut être lu ici et ce qui exige la consultation d’une institution extérieure.","note-body":"Une œuvre composée au Ier siècle ne signifie pas qu’un manuscrit de cette époque soit conservé. Les copies sont souvent médiévales ou postérieures. Perseus, Scaife, Gallica et Internet Archive sont des répertoires de recherche; leurs liens n’identifient pas à eux seuls une édition, une traduction ou un PDF précis. Un lecteur de fac-similé n’est activé que pour un témoin identifié. Les notices vides et les PDF non vérifiés ne sont pas affichés. Ce catalogue de travail n’est pas un inventaire des œuvres publiées.","academic-warning":"Les notices en attente ne sont pas présentées comme des manuscrits numérisés, des traductions vérifiées ou des PDF disponibles. Les éditions complètes comprennent V514, V554, V297 et Krohn 1912."},"it":{"intro":"Repertorio accademico di opere greche e latine, dall’età arcaica alla tarda antichità. Consulta testi originali, traduzioni documentate e testimonianze manoscritte. Ogni scheda indica ciò che può essere letto qui e ciò che richiede la consultazione presso un’istituzione esterna.","note-body":"Un’opera composta nel I secolo non implica che ne sopravviva un manoscritto della stessa epoca. Le copie sono spesso medievali o successive. Perseus, Scaife, Gallica e Internet Archive sono repertori di consultazione e non identificano, da soli, un’edizione, una traduzione o un PDF specifico. Il visualizzatore di facsimili è attivato solo per una testimonianza identificata. Non vengono mostrate schede vuote né PDF non verificati. Il catalogo di lavoro non equivale all’inventario delle opere pubblicate.","academic-warning":"Le schede in attesa non sono presentate come manoscritti digitalizzati, traduzioni verificate o PDF disponibili. Le edizioni complete comprendono V514, V554, V297 e Krohn 1912."},"de":{"intro":"Wissenschaftliches Verzeichnis griechischer und lateinischer Werke von der archaischen Zeit bis zur Spätantike. Lesen Sie Originaltexte, dokumentierte Übersetzungen und Handschriftenzeugnisse. Jeder Eintrag zeigt, welche Quellen hier zugänglich sind und welche bei einer externen Einrichtung konsultiert werden müssen.","note-body":"Ein im ersten Jahrhundert entstandenes Werk muss nicht in einer Handschrift aus derselben Zeit erhalten sein. Die Abschriften stammen häufig aus dem Mittelalter oder späterer Zeit. Perseus, Scaife, Gallica und Internet Archive sind Rechercheportale; ihre Links belegen keine bestimmte Ausgabe, Übersetzung oder PDF-Datei. Ein Faksimile-Viewer wird nur für nachgewiesene Textzeugen aktiviert. Leere Einträge und ungeprüfte PDFs werden nicht angezeigt. Dieses Arbeitsverzeichnis ist keine Liste publizierter Werke.","academic-warning":"Ungeprüfte Einträge werden nicht als digitalisierte Handschriften, geprüfte Übersetzungen oder verfügbare PDFs ausgewiesen. Vollständige Ausgaben umfassen V514, V554, V297 und Krohn 1912."},"pt":{"intro":"Repertório acadêmico de obras gregas e latinas, do período arcaico à Antiguidade tardia. Consulte textos originais, traduções documentadas e testemunhos manuscritos. Cada registro indica o que pode ser lido aqui e o que exige consulta a uma instituição externa.","note-body":"Uma obra composta no século I não significa que sobreviva um manuscrito da mesma época. As cópias são frequentemente medievais ou posteriores. Perseus, Scaife, Gallica e Internet Archive são repertórios de consulta; os seus links, por si só, não identificam uma edição, tradução ou PDF específico. O visualizador de fac-símiles só é ativado para um testemunho identificado. Não são exibidos registros vazios ou PDFs não verificados. Este repertório de trabalho não equivale a um inventário de obras publicadas.","academic-warning":"Registros pendentes não são apresentados como manuscritos digitalizados, traduções verificadas ou PDFs disponíveis. As edições completas incluem V514, V554, V297 e Krohn 1912."}};
for(const [code,words] of Object.entries(longInterfaceWords))Object.assign(interfaceWords[code],words);
const summaryWords={"es":{"overview":"PANORAMA BIBLIOGRÁFICO","works":"obras catalogadas","local":"con lectura local","sources":"con fuentes identificadas","note":"Elige un título para consultar su ficha bibliográfica, texto original, traducción o manuscrito disponible. Una obra catalogada no implica que ya exista un texto íntegro para leer.","read":"Leer esta obra","view":"Consultar ficha y fuentes","statusLocal":"LECTURA EN VITRUVIA","statusExternal":"FUENTE IDENTIFICADA","statusCatalogue":"REPERTORIO · LOCALIZACIÓN","greek":"Griego antiguo","latin":"Latín"},"en":{"overview":"BIBLIOGRAPHIC OVERVIEW","works":"catalogued works","local":"available for local reading","sources":"with identified sources","note":"Select a title to view its bibliographic record, original text, translation or available manuscript. A catalogue record alone does not guarantee a full readable text.","read":"Read this work","view":"View record and sources","statusLocal":"READ ON VITRUVIA","statusExternal":"IDENTIFIED SOURCE","statusCatalogue":"CATALOGUE · LOCATION PENDING","greek":"Ancient Greek","latin":"Latin"},"fr":{"overview":"SYNTHÈSE BIBLIOGRAPHIQUE","works":"œuvres répertoriées","local":"à lire ici","sources":"avec des sources identifiées","note":"Choisissez un titre pour consulter sa notice, son texte original, sa traduction ou son manuscrit disponible. Une notice seule ne garantit pas un texte intégral à lire.","read":"Lire cette œuvre","view":"Voir la notice et les sources","statusLocal":"LECTURE SUR VITRUVIA","statusExternal":"SOURCE IDENTIFIÉE","statusCatalogue":"CATALOGUE · LOCALISATION EN ATTENTE","greek":"Grec ancien","latin":"Latin"},"it":{"overview":"PANORAMA BIBLIOGRAFICO","works":"opere catalogate","local":"leggibili qui","sources":"con fonti identificate","note":"Seleziona un titolo per consultare la scheda, il testo originale, la traduzione o il manoscritto disponibile. Una scheda di catalogo non garantisce un testo completo da leggere.","read":"Leggi quest’opera","view":"Consulta scheda e fonti","statusLocal":"LETTURA SU VITRUVIA","statusExternal":"FONTE IDENTIFICATA","statusCatalogue":"CATALOGO · LOCALIZZAZIONE DA VERIFICARE","greek":"Greco antico","latin":"Latino"},"de":{"overview":"BIBLIOGRAFISCHER ÜBERBLICK","works":"katalogisierte Werke","local":"hier lesbar","sources":"mit nachgewiesenen Quellen","note":"Wählen Sie einen Titel, um Katalogeintrag, Originaltext, Übersetzung oder verfügbare Handschrift einzusehen. Ein Katalogeintrag garantiert keinen vollständigen Lesetext.","read":"Dieses Werk lesen","view":"Eintrag und Quellen ansehen","statusLocal":"IN VITRUVIA LESEN","statusExternal":"NACHGEWIESENE QUELLE","statusCatalogue":"KATALOG · STANDORT OFFEN","greek":"Altgriechisch","latin":"Latein"},"pt":{"overview":"PANORAMA BIBLIOGRÁFICO","works":"obras catalogadas","local":"com leitura local","sources":"com fontes identificadas","note":"Selecione um título para consultar a ficha, o texto original, a tradução ou o manuscrito disponível. Um registro no catálogo não garante texto integral para leitura.","read":"Ler esta obra","view":"Consultar ficha e fontes","statusLocal":"LEITURA NO VITRUVIA","statusExternal":"FONTE IDENTIFICADA","statusCatalogue":"CATÁLOGO · LOCALIZAÇÃO PENDENTE","greek":"Grego antigo","latin":"Latim"}};
const sortLabels={es:["Orden del catálogo","Pertinencia y disponibilidad","Testimonio conservado más antiguo","Autor y título (A–Z)"],en:["Catalogue order","Relevance and availability","Oldest surviving witness","Author and title (A–Z)"],fr:["Ordre du catalogue","Pertinence et disponibilité","Témoin conservé le plus ancien","Auteur et titre (A–Z)"],it:["Ordine del catalogo","Pertinenza e disponibilità","Testimone conservato più antico","Autore e titolo (A–Z)"],de:["Katalogsortierung","Relevanz und Verfügbarkeit","Älteste erhaltene Handschrift","Autor und Titel (A–Z)"],pt:["Ordem do catálogo","Relevância e disponibilidade","Testemunho preservado mais antigo","Autor e título (A–Z)"]};
function translateInterface(){
const lang=language(),dict=interfaceWords[lang]||interfaceWords.es;
document.documentElement.lang=lang;
const sortDict=sortLabels[lang]||sortLabels.es;
["sort-label","sort-relevance","sort-witness","sort-author"].forEach((key,i)=>{const el=document.querySelector(`[data-bi="${key}"]`);if(el)el.textContent=sortDict[i]});
document.querySelectorAll("[data-bi]").forEach(el=>{const v=dict[el.dataset.bi];if(v)el.textContent=v});const witness=$("classic-witness-count");if(witness&&witnessData.records?.length)witness.textContent=witnessData.records.length+" "+dict["witness-count"];const query=$("classic-query");if(query)query.placeholder=dict["search-placeholder"];const clear=$("classic-clear");if(clear){clear.title=dict["clear-aria"];clear.setAttribute("aria-label",dict["clear-aria"])}
try{localStorage.setItem("vitruvius-ui-lang",lang)}catch{}
}

let works=[],selected="",tab="text",witnessData={records:[],editions:[]},showSelectedDetail=false;
let extraBookIndex={author:[],historical:[],manuscripts:[]};
// These entries supplement autocomplete ONLY: classical corpus, other filters,
// manuscript records, published texts and source provenance remain untouched.
function buildExtraBookIndex(catalogue,complete,kuriloBooks){
 const own=[],history=[],manuscripts=[];
 const localEditions=new Set(["recensio-es","recensio-fr","theory-en"]);
 const readableEdition=id=>"lector-bilingue.html?edition="+encodeURIComponent(id);
 for(const e of catalogue?.editions||[]){
  if(!/kurilo/i.test(e.author||"")&& !/kurilo/i.test(e.bibliographic_author||""))continue;
  own.push({
   id:"modern-"+e.id,
   title:e.title,
   author:e.author||"Diego Kurilo",
   subtitle:[e.subtitle,e.version,e.year].filter(Boolean).join(" · "),
   aliases:[e.version,e.bibliographic_title,"Vitruvio","Vitruvius","De architectura"],
   url:localEditions.has(e.id)?readableEdition(e.id):"catalogo-estatico.html",
   external:false,
   status:localEditions.has(e.id)?"Edición con lector local":"Ficha bibliográfica; lector no acreditado"
  });
 }
 for(const b of kuriloBooks?.books||[]){
  if(!b.page||!b.titles?.es)continue;
  own.push({
   id:"own-"+b.id,title:b.titles.es,author:"Diego Kurilo",
   subtitle:b.subtitles?.es||"",
   aliases:[b.titles.en,b.subtitles?.en,...(b.subjects||[])],
   url:b.page,external:false,status:"Libro del sitio"
  });
 }
 for(const e of Array.isArray(complete)?complete:[]){
  if(e.category==="manuscripts"){
   manuscripts.push({
    id:"witness-"+e.id,title:e.title,author:e.author||"",
    subtitle:[e.subtitle,e.year].filter(Boolean).join(" · "),
    aliases:["Vitruvio","Vitruvius","De architectura"],
    url:e.read_url||e.source_url||"index-codicum.html",external:!!(e.read_url||e.source_url),
    status:"Testimonio manuscrito · consultar signatura y custodia"
   });
  }
  if(e.category!=="historical")continue;
  const direct=e.pdf_url||e.read_url||e.source_url;
  history.push({
   id:"historic-"+e.id,title:e.title,author:e.author||"",
   subtitle:[e.subtitle,e.year].filter(Boolean).join(" · "),
   aliases:["Vitruvio","Vitruvius","De architectura",e.version],
   url:/perrault/i.test(e.author||"")&&["1673","1684"].includes(String(e.year))?
    "perrault-1673.html?year="+e.year:(direct||"ediciones-historicas.html"),
   external:!( /perrault/i.test(e.author||"")&&["1673","1684"].includes(String(e.year)) )&&/^https:\/\//.test(direct||""),
   status:/perrault/i.test(e.author||"")&&["1673","1684"].includes(String(e.year))?
    "Visor IIIF por página · texto francés histórico":direct?"Edición histórica · fuente identificada":"Ficha histórica sin facsímil verificado"
  });
 }
 const byTitle=(a,b)=>fold(a.title).localeCompare(fold(b.title),"es");
 return {
  author:own.sort(byTitle),
  historical:history.sort((a,b)=>Number(a.subtitle.match(/\b(?:1[45-9]\d\d|20\d\d)\b/)?.[0]||9999)-Number(b.subtitle.match(/\b(?:1[45-9]\d\d|20\d\d)\b/)?.[0]||9999)||byTitle(a,b)),
  manuscripts:manuscripts.sort(byTitle)
 };
}
function extraBookMatches(rows,query){
 const tokens=searchFold(query).split(/\s+/).filter(Boolean);
 if(!tokens.length)return rows;
 return rows.filter(r=>{
  const text=searchFold([r.title,r.author,r.subtitle,...(r.aliases||[])].join(" "));
  return tokens.every(t=>text.includes(t));
 });
}
function openExtraBook(row){
 hideBookSuggestions();
 if(!row?.url)return;
 const url=new URL(row.url,location.href);
 // Only catalogue URLs read from this site's own JSON; never synthesize a
 // facsimile link nor embed an external publisher as if we hosted the book.
 if(!/^https?:$/.test(url.protocol))return;
 if(row.external){window.open(url.href,"_blank","noopener,noreferrer")}
 else{location.assign(url.href)}
}
const bcFocusIds=new Set(("vitruvius cicero-officiis cicero-oratore cicero-republica cicero-catilinariae cicero-de-finibus cicero-tusculanae cicero-de-natura-deorum cicero-de-amicitia cicero-de-senectute cicero-de-divinatione cicero-brutus cicero-philippicae caesar-gallico caesar-civili sallust-catiline sallust-iugurtha varro-rustica varro-de-lingua-latina lucretius virgil-aeneid virgil-georgica horace-odes horace-sermones horace-ars-poetica horace-epodi horace-epistulae catullus-carmina plautus-amphitruo plautus-aulularia terentius-andria terentius-heautontimorumenos cato-agri-cultura polybius-historiae").split(" "));
const adFocusIds=new Set(("diodorus dionysius strabo philo philo-legum-allegoriae philo-de-vita-mosis seneca-epistulae seneca-naturales seneca-de-brevitate seneca-de-ira seneca-de-clementia seneca-de-tranquillitate lucan pliny dioscorides josephus-war josephus-antiquities quintilian martial tacitus-agricola tacitus-germania tacitus-annales tacitus-historiae tacitus-dialogus frontinus frontinus-strategemata celsus columella juvenal suetonius-caesares petronius-satyrica pliny-younger-epistulae apuleius-metamorphoses apuleius-apologia apuleius-de-deo-socratis plutarch-lives plutarch-moralia galen-ars-medica galen-de-usu-partium ptolemy-almagest ptolemy-geographia marcus-aurelius-meditations epictetus-discourses arrian-anabasis-alexandri pausanias-periegesis").split(" "));
function periodFocus(w){return bcFocusIds.has(w.id)||adFocusIds.has(w.id)||!!w.witnessRecords?.length}
/* Only verified, relative, same-origin manuscript readers may be embedded. */
function localManuscriptUrl(record){
 const raw=String(record?.localViewer||"").trim();
 if(!/^[a-z0-9/_-]+\.html(?:\?[a-z0-9._%=&+-]+)?$/i.test(raw)||raw.includes(".."))return null;
 try{const url=new URL(raw,location.href);return url.origin===location.origin?url.href:null}catch{return null}
}
function showLocalManuscript(container,record){
 const url=localManuscriptUrl(record);if(!url)return false;
 container.replaceChildren();
 const intro=document.createElement("p");intro.className="classical-local-manuscript-note";
 intro.textContent="Facsímil alojado en Vitruvius Digital Library · "+[record.shelfmark,record.library,record.localFolioCount?record.localFolioCount+" fotografías":"",record.localFolioStart?"f. 1r = imagen digital "+record.localFolioStart.digitalImage:""].filter(Boolean).join(" · ")+". Folio e imagen digital tienen numeraciones diferentes. Verificar derechos de la digitalización en la ficha institucional.";
 const toolbar=document.createElement("div");toolbar.className="classical-local-manuscript-toolbar";
 const open=document.createElement("a");open.href=url;open.target="_blank";open.rel="noopener noreferrer";
 open.textContent="Abrir lector completo · folios y lupa";toolbar.append(open);
 if(record.record&&/^https:\/\//.test(record.record)){
  const source=document.createElement("a");source.href=record.record;source.target="_blank";source.rel="noopener noreferrer";
  source.textContent="Ficha y signatura institucional";toolbar.append(source);
 }
 const frame=document.createElement("iframe");frame.src=url;frame.loading="lazy";
 frame.className="classical-local-manuscript-iframe";frame.title=record.title+" · lector de folios locales";
 container.append(intro,toolbar,frame);return true;
}

function pubLinks(entries,title,container){
 if(!entries?.length)return;
 const section=document.createElement("section");section.className="classical-evidence";
 const h=document.createElement("h3");h.textContent=title;section.append(h);
 for(const x of entries){
  const article=document.createElement("article");article.className="classical-evidence-record";
  const strong=document.createElement("strong");strong.textContent=x.title;article.append(strong);
  const meta=document.createElement("p");meta.className="classical-evidence-meta";
  meta.textContent=[x.library,x.shelfmark,x.date,x.editor,x.year,x.provider].filter(Boolean).join(" · ");article.append(meta);
  if(x.coverage){const p=document.createElement("p");p.textContent=x.coverage;article.append(p)}
  if(x.note){const p=document.createElement("p");p.textContent=x.note;article.append(p)}
  if(x.rights){const p=document.createElement("small");p.textContent=x.rights;article.append(p)}
  const links=document.createElement("div");links.className="classic-linkline";
  if(x.manifest){
   const p=new URLSearchParams({manifest:x.manifest,title:x.title,official:x.viewer||x.record||""});if(x.startFolio)p.set("folio",x.startFolio);
   const a=document.createElement("a");a.href="visor-codex.html?"+p;a.textContent="Leer códice dentro de Vitruvia";links.append(a);
  }
  for(const [label,url] of [["Leer códice folio a folio · biblioteca local",x.localViewer],["Ver códice en la institución",x.viewer],["Registro y signatura",x.record],["Edición / PDF en la fuente",x.url]]){
   if(!url||!/^https:\/\//.test(url)&&!/^documents\/classics\/[a-z0-9-]+\.pdf$/.test(url)&&!(x.localViewer===url&&localManuscriptUrl(x)))continue;
   if([...links.querySelectorAll("a")].some(a=>a.href===url))continue;
   const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label+" ↗";links.append(a);
  }
  if(x.url&&window.ClassicsFacsimileViewer?.isLocalPDF(x.url)){
   const action=document.createElement("button");action.type="button";action.className="classical-pdf-open";action.textContent="Leer PDF dentro de Vitruvia ↗";
   action.addEventListener("click",()=>{tab="pdf";const u=new URL(location.href);u.searchParams.set("work",selected);u.searchParams.set("view","pdf");u.searchParams.set("pdf",x.url);history.replaceState(null,"",u);detail();document.getElementById("classic-panel")?.scrollIntoView({block:"start",behavior:"smooth"})});
   links.prepend(action);
  }
  article.append(links);section.append(article);
 }
 container.append(section);
}
function language(){return $("classic-ui-language").value||"es";}
function terms(){return L[language()];}
/* Treat catalogue URLs as untrusted input: HTML escaping alone cannot stop javascript: URLs. */
function safePublicHref(value){
 if(typeof value!=="string")return "";
 const href=value.trim();
 if(/^https:\/\//i.test(href)){
  try{const url=new URL(href);return url.protocol==="https:"&&url.username===""&&url.password===""?url.href:""}catch{return ""}
 }
 if(/^(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:html|pdf)(?:[?#][a-z0-9_=&.%+\-#/]*)?$/i.test(href)&&!href.includes(".."))return href;
 return "";
}
function navLink(url,txt){const href=safePublicHref(url);return href?'<a target="_blank" rel="noopener noreferrer" referrerpolicy="strict-origin-when-cross-origin" href="'+safe(href)+'">'+safe(txt)+' ↗</a>':"";}
function isLocal(w){return ["lectura-local-completa","lectura-local-parcial"].includes(w.publicStatus)&&!!(w.localReader?.verified||w.pdf?.url||w.localHtml||w.localVersions?.length)}
function hasSource(w){return !!(w.reading?.url||w.pdf?.url||w.localHtml||w.manuscript?.manifest||w.witnessRecords?.length||w.historicEditions?.length)}
function statusLabel(w){const d=summaryWords[language()]||summaryWords.es;if(!isLocal(w)&&w.perseus?.length)return ({es:"TEXTO EN VISOR",en:"TEXT IN VIEWER",fr:"TEXTE DANS LA VISIONNEUSE",it:"TESTO NEL VISORE",de:"TEXT IM BETRACHTER",pt:"TEXTO NO VISUALIZADOR"})[language()]||"TEXTO EN VISOR";return isLocal(w)?(w.publicStatus==="lectura-local-parcial"?d.statusLocal+" · PDF PARCIAL":d.statusLocal):hasSource(w)?d.statusExternal:d.statusCatalogue}
function sourceType(w){
 if(w.witnessRecords?.length||w.manuscript?.manifest)return {label:"Testimonio manuscrito",title:"Incluye referencias a manuscritos. La obra antigua no se convierte por ello en edición diplomática."};
 if(w.historicEditions?.length||w.pdfEditions?.length)return {label:"Edición histórica",title:"La ficha incluye ediciones o impresos históricos; consultar año, editor y procedencia."};
 if(w.corpusFiles&&Object.keys(w.corpusFiles).some(k=>["es","en","fr"].includes(k)))return {label:"Original y traducción",title:"Existe una o más traducciones alojadas con referencia editorial. El cotejo por loci no implica alineación palabra a palabra."};
 if(w.corpusFiles&&Object.keys(w.corpusFiles).some(k=>["grc","la"].includes(k)))return {label:"Texto antiguo",title:"Texto original griego o latino indexado; traducción local no necesariamente disponible."};
 if(/estudio|monograf|art[ií]culo|commentar/i.test(w.genre||""))return {label:"Estudio / referencia",title:"Referencia bibliográfica o estudio secundario, no texto antiguo íntegro."};
 return {label:"Ficha bibliográfica",title:"Registro catalográfico de obra antigua; la disponibilidad se indica por separado."};
}
function workSearchText(w){return [w.author,w.title,w.genre,w.dating,w.language,...(w.aliases||[]),
 ...(w.witnessRecords||[]).flatMap(ms=>[ms.title,ms.shelfmark,ms.library,ms.date,ms.coverage]),
 ...(w.historicEditions||[]).flatMap(ed=>[ed.title,ed.editor,ed.year,ed.provider])].join(" ")}
// Academic categories work on the existing catalogue data, not a fixed list of famous works.
const technicalSubjects=/arquitect|ingenier|mecanic|hidraul|agricultur|agronom|medicin|farmacolog|botanic|astronom|geograf|cartograf|filosofi|retoric|oratori|poetic|exeges|linguist|historia natural|educacion/i;
const genericTerms=new Set(["tratado","tratados","classical","classic","classics","clasico","clasicos","clasica","clasicas","obra","obras","literatura","texto","textos","biblioteca","catalogo","catalog","book","books","work","works","antiguo","antiguos","antigua","antiguas","ancient","antiquity","latina","latino","latin","griega","griego","greek","de","del","la","el","las","los","the","of","and","et","y","sobre","in","en"]);
function isClassicalTreatise(w){
 const field=fold(w.genre||"");
 return technicalSubjects.test(field);
}
function searchIntent(q){
 const clean=fold(q).replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const terms=clean.split(/\s+/).filter(Boolean);
 const treatise=/\b(tratado|tratados|treatise|treatises|tractatus|tratado[s]?)\b/.test(clean);
 const meaningful=terms.filter(t=>!genericTerms.has(t)&&!["treatise","treatises","tractatus"].includes(t));
 return {terms:meaningful,treatise};
}
function matchingWitness(w,q){
 const tokens=searchIntent(q).terms;
 if(!tokens.length)return null;
 return (w.witnessRecords||[]).find(ms=>{
  const text=searchFold([ms.title,ms.shelfmark,ms.library,ms.date,ms.coverage].join(" "));
  return tokens.every(t=>text.includes(searchFold(t)));
 })||null;
}
function witnessYear(w){const dates=(w.witnessRecords||[]).map(ms=>Number(ms.dateStart)).filter(n=>Number.isFinite(n)&&n>0);return dates.length?Math.min(...dates):Infinity;}
function relevanceForWork(w,q){
 const {terms,treatise}=searchIntent(q);
 if(!terms.length)return treatise?(isClassicalTreatise(w)?25:-1):0;
 const hay=searchFold(workSearchText(w));
 if(!terms.every(term=>hay.includes(searchFold(term))))return -1;
 let value=terms.reduce((sum,term)=>sum+(fold(w.title).includes(term)?12:0)+(fold(w.author).includes(term)?7:0),0);
 if(matchingWitness(w,q))value+=22;
 if(treatise&&isClassicalTreatise(w))value+=16;
 return value;
}
function filters(){
 const q=$("classic-query").value.trim(),lang=$("classic-language").value,genre=$("classic-genre").value,
       availability=$("classic-availability")?.value||"",period=$("classic-period")?.value||"";
 const selectedSort=$("classic-sort")?.value||"relevance";
 return works.filter(w=>(period!=="focus"||periodFocus(w))&&(!lang||w.language===lang)&&(!genre||w.genre===genre)
  &&(!availability||(availability==="local"?isLocal(w):availability==="source"?hasSource(w)&&!isLocal(w):!hasSource(w)))
  &&(!q||relevanceForWork(w,q)>=0))
  .sort((a,b)=>{
   const rank=w=>isLocal(w)?0:hasSource(w)?1:2;
   if(selectedSort==="witness")return witnessYear(a)-witnessYear(b)||(q?relevanceForWork(b,q)-relevanceForWork(a,q):0)||rank(a)-rank(b)||fold(a.author).localeCompare(fold(b.author));
   if(selectedSort==="author")return fold(a.author).localeCompare(fold(b.author))||fold(a.title).localeCompare(fold(b.title));
   return (q?relevanceForWork(b,q)-relevanceForWork(a,q):0)||rank(a)-rank(b)
    ||fold(a.author).localeCompare(fold(b.author))||fold(a.title).localeCompare(fold(b.title));
  });
}
let suggestionIndex=-1;
function suggestedWorks(){
 // Preserve the same academic ranking and sort choice as the visible catalogue.
 // Reordering suggestions by availability alone obscures exact shelfmark hits.
 return filters();
}
function suggestionLabel(key){
 const dict={
  es:{count:"obras coincidentes",local:"para leer aquí",external:"con fuente externa",all:"Selecciona un título para consultar su lector, ficha o fuente documentada. El listado completo aparece al abrir este campo.",edition:"Edición identificada",none:"No hay obras que coincidan con la consulta o los filtros."},
  en:{count:"matching works",local:"readable here",external:"with external sources",all:"Choose any title to open its record and available reader.",edition:"Identified edition",none:"No matching works under the current filters."},
  fr:{count:"œuvres trouvées",local:"à lire ici",external:"avec source externe",all:"Choisissez un titre pour consulter sa notice et son lecteur disponible.",edition:"Édition identifiée",none:"Aucune œuvre correspondante avec ces filtres."}
 };
 return (dict[language()]||dict.es)[key];
}
function showBookSuggestions(){
 const field=$("classic-query"),list=$("classic-search-suggestions");if(!field||!list)return;
 const query=field.value.trim(),matches=suggestedWorks();
 const extras=[
  {name:"Libros y ediciones de Diego Kurilo",rows:extraBookMatches(extraBookIndex.author,query)},
  {name:"Ediciones históricas de Vitruvio",rows:extraBookMatches(extraBookIndex.historical,query)},
  {name:"Obras griegas y latinas",rows:matches,type:"classic"},
  {name:"Códices y testimonios de Vitruvio",rows:extraBookMatches(extraBookIndex.manuscripts,query)}
 ];
 const count=extras.reduce((n,group)=>n+group.rows.length,0);
 list.replaceChildren();suggestionIndex=-1;
 const heading=document.createElement("div");heading.className="classic-suggestions-heading";
 heading.textContent=count+" títulos y testimonios"+(query?" · «"+query+"»":" · índice completo");
 list.append(heading);
 const hint=document.createElement("p");hint.className="classic-suggestions-help";
 hint.textContent=suggestionLabel("all");list.append(hint);
 if(!count){
  const empty=document.createElement("div");empty.className="classic-suggestion-empty";
  empty.textContent=suggestionLabel("none");list.append(empty);
 }
 for(const group of extras){
  if(!group.rows.length)continue;
  const title=document.createElement("h4");title.className="classic-suggestion-group";
  title.textContent=group.name+" · "+group.rows.length;
  list.append(title);
  let shown=0;
  const batch=query?32:14;
  const more=document.createElement("button");more.type="button";
  more.className="classic-suggestion-more";
  const append=()=>{
   const frag=document.createDocumentFragment();
   const end=Math.min(group.rows.length,shown+batch);
   for(const r of group.rows.slice(shown,end)){
    const item=document.createElement("button");item.type="button";
    item.className="classic-suggestion"+(group.type==="classic"?"":" classic-suggestion-extended");
    item.setAttribute("role","option");item.setAttribute("aria-selected","false");
    item.dataset.record=group.type==="classic"?"classic":"extended";
    item.dataset.work=r.id;
    const primary=document.createElement("strong");primary.textContent=r.title;
    const meta=document.createElement("small");
    meta.textContent=group.type==="classic"?
     r.author+" · "+(r.language==="grc"?"Griego / Greek":"Latín / Latin")+" · "+statusLabel(r):
     [r.author,r.subtitle,r.status,r.external?"Enlace a fuente externa":"Lectura o ficha del sitio"].filter(Boolean).join(" · ");
    item.append(primary,meta);
    item.addEventListener("mousedown",event=>event.preventDefault());
    item.addEventListener("click",()=>group.type==="classic"?selectSuggestion(r.id):openExtraBook(r));
    frag.append(item);
   }
   // Append before the 'show more' control: preserve tab and reading order.
   list.insertBefore(frag,more);
   shown=end;
   more.hidden=shown>=group.rows.length;
   more.textContent="Mostrar más · "+shown+" de "+group.rows.length+" en esta sección";
  };
  more.addEventListener("mousedown",event=>event.preventDefault());
  more.addEventListener("click",append);
  list.append(more);
  append();
 }
 list.hidden=false;field.setAttribute("aria-expanded","true");
}
function hideBookSuggestions(){
 const list=$("classic-search-suggestions");
 if(list)list.hidden=true;
 const field=$("classic-query");
 if(field){field.setAttribute("aria-expanded","false");field.removeAttribute("aria-activedescendant")}
}
function selectSuggestion(id,selectedView){
 const w=works.find(x=>x.id===id);if(!w)return;
 // Do not replace an author or edition query with the selected title:
 // keeping the query preserves the full matching book list.
 hideBookSuggestions();
 choose(w.id);
 if(selectedView==="edition"){
  // Do not claim an embedded edition exists when the catalogue links outside.
  const evidence=$("classic-detail").querySelector(".classical-evidence");
  if(evidence){
   evidence.setAttribute("tabindex","-1");
   evidence.scrollIntoView({block:"start",behavior:"smooth"});
   return;
  }
 }
 $("classic-detail").scrollIntoView({block:"start",behavior:"smooth"});
}
function initBookSuggestions(){
 const field=$("classic-query"),list=$("classic-search-suggestions");if(!field||!list)return;
 field.addEventListener("focus",showBookSuggestions);
 field.addEventListener("click",showBookSuggestions);
 field.addEventListener("input",()=>{showBookSuggestions()});
 field.addEventListener("keydown",event=>{
  if(event.key==="Escape"){hideBookSuggestions();return}
  if(event.key==="ArrowDown"||event.key==="ArrowUp"){
   event.preventDefault();if(list.hidden)showBookSuggestions();
   const options=[...list.querySelectorAll("button[role=option]")];if(!options.length)return;
   suggestionIndex=(suggestionIndex+(event.key==="ArrowDown"?1:-1)+options.length)%options.length;
   options.forEach((o,i)=>o.setAttribute("aria-selected",String(i===suggestionIndex)));
   options[suggestionIndex].scrollIntoView({block:"nearest"});return;
  }
  if(event.key==="Enter"&&!list.hidden){
   const options=[...list.querySelectorAll("button[role=option]")];
   const option=options[suggestionIndex]||options[0];if(option){event.preventDefault();option.click()}
  }
 });
 document.addEventListener("pointerdown",event=>{if(!event.target.closest(".classic-search-wrap"))hideBookSuggestions()});
 field.addEventListener("blur",()=>{if(!list.matches(":hover"))hideBookSuggestions()});
}


function bibliographicSummary(data,query){
 const box=$("classic-detail");box.replaceChildren();
 const lang=language(),terms=summaryWords[lang]||summaryWords.es;
 const subject=fold(query);
 const exact=data.filter(w=>fold(w.author)===subject||(w.aliases||[]).some(a=>fold(a)===subject));
 const named=exact.length>=2?exact[0].author:null;
 const kicker=document.createElement("p");kicker.className="classic-bibliographic-kicker";
 kicker.textContent=terms.overview;box.append(kicker);
 const title=document.createElement("h2");title.textContent=named||query;box.append(title);
 const summary=document.createElement("p");summary.className="classic-bibliographic-count";
 summary.textContent=data.length+" "+terms.works+" · "+
 data.filter(isLocal).length+" "+terms.local+" · "+
 data.filter(w=>hasSource(w)&&!isLocal(w)).length+" "+terms.sources;
 box.append(summary);
 const note=document.createElement("p");note.className="classic-bibliographic-note";
 note.textContent=terms.note;
 box.append(note);
 const list=document.createElement("ol");list.className="classic-bibliographic-list";
 for(const w of data){
  const li=document.createElement("li");li.className="classic-bibliographic-entry";
  const h=document.createElement("h3");h.textContent=w.title;h.lang=w.language;li.append(h);
  const meta=document.createElement("p");
  meta.textContent=[w.author,w.dating,w.genre,w.language==="grc"?terms.greek:terms.latin].filter(Boolean).join(" · ");
  li.append(meta);
  const hit=matchingWitness(w,query);if(hit){const evidence=document.createElement("p");evidence.className="classic-witness-match";evidence.textContent=(lang==="en"?"Manuscript match: ":"Coincidencia en códice: ")+[hit.shelfmark,hit.library,hit.date].filter(Boolean).join(" · ");li.append(evidence)}
  const badge=document.createElement("span");badge.className="classic-item-status "+(isLocal(w)?"is-local":hasSource(w)?"is-external":"is-catalog");
  badge.textContent=statusLabel(w);li.append(badge);
  const button=document.createElement("button");button.type="button";button.className="classic-bibliographic-open";
  button.textContent=isLocal(w)?terms.read:terms.view;
  button.addEventListener("click",()=>{choose(w.id);box.scrollIntoView({block:"start",behavior:"smooth"})});
  li.append(button);list.append(li);
 }
 box.append(list);
}

function render(){const data=filters(),t=terms(),q=$("classic-query").value.trim();const total=works.length,local=works.filter(isLocal).length,withSource=works.filter(w=>hasSource(w)&&!isLocal(w)).length;
 $("classic-count").textContent=data.length+" / "+total+" "+t.search+" · "+local+" "+additionalInterfaceWords[language()]["count-local"]+" · "+withSource+" "+additionalInterfaceWords[language()]["count-source"];const target=$("classic-list"),fragment=document.createDocumentFragment();for(const w of data){const b=document.createElement("button");b.className="classic-item";b.type="button";b.dataset.id=w.id;b.setAttribute("aria-current",String(w.id===selected));b.innerHTML="<span>"+safe(w.author)+" · "+safe(w.dating)+"</span><strong lang='"+safe(w.language)+"'>"+safe(w.title)+"</strong><span>"+safe(w.genre)+"</span>";const availabilityMarker=document.createElement("small");availabilityMarker.className="classic-item-status "+(isLocal(w)?"is-local":hasSource(w)?"is-external":"is-catalog");availabilityMarker.textContent=statusLabel(w);b.append(availabilityMarker);const origin=sourceType(w),type=document.createElement("small");type.className="classic-origin-kind";type.textContent=origin.label;type.title=origin.title;b.append(type);const hit=q?matchingWitness(w,q):null;if(hit){const provenance=document.createElement("small");provenance.className="classic-witness-match";provenance.textContent=(language()==="en"?"Manuscript match: ":"Coincidencia en códice: ")+[hit.shelfmark,hit.library,hit.date].filter(Boolean).join(" · ");b.append(provenance)}b.addEventListener("click",()=>choose(w.id));fragment.append(b)}target.replaceChildren(fragment);if(!data.some(x=>x.id===selected)){if(data.length){selected=data[0].id;tab=data[0].pdf?.url?"pdf":"text"}else selected=""}target.querySelectorAll("button").forEach(b=>b.setAttribute("aria-current",String(b.dataset.id===selected)));if(q&&data.length>1&&!showSelectedDetail)bibliographicSummary(data,q);else detail();}
function choose(id){selected=id;showSelectedDetail=true;tab=works.find(x=>x.id===id)?.pdf?.url?"pdf":"text";render();
 const u=new URL(location.href);u.searchParams.set("work",id);u.searchParams.delete("view");u.searchParams.delete("ms");u.searchParams.delete("pdf");history.replaceState(null,"",u);}

/* Shared, conservative codicological dossier for every catalogued work.
 * A chronology of surviving witnesses is NOT a reconstructed textual stemma. */
function showTextualTransmission(work,container){
 const records=(work.witnessRecords||[]).filter(r=>r&&r.shelfmark&&r.date);
 const dated=records.filter(r=>Number.isFinite(r.dateStart)).sort((a,b)=>a.dateStart-b.dateStart);
 const earliest=dated[0]||null;
 const section=document.createElement("section");section.className="classic-transmission";
 section.id="tradicion-textual";section.setAttribute("aria-label","Historia del texto y testimonios codicológicos");
 const h=document.createElement("h3");h.textContent="Historia del texto · Codicología · Transmisión";
 section.append(h);
 const method=document.createElement("p");method.className="classic-transmission-method";
 method.textContent="Obra antigua ≠ testimonio material ≠ edición impresa ≠ traducción. Los datos codicológicos describen ejemplares concretos; una cronología de códices no demuestra relaciones de copia. Un stemma codicum crítico exige cotejo de variantes.";
 section.append(method);
 const fields=document.createElement("dl");fields.className="classic-transmission-fields";
 const field=(name,value)=>{const dt=document.createElement("dt");dt.textContent=name;const dd=document.createElement("dd");dd.textContent=value||"Pendiente de documentar con fuente primaria.";fields.append(dt,dd)};
 field("Autor / atribución",work.author);
 field("Título de referencia",work.bibliography?.uniformTitle||work.title);
 field("Lengua de composición",work.language==="la"?"Latín":work.language==="grc"?"Griego antiguo":work.language);
 field("Datación de la obra (no del códice)",work.dating);
 field("Identificador estable de catálogo",work.id);
 field("Localización canónica",work.bibliography?.canonicalReference||"Loci y equivalencias pendientes de cotejo editorial.");
 field("Estado del estudio de transmisión",records.length?"Testimonios individualizados en el registro institucional; recensio completa y relaciones genealógicas no certificadas.":"Sin testimonio físico individualizado y datado en el registro verificado actual.");
 section.append(fields);
 const oldest=document.createElement("div");oldest.className="classic-earliest-witness";oldest.setAttribute("role","note");
 const big=document.createElement("strong");big.className="classic-earliest-title";
 big.textContent=earliest?"TESTIMONIO MÁS TEMPRANO ENTRE LOS DOCUMENTADOS":"TESTIMONIO MÁS ANTIGUO · TODAVÍA SIN IDENTIFICAR";
 oldest.append(big);
 const description=document.createElement("p");
 description.textContent=earliest?
  [earliest.title,earliest.library,earliest.shelfmark,earliest.date].filter(Boolean).join(" · "):
  "No existe todavía un manuscrito datado e identificado para esta obra dentro del catálogo verificable. No se atribuye arbitrariamente el primer lugar al más antiguo conservado.";
 oldest.append(description);
 if(earliest){
  const linkTarget=localManuscriptUrl(earliest)||safePublicHref(earliest.viewer)||safePublicHref(earliest.record)||safePublicHref(earliest.manifest);
  if(linkTarget){const a=document.createElement("a");a.className="classic-oldest-link";a.href=linkTarget;
   a.textContent=localManuscriptUrl(earliest)?"Abrir los folios de este testimonio en nuestro visor ↗":"Abrir este testimonio en el visor o catálogo institucional ↗";
   if(/^https:\/\//.test(linkTarget)){a.target="_blank";a.rel="noopener noreferrer";a.referrerPolicy="strict-origin-when-cross-origin";}
   oldest.append(a);
  }
  const caution=document.createElement("small");
  caution.textContent="«Más temprano» significa únicamente el de datación más antigua entre los testigos registrados aquí; no se afirma que sea el manuscrito superviviente más antiguo de toda la tradición.";
  oldest.append(caution);
 }else{
  const urls=[work.reading?.url,work.manuscript?.record,work.manuscript?.viewer,work.manuscript?.manifest];
  const destination=urls.map(safePublicHref).find(Boolean);
  if(destination){const a=document.createElement("a");a.href=destination;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Consultar fuente externa identificada (no acreditada como códice más antiguo) ↗";oldest.append(a);}
 }
 section.append(oldest);
 const tree=document.createElement("div");tree.className="classic-witness-tree";
 const treeTitle=document.createElement("h4");treeTitle.textContent="Árbol documental de testimonios conservados";tree.append(treeTitle);
 const parent=document.createElement("div");parent.className="classic-witness-root";
 parent.textContent=(work.bibliography?.uniformTitle||work.title)+" · composición: "+(work.dating||"datación por estudiar");tree.append(parent);
 const note=document.createElement("p");note.className="classic-transmission-method";
 note.textContent="Esquema de inventario, NO stemma genealógico. Las líneas agrupan testigos de una misma obra, pero no presuponen dependencia textual ni arquetipo reconstruido.";tree.append(note);
 if(records.length){
  const ul=document.createElement("ul");ul.className="classic-witness-branches";
  for(const r of [...records].sort((a,b)=>(a.dateStart??9999)-(b.dateStart??9999))){
   const li=document.createElement("li");
   const label=document.createElement("strong");label.textContent=[r.shelfmark,r.date].filter(Boolean).join(" · ");li.append(label);
   const institution=document.createElement("span");institution.textContent=" · "+(r.library||"Institución no indicada");li.append(institution);
   const link=localManuscriptUrl(r)||safePublicHref(r.viewer)||safePublicHref(r.record);
   if(link){li.append(" · ");const a=document.createElement("a");a.href=link;a.textContent=localManuscriptUrl(r)?"Ver folios propios":"Ver testimonio";if(link.startsWith("https://")){a.target="_blank";a.rel="noopener noreferrer"}li.append(a);}
   const detail=document.createElement("small");detail.textContent="Signatura institucional; siglum crítico y filiación textual sin atribuir salvo documentación explícita.";li.append(detail);
   ul.append(li);
  }
  tree.append(ul);
 }else{
  const p=document.createElement("p");p.textContent="Ramas manuscritas pendientes de identificar y documentar. No se genera un árbol ficticio.";tree.append(p);
 }
 section.append(tree);
 const hist=document.createElement("div");hist.className="classic-transmission-history";
 const hh=document.createElement("h4");hh.textContent="Historia documental del texto";hist.append(hh);
 const historic=document.createElement("p");
 historic.textContent=records.length?
  "La obra fue compuesta en "+(work.dating||"fecha objeto de investigación")+". El catálogo distingue "+records.length+" testimonio(s) individualizados con fechas de copia y enlaces documentales. Su preservación y relaciones de dependencia deberán estudiarse con los aparatos críticos de las ediciones.":
  "La obra está registrada con datación de composición "+(work.dating||"pendiente")+". Su historia material de transmisión aún no se encuentra documentada con manuscritos individuales en esta ficha.";
 hist.append(historic);
 if(work.codicology?.earlierWitnessNote){const p=document.createElement("p");p.textContent="Nota sobre testimonios anteriores: "+work.codicology.earlierWitnessNote;hist.append(p);}
 const edition=document.createElement("p");edition.textContent="Acceso editorial: "+(work.translation?.status||work.reading?.status||"No se ha registrado edición y traducción individualmente cotejadas.");hist.append(edition);
 section.append(hist);
 const tabs=container.querySelector(".classic-tabstrip");
 if(tabs)tabs.before(section);else container.append(section);
}

function detail(){const w=works.find(x=>x.id===selected),box=$("classic-detail"),t=terms();if(!w){box.textContent=additionalInterfaceWords[language()]["no-results"];return}
const isTriple=w.id==="cicero-officiis",hasWitness=!!(w.witnessRecords?.length||w.manuscript?.manifest);
 const hasPdf=!!w.pdf?.url;
 const pdfEditions=Array.isArray(w.pdfEditions)&&w.pdfEditions.length?
  w.pdfEditions.filter(x=>window.ClassicsFacsimileViewer?.isLocalPDF(x.url)):hasPdf?[w.pdf]:[];
 const multiplePdf=pdfEditions.length>=2;
 const hasThreePanels=hasPdf&&w.localVersions?.length>=2;
 const manuscriptTab=hasWitness?[["manuscript",t.manuscript+(w.witnessRecords?.some(ms=>localManuscriptUrl(ms))?" · folios locales / IIIF":" · IIIF")]]:[];
 const pdfTab=hasPdf?[["pdf",multiplePdf?"PDF · original / traducción":t.pdf+" · Zoom / páginas"]]:[];
 const compareTab=multiplePdf?[["comparepdf","Comparar dos PDF · original / traducción"]]:[];
 const tripleTab=hasThreePanels?[["parallel","Tres visores · facsímil / latín / traducción"]]:[];
 const transcriptionTab=(w.localVersions?.length||w.localHtml||w.localReader?.verified)?[["text",t.source+" · transcripción"]]:[];
 const labels=isTriple?[["text","Tres visores · Códice / latín / traducción"],...pdfTab,...compareTab,...manuscriptTab]:
  !isLocal(w)?[["external",w.reading?.url?"Fuente externa y ficha":"Localizar ediciones"],...pdfTab,...manuscriptTab]:
  hasPdf?[...pdfTab,...tripleTab,...compareTab,...transcriptionTab,...manuscriptTab]:
  w.localHtml?[["text",t.source],...manuscriptTab]:
  [["text",t.source],...manuscriptTab,["edition",t.edition]];
 if(w.historicEditions?.length&&!labels.some(x=>x[0]==="edition"))labels.push(["edition",t.edition]);
 if(w.perseus?.length)(isLocal(w)?labels.push.bind(labels):labels.unshift.bind(labels))(["perseus",w.perseus.some(x=>x.translation)?"Leer original y traducción":"Leer texto original"]);
 if(!labels.some(x=>x[0]===tab))tab=labels[0][0];
const origin=sourceType(w);
const tabs=labels.map(([id,label])=>'<button type="button" data-tab="'+id+'" aria-pressed="'+(id===tab)+'">'+safe(label)+'</button>').join("");
box.innerHTML='<div class="classic-tag" title="'+safe(origin.title)+'">'+safe(origin.label)+'</div><div class="classic-tag">'+safe(w.language==="la"?"LATINE · LATÍN":"ΕΛΛΗΝΙΚΑ · GRIEGO")+'</div><div class="classic-tag">'+safe(w.genre)+'</div><h2 lang="'+w.language+'">'+safe(w.title)+'</h2><p><strong>'+safe(w.author)+'</strong> · '+safe(w.dating)+'</p><p class="classic-detail-status '+(isLocal(w)?"is-local":hasSource(w)?"is-external":"is-catalog")+'">'+statusLabel(w)+'</p><div class="classic-tabstrip" role="group" aria-label="Modos de lectura">'+tabs+'</div><div id="classic-panel" class="classic-viewer" role="region" aria-live="polite"></div><div class="classic-linkline">'+navLink(w.links.scaife,t.scaife)+navLink(w.links.gallica,t.gallica)+navLink(w.links.archive,t.archive)+'</div><p class="classic-ref"><strong>Nota editorial:</strong> '+safe(w.translation?.status||"Traducción sin cotejar.")+' '+safe(w.manuscript?.status||"Sin facsímil identificado.")+'</p>';
if(w.corpusFiles&&Object.keys(w.corpusFiles).some(l=>["la","grc"].includes(l))&&Object.keys(w.corpusFiles).some(l=>["es","en","fr","it","pt","de"].includes(l))){
 const bar=document.createElement("p");bar.className="classic-linkline";
 const link=document.createElement("a");
 link.href="classics-parallel-reader.html?work="+encodeURIComponent(w.id);
 link.textContent="📖 Leer original y traducción lado a lado · controles de lectura y sincronización";
 link.title="Abre dos visores independientes. Los capítulos se pueden avanzar juntos, sin suponer equivalencia textual exacta.";
 bar.append(link);box.querySelector(".classic-tabstrip")?.before(bar);
}
if(w.encyclopedia?.url&&/^https:\/\/[a-z-]+\.wikipedia\.org\/wiki\//i.test(w.encyclopedia.url)){
  const study=document.createElement('section');study.className='classic-encyclopedia-study';
  const heading=document.createElement('h3');heading.textContent='Estudio enciclopédico · contextualización de la obra';
  const intro=document.createElement('p');
  intro.textContent=w.encyclopedia.note||'Artículo secundario de contexto histórico; no es la edición del texto antiguo.';
  const links=document.createElement('div');links.className='classic-linkline';
  const internal=document.createElement('a');internal.href=w.encyclopedia.internalSearch||'vitruvia.html?q='+encodeURIComponent(w.title);
  internal.textContent='Leer estudio enciclopédico dentro de Vitruvia ↗';links.append(internal);
  const original=document.createElement('a');original.href=w.encyclopedia.url;
  original.target='_blank';original.rel='noopener noreferrer';
  original.textContent='Fuente original, notas e historial en Wikipedia ↗';links.append(original);
  const attribution=document.createElement('small');
  attribution.textContent=w.encyclopedia.attribution||'Wikipedia · licencia CC BY-SA; consultar fuente original.';
  study.append(heading,intro,links,attribution);
  const tabs=box.querySelector('.classic-tabstrip');
  if(tabs)tabs.before(study);else box.append(study);
 }
showTextualTransmission(w,box);
const back=document.createElement("a");back.href="vitruvia.html?q="+encodeURIComponent((w.aliases||[])[0]||w.title)+"&mode=site";
 back.className="classic-search-via-vitruvia";back.textContent="⌕ Buscar esta obra, sus códices y ediciones en Vitruvia";box.append(back);
 pubLinks(w.witnessRecords,"Testimonios manuscritos verificados · códices",box);
 pubLinks(w.historicEditions,"Ediciones históricas, textos y PDF identificados",box);
 if(w.language==="grc"&&!w.historicEditions?.some(x=>x.langs?.includes("la"))){
  const p=document.createElement("p");p.className="classic-ref";
  p.textContent="Traducción neolatina: pendiente de cotejo. La presencia del griego original no garantiza una versión latina, española ni inglesa disponible.";box.append(p);
 }
 if(w.vitruvianLoci?.loci?.length){const roman=n=>{let r="",v=Number(n);for(const [k,x] of [[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]])while(v>=k){r+=x;v-=k}return r||n};const fmt=l=>{const [b,...rest]=String(l).split(".");return roman(b)+"."+rest.join(".")};const vl=document.createElement("p");vl.className="classic-ref";const lab=document.createElement("strong");lab.textContent=(language()==="en"?"Named by Vitruvius:":language()==="fr"?"Cité par Vitruve :":"Citado por Vitruvio:")+" ";vl.append(lab);w.vitruvianLoci.loci.forEach((l,i)=>{if(i)vl.append(", ");const a=document.createElement("a");a.href="lector-bilingue.html?edition="+encodeURIComponent(w.vitruvianLoci.edition||"recensio-es")+"&locus="+encodeURIComponent(l);a.textContent="De arch. "+fmt(l);vl.append(a)});if(w.vitruvianLoci.note){vl.append(" · "+w.vitruvianLoci.note)}box.append(vl)}
 if(w.bibliography){const bib=document.createElement("section");bib.className="classic-bibliography";bib.setAttribute("aria-label","Registro bibliográfico y codicológico");const title=document.createElement("h3");title.textContent="Registro bibliográfico · Chicago 18";bib.append(title);const p=document.createElement("p");p.textContent=w.bibliography.editionCitation||w.bibliography.preferredCitation||"";bib.append(p);if(w.bibliography.manuscriptCitation){const h=document.createElement("h4");h.textContent="Codicología · Testimonio digital";bib.append(h);const witness=document.createElement("p");witness.textContent=w.bibliography.manuscriptCitation;bib.append(witness)}const note=document.createElement("p");note.textContent=w.bibliography.method||"";bib.append(note);box.append(bib)}
const localWitness=(w.witnessRecords||[]).find(ms=>localManuscriptUrl(ms));
if(localWitness){
 const feature=document.createElement("section");feature.className="classical-local-manuscript-feature";
 const title=document.createElement("h3");title.textContent="Manuscrito digitalizado disponible en esta biblioteca";
 const subtitle=document.createElement("p");
 subtitle.textContent=[localWitness.title,localWitness.shelfmark,localWitness.library,localWitness.localFolioCount?localWitness.localFolioCount+" imágenes digitales":""].filter(Boolean).join(" · ");
 const open=document.createElement("button");open.type="button";open.className="classical-local-manuscript-cta";
 open.textContent="Leer "+localWitness.shelfmark+" · folio a folio en esta página";
 open.addEventListener("click",()=>{
  tab="manuscript";const u=new URL(location.href);
  u.searchParams.set("work",w.id);u.searchParams.set("view","manuscript");u.searchParams.set("ms",localWitness.id);
  history.replaceState(null,"",u);detail();
  $("classic-panel")?.scrollIntoView({block:"start",behavior:"smooth"});
 });
 const external=document.createElement("a");external.href=localManuscriptUrl(localWitness);
 external.target="_blank";external.rel="noopener noreferrer";
 external.textContent="Abrir lector completo en otra pestaña";
 feature.append(title,subtitle,open,external);
 const target=box.querySelector(".classic-tabstrip");
 if(target)target.before(feature);else box.append(feature);
}
box.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{
  tab=b.dataset.tab;const u=new URL(location.href);u.searchParams.set("work",w.id);u.searchParams.set("view",tab);
  if(tab!=="manuscript")u.searchParams.delete("ms");if(tab!=="pdf")u.searchParams.delete("pdf");history.replaceState(null,"",u);detail();
 }));
const pane=$("classic-panel");
if(tab==="perseus"&&w.perseus?.length){
  pane.replaceChildren();
  const h=document.createElement("h3");h.textContent=w.perseus.some(x=>x.translation)?"Texto original y traducción inglesa · Perseus / Open Greek and Latin":"Texto original · Perseus / Open Greek and Latin";pane.append(h);
  const note=document.createElement("p");note.className="classic-ref";note.textContent="Edición TEI de Perseus Digital Library u Open Greek and Latin (First1KGreek), CC BY-SA 4.0, leída en el momento desde su repositorio público; no se copia en este sitio. Cuando hay imágenes verificadas del códice más antiguo, el visor las muestra primero.";pane.append(note);
  const bar=document.createElement("div");bar.className="classic-linkline";let pick=null;
  if(w.perseus.length>1){const lab=document.createElement("label");lab.className="classic-perseus-part";lab.textContent="Parte de la obra ";pick=document.createElement("select");
   for(const x of w.perseus){const o=document.createElement("option");o.value=x.obra;o.textContent=x.title+(x.translation?"":" · solo original");pick.append(o)}lab.append(pick);bar.append(lab)}
  const full=document.createElement("a");full.target="_blank";full.rel="noopener noreferrer";bar.append(full);pane.append(bar);
  const frame=document.createElement("iframe");frame.className="classic-perseus-frame";frame.title="Lector clásico · "+w.title;
  frame.style.cssText="width:100%;height:min(82vh,900px);border:1px solid #b49a6e;background:#fff";pane.append(frame);
  const load=id=>{frame.src="lector-clasico.html?obra="+encodeURIComponent(id)+"&embed=1";full.href="lector-clasico.html?obra="+encodeURIComponent(id);full.textContent="Abrir en pantalla completa ↗"};
  load(w.perseus[0].obra);if(pick)pick.addEventListener("change",()=>load(pick.value));
 }else if(tab==="external"){
  const searchText=[w.author,(w.aliases||[])[0]||w.title].join(" ");
  const googleBooks="https://books.google.com/books?q="+encodeURIComponent(searchText);
  const scaifeDiscovery=w.discovery?.scaife||"https://www.google.com/search?q="+encodeURIComponent("site:scaife.perseus.org "+searchText);
  const wikiSearch=w.discovery?.wikisource||"https://"+(w.language==="la"?"la":"el")+".wikisource.org/w/index.php?search="+encodeURIComponent(searchText);
  const header=document.createElement("h3");header.textContent=w.reading?.url?"Fuente externa consignada":"Localización académica de ediciones";pane.replaceChildren(header);
  const status=document.createElement("p");status.textContent=w.reading?.status||"No hay una edición local acreditada.";pane.append(status);
  const box=document.createElement("div");box.className="classic-linkline";
  for(const [url,label] of [[w.reading?.url,"Consultar texto en la institución de origen"],[scaifeDiscovery,"Buscar edición griega o latina en Scaife / Perseus"],[wikiSearch,"Buscar texto original en Wikisource"],[w.links?.archive,"Buscar digitalizaciones en Internet Archive"],[googleBooks,"Buscar edición histórica en Google Books"]]){
   if(!url||!/^https:\/\//i.test(url))continue;
   const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=label+" ↗";box.append(a);
  }
  pane.append(box);
  const warning=document.createElement("p");warning.className="classic-ref";warning.textContent="Estos vínculos localizan materiales. No afirman que exista una transcripción íntegra o un códice concreto en el destino; cada documento deberá verificarse antes de presentarlo como edición incorporada.";pane.append(warning);
 }else if(tab==="text"&&isTriple){window.BibliothecaTripleReader.mount(pane,w);}else if(tab==="text"&&w.localVersions?.length){pane.innerHTML="<h3>Ediciones incorporadas al sitio</h3><p>"+safe(w.reading.status)+"</p><div class=\"classic-compare-toolbar\"><label>Primera versión<select id=\"classic-version-a\"></select></label><label>Segunda versión<select id=\"classic-version-b\"></select></label></div><div class=\"classic-compare-panes\"><iframe id=\"classic-frame-a\" title=\"Edición primera\"></iframe><iframe id=\"classic-frame-b\" title=\"Edición segunda\"></iframe></div>";const a=pane.querySelector("#classic-version-a"),b=pane.querySelector("#classic-version-b");for(const [i,ver] of w.localVersions.entries()){for(const sel of [a,b]){const opt=document.createElement("option");opt.value=String(i);opt.textContent=ver.label;sel.append(opt)}}b.value=String(Math.min(1,w.localVersions.length-1));function updateFrames(){pane.querySelector("#classic-frame-a").src=w.localVersions[Number(a.value)].path;pane.querySelector("#classic-frame-b").src=w.localVersions[Number(b.value)].path}a.addEventListener("change",updateFrames);b.addEventListener("change",updateFrames);updateFrames();}else if(tab==="text"&&w.corpusFiles&&Object.keys(w.corpusFiles).length){
  // Direct, light text rendering: no nested iframe, PDF, OCR task or delayed load.
  // Every version remains complete in its own document; never infer matching loci.
  const versions=Object.entries(w.corpusFiles).filter(([lang,path])=>["la","grc","en","fr","es"].includes(lang)&&/^data\\/classics-corpus\\/[a-z0-9-]+\\.json$/.test(path));
  const labels={grc:"Griego original",la:"Latín original",en:"English · traducción",fr:"Français · traduction",es:"Castellano · traducción"};
  pane.replaceChildren();
  const h=document.createElement("h3");h.textContent="Original y traducciones · lectura rápida";pane.append(h);
  if(!versions.length){const note=document.createElement("p");note.textContent="No hay transcripciones locales verificadas para mostrar.";pane.append(note);}
  else{
    const note=document.createElement("p");note.className="classic-ref";note.textContent="Los textos se cargan por separado desde archivos ligeros. Cada columna conserva todos sus capítulos; compartir un número de capítulo no certifica una traducción exacta.";pane.append(note);
    const grid=document.createElement("div");grid.className="classic-compare-panes";pane.append(grid);
    const versionCache=new Map();
    async function getVersion(lang){
      if(!versionCache.has(lang)){
        const path=versions.find(v=>v[0]===lang)?.[1];
        versionCache.set(lang,fetch(path).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(j=>{
          if(j.workId!==w.id||j.language!==lang||!Array.isArray(j.passages)||!j.passages.length)throw Error("Archivo de texto no validado");
          return j;
        }).catch(err=>{versionCache.delete(lang);throw err}));
      }
      return versionCache.get(lang);
    }
    for(let i=0;i<Math.min(2,versions.length);i++){
      const side=document.createElement("section");side.className="classic-fast-text-pane";
      side.style.cssText="min-width:0;background:var(--white,#fffdf8);color:var(--ink,#203548);border:1px solid #b9a98e;padding:12px;display:flex;flex-direction:column;gap:9px";
      const select=document.createElement("select");select.setAttribute("aria-label",i?"Idioma del texto derecho":"Idioma del texto izquierdo");
      for(const [lang] of versions){const option=document.createElement("option");option.value=lang;option.textContent=labels[lang]||lang;select.append(option);}
      const original=versions.find(v=>["grc","la"].includes(v[0]))?.[0]||versions[0][0];
      const translated=versions.find(v=>["en","es","fr"].includes(v[0]))?.[0]||versions[Math.min(1,versions.length-1)][0];
      select.value=i===0?original:translated;
      select.style.cssText="width:100%;background:#fff;color:#203548;border:1px solid #928572;padding:10px;font:14px system-ui";
      const row=document.createElement("div");row.style.cssText="display:flex;flex-wrap:wrap;gap:6px;align-items:center";
      const prev=document.createElement("button");prev.type="button";prev.textContent="←";
      const next=document.createElement("button");next.type="button";next.textContent="→";
      const chapter=document.createElement("select");chapter.setAttribute("aria-label","Capítulo o locus");
      chapter.style.cssText="flex:1;min-width:100px;padding:7px;background:#fff;color:#203548";
      const search=document.createElement("input");search.type="search";search.placeholder="Buscar dentro de la versión";search.setAttribute("aria-label","Buscar en el texto");
      search.style.cssText="width:100%;min-width:0;padding:9px;background:#fff;color:#203548;border:1px solid #928572";
      const message=document.createElement("p");message.setAttribute("role","status");message.style.cssText="font:12px/1.4 system-ui;margin:0";
      const text=document.createElement("div");text.style.cssText="overflow:auto;max-height:65vh;min-height:250px;font:19px/1.7 Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere;padding:10px;background:var(--white,#fffdf8);color:var(--ink,#203548)";
      const source=document.createElement("p");source.style.cssText="font:12px/1.5 system-ui;margin:0;overflow-wrap:anywhere";
      const open=document.createElement("a");open.textContent="Abrir lector completo";open.target="_blank";open.rel="noopener noreferrer";
      row.append(prev,chapter,next);side.append(select,row,search,message,text,source,open);grid.append(side);
      let passages=[],current=0,serial=0;
      function draw(){
        const p=passages[current];if(!p)return;
        chapter.value=String(current);prev.disabled=current===0;next.disabled=current===passages.length-1;
        text.textContent=p.text||"";text.lang=select.value==="grc"?"grc":select.value;
        message.textContent="Capítulo / locus "+p.locus+" · "+(current+1)+" de "+passages.length;
        text.scrollTop=0;
      }
      async function load(){
        const ticket=++serial,lang=select.value;
        message.textContent="Cargando texto "+(labels[lang]||lang)+"…";text.textContent="";search.value="";
        try{
          const d=await getVersion(lang);if(ticket!==serial)return;
          passages=d.passages;current=0;chapter.replaceChildren();
          passages.forEach((p,j)=>{const opt=document.createElement("option");opt.value=String(j);opt.textContent=p.locus||String(j+1);chapter.append(opt);});
          source.textContent=(d.attribution||"Fuente editorial indicada en el corpus")+" · "+(d.alignment||"Sin alineación certificada");
          open.href="classics-text-reader.html?work="+encodeURIComponent(w.id)+"&lang="+encodeURIComponent(lang);
          draw();
        }catch(err){if(ticket===serial){message.textContent="No se pudo cargar el texto: "+err.message;text.textContent="Consulta el enlace institucional de la ficha.";}}
      }
      select.addEventListener("change",load);
      chapter.addEventListener("change",()=>{current=Number(chapter.value)||0;draw()});
      prev.addEventListener("click",()=>{current=Math.max(0,current-1);draw()});
      next.addEventListener("click",()=>{current=Math.min(passages.length-1,current+1);draw()});
      search.addEventListener("keydown",e=>{
        if(e.key!=="Enter")return;
        const q=search.value.trim().normalize("NFD").replace(/\\p{M}/gu,"").toLowerCase();if(!q)return;
        const at=passages.findIndex(p=>String(p.text||"").normalize("NFD").replace(/\\p{M}/gu,"").toLowerCase().includes(q));
        if(at<0){message.textContent="Sin coincidencias en esta versión textual.";return}
        current=at;draw();message.textContent+=" · primera coincidencia de «"+search.value.trim()+"»";
      });
      load();
    }
  }
}else if(tab==="text"&&w.localHtml){pane.innerHTML="<h3>"+safe(t.source)+" · "+safe(w.localEdition?.original||"")+(w.localEdition?.translation?" / "+safe(w.localEdition.translation):"")+"</h3><p>"+safe(w.localEdition?.source||"")+"</p>";const frame=document.createElement("iframe");const term=new URLSearchParams(location.search).get("term");frame.src=w.localHtml+(term?(w.localHtml.includes("?")?"&":"?")+"q="+encodeURIComponent(term):"");frame.title="Lectura íntegra · "+w.author+" · "+w.title;frame.loading="lazy";frame.style.minHeight="72vh";frame.style.background="#fbf8f0";pane.append(frame);const p=document.createElement("p");p.className="classic-linkline";p.innerHTML=navLink(w.localHtml,"Abrir texto completo alojado en GitHub");pane.append(p);}else if(tab==="text"&&w.localReader?.verified){window.BibliothecaTextReader.mount(pane,w.defaultLanguage||"es");}else if(tab==="text"){pane.innerHTML="<h3>"+safe(t.source)+"</h3>"+(w.reading.url?'<p>'+safe(w.reading.status)+'</p><div class="classic-linkline">'+navLink(w.reading.url,t.visit)+'</div><p>'+safe(t.notHosted)+'</p>':'<p>'+safe(t.notKnown)+'</p><p>'+safe(t.notHosted)+'</p><div class="classic-linkline">'+navLink(w.links.scaife,t.scaife)+'</div>');}
if(tab==="manuscript"){
  const witnesses=w.witnessRecords||[];
  pane.replaceChildren();
  if(witnesses.length){
   const bar=document.createElement("div");bar.className="classical-ms-switch";
   const label=document.createElement("label");label.textContent="Seleccionar testimonio manuscrito";
   const selector=document.createElement("select");selector.setAttribute("aria-label","Seleccionar códice");
    const requestedMs=new URLSearchParams(location.search).get("ms");
   witnesses.forEach((record,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=record.shelfmark+" · "+record.library;selector.append(o)});
   if(requestedMs){const index=witnesses.findIndex(ms=>ms.id===requestedMs);if(index>=0)selector.value=String(index)}
    label.append(selector);bar.append(label);pane.append(bar);
   const viewer=document.createElement("div");viewer.className="classical-manuscript-panel";pane.append(viewer);
   const show=()=>{const chosen=witnesses[Number(selector.value)]||witnesses[0];if(!showLocalManuscript(viewer,chosen))window.ClassicsFacsimileViewer?.mountManuscript(viewer,chosen)};
   selector.addEventListener("change",()=>{const url=new URL(location.href);url.searchParams.set("work",w.id);url.searchParams.set("view","manuscript");url.searchParams.set("ms",witnesses[Number(selector.value)]?.id||"");history.replaceState(null,"",url);show()});show();
  }else if(w.manuscript?.manifest){
   const fallback={title:w.title,shelfmark:w.title,library:w.author,manifest:w.manuscript.manifest,viewer:w.manuscript.record||w.manuscript.manifest,record:w.manuscript.record||w.manuscript.manifest,coverage:w.manuscript.status||"",rights:"Consultar condiciones institucionales de reproducción."};
   window.ClassicsFacsimileViewer?.mountManuscript(pane,fallback);
  }else pane.append(document.createTextNode("Sin códice identificado para esta obra."));
 }
if(tab==="edition"&&w.historicEditions?.length){pane.replaceChildren();pubLinks(w.historicEditions,t.edition,pane);}else if(tab==="edition"&&w.localReader?.verified){window.BibliothecaTextReader.mount(pane,"en");}else if(tab==="edition"){pane.innerHTML="<h3>"+safe(t.edition)+"</h3><p>"+safe(w.reading.status)+"</p><p>"+safe(t.noTrans)+"</p><p>"+safe(t.notHosted)+"</p><div class='classic-linkline'>"+navLink(w.links.scaife,t.scaife)+"</div>";}
if(tab==="pdf"){
  if(w.pdf?.url){
   const variants=pdfEditions.length?pdfEditions:[w.pdf];
   const requested=new URLSearchParams(location.search).get("pdf");
   const selectedEdition=variants.find(v=>v.url===requested)||variants.find(v=>v.role==="original")||variants[0];
   pane.replaceChildren();
   const view=document.createElement("div");view.className="classic-selected-pdf";
   function showEdition(v){
    const langLabel=v.language==="grc"?"GRIEGO ORIGINAL":v.language==="la"?"LATÍN ORIGINAL":v.language==="en"?"TRADUCCIÓN INGLESA":v.language==="es"?"TRADUCCIÓN CASTELLANA":"EDICIÓN HISTÓRICA";
    window.ClassicsFacsimileViewer?.mountPdf(view,{
     url:v.url,title:w.title+" · "+langLabel,
     note:langLabel+" · "+(v.status||"")+" · "+(v.rights||"")+" · "+(v.coverage||""),
     sizeLabel:v.sizeBytes?(v.sizeBytes/1048576).toFixed(1)+" MiB":"PDF histórico",
     language:v.language||w.language||"",workId:w.id,
     transcription:w.localHtml?"bibliotheca-graeca-latina.html?work="+encodeURIComponent(w.id)+"&view=text":""
    });
   }
   if(variants.length>1){
    const bar=document.createElement("div");bar.className="classic-pdf-version-toolbar";
    const label=document.createElement("label");label.textContent="Edición para consultar";
    const selector=document.createElement("select");selector.setAttribute("aria-label","Elegir PDF original o traducción");
    for(const [i,v] of variants.entries()){
     const option=document.createElement("option");option.value=String(i);
     option.textContent=(v.label||(v.language==="grc"?"Griego":v.language==="la"?"Latín":"Traducción"))+" · "+(v.pages||"—")+" páginas";
     selector.append(option);
    }
    selector.value=String(variants.indexOf(selectedEdition));label.append(selector);bar.append(label);
    const note=document.createElement("p");note.className="classic-ref";
    note.textContent="Ediciones independientes: el original y la traducción no están alineados por número de página.";bar.append(note);
    pane.append(bar);
    selector.addEventListener("change",()=>{
     const chosen=variants[Number(selector.value)]||variants[0],u=new URL(location.href);
     u.searchParams.set("work",w.id);u.searchParams.set("view","pdf");u.searchParams.set("pdf",chosen.url);
     history.replaceState(null,"",u);showEdition(chosen);
    });
   }
   pane.append(view);showEdition(selectedEdition);
  }else pane.innerHTML="<h3>"+safe(t.pdf)+"</h3><p>"+safe(t.noPdf)+"</p>";
 }
 if(tab==="comparepdf"&&pdfEditions.length>=2){
  pane.replaceChildren();
  const note=document.createElement("p");note.className="classic-ref";
  note.textContent="Dos ediciones históricas independientes. No se afirma correspondencia exacta entre las páginas.";pane.append(note);
  const holder=document.createElement("div");holder.className="classic-double-pdf";pane.append(holder);
  const first=pdfEditions.find(v=>v.role==="original")||pdfEditions[0];
  const second=pdfEditions.find(v=>v.role==="translation")||pdfEditions.find(v=>v.url!==first.url)||pdfEditions[0];
  for(const v of [first,second]){
   const box=document.createElement("section");box.className="classic-compare-item";
   const title=document.createElement("h3");title.textContent=v.label||"Edición";box.append(title);
   const frame=document.createElement("iframe");frame.loading="lazy";frame.title=title.textContent+" · "+w.title;frame.src=v.url+"#toolbar=1&navpanes=0";box.append(frame);
   const open=document.createElement("a");open.href=v.url;open.target="_blank";open.rel="noopener noreferrer";open.textContent="Abrir PDF completo ↗";box.append(open);
   holder.append(box);
  }
 }
 if(tab==="parallel"&&hasThreePanels){
  pane.replaceChildren();
  const note=document.createElement("p");note.className="classic-ref";
  note.textContent="Fascímil histórico, transcripción original y traducción en tres visores independientes. No existe alineación automática de folios, páginas y versos.";pane.append(note);
  const original=w.localVersions.find(v=>v.language===w.language)||w.localVersions[0];
  const translations=w.localVersions.filter(v=>v.path!==original.path);
  const holder=document.createElement("div");holder.className="classic-triple-reading";pane.append(holder);
  const def=[
   {name:"01 · PDF histórico",path:w.pdf.url,pdf:true},
   {name:"02 · "+(w.language==="grc"?"Griego original":"Latín original"),path:original.path},
   {name:"03 · Traducción",path:(translations[0]||original).path,options:translations}
  ];
  for(const info of def){
   const column=document.createElement("section");column.className="classic-triple-column";
   const title=document.createElement("h3");title.textContent=info.name;column.append(title);
   const frame=document.createElement("iframe");frame.loading="lazy";frame.title=info.name;frame.src=info.path+(info.pdf?"#toolbar=1&navpanes=0":"");
   if(info.options?.length>1){
    const select=document.createElement("select");select.setAttribute("aria-label","Seleccionar idioma de traducción");
    info.options.forEach((v,i)=>{const opt=document.createElement("option");opt.value=String(i);opt.textContent=v.label||v.language;select.append(opt)});
    select.addEventListener("change",()=>{frame.src=info.options[Number(select.value)].path});
    column.append(select);
   }
   column.append(frame);holder.append(column);
  }
 }
}
async function boot(){
 const getJson=(path,fallback)=>fetch(path).then(r=>r.ok?r.json():fallback).catch(()=>fallback);
 // Main classical catalogue should not wait for unrelated modern book inventories.
 // Launch the optional autocomplete sources in parallel and reveal the catalogue first.
 const extraIndexTask=Promise.all([
  getJson("data/catalog.json?v=20261106-unified-books-v1",{editions:[]}),
  getJson("data/catalog-completo.json?v=20261106-unified-books-v1",[]),
  getJson("data/kurilo-libros/index.json?v=20261106-unified-books-v1",{books:[]})
 ]).then(([modernCatalogue,fullInventory,kuriloBooks])=>{
  extraBookIndex=buildExtraBookIndex(modernCatalogue,fullInventory,kuriloBooks);
  if(document.activeElement===$("classic-query"))showBookSuggestions();
 });
 const [res,reference,perseusLinks]=await Promise.all([
  fetch("data/bibliotheca-graeca-latina-I-bce-I-ce.json?v=20261104-nota-v1"),
  getJson("data/bibliotheca-testimonia-verified.json?v=20261104-readings-v1",{records:[],editions:[]}),
  getJson("data/bibliotheca-perseus.json?v=20261105-v1",{links:{}})
 ]);
 if(!res.ok)throw Error("HTTP "+res.status);
 witnessData=reference;
 works=((await res.json()).works||[]).filter(w=>w&&w.id&&w.title&&(w.language==="la"||w.language==="grc"));
 const map=new Map(works.map(w=>[w.id,w]));
 for(const record of (witnessData.records||[]))for(const id of record.workIds||[]){
  const w=map.get(id);if(w)(w.witnessRecords??=[]).push(record);
 }
 for(const edition of witnessData.editions||[]){const w=map.get(edition.workId);if(w)(w.historicEditions??=[]).push(edition)}
 for(const [id,list] of Object.entries(perseusLinks.links||{})){const w=map.get(id);if(w&&Array.isArray(list)&&list.length)w.perseus=list}
 for(const w of works)w.witnessRecords?.sort((a,b)=>(a.dateStart??9999)-(b.dateStart??9999));
 const n=$("classic-witness-count");if(n)n.textContent=(witnessData.records||[]).length+" "+additionalInterfaceWords[language()]["witness-count"];const genres=[...new Set(works.map(x=>x.genre))].sort((a,b)=>a.localeCompare(b,"es"));for(const s of genres){const o=document.createElement("option");o.textContent=o.value=s;$("classic-genre").append(o)}const availability=$("classic-availability");if(availability)availability.addEventListener("change",()=>{hideBookSuggestions();render()});
 const period=$("classic-period");if(period)period.addEventListener("change",()=>{hideBookSuggestions();render()});
 const sort=$("classic-sort");if(sort)sort.addEventListener("change",()=>{hideBookSuggestions();render()});
 const clear=$("classic-clear");if(clear){const inp=$("classic-query");const sync=()=>{clear.hidden=!inp.value};inp.addEventListener("input",sync);clear.addEventListener("click",()=>{inp.value="";sync();hideBookSuggestions();render();inp.focus()});inp.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&inp.value){ev.preventDefault();inp.value="";sync();hideBookSuggestions();render()}});sync()}
 const startParams=new URLSearchParams(location.search),wanted=startParams.get("work");
 const initialQuery=(startParams.get("q")||"").trim().slice(0,180);
 if(initialQuery)$("classic-query").value=initialQuery;
 selected=works.find(w=>w.id===wanted)?.id||works[0]?.id||"";
 const requestedView=startParams.get("view");
 tab=["pdf","manuscript","external","text","edition","comparepdf","parallel","perseus"].includes(requestedView)?requestedView:((()=>{const sw=works.find(w=>w.id===selected);return sw?.corpusFiles&&sw?.localHtml?"text":sw?.pdf?.url?"pdf":"text"})());try{const saved=localStorage.getItem("vitruvius-ui-lang");if(["es","en","fr","it","de","pt"].includes(saved))$("classic-ui-language").value=saved;}catch{}let pendingFilter=0;
 const searchInput=$("classic-query");
 searchInput.addEventListener("input",()=>{
  // Typing does not need to reconstruct hundreds of book cards and PDF frames
  // on every key press. Explicit selections and dropdown changes stay immediate.
  clearTimeout(pendingFilter);
  pendingFilter=setTimeout(()=>{pendingFilter=0;showSelectedDetail=false;render()},110);
 });
 for(const name of ["classic-language","classic-genre","classic-ui-language"])
  $(name).addEventListener("change",()=>{
   clearTimeout(pendingFilter);pendingFilter=0;
   if(name==="classic-ui-language")translateInterface();
   showSelectedDetail=false;render();
  });
 translateInterface();render();initBookSuggestions();void extraIndexTask;}

/* Visual accessibility controls for every embedded frame in the classics catalogue.
   Exact color changes only apply to locally controlled HTML readers; PDF and external
   facsimiles can be visually inverted but their original pixels remain unchanged. */
function installCatalogueFrameTools(){
 const root=$("classic-detail");if(!root)return;
 function scan(){
  for(const frame of root.querySelectorAll("iframe:not([data-color-tools])")){
   frame.dataset.colorTools="1";
   const toolbar=document.createElement("div");toolbar.className="classic-frame-colors";
   toolbar.style.cssText="display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px;background:#e6ddcd;border:1px solid #bda988;margin:9px 0 0";
   const invert=document.createElement("button");invert.type="button";invert.textContent="◐ Invertir visor";
   invert.title="Invertir visualmente cualquier visor, incluido PDF o facsímil";
   const url=()=>{try{return new URL(frame.src,location.href)}catch{return null}};
   const isText=()=>url()?.pathname.endsWith("/classics-text-reader.html");
   const text=document.createElement("span");text.textContent=isText()?"Paleta de texto:":"PDF o facsímil: inversión visual";
   text.style.fontSize="12px";toolbar.append(invert,text);
   let inverted=false;
   invert.addEventListener("click",()=>{
    inverted=!inverted;
    if(isText()){
     const fg=inverted?"#f4efdf":"#202b35",bg=inverted?"#1b2833":"#fffdfa";
     frame.contentWindow?.postMessage({type:"vitruvia-parallel-style",work:url()?.searchParams.get("work"),lang:url()?.searchParams.get("lang"),background:bg,foreground:fg},location.origin);
    }else frame.style.filter=inverted?"invert(1)":"none";
    invert.setAttribute("aria-pressed",String(inverted));
   });
   if(isText()){
    const bg=document.createElement("input"),fg=document.createElement("input");
    bg.type=fg.type="color";bg.value="#fffdfa";fg.value="#202b35";
    for(const [el,label] of [[bg,"Fondo libre"],[fg,"Texto libre"]]){
     el.setAttribute("aria-label",label);el.title=label;el.style.cssText="width:34px;height:32px;padding:2px";
     toolbar.append(el);
    }
    const update=()=>{
     const u=url();if(!u)return;
     frame.contentWindow?.postMessage({type:"vitruvia-parallel-style",work:u.searchParams.get("work"),lang:u.searchParams.get("lang"),background:bg.value,foreground:fg.value},location.origin);
    };
    bg.addEventListener("input",update);fg.addEventListener("input",update);frame.addEventListener("load",update);
   }
   frame.before(toolbar);
  }
 }
 let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;scan();});});
 observer.observe(root,{childList:true,subtree:true});scan();
}
installCatalogueFrameTools();

boot().catch(err=>{$("classic-count").textContent="No se pudo abrir el catálogo: "+err.message;});
})();