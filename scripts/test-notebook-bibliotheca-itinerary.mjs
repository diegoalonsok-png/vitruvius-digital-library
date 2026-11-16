import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const lex=readFileSync("assets/vitruvia-lexicon.js","utf8");
const bib=readFileSync("assets/bibliotheca-simple.js","utf8");
const html=readFileSync("vitruvia-lexicon.html","utf8");
new vm.Script(lex,{filename:"assets/vitruvia-lexicon.js"});
new vm.Script(bib,{filename:"assets/bibliotheca-simple.js"});
for(const id of ["nb-import-trigger","nb-import-file","nb-import-status"]){
 assert.ok(html.includes('id="'+id+'"'),"Notebook import UI element missing: "+id);
}
assert.ok(lex.includes('nbFile?.addEventListener("change"'),"Notebook must be imported only after choosing a local file");
assert.ok(lex.includes("localStorage.setItem(NB_KEY,JSON.stringify(result.items))"),"Save a merged notebook only after validation");
assert.ok(lex.includes('Importar combina los pasajes')===false,"Notebook text is rendered in HTML, not duplicated in JS");
const nbBegin=lex.indexOf("function nbValidateImport(payload){");
const nbEnd=lex.indexOf("async function nbImportFile(",nbBegin);
assert.ok(nbBegin>=0&&nbEnd>nbBegin);
const nb=vm.runInNewContext(lex.slice(nbBegin,nbEnd)+";({nbValidateImport,nbMergeImported})",{Date});
const legacy=[
 {id:1,cite:"Vitr. 1.1.1",text:"Architecti est scientia",lang:"la",notes:{lexicon:"Una nota conservada"}},
 {id:2,cite:"Hom. Il. 1.1",text:"μῆνιν ἄειδε",lang:"grc",tr:"Canta la cólera",notes:{}}
];
const old=nb.nbValidateImport(legacy);
assert.equal(old.length,2,"Legacy JSON arrays must remain importable");
const other=nb.nbValidateImport({schema:"vdl-lexicon-notebook-v1",items:[
 {cite:"Vitr. 1.1.1",text:"Architecti est scientia",lang:"la",notes:{lexicon:"Nota ajena"}},
 {cite:"Cic. Off. 1.2",text:"Quamquam te",lang:"la",notes:{historico:"Fuente bibliográfica"}}
]});
const merged=nb.nbMergeImported(legacy,other);
assert.equal(merged.added,1);assert.equal(merged.skipped,1);
assert.equal(merged.items.length,3);
assert.equal(merged.items[0].notes.lexicon,"Una nota conservada","Never overwrite the researcher's own notes");
assert.equal(merged.items[2].notes.historico,"Fuente bibliográfica");
assert.throws(()=>nb.nbValidateImport({schema:"not-an-export",items:legacy}));
assert.throws(()=>nb.nbValidateImport([{cite:"Bad",text:"",lang:"la"}]));
assert.throws(()=>nb.nbValidateImport([{cite:"Bad",text:"ok",lang:"la",notes:{x:25}}]));
const sourceStart=bib.indexOf("function appendBibliothecaScope(url){");
const sourceEnd=bib.indexOf("function updateLexicon(){",sourceStart);
assert.ok(sourceStart>=0&&sourceEnd>sourceStart);
const params=vm.runInNewContext(bib.slice(sourceStart,sourceEnd)+";appendBibliothecaScope",{
 era:{value:"hellenistic"},genre:{value:"history"},order:{value:"date"},
 work:{value:"cicero-officiis"},advancedLocus:{value:"1.1"}
});
const forward=new URL("https://vitruvius-digital-library.org/vitruvia-lexicon.html?q=decor");
params(forward);
for(const [k,v] of Object.entries({source:"bibliotheca",bib_era:"hellenistic",bib_genre:"history",bib_order:"date",bib_work:"cicero-officiis",bib_locus:"1.1"}))
 assert.equal(forward.searchParams.get(k),v,"Must preserve "+k);
const retStart=lex.indexOf("function bibliothecaReturnURL(params){");
const retEnd=lex.indexOf("function renderBibliothecaReturn(params){",retStart);
assert.ok(retStart>=0&&retEnd>retStart);
const backlink=vm.runInNewContext(lex.slice(retStart,retEnd)+";bibliothecaReturnURL",{
 URL,location:{href:"https://vitruvius-digital-library.org/vitruvia-lexicon.html"}
});
const back=backlink(forward.searchParams);
assert.equal(back.pathname,"/bibliotheca-graeca-latina.html");
for(const [k,v] of Object.entries({q:"decor",era:"hellenistic",genre:"history",order:"date",work:"cicero-officiis",locus:"1.1"}))
 assert.equal(back.searchParams.get(k),v,"Roundtrip lost "+k);
assert.equal(backlink(new URLSearchParams("q=decor")),null,"No foreign-origin return navigation");
assert.ok(lex.includes("no en las concordancias de Lexicon"),"Do not misrepresent era/genre filters as applied in Lexicon");
assert.ok(bib.includes('advancedLocus.value=(params.get("locus")||"")'),"Return must restore selected locus");
assert.ok(bib.includes('order.value=orderValue'),"Return must restore order");
console.log("PASS: non-destructive local notebook import, validation, deduplication and Bibliotheca-Lexicon scoped roundtrip");
