/* Gate editorial reproducible: no atribuir a los libros defectos del índice.
 * SHA de los tres corpora; control de texto inglés y procedencia DOCX; erratas.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import vm from "node:vm";
const read=p=>fs.readFileSync(p,"utf8");
const json=p=>JSON.parse(read(p));
const sources=["recensio-es","recensio-fr","theory-en"].map(id=>json("data/structured/"+id+".json"));
const [es,fr,en]=sources,integrity=json("data/academic-integrity.json"),errata=json("data/errata-editionum.json");
const canonical=new Set(integrity.canonicalReferences);
assert.equal(canonical.size,731,"El canon debe contener 731 loci sin duplicaciones");
assert.equal(es.passages.length,731);
assert.equal(fr.passages.length,731);
assert.equal(en.passages.length,728,"V297 conserva dos bloques impresos agrupados");
for(const source of sources)for(const p of source.passages){
 assert.ok(canonical.has(p.locus),"Locus no canónico "+p.locus);
 assert.ok(p.latin?.trim(),"Falta latín en "+p.locus);
 assert.ok(p.translation?.trim(),"Falta traducción en "+p.locus);
}
for(const id of ["recensio-es","recensio-fr"]){
 const S=id==="recensio-es"?es:fr;
 assert.equal(new Set(S.passages.map(p=>p.locus)).size,731);
}
const fingerprint=createHash("sha256").update(JSON.stringify(sources),"utf8").digest("hex");
assert.equal(integrity.sourceFingerprint,fingerprint,"La huella de las tres ediciones debe actualizarse junto con el índice");
const at=l=>en.passages.find(p=>p.locus===l);
for(const [loc,first,requiredLatin,docxIds] of [
 ["2.9.12","Hornbeam","vocitantur",[3051,3052,3053]],
 ["3.1.3","Similarly","umbilicus",[3112,3113,3114]],
 ["9.2.1","Berosus","Pilam esse",[4463,4464,4465,4466]],
 ["10.1.1","A machine","Machina est",[4627,4629]]
]){
 const p=at(loc);
 assert.ok(p?.translation?.startsWith(first),loc+": texto latino o aparato crítico contaminaba la interpretación");
 assert.ok(p.latin.includes(requiredLatin),loc+": texto latino truncado");
 assert.deepEqual(p.source_paragraphs,docxIds,loc+": procedencia de párrafos DOCX");
 assert.equal(p.index_revision?.kind,"documentary-index-repair",loc+": sin nota de reparación documental");
}
for(const loc of ["7.7.2","7.7.3","7.7.5"]){
 assert.equal(at(loc),undefined,"Los bloques fusionados no son nuevos pasajes de V297");
 assert.ok(canonical.has(loc),"Se debe conservar la localización canónica");
}
const j=read("assets/dossier-ecdotico.js");
assert.match(j,/groupedV297/);assert.match(j,/"7\.7\.5"/);new vm.Script(j);
const counts=errata.editions.map(ed=>({id:ed.id,count:ed.entries.length}));
assert.deepEqual(counts,[{id:"V514",count:1},{id:"V554",count:0},{id:"V297",count:3}]);
for(const ed of errata.editions)for(const item of ed.entries){
 assert.ok(item.evidence&&item.reading_printed&&item.reading_corrected&&item.date);
 assert.ok(item.severity&&item.status==="errata_publicada_sin_modificar_pdf");
}
assert.ok(errata.review_queue.some(x=>x.id==="V297-9.2.1-duplicacion"&&x.severity==="importante"));
assert.ok(errata.review_queue.some(x=>x.id==="V554-8.1.6-comprobacion"));
assert.match(read("errata-editionum.html"),/errata-review/);
new vm.Script(read("assets/errata-editionum.js"));
console.log("PASS · Índice V297 reparado desde DOCX, 4 loci; 3 bloques agrupados conservados; huella SHA-256 coherente");
console.log("PASS · 4 erratas con fuente, 2 casos pendientes de cotejo; ningún PDF modificado");
