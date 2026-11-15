/** Guardia editorial de siete fichas de códices y su conexión a la lectura.
 * No realiza peticiones al R2 privado ni afirma autopsia de manuscritos.
 * Comprueba la congruencia de metadatos antes de una nueva tanda. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const read=path=>readFileSync(path,"utf8");
const data=JSON.parse(read("data/classics-corpus/early-witness-links-2026-11.json"));
const corpus=JSON.parse(read("data/classics-corpus/search-registry.json"));
const catalog=JSON.parse(read("data/r2/catalogo-clasicos-r2.json"));
const remote=JSON.parse(read("data/classics-corpus/remote-translations.json"));
const html=read("classics-work-record.html");
const script=read("assets/classics-early-witness-links.js");
new Script(script,{filename:"classics-early-witness-links.js"});
assert.equal(data.schema,"vdl-early-witness-links-v1");
assert.equal(data.entries.length,7);
const ids=new Set();
let witnesses=0,academic=0;
for(const work of data.entries){
 assert(!ids.has(work.id),"Duplicated work "+work.id);ids.add(work.id);
 assert(work.author&&work.work&&work.language);
 assert(["grc","la"].includes(work.language),"Source language invalid "+work.id);
 assert(work.witnesses.length,"No manuscripts "+work.id);
 for(const ms of work.witnesses){
  witnesses++;
  assert(ms.institution&&ms.shelfmark&&ms.folios&&ms.date&&ms.type);
  assert(/^https:\/\//.test(ms.url),"Invalid institutional bibliography "+work.id);
  if(ms.viewUrl)assert(/^https:\/\//.test(ms.viewUrl),"Invalid digitization URL "+work.id);
  if(/traducci[oó]n|Arabic|árabe/i.test(ms.type)&&/original griego [ií]ntegro/i.test(ms.note||""))
   throw Error("Witness incorrectly treated as complete Greek original "+work.id);
 }
 for(const translation of work.academicTranslations||[]){
  academic++;
  assert(/^https:\/\//.test(translation.url)&&translation.citation&&translation.year&&translation.editor);
  assert(["en","fr","es"].includes(translation.lang));
 }
 const original=(corpus.entries||[]).filter(e=>e.workId===work.id&&e.language===work.language);
 for(const e of original)assert(e.path&&e.reader,"Registered text without reader "+work.id);
 const pdf=(catalog.items||[]).find(e=>e.id===work.id);
 if(pdf)assert(pdf.pdf&&pdf.texto&&pdf.identificadorIA,"R2 catalogue missing fields "+work.id);
}
assert(html.includes("assets/classics-early-witness-links.js"),"Academic record does not load manuscript addendum");
assert(html.includes("earlyRecords.some(r=>r.id===requested)"),"Early-only works not selectable by URL");
assert(script.includes("readingInventory()"),"No live inventory comparison in codicological record");
assert(script.includes("academicTranslations"),"No documented scholarly translation references");
assert(script.includes("No se presume un DOCX"),"No warning on unchecked documents");
assert(read("assets/classics-work-dossier.js").includes("Original disponible para lectura enfrentada"));
assert(read("assets/facsimile-facing-reader.mjs").includes("Versión automática no revisada"));
console.log("PASS · "+data.entries.length+" tratados · "+witnesses+" testimonios · "+academic+" referencias de traducción documentadas");
console.log("Lecturas existentes según registros:",(corpus.entries||[]).filter(e=>ids.has(e.workId)).length,
 "PDF R2:",(catalog.items||[]).filter(e=>ids.has(e.id)).length,
 "traducciones externas:",(remote.entries||[]).filter(e=>ids.has(e.workId)).length);
