/* Scholarly Greek originals: indexed JSON in a dedicated Git branch, outside
 * GitHub Pages and without any PDF, DOCX or facsimile duplication.
 * Fail closed for provenance, open for local Bibliotheca search reliability.
 */
(()=>{
"use strict";
if(window.ClassicsOffsiteGreek)return;
const BRANCH="corpus-originales-griegos-20261108";
const ROOT="https://raw.githubusercontent.com/diegoalonsok-png/vitruvius-digital-library/"+BRANCH+"/data/offsite-originals/";
const ALLOWED=new Set(["thucydides-war","cassius-dio-historia","athenaeus-deipnosophistae",
 "theophrastus-historia-plantarum","archimedes-fluitantibus","ps-aristotle-mechanica",
 "euclid-optica","euclid-phaenomena","cleonides-harmonica","hero-belopoeica","geminus-isagoge",
 "aristarchus-magnitudines","apollonius-conica","pappus-synagoge",
 "biton-kataskeuai","apollodorus-poliorcetics","procopius-aedificiis"]);
const BITS=262144;
let manifestTask=null;
const cache=new Map();
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ");
function fnv(word,seed){
 let h=seed>>>0;
 for(const c of word)h=Math.imul(h^c.codePointAt(0),16777619)>>>0;
 return h>>>0;
}
function mightContain(e,queries){
 if(e.format!=="remote-json-passages")return true;
 const b=e.bloom;
 if(!b||b.bits!==BITS||b.hash!=="fnv1a-codepoint-double-v1"||typeof b.data!=="string"||typeof atob!=="function")return true;
 let bitset;
 try{bitset=Uint8Array.from(atob(b.data),c=>c.charCodeAt(0))}
 catch{return true}
 if(bitset.length!==BITS/8)return true;
 const mayHave=word=>{
  const a=fnv(word,2166136261),b=(fnv(word,(2166136261^0x9E3779B9)>>>0)|1)>>>0;
  for(let i=0;i<4;i++){
   const pos=(a+i*b+i*i)%BITS;
   if(!(bitset[pos>>>3]&(1<<(pos&7))))return false;
  }
  return true;
 };
 const words=queries.map(q=>fold(q).match(/[\u0370-\u03ff\u1f00-\u1fff]+/gu)||[]);
 return words.some(tokens=>tokens.length===0||tokens.every(mayHave));
}
const NORMALIZED_SOURCES={
 "biton-kataskeuai":"biton-war-machines-catapults-lsg-aa.grc.md",
 "apollodorus-poliorcetics":"apollodorus-damascus-siegecraft-owo-aa.grc.md",
 "procopius-aedificiis":"procopius-caesarea-buildings-unc-ac.grc.md"
};
function approvedOrigin(x){
 const base="https://raw.githubusercontent.com/eulogikon/ancient-greek-texts/main/grc/";
 const name=NORMALIZED_SOURCES[x.workId];
 if(name){
  return x.source===base+name&&x.sourceType==="normalized-greek-reading"&&
   typeof x.editorialStatus==="string"&&x.editorialStatus.includes("NO edición crítica");
 }
 return /^https:\/\/raw\.githubusercontent\.com\/(?:OpenGreekAndLatin\/First1KGreek|PerseusDL\/canonical-greekLit)\/master\//.test(x.source)&&
   (!x.sourceType||x.sourceType==="edited-greek-tei");
}
function valid(x,seen){
 if(!x||!ALLOWED.has(x.workId)||seen.has(x.workId)||x.language!=="grc"||
  x.path!=="data/offsite-originals/"+x.workId+"-grc.json"||
  typeof x.sourceSha256!=="string"||!/^[0-9a-f]{64}$/.test(x.sourceSha256)||
  !Number.isInteger(x.passages)||x.passages<2||
  typeof x.author!=="string"||!x.author.trim()||typeof x.title!=="string"||!x.title.trim()||
  typeof x.source!=="string"||
  !approvedOrigin(x))return false;
 seen.add(x.workId);return true;
}
function entries(){
 if(!manifestTask)manifestTask=fetch(ROOT+"manifest.json")
  .then(r=>{if(!r.ok)throw Error("Remote original Greek corpus unavailable: HTTP "+r.status);return r.json()})
  .then(j=>{
   if(j?.schema!=="vitruvius-offsite-greek-originals-manifest-v1"||j.branch!==BRANCH||
      !Array.isArray(j.entries)||j.entries.length!==j.count||j.count>ALLOWED.size)
     throw Error("Inconsistent remote Greek corpus manifest");
   const seen=new Set(),rows=[];
   for(const x of j.entries){
    if(!valid(x,seen))throw Error("Unverified remote TEI provenance");
    rows.push({
     workId:x.workId,language:"grc",format:"remote-json-passages",author:x.author,title:x.title,
     path:ROOT+x.workId+"-grc.json",reader:"classics-remote-text-reader.html?work="+x.workId,
     sourceDescription:x.attribution||"Texto griego con fuente digital identificada",
     sourceType:x.sourceType||"edited-greek-tei",
     editorialStatus:x.editorialStatus||(x.sourceType==="normalized-greek-reading"?"Lectura normalizada: sin cotejo de manuscritos":"Edición TEI identificada"),
     readingFacsimile:x.readingFacsimile||"",
     source:x.source,sourceSha256:x.sourceSha256,sourceUrn:x.editionUrn||"",
     bloom:x.bloom||null
    });
   }
   return rows;
  })
  .catch(error=>{console.warn("Corpus griego remoto sin verificar:",error.message);return []});
 return manifestTask;
}
function load(e){
 if(!e||e.format!=="remote-json-passages"||!ALLOWED.has(e.workId)||e.path!==ROOT+e.workId+"-grc.json")return Promise.resolve(null);
 if(!cache.has(e.path))cache.set(e.path,fetch(e.path)
  .then(r=>{if(!r.ok)throw Error("Remote original unavailable");return r.json()})
  .then(j=>j?.schema==="vitruvius-offsite-greek-original-v1"&&
      j.workId===e.workId&&j.language==="grc"&&j.sourceSha256===e.sourceSha256&&
      (e.sourceType!=="normalized-greek-reading"||
        j.sourceType==="normalized-greek-reading"&&j.editorialStatus?.includes("NO edición crítica"))&&
      Array.isArray(j.passages)&&j.passages.length>=2&&j.passages.every(p=>
       typeof p.text==="string"&&typeof p.locus==="string")?j:null)
  .catch(()=>null));
 // Cache by source path, but authorize each request against its own SHA.
 return cache.get(e.path).then(j=>j&&j.sourceSha256===e.sourceSha256?j:null);
}
window.ClassicsOffsiteGreek={entries,load,mightContain,root:ROOT,allowedWorkIds:[...ALLOWED]};
})();
