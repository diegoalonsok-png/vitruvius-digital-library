/* Rotación editorial del libro tipográfico, solo en la vitrina de lectura.
   No afecta búsquedas, lectores o visores de folios. */
(()=>{"use strict";
function activate(){
 const book=document.querySelector(".editorial-reading .volume-turn");if(!book)return;
 let startX=0,rotation=-20,dragging=false,changed=false,dragId=null;
 const rotate=angle=>{rotation=angle;book.style.animation="none";book.style.transform="rotateX(-6deg) rotateY("+rotation+"deg)";changed=true};
 book.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&e.button!==0)return;
  dragging=true;dragId=e.pointerId;startX=e.clientX;
  book.setPointerCapture?.(e.pointerId);
  const transform=window.getComputedStyle(book).transform;
  // Start from a stable, known orientation rather than inventing a reading/folio mapping.
  if(!changed)rotate(-20);
  book.style.cursor="grabbing";
 });
 book.addEventListener("pointermove",e=>{
  if(!dragging||e.pointerId!==dragId)return;
  rotate(rotation+(e.clientX-startX)*.7);startX=e.clientX
 });
 const release=e=>{if(dragging&&(e.pointerId===dragId||e.type==="lostpointercapture")){dragging=false;dragId=null;book.style.cursor=""}};
 book.addEventListener("pointerup",release);
 book.addEventListener("pointercancel",release);
 book.addEventListener("lostpointercapture",release);
 book.addEventListener("keydown",e=>{
  if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();rotate(rotation+(e.key==="ArrowLeft"?-30:30))}
  if(e.key==="Enter"||e.key===" "){e.preventDefault();rotate(rotation+45)}
  if(e.key==="Escape"){e.preventDefault();changed=false;book.style.animation="";book.style.transform=""}
 });
}

