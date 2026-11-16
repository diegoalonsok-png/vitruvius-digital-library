/* Portada · búsqueda federada interna: Vitruvio y corpus clásico.
 * No reemplaza ni intercepta el buscador de las ediciones V514/V554/V297.
 * Loci comprobados contra transcripciones, nunca inventados desde fichas.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id),mk=(tag,text,cls)=>{const el=document.createElement(tag);if(text!=null)el.textContent=String(text);if(cls)el.className=cls;return el};
const safe=s=>{try{const u=new URL(String(s||""),location.href);return u.origin===location.origin&&/\/[a-z0-9/_-]+\.html$/i.test(u.pathname)?u.pathname+u.search+u.hash:""}catch{return ""}};
const normalize=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").trim();
function init(){
 const form=$("search-form");if(!form||$("front-classics-search"))return;
 const panel=mk("section",null,"front-classics-search");panel.id="front-classics-search";
 const head=mk("h3","Ampliar la búsqueda al corpus clásico griego y latino");
 const explain=mk("p","El buscador principal mantiene sus tres ediciones de Vitruvio. Esta capa adicional busca pasajes en otras obras de la Bibliotheca y distingue resultados textuales de fichas bibliográficas. No equivale a una búsqueda morfológica por lema.");
 const row=mk("div",null,"front-classics-controls");
 const query=mk("input");query.id="front-classics-query";query.type="search";query.maxLength=200;
 query.placeholder="Buscar en clásicos: λόγος, domus, architectura…";
 query.setAttribute("aria-label","Buscar en Bibliotheca Graeca et Latina");
 query.style.cssText="width:100%;min-height:43px;padding:10px;background:#0e151b;color:#fff;border:1px solid #8a8c8c;border-radius:6px";
 const ownSearch=mk("label");ownSearch.style.cssText="display:block;font:13px system-ui";
 ownSearch.append(mk("span","Buscar en las obras clásicas"),query);
 const lang=mk("select");lang.id="front-classics-lang";lang.setAttribute("aria-label","Lengua del corpus");
 for(const [val,t] of [["","Latín y griego"],["la","Solo latín"],["grc","Solo griego"]])lang.append(new Option(t,val));
 const work=mk("select");work.id="front-classics-work";work.setAttribute("aria-label","Obra del corpus");work.append(new Option("Todas las obras indexadas",""));
 const mode=mk("select");mode.id="front-classics-mode";mode.setAttribute("aria-label","Tipo de búsqueda académica");
 for(const [value,name] of [["literal","Texto literal"],["lemma","Lema y formas conocidas"],["concept","Conceptus multilingüe"],["passage","Párrafos y loci"]])mode.append(new Option(name,value));
 const locus=mk("input");locus.id="front-classics-locus";locus.type="search";locus.maxLength=150;locus.placeholder="Locus (opcional)";locus.setAttribute("aria-label","Referencia de locus para filtrar");
 const launch=mk("button","Buscar en la Bibliotheca");launch.type="button";
 row.append(lang,work,mode,locus,launch);
 const status=mk("p","Buscador independiente de obras griegas y latinas: escribe un término y pulsa Buscar en la Bibliotheca.","front-classics-status");
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 const titles=mk("div",null,"front-classics-titles");
 const result=mk("ol",null,"front-classics-results");
 const more=mk("button","Mostrar otros pasajes");more.type="button";more.hidden=true;
 const catalog=mk("p");const link=mk("a","Explorar todas las obras y sus ediciones");link.href="bibliotheca-graeca-latina.html";catalog.append(link);
 const caveat=mk("p","Lema: se consultan formas conocidas, no toda la morfología posible. Conceptus: equivalencias documentadas, no embeddings neuronales. La búsqueda por locus filtra pasajes recuperados; la falta de resultados no demuestra ausencia en textos sin indexar.","front-classics-method");
 let conceptsPromise=null;
 const conceptTerms=async term=>{
  if(!conceptsPromise)conceptsPromise=fetch("data/lexicon/conceptus.json").then(r=>{if(!r.ok)throw Error("Conceptus HTTP "+r.status);return r.json()}).catch(e=>{conceptsPromise=null;throw e});
  const data=await conceptsPromise,key=normalize(term);
  const found=(data.concepts||[]).filter(x=>[x.id,...(x.la||[]),...(x.grc||[]),...Object.values(x.modern||{}).flat()].some(y=>typeof y==="string"&&normalize(y)===key));
  return [...new Set(found.slice(0,3).flatMap(x=>[...(x.la||[]),...(x.grc||[])]))].filter(x=>normalize(x)!==key).slice(0,12);
 };
 const knownForms={
  architectura:["architectura","architecturae","architecturam","architecturas","architecturis","architecturarum"],
  domus:["domus","domum","domui","domo","domos","domorum","domibus"],
  aedifico:["aedifico","aedificas","aedificat","aedificare","aedificavit","aedificandi","aedificanda"],
  λόγος:["λόγος","λόγου","λόγον","λόγῳ","λόγοι","λόγων","λόγοις","λόγους"]
 };
 const lemmaTerms=term=>Object.values(knownForms).find(forms=>forms.some(x=>normalize(x)===normalize(term)))||[term];
 const matchLocus=(ref,wanted)=>{
  const foldRef=x=>String(x||"").toLowerCase().replace(/^urn:cts:[^:]+:[^:]+:/,"").replace(/[^a-z0-9.]/g,"");
  const a=foldRef(ref),b=foldRef(wanted);
  return !b||a===b||a.startsWith(b+".");
 };
 panel.append(head,explain,ownSearch,row,status,titles,result,more,catalog,caveat);
 const destination=$("front-classics-suite");if(destination){destination.replaceChildren(panel);}else{form.insertAdjacentElement("afterend",panel);}
 let versions=[],current=0,items=[],count=0,loaded=false;
 const foldTitle=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").replace(/[^a-z0-9\u0370-\u03ff\u1f00-\u1fff]+/gi," ").toLowerCase().trim();
 const aliases={"julio cesar":"caesar","julius caesar":"caesar","jules cesar":"caesar","gaius iulius caesar":"caesar","homero":"homer","homer":"homer","homere":"homer","aristoteles":"aristotle","aristotle":"aristotle","aristote":"aristotle","virgilio":"virgil","virgil":"virgil","virgile":"virgil","ciceron":"cicero"};
 const renderTitles=q=>{
  titles.replaceChildren();const key=foldTitle(q),alias=aliases[key];if(key.length<2)return 0;
  const found=new Map();
  for(const v of versions){
   const id=foldTitle(v.workId.replace(/-/g," ")),title=foldTitle(v.title),author=foldTitle(v.author);
   if(!(title.includes(key)||author.includes(key)||id.includes(key)||(alias&&id.startsWith(alias+" "))))continue;
   if(!found.has(v.workId))found.set(v.workId,[]);
   found.get(v.workId).push(v);
  }
  if(found.size)titles.append(mk("h4","Obras localizadas por autor o título · registros bibliográficos"));
  for(const [id,editions] of [...found].slice(0,12)){
   const card=mk("article",null,"front-classics-title-card"),e=editions[0],nav=mk("nav");
   card.append(mk("strong",[e.author,e.title].filter(Boolean).join(" · ")));
   const langs=new Set();
   for(const item of editions){
    const url=safe(item.reader);if(!url||langs.has(item.language))continue;
    langs.add(item.language);
    const link=mk("a","Leer "+(item.language==="la"?"latín":"griego"));link.href=url;nav.append(link);
   }
   const ref=mk("a","Ficha académica");ref.href="classics-work-record.html?work="+encodeURIComponent(id);nav.append(ref);
   card.append(nav);titles.append(card);
  }
  if(found.size>12)titles.append(mk("p","Se muestran 12 obras; refine el nombre para encontrar otras."));
  return found.size;
 };
 const draw=()=>{
  const next=items.slice(count,count+20);
  for(const x of next){
   const li=mk("li",null,"front-classics-item");
   const url=safe(x.link);
   if(url){const a=mk("a",[x.author,x.title,x.locus||"pasaje"].filter(Boolean).join(" · "));a.href=url;li.append(a)}
   else li.append(mk("strong","Referencia sin enlace verificable"));
   li.append(mk("p",["Texto original: "+(x.language==="grc"?"griego":"latín"),x.edition?"Edición: "+x.edition:"",x.term?"Forma: "+x.term:"",x.source?"Fuente: "+x.source:""].filter(Boolean).join(" · "),"front-classics-meta"));
   if(x.excerpt)li.append(mk("p",x.excerpt,"front-classics-excerpt"));
   const research=new URL("vitruvia-lexicon.html",location.href);
   const term=query.value.trim()||x.term||"";
   research.searchParams.set("q",term);
   research.searchParams.set("mode",term.split(/\\s+/).length>1?"frase":"palabra");
   if(["la","grc"].includes(x.language))research.searchParams.set("lang",x.language);
   if(x.workId)research.searchParams.set("work",x.workId);
   if(x.locus)research.searchParams.set("locus",x.locus);
   const study=mk("a",term.split(/\\s+/).length>1?"Analizar frase en Lexicon":"Estudiar término en Lexicon");
   study.href=research.href;study.title="Consultar lemas, análisis y concordancias disponibles";
   li.append(study);
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
  const id=++current,q=query.value.trim();result.replaceChildren();titles.replaceChildren();more.hidden=true;items=[];count=0;
  if(normalize(q).length<2){status.textContent="Escriba por lo menos dos caracteres en la búsqueda principal.";return}
  launch.disabled=true;status.textContent="Preparando el índice de textos originales…";
  try{
   await getWorks();if(id!==current)return;
   const workMatches=renderTitles(q);
   const valid=versions.filter(v=>(!lang.value||v.language===lang.value)&&(!work.value||v.workId===work.value));
   if(!valid.length){status.textContent="Sin versiones originales registradas para esos filtros.";return}
   const byEntry=new Set(valid.map(v=>[v.workId,v.language,v.path].join("|")));
   const corpus=window.ClassicsCorpusSearch;
   let words=[q];
   if(mode.value==="lemma")words=lemmaTerms(q);
   if(mode.value==="concept"){
    try{words=[q,...await conceptTerms(q)]}
    catch{status.textContent="Conceptus no disponible: buscando la expresión original."}
   }
   const hits=await corpus.searchPassages([...new Set(words)].slice(0,20),{allowedWorkIds:[...new Set(valid.map(v=>v.workId))],language:lang.value,limit:150,maxPerEdition:35,includeOCR:false,isCancelled:()=>id!==current,
    onProgress:(_,p)=>{if(id===current)status.textContent="Verificando pasajes · ediciones examinadas: "+p.examined+"/"+p.targeted}});
   if(id!==current)return;
   items=hits.filter(x=>["la","grc"].includes(x.language)&&!x.ocr&&byEntry.has([x.workId,x.language,x.source].join("|"))&&matchLocus(x.locus,locus.value));
   const diag=corpus.diagnostics?.()||{};
   const fail=Number(diag.failed||0);
   status.textContent=workMatches+" obras localizadas · "+items.length+" pasajes recuperados"+(fail?" · "+fail+" ediciones no pudieron leerse: resultado parcial":"")+" · máximo 150 registros; "+(mode.value==="concept"?"equivalencias documentadas, no embeddings":mode.value==="lemma"?"paradigmas parciales":"búsqueda documental")+(locus.value?" · filtrado por locus tras recuperar pasajes":"")+". ";
   if(!items.length)result.append(mk("li","No se recuperaron pasajes en las ediciones disponibles. Puede probar otra forma o seleccionar una obra."));
   draw();
  }catch(err){if(id===current)status.textContent="No se pudo verificar el corpus clásico. El buscador principal de Vitruvio sigue disponible."}
  finally{if(id===current)launch.disabled=false}
 }
 launch.addEventListener("click",search);
 query.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();void search()}});
 const initial=new URLSearchParams(location.search).get("biblioQ");if(initial)query.value=initial;
 for(const select of [lang,work,mode,locus])select.addEventListener("change",()=>{current++;items=[];result.replaceChildren();more.hidden=true;status.textContent="Filtros modificados. Ejecute la búsqueda del corpus."});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();