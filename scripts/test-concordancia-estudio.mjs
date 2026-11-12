/* Comprueba el utillaje nuevo de la Concordancia entre folios y loci:
   que la barra de estudio se monte, que el desplegable de prefacios
   sincronice de verdad los tres paneles, que el subrayado de rúbricas
   pinte sobre el facsímil y que la voz capital se resalte en el latín. */
import {readFileSync,existsSync} from "node:fs";
import {JSDOM} from "jsdom";

const mapa=JSON.parse(readFileSync("data/codex-h/folio-locus-map.json","utf8"));
const prefacios=[...new Map(mapa.entries.flatMap(e=>(e.loci||[])
  .filter(l=>/^\d+\.praef\.1$/.test(l.locus))
  .map(l=>[parseInt(l.locus),{libro:parseInt(l.locus),folio:e.folio}])))
  .values()].sort((a,b)=>a.libro-b.libro);

async function abrir(busqueda=""){
  const dom=new JSDOM(readFileSync("concordancia-folios.html","utf8"),
    {url:"https://e.org/concordancia-folios.html"+busqueda,runScripts:"outside-only",pretendToBeVisual:true});
  const {window}=dom;
  window.matchMedia=q=>({matches:false,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  window.fetch=async u=>{
    const p=String(u).split("?")[0].replace(/^https?:\/\/[^/]+\//,"");
    return existsSync(p)
      ?{ok:true,status:200,json:async()=>JSON.parse(readFileSync(p,"utf8"))}
      :{ok:false,status:404,json:async()=>({})};
  };
  for(const s of window.document.querySelectorAll("script[src]")){
    const p=s.getAttribute("src").split("?")[0];
    if(existsSync(p)){try{window.eval(readFileSync(p,"utf8"))}catch(e){}}
  }
  window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
  await new Promise(r=>setTimeout(r,700));
  return window;
}

let fallos=0;
const comprobar=(ok,rotulo,detalle="")=>{
  if(!ok)fallos++;
  console.log(`  ${ok?"✓":"✗"} ${rotulo}${detalle?" — "+detalle:""}`);
};

const w=await abrir();
const d=w.document;

console.log("Barra de estudio");
comprobar(!!d.getElementById("ce-praef"),"desplegable de prefacios montado");
comprobar(!!d.getElementById("ce-verbum"),"desplegable de voces capitales montado");
comprobar(!!d.querySelector("#ce-visor-tools #ce-lupa"),"lupa dentro del visor I");
comprobar(!d.querySelector(".ce-bar #ce-lupa"),"la lupa ya no está en la barra de arriba");
comprobar(d.querySelectorAll(".ce-split").length===2,"dos divisores de ancho",
  d.querySelectorAll(".ce-split").length+" encontrados");
comprobar(!!d.querySelector("[data-lexicon-palette]"),"anclaje de la botonera de fondos");
comprobar(!!d.querySelector(".on-nav .ce-tools")&&!d.querySelector(".on-masthead"),"encabezado sutil con botonera del Lexicon, sin rótulo grande");
const rot=[...d.querySelectorAll(".ce-bar label")].map(l=>[l.firstChild.nodeValue.trim(),l.querySelector("select")?.id]);
comprobar(JSON.stringify(rot)===JSON.stringify([["Locus","ce-locus"],["Prefacio","ce-praef"],["Voz capital","ce-verbum"]]),
  "cada rótulo está sobre su desplegable",JSON.stringify(rot));

// Los controles globales de idioma y tema llegan después, en una caja flotante.
{const sr=readFileSync("assets/secondary-reader-controls.js","utf8");try{w.eval(sr)}catch(e){}
 if(!d.getElementById("vitruvius-secondary-toolbar")){const tb=d.createElement("div");tb.id="vitruvius-secondary-toolbar";
  tb.innerHTML='<label><select id="secondary-language"></select></label><button id="secondary-theme"></button>';d.body.append(tb)}
 await new Promise(r=>setTimeout(r,150));
 comprobar(d.getElementById("vitruvius-secondary-toolbar")?.parentNode===d.querySelector(".ce-tools"),
  "idioma y tema quedan dentro de la botonera, en la misma línea");}
console.log("\nPrefacios en el desplegable");
const sel=d.getElementById("ce-praef");
const opciones=[...(sel?.options||[])].slice(1).map(o=>o.value);
comprobar(opciones.length===prefacios.length,
  `los ${prefacios.length} prefacios del mapa aparecen`,opciones.length+" en el desplegable");
for(const p of prefacios){
  comprobar(opciones.includes(p.folio),`prefacio del libro ${p.libro} → f. ${p.folio}`);
}

console.log("\nSincronización: elegir un prefacio mueve el folio de la página");
const selFolio=d.getElementById("f-folio");
let sincronizados=0;
for(const p of prefacios){
  if(![...selFolio.options].some(o=>o.value===p.folio))continue;
  sel.value=p.folio;
  sel.dispatchEvent(new w.Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,60));
  const ok=selFolio.value===p.folio;
  if(ok)sincronizados++;
  const latin=d.getElementById("f-latin-status")?.textContent||"";
  comprobar(ok,`libro ${String(p.libro).padStart(2)} · f. ${p.folio}`,
    ok?latin.slice(0,64):"el selector de folio quedó en "+selFolio.value);
}

console.log("\nSubrayado de rúbricas sobre el facsímil");
const rub=JSON.parse(readFileSync("data/codex-h/rubricas.json","utf8"));
const conRubrica=prefacios.filter(p=>(rub.folios.find(f=>f.folio===p.folio)?.rubricas||[]).length);
comprobar(conRubrica.length>0,"hay prefacios con tinta roja detectada",conRubrica.length+" folios");
if(conRubrica.length){
  const p=conRubrica[0];
  sel.value=p.folio;sel.dispatchEvent(new w.Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,120));
  const marcas=d.querySelectorAll(".ce-rubrica-mark").length;
  const esperadas=rub.folios.find(f=>f.folio===p.folio).rubricas.length;
  comprobar(marcas===esperadas,`f. ${p.folio}: se pintan sus ${esperadas} bandas`,marcas+" pintadas");
  comprobar((d.getElementById("ce-rubrica-nota")?.textContent||"").includes("no afirma qué dice"),
    "el aviso declara que no se ha leído la escritura");
}

console.log("\nVoz capital resaltada en el latín");
const verba=JSON.parse(readFileSync("data/index/verba-capitalia.json","utf8"));
comprobar((verba.voces||[]).some(v=>v.clave==="symmetria"),"symmetria está entre las voces");
comprobar((verba.voces||[]).some(v=>v.clave==="decor"),"decor está entre las voces");
const selVoz=d.getElementById("ce-verbum");
// Un folio cuyo latín contenga de hecho la raíz buscada.
const corpus=JSON.parse(readFileSync("data/structured/recensio-es.json","utf8")).passages;
const conSymmetria=corpus.find(x=>/symmetri/i.test(x.latin));
const entrada=mapa.entries.find(e=>(e.loci||[]).some(l=>l.locus===conSymmetria?.locus));
if(entrada){
  selFolio.value=entrada.folio;selFolio.dispatchEvent(new w.Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,120));
  selVoz.value="symmetria";selVoz.dispatchEvent(new w.Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,120));
  const marcas=d.querySelectorAll("#f-latin mark.ce-verbum").length;
  comprobar(marcas>0,`symmetria resaltada en f. ${entrada.folio} (${conSymmetria.locus})`,marcas+" formas");
}else{
  console.log("  · ningún folio del mapa cubre un locus con symmetria: no se puede probar aquí");
}

