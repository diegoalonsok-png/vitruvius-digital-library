#!/usr/bin/env node
/* Copyright footer for all public HTML pages; never asserts ownership of third-party sources.
 * Usage: node scripts/ensure-site-copyright.mjs --write | --check
 */
import {execFileSync} from "node:child_process";
import {readFileSync,writeFileSync} from "node:fs";
const marker='data-vdl-legal-notice="2026"';
const footer=`<footer ${marker} role="contentinfo" aria-label="Derechos editoriales" style="box-sizing:border-box;display:block;clear:both;grid-column:1/-1;width:100%;margin:28px 0 0;padding:16px 18px;border-top:1px solid currentColor;text-align:center;font:12px/1.65 system-ui,sans-serif;color:inherit;background:transparent">
<strong>© 2026 Editorial Sophia Lux · Arq. Diego Kurilo. Derechos reservados.</strong>
<span style="opacity:.8">Los derechos sobre los materiales originales, el diseño y los aportes editoriales pertenecen a sus respectivos titulares. Los textos antiguos, facsímiles, imágenes y recursos de terceros conservan su situación jurídica y licencias propias.</span>
</footer>`;
const files=execFileSync("git",["ls-files","-z","--","*.html"],{encoding:"utf8"}).split("\0").filter(Boolean);
let changed=0,missing=[],already=0;
for(const file of files){
 // Google Search Console verification token is not a webpage; never alter it.
 if(/^google[a-f0-9]+\.html$/i.test(file))continue;
 const source=readFileSync(file,"utf8");
 if(source.includes(marker)){already++;continue}
 if(!/<\/body\s*>/i.test(source)){missing.push(file);continue}
 if(process.argv.includes("--write")){
  const closes=[...source.matchAll(/<\/body\s*>/gi)];
  const last=closes.at(-1);
  const updated=last?source.slice(0,last.index)+footer+"\n"+source.slice(last.index):source;
  writeFileSync(file,updated,"utf8");changed++;
 }else missing.push(file);
}
console.log(JSON.stringify({checked:files.length,already,changed,missing:missing.length,examples:missing.slice(0,15)},null,2));
if(missing.length)process.exitCode=1;
