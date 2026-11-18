#!/usr/bin/env node
/** Prueba real Chromium de navegación bidireccional griego/inglés. */
import assert from "node:assert/strict";
import {chromium} from "playwright";
import {readFileSync} from "node:fs";
const base=process.env.BASE||"http://127.0.0.1:8768/";
const read=id=>JSON.parse(readFileSync(new URL("../data/classics-corpus/"+id+"-en.json",import.meta.url),"utf8"));
const ref=locus=>String(locus).split(":").at(-1);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1450,height:900}});
 page.setDefaultTimeout(30000);
 const pageErrors=[];
 page.on("pageerror",err=>pageErrors.push(err.message));
 await page.route(/^https?:\/\//,route=>{
  const u=new URL(route.request().url());
  return u.host===new URL(base).host?route.continue():route.abort();
 });
 for(const work of ["plato-republic","plato-laws","xenophon-anabasis"]){
  const texts=read(work).passages;
  const startRef=ref(texts[0].locus);
  const url=new URL("classics-parallel-reader.html",base);
  for(const [k,v] of Object.entries({work,left:"grc",right:"en",locus:startRef}))url.searchParams.set(k,v);
  const response=await page.goto(url.href,{waitUntil:"domcontentloaded",timeout:45000});
  assert.equal(response.status(),200,work+" page unavailable");
  await page.waitForFunction(expected=>{
   const l=document.querySelector("#left-passage-heading")?.textContent||"";
   const r=document.querySelector("#right-passage-heading")?.textContent||"";
   return !document.querySelector("#sync-next")?.disabled
    &&l.includes("Locus "+expected)&&r.includes("Locus "+expected);
  },startRef,{timeout:70000});
  assert.equal(await page.locator("#left").inputValue(),"grc");
  assert.equal(await page.locator("#right").inputValue(),"en");
  assert.equal(await page.locator("#same-locus").isChecked(),true);
  for(let i=1;i<=2;i++){
   await page.locator("#sync-next").click();
   const wanted=ref(texts[i].locus);
   await page.waitForFunction(expected=>{
    const l=document.querySelector("#left-passage-heading")?.textContent||"";
    const r=document.querySelector("#right-passage-heading")?.textContent||"";
    return l.includes("Locus "+expected)&&r.includes("Locus "+expected);
   },wanted,{timeout:30000});
  }
  // Simula una navegación directa iniciada desde el visor DERECHO.
  // El evento llega como postMessage del iframe real: debe localizar la URN
  // equivalente en griego, aunque su edición termine en perseus-grc2.
  const targetIndex=work==="xenophon-anabasis"?17:9;
  const target=ref(texts[targetIndex].locus);
  const handle=await page.locator("#pane-right").elementHandle();
  const frame=await handle.contentFrame();
  assert.ok(frame,work+" right iframe missing");
  await frame.evaluate(({work,index})=>{
   parent.postMessage({type:"vitruvia-parallel-position",work,lang:"en",index},location.origin);
  },{work,index:targetIndex});
  await page.waitForFunction(expected=>{
   const l=document.querySelector("#left-passage-heading")?.textContent||"";
   const r=document.querySelector("#right-passage-heading")?.textContent||"";
   return l.includes("Locus "+expected)&&r.includes("Locus "+expected);
  },target,{timeout:25000});
  const status=await page.locator("#sync-position").textContent();
  assert.match(status,/Mismo identificador de locus/i,work+": "+status);
  console.log("PASS browser "+work+": both directions share locus "+target);
 }
 // El visor simplificado debe mantener los dos loci, sin traducción automática.
 const simple=new URL("classics-simple-parallel.html",base);
 for(const [k,v] of Object.entries({work:"plato-laws",left:"grc",right:"en",locus:"1.624"}))simple.searchParams.set(k,v);
 await page.goto(simple.href,{waitUntil:"domcontentloaded",timeout:45000});
 await page.waitForFunction(()=>{
  const l=document.querySelector("#left-head")?.textContent||"";
  const r=document.querySelector("#right-head")?.textContent||"";
  const t=document.querySelector("#right-text")?.textContent||"";
  return l.includes("Pasaje 1.624")&&r.includes("Pasaje 1.624")&&t.length>70&&r.includes("EDICIÓN ALOJADA");
 },null,{timeout:60000});
 await page.locator("#next").click();
 await page.waitForFunction(()=>{
  const l=document.querySelector("#left-head")?.textContent||"";
  const r=document.querySelector("#right-head")?.textContent||"";
  return l.includes("Pasaje 1.625")&&r.includes("Pasaje 1.625");
 },null,{timeout:30000});
 assert.deepEqual(pageErrors,[],"JavaScript errors: "+pageErrors.join(" | "));
 console.log("PASS simplified Greek/English columns: same loci and hosted edition (no auto).");
}finally{await browser.close()}
