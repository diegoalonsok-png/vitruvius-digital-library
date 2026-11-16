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
 dispositio:["dispositio","dispositionis","dispositionem","dispositione"],
 proportio:["proportio","proportionis","proportionem","proportione","proportiones"],
 templum:["templum","templi","templo","templa","templorum","templis"],
 columna:["columna","columnae","columnam","columnas","columnarum","columnis"],
 opus:["opus","operis","opera","operum","operibus","opere"],
 materia:["materia","materiae","materiam","materias","materiis"],
 fabrica:["fabrica","fabricae","fabricam","fabricarum","fabricis"],
 ratio:["ratio","rationis","rationem","ratione","rationes","rationum"],
 scientia:["scientia","scientiae","scientiam","scientias","scientiis"],
 natura:["natura","naturae","naturam","naturarum","naturis"],
 locus:["locus","loci","locum","loco","loca","locorum","locis"],
 corpus:["corpus","corporis","corpore","corpora","corporum","corporibus"],
 aqua:["aqua","aquae","aquam","aquas","aquarum","aquis"],
 machina:["machina","machinae","machinam","machinas","machinarum","machinis"],
 geometria:["geometria","geometriae","geometriam"],
 musica:["musica","musicae","musicam"],
 harmonia:["harmonia","harmoniae","harmoniam"],
 species:["species","speciei","speciem","specie","specierum"],
 figura:["figura","figurae","figuram","figuras","figurarum","figuris"],
 mensura:["mensura","mensurae","mensuram","mensuras","mensurarum","mensuris"]
};
const aliases={
 arquitecto:"architectus",arquitectos:"architectus",architect:"architectus",architects:"architectus",
 arquitecta:"architectus",arquitectas:"architectus",
 arquitectura:"architectura",architecture:"architectura",
 simetria:"symmetria",simmetria:"symmetria",symetria:"symmetria",simetría:"symmetria",symmetry:"symmetria",proporcion:"symmetria",
 decoro:"decor",decorum:"decor",propriety:"decor",
 firmeza:"firmitas",solidez:"firmitas",strength:"firmitas",
 utilidad:"utilitas",utility:"utilitas",
 belleza:"venustas",beauty:"venustas",
 euritmia:"eurythmia",eurythmy:"eurythmia",
 ordenacion:"ordinatio",ordering:"ordinatio",
 disposicion:"dispositio",arrangement:"dispositio",
 proporcion:"proportio",proportion:"proportio",templo:"templum",temple:"templum",
 columna:"columna",column:"columna",obra:"opus",work:"opus",material:"materia",
 razon:"ratio",reason:"ratio",ciencia:"scientia",science:"scientia",
 naturaleza:"natura",nature:"natura",lugar:"locus",place:"locus",
 cuerpo:"corpus",body:"corpus",agua:"aqua",water:"aqua",maquina:"machina",machine:"machina",
 geometria:"geometria",geometry:"geometria",musica:"musica",music:"musica",
 armonia:"harmonia",harmony:"harmonia",figura:"figura",figure:"figura",medida:"mensura",measurement:"mensura"
};
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u");
// Query tokens are folded too: retain the canonical lemma for display and
// retrieve its full inflection set even when it begins with v (venustas).
const conceptKeys=new Map(Object.keys(concepts).map(lemma=>[fold(lemma),lemma]));
const aliasKeys=new Map(Object.entries(aliases).map(([alias,lemma])=>[fold(alias),lemma]));
const words=s=>fold(s).match(/[a-z]+/g)||[];
const lemmaLookup=new Map();
for(const [lemma,forms] of Object.entries(concepts))for(const form of forms)lemmaLookup.set(fold(form),lemma);
const $=s=>document.querySelector(s);
function init(rows,openLocus,syncTerm){
 const query=$("#ab-search-query"),mode=$("#ab-search-mode"),status=$("#ab-search-status"),list=$("#ab-search-results"),more=$("#ab-search-more"),synchronized=$("#ab-synchronized-locus");
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
   button.addEventListener("click",()=>{syncTerm?.(needle);openLocus(hit.locus);if(synchronized)synchronized.textContent="Locus sincronizado: "+display(hit.locus)+" · Rose, Krohn y Kurilo";$("#triple-title")?.scrollIntoView({behavior:"smooth",block:"start"})});
   const p=document.createElement("p");p.lang="la";
   const raw=hit.latin;
   // Use actual word offsets in the original Latin, never the folded-text offsets.
   const matches=[...raw.matchAll(/[A-Za-zÀ-ÿ]+/g)].filter(m=>needle.includes(fold(m[0])));
   const at=matches[0]?.index??0;
   let lo=Math.max(0,at-75),hi=Math.min(raw.length,at+230);
   if(lo>0){const next=raw.slice(lo).search(/\s/);if(next>=0&&lo+next<at)lo+=next+1}
   if(hi<raw.length){const next=raw.slice(hi).search(/\s/);if(next>=0&&next<45)hi+=next}
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
  if(!original){status.textContent="Escribe una palabra, frase o concepto.";return}
  const tokens=words(original);
  const canonical=aliasKeys.get(tokens.join(" "))||aliasKeys.get(tokens[0])||conceptKeys.get(tokens[0])||lemmaLookup.get(tokens[0])||tokens[0];
  const variants=mode.value==="concept"?(concepts[canonical]||[canonical]):tokens;
  needle=[...new Set(variants.map(fold))];
  const exact=mode.value==="phrase"?tokens.join(" "):"";
  found=corpus.filter(p=>{
   if(exact)return p.normalizedWords.join(" ").includes(exact);
   const present=new Set(p.normalizedWords);
   return mode.value==="all"?needle.every(t=>present.has(t)):needle.some(t=>present.has(t));
  });
  syncTerm?.(needle);
  if(found.length){openLocus(found[0].locus);if(synchronized)synchronized.textContent="Locus sincronizado: "+display(found[0].locus)+" · Rose, Krohn y Kurilo";}else if(synchronized)synchronized.textContent="Sin locus encontrado para sincronizar.";
  status.textContent=found.length+" loci encontrados en el latín V514"+(canonical!==tokens[0]?" · lema latino: "+canonical:"")+". Ordenados por libro y pasaje. No se incluyen coincidencias OCR.";
  draw();
 }
 $("#ab-search-form").addEventListener("submit",e=>{e.preventDefault();run()});
 $("#ab-search-reset").addEventListener("click",()=>{query.value="";syncTerm?.([]);if(synchronized)synchronized.textContent="";found=[];shown=0;list.replaceChildren();more.hidden=true;status.textContent="Búsqueda limpia. Introduce otro término."});
 more.addEventListener("click",draw);
 document.querySelectorAll("[data-ab-term]").forEach(btn=>btn.addEventListener("click",()=>{query.value=btn.dataset.abTerm;mode.value="concept";run()}));
 status.textContent=corpus.length+" loci disponibles para búsqueda de texto latino y conceptos.";
}
window.VDLApparatusLocusSearch={init};
})();
