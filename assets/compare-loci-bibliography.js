/* Complete bibliographic identities for the three Kurilo editions in the locus comparator.
   Single source of truth: data/catalog.json. Never assert a shared ISBN is independently assigned. */
(()=>{"use strict";
const root=document.getElementById("compare-edition-bibliography");
if(!root)return;
const wanted=["recensio-es","recensio-fr","theory-en"];
const el=(name,content,parent,cls)=>{
 const e=document.createElement(name);
 if(content!==null&&content!==undefined)e.textContent=content;
 if(cls)e.className=cls;
 if(parent)parent.append(e);
 return e;
};
const bibliographicAuthor=(b)=>b.bibliographic_author||b.author||"Kurilo, Diego";
const chicago=(b)=>[
 bibliographicAuthor(b)+".",
 b.bibliographic_title||b.title||"De architectura",
 (b.edition_statement||b.editorial_role||"")+"." ,
 (b.publication_place||"Lugar no consignado")+": "+(b.publisher||"Editor no consignado")+", "+(b.year||"s. f.")+".",
 b.doi?"https://doi.org/"+b.doi+".":""
].filter(Boolean).join(" ").replace(/\s+\./g,".");
async function render(){
 try{
  const res=await fetch("data/catalog.json",{cache:"no-cache"});
  if(!res.ok)throw Error("HTTP "+res.status);
  const catalog=await res.json();
  const editions=wanted.map(id=>(catalog.editions||[]).find(x=>x.id===id));
  if(editions.some(b=>!b))throw Error("Faltan una o más ediciones en el catálogo");
  root.replaceChildren();
  el("h2","Identificación bibliográfica de las ediciones",root);
  el("p","Autor de las ediciones, traducciones y comentarios: Diego Kurilo · Arquitecto. Autor de De architectura: Marco Vitruvio Polión. Referencias Chicago, 18.ª edición.",root,"compare-biblio-intro");
  const grid=el("div",null,root,"compare-biblio-grid");
  for(const b of editions){
   const card=el("article",null,grid,"compare-biblio-entry");
   el("h3",b.version+" · "+(b.languages?.includes("es")?"Español":b.languages?.includes("fr")?"Français":"English"),card);
   el("cite",b.bibliographic_title||b.title,card,"compare-biblio-title");
   el("p",b.editorial_role||"Diego Kurilo · Arquitecto",card);
   el("p",(b.edition_statement||"")+" · "+(b.publication_place||"Lugar no consignado")+": "+(b.publisher||"editor no consignado")+", "+(b.year||"s. f."),card,"compare-biblio-imprint");
   const ids=el("p",null,card,"compare-biblio-identifiers");
   if(b.doi){el("strong","DOI: ",ids);const doi=el("a",b.doi,ids);doi.href="https://doi.org/"+b.doi;doi.rel="noopener noreferrer";doi.target="_blank";}
   if(b.isbn){ids.append(" · ");el("strong","ISBN: ",ids);el("span",b.isbn,ids);}
   if(b.isbn_status==="publisher-declared-shared")el("small","ISBN común declarado por la editorial para V514, V554 y V297; asignación individual por edición pendiente de comprobación registral.",card,"compare-biblio-note");
   const row=el("div",null,card,"compare-biblio-cite");
   el("strong","Chicago 18: ",row);
   const citation=chicago(b);el("span",citation,row);
   const button=el("button","Copiar cita",card,"compare-biblio-copy");button.type="button";
   button.addEventListener("click",async()=>{
    try{await navigator.clipboard.writeText(citation);button.textContent="Cita copiada ✓"}
    catch{const t=el("textarea",citation,card);t.value=citation;t.select();document.execCommand("copy");t.remove();button.textContent="Cita copiada"}
   });
  }
 }catch(err){
  root.replaceChildren();
  el("p","No se han podido comprobar los datos bibliográficos del catálogo; no se mostrarán identificadores sin verificar. "+err.message,root);
 }
}
render();
})();