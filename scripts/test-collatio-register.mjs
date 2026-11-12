/* Comprueba que el registro de collatio del aparato crítico se puebla con datos reales
   y que no publica ninguna entrada que no haya pasado los controles de validación. */
import {readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const data=JSON.parse(readFileSync("data/apparatus/collatio-validada.json","utf8"));
const html=readFileSync("apparatus-criticus.html","utf8");
let fallos=0;
const check=(cond,msg)=>{if(!cond){console.error("  ✗ "+msg);fallos++}else console.log("  ✓ "+msg)};

console.log("datos de la collatio validada");
check(data.recuentos.confirmadas>0,`${data.recuentos.confirmadas} entradas confirmadas`);
check(data.confirmadas.every(e=>e.bilingue),"toda entrada confirmada tiene doble fuente bilingüe");
check(data.confirmadas.every(e=>!(e.motivosDeRevision||[]).length),"ninguna confirmada arrastra motivos de revisión");
check(data.confirmadas.every(e=>/^\d+\.(praef|\d+)(\.\d+)?$/.test(e.locus)),"todo locus tiene forma canónica");
check(data.folioLocus.every(f=>/^\d{1,3}[rv]$/.test(f.folio)),"todo folio tiene forma n[rv]");

// orden codicológico de los folios publicados
const fk=f=>{const m=/^(\d+)([rv])$/.exec(f);return m?+m[1]*2+(m[2]==="v"?1:0):1e6};
const lk=l=>{const[b,c,s]=String(l).split(".");return (+b||0)*1e6+((c==="praef"?0:+c||0)*1e3)+(+s||0)};
const serie=data.folioLocus.map(f=>[fk(f.folio),lk(f.loci[0])]).sort((a,b)=>a[0]-b[0]);
let roto=0;for(let i=1;i<serie.length;i++)if(serie[i][1]<serie[i-1][1])roto++;
check(roto===0,`la serie folio → locus publicada es monótona (${roto} rupturas)`);

console.log("\npágina del aparato crítico");
check(!/ninguna variante manuscrita publicada/.test(html),"el estado ya no afirma que no hay variantes publicadas");
check(/sin datos certificados para publicación/.test(html)===false,"la ficha modelo vacía fue reemplazada");
check(/id="coll-rows"/.test(html),"la tabla del registro existe");

const dom=new JSDOM(html,{url:"https://example.org/apparatus-criticus.html",runScripts:"outside-only"});
const {window}=dom;
window.fetch=async u=>String(u).includes("collatio-validada")
  ? {ok:true,status:200,json:async()=>data}
  : {ok:false,status:404,json:async()=>({})};
const src=readFileSync("assets/collatio-register.js","utf8");
window.eval(src);
window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
await new Promise(r=>setTimeout(r,120));
const filas=window.document.querySelectorAll("#coll-rows tr");
check(filas.length>0,`la tabla se pobló con ${filas.length} filas`);
const metrics=window.document.getElementById("coll-metrics").textContent;
check(metrics.includes(String(data.recuentos.confirmadas)),"las métricas muestran el recuento real");
check(/cola de revisión/.test(metrics),"las métricas declaran la cola de revisión");
const primera=window.document.querySelector("#coll-rows tr th a");
check(primera&&/^Vitr\./.test(primera.textContent),"el locus se cita en forma académica (Vitr. …)");
const enlaces=[...window.document.querySelectorAll("#coll-rows a")].map(a=>a.getAttribute("href"));
check(enlaces.some(h=>h.startsWith("codex-h-folios-local.html?folio=")),"hay enlace al folio del códice");
check(enlaces.some(h=>h.startsWith("lector-bilingue.html?")),"hay enlace al pasaje");
check(enlaces.some(h=>h.includes("#page=")),"hay enlace a la página del aparato impreso");

console.log(fallos?`\n${fallos} comprobaciones fallidas`:"\nTodas las comprobaciones pasaron");
process.exit(fallos?1:0);
