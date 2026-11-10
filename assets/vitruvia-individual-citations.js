/* Individual bibliographic export for Vitruvia results.
 * Original documentary text, loci and codex records remain unchanged.
 * Never invent missing edition details, manuscript collation or DOI.
 */
(()=>{
 "use strict";
 const list=document.getElementById("result-list");
 if(!list)return;
 const plain=x=>String(x??"").replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim();
 const clean=x=>plain(x).replace(/[{}\\]/g,"");
 const safeUrl=x=>{const v=plain(x);return /^https:\/\/[^\s]+$/i.test(v)||/^[a-z0-9/_-]+\.html(?:[?#][^\s]*)?$/i.test(v)?v:""};
 const isoYear=x=>/^\d{4}$/.test(plain(x))?plain(x):"";
 function fields(r){
  const exporter=window.VitruviaScholarlyExport;
  if(!exporter?.canCite(r))return null;
  return {author:plain(r.author),title:plain(r.title),year:isoYear(r.year),publisher:plain(r.publisher),
   journal:plain(r.journal),doi:exporter.doi(r.doi),url:safeUrl(r.link||r.viewerUrl||r.codexViewer),
   locus:plain(r.locus),workId:plain(r.workId),edition:plain(r.edition),shelfmark:plain(r.codexShelfmark||r.shelfmark),
   type:r.type==="article"?"article":r.type==="manuscript"?"misc":"book"};
 }
 function bibtex(d){
  const id=[d.author.split(" ")[0]||"Fuente",d.year||"sf",d.workId||d.locus||d.title].join("-");
  const key=id.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9:.-]/g,"").slice(0,80)||"Fuente";
  const tags=[["author",d.author],["title",d.title],["year",d.year],["publisher",d.publisher],["journal",d.journal],
   ["doi",d.doi],["url",d.url],["note",[d.locus&&"Locus: "+d.locus,d.edition&&"Edición: "+d.edition,d.shelfmark&&"Signatura: "+d.shelfmark].filter(Boolean).join("; ")]];
  return "@"+d.type+"{"+key+",\n"+tags.filter(x=>x[1]).map(([k,v])=>"  "+k+" = {"+clean(v)+"}").join(",\n")+"\n}\n";
 }
 function ris(d){
  const ty=d.type==="article"?"JOUR":d.shelfmark?"GEN":"BOOK";
  const tags=[["TY",ty],["AU",d.author],["TI",d.title],["PY",d.year],["PB",d.publisher],["JO",d.journal],
   ["DO",d.doi],["UR",d.url],["N1",[d.locus&&"Locus: "+d.locus,d.edition&&"Edición: "+d.edition,d.shelfmark&&"Signatura: "+d.shelfmark].filter(Boolean).join("; ")],["ER",""]];
  return tags.filter(([k,v])=>k==="ER"||v).map(([k,v])=>k+"  - "+plain(v)).join("\r\n")+"\r\n";
 }
 function download(name,contents,mime){
  const object=URL.createObjectURL(new Blob([contents],{type:mime}));
  const a=document.createElement("a");a.href=object;a.download=name;a.style.display="none";document.body.append(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(object)},1000);
 }
 function label(fmt){
  const l=(document.documentElement.lang||"es").slice(0,2);
  return (l==="en"?"Export":l==="fr"?"Exporter":"Exportar")+" "+fmt;
 }
 function decorate(){
  for(const card of list.querySelectorAll(".result-card:not([data-vdl-citation-export])")){
   const d=fields(card._vitruviaRecord);
   if(!card._vitruviaRecord)continue;
   card.dataset.vdlCitationExport="1";
   if(!d)return;
   const actions=card.querySelector(".actions");if(!actions)return;
   for(const [extension,method,mime,formatter] of [["bib","BibTeX","application/x-bibtex",bibtex],["ris","RIS","application/x-research-info-systems",ris]]){
    const button=document.createElement("button");button.type="button";button.className="citation-copy";
    button.textContent=label(method);
    button.title="Exportación automática de metadatos; verificar edición y localizador antes de publicar";
    button.addEventListener("click",()=>download("vitruvia-cita."+extension,formatter(d),mime));
    actions.append(button);
   }
  }
 }
 let scheduled=false;
 new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;decorate()})})
  .observe(list,{childList:true,subtree:true});
 decorate();
})();
