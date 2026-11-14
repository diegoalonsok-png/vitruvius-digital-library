/* Scriptorium references: edition identifiers never stand in for a locus,
 * manuscript or scan. Catalog metadata is shared with the other readers. */
(function(root,factory){
 "use strict";
 const api=factory(root);
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root?.document)root.ScriptoriumScholar=api;
})(typeof window!=="undefined"?window:null,function(root){
 "use strict";
 const CANONICAL="https://vitruvius-digital-library.org/scriptorium";
 const ALIASES={kurilo:"recensio-es",fr:"recensio-fr",en:"theory-en",krohn:"krohn-1912",rose:"rose-1899","pdf:krohn":"krohn-1912","pdf:rose-1899":"rose-1899","pdf:ortiz-1787":"ortiz-1787","own:recensio-es":"recensio-es","own:recensio-fr":"recensio-fr","own:theory-en":"theory-en"};
 const HISTORICAL={
  "krohn-1912":{title:"Vitruvii De architectura libri decem",editor:"Fritz Krohn",place:"Leipzig",publisher:"B. G. Teubner",year:"1912",version:"Krohn 1912",reference:"https://archive.org/details/vitruviidearchit00vitr",pdf:"https://archive.org/download/vitruviidearchit00vitr/vitruviidearchit00vitr.pdf"},
  "rose-1899":{title:"Vitruvii De architectura libri decem",editor:"Valentin Rose",place:"Leipzig",publisher:"B. G. Teubner",year:"1899",version:"Rose 1899 · 2.ª edición",reference:"https://archive.org/details/vitruviidearchit00vitr_0",pdf:"https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf"},
  "ortiz-1787":{title:"Los diez libros de architectura de M. Vitruvio Polión",editor:"Joseph Ortiz y Sanz",role:"Traducción y notas",place:"Madrid",publisher:"Imprenta Real",year:"1787",version:"Ortiz y Sanz 1787",reference:"https://archive.org/details/A065112",pdf:"https://archive.org/download/A065112/A065112.pdf"}
 };
 const clean=v=>String(v??"").trim();
 const resolveId=id=>ALIASES[id]||clean(id);
 const doiValue=value=>{const v=clean(value).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,"");return /^10\.\d{4,9}\/\S+$/i.test(v)?v:""};
 function isbnValid(value){const s=clean(value).replace(/[-\s]/g,"");if(!/^\d{13}$/.test(s))return false;return (10-[...s.slice(0,12)].reduce((a,v,i)=>a+Number(v)*(i%2?3:1),0)%10)%10===Number(s[12])}
 function record(id,catalog={}){
  id=resolveId(id);
  const e=(catalog.editions||[]).find(e=>e.id===id);
  const h=HISTORICAL[id];
  if(h)return {...h,id,author:"Vitruvio",role:h.role||"Edición del texto latino",doi:"",isbn:"",isbnVerified:false,historical:true,status:"OCR no corregido; la cita textual debe comprobarse en el facsímil.",rights:"Texto histórico en dominio público; consultar las condiciones de la reproducción en el repositorio de origen."};
  if(!e)return {id,title:"Referencia editorial no disponible",author:"Autor pendiente de documentar",partial:true,status:"Metadatos temporalmente inaccesibles. Identificadores no completados por inferencia."};
  const modern=["recensio-es","recensio-fr","theory-en"].includes(id);
  const isbn=isbnValid(e.isbn)?e.isbn:"";
  return {id,title:clean(e.bibliographic_title||e.title).replace(/^(?:Vitruvio|Vitruve)\.\s*/i,""),author:id==="theory-en"?"Kurilo, Diego A.":"Vitruvio",editor:modern?"Diego A. Kurilo":clean(e.editor),role:id==="theory-en"?"Edición, traducción y comentario":"Edición y traducción",place:clean(e.publication_place),publisher:clean(e.publisher),year:clean(e.year),version:clean(e.version),statement:clean(e.edition_statement),doi:doiValue(e.doi),isbn,isbnVerified:false,
   isbnNote:isbn?(clean(e.isbn_note)||"ISBN declarado por el editor; verificación registral pendiente."):"ISBN no documentado para esta edición.",
   reference:clean(e.doi_metadata_source||e.source_url),pdf:clean(e.pdf_url||e.pdf||e.read_url),
   status:"Edición indexada por loci; la localización digital no certifica una colación del manuscrito.",
   rights:"El depósito de esta edición en Zenodo declara todos los derechos reservados sobre sus aportes editoriales. El texto latino antiguo pertenece al dominio público.",
   rightsNote:id==="theory-en"?"El inventario bibliográfico también declara CC BY-SA 4.0: existe una discrepancia de licencia pendiente de resolución editorial.":""};
 }
 function passageURL(context={},base=CANONICAL){
  const u=new URL(base),params=u.searchParams;
  if(context.editionId)params.set("edition",resolveId(context.editionId));
  if(context.locus&&/^(?:[1-9]|10)\.(?:praef|\d+)\.\d+$/.test(context.locus))params.set("locus",context.locus);
  const source={"recensio-es":"own:recensio-es","recensio-fr":"own:recensio-fr","theory-en":"own:theory-en","krohn-1912":"pdf:krohn","rose-1899":"pdf:rose-1899","ortiz-1787":"pdf:ortiz-1787"}[resolveId(context.editionId)];
  if(source)params.set("source",source);
  if(Number.isInteger(Number(context.page))&&Number(context.page)>0)params.set("page",String(context.page));
  if(context.translation)params.set("translation","1");
  u.hash=context.readerOnly?"script-facsimile":"script-triple";
  return u.href;
 }
 function locationText(c={}){
  const parts=[];
  if(c.locus)parts.push("locus "+c.locus);
  if(c.page)parts.push("página digital "+c.page+(c.pageEnd&&c.pageEnd!==c.page?"–"+c.pageEnd:""));
  if(c.printedPage)parts.push("página impresa "+c.printedPage);
  return parts.join(" · ");
 }
 function bibliography(r){
  return [r.author+(r.author.endsWith('.')?'':'.'),r.title+".",r.editor&&r.author!=="Kurilo, Diego A."?(r.role+": "+r.editor+"."):"",r.statement?r.statement+".":r.version?r.version+".":"",[r.place,r.publisher].filter(Boolean).join(": ")+(r.year?", "+r.year:"")+".",r.doi?"https://doi.org/"+r.doi+".":""].filter(v=>v&&v!==".").join(" ");
 }
 function citation(r,c={}){
  return [bibliography(r),r.isbn?"ISBN declarado: "+r.isbn+".":"",locationText(c)?"Pasaje consultado: "+locationText(c)+".":"",c.translation?"Cita de la traducción editorial.":"",r.historical?"Texto de búsqueda procedente de OCR sin corregir; verificar la lectura en el facsímil.":"",passageURL({...c,editionId:r.id}),r.isbn&&!r.isbnVerified?r.isbnNote:"",r.partial?r.status:""].filter(Boolean).join("\n");
 }
 function ris(r,c={}){
  const lines=["TY  - BOOK","AU  - "+r.author,"TI  - "+r.title];
  if(r.editor)lines.push("ED  - "+r.editor);
  if(r.year)lines.push("PY  - "+r.year);
  if(r.publisher)lines.push("PB  - "+r.publisher);
  if(r.place)lines.push("CY  - "+r.place);
  if(r.version)lines.push("ET  - "+r.version);
  if(r.doi)lines.push("DO  - "+r.doi);
  if(r.isbn&&r.isbnVerified)lines.push("SN  - "+r.isbn);
  lines.push("UR  - "+passageURL({...c,editionId:r.id}));
  for(const note of [r.role,locationText(c),r.status,r.isbn&&!r.isbnVerified?"ISBN declarado: "+r.isbn+". "+r.isbnNote:"",r.rightsNote])if(note)lines.push("N1  - "+note.replace(/[\r\n]+/g," "));
  lines.push("ER  - ","");return lines.join("\r\n");
 }
 function bibtex(r,c={}){
  const esc=v=>clean(v).replace(/\\/g,"\\textbackslash{}").replace(/[{}]/g,v=>"\\"+v).replace(/[\r\n]+/g," ");
  const fields={author:r.author,title:r.title,editor:r.editor,year:r.year,publisher:r.publisher,address:r.place,edition:r.version,doi:r.doi,url:passageURL({...c,editionId:r.id}),note:[r.role,locationText(c),r.status,r.isbn&&!r.isbnVerified?"ISBN declarado: "+r.isbn+"; asignación pendiente de verificación":""].filter(Boolean).join(". ")};
  if(r.isbn&&r.isbnVerified)fields.isbn=r.isbn;
  return "@book{vitruvius_"+r.id.replace(/[^a-z0-9]/gi,"_")+",\n"+Object.entries(fields).filter(([,v])=>v).map(([k,v])=>"  "+k+" = {"+esc(v)+"}").join(",\n")+"\n}\n";
 }
 let pending=null;
 function catalog(){if(!pending)pending=root.fetch("data/catalog.json").then(r=>{if(!r.ok)throw Error("Catálogo HTTP "+r.status);return r.json()}).catch(e=>{pending=null;throw e});return pending}
 const el=(tag,text)=>{const n=root.document.createElement(tag);if(text!=null)n.textContent=text;return n};
 async function copy(text,button){
  try{await root.navigator.clipboard.writeText(text);button.textContent="Copiado";root.setTimeout(()=>{if(button.isConnected)button.textContent=button.dataset.label||"Copiar"},1800)}
  catch{const dialog=root.document.getElementById("script-citation-dialog");const field=root.document.getElementById("script-citation-text");if(dialog&&field){field.value=text;if(!dialog.open)dialog.showModal();field.focus();field.select()}}
 }
 function download(text,type,filename){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=el("a");a.href=url;a.download=filename;a.click();root.setTimeout(()=>URL.revokeObjectURL(url),1000)}
 function openCitation(r,c={}){
  const dialog=root.document.getElementById("script-citation-dialog"),field=root.document.getElementById("script-citation-text");if(!dialog||!field)return;
  root.document.getElementById("script-citation-title").textContent="Citar · "+(r.version||r.title);
  field.value=citation(r,c);
  root.document.getElementById("script-citation-notice").textContent=[r.status,r.isbnNote,r.rightsNote].filter(Boolean).join(" ");
  const set=(id,label,fn)=>{const old=root.document.getElementById(id),b=old.cloneNode(true);old.replaceWith(b);b.textContent=label;b.dataset.label=label;b.addEventListener("click",fn.bind(null,b))};
  set("script-citation-copy","Copiar cita",b=>copy(field.value,b));
  set("script-citation-ris","Descargar RIS",()=>download(ris(r,c),"application/x-research-info-systems;charset=utf-8","vitruvius-"+r.id+".ris"));
  set("script-citation-bib","Descargar BibTeX",()=>download(bibtex(r,c),"application/x-bibtex;charset=utf-8","vitruvius-"+r.id+".bib"));
  set("script-citation-link","Copiar enlace al pasaje",b=>copy(passageURL({...c,editionId:r.id}),b));
  if(!dialog.open)dialog.showModal();field.focus();
 }
 function mount(host,getContext,{compact=false}={}){
  if(!host||!root)return {refresh(){}};
  let last="",seq=0,current=null;
  async function refresh(){const context=getContext(),id=resolveId(context.editionId);if(last===id&&current)return;last=id;const request=++seq;host.replaceChildren(el("small","Consultando ficha bibliográfica…"));
   let data;try{data=await catalog()}catch{data={}}
   if(request!==seq||!host.isConnected)return;current=record(id,data);host.replaceChildren();
   const line=el("p",bibliography(current));line.className="script-bibliography notranslate";line.translate=false;host.append(line);
   const ids=el("div");ids.className="script-identifiers notranslate";ids.translate=false;
   if(current.doi){const a=el("a","DOI "+current.doi);a.href="https://doi.org/"+current.doi;a.target="_blank";a.rel="noopener noreferrer";ids.append(a)}else ids.append(el("span","DOI de esta edición no documentado"));
   ids.append(el("span",current.isbn?"ISBN declarado "+current.isbn:"ISBN no documentado"));host.append(ids);
   const details=el("details"),summary=el("summary","Procedencia, identificadores y derechos");details.append(summary,el("p",current.status));
   if(current.isbnNote)details.append(el("p",current.isbnNote));
   if(current.reference){const a=el("a","Consultar el registro de la fuente ↗");a.href=current.reference;a.target="_blank";a.rel="noopener noreferrer";details.append(a)}
   details.append(el("p",current.rights||"Derechos pendientes de documentar."));
   if(current.rightsNote)details.append(el("p",current.rightsNote));host.append(details);
   const actions=el("div");actions.className="script-citation-actions";const cite=el("button","Citar este pasaje");cite.type="button";cite.addEventListener("click",()=>openCitation(current,getContext()));actions.append(cite);
   const link=el("a",compact?"Enlace al pasaje":"Abrir enlace permanente al pasaje");link.href=passageURL({...getContext(),editionId:id});link.addEventListener("click",()=>{link.href=passageURL({...getContext(),editionId:id})});actions.append(link);host.append(actions);
  }
  refresh();return {refresh,updateLink(){const a=host.querySelector('.script-citation-actions a');if(a)a.href=passageURL(getContext())}};
 }
 if(root?.document){root.document.addEventListener("DOMContentLoaded",()=>{
  root.document.getElementById("script-citation-close")?.addEventListener("click",()=>root.document.getElementById("script-citation-dialog").close());
  root.document.getElementById("script-compare-link")?.addEventListener("click",function(){const u=new URL(root.location.href);u.protocol="https:";u.host="vitruvius-digital-library.org";u.pathname="/scriptorium";u.hash="script-triple";this.dataset.label="Copiar comparación";copy(u.href,this)});
 })}
 return {record,resolveId,doiValue,isbnValid,passageURL,locationText,bibliography,citation,ris,bibtex,catalog,mount,openCitation};
});
