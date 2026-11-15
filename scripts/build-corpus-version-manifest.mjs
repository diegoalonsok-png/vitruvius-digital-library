#!/usr/bin/env node
/**
 * Produce a reproducible edition registry without claiming manuscript collation.
 * node scripts/build-corpus-version-manifest.mjs [--write]
 * Read-only unless --write is passed. Git HEAD is recorded when available;
 * each existing local file is SHA-256 hashed. Remote files are DECLARED, not verified.
 */
import {readFileSync,writeFileSync,existsSync,mkdirSync} from "node:fs";
import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
const reg=JSON.parse(readFileSync("data/classics-corpus/search-registry.json","utf8"));
if(!Array.isArray(reg.entries))throw Error("Expected search registry entries");
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
const commit=()=>{try{return execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim()}catch{return process.env.GITHUB_SHA||null}};
let absent=0,local=0,remote=0;
const entries=reg.entries.map((e,i)=>{
 const path=String(e.path||"");
 const isRemote=/^https:\/\//.test(path);
 const validLocal=/^data\/[a-z0-9_./-]+\.(?:json|txt|xml|html)$/i.test(path)&&!path.includes("..");
 const present=!isRemote&&validLocal&&existsSync(path);
 if(isRemote)remote++;else if(present)local++;else absent++;
 const bytes=present?readFileSync(path):null;
 return {workId:e.workId,language:e.language,format:e.format,path,
  sourceDescription:e.sourceDescription||null,sha256:bytes?sha256(bytes):null,
  bytes:bytes?bytes.length:null,
  status:present?"hashed_local_file":isRemote?"remote_declared_not_verified":"missing_or_unsupported_local_path"};
});
const snapshot={
 schema:"vdl-corpus-version-manifest-v1",
 generated:new Date().toISOString(),
 gitCommit:commit(),
 registryPath:"data/classics-corpus/search-registry.json",
 registrySha256:sha256(readFileSync("data/classics-corpus/search-registry.json")),
 counts:{registered:entries.length,hashedLocal:local,remoteDeclared:remote,missingOrUnsupported:absent},
 caveat:"SHA-256 fixes exact bytes, not ecdotic reliability, source collation, DOI deposit, or downstream deployment. R2 requires independent live verification.",
 entries
};
if(process.argv.includes("--write")){
 mkdirSync("data/classics-corpus/versions",{recursive:true});
 const name="data/classics-corpus/versions/corpus-"+new Date().toISOString().slice(0,10)+".json";
 if(existsSync(name))throw Error("Snapshot already exists: "+name+"; preserve immutable history");
 writeFileSync(name,JSON.stringify(snapshot,null,2)+"\n");
 console.log("Created "+name);
}else console.log(JSON.stringify({counts:snapshot.counts,gitCommit:snapshot.gitCommit,registrySha256:snapshot.registrySha256,mode:"read-only; pass --write to create immutable daily snapshot"},null,2));
if(absent>0)process.exitCode=1;
