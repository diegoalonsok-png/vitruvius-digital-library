const LANGUAGE_KEY='vitruvius-ui-lang';
const i18n={
'La colección':['The collection','La collection'],
'Buscar en los textos':['Search the texts','Rechercher dans les textes'],
'Consulta comparada':['Compare editions','Comparer les éditions'],
'Historia del texto':['History of the text','Histoire du texte'],
'Estudios académicos':['Scholarly studies','Études universitaires'],
'Fuentes y método':['Sources and method','Sources et méthode'],
'Bibliografía histórica':['Historical bibliography','Bibliographie historique'],
'Método editorial':['Editorial method','Méthode éditoriale'],
'Biblioteca digital de Vitruvio':['Vitruvius Digital Library','Bibliothèque numérique de Vitruve'],
'Texto latino, traducciones':['Latin text, translations','Texte latin, traductions'],
'y tradición manuscrita.':['and manuscript tradition.','et tradition manuscrite.'],
'Ediciones de consulta':['Reference editions','Éditions de référence'],
'Buscar':['Search','Rechercher'],
'Lectura e investigación':['Reading and research','Lecture et recherche'],
'Buscar en':['Search within','Rechercher dans'],
'Coincidencia':['Match type','Type de correspondance'],
'Todas las palabras':['All words','Tous les mots'],
'Frase exacta':['Exact phrase','Expression exacte'],
'Consultar los textos':['Explore the texts','Consulter les textes'],
'Todas las versiones y traducciones':['All editions and translations','Toutes les éditions et traductions'],
'La colección en cifras':['The collection in figures','La collection en chiffres'],
'documentos en el catálogo':['catalogued documents','documents au catalogue'],
'ediciones de Diego Kurilo':['editions by Diego Kurilo','éditions de Diego Kurilo'],
'páginas con índice de búsqueda':['indexed searchable pages','pages indexées pour la recherche'],
'idiomas de las ediciones catalogadas':['languages represented in the catalogue','langues représentées au catalogue'],
'Catálogo razonado':['Scholarly catalogue','Catalogue raisonné'],
'Ediciones históricas':['Historical editions','Éditions historiques'],
'Manuscritos':['Manuscripts','Manuscrits'],
'Ver todo':['View all','Tout voir'],
'Leer PDF ↗':['Read PDF ↗','Lire le PDF ↗'],
'Ver ficha':['Record details','Voir la notice'],
'Comparar libro →':['Compare book →','Comparer le livre →'],
'Comparar locus →':['Compare passage →','Comparer le passage →'],
'Locus latino (libro.capítulo.sección)':['Latin locus (book.chapter.section)','Locus latin (livre.chapitre.section)'],
'Libro':['Book','Livre'],
'Capítulo':['Chapter','Chapitre'],
'Sección':['Section','Section'],
'Elegir libro':['Choose a book','Choisir un livre'],
'Elegir':['Choose','Choisir'],
'Lectura':['Reading','Lecture'],
'Comparar':['Compare','Comparer'],
'Página PDF':['PDF page','Page du PDF'],
'Página anterior':['Previous page','Page précédente'],
'Página siguiente':['Next page','Page suivante'],
'Consulta comparada':['Compare editions','Comparaison des éditions'],
'Fuentes, lectura':['Sources, reading','Sources, lecture'],
'Materiales de trabajo':['Research materials','Documents de recherche'],
'La vida de un texto':['The life of a text','La vie d’un texte'],
'Buscar también en internet':['Search the web as well','Rechercher aussi sur Internet'],
'Ampliar la misma consulta:':['Extend this search:','Étendre cette recherche :'],
'Probar:':['Try:','Essayer :'],
'Filtrar el catálogo…':['Filter catalogue…','Filtrer le catalogue…'],
'Estudios académicos sobre Vitruvio':['Scholarly studies on Vitruvius','Études universitaires sur Vitruve'],
'Política editorial y método de consulta':['Editorial policy and research method','Politique éditoriale et méthode de recherche'],
'Bibliografía histórica vitruviana':['Historical Vitruvian bibliography','Bibliographie historique vitruvienne'],
'Filtrar estudios':['Filter studies','Filtrer les études'],
'Autor':['Author','Auteur'],
'Editorial':['Publisher','Éditeur'],
'Año / País':['Year / Country','Année / pays'],
'Extensión':['Length','Nombre de pages'],
'Consultar fuente ↗':['Open source ↗','Consulter la source ↗'],
'Consultar registro editorial o institucional ↗':['View publisher/institutional record ↗','Consulter la notice éditoriale/institutionnelle ↗'],
'Norma editorial:':['Editorial standard:','Norme éditoriale :'],
'Transcripción, OCR y caracteres antiguos':['Transcription, OCR and historic characters','Transcription, OCR et caractères anciens'],
'Convenciones de referencia':['Citation conventions','Conventions de citation'],
'Frecuencias y concordancias':['Frequencies and concordances','Fréquences et concordances'],
'Comparación entre ediciones':['Comparison across editions','Comparaison des éditions'],
'Bibliografía y derechos':['Bibliography and rights','Bibliographie et droits']
};
let currentLanguage='es';
try{currentLanguage=localStorage.getItem(LANGUAGE_KEY)||'es'}catch{}
if(!['es','en','fr'].includes(currentLanguage))currentLanguage='es';
const originalNodes=new WeakMap();
function translateRoot(root=document){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let node;
 while((node=walker.nextNode())){
  const parent=node.parentElement;
  if(!parent||parent.closest('script,style,textarea,option,.catalog-list,.search-results,.compare-body,.reader-transcript,.study,.biblio-table'))continue;
  const key=node.nodeValue.trim();
  if(!key)continue;
  const original=originalNodes.get(node)||key;
  if(!originalNodes.has(node))originalNodes.set(node,original);
  if(i18n[original])node.nodeValue=currentLanguage==='es'?original:i18n[original][currentLanguage==='en'?0:1];
 }
 for(const el of root.querySelectorAll?.('[placeholder]')||[]){
  const original=el.dataset.originalPlaceholder||el.getAttribute('placeholder');
  if(!el.dataset.originalPlaceholder)el.dataset.originalPlaceholder=original;
  const value=i18n[original];
  if(value)el.setAttribute('placeholder',currentLanguage==='es'?original:value[currentLanguage==='en'?0:1]);
 }
 document.documentElement.lang=currentLanguage;
}
function setupLanguage(){
 for(const host of document.querySelectorAll('.header-languages')){
  host.textContent='';
  const label=document.createElement('label');label.className='sr-only';label.textContent='Interface language / Idioma / Langue';
  const select=document.createElement('select');select.setAttribute('aria-label','Interface language / Idioma / Langue');select.style.cssText='font:inherit;background:transparent;color:inherit;border:1px solid currentColor;border-radius:2px;padding:3px 5px;max-width:110px';
  for(const [value,name] of [['es','ES'],['en','EN'],['fr','FR']]){const option=document.createElement('option');option.value=value;option.textContent=name;select.append(option);}
  select.value=currentLanguage;
  select.addEventListener('change',()=>{currentLanguage=select.value;try{localStorage.setItem(LANGUAGE_KEY,currentLanguage)}catch{};document.querySelectorAll('.header-languages select').forEach(other=>other.value=currentLanguage);translateRoot()});
  host.append(label,select);
 }
 translateRoot();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setupLanguage);else setupLanguage();
