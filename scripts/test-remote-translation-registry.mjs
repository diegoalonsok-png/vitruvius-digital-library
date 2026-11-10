import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const m=JSON.parse(read("data/classics-corpus/remote-translations.json"));
const cat=JSON.parse(read("data/bibliotheca-graeca-latina-I-bce-I-ce.json"));
const local=JSON.parse(read("data/classics-corpus/search-registry.json"));
const known=new Set(cat.works.map(w=>w.id));
assert.equal(m.schema,"vitruvius-classics-remote-translations-v1");
assert(m.entries.length>=3);
const keys=new Set();
for(const e of m.entries){
 assert(known.has(e.workId),"Unknown classical work "+e.workId);
 assert.equal(e.status,"external-only");
 assert(["en","fr"].includes(e.language),"Unsupported external translation language "+e.language);
 assert(e.translator&&e.edition&&e.host);
 const u=new URL(e.url);
 assert.equal(u.protocol,"https:");
 assert(["penelope.uchicago.edu","www.gutenberg.org","archive.org"].includes(u.hostname),"Unexpected external source "+u.hostname);
 assert(!u.username&&!u.password,"External source URL cannot contain credentials");
 const key=e.workId+"|"+e.language+"|"+e.edition;
 assert(!keys.has(key),"Duplicated external translation "+key);
 keys.add(key);
 assert(!("passages" in e)&&!("text" in e),"Remote registry must not store translation texts");
}
assert(!local.entries.some(e=>e.status==="external-only"),"External references cannot count as locally indexed sources");
const js=read("assets/bibliotheca-simple.js");
assert(js.includes("remote-translations.json")&&js.includes("drawRemote()"));
assert(js.includes("no se incluye en el recuento de concordancias"));
console.log("PASS:",m.entries.length,"external translation references available with no hosted text; local index unchanged.");
