/* Prueba de la búsqueda de palabras en los clásicos de R2, sin red: el
   manifiesto, el catálogo y el fragmento se sirven desde el repositorio o
   desde datos de prueba, y se comprueba que una palabra lleve a la obra, a su
   página y al visor del sitio. */
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import assert from "node:assert/strict";
const require=createRequire(import.meta.url);
const P=require("../assets/vitruvia-philology.js");
const R2=require("../assets/r2-clasicos-busqueda.js");

const catalogo=JSON.parse(readFileSync("data/r2/catalogo-clasicos-r2.json","utf8"));
const latina=catalogo.items.find(o=>o.lengua==="la");
const griega=catalogo.items.find(o=>o.lengua==="grc");
const cut=(s,n)=>[...s].slice(0,n).join("");
const codepoints=k=>[...k].map(c=>c.codePointAt(0).toString(16)).join("-");
const raiz=p=>P.stem(p,/[Ͱ-Ͽἀ-῿]/.test(p)?"greek":"latin");
const BASE="https://libros.vitruvius-digital-library.org/clasicos/indice/";
const fragmentos={};
const sembrar=(palabra,obra,recuento,paginas)=>{
 const r=raiz(palabra);const archivo=BASE+"s-"+codepoints(cut(r,2))+".json";
 const f=fragmentos[archivo]||(fragmentos[archivo]={schema:"vdl-r2-indice-clasicos-1",k:cut(r,2),raices:{}});
 (f.raices[r]||(f.raices[r]={}))[obra]=[recuento,paginas];
};
sembrar("symmetria",latina.id,14,[7,88,210]);
sembrar("columnis",latina.id,9,[88,211]);
sembrar("symmetria",griega.id,2,[401]);
sembrar("συμμετρία",griega.id,31,[12,55]);

const pedidos=[];
R2.usarLector(async ruta=>{
 pedidos.push(ruta);
 if(ruta===R2.CATALOGO)return catalogo;
 if(ruta===R2.MANIFIESTO)return {schema:"vdl-r2-indice-semantico-1",base:BASE,obras:catalogo.items.length};
 if(fragmentos[ruta])return fragmentos[ruta];
 throw Error("404 "+ruta);
});

let failed=0;
const check=async(label,fn)=>{try{await fn();console.log("PASS",label)}catch(e){failed++;console.error("FAIL",label,e.message)}};

await check("una palabra latina devuelve la obra, su recuento y sus páginas",async()=>{
 const r=await R2.lookup("symmetria");
 assert.equal(r.obras.length,2,"obras halladas: "+r.obras.length);
 const primera=r.obras[0];
 assert.equal(primera.id,latina.id,"la obra más frecuente no es la esperada");
 assert.equal(primera.recuento,14);
 assert.deepEqual(primera.paginas,[7,88,210]);
});
await check("el resultado abre el visor del sitio, no el PDF remoto",async()=>{
 const r=await R2.lookup("symmetria");
 assert.equal(r.obras[0].lector,"buscador-facsimiles-clasicos.html?obra="+latina.id);
});
await check("una palabra griega encuentra el volumen griego",async()=>{
 const r=await R2.lookup("συμμετρίας");
 assert.ok(r.obras.some(o=>o.id===griega.id),"no apareció el volumen griego");
});
await check("dos palabras exigen que la obra contenga las dos",async()=>{
 const r=await R2.lookup("symmetria columnis");
 assert.equal(r.obras.length,1);
 assert.equal(r.obras[0].id,latina.id);
 assert.deepEqual(r.obras[0].paginas,[88,211],"debe localizar por la palabra menos frecuente");
});
await check("una palabra ausente no inventa resultados",async()=>{
 const r=await R2.lookup("zzzqwerty");
 assert.equal(r.obras.length,0);
 assert.ok(r.motivo,"debe explicar por qué no hay resultados");
});
await check("sólo se descarga el fragmento de la raíz consultada",async()=>{
 const descargas=pedidos.filter(p=>p.startsWith(BASE));
 assert.ok(descargas.length<=4,"fragmentos descargados: "+descargas.length);
});

if(failed){console.error(`\n${failed} comprobaciones fallidas`);process.exit(1)}
console.log("\nBúsqueda en clásicos de R2: todas las comprobaciones pasaron");
