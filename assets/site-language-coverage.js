/* Site-wide fixed UI glossary. Never a substitute for translated articles.
   Only translate known interface strings; protect Latin, Greek, bibliographic
   titles, citations, original passages and editable controls. */
(()=>{'use strict';
if(window.VDLSharedLocale)return;
window.VDLSharedLocale=true;
const terms={"Inicio":["Home","Accueil"],"Volver al inicio":["Back to home","Retour à l’accueil"],"Biblioteca":["Library","Bibliothèque"],"Biblioteca digital":["Digital library","Bibliothèque numérique"],"Obras":["Works","Œuvres"],"Obras clásicas":["Classical works","Œuvres classiques"],"Obras selectas":["Selected works","Œuvres choisies"],"Obras indexadas":["Indexed works","Œuvres indexées"],"Autores":["Authors","Auteurs"],"Autor":["Author","Auteur"],"Título":["Title","Titre"],"Idioma":["Language","Langue"],"Idiomas":["Languages","Langues"],"Idioma de la interfaz":["Interface language","Langue de l’interface"],"Método y fuentes":["Method and sources","Méthode et sources"],"Estado de indexación":["Indexing status","État de l’indexation"],"Lectura por capítulos":["Read by chapter","Lecture par chapitres"],"Lectura simplificada":["Simplified reading","Lecture simplifiée"],"Lectura académica":["Academic reading","Lecture scientifique"],"Visor simplificado":["Simplified reader","Visionneuse simplifiée"],"Visor académico":["Academic reader","Visionneuse scientifique"],"Texto original":["Original text","Texte original"],"Traducción":["Translation","Traduction"],"Traducción automática":["Automatic translation","Traduction automatique"],"Texto y traducción":["Text and translation","Texte et traduction"],"Texto latino":["Latin text","Texte latin"],"Texto griego":["Greek text","Texte grec"],"Latín":["Latin","Latin"],"Griego":["Greek","Grec"],"Castellano":["Spanish","Espagnol"],"Inglés":["English","Anglais"],"Francés":["French","Français"],"Original":["Original","Original"],"Todas las obras":["All works","Toutes les œuvres"],"Todos los autores":["All authors","Tous les auteurs"],"Todas las lenguas":["All languages","Toutes les langues"],"Todas las épocas":["All periods","Toutes les époques"],"Todos los libros":["All books","Tous les livres"],"Todos los libros indexados":["All indexed books","Tous les livres indexés"],"Búsqueda":["Search","Recherche"],"Buscador":["Search","Recherche"],"Buscar":["Search","Rechercher"],"Buscar por palabra":["Search by word","Rechercher par mot"],"Buscar palabra":["Search word","Rechercher un mot"],"Buscar en los textos":["Search the texts","Rechercher dans les textes"],"Buscar en todo el libro":["Search the entire book","Rechercher dans le livre entier"],"Buscar en la biblioteca":["Search the library","Rechercher dans la bibliothèque"],"Buscar en el catálogo":["Search the catalogue","Rechercher dans le catalogue"],"Filtros":["Filters","Filtres"],"Más filtros":["More filters","Plus de filtres"],"Filtrar":["Filter","Filtrer"],"Limpiar filtros":["Clear filters","Effacer les filtres"],"Ordenar":["Sort","Trier"],"Orden alfabético":["Alphabetical order","Ordre alphabétique"],"Orden cronológico":["Chronological order","Ordre chronologique"],"Catálogo":["Catalogue","Catalogue"],"Catálogo completo":["Full catalogue","Catalogue complet"],"Ver catálogo completo":["View full catalogue","Voir le catalogue complet"],"Abrir obra":["Open work","Ouvrir l’œuvre"],"Leer obra":["Read work","Lire l’œuvre"],"Leer original":["Read original","Lire l’original"],"Leer traducción":["Read translation","Lire la traduction"],"Abrir lector":["Open reader","Ouvrir le lecteur"],"Consultar":["Consult","Consulter"],"Ver más":["See more","Voir plus"],"Mostrar más":["Show more","Afficher plus"],"Mostrar":["Show","Afficher"],"Ocultar":["Hide","Masquer"],"Cerrar":["Close","Fermer"],"Anterior":["Previous","Précédent"],"Siguiente":["Next","Suivant"],"Volver":["Back","Retour"],"Regresar":["Go back","Revenir"],"Descargar":["Download","Télécharger"],"Descargar PDF":["Download PDF","Télécharger le PDF"],"Descargar Excel":["Download Excel","Télécharger Excel"],"Imprimir":["Print","Imprimer"],"Imprimir pasaje":["Print passage","Imprimer le passage"],"Compartir":["Share","Partager"],"Copiar enlace":["Copy link","Copier le lien"],"Copiar referencia":["Copy reference","Copier la référence"],"Cómo citar":["How to cite","Comment citer"],"Citar":["Cite","Citer"],"Ficha académica":["Academic record","Notice scientifique"],"Ficha bibliográfica":["Bibliographic record","Notice bibliographique"],"Ficha codicológica":["Codicological record","Notice codicologique"],"Fuentes":["Sources","Sources"],"Fuente":["Source","Source"],"Edición":["Edition","Édition"],"Ediciones":["Editions","Éditions"],"Manuscritos":["Manuscripts","Manuscrits"],"Códices":["Codices","Codices"],"Folio":["Folio","Folio"],"Página":["Page","Page"],"Capítulo":["Chapter","Chapitre"],"Libro":["Book","Livre"],"Locus":["Locus","Locus"],"Ir al locus":["Go to locus","Aller au locus"],"Pasaje":["Passage","Passage"],"Pasajes":["Passages","Passages"],"Pasaje anterior":["Previous passage","Passage précédent"],"Pasaje siguiente":["Next passage","Passage suivant"],"Buscar pasaje":["Find passage","Rechercher un passage"],"Buscar palabra o frase":["Search word or phrase","Rechercher un mot ou une expression"],"Término":["Term","Terme"],"Palabra":["Word","Mot"],"Palabra o frase":["Word or phrase","Mot ou expression"],"Resultados":["Results","Résultats"],"Resultados de búsqueda":["Search results","Résultats de recherche"],"Sin resultados":["No results","Aucun résultat"],"No hay resultados":["No results","Aucun résultat"],"Cargando":["Loading","Chargement"],"Cargando el catálogo":["Loading catalogue","Chargement du catalogue"],"Cargando los textos":["Loading texts","Chargement des textes"],"Verificando cobertura":["Checking coverage","Vérification de la couverture"],"En proceso":["In progress","En cours"],"Pendientes":["Pending","En attente"],"Versiones":["Versions","Versions"],"Traducciones":["Translations","Traductions"],"Originales locales":["Local originals","Originaux locaux"],"Originales externos":["External originals","Originaux externes"],"Cobertura":["Coverage","Couverture"],"Auditoría académica":["Academic audit","Audit scientifique"],"Aparato crítico":["Critical apparatus","Apparat critique"],"Aparato crítico comparativo":["Comparative critical apparatus","Apparat critique comparatif"],"Concordancias":["Concordances","Concordances"],"Bibliografía":["Bibliography","Bibliographie"],"Metodología":["Methodology","Méthodologie"],"Investigación":["Research","Recherche"],"Diccionario":["Dictionary","Dictionnaire"],"Etimología":["Etymology","Étymologie"],"Etimologías":["Etymologies","Étymologies"],"Notas":["Notes","Notes"],"Notas del pasaje":["Passage notes","Notes du passage"],"Comentarios":["Commentary","Commentaires"],"Acerca del proyecto":["About the project","À propos du projet"],"Contacto":["Contact","Contact"],"Ayuda":["Help","Aide"],"Opciones":["Options","Options"],"Configuración":["Settings","Paramètres"],"Color":["Colour","Couleur"],"Fondo":["Background","Fond"],"Noche":["Night","Nuit"],"Día":["Day","Jour"],"Claro":["Light","Clair"],"Oscuro":["Dark","Sombre"],"Ampliar texto":["Increase text size","Agrandir le texte"],"Reducir texto":["Decrease text size","Réduire le texte"],"Gris":["Grey","Gris"],"Sepia":["Sepia","Sépia"]};
const protectedNodes='script,style,noscript,template,textarea,code,pre,svg,iframe,blockquote,cite,dfn,abbr,[contenteditable],[data-no-ui-i18n],[data-original-language],[data-author],[data-editor],[data-title],[data-citation],[lang="la"],[lang="grc"],[lang="el"],[lang="he"],[lang="arc"],.reader-transcript,.scholarly-text,.passage-text,.latin,.greek,.source-text,.corpus-text';
const originals=new WeakMap(),translated=new WeakMap(),attrs=new WeakMap();
let pageDictionary={};
const normalize=value=>String(value||'').replace(/\s+/g,' ').trim();
function dictionary(){return {...terms,...pageDictionary}}

const getLang=()=>{let value=(document.documentElement.lang||'').slice(0,2);return ['es','en','fr'].includes(value)?value:'es'};
function canonical(value){
 const key=normalize(value);
 const active=dictionary();
 if(Object.hasOwn(active,key))return key;
 for(const [es,pair] of Object.entries(terms))if(pair.includes(key))return es;
 return null;
}
function apply(root=document.body){
 if(!root)return;
 const lang=getLang();
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 for(let node=walker.nextNode();node;node=walker.nextNode()){
  const parent=node.parentElement;
  if(!parent||parent.closest(protectedNodes))continue;
  const text=node.nodeValue,trim=text.trim();
  if(!trim)continue;
  let original=originals.get(node);
  if(original===undefined){
   const source=canonical(trim);
   if(!source)continue;
   original=source;originals.set(node,original);
  }
  const own=translated.get(node);
  if(own&&text.trim()!==own.trim()&&text.trim()!==original){
   // Another page-specific renderer replaced this node. Do not overwrite it.
   const source=canonical(trim);
   if(!source)continue;
   original=source;originals.set(node,original);
  }
  const target=lang==='es'?original:dictionary()[original]?.[lang==='en'?0:1];
  if(!target)continue;
  const output=text.replace(trim,target);
  if(output!==text)node.nodeValue=output;
  translated.set(node,output);
 }
 for(const element of root.querySelectorAll?.('[placeholder],[title],[aria-label]')||[]){
  if(element.closest(protectedNodes))continue;
  let data=attrs.get(element);
  if(!data){data={};attrs.set(element,data)}
  for(const attr of ['placeholder','title','aria-label']){
   const value=element.getAttribute(attr);if(!value)continue;
   let original=data[attr];
   if(original===undefined){original=canonical(value);if(!original)continue;data[attr]=original}
   const target=lang==='es'?original:dictionary()[original]?.[lang==='en'?0:1];
   if(target&&target!==value)element.setAttribute(attr,target);
  }
 }
}
let scheduled=false;
function schedule(){
 if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;apply()});
}
async function loadPageTranslations(){
 // Static, generated JSON. A missing file means the page still needs human or
 // automated translation; never claim it was fully translated.
 const name=(location.pathname.split('/').pop()||'index.html').replace(/[^a-zA-Z0-9_.-]/g,'');
 if(!/^[-a-zA-Z0-9_.]+\.html$/.test(name))return;
 const dir=(document.currentScript?.src||document.querySelector('script[src*="site-language-coverage.js"]')?.src||'').split('/assets/')[0];
 if(!dir)return;
 try{
  const response=await fetch(dir+'/data/i18n-pages/'+name+'.json',{cache:'no-cache'});
  if(!response.ok)return;
  const doc=await response.json();
  if(doc.schema!=='vdl-static-page-translations-v1'||doc.source!==name||!doc.translations)return;
  pageDictionary=doc.translations;
  apply();
 }catch{/* Missing or offline dictionaries must not damage source content. */}
}
function setup(){
 apply();
 void loadPageTranslations();
 new MutationObserver(records=>{
  if(records.some(r=>r.type==='childList'&&r.addedNodes.length))schedule();
 }).observe(document.body,{subtree:true,childList:true});
}
document.addEventListener('vitruvius:language-changed',schedule);
document.addEventListener('vitruvius:interface-mounted',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
