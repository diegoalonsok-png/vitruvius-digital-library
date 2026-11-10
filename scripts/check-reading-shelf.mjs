import { readFileSync } from "node:fs";
import { Script, createContext } from "node:vm";
import assert from "node:assert/strict";

const js=readFileSync(new URL("../assets/vitruvia-reading-shelf.js",import.meta.url),"utf8");
const html=readFileSync(new URL("../vitruvia.html",import.meta.url),"utf8");
const css=readFileSync(new URL("../assets/vitruvia-reading-shelf.css",import.meta.url),"utf8");
assert.match(html,/id="vitruvia-reading-shelf"/);
assert.match(html,/assets\/vitruvia-reading-shelf\.js/);
assert.match(html,/assets\/vitruvia-reading-shelf\.css/);
assert.match(css,/overflow-x:auto/);
new Script(js,{filename:"vitruvia-reading-shelf.js"});

class MockElement{
 constructor(tag="div"){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.textContent="";this.hidden=false;}
 setAttribute(a,b){this.attributes[a]=b}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=[...items]}
 addEventListener(event,callback){this["on_"+event]=callback}
 querySelectorAll(selector){
  if(selector===".vrs-card"){
   const out=[];const walk=e=>{if(e?.attributes?.["class"]==="vrs-card")out.push(e);for(const x of e.children||[])walk(x)};walk(this);return out;
  }
  return [];
 }
 scrollBy(){}
}
const callbacks={},timeouts=[],root=new MockElement("section"),document={
 documentElement:{lang:"es"},
 getElementById(id){return id==="vitruvia-reading-shelf"?root:null},
 createElement(tag){return new MockElement(tag)}
};
const window={
 addEventListener(name,cb){callbacks[name]=cb},
 VitruviaSearchSnapshot:null
};
const fetch=async url=>{
 const u=new URL(url);
 assert.equal(u.host,"openlibrary.org");
 return {ok:true,json:async()=>({docs:[{
  key:"/works/OL123456W",title:"Ramesses II: Biography",author_name:["Historian Example"],
  first_publish_year:2000,cover_i:123
 },{key:"/works/UNVERIFIED",title:"Ramesses II",author_name:[]},
 {key:"/works/OL123457W",title:"Completely unrelated",author_name:[]}]})};
};
const context=createContext({document,window,fetch,AbortController,URL,URLSearchParams,
 MutationObserver:class{observe(){}},
 setTimeout(cb,delay){if(delay===160)timeouts.push(cb);return 1},
 clearTimeout(){}});
new Script(js,{filename:"vitruvia-reading-shelf.js"}).runInContext(context);
assert.equal(typeof callbacks["vitruvia:search"],"function");
function strings(node){
 return [node.textContent||"",...(node.children||[]).flatMap(strings)].join(" ");
}
callbacks["vitruvia:search"]({detail:{query:"the pink floyd"}});
assert.equal(root.hidden,false);
assert.match(strings(root),/Nick Mason/);
assert.match(strings(root),/Theodore Roszak/);
assert.match(strings(root),/Libros para comprender la época/);
assert.ok(!strings(root).includes("Historian Example"));
callbacks["vitruvia:search"]({detail:{query:"Ramesses II"}});
assert.equal(root.hidden,true);
await timeouts.at(-1)();
assert.equal(root.hidden,false);
assert.match(strings(root),/Ramesses II: Biography/);
assert.ok(!strings(root).includes("Completely unrelated"));
callbacks["vitruvia:clear"]();
assert.equal(root.hidden,true);
console.log("Reading shelf: syntax, markup, curated groups, conservative Open Library matching, search/reset PASS");
