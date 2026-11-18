#!/usr/bin/env node
/* Bibliotheca: cotejo estructural de Geografía de Estrabón EN/GR, sin fingir
   traducción de los fragmentos especiales del libro VII ni colación crítica. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../",import.meta.url);
const load=p=>JSON.parse(readFileSync(new URL(p,root),"utf8"));
const original=load("data/classics-corpus/strabo-grc.json");
const english=load("data/classics-corpus/strabo-en.json");
const registry=load("data/classics-corpus/search-registry.json");
const catalogue=load("data/bibliotheca-graeca-latina-I-bce-I-ce.json");
assert.equal(original.workId,"strabo");
assert.equal(english.workId,"strabo");
assert.equal(original.language,"grc");
assert.equal(english.language,"en");
assert.equal(original.passages.length,1709);
assert.equal(english.passages.length,1516);
assert.equal(english.sourceGitBlobSha,"4a63869b038742ee8eb19ee4838166fa37affa7a");
assert.match(english.license,/CC BY-SA 4\.0/);
assert(english.passages.every(p=>p.text?.trim()&&p.locus.startsWith("urn:cts:greekLit:tlg0099.tlg001.perseus-eng4:")),"Edición inglesa o texto faltante");
const ref=p=>String(p.locus||"").split(":").at(-1);
const g=new Set(original.passages.map(ref)),e=new Set(english.passages.map(ref));
assert.equal(g.size,1580);
assert.equal(e.size,1516);
assert([...e].every(x=>g.has(x)),"No deben incorporarse referencias inventadas");
const missing=[...g].filter(x=>!e.has(x));
assert.equal(missing.length,64,"64 secciones especiales griegas sin contraparte histórica");
assert(missing.every(x=>x.startsWith("7.fragments.")),"No ocultar ausencia en otros libros");
const entry=registry.entries.filter(x=>x.workId==="strabo"&&x.language==="en");
assert.equal(entry.length,1);
assert.equal(entry[0].path,"data/classics-corpus/strabo-en.json");
assert.equal(catalogue.works.find(x=>x.id==="strabo")?.corpusFiles?.en,entry[0].path);
const script=readFileSync(new URL("assets/classics-inline-parallel.js",root),"utf8");
const match=script.match(/function sectionCtsKey\(value\)\{[\s\S]*?const m=\/(.*?)\/i\.exec/);
assert(match,"El visor debe comparar la referencia CTS de ambas ediciones");
const re=new RegExp(match[1],"i");
const key=s=>{const m=re.exec(s);return m?m[1]+"|"+m[2]+"|"+m[3]:null};
for(const p of [english.passages[0],english.passages[714],english.passages.at(-1)]){
 const gr=original.passages.find(x=>ref(x)===ref(p));
 assert(gr);
 assert.equal(key(p.locus),key(gr.locus),"Desfase de sección: "+p.locus);
}
assert.equal(key("urn:cts:greekLit:tlg0099.tlg001.perseus-grc2:7.fragments.1"),null);
console.log("PASS Estrabón: 1516 loci numéricos EN/GR alineables; 64 referencias fragmentarias no traducidas marcadas; 1709 tarjetas griegas sin cambios.");
