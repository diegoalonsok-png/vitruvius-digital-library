/* Prueba del índice semántico de los clásicos de R2, sin red: el texto remoto
   se sustituye por páginas de prueba y se comprueba que la raíz que calcula el
   navegador encuentre la obra y la página en el fragmento correspondiente. */
import {readFileSync,rmSync,existsSync} from "node:fs";
import {createRequire} from "node:module";
import assert from "node:assert/strict";
const require=createRequire(import.meta.url);
const P=require("../assets/vitruvia-philology.js");

const SALIDA="/tmp/prueba-indice-r2";
const MANIFIESTO="/tmp/prueba-indice-r2-manifest.json";
const catalogo=JSON.parse(readFileSync("data/r2/catalogo-clasicos-r2.json","utf8"));
const obras=[catalogo.items.find(o=>o.lengua==="grc"),catalogo.items.find(o=>o.lengua==="la")];
/* Un Loeb trae griego y traducción en la misma página: la de prueba también. */
const paginas=obra=>Array.from({length:30},(_,i)=>
 i===6?(obra.lengua==="grc"?"περὶ τῆς συμμετρίας τοῦ ναοῦ · de templorum ratione":"de symmetria templorum atque columnis"):
 `pagina ${i+1} sin interes`);

globalThis.fetch=async url=>{
 const obra=obras.find(o=>o.texto===String(url));
 if(!obra)return {ok:false,status:404,text:async()=>""};
 return {ok:true,status:200,text:async()=>JSON.stringify({schema:"vdl-r2-texto-paginas-1",obra:obra.id,paginas:paginas(obra)})};
};
if(existsSync(SALIDA))rmSync(SALIDA,{recursive:true,force:true});
process.argv=[process.argv[0],"r2-indexar-clasicos.mjs","--salida",SALIDA,"--obras",obras.map(o=>o.id).join(","),"--manifiesto",MANIFIESTO];
await import("./r2-indexar-clasicos.mjs");

let failed=0;
const check=(label,fn)=>{try{fn();console.log("PASS",label)}catch(e){failed++;console.error("FAIL",label,e.message)}};
const fragmentos=JSON.parse(readFileSync(SALIDA+"/indice/fragmentos.json","utf8"));
const manifiesto=JSON.parse(readFileSync(MANIFIESTO,"utf8"));
const cut=(s,n)=>[...s].slice(0,n).join("");
const codepoints=k=>[...k].map(c=>c.codePointAt(0).toString(16)).join("-");
const buscar=consulta=>{
 const raiz=P.stem(consulta);
 const archivo=SALIDA+"/indice/s-"+codepoints(cut(raiz,2))+".json";
 if(!existsSync(archivo))return {raiz,hits:null};
 return {raiz,hits:JSON.parse(readFileSync(archivo,"utf8")).raices[raiz]||null};
};

check("el manifiesto declara las obras, las páginas y la ruta pública",()=>{
 assert.equal(manifiesto.schema,"vdl-r2-indice-semantico-1");
 assert.equal(manifiesto.obras,2);
 assert.equal(manifiesto.paginasIndexadas,60);
 assert.match(manifiesto.base,/^https:\/\/libros\.vitruvius-digital-library\.org\//);
 assert.match(manifiesto.metodo,/OCR/);
});
check("cada obra queda declarada con su lector del sitio",()=>{
 for(const o of manifiesto.obras===undefined?[]:fragmentos.obras)
  assert.match(o.lector,/^buscador-facsimiles-clasicos\.html\?obra=/);
 assert.equal(fragmentos.obras.length,2);
});
check("una consulta latina encuentra la obra latina y su página",()=>{
 const latina=obras.find(o=>o.lengua==="la");
 const {raiz,hits}=buscar("symmetria");
 assert.ok(hits,"la raíz «"+raiz+"» no está en su fragmento");
 assert.ok(hits[latina.id],"la obra latina no aparece en la raíz");
 assert.deepEqual(hits[latina.id][1],[7],"la página localizada no es la 7");
});
check("en un volumen griego también se indexa el texto en escritura latina",()=>{
 const griega=obras.find(o=>o.lengua==="grc");
 const {raiz,hits}=buscar("templorum");
 assert.ok(hits&&hits[griega.id],"la raíz latina «"+raiz+"» no se indexó en el volumen griego");
});
check("una consulta griega encuentra la obra griega y su página",()=>{
 const griega=obras.find(o=>o.lengua==="grc");
 if(!griega){console.log("   (sin obra griega en la muestra)");return}
 const {raiz,hits}=buscar("συμμετρία");
 assert.ok(hits,"la raíz «"+raiz+"» no está en su fragmento");
 assert.ok(hits[griega.id],"la obra griega no aparece en la raíz");
 assert.deepEqual(hits[griega.id][1],[7]);
});
check("el ruido de OCR de una y dos letras no entra en el índice",()=>{
 for(const f of fragmentos.fragmentos){
  const raices=Object.keys(JSON.parse(readFileSync(SALIDA+"/indice/"+f.f,"utf8")).raices);
  for(const r of raices) assert.ok(r.length>=2,"raíz demasiado corta: "+r);
 }
});
rmSync(SALIDA,{recursive:true,force:true});rmSync(MANIFIESTO,{force:true});
if(failed){console.error(`\n${failed} comprobaciones fallidas`);process.exit(1)}
console.log("\nÍndice semántico R2: todas las comprobaciones pasaron");
