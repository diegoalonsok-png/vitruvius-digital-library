/* Bibliotheca dossier toolbar: Lexicon-compatible UI language and background preferences. */
(()=>{"use strict";
const root=document.documentElement;
const LS_LANG="vitruvius-ui-lang",LS_THEME="vitruvia-theme",LS_BG="vitruvia-lexicon-bg";
const languages=["es","en","fr"];
const titles={
 es:{main:"Fichas críticas de obras clásicas",intro:"Datos de autoría, género, fecha de composición, denominaciones antiguas, transmisión manuscrita, variantes editoriales y bibliografía. La cita de una edición se distingue de la identidad de la obra; la antigüedad de un códice se presenta solamente en relación con el corpus de testimonios verificados.",notice:"Criterios de descripción de manuscritos inspirados en TEI P5, DCRM(MSS) y Chicago 18:",standard:"consultar protocolo y límites de verificación",choose:"Seleccionar una obra",print:"Imprimir / guardar PDF",copy:"Copiar ficha y procedencia",excel:"Descargar Excel · 222 obras y ecdótica",bg:"Fondo",reset:"Restablecer",custom:"Personalizado",theme:"Cambiar apariencia",lang:"Idioma de la interfaz",loading:"Consultando el catálogo académico…",select:"Elegir una obra del repertorio"},
 en:{main:"Critical records of classical works",intro:"Authorship, genre, composition date, ancient titles, manuscript transmission, editorial variants and bibliography. An edition citation is distinct from the work's identity; manuscript age is assessed only against the currently documented witnesses.",notice:"Manuscript description criteria based on TEI P5, DCRM(MSS) and Chicago 18:",standard:"view description protocol and verification limits",choose:"Select a work",print:"Print / save PDF",copy:"Copy record and provenance",excel:"Download Excel · 222 works and textual criticism",bg:"Background",reset:"Reset",custom:"Custom",theme:"Toggle appearance",lang:"Interface language",loading:"Loading the academic catalogue…",select:"Choose a work"},
 fr:{main:"Notices critiques des œuvres classiques",intro:"Auteur, genre, date de composition, titres anciens, transmission manuscrite, variantes éditoriales et bibliographie. Une référence d'édition se distingue de l'identité de l'œuvre ; l'ancienneté des manuscrits est évaluée selon les témoins documentés.",notice:"Description des manuscrits fondée sur TEI P5, DCRM(MSS) et Chicago 18 :",standard:"consulter le protocole et les limites de vérification",choose:"Choisir une œuvre",print:"Imprimer / enregistrer PDF",copy:"Copier notice et provenance",excel:"Télécharger Excel · 222 œuvres et critique textuelle",bg:"Fond",reset:"Réinitialiser",custom:"Personnalisé",theme:"Changer d'apparence",lang:"Langue de l'interface",loading:"Chargement du catalogue scientifique…",select:"Choisir une œuvre"}
};
const labels={
"Autor del catálogo":["Catalogue author","Auteur du catalogue"],
"Nombre antiguo normalizado":["Normalized ancient author name","Nom ancien normalisé"],
"Título en lengua original / título uniforme":["Original-language / uniform title","Titre en langue originale / titre uniforme"],
"Título original":["Original title","Titre original"],
"Lengua":["Language","Langue"],
"Datación de composición":["Composition date","Date de composition"],
"Siglo editorial del registro":["Century (catalogue)","Siècle (catalogue)"],
"Período catalográfico":["Catalogue period","Période du catalogue"],
"Formas y títulos alternativos":["Alternative titles","Titres alternatifs"],
"ID estable del catálogo":["Stable catalogue ID","Identifiant stable du catalogue"],
"Contexto histórico, género y atribución":["Historical context, genre and attribution","Contexte historique, genre et attribution"],
"Estándar Vitruvius · autoridad, cronología y control codicológico":["Vitruvius standard · authority, chronology and codicology","Norme Vitruvius · autorités, chronologie et codicologie"],
"Estado de investigación y fuentes primarias":["Research status and primary sources","État des recherches et sources primaires"],
"Autoridad textual y nomenclatura crítica":["Textual authority and critical nomenclature","Autorités textuelles et nomenclature critique"],
"Integridad de la obra y cobertura del original":["Textual integrity and original-language coverage","Intégrité textuelle et couverture de l'original"],
"Códices y testimonio más temprano acreditado":["Codices and earliest documented witness","Codex et plus ancien témoin documenté"],
"Testimonios, códices e imágenes":["Witnesses, codices and images","Témoins, codex et images"],
"Investigación asistida · manuscrito más antiguo":["Assisted research · earliest manuscript","Recherche assistée · manuscrit le plus ancien"],
"Ficha codicológica especializada":["Specialized codicological record","Notice codicologique spécialisée"],
"Ediciones y referencias · Chicago 18":["Editions and references · Chicago 18","Éditions et références · Chicago 18"],
"Metodología de la ficha":["Record methodology","Méthodologie de la notice"],
"Datos de edición y lecturas":["Editions and readings","Éditions et lectures"],
"Clasificación ecdótica":["Textual transmission class","Type de transmission textuelle"],
"Testimonio original griego":["Original-language Greek witness","Témoin original grec"],
"Custodia / signatura actual":["Repository / shelfmark","Conservation / cote"],
"Datación del testigo":["Witness date","Datation du témoin"],
"Fundamento de datación":["Dating basis","Fondement de datation"],
"Soporte / extensión":["Support / extent","Support / étendue"],
"Escritura":["Script","Écriture"],
"Foliación y loci":["Foliation and loci","Foliotation et loci"],
"Contenido efectivamente conservado":["Actual surviving content","Contenu réellement conservé"],
"Procedencia (historia del códice)":["Provenance (manuscript history)","Provenance (histoire du codex)"],
"Bibliografía codicológica":["Codicological bibliography","Bibliographie codicologique"],
"Siglum / abreviatura documentada":["Siglum / documented abbreviation","Sigle / abréviation documentée"],
"Grado de verificación":["Verification status","État de vérification"],
"Estado de comprobación para esta obra":["Verification status for this work","État de vérification de l'œuvre"],
"Canon de autoridad":["Authority system","Système d'autorité"],
"Códigos de obra PHI / TLG propuestos":["Proposed PHI / TLG work codes","Codes PHI / TLG proposés"],
"CTS URN de edición":["Edition CTS URN","URN CTS de l'édition"],
"Composición de la obra":["Work composition","Composition de l'œuvre"],
"Género / materia":["Genre / subject","Genre / discipline"],
"Datación de los códices":["Manuscript dating","Datation des manuscrits"],
"Repositorío y signatura":["Repository and shelfmark","Dépôt et cote"],
"Repositorio y signatura":["Repository and shelfmark","Dépôt et cote"],
"Edición crítica de control para este testigo":["Control critical edition for this witness","Édition critique de référence du témoin"],
"Edición crítica y cita Chicago 18":["Critical edition and Chicago 18 citation","Édition critique et référence Chicago 18"],
"Nivel de madurez":["Maturity level","Niveau de maturité"],
"Tradición directa":["Direct transmission","Tradition directe"],
"Tradición indirecta":["Indirect transmission","Tradition indirecte"],
"Testigos materiales individualizados":["Identified physical witnesses","Témoins matériels identifiés"],
"Acceso a imágenes o folios":["Access to folio images","Accès aux images des folios"]
};
const palette=[["Negro","#101011","dark"],["Grafito","#262629","dark"],["Azul noche","#142334","dark"],["Verde oscuro","#182a24","dark"],["Burdeos","#332126","dark"],["Sepia","#eae1cf","light"],["Marfil","#f6f4ee","light"],["Blanco","#ffffff","light"]];
const $=id=>document.getElementById(id);
const get=(key)=>{try{return localStorage.getItem(key)}catch{return null}};
const set=(key,v)=>{try{localStorage.setItem(key,v)}catch{}};
let lang=languages.includes(get(LS_LANG))?get(LS_LANG):"es";
let mode=["light","dark"].includes(get(LS_THEME))?get(LS_THEME):"dark";
let bg=null;try{const v=JSON.parse(get(LS_BG)||"null");if(Array.isArray(v)&&/^#[0-9a-f]{6}$/i.test(v[0])&&["light","dark"].includes(v[1])){bg=v[0];mode=v[1]}}catch{}
function themePaint(){root.dataset.theme=mode;root.style.setProperty("--cwd-bg",bg|| (mode==="light"?"#f6f4ee":"#101011"));root.style.setProperty("--cwd-panel",bg|| (mode==="light"?"#f6f4ee":"#151517"));root.style.setProperty("--cwd-ink",mode==="light"?"#222":"#ededed");root.style.setProperty("--cwd-line",mode==="light"?"#aaa":"#545457");const btn=$("cwd-theme");if(btn){btn.textContent=mode==="dark"?"☀":"☾";btn.setAttribute("aria-pressed",String(mode==="dark"));btn.title=titles[lang].theme}}
function setBg(hex,newMode){bg=hex;mode=newMode;set(LS_BG,JSON.stringify([bg,mode]));set(LS_THEME,mode);themePaint()}
function toggleTheme(){mode=mode==="dark"?"light":"dark";bg=null;try{localStorage.removeItem(LS_BG)}catch{}set(LS_THEME,mode);themePaint()}
function applyLanguage(){
 root.lang=lang;const t=titles[lang];document.title=t.main+" · Bibliotheca Graeca et Latina · Vitruvius Digital Library";
 const main=document.querySelector("main>h1");if(main)main.textContent=t.main;
 const intro=document.querySelector("main>p.intro");if(intro)intro.textContent=t.intro;
 const method=document.querySelector("main>p.intro + p.intro");if(method){method.firstChild.textContent=t.notice+" ";const link=method.querySelector("a");if(link)link.textContent=t.standard}
 const label=document.querySelector('label[for="record-work"]');if(label)label.textContent=t.choose;
 const buttons={"print-record":"print","copy-record":"copy","bibliotheca-download-xlsx":"excel"};for(const [id,key] of Object.entries(buttons)){const b=$(id);if(b)b.textContent=t[key]}
 const sel=$("record-work");if(sel&&sel.options.length)sel.options[0].textContent=t.select;
 const lg=$("cwd-lang");if(lg){lg.value=lang;lg.setAttribute("aria-label",t.lang)}
 const p=$("cwd-palette");if(p)p.querySelector("summary").textContent="◉ "+t.bg;
 const reset=$("cwd-reset");if(reset)reset.textContent=t.reset;
 const custom=$("cwd-custom-label");if(custom)custom.textContent=t.custom;
 const status=$("work-record-status");if(status&&/^(Consultando el catálogo|Loading the academic catalogue|Chargement du catalogue)/.test(status.textContent))status.textContent=t.loading;
 for(const r of document.querySelectorAll("#work-record h3,#work-record .cwd-row strong")){if(!r.dataset.cwdOriginal)r.dataset.cwdOriginal=r.textContent;const original=r.dataset.cwdOriginal.replace(/:\s*$/,"");const trans=labels[original];{const next=lang==="es"?r.dataset.cwdOriginal:trans?trans[lang==="en"?0:1]+(r.dataset.cwdOriginal.endsWith(": ")||r.dataset.cwdOriginal.endsWith(":")?": ":""):r.dataset.cwdOriginal;if(r.textContent!==next)r.textContent=next}}
 themePaint();
 document.dispatchEvent(new CustomEvent("vitruvius:language-changed",{detail:{language:lang}}));
}
let applying=false;
function translateDossier(){
 if(applying)return;applying=true;
 for(const node of document.querySelectorAll("#work-record h3,#work-record .cwd-row strong")){
  if(!node.dataset.cwdOriginal)node.dataset.cwdOriginal=node.textContent;
  const orig=node.dataset.cwdOriginal;
  const raw=orig.replace(/:\s*$/,"");const trans=labels[raw];
  const suffix=/\:\s*$/.test(orig)?": ":"";
  {const next=lang==="es"?orig:(trans?trans[lang==="en"?0:1]+suffix:orig);if(node.textContent!==next)node.textContent=next;}
 }
 applying=false;
}
function init(){
 const bar=$("cwd-toolbar");if(!bar)return;
 const select=$("cwd-lang");select.value=lang;select.addEventListener("change",()=>{lang=select.value;set(LS_LANG,lang);applyLanguage();translateDossier()});
 $("cwd-theme").addEventListener("click",toggleTheme);
 const panel=$("cwd-palette-panel");for(const [name,hex,th] of palette){const b=document.createElement("button");b.type="button";b.className="cwd-swatch";b.style.background=hex;b.title=name;b.setAttribute("aria-label",name);b.addEventListener("click",()=>setBg(hex,th));panel.append(b)}
 $("cwd-custom").addEventListener("input",e=>{const hex=e.target.value;const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));setBg(hex,(c[0]*299+c[1]*587+c[2]*114)/1000>150?"light":"dark")});
 $("cwd-reset").addEventListener("click",()=>{bg=null;try{localStorage.removeItem(LS_BG)}catch{}themePaint()});
 const work=$("work-record");if(work){let queued=false;new MutationObserver(()=>{if(queued||applying)return;queued=true;requestAnimationFrame(()=>{queued=false;translateDossier()})}).observe(work,{childList:true,subtree:true})}
 applyLanguage();translateDossier();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();