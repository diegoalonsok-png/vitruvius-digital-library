/* Query trees must render before the corpus, resolve indexed inflections,
   and retain an origin branch when the language is outside the selector. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const read=p=>readFileSync(p,"utf8");
const source=read("assets/vitruvia-lexicon.js");
const etym=JSON.parse(read("data/lexicon/etymologicum.json"));
const concepts=JSON.parse(read("data/lexicon/conceptus.json"));
const forms={la:JSON.parse(read("data/lexicon/forms-la.json")),grc:JSON.parse(read("data/lexicon/forms-grc.json"))};
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[ςϲ]/g,"σ").replace(/j/g,"i").replace(/v/g,"u");
let release;const metadata=new Promise(resolve=>release=resolve);
const nodes=new Map(),origins=[];
function element(tag,attrs={},...children){
 return {tag,...attrs,children:children.flat().filter(x=>x!=null),dataset:{},isConnected:true,
  append(...items){this.children.push(...items.flat().filter(x=>x!=null))},
  replaceChildren(...items){this.children=items.flat().filter(x=>x!=null)},
  before(node){nodes.set("#"+node.id,node)}};
}
nodes.set("#lx-entry",element("article"));nodes.set("#lx-q",{value:""});nodes.set("#lx-lang",{value:"auto"});
const scope=vm.createContext({
 S:{lang:"auto",mode:"palabra",etym},fold,el:element,$:selector=>nodes.get(selector),
 GREEK:/[Ͱ-Ͽἀ-῿]/,HEBREW:/[֐-׿]/,
 CONC_ALIASES:concepts.queryAliases||[],lemmaDisplay:s=>String(s).replace(/\d+$/,""),
 conceptus:async()=>concepts.concepts,
 load:async path=>{if(path.endsWith("etymologicum.json")){await metadata;return etym}return forms[path.includes("forms-grc")?"grc":"la"]},
 renderEtymTree:async(word,lang,box)=>{origins.push({word,lang,box})},renderTabs(){},run(){},
});
const segment=(begin,end)=>source.slice(source.indexOf(begin),source.indexOf(end,source.indexOf(begin)));
vm.runInContext(segment("function findCurated(words){","function etymCard(e){")+
 segment("function exactModernConcept(word,","async function renderModernEquivalents(")+
 segment("function wordTreeVisible(){","function renderExactEntry(")+"\nthis.tree=renderWordTree;",scope);
let current=true;
const pending=scope.tree("verbum",()=>current);
assert.equal(nodes.get("#lx-word-tree").hidden,false,"The tree must not wait for corpus or metadata");
assert.equal(nodes.get("#lx-word-tree").dataset.query,"verbum");
release();await pending;
assert(origins.some(x=>x.word==="verbum"&&x.lang==="la"));
for(const [word,lang,lemma] of [["verbo","la","verbum"],["domibus","la","domus"],["λόγου","grc","λόγος"],["verbo","auto","verbum"]]){
 origins.length=0;scope.S.lang=lang;await scope.tree(word,()=>true);
 assert(origins.some(x=>fold(x.word)===fold(lemma)),"Missing indexed origin: "+word+" → "+lemma);
 assert(!origins.some(x=>x.word==="deus"),"Word trees must not add an unrelated concept");
}
// Exercise actual dictionary entries beyond the curated etymological subset.
let checked=0;
for(const code of ["la","grc"]){
 for(const word of Object.keys(forms[code].forms).filter(x=>/^\p{L}{5,}$/u.test(x)).slice(150,175)){
  origins.length=0;scope.S.lang=code;await scope.tree(word,()=>true);
  assert(origins.length>0,"Every indexed word needs an origin branch: "+word);checked++;
 }
}
origins.length=0;scope.S.lang="auto";await scope.tree("слово",()=>true);
assert(origins.some(x=>x.word==="слово"&&x.lang===null),"Do not force Cyrillic into Latin");
origins.length=0;
const stale=scope.tree("verbum",()=>false);await stale;
assert.equal(origins.length,0,"A stale query must not populate the next tree");

let headings=["Russian"];
const languageScope=vm.createContext({
 WK_LANG:{la:["Latin","latín"],ar:["Arabic","árabe"],nl:["Dutch","neerlandés"],"ML.":["Latin","latín medieval"]},WK_ORDER:["la"],
 wkPage:async()=>({}),wkLanguages:()=>headings,wkSection:()=>[],wkGloss:()=>"",wkHeadword:()=>"",wkEtymParagraphs:()=>[],
});
vm.runInContext(segment("async function buildEtymTree(word,","function wkDescendants(")+"\nthis.build=buildEtymTree;",languageScope);
const unknown=await languageScope.build("слово",null);
assert.equal(unknown.chain[0].word,"слово");
assert.equal(unknown.code,"source:Russian","Use the source's language heading outside the selector");
headings=["Latin","Dutch","Russian","Ukrainian"];
const multiple=await languageScope.build("verbum","la");
assert.equal(multiple.available.length,4,"Show each source language once, including those outside the selector");
assert(!multiple.available.includes("ML."),"Do not relabel a Latin section as separate historical languages");
assert(source.includes("Origen no documentado en las fuentes consultadas."),"Never invent an unattested origin");
console.log("PASS origin branches: immediate tree before corpus, verbum/verbo/domibus/λόγου, "+checked+" further indexed forms, unknown language and stale queries.");
