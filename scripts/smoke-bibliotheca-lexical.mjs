/* Navegación real en Chromium sobre las mismas páginas que publica el site.
   Servidor HTTP local: archivos reales del repositorio, nunca corpus ficticios.
   La disponibilidad de Cloudflare/R2 en producción se audita aparte. */
import {chromium} from "playwright";
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
import assert from "node:assert/strict";

const host="http://127.0.0.1:8877/";
const server=spawn("python3",["-m","http.server","8877","--bind","127.0.0.1"],{stdio:"ignore"});
let browser,pass=0,fail=0;
async function check(label,fn){
 try{await fn();pass++;console.log("PASS",label)}
 catch(error){fail++;console.error("FAIL",label,error.stack||error)}
}
async function open(path){
 const page=await browser.newPage({viewport:{width:1330,height:850}});
 const response=await page.goto(host+path,{waitUntil:"domcontentloaded",timeout:45000});
 assert.equal(response?.status(),200,path+" debe devolver HTTP 200");
 return page;
}
try {
 await sleep(1300);
 browser=await chromium.launch({headless:true});
 await check("Bibliotheca carga catálogo federado, no confunde obras con ediciones",async()=>{
  const page=await open("bibliotheca-graeca-latina.html");
  try{
   await page.locator("#bibliotheca-federated-status .bfs-grid").waitFor({timeout:20000});
   const text=await page.locator("#bibliotheca-federated-status").innerText();
   assert.match(text,/281/,"No aparece el total de obras declaradas");
   assert.match(text,/271/,"No aparece el repertorio principal");
   assert.match(text,/10/,"No aparecen las obras adicionales");
  }finally{await page.close()}
 });
 const samples=[
  {work:"augustine-civitate-dei",language:"la",locus:"11.24",term:"domus",expect:/domus/i},
  {work:"seneca-de-brevitate",language:"la",locus:"1",term:"tempus",expect:/tempus/i},
  {work:"plato-apology",language:"grc",locus:"17",term:"λόγος",expect:/λόγ/i},
  {work:"homer-odyssey",language:"grc",locus:"1.1",term:"ἄνδρα",expect:/ἄνδ/i},
  {work:"virgil-aeneid",language:"la",locus:"1.1",term:"arma",expect:/arma/i},
 ];
 for(const sample of samples){
  await check(sample.work+" · abrir original y buscar «"+sample.term+"» por pasajes",async()=>{
   const params=new URLSearchParams({work:sample.work,lang:sample.language,locus:sample.locus});
   const page=await open("classics-text-reader.html?"+params);
   try{
    await page.locator("#passages p").first().waitFor({state:"attached",timeout:18000});
    assert.equal(await page.locator("#passages").getAttribute("lang"),sample.language);
    const title=await page.locator("#source-title").innerText();
    assert(title&&!/Cargando|Error/i.test(title),"No cargó procedencia documental: "+title);
    await page.locator("#mode-exact").click();
    await page.locator("#query").fill(sample.term);
    await page.locator("#find").click();
    await page.waitForFunction(()=>/[1-9]\d* pasajes/.test(document.querySelector(".search-summary")?.textContent||""),null,{timeout:15000});
    const marks=await page.locator("#passages mark.cl-hit").allTextContents();
    assert(marks.some(s=>sample.expect.test(s)),"La búsqueda no destacó su forma textual: "+JSON.stringify(marks.slice(0,5)));
    const source=await page.locator("#source-title").innerText();
    assert(source.length>15,"No hay fuente o edición atribuida");
    const url=new URL(page.url());
    assert.equal(url.searchParams.get("work"),sample.work);
   }finally{await page.close()}
  });
 }
 await check("Agustín · logos ampliado encuentra verbum sin inventar coincidencia literal",async()=>{
  const page=await open("classics-text-reader.html?work=augustine-civitate-dei&lang=la&locus=11.24&q=logos&expanded=1");
  try{
   await page.locator("#passages p").first().waitFor({timeout:16000});
   await page.waitForFunction(()=>/[1-9][0-9]* pasajes/.test(document.querySelector(".search-summary")?.textContent||""),null,{timeout:16000});
   const mode=await page.locator("#search-mode").inputValue();
   assert.equal(mode,"lexical","La URL debe mantener el modo ampliado");
   const summary=await page.locator(".search-summary").innerText();
   assert.match(summary,/equivalencias léxicas/,"La concordancia debe diferenciar equivalencias de coincidencias literales");
   const marks=await page.locator("#passages mark.cl-hit").allTextContents();
   assert(marks.some(x=>/verbum/i.test(x)),"No se destacó Verbum en latín: "+JSON.stringify(marks.slice(0,6)));
  }finally{await page.close()}
 });
 await check("Consultas sin resultados: no quedan marcas ni pasajes ficticios",async()=>{
  const page=await open("classics-text-reader.html?work=virgil-aeneid&lang=la&locus=1.1");
  try{
   await page.locator("#passages p").first().waitFor({timeout:16000});
   await page.locator("#mode-exact").click();
   await page.locator("#query").fill("zzzzqwerty");
   await page.locator("#find").click();
   await page.waitForFunction(()=>/^0 pasajes/.test(document.querySelector(".search-summary")?.textContent||""),null,{timeout:16000});
   assert.equal(await page.locator("#passages mark.cl-hit").count(),0);
  }finally{await page.close()}
 });
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
console.log("Pruebas en Chromium: "+pass+" correctas, "+fail+" fallidas.");
if(fail)process.exit(1);
