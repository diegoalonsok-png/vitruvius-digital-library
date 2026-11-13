import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
const code=readFileSync("assets/lexicon-gematria.js","utf8");
const html=readFileSync("vitruvia-lexicon.html","utf8");
assert.match(html,/id="lx-gematria"/);
assert.match(html,/lexicon-gematria\.js\?v=/);
assert.ok(html.indexOf('id="lx-gematria"')<html.indexOf('<footer class="footer">'),"Gematria precedes footer");
const ids={};
for(const id of ["lx-gematria","lx-gem-form","lx-gem-input","lx-gem-script","lx-gem-result"]){
 ids[id]={value:"",textContent:"",dataset:{},children:[],listeners:{},
  replaceChildren(){this.children=[]},append(...nodes){this.children.push(...nodes)},addEventListener(k,fn){this.listeners[k]=fn},
  querySelectorAll(){return[]}};
}
ids["lx-gem-script"].value="auto";
ids["lx-gematria"].querySelectorAll=()=>[];
const document={
 getElementById:id=>ids[id]||null,
 createElement:tag=>({tagName:tag,children:[],textContent:"",className:"",dataset:{},append(...nodes){this.children.push(...nodes)}})
};
const window={};
runInNewContext(code,{document,window,Object,Set,String,Number}, {filename:"lexicon-gematria.js"});
const {compute}=window.VitruviaGematria;
assert.equal(compute("נרון קסר","auto").total,666);
assert.equal(compute("נרו קסר","auto").total,616);
assert.equal(compute("Neron Caesar","auto").total,666);
assert.equal(compute("Nero Caesar","auto").total,616);
assert.equal(compute("Νέρων Καῖσαρ","auto").script,"gr");
assert.notEqual(compute("Νέρων Καῖσαρ","auto").total,666,"Greek spelling must not get Hebrew result");
assert.equal(compute("Νέρων Καῖσαρ","he").total,0,"Greek input cannot be silently transliterated to Hebrew");
assert.equal(compute("χξϛ","gr").total,666);
assert.equal(compute("DCLXVI","la").total,666);
assert.equal(compute("נרון קסר","he").parts.map(x=>x.n).join(","),"50,200,6,50,100,60,200");
assert.equal(compute("נרו קסר","he").parts.map(x=>x.n).join(","),"50,200,6,100,60,200");
console.log("PASS · gematria 666/616, Greek and Latin kept distinct, HTML loaded");
