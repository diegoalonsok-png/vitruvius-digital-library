/* Lexicon → Bibliotheca: on-demand exact full-text search across registered editions.
   No fabricated lemmata, translations, or alignment. Uses the same registry as Vitruvia.
 */
(()=>{
"use strict";
const input=document.getElementById("lx-q"),results=document.getElementById("lx-results");
if(!input||!results)return;
const parent=document.createElement("section");parent.id="lx-classics-bridge";
parent.className="lx-library-bridge";
const title=document.createElement("h3");title.textContent="Bibliotheca · búsqueda en todas las ediciones indexadas";
title.className="lx-library-heading";
const note=document.createElement("p");note.textContent="Buscar la forma exacta en los textos clásicos griegos, latinos y las traducciones alojadas. No sustituye la lematización de Lexicon ni supone que las versiones estén alineadas por loci.";
note.className="lx-library-note";
const button=document.createElement("button");button.type="button";button.textContent="Buscar término en el corpus completo";
button.className="lx-library-button";
const semantic=document.createElement("button");semantic.type="button";semantic.textContent="Buscar conceptos documentados";semantic.className="lx-library-button";
const status=document.createElement("p");status.setAttribute("role","status");status.className="lx-library-status";
const list=document.createElement("div");list.className="lx-library-list";
const controls=document.createElement("div");controls.className="lx-library-actions";controls.append(button,semantic);
const translationLabel=document.createElement("label");translationLabel.className="lx-library-translation-label";
translationLabel.textContent="Traducción del pasaje · ";
const translationSelect=document.createElement("select");
translationSelect.id="lx-library-translation-lang";
translationSelect.setAttribute("aria-label","Idioma para traducir los pasajes de la obra seleccionada");
for(const [code,name] of [["es","Español"],["en","English"],["fr","Français"]]){
 const option=document.createElement("option");option.value=code;option.textContent=name;translationSelect.append(option);
}
translationSelect.value=["es","en","fr"].includes(document.getElementById("lx-ui")?.value)?
 document.getElementById("lx-ui").value:"es";
translationLabel.append(translationSelect);controls.append(translationLabel);
const styles=document.createElement("style");
styles.textContent=".lx-library-translation-label{display:inline-flex;align-items:center;gap:7px;flex-wrap:wrap;font:12px system-ui;color:inherit}.lx-library-translation-label select{border:1px solid #555;background:#19191b;color:#eee;border-radius:4px;padding:7px}.lx-library-parallel{border-left:2px solid #ab8648;padding:6px 12px;margin:8px 0 16px;background:rgba(80,70,50,.10)}.lx-library-parallel .lx-library-translation-text{white-space:pre-wrap;line-height:1.65;margin:6px 0;color:inherit}.lx-library-parallel .lx-library-translation-title{font:600 12px system-ui;color:#d9ae67;margin:2px 0}.lx-library-parallel .lx-library-translation-note{font:11px/1.5 system-ui;color:#aaa}.lx-library-parallel a{font-size:12px;text-decoration:underline;text-underline-offset:3px}";
parent.append(styles);
parent.append(title,note,controls,status,list);
const grid=results.closest(".results-grid");
if(grid)grid.parentNode.insertBefore(parent,grid);else results.parentNode.insertBefore(parent,results);
let serial=0;
let translationContext=null,selectedLiteralRows=[];
const translationNames={es:"castellano",en:"inglés",fr:"francés"};
const translationDataCache=new Map();
function translationUrl(e,locus){
 let raw=e.reader||("classics-text-reader.html?work="+encodeURIComponent(e.workId)+"&lang="+encodeURIComponent(e.language));
 const href=safeLocalUrl(raw);if(!href)return null;
 const u=new URL(href);
 if(locus&&["json-passages","structured-bilingual"].includes(e.format))u.searchParams.set("locus",locus);
 return u.href;
}
async function translationEdition(workId,language,editions){
 const candidates=editions.filter(e=>e.workId===workId&&e.language===language&&
  ["json-passages","structured-bilingual"].includes(e.format)&&
  /^data\/(?:classics-corpus|structured|lexicon\/fontes)\/[a-z0-9/_-]+\.json$/.test(e.path||""));
 for(const edition of candidates){
  const key=edition.path+"|"+language;
  if(!translationDataCache.has(key)){
   translationDataCache.set(key,fetch(edition.path)
    .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
    .then(raw=>{
     let passages;
     if(edition.format==="structured-bilingual"){
      if(raw.edition!==edition.edition||raw.language!==language||!Array.isArray(raw.passages))return null;
      passages=raw.passages.map(p=>({locus:String(p.locus||""),text:p.translation}));
     }else{
      if(raw.workId!==(edition.sourceWorkId||workId)||raw.language!==language||!Array.isArray(raw.passages))return null;
      passages=raw.passages;
     }
     const map=new Map(),duplicate=new Set();
     for(const p of passages){
      const locus=String(p.locus||"").trim(),txt=p.text;
      if(!locus||typeof txt!=="string"||!txt.trim())continue;
      if(map.has(locus)){duplicate.add(locus);map.delete(locus);}
      else if(!duplicate.has(locus))map.set(locus,txt.trim());
     }
     return map.size?{edition,map,duplicate:duplicate.size}:null;
    }).catch(()=>null));
  }
  const ready=await translationDataCache.get(key);
  if(ready)return ready;
 }
 return null;
}
async function prepareTranslation(workId,editions){
 const language=translationSelect.value;
 const data=await translationEdition(workId,language,editions);
 return {workId,language,...(data||{edition:null,map:new Map(),duplicate:0})};
}
function appendTranslation(card,row,editions){
 if(!["la","grc"].includes(row.language)||row.ocr)return;
 const block=document.createElement("section");
 block.className="lx-library-parallel";
 block.lang=translationSelect.value;
 block.setAttribute("aria-label","Traducción vinculada al pasaje original");
 const note=document.createElement("p");
 note.className="lx-library-translation-note";
 note.textContent="Consultando traducción editorial por obra y locus…";
 block.append(note);
 card.append(block);

 // Consult only visible passages: never download dozens of translation volumes
 // during the first search. Individual source/target/locus matches are required.
 const populate=async()=>{
  if(!card.isConnected)return;
  const language=translationSelect.value;
  let info=null;
  try{
   info=translationContext?.workId===row.workId&&translationContext.language===language
    ?translationContext:await prepareTranslation(row.workId,editions);
  }catch{}
  if(!card.isConnected||translationSelect.value!==language)return;
  block.lang=language;block.replaceChildren();
  const title=document.createElement("p");title.className="lx-library-translation-title";
  title.textContent="Traducción al "+(translationNames[language]||language)+" · locus "+(row.locus||"no identificado");
  block.append(title);
  const translated=info?.map?.get(String(row.locus||"").trim());
  if(translated){
   const passage=document.createElement("p");passage.className="lx-library-translation-text";
   passage.lang=language;passage.textContent=translated;
   block.append(passage);
   const provenance=document.createElement("p");provenance.className="lx-library-translation-note";
   provenance.textContent="Traducción editorial identificada por obra y locus compartido; la equivalencia léxica y la crítica textual requieren cotejo. "+(info.edition?.sourceDescription||"");
   block.append(provenance);
   const url=translationUrl(info.edition,String(row.locus||""));
   if(url){const a=document.createElement("a");a.href=url;a.textContent="Leer traducción en su edición";block.append(a);}
  }else{
   const caveat=document.createElement("p");caveat.className="lx-library-translation-note";
   caveat.textContent=info?.edition?
    "No existe correspondencia única de locus con la traducción seleccionada. No se inventa una equivalencia.":
    "No hay traducción textual consultable en este idioma dentro del registro de esta obra.";
   block.append(caveat);
   if(info?.edition){const url=translationUrl(info.edition,"");if(url){const a=document.createElement("a");a.href=url;a.textContent="Consultar edición sin alineación";block.append(a);}}
   // The provider receives a fragment only after a voluntary button click.
   // Never publish a machine rendering as if it were a critical translation.
   const anchor=document.createElement("p");anchor.className="lx-library-translation-note";
   anchor.textContent="Traducción automática orientativa del pasaje original (opcional):";
   block.append(anchor);
   window.VitruviaInlineTranslation?.attach(anchor,{
    sourceLanguage:row.language,originalText:row.originalText||row.excerpt
   });
  }
  const comparison=new URL("classics-parallel-reader.html",location.href);
  comparison.searchParams.set("work",row.workId);
  comparison.searchParams.set("left",row.language);
  comparison.searchParams.set("right",language);
   comparison.searchParams.set("rev","20261110-parallel-sync-v4");
  if(row.locus)comparison.searchParams.set("locus",row.locus);
  const searched=String(row.matchedTerm||input.value||"").trim().replace(/^=/,"");
  if(searched)comparison.searchParams.set("q",searched.slice(0,120));
  const compare=document.createElement("a");compare.href=comparison.href;compare.textContent=" · Lectura enfrentada";block.append(compare);
 };
 if(typeof IntersectionObserver!=="undefined"){
  const observer=new IntersectionObserver(entries=>{
   if(!card.isConnected){observer.disconnect();return}
   if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();void populate()}
  },{rootMargin:"220px"});
  observer.observe(card);
 }else queueMicrotask(()=>{void populate()});
}
const safeUrl=value=>{try{const u=new URL(value,location.href);return ["http:","https:"].includes(u.protocol)?u.href:null}catch{return null}};
let editionRegistryTask=null;
const safeLocalUrl=value=>{try{const u=new URL(String(value||""),location.href);return u.origin===location.origin&&/^https?:$/.test(u.protocol)?u.href:null}catch{return null}};
function registeredEditions(){
 if(!editionRegistryTask)editionRegistryTask=window.ClassicsCorpusSearch?.registry?.()
  .then(items=>Array.isArray(items)?items:[]).catch(()=>[]);
 return editionRegistryTask||Promise.resolve([]);
}
function editionConnections(row,editions){
 const related=editions.filter(e=>e.workId===row.workId&&e.path!==row.source&&
   ["la","grc","en","es","fr"].includes(e.language));
 const panel=document.createElement("details");panel.className="lx-library-editions";
 const summary=document.createElement("summary");summary.textContent="Otras ediciones de esta obra ("+related.length+") · consultar y comparar";panel.append(summary);
 const caveat=document.createElement("p");caveat.className="lx-library-meta";
 caveat.textContent="Enlaces al inicio de cada edición. Compartir obra no confirma que los loci, capítulos o versos estén alineados ni que una traducción sea literal.";panel.append(caveat);
 const ul=document.createElement("ul");ul.className="lx-library-editions-list";
 for(const e of related){
  const href=safeLocalUrl(e.reader||("classics-text-reader.html?work="+encodeURIComponent(e.workId)+"&lang="+encodeURIComponent(e.language)));
  if(!href)continue;
  const li=document.createElement("li"),a=document.createElement("a");a.href=href;
  a.textContent=[e.language==="grc"?"Griego":e.language==="la"?"Latín":e.language==="es"?"Castellano":e.language==="fr"?"Francés":"Inglés",e.edition,e.sourceDescription].filter(Boolean).join(" · ");
  a.setAttribute("aria-label","Abrir edición independiente: "+a.textContent);li.append(a);ul.append(li);
 }
 if(ul.childElementCount)panel.append(ul);
 const actions=document.createElement("p");actions.className="lx-library-edition-actions";
 const workUrl=new URL("bibliotheca-graeca-latina.html",location.href);
 workUrl.searchParams.set("work",row.workId);workUrl.searchParams.set("q",input.value.trim());
 const bibliotheca=document.createElement("a");bibliotheca.href=workUrl.href;bibliotheca.textContent="Buscar esta palabra en todas las ediciones de la obra";actions.append(bibliotheca);
 const vitruviaUrl=new URL("vitruvia.html",location.href);
 vitruviaUrl.searchParams.set("q",input.value.trim());
 vitruviaUrl.searchParams.set("mode","all");
 const vitruvia=document.createElement("a");vitruvia.href=vitruviaUrl.href;
 vitruvia.textContent="Consultar el término en Vitruvia";actions.append(vitruvia);
 if(row.workId==="vitruvius"&&/^\d+\.\d+(?:\.\d+)?$/.test(row.locus)){
  const apparatus=new URL("aparato-critico.html",location.href);apparatus.searchParams.set("locus",row.locus);
  const a=document.createElement("a");a.href=apparatus.href;a.textContent="Aparato crítico · Vitr. "+row.locus;actions.append(a);
 }
 panel.append(actions);
 return panel;
}
function markedExcerpt(node,excerpt){
 // «...» are generated from source text by the literal search engine.
 // Put markup only around the actual attested fragment, never treat it as HTML.
 const parts=String(excerpt||"").split(/(«[^»]+»)/g);
 for(const part of parts){
  if(/^«[^»]+»$/.test(part)){
   const mark=document.createElement("mark");mark.className="lx-library-highlight";mark.textContent=part.slice(1,-1);node.append(mark);
  }else node.append(document.createTextNode(part));
 }
}
function addResult(row,editions){
 const card=document.createElement("article");card.className="lx-library-result";
 const top=document.createElement("p");top.className="lx-library-meta";
 top.textContent=[row.language?.toUpperCase(),row.edition,row.ocr?"OCR histórico, no cotejado":""].filter(Boolean).join(" · ");
 const passage=document.createElement("a");passage.className="lx-library-result-link";
 passage.href=safeUrl(row.link)||"bibliotheca-graeca-latina.html";
 passage.textContent=[row.author,row.title,row.locus].filter(Boolean).join(" · ")||"Pasaje clásico";
 const count=document.createElement("small");count.className="lx-library-count";
 count.textContent=" · "+row.hitsInPassage+" coincidencia"+(row.hitsInPassage===1?"":"s")+" en este pasaje";
 const excerpt=document.createElement("p");excerpt.className="lx-library-excerpt";excerpt.lang=row.language==="grc"?"grc":row.language==="la"?"la":row.language||"";
 markedExcerpt(excerpt,row.excerpt);
 const source=document.createElement("p");source.className="lx-library-meta";
 source.textContent="Fuente digital: "+(row.attribution||row.source||"Registro sin atribución detallada");
 const copy=document.createElement("button");copy.type="button";copy.className="lx-library-cite-button";
 copy.textContent="Copiar referencia y pasaje";
 copy.addEventListener("click",async()=>{
  const citation=[row.author,row.title,row.locus,row.language,row.edition].filter(Boolean).join(" · ");
  const text=[citation,row.excerpt,"Fuente digital: "+(row.source||"sin ruta"),safeUrl(row.link),"Portal consultado: Vitruvius Digital Library · DOI del proyecto: https://doi.org/10.5281/zenodo.23868911 (no identifica ni certifica la edición clásica citada)"].filter(Boolean).join("\n");
  try{if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");await navigator.clipboard.writeText(text);copy.textContent="Referencia copiada";}
  catch{window.prompt("Copiar referencia y pasaje:",text)}
 });
 card.append(passage,count,top,excerpt);appendTranslation(card,row,editions);card.append(source,copy,editionConnections(row,editions));list.append(card);
}
function addSummaryResult(row){
 const card=document.createElement("article");card.className="lx-library-result";
 const a=document.createElement("a");a.className="lx-library-result-link";a.href=safeUrl(row.link)||"bibliotheca-graeca-latina.html";a.textContent=row.title||"Texto clásico";
 const desc=document.createElement("p");desc.className="lx-library-meta";desc.textContent=[row.language?.toUpperCase(),row.meta].filter(Boolean).join(" · ");
 const excerpt=document.createElement("p");excerpt.className="lx-library-excerpt";excerpt.textContent=row.excerpt||"";
 const actions=document.createElement("p");actions.className="lx-library-edition-actions";
 if(row.workId){
  const b=new URL("bibliotheca-graeca-latina.html",location.href);
  b.searchParams.set("work",row.workId);
  b.searchParams.set("q",row.matchedTerm||input.value.trim());
  const link=document.createElement("a");link.href=b.href;link.textContent="Consultar obra en Bibliotheca";actions.append(link);
 }
 const v=new URL("vitruvia.html",location.href);
 v.searchParams.set("q",row.matchedTerm||input.value.trim());v.searchParams.set("mode","all");
 const link=document.createElement("a");link.href=v.href;link.textContent="Consultar en Vitruvia";actions.append(link);
 card.append(a,desc,excerpt,actions);list.append(card);
}

/* Keep source identity and actual locus order; do not conflate distinct editions. */
let currentLiteralRows=[],currentEditions=[],currentQuery="",selectedWorkId="";
function compareLoci(a,b){
 return String(a.locus||"").localeCompare(String(b.locus||""),undefined,{numeric:true,sensitivity:"base"})||
  String(a.language||"").localeCompare(String(b.language||""))||
  String(a.edition||"").localeCompare(String(b.edition||""));
}
function groupByWork(rows){
 const groups=new Map();
 for(const row of rows){
  if(!groups.has(row.workId))groups.set(row.workId,[]);
  groups.get(row.workId).push(row);
 }
 return [...groups].sort(([a],[b])=>
  (a===selectedWorkId?-1:0)-(b===selectedWorkId?-1:0)||
  String(groups.get(a)[0]?.author||"").localeCompare(String(groups.get(b)[0]?.author||""),"es")||
  String(groups.get(a)[0]?.title||"").localeCompare(String(groups.get(b)[0]?.title||""),"es"));
}
function showLiteralRows(rows,editions){
 list.replaceChildren();
 const fragment=document.createDocumentFragment();
 for(const [workId,records] of groupByWork(rows)){
  const ordered=records.slice().sort(compareLoci);
  const first=ordered[0];
  const heading=document.createElement("section");
  heading.className="lx-library-work-group";
  heading.dataset.workId=workId;
  const header=document.createElement("div");header.className="lx-library-work-header";
  const name=document.createElement("h4");
  name.textContent=(selectedWorkId===workId?"Obra seleccionada · ":"")+
   [first.author,first.title].filter(Boolean).join(" · ");
  const occ=ordered.reduce((n,row)=>n+(Number(row.hitsInPassage)||0),0);
  const stats=document.createElement("p");stats.className="lx-library-meta";
  stats.textContent=occ+" coincidencia"+(occ===1?"":"s")+" · "+ordered.length+" pasaje"+(ordered.length===1?"":"s")+
   (selectedWorkId===workId?" · ordenados por locus":" · vista global limitada por edición");
  header.append(name,stats);
  if(selectedWorkId===workId&&translationContext?.workId===workId){
   const tr=document.createElement("p");tr.className="lx-library-meta";
   const n=ordered.filter(r=>["la","grc"].includes(r.language)).length;
   const matched=ordered.filter(r=>["la","grc"].includes(r.language)&&translationContext.map.has(String(r.locus||"").trim())).length;
   tr.textContent="Traducción: "+(translationNames[translationContext.language]||translationContext.language)+
    " · "+matched+" de "+n+" pasajes originales con locus compartido (solo correspondencia editorial; requiere cotejo).";
   header.append(tr);
  }
  if(selectedWorkId!==workId){
   const show=document.createElement("button");show.type="button";
   show.className="lx-library-button";
   show.textContent="Ver todos los pasajes de esta obra";
   show.setAttribute("aria-label","Mostrar primero todos los pasajes de "+[first.author,first.title].filter(Boolean).join(", "));
   show.addEventListener("click",()=>{void selectLibraryWork(workId)});
   header.append(show);
  }
  heading.append(header);
  for(const row of ordered){
   // addResult uses the shared bridge list. Move the card into its original-work group.
   addResult(row,editions);
   heading.append(list.lastElementChild);
  }
  fragment.append(heading);
 }
 list.append(fragment);
}
async function selectLibraryWork(workId){
 const term=input.value.trim();
 if(!workId||!term||term!==currentQuery||typeof window.ClassicsCorpusSearch?.searchPassages!=="function")return;
 const token=++serial;
 selectedWorkId=workId;
 button.disabled=true;semantic.disabled=true;
 status.textContent="Recuperando todos los pasajes de la obra seleccionada…";
 try{
  // Do not use the global 12-passages-per-edition preview for this work.
  const specific=await window.ClassicsCorpusSearch.searchPassages(term,{workId,allMatches:true,includeOCR:false,maxPerEdition:100000});
  if(token!==serial)return;
  const remaining=currentLiteralRows.filter(row=>row.workId!==workId);
  const selected=specific.filter(row=>row.workId===workId);
  selectedLiteralRows=selected;
  translationContext=await prepareTranslation(workId,currentEditions);
  if(token!==serial)return;
  showLiteralRows([...selected,...remaining],currentEditions);
  const count=selected.reduce((n,r)=>n+(Number(r.hitsInPassage)||0),0);
  status.textContent=[selected[0]?.author,selected[0]?.title].filter(Boolean).join(" · ")+
   ": "+count+" coincidencias en "+selected.length+" pasajes; se muestran primero, ordenados por locus. "+
   "Debajo permanecen las demás obras del resultado global (vista limitada).";
  const section=[...list.querySelectorAll(".lx-library-work-group")].find(e=>e.dataset.workId===workId);
  section?.scrollIntoView({behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"auto":"smooth",block:"start"});
 }catch(error){
  if(token===serial)status.textContent="No se pudieron recuperar todos los pasajes de esta obra: "+String(error.message||error);
 }finally{if(token===serial){button.disabled=false;semantic.disabled=false}}
}
async function execute(mode="literal"){
 const q=input.value.trim(),token=++serial;list.replaceChildren();selectedWorkId="";currentLiteralRows=[];selectedLiteralRows=[];translationContext=null;currentQuery=q;
 if(!/[\p{L}]/u.test(q)){status.textContent="Escriba una palabra griega o latina para consultar los textos indexados.";return}
 if(!window.ClassicsCorpusSearch){status.textContent="El motor de textos clásicos no está disponible.";return}
 button.disabled=true;semantic.disabled=true;status.textContent="Buscando pasajes en las ediciones indexadas…";
 try{
  if(mode==="semantic"){
   const rows=await window.ClassicsCorpusSearch.semanticSearch(q,{limit:32});
   if(token!==serial)return;
   rows.forEach(addSummaryResult);
   status.textContent=rows.length?rows.length+" ediciones con correspondencias conceptuales documentadas. Es una búsqueda diferente del recuento literal y de la lematización.":"No se registraron correspondencias conceptuales para este término.";
  }else{
   // Passage-level retrieval: source loci and actual occurrences, not only one preview per edition.
   const greek=/[Ͱ-Ͽἀ-῿]/u.test(q);
   const rows=await window.ClassicsCorpusSearch.searchPassages(q,{limit:160,maxPerEdition:12,language:greek?"grc":""});
   if(token!==serial)return;
   const counts=new Map();
   for(const row of rows){const key=[row.workId,row.language,row.edition,row.source].join("|");counts.set(key,(counts.get(key)||0)+1)}
   const editionCount=counts.size;
   const editions=await registeredEditions();
   if(token!==serial)return;
   currentLiteralRows=rows;currentEditions=editions;showLiteralRows(rows,editions);
   const diagnostic=window.ClassicsCorpusSearch.diagnostics?.()||{};
   status.textContent=rows.length?
    rows.length+" pasajes mostrados de "+editionCount+" ediciones indexadas, con referencia y término resaltado. La lista tiene un límite de visualización; el recuento por lema de Lexicon se calcula por separado.":
    "No se encontraron pasajes con esta grafía literal en las ediciones consultadas. Esto no equivale a ausencia del lema o de sus formas flexionadas.";
   if(diagnostic.failed)status.textContent+=" "+diagnostic.failed+" fuentes no pudieron cargarse; el resultado puede ser incompleto.";
  }
 }catch(error){if(token===serial)status.textContent="No se pudo completar la búsqueda: "+String(error.message||error)}
 finally{if(token===serial){button.disabled=false;semantic.disabled=false}}
}
translationSelect.addEventListener("change",async()=>{
 const workId=selectedWorkId;if(!workId||!selectedLiteralRows.length){if(currentLiteralRows.length)showLiteralRows(currentLiteralRows,currentEditions);return;}
 const token=++serial;
 status.textContent="Consultando traducción al "+(translationNames[translationSelect.value]||translationSelect.value)+"…";
 translationContext=await prepareTranslation(workId,currentEditions);
 if(token!==serial)return;
 showLiteralRows([...selectedLiteralRows,...currentLiteralRows.filter(row=>row.workId!==workId)],currentEditions);
 status.textContent="Se muestra el pasaje original y la traducción al "+translationNames[translationSelect.value]+
  " cuando ambos comparten un locus editorial único. Si falta, se indica expresamente.";
});
document.getElementById("lx-ui")?.addEventListener("change",()=>{
 const lang=document.getElementById("lx-ui")?.value;
 if(["es","en","fr"].includes(lang)&&translationSelect.value!==lang){
  translationSelect.value=lang;translationSelect.dispatchEvent(new Event("change"));
 }
});
button.addEventListener("click",()=>execute("literal"));
semantic.addEventListener("click",()=>execute("semantic"));
window.addEventListener("vitruvia:lexicon-search",event=>{
 const q=String(event.detail?.query||"").trim();
 if(/[\p{L}]/u.test(q)&&q===input.value.trim())execute("literal");
});
// A Lexicon search must also retrieve literal attestations; a missing dictionary headword is not absence from the corpus.
document.getElementById("lx-form")?.addEventListener("submit",()=>{if(/[\p{L}]/u.test(input.value.trim()))execute("literal")});
input.addEventListener("input",()=>{serial++;selectedWorkId="";currentLiteralRows=[];selectedLiteralRows=[];translationContext=null;currentQuery="";button.disabled=false;semantic.disabled=false;list.replaceChildren();status.textContent="Pulse «Buscar término en el corpus completo» para consultar el registro.";});
status.textContent="Consulta bajo demanda: no se cargan todas las ediciones al abrir Lexicon.";
// Deep links with an actual term should produce attested corpus results automatically.
// Delay until the parent Lexicon has populated its search control.
const initial=new URLSearchParams(location.search).get("q");
if(initial&&/[\p{L}]/u.test(initial.trim())){
 if(!input.value.trim())input.value=initial;
 execute("literal");
}
})();
