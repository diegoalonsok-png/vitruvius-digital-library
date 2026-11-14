/* A review worklist, not an automated verification system.
 * JSON is the sole source; original notes, candidate loci and status never mutate.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const make=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const fld=(dl,key,value)=>{dl.append(make("dt","",key),make("dd","",value??"—"))};
const urls={
 V514:{edition:"recensio-es",pdf:"documents/kurilo-recensio-es.pdf",doi:"10.5281/zenodo.23884757"},
 V554:{edition:"recensio-fr",pdf:"documents/kurilo-recensio-fr.pdf",doi:"10.5281/zenodo.23885110"}
};
let all=[];
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function safe(item){
 const info=urls[item.edition];
 return info&&/^\d{1,2}\.\d+\.\d+$/.test(item.candidate_locus||"")&&
 /^\d+$/.test(String(item.footnote_id))&&item.verification_status==="pending_human_review"&&
 item.original_locus===null&&Number.isInteger(item.source_paragraph);
}
function sourceLink(href,label){
 const a=make("a","",label);a.href=href;return a;
}
function worksheet(item){
 const info=urls[item.edition];
 return [
 "# Ficha de comprobación ecdótica — PENDIENTE",
 "Registro: "+item.queue_id,
 "Edición: "+item.edition,
 "Nota autoral: "+item.footnote_id,
 "Locus candidato (no validado): "+item.candidate_locus,
 "DOCX origen: "+item.source_file,
 "Párrafo origen: "+item.source_paragraph,
 "Referencia de lectura: https://vitruvius-digital-library.org/lector-bilingue?edition="+info.edition+"&locus="+item.candidate_locus,
 "DOI de edición: https://doi.org/"+info.doi,
 "",
 "Fragmento del anclaje documental:",
 item.anchor_excerpt,
 "",
 "Fragmento de la nota original:",
 item.note_excerpt,
 "",
 "## Comprobación humana por completar",
 "Responsable de la revisión: [pendiente]",
 "Fecha de cotejo: [pendiente]",
 "Documento y página comprobados: [pendiente]",
 "Locus aceptado o rechazado: [pendiente]",
 "Justificación y fuente exacta: [pendiente]",
 "Lectura manuscrita (si existe): NO EVALUADA",
 "Estado público actual: pending_human_review",
 "Advertencia: copiar esta ficha NO cambia el estado del registro ni verifica una variante."
 ].join("\n");
}
function row(item){
 const info=urls[item.edition];
 const article=make("article","record");
 const head=make("div","record-head");
 head.append(make("h3","",item.edition+" · nota "+item.footnote_id+" · "+item.candidate_locus),make("span","state","B · locus candidato · sin cotejar"));
 const dl=make("dl");
 fld(dl,"Registro",item.queue_id);
 fld(dl,"Fuente",item.source_file);
 fld(dl,"Párrafo de origen",String(item.source_paragraph));
 fld(dl,"Locus del DOCX","No consta explícito en la nota: localizador propuesto");
 fld(dl,"Verificación","Pendiente de revisión humana; no es una lectura manuscrita confirmada");
 const a=make("div","excerpt");
 a.append(make("strong","","Anclaje original · extracto documental"),document.createTextNode(item.anchor_excerpt||"Sin extracto"));
 const n=make("div","excerpt");
 n.style.marginTop="10px";
 n.append(make("strong","","Nota autoral · extracto literal"),document.createTextNode(item.note_excerpt||"Sin extracto"));
 const links=make("div","links");
 links.append(sourceLink("lector-bilingue.html?edition="+info.edition+"&locus="+encodeURIComponent(item.candidate_locus),"Leer locus candidato"),
 sourceLink(info.pdf,"Consultar PDF íntegro ("+item.edition+"; página no determinada)"),
 sourceLink("registro-ecdotico.html?tipo=nota&q="+encodeURIComponent(item.candidate_locus),"Buscar notas asociadas"),
 sourceLink("https://doi.org/"+info.doi,"DOI de la edición"));
 const copy=make("button","","Copiar ficha para revisión");
 copy.type="button";
 copy.setAttribute("aria-label","Copiar ficha de revisión pendiente de "+item.edition+" nota "+item.footnote_id);
 copy.addEventListener("click",async()=>{
  try{
   await navigator.clipboard.writeText(worksheet(item));
   $("status").textContent="Ficha de "+item.queue_id+" copiada; la nota sigue pendiente de revisión.";
  }catch(e){
   $("status").textContent="No se pudo copiar automáticamente la ficha. El inventario JSON continúa disponible.";
  }
 });
 links.append(copy);
 article.append(head,dl,a,n,links);
 return article;
}
function queryParams(){
 const p=new URLSearchParams(location.search);
 const edit=p.get("ed")||"",chapter=p.get("cap")||"",locus=p.get("locus")||"",q=p.get("q")||"";
 if(["V514","V554"].includes(edit))$("review-edition").value=edit;
 if(["1.1","3.1"].includes(chapter))$("review-chapter").value=chapter;
 if(locus)$("review-locus").value=locus;
 if(q)$("review-query").value=q;
}
function render(){
 const ed=$("review-edition").value, chapter=$("review-chapter").value,locus=$("review-locus").value,q=fold($("review-query").value.trim());
 const result=all.filter(x=>(!ed||x.edition===ed)&&(!chapter||x.candidate_locus.startsWith(chapter+"."))&&
 (!locus||x.candidate_locus===locus)&&(!q||fold([x.candidate_locus,x.footnote_id,x.edition,x.anchor_excerpt,x.note_excerpt,x.source_file].join(" ")).includes(q)));
 const parent=$("results");parent.replaceChildren();
 if(!result.length)parent.append(make("p","", "No hay notas de la muestra con esos filtros. Ningún registro se ha eliminado."));
 else for(const item of result)parent.append(row(item));
 $("status").textContent=result.length+" notas candidatas visibles de "+all.length+"; ninguna verificada por esta herramienta.";
 const p=new URLSearchParams();
 for(const [k,v] of [["ed",ed],["cap",chapter],["locus",locus],["q",$("review-query").value.trim()]])if(v)p.set(k,v);
 history.replaceState(null,"",location.pathname+(p.size?"?"+p.toString():""));
}
async function boot(){
 try{
 const response=await fetch("data/ecdotic-note-review-queue-2026-11-14.json",{cache:"no-cache"});
 if(!response.ok)throw Error("HTTP "+response.status);
 const data=await response.json();
 if(data.schema!=="vdl-ecdotic-note-review-queue-v1"||!Array.isArray(data.items)||data.items.length!==data.priority_candidate_count||!data.items.every(safe))throw Error("Manifiesto de revisión incompatible");
 all=data.items;
 const loci=[...new Set(all.map(x=>x.candidate_locus))].sort((a,b)=>a.localeCompare(b,"es",{numeric:true}));
 for(const locus of loci){const option=make("option","",locus);option.value=locus;$("review-locus").append(option)}
 queryParams();render();
 for(const id of ["review-edition","review-chapter","review-locus","review-query"])$(id).addEventListener(id==="review-query"?"input":"change",render);
 $("review-filters").addEventListener("submit",e=>e.preventDefault());
 }catch(e){
 $("status").textContent="No se pudo cargar el inventario: "+e.message;
 $("results").replaceChildren(sourceLink("data/ecdotic-note-review-queue-2026-11-14.json","Consultar el manifiesto de origen"));
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();