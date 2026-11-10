// Visita las páginas sin red externa y falla por errores de JS. Hasta cuatro páginas
// simultáneas para evitar los largos tiempos de una comprobación secuencial.
// Las páginas HTML, folios, visores y archivos del sitio no se alteran.
import {chromium} from "playwright";
import fs from "node:fs";
const base=process.env.BASE||"http://127.0.0.1:8766/";
const pages=fs.readdirSync(".").filter(f=>f.endsWith(".html")&&!f.startsWith("google"));
const browser=await chromium.launch();
const results=new Array(pages.length);
let cursor=0;
async function worker(){
 while(true){
  const index=cursor++;
  if(index>=pages.length)break;
  const filename=pages[index];
  const page=await browser.newPage();
  const errs=[],miss=[];
  page.on("pageerror",e=>errs.push(e.message.slice(0,180)));
  page.on("response",r=>{
   if(r.url().startsWith(base)&&r.status()>=400)
    miss.push(r.status()+" "+r.url().replace(base,""));
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  try{
   await page.goto(base+filename,{waitUntil:"load",timeout:25000});
   await page.waitForTimeout(1200);
  }catch(e){errs.push("LOAD "+e.message.slice(0,140))}
  finally{await page.close()}
  results[index]={filename,errs:[...new Set(errs)],miss:[...new Set(miss)]};
 }
}
await Promise.all(Array.from({length:Math.min(4,pages.length)},()=>worker()));
await browser.close();
let failed=0,missing=0;
for(const r of results){
 if(r.errs.length)failed++;
 if(r.miss.length)missing++;
 if(r.errs.length||r.miss.length)
  console.log(r.filename,"\n  ",r.errs.join("\n   "),"\n  ",r.miss.slice(0,6).join("\n   "));
}
console.log("checked",pages.length,"pages ·",failed,"with JavaScript errors ·",missing,"with local HTTP errors");
// Un recurso interno 404 también invalida una página aunque no produzca pageerror.
if(failed||missing)process.exitCode=1;
