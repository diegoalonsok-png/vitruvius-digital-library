/* Shared compact bibliography explorer for the home page and Bibliotheca.
   Uses the per-work indexed-source inventory; never treats an R2 facsimile
   registration as proof of a reviewed, searchable Latin/Greek transcription. */
(()=>{"use strict";
const URL="data/classics-corpus/indexation-roadmap-222.json";
const labels={local:"Texto original local",remote:"Índice externo",r2:"PDF/OCR R2 registrado",pending:"Pendiente de texto propio"};
const categories=["local","remote","r2","pending"];
let dataPromise=null;
const classify=x=>x.originalIndexed?"local":x.offsiteOriginalIndexed?"remote":x.originalR2Registered?"r2":"pending";
function catalog(){
 if(!dataPromise)dataPromise=fetch(URL).then(r=>{if(!r.ok)throw Error("Inventario: HTTP "+r.status);return r.json()}).then(j=>{
  if(!Array.isArray(j.items)||j.items.length!==j.targetWorks)throw Error("Inventario de obras inconsistente");
  return j.items.map(x=>({id:x.id,author:x.author||"Autor no indicado",title:x.title||x.id,kind:classify(x),language:x.originalLanguage||"",originalIndexed:Boolean(x.originalIndexed),indexedLanguages:Array.isArray(x.indexedLanguages)?x.indexedLanguages:[]}));
 }).catch(e=>{dataPromise=null;throw e});
 return dataPromise;
}
function add(tag,cls,text,parent){const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;parent.append(el);return el}
function mount(host){
 if(host.dataset.indexExplorerMounted)return;
 host.dataset.indexExplorerMounted="1";
 host.classList.add("vdl-works-explorer");
 const details=add("details","vdl-works-explorer-details",null,host);
 const summary=add("summary",null,"Ver obras y estado de indexación",details);
 summary.setAttribute("aria-label","Mostrar u ocultar catálogo de obras y estado de sus textos");
 const content=add("div","vdl-works-explorer-content",null,details);
 const note=add("p","vdl-works-note","Abre el repertorio para consultar los títulos y distinguir textos originales locales, índices externos, facsímiles OCR y obras pendientes. Una ficha PDF no certifica una transcripción revisada.",content);
 const toolbar=add("div","vdl-works-filterbar",null,content);
 const search=add("input",null,null,toolbar);search.type="search";search.placeholder="Filtrar por autor o título…";search.setAttribute("aria-label","Filtrar las obras por autor o título");
 const filter=add("select",null,null,toolbar);filter.setAttribute("aria-label","Filtrar por estado de indexación");
 filter.add(new Option("Todas las obras del repertorio principal","all"));
 for(const category of categories)filter.add(new Option(labels[category],category));
 const count=add("p","vdl-works-result-count","Abre el catálogo para cargar el inventario.",content);count.setAttribute("role","status");
 const listing=add("div","vdl-works-list",null,content);listing.setAttribute("role","list");
 const final=add("p","vdl-works-bottom",null,content);
 const allLink=add("a",null,"Abrir el catálogo completo de Bibliotheca",final);allLink.href="bibliotheca-graeca-latina.html";
 let items=null;
 const normalize=x=>String(x||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
 function render(){
  if(!items)return;
  const query=normalize(search.value),kind=filter.value;
  const matched=items.filter(x=>(kind==="all"||kind===x.kind)&&normalize(x.author+" "+x.title).includes(query));
  listing.replaceChildren();
  for(const item of matched){
   const line=add("div","vdl-works-row",null,listing);line.setAttribute("role","listitem");
   const title=add("a","vdl-works-name",item.author+" — "+item.title,line);
   // Open actual reading content when a local original has a documented indexed language.
// External/registered sources retain an academic dossier with source and facsimile links.
   const readable=item.originalIndexed&&item.indexedLanguages.includes(item.language);
   const language=readable?item.language:(item.indexedLanguages.includes("la")?"la":item.indexedLanguages.includes("grc")?"grc":null);
   const canRead=item.originalIndexed&&Boolean(language);
   title.href=canRead
    ?"classics-text-reader.html?"+new URLSearchParams({work:item.id,lang:language})
    :"classics-work-record.html?"+new URLSearchParams({work:item.id});
   title.title=canRead?"Leer el texto original de esta obra por loci":"Abrir la ficha académica y sus enlaces a los textos o facsímiles disponibles";
   const meta=add("span","vdl-works-state",labels[item.kind],line);
   meta.dataset.kind=item.kind;
  }
  const states=categories.map(k=>labels[k]+": "+items.filter(x=>x.kind===k).length).join(" · ");
  count.textContent=matched.length+" de "+items.length+" obras del repertorio principal · "+states;
 }
 details.addEventListener("toggle",async()=>{
  if(!details.open||items)return;
  count.textContent="Cargando inventario de obras…";
  try{items=await catalog();if(details.open)render()}
  catch(e){count.textContent="No fue posible cargar las obras: "+e.message+". Se conserva el acceso al catálogo completo."}
 });
 search.addEventListener("input",render);filter.addEventListener("change",render);
}
function init(){document.querySelectorAll("[data-vdl-works-explorer]").forEach(mount)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();