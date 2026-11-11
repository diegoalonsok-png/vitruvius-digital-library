// Regression tests for the bounded, clustered timeline. No corpus files are edited.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const source=readFileSync(new URL("../assets/vitruvia-academic-timeline.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../assets/vitruvia-academic-timeline.css",import.meta.url),"utf8");
assert.match(css,/vat-event-marker.*vat-event-pop/s,"The marker popover should be styled");
assert.match(source,/const scope=timelineScope\(events\)/,"Chronology uses a separate historic scope");
assert.match(source,/x-previous\.lastX<34/,"Dense markers should be merged before layout");
class E{
 constructor(tag="div",id=""){
  this.tagName=tag;this.id=id;this.className="";this.children=[];this.attributes={};
  this.style={width:"",_props:{},setProperty:(k,v)=>{this.style._props[k]=v},removeProperty:k=>{delete this.style._props[k]}};
  this.hidden=false;this.parentElement=null;this.isConnected=true;this.listeners={};this.clientWidth=840;
  this.classList={
   add:(...names)=>{const z=new Set(this.className.split(/\s+/).filter(Boolean));for(const n of names)z.add(n);this.className=[...z].join(" ")},
   remove:(...names)=>{this.className=this.className.split(/\s+/).filter(x=>!names.includes(x)).join(" ")},
   toggle:(n,on)=>{const yes=on===undefined?!this.className.split(/\s+/).includes(n):on;
    this.classList[yes?"add":"remove"](n);return yes},
   contains:n=>this.className.split(/\s+/).includes(n)
  };
 }
 append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);
  n.parentElement=this;this.children.push(n)}}
 insertBefore(node,before){if(node.parentElement)node.parentElement.children=node.parentElement.children.filter(x=>x!==node);
  const i=this.children.indexOf(before);this.children.splice(i<0?this.children.length:i,0,node);node.parentElement=this}
 replaceChildren(...nodes){for(const x of this.children)x.parentElement=null;this.children=[];this.append(...nodes)}
 setAttribute(k,v){this.attributes[k]=v}
 getAttribute(k){return this.attributes[k]}
 addEventListener(k,fn){this.listeners[k]=fn}
 click(){this.listeners.click?.({target:this,currentTarget:this})}
 focus(){this.focused=true}
 querySelector(selector){if(selector===".article-grid")return this.children.find(x=>x.className==="article-grid")||null;return null}
 querySelectorAll(selector){const out=[];const visit=n=>{if(n.className.split(/\s+/).includes("vat-event")&&selector.startsWith(".vat-event")&&n.getAttribute("aria-pressed")==="true")out.push(n);
   for(const x of n.children)visit(x)};visit(this);return out}
 get nextElementSibling(){if(!this.parentElement)return null;const a=this.parentElement.children;return a[a.indexOf(this)+1]||null}
}
function createEnvironment(width=800){
 const root=new E("section","vitruvia-academic-timeline");root.hidden=true;root.clientWidth=width;
 const article=new E("section","vitruvia-article"),articleGrid=new E("div");articleGrid.className="article-grid";article.hidden=true;article.append(articleGrid);
 const resultSection=new E("section","results"),resultsGrid=new E("div");resultsGrid.className="results-grid";resultSection.append(root,resultsGrid);
 const callback={},window={addEventListener:(t,f)=>{callback[t]=f},VitruviaSearchSnapshot:null,
   VitruviaEntityResolver:{resolve:async query=>query==="Artemisia"?
     {wikidataId:"Q42",kind:"person",birthYear:1900,deathYear:1970,canonical:"Artemisia"}:
     query==="Akhenaten"?{wikidataId:"Q43",kind:"person",birthYear:-1370,deathYear:-1336,canonical:"Akhenaten"}:
     {wikidataId:"Q44",kind:"topic",canonical:query}}};
 const ids={"vitruvia-academic-timeline":root,"vitruvia-article":article};
 const document={documentElement:{lang:"es"},getElementById:id=>ids[id]||null,createElement:tag=>new E(tag),
  querySelector:q=>q==="#results .results-grid"?resultsGrid:null};
 const observers=[];
 const ctx={window,document,getComputedStyle:()=>({paddingLeft:"12",paddingRight:"12"}),
  queueMicrotask:fn=>Promise.resolve().then(fn),MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(node){this.node=node}}};
 runInNewContext(source,ctx,{filename:"assets/vitruvia-academic-timeline.js"});
 const emit=(name,detail)=>callback[name]?.({detail});
 const find=(name)=>{const hits=[],visit=n=>{if(n.className.split(/\s+/).includes(name))hits.push(n);for(const ch of n.children)visit(ch)};visit(root);return hits};
 return {root,emit,find,article,articleGrid,resultSection,resultsGrid,win:window};
}
const env=createEnvironment(340);
env.emit("vitruvia:search",{query:"Artemisia"});
env.emit("vitruvia:cultural-works",{wikidataId:"Q42",works:[
 {id:"Q51",year:1930,title:"First work",dateKind:"creation",dateProperty:"P571"},
 {id:"Q52",year:1931,title:"Second work",dateKind:"creation",dateProperty:"P571"},
 {id:"Q53",year:1932,title:"Third work",dateKind:"creation",dateProperty:"P571"},
 {id:"Q54",year:1960,title:"Late work",dateKind:"creation",dateProperty:"P571"}]});
