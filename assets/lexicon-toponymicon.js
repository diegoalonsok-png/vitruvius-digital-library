/* Lexicon Toponymicon: geographically grounded, historically sourced places.
   A Pleiades coordinate is not a historical map or ancient urban boundary.
   Author/work excerpts only from hosted, registered transcriptions. */
(()=>{
"use strict";
const form=document.getElementById("lx-form"),input=document.getElementById("lx-q");
if(!form||!input||document.getElementById("lx-toponymicon"))return;
const p=document.createElement("section");
p.id="lx-toponymicon";p.className="lx-toponymicon";
p.setAttribute("aria-label","Toponymicon e Index locorum geográfico");
p.innerHTML='<details id="lx-topo-details"><summary>Toponymicon · lugares del mundo antiguo <span class="lx-topo-kicker">Topónimos · cartografía · loci</span></summary><div class="lx-topo-inner"><p>Investigue ciudades y lugares por su nombre en castellano, inglés, latín o griego antiguo. La identificación geográfica se enlaza con <strong>Pleiades</strong> y con cartografía de reconstrucción académica del Ancient World Mapping Center. Los pasajes proceden únicamente de los corpus textuales registrados.</p><div class="lx-topo-row"><label for="lx-topo-q">Lugar antiguo</label><input id="lx-topo-q" type="search" dir="auto" placeholder="Atenas · Athens · Ἀθῆναι · Roma · Κόρινθος"><button id="lx-topo-search" type="button">Consultar lugar y pasajes</button></div><p id="lx-topo-state" role="status" aria-live="polite"></p><div id="lx-topo-result"></div></div></details>';
form.parentElement?.after(p);
const $=id=>document.getElementById(id),status=$("lx-topo-state"),result=$("lx-topo-result");
const modeExact=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase().replace(/[ςϲ]/g,"σ").trim();
const boundary=/[\p{L}\p{M}\p{N}]/u;
const placeIndex=fetch("data/lexicon/toponymicon.json").then(r=>{if(!r.ok)throw Error("Registro de lugares HTTP "+r.status);return r.json()});
let registryPromise=null,active=0;
function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n}
function anchor(url,title){const a=node("a",title);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
function firstMatch(places,query){
 const key=modeExact(query);if(key.length<2)return null;
 return places.find(place=>[place.label,place.nameAncient,...place.aliases].some(alias=>modeExact(alias)===key))||null;
}
function wholeMatches(text,form){
 const src=String(text||""),a=modeExact(src),q=modeExact(form);
 if(!q||q.length<3)return null;
 let i=a.indexOf(q);while(i>=0){
  if(!boundary.test(a[i-1]||"")&&!boundary.test(a[i+q.length]||""))return {index:i,form:src.slice(i,i+q.length)};
  i=a.indexOf(q,i+q.length);
 }
 return null;
}
function sourceTexts(e,documentContent){
 if(e.format==="json-passages")return (documentContent.passages||[]).map(p=>({locus:p.locus||p.id||"",text:p.text||""}));
 if(e.format==="structured-bilingual")return (documentContent.passages||[]).map(p=>({locus:p.locus||"",text:e.language==="la"?p.latin||"":p.translation||""}));
 if(e.format==="html-text"){
  const d=new DOMParser().parseFromString(documentContent,"text/html"),root=d.querySelector("main")||d.body;
  return [...root.querySelectorAll("p")].filter(p=>p.textContent.trim().length>45&&!p.closest("nav,header,footer,.provenance,.apparatus"))
   .map(p=>({locus:p.id||p.closest("[id]")?.id||"",text:p.textContent||"",anchor:p.id||p.closest("[id]")?.id||""}));
 }
 return [];
}
function buildLink(entry,p,term){
 const u=new URL(entry.reader||entry.path,location.href);
 if(entry.format==="html-text"){if(p.anchor)u.hash=encodeURIComponent(p.anchor)}
 else if(p.locus)u.searchParams.set("locus",p.locus);
 u.searchParams.set("q",term);
 if(entry.format==="json-passages")u.searchParams.set("literal","1");
 return u.href;
}
function preview(text,m){
 const s=String(text||"").replace(/\s+/g," ");const start=Math.max(0,m?.index-68||0);
 return (start?"…":"")+s.slice(start,Math.min(s.length,start+240))+(s.length>start+240?"…":"");
}
function presentation(place){
 result.replaceChildren();
 const title=node("h3",place.label+" · "+place.nameAncient);
 const card=node("article",undefined,"lx-topo-card");card.append(title);
 card.append(node("p",place.description));
 card.append(node("p","Variantes documentales registradas: "+place.aliases.join(" · "),"lx-topo-forms"));
 const links=node("nav",undefined,"lx-topo-links");
 links.setAttribute("aria-label","Atlas históricos y referencias externas");
 links.append(
  anchor(place.source,"Pleiades · lugar identificado y mapa"),
  anchor("https://isaw.nyu.edu/exhibitions/space/alacarte.html","Antiquity À-la-carte · mapas históricos reconstruidos"),
  anchor("https://pleiades.stoa.org/places","Pleiades · explorar topónimos antiguos")
 );
 card.append(links);
 card.append(node("p","Precisión: el mapa de Pleiades y las capas AWMC son cartografía moderna de reconstrucción histórica, no mapas dibujados en la propia Antigüedad. La localización es representativa, no el perímetro arqueológico.","lx-topo-method"));
 const subtitle=node("h4","Index locorum geográfico · testimonios locales");card.append(subtitle);
 const hits=node("div",undefined,"lx-topo-attestations");card.append(hits);result.append(card);
 return hits;
}
async function searchToponym(query,automatic=false){
 const id=++active,word=String(query||"").trim().slice(0,120);
 if(word.length<2){status.textContent="Introduzca el nombre de un lugar antiguo.";result.replaceChildren();return}
 status.textContent="Identificando el topónimo y consultando las ediciones…";
 try{
  const data=await placeIndex;if(id!==active)return;
  const place=firstMatch(data.places||[],word);
  if(!place){
   if(automatic){status.textContent="";return}
   status.textContent="Todavía no existe una ficha editorial para este nombre. Puede consultar Pleiades; la ausencia no implica que el lugar no exista.";
   result.replaceChildren();
   return;
  }
  $("lx-topo-details").open=true;
  const box=presentation(place);status.textContent="Topónimo identificado: "+place.label+". Buscando pasajes reales por grafías registradas…";
  if(!registryPromise)registryPromise=fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro textual HTTP "+r.status);return r.json()}).catch(e=>{registryPromise=null;throw e});
  const register=await registryPromise;if(id!==active)return;
  const entries=(register.entries||[]).filter(e=>["la","grc"].includes(e.language)&&["json-passages","html-text","structured-bilingual"].includes(e.format));
  let loaded=0,failed=0,hitEditions=0,hitLoci=0;
  for(let i=0;i<entries.length;i+=5){
   const batch=await Promise.all(entries.slice(i,i+5).map(async entry=>{
    try{
     const res=await fetch(entry.path);if(!res.ok)throw Error(String(res.status));
     return {entry,passages:sourceTexts(entry,entry.format==="html-text"?await res.text():await res.json())};
    }catch{return {entry,failed:true}}
   }));
   if(id!==active)return;
   for(const item of batch){
    if(item.failed){failed++;continue}
    loaded++;
    const forms=place.searchForms||[];
    const matches=[];
    for(const passage of item.passages){
     // Only listed variant forms count, never broad semantic or phonetic guesses.
     const found=forms.map(form=>({form,match:wholeMatches(passage.text,form)})).find(x=>x.match);
     if(found)matches.push({...found,passage});
    }
    if(!matches.length)continue;
    hitEditions++;hitLoci+=matches.length;
    const edition=node("section",undefined,"lx-topo-edition");
    edition.append(node("h5",item.entry.author+" · "+item.entry.title+" · "+item.entry.language.toUpperCase()));
    edition.append(node("p",matches.length+" pasajes con topónimo · fuente: "+(item.entry.sourceDescription||item.entry.path),"lx-topo-citation"));
    for(const {form,match,passage} of matches.slice(0,5)){
     const row=node("div",undefined,"lx-topo-locus");
     const link=anchor(buildLink(item.entry,passage,match.form),"Locus "+(passage.locus||"sin segmentación editorial")+" · abrir texto");
     link.target="_self";row.append(link,node("p",preview(passage.text,match)));
     row.append(node("small","Grafía indexada: "+form+" · lectura encontrada: "+match.form));
     edition.append(row);
    }
    if(matches.length>5)edition.append(node("p","Se muestran cinco pasajes de esta edición; consulte el texto fuente para continuar.","lx-topo-citation"));
    box.append(edition);
   }
  }
  status.textContent=place.label+": "+hitLoci+" pasajes con topónimo en "+hitEditions+" ediciones; "+loaded+" fuentes consultadas y "+failed+" no disponibles. Las demás obras del catálogo pueden carecer de transcripción indexada.";
  if(!hitEditions)box.append(node("p","No se documentaron coincidencias en las fuentes accesibles. No se infiere ausencia histórica ni en otras flexiones, manuscritos u OCR."));
 }catch(err){if(id===active)status.textContent="No se completó el estudio del lugar: "+err.message}
}
$("lx-topo-search").addEventListener("click",()=>searchToponym($("lx-topo-q").value||input.value));
$("lx-topo-q").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchToponym(e.currentTarget.value)}});
form.addEventListener("submit",()=>{
 const q=input.value.trim();$("lx-topo-q").value=q;
 placeIndex.then(d=>{if(firstMatch(d.places||[],q))searchToponym(q,true)}).catch(()=>{});
});
const initial=new URLSearchParams(location.search).get("q");
if(initial){placeIndex.then(d=>{if(firstMatch(d.places||[],initial)){$("lx-topo-q").value=initial;searchToponym(initial,true)}}).catch(()=>{})}
})();
