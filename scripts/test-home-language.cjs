#!/usr/bin/env node
/* Dependency-free ES → EN → FR → ES regression test for the real homepage dictionary. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const base=path.resolve(__dirname,"..");
const js=fs.readFileSync(path.join(base,"assets/i18n.js"),"utf8");
const html=fs.readFileSync(path.join(base,"index.html"),"utf8");
assert.match(html,/assets\/i18n\.js\?v=20261117-home-complete-v4/);
const source=[
 "Textos clásicos indexados",
 "Manuscritos, ediciones históricas, traducciones y estudios para leer, investigar y comparar los diez libros de Vitruvio.",
 "Vitruvio se copió y se leyó sin interrupción durante la Edad Media: el censo de Krinsky (1967) reúne setenta y ocho manuscritos. El códice que Poggio Bracciolini vio en Saint-Gall en 1416 no supuso un redescubrimiento; la idea de un Vitruvio «recuperado» por el humanismo es una construcción posterior.",
 "Los derechos sobre los materiales originales, el diseño y los aportes editoriales pertenecen a sus respectivos titulares. Los textos antiguos, facsímiles, imágenes y recursos de terceros conservan su situación jurídica y licencias propias."
];
const makeElement=tag=>({
 tagName:tag,options:[],children:[],textContent:"",
 append(...v){this.children.push(...v);if(tag==="select")this.options.push(...v)},
 setAttribute(){},
 addEventListener(type,callback){this["on_"+type]=callback},
 getAttribute(){return ""},
});
const nodes=source.map(nodeValue=>({nodeValue,parentElement:{closest(){return null},childNodes:[{}],lang:""}}));
let select;
const host=makeElement("span");
const listeners={};
const document={
 readyState:"complete",body:{},documentElement:{lang:"es"},
 querySelectorAll(selector){
  if(selector===".header-languages")return [host];
  if(selector===".header-languages select")return select?[select]:[];
  return [];
 },
 createTreeWalker(){let i=0;return {nextNode(){return nodes[i++]||null}}},
 createElement(tag){const node=makeElement(tag);if(tag==="select")select=node;return node},
 addEventListener(type,fn){(listeners[type]??=[]).push(fn)},
 dispatchEvent(event){for(const fn of listeners[event.type]||[])fn(event)}
};
const context={
 document,NodeFilter:{SHOW_TEXT:4},
 MutationObserver:class{observe(){}},
 localStorage:{getItem(){return "es"},setItem(){}},
 requestAnimationFrame(fn){fn()},
 CustomEvent:class{constructor(type,args){this.type=type;this.detail=args.detail}}
};
vm.runInNewContext(js,context,{filename:"assets/i18n.js"});
assert.ok(select,"main-page language control was not mounted");
const swap=lang=>{select.value=lang;select.on_change();return nodes.map(n=>n.nodeValue)};
const en=swap("en");
assert.match(en[0],/Indexed classical texts/);
assert.match(en[1],/Manuscripts, historical editions/);
assert.match(en[2],/Vitruvius continued to be copied/);
assert.match(en[3],/Rights in original materials/);
const fr=swap("fr");
assert.match(fr[0],/Textes classiques indexés/);
assert.match(fr[1],/Manuscrits, éditions historiques/);
assert.match(fr[2],/Vitruve a continué/);
assert.match(fr[3],/Les droits sur les matériaux originaux/);
assert.deepEqual(swap("es"),source);
assert.equal(document.documentElement.lang,"es");
console.log("OK ES → EN → FR → ES: navigation, description, history and rights restored.");
