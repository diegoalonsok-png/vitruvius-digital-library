/* Real reader, source corpus and documented lexical indexes. No network. */
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {JSDOM} from "jsdom";

const read=path=>readFileSync(path,"utf8");
const corpus=JSON.parse(read("data/classics-corpus/augustine-civitate-dei-la.json"));
const jsonCache=new Map();
async function open({query="logos",locus="11.24",literal=false,noIndexes=false,fixture=null}={}){
 const errors=[],requested=[];
 const dom=new JSDOM(read("classics-text-reader.html"),{
  url:"https://example.org/classics-text-reader?work=augustine-civitate-dei&lang=la&locus="+locus+"&q="+encodeURIComponent(query)+(literal?"&literal=1":""),
  runScripts:"outside-only",pretendToBeVisual:true
 });
 const w=dom.window,d=w.document;
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.addEventListener("error",event=>errors.push(event.message));
 w.fetch=async url=>{
  const path=String(url).split("?")[0];requested.push(path);
  const unavailable=noIndexes&&/lexicon\//.test(path);
  if(unavailable||!existsSync(path))return {ok:false,status:404,json:async()=>null};
  if(!jsonCache.has(path))jsonCache.set(path,JSON.parse(read(path)));
  const value=fixture&&path.endsWith("augustine-civitate-dei-la.json")?{...corpus,passages:fixture}:jsonCache.get(path);
  return {ok:true,status:200,json:async()=>value};
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
 return {w,d,find,marks,requested,close:()=>w.close()};
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
console.log("PASS: Augustine logos/λόγος→Verbum and indexed forms; literal domus; phrases; faithful yellow marks; no-hit reset; mixed alphabets; optional-index failure.");
