/* Visor de folio independiente para las obras notables (Palladio, Alberti).
 *
 * Cada folio se lee por separado, con su nomenclatura: número de imagen
 * digital, folio, página impresa y libro, tal como estén consignados en el
 * índice. Lo que no esté leído en el ejemplar aparece como pendiente: imagen
 * digital y folio histórico no son equivalentes y la foliación no se deduce del
 * número de imagen.
 *
 * Herramientas: zoom y arrastre, inversión de colores, contraste, brillo y
 * subrayado. Los subrayados son del lector y quedan en su navegador
 * (localStorage), no se publican ni se guardan en el servidor.
 *
 * La búsqueda consulta el índice semántico de la biblioteca a través de
 * assets/r2-clasicos-busqueda.js y devuelve las páginas del ejemplar en
 * facsímil; cuando el ejemplar indexado no es el mismo que el de los folios, lo
 * dice, porque la correspondencia entre dos ejemplares no se da por supuesta.
 */
(() => {
"use strict";
const $ = id => document.getElementById(id);
const OBRAS = {
 "palladio-quattro-libri": { etiqueta: "Palladio · I quattro libri (1570)" },
 "alberti-diez-libros-1582": { etiqueta: "Alberti · Los diez libros (1582)" }
};
const params = new URLSearchParams(location.search);
let clave = params.get("obra");
if (!OBRAS[clave]) clave = Object.keys(OBRAS)[0];

let indice = null, actual = 1, escala = 1, invertido = false, subrayando = false;
let panX = 0, panY = 0;
function aplicarEncuadre() {
 const img = $("imagen");
 img.style.transform = `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${escala})`;
}
function encajarFolio() {
 const img = $("imagen"), caja = $("lamina");
 if (!img.naturalWidth || !img.naturalHeight) return;
 // The folio's intrinsic dimensions never control the reader's layout.
 const availableWidth = Math.max(100,caja.clientWidth-28);
 const availableHeight = Math.max(100,caja.clientHeight-28);
 const fit = Math.min(availableWidth/img.naturalWidth,availableHeight/img.naturalHeight);
 img.style.width = Math.max(1,Math.floor(img.naturalWidth*fit))+"px";
 img.style.height = Math.max(1,Math.floor(img.naturalHeight*fit))+"px";
 aplicarEncuadre();
}
function ajustarEncuadre() {
 escala = 1; panX = 0; panY = 0;
 encajarFolio();
}
const marcasPorFolio = new Map();

const almacen = {
 leer(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } },
 escribir(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* el navegador puede negarlo */ } }
};

function selectorObras() {
 const sel = $("obra");
 sel.replaceChildren();
 for (const [id, o] of Object.entries(OBRAS)) {
  const op = document.createElement("option");
  op.value = id; op.textContent = o.etiqueta; op.selected = id === clave;
  sel.append(op);
 }
 sel.addEventListener("change", () => { location.search = "?obra=" + encodeURIComponent(sel.value); });
}

function nomenclatura(f) {
 const pendiente = "Pendiente de leer en el ejemplar";
 $("n-imagen").textContent = f ? String(f.imagenDigital) : "—";
 $("n-folio").textContent = (f && f.folio) || pendiente;
 $("n-pagina").textContent = (f && f.paginaImpresa) || pendiente;
 $("n-libro").textContent = (f && f.libro) || pendiente;
 $("n-aviso").textContent = indice ? indice.nomenclatura : "";
}

function filtros() {
 const c = Number($("contraste").value) / 100, b = Number($("brillo").value) / 100;
 const modo = $("modo") ? $("modo").value : "original";
 const extra = modo === "negativo" ? " invert(1)" : modo === "gris" ? " grayscale(1)" : "";
 $("imagen").style.filter = `contrast(${c}) brightness(${b})` + extra + (invertido ? " invert(1)" : "");
}

/* Galería de folios, al modo del Codex H: miniatura, número de imagen y folio.
   Se pinta por tandas para no cargar trescientas imágenes de una vez. */
