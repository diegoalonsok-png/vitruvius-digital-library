/* Shared academic reading: source-derived footnotes, concise CTS labels and
   documentary PDF comparison. No manuscript readings are supplied by this UI. */
(()=>{"use strict";
const E=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const jsonCache=new Map();
function json(path){
 if(!jsonCache.has(path)){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),5000);
  jsonCache.set(path,fetch(path,{signal:abort.signal}).then(r=>r.ok?r.json():null).catch(()=>null).finally(()=>clearTimeout(timer)));
 }
 return jsonCache.get(path);
}
function shortLocus(value){
 const text=String(value||"");
 return text.replace(/urn:cts:[^:]+:[^:]+:/gi,"").replace(/^(tlg\d+\.tlg\d+):/,"$1 · ");
}
const locusKey=v=>shortLocus(v).trim().toLowerCase().replace(/^(?:locus|cap[íi]tulo|§)\s*/u,"").replace(/\s+/g,"");
function findLocus(passages,value){
 const exact=passages.findIndex(p=>p.locus===value);if(exact>=0)return exact;
 const key=locusKey(value),found=[];
 passages.forEach((p,i)=>{if(locusKey(p.locus)===key)found.push(i)});
 return found.length===1?found[0]:-1;
}
async function prepare(corpus){
 const manifest=await json("data/classics-corpus/reading-notes/manifest.json?v=20261114-bude-1");
 const entry=manifest?.entries?.find(e=>e.workId===corpus.workId&&e.language===corpus.language&&e.sourceSha256===corpus.sourceSha256);
 if(!entry||!/^data\/classics-corpus\/reading-notes\/[a-z0-9-]+\.json$/.test(entry.path))return corpus;
 const notes=await json(entry.path);
 if(notes?.sourceSha256!==corpus.sourceSha256||notes?.workId!==corpus.workId||notes?.language!==corpus.language)return corpus;
 return {...corpus,readingMetadata:notes.metadata,passages:await Promise.all(corpus.passages.map(async p=>{
  const n=notes.passages?.[p.locus];
  if(n?.importedText===p.text&&typeof n.text==="string"&&Array.isArray(n.notes))return {...p,text:n.text,importedText:p.text,readingNotes:n.notes};
  if(n?.sourceLength!==p.text.length||!Array.isArray(n.notes)||!n.notes.length)return p;
  if(window.crypto?.subtle){
   const digest=await window.crypto.subtle.digest("SHA-256",new TextEncoder().encode(p.text));
   const sha=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
   if(sha!==n.sourceTextSha256)return p;
  }
  let cursor=0;const pieces=[];
  for(const note of n.notes){
   if(!Number.isInteger(note.start)||!Number.isInteger(note.end)||note.start<cursor||note.end<=note.start||p.text.slice(note.start,note.end)!==note.text)return p;
   pieces.push(p.text.slice(cursor,note.start));cursor=note.end;
  }
  pieces.push(p.text.slice(cursor));
  return {...p,text:pieces.join("").replace(/\s+/g," ").trim(),importedText:p.text,readingNotes:n.notes};
 }))};
}
function safePdf(value){
 try{const u=new URL(value,location.href);return u.protocol==="https:"&&!u.username&&!u.password?u.href:null}catch{return null}
}
async function pdfsFor(work){
 const [catalog,links,coverage]=await Promise.all([json("data/r2/catalogo-clasicos-r2.json"),json("data/r2/vinculos-repertorio.json"),json("data/classics-historical-pages/coverage.json")]);
 const ids=new Set((links?.porObra?.[work]||[]).map(e=>e.r2));ids.add(work);
 const rows=(catalog?.items||[]).map(e=>({id:e.id,url:e.pdf,title:e.autor+" · "+(e.tituloEdicion||e.obra)+" · "+e.anio,related:ids.has(e.id),pages:e.paginas}));
 const localWork={"aristotle-poetics":"aristotle-poetics","lucretius":"lucretius","caesar-gallico":"caesar-de-bello-gallico","plato-apology":"plato-apologia","virgil-aeneid":"virgil-aeneid","virgil-georgica":"virgil-georgica","cicero-officiis":"cicero-de-officiis","epictetus-enchiridion":"epictetus-theophrastus"};
 for(const e of coverage?.records||[])if(e.path?.endsWith(".pdf"))rows.push({id:e.path,url:e.path,title:e.path.split("/").pop(),related:!!localWork[work]&&e.path.includes(localWork[work]),pages:e.pages});
 return rows.sort((a,b)=>Number(b.related)-Number(a.related)||a.title.localeCompare(b.title,"es"));
}
function pdfPanel(work){
 const root=E("section","cl-pdf-panel"),tools=E("div","cl-pdf-tools"),select=E("select");
 select.setAttribute("aria-label","Edición PDF enfrentada");select.append(E("option",null,"Elegir un PDF de la biblioteca…"));
 select.options[0].value="";
 const input=E("input");input.type="url";input.placeholder="https://…/traduccion.pdf";input.setAttribute("aria-label","Dirección de otro PDF");
 const open=E("button",null,"Abrir PDF");open.type="button";
 const file=E("input");file.type="file";file.accept="application/pdf,.pdf";file.setAttribute("aria-label","Abrir un PDF de tu equipo");
 const page=E("input");page.type="number";page.min="1";page.value="1";page.setAttribute("aria-label","Página del PDF enfrentado");
 const prev=E("button",null,"←"),next=E("button",null,"→");prev.type=next.type="button";prev.setAttribute("aria-label","Página anterior del PDF enfrentado");next.setAttribute("aria-label","Página siguiente del PDF enfrentado");
 const query=E("input");query.type="search";query.placeholder="Frase en este PDF";query.setAttribute("aria-label","Buscar frase en el PDF enfrentado");
 const find=E("button",null,"Buscar en PDF");find.type="button";
 const external=E("a",null,"Abrir aparte ↗");external.target="_blank";external.rel="noopener noreferrer";external.hidden=true;
 const frame=E("iframe");frame.title="PDF de lectura enfrentada";frame.hidden=true;
 const status=E("p","cl-document-note","Paginación independiente. La búsqueda del visor PDF requiere capa textual; página digital y locus se consultan por separado.");status.setAttribute("role","status");
 tools.append(select,input,open,file,prev,page,next,query,find,external);root.append(tools,status,frame);
 let source="",objectUrl="",maximum=99999;
 function render(){
  if(!source)return;
  const n=Number(page.value);page.value=String(Number.isSafeInteger(n)?Math.max(1,Math.min(maximum,n)):1);
  const hash=new URLSearchParams({page:page.value,view:"FitH",toolbar:"1"});if(query.value.trim())hash.set("search",query.value.trim());
  const url=source.split("#")[0]+"#"+hash;frame.src=url;frame.hidden=false;external.href=url;external.hidden=false;
  status.textContent="Página digital "+page.value+" · comparación manual; sin correspondencia automática con el locus. La búsqueda depende de la capa de texto del PDF.";
 }
 function choose(url,pages){const safe=safePdf(url);if(!safe){status.textContent="Introduce una dirección HTTPS válida de un PDF.";return}source=safe;maximum=Number.isInteger(pages)&&pages>0?pages:99999;page.max=String(maximum);page.value="1";render()}
 select.addEventListener("change",()=>{const o=select.selectedOptions[0];if(o?.value)choose(o.value,Number(o.dataset.pages))});
 open.addEventListener("click",()=>choose(input.value));input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();open.click()}});
 file.addEventListener("change",()=>{const chosen=file.files?.[0];if(!chosen)return;if(!/\.pdf$/i.test(chosen.name)&&chosen.type!=="application/pdf"){status.textContent="Selecciona un archivo PDF.";return}if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(chosen);source=objectUrl;maximum=99999;page.value="1";render()});
 page.addEventListener("change",render);prev.addEventListener("click",()=>{page.value=String(Math.max(1,Number(page.value)-1));render()});next.addEventListener("click",()=>{page.value=String(Number(page.value)+1);render()});find.addEventListener("click",render);query.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();render()}});
 pdfsFor(work).then(rows=>{for(const row of rows){const o=E("option",null,(row.related?"Esta obra · ":"")+row.title);o.value=row.url;o.dataset.pages=String(row.pages||"");select.append(o)}const first=rows.find(r=>r.related);if(first){select.value=first.url;choose(first.url,first.pages)}});
 window.addEventListener("pagehide",()=>{if(objectUrl)URL.revokeObjectURL(objectUrl)},{once:true});
 return root;
}
let footnotes=null;
function renderNotes(info){
 const host=document.querySelector(".cl-source-column")||document.querySelector("article.reader");if(!host)return;
 if(!footnotes){footnotes=E("section","cl-edition-footnotes");footnotes.id="edition-footnotes";footnotes.setAttribute("aria-label","Aparato y notas de la edición");host.append(footnotes)}
 footnotes.replaceChildren();
 const heading=E("h3",null,"Aparato y notas de la edición · "+shortLocus(info.locus));footnotes.append(heading);
 const notes=info.notes||[],list=E("ol");
 for(const [i,note] of notes.entries()){
  const item=E("li");item.id="edition-note-"+(i+1);
  item.append(E("strong",null,(note.kind==="reference"?"Referencia de la fuente":note.kind==="textual"?"Nota textual de la fuente":"Nota editorial de la fuente")+(note.number?" ["+note.number+"]":"")+". "),document.createTextNode(note.text));list.append(item);
 }
 if(notes.length)footnotes.append(list);
 else footnotes.append(E("p",null,"No se han importado notas ni variantes para este pasaje. El aparato completo, si lo incluye la edición, se consulta en la fuente."));
 const refs=E("p","cl-note-source");
 if(info.source){const a=E("a",null,"Consultar la fuente de esta edición ↗");if(/^https:\/\//.test(info.source)){a.href=info.source;a.target="_blank";a.rel="noopener noreferrer";refs.append(a)}}
 const record=E("a",null,"Ficha filológica y testimonios");record.href="classics-work-record.html?work="+encodeURIComponent(info.work);refs.append(document.createTextNode(" · "),record);footnotes.append(refs);
 if(info.importedText){const detail=E("details","cl-imported-source"),summary=E("summary",null,"Ver texto importado íntegro, antes de separar las notas");detail.append(summary,E("p",null,info.importedText));footnotes.append(detail)}
 const reference=document.getElementById("reading-reference");
 if(reference)reference.textContent=[info.metadata?.editor?"Ed. "+info.metadata.editor:null,info.metadata?.title,info.metadata?.volume?"vol. "+info.metadata.volume:null,info.metadata?.date,"Unidad "+shortLocus(info.locus)].filter(Boolean).join(" · ");
}
document.addEventListener("vitruvia:classics-passage",e=>renderNotes(e.detail));
document.addEventListener("DOMContentLoaded",()=>{
 for(const selector of [".cl-source-column .vdl-annotation-bar",".cl-translation-annotations"]){
  const bar=document.querySelector(selector);if(!bar)continue;
  const details=E("details","cl-personal-tools"),summary=E("summary",null,"Marcas, lupa y colores");
  bar.before(details);details.append(summary,bar);
 }
});
window.ClassicsAcademicReader=Object.freeze({prepare,shortLocus,findLocus,pdfPanel,pdfsFor});
})();