console.log("\nDesplegable de loci: elegir un locus sincroniza los tres visores");
const selLocus=d.getElementById("ce-locus");
const nLoci=[...(selLocus?.options||[])].filter(o=>o.value).length;
comprobar(nLoci===731,"los 731 loci están en el desplegable",nLoci+"");
comprobar(selLocus.querySelectorAll("optgroup").length===10,"agrupados en diez libros");
for(const [locus,folioEsperado,como] of [["1.4.3","9v","folio leído sobre la imagen"],["2.praef.1","18r","rúbrica verificada"],["1.praef.1","1r","provisional"]]){
  selLocus.value=locus;selLocus.dispatchEvent(new w.Event("change",{bubbles:true}));
  await new Promise(r=>setTimeout(r,150));
  const lat=d.getElementById("f-latin").textContent;
  const tra=d.getElementById("f-translation").textContent;
  const ev=d.getElementById("f-evidence").textContent;
  const ok=ev.includes("f. "+folioEsperado)&&lat.includes(locus)&&tra.includes(locus);
  comprobar(ok,`${locus} → f. ${folioEsperado} (${como}) en imagen, latín y traducción`,ev.slice(0,70));
}
selLocus.value="1.4.3";selLocus.dispatchEvent(new w.Event("change",{bubbles:true}));
await new Promise(r=>setTimeout(r,200));
comprobar(!d.getElementById("ce-diplomatica").hidden&&d.getElementById("ce-diplomatica").textContent.includes("principiis"),
  "la lectura de f.9v aparece bajo la imagen al elegir 1.4.3");
