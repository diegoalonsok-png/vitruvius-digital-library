/* El registro de búsqueda puede apuntar a R2, pero sólo a ese dominio: una ruta
   suelta invalida el registro entero y la búsqueda cae al listado de reserva. */
import fs from "node:fs";
import assert from "node:assert/strict";
const registro=JSON.parse(fs.readFileSync("data/classics-corpus/search-registry.json","utf8"));
const motor=fs.readFileSync("assets/classics-corpus-search.js","utf8");
let failed=0;
const check=(l,f)=>{try{f();console.log("PASS",l)}catch(e){failed++;console.error("FAIL",l,e.message)}};

check("el motor admite el corpus servido desde R2",()=>{
 assert.match(motor,/libros\\\.vitruvius-digital-library\\\.org\\\/corpus/,"el validador no contempla la ruta de R2");
});
check("toda ruta remota del registro va al dominio de la biblioteca",()=>{
 const malas=registro.entries.filter(e=>/^https?:/.test(e.path||"")&&
   !/^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/[a-z0-9-]+\.json$/.test(e.path));
 assert.equal(malas.length,0,"rutas remotas inesperadas: "+malas.map(e=>e.workId).join(", "));
});
check("no hay fichas repetidas en el registro",()=>{
 const vistas=new Set(),repetidas=[];
 for(const e of registro.entries){const k=e.workId+"·"+e.language;if(vistas.has(k))repetidas.push(k);vistas.add(k)}
 assert.equal(repetidas.length,0,"repetidas: "+repetidas.join(", "));
});
check("cada entrada local existe en el repositorio",()=>{
 const faltan=registro.entries.filter(e=>!/^https?:/.test(e.path||"")&&!fs.existsSync(e.path));
 assert.equal(faltan.length,0,"rutas sin archivo: "+faltan.map(e=>e.path).join(", "));
});
console.log(failed?`\n${failed} comprobaciones fallidas`:"\nRegistro de búsqueda: todas las comprobaciones pasaron");
process.exitCode=failed?1:0;
