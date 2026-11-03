/* Onomasticon Vitruvianum · índice editorial V514: personas, lugares y estadística textual.
   Las referencias son localizaciones editoriales y NO una transcripción del Codex H.
   Datos bibliográficos sujetos a control filológico; resultados desconocidos son texto,
   no identificaciones automáticas de personas. */
const $=id=>document.getElementById(id);
const clean=s=>String(s??"");
const html=s=>clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fold=s=>clean(s).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/æ/g,"ae").replace(/œ/g,"oe").replace(/v/g,"u").replace(/j/g,"i");
const fmt=n=>Number(n||0).toLocaleString("es-AR");
const locusBook=l=>Number(String(l).split(".")[0]);
const reader=(l,edition="recensio-es")=>"lector-bilingue.html?edition="+encodeURIComponent(edition)+"&locus="+encodeURIComponent(l);
let data=null,passages=[],byLocus=new Map(),selectedId="archimedes",limit=20,query="",type="all",book="all",statsBook="1",tab="entities";
const T=k=>window.OVI18N?.t(k)||k, getLanguage=()=>window.OVI18N?.lang||'es';
const translatedCorpora=new Map();let localeGeneration=0;
async function getTranslation(lang){
 if(!['en','fr'].includes(lang)||translatedCorpora.has(lang))return;
 const path=lang==='en'?'data/structured/theory-en.json':'data/structured/recensio-fr.json';
 try{
  const resp=await fetch(path);if(!resp.ok)throw Error('HTTP '+resp.status);
  const edition=await resp.json();translatedCorpora.set(lang,new Map((edition.passages||[]).map(p=>[p.locus,p.translation||p.translated||''])));
 }catch(error){console.warn('Traducción no disponible:',lang,error);translatedCorpora.set(lang,new Map());}
}
function translationFor(p){
 const lang=getLanguage();
 if(lang==='la')return {text:p.latin,label:'Latín editorial V514',fallback:false};
 if(lang==='es')return {text:p.translation,label:'Castellano V514',fallback:false};
 const selected=translatedCorpora.get(lang)?.get(p.locus);
 if(selected)return {text:selected,label:lang==='en'?'English V297':'Français V554',fallback:false};
 return {text:p.translation,label:'Castellano V514 · sin traducción verificada',fallback:true};
}
async function refreshLocale(){
 const counter=++localeGeneration;
 await getTranslation(getLanguage());
 if(counter!==localeGeneration||!data)return;
 statNumbers();renderList();renderEntity();renderTextSearch();
 if(tab==='stats')renderStats();
}
document.addEventListener('ov-locale-changed',refreshLocale);

