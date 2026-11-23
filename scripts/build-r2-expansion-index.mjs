#!/usr/bin/env node
// Same candidate-index contract and stemming as the three existing search engines.
// No text in postings, no invented lemmas. All source passages remain in R2.
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {createRequire} from "node:module";
import {join} from "node:path";
import {createHash} from "node:crypto";
const require=createRequire(import.meta.url),P=require("../assets/vitruvia-philology.js");
const folder=process.argv[2];
if(!folder)throw Error("Expected prepared expansion folder");
// Conceptus is an editorial vocabulary of candidate semantic equivalents.
// It is NOT an automatically verified translation or contextual sense tag.
const conceptSource="data/lexicon/conceptus.json";
const conceptRaw=readFileSync(conceptSource,"utf8");
const conceptus=JSON.parse(conceptRaw);
if(conceptus.schema!=="vitruvia-lexicon-conceptus-v1"||!Array.isArray(conceptus.concepts))throw Error("Conceptus schema changed");
const conceptSha256=createHash("sha256").update(conceptRaw).digest("hex");
const report=JSON.parse(readFileSync(join(folder,"prepared.json"),"utf8"));
// Incremental publication reuses immutable, SHA-verified older index segments.
// New editions get their own segments; old R2 shards are not downloaded/re-uploaded.
const incremental=process.argv.includes("--incremental");
const allRows=report.published.length?report.published:report.prepared;
const previousEditions=JSON.parse(readFileSync("data/r2/classics-expansion-manifest.json","utf8")).editions||[];
const oldUrls=new Set(previousEditions.map(row=>row.url));
const rows=incremental?report.prepared.filter(row=>!oldUrls.has(row.url)):allRows;
let oldSegments=[];
if(incremental&&previousEditions.length){
 const descriptor=JSON.parse(readFileSync("data/r2/classics-expansion-index.json","utf8"));
 if(!/^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/indice\/ampliacion\/[a-f0-9]{24}\/manifest\.json$/.test(descriptor.url||""))
  throw Error("Previous index descriptor URL not admissible");
 const response=await fetch(descriptor.url,{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error("Previous immutable R2 index unavailable: HTTP "+response.status);
 const raw=Buffer.from(await response.arrayBuffer());
 if(createHash("sha256").update(raw).digest("hex")!==descriptor.sha256)
  throw Error("Previous index SHA256 does not match descriptor");
 const manifest=JSON.parse(raw.toString("utf8"));
 if(manifest.schema!=="vdl-classics-index-segments-v1"||!Array.isArray(manifest.segments)||
    manifest.works!==descriptor.works||manifest.works!==previousEditions.length)
  throw Error("Previous index/edition count mismatch");
 const base=descriptor.url.replace(/manifest\\.json$/,"");
 oldSegments=manifest.segments.map(segment=>{
  const path=segment.file;
  const absolute=/^https:\/\/libros\.vitruvius-digital-library\.org\/corpus\/indice\/ampliacion\/[a-f0-9]{24}\/segment-\d{4}\/manifest\.json$/.test(path);
  if(!absolute&&!/^segment-\d{4}\/manifest\.json$/.test(path))
   throw Error("Invalid previous index segment URL");
  return {...segment,file:absolute?path:base+path};
 });
 if(oldSegments.reduce((sum,x)=>sum+x.works,0)!==manifest.works)
  throw Error("Prior segment coverage mismatch");
}
if(incremental&&!rows.length)throw Error("No new editions: skip the index publication step");
function build(rows,out){
const works=[],index=new Map(),forms=new Map(),stemCache=new Map();let totalTokens=0,totalPassages=0;
function post(map,key,workIndex,passageIndex){
 if(!map.has(key))map.set(key,new Map());
 const byWork=map.get(key);if(!byWork.has(workIndex))byWork.set(workIndex,[0,[]]);
 const entry=byWork.get(workIndex);entry[0]++;
 if(entry[1].length<12&&entry[1].at(-1)!==passageIndex)entry[1].push(passageIndex);
}
for(const row of rows){
 const raw=JSON.parse(readFileSync(join(folder,"corpus",row.filename),"utf8"));
 if(raw.workId!==row.workId||raw.language!==row.language||raw.passages.length!==row.passages)throw Error("Corpus identity mismatch");
 const i=works.length,script=row.language==="grc"?"greek":"latin";let tokens=0;
 raw.passages.forEach((passage,pi)=>{
  const words=P.fold(passage.text).split(" ").filter(Boolean);tokens+=words.length;
  for(const word of words){
   if(word.length<2)continue;
   const key=script+":"+word;
   if(!stemCache.has(key))stemCache.set(key,P.stem(word,script));
   const stem=stemCache.get(key);if(!stem||stem.length<2)continue;
   const k=row.language+"|"+stem;
   post(index,k,i,pi);
   // A separate orthographic-form index allows ranking precise forms over
   // aggressive stem candidates, without changing legacy stem postings.
   const exact=row.language==="la"?P.foldLatin(word):word;
   if(exact.length>=2)post(forms,row.language+"|"+exact,i,pi);
  }
 });
 totalTokens+=tokens;totalPassages+=raw.passages.length;
 works.push({i,id:row.workId,lang:row.language,title:row.author+" · "+row.title,file:row.url,passages:raw.passages.length,tokens,
  urn:raw.sourceUrn,sha256:row.sha256,source:raw.source,attribution:raw.attribution,license:raw.license,
  editorialStatus:raw.editorialStatus,reader:"classics-text-reader.html?work="+row.workId+"&lang="+row.language});
}
mkdirSync(out,{recursive:true});
const languages=[];
function shardSet(dictionary,lang,directory){
 const buckets=new Map();
 for(const [k,byWork] of dictionary){
  if(!k.startsWith(lang+"|"))continue;
  const stem=k.slice(lang.length+1),prefix=[...stem].slice(0,2).join("");
  if(!buckets.has(prefix))buckets.set(prefix,{});
  buckets.get(prefix)[stem]=[...byWork].sort((a,b)=>b[1][0]-a[1][0]).map(([i,[n,ps]])=>i+":"+n+":"+ps.join(",")).join("|");
 }
 const shards=[];let bytes=0;
 function emit(prefix,payload){
  const text=JSON.stringify(payload);
  if(Buffer.byteLength(text)>180000&&[...prefix].length<7&&Object.keys(payload).length>1){
   const split=new Map();
   for(const [stem,value] of Object.entries(payload)){
    const next=[...stem].slice(0,[...prefix].length+1).join("");
    if(!split.has(next))split.set(next,{});split.get(next)[stem]=value;
   }
   for(const [key,value] of split)if(key===prefix)write(key,value);else emit(key,value);
  }else write(prefix,payload);
 }
 function write(prefix,payload){
  const file="s-"+[...prefix].map(c=>c.codePointAt(0).toString(16)).join("-")+".json",raw=JSON.stringify(payload);
  mkdirSync(directory,{recursive:true});writeFileSync(join(directory,file),raw);
  shards.push({k:prefix,f:file,n:Object.keys(payload).length});bytes+=Buffer.byteLength(raw);
 }
 for(const [key,payload] of buckets)emit(key,payload);
 mkdirSync(directory,{recursive:true});
 writeFileSync(join(directory,"shards.json"),JSON.stringify({language:lang,shards}));
 return {shards:shards.length,bytes};
}
for(const lang of [...new Set(works.map(w=>w.lang))]){
 const stem=shardSet(index,lang,join(out,lang));
 const exact=shardSet(forms,lang,join(out,lang,"forms"));
 languages.push({language:lang,shards:stem.shards,bytes:stem.bytes,formShards:exact.shards,formBytes:exact.bytes});
}
// Additive conceptual candidate layer. The exact form is authoritative for
// matching a token; stemming is offered only when the cited form is absent.
// Conceptus cross-language labels are candidate senses, not translations.
const semantic=[];
for(const concept of conceptus.concepts){
 if(!concept||typeof concept.id!=="string")continue;
 const hits=[];
 for(const lang of ["la","grc"]){
  const words=Array.isArray(concept[lang])?concept[lang]:[];
  for(const term of words){
   if(typeof term!=="string")continue;
   const normalized=lang==="la"?P.foldLatin(term):P.fold(term);
   if(!normalized||normalized.includes(" "))continue;
   const observed=forms.get(lang+"|"+normalized);
   const stem=P.stem(term,lang==="grc"?"greek":"latin");
   const candidates=observed||index.get(lang+"|"+stem);
   if(!candidates)continue;
   for(const [work,details] of candidates){
    hits.push({work,language:lang,term,normalized,match:observed?"orthographic_form":"stem_candidate",count:details[0],passages:details[1]});
   }
  }
 }
 if(hits.length)semantic.push({id:concept.id,modern:concept.modern||{},la:concept.la||[],grc:concept.grc||[],hits});
}
writeFileSync(join(out,"concepts.json"),JSON.stringify({
 schema:"vdl-classics-concept-candidates-v1",source:conceptSource,sourceSha256:conceptSha256,
 method:"Candidatos por vocabulario Conceptus: forma ortográfica atestiguada o raíz heurística. Los pasajes, la acepción contextual y la equivalencia en traducción requieren comprobación humana; no equivale a lematización ni traducción académica.",
 concepts:semantic
}));
const manifest={schema:"vitruvia-classics-lexical-index-v1",generated:new Date().toISOString(),
 method:"Índice acumulativo de raíces gráficas y formas ortográficas sobre ediciones TEI verificadas en R2; vínculos semánticos Conceptus como candidatos. No es lematización contextual ni colación independiente.",
 formsIndex:{directory:"{language}/forms/",normalization:"Greek accents folded; Latin i/j and u/v folded",rank:"Prefer exact orthographic form before heuristic stem"},
 conceptCandidateLayer:{file:"concepts.json",source:conceptSource,sourceSha256:conceptSha256,concepts:semantic.length,status:"candidate_only_not_contextually_disambiguated"},
 limits:"Doce pasajes candidatos por raíz y edición; los recuentos abarcan todos los pasajes. Los bloques documentales no son loci canónicos.",
 works:works.length,passages:totalPassages,tokens:totalTokens,languages,index:works};
writeFileSync(join(out,"manifest.json"),JSON.stringify(manifest));
return {works:works.length,passages:totalPassages,tokens:totalTokens,languages,sha256:createHash("sha256").update(JSON.stringify(manifest)).digest("hex")};
}
const out=join(folder,"index"),segments=[...oldSegments];mkdirSync(out,{recursive:true});
for(let offset=0;offset<rows.length;offset+=120){
 const part="segment-"+String(offset/120+1).padStart(4,"0");
 const summary=build(rows.slice(offset,offset+120),join(out,part));
 segments.push({file:part+"/manifest.json",...summary});
 console.log(JSON.stringify({segment:part,...summary}));
}
const root={schema:"vdl-classics-index-segments-v1",generated:new Date().toISOString(),works:segments.reduce((n,s)=>n+s.works,0),passages:segments.reduce((n,s)=>n+s.passages,0),tokens:segments.reduce((n,s)=>n+s.tokens,0),segments};
if(incremental&&(root.works!==allRows.length||
  root.passages!==allRows.reduce((sum,row)=>sum+row.passages,0)))
 throw Error("Incremental index must contain every registered edition/passsage");
writeFileSync(join(out,"manifest.json"),JSON.stringify(root));
console.log(JSON.stringify({works:root.works,passages:root.passages,segments:segments.length}));
