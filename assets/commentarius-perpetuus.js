/* Commentarius perpetuus: passages, original notes, and major Vitruvian terms. */
(()=>{"use strict";
const $=id=>document.getElementById(id),roman=n=>["I","II","III","IV","V","VI","VII","VIII","IX","X"][n-1]||String(n);
const edName={"recensio-es":"V514 · castellano","recensio-fr":"V554 · français"};
const langName={es:["Traducción castellana","Kurilo · V514"],fr:["Traduction française","Kurilo · V554"],en:["English translation","Kurilo · V297"]};
const terms=["symmetria","decor","eurythmia","ordinatio","dispositio","distributio","firmitas","utilitas","venustas","fabrica","ratiocinatio","proportio","commensuratio","ichnographia","orthographia","scaenographia","entasis","triglyphus","analemma","modulus","templum","columna","machina","aqua"];
const el=(tag,value,parent,cls)=>{const o=document.createElement(tag);if(value!==null)o.textContent=value;if(cls)o.className=cls;if(parent)parent.appendChild(o);return o};
const option=(parent,val,label)=>{const o=el("option",label,parent);o.value=String(val)};
const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const matches=(s,term)=>new RegExp("(^|[^a-z])"+term+"([a-z]*)(?=$|[^a-z])").test(fold(s));
let passages=[],byLocus=new Map(),notes=[],translations={},current="";
let keywordLoci=[];
let hManifest=null;
const commentaryCache=new Map();
let supplementsSerial=0;
async function loadBookCommentary(book){
 const key=String(book);if(commentaryCache.has(key))return commentaryCache.get(key);
 const promise=Promise.all(["v514","v554"].map(async ed=>{
  try{const response=await fetch("data/commentary/"+ed+"-libro-"+key+".json");if(!response.ok)throw Error("HTTP "+response.status);const obj=await response.json();return {edition:ed,entries:Array.isArray(obj.entries)?obj.entries:[]}}
  catch(e){console.warn("Comentario "+ed+" libro "+book,e.message);return {edition:ed,entries:[]}}}));
 commentaryCache.set(key,promise);return promise;
}
async function renderSupplements(locus,book){
 const request=++supplementsSerial;
 $("cp-long-state").textContent="Cargando comentarios de las ediciones…";
 const [groups,manifest]=await Promise.all([loadBookCommentary(book),
  hManifest===null?fetch("data/commentary/codex-h-illustrations.json").then(r=>r.ok?r.json():null).catch(()=>null):Promise.resolve(hManifest)]);
 if(request!==supplementsSerial)return;
 hManifest=manifest||{records:[]};
 const host=$("cp-long");host.replaceChildren();let count=0;
 for(const group of groups){for(const item of group.entries.filter(e=>e.locus===locus)){
  count++;const details=el("details",null,host,"cp-long-entry");
  const label=group.edition==="v514"?"Kurilo V514 · comentario castellano":"Kurilo V554 · commentaire français";
  el("summary",label+" · "+locus,details);
  el("pre",item.text,details);
  el("small","Edición fuente: "+(group.edition==="v514"?"Vitruvio V514 (2026)":"Vitruve V554 (2026)")+" · comentario publicado en el cuerpo del libro.",details,"cp-small");
 }}
 if(!count)el("p","Este locus no tiene un apartado extenso identificado por encabezamiento propio; las notas al pie y el comentario general del libro siguen disponibles en su fuente.",host,"cp-absent");
 $("cp-long-state").textContent=count?count+" secciones de comentario autoral asociadas a este locus.":"Sin sección extensa individualizada para este locus.";
 const h=$("cp-h");h.replaceChildren();
 const records=(hManifest.records||[]).filter(x=>x.locus_from&&x.locus_to&&
  (x.locus_from===locus||x.locus_to===locus||isWithinLocus(locus,x.locus_from,x.locus_to)));
 for(const item of records){const div=el("div",null,h,"cp-h-entry");el("strong","Harley MS 2767 · f. "+item.folio,div);
 el("span",item.caption,div);el("small","Documentado en Kurilo V514 · imagen original insertada como "+item.media_in_docx,div);
 const link=el("a","Consultar dossier gráfico en V514",div);link.href="documents/kurilo-recensio-es.pdf";link.target="_blank";link.rel="noopener noreferrer";
 }
 if(!records.length)el("p","No consta un recorte de H vinculado expresamente a este locus en el inventario gráfico; el testimonio se estudia asimismo en las notas del editor.",h,"cp-absent");
}
function isWithinLocus(loc,start,end){
 const arr=x=>String(x).split(".").map(Number),a=arr(loc),b=arr(start),c=arr(end);
 if(a.length!==3||b.length!==3||c.length!==3||[...a,...b,...c].some(Number.isNaN))return false;
 const n=x=>x[0]*1e6+x[1]*1e3+x[2];return n(b)<=n(a)&&n(a)<=n(c);
}

const chapterName=c=>c==="praef"?"Praefatio":"Capítulo "+c;
function getChapters(book){return [...new Set(passages.filter(p=>String(p.book)===String(book)).map(p=>String(p.chapter)))].sort((a,b)=>a==="praef"?-1:b==="praef"?1:Number(a)-Number(b))}
function refreshChapters(book,chapter){const x=$("cp-chapter");x.replaceChildren();for(const c of getChapters(book))option(x,c,chapterName(c));if(chapter&&getChapters(book).includes(String(chapter)))x.value=String(chapter)}
function refreshLoci(book,ch,locus){const x=$("cp-locus");x.replaceChildren();for(const p of passages.filter(p=>String(p.book)===String(book)&&String(p.chapter)===String(ch)))option(x,p.locus,roman(Number(p.book))+"."+(p.chapter==="praef"?"praef":p.chapter)+"."+p.section);if(locus&&byLocus.has(locus))x.value=locus}
function renderIndex(book,ch){const x=$("cp-index");x.replaceChildren();for(const c of getChapters(book)){const wrap=el("div",null,x),b=el("button",chapterName(c),wrap);b.type="button";b.addEventListener("click",()=>{const p=passages.find(p=>String(p.book)===String(book)&&String(p.chapter)===c);if(p)display(p.locus)});
 if(c===String(ch)){b.setAttribute("aria-current","location");for(const p of passages.filter(p=>String(p.book)===String(book)&&String(p.chapter)===c)){const l=el("button",roman(Number(p.book))+"."+(p.chapter==="praef"?"praef":p.chapter)+"."+p.section,wrap);l.type="button";l.style.paddingLeft="20px";if(p.locus===current)l.setAttribute("aria-current","location");l.addEventListener("click",()=>display(p.locus))}}}}
function noteBlock(n,host){const div=el("div",null,host,"cp-note");el("h3",(edName[n.edition]||n.edition)+" · n. "+n.footnote_id,div);el("p",n.text||"Texto de nota no disponible",div);el("small","Fuente original: "+(n.source_file||"sin archivo")+" · párrafo DOCX "+(n.source_paragraph||"s. d."),div);const d=el("details",null,div);el("summary","Ver contexto de la nota",d);el("p",n.anchor||"Sin contexto",d,"source")}
function displayNotes(locus){const t=fold($("cp-keyword").value);const all=notes.filter(n=>n.locus===locus||(!n.locus&&n.candidate_locus===locus));const exact=all.filter(n=>!!n.locus),candidate=all.filter(n=>!n.locus);
 const render=(id,items)=>{const host=$(id);host.replaceChildren();if(items.length)for(const n of items)noteBlock(n,host);else el("p","No constan notas en este grupo para el locus.",host,"cp-absent")};
 render("cp-exact",exact);render("cp-candidate",candidate);
 $("cp-exact-count").textContent=exact.length+" notas autorales con locus explícito.";
 $("cp-candidate-count").textContent=candidate.length+" notas con localización digital propuesta (no implica insuficiencia editorial).";
 $("cp-inventory").href="inventario-aparato-autoral.html?locus="+encodeURIComponent(locus);
}
function updateKeyword(){const term=$("cp-keyword").value;keywordLoci=term?passages.filter(p=>matches(p.latin,term)).map(p=>p.locus):[];
 const notesHits=term?notes.filter(n=>matches(n.text,term)||matches(n.anchor,term)).length:0;
 $("cp-keyword-status").textContent=term?"Voz "+term+": "+keywordLoci.length+" loci con la forma o su derivación en el latín V514; "+notesHits+" notas autorales con mención textual o contextual. Estas son coincidencias léxicas, no etimologías certificadas.":"Seleccione una voz mayor para explorar sus loci latinos y notas autorales.";
}
function display(locus){const p=byLocus.get(locus);if(!p){$("cp-status").textContent="Locus no registrado en V514.";return}current=locus;$("cp-book").value=String(p.book);refreshChapters(p.book,p.chapter);refreshLoci(p.book,p.chapter,locus);renderIndex(p.book,p.chapter);
 const lang=$("cp-language").value,t=translations[lang]?.get(locus),data=langName[lang];
 const header=roman(Number(p.book))+" · "+chapterName(p.chapter)+" · § "+p.section;
 $("cp-latin-locus").textContent=header;$("cp-translation-locus").textContent=header;
 $("cp-latin").textContent=p.latin||"Texto latino no disponible para este locus.";
 $("cp-translation").textContent=t?.translation||"Traducción no recuperada para este locus en el índice de la edición seleccionada.";
 $("cp-translation-title").textContent=data[0];$("cp-translation-edition").textContent=data[1];$("cp-translation-leaf").lang=lang;
 $("cp-apparatus-link").href="apparatus-bude.html?locus="+encodeURIComponent(locus);displayNotes(locus);renderSupplements(locus,p.book);
 const url=new URL(location.href);url.searchParams.set("locus",locus);url.searchParams.set("lang",lang);if($("cp-keyword").value)url.searchParams.set("keyword",$("cp-keyword").value);else url.searchParams.delete("keyword");history.replaceState(null,"",url.pathname+url.search);
 $("cp-status").textContent="Liber "+roman(Number(p.book))+" · "+chapterName(p.chapter)+" · "+locus+" · latín V514 disponible · notas originales presentadas al pie del pasaje.";
}
function adjacent(delta){if($("cp-keyword").value&&keywordLoci.length){const currentIndex=keywordLoci.indexOf(current);const next=keywordLoci[currentIndex+delta]||keywordLoci[delta>0?0:keywordLoci.length-1];if(next)display(next);return}
 const i=passages.findIndex(p=>p.locus===current);if(passages[i+delta])display(passages[i+delta].locus)}
$("cp-book").addEventListener("change",()=>{const p=passages.find(p=>String(p.book)===$("cp-book").value);if(p)display(p.locus)});
$("cp-chapter").addEventListener("change",()=>{const p=passages.find(p=>String(p.book)===$("cp-book").value&&String(p.chapter)===$("cp-chapter").value);if(p)display(p.locus)});
$("cp-locus").addEventListener("change",()=>display($("cp-locus").value));
$("cp-language").addEventListener("change",()=>current&&display(current));
$("cp-keyword").addEventListener("change",()=>{updateKeyword();if(keywordLoci.length)display(keywordLoci[0]);else if(current)display(current)});
$("cp-form").addEventListener("submit",e=>{e.preventDefault();display($("cp-locus").value)});
$("cp-prev").addEventListener("click",()=>adjacent(-1));$("cp-next").addEventListener("click",()=>adjacent(1));
async function json(path){const r=await fetch(path);if(!r.ok)throw Error(path+" HTTP "+r.status);return r.json()}
(async()=>{try{
 const [base,foot]=await Promise.all([json("data/structured/recensio-es.json"),json("data/critical-notes.json")]);
 if(!Array.isArray(base.passages)||!Array.isArray(foot.entries))throw Error("Estructura del corpus incorrecta");
 passages=base.passages;byLocus=new Map(passages.map(p=>[p.locus,p]));notes=foot.entries.filter(n=>n.edition==="recensio-es"||n.edition==="recensio-fr");translations.es=byLocus;
 await Promise.all([["fr","data/structured/recensio-fr.json"],["en","data/structured/theory-en.json"]].map(async([lang,path])=>{try{const x=await json(path);if(!Array.isArray(x.passages))throw Error("No hay índice");translations[lang]=new Map(x.passages.map(p=>[p.locus,p]))}catch(e){translations[lang]=new Map();console.warn("Índice de traducción "+lang+": "+e.message)}}));
 for(const book of [...new Set(passages.map(p=>Number(p.book)))].sort((a,b)=>a-b))option($("cp-book"),book,"Liber "+roman(book));
 for(const term of terms)option($("cp-keyword"),term,term);
 const args=new URLSearchParams(location.search);if(["es","fr","en"].includes(args.get("lang")))$("cp-language").value=args.get("lang");
 if(terms.includes(args.get("keyword")))$("cp-keyword").value=args.get("keyword");
 updateKeyword();display(byLocus.has(args.get("locus"))?args.get("locus"):passages[0].locus);
 }catch(e){$("cp-status").textContent="No pudieron cargarse los textos y las notas: "+e.message;}
})();
})();