/* Real Chromium geometry: timeline circles and hover labels must fit their
   own pane and not overlap. External APIs are not required. */
import assert from "node:assert/strict";
import {chromium} from "playwright";
import {mkdir} from "node:fs/promises";
const browser=await chromium.launch({headless:true});
await mkdir("test-results",{recursive:true});
try{
 for(const [width,height] of [[1440,900],[920,860],[390,844],[320,740]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  await page.route("**/*",route=>{
   const url=new URL(route.request().url());
   if(["127.0.0.1","localhost"].includes(url.hostname))return route.continue();
   return route.abort();
  });
  try{
   await page.goto("http://127.0.0.1:8766/vitruvia.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>!!window.VitruviaAcademicTimeline,{timeout:10000});
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent("vitruvia:search",{detail:{query:"Akhenaten"}})));
   await page.waitForSelector("#vitruvia-academic-timeline .vat-event-marker",{timeout:10000});
   const data=await page.evaluate(()=>{
    const root=document.getElementById("vitruvia-academic-timeline"),outer=root.getBoundingClientRect();
    const lanes=[...root.querySelectorAll(".vat-band")];
    const markers=lanes.flatMap(lane=>{
     const rects=[...lane.querySelectorAll(".vat-event-marker")].map(node=>{
      const r=node.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}
     });
     return rects.map(r=>({...r,lane:lane.getAttribute("aria-label")}));
    });
    const clip=markers.filter(r=>r.x<outer.x-2||r.right>outer.right+2);
    const overlaps=[];
    for(let i=0;i<markers.length;i++)for(let j=i+1;j<markers.length;j++){
     if(markers[i].lane!==markers[j].lane)continue;
     if(Math.min(markers[i].right,markers[j].right)-Math.max(markers[i].x,markers[j].x)>1&&
       Math.min(markers[i].bottom,markers[j].bottom)-Math.max(markers[i].y,markers[j].y)>1)
      overlaps.push([i,j]);
    }
    const ticks=[...root.querySelectorAll(".vat-tick")].map(el=>el.textContent);
    const mapRect=root.querySelector(".vat-map").getBoundingClientRect();
    return {root:{x:outer.x,right:outer.right,width:outer.width},
     map:{x:mapRect.x,right:mapRect.right,width:mapRect.width},
     markers,clip,overlaps,ticks,scrollWidth:root.scrollWidth,clientWidth:root.clientWidth};
   });
   assert.equal(data.clip.length,0,"Markers extend beyond the chronology border at "+width+"px");
   assert.equal(data.overlaps.length,0,"Markers overlap at "+width+"px");
   assert.ok(data.markers.length>=2,"Chronology milestones have disappeared");
   assert.ok(data.map.right<=data.root.right+3,"Chronological graph extends beyond the panel at "+width+"px");
   assert.ok(data.scrollWidth<=data.clientWidth+5,"Chronology forces horizontal scrolling at "+width+"px");
   assert.ok(data.ticks.every(t=>!/20\d\d/.test(t)),"Modern dates stretched Akhenaten's lifespan");
   for(const marker of [page.locator("#vitruvia-academic-timeline .vat-event-marker").first(),
                        page.locator("#vitruvia-academic-timeline .vat-event-marker").last()]){
    await marker.hover();
    // The tooltip fades in; verify its final rendered state, not animation frame zero.
    await page.waitForTimeout(260);
    const popup=await marker.locator(".vat-event-pop").evaluate(el=>{
     const p=el.getBoundingClientRect(),r=document.getElementById("vitruvia-academic-timeline").getBoundingClientRect();
     return {left:p.left,right:p.right,outerLeft:r.left,outerRight:r.right,opacity:getComputedStyle(el).opacity};
    });
    assert.ok(popup.left>=popup.outerLeft-4&&popup.right<=popup.outerRight+4,
     "A hover label leaves the chronology at "+width+"px: "+JSON.stringify(popup));
    assert.ok(Number(popup.opacity)>0,"A hovered label is invisible");
   }
   await page.locator("#vitruvia-academic-timeline .vat-event-marker").first().click();
   const detail=page.locator("#vitruvia-academic-timeline .vat-detail");
   assert.equal(await detail.isVisible(),true,"Click must display documentary evidence");
   await page.screenshot({path:"test-results/timeline-"+width+".png",fullPage:false});
   console.log("PASS responsive chronology "+width+"px: "+data.markers.length+" visible markers; no overlap or clipping");
  }finally{await page.close()}
 }
}finally{await browser.close()}
