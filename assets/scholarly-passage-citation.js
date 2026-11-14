/* Bibliotheca / Vitruvia / classical readers: one documentary citation contract.
 * Canonical edition metadata comes from data/catalog.json, not guessed from a
 * platform DOI, a scan, an AI translation or an unrelated edition of the work.
 * A DOI identifies the specific edition, NOT an ancient locus or codex folio.
 * ISO/Chicago-inspired human-readable reference; status explicitly indicates
 * whether edition identifiers are genuinely documented.
 */
(function(root,factory){
 "use strict";
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VitruviusScholarlyPassages=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
 "use strict";
 const IDS=new Set(["recensio-es","recensio-fr","theory-en"]);
 const TRIM=x=>String(x??"").trim();
 const LOCUS=/^(?:[1-9]|10)\.(?:praef|\d+)\.\d+$/;
 const DOI=/^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
 let pending=null;
 function catalog(){
  if(pending)return pending;
  if(typeof fetch!=="function")return Promise.reject(Error("Sin lector del catálogo"));
  pending=fetch("data/catalog.json",{headers:{Accept:"application/json"}})
   .then(r=>{if(!r.ok)throw Error("Metadata HTTP "+r.status);return r.json()})
   .then(x=>{if(!Array.isArray(x.editions))throw Error("Ediciones no registradas");return x.editions})
   .catch(e=>{pending=null;throw e});
  return pending;
 }
 const doiValue=value=>{
  const x=TRIM(value).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,"");
  return DOI.test(x)?x:"";
 };
 function isbn13(value){
  const d=TRIM(value).replace(/[-\s]/g,"");
  if(!/^\d{13}$/.test(d))return false;
  const sum=[...d].slice(0,12).reduce((n,x,i)=>n+Number(x)*(i%2?3:1),0);
  return (10-sum%10)%10===Number(d[12]);
 }
 function toUrl(value){
  if(!value)return "";
  try{
   const u=new URL(String(value),typeof location==="undefined"?
    "https://vitruvius-digital-library.org/":location.href);
   return ["https:","http:"].includes(u.protocol)?u.href:"";
  }catch{return ""}
 }
 function editionFor(row,editions=[]){
  if(row?.workId!=="vitruvius")return null;
  const id=TRIM(row.editionId||row.edition);
  // Latin occurs in three independent recensiones; language alone is insufficient.
  if(!IDS.has(id))return null;
  return editions.find(e=>e.id===id)||null;
 }
 function workCitation(row,work){
  const exactVersion=(work?.localVersions||[]).filter(v=>
   v.language===row.language &&
   typeof v.citationChicago18==="string" && v.citationChicago18.trim() &&
   (!row.edition||v.edition===row.edition||v.id===row.edition));
  if(exactVersion.length===1)return exactVersion[0].citationChicago18.trim();
  const hinted=(TRIM(row.attribution)||TRIM(
   row.language===work?.language?work?.bibliography?.originalEditionCitation:
    work?.bibliography?.translationCitation));
  if(hinted)return hinted;
  return [TRIM(work?.author||row.author||"Autor no identificado"),
   TRIM(work?.title||row.title||"Obra sin título")].join(". ")+".";
 }
 function resolve(row,work=null,editions=[]){
  const r=row||{},edition=editionFor(r,editions);
  const workName=TRIM(work?.title||r.title)||"Obra sin título";
  const originalAuthor=TRIM(work?.author||r.author)||"Autor no documentado";
  const loc=TRIM(r.locus);
  const url=toUrl(r.link||r.url);
  const validLocus=LOCUS.test(loc);
  const locusLabel=validLocus?"Locus editorial":"Localizador digital de la fuente";
  const status=edition?"edicion-documentada":"referencia-parcial";
  const editor=TRIM(edition?.bibliographic_author||"");
  const title=TRIM(edition?.bibliographic_title||edition?.title||workName);
  const isbn=edition?.isbn&&isbn13(edition.isbn)?edition.isbn:"";
  const doi=doiValue(edition?.doi);
  const year=TRIM(edition?.year),publisher=TRIM(edition?.publisher);
  // Never replace the DOI of an edition with the DOI of the platform.
  let bib=edition?
   [editor+".",title+".",TRIM(edition.edition_statement)?TRIM(edition.edition_statement)+".":"",
    [TRIM(edition.publication_place),publisher].filter(Boolean).join(": ")+
    (year?", "+year:"")+".",
    doi?"https://doi.org/"+doi+".":"",
    isbn?"ISBN "+isbn+".":""].filter(Boolean).join(" "):
    workCitation(r,work);
  const scope=edition?"Texto latino o traducción editorial de "+edition.version+
   "; no es transcripción diplomática ni cotejo de un códice.":
   "Referencia de edición digital; no consta aquí un DOI/ISBN verificable de esta edición. "+
   "No se presupone lectura de códice, coincidencia entre traducciones ni paginación impresa.";
  const note=edition?.isbn_note||"";
  const cite=[
   bib,
   loc?locusLabel+": "+loc+".":"Sin locus individual documentado.",
   TRIM(r.source)?"Fuente textual consultada: "+TRIM(r.source)+".":"",
   url?"Enlace a pasaje/lector: "+url+".":"",
   note?"Advertencia sobre ISBN: "+note:"",
   scope
  ].filter(Boolean).join("\n");
  return Object.freeze({citation:cite,bibliography:bib,doi,isbn,title,version:edition?.version||TRIM(r.edition),
   publisher,year,editor,author:originalAuthor,locus:loc,locusLabel,url,
   level:status,notice:scope,isbnNote:note,workId:TRIM(r.workId),editionId:edition?.id||"",
   source:TRIM(r.source)});
 }
 async function citation(row,work){
  const editions=await catalog().catch(()=>[]);
  return resolve(row,work,editions);
 }
 function render(host,row,work,options={}){
  if(!host||!row)return null;
  const target=options.metaTarget||host;
  const metadata=document.createElement("p");
  metadata.className=options.metadataClass||"meta";
  metadata.dataset.academicCitation="pending";
  metadata.textContent="Referencia editorial · verificando los identificadores declarados…";
  target.append(metadata);
  const actions=options.actionsTarget||host;
  const button=document.createElement("button");
  button.type="button";button.className=options.buttonClass||"passage-action";
  button.textContent=options.language==="en"?"Copy academic citation":
   options.language==="fr"?"Copier citation académique":"Copiar cita académica";
  button.disabled=true;
  button.setAttribute("aria-label","Copiar referencia académica con obra, edición, locus, DOI e ISBN disponibles");
  actions.append(button);
  let result=null;
  const promise=citation(row,work).then(data=>{
   if(!metadata.isConnected||!button.isConnected)return data;
   result=data;
   metadata.dataset.academicCitation=data.level;
   metadata.textContent=data.level==="edicion-documentada"?
    [data.title,data.version,data.locus?data.locusLabel+" "+data.locus:"",
     data.doi?"DOI "+data.doi:"",data.isbn?"ISBN "+data.isbn:"ISBN no documentado"].filter(Boolean).join(" · "):
    [data.bibliography,data.locus?data.locusLabel+" "+data.locus:"",
     "Identificadores de esta edición: consultar ficha bibliográfica"].filter(Boolean).join(" · ");
   metadata.title=data.notice+(data.isbnNote?" "+data.isbnNote:"");
   button.disabled=false;
   return data;
  }).catch(()=>{metadata.textContent="Referencia parcial · metadatos editoriales temporalmente inaccesibles";button.disabled=false;});
  button.addEventListener("click",async()=>{
   const data=result||await promise||resolve(row,work);
   const text=data.citation||resolve(row,work).citation;
   try{
    if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    button.textContent=options.language==="en"?"Copied":options.language==="fr"?"Copié":"Cita copiada";
   }catch{if(typeof window!=="undefined"&&typeof window.prompt==="function")window.prompt("Cita para copiar:",text)}
  });
  return {metadata,button,promise};
 }
 return {catalog,citation,resolve,render,doiValue,isbn13,editionFor,version:"2026-11-13"};
});