/* Índice semántico de los clásicos alojados en Cloudflare R2.
 *
 * Construye un índice invertido de raíces sobre el texto por páginas que ya
 * está en R2 (clasicos/texto/<obra>.json) y lo escribe en fragmentos para que
 * una consulta descargue sólo el fragmento de su raíz. La raíz se calcula con
 * assets/vitruvia-philology.js, el MISMO módulo que aplica el navegador a la
 * consulta: no es lematización morfológica y no afirma análisis gramatical.
 *
 * El texto proviene del OCR de Internet Archive y NO está revisado: las páginas
 * son localizaciones para leer el facsímil, no loci antiguos verificados.
 *
 * No escribe nada en el repositorio salvo el manifiesto liviano de data/r2.
 * Los fragmentos se suben a R2 en un paso aparte (scripts/r2-subir-indice.py).
 *
 * Uso: node scripts/r2-indexar-clasicos.mjs [--salida DIR] [--limite N]
 *       [--obras id1,id2] [--manifiesto ARCHIVO]
 */
import {readFileSync,writeFileSync,mkdirSync,rmSync,existsSync,createWriteStream,readdirSync,createReadStream} from "node:fs";
import {createInterface} from "node:readline";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const P=require("../assets/vitruvia-philology.js");

const args=process.argv.slice(2);
const opcion=(nombre,valor)=>{const i=args.indexOf(nombre);return i>=0&&args[i+1]?args[i+1]:valor};
const SALIDA=opcion("--salida","/tmp/indice-r2");
const LIMITE=Number(opcion("--limite","0"))||0;
const SOLO=(opcion("--obras","")||"").split(",").map(s=>s.trim()).filter(Boolean);
const CATALOGO="data/r2/catalogo-clasicos-r2.json";
const MANIFIESTO=opcion("--manifiesto","data/r2/indice-semantico-manifest.json");
const MAX_PAGINAS=24;      // páginas guardadas por raíz y obra
const MIN_TOKEN=3;         // el OCR produce mucha basura de una y dos letras
const cut=(stem,n)=>[...stem].slice(0,n).join("");
const codepoints=key=>[...key].map(ch=>ch.codePointAt(0).toString(16)).join("-");
const nombreFragmento=key=>"s-"+codepoints(key)+".json";
const clave=stem=>cut(stem,2);
const GRIEGO=/[\u0370-\u03ff\u1f00-\u1fff]/;

const catalogo=JSON.parse(readFileSync(CATALOGO,"utf8"));
const seleccionadas=SOLO.length?catalogo.items.filter(o=>SOLO.includes(o.id)):catalogo.items;
const obras=LIMITE?seleccionadas.slice(0,LIMITE):seleccionadas;
if(existsSync(SALIDA))rmSync(SALIDA,{recursive:true,force:true});
mkdirSync(SALIDA+"/crudo",{recursive:true});

const flujos=new Map();
const escribir=(key,linea)=>{
 let flujo=flujos.get(key);
 if(!flujo){flujo=createWriteStream(SALIDA+"/crudo/"+codepoints(key)+".jsonl",{flags:"a"});flujos.set(key,flujo)}
 flujo.write(linea+"\n");
};
const cerrar=()=>Promise.all([...flujos.values()].map(f=>new Promise(r=>f.end(r))));

