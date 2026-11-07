/* Vitruvia regression suite. Offline and repeatable, no third-party API needed.
 * Run: npm run check:vitruvia
 * This checks parsing, query intent, local results and page wiring.
 * A separate browser/network smoke test is required for real availability. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";
const sourceFile=name=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const modules=[
 "assets/vitruvia-image-engine-v2.js",
 "assets/vitruvia-entity-resolver.js",
 "assets/vitruvia-context-guard.js",
 "assets/vitruvia-search.js",
 "assets/vitruvia-article.js",
 "assets/vitruvia-reading.js",
 "assets/bibliotheca-graeca-latina.js"
];
for(const name of modules){
 new Script(sourceFile(name),{filename:name});
 console.log("✓ Syntax:",name);
}
const vitruviaHTML=sourceFile("vitruvia.html");
const bibliothecaHTML=sourceFile("bibliotheca-graeca-latina.html");

// Search layout regression: generic multiword searches (for example
// "Cristos negros de Centroamérica") must not reserve an empty right rail.
const liveLayout=sourceFile("assets/vitruvia-reading-layout-repair.css");
const originalContextStyles=sourceFile("assets/vitruvia-context-panel.css");
const editorialStyles=sourceFile("assets/vitruvia-discovery.css");
const serviceWorker=sourceFile("sw.js");
assert.ok(vitruviaHTML.includes("assets/vitruvia-reading-layout-repair.css?v=20261107-singlecolumn-2"),
 "Final single-column search stylesheet must be loaded and cache-busted");
assert.ok(!/<script\b[^>]*src=["'][^"']*multilingual-academic-search\.js/i.test(vitruviaHTML),
 "Unfinished multilingual philology panel must not be mounted in Vitruvia");
assert.ok(liveLayout.includes("body.vitruvia-reading #results .results-grid"),
 "Result container must be a full-width single flow");
assert.ok(liveLayout.includes("body.vitruvia-reading #vitruvia-article .article-grid"),
 "Encyclopaedia and supporting panels must be displayed in one column");
assert.ok(!originalContextStyles.includes("grid-template-columns:190px"),
 "Legacy three-column context stylesheet must not reappear");
assert.ok(!editorialStyles.includes("max-width:77ch!important"),
 "A narrow encyclopaedia-width cap must not return");
assert.ok(serviceWorker.includes('pathname.endsWith("/vitruvia.html")'),
 "Vitruvia navigations should fetch current HTML rather than stale cached markup");

for(const [label,html] of [["Vitruvia",vitruviaHTML],["Bibliotheca",bibliothecaHTML]]){
 // Solo JavaScript ejecutable: se excluyen JSON-LD y otros tipos de datos.
 const scripts=[...html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)].filter(m=>!/type\s*=\s*["']?(application\/(ld\+)?json|module|text\/template)/i.test(m[1]||"")).map(m=>m[2]).filter(x=>x.trim());
 for(const [i,text] of scripts.entries())new Script(text,{filename:label+" inline "+i});
 console.log("✓ Inline scripts:",label);
}
for(const needle of [
 "assets/vitruvia-image-engine-v2.js",
 "assets/vitruvia-entity-resolver.js",
 "assets/vitruvia-search.js",
 "assets/vitruvia-reading.css"
])assert.ok(vitruviaHTML.includes(needle),"Missing main asset: "+needle);
assert.ok(bibliothecaHTML.includes("assets/bibliotheca-graeca-latina.js"));
const resolverWindow={};
new Function("window",sourceFile("assets/vitruvia-entity-resolver.js"))(resolverWindow);
const subject=resolverWindow.VitruviaEntityResolver.subject;
const examples={
 "pinturas de Leonardo da Vinci":"Leonardo da Vinci",
 "fotos de Penélope Cruz":"Penélope Cruz",
 "biografía de María Antonieta":"María Antonieta",
 "obras de Cicerón":"Cicerón",
 "Ramsés II":"Ramsés II"
};
for(const [q,wanted] of Object.entries(examples)){
 assert.equal(subject(q),wanted,"Subject resolution failed: "+q);
 console.log("✓ Universal subject:",q,"→",wanted);
}
const works=JSON.parse(sourceFile("data/bibliotheca-graeca-latina-I-bce-I-ce.json")).works;
assert.ok(works.length>=190,"Unexpected classical catalogue shrinkage");
const classical=sourceFile("assets/bibliotheca-graeca-latina.js");
const first=classical.indexOf("function workSearchText(");
const last=classical.indexOf("let suggestionIndex=",first);
assert.ok(first>=0&&last>first,"Missing classical search implementation");
let query="";
const field=id=>({value:id==="classic-query"?query:""});
const fold=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
const isLocal=w=>["lectura-local-completa","lectura-local-parcial"].includes(w.publicStatus)
 &&!!(w.localReader?.verified||w.pdf?.url||w.localHtml||w.localVersions?.length);
const hasSource=w=>!!(w.reading?.url||w.pdf?.url||w.localHtml||w.manuscript?.manifest
 ||w.witnessRecords?.length||w.historicEditions?.length);
const searchFold=s=>fold(s).replace(/[^\p{L}\p{N}]+/gu," ").trim();
const filters=new Function("works","$","fold","searchFold","isLocal","hasSource","periodFocus",
 classical.slice(first,last)+";return filters;")(works,field,fold,searchFold,isLocal,hasSource,()=>true);
for(const [q,min] of [["Cicerón",10],["Homero",3],["Platón",7],["tratados clásicos",25],["odisea",1]]){
 query=q;const results=filters();
 assert.ok(results.length>=min,q+" matched only "+results.length+" records");
 console.log("✓ Classical retrieval:",q,results.length,"records");
}
query="Penélope Cruz";
assert.equal(filters().length,0,"Classical catalogue should not invent a modern actress");
const search=sourceFile("assets/vitruvia-search.js");
assert.ok(search.includes('S={mode:"all"'),"Universal mode not default");
assert.ok(search.includes("window.VitruviaEntityResolver?.subject(topicQuery(q))"),"Universal subject not connected");
assert.ok(search.includes("pending.push(wiki("),"Encyclopedia discovery not wired");
assert.ok(search.includes("pending.push(crossref("),"Academic publications not wired");
const images=sourceFile("assets/vitruvia-image-engine-v2.js");
assert.match(images,/generator:"categorymembers"/,"Topic image collections not wired");

assert.match(images,/function displayGroups\([\s\S]*?section\.hidden=false;[\s\S]*?grid\.hidden=false;[\s\S]*?displayItem\(item\)/,
 "Search image results must unhide the source gallery rather than render an empty dark region");
const readerLayout=sourceFile("assets/vitruvia-full-width-reading.css");
assert.match(readerLayout,/body\.vitruvia-reading #vitruvia-article \.article-grid\s*\{\s*display:flex!important;\s*flex-direction:column!important;/,
 "Encyclopedia text and research panels must share the entire content width");
assert.match(readerLayout,/body\.vitruvia-reading #vitruvia-article #article-body\s*,[\s\S]*?width:100%!important;[\s\S]*?max-width:none!important;/,
 "Article width must override legacy narrow reader styles");
const imageEngineBundle=vitruviaHTML.match(/vitruvia-image-engine-v2\.js\?v=([^"']+)/)?.[1]||"";
assert.ok(imageEngineBundle.startsWith("20261107-")&&imageEngineBundle!=="20261107-gallery-v4",
 "Image gallery must load an updated cache-busted engine after the latest repair");
assert.match(vitruviaHTML,/vitruvia-full-width-reading\.css\?v=20261107-wide-v3/,
 "Layout repair must invalidate the old cached stylesheet");
assert.match(images,/dialog\.showModal\(\)/,"Large-image viewer absent");
assert.match(images,/items\.slice\(0,150\)/,"Bulk gallery limit is missing");
assert.match(images,/info\.extmetadata\?\.LicenseShortName/,"Image licensing metadata absent");
const guardWindow={};
new Function("window",sourceFile("assets/vitruvia-context-guard.js"))(guardWindow);
const contextGuard=guardWindow.VitruviaContextGuard;
const peron={kind:"person",canonical:"Juan Domingo Perón",birthYear:1895};
const classicalRow={type:"book",title:"Hechos de Juan",author:"Tradición apócrifa",aliases:["Acts of John"]};
const codexRow={type:"manuscript",title:"Codex de los Hechos de Juan",author:"Biblioteca antigua"};
const modernBook={type:"openlibrary",title:"Juan Domingo Perón: A History"};
const ordinaryWiki={type:"wikipedia",title:"Juan Domingo Perón"};
assert.equal(contextGuard.exactSubjectMatch("Juan Domingo Perón",classicalRow),false,
 "A shared first name is not a documentary identity match");
assert.equal(contextGuard.allows(classicalRow,"Juan Domingo Peron"),false,
 "Multiword modern name must not admit an unrelated ancient text");
assert.deepEqual(contextGuard.filter([classicalRow,codexRow,modernBook,ordinaryWiki],"Juan Domingo Perón",peron),
 [modernBook,ordinaryWiki],"Modern identity should retain modern books and encyclopedia, not ancient records");
assert.equal(contextGuard.allows(classicalRow,"Juan Domingo Perón",null),false,
 "Ancient records must be rejected before asynchronous Wikidata identity lookup");
assert.equal(contextGuard.allows({type:"book",title:"Hechos de Juan",author:"Anónimo"},"Hechos de Juan"),true,
 "An ancient work queried by its full title should remain findable");
assert.equal(contextGuard.allows({type:"book",title:"De architectura",author:"Vitruvio"},"Vitruvio"),true,
 "Classical authors must remain searchable");
assert.equal(contextGuard.allows({type:"passage",title:"Caesar, De bello Gallico",exactTextMatch:true,latin:"Gallia est omnis divisa"},"Gallia"),true,
 "Exact ancient-language passage matches must remain available");
assert.equal(contextGuard.allows({type:"apparatus",title:"De bello Gallico",excerpt:"Gallia, variantes textuales"},"Gallia"),true,
 "Real lexical evidence in a critical apparatus must remain findable");
assert.equal(contextGuard.allows(classicalRow,"Isaac Newton",{kind:"person",canonical:"Isaac Newton",birthYear:1643}),false,
 "A different modern historical figure must not inherit classical material");
assert.equal(contextGuard.allows(classicalRow,"Romano Prodi",{kind:"person",canonical:"Romano Prodi",birthYear:1939}),false,
 "A modern person's proper name must not count as an Ancient Rome query");
assert.equal(contextGuard.allows(classicalRow,"Juan Domingo Perón y Roma antigua",peron),true,
 "An explicit comparative historical query is allowed");
assert.equal(contextGuard.allows(classicalRow,"iPhone 15",{kind:"topic",canonical:"iPhone 15",inceptionYear:2023}),false,
 "Modern technology must not inherit ancient codices");
assert.ok(vitruviaHTML.indexOf("assets/vitruvia-context-guard.js")>=0&&
 vitruviaHTML.indexOf("assets/vitruvia-context-guard.js")<vitruviaHTML.indexOf("assets/vitruvia-search.js"),
 "Classical-context gate must load before the search engine");
assert.match(search,/guard\.filter\(rows,query,S\.identifiedSubject\)/,
 "The ancient-context gate must run before search results reach article and documentary cards");
console.log("✓ Modern/classical context gate: named people, modern works, original-language passages, comparison queries");

assert.ok(vitruviaHTML.includes("id=\"featured-link\""));
const css=sourceFile("assets/vitruvia-reading.css");
assert.ok(css.includes("Fix: the feature CTA was dark-on-dark"));
console.log("✓ Universal search, image source attribution and accessibility hooks present");
console.log("PASS: Vitruvia offline regression checks. Live API/browser checks remain separate.");
