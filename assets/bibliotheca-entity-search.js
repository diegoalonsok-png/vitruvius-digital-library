/* Bibliotheca: multilingual ancient persons and places, attested passage lookup.
 * Alias dictionaries suggest forms; only actual corpus hits are displayed as attestations.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const norm=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").replace(/ς/g,"σ").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);return n};
const parent=$("bibliotheca-work-search")||document.querySelector(".searcharea");
if(!parent)return;
const section=el("section");section.id="bibliotheca-entity-search";section.className="bws-entity-panel";
const heading=el("h3","Personajes y lugares mencionados en las obras");
const intro=el("p","Busque por nombre castellano, inglés, francés, latín o griego. Los equivalentes proponen términos de búsqueda; solo los pasajes comprobados constituyen testimonios.");
const form=el("form");form.setAttribute("role","search");form.setAttribute("aria-label","Buscar personajes y lugares de la Antigüedad");
const entry=el("input");entry.type="search";entry.id="bws-entity-query";entry.placeholder="Julio César · Jules César · Achilles · Atenas · Athens · Ἀθῆναι";
entry.setAttribute("aria-label","Nombre de personaje o lugar");entry.autocomplete="off";
const kind=el("select");kind.setAttribute("aria-label","Tipo de entidad");
for(const [v,t] of [["","Personajes y lugares"],["person","Solo personajes"],["place","Solo lugares"]])kind.append(new Option(t,v));
const submit=el("button","Buscar en los textos");submit.type="submit";
const controls=el("div");controls.className="bws-entity-controls";controls.append(entry,kind,submit);form.append(controls);
const status=el("p");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
const suggestions=el("div");suggestions.className="bws-entity-suggestions";
const results=el("div");results.className="bws-entity-results";
const note=el("p","La equivalencia multilingüe no significa que todas las variantes sean intercambiables. Las formas declinadas se presentan como candidatos; revise el contexto para descartar homónimos, derivados y falsos positivos.");
note.className="bws-help";
section.append(heading,intro,form,status,suggestions,results,note);
parent.append(section);
let entries=[],ready=false,serial=0;
const getJSON=async path=>{const r=await fetch(path);if(!r.ok)throw Error("No se pudo cargar "+path);return r.json()};
Promise.all([
 getJSON("data/classics-corpus/entity-aliases-persons.json"),
 getJSON("data/lexicon/toponymicon.json")
]).then(([persons,places])=>{
 entries=[
 ...(persons.persons||[]).map(p=>({...p,type:"person"})),
 ...(places.places||[]).map(p=>({...p,type:"place",forms:{
 la:(p.searchForms||[]).filter(x=>/[a-z]/i.test(x)&&!/[Α-ω]/u.test(x)),
 grc:(p.searchForms||[]).filter(x=>/[Ͱ-Ͽἀ-῿]/u.test(x))
 }}))
 ];
 ready=true;
 status.textContent="Índice de nombres cargado · "+entries.length+" identidades documentadas inicialmente. Se ampliará sin confundir variantes con ocurrencias.";
}).catch(()=>{status.textContent="No se pudo cargar el índice de nombres. El buscador de obras permanece disponible.";});
const a=(label,href)=>{const n=el("a",label);n.href=href;return n};
function candidates(q){
 const key=norm(q);
 if(key.length<2)return [];
 return entries.filter(p=>(!kind.value||p.type===kind.value)&&
  [p.label,p.nameAncient,...(p.aliases||[]),...(p.forms?.la||[]),...(p.forms?.grc||[])].some(t=>norm(t)===key))
  .slice(0,8);
}
async function run(e){
 e?.preventDefault();const current=++serial,q=entry.value.trim();results.replaceChildren();suggestions.replaceChildren();
 if(!ready){status.textContent="Índice de nombres aún no disponible.";return}
 if(norm(q).length<2){status.textContent="Escriba un nombre de al menos dos caracteres.";return}
 const found=candidates(q);
 if(!found.length){
  status.textContent="No hay una identidad inequívoca para ese nombre en el vocabulario validado. Puede buscar la forma literal en la concordancia general.";
  suggestions.append(a("Buscar texto literal en Vitruvia","vitruvia.html?q="+encodeURIComponent(q)+"&mode=all"));
  return;
 }
 for(const p of found){
  const block=el("article");block.className="bws-entity-identity";
  const title=el("strong",p.label+" · "+(p.type==="place"?"lugar":"personaje"));block.append(title);
  const forms=el("p","Formas de búsqueda antiguas: "+[...(p.forms?.la||[]),...(p.forms?.grc||[])].join(" · "));block.append(forms);
  if(p.source&&/^https:\/\//.test(p.source))block.append(a("Identificación geográfica documentada",p.source));
  suggestions.append(block);
 }
 const engine=window.ClassicsCorpusSearch;
 if(!engine?.searchPassages){status.textContent="Identidades encontradas, pero la concordancia de pasajes no está disponible.";return}
 status.textContent="Verificando las grafías antiguas contra los textos indexados…";
 const terms=[...new Set(found.flatMap(p=>[...(p.forms?.la||[]),...(p.forms?.grc||[])]))].slice(0,12);
 if(!terms.length){status.textContent="La identidad no tiene todavía formas antiguas documentadas para cotejar.";return}
 try{
  const hits=await engine.searchPassages(terms,{limit:80,maxPerEdition:8,includeOCR:false,includeFullText:false,isCancelled:()=>current!==serial});
  if(current!==serial)return;
  const original=hits.filter(x=>["la","grc"].includes(x.language)&&!x.ocr);
  const workCount=new Set(original.map(x=>x.workId)).size;
  status.textContent=original.length?
   original.length+" pasajes textuales encontrados en "+workCount+" obras (muestra limitada a 80 pasajes; búsqueda de formas documentadas).":
   "Sin coincidencias verificadas en los textos consultados; esto no demuestra ausencia en manuscritos ni facsímiles no indexados.";
  const list=el("ol");
  for(const h of original.slice(0,80)){
   const li=el("li");const link=a((h.author||"Autor")+" · "+(h.title||h.workId)+" · "+(h.locus||"pasaje sin locus") + " ["+h.language+"]",h.link);
   li.append(link,el("p",(h.term?"Forma: "+h.term+" · ":"")+(h.excerpt||"")));list.append(li);
  }
  results.append(list);
 }catch(error){
  if(current===serial)status.textContent="No se pudo verificar los pasajes. La identidad propuesta no debe citarse como ocurrencia.";
 }
}
form.addEventListener("submit",run);
entry.addEventListener("input",()=>{serial++;status.textContent=ready?"Escriba el nombre y pulse «Buscar en los textos».":status.textContent;results.replaceChildren();suggestions.replaceChildren()});
})();