/* On-demand regression: classics, reader links, formula context, book/album sidebar.
 * Run: node scripts/test-vitruvia-classics-on-demand.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=path=>fs.readFileSync(path,"utf8");
function browserModule(path){
 const sandbox={
  window:{},document:{documentElement:{lang:"es"}},
  location:{href:"https://example.org/vitruvius-digital-library/vitruvia.html",origin:"https://example.org"},
  URL,Date,console,Promise
 };
 vm.runInNewContext(read(path),sandbox,{filename:path});
 return sandbox.window;
}
const catalog=JSON.parse(read("data/bibliotheca-graeca-latina-I-bce-I-ce.json"));
const manuscripts=JSON.parse(read("data/bibliotheca-testimonia-verified.json"));
const registry=JSON.parse(read("data/classics-corpus/search-registry.json"));
const earliest=browserModule("assets/vitruvia-classics-earliest.js").VitruviaEarliest;
assert.ok(earliest);
const marcus=earliest.matchingWorks(catalog.works,"Marco Aurelio");
const meditations=marcus.find(w=>w.id==="marcus-aurelius-meditations");
assert.ok(meditations,"Marco Aurelio links to his Meditations");
assert.equal(meditations.language,"grc","Meditations are Greek originals, not original Latin");
const witness=earliest.oldest([meditations],manuscripts.records)[0];
assert.equal(witness.shelfmark,"Vat. gr. 1950, parte 2");
assert.ok(witness.viewer.startsWith("https://digi.vatlib.it/"));
const original=registry.entries.find(e=>earliest.original(e,meditations));
assert.equal(original.language,"grc");
assert.match(original.reader,/^classics-text-reader\.html\?work=/);
const reader=browserModule("assets/vitruvia-classics-viewer.js").VitruviaClassicsViewer;
assert.ok(reader.locate(original.reader)?.startsWith("https://example.org"));
assert.ok(reader.locate("codex-h-folios-local.html?folio=f.1r")?.startsWith("https://example.org"));
assert.equal(reader.locate("https://digi.vatlib.it/view/MSS_Vat.gr.1950.pt.2"),null);
assert.equal(reader.locate("javascript:alert(1)"),null);
const earliestSource=read("assets/vitruvia-classics-earliest.js");
assert.match(earliestSource,/a\.addEventListener\("click",ev=>/,"modal opens only after click");
assert.match(earliestSource,/if\(!candidates\.some/,"unrelated searches avoid catalogue fetch");
const discovery=browserModule("assets/vitruvia-discovery.js").VitruviaDiscovery;
assert.equal(discovery.plan("Jewish Christian",{}).mathContext,false);
assert.equal(discovery.plan("Newton",{canonical:"Isaac Newton",kind:"person",description:"English mathematician and physicist"}).mathContext,true);
assert.equal(discovery.plan("Historic engineer",{description:"engineer"}).mathContext,true);
const formula={title:"File:Equation in a medieval church.svg",imageinfo:[{extmetadata:{ImageDescription:{value:"mathematical equation"}}}]};
const unrelated=discovery.plan("Jewish Christian",{});
assert.equal(discovery.allowFormulaImage(formula,unrelated),false);
assert.equal(discovery.imageRank(formula,unrelated).accepted,false);
assert.equal(discovery.allowFormulaImage(formula,discovery.plan("Euler",{description:"mathematician"})),true);
const html=read("vitruvia.html"),dossier=read("assets/vitruvia-web-dossier.js");
assert.match(html,/assets\/vitruvia-classics-earliest\.js/);
assert.match(dossier,/if\(\['music','music-topic'\]\.includes\(topic\.kind\)\)void albums/);
assert.match(dossier,/if\(topic\.person&&\['author','literature'/);
assert.match(dossier,/chronology\(a\)\.localeCompare\(chronology\(b\)\)/);
assert.match(dossier,/web-dossier-cover/,"right-column album and book artwork retained");
assert.match(dossier,/web-dossier-buy-search/,"bookstore search available without promising stock");
assert.match(dossier,/catalogOrder\(section,albumCards/,"manual sorting remains available");
console.log("PASS classics: oldest catalogued witness, original-language reading, click-only viewers, mathematical image relevance, chronological album covers, preserved right-hand book cards.");
