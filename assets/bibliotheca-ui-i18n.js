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
})();
