import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const p="assets/classics-academic-reader.js";
const source=readFileSync(p,"utf8");
new vm.Script(source,{filename:p});
const start=source.indexOf("const sourceNotesByEdition=new Map();");
const end=source.indexOf("async function prepare(corpus){",start);
assert.ok(start>0&&end>start,"Source note helpers are missing");
const functions=vm.runInNewContext(source.slice(start,end)+
 ";({sourceNoteScope,sourceNoteIndex,sourceNoteMatches,sourceNoteURL})",{
 URL,location:{href:"https://vitruvius-digital-library.org/classics-text-reader.html"}
});
const original={
 workId:"cicero-brutus",language:"la",sourceSha256:"edition-one",
 readingMetadata:{title:"Rhetorica · Wilkins"},
 passages:[
  {locus:"urn:cts:latinLit:phi0474.phi039.perseus-lat2:2",text:"Arma virum",
   readingNotes:[{kind:"editorial",number:"",text:"augebat vulg. : augebam L"},
     {kind:"reference",number:"3",text:"Confer Cic. De oratore"}]},
  {locus:"urn:cts:latinLit:phi0474.phi039.perseus-lat2:3",text:"Alia verba",
   readingNotes:[{kind:"textual",number:"",text:"morte L : mortem Lambinus"}]},
  {locus:"urn:cts:latinLit:phi0474.phi039.perseus-lat2:4",text:"Passage without imported notes"}
 ]
};
const rows=functions.sourceNoteIndex(original);
assert.equal(rows.length,3);
assert.equal(rows[0].work,"cicero-brutus");
assert.equal(rows[0].sourceSha256,"edition-one");
assert.equal(functions.sourceNoteMatches(rows,"morte").length,1);
assert.equal(functions.sourceNoteMatches(rows,"AUGEBAT").length,1);
assert.equal(functions.sourceNoteMatches(rows,"cicer", "reference").length,0);
assert.equal(functions.sourceNoteMatches(rows,"cic","reference").length,1);
assert.equal(functions.sourceNoteMatches(rows,"","textual").length,1);
assert.equal(functions.sourceNoteMatches(rows,"","editorial").length,1);
assert.equal(functions.sourceNoteMatches(rows,"","").length,3);
const u=new URL(functions.sourceNoteURL(original.workId,original.language,rows[2].locus));
assert.equal(u.pathname,"/classics-text-reader.html");
assert.equal(u.searchParams.get("work"),"cicero-brutus");
assert.equal(u.searchParams.get("lang"),"la");
assert.equal(u.searchParams.get("locus"),rows[2].locus,"CTS should be preserved verbatim");
assert.notEqual(functions.sourceNoteScope("cicero-brutus","la","sha-1"),
 functions.sourceNoteScope("cicero-brutus","la","sha-2"));
assert.notEqual(functions.sourceNoteScope("cicero-brutus","la","sha-1"),
 functions.sourceNoteScope("cicero-brutus","grc","sha-1"));
const greek=functions.sourceNoteIndex({
 workId:"plato-apology",language:"grc",sourceSha256:"greek-sha",
 passages:[{locus:"12",readingNotes:[{kind:"editorial",text:"ἄνθρωπος variante",number:""}]}]
});
assert.equal(functions.sourceNoteMatches(greek,"ανθρωπος").length,1,"Greek accent folding");
assert.equal(functions.sourceNoteMatches(greek,"augebat").length,0,"Works must remain separate");
assert.ok(source.includes("sourceNotesByEdition.set(noteKey,sourceNoteIndex(prepared))"),
 "Index only edition-associated notes after the source has passed prepare checks");
assert.ok(source.includes("renderSourceNoteNavigator(footnotes,info)"),
 "Do not create another apparatus; add navigation in the existing source-note panel");
assert.ok(!source.includes("sourceNotesByEdition.set(noteKey,sourceNoteIndex(corpus))"),
 "Unverified corpus should not be indexed as source-notes");
const reader=readFileSync("assets/classics-text-reader.js","utf8");
assert.ok(reader.includes("sourceSha256:data.sourceSha256||"),
 "Reader must pass its edition source fingerprint to the note panel");
const html=readFileSync("classics-text-reader.html","utf8");
assert.match(html,/assets\/classics-academic-reader\.js\?v=20261116-source-notes-v1/);
assert.match(html,/assets\/classics-text-reader\.js\?v=20261116-source-notes-v1/);
console.log("PASS: original source-note lookup by locus, literal notes, type, edition hash and CTS links");
