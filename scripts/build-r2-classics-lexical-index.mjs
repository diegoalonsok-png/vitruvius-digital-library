#!/usr/bin/env node
/**
 * Rebuild the lexical candidate index for every R2 original declared in the
 * GitHub corpus manifest. No manuscript, PDF, original or existing index is edited.
 * Every response is checked against the manifest's SHA256 and passage count.
 *
 * node scripts/build-r2-classics-lexical-index.mjs
 */
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import assert from "node:assert/strict";

const manifest=JSON.parse(readFileSync("data/r2/corpus-manifest.json","utf8"));
assert.equal(manifest.schema,"vdl-corpus-r2-1");
assert.equal(manifest.base,"https://libros.vitruvius-digital-library.org/corpus/");
assert.ok(Array.isArray(manifest.obras)&&manifest.obras.length>0);
const seen=new Set();
const source=mkdtempSync(join(tmpdir(),"vitruvius-r2-lexical-"));
const output="data/index/classics-r2";
let fetched=0;
try{
 // Bounded batches reduce load on the public R2 endpoint.
 for(let offset=0;offset<manifest.obras.length;offset+=4){
  await Promise.all(manifest.obras.slice(offset,offset+4).map(async original=>{
   assert.match(original.archivo,/^[a-z0-9-]+\.json$/);
   assert.match(original.sha256,/^[0-9a-f]{64}$/);
   assert.ok(Number.isInteger(original.pasajes)&&original.pasajes>0);
   if(seen.has(original.archivo))throw Error("Duplicated R2 object: "+original.archivo);
   seen.add(original.archivo);
   const url=manifest.base+original.archivo;
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),45000);
   let response;
   try{response=await fetch(url,{signal:controller.signal,headers:{Accept:"application/json"},cache:"no-store"})}
   finally{clearTimeout(timeout)}
   if(!response.ok)throw Error("R2 HTTP "+response.status+": "+url);
   const bytes=Buffer.from(await response.arrayBuffer());
   const hash=createHash("sha256").update(bytes).digest("hex");
   if(hash!==original.sha256)throw Error("R2 SHA256 conflict: "+original.archivo);
   const doc=JSON.parse(bytes.toString("utf8"));
   if(doc.workId!==original.workId||doc.language!==original.language||
      !Array.isArray(doc.passages)||doc.passages.length!==original.pasajes||
      !doc.passages.every(p=>typeof p.text==="string"&&typeof p.locus!=="undefined"))
    throw Error("R2 identity, locus or passage discrepancy: "+original.archivo);
   writeFileSync(join(source,original.archivo),bytes);
   fetched++;
  }));
  console.log("R2 originals verified: "+fetched+"/"+manifest.obras.length);
 }
 const generated=spawnSync(process.execPath,["scripts/build-classics-lexical-index.mjs",
   "--source-dir",source,"--out-dir",output,"--no-structured"],{encoding:"utf8",maxBuffer:1024*1024*5});
 if(generated.status!==0)throw Error("Lexical builder failed: "+(generated.stderr||generated.stdout).slice(-3500));
 const path=join(output,"manifest.json");
 assert.ok(existsSync(path),"Missing lexical output");
 const index=JSON.parse(readFileSync(path,"utf8"));
 assert.equal(index.works,manifest.obras.length);
 const docs=new Map(manifest.obras.map(o=>[o.archivo,o]));
 for(const item of index.index){
  const filename=item.file.split("/").at(-1),original=docs.get(filename);
  if(!original||item.id!==original.workId||item.lang!==original.language||
     item.passages!==original.pasajes)throw Error("Invalid indexed document: "+filename);
  // The original remains in R2. Never publish temporary workspace paths.
  item.file=manifest.base+filename;
  item.sha256=original.sha256;
  item.urn=(original.fuentes||[])[0]||item.urn||"";
  item.attribution=item.attribution||"Original registrado en R2; lectura por loci requiere cotejo editorial";
 }
 index.method+=" Reprocesamiento completo de originales R2 verificados mediante SHA256 del manifiesto. Los resultados son candidatos léxicos y requieren comprobar la forma y el locus contra el texto original.";
 index.r2ManifestPath="data/r2/corpus-manifest.json";
 index.r2VerifiedEditions=fetched;
 writeFileSync(path,JSON.stringify(index));
 console.log("PASS: "+fetched+" R2 original editions and "+index.passages+" passages indexed; output "+output);
}finally{rmSync(source,{recursive:true,force:true})}
