/* Read-only editorial decision register. Never alters the source text. */
(()=>{"use strict";
const $=id=>document.getElementById(id),node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e};
let decisions=[];
function render(){
 const ed=$("ec-edition").value,review=$("ec-review").value,q=$("ec-query").value.trim().toLowerCase();
 const rows=decisions.filter(x=>(!ed||x.edition===ed)&&(!review||x.recordStatus===review)&&(!q||[x.locus,x.id,x.baseReading,x.adoptedReading].some(v=>String(v||"").toLowerCase().includes(q))));
 $("ec-count").textContent=rows.length+" decisiones registradas con estos filtros.";
 const target=$("ec-records");target.replaceChildren();
 if(!rows.length){target.append(node("p","No hay decisiones individuales publicadas para este filtro. Las notas indexadas pueden consultarse en el aparato crítico, pero no se presentan aquí como lecturas verificadas."));return}
 for(const record of rows){
  const section=node("section");section.className="ec-panel";
  section.append(node("h3",record.edition+" · "+record.locus+" · "+record.recordStatus));
  section.append(node("p","Evidencia: "+record.evidenceType+" · procedencia: "+(record.primarySourceUri||record.secondaryReference||"pendiente")));
  section.append(node("p","Lectura base: "+(record.baseReading||"no registrada")+" · lectura adoptada: "+(record.adoptedReading||"no registrada")));
  if(record.justification)section.append(node("p",record.justification));
  target.append(section);
 }
}
fetch("data/ecdotic-decisions.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{
 const b=d.baseline||{};
 for(const [id,key] of [["ec-total","extractedNotes"],["ec-explicit","explicitLocus"],["ec-candidate","candidateLocus"],["ec-unlocated","unlocated"]])$(id).textContent=Number.isInteger(b[key])?b[key].toLocaleString("es-AR"):"—";
 $("ec-baseline").textContent="Instantánea declarada: "+b.snapshotDate+" · procedencia: "+b.source+". "+b.warning;
 decisions=Array.isArray(d.decisions)?d.decisions:[];
 for(const id of ["ec-edition","ec-review","ec-query"])$(id).addEventListener(id==="ec-query"?"input":"change",render);
 render();
}).catch(e=>{$("ec-count").textContent="No se pudo cargar el registro: "+e.message;$("ec-baseline").textContent="Consulte Status textus para los límites de evidencia disponibles."});
})();