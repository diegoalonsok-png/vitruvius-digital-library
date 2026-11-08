/* Árbol documental de transmisión. No infiere filiación ni un stemma codicum. */
(()=>{"use strict";
const WORKS="data/bibliotheca-graeca-latina-I-bce-I-ce.json";
const WITNESSES="data/bibliotheca-testimonia-verified.json";
const $=id=>document.getElementById(id);
const el=(name,cls,value)=>{const n=document.createElement(name);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
const validUrl=value=>{if(typeof value!=="string"||!value.trim())return null;try{const url=new URL(value,location.href);return /^https?:$/.test(url.protocol)?url.href:null}catch{return null}};
const safeLink=(box,label,url)=>{const href=validUrl(url);if(!href)return null;
 const a=el("a","",label);a.href=href;if(new URL(href).origin!==location.origin){a.target="_blank";a.rel="noopener noreferrer"}box.append(a);return a};
const workSelect=$("tree-work"),status=$("tree-status"),result=$("tree-result");
let works=[],catalogue={records:[],editions:[]};
const editionYear=r=>{const m=String(r.year||"").match(/(?:1[4-9]|20)\d{2}/);return m?Number(m[0]):Infinity};
function node(title,kind,isOldest){
 const card=el("article","node"+(isOldest?" oldest":""));
 card.append(el("span","kind",kind),el("h4","",title));return card;
}
function field(card,label,value){if(value!==null&&value!==undefined&&String(value).trim()){const p=el("p");p.append(el("strong","",label+": "),document.createTextNode(String(value)));card.append(p)}}
function links(card){const box=el("div","node-links");card.append(box);return box}
function empty(message){return el("p","empty",message)}
function publication(w){
 const box=$("tree-reading");box.replaceChildren();
 const found=new Set();
 function add(label,url){const href=validUrl(url);if(href&&!found.has(href)){found.add(href);safeLink(box,label,url)}}
 // A transcription or modern edition is not a medieval manuscript.
 if(w.localHtml)add("Leer texto en la biblioteca",w.localHtml);
 for(const v of w.localVersions||[]){
  if(v.path&&(/\.html(?:\?|$)/i.test(v.path)||/classics-text-reader\.html/i.test(v.path)))
   &&(!v.language||v.language===w.language))add("Leer edición original: "+(v.label||v.language||"texto"),v.path);
 }
 if(w.id==="vitruvius"&&w.localReader?.verified)add("Lector paralelo de Vitruvio","lector-bilingue.html?edition=recensio-es");
 if(w.reading?.url)add("Consultar texto en fuente externa",w.reading.url);
 if(!box.children.length)box.append(empty("No consta un lector textual verificable para esta obra en el catálogo actual."));
}
function render(){
 const w=works.find(x=>x.id===workSelect.value);
 const params=new URLSearchParams(location.search);
 if(!w){result.hidden=true;status.textContent="Selecciona una obra identificada.";return}
 params.set("work",w.id);history.replaceState(null,"",location.pathname+"?"+params);
 result.hidden=false;
 $("tree-title").textContent=w.title||"Obra sin título";
 $("tree-author").textContent=w.author||"Autoría no documentada";
 $("tree-dating").textContent="Composición atribuida: "+(w.dating||"sin datación comprobada");
 $("tree-composition").replaceChildren();
 const comp=node(w.title||"Obra clásica","OBRA · FECHA DE COMPOSICIÓN",false);
 field(comp,"Autor",w.author);field(comp,"Datación de composición",w.dating);
 comp.append(el("p","","La fecha de composición no se identifica con la de ningún códice conservado."));
 $("tree-composition").append(comp);
 publication(w);
 const rows=catalogue.records.filter(x=>(x.workIds||[]).includes(w.id))
 .sort((a,b)=>a.dateStart-b.dateStart||String(a.shelfmark).localeCompare(String(b.shelfmark)));
 const earliest=rows.length?Math.min(...rows.map(x=>Number(x.dateStart)||Infinity)):Infinity;
 const place=$("tree-witnesses");place.replaceChildren();
 if(!rows.length)place.append(empty("Ningún testimonio manuscrito con signatura y datación está registrado para esta obra. No se supone un códice primigenio."));
 for(const ms of rows){
  const oldest=Number(ms.dateStart)===earliest;
  const label=oldest?"MÁS ANTIGUO ENTRE LOS CATALOGADOS":"TESTIMONIO CONSERVADO";
  const card=node(ms.title||ms.shelfmark,label,oldest);
  field(card,"Signatura",ms.shelfmark);field(card,"Institución",ms.library||ms.codexRepository);
  field(card,"Datación del manuscrito",ms.date);
  field(card,"Contenido conservado",ms.coverage);
  if(ms.verification)field(card,"Verificación",ms.verification);
  if(ms.dateStartBasis)card.append(el("p","",ms.dateStartBasis));
  const nav=links(card);
  const local=safeLink(nav,"Abrir visor local",ms.localViewer);
  const official=safeLink(nav,"Ver facsímil institucional",ms.viewer);
  const record=safeLink(nav,"Ficha institucional",ms.record);
  if(!local&&!official&&!record)card.append(el("p","","No hay un enlace verificable al facsímil ni a su ficha en el registro."));
  if(ms.rights)card.append(el("p","",ms.rights));
  place.append(card);
 }
 const editions=catalogue.editions.filter(e=>e.workId===w.id)
  .sort((a,b)=>editionYear(a)-editionYear(b)||String(a.title).localeCompare(String(b.title)));
 const oldestEdition=editions.length?Math.min(...editions.map(editionYear)):Infinity;
 const edbox=$("tree-editions");edbox.replaceChildren();
 if(!editions.length)edbox.append(empty("No hay ediciones o traducciones individualizadas en el repertorio. La lectura textual disponible figura arriba."));
 for(const ed of editions){
  const isOldest=Number.isFinite(oldestEdition)&&editionYear(ed)===oldestEdition;
  const card=node(ed.title||"Edición registrada",isOldest?"PRIMERA EDICIÓN FECHADA DEL CATÁLOGO":"EDICIÓN / TRADUCCIÓN REGISTRADA",isOldest);
  field(card,"Año publicado",ed.year);field(card,"Editor o traductor",ed.editor);
  field(card,"Lenguas",Array.isArray(ed.langs)?ed.langs.join(" · "):ed.langs);
  field(card,"Procedencia",ed.provider);field(card,"Tipo",ed.type);
  field(card,"Descripción editorial",ed.note);
  const nav=links(card);if(!safeLink(nav,"Abrir edición o lector",ed.url))card.append(el("p","","Sin enlace verificable de lectura para esta edición."));
  edbox.append(card);
 }
 status.textContent=rows.length+" manuscritos catalogados · "+editions.length+" ediciones identificadas. Primero se presenta la composición; el códice más antiguo registrado se distingue de la primera edición impresa registrada.";
}
async function init(){
 try{
  const [wr,ar]=await Promise.all([fetch(WORKS),fetch(WITNESSES)]);
  if(!wr.ok||!ar.ok)throw Error("No se pudieron cargar los catálogos");
  const [w,a]=await Promise.all([wr.json(),ar.json()]);
  if(!Array.isArray(w.works)||!Array.isArray(a.records)||!Array.isArray(a.editions))throw Error("Estructura incompleta");
  works=w.works;catalogue=a;
  const chosen=new URLSearchParams(location.search).get("work")||"vitruvius";
  workSelect.replaceChildren();
  for(const work of works.slice().sort((a,b)=>String(a.author||"").localeCompare(String(b.author||""),"es")||String(a.title||"").localeCompare(String(b.title||""),"es"))){
   const option=document.createElement("option");option.value=work.id;option.textContent=[work.author,work.title].filter(Boolean).join(" · ");workSelect.append(option);
  }
  workSelect.value=works.some(x=>x.id===chosen)?chosen:(works.some(x=>x.id==="vitruvius")?"vitruvius":works[0]?.id);
  render();workSelect.addEventListener("change",render);
 }catch(error){status.textContent="Árbol no disponible: "+error.message;result.hidden=true}
}
void init();
})();