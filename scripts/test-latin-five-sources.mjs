/*
 * Auditoría reproducible de las cinco fuentes latinas:
 * V514, V554, V297, Rose 1899 (OCR) y Krohn 1912 (OCR).
 * La diferencia entre textos o el puntaje OCR NUNCA se computa como errata.
 */
import fs from "node:fs";
import assert from "node:assert/strict";

const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const es=read("data/structured/recensio-es.json");
const fr=read("data/structured/recensio-fr.json");
const en=read("data/structured/theory-en.json");
const hist=read("data/collation-loci.json");
const integrity=read("data/academic-integrity.json");
const errata=read("data/errata-editionum.json");
const token=s=>String(s||"").normalize("NFD")
 .replace(/[\u0300-\u036f]/g,"").toLowerCase()
 .replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const index=source=>new Map(source.passages.map(p=>[p.locus,p]));
const A=index(es),B=index(fr),C=index(en),canonical=integrity.canonicalReferences;
assert.equal(canonical.length,731,"El repertorio de referencia debe tener 731 loci");
assert.equal(new Set(canonical).size,731,"No debe duplicarse un locus canónico");
assert.equal(A.size,731,"V514: 731 pasajes");
assert.equal(B.size,731,"V554: 731 pasajes");
assert.equal(C.size,728,"V297: 728 bloques (incluye agrupaciones)");
for(const [l,p] of A){assert.ok(p.latin&&p.translation,"V514 sin texto: "+l);assert.ok(B.has(l),"V554 sin locus: "+l)}
for(const [l,p] of C)assert.ok(p.latin&&p.translation,"V297 sin contenido: "+l);
const combined=new Set(["7.7.1","7.7.4"]);
const missing=canonical.filter(l=>!C.has(l)).sort();
assert.deepEqual(missing,["7.7.2","7.7.3","7.7.5"],"Agrupaciones V297 previstas");
const divergence=[],equalSpanishFrench=[],greekNormalizedDiff=[];
for(const l of canonical){
 const pa=A.get(l),pb=B.get(l),pc=C.get(l);
 if(token(pa.latin)!==token(pb.latin))greekNormalizedDiff.push(l);
 else equalSpanishFrench.push(l);
 if(pc&&!combined.has(l)&&token(pa.latin)!==token(pc.latin)){
  divergence.push({locus:l,editions:"V514/V554 vs V297",classification:"diferencia_de_lectura_o_extension_por_revisar_no_errata_confirmada"});
 }
}
assert.equal(greekNormalizedDiff.length,0,"El texto latino compartido V514/V554 cambió: verificar si fue deliberado");
const notLinked=[],lowScore=[];
for(const l of canonical){
 const o=hist.loci[l];if(!o){notLinked.push(l);continue}
 for(const id of ["rose-1899","krohn-1912"]){
  const item=o[id];
  if(!item?.text?.trim())notLinked.push(l+" / "+id);
  else if(typeof item.score==="number"&&item.score<0.6)lowScore.push({locus:l,editor:id,score:item.score,page:item.page});
 }
}
const confirmed=errata.editions.reduce((n,x)=>n+(x.entries||[]).length,0);
const review=(errata.review_queue||[]).length;
const report={
 schema:"vdl-cotejo-latino-quintuple/1",
 sources:["Kurilo V514","Kurilo V554","Kurilo V297","Rose 1899 (OCR)","Krohn 1912 (OCR)"],
 canonicalLoci:canonical.length,alignedKuriloLatin514_554:equalSpanishFrench.length,
 lexicalDivergences297Against514ExcludingGrouped:divergence.length,
 latinPassages297:C.size,groupedPassages297:["7.7.1–7.7.3","7.7.4–7.7.5"],
 historicalOCR:{missingLinked:notLinked,lowScoreBelow060:lowScore.length,lowScoreExamples:lowScore.slice(0,12)},
 recordedBookErrata:confirmed,bookCasesAwaitingReview:review,
 differences:divergence,
 qualification:"Las divergencias V297/V514 son variantes de edición, abreviaturas, agrupaciones o candidatas a revisar; NO son por sí mismas errores.",
 threshold:"No se puede declarar tasa de error menor ni mayor al 3 % sin revisar el universo de palabras, variantes y traducciones en los documentos originales.",
 rights:"Conserva DOCX/PDF originales sin intervenir."
};
if(process.argv.includes("--json"))process.stdout.write(JSON.stringify(report,null,2)+"\n");
else{
 console.log("PASS · "+report.canonicalLoci+" loci · V514/V554 coinciden en "+equalSpanishFrench.length+" tras normalización de puntuación");
 console.log("INFO · "+divergence.length+" loci con divergencia léxica V297/V514 (excluidas agrupaciones); no equivale a erratas");
 console.log("INFO · "+lowScore.length+" alineamientos OCR de Rose/Krohn con semejanza inferior a 0,60; requieren revisar facsímiles");
 console.log("INFO · "+confirmed+" erratas de libro registradas; "+review+" casos en revisión");
 console.log("INFO · El umbral editorial del 3 % no se infiere de diferencias léxicas ni de puntajes OCR");
}
