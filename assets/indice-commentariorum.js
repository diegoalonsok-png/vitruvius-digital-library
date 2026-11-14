/* Index commentariorum: text of the Kurilo editions, never generated commentary. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const fold=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const escapeHtml=s=>String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const topics=["symmetria","decor","eurythmia","ordinatio","dispositio","distributio","firmitas","utilitas","venustas","fabrica","ratiocinatio","proportio","commensuratio","ichnographia","orthographia","scaenographia","entasis","triglyphus","analemma","metrologia","architectura","templum","columna","machina","aqua","codex","Harleianus"];
const books=[1,2,3,4,5,6,7,8,9,10],romans=["I","II","III","IV","V","VI","VII","VIII","IX","X"];
const create=(tag,txt,parent,cls)=>{const e=document.createElement(tag);if(txt!==null)e.textContent=String(txt);if(cls)e.className=cls;if(parent)parent.append(e);return e};
let all=[],visible=[],shown=0,ready=false;const STEP=30;let bibliography={};
function status(message,state){const target=$("ic-status");target.textContent=message;target.dataset.state=state||"ready"}
function goToResults(){const target=$("ic-status");target.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});target.focus({preventScroll:true})}
function buttonState(searching){const btn=$("ic-submit");btn.classList.toggle("is-searching",searching);btn.textContent=searching?"Buscando…":"Buscar";btn.setAttribute("aria-busy",searching?"true":"false");btn.disabled=searching}

function highlight(container,value){
 const text=String(value||""),words=[$("ic-term").value,$("ic-search").value.trim()].filter(Boolean);
 if(!words.length){container.textContent=text;return}
 let segments=[{value:text,marked:false}];
 for(const word of words){
   const needle=word.toLocaleLowerCase(),updated=[];
   for(const segment of segments){
     if(segment.marked){updated.push(segment);continue}
     const hay=segment.value.toLocaleLowerCase();let at=0,idx;
     while((idx=hay.indexOf(needle,at))>=0){
       if(idx>at)updated.push({value:segment.value.slice(at,idx),marked:false});
       updated.push({value:segment.value.slice(idx,idx+word.length),marked:true});at=idx+word.length
     }
     if(at<segment.value.length)updated.push({value:segment.value.slice(at),marked:false})
   }
   segments=updated;
 }
 for(const piece of segments){if(piece.marked){const mark=document.createElement("mark");mark.textContent=piece.value;container.append(mark)}else container.append(document.createTextNode(piece.value))}
}
function chicago(ed,place){
 const b=bibliography[ed];if(!b)return ed+(place?" · "+place:"");
 return b.bibliographic_author+". "+b.bibliographic_title+". "+b.edition_statement+". "+b.publication_place+": "+b.publisher+", "+b.year+(place?". "+place:"")+". https://doi.org/"+b.doi+".";
}
function showBibliography(){
 const host=$("ic-biblio-entries");if(!host)return;host.replaceChildren();
 for(const ed of ["V514","V554","V297"]){const b=bibliography[ed];if(!b)continue;const box=create("div",null,host);
 const label=create("p",null,box);create("strong",ed+" · ",label);label.append(document.createTextNode(b.bibliographic_author+". "));create("em",b.bibliographic_title,label);label.append(document.createTextNode(". "+b.edition_statement+". "+b.publication_place+": "+b.publisher+", "+b.year+". "));
 const link=create("a","DOI: "+b.doi,label);link.href="https://doi.org/"+b.doi;
 create("p","ISBN: "+b.isbn+" · "+(b.isbn_status==="publisher-declared-shared"?"ISBN declarado como compartido entre versiones":"ISBN bibliográfico"),box,"ic-citation");
 }
}
for(let book of books){const o=create("option","Liber "+romans[book-1],$("ic-book"));o.value=String(book)}
for(const topic of topics){const o=create("option",topic,$("ic-term"));o.value=topic}
async function load(path){const r=await fetch(path,{headers:{Accept:"application/json"}});if(!r.ok)throw Error(path+" HTTP "+r.status);return r.json()}
function normalizedLocus(value){return String(value||"").replace(/^([IVX]+)\./,(_,v)=>(romans.indexOf(v)+1)+".")}
function record(book,edition,e){return{type:"commentary",book:String(book),edition,locus:normalizedLocus(e.locus),position:"explicit",text:e.text||"",ordinal:"",source:e.source||"Comentario en el cuerpo de la edición",source_file:"",original_location:""}}
function note(e){const locus=normalizedLocus(e.locus||e.candidate_locus);return{type:"footnote",book:locus.split(".")[0]||"",edition:e.edition==="recensio-es"?"V514":e.edition==="recensio-fr"?"V554":"V297",locus,position:e.locus?"explicit":e.candidate_locus?"suggested":"unspecified",text:e.text||"",ordinal:e.footnote_id||"",source:"Nota al pie extraída del DOCX original",source_file:e.source_file||"",original_location:e.source_paragraph?"párrafo DOCX "+e.source_paragraph:""}}
function study(edition,page,doc){return{type:"study",book:"",edition,locus:"",position:"page",text:page.text||"",ordinal:String(page.page),source:"Estudio preliminar de "+edition+" · página digital "+page.page,source_file:doc.source_file||"",original_location:"página "+page.page,source_pdf:(doc.source_pdf||"")+(doc.source_pdf?"#page="+page.page:"")}}
function matches(entry){
 const book=$("ic-book").value,edition=$("ic-edition").value,type=$("ic-type").value,term=fold($("ic-term").value),query=fold($("ic-search").value.trim());
 if(book&&entry.book!==book)return false;if(edition&&entry.edition!==edition)return false;if(type&&entry.type!==type)return false;
 const content=fold(entry.text+" "+entry.locus);
 if(term&&!content.includes(term))return false;
 if(query&&!content.includes(query))return false;
 return true;
}
function bookKey(e){return Number(e.book)>=1&&Number(e.book)<=10?String(e.book):e.type==="study"?"study":"sine-loco"}
function groupHeading(key){
 const root=$("ic-results");
 const title=key==="study"?"Studia praeliminaria":key==="sine-loco"?"Adnotationes generales · sin locus asignado":"LIBER "+romans[Number(key)-1];
 const h=create("h2",title,root,"ic-book-heading");
 if(key==="study")create("small"," · Documentación por página original",h);
 else if(key==="sine-loco")create("small"," · Notas autorales sin referencia canónica asociada en este índice",h);
}
function sortRecords(a,b){
 const key=x=>bookKey(x)==="study"?11:bookKey(x)==="sine-loco"?12:Number(bookKey(x));
 const compare=key(a)-key(b);if(compare)return compare;
 const locusParts=x=>String(x.locus||"").split(".").map(v=>v==="praef"?0:Number(v)||0);
 const aa=locusParts(a),bb=locusParts(b);
 for(let i=0;i<3;i++){let d=(aa[i]||0)-(bb[i]||0);if(d)return d}
 if(a.edition!==b.edition)return a.edition.localeCompare(b.edition);
 return (Number(a.ordinal)||0)-(Number(b.ordinal)||0)
}
function composeCommentary(text){
 // Los saltos simples proceden de la diagramación/OCR. Se conserva el
 // salto de párrafo doble y la fuente original no se modifica.
 return String(text||"").replace(/\r\n?/g,"\n")
  .replace(/([\p{L}])-\n([\p{Ll}])/gu,"$1$2")
  .replace(/([^\n])\n([^\n])/g,"$1 $2")
  .replace(/[\t ]{2,}/g," ");
}
function renderOne(e){
 const box=create("article",null,$("ic-results"),"result");
 const title=(e.type==="commentary"?"Commentarius":e.type==="study"?"Estudio preliminar · p. "+e.ordinal:"Nota "+e.ordinal)+" · "+e.edition+(e.locus?" · "+e.locus:"");
 create("h3",title,box);
 create("p",e.type==="study"?"Texto del estudio preliminar · documento fuente por página digital":e.type==="commentary"?"Comentario original con encabezamiento de locus en el libro":e.position==="explicit"?"Nota original con locus explícito":e.position==="suggested"?"Nota original con ubicación digital sugerida":"Nota original sin localizador digital asignado",box,"meta");
 const q=$("ic-search").value.trim()||$("ic-term").value;
 const pos=q?fold(e.text).indexOf(fold(q)):-1;
 const begin=pos>200?Math.max(0,pos-180):0;
 const end=Math.min(e.text.length,begin+670);
 const preview=(begin?"…":"")+e.text.slice(begin,end).trim()+(end<e.text.length?"…":"");
 highlight(create("p",null,box,"ic-prose"),composeCommentary(preview));
 if(e.text.length>670){const details=create("details",null,box);create("summary","Leer el comentario íntegro",details);highlight(create("div",null,details,"ic-full-commentary"),composeCommentary(e.text))}
 create("p",e.source+(e.original_location?" · "+e.original_location:""),box,"meta");
 const locator=e.type==="study"?"página digital "+e.ordinal:e.locus?"Vitr. "+e.locus:(e.original_location||"");
 const citation=create("p",chicago(e.edition,locator),box,"ic-citation");
 const btn=create("button","Copiar cita Chicago 18",box,"ic-copy");
 btn.type="button";btn.addEventListener("click",()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(citation.textContent).catch(()=>{});});

 const link=create("a",e.locus?"Leer texto latino, traducción y notas por locus":"Consultar inventario autoral",box);
 link.textContent=e.type==="study"?"Abrir página de la edición de origen":link.textContent;
 link.href=e.type==="study"?(e.source_pdf||"indice-commentariorum.html"):e.locus?"commentarius-perpetuus.html?locus="+encodeURIComponent(e.locus):"inventario-aparato-autoral.html";
 if(e.locus){const a=create("a"," · Aparato crítico",box);a.href="apparatus-bude.html?locus="+encodeURIComponent(e.locus)}
}
function render(reset){
 if(reset){shown=0;$("ic-results").replaceChildren()}
 const slice=visible.slice(shown,shown+STEP);
 for(let i=0;i<slice.length;i++){
   const item=slice[i],previous=visible[shown+i-1];
   if(!previous||bookKey(previous)!==bookKey(item))groupHeading(bookKey(item));
   renderOne(item);
 }
 shown+=slice.length;$("ic-more").hidden=shown>=visible.length;
 const q=$("ic-search").value.trim(),topic=$("ic-term").value;
 const resultLabel=visible.length===1?"1 resultado encontrado":visible.length+" resultados encontrados";
 status(resultLabel+" · "+shown+" visibles. "+(q?"Búsqueda: «"+q+"». ":"")+(topic?"Concepto: "+topic+". ":"")+
 all.filter(x=>x.type==="commentary").length+" comentarios extensos, "+
 all.filter(x=>x.type==="footnote").length+" notas y "+
 all.filter(x=>x.type==="study").length+" páginas de estudio en el índice.",visible.length?"ready":"empty");
 if(!shown)create("p","No hay coincidencias con estos filtros. Probá otra palabra, revisá la edición o restablecé el concepto mayor.",$("ic-results"),"note");
}
function apply(scroll){if(!ready){status("El índice todavía se está cargando. La búsqueda se ejecutará al terminar.","loading");return}visible=all.filter(matches).sort(sortRecords);render(true);if(scroll)goToResults()}
$("ic-form").addEventListener("submit",e=>{
 e.preventDefault();buttonState(true);
 try{apply(true)}finally{buttonState(false)}
});
$("ic-more").addEventListener("click",()=>render(false));
for(const key of ["ic-book","ic-edition","ic-type"])$(key).addEventListener("change",()=>apply(false));
$("ic-term").addEventListener("change",()=>{if($("ic-term").value)$("ic-search").value="";apply(false)});

$("ic-search").addEventListener("input",()=>{if($("ic-search").value.trim())$("ic-term").value="";$("ic-hint").textContent="Presioná Buscar o Enter para ver las coincidencias resaltadas en amarillo."});
(async()=>{
 try{
  const tasks=books.flatMap(book=>["V514","V554"].map(ed=>({book,ed,path:"data/commentary/"+ed.toLowerCase()+"-libro-"+book+".json"})));
  const requests=tasks.map(async t=>{try{const json=await load(t.path);return (json.entries||[]).map(e=>record(t.book,t.ed,e))}catch(e){console.warn(t.path,e.message);return []}});
  const studyRequests=["V514","V554"].flatMap(ed=>["61-90","91-120","121-150"].map(range=>({edition:ed,path:"data/commentary/estudio-preliminar-"+ed.toLowerCase()+"-"+range+".json"})));
  for(const task of studyRequests)requests.push(load(task.path).then(doc=>(doc.pages||[]).map(page=>study(task.edition,page,doc))).catch(e=>{console.warn(task.path,e.message);return []}));
  const results=await Promise.all([...requests,load("data/critical-notes.json").then(j=>(j.entries||[]).filter(e=>["recensio-es","recensio-fr","theory-en"].includes(e.edition)).map(note))]);
  all=results.flat();const catalog=await load("data/catalog.json");
 for(const b of catalog.editions||[]){const id=({"recensio-es":"V514","recensio-fr":"V554","theory-en":"V297"})[b.id];if(id)bibliography[id]=b}
 showBibliography();const url=new URLSearchParams(location.search);
  if(url.get("q"))$("ic-search").value=url.get("q").slice(0,200);
  if(url.get("book")&&books.includes(Number(url.get("book"))))$("ic-book").value=url.get("book");
  if(url.get("locus"))$("ic-search").value=url.get("locus");
  if(topics.includes(url.get("term")))$("ic-term").value=url.get("term");
  ready=true;apply(false);
 }catch(e){status("No se pudo cargar el índice: "+e.message,"empty");buttonState(false)}
})();
})();