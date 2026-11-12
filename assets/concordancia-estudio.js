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
 es:{compartir:"Enviar o guardar este pasaje",correo:"Correo",anterior:"Ocurrencia anterior",siguiente:"Ocurrencia siguiente",latin:"latín",traduccion:"traducción",enFacsimil:"en el facsímil",noEnFolio:"no figura en la lectura de este folio",sinLectura:"facsímil: folio sin lectura todavía",zoomMenos:"Alejar",zoomMas:"Acercar",zoomRest:"Volver al 100 %",aumento:"Aumento de la lupa",invertir:"Invertir",contraste:"Contraste",brillo:"Brillo",restablecer:"Restablecer",herramientasVisor:"Herramientas del visor",locus:"Locus",elegirLocus:"Elegir locus…",libro:"Libro",prefacio:"Prefacio",elegirPref:"Elegir prefacio…",verbum:"Voz capital",
  elegirVerbum:"Elegir término…",lupa:"Lupa",lupaOn:"Lupa activa",
  pistaPref:"Los diez prefacios del tratado. Nueve tienen la rúbrica verificada sobre el facsímil; el del libro I es todavía provisional.",
  formas:"formas de la misma raíz",libros:"libros",glosario:"Glosario del autor",
  pagina:"pág.",sinDef:"Sin definición en el glosario para este idioma.",
  rubricaSi:n=>`${n} rúbrica${n===1?"":"s"} detectada${n===1?"":"s"} por color de tinta. El subrayado señala dónde hay tinta roja; no afirma qué dice.`,
  rubricaNo:"En este folio no se detectó tinta roja de rúbrica.",
  diplomatica:"Lectura semidiplomática del folio",
  anchos:"Restablecer anchos"},
 en:{compartir:"Send or save this passage",correo:"Email",anterior:"Previous occurrence",siguiente:"Next occurrence",latin:"Latin",traduccion:"translation",enFacsimil:"on the facsimile",noEnFolio:"not in this folio's reading",sinLectura:"facsimile: folio not yet read",zoomMenos:"Zoom out",zoomMas:"Zoom in",zoomRest:"Back to 100 %",aumento:"Magnifier power",invertir:"Invert",contraste:"Contrast",brillo:"Brightness",restablecer:"Reset",herramientasVisor:"Viewer tools",locus:"Locus",elegirLocus:"Choose a locus…",libro:"Book",prefacio:"Preface",elegirPref:"Choose a preface…",verbum:"Key term",
  elegirVerbum:"Choose a term…",lupa:"Magnifier",lupaOn:"Magnifier on",
  pistaPref:"The ten prefaces of the treatise. Nine have their rubric verified against the facsimile; Book I's is still provisional.",
  formas:"forms sharing the root",libros:"books",glosario:"Author's glossary",
  pagina:"p.",sinDef:"No glossary definition in this language.",
  rubricaSi:n=>`${n} rubric${n===1?"":"s"} detected by ink colour. The highlight marks where red ink is; it does not claim what it says.`,
  rubricaNo:"No rubric red ink was detected on this folio.",
  diplomatica:"Semi-diplomatic reading of the folio",
  anchos:"Reset widths"},
 fr:{compartir:"Envoyer ou enregistrer ce passage",correo:"Courriel",anterior:"Occurrence précédente",siguiente:"Occurrence suivante",latin:"latin",traduccion:"traduction",enFacsimil:"sur le fac-similé",noEnFolio:"absent de la lecture de ce folio",sinLectura:"fac-similé : folio pas encore lu",zoomMenos:"Dézoomer",zoomMas:"Zoomer",zoomRest:"Revenir à 100 %",aumento:"Grossissement de la loupe",invertir:"Inverser",contraste:"Contraste",brillo:"Luminosité",restablecer:"Réinitialiser",herramientasVisor:"Outils de la visionneuse",locus:"Locus",elegirLocus:"Choisir un locus…",libro:"Livre",prefacio:"Préface",elegirPref:"Choisir une préface…",verbum:"Terme capital",
  elegirVerbum:"Choisir un terme…",lupa:"Loupe",lupaOn:"Loupe active",
  pistaPref:"Les dix préfaces du traité. Neuf ont leur rubrique vérifiée sur le fac-similé ; celle du livre I reste provisoire.",
  formas:"formes de même racine",libros:"livres",glosario:"Glossaire de l'auteur",
  pagina:"p.",sinDef:"Pas de définition du glossaire dans cette langue.",
  rubricaSi:n=>`${n} rubrique${n===1?"":"s"} détectée${n===1?"":"s"} par la couleur de l'encre. Le surlignage indique où est l'encre rouge ; il n'affirme pas ce qu'elle dit.`,
  rubricaNo:"Aucune encre rouge de rubrique détectée sur ce folio.",
  diplomatica:"Lecture semi-diplomatique du folio",
  anchos:"Rétablir les largeurs"},
 la:{compartir:"Hunc locum mittere aut servare",correo:"Epistula",anterior:"Locus prior",siguiente:"Locus sequens",latin:"Latine",traduccion:"translatio",enFacsimil:"in imagine",noEnFolio:"in lectione huius folii deest",sinLectura:"imago: folium nondum lectum",zoomMenos:"Minuere",zoomMas:"Augere",zoomRest:"Ad centesimam redire",aumento:"Vis vitri",invertir:"Colores invertere",contraste:"Discrimen",brillo:"Lux",restablecer:"Restituere",herramientasVisor:"Instrumenta speculi",locus:"Locus",elegirLocus:"Locum elige…",libro:"Liber",prefacio:"Praefatio",elegirPref:"Praefationem elige…",verbum:"Vox capitalis",
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
const CLASES={a:"[aàáâäã]",e:"[eèéêë]",i:"[iíìîïj]",j:"[iíìîïj]",o:"[oóòôöõ]",u:"[uúùûüv]",v:"[uúùûüv]",c:"[cç]",n:"[nñ]"};
function patron(raices){
 const lista=(Array.isArray(raices)?raices:[raices]).filter(Boolean);
 const alt=lista.map(r=>[...r].map(c=>CLASES[c]||c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join(""));
 return new RegExp("(?<![A-Za-zÀ-ÿ])(?:"+alt.join("|")+")[A-Za-zÀ-ÿ]*","gi");
}
function resaltar(caja,raiz){ /* raiz: una raíz o lista de raíces */
 if(!caja)return 0;
 for(const m of caja.querySelectorAll("mark.ce-verbum")){
  const p=m.parentNode;p.replaceChild(document.createTextNode(m.textContent),m);p.normalize();
 }
 if(!raiz||(Array.isArray(raiz)&&!raiz.length))return 0;
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
let ocIdx=0,indiceLecturas={};
const plegarL=x=>String(x||"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u");
function ocurrencias(){return vozActual?.ocurrencias||[]}
function equivalentes(){
 const lang=$("f-lang")?.value||"es";
 return (vozActual?.equivalentes?.[lang]||[]).map(x=>x.raiz||x);
}
/* Subrayado en el facsímil: sólo en folios leídos, sobre el renglón donde la
   lectura sitúa la forma; la posición dentro del renglón es proporcional al
   número de letras, por tanto aproximada. */
function marcarFacsimil(){
 if(!capa)return 0;
 for(const m of capa.querySelectorAll(".ce-verbum-mark"))m.remove();
 const folio=folioMostrado(),lect=folio&&lecturas[folio];
 if(!vozActual||!lect||!lect.lineas?.length)return 0;
 const re=new RegExp("(?<![a-z])"+vozActual.raiz+"[a-z]*","g");let n=0;
 lect.lines.forEach((linea,i)=>{
  const caja=lect.lineas[i];if(!caja)return;
  const t=plegarL(linea),L=t.length||1;let g;re.lastIndex=0;
  while((g=re.exec(t))){
   const x=caja.x+caja.w*(g.index/L),w=Math.max(caja.w*(g[0].length/L),0.03);
   capa.append(el("span",{class:"ce-verbum-mark",title:g[0]+" · renglón "+(i+1),style:
    `left:${((x-0.006)*100).toFixed(2)}%;top:${(caja.y*100).toFixed(2)}%;width:${((w+0.012)*100).toFixed(2)}%;height:${(caja.h*100).toFixed(2)}%`}));
   n++;
  }
 });
 return n;
}
let observadorLatin=null;
function aplicarVoz(){
 observadorLatin?.disconnect();
 const nLat=resaltar($("f-latin"),vozActual?.raiz);
 const nTra=resaltar($("f-translation"),vozActual?equivalentes():null);
 if(observadorLatin){observadorLatin.takeRecords();observadorLatin.observe($("f-latin"),{childList:true,subtree:true})}
 const nFac=marcarFacsimil();
 const aviso=$("ce-verbum-nota");
 if(!aviso)return;
 if(!vozActual){aviso.replaceChildren();aviso.hidden=true;return}
 aviso.hidden=false;
 const oc=ocurrencias(),locus=$("ce-locus")?.value||"";
 const k=oc.findIndex(o=>o.locus===locus);if(k>=0)ocIdx=k;
 const d=vozActual.definiciones?.[idioma]||vozActual.definiciones?.es||null;
 const prev=el("button",{type:"button",class:"ce-oc-btn","aria-label":t("anterior"),title:t("anterior"),text:"◀"});
 const next=el("button",{type:"button",class:"ce-oc-btn","aria-label":t("siguiente"),title:t("siguiente"),text:"▶"});
 prev.addEventListener("click",()=>irOcurrencia(ocIdx-1));next.addEventListener("click",()=>irOcurrencia(ocIdx+1));
 const lect=lecturas[folioMostrado()];
 const fac=lect?.lineas?.length?(nFac?`${nFac} ${t("enFacsimil")}`:t("noEnFolio")):t("sinLectura");
 const equiv=equivalentes();
 aviso.replaceChildren(
  el("div",{class:"ce-oc-nav"},prev,
   el("span",{class:"ce-oc-pos",text:`${k>=0?k+1:"–"} / ${oc.length} · ${locus||"—"}`}),next,
   el("span",{class:"ce-oc-cuenta",text:`${t("latin")} ${nLat} · ${t("traduccion")} ${nTra}${equiv.length?" ("+equiv.map(r=>r+"…").join(", ")+")":""} · ${fac}`})),
  el("p",{class:"ce-oc-def"},
   el("b",{text:vozActual.lemma+(vozActual.graecum?.length?" · "+vozActual.graecum.join(", "):"")}),
   document.createTextNode(` ${vozActual.formas} ${t("formas")} · ${vozActual.libros.length} ${t("libros")} (${vozActual.libros.map(b=>R[b]||b).join(", ")}). `),
   d?el("span",{text:d.texto}):el("i",{text:t("sinDef")}),
   d?.pagina?el("a",{href:d.pdf||"#",class:"ce-pag",target:"_blank",rel:"noopener"},document.createTextNode(` · ${d.version||""} ${t("pagina")} ${d.pagina}`)):null));
}
function irOcurrencia(i){
 const oc=ocurrencias();if(!oc.length)return;
 ocIdx=(i+oc.length)%oc.length;
 document.dispatchEvent(new CustomEvent("concordancia:ir-a-locus",{detail:{locus:oc[ocIdx].locus}}));
}
/* Al elegir la voz: si el pasaje en pantalla ya la contiene, se queda; si no,
   va a la primera ocurrencia, prefiriendo un folio leído (donde también se
   subraya en el facsímil). */
function buscarVoz(){
 const oc=ocurrencias();if(!oc.length){aplicarVoz();return}
 const enPantalla=oc.findIndex(o=>o.locus===($("ce-locus")?.value||""));
 if(enPantalla>=0||resaltar($("f-latin"),vozActual.raiz)>0){aplicarVoz();return}
 const leidos=new Set(Object.values(indiceLecturas).flatMap(f=>f.loci||[]));
 const pref=oc.findIndex(o=>leidos.has(o.locus));
 irOcurrencia(pref>=0?pref:0);
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
let folioAnunciado=null;
function folioMostrado(){
 if(folioAnunciado)return folioAnunciado;
 const v=$("f-folio")?.value||"";
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

/* ---------- Visor I: lupa, zoom, inversión, contraste, brillo ---------- */
const CLAVE_VISOR="vdl:concordancia:visor";
let ajustes={zoom:100,aumento:3,invertir:false,contraste:100,brillo:100};
try{const g=JSON.parse(localStorage.getItem(CLAVE_VISOR));if(g&&typeof g==="object")ajustes={...ajustes,...g}}catch{}
const guardarVisor=()=>{try{localStorage.setItem(CLAVE_VISOR,JSON.stringify(ajustes))}catch{}};
const filtro=()=>`${ajustes.invertir?"invert(1) ":""}contrast(${ajustes.contraste}%) brightness(${ajustes.brillo}%)`;
function aplicarVisor(){
 const img=$("f-image"),wrap=img?.closest(".ce-rubrica-wrap");
 if(img)img.style.filter=filtro();
 if(wrap)wrap.style.width=ajustes.zoom+"%";
 const lente=document.querySelector(".ce-lens");if(lente)lente.style.filter=filtro();
 const z=$("ce-zoom-val");if(z)z.textContent=ajustes.zoom+" %";
 const inv=$("ce-invertir");if(inv)inv.setAttribute("aria-pressed",String(ajustes.invertir));
 const c=$("ce-contraste");if(c)c.value=ajustes.contraste;
 const b=$("ce-brillo");if(b)b.value=ajustes.brillo;
 const a=$("ce-aumento");if(a)a.value=String(ajustes.aumento);
}
function montarLupa(){
 const caja=$("f-image-box"),img=$("f-image");
 if(!caja||!img)return null;
 const lente=el("div",{class:"ce-lens","aria-hidden":"true"});
 caja.append(lente);
 let activa=false;
 const mover=ev=>{
  if(!activa||!img.src)return;
  const r=img.getBoundingClientRect();
  const x=ev.clientX-r.left,y=ev.clientY-r.top;
  if(x<0||y<0||x>r.width||y>r.height){lente.classList.remove("ce-on");return}
  lente.classList.add("ce-on");
  const A=ajustes.aumento,lado=lente.offsetWidth||230;
  const cajaR=caja.getBoundingClientRect();
  lente.style.left=(ev.clientX-cajaR.left+caja.scrollLeft-lado/2)+"px";
  lente.style.top=(ev.clientY-cajaR.top+caja.scrollTop-lado/2)+"px";
  lente.style.backgroundImage=`url("${img.currentSrc||img.src}")`;
  lente.style.backgroundSize=(r.width*A)+"px "+(r.height*A)+"px";
  lente.style.backgroundPosition=`${-(x*A-lado/2)}px ${-(y*A-lado/2)}px`;
 };
 caja.addEventListener("mousemove",mover);
 caja.addEventListener("mouseleave",()=>lente.classList.remove("ce-on"));
 return {alternar(on){activa=on;caja.classList.toggle("ce-lupa-on",on);if(!on)lente.classList.remove("ce-on")},get activa(){return activa}};
}
function montarHerramientasVisor(lupa){
 const caja=$("f-image-box");if(!caja||$("ce-visor-tools"))return;
 const b=(id,txt,titulo)=>el("button",{type:"button",id,title:titulo,"aria-label":titulo,text:txt});
 const menos=b("ce-zoom-menos","−",t("zoomMenos")),mas=b("ce-zoom-mas","+",t("zoomMas"));
 const val=el("button",{type:"button",id:"ce-zoom-val",title:t("zoomRest"),"aria-label":t("zoomRest"),text:ajustes.zoom+" %"});
 const btnLupa=el("button",{type:"button",id:"ce-lupa","aria-pressed":"false",text:t("lupa")});
 const aumento=el("select",{id:"ce-aumento","aria-label":t("aumento"),title:t("aumento")});
 for(const n of [2,3,4,6])aumento.append(el("option",{value:String(n),text:"×"+n}));
 const inv=el("button",{type:"button",id:"ce-invertir","aria-pressed":"false",text:t("invertir")});
 const rango=(id,min,max,clave)=>{const r=el("input",{type:"range",id,min:String(min),max:String(max),step:"5","aria-label":t(clave)});
  return [el("label",{class:"ce-rango","data-ce-rot":clave},document.createTextNode(t(clave)),r),r]};
 const [lc,cont]=rango("ce-contraste",50,250,"contraste");
 const [lb,bri]=rango("ce-brillo",50,200,"brillo");
 const rest=b("ce-visor-rest",t("restablecer"),t("restablecer"));
 const barra=el("div",{class:"ce-visor-tools",id:"ce-visor-tools",role:"toolbar","aria-label":t("herramientasVisor")},
  el("span",{class:"ce-grupo"},menos,val,mas),el("span",{class:"ce-grupo"},btnLupa,aumento),inv,lc,lb,rest);
 caja.before(barra);
 const zoom=d=>{ajustes.zoom=Math.max(100,Math.min(400,ajustes.zoom+d));aplicarVisor();guardarVisor()};
 menos.addEventListener("click",()=>zoom(-25));mas.addEventListener("click",()=>zoom(25));
 val.addEventListener("click",()=>{ajustes.zoom=100;aplicarVisor();guardarVisor()});
 btnLupa.addEventListener("click",()=>{const on=btnLupa.getAttribute("aria-pressed")!=="true";
  btnLupa.setAttribute("aria-pressed",String(on));btnLupa.textContent=on?t("lupaOn"):t("lupa");lupa?.alternar(on)});
 aumento.addEventListener("change",()=>{ajustes.aumento=+aumento.value;guardarVisor()});
 inv.addEventListener("click",()=>{ajustes.invertir=!ajustes.invertir;aplicarVisor();guardarVisor()});
 cont.addEventListener("input",()=>{ajustes.contraste=+cont.value;aplicarVisor();guardarVisor()});
 bri.addEventListener("input",()=>{ajustes.brillo=+bri.value;aplicarVisor();guardarVisor()});
 rest.addEventListener("click",()=>{ajustes={zoom:100,aumento:3,invertir:false,contraste:100,brillo:100};aplicarVisor();guardarVisor()});
 aplicarVisor();
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
   `${pesos[0]}fr 14px ${pesos[1]}fr 14px ${pesos[2]}fr`)};
 const divisor=i=>{
  const b=el("button",{type:"button",class:"ce-split","aria-label":
   idioma==="en"?"Drag to resize panels":idioma==="fr"?"Glisser pour redimensionner":
   idioma==="la"?"Trahe ut latitudinem mutes":"Arrastrar para repartir el ancho"});
  b.addEventListener("dblclick",()=>{pesos=[1.05,0.98,1];pintar();try{localStorage.removeItem(CLAVE_ANCHOS)}catch{}});
  b.addEventListener("pointerdown",ev=>{
   ev.preventDefault();b.setPointerCapture?.(ev.pointerId);
   const x0=ev.clientX,ancho=taller.getBoundingClientRect().width||1;
   const a0=pesos[i],b0=pesos[i+1],total=a0+b0;
   const mover=e=>{
    const d=(e.clientX-x0)/ancho*(pesos[0]+pesos[1]+pesos[2]);
    const a=Math.min(total-0.36,Math.max(0.36,a0+d));
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
   pesos[i]=Math.min(total-0.36,Math.max(0.36,pesos[i]+paso));pesos[i+1]=total-pesos[i];
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
   json("data/codex-h/lecturas/"+folio+".json").then(j=>{lecturas[folio]=j;pintarDiplomatica();aplicarVoz()}).catch(()=>{})}
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

/* El idioma y el tema los monta secondary-reader-controls.js en una caja
   flotante aparte; se trae a la botonera para que todo quede en una línea. */
function adoptarControles(){
 const destino=document.querySelector(".ce-tools");
 if(!destino)return;
 const traer=()=>{
  const tb=document.getElementById("vitruvius-secondary-toolbar");
  if(tb&&tb.parentNode!==destino){destino.append(tb);document.body.classList.remove("vitruvius-secondary-controls")}
  const aa=document.querySelector(".site-typeface-tool");
  if(aa&&aa.parentNode!==destino)destino.append(aa);
  return !!tb;
 };
 if(traer()&&document.querySelector(".ce-tools .site-typeface-tool"))return;
 const obs=new MutationObserver(()=>{traer()});
 obs.observe(document.body,{childList:true,subtree:true});
 setTimeout(()=>obs.disconnect(),8000);
}

/* ---------- Compartir: correo, PDF, WhatsApp ----------
   Comparte lo que está en pantalla: cita (locus y folio de H con su grado),
   latín V514, traducción elegida y enlace permanente al pasaje. */
function pasajeActual(){
 const locus=$("ce-locus")?.value||"";
 const folio=folioMostrado();
 const grado=($("f-evidence")?.textContent||"").replace(/\s+/g," ").trim();
 const textos=sel=>[...document.querySelectorAll(sel+" p")].map(n=>n.textContent.trim()).filter(Boolean).join("\n\n");
 const latin=textos("#f-latin"),trad=textos("#f-translation");
 const lengua=$("f-lang")?.selectedOptions?.[0]?.textContent||"";
 const u=new URL(location.pathname,location.origin);
 if(locus)u.searchParams.set("locus",locus);else if(folio)u.searchParams.set("folio",folio);
 const [b,...r]=locus.split(".");
 const cita=locus?"Vitr. "+(R[+b]||b)+"."+r.join("."):"";
 return {locus,folio,grado,latin,trad,lengua,url:u.href,cita};
}
const corta=(x,n)=>x.length>n?x.slice(0,n).replace(/\s+\S*$/,"")+" […]":x;
function mensaje(max){
 const p=pasajeActual();
 return [`${p.cita||"Vitruvio, De architectura"}${p.folio?" · Harley MS 2767, f. "+p.folio:""}`,
  "",corta(p.latin,max),"",`${p.lengua}:`,corta(p.trad,max),"",p.url,
  "— Concordancia entre folios y loci · Vitruvius Digital Library (Diego Kurilo)"].join("\n");
}
function compartirCorreo(){
 const p=pasajeActual();
 location.href="mailto:?subject="+encodeURIComponent(`${p.cita||"De architectura"}${p.folio?" · H f. "+p.folio:""} — Vitruvius Digital Library`)
  +"&body="+encodeURIComponent(mensaje(700));
}
function compartirWhatsApp(){
 window.open("https://wa.me/?text="+encodeURIComponent(mensaje(600)),"_blank","noopener");
}
function compartirPDF(){
 const p=pasajeActual();
 document.documentElement.dataset.ceImprimir="1";
 const pie=$("ce-print-pie");
 if(pie)pie.textContent=`${p.cita}${p.folio?" · Harley MS 2767, f. "+p.folio:""} · ${p.grado} · ${p.url} · ${new Date().toLocaleDateString()}`;
 const fin=()=>{delete document.documentElement.dataset.ceImprimir;window.removeEventListener("afterprint",fin)};
 window.addEventListener("afterprint",fin);
 window.print();
 setTimeout(fin,60000);
}
function montarCompartir(){
 const taller=document.querySelector(".folio-workspace");
 if(!taller||$("ce-compartir"))return;
 const btn=(id,clase,txt,fn,svg)=>{const b=el("button",{type:"button",id,class:"ce-share "+clase});
  b.innerHTML=svg;b.append(el("span",{"data-ce-share":id,text:txt}));b.addEventListener("click",fn);return b};
 const barra=el("div",{class:"ce-compartir",id:"ce-compartir",role:"group","aria-label":t("compartir")},
  el("span",{class:"ce-compartir-rot","data-ce-share":"rot",text:t("compartir")}),
  btn("ce-mail","ce-mail",t("correo"),compartirCorreo,'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>'),
  btn("ce-pdf","ce-pdf","PDF",compartirPDF,'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9.5 13h5M9.5 16.5h5"/></svg>'),
  btn("ce-wa","ce-wa","WhatsApp",compartirWhatsApp,'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 20l1.4-4.1A8 8 0 1 1 8.3 18.7z"/><path d="M9 9.5c.3 2 2 3.8 4.2 4.4l1.1-1.1 1.7.9-.5 1.6c-3.3.2-6.9-3.3-6.8-6.6l1.6-.5.9 1.7z"/></svg>'));
 taller.after(barra);
 barra.after(el("p",{class:"ce-print-pie",id:"ce-print-pie"}));
}

/* ---------- Montaje ---------- */
async function init(){
 adoptarControles();
 if(!$("f-folio"))return;
 montarCapa();
 const lupa=montarLupa();
 const restablecer=montarDivisores();

 const barra=el("div",{class:"ce-bar",role:"region","aria-label":
  idioma==="en"?"Study tools":idioma==="fr"?"Outils d'étude":idioma==="la"?"Instrumenta studii":"Utillaje de estudio"});
 const selLocus=el("select",{id:"ce-locus"});
 const selPref=el("select",{id:"ce-praef"});
 const selVoz=el("select",{id:"ce-verbum"});
 barra.append(
  el("label",{for:"ce-locus","data-ce-rot":"locus"},document.createTextNode(t("locus")),selLocus),
  el("label",{for:"ce-praef","data-ce-rot":"prefacio"},document.createTextNode(t("prefacio")),selPref),
  el("label",{for:"ce-verbum","data-ce-rot":"verbum"},document.createTextNode(t("verbum")),selVoz),
  el("p",{class:"ce-hint",id:"ce-rubrica-nota"}));
 document.querySelector(".folio-workspace").before(barra);
 const notaVoz=el("div",{class:"ce-verbum-panel",id:"ce-verbum-nota",hidden:"hidden"});
 barra.append(notaVoz);
 if(restablecer){
  const b=el("button",{type:"button",text:t("anchos")});
  b.addEventListener("click",restablecer);barra.append(b);
 }
 // La lectura semidiplomática se coloca bajo la imagen, en su propio panel.
 $("f-image-box")?.after(el("pre",{class:"ce-diplomatica",id:"ce-diplomatica",hidden:"hidden"}));

 montarHerramientasVisor(lupa);
 montarCompartir();

 // Datos: cada uno es opcional, y su ausencia no debe tumbar el resto.
 const [m,v,d,li]=await Promise.allSettled([
  json("data/codex-h/folio-locus-map.json"),
  json("data/index/verba-capitalia.json"),
  json("data/codex-h/folio-1r.json"),
  json("data/index/loci.json")]);
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
 try{indiceLecturas=(await json("data/codex-h/lecturas/index.json")).folios||{}}catch{indiceLecturas={}}
 // Los 731 loci, agrupados por libro: se hojean, no se escriben.
 if(li.status==="fulfilled"){
  const lista=li.value.loci||li.value.entries||li.value||[];
  selLocus.append(el("option",{value:"",text:t("elegirLocus")}));
  const grupos=new Map();
  for(const x of lista){const l=x.locus||x.l||x;const b=parseInt(l);if(!grupos.has(b))grupos.set(b,[]);grupos.get(b).push(x)}
  for(const [b,xs] of [...grupos].sort((a,c)=>a[0]-c[0])){
   const g=el("optgroup",{label:t("libro")+" "+(R[b]||b)});
   for(const x of xs){const l=x.locus||x;const inc=(x.incipit||"").split(/\s+/).slice(0,4).join(" ");
    g.append(el("option",{value:l,text:l+(inc?" · "+inc:"")}))}
   selLocus.append(g);
  }
  const q=new URLSearchParams(location.search).get("locus");if(q)selLocus.value=q;
 }
 selLocus.addEventListener("change",()=>{if(!selLocus.value)return;
  document.dispatchEvent(new CustomEvent("concordancia:ir-a-locus",{detail:{locus:selLocus.value}}))});

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
  ocIdx=0;
  if(vozActual)buscarVoz();else aplicarVoz();
 });

 try{await window.CodexRubrica?.cargar()}catch(e){
  const n=$("ce-rubrica-nota");if(n)n.textContent="No se pudo cargar la detección de rúbricas ("+e.message+").";
 }
 const refrescar=()=>{pintarRubricas();pintarDiplomatica();aplicarVoz();aplicarVisor()};
 refrescar();
 $("f-folio").addEventListener("change",()=>setTimeout(refrescar,0));
 document.addEventListener("concordancia:render",ev=>{
  folioAnunciado=ev.detail?.folio||null;
  if(ev.detail?.locus&&selLocus.value!==ev.detail.locus)selLocus.value=ev.detail.locus;
  if(ev.detail?.kind==="folio")selLocus.value="";
  setTimeout(refrescar,0);
 });
 // Los paneles los repinta la página al cambiar de locus o de idioma: se
 // observa el latín para volver a aplicar el resalte sobre el texto nuevo.
 // La página repinta el latín al cambiar de locus o de lengua: se vuelve a
 // subrayar. Mientras se subraya, el observador se desconecta; si no, el
 // propio subrayado lo dispararía otra vez en bucle.
 const latino=$("f-latin");
 if(latino&&window.MutationObserver){
  let pendiente=false;
  observadorLatin=new MutationObserver(()=>{if(pendiente)return;pendiente=true;
   setTimeout(()=>{pendiente=false;aplicarVoz()},0)});
  observadorLatin.observe(latino,{childList:true,subtree:true});
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
 for(const r of document.querySelectorAll(".ce-visor-tools label[data-ce-rot]"))
  if(r.firstChild)r.firstChild.nodeValue=t(r.getAttribute("data-ce-rot"));
 for(const [id,k] of [["ce-invertir","invertir"],["ce-visor-rest","restablecer"]]){const n=$(id);if(n)n.textContent=t(k)}
 {const r=document.querySelector('[data-ce-share="rot"]');if(r)r.textContent=t("compartir");
  const m=document.querySelector('[data-ce-share="ce-mail"]');if(m)m.textContent=t("correo");
  const g=$("ce-compartir");if(g)g.setAttribute("aria-label",t("compartir"))}
 for(const [id,k] of [["ce-zoom-menos","zoomMenos"],["ce-zoom-mas","zoomMas"],["ce-zoom-val","zoomRest"],["ce-aumento","aumento"]]){const n=$(id);if(n){n.title=t(k);n.setAttribute("aria-label",t(k))}}
 for(const r of document.querySelectorAll(".ce-bar label[data-ce-rot]"))
  if(r.firstChild)r.firstChild.nodeValue=t(r.getAttribute("data-ce-rot"));
 const pl=$("ce-locus");
 if(pl&&pl.options.length){pl.options[0].textContent=t("elegirLocus");
  for(const g of pl.querySelectorAll("optgroup"))g.label=g.label.replace(/^\S+/,t("libro"))}
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
