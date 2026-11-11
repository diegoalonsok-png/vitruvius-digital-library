/* Codex H: verified/provisional prefatory folio anchors, plus safe V514 lexical shortcuts.
 * The linked Latin passages come from the editorial V514, not automated transcription of H.
 * Manuscript word-level attestations remain unverified unless separately collated.
 */
(()=>{"use strict";
const box=document.getElementById("h-preface-concordance");
const grid=document.getElementById("h-preface-links");
const status=document.getElementById("h-preface-status");
if(!box||!grid||!status)return;
const ROMAN=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const level={visual_rubric:"Rúbrica registrada",visual_text:"Texto registrado",provisional:"Alineación provisional",catalogue:"Registro de catálogo",not_verified:"Sin cotejo"};
const anchor=(label,href)=>{const a=document.createElement("a");a.href=href;a.textContent=label;return a};
fetch("data/codex-h/folio-locus-map.json").then(r=>{
 if(!r.ok)throw Error("HTTP "+r.status);
 return r.json();
}).then(data=>{
 grid.replaceChildren();
 let mapped=0;
 for(let book=1;book<=10;book++){
  const locus=book+".praef.1";
  const entry=(data.entries||[]).find(e=>(e.loci||[]).some(x=>x.locus===locus&&(x.extent==="starts"||x.extent==="full")));
  const row=document.createElement("article");row.className="h-preface-card";
  const title=document.createElement("strong");title.textContent="Libro "+ROMAN[book]+" · Praefatio";
  row.append(title);
  if(entry){
   mapped++;
   const finding=entry.loci.find(x=>x.locus===locus);
   row.append(anchor("H · f. "+entry.folio+" · imagen "+entry.image_number,
    "codex-h-folios-local.html?"+new URLSearchParams({folio:"f."+entry.folio})));
   const note=document.createElement("small");
   note.textContent=(level[finding.status]||"Estado no determinado")+
    " · inicio registrado, no transcripción íntegra ni verificación palabra por palabra";
   row.append(note);
  }else{
   const missing=document.createElement("small");
   missing.textContent="Inicio aún sin folio documentado";row.append(missing);
  }
  row.append(anchor("Leer V514 · "+locus,
   "lector-bilingue.html?"+new URLSearchParams({edition:"recensio-es",locus})));
  grid.append(row);
 }
 status.textContent=mapped+" de 10 inicios de prefacio localizados en el mapa documental de H. "+
  "Las demás líneas de cada prefacio aún necesitan HTR y colación paleográfica.";
}).catch(e=>{status.textContent="No se pudo consultar el mapa documental de los prefacios: "+String(e.message||e)});
for(const button of box.querySelectorAll("[data-h-latin]")){
 button.addEventListener("click",()=>{
  const input=document.getElementById("search");
  if(!input)return;
  input.value=button.dataset.hLatin||"";
  input.dispatchEvent(new Event("input",{bubbles:true}));
  document.getElementById("h-folios")?.scrollIntoView({block:"start",behavior:"smooth"});
 });
}
})();