/* Vitruvia: exportación filológica basada EXCLUSIVAMENTE en metadatos recibidos.
 * Chicago 18 (bibliografía, texto plano), índice CSV de resultados y loci.
 * No genera lecturas, loci, fechas, ediciones o testimonios supuestos.
 * Sin estilos nuevos ni cambios en la disposición del buscador.
 */
(()=>{
"use strict";
const plain=x=>String(x??"").replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim();
const doi=x=>{
 const value=plain(x).replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,"");
 return /^10\.\d{4,9}\/[-._;()/:A-Z0-9]+$/i.test(value)?value:"";
};
const url=x=>{
 const value=plain(x);
 if(/^https:\/\/[^/\s]+(?:[/?#][^\s]*)?$/i.test(value))return value;
 if(/^[a-z0-9][a-z0-9/_-]*\.html(?:[?#][^\s]*)?$/i.test(value))return value;
 return "";
};
const evidence=row=>{
 const r=row||{};
 if(r.type==="manuscript"&&(r.codexShelfmark||r.shelfmark)&&
    (r.codexRepository||r.repository||r.author)&&url(r.link||r.viewerUrl||r.codexViewer))
  return "manuscript-record";
 if(r.type==="article"&&plain(r.title)&&doi(r.doi))return "doi-record";
 if(r.kind==="classic-text"&&r.workId&&r.locus&&url(r.link)&&plain(r.title))
  return "text-index";
 if(["book","edition","openlibrary"].includes(r.type)&&plain(r.title)&&
    (r.year||r.publisher)&&url(r.link))return "bibliographic-record";
 return "";
};
const citation=row=>{
 const r=row||{},type=evidence(r);
 if(!type)return "";
 const title=plain(r.title),author=plain(r.author),link=url(r.link||r.viewerUrl||r.codexViewer);
 const year=/^\d{4}$/.test(String(r.year||""))?String(r.year):"";
 if(type==="doi-record"){
  const vol=plain(r.volume),issue=plain(r.issue),pages=plain(r.pages);
  const venue=plain(r.journal);
  const series=venue+(vol?" "+vol:"")+(issue?", núm. "+issue:"")+(year?" ("+year+")":"")+(pages?": "+pages:"");
  return [author?author+".":"", "“"+title+".”", series?(series+"."):"Registro bibliográfico con DOI.",
   "https://doi.org/"+doi(r.doi)+"."].filter(Boolean).join(" ");
 }
 if(type==="manuscript-record"){
  const shelfmark=plain(r.codexShelfmark||r.shelfmark),
        repository=plain(r.codexRepository||r.repository||r.author);
  return [repository?repository+".":"",shelfmark+".",title? "“"+title+".”":"",link+"."].filter(Boolean).join(" ");
 }
 if(type==="text-index"){
  // Los segmentos técnicos de la búsqueda no son siempre divisiones críticas.
  const loc=plain(r.locus),language=plain(r.language);
  return [author?author+".":"",title+".","Registro textual digital; localizador proporcionado por la fuente: "+loc+".",
    language?"Idioma: "+language+".":"",link+"."].filter(Boolean).join(" ");
 }
 // No se añade editorial o fecha si el registro carece de esos datos.
 return [author?author+".":"",title+".",plain(r.publisher)?plain(r.publisher)+".":"",year?year+".":"",
    link+"."].filter(Boolean).join(" ");
};
const canCite=row=>Boolean(evidence(row));
const quote=value=>{
 let s=plain(value);
 // Mitigación de ejecución de fórmulas si el CSV se abre en una hoja de cálculo.
 if(/^[=+@-]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
};
const csv=rows=>{
 const keys=["tipo","clase_documental","autor","titulo","id_obra","locus_declarado","idioma",
  "edicion","testimonio_signatura","doi","anio","url","estado_cotejo"];
 const header=keys.map(quote).join(",");
 const lines=(rows||[]).filter(x=>x&&x.title).map(r=>{
  const kind=evidence(r),shelfmark=plain(r.codexShelfmark||r.shelfmark),
  fields=[
   r.type,kind||"registro recuperado",r.author,r.title,r.workId,
   r.locus,r.language,r.edition,shelfmark,doi(r.doi),r.year,
   url(r.link||r.viewerUrl||r.codexViewer),
   kind==="text-index"?"locus digital; cotejo manuscrito no acreditado":
   kind==="manuscript-record"?"testimonio catalogado; sin colación del texto":
   "metadatos documentales; sin cotejo textual acreditado"
  ];
  return fields.map(quote).join(",");
 });
 return "\uFEFF"+[header,...lines].join("\r\n")+"\r\n";
};
const bibliography=rows=>{
 const seen=new Set(),out=[];
 for(const r of rows||[]){
  if(!canCite(r))continue;
  const key=doi(r.doi)||url(r.link||r.viewerUrl||r.codexViewer)||[r.workId,r.locus,r.title].join("|");
  if(seen.has(key))continue;seen.add(key);
  out.push(citation(r));
 }
 return out.join("\n\n")+"\n";
};
window.VitruviaScholarlyExport={citation,canCite,bibliography,csv,doi,evidence,version:"1.0"};
})();