function highlight(text,q){
 const t=clean(text),term=clean(q).trim();if(!term)return html(t);
 const at=fold(t).indexOf(fold(term));if(at<0)return html(t);
 return html(t.slice(0,at))+"<mark>"+html(t.slice(at,at+term.length))+"</mark>"+html(t.slice(at+term.length));
}
function passageExcerpt(p,term,isLatin=true){
 const t=clean(isLatin?p.latin:p.translation),norm=fold(t),i=term?norm.indexOf(fold(term)):-1;
 if(i<0&&t.length<470)return html(t);
 const start=Math.max(0,i<0?0:i-160),end=Math.min(t.length,i<0?480:i+Math.max(130,term.length)+200);
 return (start?"…":"")+highlight(t.slice(start,end),term)+(end<t.length?"…":"");
}
function statNumbers(){
 $("ov-count-person").textContent=fmt(data.totals.persons);
 $("ov-count-place").textContent=fmt(data.totals.places);
 $("ov-count-latin").textContent=fmt(data.totals.latinWords);
 $("ov-count-greek").textContent=fmt(data.totals.greekWords);
 $("ov-count-loci").textContent=fmt(data.totals.passages);
 $("ov-stat-scope").textContent=T("scope").replace("{words}",fmt(data.totals.allWords)).replace("{units}",fmt(data.totals.chapters));
}
// Una consulta española, latina o griega se resuelve primero como nombre
// de autoridad; las variantes latinas se recuperan desde los loci V514.
function nameRank(e,term){
 const q=fold(term).trim();if(!q)return 5;
 const forms=[e.name,...(e.aliases||[]),...(e.latin_forms||[]),e.greek_name||""].filter(Boolean).map(fold);
 if(forms.some(x=>x===q))return 0;
 if(forms.some(x=>x.startsWith(q)))return 1;
 if(forms.some(x=>x.includes(q)))return 2;
 return 9;
}
function entitiesFiltered(){
 const items=data.entities.filter(e=>(type==="all"||e.kind===type)
 &&(book==="all"||e.loci.some(l=>locusBook(l)===Number(book)))
 &&(!query||nameRank(e,query)<9
 ||fold([e.period,e.summary].join(" ")).includes(fold(query))
 ||e.loci.some(l=>{const p=byLocus.get(l);return p&&fold(p.latin).includes(fold(query))})));
 return items.sort((a,b)=>(query?nameRank(a,query)-nameRank(b,query):0)||a.name.localeCompare(b.name,"es"));
}
function chooseResult(items,{preserve=false}={}){
 // Al cambiar el término, nunca mantener una ficha no relacionada.
 if(query){
  if(preserve&&items.some(e=>e.id===selectedId))return;
  selectedId=items.find(e=>nameRank(e,query)<9)?.id||null;
 }else if(!items.some(e=>e.id===selectedId)){
  selectedId=items[0]?.id||null;
 }
}
function selectedButtons(){
 document.querySelectorAll("#ov-list .ov-entry").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.entryId===selectedId)));
}
function entityButton(e){
 const button=document.createElement("button");button.type="button";button.className="ov-entry";
 button.setAttribute("aria-pressed",String(e.id===selectedId));button.dataset.entryId=e.id;
 const forms=e.latin_forms||[],greek=e.greek_name;
 button.innerHTML="<strong>"+html(e.name)+"</strong>"
 +"<span class='ov-entry-form' lang='la'><b>"+html(T("latinAttested"))+":</b> "+html(forms.slice(0,3).join(" · ")||"—")+(forms.length>3?"…":"")+"</span>"
 +"<span class='ov-entry-form ov-entry-greek' lang='grc'><b>"+html(T("greekReference"))+":</b> "+html(greek||T("notVerified"))+"</span>"
 +"<small>"+(e.kind==="person"?T("entityPerson"):T("entityPlace"))+" · "+fmt(e.mentions)+" locus"+(e.mentions===1?"":" citados")+"</small>";
 button.onclick=()=>{selectedId=e.id;limit=20;renderEntity();selectedButtons();updateActions();};
 return button;
}
function renderList(){
 const items=entitiesFiltered(),root=$("ov-list"),previousScroll=root.scrollTop;root.replaceChildren();
 $("ov-index-count").textContent=fmt(items.length)+" "+T("indexed");
 if(!items.length){root.innerHTML='<p class="ov-empty">No hay ficha biográfica o geográfica registrada con este filtro. El buscador de texto inferior permite encontrar cualquier nombre o variante que aparezca en el corpus y consultar su locus, aunque su identificación aún no esté verificada.</p>';return;}
 items.forEach(e=>root.append(entityButton(e)));root.scrollTop=previousScroll;
}
function referenceCard(p,term=""){
 const box=document.createElement("article");box.className="ov-locus";
 const l=p.locus;
 const selected=translationFor(p);
 box.innerHTML="<h3>De architectura · "+html(l)+"</h3>"
 +"<p class='ov-latin' lang='la'><b>Latín:</b> "+passageExcerpt(p,term,true)+"</p>"
 +"<p class='ov-translated' lang='"+(selected.fallback?'es':getLanguage())+"'><b>"+html(selected.label)+":</b> "+passageExcerpt({latin:selected.text,translation:selected.text},term,false)+"</p>"
 +(selected.fallback?"<p class='ov-note'>"+html(T("originalBio"))+"</p>":"")
 +"<a href='"+reader(l)+"'>"+html(T("reader"))+"</a>"
 +"<a href='"+reader(l,"theory-en")+"'>English · V297</a>"
 +"<a href='"+reader(l,"recensio-fr")+"'>Français · V554</a>";
 return box;
}
function renderEntity(){
 const e=data.entities.find(x=>x.id===selectedId);
 const root=$("ov-detail");root.replaceChildren();
 if(!e){root.innerHTML='<div class="ov-content"><h2>'+html(query?'Resultados de «'+query+'»':'Personajes y lugares en Vitruvio')+'</h2><p>'+html(query?'No se ha identificado una ficha onomástica directa para este término. Consultá las coincidencias textuales en la sección inferior; no se atribuye automáticamente el término a una persona o lugar.':'Seleccioná una ficha del índice para consultar los pasajes, o escribí cualquier nombre en el buscador.')+'</p></div>';updateActions();return;}
 const content=document.createElement("div");content.className="ov-content";
 const bio="<p class='ov-eyebrow'>"+(e.kind==="person"?T("historicalPerson"):T("historicalPlace"))+"</p>"
 +"<h2>"+html(e.name)+"</h2>"
 +(e.portrait?("<figure class='ov-historical-portrait'><a href='"+html(e.portrait.source)+"' target='_blank' rel='noopener noreferrer' title='Ficha del museo'><img loading='lazy' decoding='async' src='"+html(e.portrait.localImage||e.portrait.image)+"' data-remote='"+html(e.portrait.image)+"' alt='"+html(e.portrait.title+". "+e.portrait.description)+"'></a><figcaption><strong>"+html(e.portrait.title)+"</strong><br>"+html(e.portrait.museum+" · inv. "+e.portrait.inventory)+"<br>"+html(e.portrait.date)+"<br>"+html(e.portrait.description)+"<br><a href='"+html(e.portrait.imageSource)+"' target='_blank' rel='noopener noreferrer'>"+html(e.portrait.credit)+"</a><details><summary>Cita Chicago 18 y datos materiales</summary><p>"+html(e.portrait.chicago)+"</p><p>"+html(e.portrait.material+" · "+e.portrait.dimensions)+"</p></details></figcaption></figure>"):"")
 +"<div class='ov-onomastic' aria-label='"+html(T("linguisticIdentity"))+"'>"
 +"<div><span class='ov-onomastic-label'>"+html(T("latinAttested"))+" · V514</span><p lang='la'>"+html((e.latin_forms||[]).join(" · ")||"—")+"</p></div>"
 +"<div><span class='ov-onomastic-label'>"+html(T("greekReference"))+"</span><p lang='grc'>"+html(e.greek_name||T("notVerified"))+"</p></div>"
 +"<p class='ov-onomastic-note'>"+html(e.greek_name?T("greekNotInVitruvius"):T("greekUnverified"))+"</p></div>"
 +"<p class='ov-sub'>"+html(e.period)+" · "+fmt(e.mentions)+" "+(e.mentions===1?"pasaje encontrado":"pasajes encontrados")+" en el latín editorial</p>"
 +"<p class='ov-bio'>"+html(e.summary)+"</p>"+(getLanguage()!=="es"?"<p class='ov-note'>"+html(T("originalBio"))+"</p>":"")
 +"<div class='ov-source'><b>"+html(T("recordStatus"))+":</b> "+html(e.sourceStatus)+". "
 +(e.source?"<a href='"+html(e.source)+"' target='_blank' rel='noopener'>"+html(e.sourceLabel||"Consultar referencia externa")+"</a>":"La localización de las citas es comprobable en las ediciones. La biografía es un resumen editorial que requiere contraste con bibliografía especializada.")
 +"</div><h3 class='ov-mini-title'>"+html(T("where"))+" <i>De architectura</i></h3>"
 +"<p class='ov-note'>Coincidencias del texto latino V514. Los nombres y sus formas pueden declinarse; la localización es editorial, no cotejo con las grafías de un códice concreto.</p>";
 content.innerHTML=bio;
 content.querySelectorAll(".ov-historical-portrait img[data-remote]").forEach(img=>{img.addEventListener("error",()=>{if(img.dataset.remote){img.src=img.dataset.remote;img.dataset.remote="";}else{img.hidden=true;img.closest("figure")?.classList.add("ov-photo-unavailable");}});});
 const loci=e.loci.slice(0,limit);
 for(const l of loci){const p=byLocus.get(l);if(p)content.append(referenceCard(p));}
 if(e.loci.length>limit){const b=document.createElement("button");b.className="ov-button";b.type="button";b.textContent="Ver "+fmt(e.loci.length-limit)+" menciones restantes";b.onclick=()=>{limit=1e6;renderEntity();};content.append(b);}
 root.append(content);updateActions();
}
function renderTextSearch(){
 const result=$("ov-text-results"),term=query.trim();result.replaceChildren();
 if(!term){$("ov-text-section").classList.add("ov-hidden");updateActions();return;}
 $("ov-text-section").classList.remove("ov-hidden");
 const termFold=fold(term);
 // Las equivalencias de autoridad remiten a un locus latino aunque el usuario
 // escriba Roma, Romae o Ῥώμη; nunca son supuestas lecturas griegas del códice.
 const names=data.entities.filter(e=>nameRank(e,term)<9&&(type==="all"||e.kind===type));
 const associations=new Map();
 for(const e of names)for(const locus of e.loci){
  if(!associations.has(locus))associations.set(locus,[]);
  associations.get(locus).push(e);
 }
 const literal=passages.filter(p=>(book==="all"||p.book===Number(book))&&fold(p.latin+" "+p.translation).includes(termFold));
 const matched=new Set(literal.map(p=>p.locus));
 for(const locus of associations.keys())if(book==="all"||locusBook(locus)===Number(book))matched.add(locus);
 const filtered=passages.filter(p=>matched.has(p.locus));
 $("ov-text-count").textContent=fmt(filtered.length)+" loci relacionados con «"+term+"»";
 if(!filtered.length){result.innerHTML='<p class="ov-empty">No se encontraron coincidencias en el corpus ni equivalencias de nombres. Probá otra variante o consultá el índice.</p>';updateActions();return;}
 if(names.length){
  const note=document.createElement("p");note.className="ov-source";
  note.textContent="Concordancia por nombre o variante: "+names.map(e=>e.name).join(", ")+". Las grafías griegas de referencia no son automáticamente lecturas griegas atestiguadas en V514 ni en el Codex H.";
  result.append(note);
 }
 for(const p of filtered.slice(0,50)){
  const linked=associations.get(p.locus)||[];
  const latinForm=linked.flatMap(e=>e.latin_forms||[]).find(f=>fold(p.latin).includes(fold(f)))||"";
  const matchedDirect=fold(p.latin+" "+p.translation).includes(termFold);
  result.append(referenceCard(p,matchedDirect?term:latinForm));
 }
 if(filtered.length>50){const warning=document.createElement("p");warning.className="ov-note";warning.textContent="Se muestran los primeros 50 loci de "+fmt(filtered.length)+". Acotá la búsqueda para revisar más.";result.append(warning);}
 updateActions();
}
function currentEntity(){return data?.entities.find(e=>e.id===selectedId)||null;}
function currentShareUrl(){
 const u=new URL(location.href);u.hash="";
 ["q","id","type","book","view"].forEach(k=>u.searchParams.delete(k));
 if(query.trim())u.searchParams.set("q",query.trim());
 if(currentEntity())u.searchParams.set("id",selectedId);
 if(type!=="all")u.searchParams.set("type",type);
 if(book!=="all")u.searchParams.set("book",book);
 if(tab==="stats")u.searchParams.set("view","stats");
 return u.toString();
}
function exportTitle(){
 if(tab==="stats")return "Estadísticas de los diez libros de Vitruvio";
 const e=currentEntity();return e?e.name:(query?"Búsqueda: "+query:"Onomasticon Vitruvianum");
}
function exportSummary(){
 const e=currentEntity(),lines=["Vitruvius Digital Library · Onomasticon Vitruvianum",exportTitle()];
 if(tab==="stats")lines.push("Estadísticas del texto editorial latino V514 (no del Codex H).");
 else if(e){
  if(query)lines.push("Consulta: "+query);
  lines.push("Formas latinas documentadas en V514: "+((e.latin_forms||[]).join(", ")||"sin formas registradas"));
  if(e.greek_name)lines.push("Equivalencia griega histórica (no atestación en el códice): "+e.greek_name);
  lines.push("Loci editoriales: "+e.loci.join(", "));
 }else if(query)lines.push("Búsqueda de texto: "+query);
 lines.push(currentShareUrl());return lines.join("\n");
}
function updateActions(){
 const el=$("ov-current-result");if(!el)return;
 el.textContent=tab==="stats"?"Estadísticas V514":currentEntity()?"Ficha seleccionada: "+currentEntity().name:(query?"Búsqueda textual: "+query:"Seleccioná un resultado");
 for(const id of ["ov-print-result","ov-email-result","ov-whatsapp-result"]){
  const button=$(id);if(button)button.disabled=tab!=="stats"&&!currentEntity()&&!query.trim();
 }
}
function refreshSearch({preserve=false}={}){
 const items=entitiesFiltered();chooseResult(items,{preserve});limit=20;
 renderList();renderEntity();renderTextSearch();updateActions();
}
let printPreviousLimit=null;
function prepareResultPrint(){
 const e=currentEntity();
 if(tab==="entities"&&e&&e.loci.length>limit){printPreviousLimit=limit;limit=e.loci.length;renderEntity();}
}
function restoreResultPrint(){
 if(printPreviousLimit!==null){limit=printPreviousLimit;printPreviousLimit=null;renderEntity();}
}
window.addEventListener("beforeprint",prepareResultPrint);
window.addEventListener("afterprint",restoreResultPrint);
function bindActions(){
 $("ov-print-result").addEventListener("click",()=>window.print());
 $("ov-email-result").addEventListener("click",()=>{
  const subject="Vitruvio · "+exportTitle();
  location.href="mailto:?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(exportSummary());
 });
 $("ov-whatsapp-result").addEventListener("click",()=>{
  window.open("https://wa.me/?text="+encodeURIComponent(exportSummary()),"_blank","noopener,noreferrer");
 });
}
function statsTable(records,cols){
 const table=document.createElement("table");table.className="ov-table";
 table.innerHTML="<thead><tr>"+cols.map(c=>"<th>"+html(c.label)+"</th>").join("")+"</tr></thead>";
 const tb=document.createElement("tbody");
 for(const record of records){
  const tr=document.createElement("tr");
  tr.innerHTML=cols.map(c=>"<td>"+(c.html?c.html(record):html(record[c.key]??""))+"</td>").join("");
  tb.append(tr);
 }
 table.append(tb);return table;
}
function renderStats(){
 $("ov-books").replaceChildren(statsTable(data.books,[
 {label:T("book"),html:b=>"<b>"+b.book+"</b>"},
 {label:T("topic"),key:"topic"},
 {label:T("latinWords"),html:b=>fmt(b.latinWords)},
 {label:T("greekWords"),html:b=>fmt(b.greekWords)},
 {label:"Loci",html:b=>fmt(b.passages)}
 ]));
 const selector=$("ov-stat-book");selector.value=statsBook;
 const chapters=data.chapters.filter(c=>c.book===Number(statsBook));
 $("ov-chapters").replaceChildren(statsTable(chapters,[
 {label:T("section"),html:c=>"<a href='"+reader(c.openingLocus)+"'>"+(c.chapter==="praef"?T("preface"):c.book+"."+c.chapter)+"</a>"},
 {label:T("chapter"),html:c=>html(c.topic)},
 {label:T("textLabel"),html:c=>fmt(c.latinWords)},
 {label:T("greekWords"),html:c=>fmt(c.greekWords)},
 {label:"Loci",html:c=>fmt(c.passages)}
 ]));
 const vl=$("ov-verbs");vl.replaceChildren();
 for(const v of data.verbAnalysis.classes){
 const div=document.createElement("div");div.className="ov-verb-row";
 const examples=v.examples.slice(0,7).map(x=>"<a href='"+reader(x.locus)+"'>"+html(x.text)+" <small>("+html(x.locus)+")</small></a>").join(" · ");
 div.innerHTML="<strong>"+html(v.label)+"<br><small>"+fmt(v.formMatches)+" coincidencias de patrón</small></strong><div>"+examples+"</div>";
 vl.append(div);
 }
}
function switchTab(value){
 tab=value;
 $("ov-repertory").classList.toggle("ov-hidden",tab!=="entities");
 $("ov-statistics").classList.toggle("ov-hidden",tab!=="stats");
 $("ov-show-entities").setAttribute("aria-pressed",String(tab==="entities"));
 $("ov-show-stats").setAttribute("aria-pressed",String(tab==="stats"));
 if(tab==="stats")renderStats();updateActions();
}
async function start(){
 const [a,b]=await Promise.all([
  fetch("data/onomasticon-vitruvianum.json?v=20261102-greek-index"),
  fetch("data/structured/recensio-es.json")
 ]);
 if(!a.ok||!b.ok)throw Error("No se pudo cargar el índice o el corpus V514 ("+a.status+", "+b.status+").");
 data=await a.json();const j=await b.json();passages=j.passages||[];
 if(!passages.length||!data.entities?.length)throw Error("No se recibieron pasajes o fichas.");
 byLocus=new Map(passages.map(p=>[p.locus,p]));
 await getTranslation(getLanguage());
 const params=new URLSearchParams(location.search),q=params.get("q"),target=params.get("id"),view=params.get("view");
 const suppliedType=params.get("type"),suppliedBook=params.get("book");
 if(["all","person","place"].includes(suppliedType)){type=suppliedType;$("ov-type").value=type;}
 if(suppliedBook==="all"||/^(?:[1-9]|10)$/.test(suppliedBook||"")){book=suppliedBook;$("ov-book").value=book;}
 if(q){query=q;$("ov-search").value=q;}
 if(target&&data.entities.some(e=>e.id===target))selectedId=target;
 chooseResult(entitiesFiltered(),{preserve:!!target});
 statNumbers();renderList();renderEntity();renderTextSearch();
 $("ov-loading").textContent="Índice cargado. "+fmt(data.totals.curatedEntries)+" fichas localizadas en "+fmt(passages.length)+" loci.";
 $("ov-search").addEventListener("input",event=>{query=event.target.value.trim();refreshSearch();});
 $("ov-type").addEventListener("change",event=>{type=event.target.value;refreshSearch();});
 $("ov-book").addEventListener("change",event=>{book=event.target.value;refreshSearch();});
 $("ov-clear").addEventListener("click",()=>{query="";type="all";book="all";$("ov-search").value="";$("ov-type").value="all";$("ov-book").value="all";refreshSearch({preserve:true});});
 $("ov-show-entities").onclick=()=>switchTab("entities");$("ov-show-stats").onclick=()=>switchTab("stats");
 $("ov-stat-book").addEventListener("change",event=>{statsBook=event.target.value;renderStats();});
 bindActions();if(view==="stats")switchTab("stats");updateActions();
}
start().catch(error=>{$("ov-loading").textContent="Error al cargar el repertorio: "+error.message;$("ov-detail").innerHTML="<div class='ov-content'><h2>No se pudo cargar el índice</h2><p>Comprobá los archivos de datos de GitHub Pages y recargá la página. La biblioteca principal sigue disponible.</p></div>";});
