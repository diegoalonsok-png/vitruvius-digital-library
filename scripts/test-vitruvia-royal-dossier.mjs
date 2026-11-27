import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const paths={"html":"vitruvia.html","source":"assets/vitruvia-egypt-dossier.js","data":"data/vitruvia/titulaturae.json","shelf":"assets/vitruvia-reading-shelf.js","model":"assets/vitruvia-source-model.js"};

function verify({html,source,data,shelf,model,assert}){
 const check=(condition,label)=>{assert(condition,label);passed.push(label)},passed=[];
 check((html.match(/id="vitruvia-royal-dossier-host"/g)||[]).length===1,"one independent dossier host");
 check(html.indexOf('id="vitruvia-royal-dossier-host"')<html.indexOf('id="vitruvia-article"'),"host precedes article");
 check((html.match(/assets\/vitruvia-egypt-dossier\.js/g)||[]).length===1,"one dossier script");
 check(/<script defer src="assets\/vitruvia-egypt-dossier\.js\?v=/.test(html),"core script is deferred");
 const start=source.indexOf("function matchRoyalQuery("),end=source.indexOf("function findRuler(",start);
 const N=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N} ]/gu," ").replace(/\s+/g," ").trim();
 const find=new Function("N",source.slice(start,end)+";return matchRoyalQuery")(N);
 for(const [q,id] of [["Akenatón","akhenaten"],["Akhenaten","akhenaten"],["Faraón Amenhotep IV","akhenaten"],["rey Tut","tutankhamun"],["Tutankamón","tutankhamun"],["Ramsés II","ramesses-ii"],["Vitruvio",undefined],["tumba de Tutankamón",undefined]])check(find(data,q)?.id===id,"identity: "+q);
 for(const id of ["akhenaten","tutankhamun"]){
  const r=data.rulers.find(x=>x.id===id);
  for(const k of ["horus","nebty","golden","prenomen","nomen"])check(!!r?.names?.[k]?.trans&&!!r?.names?.[k]?.gloss,id+" · "+k);
 }
 const records=new Function(source.slice(source.indexOf("const ROYAL_PRIMARY="),source.indexOf("const ROYAL_PLANS="))+";return ROYAL_PRIMARY")();
 check(records.tutankhamun.some(r=>r.url==="https://mjn.host.cs.st-andrews.ac.uk/egyptian/texts/corpus/pdf/RestorationTutankhamun.pdf"&&r.witness==="https://digitalkarnak.ucsc.edu/restoration-stela-of-tutankhamen/"),"Restoration Stela scholarly edition and record");
 check(records.akhenaten.some(r=>r.url.endsWith("/amarna/belief.html")&&r.edition),"Great Hymn bibliographic edition");
 check(records.akhenaten.some(r=>r.url.endsWith("/amarna/boundary.html")&&r.coverage),"boundary stela scope");
 check(source.includes("KV62_1.pdf")&&source.includes("Great-Aten-Temple_Spring2022-HI.pdf"),"both institutional drawing links");
 const window={};new Function("window",model)(window);
 const select=new Function("window","normalize","titleTerms",shelf.slice(shelf.indexOf(" function validWork("),shelf.indexOf(" function coverUrl("))+";return selectedBooks;")(window,N,q=>N(q).split(" "));
 const docs=[{key:"/works/OL1W",title:"Akhenaten",publisher:["Oxford University Press"]},{key:"/works/OL2W",title:"Akhenaten for children",publisher:["Oxford University Press"],subject:["Children's books"]},{key:"/works/OL3W",title:"Akhenaten mystery",publisher:["Unknown"]},{key:"/works/OL4W",title:"Akhenaten paperback"}];
 check(select("Akhenaten",docs).map(x=>x.key).join(",")==="/works/OL1W","academic gate excludes unclassified and children titles");
 return passed;
}
const args={assert};for(const [key,path] of Object.entries(paths)){const content=readFileSync(new URL("../"+path,import.meta.url),"utf8");args[key]=key==="data"?JSON.parse(content):content;}
const passed=verify(args);for(const check of passed)console.log("PASS",check);console.log(passed.length+" regression checks passed (static and unit tests; not live browser).");
