/* Prueba del visor de obras notables, sin red: el índice de folios se sustituye
   por un fixture y se comprueba que cada folio se lea por separado, con su
   nomenclatura, y que las herramientas de lectura hagan efecto. */
import {JSDOM} from "jsdom";
import fs from "node:fs";
import assert from "node:assert/strict";

const html=fs.readFileSync("obras-notables.html","utf8");
const modulo=fs.readFileSync("assets/obras-notables-visor.js","utf8");
const indice={schema:"vdl-folios-obra-1",obra:"palladio-quattro-libri",
 titulo:"I quattro libri dell'architettura",autor:"Andrea Palladio",
 edicion:"Venecia, Dominico de' Franceschi, 1570",lengua:"it",
 fuente:"https://archive.org/details/iqvattrolibridel00pall",
 derechos:"Obra en dominio público.",imagenes:8,imagenesEnLaFuente:344,
 base:"https://libros.vitruvius-digital-library.org/folios/palladio-quattro-libri/",
 nomenclatura:"Las imágenes se numeran por su orden digital.",
 folios:Array.from({length:8},(_,i)=>({imagenDigital:i+1,folio:"",paginaImpresa:"",libro:"",
  imagen:`https://libros.vitruvius-digital-library.org/folios/palladio-quattro-libri/f000${i+1}.jpg`}))};

let failed=0;
const check=(label,fn)=>{try{fn();console.log("PASS",label)}catch(e){failed++;console.error("FAIL",label,e.message)}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

const abrir=(busqueda,servir)=>{
 const dom=new JSDOM(html,{runScripts:"outside-only",
  url:"https://vitruvius-digital-library.org/obras-notables"+busqueda,pretendToBeVisual:true});
 dom.window.fetch=servir;
 dom.window.scrollTo=()=>{};
 dom.window.eval(modulo);
 return dom;
};

/* En producción el índice se lee de R2; el dominio devuelve la portada cuando
   no reconoce una ruta, así que el visor NO debe conformarse con eso. */
const dom=abrir("?obra=palladio-quattro-libri&imagen=5",async ruta=>{
 const u=String(ruta);
 if(u==="https://libros.vitruvius-digital-library.org/folios/palladio-quattro-libri/indice-folios.json")
  return {ok:true,status:200,json:async()=>indice};
 if(u.endsWith("data/r2/folios/palladio-quattro-libri.json"))
  return {ok:true,status:200,json:async()=>({schema:"html-de-la-portada"})};
 return {ok:false,status:404,json:async()=>({})};
});
await sleep(120);
const w=dom.window, $=id=>w.document.getElementById(id);

check("lee el índice de la biblioteca, no la portada que devuelve el dominio",()=>{
 assert.match($("imagen").src,/libros\.vitruvius-digital-library\.org\/folios\//);
 assert.equal($("estado").textContent.includes("todavía no están alojados"),false);
});
check("abre la imagen pedida en el enlace, no la primera",()=>{
 assert.match($("imagen").src,/f0005\.jpg$/,"src: "+$("imagen").src);
 assert.equal($("numero").value,"5");
});
check("declara la edición y los derechos de la digitalización",()=>{
 assert.match($("titulo").textContent,/quattro libri/);
 assert.match($("edicion").textContent,/1570/);
 assert.match($("e-derechos").textContent,/dominio público/i);
});
check("la nomenclatura no inventa folio ni página impresa",()=>{
 assert.equal($("n-imagen").textContent,"5");
 assert.match($("n-folio").textContent,/Pendiente de leer en el ejemplar/);
 assert.match($("n-pagina").textContent,/Pendiente de leer en el ejemplar/);
});
check("cada folio es independiente: se avanza y se retrocede",()=>{
 $("next").dispatchEvent(new w.Event("click"));
 assert.match($("imagen").src,/f0006\.jpg$/);
 $("prev").dispatchEvent(new w.Event("click"));
 assert.match($("imagen").src,/f0005\.jpg$/);
});
check("el índice ofrece todos los folios",()=>{
 assert.equal($("indice").options.length,8);
});
check("los modos de visualización y el contraste se aplican a la imagen",()=>{
 $("modo").value="negativo";
 $("modo").dispatchEvent(new w.Event("change"));
 assert.match($("imagen").style.filter,/invert\(1\)/,"el negativo no se aplicó");
 $("modo").value="gris";
 $("modo").dispatchEvent(new w.Event("change"));
 assert.match($("imagen").style.filter,/grayscale\(1\)/,"el blanco y negro no se aplicó");
 $("contraste").value="150";
 $("contraste").dispatchEvent(new w.Event("input"));
 assert.match($("imagen").style.filter,/contrast\(1\.5\)/);
});
check("la galería lista los folios con su número de imagen",()=>{
 const fichas=w.document.querySelectorAll(".ficha-folio");
 assert.equal(fichas.length,8,"folios en la galería: "+fichas.length);
 assert.match(fichas[0].textContent,/Imagen 1/);
 assert.match(w.document.getElementById("galeria-estado").textContent,/8 de 8 folios/);
});
check("elegir un folio en la galería lo abre en el lector",()=>{
 const fichas=[...w.document.querySelectorAll(".ficha-folio")];
 fichas[2].dispatchEvent(new w.Event("click"));
 assert.match($("imagen").src,/f0003\.jpg$/,"no abrió el folio elegido: "+$("imagen").src);
});
check("el zoom escala la imagen",()=>{
 const antes=$("imagen").style.transform;
 $("mas").dispatchEvent(new w.Event("click"));
 assert.notEqual($("imagen").style.transform,antes);
 assert.match($("imagen").style.transform,/scale\(/);
});
check("el estado informa cuántas imágenes hay y cuántas declara la fuente",()=>{
 assert.match($("estado").textContent,/Imagen \d+ de 8/);
 assert.match($("estado").textContent,/344/);
});
w.close();

/* Mientras la descarga no terminó, la página lo dice y ofrece el otro visor. */
const dom2=abrir("?obra=alberti-diez-libros-1582",async()=>({ok:false,status:404,json:async()=>({})}));
await sleep(120);
check("sin folios alojados, avisa y deriva al visor de facsímiles",()=>{
 const estado=dom2.window.document.getElementById("estado");
 assert.match(estado.textContent,/todavía no están alojados/);
 const a=estado.querySelector("a");
 assert.match(a.getAttribute("href"),/^buscador-facsimiles-clasicos\.html\?obra=alberti/);
});
dom2.window.close();

if(failed){console.error(`\n${failed} comprobaciones fallidas`);process.exit(1)}
console.log("\nVisor de obras notables: todas las comprobaciones pasaron");
