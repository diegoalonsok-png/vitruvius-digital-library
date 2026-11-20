#!/usr/bin/env node
/* Source/translation provenance derived solely from registered editions.
 * Does not infer copyright, completeness, manuscript fidelity, or R2 availability.
 */
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const main=load("data/bibliotheca-graeca-latina-I-bce-I-ce.json").works;
const extra=load("data/bibliotheca-expansion-publicada-2026-11-16.json").works;
const reg=load("data/classics-corpus/search-registry.json").entries;
const out=path.join(root,"data/classics-corpus/edition-provenance.json");
const works=new Map();
for(const work of [...main,...extra]){
 if(works.has(work.id))throw Error("Duplicate work ID "+work.id);
 works.set(work.id,{id:work.id,author:work.author||null,title:work.title||null,
  originalLanguage:work.originalLanguage||work.language||null,
  originals:[],translations:[],missingTranslation:true});
}
let editions=0,localFiles=0,remoteDeclarations=0;
for(const entry of reg){
 const w=works.get(entry.workId);
 if(!w)continue; // e.g. auxiliary critical apparatus
 const language=entry.language||"";
 const remote=/^https:\/\//.test(entry.path||"");
 let doc=null;
 if(!remote&&/^data\/classics-corpus\/[^/]+\.json$/.test(entry.path||"")){
  const file=path.join(root,entry.path);
  if(!fs.existsSync(file))throw Error("Registered edition file absent: "+entry.path);
  doc=load(entry.path);
  if(doc.workId!==entry.workId||doc.language!==language)throw Error("Edition identity mismatch: "+entry.path);
  if(!Array.isArray(doc.passages)||!doc.passages.some(p=>typeof p.text==="string"&&p.text.trim()))throw Error("Empty source: "+entry.path);
  localFiles++;
 }else if(remote){remoteDeclarations++;}
 const d={language,kind:["grc","la"].includes(language)?"original":"translation",
   status:doc?"local-source-inspected":remote?"r2-registered-not-live-checked":"special-edition-not-inspected",
   title:doc?.title||entry.title||null,
   translator:doc?.translator||null,
   editor:doc?.editor||null,
   edition:doc?.edition||null,
   year:doc?.year||null,
   source:doc?.source||null,
   sources:doc?.sources||null,
   attribution:doc?.attribution||doc?.editorialAttribution||entry.sourceDescription||null,
   license:doc?.license||null,
   editorialStatus:doc?.editorialStatus||null,
   alignmentStatus:doc?.alignmentStatus||null,
   sourcePath:entry.path||null,
   sourceDescription:entry.sourceDescription||null,
   passages:doc?.passages?.length||null};
 (d.kind==="original"?w.originals:w.translations).push(d);editions++;
}
for(const w of works.values()){
 w.missingTranslation=!w.translations.some(e=>["en","fr","es"].includes(e.language));
 w.originals.sort((a,b)=>a.language.localeCompare(b.language));
 w.translations.sort((a,b)=>(["en","fr","es"].indexOf(a.language)+10)%10-(["en","fr","es"].indexOf(b.language)+10)%10);
 if(!w.originals.length)w.originalStatus="not-registered";
}
const result={schema:"vdl-edition-provenance-v1",method:"Registry plus inspected local JSON edition metadata; R2 URLs are declarations only, not live checks. No invented attribution or automatic translation claims.",
 counts:{cataloguedWorks:works.size,editions,localFilesInspected:localFiles,remoteEditionsDeclared:remoteDeclarations,worksWithoutHostedEnFrEs:[...works.values()].filter(w=>w.missingTranslation).length},
 works:[...works.values()]};
fs.writeFileSync(out,JSON.stringify(result,null,2)+"\n");
console.log("Provenance records:",result.counts);
