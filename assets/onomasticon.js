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
function entitiesFiltered(){
 return data.entities.filter(e=>(type==="all"||e.kind===type)
 &&(book==="all"||e.loci.some(l=>locusBook(l)===Number(book)))
 &&(!query||fold([e.name,e.period,e.summary,...e.aliases].join(" ")).includes(fold(query))
 ||e.loci.some(l=>{const p=byLocus.get(l);return p&&fold(p.latin).includes(fold(query))})));
}
function entityButton(e){
 const button=document.createElement("button");button.type="button";button.className="ov-entry";
 button.setAttribute("aria-pressed",String(e.id===selectedId));
 button.innerHTML="<strong>"+html(e.name)+"</strong><small>"+(e.kind==="person"?T("entityPerson"):T("entityPlace"))+" · "+fmt(e.mentions)+" locus"+(e.mentions===1?"":" citados")+"</small>";
 button.onclick=()=>{selectedId=e.id;limit=20;renderEntity();renderList();};
 return button;
}
function renderList(){
 const items=entitiesFiltered(),root=$("ov-list");root.replaceChildren();
 $("ov-index-count").textContent=fmt(items.length)+" "+T("indexed");
 if(!items.length){root.innerHTML='<p class="ov-empty">No hay ficha biográfica o geográfica registrada con este filtro. El buscador de texto inferior permite encontrar cualquier nombre o variante que aparezca en el corpus y consultar su locus, aunque su identificación aún no esté verificada.</p>';return;}
 items.forEach(e=>root.append(entityButton(e)));
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
 if(!e){root.innerHTML='<div class="ov-content"><h2>Personajes y lugares en Vitruvio</h2><p>Seleccioná una ficha del índice para consultar los pasajes, o escribí cualquier nombre en el buscador.</p></div>';return;}
 const content=document.createElement("div");content.className="ov-content";
 const bio="<p class='ov-eyebrow'>"+(e.kind==="person"?T("historicalPerson"):T("historicalPlace"))+"</p>"
 +"<h2>"+html(e.name)+"</h2>"
 +"<p class='ov-sub'>"+html(e.period)+" · "+fmt(e.mentions)+" "+(e.mentions===1?"pasaje encontrado":"pasajes encontrados")+" en el latín editorial</p>"
 +"<p class='ov-bio'>"+html(e.summary)+"</p>"+(getLanguage()!=="es"?"<p class='ov-note'>"+html(T("originalBio"))+"</p>":"")
 +"<div class='ov-source'><b>"+html(T("recordStatus"))+":</b> "+html(e.sourceStatus)+". "
 +(e.source?"<a href='"+html(e.source)+"' target='_blank' rel='noopener'>"+html(e.sourceLabel||"Consultar referencia externa")+"</a>":"La localización de las citas es comprobable en las ediciones. La biografía es un resumen editorial que requiere contraste con bibliografía especializada.")
 +"</div><h3 class='ov-mini-title'>"+html(T("where"))+" <i>De architectura</i></h3>"
 +"<p class='ov-note'>Coincidencias del texto latino V514. Los nombres y sus formas pueden declinarse; la localización es editorial, no cotejo con las grafías de un códice concreto.</p>";
 content.innerHTML=bio;
 const loci=e.loci.slice(0,limit);
 for(const l of loci){const p=byLocus.get(l);if(p)content.append(referenceCard(p));}
 if(e.loci.length>limit){const b=document.createElement("button");b.className="ov-button";b.type="button";b.textContent="Ver "+fmt(e.loci.length-limit)+" menciones restantes";b.onclick=()=>{limit=1e6;renderEntity();};content.append(b);}
 root.append(content);
}
function renderTextSearch(){
 const result=$("ov-text-results");const term=query.trim();result.replaceChildren();
 if(!term){$("ov-text-section").classList.add("ov-hidden");return;}
 $("ov-text-section").classList.remove("ov-hidden");
 const filtered=passages.filter(p=>(book==="all"||p.book===Number(book))&&fold(p.latin+" "+p.translation).includes(fold(term)));
 $("ov-text-count").textContent=fmt(filtered.length)+" loci que contienen '"+term+"'";
 if(!filtered.length){result.innerHTML='<p class="ov-empty">No se encontraron coincidencias literales en los 731 pasajes de la V514. Probá una variante latina o castellana. Las grafías de los manuscritos pueden diferir del texto editorial.</p>';return;}
 for(const p of filtered.slice(0,50))result.append(referenceCard(p,term));
 if(filtered.length>50){const warning=document.createElement("p");warning.className="ov-note";warning.textContent="Se muestran los 50 primeros loci. Acotá la búsqueda por libro o nombre para ver el resto.";result.append(warning);}
 if(!data.entities.some(e=>fold(e.name)===fold(term)||e.aliases.some(a=>fold(a)===fold(term)))){
   const n=document.createElement("p");n.className="ov-source";
   n.innerHTML="Una coincidencia de texto no identifica por sí sola una persona o un lugar. Si este nombre aún no tiene ficha, consultá sus pasajes y contrastá su identidad con <a href='https://scholar.google.com/scholar?q="+encodeURIComponent(term+" Vitruvius")+" ' target='_blank' rel='noopener'>bibliografía académica</a>.";
   result.prepend(n);
 }
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
 if(tab==="stats")renderStats();
}
async function start(){
 const [a,b]=await Promise.all([
  fetch("data/onomasticon-vitruvianum.json?v=20261102b"),
  fetch("data/structured/recensio-es.json")
 ]);
 if(!a.ok||!b.ok)throw Error("No se pudo cargar el índice o el corpus V514 ("+a.status+", "+b.status+").");
 data=await a.json();const j=await b.json();passages=j.passages||[];
 if(!passages.length||!data.entities?.length)throw Error("No se recibieron pasajes o fichas.");
 byLocus=new Map(passages.map(p=>[p.locus,p]));
 await getTranslation(getLanguage());
 statNumbers();renderList();renderEntity();$("ov-loading").textContent="Índice cargado. "+fmt(data.totals.curatedEntries)+" fichas localizadas en "+fmt(passages.length)+" loci.";
 $("ov-search").addEventListener("input",event=>{query=event.target.value.trim();renderList();renderTextSearch();});
 $("ov-type").addEventListener("change",event=>{type=event.target.value;renderList();});
 $("ov-book").addEventListener("change",event=>{book=event.target.value;renderList();renderTextSearch();});
 $("ov-clear").addEventListener("click",()=>{query="";type="all";book="all";$("ov-search").value="";$("ov-type").value="all";$("ov-book").value="all";renderList();renderTextSearch();});
 $("ov-show-entities").onclick=()=>switchTab("entities");$("ov-show-stats").onclick=()=>switchTab("stats");
 $("ov-stat-book").addEventListener("change",event=>{statsBook=event.target.value;renderStats();});
 const params=new URLSearchParams(location.search);const q=params.get("q"),target=params.get("id"),view=params.get("view");
 if(target&&data.entities.some(e=>e.id===target)){selectedId=target;renderList();renderEntity();}
 if(q){query=q;$("ov-search").value=q;renderList();renderTextSearch();}
 if(view==="stats")switchTab("stats");
}
start().catch(error=>{$("ov-loading").textContent="Error al cargar el repertorio: "+error.message;$("ov-detail").innerHTML="<div class='ov-content'><h2>No se pudo cargar el índice</h2><p>Comprobá los archivos de datos de GitHub Pages y recargá la página. La biblioteca principal sigue disponible.</p></div>";});
