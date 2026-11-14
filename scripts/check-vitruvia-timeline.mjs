import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import { assertStylesheet } from "./lib/stylesheet-loaded.mjs";
import assert from "node:assert/strict";
const source=readFileSync(new URL("../assets/vitruvia-academic-timeline.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../vitruvia.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../assets/vitruvia-academic-timeline.css",import.meta.url),"utf8");
assert.match(html,/id="vitruvia-academic-timeline"/);
assert.match(html,/assets\/vitruvia-academic-timeline\.js/);
// La hoja llega dentro de un paquete desde que las hojas contiguas se agrupan;
// se comprueba que llegue, no que exista un <link> individual.
assertStylesheet(assert,html,"assets/vitruvia-academic-timeline.css","vitruvia.html");
assert.match(source,/amarnaproject\.com\/amarna-the-place\/boundary-stelae\//,
 "Ajetatón milestones must link their epigraphic source");
assert.match(source,/primera proclamación sobre Ajetatón \(año regnal 5\)/,
 "Do not conflate the fifth-year boundary proclamation with the sixth year");
assert.match(source,/segunda proclamación corresponde al año 6/,
 "Retain the sixth-year proclamation distinctly");
assert.doesNotMatch(source,/Cambio de nombre y fundación de Ajetatón/,
 "Avoid asserting a single certain sixth-year foundation date");

assert.match(css,/vat-viewport/);
assert.match(css,/overflow-x:auto/);
assert.match(css,/Standalone chronology across the full board/);
assert.match(css,/\.vat-peek\[hidden\]\{display:none!important\}/,"Previews must hide completely");
assert.match(css,/\.vat-band-body/,"Previews are contained within chronological tracks");
assert.match(css,/\.vat-event-marker \.vat-event-pop\{display:none!important\}/,"Old floating popovers must not overlap events");
assert.doesNotMatch(css,/\.article-grid:has\(> #vitruvia-academic-timeline/);
assert.match(html,/<section id="vitruvia-academic-timeline"[^>]*hidden><\/section><div class="results-grid">/);
class E {
 constructor(tag="div",id=""){
  const own=this;
  const classes=new Set();
  const style={setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}};
  const classList={add(k){classes.add(k)},toggle(k,on){if(on)classes.add(k);else classes.delete(k)},contains(k){return classes.has(k)}};
  Object.assign(this,{tagName:tag,id,className:"",children:[],dataset:{},attributes:{},style,classList,
    textContent:"",hidden:false,parentElement:null,isConnected:true,listeners:{},scrolls:[],clientWidth:760});
 }
 append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);n.parentElement=this;this.children.push(n)}}
 prepend(...nodes){for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);n.parentElement=this;this.children.unshift(n)}}
 insertBefore(a,b){if(a.parentElement)a.parentElement.children=a.parentElement.children.filter(x=>x!==a);const i=this.children.indexOf(b);this.children.splice(i<0?this.children.length:i,0,a);a.parentElement=this}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 setAttribute(k,v){this.attributes[k]=v}
 getAttribute(k){return this.attributes[k]??null}
 addEventListener(k,f){this.listeners[k]=f}
 focus(){this.focused=true}
 querySelector(selector){if(selector===".article-grid")return this.children.find(x=>x.className==="article-grid")||null;return null}
 querySelectorAll(selector){const out=[];const visit=e=>{if(e.className==="vat-event"&&selector.startsWith(".vat-event")&&e.attributes["aria-pressed"]==="true")out.push(e);for(const x of e.children)visit(x)};visit(this);return out}
 scrollBy(opts){this.scrolls.push(opts)}
 get nextElementSibling(){if(!this.parentElement)return null;const a=this.parentElement.children;return a[a.indexOf(this)+1]||null}
}
const article=new E("section","vitruvia-article"),articleGrid=new E();
articleGrid.className="article-grid";article.hidden=true;article.append(articleGrid);
const body=new E("div","article-body");articleGrid.append(body);
const resultsSection=new E("section","results"),resultsGrid=new E();resultsGrid.className="results-grid";
const resultList=new E("div","result-list");resultsGrid.append(resultList);
const root=new E("section","vitruvia-academic-timeline");resultsSection.append(root,resultsGrid);
const ids={"vitruvia-academic-timeline":root,"vitruvia-article":article,"article-body":body,"result-list":resultList};
const callbacks={}, observers=[],win={
 addEventListener:(name,callback)=>{callbacks[name]=callback},
 VitruviaSearchSnapshot:null,
 VitruviaEntityResolver:{resolve:async q=>({wikidataId:q==="Pink Floyd"?"Q1":"Q2",
  canonical:q,instanceOf:q==="Pink Floyd"?["Q215380"]:["Q5"],inceptionYear:q==="Pink Floyd"?1965:null,
  birthYear:q==="Ramses II"?-1303:q==="Mozart"?1756:null,
  deathYear:q==="Mozart"?1791:null})}
};
const doc={documentElement:{lang:"es"},getElementById:id=>ids[id]||null,
 querySelector:q=>q==="#results .results-grid"?resultsGrid:null,createElement:tag=>new E(tag)};
