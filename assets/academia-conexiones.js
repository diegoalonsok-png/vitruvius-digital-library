/* Repositorio de conexiones académicas, sin nuevas filiaciones ni variantes inferidas.
   La atribución de notas se resuelve solo en el aparato crítico, no por semejanza léxica. */
(()=>{"use strict";
const CATALOGUE="data/bibliotheca-graeca-latina-I-bce-I-ce.json";
const TESTIMONIA="data/bibliotheca-testimonia-verified.json";
const $=id=>document.getElementById(id);
const workSelect=$("scholar-work"),termInput=$("scholar-term"),locusInput=$("scholar-locus");
if(!workSelect||!termInput||!locusInput)return;
const status=$("scholar-status"),results=$("scholar-results"),links=$("scholar-links"),witnesses=$("scholar-witnesses"),editions=$("scholar-editions");
const make=(name,txt,cls)=>{const e=document.createElement(name);if(txt!==undefined)e.textContent=String(txt);if(cls)e.className=cls;return e};
const validURL=value=>{if(typeof value!=="string"||!value.trim())return null;try{const u=new URL(value,location.href);return ["http:","https:"].includes(u.protocol)?u.href:null}catch{return null}};
const addLink=(parent,label,url,description)=>{
 const href=validURL(url);if(!href)return null;
 const p=make("p",undefined,"meta"),a=make("a",label);a.href=href;
 if(new URL(href).origin!==location.origin){a.target="_blank";a.rel="noopener noreferrer"}
 p.append(a);if(description)p.append(document.createTextNode(" · "+description));parent.append(p);return a;
};
function route(file,params={}){
 const u=new URL(file,location.href);
 for(const [k,v] of Object.entries(params))if(v!==undefined&&v!==null&&String(v).trim())u.searchParams.set(k,String(v));
 return u.href;
}
function witnessCard(ms,isOldest){
 const section=make("section",undefined,"group");
 const heading=isOldest?"Testimonio más antiguo de los catalogados · ":"Testimonio conservado · ";
 section.append(make("h3",heading+(ms.title||ms.shelfmark)));
 section.append(make("p",[ms.shelfmark,ms.library,ms.date].filter(Boolean).join(" · "),"meta"));
 if(ms.coverage)section.append(make("p","Cobertura: "+ms.coverage,"meta"));
 if(ms.verification)section.append(make("p","Procedencia de la identificación: "+ms.verification,"meta"));
 if(ms.dateStartBasis)section.append(make("p",ms.dateStartBasis,"meta"));
 addLink(section,"Ficha del repositorio",ms.record,"Descripción institucional cuando existe");
 addLink(section,"Abrir facsímil del testimonio",ms.localViewer||ms.viewer,"Visor local o institucional; no es una colación");
 if(ms.localViewer&&ms.viewer)addLink(section,"Comparar con visor institucional",ms.viewer);
 if(ms.rights)section.append(make("p","Uso de imágenes: "+ms.rights,"meta"));
 return section;
}
const year=e=>{const m=String(e.year??"").match(/(?:1[4-9]|20)\d{2}/);return m?Number(m[0]):Infinity};
let works=[],data=null;
function render(){
 if(!data)return;
 const work=works.find(w=>w.id===workSelect.value);
 if(!work){status.textContent="Selecciona una obra del catálogo.";results.hidden=true;return}
 const query=termInput.value.trim(),rawLocus=locusInput.value.trim();
 const locus=/^(?:(?:[IVX]{1,6})|(?:10|[1-9]))\.(?:(?:praef)|(?:[1-9]\d?))\.(?:[1-9]\d{0,2})$/i.test(rawLocus)?rawLocus:"";
 results.hidden=false;links.replaceChildren();witnesses.replaceChildren();editions.replaceChildren();
 links.append(make("h3",work.title||"Obra clásica"));
 links.append(make("p",[work.author,work.dating,work.language==="grc"?"Griego antiguo":work.language==="la"?"Latín":work.language].filter(Boolean).join(" · "),"meta"));
 addLink(links,"Ficha en Bibliotheca",route("bibliotheca-graeca-latina.html",{work:work.id,q:query}),"Búsqueda documentada por obra");
 if(query){
  addLink(links,"Investigar palabra en Lexicon",route("vitruvia-lexicon.html",{q:query,mode:"palabra"}),"Flexión, etimología y acepciones requieren verificación");
  addLink(links,"Concordancias textuales",route("index-locorum.html",{q:query}),"Ocurrencias no equivalen a variantes de códice");
  addLink(links,"Explorar en Vitruvia",route("vitruvia.html",{q:query}),"Investigación general y fuentes externas");
  addLink(links,"Consultar diccionarios académicos",route("bibliotheca-lexicographica.html",{q:query,lang:work.language}),"Consultar las entradas en sus fuentes");
  if(work.language==="grc"||/[\u0370-\u03ff\u1f00-\u1fff]/u.test(query))
   addLink(links,"Examinar dialectología griega",route("dialectologia-graeca.html",{q:query}),"No inferir dialecto por grafía normalizada");
 }
 if(work.id==="vitruvius"){
  addLink(links,"Aparato crítico de Vitruvio",route("aparato-critico.html",{q:query,locus}),"Solo vincular notas explícitamente documentadas");
  if(locus)addLink(links,"Leer el locus en su edición y traducción",route("lector-bilingue.html",{edition:"recensio-es",locus}),"Edición de referencia; no sustituye al folio histórico");
 }
 if(rawLocus&&!locus)links.append(make("p","La referencia de pasaje no tiene un formato canónico válido. No se genera un vínculo de locus.", "meta"));
 if(locus&&work.id!=="vitruvius")links.append(make("p","Esta interfaz no confirma alineación por locus para otras obras; consulta el índice textual sin atribuir correspondencias automáticas.","meta"));
 const rows=data.records.filter(w=>(w.workIds||[]).includes(work.id))
  .sort((a,b)=>Number(a.dateStart||Infinity)-Number(b.dateStart||Infinity)||String(a.shelfmark).localeCompare(String(b.shelfmark)));
 witnesses.append(make("h3","Testimonios manuscritos conservados"));
 witnesses.append(make("p","Ordenados por datación aproximada del ejemplar conservado; no por composición de la obra. La selección representa únicamente los testimonios registrados en la biblioteca.", "meta"));
 if(!rows.length)witnesses.append(make("p","Sin manuscritos individualizados con signatura y datación en el registro actual. No se postula un arquetipo.", "meta"));
 const earliest=rows.length?Math.min(...rows.map(x=>Number(x.dateStart)||Infinity)):Infinity;
 for(const row of rows)witnesses.append(witnessCard(row,Number(row.dateStart)===earliest));
 const eds=data.editions.filter(e=>e.workId===work.id)
  .sort((a,b)=>year(a)-year(b)||String(a.title).localeCompare(String(b.title)));
 editions.append(make("h3","Ediciones y traducciones documentadas"));
 editions.append(make("p","Las ediciones impresas no son códices y su fecha no demuestra filiación textual. Solo se muestran referencias identificadas en el catálogo existente.", "meta"));
 if(!eds.length)editions.append(make("p","No hay edición individualizada para esta obra en el repertorio de testimonios actual.","meta"));
 const firstYear=eds.length?Math.min(...eds.map(year)):Infinity;
 for(const e of eds){
  const section=make("section",undefined,"group");
  section.append(make("h3",(Number.isFinite(firstYear)&&year(e)===firstYear?"Primera edición fechada de las catalogadas · ":"")+(e.title||"Edición")));
  section.append(make("p",[e.year,e.editor,Array.isArray(e.langs)?e.langs.join(" / "):e.langs,e.type].filter(Boolean).join(" · "),"meta"));
  if(e.note)section.append(make("p",e.note,"meta"));
  addLink(section,"Consultar edición documentada",e.url,"Verificar paginación y responsabilidades editoriales en la fuente");
  editions.append(section);
 }
 const params=new URLSearchParams(location.search);params.set("work",work.id);
 if(query)params.set("q",query);else params.delete("q");
 if(locus)params.set("locus",locus);else params.delete("locus");
 history.replaceState(null,"",location.pathname+"?"+params);
 status.textContent=rows.length+" testimonios manuscritos y "+eds.length+" ediciones catalogadas para la obra seleccionada. Los índices muestran documentación disponible, no una certificación de cotejo.";
}
async function start(){
 try{
  const responses=await Promise.all([fetch(CATALOGUE),fetch(TESTIMONIA)]);
  if(responses.some(r=>!r.ok))throw Error("No se pudo acceder a los catálogos académicos");
  const [catalogue,testimonia]=await Promise.all(responses.map(r=>r.json()));
  if(!Array.isArray(catalogue.works)||!Array.isArray(testimonia.records)||!Array.isArray(testimonia.editions))throw Error("Formato bibliográfico inválido");
  works=catalogue.works;data=testimonia;
  const selected=new URLSearchParams(location.search);
  workSelect.replaceChildren();
  for(const w of works.slice().sort((a,b)=>String(a.author).localeCompare(String(b.author),"es")||String(a.title).localeCompare(String(b.title),"es"))){
   const option=document.createElement("option");option.value=w.id;option.textContent=[w.author,w.title].filter(Boolean).join(" · ");workSelect.append(option);
  }
  workSelect.value=works.some(w=>w.id===selected.get("work"))?selected.get("work"):(works.find(w=>w.id==="vitruvius")?.id||works[0]?.id);
  termInput.value=(selected.get("q")||"").slice(0,120);
  locusInput.value=(selected.get("locus")||"").slice(0,24);
  workSelect.addEventListener("change",render);
  $("scholar-form").addEventListener("submit",e=>{e.preventDefault();render()});
  locusInput.addEventListener("change",render);
  render();
 }catch(err){status.textContent="No pudo cargarse la investigación conectada: "+err.message;results.hidden=true}
}
void start();
})();