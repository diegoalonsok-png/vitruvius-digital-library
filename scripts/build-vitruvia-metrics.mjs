#!/usr/bin/env node
/* Instantánea de los recuentos del catálogo que Vitruvia muestra al abrir.
 *
 * Motivo: las cifras se obtenían descargando 836 KB de índices antes de pintar
 * la página. Aquí se precalculan con la MISMA regla que aplica el buscador en
 * tiempo de ejecución, se publican en data/vitruvia-metrics.json y se insertan
 * en vitruvia.html entre marcas. La página las muestra de inmediato rotuladas
 * como instantánea («precalculado») y las sustituye por los recuentos del
 * índice vivo en cuanto éste llega. Una cifra precalculada nunca se presenta
 * como verificada contra la fuente.
 *
 * Uso: node scripts/build-vitruvia-metrics.mjs [--check]
 */
import {readFileSync,writeFileSync} from "node:fs";

const CHECK=process.argv.includes("--check");
const read=p=>JSON.parse(readFileSync(p,"utf8"));

const books=read("data/bibliotheca-graeca-latina-I-bce-I-ce.json");
const pages=read("data/witruvia-pages.json");
const testimonia=read("data/bibliotheca-testimonia-verified.json");

/* Idéntica a la constante `verified` de assets/vitruvia-search.js:
   sólo cuenta como lectura disponible la transcripción o el PDF alojados. */
const readable=w=>["lectura-local-completa","lectura-local-parcial"].includes(w.publicStatus)
 &&!!(w.localReader?.verified||w.pdf?.url||w.localHtml||w.localVersions?.length);

const works=(books.works||[]).filter(w=>w.id&&w.title);
const snapshot={
 generated:new Date().toISOString().slice(0,10),
 note:"Instantánea precalculada de los índices locales. No sustituye la verificación contra las fuentes; la página la reemplaza por el recuento del índice cargado.",
 sources:["data/bibliotheca-graeca-latina-I-bce-I-ce.json","data/witruvia-pages.json","data/bibliotheca-testimonia-verified.json"],
 metrics:{
  "metric-works":works.length,
  "metric-pages":(pages.pages||[]).length,
  "metric-read":works.filter(readable).length,
  "metric-witnesses":(testimonia.records||[]).length,
  "metric-editions":(testimonia.editions||[]).length
 }
};

const json=JSON.stringify(snapshot,null,1)+"\n";
const OPEN='<script type="application/json" id="vitruvia-metrics-snapshot">';
const CLOSE="</script>";
const MARK="<!-- instantánea de recuentos · scripts/build-vitruvia-metrics.mjs -->";
const block=MARK+"\n"+OPEN+JSON.stringify(snapshot)+CLOSE;

let html=readFileSync("vitruvia.html","utf8");
const existing=new RegExp(MARK.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"\\s*"+OPEN.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"[\\s\\S]*?"+CLOSE);
if(existing.test(html))html=html.replace(existing,block);
else{
 const anchor='<div class="metrics" id="metrics"';
 const at=html.indexOf(anchor);
 if(at<0){console.error("No se encontró el bloque de métricas en vitruvia.html");process.exit(1)}
 html=html.slice(0,at)+block+"\n"+html.slice(at);
}

if(CHECK){console.log(json);console.log("— comprobación, sin escribir —")}
else{
 writeFileSync("data/vitruvia-metrics.json",json);
 writeFileSync("vitruvia.html",html);
 console.log(json.trim());
 console.log("— data/vitruvia-metrics.json y vitruvia.html actualizados —");
}
