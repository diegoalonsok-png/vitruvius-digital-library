/* Bibliographic details live below concise academic-edition filters.
 * One source of truth: data/catalog.json. Preserve option values and filters.
 * Never confuse the DOI of a modern edition with that of a manuscript locus.
 */
(()=>{
"use strict";
const mappings={
 "critical-unified-edition":{"recensio-es":"recensio-es","recensio-fr":"recensio-fr","theory-en":"theory-en"},
 "critical-edition":{"recensio-es":"recensio-es","recensio-fr":"recensio-fr","theory-en":"theory-en"},
 "kw-ed":{"V514":"recensio-es","V297":"theory-en"},
 "apparatus-catalog-edition":{"recensio-es":"recensio-es","recensio-fr":"recensio-fr","theory-en":"theory-en"}
};
const needed=new Set(["recensio-es","recensio-fr","theory-en"]);
const display=new Map();
const el=(tag,text)=>{
 const n=document.createElement(tag);
 if(text!==undefined)n.textContent=String(text);
 return n;
};
function format(book,host){
 const name=el("strong",(book.version||"Edición")+" · "+(book.bibliographic_title||book.title));
 const role=book.editorial_role||book.bibliographic_author||"Responsable editorial no consignado";
 const imprint=[book.publication_place,book.publisher,book.year].filter(Boolean).join(" · ");
 const p=el("p");p.append(name,el("span"," · "+role+(imprint?" · "+imprint:"")+" · "));
 p.append(el("span","ISBN: "+(book.isbn||"no consignado")+" · "));
 if(book.doi){
  const a=el("a","DOI: "+book.doi);
  a.href="https://doi.org/"+book.doi;
  a.target="_blank";a.rel="noopener noreferrer";
  p.append(a);
 }else p.append(el("span","DOI no consignado"));
 host.append(p);
 if(book.isbn_note)host.append(el("small","Nota sobre ISBN: "+book.isbn_note));
}
function mount(){
 for(const [id,map] of Object.entries(mappings)){
  const select=document.getElementById(id);
  if(!select)continue;
  let host=document.getElementById(id+"-reference");
  if(!host){
   host=el("div");
   host.id=id+"-reference";
   host.className="apparatus-compact-bibliography";
   host.setAttribute("role","status");
   const form=select.closest("form");
   if(form)form.insertAdjacentElement("afterend",host);
   else select.closest("label")?.insertAdjacentElement("afterend",host);
  }
  select.setAttribute("aria-describedby",host.id);
  host.classList.add("apparatus-compact-bibliography");
  display.set(id,{select,host,map});
 }
}
function update({select,host,map},books){
 host.replaceChildren();
 if(!books){
  host.textContent="Fichas académicas: consultando el catálogo editorial…";
  return;
 }
 const book=books.get(map[select.value]);
 if(book){
  format(book,host);
  host.append(el("small","Los identificadores corresponden a esta edición, no a un códice ni al locus aislado."));
 }else if(map[select.value]){
  host.textContent="Ficha bibliográfica de la edición temporalmente no disponible.";
 }else{
  const details=el("details");
  const summary=el("summary","Fichas de las ediciones incluidas · título, ISBN y DOI");
  details.append(summary);
  for(const editionId of new Set(Object.values(map))){
   const record=books.get(editionId);
   if(record)format(record,details);
  }
  details.append(el("small","V514 y V554 comparten el ISBN declarado en el catálogo; la corroboración registral es independiente. Los DOI identifican cada edición."));
  host.append(details);
 }
}
async function fetchCatalog(){
 const response=await fetch("data/catalog.json",{headers:{Accept:"application/json"}});
 if(!response.ok)throw Error("HTTP "+response.status);
 const data=await response.json();
 if(!Array.isArray(data.editions))throw Error("Faltan datos bibliográficos");
 const books=new Map(data.editions.filter(book=>needed.has(book.id)).map(book=>[book.id,book]));
 if(books.size!==3)throw Error("Faltan fichas de las tres ediciones");
 return books;
}
mount();
for(const x of display.values())update(x,null);
fetchCatalog().then(books=>{
 for(const x of display.values()){
  update(x,books);
  x.select.addEventListener("change",()=>update(x,books));
 }
}).catch(()=>{
 for(const x of display.values()){
  x.host.replaceChildren(el("span","Ficha bibliográfica temporalmente no disponible. Los filtros continúan operativos."));
 }
});
})();