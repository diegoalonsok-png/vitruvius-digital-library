/* Display-only completeness annotations from the existing integrity record.
 * Never equate OCR coverage, raw block counts or unrecognized numbering with missing text.
 * The percentage is a share of documented structural units, not words or filological completeness. */
(function(g){
"use strict";
const list=x=>Array.isArray(x)?[...new Set(x.map(String).filter(s=>s.trim()))]:[];
const pct=x=>Number(x.toFixed(2)).toLocaleString("es-AR",{maximumFractionDigits:2})+"%";
function describe(r){
 if(!r)return [];
 const out=[];
 for(const v of r.versions||[]){
  const missing=list(v.missing), total=v.expected, found=v.found;
  if(!missing.length||v.status==="not_individually_examined")continue;
  const exact=Number.isInteger(total)&&total>0&&Number.isInteger(found)&&found>=0&&found<total&&total-found===missing.length&&!!v.basis;
  if(r.status==="verified_structural_gap"&&exact){
   out.push({language:v.language,path:v.path,kind:"confirmed",missing,
    text:pct(100*found/total)+" de unidades presentes · falta "+pct(100*(total-found)/total)+" ("+found+"/"+total+") · faltan: "+missing.join(", ")});
  }else{
   out.push({language:v.language,path:v.path,kind:"review",missing,text:"Completud por verificar · unidades señaladas: "+missing.join(", ")});
  }
 }
 for(const v of r.latestTextChecks||[]){
  const declared=list(v.sourceDeclaredMissing), ref=list(v.missingReferenceLoci), books=list(v.candidateMissingBooks), empty=list(v.emptyLoci);
  if(declared.length)out.push({language:v.language,path:v.path,kind:"declared",missing:declared,text:"Faltantes declarados por la fuente: "+declared.join(", ")+" · porcentaje no determinado"});
  if(ref.length||books.length||empty.length){
   const parts=[];
   if(ref.length){
    const total=v.expectedReferenceLoci;
    if(Number.isInteger(total)&&total>=ref.length&&total>0){
     out.push({language:v.language,path:v.path,kind:"reference",missing:ref,
      text:pct(100*(total-ref.length)/total)+" de loci de referencia detectados · "+pct(100*ref.length/total)+" no detectados ("+(total-ref.length)+"/"+total+") · loci: "+ref.join(", ")+" · pendiente de cotejo"});
    }else parts.push("loci no detectados: "+ref.join(", "));
   }
   if(books.length)parts.push("libros no detectados: "+books.join(", "));
   if(empty.length)parts.push("loci vacíos: "+empty.join(", "));
   if(parts.length)out.push({language:v.language,path:v.path,kind:"review",text:"Completud por verificar · "+parts.join(" · ")+" (no equivale a pérdida textual comprobada)"});
  }
 }
 for(const f of r.facsimiles||[])if(f.note&&r.status==="scope_warning")out.push({edition:f.id,kind:"scope",text:"Alcance de edición: "+f.note+" · porcentaje no determinado"});
 if(!out.length&&r.status==="verified_structural_gap")out.push({kind:"review",text:"Faltante estructural registrado · porcentaje pendiente de determinar"});
 return out.filter((v,i,a)=>a.findIndex(x=>x.text===v.text&&x.language===v.language&&x.path===v.path&&x.edition===v.edition)===i);
}
function titleSuffix(r){
 const rows=describe(r);
 if(!rows.length)return "";
 const confirmed=rows.filter(x=>x.kind==="confirmed");
 if(confirmed.length){
  const labels=[...new Set(confirmed.map(x=>(x.language?x.language+": ":"")+x.text))];
  return " ["+labels.join(" | ")+(rows.some(x=>x.kind!=="confirmed")?" · otras incidencias en ficha":"")+"]";
 }
 const references=rows.filter(x=>x.kind==="reference");
 if(references.length)return " ["+[...new Set(references.map(x=>(x.language?x.language+": ":"")+x.text))].join(" | ")+"]";
 return " ["+(rows.some(x=>x.kind==="declared")?"Faltantes declarados":rows.some(x=>x.kind==="scope")?"Edición de alcance limitado":"Completud por verificar")+" · % no determinado]";
}
g.BibliothecaCompleteness={describe,titleSuffix};
})(typeof window!=="undefined"?window:globalThis);
