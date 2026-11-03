/* Proyecto efímero, 100 % local. No guarda documentos en GitHub ni utiliza
   localStorage, sessionStorage, IndexedDB ni llamadas POST con archivos. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const session={units:[],title:"",limit:40,generation:0};
const maxBytes=30*1024*1024, maxUnits=12000;
const cdn={
 pdf:"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
 worker:"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
 docx:"https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js"
};
function status(message,error=false){const el=$("import-status");el.textContent=message;el.classList.toggle("error",error);}
function norm(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function detect(text){const source=$("source-lang").value;if(source!=="auto")return source;const g=(text.match(/[\u0370-\u03ff\u1f00-\u1fff]/g)||[]).length,l=(text.match(/[A-Za-zÀ-ÿ]/g)||[]).length;return g&&l?"mixed":g?"grc":"la";}
function mkunit(text,origin,n){return {id:"U-"+String(n).padStart(5,"0"),origin:origin,language:detect(text),original:text.trim(),translation:"",note:""};}
function refreshStats(){
 const n=session.units.length,done=session.units.filter(x=>x.translation.trim()).length;
 $("stats").textContent=n.toLocaleString("es-AR")+" unidades · "+done.toLocaleString("es-AR")+" traducidas o revisadas";
 for(const id of ["export-json","export-text","print"])$(id).disabled=!n;
}
function clearProject(silent=false){
 session.generation++;session.units=[];session.title="";session.limit=40;
 $("file").value="";$("pasted").value="";$("search").value="";
 $("segments").replaceChildren();
 const message=document.createElement("p");message.className="empty";message.textContent="Importá un documento para ver los pasajes alineados.";
 $("segments").append(message);$("more").hidden=true;refreshStats();
 if(!silent)status("Los datos temporales fueron descartados de esta pestaña.");
}
function chunks(raw){
 const out=[];
 for(const block of String(raw||"").replace(/\r\n?/g,"\n").split(/\n\s*\n+/)){
  let part=block.trim().replace(/[ \t]{2,}/g," ");
  while(part.length>1400){
   let cut=part.lastIndexOf(" ",1400);if(cut<700)cut=1400;
   out.push(part.slice(0,cut).trim());part=part.slice(cut).trim();
  }
  if(part)out.push(part);
 }
 return out;
}
function loadScript(url,globalName){
 if(window[globalName])return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const s=document.createElement("script");s.src=url;s.async=true;s.crossOrigin="anonymous";
  s.onload=()=>window[globalName]?resolve():reject(Error("No se pudo cargar "+globalName));
  s.onerror=()=>reject(Error("No se pudo descargar el lector del formato. Revisá tu conexión."));
  document.head.append(s);
 });
}
async function fromPdf(file){
 await loadScript(cdn.pdf,"pdfjsLib");pdfjsLib.GlobalWorkerOptions.workerSrc=cdn.worker;
 const bytes=new Uint8Array(await file.arrayBuffer()),task=pdfjsLib.getDocument({data:bytes}),units=[];
 try{
  const pdf=await task.promise;if(pdf.numPages>1200)throw Error("Dividí los PDF de más de 1200 páginas.");
  for(let i=1;i<=pdf.numPages;i++){
   const page=await pdf.getPage(i),data=await page.getTextContent();
   let text="";for(const token of data.items)text+=String(token.str||"")+(token.hasEOL?"\n":" ");
   // Las líneas extraídas no acreditan una estructura editorial ni OCR.
   for(const block of chunks(text.trim().replace(/[ \t]+\n/g,"\n"))){
    units.push(mkunit(block.replace(/\n/g," "),"PDF · página "+i,units.length+1));
    if(units.length>maxUnits)throw Error("Se alcanzó el máximo de unidades del proyecto.");
   }
   page.cleanup();
  }
 }finally{try{await task.destroy();}catch{}}
 if(!units.length)throw Error("El PDF carece de texto seleccionable. Los escaneos necesitan OCR previo.");
 return units;
}
async function fromDocx(file){
 await loadScript(cdn.docx,"mammoth");
 const output=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
 const parts=chunks(output.value||"");
 if(parts.length>maxUnits)throw Error("El documento es demasiado grande; dividilo.");
 return parts.map((part,i)=>mkunit(part,"DOCX · unidad "+(i+1),i+1));
}
function restore(data){
 if(!data||!Array.isArray(data.segments)||data.segments.length>maxUnits)throw Error("No es un proyecto válido del laboratorio.");
 return data.segments.map((p,i)=>({
  id:"U-"+String(i+1).padStart(5,"0"),origin:String(p.origin||"Proyecto importado").slice(0,180),
  language:String(p.language||"auto").slice(0,10),original:String(p.original||"").slice(0,30000),
  translation:String(p.translation||"").slice(0,40000),note:String(p.note||"").slice(0,5000)
 })).filter(x=>x.original.trim());
}
async function extract(){
 const generation=++session.generation,file=$("file").files[0],pasted=$("pasted").value.trim();
 if(!file&&!pasted){status("Elegí un archivo o pegá un texto.",true);return;}
 if(file&&file.size>maxBytes){$("file").value="";status("El límite por archivo es 30 MB.",true);return;}
 $("extract").disabled=true;status("Extrayendo texto localmente en el navegador…");
 try{
  let units,title=file?file.name:"Texto pegado";
  if(!file)units=chunks(pasted).map((part,i)=>mkunit(part,"Texto pegado",i+1));
  else{
   const ext=file.name.toLowerCase().split(".").pop();
   if(ext==="pdf")units=await fromPdf(file);
   else if(ext==="docx")units=await fromDocx(file);
   else if(ext==="txt")units=chunks(await file.text()).map((part,i)=>mkunit(part,"TXT",i+1));
   else if(ext==="json"){
    const obj=JSON.parse(await file.text());units=restore(obj);title=String(obj.title||title).slice(0,180);
   }else throw Error("El formato no es compatible. Elegí DOCX, PDF, TXT o JSON.");
  }
  if(generation!==session.generation)return;
  if(!units.length)throw Error("No se encontró texto extraíble.");
  if(units.length>maxUnits)throw Error("Dividí el documento en volúmenes de menor tamaño.");
  session.units=units;session.title=title;session.limit=40;render();
  status(units.length+" unidades extraídas. El archivo ya se liberó del selector; el texto solo permanece en memoria.");
 }catch(e){if(generation===session.generation)status("No se pudo importar: "+e.message,true);}
 finally{$("file").value="";$("extract").disabled=false;}
}
function field(unit,key,placeholder,css){
 const textarea=document.createElement("textarea");textarea.className=css;textarea.value=unit[key];textarea.placeholder=placeholder;textarea.autocomplete="off";
 textarea.setAttribute("aria-label",(key==="translation"?"Traducción ":"Nota ")+unit.id);
 textarea.addEventListener("input",()=>{unit[key]=textarea.value;refreshStats();});
 return textarea;
}
function google(unit){
 const lang=unit.language==="la"?"la":unit.language==="grc"?"el":"auto";
 if(unit.language==="grc")status("Aviso: el servicio general de Google usa griego moderno. Revisá la traducción de griego antiguo.");
 const target=$("target-lang").value,text=unit.original.slice(0,1600);
 const url="https://translate.google.com/?sl="+lang+"&tl="+encodeURIComponent(target)+"&text="+encodeURIComponent(text)+"&op=translate";
 window.open(url,"_blank","noopener,noreferrer");
}
function render(){
 const root=$("segments"),q=norm($("search").value.trim());
 const filtered=session.units.filter(u=>!q||norm(u.id+" "+u.origin+" "+u.original+" "+u.translation).includes(q));
 root.replaceChildren();
 for(const unit of filtered.slice(0,session.limit)){
  const row=document.createElement("article");row.className="segment";
  const left=document.createElement("div");left.className="unit";
  const leftHeader=document.createElement("div");leftHeader.className="unit-head";leftHeader.textContent=unit.id+" · "+unit.origin;
  const p=document.createElement("p");p.className="source-text";p.textContent=unit.original;
  if(unit.language==="la"||unit.language==="grc")p.lang=unit.language;
  left.append(leftHeader,p);
  const right=document.createElement("div");right.className="unit right";
  const rightHeader=document.createElement("div");rightHeader.className="unit-head";rightHeader.textContent="Traducción editable · "+unit.id;
  right.append(rightHeader,field(unit,"translation","Pegá aquí la traducción de Google o tu versión revisada.","editable"),field(unit,"note","Observaciones filológicas (opcional)","note-edit"));
  const controls=document.createElement("div");controls.className="segment-actions";
  const btn=document.createElement("button");btn.type="button";btn.textContent="Abrir en Google Translate";btn.title="Comparte este fragmento con Google solo al hacer clic";
  btn.addEventListener("click",()=>google(unit));
  const cp=document.createElement("button");cp.type="button";cp.textContent="Copiar original";
  cp.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(unit.original);status("Original copiado al portapapeles.");}catch{status("Seleccioná el texto para copiarlo manualmente.",true);}});
  controls.append(btn,cp);right.append(controls);row.append(left,right);root.append(row);
 }
 if(!filtered.length){const p=document.createElement("p");p.className="empty";p.textContent=session.units.length?"No hay coincidencias para esta búsqueda.":"Importá un documento para comenzar.";root.append(p);}
 $("more").hidden=filtered.length<=session.limit;refreshStats();
}
function download(text,name,mime){
 const url=URL.createObjectURL(new Blob([text],{type:mime})),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function saveJson(){
 if(!session.units.length)return;
 download(JSON.stringify({schema:"vitruvius-temporary-v1",title:session.title,sourceLanguage:$("source-lang").value,targetLanguage:$("target-lang").value,segments:session.units},null,2),"traduccion-proyecto.json","application/json;charset=utf-8");
}
function saveTxt(){
 if(!session.units.length)return;
 const body=session.units.map(u=>["["+u.id+" · "+u.origin+"]","Original:",u.original,"Traducción:",u.translation||"[pendiente]",u.note?"Nota: "+u.note:""].join("\n")).join("\n\n--------------------\n\n");
 download("VITRVVIVS · LABORATORIO EXPERIMENTAL\n"+session.title+"\n\n"+body,"traduccion-paralela.txt","text/plain;charset=utf-8");
}
function init(){
 clearProject(true);
 $("extract").addEventListener("click",extract);
 $("clear").addEventListener("click",()=>clearProject());
 $("search").addEventListener("input",()=>{session.limit=40;render();});
 $("more").addEventListener("click",()=>{session.limit+=40;render();});
 $("export-json").addEventListener("click",saveJson);
 $("export-text").addEventListener("click",saveTxt);
 $("print").addEventListener("click",()=>{if(session.units.length)window.print();});
 $("source-lang").addEventListener("change",()=>{for(const u of session.units)u.language=detect(u.original);render();});
 // Al cerrar, salir o recargar: descartamos textos y selector de archivo.
 window.addEventListener("pagehide",()=>clearProject(true));
 window.addEventListener("pageshow",e=>{if(e.persisted)clearProject(true);});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();