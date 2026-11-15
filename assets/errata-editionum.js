/* Libro de erratas: distingue correcciones documentadas de casos pendientes.
 * No sustituye en silencio archivos DOCX/PDF ni atribuye lecturas manuscritas por OCR.
 */
(()=>{"use strict";
 const host=document.getElementById("errata-sections"),status=document.getElementById("errata-status");
 const review=document.getElementById("errata-review");
 if(!host||!status)return;
 const el=(tag,txt,parent,cls)=>{const n=document.createElement(tag);if(txt!==undefined&&txt!==null)n.textContent=String(txt);if(cls)n.className=cls;parent.append(n);return n};
 const severity=x=>({menor:"Menor",moderado:"Moderada",importante:"Importante"}[x]||x||"Sin clasificar");
 const table=(parent,headers)=>{const wrapper=el("div",null,parent,"errata-scroll"),t=el("table",null,wrapper),thead=el("thead",null,t),tr=el("tr",null,thead);for(const v of headers)el("th",v,tr);return el("tbody",null,t)};
 function load(d){
  host.replaceChildren();let total=0;
  for(const edition of d.editions||[]){
   const sec=el("section",null,host,"ed-section");el("h2",edition.id,sec);
   const entries=Array.isArray(edition.entries)?edition.entries:[];
   total+=entries.length;
   if(!entries.length){el("p","Sin erratas confirmadas e incorporadas a este registro; no equivale a certificar ausencia de errores.",sec);continue}
   const body=table(sec,["Referencia","Gravedad / tipo","Lectura en el original","Lectura propuesta","Fundamento y fuente","Estado / fecha"]);
   for(const item of entries){
    const tr=el("tr",null,body);
    el("td",item.locus_or_page||"—",tr);
    el("td",severity(item.severity)+" · "+(item.kind||"—").replaceAll("_"," "),tr);
    el("td",item.reading_printed||"—",tr);
    el("td",item.reading_corrected||"—",tr);
    const rationale=el("td",null,tr);el("p",item.rationale||"—",rationale);el("p",item.evidence||"Sin fuente",rationale,"method");
    el("td",(item.amended_in_version||item.status||"No indicado")+" · "+(item.date||"sin fecha"),tr)
   }
  }
  status.textContent=total+" erratas documentadas en originales. Sus PDF publicados no se modificaron por este registro.";
  if(review){
   review.replaceChildren();
   const q=d.review_queue||[];
   el("h2","Casos en revisión editorial ("+q.length+")",review);
   el("p","Los casos siguientes NO cuentan como erratas confirmadas ni como lecturas paleográficas verificadas.",review,"method");
   for(const item of q){
    const card=el("article",null,review,"errata-review-item");
    el("h3",item.version+" · "+item.locus+" · "+severity(item.severity),card);
    el("p",item.finding||"",card);
    el("p","Evidencia: "+(item.evidence||"pendiente"),card,"method");
    el("p","Próximo control: "+(item.next_action||"revisión"),card,"method")
   }
  }
 }
 fetch("data/errata-editionum.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
 .then(load).catch(e=>{status.textContent="No se pudo consultar el registro de erratas: "+e.message});
})();
