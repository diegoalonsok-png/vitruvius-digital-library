/* Fichas bibliográficas para obras declaradas únicamente en el inventario R2.
   Nunca atribuye códices, traductores o DOI individuales por inferencia. */
(()=>{"use strict";
let task;
function load(){
 if(!task)task=Promise.all([
  fetch("data/r2/vinculos-repertorio.json").then(r=>{if(!r.ok)throw Error("Vínculos R2");return r.json()}),
  fetch("data/r2/catalogo-clasicos-r2.json").then(r=>{if(!r.ok)throw Error("Catálogo de ediciones R2");return r.json()})
 ]).then(([links,catalog])=>{
  const edition=new Map((catalog.items||[]).map(x=>[x.id,x]));
  return (links.obrasNuevas||[]).map(w=>({...w,edition:edition.get(w.r2)})).filter(w=>w.edition);
 }).catch(e=>{task=null;throw e});
 return task;
}
function el(tag,value,cls){const x=document.createElement(tag);if(value!==undefined)x.textContent=String(value);if(cls)x.className=cls;return x}
function field(root,label,value){if(value!==null&&value!==undefined&&String(value).trim()){const p=el("p",undefined,"cwd-row");p.append(el("strong",label+": "),document.createTextNode(String(value)));root.append(p)}}
function link(root,label,url){if(!url||!/^https:\/\//i.test(url))return;const a=el("a",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";root.append(a)}
function control(root,label,value){const b=el("button",label,"cwd-cite-button");b.type="button";b.style.cssText="border:1px solid #9997;border-radius:8px;padding:8px 11px;background:transparent;color:inherit;cursor:pointer;margin:5px 8px 5px 0";b.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(value);b.textContent="Copiado"}catch{b.textContent="Seleccione la cita de la ficha"}});root.append(b)}
async function render(root,id){
 root.replaceChildren(el("p","Consultando la ficha editorial R2…"));
 try{
  const record=(await load()).find(w=>w.r2===id);
  if(!record)throw Error("Edición no vinculada");
  const e=record.edition;
  root.replaceChildren();root.classList.add("classic-work-dossier");root.dataset.workId=id;
  root.append(el("p","BIBLIOTHECA · FICHA DE OBRA Y EDICIÓN HISTÓRICA","cwd-kicker"),el("h2",record.obra));
  field(root,"Autor de la obra",record.autor);
  field(root,"Lengua de la obra",record.lengua==="la"?"latín":record.lengua==="it"?"italiano":record.lengua);
  field(root,"Título exacto de la edición digitalizada",e.tituloEdicion);
  field(root,"Año del ejemplar catalogado",e.anio);
  field(root,"Pie editorial declarado",e.editor);
  field(root,"Volumen",e.volumen);
  field(root,"Páginas digitalizadas",e.paginas);
  field(root,"Páginas con extracción de texto",e.paginasConTexto);
  if(e.traductor)field(root,"Traductor documentado",e.traductor);
  if(e.editorCritico)field(root,"Editor crítico documentado",e.editorCritico);
  if(!e.traductor&&/translated|translation|traduc|traduction/i.test(e.tituloEdicion||""))field(root,"Crédito de traducción","Debe comprobarse en portada; no se atribuye por nombre de catálogo");
  field(root,"Atribuciones bibliográficas declaradas",Array.isArray(e.creadorIA)?e.creadorIA.join("; "):e.creadorIA);
  field(root,"Alcance textual",e.alcance||"El alcance preciso debe comprobarse en el índice del ejemplar digital");
  if(e.notaFilologica)field(root,"Nota filológica",e.notaFilologica);
  if(e.incidenciaCatalografica)field(root,"Incidencia bibliográfica",e.incidenciaCatalografica);
  const cover=e.identificadorIA;
  if(/^[a-zA-Z0-9_-]+$/.test(cover||"")){
   const img=el("img");img.src="https://archive.org/services/img/"+encodeURIComponent(cover);img.alt="Miniatura del ejemplar digital de "+e.tituloEdicion;img.loading="lazy";img.style.cssText="width:125px;max-width:32%;height:auto;float:right;margin:8px 0 10px 20px";img.onerror=()=>img.remove();root.insertBefore(img,root.children[2]||null);
  }
  const links=el("p",undefined,"cwd-links");link(links,"Leer PDF histórico en R2",e.pdf);links.append(" · ");link(links,"Ejemplar y registro de procedencia",e.fuente);root.append(links);
  const citing=el("section",undefined,"cwd-citation-tools");
  citing.append(el("h3","Cómo citar esta edición y la ficha"));
  const url=new URL("classics-work-record.html",location.href);url.searchParams.set("work",id);
  const editionCite=record.autor+". "+e.tituloEdicion+". "+(e.editor||"")+" "+(e.anio||"")+". Edición digitalizada consultada en Vitruvia Bibliotheca: "+url.href+".";
  citing.append(el("p",editionCite));
  control(citing,"Copiar referencia de edición",editionCite);
  control(citing,"Copiar URL de la ficha",url.href);
  const doi=el("p");doi.append("DOI de Vitruvius Digital Library (identificador del proyecto, no de esta edición): ");link(doi,"10.5281/zenodo.23868911","https://doi.org/10.5281/zenodo.23868911");citing.append(doi);
  root.append(citing);
  field(root,"Testimonio manuscrito más antiguo","No se atribuye desde el catálogo de un impreso. Requiere un registro manuscrito individual con fuente institucional.");
  root.append(el("p","Los números de páginas digitalizadas no representan necesariamente la paginación impresa. Una edición de época moderna no es un códice medieval.","cwd-muted"));
  return record;
 }catch(err){root.replaceChildren(el("p","No se pudo abrir esta ficha: "+err.message));return null}
}
window.R2WorkRecords={load,render};
})();
