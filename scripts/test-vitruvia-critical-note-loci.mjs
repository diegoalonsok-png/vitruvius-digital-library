/* Offline regression checks: canonical references and documentary status.
 * No claim of manuscript collation or verified editorial anchors. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../assets/critical-note-bridge.js",import.meta.url),"utf8");
const start=src.indexOf("function normalize("),end=src.indexOf("async function run(){");
assert.ok(start>=0&&end>start);
const {canonicalLocus,classify}=new Function("window",src.slice(start,end)+"return {canonicalLocus,classify};")({});
for(const [query,expected] of [
 ["IV.1.2","4.1.2"],["4.1.2","4.1.2"],["locus IX, 2, 3","9.2.3"],
 ["1.praef.2","1.praef.2"],["I.preface.2","1.praef.2"],
 ["X.0.2",""],["4.1",""],["XI.1.2",""],["arquitectura",""]
])assert.equal(canonicalLocus(query),expected,query);
const exact={locus:"4.1.2",mapping_status:"explicit_in_anchor",text:"Nota editorial"};
const candidate={candidate_locus:"4.1.2",mapping_status:"requires_locus_review"};
const mention={text:"Véase IV.1.2",mapping_status:"requires_locus_review"};
assert.equal(classify(exact,"IV.1.2").exact,true);
assert.equal(classify(candidate,"IV.1.2").probable,true);
assert.equal(classify(candidate,"IV.1.2").exact,false);
assert.equal(classify(mention,"IV.1.2").exact,false);
assert.equal(classify(mention,"IV.1.2").inText,true);
assert.equal(classify({locus:"4.1.2",mapping_status:"requires_locus_review"},"IV.1.2").exact,false);
assert.ok(classify(exact,"IV.1.2").score>classify(candidate,"IV.1.2").score);
assert.ok(classify(candidate,"IV.1.2").score>classify(mention,"IV.1.2").score);
console.log("PASS 17 critical-note normalization and provenance assertions");
