import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const html=readFileSync("aparato-critico.html","utf8");
const ui=readFileSync("assets/apparatus-critico-ui.js","utf8");
const css=readFileSync("assets/critical-lexicon-theme.css","utf8");
const theme=readFileSync("assets/theme.js","utf8");

assert.match(html,/<main[^>]+translate="no"/,"Main must not be modified by a competing generic translator");
assert.match(html,/<header[^>]+translate="no"/,"Header must be localized by one engine");
assert.doesNotMatch(html,/src="assets\/global-language\.js/,"Aparato Crítico must not load the competing global language engine");
for(const language of ["es","en","fr"])assert.match(html,new RegExp('data-apparatus-lang="'+language+'"'),"Missing explicit "+language+" header control");
assert.match(html,/src="assets\/apparatus-critico-ui\.js\?v=[^"]+" defer/,"Page translator must be loaded");
assert.doesNotMatch(html,/src="assets\/i18n\.js/,"Do not run competing UI translation engines");
assert.match(theme,/const apparatusPage=location\.pathname\.split/);
assert.match(theme,/let choice=isFront\|\|apparatusPage\?'dark':'light'/);
assert.match(css,/html\[data-theme="light"\]:has\(body\.critical-lexicon-theme\)/);
assert.match(css,/html\[data-theme="light"\] body\.critical-lexicon-theme \.critical-unified/);
assert.match(css,/html\[data-theme="light"\] body\.critical-lexicon-theme \.site-header \.critical-header-tools :is\(select,button\)/);
assert.match(css,/body\.critical-lexicon-theme \.site-header \.apparatus-language-switch button\[aria-pressed="true"\]/);
assert.match(theme,/!\['metodologia-filologica.html','aparato-critico.html'\]\.includes/);

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
const settings={};
const buttons=Object.fromEntries(["es","en","fr"].map(language=>{
 const listeners={};
 const button={dataset:{apparatusLang:language},attrs:{},
  setAttribute(k,v){this.attrs[k]=v},addEventListener(name,fn){listeners[name]=fn},
  click(){listeners.click?.()}
 };return [language,button];
}));
const selectors=Object.fromEntries(["critical-unified-edition","critical-edition","apparatus-catalog-edition"].map(id=>[id,{
 value:"",options:[{value:"recensio-es"},{value:"theory-en"},{value:"recensio-fr"}],
 changes:0,dispatchEvent(){this.changes++}
}]));
const forms={["critical-unified-form"]:{submitted:0,requestSubmit(){this.submitted++}},
 ["critical-form"]:{submitted:0,requestSubmit(){this.submitted++}}};
const queries={["critical-unified-query"]:{value:"III.1.2"},["critical-query"]:{value:"III.1.2"}};
const documentStub={
 readyState:"complete",title:"",
 documentElement:{dataset:{theme:"dark"},lang:"es"},
 querySelectorAll(query){
  if(query==="main.critical-wrap,header.site-header nav,footer,.institution-bar")return [root];
  if(query==="[data-apparatus-lang]")return Object.values(buttons);
  return [];
 },
 querySelector(query){
  if(query==="header.site-header .theme-switch")return themeButton;
  if(query==='meta[name="description"]')return titleMeta;
  return null;
 },
 createTreeWalker(){
  let offset=0;
  return {nextNode(){return nodes[offset++]||null}};
 },
 getElementById(id){return selectors[id]||forms[id]||queries[id]||null},
 addEventListener(name,handler){events.set(name,handler)},
 dispatchEvent(event){events.get(event.type)?.(event)}
};
const storage={getItem(key){return settings[key]||"es"},setItem(key,value){settings[key]=value}};
class Observer{observe(){}}
const context=vm.createContext({
 document:documentStub,location:{pathname:"/vitruvius-digital-library/aparato-critico.html"},
 NodeFilter:{SHOW_TEXT:4},MutationObserver:Observer,localStorage:storage,
 Event:class Event{constructor(type){this.type=type}},
 CustomEvent:class CustomEvent{constructor(type,options){this.type=type;this.detail=options?.detail}}
});
vm.runInContext(ui,context,{filename:"apparatus-critico-ui.js"});
assert.deepEqual(nodes.map(node=>node.nodeValue),original);
assert.equal(themeButton.attrs["aria-label"],"Activar fondo claro");
const switchTo=language=>buttons[language].click();
// Exercise all three language changes multiple times, including the actual
// edition-filter reconfiguration and repeated search submission.
for(let round=0;round<3;round++){
 for(const language of ["en","fr","es"]){
  switchTo(language);
  const edition={en:"theory-en",fr:"recensio-fr",es:"recensio-es"}[language];
  for(const control of Object.values(selectors))assert.equal(control.value,edition);
  assert.equal(buttons[language].attrs["aria-pressed"],"true");
  assert.equal(settings["vitruvius-ui-lang"],language);
 }
}
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
assert(forms["critical-unified-form"].submitted>=10);
assert(forms["critical-form"].submitted>=10);
assert.equal(selectors["critical-unified-edition"].value,"theory-en");
assert.equal(selectors["critical-edition"].value,"theory-en");
assert.equal(selectors["apparatus-catalog-edition"].value,"theory-en");
assert.equal(JSON.parse(settings["vitruvius-cotejo-versiones"])[1],"en-tr");
console.log("PASS Aparato Crítico: repeated ES/EN/FR clicks, Latin preserved, V514/V554/V297 edition changes, forms resubmitted, light/dark palette");
