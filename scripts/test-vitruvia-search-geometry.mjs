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
        culturalRail:rect("#vitruvia-context"),
        philologyPresent:!!document.querySelector("#multilingual-academic-search")
      };
    });
    console.log("Vitruvia viewport "+width+": "+JSON.stringify(report));
    assert.equal(report.philologyPresent,false,"Experimental philological panel must not appear");
    assert.ok(report.results.width>width*0.75,"Results main container is too narrow");
    assert.ok(report.article.width>=report.results.width*0.94,"Encyclopedia article is too narrow");
    // The academic catalogue legitimately occupies the right quarter on wide
    // screens; the reading column should remain ~70–80%, not 92–100%.
    if(width>=1100){
      assert.ok(report.articleBody.width>=report.article.width*0.68,
        "Encyclopedia text became too narrow beside the academic right rail");
      assert.ok(report.culturalRail.width>=report.article.width*0.20,
        "Academic right rail is missing from encyclopedia reading mode");
    }else{
      assert.ok(report.articleBody.width>=report.article.width*0.90,
        "Encyclopedia body must stack and use nearly full width on smaller screens");
    }
    assert.ok(Math.abs(report.articleBody.x-report.article.x)<28,"Encyclopedia body has a blank left rail");
    // In article mode the cultural panel is intentionally moved next to the
    // article body, and the subsequent results list uses the whole width.
    // Do not compare a right rail beside the article to a list below the article.
    if(width>=1100){
      assert.ok(report.culturalRail.x>=report.articleBody.x+report.articleBody.width-3,
        "Academic cultural rail must be beside the encyclopaedia article");
      assert.ok(Math.abs(report.culturalRail.y-report.articleBody.y)<28,
        "Right rail must start at article top, never below a large empty gap");
      assert.ok(report.culturalRail.width>=report.article.width*0.20,
        "Right rail needs useful width for cartouches, books and references");
      assert.ok(report.resultList.width>=report.results.width*0.90,
        "When the cultural rail belongs to the article, results must not reserve an empty track");
    }else{
      assert.ok(report.resultList.width>=report.results.width*0.90,
        "Documentary results must fill the available width on tablet and mobile");
    }
    assert.ok(report.sidebar.width>=report.results.width*0.90,"Reference sidebar still reserves a right-hand column");
    assert.ok(report.sidebar.y>=report.resultList.y,"Reference sidebar should be below documentary results");
    await page.locator("#vitruvia-article").scrollIntoViewIfNeeded();
    await page.screenshot({path:"test-results/vitruvia-"+width+".png"});
    await page.close();
  }
  // Egyptian writing, in both historical and contemporary contexts, must be
  // rendered in the right rail without expanding the hero.
  const egypt=await browser.newPage({viewport:{width:1440,height:900}});
  await egypt.route("**/*",route=>{
    const url=new URL(route.request().url());
    if(url.hostname==="127.0.0.1"||url.hostname==="localhost")return route.continue();
    return route.abort();
  });
  await egypt.goto("http://127.0.0.1:8766/vitruvia.html",{waitUntil:"domcontentloaded"});
  await egypt.evaluate(()=>{
    document.body.classList.add("vitruvia-reading");
    window.dispatchEvent(new CustomEvent("vitruvia:search",{detail:{query:"Akhenaten"}}));
  });
  await egypt.waitForSelector("#v-egypt-script-panel .v-script-glyphs",{timeout:6000});
  const ancient=await egypt.evaluate(()=>({
    glyphs:document.querySelector("#v-egypt-script-panel .v-script-glyphs")?.textContent||"",
    parent:document.querySelector("#v-egypt-script-panel")?.closest("#vitruvia-context")?.id||"",
    featuredHeight:document.getElementById("featured")?.getBoundingClientRect().height||0,
    heroHasRoyal:!!document.querySelector("#featured #v-egypt-side")
  }));
  assert.match(ancient.glyphs,/𓇋/u,"Akhenaten must have a real Unicode sign sequence");
  assert.equal(ancient.parent,"vitruvia-context","Egyptian script must occupy the right-hand scholarly rail");
  assert.equal(ancient.heroHasRoyal,false,"The full royal dossier must never extend the hero");
  assert.ok(ancient.featuredHeight<900,"Egyptian dossier must not create an enormous black hero area");
  await egypt.evaluate(()=>{
    window.dispatchEvent(new CustomEvent("vitruvia:search",{detail:{query:"El Cairo"}}));
  });
  await egypt.waitForFunction(()=>{
    const p=document.querySelector("#v-egypt-script-panel");
    return p?.dataset.query==="el cairo"&&!!p.querySelector('.v-script-arabic');
  },{timeout:6000});
  const modern=await egypt.evaluate(()=>({
    text:document.querySelector("#v-egypt-script-panel .v-script-arabic")?.textContent,
    direction:document.querySelector("#v-egypt-script-panel .v-script-arabic")?.dir
  }));
  assert.equal(modern.text,"القاهرة","Cairo must use the documented modern Arabic name");
  assert.equal(modern.direction,"rtl","Arabic reading direction must be right-to-left");
  await egypt.close();
  console.log("PASS: Akhenaten Unicode and modern Cairo Arabic appear in the cultural rail without hero displacement.");
  console.log("PASS: Vitruvia article fills the reading area; cultural right rail on desktop, stacked results on mobile.");
}finally{
  await browser.close();
}