env.emit("vitruvia:results",{query:"Artemisia",rows:[
 {type:"book",title:"Artemisia critical collected works",year:2025,link:"https://example.org/edition",source:"Bibliography"}]});
for(let n=0;n<8;n++)await Promise.resolve();
const events=env.win.VitruviaAcademicTimeline.collect();
const scope=env.win.VitruviaAcademicTimeline.timelineScope(events);
assert.equal(scope.person,true);
assert.equal(scope.low,1900);assert.equal(scope.high,1970);
assert.ok(scope.references.some(x=>x.year===2025),"Modern edition should not extend a person's lifetime");
assert.ok(scope.timeline.every(x=>x.year<=1970));
const markers=env.find("vat-event-marker");
assert.equal(markers.length,2,"Close dates are grouped into one accessible marker");
assert.ok(env.find("vat-event-cluster").length===1);
const map=env.find("vat-map")[0],track=env.find("vat-track")[0];
const mapWidth=parseFloat(track.style.width);
for(const mark of markers){
 const x=parseFloat(mark.style.left);
 const shift=parseFloat(mark.style._props["--vat-popup-shift"]);
 const popWidth=parseFloat(mark.style._props["--vat-popup-width"]);
 assert.ok(x>=14&&x<=mapWidth-14,"Every dot stays within its timeline lane");
 assert.ok(x+shift-popWidth/2>=-0.1&&x+shift+popWidth/2<=mapWidth+0.1,
  "Hover cards must stay inside the lane horizontally");
}
assert.ok(parseFloat(map.style.width)<=env.root.clientWidth,"Timeline must fit inside the screen");
assert.ok(env.find("vat-references").length===1,"Later editions have a separate accessible panel");
markers[0].click();
const detail=env.find("vat-detail")[0];assert.equal(detail.hidden,false);
assert.equal(env.find("vat-detail-item").length,3,"Opening a cluster reveals every event and source");
const navButtons=env.find("vat-controls")[0].children.filter(x=>x.tagName==="button");
assert.equal(navButtons.length,5);
navButtons[1].click(); // previous
assert.equal(env.find("vat-event-marker").filter(x=>x.getAttribute("aria-pressed")==="true").length,1);
env.emit("vitruvia:search",{query:"Akhenaten"});
for(let n=0;n<8;n++)await Promise.resolve();
const life=env.win.VitruviaAcademicTimeline.timelineScope(env.win.VitruviaAcademicTimeline.collect());
assert.equal(life.low,-1370);assert.equal(life.high,-1336);
assert.equal(life.timeline.length,4);
assert.equal(life.references.length,0);
env.emit("vitruvia:clear",{});
assert.equal(env.root.hidden,true);
console.log("PASS: timeline dimensions, biographies, modern sources, clustering, click, navigation and Akhenaten bounds");
