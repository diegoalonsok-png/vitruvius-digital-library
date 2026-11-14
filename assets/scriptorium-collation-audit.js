/* Mechanical comparison is a queue for editorial review, not a verified apparatus. */
(()=>{"use strict";
const root=document.getElementById("script-collation-audit");if(!root)return;
const status=root.querySelector("#script-audit-status"),summary=root.querySelector("#script-audit-summary"),result=root.querySelector("#script-audit-results");
const type=root.querySelector("#script-audit-filter"),search=root.querySelector("#script-audit-query");
const LABELS={alert:"Diferencia automática amplia · por revisar",moderate:"Diferencia automática intermedia · por revisar",near:"Diferencia automática menor","different-segmentation":"Identificador de locus diferente en V297"};
const PRIORITY={"different-segmentation":0,alert:1,moderate:2,near:3};
let audit=null,offset=0;const SIZE=30;
const navigation=document.createElement("div");navigation.className="script-audit-pagination";result.after(navigation);
function paginate(count){
 navigation.replaceChildren();
 const label=document.createElement("span");label.textContent=count?"Registros "+(offset+1)+"–"+Math.min(offset+SIZE,count)+" de "+count:"Sin registros para este filtro.";
 for(const [text,delta,disabled] of [["← Anteriores",-SIZE,offset===0],["Siguientes →",SIZE,offset+SIZE>=count]]){
  const b=document.createElement("button");b.type="button";b.textContent=text;b.disabled=disabled;b.addEventListener("click",()=>{offset+=delta;show();result.scrollTop=0});navigation.append(b);
 }
 navigation.append(label);
}
function show(){
 if(!audit)return;
 const term=search.value.trim().toLowerCase(),kind=type.value;
 result.replaceChildren();
 if(kind==="ocr-krohn"||kind==="ocr-rose"){
  const edition=kind.replace("ocr-","");
  const alerts=audit.ocrAlerts.filter(p=>p.edition===edition&&(!term||p.locus.toLowerCase().includes(term)));
  for(const item of alerts.slice(offset,offset+SIZE)){
   const row=document.createElement("div");row.className="script-audit-row";
   const title=document.createElement("h4");title.textContent=edition.toUpperCase()+" · página digital "+item.page+" · locus candidato "+item.locus;
   const note=document.createElement("p");note.textContent="Cobertura aproximada de fragmentos de tres palabras: "+Math.round(item.coverage*100)+" %. Medida automática, no probabilidad de corrección textual. Requiere cotejo de la imagen.";
   const link=document.createElement("a");link.href=edition==="krohn"?"documents/krohn-1912.pdf#page="+item.page:"https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf#page="+item.page;
   link.target="_blank";link.rel="noopener noreferrer";link.textContent="Comprobar en el facsímil ↗";
   row.append(title,note,link);result.append(row);
  }
  status.textContent=alerts.length+" localizaciones candidatas en "+edition+". No certifican diferencias editoriales.";
  paginate(alerts.length);return;
 }
 const items=audit.latinDiscrepancies.filter(p=>(!term||p.locus.toLowerCase().includes(term))&&(kind==="all"||kind===p.severity))
 .sort((a,b)=>(PRIORITY[a.severity]??4)-(PRIORITY[b.severity]??4)||a.locus.localeCompare(b.locus,undefined,{numeric:true}));
 for(const item of items.slice(offset,offset+SIZE)){
  const row=document.createElement("div");row.className="script-audit-row";
  const h=document.createElement("h4");h.textContent=item.locus+" · "+(LABELS[item.severity]||"Diferencia por revisar");
  const score=document.createElement("span");score.textContent=item.v297?
   "Semejanza mecánica V514/V297: "+Math.round(item.v297.similarity*100)+" % · palabras "+item.v297.wordLengths.join(" / ")+". No determina el tipo de variante.":
   "Identificador no presente en V297; su contenido puede estar integrado en otro locus del capítulo.";
  const btn=document.createElement("button");btn.type="button";btn.textContent="Comparar V514 y V297 en los visores";
  const excerpt=document.createElement("details"),description=document.createElement("summary");description.textContent="Ver comienzo de los textos comparados";
  const v514=document.createElement("p"),v297=document.createElement("p");v514.lang=v297.lang="la";v514.translate=v297.translate=false;v514.textContent="V514 / V554: "+item.preview.v514;
  v297.textContent="V297: "+(item.preview.v297||"Sin identificador coincidente; consultar el capítulo completo.");excerpt.append(description,v514,v297);
  btn.addEventListener("click",async()=>{
   btn.disabled=true;
   try{const output=await window.ScriptTripleCompare?.compareEditorialLocus(item.locus);
    status.textContent=output?.ok?output.notice:"No se pudo abrir: "+(output?.reason||"lector todavía no disponible");
    if(output?.ok)document.getElementById("script-triple")?.scrollIntoView({behavior:"smooth",block:"start"});
   }catch{status.textContent="No se pudo cargar la comparación. Los textos originales siguen disponibles en sus lectores."}finally{btn.disabled=false}
  });
  row.append(h,score,btn,excerpt);result.append(row);
 }
 status.textContent=items.length+" registros con el filtro seleccionado. Estado: detección automática, revisión filológica pendiente.";
 paginate(items.length);
}
fetch("data/structured/latin-collation-audit.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{
 if(data.schema!=="vitruvius-latin-collation-audit-v2")throw Error("Informe incompatible");audit=data;const s=data.summary;
 summary.textContent="Informe mecánico de "+data.date+". V514/V554: "+s.totalReferenceLoci+" segmentos de referencia. V297: "+s.identical+" loci iguales tras normalización, "+s.near+" muy similares, "+s.moderate+" de diferencia intermedia y "+s.alert+" de diferencia amplia. Hay "+s.missingLocusIdentifiers+" identificadores sin coincidencia: este recuento no prueba omisiones. La normalización elimina puntuación, diferencias de caja y diacríticos y equipara i/j y u/v.";
 show();
}).catch(err=>{status.textContent="No se pudo cargar el informe: "+err.message});
type.addEventListener("change",()=>{offset=0;show()});search.addEventListener("input",()=>{offset=0;show()});
})();
