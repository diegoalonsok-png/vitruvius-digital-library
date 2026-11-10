import assert from "node:assert/strict";
import {parallelHighlight,parallelExcerpt,hasLatinConcept} from "../assets/parallel-highlights.mjs";

// Synthetic test passages only; no philological assertion that these snippets
// are transcriptions from a particular edition or manuscript.
const pairs=[
 {term:"domus",source:"Domus atrium habet.",lang:"es",target:"La casa contiene un atrio.",word:"casa"},
 {term:"domus",source:"Domus atrium habet.",lang:"en",target:"The house contains an atrium.",word:"house"},
 {term:"domus",source:"Domus atrium habet.",lang:"fr",target:"La maison comporte un atrium.",word:"maison"},
 {term:"domum",source:"Ad domum accessit.",lang:"es",target:"Regresó a las viviendas.",word:"viviendas"},
 {term:"domvs",source:"DOMVS ampla est.",lang:"en",target:"This house is large.",word:"house"},
 {term:"aedes",source:"Aedes in foro sunt.",lang:"es",target:"Los templos están en el foro.",word:"templos"},
 {term:"urbs",source:"Urbs magna est.",lang:"es",target:"La ciudad es grande.",word:"ciudad"}
];
for(const test of pairs){
 const result=parallelHighlight(test.target,{query:test.term,lang:test.lang,latin:test.source});
 assert.equal(result?.anchored,true,test.term+" has documented Latin source form");
 assert.ok(result?.equivalent>=1,test.term+" highlighted for "+test.lang);
 assert.ok(result.html.includes(">"+test.word+"</mark>"),test.word+" was highlighted in "+test.lang);
 assert.equal(hasLatinConcept(test.term,test.source),true);
}
const noSource=parallelHighlight("Las casas son grandes.",{query:"domus",lang:"es",latin:"Aqua in foro est."});
assert.equal(noSource?.equivalent,0,"No translated equivalent without Latin attestation");
const noCandidate=parallelHighlight("Templos y edificios.",{query:"domus",lang:"es",latin:"Domus est."});
assert.equal(noCandidate?.equivalent,0,"No fabricated translated word");
const plain=parallelHighlight("La casa <script>alert(1)</script>.",{query:"domus",lang:"es",latin:"Domus est."});
assert.ok(!plain.html.includes("<script>"),"Plain text must be HTML-escaped");
const long="Fuente ".repeat(250)+"La vivienda romana está documentada."+" Contexto".repeat(80);
const extract=parallelExcerpt(long,{query:"domus",lang:"es",latin:"Domus ampla est.",max:200});
assert.ok(extract.includes("vivienda"),"Excerpt retains the translated equivalent");
console.log("Vitruvius bilingual highlighting: ES/EN/FR, Latin inflections, honest fallback, escaped HTML and excerpt centering PASS.");
