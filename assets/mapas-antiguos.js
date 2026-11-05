/* Tabulae geographicae: mapas y planos históricos por fecha, con signatura, folio y evidencia. */
(()=>{
"use strict";
const $=s=>document.querySelector(s);
const el=(t,c,v)=>{const x=document.createElement(t);if(c)x.className=c;if(v!=null)x.textContent=String(v);return x};
const link=(t,u)=>{const a=el("a",null,t);a.href=u;if(/^https?:/.test(u)){a.target="_blank";a.rel="noopener noreferrer"}return a};
const commons=f=>"https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(f)+"?width=900";
const commonsPage=f=>"https://commons.wikimedia.org/wiki/File:"+encodeURIComponent(f.replace(/ /g,"_"));
const ERA=s=>s<500?"antigua":s<1450?"medieval":s<1600?"renacimiento":"moderna";
let all=[];
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
/* Mapas sin archivo fijado: se busca en Commons y solo se acepta un archivo cuyo nombre contenga las
   palabras clave de esa pieza (commonsKeys). Se enlaza la ficha de Commons con autor y licencia. */
async function findCommons(e,fig){
 const u="https://commons.wikimedia.org/w/api.php?"+new URLSearchParams({action:"query",format:"json",origin:"*",generator:"search",
  gsrsearch:e.commonsSearch+" filetype:bitmap",gsrnamespace:"6",gsrlimit:"20",prop:"imageinfo",iiprop:"url|mime|size|extmetadata",iiurlwidth:"900"});
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),12000);
 let d=null;try{d=await (await fetch(u,{signal:ctl.signal})).json()}finally{clearTimeout(t)}
 const keys=(e.commonsKeys||fold(e.commonsSearch).split(/\s+/).filter(w=>w.length>3)).map(fold);
 const need=Math.min(2,keys.length);
 const pages=Object.values(d?.query?.pages||{}).map(p=>({p,i:p.imageinfo?.[0],t:fold(p.title)}))
  .filter(x=>x.i&&/^image\/(jpeg|png|tiff)$/.test(x.i.mime||"")&&x.i.thumburl&&keys.filter(k=>k.split("|").some(v=>x.t.includes(v))).length>=need)
  .map(x=>({...x,score:keys.filter(k=>k.split("|").some(v=>x.t.includes(v))).length*10+(/\b(detail|detalle|ausschnitt|fragment)\b/.test(x.t)?-8:0)+Math.min(8,(x.i.width||0)/1000)+(x.p.index?(20-x.p.index)/10:0)}))
  .sort((a,b)=>b.score-a.score);
 const best=pages[0];
 if(!best||!fig.isConnected){fig.replaceChildren(el("p","map-noimg","Sin reproducción identificada con certeza en Commons: consulta la institución (enlaces al pie de la ficha)."));return}
 const img=el("img");img.src=best.i.thumburl;img.loading="lazy";img.decoding="async";img.alt=e.title+" · "+(e.shelfmark||"");
 const a=el("a");a.href=best.i.descriptionurl;a.target="_blank";a.rel="noopener noreferrer";a.append(img);
 const strip=s=>String(s||"").replace(/<[^>]*>/g,"").trim();
 const lic=strip(best.i.extmetadata?.LicenseShortName?.value);
 const cap=el("figcaption","map-cap","Reproducción en Wikimedia Commons: "+best.p.title.replace(/^File:/,"")+(lic?" · "+lic:""));
 fig.replaceChildren(a,cap);
}
function card(e){
 const c=el("article","map-card");c.id=e.id;c.dataset.era=ERA(e.sort);
 const fig=el("figure","map-figure");
 const src=e.localImage||(e.commonsFile?commons(e.commonsFile):null);
 if(src){const img=el("img");img.src=src;img.loading="lazy";img.decoding="async";img.alt=e.title+" · "+(e.shelfmark||"");
  img.addEventListener("error",()=>{fig.replaceChildren(el("p","map-noimg","Imagen no disponible en este momento: consulta la reproducción en la institución o en Commons."))});
  const a=el("a");a.href=e.localImage||commonsPage(e.commonsFile);a.target="_blank";a.rel="noopener noreferrer";a.append(img);fig.append(a)}
 else{const wait=el("p","map-noimg","Buscando una reproducción documentada en Wikimedia Commons…");fig.append(wait);
  if(e.commonsSearch)void findCommons(e,fig).catch(()=>{});else wait.textContent="Reproducción en la institución (enlaces al pie de la ficha)."}
 c.append(fig);
 const body=el("div","map-body");
 body.append(el("p","map-date",e.date),el("h2",null,e.title));
 const dl=el("dl");const row=(k,v)=>{if(!v)return;dl.append(el("dt",null,k),el("dd",null,v))};
 row("Lugar",e.place);row("Personalidad asociada",e.person);row("Tipo",e.type);row("Institución",e.holding);
 row("Signatura",e.shelfmark);row("Folio",e.folio||"—");row("Evidencia",e.evidence);
 body.append(dl,el("p",null,e.summary));
 const v=el("p","map-vitr");v.append(el("strong",null,"Relación con Vitruvio: "),e.vitruvius);body.append(v);
 const ln=el("p","map-links");
 if(e.readerLink)ln.append(link("Leer el pasaje →",e.readerLink));
 if(e.localLink)ln.append(link("Ver en el sitio →",e.localLink));
 for(const [t,u] of e.links||[])ln.append(link(t+(/^https?:/.test(u)?" ↗":" →"),u));
 if(e.commonsFile)ln.append(link("Commons · procedencia y licencia ↗",commonsPage(e.commonsFile)));
 if(e.commonsSearch)ln.append(link("Buscar reproducciones en Commons ↗","https://commons.wikimedia.org/w/index.php?search="+encodeURIComponent(e.commonsSearch)+"&title=Special:MediaSearch&type=image"));
 body.append(ln);
 const cite=el("p","map-cite","Cita: "+[e.holding,e.shelfmark,e.folio].filter(Boolean).join(", ")+" ("+e.date+").");body.append(cite);
 c.append(body);return c;
}
function render(){
 const era=$("#map-era").value,q=($("#map-q").value||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
 const list=all.filter(e=>(!era||ERA(e.sort)===era)&&(!q||JSON.stringify(e).normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().includes(q)));
 const root=$("#map-list");root.replaceChildren(...list.map(card));
 $("#map-count").textContent=list.length+" de "+all.length+" mapas y planos, del más antiguo al más reciente";
}
fetch("data/mapas-antiguos.json").then(r=>r.json()).then(d=>{all=d.entries.slice().sort((a,b)=>a.sort-b.sort);$("#map-note").textContent=d.note;render();
 $("#map-era").addEventListener("change",render);$("#map-q").addEventListener("input",render);
 if(location.hash)setTimeout(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView({block:"start"}),300)}).catch(e=>{$("#map-count").textContent="No se pudo cargar el catálogo: "+e.message});
})();