let mostrados = 0, filtrados = [];
const TANDA = 48;
function pintarGaleria(reiniciar) {
 const rejilla = $("rejilla");
 if (reiniciar) { rejilla.replaceChildren(); mostrados = 0; }
 const lote = filtrados.slice(mostrados, mostrados + TANDA);
 for (const f of lote) {
  const ficha = document.createElement("button");
  ficha.type = "button";
  ficha.className = "ficha-folio";
  ficha.setAttribute("aria-current", String(f.imagenDigital === actual));
  const img = document.createElement("img");
  img.loading = "lazy";
  img.decoding = "async";
  img.src = f.miniatura || f.imagen;
  img.onerror = () => { img.onerror = null; img.src = f.imagen; };
  img.title = "Imagen digital " + f.imagenDigital + " · " + (f.folio ? "folio " + f.folio : "folio histórico por identificar");
  img.alt = "";
  const n = document.createElement("b");
  n.textContent = "Imagen " + f.imagenDigital;
  const etiqueta = document.createElement("small");
  etiqueta.textContent = f.folio ? "f. " + f.folio : (f.paginaImpresa ? "p. " + f.paginaImpresa : (f.etiquetaFuente || "folio por leer"));
  ficha.append(img, n, etiqueta);
  ficha.addEventListener("click", () => {
   mostrar(f.imagenDigital);
   $("lamina").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  rejilla.append(ficha);
 }
 mostrados += lote.length;
 $("galeria-mas").hidden = mostrados >= filtrados.length;
 $("galeria-estado").textContent = `${mostrados} miniaturas de ${filtrados.length} imágenes, en el orden digital del ejemplar`;
}

function filtrarGaleria() {
 const q = ($("galeria-q").value || "").trim().toLowerCase();
 filtrados = !q ? indice.folios : indice.folios.filter(f =>
  String(f.imagenDigital) === q ||
  (f.folio || "").toLowerCase().includes(q) ||
  (f.paginaImpresa || "").toLowerCase().includes(q) ||
  (f.etiquetaFuente || "").toLowerCase().includes(q));
 pintarGaleria(true);
}

function pintarMarcas() {
 const caja = $("marcas");
 caja.replaceChildren();
 for (const m of marcasPorFolio.get(actual) || []) {
  const d = document.createElement("div");
  d.className = "marca";
  d.style.left = m.x + "%"; d.style.top = m.y + "%";
  d.style.width = m.w + "%"; d.style.height = m.h + "%";
  caja.append(d);
 }
}

function mostrar(n) {
 if (!indice || !indice.folios.length) return;
 const f = indice.folios.find(x => x.imagenDigital === n) || indice.folios[0];
 actual = f.imagenDigital;
 $("numero").value = actual;
 $("numero").max = indice.folios[indice.folios.length - 1].imagenDigital;
 $("indice").value = String(actual);
 const img = $("imagen");
 ajustarEncuadre();
 img.src = f.imagen;
 img.alt = `Folio ${f.folio || "(imagen digital " + f.imagenDigital + ")"} de ${indice.titulo}`;
 img.onload = () => { ajustarEncuadre(); };
 img.onerror = () => { $("estado").textContent = "No se pudo cargar la imagen "+actual+". Intentá otro folio."; };
 nomenclatura(f);
 filtros();
 pintarMarcas();
 for (const ficha of document.querySelectorAll(".ficha-folio"))
  ficha.setAttribute("aria-current", String(ficha.querySelector("b").textContent === "Imagen " + actual));
 $("prev").disabled = actual <= indice.folios[0].imagenDigital;
 $("next").disabled = actual >= indice.folios[indice.folios.length - 1].imagenDigital;
 $("estado").textContent = `Imagen ${actual} de ${indice.imagenes}` +
  (indice.imagenesEnLaFuente && indice.imagenesEnLaFuente !== indice.imagenes
   ? ` · la fuente declara ${indice.imagenesEnLaFuente} imágenes` : "");
 const url = new URL(location.href);
 url.searchParams.set("obra", clave); url.searchParams.set("imagen", actual);
 history.replaceState(null, "", url);
}

function ficha() {
 $("titulo").textContent = indice.titulo;
 $("edicion").textContent = indice.edicion;
 $("e-autor").textContent = indice.autor;
 $("e-edicion").textContent = indice.edicion;
 $("e-lengua").textContent = indice.lengua;
 $("e-imagenes").textContent = `${indice.imagenes} folios alojados en la biblioteca`;
 $("e-derechos").textContent = indice.derechos;
 const dd = $("e-fuente");
 dd.replaceChildren();
 if (indice.fuente) {
  const a = document.createElement("a");
  a.href = indice.fuente; a.target = "_blank"; a.rel = "noopener";
  a.textContent = "Digitalización de origen";
  dd.append(a);
 } else dd.textContent = "—";
 const sel = $("indice");
 sel.replaceChildren();
 for (const f of indice.folios) {
  const op = document.createElement("option");
  op.value = String(f.imagenDigital);
  op.textContent = f.folio ? `f. ${f.folio}` : (f.paginaImpresa ? `p. ${f.paginaImpresa}` : `imagen ${f.imagenDigital}`);
  sel.append(op);
 }
}

async function buscar() {
 const consulta = $("q").value.trim();
 const lista = $("hallazgos");
 lista.replaceChildren();
 if (!consulta) return;
 if (!window.VitruviaR2Clasicos) { $("q-aviso").textContent = "El índice de la biblioteca no está disponible en esta página."; return; }
 $("q-aviso").textContent = "Buscando en el índice de la biblioteca…";
 let resultado;
 try { resultado = await window.VitruviaR2Clasicos.lookup(consulta); }
 catch { $("q-aviso").textContent = "No se pudo consultar el índice."; return; }
 const propia = resultado.obras.filter(o => o.id === clave);
 const otras = resultado.obras.filter(o => o.id !== clave);
 if (!propia.length) {
  $("q-aviso").textContent = otras.length
   ? `Esta obra no tiene ejemplar indexado para «${consulta}». El índice la encontró en ${otras.length} ${otras.length === 1 ? "obra" : "obras"} de la biblioteca.`
   : `Sin coincidencias de «${consulta}» en el índice de la biblioteca.`;
  for (const o of otras.slice(0, 6)) {
   const li = document.createElement("li");
   const a = document.createElement("a");
   a.href = o.lector; a.textContent = `${o.autor} — ${o.obra}`;
   li.append(a, document.createTextNode(` · ${o.recuento} apariciones`));
   lista.append(li);
  }
  return;
 }
 const o = propia[0];
 $("q-aviso").textContent = `${o.recuento} apariciones en el ejemplar indexado. Las páginas son del ejemplar en facsímil, que puede no ser el mismo que el de estos folios: la correspondencia se consigna, no se supone.`;
 for (const p of o.paginas) {
  const li = document.createElement("li");
  const aqui = document.createElement("button");
  aqui.type = "button"; aqui.textContent = `Imagen digital ${p} (solo si coincide el ejemplar)`;
  aqui.disabled = true;
  aqui.title = "No existe correspondencia validada entre páginas OCR y folios de esta edición";
  const alla = document.createElement("a");
  alla.href = `${o.lector}&pagina=${p}&q=${encodeURIComponent(consulta)}`;
  alla.textContent = "leer el texto";
  li.append(aqui, document.createTextNode(" · "), alla);
  lista.append(li);
 }
}

function herramientas() {
 const img = $("imagen"), lamina = $("lamina");
 $("mas").addEventListener("click", () => { escala = Math.min(escala * 1.25, 8); aplicarEncuadre(); });
 $("menos").addEventListener("click", () => {
  escala = Math.max(escala / 1.25, 0.5);
  if (escala === 1) { panX = 0; panY = 0; }
  aplicarEncuadre();
 });
 $("ajustar").addEventListener("click", ajustarEncuadre);
 new ResizeObserver(() => encajarFolio()).observe(lamina);
 // Pan only when zoomed; dragging the original at scale 1 must not displace it.
 let drag = null;
 lamina.addEventListener("pointerdown", e => {
  if (subrayando || escala <= 1 || e.button !== 0) return;
  drag = { x:e.clientX, y:e.clientY, panX, panY };
  lamina.setPointerCapture(e.pointerId);
  lamina.classList.add("arrastrando");
 });
 lamina.addEventListener("pointermove", e => {
  if (!drag || subrayando) return;
  const maxX = Math.max(0, (img.getBoundingClientRect().width - lamina.clientWidth) / 2 + 36);
  const maxY = Math.max(0, (img.getBoundingClientRect().height - lamina.clientHeight) / 2 + 36);
  panX = Math.max(-maxX, Math.min(maxX, drag.panX + e.clientX - drag.x));
  panY = Math.max(-maxY, Math.min(maxY, drag.panY + e.clientY - drag.y));
  aplicarEncuadre();
 });
 const stopDrag = () => { drag = null; lamina.classList.remove("arrastrando"); };
 lamina.addEventListener("pointerup", stopDrag);
 lamina.addEventListener("pointercancel", stopDrag);
 if ($("invertir")) $("invertir").addEventListener("click", e => {
  invertido = !invertido; e.currentTarget.setAttribute("aria-pressed", String(invertido)); filtros();
 });
 if ($("modo")) $("modo").addEventListener("change", filtros);
 $("galeria-buscar").addEventListener("click", filtrarGaleria);
 $("galeria-q").addEventListener("keydown", e => { if (e.key === "Enter") filtrarGaleria(); });
 $("galeria-todo").addEventListener("click", () => { $("galeria-q").value = ""; filtrarGaleria(); });
 $("galeria-mas").addEventListener("click", () => pintarGaleria(false));
 $("contraste").addEventListener("input", filtros);
 $("brillo").addEventListener("input", filtros);
 $("prev").addEventListener("click", () => mostrar(actual - 1));
 $("next").addEventListener("click", () => mostrar(actual + 1));
 $("numero").addEventListener("change", () => mostrar(Number($("numero").value) || 1));
 $("indice").addEventListener("change", () => mostrar(Number($("indice").value)));
 $("buscar").addEventListener("click", buscar);
 $("q").addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });
 document.addEventListener("keydown", e => {
  if (e.target.matches("input,select,textarea")) return;
  if (e.key === "ArrowLeft") mostrar(actual - 1);
  if (e.key === "ArrowRight") mostrar(actual + 1);
 });

 /* Subrayado: se arrastra sobre la imagen y queda una banda. Es del lector y
    vive en su navegador; no se publica. */
 $("subrayar").addEventListener("click", e => {
  subrayando = !subrayando;
  e.currentTarget.setAttribute("aria-pressed", String(subrayando));
 });
 $("limpiar").addEventListener("click", () => {
  marcasPorFolio.set(actual, []);
  almacen.escribir("vdl-subrayados-" + clave, [...marcasPorFolio]);
  pintarMarcas();
 });
 let inicio = null;
 lamina.addEventListener("pointerdown", e => {
  if (!subrayando) return;
  const caja = lamina.getBoundingClientRect();
  inicio = { x: (e.clientX - caja.left) / caja.width * 100, y: (e.clientY - caja.top) / caja.height * 100 };
 });
 lamina.addEventListener("pointerup", e => {
  lamina.classList.remove("arrastrando");
  if (!subrayando || !inicio) return;
  const caja = lamina.getBoundingClientRect();
  const x2 = (e.clientX - caja.left) / caja.width * 100, y2 = (e.clientY - caja.top) / caja.height * 100;
  const marca = {
   x: Math.min(inicio.x, x2), y: Math.min(inicio.y, y2),
   w: Math.abs(x2 - inicio.x), h: Math.max(Math.abs(y2 - inicio.y), 1.4)
  };
  inicio = null;
  if (marca.w < 1) return;
  const lista = marcasPorFolio.get(actual) || [];
  lista.push(marca);
  marcasPorFolio.set(actual, lista);
  almacen.escribir("vdl-subrayados-" + clave, [...marcasPorFolio]);
  pintarMarcas();
 });
}

