/* Regression for the Unicode key used by Lexicon's literal-word fast path.
   No corpus download and no synthetic meanings or semantic expansion. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const src=readFileSync("assets/vitruvia-lexicon.js","utf8");
const begin=src.indexOf("function strictForm(");
const end=src.indexOf("function work(D,id)",begin);
assert(begin>=0&&end>begin,"No se encontró la ruta literal del motor Lexicon");
const fold=t=>String(t).normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[ςϲ]/g,"σ");
const context=vm.createContext({fold,TOKEN:/[\p{L}\p{M}]+/gu,MAX_HITS:100});
vm.runInContext(src.slice(begin,end)+"\nglobalThis.literalSearch=execute;",context);
const passages=[
 ["vitruvius","II.10.1","domus atque domesticus"],
 ["euclid","I.1","λόγος καὶ ἀνθρώπων"]
];
const D={corpus:{passages},post:new Map([
 ["domus",[0]],["domesticus",[0]],["λογοσ",[1]]
])};
const search=(value,work="")=>context.literalSearch(D,{
 steps:[{term:{type:"form",v:value},gap:null}],near:null
},{literalOriginal:true,work});
assert.equal(search("domus").hits.length,1,"domus debe localizarse en el índice literal");
assert.equal(search("DOMUS").hits.length,1,"Mayúsculas no impiden la búsqueda");
assert.equal(search("dom").hits.length,0,"No agregar coincidencias parciales");
assert.equal(search("domus","euclid").hits.length,0,"El filtro por obra debe respetarse");
assert.equal(search("λόγος").hits.length,1,"Griego politónico debe conservar su búsqueda literal");
assert.equal(search("λόγο").hits.length,0,"No usar flexión o búsqueda difusa automática");
console.log("PASS Lexicon literal: domus, Greek, case normalization, work filter, no related words.");
