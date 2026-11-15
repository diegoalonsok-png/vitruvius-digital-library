/* La falta de conexión R2 no equivale a ausencia filológica de una palabra. */
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const R2=require("../assets/r2-clasicos-busqueda.js");
R2.usarLector(async ruta=>{
 if(ruta===R2.MANIFIESTO)return {base:"https://r2.test/indice/"};
 throw Error("simulated HTTP 503");
});
const r=await R2.lookup("symmetria");
assert.equal(r.obras.length,0);
assert.equal(r.errorTecnico,true,"un fallo de infraestructura debe distinguirse de cero resultados");
assert.match(r.motivo,/índice R2 no está disponible/i);
console.log("PASS: fallo R2 no se presenta como ausencia de palabra");
