import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const path="assets/classics-lexical-popup.js";
const s=readFileSync(path,"utf8");
new vm.Script(s,{filename:path});
const b=s.indexOf("function academicContextLinks(word,lang,context={}){");
const e=s.indexOf("function linksFor(word,lang,mark){",b);
assert.ok(b>=0&&e>b,"Missing pure contextual link builder");
const build=vm.runInNewContext(s.slice(b,e)+";academicContextLinks",{
 URL,location:{href:"https://vitruvius-digital-library.org/classics-text-reader.html?work=plato-apology&lang=grc&locus=12"}
});
const without=build("λόγος","grc",{});
assert.equal(without.length,2,"Without proven work, show only lexical and corpus links");
const lexical=new URL(without[0][1]);
assert.equal(lexical.searchParams.get("q"),"λόγος");
assert.equal(lexical.searchParams.get("lang"),"grc");
assert.equal(lexical.searchParams.get("work"),null);
assert.equal(lexical.searchParams.get("locus"),null,"Do not assume page URL locus is hit locus");
assert.equal(new URL(without[1][1]).pathname,"/bibliotheca-graeca-latina.html");
assert.equal(new URL(without[1][1]).searchParams.get("q"),"λόγος");
const withCtx=build("symmetria","la",{work:"vitruvius",locus:"1.2.4",language:"la"});
assert.equal(withCtx.length,3);
for(const [k,v] of Object.entries({work:"vitruvius",locus:"1.2.4",lang:"la",q:"symmetria"}))
 assert.equal(new URL(withCtx[0][1]).searchParams.get(k),v);
const dossier=new URL(withCtx[2][1]);
assert.equal(dossier.pathname,"/classics-work-record.html");
assert.equal(dossier.searchParams.get("work"),"vitruvius");
assert.ok(s.includes('document.addEventListener("vitruvia:classics-passage"'),
 "Use actual reader locus events, not pdf page numbers");
assert.ok(s.includes('linksFor(word,lang,mark)'),
 "Ensure popup receives the highlighted passage identity");
const reader=readFileSync("assets/classics-text-reader.js","utf8");
assert.ok(reader.includes('new CustomEvent("vitruvia:classics-passage"'),"Reader must emit the verified passage event");
console.log("PASS: contextual Lexicon, Bibliotheca and dossier links preserve real passage provenance");