/* Small, independent translation layer. Uses the same site language selector. */
const readingI18N={
 es:{eyebrow:"BIBLIOTECA · CONSULTA DOCUMENTADA",title:"Lecturas documentadas",caption:"Fuentes identificadas; los registros no representan cambios editoriales en tiempo real.",one:"Proporciones del cuerpo humano en el libro III. Texto latino y traducción castellana del pasaje identificado.",two:"Testimonio carolingio de De architectura. Abrir los folios enfrentados en el visor de doble hoja.",three:"Traducción española del tratado de Vitruvio. Consulta del registro de la Biblioteca Virtual del Patrimonio Bibliográfico.",four:"Abrir una búsqueda documental del término y sus fuentes disponibles, sin presuponer un locus no cotejado.",read:"Leer y consultar →",source:"Consultar fuente externa ↗",search:"Buscar el término →",volume:"Recreación gráfica; no reproduce la encuadernación histórica.",folio:"Consultar el manuscrito ↗"},
 en:{eyebrow:"LIBRARY · VERIFIED READING",title:"Documented readings",caption:"Identified sources; these records do not represent live editorial updates.",one:"Proportions of the human body in Book III. Original Latin and Spanish translation for the identified passage.",two:"A Carolingian witness of De architectura. Open facing manuscript folios in the double-page viewer.",three:"Sixteenth-century Spanish translation of Vitruvius. Consult the Spanish heritage bibliography catalogue.",four:"Search the architectural term in available documentary sources without assuming an unverified locus.",read:"Read and examine →",source:"Open external source ↗",search:"Search the term →",volume:"Typographic recreation; not an image of the historical binding.",folio:"Consult the manuscript ↗"},
 fr:{eyebrow:"BIBLIOTHÈQUE · LECTURES DOCUMENTÉES",title:"Lectures documentées",caption:"Sources identifiées ; ces notices ne constituent pas des mises à jour en direct.",one:"Proportions du corps humain au livre III. Texte latin et traduction espagnole du passage identifié.",two:"Témoin carolingien du De architectura. Ouvrir les folios en regard dans le lecteur double.",three:"Traduction castillane du traité de Vitruve. Consulter la notice de la bibliothèque patrimoniale espagnole.",four:"Rechercher ce terme architectural dans les sources disponibles, sans imposer un locus non vérifié.",read:"Lire et consulter →",source:"Consulter la source ↗",search:"Rechercher le terme →",volume:"Recréation graphique ; ce n'est pas la reliure historique.",folio:"Consulter le manuscrit ↗"},
 it:{eyebrow:"BIBLIOTECA · LETTURE DOCUMENTATE",title:"Letture documentate",caption:"Fonti identificate; queste schede non sono aggiornamenti editoriali in tempo reale.",one:"Proporzioni del corpo umano nel libro III. Testo latino e traduzione spagnola del passo.",two:"Testimone carolingio del De architectura. Aprire i folii affiancati nel lettore doppio.",three:"Traduzione castigliana del trattato di Vitruvio. Consultare il catalogo patrimoniale spagnolo.",four:"Cercare il termine architettonico nelle fonti disponibili senza attribuire un locus non verificato.",read:"Leggi e consulta →",source:"Apri la fonte ↗",search:"Cerca il termine →",volume:"Ricostruzione grafica, non della legatura storica.",folio:"Consulta il manoscritto ↗"},
 de:{eyebrow:"BIBLIOTHEK · BELEGTE LEKTÜRE",title:"Dokumentierte Lektüren",caption:"Identifizierte Quellen; keine redaktionellen Aktualisierungen in Echtzeit.",one:"Proportionen des menschlichen Körpers in Buch III. Lateinischer Text und spanische Übersetzung.",two:"Karolingischer Textzeuge von De architectura. Gegenüberliegende Blätter im Doppelseitenleser.",three:"Spanische Übersetzung Vitruvs aus dem 16. Jahrhundert. Katalogeintrag der spanischen Kulturerbebibliothek.",four:"Fachbegriff in dokumentierten Quellen recherchieren, ohne ungesicherte Textstellen zuzuweisen.",read:"Lesen und prüfen →",source:"Externe Quelle öffnen ↗",search:"Begriff suchen →",volume:"Grafische Neugestaltung, kein historischer Bucheinband.",folio:"Handschrift ansehen ↗"},
 pt:{eyebrow:"BIBLIOTECA · LEITURAS DOCUMENTADAS",title:"Leituras documentadas",caption:"Fontes identificadas; não são atualizações editoriais em tempo real.",one:"Proporções do corpo humano no livro III. Texto latino e tradução espanhola da passagem.",two:"Testemunho carolíngio de De architectura. Abrir fólios confrontados no leitor de página dupla.",three:"Tradução castelhana do tratado de Vitrúvio. Consultar o catálogo patrimonial espanhol.",four:"Pesquisar o termo arquitetônico nas fontes disponíveis, sem atribuir um locus não verificado.",read:"Ler e consultar →",source:"Consultar fonte externa ↗",search:"Pesquisar termo →",volume:"Recriação gráfica; não reproduz a encadernação histórica.",folio:"Consultar manuscrito ↗"}
};
function readLanguage(){
 const lang=document.documentElement.lang?.slice(0,2).toLowerCase()||"";
 const selected=document.querySelector(".site-global-language select, .header-languages select");
 const selectedLang=selected?.value?.slice(0,2)?.toLowerCase();
 let remembered="";
 try{remembered=(localStorage.getItem("vitruvius-ui-lang")||"").slice(0,2).toLowerCase()}catch{}
 return readingI18N[selectedLang]?selectedLang:readingI18N[lang]?lang:readingI18N[remembered]?remembered:"es";
}
function translateReading(lang){
 const dict=readingI18N[lang]||readingI18N.es;
 document.querySelectorAll(".editorial-reading [data-er-key]").forEach(n=>{const t=dict[n.dataset.erKey];if(t)n.textContent=t});
}
function installTranslations(){
 translateReading(readLanguage());
 document.addEventListener("change",e=>{
  if(e.target.matches(".site-global-language select, .header-languages select, #classic-ui-language, #atlas-language-select")){
   translateReading(e.target.value.slice(0,2).toLowerCase())
  }
 });
 // Changes from the general language component may update html[lang] programmatically.
 const observer=new MutationObserver(()=>translateReading(readLanguage()));
 observer.observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{activate();installTranslations()},{once:true});else {activate();installTranslations()}

})();