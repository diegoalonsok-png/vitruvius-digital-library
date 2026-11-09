/* Regression checks for Vitruvia classical corpus reading.
 * No DOM/browser claim: this verifies data-level results and deployed source wiring.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
const read = p=>fs.readFileSync(p,"utf8");
const latin=JSON.parse(read("data/classics-corpus/caesar-gallico-la.json"));
const english=JSON.parse(read("data/classics-corpus/caesar-gallico-en.json"));
assert.equal(latin.workId,"caesar-gallico");
assert.equal(english.workId,"caesar-gallico");
assert.equal(latin.passages.length,404);
assert.equal(english.passages.length,404);
const norm=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
function hasWord(source,term){
 const text=norm(source),query=norm(term);let i=text.indexOf(query);
 while(i>=0){
  const end=i+query.length;
  if((i===0||!/[\p{L}\p{N}]/u.test(text[i-1]))&&
     (end===text.length||!/[\p{L}\p{N}]/u.test(text[end])))return true;
  i=text.indexOf(query,i+1);
 }
 return false;
}
function paired(original,translation){
 const left=latin.passages.filter(p=>hasWord(p.text,original));
 const right=new Set(english.passages.filter(p=>hasWord(p.text,translation)).map(p=>p.locus));
 return left.filter(p=>right.has(p.locus)).map(p=>p.locus);
}
for(const [la,en,locus] of [
 ["Aquitani","Aquitani","1.1"],
 ["Celtae","Celts","1.1"],
 ["Gallia","Gaul","1.1"],
 ["LOCUS","place","1.13"]
]){
 assert.ok(paired(la,en).includes(locus),la+" / "+en+" should share "+locus);
}
const tools=read("assets/classics-study-tools.js");
const reader=read("assets/bibliotheca-graeca-latina.js");
const html=read("bibliotheca-graeca-latina.html");
const old=read("lector-textual-rapido.html");
assert.match(tools,/▶ Leer selección/);
assert.match(tools,/Subrayar/);
assert.match(tools,/background:"#000000"/);
assert.match(tools,/paintSearchMatches\(\)/);
assert.match(reader,/Buscar en ambos textos/);
assert.match(reader,/searchLocus/);
assert.match(reader,/getSearchTerms:/);
assert.match(reader,/Aquitani/i);
assert.match(reader,/celtae/i);
// The simplified concordance page no longer embeds readers or their toolbars.
assert.match(html,/assets\/bibliotheca-simple\.js\?v=/);
assert.match(html,/id="classic-query"/);
assert.match(html,/id="classic-work"/);
assert.doesNotMatch(html,/assets\/classics-study-tools\.js\?v=/);
assert.doesNotMatch(html,/<iframe\b|type="color"/);
// Extra morphological forms are optional; retain at least the literal query and attested transliterations.
assert.match(read("assets/bibliotheca-simple.js"),/searchPassages\(\[q,\.\.\.transliterations/);
assert.match(read("assets/bibliotheca-simple.js"),/allMatches:true,includeFullText:true,includeOCR:false/);
assert.match(read("assets/bibliotheca-simple.js"),/vitruvia-lexicon\.html/);
assert.match(old,/location\.replace\(dest\.href\)/);
console.log("PASS · Caesar: 404 Latin and English loci; bilingual queries; study controls; integrated reader; black defaults.");
