/* Folio ↔ locus/praefatio sync for Harley MS 2767.
   The edition is V514; neither the Latin text nor highlights are H diplomatic OCR.
   Material links are distinct from proportional estimates. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const form=$("h-locus-form"),field=$("h-locus-input"),preface=$("h-preface-pick");
const status=$("h-locus-status"),matches=$("h-locus-actions"),context=$("h-folio-context");
const C=window.CodexHConcordance;
if(!form||!C)return;
const ROM=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
let corpus=[],byLocus=new Map(),folioMap=null,renderToken=0;
const terms=/\b(?:symmetri(?:a|ae|am|as|arum|is)|decor(?:e|is|i|um|ibus)?|firmita(?:s|tis|te|tem)|utilita(?:s|tis|te|tem)|venusta(?:s|tis|te|tem)|eurythmi(?:a|ae|am|as)|modul(?:us|o|i|um|os|orum|is)|ordinatio(?:ne|nem|nis|nes|num|nibus)?|dispositio(?:ne|nem|nis|nes|num|nibus)?|proportio(?:ne|nem|nis|nes|num|nibus)?)\b/giu;
const element=(tag,className,text)=>{
 const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;
};
function labelLocus(v){
 const s=String(v||"").trim().toLowerCase().replace(/\s+/g,""),m=s.match(/^(x|ix|viii|vii|vi|iv|iii|ii|i)(?=\.|$)/);
 return (m?String(ROM.findIndex(x=>x.toLowerCase()===m[1]))+s.slice(m[1].length):s)
   .replace(".prefacio",".praef").replace(".preface",".praef").replace(".praefatio",".praef");
}
const isLocus=s=>/^(?:[1-9]|10)(?:\.(?:praef(?:\.\d+)?|\d+(?:\.\d+)?))?$/.test(s);
const imageOfFolio=s=>{
 const m=/^(\d{1,3})([rv])$/.exec(String(s||"").replace(/^f\.\s*/,""));if(!m)return null;
 return 8+(Number(m[1])-1)*2+(m[2]==="r"?1:2);
};
function goImage(image,folio,provenance){
 const p=$("page");if(!p||!Number.isInteger(image))return;
 p.value=String(image);p.dispatchEvent(new Event("change",{bubbles:true}));
 $("folio-identification")?.scrollIntoView({block:"start",behavior:"smooth"});
 status.textContent="Abierta la imagen "+image+" (f. "+folio+"). "+provenance;
}
function addButton(target,name,fn,kind){
 const b=element("button","h-sync-button",name);b.type="button";b.dataset.kind=kind||"";
 b.addEventListener("click",fn);target.append(b);return b;
}
async function directions(locus,container){
 const data=await C.locate(locus);
 if(data.exact.length){
  container.append(element("p","h-sync-evidence","Correspondencia registrada en H: "+data.exact.map(x=>"f. "+x.folio+" ("+x.status+")").join("; ")+". El folio registrado no prueba la ubicación exacta de cada palabra."));
  for(const r of data.exact){
   if(!Number.isInteger(r.image))continue;
   addButton(container,"Ver folio H · "+r.folio,()=>goImage(r.image,r.folio,"Vínculo de evidencia: "+r.status),"documented");
  }
 }else{
  if(data.book)container.append(element("p","h-sync-evidence","Libro "+ROM[data.book.number]+": ff. "+data.book.start+"–"+data.book.end+" (rango codicológico documentado). Este locus no tiene folio verificado."));
  if(data.estimate?.folio){
   const folio=data.estimate.folio,image=imageOfFolio(folio);
   if(image)addButton(container,"Explorar f. "+folio+" (estimación)",()=>goImage(image,folio,"Posición estimada, pendiente de cotejo; no es atribución material."),"estimated");
  }
 }
}
function highlightSource(text){
 const span=element("span","h-sync-text");span.lang="la";let last=0;
 for(const m of String(text).matchAll(terms)){
  span.append(document.createTextNode(text.slice(last,m.index)));
  const mark=element("mark","h-sync-yellow",m[0]);
  mark.title="Término de la edición V514, no resalte geométrico sobre H";
  span.append(mark);last=m.index+m[0].length;
 }
 span.append(document.createTextNode(text.slice(last)));return span;
}
function renderContext(){
 const img=Number($("page")?.value),current=++renderToken;
 if(!context||!Number.isInteger(img)||!folioMap)return;
 context.replaceChildren(element("h3",null,"Sincronización del folio y el texto editorial"));
 const found=folioMap.entries.filter(x=>x.image_number===img);
 if(found.length){
  for(const e of found){
   context.append(element("p","h-sync-evidence","H · f. "+e.folio+" · imagen "+img+" · "+e.folio_status));
   for(const loc of e.loci||[]){
    const p=byLocus.get(loc.locus);if(!p)continue;
    const section=element("article","h-sync-editorial");
    section.append(element("strong",null,"Vitr. "+p.locus+" · edición V514"));
    const paragraph=element("p");paragraph.append(highlightSource(p.latin.slice(0,1100)));section.append(paragraph);
    const link=element("a",null,"Leer locus y traducción");link.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(p.locus);
    link.target="_blank";link.rel="noopener";section.append(link);context.append(section);
   }
  }
  context.append(element("p","h-sync-warning","Términos resaltados en texto editorial: no existe una transcripción diplomática íntegra de H con coordenadas de palabra."));
  return;
 }
 const number=img>=9?Math.floor((img-9)/2)+1:null,folio=number?number+(img%2===1?"r":"v"):null;
 context.append(element("p","h-sync-warning",folio?"Imagen "+img+" · f. "+folio+": sin locus directamente documentado.":"No hay foliación histórica asignada a esta imagen."));
 if(!folio)return;
 C.forFolio(folio).then(info=>{
  if(current!==renderToken)return;
  if(info.book)context.append(element("p","h-sync-evidence","Libro "+ROM[info.book.number]+" · ff. "+info.book.start+"–"+info.book.end));
  if(info.estimate&&byLocus.has(info.estimate)){
   const p=byLocus.get(info.estimate),section=element("article","h-sync-editorial");
   section.append(element("strong",null,"Locus sugerido (sin cotejo): "+p.locus));
   const para=element("p");para.append(highlightSource(p.latin.slice(0,780)));section.append(para);
   context.append(section);
   context.append(element("p","h-sync-warning","La posición se ha interpolado por volumen de texto: no constituye una identificación paleográfica."));
  }
 }).catch(()=>{});
}
async function findLocus(raw){
 const q=labelLocus(raw);matches.replaceChildren();
 if(!isLocus(q)){
  // Share the existing complete-work term search instead of introducing another search engine.
  const search=$("h-search-query"),mode=$("h-search-mode");
  if(search){search.value=raw;mode.value="concept";$("h-search-form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
   $("h-search-academic").scrollIntoView({block:"start",behavior:"smooth"});
   status.textContent="Consulta «"+raw+"» enviada al buscador de palabras clave de toda la obra.";
  }return;
 }
 const rows=corpus.filter(p=>p.locus===q||p.locus.startsWith(q+"."));
 status.textContent=rows.length+" loci identificados en la edición V514. A continuación se muestra la navegación folio por folio, con su evidencia.";
 for(const p of rows.slice(0,22)){
  const row=element("article","h-locus-row");
  row.append(element("strong",null,"Vitr. "+p.locus));
  row.append(element("p","h-locus-excerpt",p.latin.slice(0,185)+"…"));
  const link=element("a",null,"Abrir locus editorial");link.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(p.locus);
  link.target="_blank";link.rel="noopener";row.append(link);matches.append(row);
  try{await directions(p.locus,row)}catch(e){row.append(element("p","h-sync-warning","No se pudo consultar el mapa de este locus."));}
 }
 if(rows.length>22)matches.append(element("p","h-sync-warning","Se muestran 22 de "+rows.length+" loci. Introduzca un locus más preciso para localizar los demás."));
}
function enhanceResults(){
 const results=$("h-search-results");if(!results)return;
 for(const card of results.querySelectorAll("article.h-s-hit")){
  if(card.dataset.sync==="1")continue;
  card.dataset.sync="1";const locus=card.dataset.locus;
  if(!locus)continue;
  const actions=element("div","h-sync-result-actions");card.append(actions);
  directions(locus,actions).catch(()=>{});
 }
}
async function init(){
 const [text,map]=await Promise.all([
  fetch("data/structured/recensio-es.json").then(r=>{if(!r.ok)throw Error("texto");return r.json()}),
  fetch("data/codex-h/folio-locus-map.json").then(r=>{if(!r.ok)throw Error("mapa");return r.json()})
 ]);
 corpus=text.passages||[];folioMap=map;byLocus=new Map(corpus.map(p=>[p.locus,p]));
 const frag=document.createDocumentFragment();
 for(const p of corpus){const op=document.createElement("option");op.value=p.locus;frag.append(op);}
 $("h-loci-list").append(frag);
 new MutationObserver(renderContext).observe($("current-image"),{childList:true,subtree:true});
 new MutationObserver(enhanceResults).observe($("h-search-results"),{childList:true});
 renderContext();enhanceResults();
 status.textContent=corpus.length+" loci disponibles · "+map.entries.length+" correspondencias de folios documentadas. Puede localizar también los prefacios.";
 const u=new URLSearchParams(location.search);
 const locus=u.get("locus")||u.get("praef");
 if(locus){field.value=locus;findLocus(locus);}
}
form.addEventListener("submit",e=>{e.preventDefault();findLocus(field.value)});
preface.addEventListener("change",()=>{if(preface.value){field.value=preface.value;findLocus(preface.value)}});
init().catch(e=>{console.warn("Sincronización H",e);status.textContent="No se pudo cargar la concordancia codicológica. El visor IIIF continúa disponible."});
})();