#!/usr/bin/env node
/* Solo Aristóteles, Retórica: correspondencia de sección verificable por CTS.
   No deduce equivalencia de palabras, paginación ni cotejo crítico. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../",import.meta.url);
const read=path=>JSON.parse(readFileSync(new URL(path,root),"utf8"));
const grc=read("data/classics-corpus/aristotle-rhetoric-grc.json");
const en=read("data/classics-corpus/aristotle-rhetoric-en.json");
const reg=read("data/classics-corpus/search-registry.json");
assert.equal(grc.workId,"aristotle-rhetoric");
assert.equal(en.workId,"aristotle-rhetoric");
assert.equal(grc.language,"grc");
assert.equal(en.language,"en");
assert.equal(grc.passages.length,883);
assert.equal(en.passages.length,882);
assert.equal(en.translator,"John Henry Freese");
assert.equal(en.sourceGitBlobSha,"15123c53a644a916509c9cdaee4fdfc81208b1ee");
assert.match(en.license,/CC BY-SA 4\.0/);
assert.equal(en.alignmentStatus,"section-identifiers-verified-not-word-aligned");
assert.equal(en.passages.reduce((n,p)=>n+(p.editorialNotes?.length||0),0),639);
const key=p=>String(p.locus||"").split(":").at(-1);
const greekKeys=new Set(grc.passages.map(key)),englishKeys=new Set(en.passages.map(key));
assert.equal(greekKeys.size,882,"Griego: 883 tarjetas, 882 referencias distintas");
assert.equal(englishKeys.size,882,"Traducción: ninguna referencia duplicada");
assert.deepEqual([...greekKeys].sort(),[...englishKeys].sort(),"El original y la traducción deben compartir TODAS las 882 secciones");
assert(en.passages.every(p=>p.text.length>=40&&!/<[^>]+>/.test(p.text)),"Texto inglés vacío o con etiquetas TEI");
const entries=reg.entries.filter(e=>e.workId==="aristotle-rhetoric");
assert.equal(entries.filter(e=>e.language==="grc").length,1);
assert.equal(entries.filter(e=>e.language==="en").length,1);
assert.equal(entries.find(e=>e.language==="en")?.path,"data/classics-corpus/aristotle-rhetoric-en.json");
assert.equal(reg.count,reg.entries.length);
const source=readFileSync(new URL("assets/classics-inline-parallel.js",root),"utf8");
const match=source.match(/function sectionCtsKey\(value\)\{[\s\S]*?const m=\/(.*?)\/i\.exec/);
assert(match,"El visor académico perdió el comparador CTS");
const re=new RegExp(match[1],"i");
const cts=s=>{const m=re.exec(s);return m?m[1].toLowerCase()+"|"+m[2].toLowerCase()+"|"+m[3]:null};
for(const ref of ["1.1.1","1.1.2","2.1.1","3.19.6"]){
 const g=grc.passages.find(p=>key(p)===ref),e=en.passages.find(p=>key(p)===ref);
 if(!g||!e)continue;
 assert.equal(cts(g.locus),cts(e.locus),"CTS no sincronizado: "+ref);
 assert.notEqual(cts(g.locus),cts(g.locus.replace("tlg038","tlg039")),"No mezclar obras");
}
assert(source.includes("versionLink(e,matched?matched.locus:null)"),"El enlace de traducción debe usar su locus real");
console.log("PASS Retórica: 883 tarjetas griegas preservadas, 882 secciones griego/inglés, 639 notas, fuente y registro comprobados; selector CTS por obra/sección.");
