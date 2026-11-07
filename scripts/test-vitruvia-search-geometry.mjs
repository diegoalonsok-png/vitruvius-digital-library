/* Browser regression for Vitruvia reading mode.
 * Verifies real computed geometry in Chromium. Network APIs are stubbed:
 * this checks the page layout, not remote image availability.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";
import {mkdir} from "node:fs/promises";

const browser=await chromium.launch({headless:true});
await mkdir("test-results",{recursive:true});
try{
  for(const [width,height] of [[1440,900],[960,900],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
    await page.route("**/*",route=>{
      const url=new URL(route.request().url());
      if(url.hostname==="127.0.0.1"||url.hostname==="localhost")return route.continue();
      return route.abort();
    });
    await page.goto("http://127.0.0.1:8766/vitruvia.html",{waitUntil:"domcontentloaded"});
    await page.evaluate(()=>{
      document.body.classList.add("vitruvia-reading");
      const article=document.getElementById("vitruvia-article");
      article.hidden=false;
      document.getElementById("article-title").textContent="Cristos negros de Centroamérica";
      document.getElementById("article-body").innerHTML=Array.from({length:12},(_,i)=>
        "<h3>Documentación y contexto "+(i+1)+"</h3><p>"+
        "Estudio histórico de las representaciones religiosas centroamericanas, con fuentes documentales identificadas. ".repeat(9)+"</p>").join("");
      const aside=document.getElementById("article-aside");
      aside.innerHTML="<h3>Fuentes</h3><p>Notas bibliográficas y testimonios.</p>";
      const context=document.getElementById("vitruvia-context");
      context.hidden=false;
      context.innerHTML="<h3>Investigación adicional</h3><p>Contexto y referencias.</p>";
      document.getElementById("result-list").innerHTML=
        "<article class='result-card'><h3>Cristos negros de Centroamérica</h3><p>"+
        "Resultado documental con descripción extensa y referencias. ".repeat(12)+"</p></article>";
    });
    await page.waitForTimeout(250);
    const report=await page.evaluate(()=>{
      const rect=selector=>{
        const e=document.querySelector(selector);
        if(!e)throw Error("Missing "+selector);
        const r=e.getBoundingClientRect(),s=getComputedStyle(e);
        return {x:r.x,y:r.y,width:r.width,height:r.height,display:s.display,columns:s.gridTemplateColumns};
      };
      return {
        viewport:window.innerWidth,
        results:rect("#results"),
        article:rect("#vitruvia-article"),
        articleGrid:rect("#vitruvia-article .article-grid"),
        articleBody:rect("#article-body"),
        resultList:rect("#result-list"),
        sidebar:rect(".results-grid > .sidebar"),
        philologyPresent:!!document.querySelector("#multilingual-academic-search")
      };
    });
    console.log("Vitruvia viewport "+width+": "+JSON.stringify(report));
    assert.equal(report.philologyPresent,false,"Experimental philological panel must not appear");
    assert.ok(report.results.width>width*0.75,"Results main container is too narrow");
    assert.ok(report.article.width>=report.results.width*0.94,"Encyclopedia article is too narrow");
    assert.ok(report.articleBody.width>=report.article.width*0.92,"Encyclopedia body is restricted to a side column");
    assert.ok(Math.abs(report.articleBody.x-report.article.x)<28,"Encyclopedia body has a blank left rail");
    assert.ok(report.resultList.width>=report.results.width*0.90,"Documentary results occupy a narrow left column");
    assert.ok(report.sidebar.width>=report.results.width*0.90,"Reference sidebar still reserves a right-hand column");
    assert.ok(report.sidebar.y>=report.resultList.y,"Reference sidebar should be below documentary results");
    await page.locator("#vitruvia-article").scrollIntoViewIfNeeded();
    await page.screenshot({path:"test-results/vitruvia-"+width+".png"});
    await page.close();
  }
  console.log("PASS: Vitruvia article and search results fill the reading area on desktop, tablet and mobile.");
}finally{
  await browser.close();
}
