/* Offline integration checks: published PDF paths, edition selection, twin reader.
 * Tests actual inventory data and repository documents; never invents translations.
 */
import assert from "node:assert/strict";
import {readFileSync,openSync,readSync,closeSync,statSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
const home=read("index.html");
const apparatus=read("aparato-critico.html");
const catalogue=JSON.parse(read("data/catalog.json"));
const registry=JSON.parse(read("data/classics-corpus/search-registry.json"));
const road=JSON.parse(read("data/classics-corpus/indexation-roadmap-222.json"));
const stats=read("assets/classics-corpus-counts.js");
const genre=read("assets/bibliotheca-genre-work-list.js");
const reader=read("classics-parallel-reader.html");
const app=read("assets/app.js");
const ids={
 "recensio-es":"documents/kurilo-recensio-es.pdf",
 "recensio-fr":"documents/kurilo-recensio-fr.pdf",
 "theory-en":"documents/kurilo-theory-en.pdf"
};
let pdfChecks=0;
for(const [id,file] of Object.entries(ids)){
 const edition=catalogue.editions.find(row=>row.id===id);
 assert(edition,"Missing edition metadata: "+id);
 assert.equal(edition.external,false,"Local PDF must not be treated as an external Google resource: "+id);
 for(const field of ["pdf","pdf_url","source_url","read_url"])
  assert.equal(edition[field],file,"Unexpected "+field+" for "+id);
 assert(home.includes('href="'+file+'"'),"Home edition PDF link must be the hosted file: "+file);
 assert(statSync(file).size>1024,"Empty PDF or LFS pointer: "+file);
 const descriptor=openSync(file,"r"),header=Buffer.alloc(5);
 try{readSync(descriptor,header,0,5,0)}finally{closeSync(descriptor)}
 assert.equal(header.toString("ascii"),"%PDF-","Non-PDF file contents at "+file);
 pdfChecks++;
}
assert.doesNotMatch(read("assets/critical-search.mjs"),/drive\.google\.com/);
assert.match(app,/data\/catalog\.json\?v=20261110-repo-pdfs-v1/);
assert.match(home,/assets\/app\.js\?v=20261110-repo-pdfs-v1/);
assert.match(apparatus,/data-apparatus-lang="es"/);
assert.match(apparatus,/data-apparatus-lang="fr"/);
assert.match(apparatus,/data-apparatus-lang="en"/);
assert.doesNotMatch(apparatus,/src="assets\/global-language\.js/);
assert.match(read("assets/theme.js"),/!?\['metodologia-filologica\.html','aparato-critico\.html'\]/);

// Test actual version mapping used by the homepage tally.
const workCode=stats.slice(stats.indexOf("function recordLabel(w)"),stats.indexOf("function paint(a,data)"));
const versions=new Function(workCode+"\nreturn {workVersions,detailGroup};")();
const byId=new Map(road.items.map(w=>[w.id,w]));
const data={road,registry,byId,remoteEntries:[],extraIds:new Set()};
let withPair=0;
for(const work of road.items){
 const v=versions.workVersions(work.id,data);
 const source=registry.entries.filter(e=>e.workId===work.id&&["la","grc"].includes(e.language)&&
  ["json-passages","structured-bilingual"].includes(e.format));
 const translated=registry.entries.filter(e=>e.workId===work.id&&!["la","grc"].includes(e.language)&&
  ["json-passages","structured-bilingual"].includes(e.format));
 if(source.length&&translated.length){
  assert(v.pair,"Available hosted translation must have an explicit two-viewer link: "+work.id);
  if(work.id==="vitruvius"){
   assert(v.pair.url.startsWith("lector-bilingue.html?edition="),"Vitruvius has its own two-column original/translation reader");
  }else{
   assert(v.pair.url.startsWith("classics-parallel-reader.html?work="));
   assert(v.pair.url.includes("left=")&&v.pair.url.includes("right="));
  }
  const languages=new Set(v.links.map(e=>e.language));
  assert(languages.has(source[0].language),"Original must be listed: "+work.id);
  assert(translated.some(e=>languages.has(e.language)),"Translation must be listed: "+work.id);
  withPair++;
 }else assert(!v.pair,"Do not offer unsourced two-viewer content: "+work.id);
}
for(const title of ["augustine-confessiones","augustine-civitate-dei"]){
 const w=byId.get(title);
 assert.equal(w.author,"Agustín de Hipona");
 assert.equal(w.translationHosted,false,"Do not invent local Augustine translations");
 const v=versions.workVersions(title,data);
 assert.equal(v.pair,null,"Augustine cannot have a parallel reader until a translation is hosted");
 assert(v.links.some(e=>e.language==="la"),"Augustine Latin reader must be available");
}
assert(withPair>=35,"Too few available paired readers: "+withPair);
assert.match(reader,/class="panes"/);
assert.match(reader,/id="pane-left"/);
assert.match(reader,/id="pane-right"/);
assert.match(genre,/classics-parallel-reader\.html\?work=/);
assert.match(read("assets/bibliotheca-simple.css"),/\.genre-work-editions/);
const countLinks=versions.detailGroup(0,data).filter(w=>w.versions?.links.length).length;
assert(countLinks>=120,"Insufficient accessible per-work reader links");
console.log("PASS documents: "+pdfChecks+" valid repository-hosted PDFs and direct links");
console.log("PASS Bibliotheca: "+withPair+" real parallel readers, original/translation links, Agustín without invented versions");
console.log("PASS Aparato Crítico: explicit independent language buttons and preserved repository PDF references");
