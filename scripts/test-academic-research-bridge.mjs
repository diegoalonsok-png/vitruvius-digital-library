// Reproducible cross-system filological verification. Read-only: never rewrites folios or editions.
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import vm from "node:vm";
const read=file=>readFileSync(new URL("../"+file,import.meta.url),"utf8");
const parsed=file=>JSON.parse(read(file));
const html=read("investigacion-conectada.html");
const script=read("assets/academia-conexiones.js");
const method=read("docs/protocolo-investigacion-interconectada.md");
new vm.Script(script,{filename:"assets/academia-conexiones.js"});
assert.match(html,/assets\/bibliotheca-simple\.css/,"Preserve existing Bibliotheca visual system");
assert.match(html,/assets\/academia-conexiones\.js/,"Scholarly bridge script must load");
assert.match(html,/scholar-work/);assert.match(html,/scholar-term/);assert.match(html,/scholar-locus/);
assert.match(script,/data\/bibliotheca-graeca-latina-I-bce-I-ce\.json/);
assert.match(script,/data\/bibliotheca-testimonia-verified\.json/);
const trustedRoutes=[
 "vitruvia-lexicon.html","vitruvia.html","bibliotheca-graeca-latina.html","bibliotheca-lexicographica.html",
 "index-locorum.html","dialectologia-graeca.html","lector-bilingue.html","aparato-critico.html",
 "metodologia-filologica.html","registro-ecdotico.html","protocolo-academico-lexicon.html","control-academico.html"
];
for(const path of trustedRoutes)assert(existsSync(new URL("../"+path,import.meta.url)),"Missing scholarly target: "+path);
for(const path of trustedRoutes.slice(0,8))assert(script.includes(path),"Missing scholarly deep link: "+path);
for(const s of ["app","lem","rdg","wit","candidato","filiación","hermenéutica","atestiguado"])assert(method.toLowerCase().includes(s.toLowerCase()),"Protocol is incomplete: "+s);
for(const url of ["https://guidelines.tei-c.de/en/html/TC.html","https://epidoc.stoa.org/gl/latest/"])assert(method.includes(url),"Missing international method source "+url);
const workList=parsed("data/bibliotheca-graeca-latina-I-bce-I-ce.json").works;
const evidence=parsed("data/bibliotheca-testimonia-verified.json");
const notes=parsed("data/critical-notes.json").entries;
const workIds=new Set(workList.map(w=>w.id));
assert.equal(workIds.size,workList.length,"Duplicate work IDs in classical catalogue");
assert(workList.length>=200,"Classical catalogue unexpectedly short");
assert(evidence.records.length>=20,"Verified manuscript inventory unexpectedly short");
const witnessIDs=new Set();
for(const ms of evidence.records){
 assert(ms.id&&!witnessIDs.has(ms.id),"Repeated manuscript ID "+ms.id);witnessIDs.add(ms.id);
 assert(typeof ms.shelfmark==="string"&&ms.shelfmark.trim(),"Manuscript missing shelfmark "+ms.id);
 assert(typeof ms.library==="string"&&ms.library.trim(),"Manuscript missing repository "+ms.id);
 assert(typeof ms.date==="string"&&ms.date.trim(),"Manuscript lacks material dating "+ms.id);
 assert(Number.isFinite(ms.dateStart)&&ms.dateStart>0,"Manuscript lacks chronology sort key "+ms.id);
 assert(Array.isArray(ms.workIds)&&ms.workIds.length>0,"Manuscript missing work connection "+ms.id);
 for(const id of ms.workIds)assert(workIds.has(id),"Witness assigned to unknown work: "+ms.id+" -> "+id);
 assert(ms.record||ms.viewer||ms.localViewer,"Witness lacks any location or reference "+ms.id);
 for(const property of ["record","viewer","localViewer"]){
  const u=ms[property];if(!u)continue;
  if(/^https?:\/\//.test(u)){assert(["http:","https:"].includes(new URL(u).protocol));continue}
  assert(existsSync(new URL("../"+u.split("?")[0],import.meta.url)),"Missing local viewer: "+ms.id+" "+u);
 }
}
for(const ed of evidence.editions){
 assert(workIds.has(ed.workId),"Edition assigned to unknown classical work "+ed.workId);
 assert(ed.title&&ed.year,"Edition lacks bibliographic identity "+ed.workId);
 assert(!/manuscript|codex/i.test(ed.type||"")||ed.shelfmark,"Manuscript mislabeled as edition without shelfmark");
}
const allowable=new Set(["explicit_in_anchor","requires_locus_review"]);
const status={};
for(const note of notes){
 status[note.mapping_status]=(status[note.mapping_status]||0)+1;
 assert(allowable.has(note.mapping_status),"Unexpected linkage evidence status for apparatus note");
 assert(note.text&&note.source_file&&note.anchor,"Critical note without its original provenance");
 if(note.mapping_status==="explicit_in_anchor")assert(note.locus,"Explicit note lacks locus");
}
assert(!/mapping_status\s*===\s*["']requires_locus_review["']/.test(script),
 "Hypothetical note associations must not be elevated in the research bridge");
assert.match(script,/más antiguo de los catalogados/,"Oldest witness must be qualified as catalogued, not universal");
assert.match(script,/ediciones impresas no son códices/i,"Print vs manuscript distinction is mandatory");
assert.match(script,/no (?:son|es) una colación|no es una colación/i,"Do not claim unperformed collation");
assert.match(script,/dateStart/,"Manuscript chronology must not use composition date");
console.log(JSON.stringify({
 status:"PASS",works:workList.length,manuscripts:evidence.records.length,
 editions:evidence.editions.length,notes:notes.length,noteStatuses:status,
 guards:"Provenance, date strata, live route targets and codex/edition distinction validated; no original media modified"
},null,2));
