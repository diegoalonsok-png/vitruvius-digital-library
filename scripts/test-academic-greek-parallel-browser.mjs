#!/usr/bin/env node
/* Chromium: páginas reales de Retórica y Geografía en el visor académico.
   Comprueba que se presenta un SOLO pasaje humano EN de la misma sección CTS,
   nunca la traducción completa ni otra obra. No pretende cotejo crítico. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawn} from "node:child_process";
import {setTimeout as sleep} from "node:timers/promises";
import {chromium} from "playwright";
const root=new URL("../",import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),"utf8"));
const host="http://127.0.0.1:8891/";
const server=spawn("python3",["-m","http.server","8891","--bind","127.0.0.1"],{stdio:"ignore"});
const cases=[
 {work:"aristotle-rhetoric",refs:["1.1.1","3.19.6"]},
 {work:"strabo",refs:["1.1.1","17.3.25"]}
];
let browser;
try{
 await sleep(1200);
 browser=await chromium.launch({headless:true});
 for(const item of cases){
  const en=read("data/classics-corpus/"+item.work+"-en.json");
  for(const ref of item.refs){
   const expected=en.passages.find(p=>String(p.locus).split(":").at(-1)===ref);
   assert(expected,"English source missing "+item.work+" "+ref);
   const url=host+"classics-text-reader.html?"+new URLSearchParams({
    work:item.work,lang:"grc",to:"en",locus:ref
   });
   const page=await browser.newPage({viewport:{width:1300,height:850}});
   try{
    const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:60000});
    assert.equal(response.status(),200);
    await page.waitForFunction(({text})=>{
     const panel=document.querySelector(".cl-translation-output");
     const note=document.querySelector(".cl-translation-meta");
     return panel?.querySelectorAll("p").length===1
       &&panel.querySelector("p")?.textContent===text
       &&note?.textContent?.includes("Misma referencia de sección CTS")
       &&document.querySelector("#passages")?.getAttribute("lang")==="grc";
    },{text:expected.text},{timeout:60000});
    const count=await page.locator(".cl-translation-output p").count();
    assert.equal(count,1,"La edición completa se mostró en vez de una sección");
    const label=await page.locator(".cl-translation-meta").textContent();
    assert(!/automática orientativa|traducción automática/i.test(label));
    console.log("PASS Chromium · "+item.work+" "+ref+" · un pasaje GR/EN por sección CTS");
   }finally{await page.close()}
  }
 }
}finally{
 await browser?.close();
 server.kill("SIGTERM");
}
