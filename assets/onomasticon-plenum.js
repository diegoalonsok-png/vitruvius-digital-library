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
const KIND={person:"Persona",place:"Lugar"};
const $=id=>document.getElementById(id);
const el=(t,c,txt)=>{const n=document.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=String(txt);return n};
const fold=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u");
const cita=l=>{const [b,...r]=String(l).split(".");return "Vitr. "+(R[+b]||b)+"."+r.join(".")};
const LATIN="ABCDEFGHILMNOPQRSTVXZ".split("");
const GRIEGO="ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ".split("");
let datos=null,grupo="nombres",letra="",sel=null;

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
  if(!q)return true;
  if(fold(e.formaPrincipal).includes(q))return true;
  if((e.formasAtestiguadas||[]).some(f=>fold(f.forma).includes(q)))return true;
  if(e.ficha&&(fold(e.ficha.nombre).includes(q)||(e.ficha.variantes||[]).some(v=>fold(v).includes(q))))return true;
  return false;
 });
}

function pintaLista(){
 const rows=filtradas();
 const ul=el("ul");
 for(const e of rows.slice(0,400)){
  const li=el("li"),b=el("button");
  b.type="button";
  b.setAttribute("aria-current",String(sel===e));
  const nombre=el("span","on-name",e.formaPrincipal);
  if(grupo==="griegas")nombre.lang="grc"; else nombre.lang="la";
  b.append(nombre);
  const partes=[`${e.apariciones} aparición${e.apariciones===1?"":"es"}`,`${e.loci.length} loci`];
  if(e.ficha)partes.push(KIND[e.ficha.clase]||"ficha del autor");
  if((e.aparatoQueLoMenciona||[]).length)partes.push("glosa ecdótica");
  if((e.foliosDelCodice||[]).length)partes.push("folio H");
  b.append(el("span","on-tally",partes.join(" · ")));
  b.addEventListener("click",()=>{sel=e;pintaLista();pintaFicha()});
  li.append(b);ul.append(li);
 }
 const box=$("on-list");box.replaceChildren(ul);
 $("on-count").textContent=rows.length+" entradas"+(rows.length>400?" (se listan las primeras 400)":"")+
  (letra?" en "+letra:"")+".";
 for(const btn of document.querySelectorAll("#on-alphabet button"))
  btn.setAttribute("aria-pressed",String(btn.dataset.letra===letra));
}

function enlaces(e){
 const nav=el("nav","on-links");
 const primero=e.loci[0];
 if(primero){
  const a=el("a",null,"Leer el pasaje");
  a.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(primero);
  nav.append(a);
  const b=el("a",null,"Buscar el nombre en el aparato");
  b.href="aparato-critico.html?q="+encodeURIComponent(e.formaPrincipal);
  nav.append(b);
  const c=el("a",null,"Concordancia en el Lexicon");
  c.href="vitruvia-lexicon.html?q="+encodeURIComponent(e.formaPrincipal)+"&mode=palabra&lang=la";
  nav.append(c);
 }
 for(const f of (e.foliosDelCodice||[]).slice(0,3)){
  const a=el("a",null,"Folio "+f.folio+" del códice H");
  a.href="codex-h-folios-local.html?folio="+encodeURIComponent(f.folio);
  nav.append(a);
 }
 return nav;
}

