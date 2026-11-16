#!/usr/bin/env node
/**
 * Auditoría conservadora, de solo lectura, del aparato crítico comparativo.
 * Produce una cola de revisión con evidencias, NO cambia lecturas, siglas ni loci.
 * Los patrones detectan riesgos y no demuestran, por sí solos, una errata.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const corpus=JSON.parse(fs.readFileSync("data/apparatus/aparato-comparativo.json","utf8"));
const canonical=JSON.parse(fs.readFileSync("data/structured/recensio-es.json","utf8"));
const known=new Set(canonical.passages.map(p=>p.locus));
assert.equal(corpus.loci.length,known.size,"El aparato debe mantener el universo canónico de loci");
const findings=[],counts={};
function flag(severity,kind,locus,edition,entry,reason){
  findings.push({severity,kind,locus,edition,page:entry?.pagina??null,line:entry?.linea??null,
    excerpt:(entry?.texto??entry?.lema??"").slice(0,220),reason});
  counts[kind]=(counts[kind]||0)+1;
}
const noisy=/\b(?:cuiuB|Utteram|J3|iZex|qug|h§|l£|pietur\^|descriptionib\?)\b|\biZexGS\b|\bJSS\b/i;
const nonLatin=/\b(?:coupes sans valeur critique|para(?:ciones)? sin valor critico|se mantiene|le texte de|en una sola|pour le reste|valoraci[oó]n)\b/i;
const seenLoci=new Set();
for(const row of corpus.loci){
 assert(known.has(row.locus),"Locus extraneous to canonical edition: "+row.locus);
 assert(!seenLoci.has(row.locus),"Duplicated locus: "+row.locus);
 seenLoci.add(row.locus);
 const seenAuthor=new Map();
 for(const a of row.v514||[]){
   const content=(a.lema||"")+" "+(a.aparato||"");
   if(nonLatin.test(content))flag("high","mixed-language-in-lemma",row.locus,"V514",a,"Revisar contra la página autoral; posible arrastre de columna");
   const normalized=(a.lema||"").normalize("NFKC").replace(/\s+/g," ").trim().toLowerCase();
   if(normalized){
     const n=seenAuthor.get(normalized)||0;
     seenAuthor.set(normalized,n+1);
     if(n)flag("review","repeated-author-lemma",row.locus,"V514",a,"Mismo lema en más de una entrada; puede ser lectura distinta, no fusionar automáticamente");
   }
 }
 for(const edition of ["rose-1899","krohn-1912"]){
   const doc=row[edition];
   if(!doc)continue;
   const seen=new Set();
   for(const a of doc.entradas||[]){
     if(noisy.test(a.texto||""))flag("high","possible-ocr-corruption",row.locus,edition,a,"Cotejar el impreso; candidato OCR, no lectura verificada");
     if(nonLatin.test(a.texto||""))flag("high","possible-column-contamination",row.locus,edition,a,"Revisar si se mezclaron columnas");
     const key=[a.pagina,a.linea,(a.texto||"").trim()].join("|");
     if(seen.has(key))flag("review","exact-duplicate",row.locus,edition,a,"Duplicado documental exacto dentro del locus");
     seen.add(key);
     if(!Array.isArray(a.sigla)||a.sigla.some(s=>!["H","G","E","S","x"].includes(s)))
       flag("high","invalid-witness-token",row.locus,edition,a,"La sigla inferida está fuera del inventario");
   }
 }
}
assert.equal(seenLoci.size,known.size);
const result={schema:"vdl-critical-review-queue/1",generation:"reproducible-from-source",
  status:"candidates-not-emendations",loci:known.size,source:"data/apparatus/aparato-comparativo.json",
  counts,findings:findings.sort((a,b)=>a.locus.localeCompare(b.locus,undefined,{numeric:true})||a.edition.localeCompare(b.edition))};
fs.mkdirSync("reports",{recursive:true});
fs.writeFileSync("reports/apparatus-critical-review-queue.json",JSON.stringify(result,null,2)+"\n");
console.log(JSON.stringify({status:"pass",loci:known.size,findings:findings.length,counts,output:"reports/apparatus-critical-review-queue.json"},null,2));
