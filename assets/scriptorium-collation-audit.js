/* Scholarly textual audit: flags normalization-based Latin discrepancies and OCR uncertainties.
   A flagged mismatch is not proof of a transcription error. */
(()=>{"use strict";
const root=document.getElementById("script-collation-audit");if(!root)return;
const status=root.querySelector("#script-audit-status"),summary=root.querySelector("#script-audit-summary"),result=root.querySelector("#script-audit-results");
const type=root.querySelector("#script-audit-filter"),search=root.querySelector("#script-audit-query");
const LABELS={alert:"Alerta: diferencia fuerte",moderate:"Revisar: diferencia moderada",near:"Variación menor",missing:"Falta ese locus en V297"};
let audit=null;
function show(){
 if(!audit)return;
 const term=search.value.trim().toLowerCase();
 const kind=type.value;
 let items=audit.latinDiscrepancies.filter(p=>(!term||p.locus.toLowerCase().includes(term))&&(kind==="all"||kind===p.severity));
 items=items.sort((a,b)=>({missing:0,alert:1,moderate:2,near:3}[a.severity]??4)-({missing:0,alert:1,moderate:2,near:3}[b.severity]??4));
 const count=items.length;
 result.replaceChildren();
 for(const item of items.slice(0,100)){
  const row=document.createElement("div");row.className="script-audit-row";
  const h=document.createElement("h4");h.textContent=item.locus+" · "+LABELS[item.severity];
  const score=document.createElement("span");score.textContent=item.v297?
   ("Semejanza heurística V514/V297: "+Math.round(item.v297.similarity*100)+"% · palabras "+item.v297.wordLengths.join(" / ")):
   "Sin pasaje equivalente en V297";
  const btn=document.createElement("button");btn.type="button";btn.textContent="Abrir locus en visores";
  const excerpt=document.createElement("details"),description=document.createElement("summary");
  description.textContent="Ver comienzo de los textos cotejados";
  const v514=document.createElement("p"),v297=document.createElement("p");
  v514.textContent="V514 / V554: "+item.preview.v514;v297.textContent="V297: "+(item.preview.v297||"Sin pasaje correspondiente");
  excerpt.append(description,v514,v297);
  btn.addEventListener("click",()=>{
   const output=window.ScriptTripleCompare?.jumpToLocus(item.locus);
   status.textContent=output?.ok?"Abierto "+item.locus+" en "+output.count+" visor(es) compatibles.":"No se pudo abrir: "+(output?.reason||"lector aún no disponible");
   if(output?.ok)document.getElementById("script-triple")?.scrollIntoView({behavior:"smooth",block:"start"});
  });
  row.append(h,score,btn,excerpt);result.append(row);
 }
 status.textContent=count+" registros con el filtro seleccionado."+(count>100?" Se muestran los primeros 100.":"");
}
fetch("data/structured/latin-collation-audit.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{
 if(data.schema!=="vitruvius-latin-collation-audit-v1")throw Error("Informe incompatible");
 audit=data;const s=data.summary;
 summary.textContent="V514 y V554: 731 pasajes latinos coincidentes. V297: "+s.identical+" iguales normalizados; "+s.near+" muy similares; "+s.moderate+" con diferencias moderadas; "+s.alert+" con diferencias importantes; "+s.missing+" loci ausentes. Krohn: "+s.ocr.krohn.highCoverage+" candidatos OCR de cobertura alta; Rose: "+s.ocr.rose.highCoverage+".";
 show();
}).catch(err=>{status.textContent="No se pudo cargar la auditoría: "+err.message});
type.addEventListener("change",show);search.addEventListener("input",show);
})();