function pintaFicha(){
 const box=$("on-card");box.replaceChildren();
 if(!sel){
  box.append(el("p","on-note","Elija un nombre del repertorio para ver sus formas atestiguadas, sus loci, la glosa filológica y la glosa ecdótica."));
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

 box.append(el("h4",null,"Glosa filológica"));
 const formas=(e.formasAtestiguadas||[]).map(f=>f.forma+" ("+f.apariciones+")").join(" · ");
 const pf=el("p","on-forms");
 pf.append(el("strong",null,"Formas atestiguadas en V514: "));
 const span=el("span",null,formas);span.lang=grupo==="griegas"?"grc":"la";
 pf.append(span);
 box.append(pf);
 if(e.ficha?.nombreGriego){
  const pg=el("p","on-forms");
  pg.append(el("strong",null,"Forma griega: "));
  const g=el("span",null,e.ficha.nombreGriego);g.lang="grc";pg.append(g);
  pg.append(el("span","on-src",e.ficha.griegoEnV514
   ? "  Atestiguada en el texto latino de V514."
   : "  Nombre histórico convencional; no es una lectura griega del códice."));
  box.append(pg);
 }
 if(e.glosarioDelAutor){
  const pl=el("p","on-forms");
  pl.append(el("strong",null,"Glosario del autor: "));
  const a=el("a",null,e.glosarioDelAutor.lemma+(e.glosarioDelAutor.graecum?" ["+e.glosarioDelAutor.graecum.join(", ")+"]":""));
  a.href="lexicon-vitruvianum.html?q="+encodeURIComponent(e.glosarioDelAutor.lemma);
  pl.append(a);box.append(pl);
 }
 const ver=el("p","on-verified");
 ver.append(el("strong",null,"Atestiguación textual verificada. "));
 ver.append(document.createTextNode(
  `${e.apariciones} aparición${e.apariciones===1?"":"es"} en ${e.loci.length} ${e.loci.length===1?"locus":"loci"} `+
  "del texto latino de V514, con las formas transcritas tal como aparecen."));
 box.append(ver);
 if(e.ficha&&!e.ficha.autoridadProsopografica.citada){
  const pen=el("p","on-pending");
  pen.append(el("strong",null,"Identificación sin autoridad citada. "));
  pen.append(document.createTextNode(e.ficha.autoridadProsopografica.nota));
  box.append(pen);
 }

 box.append(el("h4",null,"Loci"));
 const ul=el("ul","on-loci");
 for(const l of e.loci.slice(0,60)){
  const li=el("li"),a=el("a",null,cita(l));
  a.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(l);
  li.append(a);ul.append(li);
 }
 box.append(ul);
 if(e.loci.length>60)box.append(el("p","on-note",`Se listan 60 de ${e.loci.length} loci.`));

 const ap=e.aparatoQueLoMenciona||[];
 box.append(el("h4",null,"Glosa ecdótica"));
 if(!ap.length){
  box.append(el("p","on-note",
   "El aparato crítico de las ediciones no menciona este nombre en sus loci. Eso no significa que el "+
   "texto sea seguro: significa que no hay nota publicada sobre él."));
 }else{
  const g=el("div","on-gloss");
  for(const a of ap.slice(0,8)){
   const art=el("article");
   art.append(el("h5",null,(a.label||a.kind)+" · "+a.version+(a.locus?" · "+cita(a.locus):"")));
   art.append(el("p",null,(a.texto||"").slice(0,420)+((a.texto||"").length>420?"…":"")));
   const src=el("p","on-src");
   if(a.pdf){const link=el("a",null,"Página impresa del aparato");link.href=a.pdf;link.rel="noopener";src.append(link)}
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
 const filas=[["Nombres propios",r.gruposDeNombres],["Con ficha del autor",r.conFichaRedactada],
  ["Con glosa ecdótica",r.conGlosaEcdotica],["Con folio del códice",r.conFolioDelCodice],
  ["Voces comunes o gentilicias",r.vocesComunesOGentilicias],["Voces griegas",r.vocesGriegas]];
 for(const [k,v] of filas){
  const li=el("li");li.append(el("b",null,v));li.append(document.createTextNode(" "+k));ul.append(li);
 }
}

function pintaAlfabeto(){
 const ul=$("on-alphabet");ul.replaceChildren();
 const disponibles=new Set(coleccion().map(e=>String(e.formaPrincipal||"").toUpperCase()[0]));
 const letras=grupo==="griegas"?GRIEGO:LATIN;
 const todas=el("li"),bt=el("button",null,"Todas");
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

function pintaChips(){
 const ul=$("on-chips");ul.replaceChildren();
 const opciones=[["nombres","Nombres propios"],["ficha","Con ficha del autor"],
  ["ecdotica","Con glosa ecdótica"],["folio","Con folio del códice"],
  ["comunes","Voces comunes y gentilicias"],["griegas","Voces griegas"]];
 for(const [id,txt] of opciones){
  const li=el("li"),b=el("button",null,txt);
  b.type="button";b.setAttribute("aria-pressed",String(grupo===id));
  b.addEventListener("click",()=>{grupo=id;letra="";sel=null;pintaChips();pintaAlfabeto();pintaLista();pintaFicha()});
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
  pintaCabecera();pintaChips();pintaAlfabeto();pintaLista();pintaFicha();
  $("on-q")?.addEventListener("input",()=>{sel=null;pintaLista();pintaFicha()});
  const q=new URLSearchParams(location.search).get("nombre");
  if(q&&$("on-q")){$("on-q").value=q;pintaLista();
   const hit=filtradas()[0];if(hit){sel=hit;pintaLista();pintaFicha()}}
 }catch(e){
  $("on-count").textContent="No se pudo cargar el repertorio onomástico ("+e.message+").";
 }
}
document.addEventListener("DOMContentLoaded",init,{once:true});
})();
