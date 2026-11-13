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
assert.match(html, /<details id="lx-gem-catalog"/, "The optional catalogue must be collapsible");
assert.doesNotMatch(html, /<details id="lx-gem-catalog"[^>]*open(?:\s|>)/, "Catalogue must stay closed by default");
const entries=window.VitruviaGematria.examples;
assert.ok(entries.length>=20, "Provide a useful reference set");
for(const [system,expression,expected] of entries){
 const got=compute(expression,system);
 assert.equal(got.total,expected, "Reference mismatch: "+expression);
 assert.equal(got.ignored.length,0, "Reference contains unsupported letters: "+expression);
}
assert.equal(entries.find(x=>x[1]==="Νεῖλος")?.[2],365,"Nile 365 must be available as a selectable example");

assert.equal(compute("נרון קסר","auto").total,666);
assert.equal(compute("נרו קסר","auto").total,616);
assert.equal(compute("Neron Caesar","he").total,666,"Known scholarly transliteration works if Hebrew selected");
assert.equal(compute("Nero Caesar","he").total,616);
assert.equal(compute("דוד","he").total,14,"David in Hebrew");
assert.equal(compute("חי","he").total,18,"Chai in Hebrew");
assert.equal(compute("שלום","he").total,376,"Shalom in Hebrew");
assert.equal(compute("שָׁלוֹם","he").total,376,"Niqqud must not affect gematria");
assert.equal(compute("אמת","he").total,441,"Emet in Hebrew");
assert.equal(compute("אלהים","he").total,86,"Elohim in Hebrew");
assert.equal(compute("λόγος","gr").total,373,"Logos isopsephy");
assert.equal(compute("ΛΟΓΟΣ","gr").total,373,"Greek case");
assert.equal(compute("Ἰησοῦς","gr").total,888,"Iesous isopsephy");
assert.equal(compute("Λατεῖνος","gr").total,666,"Lateinos 666");
assert.equal(compute("χιϛ","gr").total,616,"Greek numerals 616");
assert.equal(compute("Νέρων Καῖσαρ","gr").total,1337,"Neron Kaisar not 666 in Greek");
assert.equal(compute("Néron Caesar","auto").total,666,"Latin transliteration diacritic");
assert.equal(compute("Nerus Caesar","auto").translit,false,"Non-attested forms must not be silently normalized");

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
