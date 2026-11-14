/* Concordantia editionum historicarum: documentary navigation, not an invented apparatus criticus.
 * Source: V514 loci and recorded automated OCR/trigram alignments for Krohn/Rose.
 * Do not promote OCR or similarity scores to manuscript readings. */
(()=>{"use strict";
const form=document.getElementById("historical-locus-form");
const input=document.getElementById("historical-locus-input");
const status=document.getElementById("historical-locus-status");
const result=document.getElementById("historical-locus-result");
if(!form||!input||!status||!result)return;
const canon="https://vitruvius-digital-library.org/concordancia-historica";
const sources={
 "krohn-1912":{short:"Krohn",name:"Fritz Krohn · 1912",full:"Vitruvii De architectura libri decem, ed. Fritz Krohn, Leipzig: B. G. Teubner, 1912",archive:"https://archive.org/details/vitruviidearchit00vitr_1"},
 "rose-1899":{short:"Rose",name:"Valentin Rose · 1899",full:"Vitruvii De architectura libri decem, ed. Valentin Rose, 2.ª ed., Leipzig: B. G. Teubner, 1899",archive:"https://archive.org/details/vitruviidearchit00vitr_0"}
};
const $=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
function link(text,url,external=false){
 const a=$("a",null,text);a.href=url;if(external){a.target="_blank";a.rel="noopener noreferrer"}return a;
}
let loadPromise=null,serial=0;
function load(){
 if(!loadPromise)loadPromise=Promise.all([
  fetch("data/structured/recensio-es.json").then(r=>{if(!r.ok)throw Error("V514 HTTP "+r.status);return r.json()}),
  fetch("data/collation-loci.json").then(r=>{if(!r.ok)throw Error("Concordancia HTTP "+r.status);return r.json()}),
  fetch("data/catalog.json").then(r=>{if(!r.ok)throw Error("Catálogo HTTP "+r.status);return r.json()})
 ]).then(([edition,concordance,catalog])=>{
  if(!Array.isArray(edition.passages)||concordance.schema!=="vitruvia-collation-v1"||!concordance.loci||!Array.isArray(catalog.editions))throw Error("Estructura documental inesperada");
  return {edition,concordance,catalog};
 }).catch(e=>{loadPromise=null;throw e});
 return loadPromise;
}
const fold=v=>String(v||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[vj]/g,c=>c==="v"?"u":"i");
function markedSnippet(text,term,max=600){
 const out=$("div","ch-ocr");
 if(!text){out.textContent="No consta un tramo OCR para este testigo.";return out}
 const q=fold(term||"").trim();
 const original=String(text);
 if(q.length<3){out.textContent=original.slice(0,max)+(original.length>max?"…":"");return out}
 const normalized=fold(original),start=normalized.indexOf(q);
 if(start<0){out.textContent=original.slice(0,max)+(original.length>max?"…":"");return out}
 const begin=Math.max(0,start-160),end=Math.min(original.length,start+max-160);
 out.append(document.createTextNode((begin?"…":"")+original.slice(begin,start)));
 const mark=$("mark",null,original.slice(start,start+q.length));out.append(mark);
 out.append(document.createTextNode(original.slice(start+q.length,end)+(end<original.length?"…":"")));
 return out;
}
function cardV514(p,book){
 const card=$("section","ch-edition");
 const h=$("h3",null,"Recensio V514 · 2026");card.append(h);
 card.append($("p","ch-source","Texto latino de referencia para la segmentación por loci. Edición, traducción y comentario: Diego A. Kurilo."));
 const block=$("blockquote",null,p.latin||p.text||"Texto latino no consignado para este locus.");block.lang="la";card.append(block);
 const record=book.editions.find(x=>x.id==="recensio-es")||{};
 const doi=String(record.doi||"");
 if(/^10\.\d{4,9}\/\S+$/.test(doi))card.append(link("DOI "+doi,"https://doi.org/"+doi,true));
 if(record.isbn)card.append($("p","ch-source","ISBN compartido declarado: "+record.isbn+". No identifica individualmente esta versión."));
 card.append(link("Abrir locus en el lector bilingüe","lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(p.locus)));
 return card;
}
function cardWitness(id,row,locus,word){
 const b=sources[id],card=$("section","ch-edition");
 card.append($("h3",null,b.name));
 card.append($("p","ch-source",b.full));
 if(!row?.page){
  card.append($("p",null,"No figura una localización OCR para este locus en la matriz consultada."));
  card.append(link("Registro del ejemplar",b.archive,true));return card;
 }
 card.append($("p",null,"Página digital: "+row.page+(row.pageEnd&&row.pageEnd!==row.page?"–"+row.pageEnd:"")+"."));
 const score=Number(row.score);
 if(Number.isFinite(score))card.append($("p","ch-source","Índice técnico de semejanza OCR/trigramas: "+score.toFixed(3)+" / 1. No expresa certeza filológica ni identidad de lecturas."));
 card.append(markedSnippet(row.text,word));
 const deep="concordancia-historica.html?ed="+id+"&page="+row.page+(word?"&q="+encodeURIComponent(word):"");
 card.append(link("Abrir esta página y OCR",deep));
 card.append(link("Examinar facsímil",b.archive+"/page/n"+(row.page-1)+"/mode/1up",true));
 return card;
}
function citation(p,cat){
 const record=cat.editions.find(x=>x.id==="recensio-es")||{};
 const doi=record.doi?" DOI: "+record.doi+".":"";
 return "Vitruvio, De architectura "+p.locus+"; texto de referencia en Diego A. Kurilo, Recensio V514 (2026)."+doi+
 " Localización comparativa: Fritz Krohn, Vitruvii De architectura libri decem (Leipzig: Teubner, 1912), y Valentin Rose, Vitruvii De architectura libri decem, 2.ª ed. (Leipzig: Teubner, 1899)."+
 " Correspondencias de página obtenidas por OCR y trigramas; cotejar el facsímil antes de citar una variante. "+canon+"?locus="+encodeURIComponent(p.locus);
}
async function render(locus){
 const n=++serial;result.replaceChildren();status.textContent="Consultando textos y correspondencias documentadas…";
 if(!/^(?:[1-9]|10)\.(?:praef|\d+)\.\d+$/.test(locus)){status.textContent="Introducí un locus completo: por ejemplo 1.praef.1 o 1.2.4.";return}
 try{
  const data=await load();if(n!==serial)return;
  const p=data.edition.passages.find(x=>x.locus===locus);
  if(!p){status.textContent="Locus "+locus+" no registrado en la segmentación V514. No se deduce una omisión de las otras ediciones.";return}
  const row=data.concordance.loci[locus]||{};
  const heading=$("h3",null,"Vitr. "+locus+" · identidades editoriales y correspondencia de páginas");
  result.append(heading);
  const query=String(new URL(location.href).searchParams.get("q")||"");
  const frame=$("div","ch-editions");
  frame.append(cardV514(p,data.catalog),cardWitness("krohn-1912",row["krohn-1912"],locus,query),cardWitness("rose-1899",row["rose-1899"],locus,query));
  result.append(frame);
  const warning=$("p","ch-locus-disclaimer","Nota ecdótica. Las lecturas latinas de los OCR históricos no se presentan como variantes críticas constituidas. La correspondencia de locus procede de la matriz automática; una evaluación de variantes requiere cotejo del impreso, siglas, localización precisa y justificación de las lecciones.");
  result.append(warning);
  const actions=$("nav","ch-locus-actions");actions.setAttribute("aria-label","Documentación y cita del locus");
  actions.append(link("Scriptorium · triple lector","scriptorium.html?readers=krohn%2Ckurilo%2Crose&locus="+encodeURIComponent(locus)),
  link("Aparato crítico","aparato-critico.html?locus="+encodeURIComponent(locus)),
  link("Aparato comparativo","apparatus-bude.html?locus="+encodeURIComponent(locus)));
  const button=$("button","ch-copy","Copiar referencia y URL");button.type="button";
  button.addEventListener("click",async()=>{
   try{await navigator.clipboard.writeText(citation(p,data.catalog));status.textContent="Referencia bibliográfica copiada."}
   catch{status.textContent="No se pudo copiar automáticamente; seleccioná el texto de la ficha."}
  });actions.append(button);result.append(actions);
  status.textContent="Locus "+locus+" · registro V514 y "+Object.values(row).filter(v=>v?.page).length+" correspondencias históricas de OCR consultadas.";
  const url=new URL(location.href);url.searchParams.set("locus",locus);history.replaceState(null,"",url);
 }catch(e){if(n===serial)status.textContent="No fue posible consultar los registros: "+e.message}
}
form.addEventListener("submit",event=>{event.preventDefault();render(input.value.trim())});
document.getElementById("historical-locus-shortcuts")?.addEventListener("click",event=>{
 const button=event.target.closest("button[data-ch-locus]");if(!button)return;input.value=button.dataset.chLocus;render(input.value);
});
const preset=new URLSearchParams(location.search).get("locus");if(preset&&preset.length<40){input.value=preset;render(preset)}
})();
