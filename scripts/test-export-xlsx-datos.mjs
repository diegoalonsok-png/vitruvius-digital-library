/* El botón «Descargar Excel académico» de Bibliotheca no baja un archivo
   guardado: arma la planilla en el navegador con los datos del día. Si un
   registro derivado queda desincronizado del catálogo, el exportador se niega a
   construirla —a propósito, para no publicar una planilla incompleta— y el
   botón deja de funcionar sin que nadie se entere.

   Esta prueba comprueba, contra los archivos reales, lo mismo que exige el
   exportador, y además que cada facsímil que se ofrece en la planilla exista en
   el catálogo de R2. Corre en la tanda diaria. */
import fs from "node:fs";
import assert from "node:assert/strict";

const leer = ruta => JSON.parse(fs.readFileSync(ruta, "utf8"));
const catalogo = leer("data/bibliotheca-graeca-latina-I-bce-I-ce.json");
const ids = new Set(catalogo.works.map(w => w.id));

const REGISTROS = [
  ["estándar bibliográfico", "data/classics-corpus/vitruvius-standard-222.json", "records", "workId"],
  ["aparato ecdótico", "data/classics-corpus/ecdotics-222.json", "records", "workId"],
  ["autoridad y proveniencia", "data/perseus-provenance-audit.json", "records", "workId"],
  ["árboles codicológicos", "data/classics-corpus/codicological-trees-222.json", "records", "workId"]
];

let failed = 0;
const check = (label, fn) => { try { fn(); console.log("PASS", label); } catch (e) { failed++; console.error("FAIL", label, e.message); } };

check(`el catálogo maestro no tiene ids repetidos (${ids.size} obras)`, () => {
  assert.equal(ids.size, catalogo.works.length);
});

for (const [nombre, ruta, clave, campo] of REGISTROS) {
  check(`el ${nombre} cubre exactamente las obras del catálogo`, () => {
    const registros = leer(ruta)[clave];
    const suyos = new Set(registros.map(r => r[campo]));
    assert.equal(suyos.size, registros.length, "ids repetidos en " + ruta);
    const faltan = [...ids].filter(i => !suyos.has(i));
    const sobran = [...suyos].filter(i => !ids.has(i));
    assert.deepEqual(
      { faltan: faltan.slice(0, 5), sobran: sobran.slice(0, 5) },
      { faltan: [], sobran: [] },
      `${ruta}: ${faltan.length} obras sin registro y ${sobran.length} registros sin obra. ` +
      "Correr scripts/r2-fichas-obras-nuevas.py y los generadores de datos derivados."
    );
  });
}

check("cada facsímil ofrecido en la planilla existe en el catálogo de R2", () => {
  if (!fs.existsSync("data/r2/vinculos-repertorio.json")) { console.log("   (sin vínculos: nada que comprobar)"); return; }
  const vinculos = leer("data/r2/vinculos-repertorio.json");
  const enR2 = new Set(leer("data/r2/catalogo-clasicos-r2.json").items.map(x => x.id));
  for (const [workId, lista] of Object.entries(vinculos.porObra || {})) {
    assert.ok(ids.has(workId), "vínculo a una obra que no está en el catálogo: " + workId);
    for (const f of lista) assert.ok(enR2.has(f.r2), "facsímil inexistente en R2: " + f.r2);
  }
});

check("las cifras publicadas acompañan al catálogo", () => {
  if (!fs.existsSync("data/cifras-corpus.json")) { console.log("   (sin cifras: nada que comprobar)"); return; }
  const cifras = leer("data/cifras-corpus.json");
  assert.equal(cifras.obras, catalogo.works.length,
    "data/cifras-corpus.json quedó viejo: correr scripts/cifras-corpus.py");
});

if (failed) { console.error(`\n${failed} comprobaciones fallidas: el botón de Excel no construiría la planilla`); process.exit(1); }
console.log("\nDatos del Excel académico: sincronizados, la planilla se construye");
