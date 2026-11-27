/* Keep exact edition URLs available, while opening the existing parallel reader
 * for reading from Vitruvia. Never route unrelated external links. */
(()=>{
"use strict";
function parallelUrl(value,base,editionLanguage="",editionPath=""){
 try{
  const original=new URL(value,base),here=new URL(base);
  if(original.origin!==here.origin||!/(?:^|\/)classics-text-reader(?:\.html)?$/.test(original.pathname))return "";
  const p=original.searchParams,work=p.get("work"),lang=editionLanguage||p.get("lang");
  if(!/^[a-z0-9-]{3,60}$/.test(work||"")||!["la","grc","es","en","fr","it","de","pt"].includes(lang))return "";
  const u=new URL("classics-simple-parallel.html",original.href);
  u.searchParams.set("work",work);
  const isOriginal=["la","grc"].includes(lang);
  u.searchParams.set(isOriginal?"left":"right",lang);
  const edition=editionPath||p.get("edition");
  if(edition)u.searchParams.set(isOriginal?"leftEdition":"rightEdition",edition);
  for(const key of ["locus","q"])if(p.get(key))u.searchParams.set(key,p.get(key));
  if(isOriginal&&["es","en","fr"].includes(p.get("to")))u.searchParams.set("right",p.get("to"));
  return u.href;
 }catch{return ""}
}
window.VitruviaReaderLinks={parallelUrl};
})();