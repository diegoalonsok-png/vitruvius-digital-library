#!/usr/bin/env node
/* Real-browser smoke test: legacy links cannot restore a Kurilo/Kurilo comparison. */
import assert from "node:assert/strict";
import {chromium} from "playwright";
const base=process.env.BASE||"http://127.0.0.1:8766/";
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1450,height:900}});
  await page.route(/^https?:\/\//,route=>{
    const u=new URL(route.request().url());
    return u.host===new URL(base).host?route.continue():route.abort();
  });
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  const legacy="scriptorium.html?readers=krohn%2Ckurilo%2Cen&p1=1.1.3&p2=1.1.3&p3=1.1.3&locus=1.1.3";
  const response=await page.goto(new URL(legacy,base).href,{waitUntil:"domcontentloaded",timeout:30000});
  assert.equal(response.status(),200);
  const panes=page.locator("#script-triple .script-triple-pane");
  await panes.nth(2).waitFor({state:"visible",timeout:15000});
  assert.equal(await panes.count(),3);
  const selected=await panes.locator(".script-triple-head select").evaluateAll(elements=>elements.map(el=>el.value));
  assert.deepEqual(selected,["krohn","rose","kurilo"]);
  const options=await panes.locator(".script-triple-head select").evaluateAll(elements=>elements.map(el=>[el.options.length,el.disabled]));
  assert.deepEqual(options,[[1,true],[1,true],[1,true]]);
  await page.waitForFunction(()=>{
    const panes=[...document.querySelectorAll("#script-triple .script-triple-pane")];
    return panes.length===3&&panes.every(p=>(p.querySelector(".script-triple-text")?.textContent||"").trim().length>120);
  },null,{timeout:35000});
  const titles=await panes.locator(".script-triple-head h3").allTextContents();
  assert(titles[0].includes("Krohn"),titles[0]);
  assert(titles[1].includes("Rose"),titles[1]);
  assert(titles[2].includes("Kurilo"),titles[2]);
  const loci=await panes.locator(".script-triple-tools select").evaluateAll(selects=>selects.map(s=>s.selectedOptions[0]?.textContent));
  assert.deepEqual(loci,["1.1.3","1.1.3","1.1.3"]);
  await page.waitForFunction(()=>new URLSearchParams(location.search).get("readers")==="krohn,rose,kurilo",null,{timeout:15000});
  assert.equal(errors.length,0,"Browser JS errors: "+errors.join(" | "));
  console.log("PASS: legacy URL canonicalized; Krohn | Rose | Kurilo; 3 Latin texts and shared locus 1.1.3 rendered.");
}finally{
  await browser.close();
}
