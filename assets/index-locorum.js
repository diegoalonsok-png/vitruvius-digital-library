(()=>{
"use strict";
const $=id=>document.getElementById(id);
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ");
const langs={la:"Latín",grc:"Griego",es:"Castellano",en:"Inglés",fr:"Francés",de:"Alemán",it:"Italiano",pt:"Portugués"};
const params=new URLSearchParams(location.search);
const MAX_LOCUS_RESULTS=20000; // Guardrail only for exceptionally large entries; filter remains available.
let versions=[],entries=[],concepts=[],shown=0,filtered=[];
function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n}
function link(href,label){const a=el("a",label);a.href=href;return a}
function option(parent,value,text){const o=el("option",text);o.value=value;parent.append(o)}
function relativePath(u){const root=new URL(".",location.href).pathname;return u.pathname.startsWith(root)?u.pathname.slice(root.length):u.pathname}
function url(base,opts){const u=new URL(base,location.href);Object.entries(opts).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=="")u.searchParams.set(k,String(v))});return relativePath(u)+u.search+u.hash}
function reader(v,locus,term){
 const e=entries.find(x=>x.workId===v.workId&&x.language===v.language&&x.path===v.source);
 const base=e?.reader||("classics-text-reader.html?work="+encodeURIComponent(v.workId)+"&lang="+encodeURIComponent(v.language));
 if(e?.format==="html-text"){const p=new URL(base,location.href);p.searchParams.set("q",term);return relativePath(p)+p.search+(locus&&/^[-a-zA-Z0-9_]+$/.test(locus)?"#"+encodeURIComponent(locus):"")}
 if(e?.format==="historical-ocr-pages")return url(base,{q:term,page:locus});
 return url(base,e?.format==="json-passages"?{q:term,locus,literal:1}:{q:term,locus});
}
function refillEditions(){
 const work=$("work").value,prev=$("edition").value;const e=$("edition");e.replaceChildren();option(e,"","Todas las ediciones");
 for(const v of versions.filter(v=>!work||v.workId===work)){
  const key=[v.workId,v.language,v.source,v.edition||""].join("|");
  option(e,key,(v.author||v.workId)+" · "+(langs[v.language]||v.language)+" · "+(v.edition||v.source.split("/").pop()));
 }
 if([...e.options].some(o=>o.value===prev))e.value=prev;
}
function render(){
 const work=$("work").value,edition=$("edition").value,concept=$("concept").value,q=fold($("query").value.trim());
 filtered=[];
 for(const v of versions){
  if(work&&v.workId!==work)continue;
  if(edition&&[v.workId,v.language,v.source,v.edition||""].join("|")!==edition)continue;
  for(const c of v.concepts||[]){
   if(concept&&c.concept!==concept)continue;
   const meta=concepts.find(k=>k.id===c.concept);
   const names=[c.concept,...Object.values(meta?.modern||{}).flat(),...(meta?.la||[]),...(meta?.grc||[])];
   const loci=(c.loci||[]).filter(x=>Array.isArray(x)&&x.length>=3);
   const selected=q?loci.filter(x=>fold(x[0]).includes(q)||fold(x[1]).includes(q)):loci;
   if(q&&!selected.length&&!names.some(n=>fold(n).includes(q)))continue;
   filtered.push({v,c,meta,loci:q&&selected.length?selected:loci});
  }
 }
 filtered.sort((a,b)=>a.v.workId.localeCompare(b.v.workId)||a.c.concept.localeCompare(b.c.concept)||a.v.language.localeCompare(b.v.language));
 shown=0;$("results").replaceChildren();append();
}
function append(){
 const slice=filtered.slice(shown,shown+30);const frag=document.createDocumentFragment();
 for(const {v,c,meta,loci} of slice){
  const article=el("article",null,"entry");
  article.append(el("h2",(v.author||v.workId)+" · "+(v.title||v.workId)));
  article.append(el("p",(langs[v.language]||v.language)+" · "+(v.edition||v.source)+" · Conceptus: "+c.concept));
  article.append(el("p",loci.length+" registros de forma por locus · "+c.count+" apariciones contabilizadas en la edición (total del concepto; no necesariamente del filtro). Los loci pertenecen a esta edición y no garantizan alineación entre lenguas."));
  if(meta?.note){const n=el("p",meta.note);n.className="muted";article.append(n)}
  const details=el("details");details.open=loci.length<=12;details.append(el("summary","Consultar "+loci.length+" registros documentados (locus · forma · frecuencia)"));
  const ol=el("ol",null,"locilist");
  for(const item of loci.slice(0,MAX_LOCUS_RESULTS)){
   const [locus,form,count]=item,li=el("li");
   li.append(link(reader(v,locus,form),String(locus)+" · "+String(form)+" ("+count+")"));ol.append(li);
  }
  details.append(ol);article.append(details);
  if(loci.length>MAX_LOCUS_RESULTS)article.append(el("p","Hay más de "+MAX_LOCUS_RESULTS+" referencias; refine la búsqueda para consultar las restantes.","muted"));
  const nav=el("div",null,"links");
  nav.append(link("bibliotheca-graeca-latina.html?work="+encodeURIComponent(v.workId),"Ficha de la obra"));
  nav.append(link("vitruvia.html?q="+encodeURIComponent(loci[0]?.[1]||c.concept)+"&mode=all","Buscar forma en Vitruvia"));
  nav.append(link("vitruvia-lexicon.html?q="+encodeURIComponent(loci[0]?.[1]||c.concept)+"&mode=palabra","Estudiar en Lexicon"));
  article.append(nav);frag.append(article);
 }
 $("results").append(frag);shown+=slice.length;
 $("more").hidden=shown>=filtered.length;
 $("summary").textContent=versions.length+" ediciones registradas · "+filtered.length+" entradas concepto/edición con referencias. Mostrando "+shown+". "+(filtered.length===0&&$("query").value.trim()?"Sin coincidencia en Conceptus: consulte la concordancia literal de los textos, disponible más arriba. ":"")+"El índice conceptual no sustituye la concordancia literal ni verifica sentidos individuales.";
}
function exportTsv(){
 const clean=x=>String(x??"").replace(/[\t\r\n]+/g," ").trim();
 const rows=[["Autor","Obra","ID obra","Idioma","Edición","Fuente","Conceptus","Locus","Forma atestiguada","Frecuencia","Enlace al pasaje"]];
 for(const {v,c,loci} of filtered){
  for(const [locus,form,count] of loci){
   const href=new URL(reader(v,locus,form),location.href).href;
   rows.push([v.author,v.title,v.workId,v.language,v.edition||"",v.source,c.concept,locus,form,count,href]);
  }
 }
 const tsv="\uFEFF"+rows.map(row=>row.map(clean).join("\t")).join("\r\n");
 const blob=new Blob([tsv],{type:"text/tab-separated-values;charset=utf-8"});
 const u=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=u;a.download="index-locorum-concordancias.tsv";document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(u),1500);
}

