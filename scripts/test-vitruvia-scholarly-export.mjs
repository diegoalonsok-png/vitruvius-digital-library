import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const api={};
const filename="assets/vitruvia-scholarly-export.js";
const source=fs.readFileSync(filename,"utf8");
vm.runInNewContext(source,{window:api});
const scholarly=api.VitruviaScholarlyExport;
assert(scholarly?.canCite&&scholarly?.bibliography&&scholarly?.csv);
const journal={
 type:"article",title:"The Roman House",author:"Julia Smith",year:2026,doi:"10.1234/roman.2026",
 journal:"Journal of Classical Architecture",volume:"5",issue:"2",pages:"21–35",
 link:"https://doi.org/10.1234/roman.2026"
};
assert.equal(scholarly.doi("https://doi.org/10.1234/roman.2026"),"10.1234/roman.2026");
assert.equal(scholarly.doi("javascript:alert(1)"),"");
assert(scholarly.canCite(journal));
const cite=scholarly.citation(journal);
assert(cite.includes("Journal of Classical Architecture 5, núm. 2 (2026): 21–35"));
assert(cite.includes("https://doi.org/10.1234/roman.2026"));
assert(!cite.includes("colación"));
const unverified={type:"wikipedia",title:"Rome",author:"Wikipedia",link:"https://en.wikipedia.org/wiki/Rome"};
assert.equal(scholarly.canCite(unverified),false,"Una ficha de referencia no es una edición crítica");
assert.equal(scholarly.citation(unverified),"");
const greek={
 type:"section",kind:"classic-text",workId:"euclid-optica",locus:"1.3~p2",language:"grc",
 title:"Ὀπτικά",author:"Εὐκλείδης",
 link:"classics-remote-text-reader.html?work=euclid-optica&locus=1.3~p2"
};
assert(scholarly.canCite(greek));
const classicalCitation=scholarly.citation(greek);
assert(classicalCitation.includes("localizador proporcionado por la fuente: 1.3~p2"));
assert(!classicalCitation.includes("manuscrito cotejado"));
const manuscript={
 type:"manuscript",title:"De architectura",author:"British Library",
 codexRepository:"British Library",codexShelfmark:"Harley MS 2767",
 link:"https://searcharchives.bl.uk/catalog/040-002048598"
};
assert(scholarly.canCite(manuscript));
assert(scholarly.citation(manuscript).includes("Harley MS 2767"));
const bibliography=scholarly.bibliography([journal,journal,greek,manuscript,unverified]);
assert.equal(bibliography.split("10.1234/roman.2026").length-1,1,"Duplicados DOI no se repiten");
const csv=scholarly.csv([journal,greek,manuscript,{type:"passage",title:"=HYPERLINK('x')",locus:"3.1.2"}]);
assert(csv.startsWith("\uFEFF"));
assert(csv.includes('"id_obra"'));
assert(csv.includes('"locus_declarado"'));
assert(csv.includes('"euclid-optica"'));
assert(csv.includes('"1.3~p2"'));
assert(csv.includes('"\'=HYPERLINK(\'x\')"'),"Evitar ejecución de fórmulas CSV");
assert(!csv.includes("Cotejo confirmado"));
const page=fs.readFileSync("vitruvia.html","utf8");
const helper=page.indexOf('assets/vitruvia-scholarly-export.js');
const search=page.indexOf('assets/vitruvia-search.js');
assert(helper>0&&search>helper,"El formateador debe cargarse antes que la búsqueda");
const cards=fs.readFileSync("assets/vitruvia-search.js","utf8");
assert(cards.includes("scholar?.canCite(d)"));
assert(cards.includes('node("button","citation-copy"'),"Usar los botones existentes");
const filters=fs.readFileSync("assets/vitruvia-result-filters.js","utf8");
assert(filters.includes("Chicago 18")&&filters.includes("Índice CSV"));
assert(!source.includes("document.head")&&!source.includes("createElement("),"El formateador no modifica el diseño del buscador");
console.log("PASS: Chicago 18, DOI, loci, CSV protegido y estética conservada.");