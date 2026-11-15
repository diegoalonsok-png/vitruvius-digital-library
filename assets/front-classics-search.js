/* Portada · búsqueda federada interna: Vitruvio y corpus clásico.
 * No reemplaza ni intercepta el buscador de las ediciones V514/V554/V297.
 * Loci comprobados contra transcripciones, nunca inventados desde fichas.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id),mk=(tag,text,cls)=>{const el=document.createElement(tag);if(text!=null)el.textContent=String(text);if(cls)el.className=cls;return el};
const safe=s=>{try{const u=new URL(String(s||""),location.href);return u.origin===location.origin&&/\/[a-z0-9/_-]+\.html$/i.test(u.pathname)?u.pathname+u.search+u.hash:""}catch{return ""}};
const normalize=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").trim();
function init(){
 const form=$("search-form"),query=$("query");if(!form||!query||$("front-classics-search"))return;
 const panel=mk("section",null,"front-classics-search");panel.id="front-classics-search";
 const head=mk("h3","Ampliar la búsqueda al corpus clásico griego y latino");
 const explain=mk("p","El buscador principal mantiene sus tres ediciones de Vitruvio. Esta capa adicional busca pasajes en otras obras de la Bibliotheca y distingue resultados textuales de fichas bibliográficas. No equivale a una búsqueda morfológica por lema.");
 const row=mk("div",null,"front-classics-controls");
 const active=mk("input");active.type="checkbox";active.id="front-classics-enabled";active.checked=false;
 const label=mk("label");label.htmlFor=active.id;label.append(active,document.createTextNode(" Incluir textos originales de Bibliotheca en la próxima búsqueda"));
 const lang=mk("select");lang.id="front-classics-lang";lang.setAttribute("aria-label","Lengua del corpus");
 for(const [val,t] of [["","Latín y griego"],["la","Solo latín"],["grc","Solo griego"]])lang.append(new Option(t,val));
 const work=mk("select");work.id="front-classics-work";work.setAttribute("aria-label","Obra del corpus");work.append(new Option("Todas las obras indexadas",""));
 const launch=mk("button","Buscar en la Bibliotheca");launch.type="button";
 row.append(label,lang,work,launch);
 const status=mk("p","Búsqueda adicional opcional: active la casilla o pulse «Buscar en la Bibliotheca».","front-classics-status");
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 const result=mk("ol",null,"front-classics-results");
 const more=mk("button","Mostrar otros pasajes");more.type="button";more.hidden=true;
 const catalog=mk("p");const link=mk("a","Explorar todas las obras y sus ediciones");link.href="bibliotheca-graeca-latina.html";catalog.append(link);
 const caveat=mk("p","Para no bloquear la portada, los textos se solicitan únicamente al ejecutar una búsqueda en el corpus. La ausencia de resultados no demuestra ausencia en facsímiles o ediciones no indexadas. El cotejo manuscrito se consulta en otra sección.","front-classics-method");
 panel.append(head,explain,row,status,result,more,catalog,caveat);
 form.insertAdjacentElement("afterend",panel);
 let versions=[],current=0,items=[],count=0,loaded=false;
 const draw=()=>{
  const next=items.slice(count,count+20);
  for(const x of next){
   const li=mk("li",null,"front-classics-item");
   const url=safe(x.link);
   if(url){const a=mk("a",[x.author,x.title,x.locus||"pasaje"].filter(Boolean).join(" · "));a.href=url;li.append(a)}
   else li.append(mk("strong","Referencia sin enlace verificable"));
   li.append(mk("p",["Texto original: "+(x.language==="grc"?"griego":"latín"),x.edition?"Edición: "+x.edition:"",x.term?"Forma: "+x.term:"",x.source?"Fuente: "+x.source:""].filter(Boolean).join(" · "),"front-classics-meta"));
   if(x.excerpt)li.append(mk("p",x.excerpt,"front-classics-excerpt"));
   result.append(li);
  }
  count+=next.length;more.hidden=count>=items.length;
 };
 more.addEventListener("click",draw);
 async function getWorks(){
  if(loaded)return;
  const corpus=window.ClassicsCorpusSearch;
  if(!corpus?.registry)throw Error("Motor bibliográfico no cargado");
  const entries=await corpus.registry();
  versions=entries.filter(x=>["la","grc"].includes(x.language)&&["json-passages","structured-bilingual","html-text"].includes(x.format)&&/^[a-z0-9-]+$/.test(x.workId||""));
  const names=new Map();
  for(const v of versions)if(!names.has(v.workId))names.set(v.workId,[v.author,v.title].filter(Boolean).join(" · "));
  for(const [id,name] of [...names].sort((a,b)=>a[1].localeCompare(b[1],"es",{sensitivity:"base"})))work.append(new Option(name,id));
  loaded=true;
 }
 async function search(){
  const id=++current,q=query.value.trim();result.replaceChildren();more.hidden=true;items=[];count=0;
  if(normalize(q).length<2){status.textContent="Escriba por lo menos dos caracteres en la búsqueda principal.";return}
  launch.disabled=true;status.textContent="Preparando el índice de textos originales…";
  try{
   await getWorks();if(id!==current)return;
   const valid=versions.filter(v=>(!lang.value||v.language===lang.value)&&(!work.value||v.workId===work.value));
   if(!valid.length){status.textContent="Sin versiones originales registradas para esos filtros.";return}
   const byEntry=new Set(valid.map(v=>[v.workId,v.language,v.path].join("|")));
   const corpus=window.ClassicsCorpusSearch;
   const hits=await corpus.searchPassages([q],{allowedWorkIds:[...new Set(valid.map(v=>v.workId))],language:lang.value,limit:150,maxPerEdition:35,includeOCR:false,isCancelled:()=>id!==current,
    onProgress:(_,p)=>{if(id===current)status.textContent="Verificando pasajes · ediciones examinadas: "+p.examined+"/"+p.targeted}});
   if(id!==current)return;
   items=hits.filter(x=>["la","grc"].includes(x.language)&&!x.ocr&&byEntry.has([x.workId,x.language,x.source].join("|")));
   const diag=corpus.diagnostics?.()||{};
   const fail=Number(diag.failed||0);
   status.textContent=items.length+" pasajes recuperados"+(fail?" · "+fail+" ediciones no pudieron leerse: resultado parcial":"")+" · máximo 150 registros, no un recuento exhaustivo.";
   if(!items.length)result.append(mk("li","No se recuperaron pasajes en las ediciones disponibles. Puede probar otra forma o seleccionar una obra."));
   draw();
  }catch(err){if(id===current)status.textContent="No se pudo verificar el corpus clásico. El buscador principal de Vitruvio sigue disponible."}
  finally{if(id===current)launch.disabled=false}
 }
 launch.addEventListener("click",search);
 form.addEventListener("submit",()=>{if(active.checked)void search();else {current++;items=[];result.replaceChildren();more.hidden=true;status.textContent="Búsqueda limitada a Vitruvio. Active el corpus o use el botón de Bibliotheca."}});
 for(const select of [lang,work])select.addEventListener("change",()=>{current++;items=[];result.replaceChildren();more.hidden=true;status.textContent="Filtros modificados. Ejecute la búsqueda del corpus."});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();