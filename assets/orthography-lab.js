/* Orthographic research laboratory. Unicode normalization is NOT
   morphological lemmatization, historical transliteration or proof of identity. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const source=$("orth-source"),button=$("orth-run");
if(!source||!button)return;
const languages=["es","en","fr"];
let language=languages.includes(document.documentElement.lang)?document.documentElement.lang:"es";
try{const stored=localStorage.getItem("vitruvius-ui-lang");if(languages.includes(stored))language=stored}catch{}
const labels={
 en:{
 "Laboratorio de escrituras y variantes textuales":"Writing Systems and Textual Variants Laboratory",
 "Compare formas griegas politónicas, formas sin diacríticos y grafías latinas mediante operaciones explícitas. El laboratorio no altera los textos originales, no convierte ático en koiné y no certifica equivalencias lingüísticas.":"Compare polytonic Greek, forms without diacritics and Latin spellings using explicit transformations. This laboratory does not alter source texts, convert Attic Greek into Koine, or certify linguistic equivalences.",
 "Palabra o frase documentada":"Documented word or phrase",
 "Comparar grafías":"Compare spellings",
 "Introduzca un término y seleccione «Comparar grafías».":"Enter a term and select “Compare spellings”.",
 "Protocolo editorial":"Editorial protocol",
 "Transcripción diplomática:":"Diplomatic transcription:",
 " conservar lo que figura en el testimonio o edición fuente, incluidos signos, abreviaturas y lecturas dudosas. ":" preserve the reading of the source witness or edition, including marks, abbreviations and uncertain readings. ",
 "Normalización Unicode:":"Unicode normalization:",
 " agrupar grafías técnicamente equivalentes para la recuperación. ":" group technically equivalent spellings for retrieval. ",
 "Lematización:":"Lemmatization:",
 " registrar una hipótesis morfológica separada, con el grado de certeza y el modelo o criterio usado. ":" record a separate morphological hypothesis, its confidence level and the model or criteria applied. ",
 "Colación:":"Collation:",
 " comparar testimonios y ediciones sin sustituir sus lecturas.":" compare witnesses and editions without replacing their readings.",
 "Griego antiguo y koiné:":"Ancient Greek and Koine:",
 " el politónico representa convenciones de acentos y espíritus que no determinan por sí solas el período o dialecto. El monotónico es una convención ortográfica posterior y no constituye una edición alternativa del griego antiguo. Las grafías con sigma lunada requieren comprobación del contexto epigráfico o editorial.":" polytonic writing uses accent and breathing conventions that do not, by themselves, identify a period or dialect. Monotonic Greek is a later orthographic convention, not an alternative ancient Greek edition. Lunate sigma spellings require examination of their epigraphic or editorial context.",
 "OCR y HTR:":"OCR and HTR:",
 " una transcripción obtenida por reconocimiento automático debe señalar motor, versión, fecha, imagen fuente y estado de revisión humana; una imagen escaneada no debe contarse como texto indexado.":" an automatically recognized transcription must identify the engine, version, date, source image and human-review status; a scanned image must not be counted as indexed text.",
 "Introduzca una palabra o frase para comparar sus grafías.":"Enter a word or phrase to compare its spellings.",
 "Forma introducida":"Input form",
 "La grafía se conserva sin cambios.":"The spelling is preserved unchanged.",
 "Composición canónica; no modifica la edición filológica.":"Canonical composition; the scholarly edition is not altered.",
 "Descomposición canónica; útil para inspeccionar diacríticos.":"Canonical decomposition; useful for examining diacritics.",
 "Clave de búsqueda flexible":"Flexible search key",
 "Suprime signos diacríticos y unifica algunas grafías sigma. Solo sirve para localizar candidatos.":"Removes diacritics and unifies certain sigma forms. Only useful for finding candidates.",
 "Sigma normalizada":"Normalized sigma",
 "Unifica sigma final y sigma lunada para recuperación. No reescribe el testimonio.":"Unifies final and lunate sigma for retrieval without rewriting the witness.",
 "Sin acentos ni espíritus":"Without accents or breathings",
 "Se pierden distinciones ortográficas; consulte siempre el original.":"Orthographic distinctions are lost; always consult the original.",
 "Sin signos masoréticos":"Without Masoretic marks",
 "Capa para recuperación gráfica, no transcripción paleográfica ni interpretación del idioma.":"A graphical retrieval layer, not a paleographic transcription or linguistic interpretation.",
 "Latinización de búsqueda u/v e i/j":"Latin search normalization u/v and i/j",
 "Equivalencia experimental de grafías editoriales; no implica la misma forma histórica.":"Experimental equivalence of editorial spellings; does not imply the same historical form.",
 "Representación":"Representation","Resultado":"Result","Criterio":"Criterion",
 "Buscar en Vitruvia":"Search in Vitruvia","Analizar en Lexicon":"Analyze in Lexicon","Buscar concordancias":"Search concordances",
 "Exportar tabla · TSV":"Export table · TSV",
 "Procedencia":"Provenance","Forma":"Form","Transformación Unicode local; sin alterar el original":"Local Unicode transformation; original unchanged",
 "Griego":"Greek","Hebreo / escritura aramea cuadrada":"Hebrew / square Aramaic script","Alfabeto latino":"Latin alphabet","Escritura no determinada":"Undetermined script",
 "Escritura detectada: ":"Detected script: ",
 ". Los resultados son transformaciones de Unicode y claves de consulta, no análisis morfológico ni resultados de OCR.":". Results are Unicode transformations and search keys, not morphological analyses or OCR results."
 },
 fr:{
 "Laboratorio de escrituras y variantes textuales":"Laboratoire des écritures et des variantes textuelles",
 "Compare formas griegas politónicas, formas sin diacríticos y grafías latinas mediante operaciones explícitas. El laboratorio no altera los textos originales, no convierte ático en koiné y no certifica equivalencias lingüísticas.":"Comparez les formes grecques polytoniques, les formes sans diacritiques et les graphies latines par des opérations explicites. Ce laboratoire ne modifie pas les textes sources, ne convertit pas l'attique en koinè et ne certifie aucune équivalence linguistique.",
 "Palabra o frase documentada":"Mot ou expression attestés",
 "Comparar grafías":"Comparer les graphies",
 "Introduzca un término y seleccione «Comparar grafías».":"Saisissez un terme et sélectionnez « Comparer les graphies ».",
 "Protocolo editorial":"Protocole éditorial",
 "Transcripción diplomática:":"Transcription diplomatique :",
 " conservar lo que figura en el testimonio o edición fuente, incluidos signos, abreviaturas y lecturas dudosas. ":" conserver la lecture du témoin ou de l'édition source, y compris les signes, abréviations et leçons douteuses. ",
 "Normalización Unicode:":"Normalisation Unicode :",
 " agrupar grafías técnicamente equivalentes para la recuperación. ":" regrouper les graphies techniquement équivalentes pour la recherche. ",
 "Lematización:":"Lemmatisation :",
 " registrar una hipótesis morfológica separada, con el grado de certeza y el modelo o criterio usado. ":" enregistrer une hypothèse morphologique distincte, son degré de certitude et le modèle ou critère utilisé. ",
 "Colación:":"Collation :",
 " comparar testimonios y ediciones sin sustituir sus lecturas.":" comparer les témoins et les éditions sans remplacer leurs leçons.",
 "Griego antiguo y koiné:":"Grec ancien et koinè :",
 " el politónico representa convenciones de acentos y espíritus que no determinan por sí solas el período o dialecto. El monotónico es una convención ortográfica posterior y no constituye una edición alternativa del griego antiguo. Las grafías con sigma lunada requieren comprobación del contexto epigráfico o editorial.":" l'écriture polytonique utilise des conventions d'accents et d'esprits qui ne déterminent pas à elles seules une période ou un dialecte. Le grec monotonique est une convention orthographique plus tardive, non une autre édition du grec ancien. Les formes à sigma lunaire exigent la vérification du contexte épigraphique ou éditorial.",
 "OCR y HTR:":"OCR et HTR :",
 " una transcripción obtenida por reconocimiento automático debe señalar motor, versión, fecha, imagen fuente y estado de revisión humana; una imagen escaneada no debe contarse como texto indexado.":" une transcription obtenue par reconnaissance automatique doit préciser le moteur, sa version, la date, l'image source et l'état de révision humaine ; une image numérisée ne constitue pas un texte indexé.",
 "Introduzca una palabra o frase para comparar sus grafías.":"Saisissez un mot ou une expression pour comparer les graphies.",
 "Forma introducida":"Forme saisie",
 "La grafía se conserva sin cambios.":"La graphie est conservée sans modification.",
 "Composición canónica; no modifica la edición filológica.":"Composition canonique ; ne modifie pas l'édition philologique.",
 "Descomposición canónica; útil para inspeccionar diacríticos.":"Décomposition canonique ; utile pour examiner les diacritiques.",
 "Clave de búsqueda flexible":"Clé de recherche souple",
 "Suprime signos diacríticos y unifica algunas grafías sigma. Solo sirve para localizar candidatos.":"Supprime les diacritiques et unifie certaines formes de sigma. Sert seulement à repérer des candidats.",
 "Sigma normalizada":"Sigma normalisé",
 "Unifica sigma final y sigma lunada para recuperación. No reescribe el testimonio.":"Unifie sigma final et sigma lunaire pour la recherche sans réécrire le témoin.",
 "Sin acentos ni espíritus":"Sans accents ni esprits",
 "Se pierden distinciones ortográficas; consulte siempre el original.":"Certaines distinctions orthographiques disparaissent ; consultez toujours l'original.",
 "Sin signos masoréticos":"Sans signes massorétiques",
 "Capa para recuperación gráfica, no transcripción paleográfica ni interpretación del idioma.":"Couche de recherche graphique, non transcription paléographique ni interprétation linguistique.",
 "Latinización de búsqueda u/v e i/j":"Normalisation latine de recherche u/v et i/j",
 "Equivalencia experimental de grafías editoriales; no implica la misma forma histórica.":"Équivalence expérimentale de graphies éditoriales ; n'implique pas une même forme historique.",
 "Representación":"Représentation","Resultado":"Résultat","Criterio":"Critère",
 "Buscar en Vitruvia":"Rechercher dans Vitruvia","Analizar en Lexicon":"Analyser dans Lexicon","Buscar concordancias":"Chercher les concordances",
 "Exportar tabla · TSV":"Exporter le tableau · TSV",
 "Procedencia":"Provenance","Forma":"Forme","Transformación Unicode local; sin alterar el original":"Transformation Unicode locale ; original inchangé",
 "Griego":"Grec","Hebreo / escritura aramea cuadrada":"Hébreu / écriture araméenne carrée","Alfabeto latino":"Alphabet latin","Escritura no determinada":"Écriture indéterminée",
 "Escritura detectada: ":"Écriture détectée : ",
 ". Los resultados son transformaciones de Unicode y claves de consulta, no análisis morfológico ni resultados de OCR.":". Les résultats sont des transformations Unicode et des clés de recherche, non des analyses morphologiques ni des résultats OCR."
 }
};
const tr=s=>labels[language]?.[s]??s;
const htmlStatic={
 es:[],
 en:["<strong>Diplomatic transcription:</strong> preserve what appears in the source witness or edition, including signs, abbreviations and uncertain readings. <strong>Unicode normalization:</strong> group technically equivalent spellings for retrieval. <strong>Lemmatization:</strong> record a separate morphological hypothesis with its confidence level and stated method. <strong>Collation:</strong> compare witnesses and editions without replacing their readings.","<strong>Ancient Greek and Koine:</strong> polytonic accents and breathings do not, by themselves, establish a period or dialect. Monotonic spelling is a later convention, not a different ancient Greek edition. Lunate sigma requires verification against its epigraphic or editorial context.","<strong>OCR and HTR:</strong> automatic transcription must identify its engine, version, date, source image and human-review status; a scanned image is not indexed text."],
 fr:["<strong>Transcription diplomatique :</strong> conserver ce qui apparaît dans le témoin ou l'édition source, y compris signes, abréviations et leçons douteuses. <strong>Normalisation Unicode :</strong> regrouper les graphies techniquement équivalentes pour la recherche. <strong>Lemmatisation :</strong> enregistrer une hypothèse morphologique distincte avec son degré de certitude et sa méthode. <strong>Collation :</strong> comparer les témoins et éditions sans remplacer leurs leçons.","<strong>Grec ancien et koinè :</strong> accents et esprits polytoniques ne déterminent pas à eux seuls la période ou le dialecte. Le monotonique est une convention postérieure et non une autre édition du grec ancien. Le sigma lunaire exige la vérification du contexte épigraphique ou éditorial.","<strong>OCR et HTR :</strong> toute transcription automatique doit préciser le moteur, la version, la date, l'image source et le statut de révision humaine ; une image numérisée n'est pas un texte indexé."]
};
const staticOriginal={
 title:document.querySelector(".orth-title")?.textContent,
 lead:document.querySelector(".orth-lead")?.textContent,
 label:document.querySelector('label[for="orth-source"]')?.firstChild?.nodeValue,
 button:button.textContent,
 note:$("orth-note")?.textContent,
 protocol:document.querySelector(".orth-card:nth-of-type(2) h2")?.textContent,
 paragraphs:[...document.querySelectorAll(".orth-card:nth-of-type(2) p")].map(p=>p.innerHTML)
};
function applyLanguage(){
 const title=document.querySelector(".orth-title"),lead=document.querySelector(".orth-lead");
 const label=document.querySelector('label[for="orth-source"]'),note=$("orth-note");
 const protocol=document.querySelector(".orth-card:nth-of-type(2) h2");
 if(title)title.textContent=tr(staticOriginal.title);
 if(lead)lead.textContent=tr(staticOriginal.lead);
 if(label?.firstChild)label.firstChild.nodeValue=tr(staticOriginal.label);
 button.textContent=tr(staticOriginal.button);
 if(protocol)protocol.textContent=tr(staticOriginal.protocol);
 document.querySelectorAll(".orth-card:nth-of-type(2) p").forEach((p,i)=>{p.innerHTML=language==="es"?staticOriginal.paragraphs[i]:htmlStatic[language][i]});
 source.placeholder=language==="en"?"For example: ἄνθρωπος, λόγος, οἶκος, ecclesia":language==="fr"?"Par exemple : ἄνθρωπος, λόγος, οἶκος, ecclesia":"Por ejemplo: ἄνθρωπος, λόγος, οἶκος, ecclesia";
 if(note&&!source.value.trim())note.textContent=tr(staticOriginal.note);
 document.documentElement.lang=language;
 if(source.value.trim())show();
}
document.addEventListener("vitruvius:language-changed",event=>{
 const next=event.detail?.language;
 if(!languages.includes(next))return;
 language=next;
 // Apply after other site-wide listeners; local content uses exact editorial translations.
 queueMicrotask(applyLanguage);
});
document.addEventListener("change",event=>{
 if(event.target?.id==="secondary-language"&&languages.includes(event.target.value)){
  language=event.target.value;queueMicrotask(applyLanguage);
 }
});
const markRe=/\p{M}/gu;
const sigmas={"ς":"σ","ϲ":"σ","Ϲ":"σ","Σ":"σ"};
const fold=s=>String(s||"").normalize("NFD").replace(markRe,"").toLocaleLowerCase().replace(/[ςϲϹ]/g,c=>sigmas[c]||c);
const escape=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function scriptOf(s){
 if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(s))return "Griego";
 if(/[\u0590-\u05ff]/u.test(s))return "Hebreo / escritura aramea cuadrada";
 if(/[a-záéíóúà-ÿ]/iu.test(s))return "Alfabeto latino";
 return "Escritura no determinada";
}
function show(){
 const input=source.value.trim().slice(0,300);
 const output=$("orth-results"),note=$("orth-note");output.replaceChildren();
 if(!input){note.textContent=tr("Introduzca una palabra o frase para comparar sus grafías.");return}
 const variants=[
  ["Forma introducida",input,"La grafía se conserva sin cambios."],
  ["Unicode NFC",input.normalize("NFC"),"Composición canónica; no modifica la edición filológica."],
  ["Unicode NFD",input.normalize("NFD"),"Descomposición canónica; útil para inspeccionar diacríticos."],
  ["Clave de búsqueda flexible",fold(input),"Suprime signos diacríticos y unifica algunas grafías sigma. Solo sirve para localizar candidatos."],
 ];
 if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(input)){
  variants.push(["Sigma normalizada",input.replace(/[ςϲϹ]/g,c=>sigmas[c]||c),"Unifica sigma final y sigma lunada para recuperación. No reescribe el testimonio."]);
  variants.push(["Sin acentos ni espíritus",input.normalize("NFD").replace(markRe,""),"Se pierden distinciones ortográficas; consulte siempre el original."]);
 }
 if(/[\u0590-\u05ff]/u.test(input))variants.push(["Sin signos masoréticos",input.normalize("NFD").replace(markRe,""),"Capa para recuperación gráfica, no transcripción paleográfica ni interpretación del idioma."]);
 if(/[a-z]/i.test(input))variants.push(["Latinización de búsqueda u/v e i/j",fold(input).replace(/v/g,"u").replace(/j/g,"i"),"Equivalencia experimental de grafías editoriales; no implica la misma forma histórica."]);
 const table=document.createElement("table");table.className="orth-table";
 const tr=document.createElement("tr");for(const t of ["Representación","Resultado","Criterio"]){const h=document.createElement("th");h.textContent=tr(t);tr.append(h)}table.append(tr);
 for(const [name,value,desc] of variants){
  const row=document.createElement("tr");
  for(const x of [name,value,desc]){const td=document.createElement("td");td.textContent=x===value?x:tr(x);if(x===value){td.dir="auto";td.style.fontSize="1.12em"}row.append(td)}
  table.append(row);
 }
 output.append(table);
 const controls=document.createElement("div");controls.className="orth-actions";
 const options=[
  ["Buscar en Vitruvia","vitruvia.html?q="+encodeURIComponent(input)],
  ["Analizar en Lexicon","vitruvia-lexicon.html?q="+encodeURIComponent(input)+"&mode=palabra"],
  ["Buscar concordancias","index-locorum.html?q="+encodeURIComponent(input)]
 ];
 for(const [label,url] of options){const a=document.createElement("a");a.href=url;a.textContent=tr(label);controls.append(a)}
 const exportBtn=document.createElement("button");exportBtn.type="button";
 exportBtn.textContent=tr("Exportar tabla · TSV");
 exportBtn.style.cssText="border:1px solid #a18d6e;border-radius:9px;padding:10px 14px;background:transparent;color:inherit;cursor:pointer";
 exportBtn.addEventListener("click",()=>{
  const clean=x=>String(x??"").replace(/[\t\r\n]+/g," ").trim();
  const rows=[["Representación","Forma","Criterio","Procedencia"].map(tr),...variants.map(([label,form,criterion])=>[tr(label),form,tr(criterion),tr("Transformación Unicode local; sin alterar el original")])];
  const content="\uFEFF"+rows.map(row=>row.map(clean).join("\t")).join("\r\n");
  const blob=new Blob([content],{type:"text/tab-separated-values;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="comparacion-ortografica.tsv";document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
 });
 controls.append(exportBtn);
 output.append(controls);
 note.textContent=tr("Escritura detectada: ")+tr(scriptOf(input))+tr(". Los resultados son transformaciones de Unicode y claves de consulta, no análisis morfológico ni resultados de OCR.");
}
button.addEventListener("click",show);
source.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();show()}});
for(const b of document.querySelectorAll("[data-example]"))b.addEventListener("click",()=>{source.value=b.dataset.example;show()});
const initial=new URLSearchParams(location.search).get("q");
if(initial){source.value=initial;show()}
applyLanguage();
})();