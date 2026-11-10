/* Aparato Crítico · interface localization, independent of textual editions.
 * Shared ES / EN / FR language selector remains the single source of state.
 * This module only translates interface labels/explanations, never scholarly
 * quotations, sigla, Latin/Greek passages, generated search records or folios.
 */
(()=>{
"use strict";
if(location.pathname.split("/").pop()!=="aparato-critico.html")return;
const LANGUAGE_KEY="vitruvius-ui-lang";
const entries=[
["Inicio","Home","Accueil"],
["Buscar en los textos","Search the texts","Rechercher dans les textes"],
["Lector bilingüe","Bilingual reader","Lecteur bilingue"],
["Principios editoriales","Editorial principles","Principes éditoriaux"],
["Bibliografía","Bibliography","Bibliographie"],
["Facsímiles manuscritos","Manuscript facsimiles","Fac-similés des manuscrits"],
["DE ARCHITECTURA · TEXTOS Y TRADICIÓN","DE ARCHITECTURA · TEXTS AND TRANSMISSION","DE ARCHITECTURA · TEXTES ET TRADITION"],
["Biblioteca de acceso abierto","Open-access library","Bibliothèque en libre accès"],
["INVESTIGACIÓN TEXTUAL · DIEGO KURILO","TEXTUAL RESEARCH · DIEGO KURILO","RECHERCHE TEXTUELLE · DIEGO KURILO"],
["Índice textual y notas editoriales","Textual index and editorial notes","Index textuel et notes éditoriales"],
["Consulta por libro, capítulo, sección (","Search by book, chapter, section (","Rechercher par livre, chapitre, section ("],
[") o palabra del texto latino y sus traducciones. Los resultados identifican las ediciones indexadas y permiten ir al texto completo y a sus fuentes.",") or word in the Latin text and its translations. Results identify the indexed editions and provide access to the full text and its sources.",") ou mot du texte latin et de ses traductions. Les résultats identifient les éditions indexées et donnent accès au texte intégral et à ses sources."],
["Niveles visibles por registro:","Documentary evidence levels:","Niveaux de preuve documentaire :"],
["A = nota extraída del DOCX con locus explícito (no implica colación manuscrita); B = locus candidato pendiente de cotejo; C = nota sin locus comprobado. Los bloques procedentes de PDF se etiquetan aparte.","A = note extracted from DOCX with an explicit locus (not manuscript collation); B = proposed locus awaiting verification; C = note without a verified locus. PDF-derived blocks are labelled separately.","A = note extraite du DOCX avec locus explicite (sans collation manuscrite) ; B = locus proposé à vérifier ; C = note sans locus vérifié. Les blocs issus de PDF sont signalés séparément."],
["Ninguno de estos niveles acredita por sí mismo una variante autóptica H/G.","None of these levels independently establishes an autoptically verified H/G manuscript variant.","Aucun de ces niveaux ne démontre à lui seul une variante H/G vérifiée par examen direct."],
["Consultar","Consult","Consulter"],
["Registro ecdótico documentado","Documented textual-critical record","Registre ecdotique documenté"],
["y el ejemplo","and the example","et l’exemple"],
["folio H / texto / traducción","folio H / text / translation","folio H / texte / traduction"],
["Estado editorial.","Editorial status.","État éditorial."],
["Esta herramienta consulta pasajes del índice textual de las ediciones V514, V554 y V297. También permite buscar en el OCR de Krohn (1912), identificado separadamente y sujeto a errores de reconocimiento.","This tool searches indexed passages from editions V514, V554 and V297. It also searches Krohn's (1912) OCR, identified separately and subject to recognition errors.","Cet outil interroge les passages indexés des éditions V514, V554 et V297. Il permet aussi de chercher dans l’OCR de Krohn (1912), signalé séparément et susceptible d’erreurs de reconnaissance."],
["No constituye una colación manuscrita ni un aparato de variantes exhaustivo.","This is neither a manuscript collation nor an exhaustive apparatus of variants.","Il ne s’agit ni d’une collation des manuscrits ni d’un apparat exhaustif des variantes."],
["Las notas y lecciones divergentes deben cotejarse con el aparato impreso de cada edición. No se generan lecturas atribuidas a códices automáticamente.","Notes and divergent readings must be checked against the printed apparatus of each edition. No readings are automatically attributed to manuscript codices.","Les notes et leçons divergentes doivent être confrontées à l’apparat imprimé de chaque édition. Aucune leçon n’est attribuée automatiquement aux manuscrits."],
["Concordancia integral · textos y aparato de las tres ediciones","Complete concordance · texts and apparatus of all three editions","Concordance intégrale · textes et apparat des trois éditions"],
["Busca","Search","Rechercher"],
["una palabra, una frase o un locus completo","a word, a phrase, or a complete locus","un mot, une expression ou un locus complet"],
["(por ejemplo,","(for example,","(par exemple,"],
[") en el texto latino, las traducciones, las explicaciones y las notas existentes de los libros de Diego Kurilo. Las referencias por locus recuperan únicamente las notas explícitamente ancladas; una asociación candidata no equivale a comentario confirmado. También se aceptan",") in the Latin text, translations, explanations and notes of Diego Kurilo's editions. Locus queries retrieve only explicitly anchored notes; a proposed association is not a confirmed commentary. The forms",") dans le texte latin, les traductions, les explications et les notes des éditions de Diego Kurilo. Les recherches par locus ne récupèrent que les notes explicitement rattachées ; une association proposée n’est pas un commentaire confirmé. Les formes"],
["para consultar los prefacios, sin cambiar la grafía del texto latino. Cada coincidencia permite desplegar el párrafo íntegro y consultar su edición. Los resultados se distinguen por edición y naturaleza de la fuente; el inglés V297 tiene menos material crítico que las versiones castellana y francesa.","are also accepted when searching for prefaces without changing the Latin spelling. Each match can expand the complete paragraph and open its edition. Results identify the edition and source type; the English V297 contains less critical material than the Spanish and French editions.","sont également acceptées pour consulter les préfaces, sans modifier la graphie latine. Chaque résultat permet de déplier le paragraphe intégral et d’ouvrir son édition. Les résultats distinguent éditions et types de sources ; la version anglaise V297 contient moins de matériel critique que les versions espagnole et française."],
["Palabra, frase o locus","Word, phrase or locus","Mot, expression ou locus"],
["Edición","Edition","Édition"],
["Las tres ediciones","All three editions","Les trois éditions"],
["V514 · Castellano","V514 · Spanish","V514 · Espagnol"],
["V554 · Francés","V554 · French","V554 · Français"],
["V297 · Inglés","V297 · English","V297 · Anglais"],
["Fuente","Source","Source"],
["Latín, traducciones y aparato","Latin, translations and apparatus","Latin, traductions et apparat"],
["Solo texto latino y traducciones","Latin text and translations only","Texte latin et traductions uniquement"],
["Solo texto latino","Latin text only","Texte latin uniquement"],
["Solo traducciones","Translations only","Traductions uniquement"],
["Solo explicaciones, aparato y notas","Explanations, apparatus and notes only","Explications, apparat et notes uniquement"],
["Incluir coincidencias dentro de palabras (búsqueda parcial)","Include matches inside words (partial search)","Inclure les correspondances à l’intérieur des mots (recherche partielle)"],
["Buscar en los libros","Search the editions","Rechercher dans les éditions"],
["Los índices se consultan al realizar una búsqueda; los libros originales permanecen intactos.","Indexes are loaded on demand; original books remain unchanged.","Les index sont consultés à la demande ; les ouvrages originaux restent inchangés."],
["Mostrar más pasajes","Show more passages","Afficher plus de passages"],
["Alcance:","Scope:","Portée :"],
["son recuentos de las fuentes textuales digitalizadas. Las notas DOCX con locus explícito pueden mostrarse junto al pasaje, pero una coincidencia terminológica en otra nota o comentario no constituye una relación exegética comprobada. El material extraído de PDF puede contener errores de extracción.","counts come from digitized textual sources. DOCX notes with explicit loci may appear beside passages, but a terminological match in another note or commentary is not a verified exegetical relation. Material extracted from PDFs may contain extraction errors.","ces décomptes proviennent des sources textuelles numérisées. Les notes DOCX avec locus explicite peuvent figurer près du passage, mais une correspondance terminologique dans une autre note ne prouve pas une relation exégétique. Le texte extrait des PDF peut contenir des erreurs."],
["Locus, lema latino o expresión","Locus, Latin lemma or phrase","Locus, lemme latin ou expression"],
["Las tres ediciones indexadas","All three indexed editions","Les trois éditions indexées"],
["V514 · Latín / Castellano","V514 · Latin / Spanish","V514 · Latin / espagnol"],
["V554 · Latín / Francés","V554 · Latin / French","V554 · Latin / français"],
["V297 · Latín / Inglés","V297 · Latin / English","V297 · Latin / anglais"],
["Krohn 1912 · OCR histórico","Krohn 1912 · historical OCR","Krohn 1912 · OCR historique"],
["Latín y traducciones","Latin and translations","Latin et traductions"],
["Solo latín","Latin only","Latin uniquement"],
["Consultar →","Search →","Consulter →"],
["Probar:","Try:","Essayer :"],
["II.pr.1 · prefacio","II.pr.1 · preface","II.pr.1 · préface"],
["prefacio I del libro II","preface I of book II","préface I du livre II"],
["Escribe un locus o término para consultar el índice.","Enter a locus or term to search the index.","Saisissez un locus ou un terme pour interroger l’index."],
["Catálogo integral del aparato crítico de los libros","Complete catalogue of the books' critical apparatus","Catalogue intégral de l’apparat critique des ouvrages"],
["Buscador del contenido crítico de las ediciones V514, V554 y V297: apartados de","Search critical content in editions V514, V554 and V297, including sections on","Rechercher dans le contenu critique des éditions V514, V554 et V297, notamment les rubriques"],
["aparato crítico comparativo, notas ecdóticas, comentarios críticos, notas técnicas y notas al pie","comparative apparatus, textual-critical notes, critical commentary, technical notes and footnotes","apparat critique comparatif, notes ecdotiques, commentaires critiques, notes techniques et notes de bas de page"],
[". Incluye material ubicado en el cuerpo y los apéndices de los PDF, además del índice de notas DOCX existente. Los encabezados se reconocen automáticamente por página; una página puede contener varios apartados y algunos continúan en la página siguiente.",". It includes material from the PDF body and appendices, as well as the existing DOCX note index. Headings are detected by page; one page may contain multiple sections, some continuing on the next page.",". Le catalogue comprend le corps et les annexes des PDF ainsi que l’index existant des notes DOCX. Les titres sont repérés par page ; une page peut contenir plusieurs rubriques, dont certaines se poursuivent sur la page suivante."],
["Precisión académica:","Scholarly accuracy:","Précision académique :"],
["este catálogo localiza material ya escrito en los libros de Diego Kurilo. No es una collatio de manuscritos independiente ni acredita cada variante. La referencia al locus solo es orientativa si no se verificó su anclaje.","this catalogue locates material already written in Diego Kurilo's books. It is not an independent manuscript collation, nor does it establish every variant. Locus references are indicative unless their anchors have been verified.","ce catalogue localise du contenu déjà rédigé dans les ouvrages de Diego Kurilo. Il ne constitue pas une collation indépendante des manuscrits et ne certifie pas chaque variante. Les références aux loci restent indicatives sans ancrage vérifié."],
["Buscar dentro del aparato completo, sin restringirse a los 811 registros de notas","Search the entire apparatus, not only the 811 note records","Rechercher dans tout l’apparat, sans se limiter aux 811 notices de notes"],
["Tres libros","Three books","Trois livres"],
["Tipo","Type","Type"],
["Todos los tipos","All types","Tous les types"],
["Crítica / ecdótica / filología","Criticism / textual scholarship / philology","Critique / ecdotique / philologie"],
["Comparativa","Comparative","Comparatif"],
["Técnica / terminología","Technical / terminology","Technique / terminologie"],
["Comentario editorial","Editorial commentary","Commentaire éditorial"],
["Notas al pie (DOCX)","Footnotes (DOCX)","Notes de bas de page (DOCX)"],
["Cargar catálogo completo","Load full catalogue","Charger le catalogue complet"],
["El catálogo se carga cuando se abre esta sección.","The catalogue loads when you open this section.","Le catalogue se charge à l’ouverture de cette section."],
["Buscador preparado.","Search ready.","Recherche prête."],
["Mostrar más","Show more","Afficher plus"],
["Consultar las notas del autor","Consult the author's notes","Consulter les notes de l’auteur"],
["Las 811 notas originales están integradas automáticamente. También puedes cargar una versión local actualizada del índice. Se procesa localmente en el navegador y conserva edición, párrafo y estado de cotejo. Las notas sin locus verificado aparecen como tales, nunca como variantes comprobadas.","The 811 original notes are integrated automatically. You can also load an updated local copy of the index. It is processed in your browser, retaining edition, paragraph and verification status. Notes without a verified locus are never presented as established variants.","Les 811 notes originales sont intégrées automatiquement. Vous pouvez aussi charger une version locale actualisée de l’index. Elle est traitée dans le navigateur et conserve l’édition, le paragraphe et l’état de vérification. Les notes sans locus vérifié ne sont jamais présentées comme des variantes établies."],
["Índice de aparato crítico (JSON)","Critical apparatus index (JSON)","Index de l’apparat critique (JSON)"],
["Se cargan automáticamente las 811 notas del repositorio; la importación local es opcional.","The 811 repository notes load automatically; local import is optional.","Les 811 notes du dépôt se chargent automatiquement ; l’importation locale est facultative."],
["Notas editoriales de las ediciones","Editorial notes from the editions","Notes éditoriales des éditions"],
["Busca un locus, palabra o referencia para consultar las 811 notas de las tres ediciones.","Search by locus, word or reference to consult the 811 notes across the three editions.","Recherchez un locus, un mot ou une référence parmi les 811 notes des trois éditions."],
["Pasajes y traducciones de contexto","Passages and contextual translations","Passages et traductions contextuelles"],
["Mostrar más resultados","Show more results","Afficher plus de résultats"],
["Apparatus criticus y Conspectus","Apparatus criticus and Conspectus","Apparatus criticus et Conspectus"],
["Esta página presenta concordancias y notas editoriales, no variantes manuscritas certificadas. Consulta el","This page contains concordances and editorial notes, not certified manuscript variants. Consult the","Cette page présente des concordances et des notes éditoriales, non des variantes manuscrites certifiées. Consultez le"],
["para identificar los testigos y el","to identify witnesses and the","pour identifier les témoins et le"],
["registro de verificación del Apparatus criticus","Apparatus criticus verification register","registre de vérification de l’Apparatus criticus"],
["para conocer los requisitos antes de publicar una variante.","for the requirements before publishing a variant.","pour connaître les critères avant la publication d’une variante."],
["Krohn y Budé","Krohn and Budé","Krohn et Budé"],
["La edición de","The edition by","L’édition de"],
["se consulta como OCR histórico sin cotejo filológico automático; cada resultado remite a la página del facsímil. Para","is consulted as historical OCR without automated philological collation; each result links to a facsimile page. For","est consultée en OCR historique sans collation philologique automatique ; chaque résultat renvoie à la page du fac-similé. Pour"],
[", consulta las referencias editoriales y volúmenes originales: el contenido protegido por derechos no se reproduce ni se presenta como corpus libremente indexado. El aparato crítico de las ediciones de Kurilo debe extraerse por separado de los DOCX completos para buscar sus notas, variantes y siglas.",", consult the editorial references and original volumes: copyrighted content is neither reproduced nor claimed to be freely indexed. The critical apparatus of Kurilo's editions must be extracted separately from the complete DOCX files to search its notes, variants and sigla.",", consultez les références éditoriales et les volumes originaux : le contenu protégé n’est ni reproduit ni présenté comme librement indexé. L’apparat critique des éditions de Kurilo doit être extrait séparément des DOCX complets pour interroger ses notes, variantes et sigles."],
["Fuentes y convenciones","Sources and conventions","Sources et conventions"],
["Los resultados proceden de los DOCX de las ediciones de Diego Kurilo y conservan la referencia canónica. Para diferenciar decisiones de establecimiento del texto, conjeturas, testimonios manuscritos y comentarios, consulta el PDF original y los","Results come from the DOCX files of Diego Kurilo's editions and retain canonical references. To distinguish editorial decisions, conjectures, manuscript evidence and commentary, consult the original PDF and the","Les résultats proviennent des DOCX des éditions de Diego Kurilo et conservent les références canoniques. Pour distinguer les décisions éditoriales, les conjectures, les témoignages manuscrits et les commentaires, consultez le PDF original et les"],
["principios editoriales","editorial principles","principes éditoriaux"],
[". La correspondencia de páginas PDF solo se muestra cuando consta en el índice.",". PDF page correspondences appear only when documented in the index.",". Les correspondances de pages PDF ne sont affichées que lorsqu’elles figurent dans l’index."],
["Continuar investigación:","Continue your research:","Poursuivre la recherche :"],
["Lector por locus","Passage reader","Lecteur par locus"],
["Manuscritos","Manuscripts","Manuscrits"],
["Índices","Indices","Index"],
["Estudios y consulta textual.","Studies and textual research.","Études et recherche textuelle."],
["Proyecto y edición de Diego Kurilo","Project and editions by Diego Kurilo","Projet et éditions de Diego Kurilo"],
["Buscar en los libros","Search the books","Rechercher dans les livres"],
["Locus, lema latino o expresión","Locus, Latin lemma or expression","Locus, lemme latin ou expression"],
["Índice de aparato crítico (JSON)","Critical apparatus index (JSON)","Index de l’apparat critique (JSON)"]
];
const en=new Map(entries.map(([es,en])=>[es,en])),fr=new Map(entries.map(([es,,fr])=>[es,fr]));
const initial=new WeakMap();
const attributes=new WeakMap();
const rootsSelector="main.critical-wrap,header.site-header nav,footer,.institution-bar";
const excludes="script,style,template,code,pre,textarea,svg,[lang=la],[lang=grc],[lang=el],[lang=gr],.critical-result,.critical-parallel-edition .critical-original-text,#critical-unified-results,#critical-result-list,#critical-note-results,#critical-note-list,#critical-results,#apparatus-catalog-results";
let lang="es";
try{const saved=localStorage.getItem(LANGUAGE_KEY);if(["es","en","fr"].includes(saved))lang=saved;}catch{}
function translateText(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let text;
 while((text=walker.nextNode())){
  const parent=text.parentElement;
  if(!parent||parent.closest(excludes)||parent.closest(".site-global-language"))continue;
  const raw=text.nodeValue;
  if(!raw.trim())continue;
  let base=initial.get(text);
  if(base===undefined){base=raw.trim();initial.set(text,base);}
  const value=lang==="en"?en.get(base):lang==="fr"?fr.get(base):base;
  if(value===undefined)continue;
  const start=raw.match(/^\s*/)?.[0]||"",end=raw.match(/\s*$/)?.[0]||"";
  const next=start+value+end;
  if(raw!==next)text.nodeValue=next;
 }
}
const placeholders={
 "III.1.2 · symmetria · architecti est scientia":["III.1.2 · symmetria · architecti est scientia","III.1.2 · symmetria · architecti est scientia"],
 "prefacion · prefación II · II.prefacion.1 · symmetria":["prefacion · prefación II · II.prefacion.1 · symmetria","prefacion · prefación II · II.prefacion.1 · symmetria"]
};
function translateAttrs(){
 for(const el of document.querySelectorAll("header.site-header .theme-switch, main.critical-wrap [placeholder],main.critical-wrap [aria-label],main.critical-wrap [title]")){
  let original=attributes.get(el);
  if(!original){original={};attributes.set(el,original);}
  for(const attr of ["placeholder","aria-label","title"]){
   const current=el.getAttribute(attr);if(!current)continue;
   if(!original[attr])original[attr]=current;
   const key=original[attr];
   let value=lang==="en"?en.get(key):lang==="fr"?fr.get(key):key;
   if(attr==="placeholder"&&!value&&placeholders[key])value=placeholders[key][lang==="en"?0:1];
   if(value!==undefined&&current!==value)el.setAttribute(attr,value);
  }
 }
 const button=document.querySelector("header.site-header .theme-switch");
 if(button){
  const dark=document.documentElement.dataset.theme==="dark";
  const label=dark?
   (lang==="en"?"Switch to light appearance":lang==="fr"?"Activer le mode clair":"Activar fondo claro"):
   (lang==="en"?"Switch to dark appearance":lang==="fr"?"Activer le mode sombre":"Activar fondo oscuro");
  button.setAttribute("aria-label",label);
  button.title=label;
 }
}
function refresh(){
 document.querySelectorAll(rootsSelector).forEach(translateText);
 translateAttrs();
 document.documentElement.lang=lang;
}
document.addEventListener("vitruvius:language-changed",event=>{
 const value=event.detail?.language;
 if(!["es","en","fr"].includes(value))return;
 lang=value;refresh();
});
function init(){
 refresh();
 const controls=document.querySelector("header.site-header .critical-header-tools");
 if(controls){
  const label=controls.querySelector(".site-global-language");
  if(label){
   label.style.marginLeft="0";
   label.setAttribute("role","group");
   const select=label.querySelector("select");
   if(select)select.setAttribute("aria-label","ES / EN / FR · interface language");
  }
 }
 const statuses=["critical-unified-status","critical-status","critical-note-status","critical-notes-status","apparatus-catalog-status","apparatus-catalog-totals"];
 for(const id of statuses){
  const element=document.getElementById(id);
  if(!element)continue;
  const observer=new MutationObserver(()=>translateText(element));
  observer.observe(element,{childList:true,characterData:true,subtree:true});
 }
 const observer=new MutationObserver(()=>translateAttrs());
 observer.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
