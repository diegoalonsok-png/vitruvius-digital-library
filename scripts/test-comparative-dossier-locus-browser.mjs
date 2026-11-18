import assert from "node:assert/strict";
import {chromium} from "playwright";
const base=process.env.BUTTON_AUDIT_BASE||"http://127.0.0.1:8766/";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try{
 const page=await browser.newPage();
 const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.route("**/*",route=>{const host=new URL(route.request().url()).hostname;return host==="127.0.0.1"||host==="localhost"?route.continue():route.abort()});
 await page.goto(base+"aparato-comparativo.html?locus=1.1.1",{waitUntil:"domcontentloaded",timeout:30000});
 await page.waitForFunction(()=>document.querySelector("#vdl-dossier-status")?.textContent.includes("731 loci accesibles"),{timeout:30000});
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent("vdl:comparative-locus-render",{detail:{locus:"10.praef.4"}})));
 assert.equal(await page.locator("#vdl-dossier-book").inputValue(),"10");
 assert.equal(await page.locator("#vdl-dossier-locus").inputValue(),"10.praef.4");
 assert((await page.locator("#vdl-dossier-output").innerText()).includes("10, praef. § 4"),"Preface locus display did not update");
 assert(!errors.some(x=>/populateLoci is not defined/.test(x)),errors.join(" | "));
 console.log("PASS dossier event navigates to book X preface 4 without ReferenceError");
 const uri=new URL(page.url());uri.searchParams.set("locus","1.1.1");
 await page.evaluate(url=>{history.replaceState(null,"",url);window.dispatchEvent(new PopStateEvent("popstate"))},uri.href);
 assert.equal(await page.locator("#vdl-dossier-book").inputValue(),"1");
 assert.equal(await page.locator("#vdl-dossier-locus").inputValue(),"1.1.1");
 console.log("PASS browser history restores correct book and locus");
 await page.close();
}finally{await browser.close()}
