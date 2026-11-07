/* Scriptorium: three independent readers for Krohn, Kurilo and Rose.
   OCR is identified as OCR and never aligned to editorial loci by page number. */
(()=>{"use strict";
const root=document.getElementById("script-triple");
if(!root)return;
const editions={
 krohn:{name:"Krohn · 1912 · OCR latín",file:"data/text/krohn-1912.json",format:"ocr",pdf:"documents/krohn-1912.pdf"},
 kurilo:{name:"Kurilo · V514 · Latín y castellano",file:"data/structured/recensio-es.json",format:"structured",pdf:"documents/kurilo-recensio-es.pdf"},
 rose:{name:"Rose · 1899 · OCR latín",file:"data/text/rose-1899.json",format:"ocr",pdf:"https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf"},
 fr:{name:"Kurilo · V554 · Latín y francés",file:"data/structured/recensio-fr.json",format:"structured",pdf:"documents/kurilo-recensio-fr.pdf"},
 en:{name:"Kurilo · V297 · Latín e inglés",file:"data/structured/theory-en.json",format:"structured",pdf:"documents/kurilo-theory-en.pdf"}
};
const cache=new Map(),grid=root.querySelector(".script-triple-grid"),fold=v=>String(v||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
async function loadEdition(id){
 if(!cache.has(id)){
  const ed=editions[id];
  cache.set(id,fetch(ed.file).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{
   const raw=ed.format==="ocr"?d:d.passages;
   if(!Array.isArray(raw)||!raw.length)throw Error("Sin contenido de lectura");
   const pages=raw.map((p,i)=>ed.format==="ocr"?
    {locus:String(p.page||i+1),page:Number(p.page)||i+1,text:String(p.text||""),translation:""}:
    {locus:String(p.locus||i+1),page:Number(p.pdf_pages?.translation||0),text:String(p.latin||p.text||""),translation:String(p.translation||"")});
   return {ed,pages};
  }).catch(err=>{cache.delete(id);throw err}));
 }
 return cache.get(id);
}
const states=[];
for(const [slot,defaultKey] of ["krohn","kurilo","rose"].entries()){
 const panel=document.createElement("section");panel.className="script-triple-pane";grid.append(panel);
 const title=document.createElement("h3");title.textContent=["I · Krohn","II · Kurilo","III · Rose"][slot];
 const edition=document.createElement("select");edition.setAttribute("aria-label","Elegir edición del visor "+(slot+1));
 Object.entries(editions).forEach(([key,ed])=>{const o=document.createElement("option");o.value=key;o.textContent=ed.name;edition.append(o)});
 edition.value=defaultKey;
 const head=document.createElement("div");head.className="script-triple-head";head.append(title,edition);panel.append(head);
 const bar=document.createElement("div");bar.className="script-triple-tools";
 const prev=document.createElement("button");prev.type="button";prev.textContent="←";
 const locus=document.createElement("select");locus.setAttribute("aria-label","Página o locus del visor "+(slot+1));
 const next=document.createElement("button");next.type="button";next.textContent="→";
 const minus=document.createElement("button");minus.type="button";minus.textContent="A−";
 const plus=document.createElement("button");plus.type="button";plus.textContent="A+";
 bar.append(prev,locus,next,minus,plus);panel.append(bar);
 const search=document.createElement("input");search.type="search";search.placeholder="Buscar palabra o frase · Enter";search.setAttribute("aria-label","Buscar en este libro");panel.append(search);
 const message=document.createElement("p");message.className="script-triple-status";message.setAttribute("role","status");panel.append(message);
 const body=document.createElement("div");body.className="script-triple-text";panel.append(body);
 const foot=document.createElement("div");foot.className="script-triple-footer";
 const translation=document.createElement("button");translation.type="button";translation.textContent="Mostrar traducción";translation.hidden=true;
 const pdf=document.createElement("a");pdf.target="_blank";pdf.rel="noopener noreferrer";pdf.textContent="Abrir PDF histórico ↗";
 foot.append(translation,pdf);panel.append(foot);
 let data=null,index=0,token=0,translated=false,size=18;
 function show(){
  if(!data)return;
  const item=data.pages[index];locus.value=String(index);
  body.textContent=translated?item.translation:(item.text||"Esta página carece de OCR legible. Consultar facsímil.");
  message.textContent=(data.ed.format==="ocr"?"Página digital ":"Locus ")+item.locus+" · "+(index+1)+" / "+data.pages.length+
   (data.ed.format==="ocr"?" · OCR no corregido":" · Edición indexada por loci");
  prev.disabled=index===0;next.disabled=index===data.pages.length-1;
  pdf.href=new URL(data.ed.pdf,location.href).href+(data.ed.format==="ocr"?"#page="+item.page:item.page?"#page="+item.page:"");
  translation.hidden=data.ed.format!=="structured";
  translation.textContent=translated?"Mostrar latín":"Mostrar traducción";
  body.scrollTop=0;
 }
 async function load(){
  const current=++token;data=null;index=0;translated=false;
  message.textContent="Cargando texto indexado…";body.textContent="";
  try{
   const resolved=await loadEdition(edition.value);if(current!==token||!panel.isConnected)return;
   data=resolved;locus.replaceChildren();
   data.pages.forEach((p,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=p.locus;locus.append(o)});
   show();
  }catch(err){if(current!==token)return;message.textContent="No se pudo cargar esta edición: "+err.message;body.textContent="Probá otra edición en el selector."}
 }
 edition.addEventListener("change",load);
 prev.addEventListener("click",()=>{index=Math.max(0,index-1);show()});
 next.addEventListener("click",()=>{index=Math.min(data.pages.length-1,index+1);show()});
 locus.addEventListener("change",()=>{index=Number(locus.value)||0;show()});
 minus.addEventListener("click",()=>{size=Math.max(13,size-2);body.style.fontSize=size+"px"});
 plus.addEventListener("click",()=>{size=Math.min(32,size+2);body.style.fontSize=size+"px"});
 translation.addEventListener("click",()=>{translated=!translated;show()});
 search.addEventListener("keydown",ev=>{
  if(ev.key!=="Enter"||!data)return;ev.preventDefault();
  const q=fold(search.value.trim());if(!q)return;
  const found=data.pages.findIndex(p=>fold(p.text+" "+p.translation).includes(q));
  if(found<0){message.textContent="Sin coincidencias en esta edición.";return}
  index=found;show();message.textContent+=" · coincidencia encontrada";
 });
 states.push({load});load();
}
})();