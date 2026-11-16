/* Digital comparison by 731 loci. Ancillary to the Budé-style apparatus:
 * never promotes extracted digital differences to verified variant readings. */
(()=>{"use strict";
const host=document.getElementById("ab-collatio-digitalis");
if(!host)return;
const title=document.createElement("h3");title.textContent="Collatio digitalis · diferencias candidatas por locus";
const desc=document.createElement("p");desc.className="ab-sub";
desc.textContent="Krohn 1912 (Perseus TEI), Rose 1899 (Gutenberg) y Kurilo V514: contraste automático de palabras latinas, no cotejo paleográfico ni atribución de lecturas a H, G, E o S. El aparato crítico cotejado conserva su nomenclatura habitual.";
const details=document.createElement("details"),summary=document.createElement("summary");summary.textContent="Consultar diferencias textuales del locus";
const result=document.createElement("div");result.className="ab-collatio-digitalis-results";
details.append(summary,result);host.append(title,desc,details);
let requested=new URLSearchParams(location.search).get("locus")||"1.1.1";
let dictionary=null,loading=null;
async function get(){
 if(dictionary)return dictionary;
 if(!loading)loading=fetch("data/apparatus/collatio-digitalis-731.json",{headers:{Accept:"application/json"}}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(j=>{
  if(j.schema!=="vdl-collatio-digitalis-v1"||!Array.isArray(j.loci)||j.loci.length!==731)throw Error("Índice de loci inválido");
  dictionary=new Map(j.loci.map(x=>[x.locus,x]));return dictionary;
 }).catch(e=>{loading=null;throw e});
 return loading;
}
const el=(tag,text,parent)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(parent)parent.append(e);return e;};
async function draw(){
 if(!details.open)return;
 result.replaceChildren(el("p","Consultando comparación por locus "+requested+"…"));
 try{
  const rows=await get();
  if(!details.open)return;
  const row=rows.get(requested);result.replaceChildren();
  if(!row){el("p","No se encontró el locus en el índice de comparación.",result);return}
  const h=el("p","Locus "+requested+" · "+(row.estadoDocumental==="sin_entrada_registrada_cotejo_pendiente"?"SIN entrada histórica registrada; cotejo de manuscritos pendiente":"con material documental histórico disponible"),result);
  h.className="ab-collatio-epistemic-status";
  if(Number.isFinite(row.alineacionRose)&&row.alineacionRose<100){
   el("p","Alineación Rose: "+row.alineacionRose+" % (indicador de alineación digital; no probabilidad de lectura correcta).",result);
  }
  for(const p of row.comparaciones){
   const section=el("section",undefined,result);section.className="ab-collatio-pair";
   el("h4",p.ediciones,section);
   if(p.estado!=="comparacion_digital_no_cotejada"){el("p","No hay dos transcripciones disponibles para este cotejo.",section);continue}
   el("p",p.diferenciasLéxicas+" grupos de diferencias de palabras · coincidencia secuencial normalizada: "+p.coincidenciaPorcentaje+" %. No constituye colación de impreso.",section).className="ab-sub";
   if(!p.diferenciasLéxicas){el("p","No se detectan diferencias léxicas en el texto digital normalizado. Esto no prueba consenso de testimonios.",section);continue}
   const list=el("ol",undefined,section);
   for(const d of p.candidatas||[]){
    const li=el("li",undefined,list);
    const reading=el("p",d.lecturaPrimera+"  ]  "+d.lecturaSegunda,li);reading.className="ab-critical-reading";reading.lang="la";
    el("small","Contexto I: "+d.contextoPrimera+" · Contexto II: "+d.contextoSegunda,li);
   }
   if(p.candidatasOmitidas)el("p","Otros "+p.candidatasOmitidas+" grupos automáticos no desplegados; el recuento incluye todos, pero esta vista prioriza los primeros 16.",section);
  }
  const note=el("p","Uso editorial: contraste auxiliar, pendientes de cotejo con los impresos de Rose y Krohn y los folios pertinentes del Codex H. No se incorporan nuevas sigla ni se atribuyen variantes manuscritas por similitud algorítmica.",result);note.className="ab-sub";
 }catch(e){result.replaceChildren(el("p","No se puede abrir la comparación digital: "+e.message));}
}
details.addEventListener("toggle",draw);
window.addEventListener("vitruvius:bude-locus",e=>{if(typeof e.detail?.locus!=="string")return;requested=e.detail.locus;if(details.open)void draw();});
})();