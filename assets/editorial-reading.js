/* Vitrina de lectura académica: manuscrito original y selección documental. */
(()=>{"use strict";
/* Navegación manual por folios auténticos; sin animaciones ni simulación de un libro. */
function activate(){
 const plate=document.querySelector(".folio-feature");if(!plate)return;
 const folder="images/CODEX_H_HARLEY_2767_ARCHIVO_MAESTRO_NO_BORRAR/";
 const folios=[
  {folio:"1r",file:"H_009_f-1r.jpg"},
  {folio:"1v",file:"H_010_f-1v.jpg"},
  {folio:"2r",file:"H_011_f-2r.jpg"},
  {folio:"2v",file:"H_012_f-2v.jpg"}
 ];
 const image=plate.querySelector("#folio-feature-image"),target=plate.querySelector("#folio-viewer-link"),
  number=plate.querySelector("#folio-number"),progress=plate.querySelector("#folio-progress"),
  previous=plate.querySelector("#folio-prev"),next=plate.querySelector("#folio-next");
 if(!image||!target||!number||!progress||!previous||!next)return;
 let active=0;
 function show(i){
  active=Math.min(folios.length-1,Math.max(0,i));
  const f=folios[active];
  image.src=folder+f.file;
  image.alt="British Library, Harley MS 2767, folio "+f.folio+". Facsímil del De architectura.";
  target.href="codex-h-folios-local.html?folio="+encodeURIComponent(f.folio);
  target.setAttribute("aria-label","Abrir folio "+f.folio+" en el visor");
  number.textContent="f. "+f.folio;
  progress.textContent=(active+1)+" / "+folios.length;
  previous.disabled=active===0;next.disabled=active===folios.length-1;
 }
 previous.addEventListener("click",()=>show(active-1));
 next.addEventListener("click",()=>show(active+1));
 show(0);
}

/* Small, independent translation layer. Uses the same site language selector. */
const readingI18N={
 es:{eyebrow:"BIBLIOTECA · CONSULTA DOCUMENTADA",title:"Lecturas documentadas",caption:"Fuentes identificadas; los registros no representan cambios editoriales en tiempo real.",one:"Proporciones del cuerpo humano en el libro III. Texto latino y traducción castellana del pasaje identificado.",two:"Testimonio carolingio de De architectura. Abrir los folios enfrentados en el visor de doble hoja.",three:"Traducción española del tratado de Vitruvio. Consulta del registro de la Biblioteca Virtual del Patrimonio Bibliográfico.",four:"Abrir una búsqueda documental del término y sus fuentes disponibles, sin presuponer un locus no cotejado.",read:"Leer y consultar →",source:"Consultar fuente externa ↗",search:"Buscar el término →",volume:"Facsímil manuscrito identificado; navegación manual por folios.",folio:"Consultar los folios ↗"},
 en:{eyebrow:"LIBRARY · VERIFIED READING",title:"Documented readings",caption:"Identified sources; these records do not represent live editorial updates.",one:"Proportions of the human body in Book III. Original Latin and Spanish translation for the identified passage.",two:"A Carolingian witness of De architectura. Open facing manuscript folios in the double-page viewer.",three:"Sixteenth-century Spanish translation of Vitruvius. Consult the Spanish heritage bibliography catalogue.",four:"Search the architectural term in available documentary sources without assuming an unverified locus.",read:"Read and examine →",source:"Open external source ↗",search:"Search the term →",volume:"Identified manuscript facsimile; manually browsable folios.",folio:"Consult the manuscript ↗"},
 fr:{eyebrow:"BIBLIOTHÈQUE · LECTURES DOCUMENTÉES",title:"Lectures documentées",caption:"Sources identifiées ; ces notices ne constituent pas des mises à jour en direct.",one:"Proportions du corps humain au livre III. Texte latin et traduction espagnole du passage identifié.",two:"Témoin carolingien du De architectura. Ouvrir les folios en regard dans le lecteur double.",three:"Traduction castillane du traité de Vitruve. Consulter la notice de la bibliothèque patrimoniale espagnole.",four:"Rechercher ce terme architectural dans les sources disponibles, sans imposer un locus non vérifié.",read:"Lire et consulter →",source:"Consulter la source ↗",search:"Rechercher le terme →",volume:"Fac-similé du manuscrit identifié ; navigation manuelle.",folio:"Consulter le manuscrit ↗"},
 it:{eyebrow:"BIBLIOTECA · LETTURE DOCUMENTATE",title:"Letture documentate",caption:"Fonti identificate; queste schede non sono aggiornamenti editoriali in tempo reale.",one:"Proporzioni del corpo umano nel libro III. Testo latino e traduzione spagnola del passo.",two:"Testimone carolingio del De architectura. Aprire i folii affiancati nel lettore doppio.",three:"Traduzione castigliana del trattato di Vitruvio. Consultare il catalogo patrimoniale spagnolo.",four:"Cercare il termine architettonico nelle fonti disponibili senza attribuire un locus non verificato.",read:"Leggi e consulta →",source:"Apri la fonte ↗",search:"Cerca il termine →",volume:"Facsimile del manoscritto identificato; navigazione manuale.",folio:"Consulta il manoscritto ↗"},
 de:{eyebrow:"BIBLIOTHEK · BELEGTE LEKTÜRE",title:"Dokumentierte Lektüren",caption:"Identifizierte Quellen; keine redaktionellen Aktualisierungen in Echtzeit.",one:"Proportionen des menschlichen Körpers in Buch III. Lateinischer Text und spanische Übersetzung.",two:"Karolingischer Textzeuge von De architectura. Gegenüberliegende Blätter im Doppelseitenleser.",three:"Spanische Übersetzung Vitruvs aus dem 16. Jahrhundert. Katalogeintrag der spanischen Kulturerbebibliothek.",four:"Fachbegriff in dokumentierten Quellen recherchieren, ohne ungesicherte Textstellen zuzuweisen.",read:"Lesen und prüfen →",source:"Externe Quelle öffnen ↗",search:"Begriff suchen →",volume:"Identifiziertes Handschriftenfaksimile; manuelle Blätternavigation.",folio:"Handschrift ansehen ↗"},
 pt:{eyebrow:"BIBLIOTECA · LEITURAS DOCUMENTADAS",title:"Leituras documentadas",caption:"Fontes identificadas; não são atualizações editoriais em tempo real.",one:"Proporções do corpo humano no livro III. Texto latino e tradução espanhola da passagem.",two:"Testemunho carolíngio de De architectura. Abrir fólios confrontados no leitor de página dupla.",three:"Tradução castelhana do tratado de Vitrúvio. Consultar o catálogo patrimonial espanhol.",four:"Pesquisar o termo arquitetônico nas fontes disponíveis, sem atribuir um locus não verificado.",read:"Ler e consultar →",source:"Consultar fonte externa ↗",search:"Pesquisar termo →",volume:"Fac-símile do manuscrito identificado; navegação manual.",folio:"Consultar manuscrito ↗"}
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