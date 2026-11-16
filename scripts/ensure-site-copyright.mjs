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
// Keep exactly one notice in the actual page, after all scripts and before final </body>.
// A string literal containing HTML must never count as a rendered page footer.
const noticePattern=/<footer\b[^>]*data-vdl-legal-notice="2026"[^>]*>[\s\S]*?<\/footer\s*>/gi;
function normalizePage(source){
 const stripped=source.replace(noticePattern,"");
 const closes=[...stripped.matchAll(/<\/body\s*>/gi)];
 const close=closes.at(-1);
 if(!close)return null;
 return stripped.slice(0,close.index).trimEnd()+"\n"+footer+"\n"+stripped.slice(close.index);
}
let changed=0,missing=[],already=0;
for(const file of files){
 if(/^google[a-f0-9]+\.html$/i.test(file))continue;
 const source=readFileSync(file,"utf8");
 const next=normalizePage(source);
 if(next===null){missing.push(file);continue}
 if(source===next){already++;continue}
 if(process.argv.includes("--write")){
  writeFileSync(file,next,"utf8");changed++;
 }else missing.push(file);
}
console.log(JSON.stringify({checked:files.length,already,changed,missing:missing.length,examples:missing.slice(0,20)},null,2));
if(missing.length)process.exitCode=1;
