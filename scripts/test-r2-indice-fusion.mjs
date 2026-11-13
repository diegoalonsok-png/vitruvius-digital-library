/* Prueba de la fusión incremental: al indexar sólo la tanda del día, el índice
   publicado no se pierde. Las raíces de las demás obras se conservan y las de
   la obra reindexada se reemplazan. Sin red: R2 se sustituye por datos de prueba. */
import {readFileSync,rmSync,existsSync} from "node:fs";
import assert from "node:assert/strict";

const SALIDA="/tmp/prueba-indice-fusion";
const MANIFIESTO="/tmp/prueba-indice-fusion-manifest.json";
const BASE="https://pruebas.local/indice/";
const catalogo=JSON.parse(readFileSync("data/r2/catalogo-clasicos-r2.json","utf8"));
const obra=catalogo.items.find(o=>o.lengua==="la");
const otra=catalogo.items.find(o=>o.lengua==="grc");

const paginas=Array.from({length:25},(_,i)=>i===3?"de symmetria aedium":"pagina sin interes");
/* Lo ya publicado: un fragmento con una raíz de OTRA obra y una entrada vieja
   de la obra que vamos a reindexar. */
const previo={
 "s-73-79.json":{schema:"vdl-r2-indice-clasicos-1",k:"sy",raices:{
   symmetri:{[otra.id]:[5,[11,12]],[obra.id]:[99,[999]]},
   syntax:{[otra.id]:[2,[7]]}}},
 "fragmentos.json":{schema:"vdl-r2-indice-clasicos-fragmentos-1",generado:"2026-11-12",
   obras:[{id:otra.id,autor:otra.autor,obra:otra.obra,lengua:otra.lengua,paginas:400,paginasConTexto:390,raices:1200,
           pdf:otra.pdf,lector:"buscador-facsimiles-clasicos.html?obra="+otra.id}],
   fragmentos:[{k:"sy",f:"s-73-79.json",n:2},{k:"ab",f:"s-61-62.json",n:40}]}
};
globalThis.fetch=async url=>{
 const u=String(url);
 if(u===obra.texto)return {ok:true,status:200,text:async()=>JSON.stringify({paginas})};
 if(u.startsWith(BASE)){
  const nombre=u.slice(BASE.length);
  return previo[nombre]?{ok:true,status:200,json:async()=>previo[nombre]}:{ok:false,status:404,json:async()=>({})};
 }
 return {ok:false,status:404,text:async()=>""};
};
if(existsSync(SALIDA))rmSync(SALIDA,{recursive:true,force:true});
process.argv=[process.argv[0],"r2-indexar-clasicos.mjs","--salida",SALIDA,"--obras",obra.id,
 "--manifiesto",MANIFIESTO,"--base",BASE];
await import("./r2-indexar-clasicos.mjs");

let failed=0;
const check=(label,fn)=>{try{fn();console.log("PASS",label)}catch(e){failed++;console.error("FAIL",label,e.message)}};
const fragmento=JSON.parse(readFileSync(SALIDA+"/indice/s-73-79.json","utf8"));
const listado=JSON.parse(readFileSync(SALIDA+"/indice/fragmentos.json","utf8"));

check("la raíz de otra obra sobrevive a la tanda del día",()=>{
 assert.ok(fragmento.raices.symmetri[otra.id],"se perdió la entrada de la otra obra");
 assert.deepEqual(fragmento.raices.symmetri[otra.id],[5,[11,12]]);
 assert.ok(fragmento.raices.syntax,"se perdió una raíz que no estaba en la tanda");
});
check("la entrada vieja de la obra reindexada se reemplaza",()=>{
 assert.deepEqual(fragmento.raices.symmetri[obra.id],[1,[4]],
  "debía quedar el recuento nuevo, no el publicado");
});
check("el listado reúne las obras publicadas y las de la tanda",()=>{
 const ids=listado.obras.map(o=>o.id);
 assert.ok(ids.includes(otra.id)&&ids.includes(obra.id),"faltan obras en el listado: "+ids.join(","));
 const claves=listado.fragmentos.map(f=>f.k);
 assert.ok(claves.includes("ab"),"se perdió un fragmento publicado que no tocó la tanda");
});
check("el manifiesto cuenta el índice completo, no sólo la tanda",()=>{
 const m=JSON.parse(readFileSync(MANIFIESTO,"utf8"));
 assert.equal(m.obras,2,"obras declaradas: "+m.obras);
 assert.ok(m.paginasIndexadas>=390,"páginas declaradas: "+m.paginasIndexadas);
});
rmSync(SALIDA,{recursive:true,force:true});rmSync(MANIFIESTO,{force:true});
if(failed){console.error(`\n${failed} comprobaciones fallidas`);process.exit(1)}
console.log("\nFusión incremental del índice: todas las comprobaciones pasaron");
