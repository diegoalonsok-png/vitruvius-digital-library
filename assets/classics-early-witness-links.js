/* Referencias verificables a testimonios manuscritos tempranos.
   Adición documental: no sustituye la recensio ni inventa visores IIIF. */
(()=>{
 "use strict";
 const URL="data/classics-corpus/early-witness-links-2026-11.json";
 const make=(tag,cls,txt)=>{
   const n=document.createElement(tag);
   if(cls)n.className=cls;
   if(txt!==undefined)n.textContent=txt;
   return n;
 };
 const sourceLink=(record)=>{
   const a=make("a","early-ms-link","Consultar "+(record.linkType||"la ficha documental"));
   a.href=record.url;a.rel="noopener noreferrer";a.target="_blank";
   return a;
 };
 function section(entry){
   const block=make("section","early-ms-entry");
   block.dataset.earlyMsWork=entry.id;
   block.append(make("h2","early-ms-work",entry.author+" · "+entry.work));
   block.append(make("p","early-ms-note",entry.note));
   const ol=make("ol","early-ms-list");
   for(const w of entry.witnesses){
     const li=make("li","early-ms-witness");
     const header=make("strong",null,(w.workPart?w.workPart+" · ":"")+
       w.institution+" · "+w.shelfmark);
     li.append(header,make("p",null,"Fecha: "+w.date+" · Folios: "+w.folios));
     li.append(make("p",null,"Clasificación: "+w.type));
     li.append(make("p",null,w.note),sourceLink(w));
     ol.append(li);
   }
   block.append(ol);
   return block;
 }
 let ready;
 function fetchOnce(){
   if(!ready)ready=fetch(URL,{cache:"no-cache"})
     .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
     .then(doc=>{if(doc.schema!=="vdl-early-witness-links-v1"||!Array.isArray(doc.entries))throw Error("Registro documental incompatible");return doc.entries});
   return ready;
 }
 function renderDossier(entries){
   const host=document.getElementById("work-record");
   if(!host)return;
   document.getElementById("early-manuscript-dossier")?.remove();
   const id=new URLSearchParams(location.search).get("work")||document.getElementById("record-work")?.value||"";
   const entry=entries.find(e=>e.id===id);
   if(!entry)return;
   const wrap=make("aside","early-ms-dossier");
   wrap.id="early-manuscript-dossier";
   wrap.append(make("h2",null,"Testimonios manuscritos tempranos · fuentes externas"));
   wrap.append(make("p","early-ms-note","Enlaces a los registros de los códices; una ficha institucional no demuestra que exista un facsímil disponible. La prioridad cronológica no se presume."));
   wrap.append(section(entry));
   host.after(wrap);
 }
 function renderIndex(entries){
   const host=document.getElementById("early-witness-index");
   if(!host)return;
   host.replaceChildren();
   for(const entry of entries)host.append(section(entry));
 }
 function css(){
   if(document.getElementById("early-ms-style"))return;
   const style=make("style");style.id="early-ms-style";
   style.textContent=".early-ms-dossier,.early-ms-entry{border:1px solid #8887;border-radius:8px;padding:15px;margin:16px 0;background:transparent;color:inherit}.early-ms-dossier>.early-ms-entry{border:0;padding:0}.early-ms-entry h2{font:normal 20px Georgia,serif;margin:4px 0 12px}.early-ms-witness{padding:7px 0;border-bottom:1px solid #8884}.early-ms-witness p{margin:4px 0}.early-ms-witness a{color:inherit;text-decoration:underline}.early-ms-note{opacity:.83;font-size:13px;line-height:1.6}.early-ms-list{padding-left:24px}";
   document.head.append(style);
 }
 function run(){
   css();
   fetchOnce().then(entries=>{
     renderIndex(entries);renderDossier(entries);
     document.getElementById("record-work")?.addEventListener("change",()=>renderDossier(entries));
     addEventListener("popstate",()=>renderDossier(entries));
   }).catch(error=>{
     const host=document.getElementById("early-witness-index");
     if(host)host.textContent="No se ha podido verificar el registro de manuscritos: "+error.message;
   });
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
})();
