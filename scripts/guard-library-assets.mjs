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
  // Base bibliográfica de las 222 obras y repertorio de testimonios: intocables.
  "data/bibliotheca-graeca-latina-I-bce-I-ce.json",
  "data/bibliotheca-testimonia-verified.json",
  // Transcripciones por página de las ediciones madre; los índices derivados van aparte.
  "data/recensio-es-pages.json",
  "data/recensio-fr-pages.json",
  "data/theory-en-pages.json",
  "data/theory-es-pages.json",
  "data/theory-fr-pages.json",
]);
const heavyDocument = /\.(pdf|doc|docx|odt)$/i;
const lockedDirectory = /^(images|documents)\//i;
// Sólo se pueden actualizar las fichas HTML de metadatos de las ediciones.
// Los PDF, textos madre, folios e imágenes continúan protegidos.
const mutableEditionCards = new Set([
  "documents/edicion-v514.html",
  "documents/edicion-v554.html",
  "documents/edicion-v297.html",
]);
// Códices, folios e inventarios manuscritos existentes: nunca sobrescribir ni renombrar.
// Nuevos índices derivados en otras rutas continúan permitidos.
const immutableCodexData = /^(?:data\/(?:codex-h|iiif|manuscripts)\/|escritorio-h\/)/i;
// La publicación puede agregar índices y enlaces derivados, pero nunca alterar
// un original o una traducción ya alojada. Nuevos textos son incorporaciones
// aditivas: las 222 fichas existentes quedan exactamente iguales.
const immutableOriginalText = /^(?:corpus\/|data\/(?:lexicon\/fontes|text|ocr|tei|classics-documents|classics-historical-pages|kurilo-libros)\/)/i;
const immutableClassicsLanguageText = /^data\/classics-corpus\/.+-(?:la|grc|en|es|fr|it|de|pt)\.json$/i;

export function violation(status, input) {
  const path = String(input||"").replaceAll("\\","/");
  const code = String(status||"").charAt(0).toUpperCase();
  if (!/^[AMDRTCU]$/.test(code) || !path || path.includes("..") || path.startsWith("/"))
    return "Cambio no identificable; requiere inspección manual.";
  if (code === "D") return "No se eliminan archivos existentes del sitio.";
  if (code !== "A" && code !== "M") return "Renombrado, cambio de tipo o conflicto: requiere revisión manual antes de publicar.";
  if (lockedDirectory.test(path) && !(code === "M" && mutableEditionCards.has(path))) return "Los folios, imágenes y documentos existentes son inmutables; se prohíben también altas en esas carpetas.";
  if (code === "M" && immutableCodexData.test(path)) return "Los códices, folios e inventarios de manuscritos ya existentes no se sobrescriben.";
  if (code === "M" && (immutableOriginalText.test(path) || immutableClassicsLanguageText.test(path)))
    return "El texto fuente, la traducción y la transcripción de obras existentes son intocables; solo editar interfaces o crear índices derivados.";
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
    console.log("PASS: "+changes.length+" modificaciones evaluadas. Sin borrados; las 222 fichas, originales, traducciones, folios, documentos y ediciones madre siguen intocables; sin nuevos PDF/DOC/DOCX/ODT.");
  }
}
if (process.argv[1] && import.meta.url === new URL("file://"+process.argv[1]).href)main();
