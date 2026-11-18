/* Regression: exact ancient headword linked from Spanish UI must retain
   original-language concordances; work counts precede actual excerpts. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const main=readFileSync("assets/vitruvia-lexicon.js","utf8");
const bridge=readFileSync("assets/lexicon-classics-bridge.js","utf8");
const html=readFileSync("vitruvia-lexicon.html","utf8");
new vm.Script(main,{filename:"assets/vitruvia-lexicon.js"});
new vm.Script(bridge,{filename:"assets/lexicon-classics-bridge.js"});
const lex=JSON.parse(readFileSync("data/lexicon/etymologicum.json","utf8"));
const numen=lex.entries.find(e=>e.lemma==="numen"&&e.l==="la");
assert.ok(numen,"numen must retain its Latin source headword");
assert.ok(main.includes("ancientHeadword?.l||resolveLang(q)"),
 "A modern-language deep link must not suppress a documented Latin or Greek headword");
assert.ok(main.includes('list.append(renderWorkCounts(D,hits,res.capped))'),
 "Word results must show per-work counts above the cited passages");
const a=main.indexOf("function renderWorkCounts(D,hits,capped){");
const b=main.indexOf("function renderHits(D,res){",a);
assert.ok(a>=0&&b>a,"Per-work counter must be available");
const ctx={
 S:{q:"numen"},
 work:(_D,id)=>({vitruvius:{author:"Vitruvio",title:"De architectura"},virgil:{author:"Virgilio",title:"Aeneis"}}[id]),
 $:()=>({value:""}),
 el:(tag,attrs={},...children)=>({tag,attrs,children,append(...more){this.children.push(...more)}}),
 Map,Math,Number,String
};
vm.createContext(ctx);
const counter=vm.runInContext(main.slice(a,b)+"\nrenderWorkCounts",ctx);
const D={l:"la",corpus:{passages:[["vitruvius","1.praef.1","numen...numen"],["virgil","1.1","numen"],["vitruvius","1.1","numen"]]}};
const tree=counter(D,[{i:0,spans:[[0,5],[9,14]]},{i:1,spans:[[0,5]]},{i:2,spans:[[0,5]]}],false);
const strings=[];
const walk=node=>{if(typeof node==="string")strings.push(node);else if(node&&typeof node==="object")for(const child of node.children||[])walk(child)};
walk(tree);
assert.ok(strings.some(s=>s.includes("Libros que contienen «numen»")),"Missing per-book heading");
assert.ok(strings.some(s=>s.includes("3 coincidencias")&&s.includes("2 pasajes")),"Vitruvius must aggregate occurrences across its passages");
assert.ok(strings.some(s=>s.includes("1 coincidencia")&&s.includes("1 pasaje")),"Virgil must have an independent count");
assert.ok(bridge.includes('window.addEventListener("vitruvia:lexicon-search"'),
 "A submitted word must automatically start the Bibliotheca search");
assert.ok(bridge.includes("showIndexedBookTotals(q,token)"),
 "Indexed book counts must be visible independently of excerpt fetching");
assert.ok(!bridge.includes("if(false&&initial"),
 "The deep-link search must not remain disabled");
assert.ok(bridge.includes("showLiteralRows(rows,editions)"),
 "Retrieved passages must be listed beneath the indexed books");
assert.ok(html.includes("lx-word-counts-style")&&
 html.includes("20261118-word-books-counts-v1"),"Visible styling and cache refresh are required");
console.log("PASS Lexicon numen: Spanish deep link → Latin headword → book counts → grey excerpts; no synthetic occurrences.");
