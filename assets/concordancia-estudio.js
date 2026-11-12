/* Utillaje de estudio de la Concordancia entre folios y loci.

   Añade sobre la página existente, sin reemplazar su lógica:
     · desplegable de los diez prefacios, derivado del mapa folio↔locus;
     · desplegable de voces capitales (data/index/verba-capitalia.json) que
       resalta las formas de la misma raíz en el latín y muestra la definición
       del glosario del autor con su página;
     · subrayado de las rúbricas detectadas por tinta roja sobre el facsímil;
     · lupa para leer la minúscula carolingia;
     · anchos de los tres paneles repartibles por el lector;
     · traducción de la interfaz, que antes no existía en esta página.

   El estado de la página lo gobierna concordancia-folios.js: aquí no se
   duplica: se escribe en sus propios controles y se despacha su evento, de
   modo que la sincronización de los tres paneles sigue siendo la suya. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const el=(t,p={},...hijos)=>{const n=document.createElement(t);
 for(const [k,v] of Object.entries(p)){if(k==="class")n.className=v;else if(k==="text")n.textContent=v;else n.setAttribute(k,v)}
 n.append(...hijos.filter(x=>x!=null));return n};
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];

/* ---------- Traducción de la interfaz ---------- */
const T={
 es:{prefacio:"Prefacio",elegirPref:"Elegir prefacio…",verbum:"Voz capital",
  elegirVerbum:"Elegir término…",lupa:"Lupa",lupaOn:"Lupa activa",
  pistaPref:"Los diez prefacios del tratado. Nueve tienen la rúbrica verificada sobre el facsímil; el del libro I es todavía provisional.",
  formas:"formas de la misma raíz",libros:"libros",glosario:"Glosario del autor",
  pagina:"pág.",sinDef:"Sin definición en el glosario para este idioma.",
  rubricaSi:n=>`${n} rúbrica${n===1?"":"s"} detectada${n===1?"":"s"} por color de tinta. El subrayado señala dónde hay tinta roja; no afirma qué dice.`,
  rubricaNo:"En este folio no se detectó tinta roja de rúbrica.",
  diplomatica:"Lectura semidiplomática del folio",
  anchos:"Restablecer anchos"},
 en:{prefacio:"Preface",elegirPref:"Choose a preface…",verbum:"Key term",
  elegirVerbum:"Choose a term…",lupa:"Magnifier",lupaOn:"Magnifier on",
  pistaPref:"The ten prefaces of the treatise. Nine have their rubric verified against the facsimile; Book I's is still provisional.",
  formas:"forms sharing the root",libros:"books",glosario:"Author's glossary",
  pagina:"p.",sinDef:"No glossary definition in this language.",
  rubricaSi:n=>`${n} rubric${n===1?"":"s"} detected by ink colour. The highlight marks where red ink is; it does not claim what it says.`,
  rubricaNo:"No rubric red ink was detected on this folio.",
  diplomatica:"Semi-diplomatic reading of the folio",
  anchos:"Reset widths"},
 fr:{prefacio:"Préface",elegirPref:"Choisir une préface…",verbum:"Terme capital",
  elegirVerbum:"Choisir un terme…",lupa:"Loupe",lupaOn:"Loupe active",
  pistaPref:"Les dix préfaces du traité. Neuf ont leur rubrique vérifiée sur le fac-similé ; celle du livre I reste provisoire.",
  formas:"formes de même racine",libros:"livres",glosario:"Glossaire de l'auteur",
  pagina:"p.",sinDef:"Pas de définition du glossaire dans cette langue.",
  rubricaSi:n=>`${n} rubrique${n===1?"":"s"} détectée${n===1?"":"s"} par la couleur de l'encre. Le surlignage indique où est l'encre rouge ; il n'affirme pas ce qu'elle dit.`,
  rubricaNo:"Aucune encre rouge de rubrique détectée sur ce folio.",
  diplomatica:"Lecture semi-diplomatique du folio",
  anchos:"Rétablir les largeurs"},
 la:{prefacio:"Praefatio",elegirPref:"Praefationem elige…",verbum:"Vox capitalis",
  elegirVerbum:"Vocem elige…",lupa:"Vitrum",lupaOn:"Vitrum adhibetur",
  pistaPref:"Decem praefationes operis. Novem rubricam in imagine comprobatam habent; libri I adhuc provisoria est.",
  formas:"formae eiusdem radicis",libros:"libri",glosario:"Glossarium auctoris",
  pagina:"p.",sinDef:"Definitio in hac lingua deest.",
  rubricaSi:n=>`${n} rubrica${n===1?"":"e"} colore atramenti deprehensa${n===1?"":"e"}. Linea ubi atramentum rubrum sit monstrat; quid dicat non adfirmat.`,
  rubricaNo:"In hoc folio atramentum rubrum rubricae non deprehensum est.",
  diplomatica:"Lectio semidiplomatica folii",
  anchos:"Latitudines restituere"}};
