#!/usr/bin/env node
/* Exercise the actual browser TEI exporter for all 3 editions x 10 books.
 * This mocks only browser I/O. It never alters source texts. */
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
const output=resolve("reports/tei-export-validation");
mkdirSync(output,{recursive:true});
const fields={
 "tei-edition":{value:"recensio-es"},"tei-book":{value:"1"},
 "tei-submit":{disabled:false,textContent:""},"tei-status":{textContent:""}
};
let submitHandler,downloadBlob;
const form={addEventListener:(event,callback)=>{
 if(event==="submit") submitHandler=callback;
}};
globalThis.document={
 getElementById:id=>id==="tei-form"?form:fields[id],
 createElement:()=>({click(){},remove(){},set href(v){},set download(v){}}),
 body:{append(){}}
};
globalThis.fetch=async path=>{
 const data=JSON.parse(readFileSync(resolve(path),"utf8"));
 return {ok:true,json:async()=>data};
};
globalThis.URL.createObjectURL=blob=>(downloadBlob=blob,"blob:test");
globalThis.URL.revokeObjectURL=()=>{};
globalThis.setTimeout=()=>{};
await import("../assets/tei-book-export.mjs");
if(typeof submitHandler!=="function") throw Error("TEI submit handler not registered");
const editions=["recensio-es","recensio-fr","theory-en"];
for(const edition of editions){
 for(let book=1;book<=10;book++){
  fields["tei-edition"].value=edition;
  fields["tei-book"].value=String(book);
  downloadBlob=null;
  await submitHandler({preventDefault(){}});
  if(!downloadBlob) throw Error("No XML generated for "+edition+" book "+book+": "+fields["tei-status"].textContent);
  writeFileSync(resolve(output,edition+"-liber-"+book+".xml"),await downloadBlob.text(),"utf8");
 }
}
console.log("Generated 30 actual browser-export XML documents in "+output);
