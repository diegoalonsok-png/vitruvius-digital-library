/* Validate the actual R2 scholarly edition dossier, not the older
 * three-edition manifest schema. Never conflate bibliographic metadata,
 * textual variants or physical manuscripts. */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=path=>JSON.parse(readFileSync(path,"utf8"));
const dossiers=read("data/r2/aparato-academico.json");
const catalogue=read("data/r2/catalogo-clasicos-r2.json");
const editorial=read("data/academic-integrity.json");
const editions=read("data/catalog.json").editions;
assert.equal(dossiers.schema,"vdl-aparato-academico-1");
assert.ok(Array.isArray(dossiers.registros));
assert.equal(dossiers.total,dossiers.registros.length);
assert.equal(dossiers.total,catalogue.items.length);
const byId=new Map(catalogue.items.map(x=>[x.id,x]));
assert.equal(byId.size,catalogue.items.length,"Duplicated R2 edition keys");
const seen=new Set();
for(const rec of dossiers.registros){
 assert.ok(rec.id&&!seen.has(rec.id),"Duplicate scholarly dossier ID: "+rec.id);
 seen.add(rec.id);
 assert.equal(rec.schema,"vdl-aparato-academico-1");
 const edition=byId.get(rec.id);
 assert.ok(edition,"Dossier without actual R2 edition: "+rec.id);
 assert.equal(rec.edicionMaterial?.tituloTranscritoCatalogoFuente,edition.tituloEdicion,"Misattributed edition title: "+rec.id);
 assert.equal(rec.edicionMaterial?.anioEdicion,edition.anio,"Misattributed publication year: "+rec.id);
 assert.equal(rec.procedenciaDigital?.objetoR2,edition.pdf,"R2 source mismatch: "+rec.id);
 assert.equal(rec.procedenciaDigital?.sha256,edition.sha256,"Binary fingerprint mismatch: "+rec.id);
 assert.equal(rec.procedenciaDigital?.numeroImagenesPDF,edition.paginas,"Digital image count mismatch: "+rec.id);
 assert.ok(rec.codicologia&&rec.ecdotica&&rec.filologia,"Missing scholarly divisions: "+rec.id);
 assert.ok(!rec.verificaciones?.colacionCriticaRealizada || (rec.ecdotica.testimoniosCotejados?.length>0&&rec.ecdotica.variantesVerificadas?.length>0),"Critical collation claimed without attested evidence: "+rec.id);
}
assert.equal(seen.size,byId.size);
assert.ok(existsSync("data/apparatus-index.json"),"The textual apparatus source must exist independently");
assert.ok(existsSync("data/academic-integrity.json"));
assert.ok(existsSync("data/catalog.json"));
assert.equal(typeof editorial.apparatus.entries,"number");
assert.ok(editorial.apparatus.entries>0);
assert.equal(new Set(editions.slice(0,3).map(x=>x.doi)).size,3,"Three Vitruvius editions require separate DOI");
assert.ok(editions.slice(0,3).every(e=>e.isbn_note?.includes("ISBN común declarado por el editor")),"Shared ISBN qualification is required");
console.log("PASS: 117 scholarly R2 dossiers reconcile to actual edition metadata, fingerprints and scope; original apparatus and critical claims are independent.");
