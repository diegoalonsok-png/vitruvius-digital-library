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
     if(w.viewUrl){li.append(document.createTextNode(' · '));const view=make('a',null,w.viewType||'Consultar facsímil digital');view.href=w.viewUrl;view.target='_blank';view.rel='noopener noreferrer';li.append(view)}
     ol.append(li);
   }
   block.append(ol);
   const reading=make('section','early-ms-reading');
   readingPanel(entry,reading);
   block.append(reading);
   return block;
 }

 let readingTask;
 function readingInventory(){
   if(!readingTask)readingTask=Promise.all([
     "data/classics-corpus/search-registry.json",
     "data/r2/catalogo-clasicos-r2.json",
     "data/classics-corpus/remote-translations.json"
   ].map(url=>fetch(url,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error(url+" HTTP "+r.status);return r.json()})))
   .then(([registry,r2,translations])=>({registry:registry.entries||[],r2:r2.items||[],translations:translations.entries||[]}))
   .catch(error=>{readingTask=null;throw error});
   return readingTask;
 }
 const langName={grc:"griego antiguo",la:"latín",es:"castellano",en:"inglés",fr:"francés",ar:"árabe"};
 function readingPanel(entry,target){
   target.replaceChildren(make("h3",null,"Lectura del texto, formatos y traducciones"));
   target.append(make("p","early-ms-note","El códice, el PDF de una edición, el DOCX, el OCR y una traducción son objetos diferentes. Para leer el original griego/latino se exige una transcripción atribuida a la edición que realmente lo contiene. La máquina traduce el OCR como ayuda, nunca como edición crítica."));
   readingInventory().then(inventory=>{
     const editions=inventory.registry.filter(x=>x.workId===entry.id);
     const originals=editions.filter(x=>x.language===entry.language&&["grc","la"].includes(x.language));
     const translations=editions.filter(x=>["es","fr","en"].includes(x.language));
     const pdfs=inventory.r2.filter(x=>x.id===entry.id);
     const external=inventory.translations.filter(x=>x.workId===entry.id&&x.status==="external-only"&&x.url);
     const label=make("p","early-ms-status");
     if(originals.length)label.textContent="Original indexado: "+originals.length+" edición(es) documentada(s).";
     else label.textContent="Texto original griego/latino: no figura una versión estructurada indexada con este identificador en el registro consultado. No se presume un DOCX listo para lectura.";
     target.append(label);
     for(const x of originals){
       const p=make("p","early-ms-source");
       const link=make("a",null,"Leer el "+langName[x.language]+" por pasajes y solicitar traducción automática");
       link.href=x.reader||("classics-text-reader.html?work="+encodeURIComponent(entry.id)+"&lang="+encodeURIComponent(x.language));
       if(!link.href.includes("to="))link.href+=(link.href.includes("?")?"&":"?")+"to=es";
       p.append(link,document.createTextNode(" · "+(x.sourceDescription||"Procedencia en el registro textual")+". Sin cotejo automático acreditado."));
       target.append(p);
     }
     if(pdfs.length){
       for(const p of pdfs){
         const box=make("p","early-ms-source");
         box.append(document.createTextNode("Edición digital en R2 ("+p.anio+"): "+(p.tituloEdicion||p.obra)+" · "));
         const link=make("a",null,"Abrir PDF, OCR y traducción automática página a página");
         link.href="buscador-facsimiles-clasicos.html?obra="+encodeURIComponent(p.id);
         box.append(link);
         box.append(document.createTextNode(". Idioma REAL del impreso y correspondencia de pasajes por comprobar; «lengua de la obra» no identifica el contenido lingüístico de cada página."));
         target.append(box);
       }
     }else{
       target.append(make("p","early-ms-note","PDF de esta edición en R2: no consta en el catálogo de facsímiles consultado. No se genera un enlace ficticio."));
     }
     for(const x of translations){
       const p=make("p","early-ms-source"),a=make("a",null,"Leer traducción "+(langName[x.language]||x.language)+" documentada");
       a.href=x.reader||"classics-text-reader.html?work="+encodeURIComponent(entry.id)+"&lang="+x.language;
       p.append(a,document.createTextNode(" · "+(x.sourceDescription||"Edición en registro textual")+". La coincidencia de loci requiere revisión."));
       target.append(p);
     }
     const scholarly=[...(entry.academicTranslations||[]),...external.map(x=>({lang:x.language,citation:x.edition+" · "+x.translator,url:x.url,access:x.note||"Lectura externa documentada"}))];
     const seen=new Set();
     if(scholarly.length)target.append(make("h4",null,"Traducciones académicas o históricas documentadas"));
     for(const x of scholarly){
       if(!x.url||seen.has(x.url))continue;seen.add(x.url);
       const p=make("p","early-ms-source"),a=make("a",null,"Consultar "+(langName[x.lang]||x.lang||"versión")+" · "+(x.editor||x.citation||"registro bibliográfico"));
       a.href=x.url;a.rel="noopener noreferrer";a.target="_blank";
       p.append(a,document.createTextNode(" · "+(x.citation||"")+" · "+(x.access||"No se presume licencia de redistribución")));
       target.append(p);
     }
     if(!scholarly.length&&!translations.length)target.append(make("p","early-ms-note","Traducciones publicadas en español, francés o inglés: no acreditadas en los registros consultados para esta obra. Esto no demuestra su inexistencia."));
     target.append(make("p","early-ms-note","Criterio ecdótico: solo se habla de lectura enfrentada editorial cuando fuente y traducción coinciden en loci comprobados. La traducción automática conserva la advertencia de OCR no revisado y debe cotejarse con diccionarios y ediciones críticas."));
   }).catch(error=>{
     target.append(make("p","early-ms-note","No fue posible consultar los inventarios de lectura. Estado técnico indeterminado: "+error.message));
   });
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
   style.textContent=".early-ms-dossier,.early-ms-entry{border:1px solid #8887;border-radius:8px;padding:15px;margin:16px 0;background:transparent;color:inherit}.early-ms-dossier>.early-ms-entry{border:0;padding:0}.early-ms-entry h2{font:normal 20px Georgia,serif;margin:4px 0 12px}.early-ms-witness{padding:7px 0;border-bottom:1px solid #8884}.early-ms-witness p{margin:4px 0}.early-ms-witness a{color:inherit;text-decoration:underline}.early-ms-note{opacity:.83;font-size:13px;line-height:1.6}.early-ms-list{padding-left:24px}.early-ms-reading{border-top:1px solid #8886;margin-top:12px;padding-top:12px}.early-ms-reading h3{font:normal 17px Georgia,serif}.early-ms-reading h4{font:600 14px system-ui;margin:12px 0 4px}.early-ms-source{margin:9px 0;overflow-wrap:anywhere}.early-ms-source a{text-decoration:underline;color:inherit}";
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
