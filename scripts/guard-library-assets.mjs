#!/usr/bin/env node
/**
 * Change gate for the scholarly library. Preserves existing assets and prohibits
 * new heavyweight document uploads while GitHub Pages capacity is constrained.
 * Deliberately does NOT edit, remove, normalize, or rewrite any file.
 */
import {execFileSync} from "node:child_process";
import assert from "node:assert/strict";

const immutableText = new Set([
  "data/structured/recensio-es.json",
  "data/structured/recensio-fr.json",
  "data/structured/theory-en.json",
  "data/structured/manifest.json",
]);
const heavyDocument = /\.(pdf|doc|docx|odt)$/i;
const lockedDirectory = /^(images|documents)\//i;
// Códices, folios e inventarios manuscritos existentes: nunca sobrescribir ni renombrar.
// Nuevos índices derivados en otras rutas continúan permitidos.
const immutableCodexData = /^(?:data\/(?:codex-h|iiif|manuscripts)\/|escritorio-h\/)/i;

export function violation(status, input) {
  const path = String(input||"").replaceAll("\\","/");
  const code = String(status||"").charAt(0).toUpperCase();
  if (!/^[AMDRTCU]$/.test(code) || !path || path.includes("..") || path.startsWith("/"))
    return "Cambio no identificable; requiere inspección manual.";
  if (code === "D") return "No se eliminan archivos existentes del sitio.";
  if (code !== "A" && code !== "M") return "Renombrado, cambio de tipo o conflicto: requiere revisión manual antes de publicar.";
  if (lockedDirectory.test(path)) return "Los folios, imágenes y documentos existentes son inmutables; se prohíben también altas en esas carpetas.";
  if (code === "M" && immutableCodexData.test(path)) return "Los códices, folios e inventarios de manuscritos ya existentes no se sobrescriben.";
  if (heavyDocument.test(path)) return "Se suspenden nuevas cargas y modificaciones de PDF, DOC, DOCX y ODT por capacidad.";
  if (immutableText.has(path)) return "Las tres ediciones madre y su manifiesto no se modifican en una incorporación de corpus.";
  return null;
}
export function inspect(changes) {
  return changes.map(({status,path})=>({status,path,reason:violation(status,path)})).filter(x=>x.reason);
}
function diff(base,head) {
  const output=execFileSync("git",["diff","--name-status","-z","--no-renames",base,head],{encoding:"utf8",maxBuffer:8_000_000});
  const fields=output.split("\0").filter(Boolean),changes=[];
  for (let i=0;i<fields.length;i+=2) {
    if (i+1>=fields.length)throw Error("Git diff truncado; revisión manual necesaria.");
    changes.push({status:fields[i],path:fields[i+1]});
  }
  return changes;
}
function main(){
  const [,,base,head="HEAD"]=process.argv;
  if (!base)throw Error("Uso: node scripts/guard-library-assets.mjs <base-sha> [head-sha]");
  const changes=diff(base,head),problems=inspect(changes);
  if(problems.length){
    console.error("BLOQUEADO: riesgo de borrado o publicación de archivos voluminosos:");
    for(const x of problems)console.error(x.status+" "+x.path+" — "+x.reason);
    process.exitCode=1;
  }else{
    console.log("PASS: "+changes.length+" modificaciones evaluadas. Sin borrados; sin modificaciones de folios, imágenes, documentos, ediciones madre ni nuevos archivos PDF/DOC/DOCX/ODT.");
  }
}
if (process.argv[1] && import.meta.url === new URL("file://"+process.argv[1]).href)main();
