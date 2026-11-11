#!/usr/bin/env node
/* Agrupa hojas de estilo contiguas en un único archivo por tramo.
 *
 * Criterio de seguridad: sólo se fusionan enlaces <link rel="stylesheet">
 * CONSECUTIVOS en el documento (separados nada más que por espacios en blanco).
 * De ese modo la cascada queda intacta: ningún bloque <style> en línea cambia
 * de posición respecto de las hojas que lo preceden o lo siguen. Las hojas
 * originales se conservan en assets/ porque otras páginas las cargan por
 * separado.
 *
 * Uso: node scripts/build-style-bundles.mjs [--check]
 */
import {readFileSync,writeFileSync,existsSync} from "node:fs";
import {createHash} from "node:crypto";

const PAGES=["index.html","vitruvia.html","vitruvia-lexicon.html"];
const CHECK=process.argv.includes("--check");
const LINK=/<link\b[^>]*rel="stylesheet"[^>]*>/gi;
const href=tag=>(tag.match(/href="([^"]+)"/)||[])[1]||"";
const local=tag=>{const h=href(tag);return !!h&&!/^(https?:)?\/\//i.test(h)};
/* Entre dos hojas sólo se admite material que no aporta estilo ni lee estilos
 * durante el análisis del documento: espacios, comentarios, <meta>, <link> que
 * no sea hoja de estilo, y scripts diferidos, de módulo o de datos JSON-LD.
 * Un bloque <style> o un script en línea sin diferir detiene el tramo. */
function fusionable(gap){
 let rest=gap;
 const skip=[/^\s+/,/^<!--[\s\S]*?-->/,/^<meta\b[^>]*>/i,/^<link\b(?![^>]*rel="stylesheet")[^>]*>/i,
  /^<script\b[^>]*\b(?:defer|type="module"|type="application\/ld\+json")[^>]*>[\s\S]*?<\/script>/i];
 outer: while(rest.length){
  for(const re of skip){const m=rest.match(re);if(m){rest=rest.slice(m[0].length);continue outer}}
  return false;
 }
 return true;
}

let changed=0,report=[];

for(const page of PAGES){
 if(!existsSync(page)){console.error("· no existe:",page);continue}
 const html=readFileSync(page,"utf8");
 const hits=[...html.matchAll(LINK)].map(m=>({tag:m[0],start:m.index,end:m.index+m[0].length}));
 // Tramos contiguos: entre un enlace y el siguiente sólo espacios en blanco.
 const runs=[];
 for(const hit of hits){
  const last=runs.at(-1);
  if(last&&fusionable(html.slice(last.at(-1).end,hit.start))&&local(hit.tag)&&local(last.at(-1).tag))last.push(hit);
  else runs.push([hit]);
 }
 const merge=runs.filter(r=>r.length>1&&r.every(h=>local(h.tag)&&existsSync(href(h.tag).split("?")[0])));
 if(!merge.length){report.push(`${page}: ${hits.length} hojas, sin tramos fusionables`);continue}

 let out=html,saved=0;
 const slug=page.replace(/\.html$/,"");
 // De atrás hacia adelante para no invalidar los índices.
 for(let i=merge.length-1;i>=0;i--){
  const run=merge[i];
  const files=run.map(h=>href(h.tag).split("?")[0]);
  const body=files.map(f=>`/* ===== ${f} ===== */\n`+readFileSync(f,"utf8").replace(/^﻿/,"").trimEnd()+"\n").join("\n");
  const head=`/* Paquete generado por scripts/build-style-bundles.mjs — no editar a mano.\n   Página: ${page} · tramo ${i+1} de ${merge.length} · ${files.length} hojas en el orden original.\n   Editar los archivos fuente y volver a ejecutar el script. */\n`;
  const content=head+body;
  const hash=createHash("sha256").update(content).digest("hex").slice(0,8);
  const name=`assets/bundle-${slug}-${i+1}.css`;
  if(!CHECK)writeFileSync(name,content);
  /* El tramo puede contener scripts diferidos, <meta> o comentarios entre un
     enlace y el siguiente: se conservan tal cual. Sólo desaparecen los enlaces
     fusionados, sustituidos por el paquete en la posición del primero. */
  const segment=out.slice(run[0].start,run.at(-1).end);
  const kept=segment.replace(LINK,"").replace(/^\s+|\s+$/g,"");
  const replacement=`<link rel="stylesheet" href="${name}?v=${hash}">`+(kept?"\n"+kept:"");
  out=out.slice(0,run[0].start)+replacement+out.slice(run.at(-1).end);
  saved+=files.length-1;
 }
 if(!CHECK&&out!==html){writeFileSync(page,out);changed++}
 report.push(`${page}: ${hits.length} hojas → ${hits.length-saved} peticiones (${merge.length} paquete(s), −${saved} peticiones)`);
}
console.log(report.join("\n"));
console.log(CHECK?"— comprobación, sin escribir —":`— ${changed} página(s) actualizada(s) —`);
