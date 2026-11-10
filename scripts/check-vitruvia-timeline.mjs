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
class E {
 constructor(tag="div",id=""){
  Object.assign(this,{tagName:tag,id,className:"",children:[],dataset:{},attributes:{},style:{},
    textContent:"",hidden:false,parentElement:null,isConnected:true,listeners:{},scrolls:[]});
 }
 append(...nodes){for(const n of nodes){if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);n.parentElement=this;this.children.push(n)}}
 prepend(...nodes){for(let i=nodes.length-1;i>=0;i--){const n=nodes[i];if(n.parentElement)n.parentElement.children=n.parentElement.children.filter(x=>x!==n);n.parentElement=this;this.children.unshift(n)}}
 insertBefore(a,b){if(a.parentElement)a.parentElement.children=a.parentElement.children.filter(x=>x!==a);const i=this.children.indexOf(b);this.children.splice(i<0?this.children.length:i,0,a);a.parentElement=this}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,f){this.listeners[k]=f}
 querySelector(selector){if(selector===".article-grid")return this.children.find(x=>x.className==="article-grid")||null;return null}
 querySelectorAll(selector){const out=[];const visit=e=>{if(e.className==="vat-event"&&selector.startsWith(".vat-event")&&e.attributes["aria-pressed"]==="true")out.push(e);for(const x of e.children)visit(x)};visit(this);return out}
 scrollBy(opts){this.scrolls.push(opts)}
 get nextElementSibling(){if(!this.parentElement)return null;const a=this.parentElement.children;return a[a.indexOf(this)+1]||null}
}
const article=new E("section","vitruvia-article"),articleGrid=new E();
articleGrid.className="article-grid";article.hidden=true;article.append(articleGrid);
const body=new E("div","article-body");articleGrid.append(body);
const resultsGrid=new E();resultsGrid.className="results-grid";
const resultList=new E("div","result-list");resultsGrid.append(resultList);
const root=new E("section","vitruvia-academic-timeline");resultsGrid.insertBefore(root,resultList);
const ids={"vitruvia-academic-timeline":root,"vitruvia-article":article,"article-body":body,"result-list":resultList};
const callbacks={}, win={
 addEventListener:(name,callback)=>{callbacks[name]=callback},
 VitruviaSearchSnapshot:null,
 VitruviaEntityResolver:{resolve:async q=>({wikidataId:q==="Pink Floyd"?"Q1":"Q2",
  canonical:q,inceptionYear:q==="Pink Floyd"?1965:null,birthYear:q==="Ramses II"?-1303:null})}
};
const doc={documentElement:{lang:"es"},getElementById:id=>ids[id]||null,
 querySelector:q=>q==="#results .results-grid"?resultsGrid:null,createElement:tag=>new E(tag)};
runInNewContext(source,{window:win,document:doc,MutationObserver:class{observe(){}},queueMicrotask},{filename:"vitruvia-academic-timeline.js"});
const emit=(name,detail)=>callbacks[name]({detail});
emit("vitruvia:search",{query:"Pink Floyd"});
emit("vitruvia:cultural-works",{wikidataId:"Q1",works:[{id:"Q3",year:1973,title:"An attributed work",dateKind:"publication",dateProperty:"P577"}]});
emit("vitruvia:albums",{query:"the Pink Floyd",albums:[{title:"An edition 1980",releaseDate:"1980-01-01",url:"https://example.org/catalogue"}]});
for(let i=0;i<4;i++)await Promise.resolve();
const events=win.VitruviaAcademicTimeline.collect();
assert.deepEqual([...events.map(x=>x.year)].sort((a,b)=>a-b),[1965,1973,1980]);
assert.ok(events.some(x=>x.lane==="works"&&x.year===1973));
assert.ok(events.some(x=>x.lane==="documents"&&x.year===1980));
assert.equal(root.nextElementSibling,resultList);
const find=cls=>{const out=[];const visit=x=>{if(x.className===cls)out.push(x);for(const n of x.children)visit(n)};visit(root);return out};
const button=find("vat-event")[0],detail=find("vat-detail")[0];
assert.ok(button&&detail);
button.listeners.click();
assert.equal(detail.hidden,false,"Clicking a milestone opens the sourced reading pane");
emit("vitruvia:search",{query:"Ramses II"});
for(let i=0;i<4;i++)await Promise.resolve();
assert.deepEqual(win.VitruviaAcademicTimeline.collect().map(x=>x.year),[-1303]);
emit("vitruvia:clear",{});
assert.equal(root.hidden,true);
assert.equal(win.VitruviaAcademicTimeline.collect().length,0);
console.log("Vitruvia universal chronology: all searches, source dates, async identity, albums, clicks, reset PASS");
