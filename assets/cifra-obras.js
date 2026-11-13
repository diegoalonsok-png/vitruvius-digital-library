/* Cifras del corpus clásico en los rótulos del sitio.
 *
 * El número de obras estaba escrito a mano en una veintena de páginas. Como la
 * biblioteca incorpora obras de dominio público todos los días, ese número
 * envejece al día siguiente. Este módulo completa los elementos marcados con
 * data-cifra con el valor que declara data/cifras-corpus.json.
 *
 *   <span data-cifra="obras">227</span> obras
 *
 * El texto que ya está escrito queda como valor de reserva: si el archivo no
 * carga, la página sigue mostrando la última cifra conocida. No cambia ninguna
 * otra cosa de la página.
 */
(()=>{
"use strict";
const marcados=document.querySelectorAll("[data-cifra]");
if(!marcados.length)return;
const titulos=document.querySelectorAll("[data-cifra-titulo]");
fetch("data/cifras-corpus.json",{cache:"no-cache"})
 .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
 .then(cifras=>{
  if(cifras&&cifras.schema!=="vdl-cifras-corpus-1")return;
  const fmt=n=>new Intl.NumberFormat("es-AR").format(n);
  for(const nodo of marcados){
   const valor=cifras[nodo.dataset.cifra];
   if(typeof valor==="number"&&valor>0)nodo.textContent=fmt(valor);
  }
  /* Títulos y atributos: se reemplaza la cifra anterior por la vigente, sin
     tocar el resto del texto. */
  for(const nodo of titulos){
   const campo=nodo.dataset.cifraTitulo;
   const valor=cifras[campo];
   if(typeof valor!=="number"||!valor)continue;
   for(const atributo of ["title","aria-label"]){
    const texto=nodo.getAttribute(atributo);
    if(texto)nodo.setAttribute(atributo,texto.replace(/\b\d{2,5}\b/,fmt(valor)));
   }
  }
  const titulo=document.querySelector("title[data-cifra-titulo]");
  if(titulo&&typeof cifras.obras==="number")
   titulo.textContent=titulo.textContent.replace(/\b\d{2,5}\b/,fmt(cifras.obras));
 })
 .catch(()=>{/* queda la cifra escrita en la página */});
})();
