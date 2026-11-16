import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source=readFileSync("assets/vitruvia-lexicon.js","utf8");
new vm.Script(source,{filename:"assets/vitruvia-lexicon.js"});
const begin=source.indexOf("function passageIssueURL(details){");
const end=source.indexOf("function hitCard(",begin);
assert.ok(begin>0&&end>begin,"Passage issue helper missing");
const make=vm.runInNewContext(source.slice(begin,end)+";passageIssueURL",{URL});
const passageURL="https://vitruvius-digital-library.org/vitruvia-lexicon.html?work=vitruvius&locus=1.1.1&dv=20261116";
const a=new URL(make({
 work:"vitruvius",locus:"1.1.1",language:"la",author:"Vitruvio",title:"De architectura",
 edition:"V514",version:"20261116",cts:"urn:cts:latinLit:phi1056.phi001:1.1.1",
 passageURL,excerpt:"architecti est scientia pluribus disciplinis"
}));
assert.equal(a.origin,"https://github.com");
assert.equal(a.pathname,"/diegoalonsok-png/vitruvius-digital-library/issues/new");
assert.match(a.searchParams.get("title"),/vitruvius.*1\.1\.1/);
const body=a.searchParams.get("body");
for(const marker of [
 "V514","1.1.1","urn:cts:latinLit","data/lexicon/corpus-la.json",
 passageURL,"20261116","architecti est scientia",
 "Fuente, página","## Incidencia académica","- [ ] Análisis morfológico / lema"
]){
 // The source metadata and proposed correction fields are not replaced by generated claims.
 assert.ok(body.toLowerCase().includes(marker.toLowerCase()),"Issue missing: "+marker);
}
assert.match(body,/\n## Fragmento de contexto/,"Issue report should use real Markdown newlines");
const greek=new URL(make({
 work:"homer-iliad",locus:"1.1",language:"grc",author:"Homero",title:"Ilíada",
 excerpt:"μῆνιν ἄειδε",passageURL:"https://vitruvius-digital-library.org/vitruvia-lexicon.html?work=homer-iliad&locus=1.1"
}));
const greekBody=greek.searchParams.get("body");
assert.ok(greekBody.includes("data/lexicon/corpus-grc.json"));
assert.ok(greekBody.includes("μῆνιν ἄειδε"));
assert.ok(!greekBody.includes("Referencia CTS registrada"),"Do not invent missing CTS URNs");
assert.ok(source.includes('actions.append(el("a",{href:reportURL,target:"_blank",rel:"noopener noreferrer"'),
 "Issue report must be an explicit safe link, not an automatic write");
assert.ok(source.includes("actions.append(citeMenu("),
 "Preserve existing citation and export tools");
const deploy=readFileSync("scripts/check-cross-deployment.py","utf8");
assert.ok(deploy.includes('"assets/vitruvia-lexicon.js"'),
 "GitHub/Cloudflare parity must continue checking the changed module");
console.log("PASS: reproducible scholarly issue reports for Latin/Greek loci without changing corpus or critical texts");