async function arrancar() {
 selectorObras();
 herramientas();
 const guardados = almacen.leer("vdl-subrayados-" + clave);
 if (Array.isArray(guardados)) for (const [n, lista] of guardados) marcasPorFolio.set(Number(n), lista);
 /* El índice se lee de la biblioteca (R2), que es donde lo dejó el bajador de
    folios. La copia del repositorio queda de respaldo: el dominio devuelve la
    portada cuando no reconoce una ruta, y entonces el visor quedaba vacío. */
 const fuentes = [
  `https://libros.vitruvius-digital-library.org/folios/${clave}/indice-folios.json`,
  `data/r2/folios/${clave}.json`
 ];
 for (const fuente of fuentes) {
  try {
   const r = await fetch(fuente, { cache: "no-cache" });
   if (!r.ok) continue;
   const datos = await r.json();
   if (datos && datos.schema === "vdl-folios-obra-1" && Array.isArray(datos.folios) && datos.folios.length &&
       datos.folios.every((f,i) => f.imagenDigital === i+1 && f.imagen && f.miniatura)) {
    indice = datos;
    break;
   }
  } catch { /* se prueba la siguiente */ }
 }
 if (!indice) {
  $("estado").textContent = "Los folios de esta obra todavía no están alojados: la descarga a la biblioteca está en curso. " +
   "Mientras tanto la obra se puede leer en el visor de facsímiles.";
  const a = document.createElement("a");
  a.href = "buscador-facsimiles-clasicos.html?obra=" + encodeURIComponent(clave);
  a.textContent = "Abrir en el visor de facsímiles";
  $("estado").append(document.createTextNode(" "), a);
  return;
 }
 ficha();
 filtrados = indice.folios;
 pintarGaleria(true);
 const pedida = Number(params.get("imagen")) || 1;
 mostrar(pedida);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar, { once: true });
else arrancar();
})();
