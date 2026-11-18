#!/usr/bin/env node
/** Regression: the indexed work list must not navigate to an unverified locus.
 * Verified literal excerpts are published progressively under the work list.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const src=fs.readFileSync("assets/lexicon-classics-bridge.js","utf8");
new vm.Script(src,{filename:"assets/lexicon-classics-bridge.js"});
assert.match(src,/a\.href="#lx-library-passages"/,"Work summary should not link to an unverified first page");
assert.match(src,/addEventListener\("click",event=>\{event\.preventDefault\(\);void selectLibraryWork\(id\)\}/,"Work clicks must request verified loci");
assert.match(src,/searchPassages\(term,\{workId,allMatches:true/,"Selected work must fetch all its attested passages");
assert.match(src,/const onProgress=progress=>/,"Incremental rendering must not wait for the full corpus");
assert.match(src,/currentLiteralRows=progress\.rows\.slice\(0,160\)/,"Incremental results must be from verified text rows");
assert.match(src,/showLiteralRows\(currentLiteralRows,currentEditions\)/,"Show matched source paragraphs below the work list");
assert.match(src,/if\(token!==serial\|\|!progress\?\.rows\?\.length\)return/,"Stale searches must not overwrite current results");
assert.match(src,/if\(!currentEditions\.length\)currentEditions=await registeredEditions\(\)/,"Translation metadata must be fetched when selecting an indexed work immediately");
assert.match(src,/function markedOriginalPassage\(node,row\)/,"Original paragraph must render inline");
assert.match(src,/if\(!markedOriginalPassage\(excerpt,row\)\)markedExcerpt/,"Full source text must be preferred to snippet");
assert.match(src,/word\.className="lx-library-word"/,"Exact words must be dictionary controls");
assert.match(src,/attachWordDictionary\(excerpt,card,row\)/,"Dictionary must open inside Lexicon");
assert.match(src,/word\.dataset\.word=hit\.text/,"Dictionary must receive the attested source word");
assert.match(src,/background:#f2d46b/,"Matched classical words must be visibly yellow");
console.log("PASS Lexicon: indexed works select source-matched loci, verified paragraphs stream below counts.");
