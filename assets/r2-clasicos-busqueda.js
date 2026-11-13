/* Búsqueda de palabras dentro de los clásicos alojados en Cloudflare R2.
 *
 * El texto de estas ediciones (facsímiles de dominio público) vive en R2, no en
 * el repositorio, y pesa demasiado para buscarlo en el navegador. Este módulo
 * consulta el índice invertido de raíces que construye
 * scripts/r2-indexar-clasicos.mjs: descarga el manifiesto, un fragmento por
 * raíz y nada más. Las páginas que devuelve abren el visor del sitio
 * (buscador-facsimiles-clasicos.html), no el PDF remoto.
 *
 * Regla de autoridad: el índice sólo propone candidatos. El OCR de Internet
 * Archive NO está revisado: la página localizada se lee en el facsímil, que es
 * la única fuente. No es locus antiguo verificado ni lematización morfológica.
 *
 * Navegador: window.VitruviaR2Clasicos. En node se le inyecta un lector para
 * probarlo sin red: node scripts/test-r2-busqueda-clasicos.mjs
 */
(function(root,factory){
 const api=factory(typeof require==="function"&&typeof module==="object"?require("./vitruvia-philology.js"):(typeof root!=="undefined"?root.VitruviaPhilology:null));
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(typeof root!=="undefined")root.VitruviaR2Clasicos=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Philology){
"use strict";

const MANIFIESTO="data/r2/indice-semantico-manifest.json";
const CATALOGO="data/r2/catalogo-clasicos-r2.json";
const BASE_POR_OMISION="https://libros.vitruvius-digital-library.org/clasicos/indice/";
const GRIEGO=/[Ͱ-Ͽἀ-῿]/;
const MAX_OBRAS=12;
const cache=new Map();
let lector=null;
const usarLector=fn=>{lector=fn};

async function leer(ruta){
 if(cache.has(ruta))return cache.get(ruta);
 const promesa=(async()=>{
  if(lector)return lector(ruta);
  const r=await fetch(ruta,{headers:{Accept:"application/json"}});
  if(!r.ok)throw Error("HTTP "+r.status+" · "+ruta);
  return r.json();
 })();
 cache.set(ruta,promesa);
 try{return await promesa}catch(e){cache.delete(ruta);throw e}
}

const cut=(s,n)=>[...s].slice(0,n).join("");
const codepoints=k=>[...k].map(c=>c.codePointAt(0).toString(16)).join("-");
const raizDe=palabra=>Philology.stem(palabra,GRIEGO.test(palabra)?"greek":"latin");
const palabras=consulta=>Philology.fold(String(consulta||"")).split(" ").filter(p=>p.length>=3);

async function fragmentoDe(raiz){
 const manifiesto=await leer(MANIFIESTO).catch(()=>null);
 const base=manifiesto&&manifiesto.base?manifiesto.base:BASE_POR_OMISION;
 return leer(base+"s-"+codepoints(cut(raiz,2))+".json");
}

/* Devuelve las obras que contienen TODAS las palabras de la consulta, con las
   páginas de la palabra menos frecuente, que es la que mejor localiza. */
async function lookup(consulta){
 const formas=palabras(consulta);
 if(!formas.length)return {raices:[],obras:[],motivo:"consulta demasiado corta"};
 const raices=[...new Set(formas.map(raizDe).filter(r=>r&&r.length>=2))];
 if(!raices.length)return {raices:[],obras:[],motivo:"sin raíz utilizable"};
 const porRaiz=[];
 for(const raiz of raices){
  let fragmento=null;
  try{fragmento=await fragmentoDe(raiz)}catch{fragmento=null}
  const entradas=fragmento&&fragmento.raices?fragmento.raices[raiz]:null;
  if(!entradas)return {raices,obras:[],motivo:"ninguna obra contiene «"+raiz+"»"};
  porRaiz.push({raiz,entradas});
 }
 porRaiz.sort((a,b)=>Object.keys(a.entradas).length-Object.keys(b.entradas).length);
 const comunes=Object.keys(porRaiz[0].entradas).filter(id=>porRaiz.every(x=>x.entradas[id]));
 if(!comunes.length)return {raices,obras:[],motivo:"ninguna obra reúne todas las palabras"};
 const catalogo=await leer(CATALOGO).catch(()=>({items:[]}));
 const porId=new Map((catalogo.items||[]).map(x=>[x.id,x]));
 const obras=comunes.map(id=>{
  const ficha=porId.get(id)||{};
  const propia=porRaiz[0].entradas[id];
  return {
   id,autor:ficha.autor||id,obra:ficha.obra||"",lengua:ficha.lengua||"",anio:ficha.anio||null,
   tituloEdicion:ficha.tituloEdicion||"",bilingueLoeb:!!ficha.bilingueLoeb,
   recuento:porRaiz.reduce((n,x)=>n+(x.entradas[id]?x.entradas[id][0]:0),0),
   paginas:propia[1]||[],
   raizLocalizadora:porRaiz[0].raiz,
   lector:"buscador-facsimiles-clasicos.html?obra="+encodeURIComponent(id),
   pdf:ficha.pdf||""
  };
 }).sort((a,b)=>b.recuento-a.recuento).slice(0,MAX_OBRAS);
 return {raices,obras,motivo:""};
}

/* ----- Capa visual: sólo en Bibliotheca y en Lexicon ----------------------
   El frente general del sitio es la consulta indexada sobre Vitruvio y no se
   toca. Estas obras pertenecen a la biblioteca y al léxico. */
function estilo(){
 if(typeof document==="undefined"||document.getElementById("r2-clasicos-busqueda-style"))return;
 const el=document.createElement("style");el.id="r2-clasicos-busqueda-style";
 el.textContent=[
  "#r2-clasicos-hallazgos{margin:18px 0;padding:14px 16px;border:1px solid #8a8a90;border-radius:8px}",
  "#r2-clasicos-hallazgos h3{margin:0 0 4px;font:400 20px/1.25 'Gentium Book Plus','Cardo',Georgia,serif}",
  "#r2-clasicos-hallazgos p{margin:4px 0;font:12px/1.5 Arial,Helvetica,sans-serif;opacity:.85}",
  "#r2-clasicos-hallazgos ol{margin:10px 0 0;padding-left:20px;font:14px/1.6 Arial,Helvetica,sans-serif}",
  "#r2-clasicos-hallazgos li{margin-bottom:8px}",
  "#r2-clasicos-hallazgos a{color:inherit;text-underline-offset:3px}",
  "#r2-clasicos-hallazgos .r2-paginas{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:3px;font-size:13px}"
 ].join("\n");
 document.head.append(el);
}

function pintar(anfitrion,consulta,resultado){
 estilo();
 document.getElementById("r2-clasicos-hallazgos")?.remove();
 if(!resultado.obras.length)return;
 const caja=document.createElement("section");caja.id="r2-clasicos-hallazgos";
 const h=document.createElement("h3");h.textContent="Clásicos en facsímil · páginas con «"+consulta.trim()+"»";
 const nota=document.createElement("p");
 nota.textContent=resultado.obras.length+" ediciones de dominio público alojadas en la biblioteca. Raíz consultada: "+
  resultado.raices.join(", ")+". El OCR no está revisado: la página abre el facsímil para leerlo.";
 const ol=document.createElement("ol");
 for(const obra of resultado.obras){
  const li=document.createElement("li");
  const a=document.createElement("a");a.href=obra.lector;
  a.textContent=obra.autor+" — "+obra.obra;li.append(a);
  const meta=document.createElement("small");
  meta.textContent=" · "+(obra.anio||"")+(obra.bilingueLoeb?" · Loeb bilingüe":"")+" · "+obra.recuento+
   (obra.recuento===1?" aparición":" apariciones");
  li.append(meta);
  const paginas=document.createElement("div");paginas.className="r2-paginas";
  for(const p of obra.paginas.slice(0,12)){
   const enlace=document.createElement("a");
   enlace.href=obra.lector+"&pagina="+p+"&q="+encodeURIComponent(consulta.trim());
   enlace.textContent="p. "+p;paginas.append(enlace);
  }
  li.append(paginas);ol.append(li);
 }
 caja.append(h,nota,ol);
 anfitrion.insertAdjacentElement("afterend",caja);
}

function anfitrionDePagina(){
 if(typeof document==="undefined")return null;
 return document.getElementById("lx-results")||document.getElementById("classic-results")||
  document.getElementById("resultados")||document.getElementById("results");
}

function conectar(){
 if(typeof document==="undefined")return;
 const entrada=document.getElementById("lx-q")||document.getElementById("classic-query")||
  document.getElementById("q")||document.getElementById("term");
 const anfitrion=anfitrionDePagina();
 if(!entrada||!anfitrion)return;
 let serie=0;
 const correr=async()=>{
  const consulta=entrada.value||"";
  const actual=++serie;
  if(palabras(consulta).length===0){document.getElementById("r2-clasicos-hallazgos")?.remove();return}
  let resultado;
  try{resultado=await lookup(consulta)}catch{return}
  if(actual!==serie)return;
  pintar(anfitrion,consulta,resultado);
 };
 const retardo=(()=>{let t=null;return ()=>{clearTimeout(t);t=setTimeout(correr,420)}})();
 entrada.addEventListener("change",retardo);
 entrada.addEventListener("search",retardo);
 entrada.addEventListener("keydown",e=>{if(e.key==="Enter")setTimeout(correr,60)});
 for(const id of ["lx-qb","search-submit","go"])document.getElementById(id)?.addEventListener("click",()=>setTimeout(correr,60));
 const inicial=new URLSearchParams(location.search).get("q");
 if(inicial){entrada.value=entrada.value||inicial;setTimeout(correr,300)}
}

if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",conectar,{once:true});
 else conectar();
}

return {lookup,usarLector,raizDe,palabras,MANIFIESTO,CATALOGO,BASE_POR_OMISION};
});
