/* Bibliotheca: autonomous translation gap ledger, read-only sources.
 * Interconnects texts, identifiable scholarly external editions and institutional
 * manuscript witnesses. Never upgrades a link to an indexed or collated text.
 */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 const PATHS={
  coverage:"data/classics-corpus/translation-availability-222.json",
  remote:"data/classics-corpus/remote-translations.json",
  witnesses:"data/bibliotheca-testimonia-verified.json"
 };
 const hostAllow=new Set([
  "penelope.uchicago.edu","www.attalus.org","catalog.perseus.tufts.edu",
  "catalog.perseus.org","discovery.ucl.ac.uk","scaife-reader.perseus.tufts.edu"
 ]);
 const status=$("ledger-status"),body=$("ledger-rows"),search=$("filter-text"),
  language=$("filter-language"),type=$("filter-status");
 let full=[],visible=[],remoteEntries=[],witnesses=[];
 const elem=(name,css,text)=>{
  const n=document.createElement(name);if(css)n.className=css;
  if(text!==undefined)n.textContent=String(text);return n;
 };
 const url=value=>{
  try{const u=new URL(String(value||""),location.href);return u.protocol==="https:"?u.href:null}
  catch{return null}
 };
 const a=(label,target,external=false)=>{
  const link=elem("a","",label);
  link.href=target;
  if(external){link.target="_blank";link.rel="noopener noreferrer"}
  return link;
 };
 const languageName={la:"Latín",grc:"Griego"};
 function externalSource(record){
  const box=elem("div","translation-source");
  const metadata=elem("p","source-kind",record.host+" · "+(record.format||"lectura web")+" · comprobado "+record.verifiedIndexOn);
  box.append(metadata);
  const link=url(record.url);
  if(!link)return box;
  const isBib=record.access==="bibliographic-discovery-only";
  const label=isBib?"Ficha de referencia (no texto íntegro)":record.coverage==="partial"?"Leer selección traducida":
   record.coverage==="coverage-to-check"?"Consultar edición externa":"Leer traducción externa";
  box.append(a(label,link,true));
  box.append(elem("small","",record.translator+" · "+record.edition));
  if(record.coverage==="partial"||record.coverage==="coverage-to-check"||isBib)
   box.append(elem("small","warn",record.coverage==="partial"?"Cobertura parcial; no equivale a edición íntegra":
     isBib?"Referencia académica, acceso al texto no acreditado":"Cobertura por loci pendiente de verificar"));
  if(record.note)box.append(elem("small","",record.note));
  if(record.citationChicago18){
   const details=elem("details",""),head=elem("summary","","Cita / ficha editorial (Chicago 18)");
   details.append(head,elem("p","",record.citationChicago18));
   if(record.sourceRecordUrl){
    const ref=url(record.sourceRecordUrl);
    if(ref)details.append(a("Registro de edición",ref,true));
   }
   box.append(details);
  }
  return box;
 }
 function witnessLinks(w){
  const matching=witnesses.filter(x=>Array.isArray(x.workIds)&&x.workIds.includes(w.id));
  const fragment=elem("div","");
  if(!matching.length){fragment.append(elem("small","","Testimonio más antiguo: por investigar en catálogo institucional"));return fragment}
  for(const witness of matching.slice(0,2)){
   const label=[witness.shelfmark,witness.date].filter(Boolean).join(" · ");
   fragment.append(elem("small","",label+" · testimonio documentado; no necesariamente el más antiguo"));
   const m=url(witness.manifest),official=url(witness.viewer||witness.record);
   if(m){
    const viewer=new URL("visor-codex.html",location.href);
    viewer.searchParams.set("manifest",m);
    viewer.searchParams.set("title",witness.title||witness.shelfmark||"Testimonio");
    if(official)viewer.searchParams.set("official",official);
    fragment.append(a("Ver códice en visor",viewer.href));
   }else if(official)fragment.append(a("Ficha institucional del testimonio",official,true));
  }
  return fragment;
 }
 function getRemote(w){return remoteEntries.filter(x=>x.workId===w.id&&x.language!=="la"&&x.language!=="grc")}
 function hasReading(w){return getRemote(w).some(x=>x.access!=="bibliographic-discovery-only")}
 function hasPartial(w){return getRemote(w).some(x=>x.coverage==="partial"||x.coverage==="coverage-to-check"||x.access==="bibliographic-discovery-only")}
 function filter(w){
  const q=search.value.toLocaleLowerCase("es").trim();
  const rows=getRemote(w);
  const searchable=[w.author,w.title,w.id,...rows.flatMap(x=>[x.translator,x.edition,x.host])].join(" ").toLocaleLowerCase("es");
  if(q&&!searchable.includes(q))return false;
  if(language.value&&language.value!==w.originalLanguage)return false;
  switch(type.value){
   case "original-indexed":return Boolean(w.originalIndexed);
   case "original-missing":return !w.originalIndexed;
   case "external-readable":return hasReading(w);
   case "external-partial":return hasPartial(w);
   case "external-missing":return rows.length===0;
   default:return true;
  }
 }
 function renderRow(w){
  const tr=elem("tr","");
  const first=elem("td","");
  first.append(elem("span","title",w.title),elem("small","",w.author),elem("small","",w.id));
  const lang=elem("td","",languageName[w.originalLanguage]||w.originalLanguage||"—");
  const state=elem("td","");
  state.append(elem("span","status",w.originalIndexed?"Original indexado en Bibliotheca":"Original no indexado"),
    elem("small","",w.originalIndexed?"La presencia digital no equivale a cotejo manuscrito":"Prioridad adicional: localizar y editar el original griego/latino"));
  const sources=elem("td","");
  const rows=getRemote(w);
  if(rows.length)rows.forEach(x=>sources.append(externalSource(x)));
  else {
   sources.append(elem("span","status","Traducción externa aún no identificada con procedencia verificable"),
    elem("small","","Buscar ediciones académicas o PDF bibliotecarios; confirmar derechos, traductor y cobertura antes de vincular."));
   // Discovery destinations are NOT work-specific attestations and do not count as translations.
   const discovery=elem("nav","");
   discovery.append(a("Catálogo Perseus · buscar edición","https://catalog.perseus.tufts.edu/",true),
    a("Scaife (Tufts) · explorar textos","https://scaife-reader.perseus.tufts.edu/",true));
   sources.append(discovery);
  }
  const links=elem("td","");
  const nav=elem("nav","");
  if(w.originalIndexed){
   const inner=new URL("bibliotheca-graeca-latina.html",location.href);
   inner.searchParams.set("work",w.id);
   nav.append(a("Buscar original",inner.href));
  }
  nav.append(a("Lexicon","vitruvia-lexicon.html"),a("Index locorum","index-locorum.html"));
  links.append(nav,witnessLinks(w));
  tr.append(first,lang,state,sources,links);
  return tr;
 }
 function rerender(){
  visible=full.filter(filter).sort((a,b)=>a.author.localeCompare(b.author,"es")||a.title.localeCompare(b.title,"es"));
  const frag=document.createDocumentFragment();
  for(const w of visible)frag.append(renderRow(w));
  body.replaceChildren(frag);
  status.textContent=visible.length+" obras visibles de "+full.length+
   " sin traducción alojada. Lecturas externas: "+visible.filter(hasReading).length+
   ". Referencias externas parciales o solo bibliográficas: "+visible.filter(hasPartial).length+".";
 }
 function csv(){
  const header=["id","author","title","originalLanguage","originalIndexed","externalCoverage","translator","edition","externalURL","citationChicago18"];
  const quote=v=>'"'+String(v===undefined||v===null?"":v).replace(/"/g,'""').replace(/\r?\n/g," ")+'"';
  const rows=visible.map(w=>{
   const rs=getRemote(w);
   return [w.id,w.author,w.title,w.originalLanguage,w.originalIndexed,
    rs.map(x=>x.coverage||x.access).join("; "),rs.map(x=>x.translator).join("; "),
    rs.map(x=>x.edition).join("; "),rs.map(x=>x.url).join("; "),
    rs.map(x=>x.citationChicago18||"").join("; ")].map(quote).join(",");
  });
  const content="\uFEFF"+header.map(quote).join(",")+"\n"+rows.join("\n")+"\n";
  const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
  const href=URL.createObjectURL(blob);
  const link=document.createElement("a");link.href=href;link.download="bibliotheca-traducciones-pendientes.csv";
  document.body.append(link);link.click();link.remove();URL.revokeObjectURL(href);
 }
 async function get(path){
  const response=await fetch(path,{cache:"no-store"});
  if(!response.ok)throw Error(path+": HTTP "+response.status);
  return response.json();
 }
 async function load(){
  try{
   const [data,remote,manuscripts]=await Promise.all([get(PATHS.coverage),get(PATHS.remote),get(PATHS.witnesses)]);
   if(data.schema!=="vitruvius-classics-translation-availability-v1"||
    data.totals?.cataloguedWorks!==data.works?.length||
    remote.schema!=="vitruvius-classics-remote-translations-v1"||!Array.isArray(remote.entries)||
    !Array.isArray(manuscripts.records))throw Error("Esquemas de fuentes incompatibles");
   const verifiedRemote=remote.entries.every(x=>{
    const u=url(x.url);return u&&hostAllow.has(new URL(u).hostname)&&
     x.workId&&x.translator&&x.edition&&x.status==="external-only"&&x.indexedLocally===false;
   });
   if(!verifiedRemote)throw Error("Un enlace externo no cumple la lista de fuentes controladas");
   remoteEntries=remote.entries;witnesses=manuscripts.records;
   full=data.works.filter(w=>!Array.isArray(w.translationLanguages)||w.translationLanguages.length===0);
   if(full.length!==data.totals.worksWithoutHostedTranslation)throw Error("Recuento de traducciones desactualizado");
   $("stat-total").textContent=data.works.length;
   $("stat-missing").textContent=full.length;
   $("stat-original").textContent=full.filter(w=>w.originalIndexed).length;
   $("stat-linked").textContent=full.filter(w=>getRemote(w).length).length;
   rerender();
  }catch(error){
   status.textContent="No se pudo acreditar la integridad del inventario: "+error.message+
    ". No se presenta una cobertura supuestamente completa a partir de datos parciales.";
  }
 }
 for(const control of [search,language,type])control.addEventListener(control===search?"input":"change",()=>{if(full.length)rerender()});
 $("export-csv").addEventListener("click",()=>{if(full.length)csv()});
 load();
})();
