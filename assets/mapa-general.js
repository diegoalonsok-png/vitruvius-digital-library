(()=>{"use strict";const $=id=>document.getElementById(id);
const groups=[
 {title:"Buscadores, índices y Lexicon",re:/lexicon|buscador|indice|indices|loci|concordancia|onomasticon|diccion|glosario|etimolog|toponym|geograph|vitruvia|conceptual/i},
 {title:"Bibliotheca, obras y visores",re:/bibliotheca|classics|clasicos|classica|lector|tratados|edicion|texto|translations|traducciones|corpus|capitula/i},
 {title:"Códices, manuscritos y facsímiles",re:/codic|codex|manuscri|folio|scriptorium|facsimil|harleian|sulpizio|giocondo|cesariano|barbaro|perrault|urrea|historica/i},
 {title:"Crítica textual, filología e investigación",re:/ecdotic|aparato|apparatus|filolog|hermeneut|exeg|investigacion|laboratorio|auditor|metodolog|protocolo|fuentes|status|control|dialectolog|papyrolog/i},
 {title:"Arquitectura, historia y ciencias",re:/architect|arquitect|basilica|ingenier|tablas|roma|antiguos|vitruvio|geometr|matematic|medida|principios|histori|estudios/i},
 {title:"Ediciones propias, docencia y referencias",re:/documents|docencia|universit|bibliograf|como-citar|research|colaboraci|biografia|evaluacion|para-investigadores/i}
];
function bucket(name){return groups.find(g=>g.re.test(name))?.title||"Otras páginas de consulta"}
function label(path){return decodeURIComponent(path.split("/").pop()).replace(/\.html?$/i,"").replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
async function load(){
 const target=$("directory-list"),status=$("status");
 try{
  const r=await fetch("sitemap.xml",{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);
  const doc=new DOMParser().parseFromString(await r.text(),"application/xml");
  if(doc.querySelector("parsererror"))throw Error("XML no válido");
  const urls=[...doc.getElementsByTagNameNS("*","loc")].map(x=>x.textContent.trim());
  if(!urls.length)throw Error("Sin páginas en el inventario");
  const base=new URL("./",location.href),records=new Map();
  for(const u of urls){
   let dest;try{dest=new URL(u)}catch{continue}
   if(dest.origin!==base.origin||!dest.pathname.startsWith(base.pathname)||!dest.pathname.endsWith(".html"))continue;
   records.set(dest.pathname,base.pathname===dest.pathname?"index.html":dest.pathname.slice(base.pathname.length));
  }
  records.set(base.pathname+"laboratorio-humanidades.html","laboratorio-humanidades.html");
  records.set(base.pathname+"mapa-general.html","mapa-general.html");
  const map=new Map();
  for(const rel of records.values()){const category=bucket(rel);if(!map.has(category))map.set(category,[]);map.get(category).push(rel)}
  for(const group of [...groups.map(x=>x.title),"Otras páginas de consulta"]){
   const items=(map.get(group)||[]).sort((a,b)=>a.localeCompare(b,"es"));if(!items.length)continue;
   const box=document.createElement("section");box.className="index-group";
   const head=document.createElement("h3");head.textContent=group+" ("+items.length+")";box.append(head);
   const ol=document.createElement("ol");
   for(const rel of items){const li=document.createElement("li"),a=document.createElement("a");a.href=rel;a.textContent=label(rel);a.title=rel;li.append(a);ol.append(li)}
   box.append(ol);target.append(box);
  }
  status.textContent=records.size+" páginas HTML del mapa XML y accesos nuevos, clasificadas automáticamente por nombre. El mapa XML puede omitir páginas que existen en el repositorio.";
 }catch(e){status.textContent="No se pudo cargar el directorio dinámico ("+e.message+"). El mapa estructural superior sigue siendo imprimible."; }
}
$("print").addEventListener("click",()=>{const size=$("paper").value;let style=$("map-print-size");if(!style){style=document.createElement("style");style.id="map-print-size";document.head.append(style)}style.textContent="@media print{@page{size:"+size+";margin:12mm}}";window.print()});
load();
})();