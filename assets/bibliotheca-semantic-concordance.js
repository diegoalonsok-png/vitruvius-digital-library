/* Bibliotheca: verified Conceptus concordance explorer backed by local inverted postings.
   Editorial semantic equivalence means only terms attested in a specific text/locus.
   It is not embedding-based interpretation, automatic lemmatization, or critical collation. */
(()=>{"use strict";
const panel=document.getElementById("classic-concept-browser");
if(!panel)return;
const q=panel.querySelector("#classic-concept-filter"),
concept=panel.querySelector("#classic-concept-picker"),
language=panel.querySelector("#classic-concept-language"),
works=panel.querySelector("#classic-concept-results"),
status=panel.querySelector("#classic-concept-status"),
summary=panel.querySelector("#classic-concept-summary");
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
const labels={la:"Latín",grc:"Griego",en:"Inglés",es:"Castellano",fr:"Francés",it:"Italiano",de:"Alemán",pt:"Portugués"};
let source=null,conceptList=[],catalogue=[],displayLimit=14,expanded=new Map;
function linkFor(v,locus,term){
 if(v.workId==="vitruvius"){
  // Keep a verified structured edition in its documented reader;
  // do not claim corresponding segments in separate editions.
  const entry=catalogue.find(e=>e.workId==="vitruvius"&&e.path===v.source&&e.language===v.language);
  if(entry?.reader)return entry.reader+(entry.reader.includes("?")?"&":"?")+"locus="+encodeURIComponent(locus)+"&q="+encodeURIComponent(term);
  return "scriptorium.html";
 }
 const entry=catalogue.find(e=>e.workId===v.workId&&e.path===v.source&&e.language===v.language);
 const base=entry?.reader||("classics-text-reader.html?work="+encodeURIComponent(v.workId)+"&lang="+encodeURIComponent(v.language));
 return base+(base.includes("?")?"&":"?")+"locus="+encodeURIComponent(locus)+"&q="+encodeURIComponent(term);
}
function selectConcept(){
 const value=fold(q.value.trim());
 const matches=conceptList.filter(c=>!value||fold([c.id,...Object.values(c.modern||{}).flat(),...(c.la||[]),...(c.grc||[])].join(" ")).includes(value));
 const prior=concept.value;
 concept.replaceChildren();
 for(const c of matches){
  const opt=document.createElement("option");opt.value=c.id;
  opt.textContent=(c.modern?.es?.[0]||c.id)+" · "+c.id;concept.append(opt);
 }
 if(matches.some(c=>c.id===prior))concept.value=prior;
 else if(matches.length)concept.value=matches[0].id;
 displayLimit=14;
 render();
}
function render(){
 if(!source)return;
 const id=concept.value,lang=language.value;
 const rows=source.versions.flatMap(v=>{
  if(lang!=="all"&&v.language!==lang)return[];
  const found=v.concepts.find(c=>c.concept===id);
  if(!found||!found.count||!found.loci.length)return[];
  return[{v,found}];
 }).sort((a,b)=>b.found.count-a.found.count||a.v.workId.localeCompare(b.v.workId));
 const total=rows.reduce((n,r)=>n+r.found.count,0);
 works.replaceChildren();
 if(!id){status.textContent="No hay un concepto seleccionado en el filtro.";summary.textContent="";return}
 const languages=new Set(rows.map(r=>r.v.language));
 summary.textContent=total.toLocaleString("es-AR")+" coincidencias textuales de Conceptus · "+rows.length+" versiones · "+languages.size+" idioma(s). Los recuentos son por término registrado, sin desambiguación semántica contextual.";
 for(const {v,found} of rows.slice(0,displayLimit)){
  const card=document.createElement("section");card.className="classic-concept-result";
  const entry=catalogue.find(e=>e.workId===v.workId&&e.path===v.source&&e.language===v.language);
  const h=document.createElement("h3");h.textContent=(entry?.author||v.workId)+" · "+(entry?.title||v.workId)+" · "+(labels[v.language]||v.language);
  const desc=document.createElement("p");desc.textContent=found.count+" coincidencias en "+new Set(found.loci.map(l=>l[0])).size+" loci/pasajes indexados · "+v.words.toLocaleString("es-AR")+" palabras en esta versión.";
  const uniqueLoci=new Map;
  for(const [locus,term,n] of found.loci){
   if(!uniqueLoci.has(locus))uniqueLoci.set(locus,{locus,terms:new Map,count:0});
   const point=uniqueLoci.get(locus);point.count+=n;point.terms.set(term,(point.terms.get(term)||0)+n);
  }
  const locators=document.createElement("div");locators.className="classic-concept-loci";
  const locLimit=expanded.get(v.workId+"|"+v.language+"|"+v.source)?uniqueLoci.size:8;
  for(const p of [...uniqueLoci.values()].slice(0,locLimit)){
   const term=[...p.terms.keys()][0],a=document.createElement("a");
   a.href=linkFor(v,p.locus,term);a.textContent="§ "+p.locus+" · "+p.count+" × "+term;
   a.title="Abrir el texto registrado en "+p.locus+"; no implica alineación con traducciones";
   locators.append(a);
  }
  if(uniqueLoci.size>locLimit){
   const more=document.createElement("button");more.type="button";
   more.textContent="Mostrar "+(uniqueLoci.size-locLimit)+" loci más";
   more.addEventListener("click",()=>{expanded.set(v.workId+"|"+v.language+"|"+v.source,true);render()});
   locators.append(more);
  }
  card.append(h,desc,locators);works.append(card);
 }
 if(rows.length>displayLimit){
  const more=document.createElement("button");more.type="button";more.className="classic-concept-more";
  more.textContent="Mostrar más versiones ("+displayLimit+" / "+rows.length+")";
  more.addEventListener("click",()=>{displayLimit+=14;render()});works.append(more);
 }
 status.textContent=rows.length?"Coincidencias confirmadas en el índice estático.":"Sin términos de Conceptus atestiguados en las versiones filtradas; esto no descarta el concepto en otras formas o libros.";
}
Promise.all([
 fetch("data/classics-corpus/semantic-conceptus-postings.json").then(r=>{if(!r.ok)throw Error("Índice HTTP "+r.status);return r.json()}),
 fetch("data/lexicon/conceptus.json").then(r=>{if(!r.ok)throw Error("Diccionario HTTP "+r.status);return r.json()}),
 fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro HTTP "+r.status);return r.json()})
]).then(([idx,lex,reg])=>{
 if(idx.schema!=="vitruvia-classics-semantic-postings-v1"||idx.errors?.length||idx.indexedEditions!==idx.eligibleEditions||idx.registryEditionCount!==reg.entries.length)throw Error("Índice no validado con el registro vigente");
 source=idx;conceptList=lex.concepts;catalogue=reg.entries;
 q.addEventListener("input",selectConcept);concept.addEventListener("change",()=>{displayLimit=14;render()});
 language.addEventListener("change",()=>{displayLimit=14;render()});
 selectConcept();
 status.textContent="Concordancia lista: "+idx.indexedEditions+" versiones de texto y "+idx.dictionaryConcepts+" conceptos documentados.";
}).catch(err=>{status.textContent="No se pudo validar la concordancia: "+err.message+". La búsqueda textual general continúa disponible."});
})();