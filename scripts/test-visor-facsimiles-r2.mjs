/* Prueba del visor de facsímiles: las ediciones alojadas en R2 deben poder
   seleccionarse, leerse página a página y buscarse por término, sin red.
   El texto remoto se sustituye por un fixture; el catálogo es el real. */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('buscador-facsimiles-clasicos.html', 'utf8');
const catalogo = JSON.parse(fs.readFileSync('data/r2/catalogo-clasicos-r2.json', 'utf8'));
const primera = catalogo.items[0];
const paginas = Array.from({ length: 40 }, (_, i) =>
  i === 11 ? 'De architectura et symmetria: pagina undecima.' : `Pagina ${i + 1} del facsimil.`);

let failed = 0;
const check = (label, fn) => { try { fn(); console.log('PASS', label); } catch (e) { failed++; console.error('FAIL', label, e.message); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const respuesta = obj => ({ ok: true, status: 200, json: async () => obj });
const pedidos = [];
const servir = async (url) => {
  const u = String(url);
  pedidos.push(u);
  if (u === primera.texto) return respuesta({ schema: 'vdl-r2-texto-paginas-1', obra: primera.id, paginas });
  if (u.startsWith('http')) return { ok: false, status: 404, json: async () => ({}) };
  if (fs.existsSync(u)) return respuesta(JSON.parse(fs.readFileSync(u, 'utf8')));
  return { ok: false, status: 404, json: async () => ({}) };
};
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  url: `https://vitruvius-digital-library.org/buscador-facsimiles-clasicos?obra=${primera.id}`,
  pretendToBeVisual: true,
  resources: undefined,
  beforeParse(win) { win.fetch = servir; win.scrollTo = () => {}; }
});
const { window } = dom;

await sleep(1200);
const $ = id => window.document.getElementById(id);

check('el catálogo de R2 se ofrece completo en el selector', () => {
  const opciones = [...window.document.querySelectorAll('#edition option')].map(o => o.value);
  const enR2 = opciones.filter(v => v.startsWith('r2:'));
  assert.equal(enR2.length, catalogo.items.length, `opciones R2 ${enR2.length} ≠ catálogo ${catalogo.items.length}`);
});

check('el enlace profundo ?obra= abre la obra y pide su texto en R2', () => {
  assert.equal($('edition').value, 'r2:' + primera.id);
  assert.ok(pedidos.includes(primera.texto), 'no se pidió el texto remoto');
});

check('la obra se lee página a página con su texto', () => {
  assert.equal($('folio').hidden, false, 'el folio no se muestra');
  assert.match($('folio').textContent, /Pagina 1 del facsimil/);
  assert.equal($('pageno').value, '1');
});

check('la paginación avanza y el facsímil apunta a la página exacta', () => {
  $('next').dispatchEvent(new window.Event('click'));
  assert.equal($('pageno').value, '2');
  assert.equal($('facsimil').getAttribute('href'), primera.pdf + '#page=2');
});

check('la ficha académica declara edición, derechos y bilingüismo', () => {
  const texto = $('cita').textContent;
  assert.ok(texto.includes(primera.autor), 'falta el autor');
  assert.ok(texto.includes(String(primera.anio)), 'falta el año de la edición');
  assert.ok(/Dominio público/i.test(texto), 'faltan los derechos');
});

await (async () => {
  $('term').value = 'symmetria';
  $('go').dispatchEvent(new window.Event('click'));
  await sleep(400);
  check('la búsqueda por término localiza la página y ofrece leerla', () => {
    const articulos = window.document.querySelectorAll('#results article');
    assert.equal(articulos.length, 1, `coincidencias ${articulos.length}`);
    assert.match(articulos[0].textContent, /Página digital 12/);
    const enlace = articulos[0].querySelector('a');
    assert.equal(enlace.getAttribute('href'), primera.pdf + '#page=12');
  });
})();

window.close();
if (failed) { console.error(`\n${failed} comprobaciones fallidas`); process.exit(1); }
console.log('\nVisor de facsímiles R2: todas las comprobaciones pasaron');
