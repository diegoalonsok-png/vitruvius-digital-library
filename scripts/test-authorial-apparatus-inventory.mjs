#!/usr/bin/env node
/* Validation of already-authored Vitruvius commentary and source-to-note links.
   Tests metadata only: DOES NOT claim manuscript collation or alter originals. */
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const load=p=>JSON.parse(readFileSync(p,"utf8"));
const notes=load("data/critical-notes.json"),academic=load("data/academic-integrity.json");
assert.ok(Array.isArray(notes.entries)&&notes.entries.length,"No extracted authorial notes");
assert.ok(academic.apparatus&&Number.isInteger(academic.apparatus.entries),"Critical apparatus report unavailable");
assert.ok(notes.entries.length<=academic.apparatus.entries,"Notes cannot exceed total apparatus entries");
const known={"recensio-es":"Vitruvio_V514","recensio-fr":"Vitruvio_V554","theory-en":"The_Architect_of_Theory_V297"},counts={},statuses={},seen=new Set();
for(const n of notes.entries){
 assert.ok(n&&known[n.edition],"Unidentified authorial edition");
 const key=n.edition+"|"+n.footnote_id;
 assert.ok(n.footnote_id&&!seen.has(key),"Duplicate or missing note: "+key);seen.add(key);
 assert.ok(typeof n.text==="string"&&n.text.trim(),"Missing note text: "+key);
 assert.ok(typeof n.source_file==="string"&&n.source_file.startsWith(known[n.edition]),"Source mismatch: "+key);
 assert.ok(Number.isInteger(n.source_paragraph)&&n.source_paragraph>0,"No source paragraph: "+key);
 if(n.mapping_status==="explicit_in_anchor")assert.ok(n.locus,"Explicit mapping without locus: "+key);
 else assert.equal(n.mapping_status,"requires_locus_review","Unsupported mapping state: "+key);
 if(n.candidate_locus)assert.notEqual(n.mapping_status,"explicit_in_anchor","Candidate cannot be declared verified: "+key);
 counts[n.edition]=(counts[n.edition]||0)+1;statuses[n.mapping_status]=(statuses[n.mapping_status]||0)+1;
}
for(const id of Object.keys(known))assert.equal(counts[id],notes.counts[id],"Edition count mismatch: "+id);
assert.equal(Object.values(notes.counts).reduce((a,b)=>a+b,0),notes.entries.length,"Total notes count mismatch");
assert.ok(existsSync("inventario-aparato-autoral.html")&&existsSync("assets/inventario-aparato-autoral.js"),"Visible provenance reader missing");
console.log(JSON.stringify({result:"PASS metadata only",sourceNotes:notes.entries.length,criticalIndexEntries:academic.apparatus.entries,byEdition:counts,byStatus:statuses,note:"Not a verification of philological variants or manuscript relationships"},null,2));
