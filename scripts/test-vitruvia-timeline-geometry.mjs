/* Actual Chromium geometry checks for the existing Vitruvia timeline.
 * No external API calls or changes to manuscripts/catalogue are required.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";
import {mkdir} from "node:fs/promises";

const browser=await chromium.launch({headless:true});
await mkdir("test-results",{recursive:true});
try{
 for(const [width,height] of [[1440,900],[768,850],[390,844],[320,720]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  await page.route("**/*",route=>{
   const host=new URL(route.request().url()).hostname;
   return host==="127.0.0.1"||host==="localhost"?route.continue():route.abort();
  });
  await page.goto("http://127.0.0.1:8766/vitruvia.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(window.VitruviaAcademicTimeline),{timeout:15000});
  await page.evaluate(()=>{
   // The authority is an intentionally synthetic test fixture. Its events are
   // not indexed, published or misrepresented as real history.
   window.VitruviaEntityResolver={
    resolve:async()=>({wikidataId:"Q987654",canonical:"Personaje hipotético de prueba",
      birthYear:1500,deathYear:1570})
   };
   window.dispatchEvent(new CustomEvent("vitruvia:search",{detail:{query:"Cronología de prueba"}}));
  });
  await page.waitForFunction(()=>document.querySelectorAll("#vitruvia-academic-timeline .vat-event-marker").length>=2);
  await page.evaluate(()=>{
   const works=Array.from({length:14},(_,i)=>({
    id:"Q"+(920000+i),year:1520+i%3,title:"Evento documentado de prueba "+(i+1),
    dateKind:"creation",dateProperty:"P577"
   }));
   works.push({id:"Q969999",year:1800,title:"Edición posterior de prueba",dateKind:"publication",dateProperty:"P577"});
   window.dispatchEvent(new CustomEvent("vitruvia:cultural-works",{detail:{wikidataId:"Q987654",works}}));
  });
  await page.waitForFunction(()=>document.querySelectorAll("#vitruvia-academic-timeline .vat-event-marker").length>=16);
  const measure=()=>page.evaluate(()=>{
   const root=document.querySelector("#vitruvia-academic-timeline");
   const r=root.getBoundingClientRect();
   const rect=e=>{const x=e.getBoundingClientRect();return {x:x.left,y:x.top,right:x.right,bottom:x.bottom,width:x.width,height:x.height}};
   const markers=[...root.querySelectorAll(".vat-event-marker")];
   const tracks=[...root.querySelectorAll(".vat-track")];
   const pairs=markers.map(m=>({mark:rect(m),track:rect(m.closest(".vat-track"))}));
   const collisions=[];
   for(let i=0;i<markers.length;i++)for(let j=i+1;j<markers.length;j++){
    const a=pairs[i].mark,b=pairs[j].mark;
    if(a.x<b.right-0.5&&a.right>b.x+0.5&&a.y<b.bottom-0.5&&a.bottom>b.y+0.5)collisions.push([i,j]);
   }
   return {
    viewport:innerWidth,root:rect(root),map:rect(root.querySelector(".vat-map")),
    bands:[...root.querySelectorAll(".vat-band")].map(rect),
    pairs,collisions,outside:root.querySelector(".vat-outside")?.textContent?.includes("1800")||false,
    lifeLabels:markers.map(m=>m.getAttribute("aria-label"))
   };
  });
  const result=await measure();
  assert.ok(result.root.x>=-1&&result.root.right<=width+1,
   "Timeline container escapes viewport at "+width+": "+JSON.stringify(result.root));
  assert.ok(result.map.x>=result.root.x-2&&result.map.right<=result.root.right+2,
   "Timeline map escapes container at "+width);
  assert.equal(result.collisions.length,0,
   "Timeline markers overlap at "+width+": "+JSON.stringify(result.collisions));
  assert.ok(result.pairs.every(p=>p.mark.x>=p.track.x-2&&p.mark.right<=p.track.right+2),
   "Marker extends beyond its track at "+width);
  assert.ok(result.bands.every(b=>b.x>=result.root.x-2&&b.right<=result.root.right+2),
   "Chronological band extends beyond timeline at "+width);
  assert.equal(result.outside,true,"Posthumous editions must be in a separate sourced list");
  assert.ok(result.lifeLabels.every(s=>!/1800/.test(s)),"Posthumous editions must not expand the biography");
  const first=page.locator("#vitruvia-academic-timeline .vat-event-marker").first();
  await first.hover();
  await page.waitForFunction(()=>{
   const v=document.querySelector("#vitruvia-academic-timeline .vat-peek:not([hidden])");
   return v&&getComputedStyle(v).display!=="none";
  });
  const peek=await page.evaluate(()=>{
   const root=document.querySelector("#vitruvia-academic-timeline").getBoundingClientRect();
   const v=document.querySelector("#vitruvia-academic-timeline .vat-peek:not([hidden])").getBoundingClientRect();
   return{inBounds:v.left>=root.left-2&&v.right<=root.right+2,
    withinBand:!!document.querySelector("#vitruvia-academic-timeline .vat-band-body .vat-peek:not([hidden])")};
  });
  assert.ok(peek.inBounds&&peek.withinBand,"Hover preview must remain inside event band at "+width);
  await first.click();
  const detail=await page.evaluate(()=>{
   const el=document.querySelector("#vitruvia-academic-timeline .vat-detail");
   const r=el.getBoundingClientRect(),p=document.querySelector("#vitruvia-academic-timeline").getBoundingClientRect();
   return {visible:!el.hidden,inside:r.left>=p.left-2&&r.right<=p.right+2};
  });
  assert.ok(detail.visible&&detail.inside,"Clicked milestone must show contained source detail at "+width);
  await page.screenshot({path:"test-results/vitruvia-timeline-"+width+".png"});
  await page.close();
  console.log("PASS timeline geometry "+width+"px: no marker collision, no overflow, in-flow hover and separate date scales");
 }
}finally{await browser.close()}
