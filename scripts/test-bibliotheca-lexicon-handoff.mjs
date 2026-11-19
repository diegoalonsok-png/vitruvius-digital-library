#!/usr/bin/env node
// Regression: Bibliotheca's "Buscar palabras en Lexicon" must keep the typed term.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const page=readFileSync("bibliotheca-graeca-latina.html","utf8");
const lexicon=readFileSync("assets/vitruvia-lexicon.js","utf8");
const match=page.match(/<script id="bibliotheca-lexicon-search-bind-v1">([\s\S]*?)<\/script>/);
assert(match,"Bibliotheca Lexicon link binder missing");
assert(lexicon.includes('initialParams.get("q")'),"Lexicon no longer accepts incoming q");

const control=(value="")=>({
 value,listeners:new Map(),addEventListener(type,listener){
  this.listeners.set(type,[...(this.listeners.get(type)||[]),listener]);
 },
 emit(type){for(const fn of this.listeners.get(type)||[])fn()},
 focus(){},setAttribute(name,value){this[name]=value}
});
const form=control(),mode=control("palabra"),q=control(),clear=control(),lang=control("auto");
const link=control(),hint=control(),modeButton=control();
modeButton.dataset={lxMode:"lema"};
form.querySelector=selector=>selector===".bib-lx-advanced"?link:null;
form.append=()=>{};
const ids={
 "bibliotheca-lexicon-form":form,"bibliotheca-lexicon-mode":mode,
 "bibliotheca-lexicon-q":q,"bibliotheca-lexicon-clear":clear,
 "bibliotheca-lexicon-lang":lang,"bib-lx-hint":hint
};
const document={
 getElementById:id=>ids[id]||null,
 querySelectorAll:selector=>selector===".bib-lx-modes [data-lx-mode]"?[modeButton]:[]
};
runInNewContext(match[1],{document,URLSearchParams});
const params=()=>new URL(link.href,"https://vitruvius-digital-library.org").searchParams;

q.value="Julio César";q.emit("input");
assert.equal(params().get("q"),"Julio César");
assert.equal(params().get("mode"),"palabra");
assert.equal(params().get("source"),"bibliotheca");

lang.value="la";lang.emit("change");modeButton.emit("click");
assert.equal(params().get("q"),"Julio César");
assert.equal(params().get("mode"),"lema");
assert.equal(params().get("lang"),"la");

q.value="ἀρετή";link.emit("click");
assert.equal(params().get("q"),"ἀρετή","Click must read current value");
clear.emit("click");assert.equal(params().has("q"),false,"Clear must remove stale query");
console.log("PASS: Bibliotheca → Lexicon forwards Julio César, Greek text, mode and language.");
