import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync("aparato-critico.html","utf8");
const ui=readFileSync("assets/apparatus-critico-ui.js","utf8");
const css=readFileSync("assets/critical-lexicon-theme.css","utf8");
const theme=readFileSync("assets/theme.js","utf8");

assert.match(html,/<main[^>]+translate="no"/,"Main must not be modified by a competing generic translator");
assert.match(html,/<header[^>]+translate="no"/,"Header must be localized by one engine");
assert.match(html,/src="assets\/global-language\.js[^"]*" data-global-language defer/,"Shared ES/EN/FR selector must remain mounted");
assert.match(html,/src="assets\/apparatus-critico-ui\.js\?v=[^"]+" defer/,"Page translator must be loaded");
assert.doesNotMatch(html,/src="assets\/i18n\.js/,"Do not run competing UI translation engines");
assert.match(theme,/const apparatusPage=location\.pathname\.split/);
assert.match(theme,/let choice=isFront\|\|apparatusPage\?'dark':'light'/);
assert.match(css,/html\[data-theme="light"\]:has\(body\.critical-lexicon-theme\)/);
assert.match(css,/html\[data-theme="light"\] body\.critical-lexicon-theme \.critical-unified/);
assert.match(css,/html\[data-theme="light"\] body\.critical-lexicon-theme \.site-header \.critical-header-tools :is\(select,button\)/);
assert.match(css,/html\[data-theme="light"\] body\.critical-lexicon-theme \.site-header \.site-global-language select/);

// Execute the actual page translator against a small deterministic DOM.
// Switching ES -> EN -> FR -> ES must alter every ordinary interface label,
// preserve text from the editions and update accessibility labels.
const values=[
 "Índice textual y notas editoriales",
 "Concordancia integral · textos y aparato de las tres ediciones",
 "Palabra, frase o locus",
 "Buscar",
 "Edición",
 "Las tres ediciones",
 "Buscar en los libros",
 "Catálogo integral del aparato crítico de los libros",
 "Cargar catálogo completo",
 "Notas editoriales de las ediciones",
 "Pasajes y traducciones de contexto",
 "Consultar →",
 "Continuar investigación:",
 "symmetria"
];
const nodes=values.map(value=>({
 nodeValue:value,
 parentElement:{closest(selector){return value==="symmetria"&&selector.includes("code")?{}:null}}
}));
const original=[...values];
const elements={};
const titleMeta={
 content:"",
 setAttribute(name,value){if(name==="content")this.content=value}
};
const themeButton={
 attrs:{},title:"",
 setAttribute(name,value){this.attrs[name]=value},
 getAttribute(name){return this.attrs[name]}
};
const events=new Map();
const root={};
const documentStub={
 readyState:"complete",title:"",
 documentElement:{dataset:{theme:"dark"},lang:"es"},
 querySelectorAll(query){return query==="main.critical-wrap,header.site-header nav,footer,.institution-bar"?[root]:[]},
 querySelector(query){
  if(query==="header.site-header .theme-switch")return themeButton;
  if(query==='meta[name="description"]')return titleMeta;
  return null;
 },
 createTreeWalker(){
  let offset=0;
  return {nextNode(){return nodes[offset++]||null}};
 },
 getElementById(){return null},
 addEventListener(name,handler){events.set(name,handler)}
};
const storage={getItem(){return "es"}};
class Observer{observe(){}}
const context=vm.createContext({
 document:documentStub,location:{pathname:"/vitruvius-digital-library/aparato-critico.html"},
 NodeFilter:{SHOW_TEXT:4},MutationObserver:Observer,localStorage:storage
});
vm.runInContext(ui,context,{filename:"apparatus-critico-ui.js"});
assert.deepEqual(nodes.map(node=>node.nodeValue),original);
assert.equal(themeButton.attrs["aria-label"],"Activar fondo claro");
const switchTo=language=>{
 const handler=events.get("vitruvius:language-changed");
 assert(handler,"Translation selector event handler missing");
 handler({detail:{language}});
};
switchTo("en");
assert.equal(nodes[0].nodeValue,"Textual index and editorial notes");
assert.equal(nodes[2].nodeValue,"Word, phrase or locus");
assert.equal(nodes[3].nodeValue,"Search");
assert.equal(nodes[9].nodeValue,"Editorial notes from the editions");
assert.equal(nodes[13].nodeValue,"symmetria","Latin technical terms may not be translated");
assert.equal(documentStub.documentElement.lang,"en");
assert.match(documentStub.title,/Textual Index/);
assert.match(titleMeta.content,/Critical search/);
switchTo("fr");
assert.equal(nodes[0].nodeValue,"Index textuel et notes éditoriales");
assert.equal(nodes[3].nodeValue,"Rechercher");
assert.match(documentStub.title,/Index textuel/);
assert.match(titleMeta.content,/Recherche critique/);
switchTo("es");
assert.deepEqual(nodes.map(n=>n.nodeValue),original,"Switching back to ES must restore all original interface labels");
documentStub.documentElement.dataset.theme="light";
switchTo("en");
assert.equal(themeButton.attrs["aria-label"],"Switch to dark appearance");
assert.equal(documentStub.documentElement.lang,"en");
console.log("PASS Aparato Crítico: ES/EN/FR reversible, Latin preserved, theme control and scoped light palette");