let literalSerial=0;
function lexicalTerms(raw){
 const parts=String(raw||"").match(/[\p{L}\p{M}]+(?:[-'][\p{L}\p{M}]+)*/gu)||[];
 const qs=[...new Set(parts.map(s=>s.trim()).filter(s=>fold(s).length>=3))].slice(0,5);
 const matched=concepts.filter(c=>qs.some(q=>[c.id,...Object.values(c.modern||{}).flat(),...(c.la||[]),...(c.grc||[])].some(x=>typeof x==="string"&&fold(x)===fold(q))));
 const forms=new Set(qs);
 for(const c of matched){
  for(const lang of ["la","grc","es","en","fr","de","it","pt"]){
   for(const w of (lang==="la"||lang==="grc"?c[lang]:c.modern?.[lang])||[]){
    if(typeof w==="string"&&fold(w).length>=3)forms.add(w);
   }
  }
 }
 return {qs,matched,forms:[...forms].slice(0,12)};
}

function action(label,callback){const b=el("button",label);b.type="button";b.addEventListener("click",callback);return b}
function markedExcerpt(text,term){
 const container=el("span"),s=String(text||""),needle=String(term||"").toLocaleLowerCase();
 let at=0,n=0;
 while(needle&&n<50){
  const pos=s.toLocaleLowerCase().indexOf(needle,at);if(pos<0)break;
  container.append(document.createTextNode(s.slice(at,pos)),el("mark",s.slice(pos,pos+term.length)));
  at=pos+term.length;n++;
 }
 container.append(document.createTextNode(s.slice(at)));return container;
}
function printPassage(row){
 const w=window.open("","_blank","width=850,height=700");if(!w){alert("Permití abrir ventanas para imprimir o guardar en PDF.");return}
 const d=w.document,style=d.createElement("style");
 d.title=row.author+" — "+row.title+" · "+row.locus;
 style.textContent="@page{size:A4;margin:20mm}body{font:17px/1.6 Georgia,serif;color:#111}blockquote{border-left:3px solid #888;padding:14px}mark{background:#ffe99c}small{overflow-wrap:anywhere}";
 d.head.append(style);
 d.body.append(el("h1",row.author+" · "+row.title),el("p",(langs[row.language]||row.language)+" · "+(row.ocr?"Página ":"Locus ")+row.locus));
 const block=el("blockquote");block.append(markedExcerpt(row.excerpt,row.term));d.body.append(block);
 d.body.append(el("small","Procedencia: "+row.source+" · "+new URL(row.link,location.href).href));
 w.focus();w.print();
}
function emailPassage(row){
 const subject="Pasaje de "+row.author+" · "+row.title+" · "+row.locus;
 const body=[subject,row.excerpt,"Referencia: "+new URL(row.link,location.href).href].join("\n\n");
 location.href="mailto:?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
}

const localUi={
 es:{language:"Idioma de la interfaz",search:"Buscar pasajes",pdf:"Imprimir / PDF",mail:"Enviar por mail",open:"Abrir pasaje",background:"Fondo",meaning:"Significado y equivalencias",noMeaning:"No hay ficha semántica local verificada para esta forma.",dictionary:"Consultar en Lexicon",close:"Cerrar",passages:"pasajes",occurrences:"apariciones"},
 en:{language:"Interface language",search:"Find passages",pdf:"Print / PDF",mail:"Email",open:"Open passage",background:"Background",meaning:"Meaning and equivalents",noMeaning:"No verified local semantic entry for this form.",dictionary:"Explore in Lexicon",close:"Close",passages:"passages",occurrences:"occurrences"},
 fr:{language:"Langue de l'interface",search:"Chercher des passages",pdf:"Imprimer / PDF",mail:"Envoyer par e-mail",open:"Ouvrir le passage",background:"Fond",meaning:"Sens et équivalents",noMeaning:"Aucune fiche sémantique locale vérifiée pour cette forme.",dictionary:"Consulter Lexicon",close:"Fermer",passages:"passages",occurrences:"occurrences"}
};
let uiLanguage="es";
function ui(k){return (localUi[uiLanguage]||localUi.es)[k]||localUi.es[k]}
function lookupWord(word){
 const clean=String(word||"").replace(/^[^\p{L}]+|[^\p{L}]+$/gu,"").trim();if(!clean)return;
 let dialog=$("locorum-word-dialog");
 if(!dialog){dialog=document.createElement("dialog");dialog.id="locorum-word-dialog";document.querySelector("main").append(dialog)}
 dialog.replaceChildren();
 const heading=el("h2",clean);dialog.append(el("p",ui("meaning"),"muted"),heading);
 const matchesConcept=concepts.filter(c=>[c.id,...Object.values(c.modern||{}).flat(),...(c.la||[]),...(c.grc||[])].some(x=>typeof x==="string"&&fold(x)===fold(clean)));
 if(matchesConcept.length){
  for(const c of matchesConcept.slice(0,5)){
   const box=el("section",null,"word-meaning");
   box.append(el("p","Conceptus: "+c.id+" · "+(c.modern?.es||[]).join(", ")));
   box.append(el("p","Latín: "+(c.la||[]).join(", ")+" · Griego: "+(c.grc||[]).join(", "),"muted"));
   if(c.note)box.append(el("p",c.note,"muted"));dialog.append(box);
  }
 }else dialog.append(el("p",ui("noMeaning"),"muted"));
 const nav=el("div",null,"links");nav.append(link("vitruvia-lexicon.html?q="+encodeURIComponent(clean),ui("dictionary")));
 nav.append(link("index-locorum.html?q="+encodeURIComponent(clean),"Index locorum"));
 nav.append(action(ui("close"),()=>dialog.close()));dialog.append(nav);
 if(!dialog.open)dialog.showModal();
}
function makeWordsClickable(block){
 // Only word tokens become buttons; punctuation remains selectable text.
 const text=block.textContent||"",container=document.createDocumentFragment();
 const re=/[\p{L}\p{M}]+/gu;let last=0;
 for(const m of text.matchAll(re)){
  container.append(document.createTextNode(text.slice(last,m.index)));
  const button=el("button",m[0],"passage-word");button.type="button";
  button.title="Estudiar «"+m[0]+"» en Lexicon";
  button.addEventListener("click",()=>lookupWord(m[0]));
  container.append(button);last=m.index+m[0].length;
 }
 container.append(document.createTextNode(text.slice(last)));
 block.replaceChildren(container);
}
function updateLanguage(){
 $("literal-search").textContent=ui("search");
 const translations={
  es:{title:"Index locorum · Concordancias semánticas",fields:["Obra","Edición / idioma","Conceptus documentado","Buscar palabra o concepto en los textos"],export:"Exportar concordancias filtradas · TSV",panel:"Pasajes encontrados en las obras clásicas",description:"Escribí domus o casa: busca formas documentadas, muestra los pasajes y permite abrirlos en su edición.",more:"Mostrar más referencias"},
  en:{title:"Index locorum · Semantic concordances",fields:["Work","Edition / language","Documented concept","Find a word or concept in the texts"],export:"Export filtered concordances · TSV",panel:"Passages found in classical works",description:"Type domus or casa to find documented terms and passages in their original editions.",more:"Show more references"},
  fr:{title:"Index locorum · Concordances sémantiques",fields:["Œuvre","Édition / langue","Concept documenté","Rechercher un mot ou concept dans les textes"],export:"Exporter les concordances filtrées · TSV",panel:"Passages trouvés dans les œuvres classiques",description:"Saisissez domus ou casa pour trouver les formes et passages attestés dans leurs éditions.",more:"Afficher plus de références"}
 };
 const t=translations[uiLanguage]||translations.es;
 const h=document.querySelector("main h1");if(h)h.textContent=t.title;
 document.querySelectorAll("main .controls>label").forEach((node,i)=>{if(node.firstChild?.nodeType===Node.TEXT_NODE)node.firstChild.textContent=t.fields[i]||node.firstChild.textContent});
 const exp=$("export-tsv");if(exp)exp.textContent=t.export;
 const panel=$("literal-panel");if(panel){const strong=panel.querySelector("strong");if(strong)strong.textContent=t.panel;const description=panel.querySelector("div p");if(description)description.textContent=t.description}
 const more=$("more");if(more)more.textContent=t.more;
 const label=$("locorum-language-label");if(label)label.textContent=ui("language");
 document.querySelectorAll(".passage-actions").forEach(node=>{
  const buttons=node.querySelectorAll("button");
  if(buttons[0])buttons[0].textContent=ui("pdf");
  if(buttons[1])buttons[1].textContent=ui("mail");
  const links=node.querySelectorAll("a");if(links[0])links[0].textContent=ui("open");
  const label=node.querySelector("label");if(label?.firstChild?.nodeType===Node.TEXT_NODE)label.firstChild.textContent=ui("background")+": ";
 });
 document.documentElement.lang=uiLanguage;
 document.dispatchEvent(new CustomEvent("vitruvius:language-changed",{detail:{language:uiLanguage}}));
}
function languageControl(){
 const wrapper=el("label",null,"locorum-language");
 const label=el("span",ui("language"));label.id="locorum-language-label";
 const select=el("select");select.id="locorum-language";
 for(const [code,text] of [["es","ES · Español"],["en","EN · English"],["fr","FR · Français"]]){const opt=el("option",text);opt.value=code;select.append(opt)}
 select.addEventListener("change",()=>{uiLanguage=select.value;updateLanguage()});
 wrapper.append(label,select);
 const controls=document.querySelector(".controls");if(controls)controls.before(wrapper);
}
function renderPassage(row){
 const item=el("article",null,"passage-unit");
 const heading=el("div",null,"passage-unit-heading");heading.append(el("strong",(row.ocr?"Página ":"Locus ")+row.locus),el("span",(row.hitsInPassage||1)+" "+((row.hitsInPassage||1)===1?"aparición":"apariciones")+" · "+row.term));item.append(heading);
 const excerpt=el("blockquote",null,"passage-quote");excerpt.textContent=row.excerpt;makeWordsClickable(excerpt);for(const word of excerpt.querySelectorAll(".passage-word"))if(fold(word.textContent)===fold(row.term)){const mark=el("mark",word.textContent);word.replaceChildren(mark)}item.append(excerpt);
 const tools=el("div",null,"passage-actions"),palette=el("label","Fondo: ");
 const picker=el("input");picker.type="color";picker.value="#101012";picker.setAttribute("aria-label","Elegir fondo del pasaje");
 picker.addEventListener("input",()=>{item.style.setProperty("--unit-bg",picker.value);const rgb=[1,3,5].map(i=>parseInt(picker.value.slice(i,i+2),16));item.style.setProperty("--unit-ink",(.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2])>145?"#111":"#f5f5f5")});
 palette.append(picker);tools.append(palette);
 tools.append(action(ui("pdf"),()=>printPassage(row)),action(ui("mail"),()=>emailPassage(row)),link(row.link,ui("open")),link("vitruvia-lexicon.html?q="+encodeURIComponent(row.term),"Lexicon"));
 item.append(tools);return item;
}
async function searchLiteral(){
 const raw=$("query").value.trim(),token=++literalSerial,status=$("literal-status"),target=$("literal-results");target.replaceChildren();
 if(fold(raw).length<3){status.textContent="Escribí al menos tres letras.";return}
 if(!window.ClassicsCorpusSearch?.searchPassages){status.textContent="Índice de pasajes no disponible.";return}
 const {matched,forms}=lexicalTerms(raw),work=$("work").value,edition=$("edition").value;
 const selected=versions.find(v=>[v.workId,v.language,v.source,v.edition||""].join("|")===edition);
 status.textContent="Buscando pasajes de «"+raw+"»…";$("literal-search").disabled=true;
 try{
  const all=await window.ClassicsCorpusSearch.searchPassages(forms,{limit:600,workId:work,language:selected?.language||"",maxPerEdition:200});
  if(token!==literalSerial)return;
  const rows=selected?all.filter(r=>r.source===selected.source):all,groups=new Map(),diagnostics=window.ClassicsCorpusSearch.diagnostics?.()||{};
  for(const row of rows){const key=row.workId+"|"+row.source+"|"+row.language;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row)}
  status.textContent=rows.length?rows.length+" pasajes en "+groups.size+" ediciones."+(diagnostics.failed?" "+diagnostics.failed+" fuentes no disponibles.":"")+(rows.length>=600?" Límite de 600 pasajes; refiná la búsqueda.":""):
   "No se encontraron pasajes en las ediciones examinadas."+(diagnostics.failed?" "+diagnostics.failed+" fuentes no disponibles.":"");
  if(matched.length)target.append(el("p","Conceptus: "+matched.map(c=>c.id).join(", ")+". Equivalencias semánticas editoriales; no se presupone alineación de traducciones.","muted"));
  if(groups.size){
   const works=new Map();
   for(const group of groups.values()){
    const first=group[0],key=first.workId;
    if(!works.has(key))works.set(key,{author:first.author,title:first.title,passages:0,editions:0});
    const item=works.get(key);item.passages+=group.length;item.editions++;
   }
   const overview=el("section",null,"locorum-works-overview");
   overview.append(el("h2","Obras que contienen «"+raw+"» ("+works.size+")"));
   overview.append(el("p","Obras con pasajes recuperados en los textos indexados. Cada edición se despliega debajo; no se atribuye presencia a un manuscrito sin transcripción consultable.","muted"));
   const chips=el("div",null,"locorum-work-chips");
   let index=0;
   for(const [id,item] of works){
    const btn=action(item.author+" · "+item.title+" · "+item.passages+" pasajes",()=>{
      const group=document.querySelector('[data-locorum-work="'+id+'"]');if(group){group.open=true;group.scrollIntoView({behavior:"smooth",block:"center"})}
    });
    chips.append(btn);index++;
   }
   overview.append(chips);target.append(overview);
  }
  for(const group of groups.values()){
   const first=group[0],total=group.reduce((n,r)=>n+(r.hitsInPassage||1),0);
   const details=el("details",null,"edition-group"),summary=el("summary");details.dataset.locorumWork=first.workId;
   summary.append(el("strong",first.author+" · "+first.title),el("span",(langs[first.language]||first.language)+" · "+group.length+" pasajes · "+total+" apariciones"));
   details.append(summary);
   const contents=el("div",null,"edition-passages");for(const row of group)contents.append(renderPassage(row));
   details.append(contents);target.append(details);
  }
 }catch(err){if(token===literalSerial)status.textContent="Error de búsqueda: "+err.message}
 finally{if(token===literalSerial)$("literal-search").disabled=false}
}
async function init(){
 try{
 const [r,p,d]=await Promise.all([
  fetch("data/classics-corpus/search-registry.json").then(r=>{if(!r.ok)throw Error("Registro HTTP "+r.status);return r.json()}),
  fetch("data/classics-corpus/semantic-conceptus-postings.json").then(r=>{if(!r.ok)throw Error("Índice HTTP "+r.status);return r.json()}),
  fetch("data/lexicon/conceptus.json").then(r=>{if(!r.ok)throw Error("Conceptus HTTP "+r.status);return r.json()})
 ]);
 if(r.schema!=="vitruvia-classics-search-registry-v1"||p.schema!=="vitruvia-classics-semantic-postings-v1"||!Array.isArray(p.versions)||p.registryEditionCount!==r.entries.length||p.errors?.length)throw Error("Índice no compatible con el registro actual: regenerar y validar antes de consultarlo");
 const countByLanguage={};
 for(const e of r.entries)countByLanguage[e.language]=(countByLanguage[e.language]||0)+1;
 const labels=Object.entries(countByLanguage).sort((a,b)=>a[0].localeCompare(b[0]))
   .map(([lang,count])=>(langs[lang]||lang)+": "+count).join(" · ");
 const summary=$("academic-coverage");
 summary.replaceChildren();
 summary.append(el("strong","Cobertura documental comprobada en el registro: "));
 summary.append(document.createTextNode(r.entries.length+" ediciones con búsqueda textual registradas en "+new Set(r.entries.map(e=>e.workId)).size+" obras · "+p.versions.length+" ediciones incluidas en el índice Conceptus. "));
 summary.append(el("p","Idiomas de las ediciones registradas: "+labels+". Una entrada del diccionario no equivale a un texto íntegro ni a una alineación filológica; la búsqueda literal y la consulta conceptual son operaciones distintas.","muted"));
 const coverageLink=link("cobertura-traducciones-clasicas.html","Consultar cobertura integral y fuentes bibliográficas");
 summary.append(coverageLink);
 entries=r.entries;versions=p.versions.map(v=>{const source=entries.find(e=>e.workId===v.workId&&e.language===v.language&&e.path===v.source);return {...v,author:source?.author||v.workId,title:source?.title||v.workId}});concepts=d.concepts||[];
 const byWork=new Map();for(const v of versions){if(!byWork.has(v.workId))byWork.set(v.workId,v.author+" · "+v.title)}
 for(const [key,label] of [...byWork].sort((a,b)=>a[1].localeCompare(b[1])))option($("work"),key,label);
 for(const c of concepts.slice().sort((a,b)=>a.id.localeCompare(b.id)))option($("concept"),c.id,c.id);
 if(byWork.has(params.get("work")))$("work").value=params.get("work");
 refillEditions();
 if(concepts.some(c=>c.id===params.get("concept")))$("concept").value=params.get("concept");
 if(params.has("q"))$("query").value=params.get("q");
 render();
 if(params.get("q")?.trim())searchLiteral();
 }catch(err){$("summary").textContent="Índice no disponible: "+err.message+". Las transcripciones originales siguen disponibles en Bibliotheca."}
}
$("work").addEventListener("change",()=>{refillEditions();render()});
["edition","concept"].forEach(id=>$(id).addEventListener("change",render));
let filterTimer=null;
$("query").addEventListener("input",()=>{clearTimeout(filterTimer);literalSerial++;$("literal-results").replaceChildren();$("literal-status").textContent="Preparando consulta de pasajes…";render();filterTimer=setTimeout(()=>{if(fold($("query").value.trim()).length>=3)searchLiteral();else $("literal-status").textContent="Escriba al menos tres letras."},750)});
$("query").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();clearTimeout(filterTimer);render();searchLiteral()}});
$("more").addEventListener("click",append);
$("export-tsv").addEventListener("click",exportTsv);
$("literal-search").addEventListener("click",searchLiteral);
languageControl();
updateLanguage();
init();
})();
