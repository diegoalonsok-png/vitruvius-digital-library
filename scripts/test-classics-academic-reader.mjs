/* Source-preserving notes, navigation, translation and PDF comparison, offline. */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync,existsSync} from "node:fs";
import {JSDOM} from "jsdom";
const read=p=>readFileSync(p,"utf8"),load=p=>JSON.parse(read(p));
const pause=()=>new Promise(r=>setTimeout(r,10));
async function until(fn){for(let i=0;i<180;i++){if(fn())return;await pause()}assert(fn(),"Timed out waiting for the reader");}
const manifest=load("data/classics-corpus/reading-notes/manifest.json");
let checked=0;
for(const e of manifest.entries){
 const notes=load(e.path),corpus=load("data/classics-corpus/"+e.workId+"-"+e.language+".json");
 assert.equal(notes.sourceSha256,corpus.sourceSha256);
 const passages=corpus.passages;
 for(const [locus,n] of Object.entries(notes.passages)){
  const original=passages.find(p=>p.locus===locus&&(n.importedText?p.text===n.importedText:createHash("sha256").update(p.text).digest("hex")===n.sourceTextSha256));
  assert(original,"Exact imported text retained at "+e.workId+":"+locus);assert(n.notes.length);
  for(const note of n.notes){assert(n.importedText?original.text.includes(note.text):original.text.slice(note.start,note.end)===note.text);assert(["reference","editorial","textual"].includes(note.kind));checked++;}
 }
}
assert(checked>20000);

function fetcher(url){const p=String(url).split("?")[0];return Promise.resolve({ok:existsSync(p),status:existsSync(p)?200:404,json:async()=>existsSync(p)?load(p):null});}
const dom=new JSDOM(read("classics-text-reader.html"),{url:"https://example.org/vitruvius-digital-library/classics-text-reader.html?work=clement-2&lang=grc&locus=1.1&to=es",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window,d=w.document,errors=[],translations=[];
w.HTMLElement.prototype.scrollIntoView=function(){};w.matchMedia=()=>({matches:false});w.fetch=fetcher;
w.addEventListener("error",e=>errors.push(e.message));
w.VitruviaInlineTranslation={translate:async(text,source,target)=>{translations.push({text,source,target});return {text:"Traducción de prueba al "+target,provider:"Proveedor de prueba"}}};
for(const path of ["assets/classical-lexicon.js","assets/classics-academic-reader.js","assets/classics-text-reader.js","assets/classics-inline-parallel.js","assets/classics-reader-annotations.js","assets/classics-translation-annotations.js"])w.eval(read(path));
await until(()=>d.querySelector("#passages p")&&d.querySelector(".cl-translation-output p"));
assert.deepEqual(errors,[]);
assert.match(d.querySelector("#current-locus").textContent,/Capítulo 1\.1/);
assert(!d.querySelector("#passages p>span:not(.locus)").textContent.includes("Acts"));
assert.match(d.querySelector("#edition-footnotes").textContent,/Acts 10, 12/);
assert.match(d.querySelector("#reader-source-identification").textContent,/Kirsopp Lake/);
assert.match(d.querySelector("#reader-source-identification").textContent,/1912/);
assert(!translations[0].text.includes("Acts"),"Only main source text is sent for translation");
assert(d.querySelector(".cl-dual-reader").classList.contains("translation-first"));
d.querySelector("#locus-query").value="1.2";d.querySelector("#locus-form").dispatchEvent(new w.Event("submit",{cancelable:true}));
await until(()=>translations.length>1);
assert.match(new URL(w.location.href).searchParams.get("locus"),/:1\.2$/);
assert.match(d.querySelector("#edition-footnotes").textContent,/AC\./);
assert(!d.querySelector("#passages p>span:not(.locus)").textContent.includes("AC."));
assert.equal(d.querySelector(".cl-imported-source p").textContent,load("data/classics-corpus/clement-2-grc.json").passages[1].text);
const before=d.querySelector("#current-locus").textContent;
d.querySelector("#locus-query").value="999.999";d.querySelector("#locus-form").dispatchEvent(new w.Event("submit",{cancelable:true}));
assert.equal(d.querySelector("#current-locus").textContent,before);assert.match(d.querySelector("#locus-status").textContent,/No se encontró/);
const mode=d.querySelector('[aria-label="Contenido de la lectura enfrentada"]');mode.value="pdf";mode.dispatchEvent(new w.Event("change"));
await until(()=>d.querySelector(".cl-pdf-panel select").options.length>100);
const pdfInput=d.querySelector('[aria-label="Dirección de otro PDF"]');pdfInput.value="https://example.org/translation.pdf";
d.querySelector(".cl-pdf-tools button").click();
assert.match(d.querySelector(".cl-pdf-panel iframe").src,/translation\.pdf#page=1/);
const pdfPage=d.querySelector('[aria-label="Página del PDF enfrentado"]');pdfPage.value="8";pdfPage.dispatchEvent(new w.Event("change"));
assert.match(d.querySelector(".cl-pdf-panel iframe").src,/#page=8/);
const originalFrame=d.querySelector(".cl-pdf-panel iframe").src;pdfInput.value="javascript:alert(1)";d.querySelector(".cl-pdf-tools button").click();assert.equal(d.querySelector(".cl-pdf-panel iframe").src,originalFrame);
assert.equal(w.ClassicsAcademicReader.findLocus([{locus:"a:1"},{locus:"b:1"}],"1"),-1);
mode.value="translation";mode.dispatchEvent(new w.Event("change"));
await until(()=>!d.querySelector(".cl-translation-output").hasAttribute("aria-busy"));
assert.deepEqual(errors,[]);w.close();

console.log(`PASS: ${manifest.entries.length} source-verified editions and ${checked} notes; Clement loci, note separation, full imported text, translation input, PDF comparison.`);
