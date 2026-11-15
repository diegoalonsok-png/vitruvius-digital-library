/* Search loci in the author's structured Latin, without OCR or altered critical readings. */
(()=>{
"use strict";
const concepts={
 architectus:["architectus","architecti","architecto","architectum","architectos","architectorum","architectis"],
 architectura:["architectura","architecturae","architecturam","architecturarum","architecturis"],
 symmetria:["symmetria","symmetriae","symmetriam","symmetriarum","symmetriis"],
 decor:["decor","decoris","decore","decorem","decorum","decori"],
 firmitas:["firmitas","firmitatis","firmitatem","firmitate"],
 utilitas:["utilitas","utilitatis","utilitatem","utilitate"],
 venustas:["venustas","venustatis","venustatem","venustate"],
 eurythmia:["eurythmia","eurythmiae","eurythmiam","eurhythmia","eurhythmiae"],
 ordinatio:["ordinatio","ordinationis","ordinationem","ordinatione"],
 dispositio:["dispositio","dispositionis","dispositionem","dispositione"]
};
const aliases={
 arquitecto:"architectus",arquitectos:"architectus",architect:"architectus",architects:"architectus",
 arquitecta:"architectus",arquitectas:"architectus",
 arquitectura:"architectura",architecture:"architectura",
 simetria:"symmetria",symmetry:"symmetria",proporcion:"symmetria",
 decoro:"decor",decorum:"decor",propriety:"decor",
 firmeza:"firmitas",solidez:"firmitas",strength:"firmitas",
 utilidad:"utilitas",utility:"utilitas",
 belleza:"venustas",beauty:"venustas",
 euritmia:"eurythmia",eurythmy:"eurythmia",
 ordenacion:"ordinatio",ordering:"ordinatio",
 disposicion:"dispositio",arrangement:"dispositio"
};
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u");
const words=s=>fold(s).match(/[a-z]+/g)||[];
const $=s=>document.querySelector(s);
function init(rows,openLocus,syncTerm){
 const query=$("#ab-search-query"),mode=$("#ab-search-mode"),status=$("#ab-search-status"),list=$("#ab-search-results"),more=$("#ab-search-more");
 if(!query||!Array.isArray(rows))return;
 const corpus=rows.filter(p=>typeof p.latin==="string"&&p.locus).map(p=>({...p,normalizedWords:words(p.latin)}));
 let found=[],shown=0,needle=[];
 const roman=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
 const display=l=>{const m=String(l).match(/^(\d+)\.(.+)$/);return m?(roman[Number(m[1])]||m[1])+"."+m[2]:l};
 function draw(){
  const fragment=document.createDocumentFragment();
  for(const hit of found.slice(shown,shown+20)){
   const item=document.createElement("article");item.className="ab-search-hit";
   const button=document.createElement("button");button.type="button";button.textContent="Vitruvio "+display(hit.locus)+" · abrir pasaje";
   button.addEventListener("click",()=>{syncTerm?.(needle);openLocus(hit.locus);$("#triple-title")?.scrollIntoView({behavior:"smooth",block:"start"})});
   const p=document.createElement("p");p.lang="la";
   const raw=hit.latin;
   // Use actual word offsets in the original Latin, never the folded-text offsets.
   const matches=[...raw.matchAll(/[A-Za-zÀ-ÿ]+/g)].filter(m=>needle.includes(fold(m[0])));
   const at=matches[0]?.index??0;
   let lo=Math.max(0,at-75),hi=Math.min(raw.length,at+230);
   if(lo>0){const next=raw.slice(lo).search(/\\s/);if(next>=0&&lo+next<at)lo+=next+1}
   if(hi<raw.length){const next=raw.slice(hi).search(/\\s/);if(next>=0&&next<45)hi+=next}
   if(lo)p.append(document.createTextNode("…"));
   let cursor=lo;
   for(const match of matches){
    const start=match.index,end=start+match[0].length;
    if(start<lo||end>hi)continue;
    p.append(document.createTextNode(raw.slice(cursor,start)));
    const mark=document.createElement("mark");mark.className="ab-search-highlight";mark.textContent=match[0];
    p.append(mark);cursor=end;
   }
   p.append(document.createTextNode(raw.slice(cursor,hi)));
   if(hi<raw.length)p.append(document.createTextNode("…"));
   item.append(button,p);fragment.append(item);
  }
  list.append(fragment);shown=Math.min(found.length,shown+20);
  more.hidden=shown>=found.length;more.textContent="Mostrar más ("+shown+" de "+found.length+")";
 }
 function run(){
  const original=query.value.trim();
  list.replaceChildren();found=[];shown=0;more.hidden=true;
  if(!original){status.textContent="Escribí una palabra, frase o concepto.";return}
  const tokens=words(original);
  const canonical=aliases[tokens.join(" ")]||aliases[tokens[0]]||tokens[0];
  const variants=mode.value==="concept"?(concepts[canonical]||[canonical]):tokens;
  needle=[...new Set(variants.map(fold))];
  const exact=mode.value==="phrase"?fold(original).replace(/\s+/g," "):"";
  found=corpus.filter(p=>{
   if(exact)return p.normalizedWords.join(" ").includes(exact);
   const present=new Set(p.normalizedWords);
   return mode.value==="all"?needle.every(t=>present.has(t)):needle.some(t=>present.has(t));
  });
  syncTerm?.(needle);
  if(found.length)openLocus(found[0].locus);
  status.textContent=found.length+" loci encontrados en el latín V514"+(canonical!==tokens[0]?" · concepto latino: "+canonical:"")+". Ordenados por libro y pasaje. No se incluyen coincidencias OCR.";
  draw();
 }
 $("#ab-search-form").addEventListener("submit",e=>{e.preventDefault();run()});
 $("#ab-search-reset").addEventListener("click",()=>{query.value="";syncTerm?.([]);found=[];shown=0;list.replaceChildren();more.hidden=true;status.textContent="Búsqueda limpia. Introducí otro término."});
 more.addEventListener("click",draw);
 document.querySelectorAll("[data-ab-term]").forEach(btn=>btn.addEventListener("click",()=>{query.value=btn.dataset.abTerm;mode.value="concept";run()}));
 status.textContent=corpus.length+" loci disponibles para búsqueda de texto latino y conceptos.";
}
window.VDLApparatusLocusSearch={init};
})();