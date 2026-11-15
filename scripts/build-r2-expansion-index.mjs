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
const report=JSON.parse(readFileSync(join(folder,"prepared.json"),"utf8"));
const rows=report.published.length?report.published:report.prepared;
function build(rows,out){
const works=[],index=new Map(),stemCache=new Map();let totalTokens=0,totalPassages=0;
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
   if(!index.has(k))index.set(k,new Map());
   const map=index.get(k);if(!map.has(i))map.set(i,[0,[]]);
   const entry=map.get(i);entry[0]++;
   if(entry[1].length<12&&entry[1].at(-1)!==pi)entry[1].push(pi);
  }
 });
 totalTokens+=tokens;totalPassages+=raw.passages.length;
 works.push({i,id:row.workId,lang:row.language,title:row.author+" · "+row.title,file:row.url,passages:raw.passages.length,tokens,
  urn:raw.sourceUrn,sha256:row.sha256,source:raw.source,attribution:raw.attribution,license:raw.license,
  editorialStatus:raw.editorialStatus,reader:"classics-text-reader.html?work="+row.workId+"&lang="+row.language});
}
mkdirSync(out,{recursive:true});
const languages=[];
for(const lang of [...new Set(works.map(w=>w.lang))]){
 const buckets=new Map();
 for(const [k,byWork] of index){
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
  mkdirSync(join(out,lang),{recursive:true});writeFileSync(join(out,lang,file),raw);
  shards.push({k:prefix,f:file,n:Object.keys(payload).length});bytes+=Buffer.byteLength(raw);
 }
 for(const [key,payload] of buckets)emit(key,payload);
 writeFileSync(join(out,lang,"shards.json"),JSON.stringify({language:lang,shards}));
 languages.push({language:lang,shards:shards.length,bytes});
}
const manifest={schema:"vitruvia-classics-lexical-index-v1",generated:new Date().toISOString(),
 method:"Índice de candidatos por raíces gráficas sobre ediciones TEI verificadas en R2; sin lematización ni colación independiente. La concordancia se comprueba contra el texto de la edición.",
 limits:"Doce pasajes candidatos por raíz y edición; los recuentos abarcan todos los pasajes. Los bloques documentales no son loci canónicos.",
 works:works.length,passages:totalPassages,tokens:totalTokens,languages,index:works};
writeFileSync(join(out,"manifest.json"),JSON.stringify(manifest));
return {works:works.length,passages:totalPassages,tokens:totalTokens,languages,sha256:createHash("sha256").update(JSON.stringify(manifest)).digest("hex")};
}
const out=join(folder,"index"),segments=[];mkdirSync(out,{recursive:true});
for(let offset=0;offset<rows.length;offset+=120){
 const part="segment-"+String(segments.length+1).padStart(4,"0");
 const summary=build(rows.slice(offset,offset+120),join(out,part));
 segments.push({file:part+"/manifest.json",...summary});
 console.log(JSON.stringify({segment:part,...summary}));
}
const root={schema:"vdl-classics-index-segments-v1",generated:new Date().toISOString(),works:segments.reduce((n,s)=>n+s.works,0),passages:segments.reduce((n,s)=>n+s.passages,0),tokens:segments.reduce((n,s)=>n+s.tokens,0),segments};
writeFileSync(join(out,"manifest.json"),JSON.stringify(root));
console.log(JSON.stringify({works:root.works,passages:root.passages,segments:segments.length}));