// Un locus sin folio material ni leído: la página lo dice, no inventa
selLocus.value="10.16.12";selLocus.dispatchEvent(new w.Event("change",{bubbles:true}));
await new Promise(r=>setTimeout(r,150));
comprobar(/estimad|Sin asignación/.test(d.getElementById("f-evidence").textContent),"10.16.12: se declara sin asignación material o estimada",
  d.getElementById("f-evidence").textContent.slice(0,60));

console.log("\nHerramientas del visor I");
const img=d.getElementById("f-image"),wrap=img.closest(".ce-rubrica-wrap");
d.getElementById("ce-visor-rest").click();
d.getElementById("ce-zoom-mas").click();d.getElementById("ce-zoom-mas").click();
comprobar(wrap.style.width==="150%"&&d.getElementById("ce-zoom-val").textContent==="150 %","zoom + dos veces → 150 %",wrap.style.width);
d.getElementById("ce-zoom-val").click();
comprobar(wrap.style.width==="100%","pulsar el porcentaje vuelve al 100 %");
for(let i=0;i<20;i++)d.getElementById("ce-zoom-mas").click();
comprobar(wrap.style.width==="400%","el zoom no pasa de 400 %",wrap.style.width);
d.getElementById("ce-invertir").click();
comprobar(img.style.filter.includes("invert(1)")&&d.getElementById("ce-invertir").getAttribute("aria-pressed")==="true","invertir colores",img.style.filter);
const c=d.getElementById("ce-contraste");c.value="180";c.dispatchEvent(new w.Event("input"));
const br=d.getElementById("ce-brillo");br.value="120";br.dispatchEvent(new w.Event("input"));
comprobar(img.style.filter.includes("contrast(180%)")&&img.style.filter.includes("brightness(120%)"),"contraste y brillo",img.style.filter);
comprobar(d.querySelector(".ce-lens").style.filter===img.style.filter,"la lupa ve la imagen con los mismos filtros");
const au=d.getElementById("ce-aumento");au.value="6";au.dispatchEvent(new w.Event("change"));
comprobar(JSON.parse(w.localStorage.getItem("vdl:concordancia:visor")).aumento===6,"el aumento ×6 queda guardado");
d.getElementById("ce-visor-rest").click();
comprobar(img.style.filter==="contrast(100%) brightness(100%)"&&wrap.style.width==="100%","restablecer vuelve todo a cero",img.style.filter);
d.getElementById("ce-lupa").click();
comprobar(d.getElementById("f-image-box").classList.contains("ce-lupa-on"),"la lupa se activa");
d.getElementById("ce-lupa").click();

console.log("\nPantalla partida");
const ws=d.querySelector(".folio-workspace");
const div=d.querySelectorAll(".ce-split")[0];
const antes=ws.style.getPropertyValue("--ce-cols");
div.dispatchEvent(new w.KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));
div.dispatchEvent(new w.KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}));
const despues=ws.style.getPropertyValue("--ce-cols");
comprobar(antes!==despues,"el divisor reparte el ancho",despues);
div.dispatchEvent(new w.MouseEvent("dblclick",{bubbles:true}));
comprobar(ws.style.getPropertyValue("--ce-cols")===antes,"doble clic restablece los anchos");