let idioma=(document.documentElement.lang||"es").slice(0,2);
if(!T[idioma])idioma="es";
const t=k=>T[idioma]?.[k]??T.es[k];

/* ---------- Datos ---------- */
let mapa=null,verba=null,diplomatica=null,vozActual=null;

async function json(u){const r=await fetch(u);if(!r.ok)throw Error("HTTP "+r.status+" en "+u);return r.json()}

/* ---------- Prefacios ---------- */
function prefaciosDelMapa(m){
 const vistos=new Map();
 for(const e of m.entries||[])
  for(const l of e.loci||[]){
   const g=/^(\d+)\.praef\.1$/.exec(l.locus);
   if(g&&!vistos.has(+g[1]))vistos.set(+g[1],{libro:+g[1],folio:e.folio,estado:l.status||e.folio_status});
  }
 return [...vistos.values()].sort((a,b)=>a.libro-b.libro);
}

/* ---------- Resalte de la voz capital ---------- */
// La raíz se compara con tolerancia i/j y u/v, como el resto del sitio, pero
// sobre el texto tal cual se muestra: se construye una clase por carácter en
// lugar de plegar la cadena, para no perder la correspondencia de posiciones.
function patron(raiz){
 const partes=[...raiz].map(c=>c==="i"||c==="j"?"[ij]":c==="u"||c==="v"?"[uv]":
  c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
 return new RegExp("\\b"+partes.join("")+"[a-zA-ZÀ-ÿ]*","gi");
}
function resaltar(caja,raiz){
 if(!caja)return 0;
 for(const m of caja.querySelectorAll("mark.ce-verbum")){
  const p=m.parentNode;p.replaceChild(document.createTextNode(m.textContent),m);p.normalize();
 }
 if(!raiz)return 0;
 const re=patron(raiz);let n=0;
 const andador=document.createTreeWalker(caja,NodeFilter.SHOW_TEXT);
 const textos=[];for(let x=andador.nextNode();x;x=andador.nextNode())textos.push(x);
 for(const nodo of textos){
  const s=nodo.nodeValue;re.lastIndex=0;
  if(!re.test(s))continue;
  re.lastIndex=0;
  const frag=document.createDocumentFragment();let i=0,g;
  while((g=re.exec(s))){
   if(g.index>i)frag.append(s.slice(i,g.index));
   frag.append(el("mark",{class:"ce-verbum",text:g[0]}));
   i=g.index+g[0].length;n++;
  }
  if(i<s.length)frag.append(s.slice(i));
  nodo.parentNode.replaceChild(frag,nodo);
 }
 return n;
}
function aplicarVoz(){
 const n=resaltar($("f-latin"),vozActual?.raiz);
 const aviso=$("ce-verbum-nota");
 if(!aviso)return;
 if(!vozActual){aviso.textContent="";return}
 const d=vozActual.definiciones?.[idioma]||vozActual.definiciones?.es||null;
 aviso.replaceChildren(
  el("b",{text:vozActual.lemma+(vozActual.graecum?.length?" · "+vozActual.graecum.join(", "):"")}),
  document.createTextNode(` ${vozActual.formas} ${t("formas")} · ${vozActual.libros.length} ${t("libros")} (${vozActual.libros.map(b=>R[b]||b).join(", ")})`
   +` · ${n} en este folio. `),
  d?el("span",{text:d.texto}):el("i",{text:t("sinDef")}),
  d?.pagina?el("a",{href:d.pdf||"#",class:"ce-pag"},document.createTextNode(` · ${d.version||""} ${t("pagina")} ${d.pagina}`)):null
 );
}

/* ---------- Subrayado de rúbricas sobre el facsímil ---------- */
let capa=null;
function montarCapa(){
 const img=$("f-image");
 if(!img||capa)return;
 const envoltorio=el("div",{class:"ce-rubrica-wrap"});
 img.parentNode.insertBefore(envoltorio,img);
 capa=el("div",{class:"ce-rubrica-layer","aria-hidden":"true"});
 envoltorio.append(img,capa);
}
function folioMostrado(){
 const sel=$("f-folio");
 const v=sel?.value||"";
 return /^\d+[rv]$/.test(v)?v:null;
}
function pintarRubricas(){
 if(!capa)return;
 capa.replaceChildren();
 const aviso=$("ce-rubrica-nota");
 const folio=folioMostrado();
 const reg=folio&&window.CodexRubrica?window.CodexRubrica.cajas(folio):null;
 if(!reg||!reg.rubricas?.length){if(aviso)aviso.textContent=folio?t("rubricaNo"):"";return}
 for(const b of reg.rubricas){
  const holgura=b.h*0.45;
  capa.append(el("span",{class:"ce-rubrica-mark",style:
   `left:${(b.x*100).toFixed(2)}%;top:${((b.y-holgura)*100).toFixed(2)}%;`+
   `width:${(b.w*100).toFixed(2)}%;height:${((b.h+holgura*2)*100).toFixed(2)}%`}));
 }
 if(aviso)aviso.textContent=t("rubricaSi")(reg.rubricas.length);
}

/* ---------- Lupa ---------- */
function montarLupa(){
 const caja=$("f-image-box"),img=$("f-image");
 if(!caja||!img)return null;
 const lente=el("div",{class:"ce-lens","aria-hidden":"true"});
 caja.append(lente);
 let activa=false;const AUMENTO=3;
 const mover=ev=>{
  if(!activa||!img.src)return;
  const r=img.getBoundingClientRect();
  const x=ev.clientX-r.left,y=ev.clientY-r.top;
  if(x<0||y<0||x>r.width||y>r.height){lente.classList.remove("ce-on");return}
  lente.classList.add("ce-on");
  const lado=lente.offsetWidth||230;
  const cajaR=caja.getBoundingClientRect();
  lente.style.left=(ev.clientX-cajaR.left-lado/2)+"px";
  lente.style.top=(ev.clientY-cajaR.top-lado/2)+"px";
  lente.style.backgroundImage=`url("${img.currentSrc||img.src}")`;
  lente.style.backgroundSize=(r.width*AUMENTO)+"px "+(r.height*AUMENTO)+"px";
  lente.style.backgroundPosition=`${-(x*AUMENTO-lado/2)}px ${-(y*AUMENTO-lado/2)}px`;
 };
 caja.addEventListener("mousemove",mover);
 caja.addEventListener("mouseleave",()=>lente.classList.remove("ce-on"));
 return {
  alternar(on){activa=on;if(!on)lente.classList.remove("ce-on")},
  get activa(){return activa}
 };
}

/* ---------- Anchos repartibles ---------- */
const CLAVE_ANCHOS="vdl:concordancia:anchos";
function montarDivisores(){
 const taller=document.querySelector(".folio-workspace");
 if(!taller||taller.querySelector(".ce-split"))return;
 const paneles=[...taller.children];
 if(paneles.length<3)return;
 let pesos=[1.05,0.98,1];
 try{const g=JSON.parse(localStorage.getItem(CLAVE_ANCHOS));if(Array.isArray(g)&&g.length===3)pesos=g}catch{}
 const pintar=()=>{taller.style.setProperty("--ce-cols",
   `${pesos[0]}fr 8px ${pesos[1]}fr 8px ${pesos[2]}fr`)};
 const divisor=i=>{
  const b=el("button",{type:"button",class:"ce-split","aria-label":
   idioma==="en"?"Drag to resize panels":idioma==="fr"?"Glisser pour redimensionner":
   idioma==="la"?"Trahe ut latitudinem mutes":"Arrastrar para repartir el ancho"});
  b.addEventListener("pointerdown",ev=>{
   ev.preventDefault();b.setPointerCapture(ev.pointerId);
   const x0=ev.clientX,ancho=taller.getBoundingClientRect().width||1;
   const a0=pesos[i],b0=pesos[i+1],total=a0+b0;
   const mover=e=>{
    const d=(e.clientX-x0)/ancho*(pesos[0]+pesos[1]+pesos[2]);
    const a=Math.min(total-0.25,Math.max(0.25,a0+d));
    pesos[i]=a;pesos[i+1]=total-a;pintar();
   };
   const soltar=()=>{
    b.removeEventListener("pointermove",mover);b.removeEventListener("pointerup",soltar);
    try{localStorage.setItem(CLAVE_ANCHOS,JSON.stringify(pesos))}catch{}
   };
   b.addEventListener("pointermove",mover);b.addEventListener("pointerup",soltar);
  });
  // Teclado: el ratón no debe ser el único modo de repartir el ancho.
  b.addEventListener("keydown",ev=>{
   const paso=ev.key==="ArrowLeft"?-0.06:ev.key==="ArrowRight"?0.06:0;
   if(!paso)return;ev.preventDefault();
   const total=pesos[i]+pesos[i+1];
   pesos[i]=Math.min(total-0.25,Math.max(0.25,pesos[i]+paso));pesos[i+1]=total-pesos[i];
   pintar();try{localStorage.setItem(CLAVE_ANCHOS,JSON.stringify(pesos))}catch{}
  });
  return b;
 };
 paneles[0].after(divisor(0));
 paneles[1].after(divisor(1));
 pintar();
 return ()=>{pesos=[1.05,0.98,1];pintar();try{localStorage.removeItem(CLAVE_ANCHOS)}catch{}};
}

/* ---------- Lectura semidiplomática ---------- */
function pintarDiplomatica(){
 const destino=$("ce-diplomatica");
 if(!destino)return;
 const folio=folioMostrado();
 const lect=folio&&lecturas[folio];
 const fuente=lect||(diplomatica&&diplomatica.folio===folio?diplomatica:null);
 if(!fuente){destino.hidden=true;
  if(folio&&!(folio in lecturas)){lecturas[folio]=null;
   json("data/codex-h/lecturas/"+folio+".json").then(j=>{lecturas[folio]=j;pintarDiplomatica()}).catch(()=>{})}
  return}
 pintarLectura(destino,fuente);
}
const lecturas={};
function pintarLectura(destino,diplomatica){
 destino.hidden=false;
 // rubric_lines es el NUMERO de lineas iniciales escritas en rubrica, no una
 // lista: en f.1r vale 2, y coincide con las dos bandas de tinta roja que
 // detecto el analisis de color. Son dos metodos independientes de acuerdo.
 const cuantas=Number(diplomatica.rubric_lines)||0;
 destino.replaceChildren(el("b",{text:t("diplomatica")+" · f. "+diplomatica.folio+" · "+diplomatica.status}));
 (diplomatica.lines||[]).forEach((linea,i)=>{
  destino.append(el("span",{class:i<cuantas?"ce-rubrica-linea":""},document.createTextNode(linea)),
   document.createTextNode("\n"));
 });
 const c=diplomatica.cotejo;
 if(c)destino.append(el("small",{class:"ce-cotejo",text:
  `Cotejo con V514: ${Math.round(c.coincidenciaConV514*1000)/10} % de coincidencia · `+
  `entra en ${c.entrada.locus} («${c.entrada.palabra}») y sale en ${c.salida.locus} («${c.salida.palabra}») · loci ${c.loci.join(", ")}`}));
 const dif=diplomatica.lecturasARevisar||[];
 if(dif.length){
  destino.append(el("b",{text:"Lecturas a revisar ("+dif.length+")"}));
  for(const x of dif)destino.append(el("span",{class:"ce-dif",text:
   `${x.locus}  H ${x.H||"—"}  ·  V514 ${x.V514||"—"}\n`}));
  if(diplomatica.aviso)destino.append(el("small",{class:"ce-cotejo",text:diplomatica.aviso}));
 }
}

/* ---------- Montaje ---------- */
async function init(){
 if(!$("f-folio"))return;
 montarCapa();
 const lupa=montarLupa();
 const restablecer=montarDivisores();

 const barra=el("div",{class:"ce-bar",role:"region","aria-label":
  idioma==="en"?"Study tools":idioma==="fr"?"Outils d'étude":idioma==="la"?"Instrumenta studii":"Utillaje de estudio"});
 const selPref=el("select",{id:"ce-praef"});
 const selVoz=el("select",{id:"ce-verbum"});
 const btnLupa=el("button",{type:"button",id:"ce-lupa","aria-pressed":"false",text:t("lupa")});
 barra.append(
  el("label",{for:"ce-praef"},document.createTextNode(t("prefacio")),selPref),
  el("label",{for:"ce-verbum"},document.createTextNode(t("verbum")),selVoz),
  btnLupa,
  el("p",{class:"ce-hint",id:"ce-rubrica-nota"}));
 document.querySelector(".folio-workspace").before(barra);
 const notaVoz=el("p",{class:"ce-hint",id:"ce-verbum-nota"});
 barra.append(notaVoz);
 if(restablecer){
  const b=el("button",{type:"button",text:t("anchos")});
  b.addEventListener("click",restablecer);barra.append(b);
 }
 // La lectura semidiplomática se coloca bajo la imagen, en su propio panel.
 $("f-image-box")?.after(el("pre",{class:"ce-diplomatica",id:"ce-diplomatica",hidden:"hidden"}));

 btnLupa.addEventListener("click",()=>{
  const on=btnLupa.getAttribute("aria-pressed")!=="true";
  btnLupa.setAttribute("aria-pressed",String(on));
  btnLupa.textContent=on?t("lupaOn"):t("lupa");
  lupa?.alternar(on);
 });

 // Datos: cada uno es opcional, y su ausencia no debe tumbar el resto.
 const [m,v,d]=await Promise.allSettled([
  json("data/codex-h/folio-locus-map.json"),
  json("data/index/verba-capitalia.json"),
  json("data/codex-h/folio-1r.json")]);
 if(m.status==="fulfilled"){
  mapa=m.value;
  selPref.append(el("option",{value:"",text:t("elegirPref")}));
  for(const p of prefaciosDelMapa(mapa)){
   const marca=p.estado==="visual_rubric"?"✓":"·";
   selPref.append(el("option",{value:p.folio,
    text:`${marca} ${t("prefacio")} ${R[p.libro]||p.libro} · f. ${p.folio}`}));
  }
  const pista=$("ce-rubrica-nota");if(pista&&!pista.textContent)pista.textContent=t("pistaPref");
 }
 if(v.status==="fulfilled"){
  verba=v.value;
  selVoz.append(el("option",{value:"",text:t("elegirVerbum")}));
  for(const voz of verba.voces||[])
   selVoz.append(el("option",{value:voz.clave,
    text:(voz.parsArchitecturae?"◆ ":"")+voz.lemma.toLowerCase()+" ("+voz.formas+")"}));
 }
 if(d.status==="fulfilled")diplomatica=d.value;

 // El prefacio escribe en el propio selector de folio de la página: así los
 // tres paneles se sincronizan con su lógica, no con una copia de ella.
 selPref.addEventListener("change",()=>{
  const folio=selPref.value;if(!folio)return;
  const sel=$("f-folio");
  if(![...sel.options].some(o=>o.value===folio)){
   $("ce-rubrica-nota").textContent="El folio "+folio+" no figura en el selector de la página.";return;
  }
  sel.value=folio;
  sel.dispatchEvent(new Event("change",{bubbles:true}));
 });
 selVoz.addEventListener("change",()=>{
  vozActual=(verba?.voces||[]).find(x=>x.clave===selVoz.value)||null;
  aplicarVoz();
 });

 try{await window.CodexRubrica?.cargar()}catch(e){
  const n=$("ce-rubrica-nota");if(n)n.textContent="No se pudo cargar la detección de rúbricas ("+e.message+").";
 }
 const refrescar=()=>{pintarRubricas();pintarDiplomatica();aplicarVoz()};
 refrescar();
 $("f-folio").addEventListener("change",()=>setTimeout(refrescar,0));
 // Los paneles los repinta la página al cambiar de locus o de idioma: se
 // observa el latín para volver a aplicar el resalte sobre el texto nuevo.
 const latino=$("f-latin");
 if(latino&&window.MutationObserver){
  let propio=false;
  new MutationObserver(()=>{if(propio)return;propio=true;
   setTimeout(()=>{aplicarVoz();propio=false},0)}).observe(latino,{childList:true,subtree:true});
 }
 await cargarI18n();
 document.addEventListener("vitruvius:language-changed",()=>setTimeout(traducir,0));
 // El control global pudo anunciar el idioma antes de que este módulo
 // escuchara: se lee el idioma vigente al terminar de montar.
 traducir();
 setTimeout(traducir,300);
}

/* Cadenas de la página: data/i18n/concordancia-folios.json. Sólo interfaz; los
   visores (latín y traducciones del autor) no se tocan. En castellano se
   restituye el HTML original, con sus cursivas y negritas. */
let paginaI18n=null;
async function cargarI18n(){
 try{paginaI18n=(await json("data/i18n/concordancia-folios.json")).cadenas||{}}catch{paginaI18n={}}
}
function idiomaActual(){
 const l=(document.documentElement.lang||"es").slice(0,2);
 return T[l]?l:"es";
}
function traducirPagina(){
 if(!paginaI18n)return;
 for(const n of document.querySelectorAll("[data-ce-i18n]")){
  if(!n.hasAttribute("data-ce-orig"))n.setAttribute("data-ce-orig",n.innerHTML);
  const entrada=paginaI18n[n.getAttribute("data-ce-i18n")];
  if(idioma==="es"||!entrada||!entrada[idioma])n.innerHTML=n.getAttribute("data-ce-orig");
  else n.textContent=entrada[idioma];
 }
}

/* Traduce lo que esta página no tenía traducido: sus propios rótulos. */
function traducir(){
 idioma=idiomaActual();
 traducirPagina();
 const etiquetas=document.querySelectorAll(".ce-bar label");
 if(etiquetas[0]?.firstChild)etiquetas[0].firstChild.nodeValue=t("prefacio");
 if(etiquetas[1]?.firstChild)etiquetas[1].firstChild.nodeValue=t("verbum");
 const p0=$("ce-praef");
 if(p0)[...p0.options].slice(1).forEach(o=>{o.textContent=o.textContent.replace(/^([✓·] )\S+/,"$1"+t("prefacio"))});
 const b=$("ce-lupa");
 if(b)b.textContent=b.getAttribute("aria-pressed")==="true"?t("lupaOn"):t("lupa");
 const p=$("ce-praef");
 if(p&&p.options.length)p.options[0].textContent=t("elegirPref");
 const v=$("ce-verbum");
 if(v&&v.options.length)v.options[0].textContent=t("elegirVerbum");
 pintarRubricas();pintarDiplomatica();aplicarVoz();
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
})();
