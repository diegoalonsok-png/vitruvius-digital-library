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
function card(e){
 const c=el("article","map-card");c.id=e.id;c.dataset.era=ERA(e.sort);
 const fig=el("figure","map-figure");
 const src=e.localImage||(e.commonsFile?commons(e.commonsFile):null);
 if(src){const img=el("img");img.src=src;img.loading="lazy";img.decoding="async";img.alt=e.title+" · "+(e.shelfmark||"");
  img.addEventListener("error",()=>{fig.replaceChildren(el("p","map-noimg","Imagen no disponible en este momento: consulta la reproducción en la institución o en Commons."))});
  const a=el("a");a.href=e.localImage||commonsPage(e.commonsFile);a.target="_blank";a.rel="noopener noreferrer";a.append(img);fig.append(a)}
 else fig.append(el("p","map-noimg","Reproducción en la institución o en Commons (enlaces al pie de la ficha)."));
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
