/* Concordancia por locus de Bibliotheca. Implementación independiente,
   inspirada en funciones de Perseus / Scaife. Solo testimonios realmente leídos.
   Los candidatos morfológicos no se presentan como lemas verificados. */
(()=>{"use strict";
const node=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined&&txt!==null)n.textContent=String(txt);if(cls)n.className=cls;return n};
const safeLink=s=>{try{const u=new URL(String(s||""),location.href);return u.origin===location.origin&&/\.html(?:$|[?#])/.test(u.pathname+u.search)?u.pathname+u.search+u.hash:""}catch{return ""}};
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").trim();
let token=0,versions=[];
function init(){
 const parent=document.querySelector(".searcharea");
 if(!parent||document.getElementById("bibliotheca-concordance"))return;
 const pane=node("section",null,"bws-concordance");pane.id="bibliotheca-concordance";
 const h=node("h3","Concordancia filológica de obras y pasajes");
 const p=node("p","Búsqueda literal en textos efectivamente indexados (griego y latín). Cada resultado conserva obra, edición, locus y un enlace al pasaje. Las formas flexionadas solo se buscan si se escriben; esto no es lematización académica automática.");
 const form=node("form");form.setAttribute("role","search");form.setAttribute("aria-label","Concordancia académica");
 const q=node("input");q.type="search";q.placeholder="architectura · symmetria · Ἀχιλλεύς · πόλις";q.required=true;q.maxLength=120;q.setAttribute("aria-label","Palabra o frase exacta, griega o latina");
 const lang=node("select");lang.setAttribute("aria-label","Lengua original");
 for(const [v,t] of [["","Griego y latín"],["la","Solo latín"],["grc","Solo griego"]])lang.append(new Option(t,v));
 const works=node("select");works.setAttribute("aria-label","Obra");works.append(new Option("Todas las obras indexadas",""));
 const go=node("button","Localizar pasajes");go.type="submit";
 const controls=node("div",null,"bws-concordance-controls");controls.append(q,lang,works,go);form.append(controls);
 const count=node("p","Cargando índice de ediciones…","bws-concordance-status");count.setAttribute("role","status");count.setAttribute("aria-live","polite");
 const results=node("ol",null,"bws-concordance-hits");
 const more=node("button","Mostrar más loci");more.type="button";more.hidden=true;
 const method=node("p","Método: búsqueda literal sobre transcripciones con pasajes identificados; el resultado no certifica manuscritos ni establece un aparato crítico. Los manuscritos OCR y las traducciones quedan excluidos de este filtro. Los loci proceden de los registros originales; no se generan numeraciones nuevas.","bws-help");
 pane.append(h,p,form,count,results,more,method);
 const workPanel=document.getElementById("bibliotheca-work-search");
 if(workPanel)workPanel.insertAdjacentElement("afterend",pane);else parent.append(pane);
 let hits=[],display=0,searching=false;
 const render=()=>{
  results.replaceChildren();
  const batch=hits.slice(display,display+25);
  for(const x of batch){
   const li=node("li",null,"bws-concordance-hit");
   const a=node("a",[(x.author||""),(x.title||x.workId),(x.locus||"locus no indicado")].filter(Boolean).join(" · "));
   const url=safeLink(x.link);
   if(url)a.href=url;else {li.append(node("strong","Pasaje identificado; enlace de lector no validado"))}
   if(url)li.append(a);
   const meta=node("p",[
    "Lengua: "+(x.language==="grc"?"griego":x.language==="la"?"latín":x.language),
    x.edition?"Edición: "+x.edition:"",
    "Forma: "+(x.term||q.value.trim()),
    x.attribution?"Procedencia: "+x.attribution:""
   ].filter(Boolean).join(" · "),"bws-concordance-meta");
   li.append(meta,node("p",x.excerpt||"","bws-concordance-excerpt"));
   const cite=node("button","Copiar referencia");cite.type="button";
   cite.addEventListener("click",async()=>{
    const value=[x.author,x.title,x.locus,x.edition,x.source,location.origin+url].filter(Boolean).join(" · ");
    try{await navigator.clipboard.writeText(value);cite.textContent="Referencia copiada"}
    catch{cite.textContent="Seleccione el enlace para copiar la referencia"}
   });
   li.append(cite);results.append(li);
  }
  display+=batch.length;more.hidden=display>=hits.length;
 };
 more.addEventListener("click",render);
 const setState=s=>{count.textContent=s};
 async function search(e){
  e?.preventDefault();const my=++token,term=q.value.trim();
  results.replaceChildren();hits=[];display=0;more.hidden=true;
  if(fold(term).length<2){setState("Ingrese al menos dos caracteres.");return}
  const engine=window.ClassicsCorpusSearch;
  if(!engine?.searchPassages){setState("La búsqueda de pasajes no está disponible; el catálogo de títulos sigue funcionando.");return}
  const matches=versions.filter(v=>(!lang.value||v.language===lang.value)&&(!works.value||v.workId===works.value));
  if(!matches.length){setState("No hay transcripciones originales registradas con esos filtros.");return}
  searching=true;go.disabled=true;
  setState("Examinando textos y loci de las ediciones seleccionadas…");
  try{
   const list=await engine.searchPassages([term],{
    allowedWorkIds:[...new Set(matches.map(x=>x.workId))],language:lang.value,
    limit:250,maxPerEdition:80,includeOCR:false,
    isCancelled:()=>my!==token,
    onProgress:(rows,progress)=>{if(my===token)setState("Ediciones examinadas: "+progress.examined+" de "+progress.targeted+"…")}
   });
   if(my!==token)return;
   // A language filter without language selection must still hide translations.
   const allowed=new Set(matches.map(x=>[x.workId,x.language,x.source||x.path].join("|")));
   hits=list.filter(x=>["la","grc"].includes(x.language)&&!x.ocr&&
    (!works.value||x.workId===works.value)&&(!lang.value||x.language===lang.value)&&
    allowed.has([x.workId,x.language,x.source].join("|")));
   setState(hits.length+" loci recuperados de las versiones originales registradas. Resultado limitado a un máximo de 250; no equivale al recuento total de ocurrencias.");
   if(!hits.length)results.append(node("li","Sin testimonios recuperados en este ámbito. No implica ausencia en otras ediciones."));
   render();
  }catch(error){if(my===token)setState("Falló la consulta de pasajes. No se puede afirmar que el término esté ausente.")}
  finally{if(my===token){searching=false;go.disabled=false}}
 }
 form.addEventListener("submit",search);
 for(const select of [works,lang])select.addEventListener("change",()=>{token++;hits=[];results.replaceChildren();more.hidden=true;if(!searching)setState("Filtros actualizados; ejecute una nueva consulta.")});
 Promise.resolve().then(()=>window.ClassicsCorpusSearch?.registry?.()).then(rows=>{
  if(!Array.isArray(rows))throw Error("Corpus registry missing");
  versions=rows.filter(x=>["la","grc"].includes(x.language)&&
   ["json-passages","structured-bilingual","html-text"].includes(x.format)&&
   typeof x.workId==="string"&&typeof x.path==="string");
  const names=new Map();
  for(const x of versions){if(!names.has(x.workId))names.set(x.workId,[x.author,x.title].filter(Boolean).join(" · "))}
  for(const [id,title] of [...names.entries()].sort((a,b)=>a[1].localeCompare(b[1],"es",{sensitivity:"base"})))works.append(new Option(title,id));
  setState("Listo: "+names.size+" obras y "+versions.length+" versiones originales registradas. Busque por palabra, frase, obra y lengua.");
  const params=new URLSearchParams(location.search);
  const initQ=params.get("concordance");
  if(initQ){q.value=initQ;if(["la","grc"].includes(params.get("c-lang")))lang.value=params.get("c-lang");if(names.has(params.get("c-work")))works.value=params.get("c-work");void search()}
 }).catch(()=>setState("No se pudo comprobar el registro. No se presentan falsos resultados."));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();