/* Edition labels and source-based identifiers for the critical apparatus.
 * Draw from the same authoritative data/catalog.json used by the bilingual
 * reader. Text filters keep their exact original option values.
 */
(()=>{
"use strict";
const select=document.getElementById("apparatus-catalog-edition");
const target=document.getElementById("apparatus-catalog-edition-reference");
if(!select||!target)return;
let items=null,failed=false;
const editions=new Set(["recensio-es","recensio-fr","theory-en"]);
const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);return n};
async function load(){
 const response=await fetch("data/catalog.json",{headers:{Accept:"application/json"}});
 if(!response.ok)throw Error("HTTP "+response.status);
 const data=await response.json();
 if(!Array.isArray(data.editions))throw Error("Catálogo bibliográfico incompleto");
 const map=new Map(data.editions.filter(e=>editions.has(e.id)).map(e=>[e.id,e]));
 if(map.size!==editions.size)throw Error("Falta una ficha bibliográfica de las tres ediciones");
 return map;
}
function show(){
 target.replaceChildren();
 if(failed){
  target.textContent="No se pudo recuperar la ficha bibliográfica; se conservan los identificadores acreditados en el selector.";
  return;
 }
 if(!items){
  target.textContent="Consultando fichas editoriales originales…";
  return;
 }
 const selected=select.value;
 if(!selected){
  target.append(el("strong","Ediciones documentadas · "));
  for(const e of items.values()){
   const line=el("span");
   line.append(el("span",(e.version||e.id)+": "+(e.bibliographic_title||e.title)+". "));
   if(e.doi){
    const a=el("a","DOI "+e.doi);a.href="https://doi.org/"+encodeURI(e.doi);
    a.target="_blank";a.rel="noopener noreferrer";line.append(a);
   }
   line.append(document.createTextNode(" · ISBN "+(e.isbn||"no consignado")+"; "));
   target.append(line);
  }
  target.append(el("small","El ISBN compartido V514/V554 se declara en los paratextos editoriales y requiere corroboración registral independiente. El DOI identifica la edición, no el locus."));
  return;
 }
 const e=items.get(selected);
 if(!e){target.textContent="No se encontró esta edición en el catálogo bibliográfico.";return}
 target.append(el("strong",e.bibliographic_title||e.title),el("span"," · "+
  [e.edition_statement,e.editorial_role||e.bibliographic_author,
   [e.publication_place,e.publisher].filter(Boolean).join(" · "),e.year].filter(Boolean).join(" · ")+" · "));
 target.append(el("span","ISBN: "+(e.isbn||"no consignado")+". "));
 if(e.doi){
  const doi=el("a","DOI: "+e.doi);doi.href="https://doi.org/"+encodeURI(e.doi);
  doi.target="_blank";doi.rel="noopener noreferrer";target.append(doi);
 }
 if(e.isbn_note)target.append(el("small"," · "+e.isbn_note));
 target.append(el("small"," · Identificadores de la edición; no implican paginación del manuscrito ni colación de variantes."));
}
select.addEventListener("change",show);
show();
load().then(r=>{items=r;show()}).catch(()=>{failed=true;show()});
})();
