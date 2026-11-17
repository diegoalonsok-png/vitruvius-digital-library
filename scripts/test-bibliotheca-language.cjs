#!/usr/bin/env node
/* Check language switching against the real Bibliotheca UI script, without network access. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('assets/bibliotheca-ui-i18n.js','utf8');
const html=fs.readFileSync('bibliotheca-graeca-latina.html','utf8');
assert.match(html,/bibliotheca-ui-i18n\.js\?v=20261117-full-page-en-fr-v5/);
assert.match(html,/id="language-toggle"/);
const endpoint='https://vitruvius-digital-library.org/bibliotheca-graeca-latina?work=plato-euthydemus';
assert.equal(new URL(endpoint).searchParams.get('work'),'plato-euthydemus');
const originals=[
 'Idioma',
 'Busca una palabra o frase en todos los libros indexados, o selecciona una obra. Consulta cuántas veces aparece en cada libro y dónde se encuentra.',
 '44 originales digitales · Índice de obras y archivos',
 'Πλάτων · Εὐθύδημος'
];
const nodes=originals.map(nodeValue=>({nodeValue,parentElement:{
 closest(s){return s==='main.library'?{}:null},
 matches(){return false}
}}));
const document={
 readyState:'loading',body:{},documentElement:{lang:'es'},
 addEventListener(){},querySelectorAll(){return []},
 createTreeWalker(){let n=0;return {nextNode(){return nodes[n++]||null}}}
};
const testSource=script.replace(/\}\)\(\);\s*$/,'globalThis.__test={paint:uiPaint};})();');
assert.ok(testSource.includes('globalThis.__test'));
const scope={document,NodeFilter:{SHOW_TEXT:4},
 MutationObserver:class{observe(){}disconnect(){}},
 setTimeout(){},clearTimeout(){}};
vm.runInNewContext(testSource,scope,{filename:'assets/bibliotheca-ui-i18n.js'});
assert.ok(scope.__test,'translation engine loaded');
const switchTo=lang=>{document.documentElement.lang=lang;scope.__test.paint();return nodes.map(n=>n.nodeValue)};
const en=switchTo('en');
assert.equal(en[0],'Language');assert.match(en[1],/^Search for a word/);assert.match(en[2],/^44 digital originals/);
assert.equal(en[3],originals[3]);
const fr=switchTo('fr');
assert.equal(fr[0],'Langue');assert.match(fr[1],/^Recherchez un mot/);assert.match(fr[2],/^44 originaux numériques/);
assert.equal(fr[3],originals[3]);
assert.deepEqual(switchTo('es'),originals);
assert.equal(new URL(endpoint).searchParams.get('work'),'plato-euthydemus');
console.log('OK Bibliotheca ES → EN → FR → ES; Greek original preserved; work=plato-euthydemus preserved.');
