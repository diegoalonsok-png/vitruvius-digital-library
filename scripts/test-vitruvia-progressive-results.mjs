/* Non-destructive regression: identity-first paint and two-stage academic indexes.
   Browser geometry and external image availability have separate checks. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script} from "node:vm";

const read=path=>readFileSync(path,"utf8");
const js=read("assets/vitruvia-search.js");
const html=read("vitruvia.html");
const css=read("assets/vitruvia-progressive-results.css");
new Script(js,{filename:"assets/vitruvia-search.js"});
const load=js.slice(js.indexOf("async function load(){try{"),js.indexOf("\nconst dataPaths="));
const search=js.slice(js.indexOf("async function search(){"),js.indexOf("\n function language(",js.indexOf("async function search(){")));
assert.match(load,/Promise\.allSettled\(urls\.slice\(0,3\)/,"Core documentary sources are loaded first");
assert.match(load,/Promise\.allSettled\(urls\.slice\(3\)/,"Nonessential catalogues load separately");
assert.match(load,/S\.ready=true;S\.supplementalReady=false/,"Core readiness must not imply full catalogue coverage");
assert.match(load,/S\.supplementalReady=true/);
assert.match(load,/vitruvia:catalogue-supplemental/);
assert.match(search,/if\(earlyIdentity\)/);
assert.match(search,/applyFeatured\(row,identity\.wikidataId\?10000:700,q,q\)/);
const setup=search.indexOf('window.dispatchEvent(new CustomEvent("vitruvia:search"');
const blocking=search.indexOf("await cataloguePromise");
const preview=search.indexOf("applyFeatured(row,identity.wikidataId?");
assert.ok(setup>=0&&blocking>setup&&preview>setup&&preview<blocking,
 "The first visual and sourced identity must be available before catalogue await");
assert.equal((search.match(/window\.dispatchEvent\(new CustomEvent\("vitruvia:search"/g)||[]).length,1,
 "No second search event may erase the early image");
assert.match(search,/integrateSupplement\(\)/);
assert.match(search,/searchSignal\.addEventListener\("abort"/,
 "A superseded query must detach its pending supplement update");
assert.match(html,/vitruvia-progressive-results\.css\?v=/);
assert.match(css,/body\.vitruvia-reading \.hero/);
assert.match(css,/body\.vitruvia-reading #featured/);
assert.match(css,/body\.vitruvia-reading #results/);
assert.ok(!/display:\s*none[^;]*!important/.test(css.split("body.vitruvia-reading #featured")[1].split("body.vitruvia-reading #results")[0]),
 "The first featured academic panel cannot be hidden for compactness");
console.log("PASS: early documented identity/lead image, staged catalogue, late integration, no erasure or lost academic panels.");
