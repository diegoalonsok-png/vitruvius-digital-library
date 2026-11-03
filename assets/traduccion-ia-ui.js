/* Interfaz de laboratorio: idioma y modo de lectura solamente.
   Las preferencias visuales pueden persistir; NUNCA los archivos cargados. */
(()=>{
"use strict";
const entries={
"Español":["Español","Spanish","Espagnol","Spagnolo"],
"Idioma":["Idioma","Language","Langue","Lingua"],
"◐ Color":["◐ Color","◐ Theme","◐ Couleur","◐ Colore"],
"◐ Claro":["◐ Claro","◐ Light","◐ Clair","◐ Chiaro"],
"◐ Oscuro":["◐ Oscuro","◐ Dark","◐ Sombre","◐ Scuro"],
"← Vitruvius Digital Library":["← Vitruvius Digital Library","← Vitruvius Digital Library","← Bibliothèque numérique de Vitruve","← Biblioteca digitale di Vitruvio"],
"Lector de Vitruvio":["Lector de Vitruvio","Vitruvius reader","Lecteur de Vitruve","Lettore di Vitruvio"],
"Laboratorio H":["Laboratorio H","Laboratory H","Laboratoire H","Laboratorio H"],
"Método filológico":["Método filológico","Philological method","Méthode philologique","Metodo filologico"],
"Laboratorio de traducción filológica ":["Laboratorio de traducción filológica ","Philological translation laboratory ","Laboratoire de traduction philologique ","Laboratorio di traduzione filologica "],
"experimental":["experimental","experimental","expérimental","sperimentale"],
"Privacidad de la sesión · Biblioteca protegida":["Privacidad de la sesión · Biblioteca protegida","Session privacy · Protected library","Confidentialité de la session · Bibliothèque protégée","Riservatezza della sessione · Biblioteca protetta"],
"Importación y extracción estructurada":["Importación y extracción estructurada","Import and structured extraction","Importation et extraction structurée","Importazione ed estrazione strutturata"],
"Archivo DOCX, PDF, TXT o JSON (proyecto previo)":["Archivo DOCX, PDF, TXT o JSON (proyecto previo)","DOCX, PDF, TXT or JSON file (previous project)","Fichier DOCX, PDF, TXT ou JSON (projet antérieur)","File DOCX, PDF, TXT o JSON (progetto precedente)"],
"Lengua del original":["Lengua del original","Source language","Langue source","Lingua originale"],
"Lengua de traducción":["Lengua de traducción","Target language","Langue cible","Lingua di traduzione"],
"Detectar / no especificar":["Detectar / no especificar","Detect / unspecified","Détecter / non précisé","Rileva / non specificata"],
"Latín":["Latín","Latin","Latin","Latino"],
"Griego antiguo":["Griego antiguo","Ancient Greek","Grec ancien","Greco antico"],
"Latín y griego":["Latín y griego","Latin and Greek","Latin et grec","Latino e greco"],
"Castellano":["Castellano","Spanish","Espagnol","Spagnolo"],
"Inglés":["Inglés","English","Anglais","Inglese"],
"Francés":["Francés","French","Français","Francese"],
"Italiano":["Italiano","Italian","Italien","Italiano"],
"Portugués":["Portugués","Portuguese","Portugais","Portoghese"],
"O pegá aquí un fragmento latino o griego":["O pegá aquí un fragmento latino o griego","Or paste a Latin or Greek passage here","Ou collez un passage latin ou grec ici","Oppure incolla qui un brano latino o greco"],
"Extraer y codificar":["Extraer y codificar","Extract and encode","Extraire et encoder","Estrai e codifica"],
"Limpiar proyecto":["Limpiar proyecto","Clear project","Effacer le projet","Cancella progetto"],
"Consulta asistida mediante Google Translate":["Consulta asistida mediante Google Translate","Google Translate assisted consultation","Consultation assistée par Google Translate","Consultazione assistita con Google Translate"],
"Visor bilingüe de unidades semánticas":["Visor bilingüe de unidades semánticas","Bilingual semantic unit viewer","Lecteur bilingue d'unités sémantiques","Visualizzatore bilingue di unità semantiche"],
"Guardar proyecto JSON":["Guardar proyecto JSON","Save JSON project","Enregistrer le projet JSON","Salva progetto JSON"],
"Exportar TXT paralelo":["Exportar TXT paralelo","Export parallel TXT","Exporter TXT parallèle","Esporta TXT parallelo"],
"Imprimir / guardar PDF":["Imprimir / guardar PDF","Print / save PDF","Imprimer / enregistrer en PDF","Stampa / salva PDF"],
"Buscar en el original o la traducción":["Buscar en el original o la traducción","Search source or translation","Rechercher dans l'original ou la traduction","Cerca nell'originale o nella traduzione"],
"Original · latín / griego":["Original · latín / griego","Source · Latin / Greek","Original · latin / grec","Originale · latino / greco"],
"Traducción propuesta · editable y revisable":["Traducción propuesta · editable y revisable","Suggested translation · editable","Traduction proposée · modifiable","Traduzione proposta · modificabile"],
"Mostrar más unidades":["Mostrar más unidades","Show more units","Afficher davantage d'unités","Mostra altre unità"],
"Abrir en Google Translate":["Abrir en Google Translate","Open in Google Translate","Ouvrir dans Google Traduction","Apri in Google Traduttore"],
"Copiar original":["Copiar original","Copy original","Copier l'original","Copia originale"],
"Texto pegado":["Texto pegado","Pasted text","Texte collé","Testo incollato"],
"Traducción editable · ":["Traducción editable · ","Editable translation · ","Traduction modifiable · ","Traduzione modificabile · "],
"Introducí una clave personal de Google AI Studio":["Introducí una clave personal de Google AI Studio","Enter a personal Google AI Studio key","Saisissez une clé personnelle Google AI Studio","Inserisci una chiave personale di Google AI Studio"],
"Traducir automáticamente":["Traducir automáticamente","Translate automatically","Traduire automatiquement","Traduci automaticamente"],
"Detener traducción":["Detener traducción","Stop translation","Arrêter la traduction","Interrompi traduzione"],
"Descargar DOCX traducido":["Descargar DOCX traducido","Download translated DOCX","Télécharger le DOCX traduit","Scarica DOCX tradotto"],
"Generar PDF traducido":["Generar PDF traducido","Generate translated PDF","Générer un PDF traduit","Genera PDF tradotto"],
"Solo traducción":["Solo traducción","Translation only","Traduction seule","Solo traduzione"],
"Original y traducción":["Original y traducción","Source and translation","Original et traduction","Originale e traduzione"]
};
const langs=["es","en","fr","it"],dict={};
for(const [src,values] of Object.entries(entries))dict[src]=values;
const originals=new WeakMap();
const keyLang="vitruvius-ui-lang",keyTheme="vitruvius-color-theme";
let lang="es",theme="light";
try{lang=localStorage.getItem(keyLang)||"es";theme=localStorage.getItem(keyTheme)||"light";}catch{}
if(!langs.includes(lang))lang="es";
if(!["light","dark"].includes(theme))theme="light";
function tr(s){const t=dict[s];return t?t[langs.indexOf(lang)]:s;}
function translate(root=document){
 const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walk.nextNode())){
  const parent=node.parentElement;
  if(!parent||parent.closest("script,style,.source-text,.editable,.note-edit,.unit-head,.intro-archive,textarea"))continue;
  const val=node.nodeValue.trim();if(!val)continue;
  const original=originals.get(node)||val;
  if(!originals.has(node))originals.set(node,original);
  if(!dict[original])continue;
  const prefix=node.nodeValue.match(/^\s*/)?.[0]||"",suffix=node.nodeValue.match(/\s*$/)?.[0]||"";
  const next=prefix+tr(original)+suffix;
  if(node.nodeValue!==next)node.nodeValue=next;
 }
 for(const el of document.querySelectorAll("[placeholder]")){
  const original=el.dataset.originalPlaceholder||el.getAttribute("placeholder");
  if(!el.dataset.originalPlaceholder)el.dataset.originalPlaceholder=original;
  if(dict[original])el.setAttribute("placeholder",tr(original));
 }
 document.documentElement.lang=lang;
}
function paint(){
 document.documentElement.dataset.theme=theme;
 const button=document.getElementById("site-ui-theme");
 button.textContent=tr(theme==="dark"?"◐ Claro":"◐ Oscuro");
 button.setAttribute("aria-pressed",String(theme==="dark"));
}
function init(){
 const sel=document.getElementById("site-ui-language"),button=document.getElementById("site-ui-theme");
 if(!sel||!button)return;
 sel.value=lang;
 sel.addEventListener("change",()=>{lang=sel.value;try{localStorage.setItem(keyLang,lang);}catch{}translate();paint();});
 button.addEventListener("click",()=>{theme=theme==="dark"?"light":"dark";try{localStorage.setItem(keyTheme,theme);}catch{}paint();});
 paint();translate();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
window.VDLTranslateUI=()=>translate();
})();