const resumen=[];let raicesTotales=0,paginasTotales=0,bytesTexto=0;
for(const obra of obras){
 const respuesta=await fetch(obra.texto);
 if(!respuesta.ok){console.error("FALLA",obra.id,respuesta.status);continue}
 const cuerpo=await respuesta.text();
 bytesTexto+=cuerpo.length;
 const documento=JSON.parse(cuerpo);
 const paginas=documento.paginas||[];
 /* La lengua del volumen no decide la regla: los Loeb y las ediciones comentadas
    traen el griego y su traducción en la misma página, de modo que cada palabra
    se recorta según la escritura en que está escrita. */
 const aqui=new Map();   // raíz → [recuento, [páginas]]
 let conTexto=0,fichas=0;
 paginas.forEach((texto,i)=>{
  const pagina=i+1;
  const plegado=P.fold(texto||"");
  if(!plegado)return;
  conTexto++;
  const vistas=new Map();
  for(const palabra of plegado.split(" ")){
   if(palabra.length<MIN_TOKEN)continue;
   const raiz=P.stem(palabra,GRIEGO.test(palabra)?"greek":"latin");
   if(!raiz||raiz.length<2)continue;
   vistas.set(raiz,(vistas.get(raiz)||0)+1);
  }
  for(const [raiz,veces] of vistas){
   let entrada=aqui.get(raiz);
   if(!entrada){entrada=[0,[]];aqui.set(raiz,entrada);fichas++}
   entrada[0]+=veces;
   if(entrada[1].length<MAX_PAGINAS)entrada[1].push(pagina);
  }
 });
 for(const [raiz,[veces,paginasRaiz]] of aqui){
  escribir(clave(raiz),JSON.stringify({s:raiz,o:obra.id,c:veces,p:paginasRaiz}));
 }
 raicesTotales+=fichas;paginasTotales+=conTexto;
 resumen.push({id:obra.id,autor:obra.autor,obra:obra.obra,lengua:obra.lengua,
  anio:obra.anio,paginas:paginas.length,paginasConTexto:conTexto,raices:fichas,
  pdf:obra.pdf,lector:"buscador-facsimiles-clasicos.html?obra="+obra.id});
 console.log("OK ",obra.id,conTexto+"/"+paginas.length,"págs ·",fichas,"raíces");
}
await cerrar();

/* Segunda pasada: cada fragmento se agrupa por separado, de modo que la
   memoria no crece con el corpus entero. */
mkdirSync(SALIDA+"/indice",{recursive:true});
const fragmentos=[];
for(const archivo of readdirSync(SALIDA+"/crudo")){
 const key=archivo.replace(/\.jsonl$/,"");
 const raices={};
 const lector=createInterface({input:createReadStream(SALIDA+"/crudo/"+archivo),crlfDelay:Infinity});
 for await (const linea of lector){
  if(!linea)continue;
  const {s,o,c,p}=JSON.parse(linea);
  (raices[s]||(raices[s]={}))[o]=[c,p];
 }
 const texto=JSON.stringify({schema:"vdl-r2-indice-clasicos-1",k:key,raices});
 const destino="s-"+key+".json";
 writeFileSync(SALIDA+"/indice/"+destino,texto);
 fragmentos.push({k:key,f:destino,raices:Object.keys(raices).length,bytes:texto.length});
}
rmSync(SALIDA+"/crudo",{recursive:true,force:true});
fragmentos.sort((a,b)=>a.k.localeCompare(b.k));
const bytes=fragmentos.reduce((n,f)=>n+f.bytes,0);
const indice={schema:"vdl-r2-indice-clasicos-fragmentos-1",generado:new Date().toISOString().slice(0,10),
 obras:resumen,fragmentos:fragmentos.map(f=>({k:f.k,f:f.f,n:f.raices}))};
writeFileSync(SALIDA+"/indice/fragmentos.json",JSON.stringify(indice));

const manifiesto={
 schema:"vdl-r2-indice-semantico-1",
 generado:indice.generado,
 base:"https://libros.vitruvius-digital-library.org/clasicos/indice/",
 metodo:"Índice invertido de raíces sobre el texto por páginas alojado en R2. La raíz se recorta con assets/vitruvia-philology.js, la misma que aplica el navegador a la consulta: no es lematización morfológica ni análisis gramatical. El OCR de Internet Archive no está revisado; cada resultado remite a la página del facsímil, no a un locus antiguo verificado.",
 obras:resumen.length,
 paginasIndexadas:paginasTotales,
 raicesPorObra:raicesTotales,
 fragmentos:fragmentos.length,
 bytes,
 mayorFragmento:fragmentos.slice().sort((a,b)=>b.bytes-a.bytes)[0]?.bytes||0,
 nota:"Los fragmentos viven en R2, no en el repositorio. Aquí sólo quedan las cifras y la ruta pública."
};
writeFileSync(MANIFIESTO,JSON.stringify(manifiesto,null,1)+"\n");
console.log("\n"+resumen.length+" obras · "+paginasTotales.toLocaleString("es-AR")+" páginas indexadas · "+
 fragmentos.length+" fragmentos · "+(bytes/1048576).toFixed(1)+" MB · mayor fragmento "+
 (manifiesto.mayorFragmento/1024).toFixed(0)+" KB");
console.log("Fragmentos en "+SALIDA+"/indice (para subir a R2). Manifiesto: "+MANIFIESTO);
