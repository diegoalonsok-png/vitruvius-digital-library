/* Visor documental de clásicos DOCX ya publicados. No toca originales, facsímiles ni loci. */
(()=>{"use strict";
const $=id=>document.getElementById(id),pageSize=60;
const parms=new URLSearchParams(location.search);
const safeId=/^[a-z0-9-]{2,72}$/;
const pathIndex=/^data\/classics-documents\/[a-z0-9-]+\.json$/;
const pathOriginal=/^documents\/clasicos\/[a-z0-9-]+\.(?:pdf|docx)$/;
const create=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=String(value);if(cls)e.className=cls;return e};
let documents=[],doc=null,content=null,query=(parms.get("q")||"").trim().slice(0,180),page=0,serial=0,matchPages=[];
function normal(value){
 return String(value||"").normalize("NFD").replace(/\p{M}/gu,"").replace(/ς/g,"σ").toLowerCase();
}
function hitPositions(text,q){
 if(!q)return[];
 const normalized=normal(text),search=normal(q),ranges=[];
 if(search.length<2)return ranges;
 for(let at=normalized.indexOf(search);at!==-1;at=normalized.indexOf(search,at+search.length)){
  const end=at+search.length;
  if((at===0||!/\p{L}/u.test(normalized[at-1]))&&(end===normalized.length||!/\p{L}/u.test(normalized[end])))
   ranges.push([at,end]);
 }
 return ranges;
}
function highlight(target,value,q){
 const positions=hitPositions(value,q);let cursor=0;
 for(const [first,last] of positions){
  if(first<cursor)continue;
  target.append(document.createTextNode(value.slice(cursor,first)));
  const mark=create("mark",value.slice(first,last));target.append(mark);cursor=last;
 }
 target.append(document.createTextNode(value.slice(cursor)));return positions.length;
}
function safeLink(target,label,path){
 if(!pathOriginal.test(path||""))return;
 const a=create("a",label,"passage-action");a.href=path;target.append(a);
}
function changePage(next){
 if(!content)return;
 page=Math.max(0,Math.min(Math.ceil(content.paragraphs.length/pageSize)-1,next));
 render();$("reader-results").scrollIntoView({block:"start",behavior:"smooth"});
}
function controls(id){
 const holder=$(id);holder.replaceChildren();
 const total=Math.max(1,Math.ceil(content.paragraphs.length/pageSize));
 const previous=create("button","Anterior","passage-action");previous.type="button";previous.disabled=page===0;previous.addEventListener("click",()=>changePage(page-1));
 const following=create("button","Siguiente","passage-action");following.type="button";following.disabled=page+1>=total;following.addEventListener("click",()=>changePage(page+1));
 holder.append(previous,create("span","Página "+(page+1)+" / "+total,"meta"),following);
 if(query&&matchPages.length){
  const before=matchPages.filter(n=>n<page).at(-1);
  const after=matchPages.find(n=>n>page);
  if(before!==undefined){const b=create("button","Coincidencia anterior","passage-action");b.type="button";b.addEventListener("click",()=>changePage(before));holder.append(b)}
  if(after!==undefined){const b=create("button","Coincidencia siguiente","passage-action");b.type="button";b.addEventListener("click",()=>changePage(after));holder.append(b)}
 }
}
function recount(){
 const pages=new Set();let occurrences=0,paragraphCount=0;
 if(query)for(let index=0;index<content.paragraphs.length;index++){
  const times=hitPositions(content.paragraphs[index].text,query).length;
  if(times){paragraphCount++;occurrences+=times;pages.add(Math.floor(index/pageSize))}
 }
 matchPages=[...pages].sort((a,b)=>a-b);
 return {occurrences,paragraphCount};
}
function render(){
 if(!content||!doc)return;
 $("reader-results").hidden=false;
 $("reader-title").textContent=doc.title.replace(/(^|\s)\S/g,c=>c.toUpperCase());
 const source=$("reader-source");source.replaceChildren();
 source.append(document.createTextNode("Documento conservado: "));
 safeLink(source,"DOCX",doc.source);
 if(doc.pdf){source.append(document.createTextNode(" · "));safeLink(source,"PDF",doc.pdf)}
 source.append(document.createTextNode(" · SHA-256 "+doc.sha256));
 const {occurrences,paragraphCount}=recount();
 const start=page*pageSize,records=content.paragraphs.slice(start,start+pageSize);
 $("reader-status").textContent=content.paragraphs.length+" párrafos extraídos; archivo original conservado.";
 $("reader-summary").textContent="Párrafos documentales "+(start+1)+"–"+(start+records.length)+" / "+content.paragraphs.length+
  (query?" · "+occurrences+" coincidencias en "+paragraphCount+" párrafos":"")+
  ". Numeración del DOCX; sin atribución a loci ni colación manuscrita.";
 const host=$("reader-paragraphs"),fragment=document.createDocumentFragment();host.replaceChildren();
 for(const p of records){
  const article=create("article",undefined,"hit");article.id="paragraph-"+p.ordinal;
  article.append(create("span","Párrafo "+p.ordinal,"locus"));
  const body=create("p");highlight(body,p.text,query);
  article.append(body);fragment.append(article);
 }
 host.append(fragment);
 controls("reader-controls");controls("reader-bottom-controls");
 const url=new URL(location.href);url.searchParams.set("doc",doc.id);
 if(query)url.searchParams.set("q",query);else url.searchParams.delete("q");
 url.searchParams.set("page",String(page+1));history.replaceState(null,"",url);
}
async function select(id){
 const rec=documents.find(r=>r.id===id);
 if(!rec){$("reader-status").textContent="El documento solicitado no figura en el inventario.";return}
 const request=++serial;
 $("reader-status").textContent="Abriendo los párrafos conservados en el índice…";
 $("reader-results").hidden=true;
 try{
  const response=await fetch(rec.index);if(!response.ok)throw Error("HTTP "+response.status);
  const parsed=await response.json();if(request!==serial)return;
  if(parsed.schema!=="vitruvia-classical-docx-paragraphs-v1"||parsed.source!==rec.source||
   parsed.sha256!==rec.sha256||parsed.language!=="unverified"||
   !Array.isArray(parsed.paragraphs)||parsed.paragraphs.length!==rec.paragraphs||
   parsed.paragraphs.some((p,i)=>p.ordinal!==i+1||typeof p.text!=="string"||!p.text.trim())){
    throw Error("La extracción no corresponde al manifiesto documental");
  }
  content=parsed;doc=rec;page=Math.max(0,Number(parms.get("page")||1)-1||0);
  $("reader-work").value=rec.id;$("reader-query").value=query;render();
 }catch(e){if(request===serial)$("reader-status").textContent="No se pudo verificar el documento: "+e.message}
}
async function init(){
 try{
  const res=await fetch("data/classics-documents/manifest.json");
  if(!res.ok)throw Error("Índice documental no disponible");
  const manifest=await res.json();
  if(manifest.schema!=="vitruvia-classical-document-index-v1"||
   !Array.isArray(manifest.records)||manifest.records.length!==manifest.count)throw Error("Inventario documental incoherente");
  for(const r of manifest.records)if(!safeId.test(r.id)||!pathIndex.test(r.index)||!pathOriginal.test(r.source)||
    (r.pdf&&!pathOriginal.test(r.pdf))||!/^[a-f0-9]{64}$/i.test(r.sha256)||!Number.isInteger(r.paragraphs)||r.paragraphs<1)throw Error("Ruta o archivo inválido en el inventario");
  documents=manifest.records;
  const selector=$("reader-work");selector.replaceChildren();
  for(const d of documents){const opt=create("option",d.title.replace(/(^|\s)\S/g,c=>c.toUpperCase()));opt.value=d.id;selector.append(opt)}
  selector.addEventListener("change",()=>{query="";parms.delete("page");void select(selector.value)});
  $("reader-form").addEventListener("submit",event=>{event.preventDefault();query=$("reader-query").value.trim().slice(0,180);page=0;render()});
  const chosen=parms.get("doc");await select(documents.some(x=>x.id===chosen)?chosen:documents[0].id);
 }catch(e){$("reader-status").textContent="El visor documental no pudo iniciar: "+e.message}
}
void init();
})();