/* Shared ES/EN/FR navigation and interface language.
   Document titles, manuscript sigla, Latin/Greek passages, facsimiles and citations are not machine-translated. */
(()=>{
 'use strict';
 const KEY='vitruvius-ui-lang';
 const codes=['es','en','fr','it','de','pt'];
 const translations={
  'Inicio':['Home','Accueil'],
  'Biblioteca':['Library','Bibliothèque'],
  '← Biblioteca':['← Library','← Bibliothèque'],
  '← Volver a la biblioteca':['← Back to the library','← Retour à la bibliothèque'],
  'Volver a la biblioteca':['Back to the library','Retour à la bibliothèque'],
  'Biblioteca principal':['Main library','Bibliothèque principale'],
  'Buscador':['Search','Recherche'],
  'Buscador de textos':['Text search','Recherche de textes'],
  'Buscar en los textos':['Search the texts','Rechercher dans les textes'],
  'Buscar':['Search','Rechercher'],
  'Catálogo':['Catalogue','Catalogue'],
  'Bibliografía':['Bibliography','Bibliographie'],
  'Ediciones históricas':['Historical editions','Éditions historiques'],
  'Ediciones libres':['Open-access editions','Éditions en libre accès'],
  'La colección':['The collection','La collection'],
  'Aparato crítico':['Critical apparatus','Apparat critique'],
  'Índice textual y notas':['Textual index and notes','Index textuel et notes'],
  'Índices':['Indices','Index'],
  'Índices locorum':['Indices of passages','Index des loci'],
  'Personajes y lugares':['People and places','Personnages et lieux'],
  'Facsímiles':['Facsimiles','Fac-similés'],
  'Facsímiles manuscritos':['Manuscript facsimiles','Fac-similés des manuscrits'],
  'Manuscritos':['Manuscripts','Manuscrits'],
  'Fuentes y método':['Sources and methods','Sources et méthode'],
  'Método filológico':['Philological method','Méthode philologique'],
  'Estudios académicos':['Scholarly studies','Études universitaires'],
  'Bibliotecas y universidades':['Libraries and universities','Bibliothèques et universités'],
  'Bibliotheca Graeca et Latina · Autores y tratados':['Greek and Latin Library · Authors and treatises','Bibliothèque grecque et latine · Auteurs et traités'],
  'Como citar':['How to cite','Comment citer'],
  'Cómo citar':['How to cite','Comment citer'],
  'Lectura e investigación':['Reading and research','Lecture et recherche'],
  'Lectura':['Reading','Lecture'],
  'Leer':['Read','Lire'],
  'Leer PDF':['Read PDF','Lire le PDF'],
  'Consultar':['Consult','Consulter'],
  'Abrir':['Open','Ouvrir'],
  'Descargar':['Download','Télécharger'],
  'Imprimir':['Print','Imprimer'],
  '⎙ Imprimir':['⎙ Print','⎙ Imprimer'],
  'Copiar':['Copy','Copier'],
  'Comparar':['Compare','Comparer'],
  'Consulta comparada':['Compare editions','Comparer les éditions'],
  'Idioma':['Language','Langue'],
  'Libro':['Book','Livre'],
  'Capítulo':['Chapter','Chapitre'],
  'Sección':['Section','Section'],
  'Traducción':['Translation','Traduction'],
  'Referencia directa':['Direct reference','Référence directe'],
  'Abrir locus →':['Open passage →','Ouvrir le locus →'],
  'Lectura por libro, capítulo y sección':['Reading by book, chapter and section','Lecture par livre, chapitre et section'],
  'Texto latino y traducción enfrentados, vinculados por la numeración del tratado. Elige una referencia o busca una frase en los textos.':['Facing Latin text and translation, aligned by the treatise’s numbering. Choose a reference or search for a phrase in the texts.','Texte latin et traduction en regard, alignés selon la numérotation du traité. Choisissez une référence ou recherchez une expression dans les textes.'],
  'EDICIÓN Y TRADUCCIONES DE DIEGO KURILO':['EDITION AND TRANSLATIONS BY DIEGO KURILO','ÉDITION ET TRADUCTIONS DE DIEGO KURILO'],
  'Facsímiles de los códices vitruvianos':['Facsimiles of Vitruvian manuscripts','Fac-similés des manuscrits vitruviens'],
  'TESTIMONIA · TRADICIÓN MANUSCRITA':['TESTIMONIA · MANUSCRIPT TRADITION','TESTIMONIA · TRADITION MANUSCRITE'],
  'Abrir Scriptorium digital: lupa, ampliación y filtros de lectura de folios ↗':['Open the digital Scriptorium: magnification, zoom and folio reading filters ↗','Ouvrir le Scriptorium numérique : loupe, agrandissement et filtres de lecture des folios ↗'],
  'Transcripción diplomática de H':['Diplomatic transcription of H','Transcription diplomatique de H'],
  'Comparar con latín y traducciones':['Compare with Latin and translations','Comparer avec le latin et les traductions'],
  'Consulta de imágenes de folios conservados en instituciones públicas. La visualización integrada depende de los servicios de cada biblioteca, que pueden restringir su incorporación en sitios externos. En ese caso, el enlace al visor institucional permite continuar la consulta sin alterar ni redistribuir imágenes.':[
    'Consult images of manuscript folios held by public institutions. Embedded viewing depends on each library’s services, which may restrict display on external websites. In those cases, the institutional viewer link allows consultation without altering or redistributing images.',
    'Consultez les images de folios conservés dans des institutions publiques. L’affichage intégré dépend des services de chaque bibliothèque, qui peuvent en limiter l’intégration sur des sites externes. Dans ce cas, le lien vers la visionneuse institutionnelle permet de poursuivre la consultation sans modifier ni redistribuer les images.'
  ],
  'Scriptorium comparativo de Gudianus 69 y 132 · prueba con PDF ↗':['Comparative Scriptorium for Gudianus 69 and 132 · PDF test ↗','Scriptorium comparatif des Gudianus 69 et 132 · essai PDF ↗'],
  'Escritorio H — cotejo del manuscrito con latín y traducciones castellana, inglesa y francesa →':['H research desk — compare the manuscript with Latin, Spanish, English and French translations →','Bureau de recherche H — confrontation du manuscrit avec le latin et les traductions espagnole, anglaise et française →'],
  'Elegir libros, prefacios y loci junto al visor del Harley MS 2767.':['Choose books, prefaces and passages alongside the Harley MS 2767 viewer.','Choisissez les livres, préfaces et passages à côté du lecteur du Harley MS 2767.'],
  'Harleianus y Cottonianus':['Harleianus and Cottonianus','Harleianus et Cottonianus'],
  'Convenciones codicológicas:':['Codicological conventions:','Conventions codicologiques :'],
  'Otros testigos y digitalizaciones':['Other witnesses and digitizations','Autres témoins et numérisations'],
  'Seleccionar manuscrito':['Select manuscript','Sélectionner un manuscrit'],
  'Signatura:':['Shelfmark:','Cote :'],
  'Datación:':['Date:','Datation :'],
  'Soporte:':['Material:','Support :'],
  'Escritura:':['Script:','Écriture :'],
  'Extensión:':['Extent:','Étendue :'],
  'Formato:':['Format:','Format :'],
  'Contenido:':['Contents:','Contenu :'],
  'Sigla crítica:':['Critical siglum:','Sigle critique :'],
  'Unidad codicológica:':['Codicological unit:','Unité codicologique :'],
  'Foliación:':['Foliation:','Foliotation :'],
  'Decoración:':['Decoration:','Décoration :'],
  'Nota editorial:':['Editorial note:','Note éditoriale :'],
  'Abrir visor de folios en la British Library ↗':['Open the folio viewer at the British Library ↗','Ouvrir la visionneuse des folios de la British Library ↗'],
  'Ficha del manuscrito ↗':['Manuscript catalogue record ↗','Notice du manuscrit ↗'],
  'Ficha de los folios vitruvianos ↗':['Catalogue record of the Vitruvian folios ↗','Notice des folios vitruviens ↗'],
  'Abrir ficha institucional y acceso al facsímil ↗':['Open institutional record and facsimile ↗','Ouvrir la notice institutionnelle et le fac-similé ↗'],
  'Consultar manuscrito S en la biblioteca digital ↗':['Consult manuscript S in the digital library ↗','Consulter le manuscrit S dans la bibliothèque numérique ↗'],
  'Ficha científica ARCA / CNRS ↗':['ARCA / CNRS scholarly record ↗','Notice scientifique ARCA / CNRS ↗'],
  'Leer facsímil digital en Gallica ↗':['Read digital facsimile on Gallica ↗','Lire le fac-similé numérique sur Gallica ↗'],
  'Ficha del manuscrito en BnF ↗':['BnF manuscript record ↗','Notice du manuscrit à la BnF ↗'],
  'Si el visor se muestra vacío, usa «Abrir visor»; algunas plataformas no permiten mostrarse dentro de un iframe externo. La paginación del facsímil y la foliación del códice no se equiparan automáticamente.':[
    'If the viewer appears empty, use “Open viewer”; some platforms do not allow embedding on external sites. Facsimile page numbering and manuscript foliation are not assumed to correspond automatically.',
    'Si la visionneuse est vide, utilisez « Ouvrir la visionneuse » : certaines plateformes n’autorisent pas l’intégration sur un site externe. La pagination du fac-similé et la foliotation du manuscrit ne sont pas assimilées automatiquement.'
  ],
  'Index codicum et stemmata':['Index codicum et stemmata','Index codicum et stemmata'],
  'Índice de testigos manuscritos de':['Index of manuscript witnesses of','Index des témoins manuscrits de'],
  'Stemmata codicum · comparación crítica':['Stemmata codicum · critical comparison','Stemmata codicum · comparaison critique'],
  'Manuscritos internacionales · solo catálogo y enlace institucional':['International manuscripts · catalogue and institutional links only','Manuscrits internationaux · catalogue et liens institutionnels uniquement'],
  'Ediciones históricas de consulta':['Historical editions for consultation','Éditions historiques à consulter'],
  'FUENTES Y TRADICIÓN EDITORIAL':['SOURCES AND EDITORIAL TRADITION','SOURCES ET TRADITION ÉDITORIALE'],
  'Basílica de Fano':['Basilica of Fano','Basilique de Fano'],
  'Información para investigadores':['Information for researchers','Informations pour les chercheurs']
 };
 Object.assign(translations,{"Lector bilingüe": ["Bilingual reader", "Lecteur bilingue"], "Índices y colación": ["Indices and collation", "Index et collation"], "Bibliotheca clásica": ["Classical library", "Bibliothèque classique"], "← Pasaje anterior": ["← Previous passage", "← Passage précédent"], "Pasaje siguiente →": ["Next passage →", "Passage suivant →"], "Mostrar las tres traducciones": ["Show all three translations", "Afficher les trois traductions"], "Imprimir / guardar PDF": ["Print / save PDF", "Imprimer / enregistrer en PDF"], "Buscar en el tratado": ["Search the treatise", "Rechercher dans le traité"], "Palabra o frase": ["Word or phrase", "Mot ou expression"], "Ámbito": ["Scope", "Portée"], "Coincidencia": ["Match", "Correspondance"], "Los diez libros": ["All ten books", "Les dix livres"], "Este libro de Vitruvio": ["This book of Vitruvius", "Ce livre de Vitruve"], "Todas las palabras": ["All words", "Tous les mots"], "Frase exacta": ["Exact phrase", "Expression exacte"], "Todas las formas del lema": ["All forms of the lemma", "Toutes les formes du lemme"], "Por sentido · IA (agrupa pasajes)": ["By meaning · AI (groups passages)", "Par sens · IA (regroupe les passages)"], "Buscar →": ["Search →", "Rechercher →"], "Prólogo": ["Preface", "Préface"], "TEXTO LATINO": ["LATIN TEXT", "TEXTE LATIN"], "TRADUCCIÓN": ["TRANSLATION", "TRADUCTION"], "REFERENCIA BIBLIOGRÁFICA": ["BIBLIOGRAPHIC REFERENCE", "RÉFÉRENCE BIBLIOGRAPHIQUE"], "Edición consultada": ["Edition consulted", "Édition consultée"], "Copiar cita Chicago 18 del pasaje": ["Copy Chicago 18 passage citation", "Copier la référence du passage (Chicago 18)"], "Procedencia y referencia del texto": ["Text provenance and reference", "Provenance et référence du texte"], "Cobertura del índice": ["Index coverage", "Couverture de l’index"], "Continuar investigación:": ["Continue research:", "Poursuivre la recherche :"], "Notas críticas": ["Critical notes", "Notes critiques"], "Scriptorium y folios": ["Scriptorium and folios", "Scriptorium et folios"], "Apariencia del visor": ["Reader appearance", "Apparence du lecteur"], "Combinación": ["Colour scheme", "Palette"], "Original": ["Original", "Original"], "Negro · blanco": ["Black · white", "Noir · blanc"], "Marfil": ["Ivory", "Ivoire"], "Sepia": ["Sepia", "Sépia"], "Personalizado": ["Custom", "Personnalisé"], "Fondo": ["Background", "Fond"], "Texto": ["Text", "Texte"], "Tipografía": ["Typeface", "Police"], "Sistema": ["System", "Système"], "Cursiva": ["Italic", "Italique"], "Restablecer": ["Reset", "Réinitialiser"], "Se aplica únicamente a los textos del visor bilingüe.": ["Applies to the texts in the bilingual reader.", "S’applique aux textes du lecteur bilingue."], "Ir al contenido principal": ["Skip to main content", "Aller au contenu principal"], "Saltar al texto": ["Skip to the text", "Aller au texte"], "Cargando índice de pasajes…": ["Loading passage index…", "Chargement de l’index des passages…"], "Activar fondo claro": ["Use light background", "Activer le fond clair"], "Activar fondo oscuro": ["Use dark background", "Activer le fond sombre"], "☆ Guardar": ["☆ Save", "☆ Enregistrer"]});
 for(let n=1;n<=10;n++){const roman=["","I","II","III","IV","V","VI","VII","VIII","IX","X"][n];translations["Libro "+roman]=["Book "+roman,"Livre "+roman]}
 for(let n=1;n<=100;n++){translations["Capítulo "+n]=["Chapter "+n,"Chapitre "+n];translations["Sección "+n]=["Section "+n,"Section "+n]}
 Object.assign(translations,{"TEXTO Y TRADUCCIONES": ["TEXT AND TRANSLATIONS", "TEXTE ET TRADUCTIONS"], "Secciones de la biblioteca": ["Library sections", "Sections de la bibliothèque"], "Navegación del lector": ["Reader navigation", "Navigation du lecteur"], "Personalizar visor bilingüe": ["Customise bilingual reader", "Personnaliser le lecteur bilingue"], "Continuar investigación": ["Continue research", "Poursuivre la recherche"], "Color del fondo del texto": ["Text background colour", "Couleur de fond du texte"], "Color del texto": ["Text colour", "Couleur du texte"], "Palabras clave por libro, prefacio y capítulo": ["Keywords by book, preface and chapter", "Mots-clés par livre, préface et chapitre"], "Haz clic en una palabra latina o griega para consultar el diccionario.": ["Click a Latin or Greek word to consult the dictionary.", "Cliquez sur un mot latin ou grec pour consulter le dictionnaire."], "El buscador por locus funciona en este lector; el visor externo de Google Drive puede ignorar el salto automático a la página.": ["Passage references work in this reader; the external Google Drive viewer may ignore automatic page jumps.", "Les références fonctionnent dans ce lecteur ; le lecteur externe Google Drive peut ignorer le saut automatique à la page."], "Los 731 loci están localizados en las tres versiones. V297 reúne VII.7.1–3 y VII.7.4–5 en dos bloques; el lector conserva esos conjuntos y los identifica expresamente.": ["All 731 passages are located in the three versions. V297 groups VII.7.1–3 and VII.7.4–5 into two blocks; the reader preserves and identifies those groups.", "Les 731 passages sont localisés dans les trois versions. V297 réunit VII.7.1–3 et VII.7.4–5 en deux blocs ; le lecteur conserve et signale ces regroupements."], "El índice sigue los encabezados de libro y capítulo y los párrafos numerados de los DOCX del autor. No constituye una nueva colación de manuscritos. Las páginas del PDF solo se indican cuando se ha localizado una coincidencia textual inequívoca.": ["The index follows book and chapter headings and numbered paragraphs in the author’s DOCX files. It is not a new manuscript collation. PDF pages are shown only when an unambiguous textual match has been identified.", "L’index suit les titres des livres et chapitres et les paragraphes numérotés des fichiers DOCX de l’auteur. Il ne constitue pas une nouvelle collation des manuscrits. Les pages PDF ne sont indiquées que lorsqu’une correspondance textuelle certaine a été identifiée."]});
 const reverse=new Map();
 Object.entries(translations).forEach(([es,variants])=>{
   for(const key of [es,...variants])if(!reverse.has(key))reverse.set(key,es);
 });
 const preserved='script,style,template,code,pre,textarea,noscript,svg,[translate="no"],[lang="la"],[lang="grc"],[lang="gr"],[lang="el"],.codicum-stemma,.codex-siglum,[data-codex-siglum],.reader-transcript,.passage-text,.latin-name,.greek-name,.scholarly-text,#edition-citation,#edition-metadata';
 let current='es';
 try{const value=localStorage.getItem(KEY);if(codes.includes(value))current=value;}catch{}
 const originals=new WeakMap(),attributeOriginals=new WeakMap();
 function translate(root=document){
  const walker=document.createTreeWalker(root.body||root,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
   const parent=node.parentElement;
   if(!parent||(parent.closest(preserved)&&!parent.matches('.scholarly-panel > .eyebrow,.reader-dictionary-hint'))||parent.closest('.site-global-language'))continue;
   const text=node.nodeValue,trim=text.trim();
   if(!trim)continue;
   let source=originals.get(node);
   if(source===undefined){source=reverse.get(trim)||trim;originals.set(node,source);}
   const variants=translations[source];
   if(!variants)continue;
   const next=current==='es'?source:variants[current==='en'?0:1];
   if(trim!==next)node.nodeValue=text.slice(0,text.indexOf(trim))+next+text.slice(text.indexOf(trim)+trim.length);
  }
  for(const element of (root.querySelectorAll?root:document).querySelectorAll('[aria-label],[title],[placeholder]')){
   if(element.closest(preserved))continue;
   let saved=attributeOriginals.get(element);if(!saved){saved={};attributeOriginals.set(element,saved)}
   for(const name of ['aria-label','title','placeholder']){
    const raw=element.getAttribute(name);if(!raw)continue;
    const source=saved[name]||(saved[name]=reverse.get(raw)||raw),values=translations[source];
    if(values){const next=current==='es'?source:values[current==='en'?0:1];if(raw!==next)element.setAttribute(name,next)}
   }
  }
  document.documentElement.lang=current;
 }
 const style=document.createElement('style');
 style.textContent=
 '.site-global-language{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;white-space:nowrap;margin-left:auto;font:500 13px Arial,Helvetica,sans-serif;letter-spacing:0;position:relative;z-index:2}' +
 '.site-global-language select{appearance:auto;width:76px;max-width:76px;height:42px;min-height:42px;border:1px solid #68696c;border-radius:10px;background:#242629;color:#f3f1ec;padding:0 8px;cursor:pointer;font:500 15px Arial,Helvetica,sans-serif;color-scheme:dark;box-shadow:none}' +
 '.site-global-language select:focus-visible{outline:2px solid #c4a77c;outline-offset:3px}' +
 'html[data-theme="light"] .site-global-language select{background:#f8f5ee;color:#172b3c;border-color:#aa9a80;color-scheme:light}' +
 '.site-global-language-inline{display:flex;justify-content:flex-end;margin:0 0 15px;padding:3px 0;clear:both}' +
 '.site-global-language-inline .site-global-language{margin:0}' +
 '@media(max-width:850px){.header-inner>.site-global-language{margin-left:0;margin-block:5px 10px}}' +
 '@media(max-width:600px){.header-inner>.site-global-language{display:inline-flex;margin:15px 0 10px}}' +
 '@media print{.site-global-language,.site-global-language-inline{display:none!important}}';
 document.head.append(style);
 let readerObserver=null;
 function watchReader(){
  if(readerObserver||!document.getElementById('reading'))return;
  readerObserver=new MutationObserver(records=>{
   const roots=new Set(records.map(r=>r.target.nodeType===3?r.target.parentElement:r.target));
   for(const root of roots)translate(root);
  });
  for(const root of document.querySelectorAll('#form,#find-form,.passage-toolbar,#bilingual-appearance'))
   readerObserver.observe(root,{childList:true,characterData:true,subtree:true});
 }
 document.addEventListener('vitruvius:language-changed',event=>{
  const next=event.detail?.language;
  if(!['es','en','fr'].includes(next)||next===current)return;
  current=next;translate();
 });
 document.addEventListener('vitruvius:interface-mounted',event=>{
  if(event.detail?.root){translate(event.detail.root);readerObserver?.observe(event.detail.root,{childList:true,characterData:true,subtree:true})}
 });
 function dispatch(){
  try{localStorage.setItem(KEY,current);}catch{}
  translate();
  document.dispatchEvent(new CustomEvent('vitruvius:language-changed',{detail:{language:current}}));
 }
 function bindExisting(select){
  // Dedicated page control: delegate to its own localization engine, not a competing listener.
  if([...select.options].some(o=>o.value===current)&&select.value!==current){
    select.value=current;
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }
 }
 function init(){
  if(!document.body)return;
  watchReader();
  const existing=document.querySelector('#classic-ui-language,#atlas-language-select,.header-languages select,#ui-language');
  if(existing){bindExisting(existing);return;}
  if(document.querySelector('.site-global-language'))return;
  const label=document.createElement('label');
  label.className='site-global-language';
  label.title='Idioma de interfaz / Interface language';
  const sr=document.createElement('span');
  sr.className='sr-only';sr.textContent='Idioma de interfaz / Interface language';
  const select=document.createElement('select');
  select.setAttribute('aria-label','Idioma de interfaz / Interface language');
  for(const [value,name] of [['es','ES'],['en','EN'],['fr','FR']]){
   const option=document.createElement('option');
   option.value=value;option.textContent=name;select.append(option);
  }
  select.value=['es','en','fr'].includes(current)?current:'es';
  if(!['es','en','fr'].includes(current))current='es';
  label.append(sr,select);
  const controlHost=document.querySelector('.research-nav-controls,.header-actions,.header-controls,.classic-menu,.navtools');
  const header=document.querySelector('.header-inner');
  if(controlHost)controlHost.append(label);
  else if(header)header.append(label);
  else{
   const wrap=document.createElement('div');wrap.className='site-global-language-inline';wrap.append(label);
   const main=document.querySelector('main');
   (main||document.body).insertBefore(wrap,(main||document.body).firstChild);
  }
  select.addEventListener('change',()=>{current=select.value;dispatch();});
  translate();
  document.dispatchEvent(new CustomEvent('vitruvius:language-changed',{detail:{language:current}}));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