runInNewContext(source,{window:win,document:doc,MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this)}observe(target){this.target=target}},queueMicrotask},{filename:"vitruvia-academic-timeline.js"});
const emit=(name,detail)=>callbacks[name]({detail});
emit("vitruvia:search",{query:"Pink Floyd"});
emit("vitruvia:cultural-works",{wikidataId:"Q1",works:[{id:"Q3",year:1973,title:"An attributed work",dateKind:"publication",dateProperty:"P577"}]});
emit("vitruvia:albums",{query:"the Pink Floyd",albums:[{title:"An edition 1980",releaseDate:"1980-01-01",url:"https://example.org/catalogue"}]});
for(let i=0;i<4;i++)await Promise.resolve();
const events=win.VitruviaAcademicTimeline.collect();
assert.deepEqual([...events.map(x=>x.year)].sort((a,b)=>a-b),[1965,1973,1980]);
assert.ok(events.some(x=>x.lane==="works"&&x.year===1973));
assert.ok(events.some(x=>x.lane==="documents"&&x.year===1980));
assert.equal(root.nextElementSibling,resultsGrid,"Timeline must stand above both result columns");
assert.equal(root.parentElement,resultsSection,"Timeline is no longer a grid child");
article.hidden=false;for(const observer of observers)if(observer.target===article)observer.callback([]);
await Promise.resolve();
assert.equal(root.parentElement,article,"Timeline moves above the article grid");
assert.equal(root.nextElementSibling,articleGrid);
article.hidden=true;for(const observer of observers)if(observer.target===article)observer.callback([]);
await Promise.resolve();
assert.equal(root.parentElement,resultsSection,"Timeline returns above search results");
assert.equal(root.nextElementSibling,resultsGrid);
const find=cls=>{const out=[];const visit=x=>{if(x.className===cls)out.push(x);for(const n of x.children)visit(n)};visit(root);return out};
const button=find("vat-event")[0],detail=find("vat-detail")[0];
assert.ok(button&&detail);
button.listeners.click();
assert.equal(detail.hidden,false,"Clicking a milestone opens the sourced reading pane");
const preview=find("vat-peek")[0];
assert(preview&&preview.hidden,"Hover preview must be initially hidden");
button.listeners.mouseenter();
assert.equal(preview.hidden,false,"Mouse enter reveals a compact in-flow preview");
button.listeners.mouseleave();
assert.equal(preview.hidden,true,"Mouse leave hides preview without moving another marker");
button.listeners.focus();
assert.equal(preview.hidden,false,"Keyboard focus reveals the same preview");
button.listeners.blur();
assert.equal(preview.hidden,true,"Keyboard blur closes preview");
assert(find("vat-band-body").length>0,"Event track and its preview must share one layout container");
const arrowNext=find("vat-controls")[0]?.children?.find(x=>x.attributes?.["aria-label"]==="Avanzar");
assert(arrowNext?.onclick,"Timeline arrow must select the next milestone, not scroll an overflowing canvas");
arrowNext.onclick();
assert.equal(find("vat-detail")[0].hidden,false);
// Regression: common Greek conceptual terms must not acquire unrelated
// albums, similarly named modern books or spurious Wikidata entity dates.
emit("vitruvia:search",{query:"logos"});
for(let i=0;i<4;i++)await Promise.resolve();
emit("vitruvia:results",{query:"logos",rows:[{type:"book",title:"Logos",year:2011,link:"https://example.org/unrelated",source:"Catalogue"}]});
emit("vitruvia:albums",{query:"logos",albums:[{title:"Logos (album)",releaseDate:"1999-01-01",url:"https://example.org/album"}]});
emit("vitruvia:cultural-works",{wikidataId:"Q2",works:[{id:"Q44",year:1980,title:"Logos",dateKind:"publication",dateProperty:"P577"}]});
assert.equal(win.VitruviaAcademicTimeline.collect().length,0,"Logos cannot inherit unrelated dated works");
assert.equal(find("vat-event").length,0,"Abstract term timeline must not show spurious dates");
emit("vitruvia:search",{query:"λόγος"});
assert.equal(win.VitruviaAcademicTimeline.collect().length,0,"Greek accented λόγος has the same protection");
emit("vitruvia:search",{query:"Ramses II"});
for(let i=0;i<4;i++)await Promise.resolve();
assert.deepEqual([...win.VitruviaAcademicTimeline.collect().map(x=>x.year)],[-1303]);
// The lifetime chart must never stretch to posthumous scholarly publications.
emit("vitruvia:search",{query:"Mozart"});
for(let i=0;i<4;i++)await Promise.resolve();
emit("vitruvia:results",{query:"Mozart",rows:[{type:"book",title:"Mozart",year:1900,link:"https://example.org/edition",source:"Catalogue"}]});
const extra=find("vat-outside")[0];
assert(extra,"Posthumous editions need a separate sourced list");
assert.equal(find("vat-event").length,2,"Only birth and death should appear on biographical axis");
const layout=win.VitruviaAcademicTimeline.layoutMarkers;
for(const width of [54,115,220,320,440,760,1280]){
 const crowded=Array.from({length:48},(_,i)=>({year:1756+Math.floor(i/3),title:"event "+i}));
 const positions=layout(crowded,1750,90,width,1.35);
 assert.equal(positions.length,48);
 const byRow=new Map();
 for(const p of positions){
  assert(p.center>=0&&p.center<=width,"Marker must stay inside timeline");
  const popCenter=p.center+p.shift;
  assert(popCenter-p.popupWidth/2>=-0.01,"Tooltip left edge outside timeline");
  assert(popCenter+p.popupWidth/2<=width+0.01,"Tooltip right edge outside timeline");
  const last=byRow.get(p.level);
  if(last!=null)assert(p.center-last>=35-0.01,"Markers collide in the same lane");
  byRow.set(p.level,p.center);
 }
}
emit("vitruvia:clear",{});
assert.equal(root.hidden,true);
assert.equal(win.VitruviaAcademicTimeline.collect().length,0);
console.log("Vitruvia universal chronology: sources, clicks, standalone placement in article/results, zero grid overlap, reset PASS");
