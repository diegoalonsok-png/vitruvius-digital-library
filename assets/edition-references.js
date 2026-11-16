/* Reusable, source-backed edition citations in Chicago 18 Notes & Bibliography style.
   All bibliographic values are read from the site's existing data/catalog.json. */
(()=>{"use strict";
const root=document.getElementById("vdl-edition-references");if(!root)return;
const create=(tag,txt,parent,klass)=>{const e=document.createElement(tag);if(txt!=null)e.textContent=txt;if(klass)e.className=klass;if(parent)parent.append(e);return e};
const editionIds=["recensio-es","recensio-fr","theory-en"];
async function init(){
 try{
  const response=await fetch("data/catalog.json",{headers:{Accept:"application/json"}});if(!response.ok)throw Error("Catálogo bibliográfico: HTTP "+response.status);
  const catalog=await response.json();
  const editions=editionIds.map(id=>(catalog.editions||[]).find(x=>x.id===id)).filter(Boolean);
  if(editions.length!==3)throw Error("Metadatos incompletos en data/catalog.json");
  root.replaceChildren();root.classList.add("vdl-editions");
  create("h2","Editiones Kurilo · referencias bibliográficas",root);
  create("p","Referencias bibliográficas por edición. Cada versión tiene su DOI propio. El ISBN común es una declaración editorial pendiente de comprobación registral independiente; no constituye asignación verificada para cada edición.",root,"vdl-preface");
  const list=create("ol",null,root);
  for(const b of editions){
   const li=create("li",null,list);
   create("span",b.version+" · ",li,"vdl-edition-name");
   li.append(document.createTextNode((b.bibliographic_author||"Kurilo, Diego")+". "));
   create("em",b.bibliographic_title||b.title,li);
   li.append(document.createTextNode(". "+b.edition_statement+". "+b.publication_place+": "+b.publisher+", "+b.year+". "));
   const doi=create("a","DOI: "+b.doi,li);doi.href="https://doi.org/"+b.doi;doi.rel="noopener noreferrer";
   const ref=(b.bibliographic_author||"Kurilo, Diego")+". "+(b.bibliographic_title||b.title)+". "+b.edition_statement+". "+b.publication_place+": "+b.publisher+", "+b.year+". DOI: https://doi.org/"+b.doi+". ISBN editorial declarado: "+b.isbn+" (asignación por edición pendiente de verificación registral).";
   const citeButton=create("button","Citar · copiar referencia",li,"vdl-cite-button");
   citeButton.type="button";citeButton.setAttribute("aria-label","Copiar cita de "+b.version);
   citeButton.addEventListener("click",async()=>{try{if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");await navigator.clipboard.writeText(ref);citeButton.textContent="Cita copiada";}catch{const field=create("textarea",ref,li);field.value=ref;field.select();citeButton.textContent="Selecciona y copia la cita";}});

   const meta=create("span","ISBN: "+b.isbn+(b.isbn_status==="publisher-declared-shared"?" (declarado compartido; asignación registral por verificar)":"")+".",li,"vdl-edition-identifiers");
   const original=create("a","Consultar edición original",meta);original.href=b.read_url||b.pdf_url||b.source_url||"#";
   original.style.marginLeft="1em";
  }
  const links=create("div",null,root,"vdl-linkrow");
  for(const [label,href] of [["Apparatus criticus","apparato-critico.html"],["Commentarius perpetuus","commentarius-perpetuus.html"],["Index commentariorum","indice-commentariorum.html"],["Lector bilingüe","lector-bilingue.html"],["Conspectus testimoniorum","conspectus-testimoniorum.html"],["Errata editionum","errata-editionum.html"]]){
   const a=create("a",label,links);a.href=href;
  }
 }catch(e){root.classList.add("vdl-editions");root.textContent="No fue posible cargar las referencias bibliográficas desde el catálogo. Consulte data/catalog.json.";console.warn(e)}
}
init();
})();