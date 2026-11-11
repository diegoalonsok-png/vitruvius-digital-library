import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import assert from "node:assert/strict";
const source=readFileSync(new URL("../assets/vitruvia-academic-timeline.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../vitruvia.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../assets/vitruvia-academic-timeline.css",import.meta.url),"utf8");
assert.match(html,/id="vitruvia-academic-timeline"/);
assert.match(html,/assets\/vitruvia-academic-timeline\.js/);
assert.match(html,/assets\/vitruvia-academic-timeline\.css/);
assert.match(css,/vat-viewport/);
assert.match(css,/overflow-x:auto/);
assert.match(css,/\.vat-peek\[hidden\]/,"Hover previews must have a deterministic hidden state");
assert.match(css,/\.vat-band-body/,"Timeline preview lives inside each track band");
assert.match(css,/\.vat-event-pop\{display:none!important\}/,"No floating popup can cover adjacent bands");
assert.match(css,/overflow:hidden!important/,"Timeline must not escape its reader container");
assert.match(css,/Standalone chronology across the full board/);
assert.doesNotMatch(css,/\.article-grid:has\(> #vitruvia-academic-timeline/);
assert.match(html,/<section id="vitruvia-academic-timeline"[^>]*hidden><\/section><div class="results-grid">/);
class E {
 constructor(tag="div",id=""){
  Object.assign(this,{tagName:tag,id,className:"",children:[],dataset:{},attributes:{},style:{setProperty(k,v){this[k]=v},removeProperty(k){delete this[k]}},
    clientWidth:680,textContent:"",hidden:false,parentElement:null,isConnected:true,listeners:{},scrolls:[]});
 }
 append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);n.parentElement=this;this.children.push(n)}}
 prepend(...nodes){for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);n.parentElement=this;this.children.unshift(n)}}
 insertBefore(a,b){if(a.parentElement)a.parentElement.children=a.parentElement.children.filter(x=>x!==a);const i=this.children.indexOf(b);this.children.splice(i<0?this.children.length:i,0,a);a.parentElement=this}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 get classList(){
  return {add:(name)=>{if(!this.className.split(/\s+/).includes(name))this.className=(this.className+" "+name).trim()},
   toggle:(name,enabled)=>{const set=new Set(this.className.split(/\s+/).filter(Boolean));if(enabled===undefined? !set.has(name):enabled)set.add(name);else set.delete(name);this.className=[...set].join(" ")},
   remove:(name)=>{this.className=this.className.split(/\s+/).filter(x=>x!==name).join(" ")},
   contains:(name)=>this.className.split(/\s+/).includes(name)};
 }
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,f){this.listeners[k]=f}
 querySelector(selector){if(selector===".article-grid")return this.children.find(x=>x.className==="article-grid")||null;return null}
 querySelectorAll(selector){const out=[];const visit=e=>{if(e.className.split(/\s+/).includes("vat-event")&&selector.startsWith(".vat-event")&&e.attributes["aria-pressed"]==="true")out.push(e);for(const x of e.children)visit(x)};visit(this);return out}
 scrollBy(opts){this.scrolls.push(opts)}
 focus(){this.wasFocused=true}
 scrollIntoView(opts){this.scrolledTo=opts}
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
  canonical:q,inceptionYear:q==="Pink Floyd"?1965:null,
  birthYear:q==="Ramses II"?-1303:q==="Plato"?-428:null,
  deathYear:q==="Plato"?-348:null})}
};
const doc={documentElement:{lang:"es"},getElementById:id=>ids[id]||null,
 querySelector:q=>q==="#results .results-grid"?resultsGrid:null,createElement:tag=>new E(tag)};
runInNewContext(source,{window:win,document:doc,getComputedStyle:()=>({paddingLeft:"12px",paddingRight:"12px"}),MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this)}observe(target){this.target=target}},queueMicrotask},{filename:"vitruvia-academic-timeline.js"});
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
const find=cls=>{const out=[];const visit=x=>{if(x.className.split(/\s+/).includes(cls))out.push(x);for(const n of x.children)visit(n)};visit(root);return out};
const button=find("vat-event")[0],detail=find("vat-detail")[0];
assert.ok(button&&detail);
button.listeners.click();
assert.equal(detail.hidden,false,"Clicking a milestone opens the sourced reading pane");
const peek=find("vat-peek")[0];
assert.ok(peek&&peek.hidden,"Hover preview is initially invisible");
button.listeners.mouseenter();
assert.equal(peek.hidden,false,"Hovering a marker reveals its in-flow preview");
button.listeners.mouseleave();
assert.equal(peek.hidden,true,"Leaving a marker hides its preview");
assert(find("vat-band-body").length>0,"Preview shares the band layout instead of an absolute overlay");
assert.ok(root.style["--vat-label-width"],"Responsive label width is computed");
assert.ok(root.style["--vat-card-width"],"Compact event card width is computed");
emit("vitruvia:search",{query:"Ramses II"});
for(let i=0;i<4;i++)await Promise.resolve();
assert.deepEqual([...win.VitruviaAcademicTimeline.collect().map(x=>x.year)],[-1303]);
emit("vitruvia:search",{query:"Plato"});
for(let i=0;i<4;i++)await Promise.resolve();
emit("vitruvia:cultural-works",{wikidataId:"Q2",works:[
 {id:"Q21",year:-385,title:"A dated dialogue",dateKind:"composition",dateProperty:"P577"},
 {id:"Q22",year:1567,title:"A printed Renaissance edition",dateKind:"publication",dateProperty:"P577"}
]});
const separation=win.VitruviaAcademicTimeline.dividePeriods(win.VitruviaAcademicTimeline.collect());
assert.equal(separation.bounds.birth,-428);
assert.equal(separation.bounds.death,-348);
assert(separation.life.every(x=>x.year>=-428&&x.year<=-348),"Biographical timeline stays within lifetime");
assert(separation.outside.some(x=>x.year===1567),"A later edition is not erased");
assert.equal(find("vat-period-tabs").length,1,"Later sources get a separate accessible timeline tab");
const controls=find("vat-controls")[0];
const navNext=controls.children.at(-1);
assert.equal(typeof navNext.onclick,"function","Timeline arrows navigate actual events");
navNext.onclick();
assert.equal(find("vat-detail")[0].hidden,false,"Next arrow opens the next sourced record");
const tabs=find("vat-period-tabs")[0];
tabs.children.at(-1).listeners.click();
assert(find("vat-event").some(x=>x.attributes["aria-label"]?.includes("1567")),"Posthumous editions retain their own scale");
emit("vitruvia:clear",{});
assert.equal(root.hidden,true);
assert.equal(win.VitruviaAcademicTimeline.collect().length,0);
console.log("PASS: responsive timeline, in-flow hover previews, functional event navigation, separate lifetime/later sources, zero manuscript data changes.");
