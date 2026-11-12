/* Repertorium onomasticum: repertorio hojeable de los nombres del texto latino,
   con glosa filológica y glosa ecdótica. Fuente: data/onomasticon-plenum.json
   (scripts/build-onomasticon-plenum.py).

   Se hojea, no se teclea: índice alfabético y filtros por categoría. La búsqueda
   por escritura queda como atajo, no como única puerta.

   Distingue lo verificado de lo pendiente: la atestiguación textual de un nombre
   (locus y formas en V514) está comprobada; la identificación prosopográfica es
   un resumen del autor y se rotula como tal mientras no cite autoridad externa. */
(()=>{
"use strict";
const URL_DATA="data/onomasticon-plenum.json?v=20261112";
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const KIND={get person(){return tr("Persona")},get place(){return tr("Lugar")}};
/* Traducción de la interfaz del repertorio. Clave: el texto castellano. Los
   nombres antiguos, las formas atestiguadas y las reseñas del autor no se
   traducen. */
const TR={
 "Persona":{en:"Person",fr:"Personne",la:"Persona"},"Lugar":{en:"Place",fr:"Lieu",la:"Locus"},
 "ficha del autor":{en:"author's record",fr:"notice de l'auteur",la:"notitia auctoris"},
 "glosa ecdótica":{en:"ecdotic gloss",fr:"glose ecdotique",la:"glossa ecdotica"},
 "Leer el pasaje":{en:"Read the passage",fr:"Lire le passage",la:"Locum legere"},
 "Buscar el nombre en el aparato":{en:"Search the name in the apparatus",fr:"Chercher le nom dans l'apparat",la:"Nomen in apparatu quaerere"},
 "Concordancia en el Lexicon":{en:"Concordance in the Lexicon",fr:"Concordance dans le Lexicon",la:"Concordantia in Lexico"},
 "Elija un nombre del repertorio para ver sus formas atestiguadas, sus loci, la glosa filológica y la glosa ecdótica.":{en:"Choose a name from the repertory to see its attested forms, its loci, the philological gloss and the ecdotic gloss.",fr:"Choisissez un nom du répertoire pour voir ses formes attestées, ses loci, la glose philologique et la glose ecdotique.",la:"Nomen e repertorio elige, ut formas testatas, locos, glossam philologicam et ecdoticam videas."},
 "Glosa filológica":{en:"Philological gloss",fr:"Glose philologique",la:"Glossa philologica"},
 "Glosa ecdótica":{en:"Ecdotic gloss",fr:"Glose ecdotique",la:"Glossa ecdotica"},
 "Formas atestiguadas en V514: ":{en:"Forms attested in V514: ",fr:"Formes attestées dans V514 : ",la:"Formae in V514 testatae: "},
 "Forma griega: ":{en:"Greek form: ",fr:"Forme grecque : ",la:"Forma Graeca: "},
 "  Atestiguada en el texto latino de V514.":{en:"  Attested in the Latin text of V514.",fr:"  Attestée dans le texte latin de V514.",la:"  In textu Latino V514 testata."},
 "  Nombre histórico convencional; no es una lectura griega del códice.":{en:"  Conventional historical name; not a Greek reading of the codex.",fr:"  Nom historique conventionnel ; ce n'est pas une leçon grecque du codex.",la:"  Nomen historicum usitatum; non lectio Graeca codicis."},
 "Glosario del autor: ":{en:"Author's glossary: ",fr:"Glossaire de l'auteur : ",la:"Glossarium auctoris: "},
 "Atestiguación textual verificada. ":{en:"Textual attestation verified. ",fr:"Attestation textuelle vérifiée. ",la:"Testimonium textus comprobatum. "},
 "del texto latino de V514, con las formas transcritas tal como aparecen.":{en:"of the Latin text of V514, with the forms transcribed as they appear.",fr:"du texte latin de V514, avec les formes transcrites telles qu'elles apparaissent.",la:"textus Latini V514, formis ut apparent transcriptis."},
 "Identificación sin autoridad citada. ":{en:"Identification without a cited authority. ",fr:"Identification sans autorité citée. ",la:"Identificatio sine auctoritate allata. "},
 "Loci":{en:"Loci",fr:"Loci",la:"Loci"},
 "El aparato crítico de las ediciones no menciona este nombre en sus loci. Eso no significa que el texto sea seguro: significa que no hay nota publicada sobre él.":{en:"The critical apparatus of the editions does not mention this name in its loci. That does not mean the text is secure: it means there is no published note on it.",fr:"L'apparat critique des éditions ne mentionne pas ce nom dans ses loci. Cela ne signifie pas que le texte soit sûr : il n'existe simplement pas de note publiée à son sujet.",la:"Apparatus criticus editionum hoc nomen in locis suis non memorat. Non ideo textus certus est: nulla tantum nota de eo edita est."},
 "Página impresa del aparato":{en:"Printed page of the apparatus",fr:"Page imprimée de l'apparat",la:"Pagina impressa apparatus"},
 "Nombres propios":{en:"Proper names",fr:"Noms propres",la:"Nomina propria"},
 "Con ficha del autor":{en:"With the author's record",fr:"Avec notice de l'auteur",la:"Cum notitia auctoris"},
 "Con glosa ecdótica":{en:"With an ecdotic gloss",fr:"Avec glose ecdotique",la:"Cum glossa ecdotica"},
 "Con folio del códice":{en:"With a folio of the codex",fr:"Avec folio du codex",la:"Cum folio codicis"},
 "Voces comunes o gentilicias":{en:"Common or ethnic words",fr:"Mots communs ou ethniques",la:"Vocabula communia aut gentilicia"},
 "Voces comunes y gentilicias":{en:"Common and ethnic words",fr:"Mots communs et ethniques",la:"Vocabula communia et gentilicia"},
 "Voces griegas":{en:"Greek words",fr:"Mots grecs",la:"Vocabula Graeca"},
 "Todas":{en:"All",fr:"Toutes",la:"Omnes"},
 "Todos los libros":{en:"All books",fr:"Tous les livres",la:"Omnes libri"},
 "Libro":{en:"Book",fr:"Livre",la:"Liber"},
 "nombres":{en:"names",fr:"noms",la:"nomina"},
 "elegir…":{en:"choose…",fr:"choisir…",la:"elige…"},
 "entradas":{en:"entries",fr:"entrées",la:"lemmata"},
 "se listan las primeras 400":{en:"the first 400 are listed",fr:"les 400 premières sont listées",la:"priora CD recensentur"},
 "en":{en:"under",fr:"sous",la:"sub"},
 "aparición":{en:"occurrence",fr:"occurrence",la:"locus"},"apariciones":{en:"occurrences",fr:"occurrences",la:"loci"},
 "Se listan 60 de":{en:"60 listed out of",fr:"60 listés sur",la:"LX recensentur ex"},
 "No se pudo cargar el repertorio onomástico":{en:"The onomastic repertory could not be loaded",fr:"Le répertoire onomastique n'a pas pu être chargé",la:"Repertorium nominum onerari non potuit"},
 "Folio":{en:"Folio",fr:"Folio",la:"Folium"},"del códice H":{en:"of codex H",fr:"du codex H",la:"codicis H"},
 // HTML fijo
 "Con sus formas atestiguadas, sus loci, la glosa filológica y la glosa ecdótica del aparato de las ediciones. Se hojea por orden alfabético, por libro y por categoría; escribir es un atajo, no la puerta.":{en:"With its attested forms, its loci, the philological gloss and the ecdotic gloss from the editions' apparatus. Browse alphabetically, by book and by category; typing is a shortcut, not the door.",fr:"Avec ses formes attestées, ses loci, la glose philologique et la glose ecdotique de l'apparat des éditions. On le parcourt par ordre alphabétique, par livre et par catégorie ; écrire est un raccourci, pas la porte.",la:"Cum formis testatis, locis, glossa philologica et glossa ecdotica apparatus editionum. Per litteras, per libros et per genera percurritur; scribere compendium est, non ianua."},
 "Repertorio de los nombres propios y las voces griegas del texto latino de V514, para hojear sin escribir. Cada entrada da sus formas atestiguadas, sus loci, la glosa filológica y, cuando el aparato crítico de las ediciones habla de ese nombre, la glosa ecdótica. La atestiguación textual está verificada sobre los loci; la identificación de personas y lugares es la de las fichas del autor y se rotula aparte mientras no cite autoridad externa.":{en:"Repertory of the proper names and Greek words of the Latin text of V514, to browse without typing. Each entry gives its attested forms, its loci, the philological gloss and, when the critical apparatus of the editions discusses the name, the ecdotic gloss. Textual attestation is verified against the loci; the identification of persons and places is that of the author's records and is labelled separately until it cites an external authority.",fr:"Répertoire des noms propres et des mots grecs du texte latin de V514, à parcourir sans écrire. Chaque entrée donne ses formes attestées, ses loci, la glose philologique et, lorsque l'apparat critique des éditions traite de ce nom, la glose ecdotique. L'attestation textuelle est vérifiée sur les loci ; l'identification des personnes et des lieux est celle des notices de l'auteur et reste signalée à part tant qu'elle ne cite pas d'autorité externe.",la:"Repertorium nominum propriorum et vocabulorum Graecorum textus Latini V514, sine scribendo percurrendum. Quodque lemma formas testatas, locos, glossam philologicam et, ubi apparatus criticus de nomine agit, glossam ecdoticam praebet. Testimonium textus in locis comprobatum est; identificatio personarum et locorum ex notitiis auctoris sumpta seorsum notatur, dum auctoritatem externam non adfert."},
 "Clase":{en:"Class",fr:"Classe",la:"Genus"},"Nombre":{en:"Name",fr:"Nom",la:"Nomen"},"o escribir":{en:"or type",fr:"ou écrire",la:"aut scribe"},
 "Personas con ficha":{en:"Persons with a record",fr:"Personnes avec notice",la:"Personae cum notitia"},
 "Lugares con ficha":{en:"Places with a record",fr:"Lieux avec notice",la:"Loca cum notitia"},
 "Sin ficha redactada":{en:"Without a written record",fr:"Sans notice rédigée",la:"Sine notitia scripta"},
 "Cargando el repertorio…":{en:"Loading the repertory…",fr:"Chargement du répertoire…",la:"Repertorium oneratur…"},
 "← Buscador Vitruvia":{en:"← Vitruvia search",fr:"← Recherche Vitruvia",la:"← Quaestio Vitruvia"},
 "Lector bilingüe":{en:"Bilingual reader",fr:"Lecteur bilingue",la:"Lector bilinguis"},
 "Aparato y notas":{en:"Apparatus and notes",fr:"Apparat et notes",la:"Apparatus et notae"},
 "Colación por locus":{en:"Collation by locus",fr:"Collation par locus",la:"Collatio per locum"},
 "Glossarium del autor":{en:"Author's glossarium",fr:"Glossarium de l'auteur",la:"Glossarium auctoris"},
 "Método filológico":{en:"Philological method",fr:"Méthode philologique",la:"Ratio philologica"},
 "Bibliografía":{en:"Bibliography",fr:"Bibliographie",la:"Bibliographia"},
 "Cómo citar":{en:"How to cite",fr:"Comment citer",la:"Quomodo citetur"},
 "Índices locorum":{en:"Indices locorum",fr:"Indices locorum",la:"Indices locorum"},
 "Guía universitaria":{en:"University guide",fr:"Guide universitaire",la:"Dux academicus"},
 "Procedencia y cobertura":{en:"Provenance and coverage",fr:"Provenance et couverture",la:"Origo et ambitus"},
 "Copiar enlace de búsqueda":{en:"Copy search link",fr:"Copier le lien de recherche",la:"Nexum quaestionis exscribe"},
 "Copiar referencia":{en:"Copy reference",fr:"Copier la référence",la:"Referentiam exscribe"}
};
const idiomaUI=()=>{const l=(window.OVI18N?.lang||document.documentElement.lang||"es").slice(0,2);return ["en","fr","la"].includes(l)?l:"es"};
const tr=s=>{const l=idiomaUI();return l==="es"?s:(TR[s]?.[l]??s)};
/* Texto fijo del HTML: se guarda el original castellano y se traduce desde él. */
function traducirFijo(){
 const raiz=document.querySelectorAll(".on-shell a, .on-masthead p, #on-repertorium p.on-lead, #on-repertorium label, #on-clase option, #on-count, #scholarly-query-tools a, #scholarly-query-tools button");
 for(const n of raiz){
  // sólo el primer nodo de texto (las etiquetas contienen su <select>)
  const t=[...n.childNodes].find(x=>x.nodeType===3&&x.nodeValue.trim());
  if(!t)continue;
  if(!n.dataset.onEs)n.dataset.onEs=t.nodeValue.trim();
  const v=tr(n.dataset.onEs);
  t.nodeValue=t.nodeValue.replace(t.nodeValue.trim(),v);
 }
}

const $=id=>document.getElementById(id);
const el=(t,c,txt)=>{const n=document.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=String(txt);return n};
const fold=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u");
const cita=l=>{const [b,...r]=String(l).split(".");return "Vitr. "+(R[+b]||b)+"."+r.join(".")};
const LATIN="ABCDEFGHILMNOPQRSTVXZ".split("");
const GRIEGO="ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ".split("");
let datos=null,grupo="nombres",letra="",sel=null,libro="",clase="";
const libroDe=l=>parseInt(String(l).split(".")[0],10)||0;

function coleccion(){
 if(!datos)return [];
 if(grupo==="griegas")return datos.vocesGriegas||[];
 if(grupo==="comunes")return datos.vocesComunesOGentilicias||[];
 if(grupo==="ecdotica")return (datos.nombres||[]).filter(n=>(n.aparatoQueLoMenciona||[]).length);
 if(grupo==="folio")return (datos.nombres||[]).filter(n=>(n.foliosDelCodice||[]).length);
 if(grupo==="ficha")return (datos.nombres||[]).filter(n=>n.ficha);
 return datos.nombres||[];
}

function filtradas(){
 const q=fold(($("on-q")?.value||"").trim());
 return coleccion().filter(e=>{
  if(letra&&!String(e.formaPrincipal||"").toUpperCase().startsWith(letra))return false;
  if(libro&&!(e.loci||[]).some(l=>libroDe(l)===+libro))return false;
  if(clase==="persona"&&e.ficha?.clase!=="person")return false;
  if(clase==="lugar"&&e.ficha?.clase!=="place")return false;
  if(clase==="sinficha"&&e.ficha)return false;
  if(!q)return true;
  if(fold(e.formaPrincipal).includes(q))return true;
  if((e.formasAtestiguadas||[]).some(f=>fold(f.forma).includes(q)))return true;
  if(e.ficha&&(fold(e.ficha.nombre).includes(q)||(e.ficha.variantes||[]).some(v=>fold(v).includes(q))))return true;
  return false;
 });
}

/* Desplegable con todos los nombres del filtro vigente: se llega a cualquier
   ficha eligiendo, sin escribir una letra. */
function pintaDesplegableDeNombres(rows){
 const sel2=$("on-nombre");if(!sel2)return;
 const previo=sel?sel.clave:"";
 sel2.replaceChildren(new Option(rows.length+" "+tr("nombres")+" · "+tr("elegir…"),""));
 for(const e of rows.slice(0,1200)){
  const partes=[e.formaPrincipal];
  if(e.ficha)partes.push(KIND[e.ficha.clase]||"ficha");
  partes.push(e.apariciones+"×");
  sel2.append(new Option(partes.join(" · "),e.clave));
 }
 if(previo&&rows.some(e=>e.clave===previo))sel2.value=previo;
}

function pintaLista(){
 const rows=filtradas();
 pintaDesplegableDeNombres(rows);
 const ul=el("ul");
 for(const e of rows.slice(0,400)){
  const li=el("li"),b=el("button");
  b.type="button";
  b.setAttribute("aria-current",String(sel===e));
  const nombre=el("span","on-name",e.formaPrincipal);
  if(grupo==="griegas")nombre.lang="grc"; else nombre.lang="la";
  b.append(nombre);
  const partes=[`${e.apariciones} ${(e.apariciones===1?tr("aparición"):tr("apariciones"))}`,`${e.loci.length} loci`];
  if(e.ficha)partes.push(KIND[e.ficha.clase]||tr("ficha del autor"));
  if((e.aparatoQueLoMenciona||[]).length)partes.push(tr("glosa ecdótica"));
  if((e.foliosDelCodice||[]).length)partes.push("folio H");
  b.append(el("span","on-tally",partes.join(" · ")));
  b.addEventListener("click",()=>{sel=e;pintaLista();pintaFicha()});
  li.append(b);ul.append(li);
 }
 const box=$("on-list");box.replaceChildren(ul);
 $("on-count").textContent=rows.length+" "+tr("entradas")+(rows.length>400?" ("+tr("se listan las primeras 400")+")":"")+
  (letra?" "+tr("en")+" "+letra:"")+".";
 for(const btn of document.querySelectorAll("#on-alphabet button"))
  btn.setAttribute("aria-pressed",String(btn.dataset.letra===letra));
}

function enlaces(e){
 const nav=el("nav","on-links");
 const primero=e.loci[0];
 if(primero){
  const a=el("a",null,tr("Leer el pasaje"));
  a.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(primero);
  nav.append(a);
  const b=el("a",null,tr("Buscar el nombre en el aparato"));
  b.href="aparato-critico.html?q="+encodeURIComponent(e.formaPrincipal);
  nav.append(b);
  const c=el("a",null,tr("Concordancia en el Lexicon"));
  c.href="vitruvia-lexicon.html?q="+encodeURIComponent(e.formaPrincipal)+"&mode=palabra&lang=la";
  nav.append(c);
 }
 for(const f of (e.foliosDelCodice||[]).slice(0,3)){
  const a=el("a",null,tr("Folio")+" "+f.folio+" "+tr("del códice H"));
  a.href="codex-h-folios-local.html?folio="+encodeURIComponent(f.folio);
  nav.append(a);
 }
 return nav;
}

function pintaFicha(){
 const box=$("on-card");box.replaceChildren();
 if(!sel){
  box.append(el("p","on-note",tr("Elija un nombre del repertorio para ver sus formas atestiguadas, sus loci, la glosa filológica y la glosa ecdótica.")));
  return;
 }
 const e=sel;
 const h=el("h3",null,e.formaPrincipal);
 h.lang=grupo==="griegas"?"grc":"la";
 box.append(h);
 if(e.ficha){
  box.append(el("p","on-forms",[KIND[e.ficha.clase]||"", e.ficha.periodo||""].filter(Boolean).join(" · ")));
  if(e.ficha.resumen)box.append(el("p",null,e.ficha.resumen));
 }

 box.append(el("h4",null,tr("Glosa filológica")));
 const formas=(e.formasAtestiguadas||[]).map(f=>f.forma+" ("+f.apariciones+")").join(" · ");
 const pf=el("p","on-forms");
 pf.append(el("strong",null,tr("Formas atestiguadas en V514: ")));
 const span=el("span",null,formas);span.lang=grupo==="griegas"?"grc":"la";
 pf.append(span);
 box.append(pf);
 if(e.ficha?.nombreGriego){
  const pg=el("p","on-forms");
  pg.append(el("strong",null,tr("Forma griega: ")));
  const g=el("span",null,e.ficha.nombreGriego);g.lang="grc";pg.append(g);
  pg.append(el("span","on-src",e.ficha.griegoEnV514
   ? tr("  Atestiguada en el texto latino de V514.")
   : tr("  Nombre histórico convencional; no es una lectura griega del códice.")));
  box.append(pg);
 }
 if(e.glosarioDelAutor){
  const pl=el("p","on-forms");
  pl.append(el("strong",null,tr("Glosario del autor: ")));
  const a=el("a",null,e.glosarioDelAutor.lemma+(e.glosarioDelAutor.graecum?" ["+e.glosarioDelAutor.graecum.join(", ")+"]":""));
  a.href="lexicon-vitruvianum.html?q="+encodeURIComponent(e.glosarioDelAutor.lemma);
  pl.append(a);box.append(pl);
 }
 const ver=el("p","on-verified");
 ver.append(el("strong",null,tr("Atestiguación textual verificada. ")));
 ver.append(document.createTextNode(
  `${e.apariciones} ${(e.apariciones===1?tr("aparición"):tr("apariciones"))} · ${e.loci.length} ${e.loci.length===1?"locus":"loci"} `+
  tr("del texto latino de V514, con las formas transcritas tal como aparecen.")));
 box.append(ver);
 if(e.ficha&&!e.ficha.autoridadProsopografica.citada){
  const pen=el("p","on-pending");
  pen.append(el("strong",null,tr("Identificación sin autoridad citada. ")));
  pen.append(document.createTextNode(e.ficha.autoridadProsopografica.nota));
  box.append(pen);
 }

 box.append(el("h4",null,tr("Loci")));
 const ul=el("ul","on-loci");
 for(const l of e.loci.slice(0,60)){
  const li=el("li"),a=el("a",null,cita(l));
  a.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(l);
  li.append(a);ul.append(li);
 }
 box.append(ul);
 if(e.loci.length>60)box.append(el("p","on-note",`${tr("Se listan 60 de")} ${e.loci.length} loci.`));

 const ap=e.aparatoQueLoMenciona||[];
 box.append(el("h4",null,tr("Glosa ecdótica")));
 if(!ap.length){
  box.append(el("p","on-note",
   tr("El aparato crítico de las ediciones no menciona este nombre en sus loci. Eso no significa que el texto sea seguro: significa que no hay nota publicada sobre él.")));
 }else{
  const g=el("div","on-gloss");
  for(const a of ap.slice(0,8)){
   const art=el("article");
   art.append(el("h5",null,(a.label||a.kind)+" · "+a.version+(a.locus?" · "+cita(a.locus):"")));
   art.append(el("p",null,(a.texto||"").slice(0,420)+((a.texto||"").length>420?"…":"")));
   const src=el("p","on-src");
   if(a.pdf){const link=el("a",null,tr("Página impresa del aparato"));link.href=a.pdf;link.rel="noopener";src.append(link)}
   art.append(src);
   g.append(art);
  }
  box.append(g);
 }
 box.append(el("p","on-method",datos.advertencia||""));
 box.append(enlaces(e));
}

function pintaCabecera(){
 const r=datos.recuentos;
 const ul=$("on-counts");ul.replaceChildren();
 const filas=[[tr("Nombres propios"),r.gruposDeNombres],[tr("Con ficha del autor"),r.conFichaRedactada],
  [tr("Con glosa ecdótica"),r.conGlosaEcdotica],[tr("Con folio del códice"),r.conFolioDelCodice],
  [tr("Voces comunes o gentilicias"),r.vocesComunesOGentilicias],[tr("Voces griegas"),r.vocesGriegas]];
 for(const [k,v] of filas){
  const li=el("li");li.append(el("b",null,v));li.append(document.createTextNode(" "+k));ul.append(li);
 }
}

function pintaAlfabeto(){
 const ul=$("on-alphabet");ul.replaceChildren();
 const disponibles=new Set(coleccion().map(e=>String(e.formaPrincipal||"").toUpperCase()[0]));
 const letras=grupo==="griegas"?GRIEGO:LATIN;
 const todas=el("li"),bt=el("button",null,tr("Todas"));
 bt.type="button";bt.dataset.letra="";
 bt.addEventListener("click",()=>{letra="";pintaAlfabeto();pintaLista()});
 todas.append(bt);ul.append(todas);
 for(const L of letras){
  const li=el("li"),b=el("button",null,L);
  b.type="button";b.dataset.letra=L;
  if(!disponibles.has(L))b.disabled=true;
  b.addEventListener("click",()=>{letra=letra===L?"":L;pintaAlfabeto();pintaLista()});
  li.append(b);ul.append(li);
 }
 for(const btn of ul.querySelectorAll("button"))btn.setAttribute("aria-pressed",String(btn.dataset.letra===letra));
}

/* El desplegable de libros dice cuántos nombres trae cada libro, para que la
   elección sea informada y no a ciegas. */
function pintaLibros(){
 const sel2=$("on-libro");if(!sel2)return;
 const base=coleccion();
 sel2.replaceChildren(new Option(tr("Todos los libros"),""));
 for(let b=1;b<=10;b++){
  const n=base.filter(e=>(e.loci||[]).some(l=>libroDe(l)===b)).length;
  if(n)sel2.append(new Option(tr("Libro")+" "+R[b]+" · "+n+" "+tr("nombres"),String(b)));
 }
}
function pintaChips(){
 const ul=$("on-chips");ul.replaceChildren();
 const opciones=[["nombres",tr("Nombres propios")],["ficha",tr("Con ficha del autor")],
  ["ecdotica",tr("Con glosa ecdótica")],["folio",tr("Con folio del códice")],
  ["comunes",tr("Voces comunes y gentilicias")],["griegas",tr("Voces griegas")]];
 for(const [id,txt] of opciones){
  const li=el("li"),b=el("button",null,txt);
  b.type="button";b.setAttribute("aria-pressed",String(grupo===id));
  b.addEventListener("click",()=>{grupo=id;letra="";sel=null;pintaChips();pintaAlfabeto();pintaLibros();pintaLista();pintaFicha()});
  li.append(b);ul.append(li);
 }
}

async function init(){
 if(!$("on-list"))return;
 try{
  const r=await fetch(URL_DATA);
  if(!r.ok)throw Error("HTTP "+r.status);
  datos=await r.json();
  if(!Array.isArray(datos.nombres))throw Error("esquema inesperado");
  pintaCabecera();pintaChips();pintaAlfabeto();pintaLibros();pintaLista();pintaFicha();traducirFijo();
  document.addEventListener("ov-locale-changed",()=>{traducirFijo();const lib=$("on-libro")?.value;
   pintaCabecera();pintaChips();pintaAlfabeto();pintaLibros();if(lib&&$("on-libro"))$("on-libro").value=lib;pintaLista();pintaFicha()});
  $("on-q")?.addEventListener("input",()=>{sel=null;pintaLista();pintaFicha()});
  $("on-nombre")?.addEventListener("change",ev=>{
   const k=ev.target.value;
   sel=k?filtradas().find(e=>e.clave===k)||null:null;
   pintaLista();pintaFicha();
   // scrollIntoView no existe en todos los entornos de prueba ni en navegadores antiguos.
   if(sel){const c=$("on-card");if(c&&typeof c.scrollIntoView==="function")c.scrollIntoView({behavior:"smooth",block:"nearest"})}
  });
  $("on-libro")?.addEventListener("change",ev=>{libro=ev.target.value;sel=null;pintaAlfabeto();pintaLista();pintaFicha()});
  $("on-clase")?.addEventListener("change",ev=>{clase=ev.target.value;sel=null;pintaAlfabeto();pintaLista();pintaFicha()});
  const q=new URLSearchParams(location.search).get("nombre");
  if(q&&$("on-q")){$("on-q").value=q;pintaLista();
   const hit=filtradas()[0];if(hit){sel=hit;pintaLista();pintaFicha()}}
 }catch(e){
  $("on-count").textContent=tr("No se pudo cargar el repertorio onomástico")+" ("+e.message+").";
 }
}
document.addEventListener("DOMContentLoaded",init,{once:true});
})();
