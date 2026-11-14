/* Real reader, source corpus and documented lexical indexes. No network. */
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=path=>readFileSync(path,"utf8");
const corpus=JSON.parse(read("data/classics-corpus/augustine-civitate-dei-la.json"));
const jsonCache=new Map();
async function open({query="logos",locus="11.24",literal=false,noIndexes=false,fixture=null,work="augustine-civitate-dei",language="la"}={}){
 const errors=[],requested=[],gates=new Map();
 const dom=new JSDOM(read("classics-text-reader.html"),{
  url:"https://example.org/classics-text-reader?work="+work+"&lang="+language+"&locus="+locus+"&q="+encodeURIComponent(query)+(literal?"&literal=1":"&expanded=1"),
  runScripts:"outside-only",pretendToBeVisual:true
 });
 const w=dom.window,d=w.document;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.addEventListener("error",event=>errors.push(event.message));
 w.fetch=async url=>{
  const path=String(url).split("?")[0];requested.push(path);
  if(gates.has(path))await gates.get(path);
  const unavailable=noIndexes&&/lexicon\//.test(path);
  if(unavailable||!existsSync(path))return {ok:false,status:404,json:async()=>null};
  if(!jsonCache.has(path))jsonCache.set(path,JSON.parse(read(path)));
  const value=fixture&&path.endsWith("augustine-civitate-dei-la.json")?{...corpus,passages:fixture}:jsonCache.get(path);
  return {ok:true,status:200,json:async()=>structuredClone(value)};
 };
 for(const script of ["assets/classical-lexicon.js","assets/classics-text-reader.js","assets/classics-reader-annotations.js"])
  w.eval(read(script));
 for(let attempts=0;attempts<80&&!d.querySelector("#passages p");attempts++)
  await new Promise(resolve=>setTimeout(resolve,10));
 assert(d.querySelector("#passages p"),"Reader did not load: "+d.getElementById("source-title").textContent);
 assert.deepEqual(errors,[],"No reader exceptions");
 const find=(query,mode="lexical")=>{
  d.getElementById("query").value=query;d.getElementById("search-mode").value=mode;
  d.getElementById("find").click();assert.deepEqual(errors,[]);
  return d.querySelector(".search-summary").textContent;
 };
 const marks=()=>[...d.querySelectorAll("#passages mark.cl-hit")].map(node=>node.textContent);
 const startLanguage=lang=>{d.getElementById("language").value=lang;d.getElementById("language").dispatchEvent(new w.Event("change"))};
 const changeLanguage=async lang=>{
  startLanguage(lang);
  for(let n=0;n<150&&d.getElementById("passages").getAttribute("lang")!==lang;n++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(d.getElementById("passages").getAttribute("lang"),lang,"Selected edition must load");
  assert.deepEqual(errors,[]);
 };
 const defer=path=>{let release,fail;gates.set(path,new Promise((resolve,reject)=>{release=resolve;fail=reject}));release.fail=fail;return release};
 return {w,d,find,marks,requested,startLanguage,changeLanguage,defer,close:()=>w.close()};
}

const page=await open();
assert(page.requested.includes("data/lexicon/forms-la.json"),"Missing work glossary must fall back to the documented shared forms");
assert.match(page.d.querySelector("#current-locus").textContent,/11\.24/);
assert(page.marks().includes("Verbum"),"logos must highlight attested Verbum at XI.24");
const original=corpus.passages.find(p=>p.locus==="11.24").text;
assert.equal(page.d.querySelector("#passages p>span:not(.locus)").textContent,original,"Marks must preserve every source character");
const romanSummary=page.d.querySelector(".search-summary").textContent;
assert.match(romanSummary,/0 textuales, 0 por formas indexadas y [1-9]\d* por equivalencias/);
assert.equal(page.find("λόγος"),romanSummary,"Greek and transliterated queries must resolve the same Latin equivalents");
assert.equal(page.find("λόγος"),romanSummary,"Greek accent variants must work");
assert.match(page.find("logos","literal"),/^0 pasajes/);
assert.deepEqual(page.marks(),[],"A failed new query must clear the previous highlights");
assert.equal(new URL(page.w.location.href).searchParams.get("q"),"logos");
assert.equal(new URL(page.w.location.href).searchParams.get("literal"),"1");
assert.match(page.find("domus","literal"),/^[1-9]\d* pasajes/);
assert(page.marks().every(word=>word.toLowerCase()==="domus"),"Literal domus must keep working");
for(const quoted of ['"domus"','“domus”','«domus»',"'domus'"]){
 assert.match(page.find(quoted,"literal"),/^[1-9]\d* pasajes/,"Quotation marks must not hide an attested word");
 assert(page.marks().every(word=>word.toLowerCase()==="domus"));
}
assert.match(page.find("in principio erat verbum","literal"),/^[1-9]\d* pasajes/);
assert(page.marks().every(phrase=>/^in principio erat [vu]erbum$/i.test(phrase)),"Phrase search must highlight the entire attested phrase");
assert.match(page.find("zzzzqqqq"),/^0 pasajes/);
assert.deepEqual(page.marks(),[]);
assert.equal(new URL(page.w.location.href).searchParams.get("q"),"zzzzqqqq");
page.d.getElementById("clear").click();
assert(page.d.getElementById("search-results-section").hidden);
assert.equal(new URL(page.w.location.href).searchParams.has("q"),false);
page.close();

const fixture=[{locus:"1",text:"A Latin paragraph with Greek quotation: λόγος καὶ λόγος, and Latin Verbum. "+"Textus integer servatur. ".repeat(20)}];
const mixed=await open({literal:true,fixture,locus:"1"});
assert.deepEqual(mixed.marks(),["λόγος","λόγος"],"Latin editions must transliterate embedded Greek by script");
assert.match(mixed.find("λόγος","literal"),/2 textuales/);
mixed.close();

const offline=await open({noIndexes:true,query:"domus",literal:true});
assert(offline.marks().length>0,"Literal source search must remain available when all optional indexes fail");
offline.close();

const seneca=await open({work:"seneca-de-brevitate",language:"la",query:"vita",locus:"1",literal:true});
assert.match(seneca.find("tempus","literal"),/^[1-9]\d* pasajes/);
await seneca.changeLanguage("en");
assert.equal(seneca.d.getElementById("query").value,"tempus","Changing edition must preserve the current query, rather than the initial URL query");
seneca.d.getElementById("clear").click();
await seneca.changeLanguage("la");
assert.equal(seneca.d.getElementById("query").value,"","A cleared query must stay cleared across editions");
assert(seneca.d.getElementById("search-results-section").hidden);
seneca.d.querySelectorAll("#toc button")[5].click();
const selectedLocus=new URL(seneca.w.location.href).searchParams.get("locus");
await seneca.changeLanguage("en");
assert.equal(new URL(seneca.w.location.href).searchParams.get("locus"),selectedLocus,"Keep the current locus label where the other edition has the same label");
const release=seneca.defer("data/classics-corpus/seneca-de-brevitate-es.json");
seneca.startLanguage("es");
await seneca.changeLanguage("la");
release();await new Promise(resolve=>setTimeout(resolve,50));
assert.equal(seneca.d.getElementById("passages").getAttribute("lang"),"la","A superseded slow edition must not overwrite the latest selection");
assert.equal(new URL(seneca.w.location.href).searchParams.get("lang"),"la");
const failed=seneca.defer("data/classics-corpus/seneca-de-brevitate-fr.json");
seneca.startLanguage("fr");
await seneca.changeLanguage("en");
failed.fail(Error("Superseded response failed"));await new Promise(resolve=>setTimeout(resolve,50));
assert(seneca.d.querySelector("#passages p"),"A superseded failure must not erase the loaded text");
assert.equal(seneca.d.getElementById("passages").getAttribute("lang"),"en");
seneca.close();

for(const [work,query,locus] of [["plato-apology","λόγος","17"],["homer-odyssey","ἄνδρα","1.1"]]){
 const greek=await open({work,language:"grc",query,locus,literal:true});
 assert(greek.marks().length>0,work+" must find its attested Greek text");
 const before=greek.d.querySelector(".search-summary").textContent;
 const transliteration=work==="plato-apology"?"logos":"andra";
 assert.equal(greek.find(transliteration,"literal"),before,"Transliteration must preserve Greek concordance counts");
 greek.close();
}
console.log("PASS: Augustine, Seneca, Plato and Homer: equivalents, exact/quoted words, phrases, faithful marks, edition/query navigation, slow-response ordering and optional-index failure.");