console.log("\nVoz capital: elegirla lleva al pasaje y subraya en los tres visores");
selVoz.value="symmetria";selVoz.dispatchEvent(new w.Event("change",{bubbles:true}));
await new Promise(r=>setTimeout(r,500));
comprobar(d.getElementById("ce-locus").value==="1.2.3","symmetria lleva a 1.2.3 (folio leído f.7r)",d.getElementById("ce-locus").value);
comprobar(d.querySelectorAll("#f-latin mark.ce-verbum").length>=1,"subrayada en el latín");
comprobar(d.querySelectorAll("#f-translation mark.ce-verbum").length>=1,"subrayada en la traducción (conmensurabilidad)",
  d.querySelector("#f-translation mark.ce-verbum")?.textContent);
comprobar(d.querySelectorAll(".ce-verbum-mark").length===3,"tres subrayados en el facsímil de f.7r",d.querySelectorAll(".ce-verbum-mark").length+"");
[...d.querySelectorAll(".ce-oc-btn")].at(-1).click();await new Promise(r=>setTimeout(r,400));
comprobar(d.getElementById("ce-locus").value==="1.2.4","▶ pasa a la ocurrencia siguiente (1.2.4)",d.getElementById("ce-locus").value);
selVoz.value="";selVoz.dispatchEvent(new w.Event("change",{bubbles:true}));await new Promise(r=>setTimeout(r,100));

console.log("\nCambio de idioma: se traduce la interfaz, no los visores");
const latinAntes=d.getElementById("f-latin").textContent;
const tradAntes=d.getElementById("f-translation").textContent;
for(const [lang,titulo,buscar,consultar] of [
  ["en","Concordance of folios and loci","Search any locus of the treatise","Consult locus"],
  ["fr","Concordance des folios et des loci","Chercher n'importe quel locus du traité","Consulter le locus"],
  ["es","Concordancia entre folios y loci","Buscar cualquier locus del tratado","Consultar locus"]]){
  d.documentElement.lang=lang;
  d.dispatchEvent(new w.CustomEvent("vitruvius:language-changed",{detail:{language:lang}}));
  await new Promise(r=>setTimeout(r,80));
  const t=d.querySelector('[data-ce-i18n="titulo"]')?.textContent.trim();
  const b=d.querySelector('[data-ce-i18n="buscarTitulo"]')?.textContent.trim();
  const c=d.querySelector("#f-search-results button")?.textContent.trim();
  const n=d.getElementById("f-search-count")?.textContent||"";
  comprobar(t===titulo,`${lang}: título`,t);
  comprobar(b===buscar,`${lang}: sección de búsqueda`,b);
  comprobar(c===consultar,`${lang}: botón de cada resultado`,c);
  comprobar(lang==="es"?n.includes("editoriales disponibles"):!n.includes("editoriales disponibles"),`${lang}: línea de recuento`,n.slice(0,60));
}
comprobar(["Contraste","Brillo"].every((x,i)=>d.querySelectorAll(".ce-visor-tools label")[i].firstChild.nodeValue===x),"los rótulos del visor vuelven al castellano");
const rot2=[...d.querySelectorAll(".ce-bar label")].map(l=>[l.firstChild.nodeValue.trim(),l.querySelector("select")?.id]);
comprobar(JSON.stringify(rot2)===JSON.stringify([["Locus","ce-locus"],["Prefacio","ce-praef"],["Voz capital","ce-verbum"]]),
  "tras cambiar de idioma los rótulos no se corren",JSON.stringify(rot2));
comprobar(d.getElementById("f-latin").textContent===latinAntes,"el latín del visor no se tocó");
comprobar(d.getElementById("f-translation").textContent===tradAntes,"la traducción del visor no se tocó");
comprobar(d.querySelector('[data-ce-i18n="intro"] i')?.textContent==="De architectura",
  "al volver al castellano se restituyen las cursivas originales");

console.log(fallos?`\n${fallos} comprobación(es) fallida(s)`:"\ntodas las comprobaciones pasan");
process.exit(fallos?1:0);
