/* Ficha crítica de la obra elegida: nombre original, cita y testimonio,
 * sin declarar "más antiguo" ningún manuscrito no acreditado.
 */
(()=>{"use strict";
const CATALOG="data/bibliotheca-graeca-latina-I-bce-I-ce.json";
let records=new Map();
const box=document.createElement("aside");box.id="classic-scholarly-provenance";box.className="classic-scholarly-provenance";box.hidden=true;
const txt=(tag,str,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=str;return el};
const link=(label,url)=>{const a=document.createElement("a");a.textContent=label;a.href=url;a.rel="noopener";if(/^https:/.test(url))a.target="_blank";return a;};
function style(){
 const css=document.createElement("style");css.id="classic-provenance-style";
 css.textContent=[
 ".classic-scholarly-provenance{background:#131315;color:#e1e1e2;border-top:1px solid #535358;border-bottom:1px solid #535358;padding:15px 17px;margin:14px 0 23px}",
 ".classic-scholarly-provenance h3{font:400 23px/1.3 'Gentium Book Plus',Georgia,serif;margin:3px 0 9px}",
 ".classic-scholarly-provenance p{font:12px/1.7 Arial,sans-serif;color:#c3c3c5;margin:7px 0}",
 ".classic-scholarly-provenance a{color:#e5e5e5;text-underline-offset:3px}",
 ".classic-scholarly-provenance .status{color:#b3b3b6;font-size:11px}",
 ".classic-scholarly-provenance [lang=grc]{font-family:'Gentium Book Plus','Cardo',serif}",
 "@media print{.classic-scholarly-provenance{break-inside:avoid}}"
 ].join("\n");document.head.append(css);
}
function line(label,value){
 const p=txt("p","");p.append(txt("strong",label+" "));p.append(document.createTextNode(value));box.append(p);
}
function renderLink(host,label,url){
 if(!url||typeof url!=="string")return;
 try{const u=new URL(url,location.href);if(u.protocol!=="https:"&&u.origin!==location.origin)return;
  const a=link(label,u.href);a.rel="noopener noreferrer";host.append(a,document.createTextNode(" · "));
 }catch(e){}
}
function detail(container,label,value){
 if(value===null||value===undefined||String(value).trim()==="")return;
 const p=txt("p","");p.append(txt("strong",label+" "),document.createTextNode(String(value)));container.append(p);
}
function evidenceHeading(label){const h=txt("h4",label);h.style.cssText="font:600 14px/1.5 system-ui,sans-serif;margin:15px 0 7px";box.append(h)}
function renderWitness(ms,i,total){
 const item=txt("section","");item.style.cssText="border-top:1px solid #8886;padding:10px 0 6px;margin-top:8px";
 const h=txt("h5",[ms.shelfmark,ms.library].filter(Boolean).join(" · ")||ms.title||"Testimonio documental");h.style.cssText="font:600 13px/1.55 system-ui,sans-serif;margin:0 0 4px";item.append(h);
 if(i===0&&total>1)item.append(txt("p","Primero en el orden cronológico de ESTA selección; no se atribuye prioridad sobre toda la tradición manuscrita.","status"));
 detail(item,"Datación:",ms.date||"La ficha consultada no ofrece fecha precisa");
 detail(item,"Extensión textual / loci:",ms.coverage);
 detail(item,"Extensión material o foliación:",ms.folioRange||ms.extent);
 detail(item,"Soporte:",ms.material);
 detail(item,"Escritura:",ms.script);
 detail(item,"Disposición o pautado:",ms.layout||ms.ruling);
 detail(item,"Procedencia:",ms.provenance||ms.origin);
 detail(item,"Base documental:",ms.verification||ms.cataloguingStatus);
 detail(item,"Reserva ecdótica:",ms.collationStatus);
 const p=txt("p","");renderLink(p,"Leer folios en la biblioteca custodia",ms.viewer);
 renderLink(p,"Registro institucional y signatura",ms.record);
 renderLink(p,"Manifiesto IIIF",ms.manifest);
 renderLink(p,"Visor de folios de Vitruvius",ms.localViewer);
 renderLink(p,"Fuente de verificación",ms.verificationUrl);
 if(p.childNodes.length)item.append(p);
 if(ms.rights)detail(item,"Derechos de imagen:",ms.rights);
 box.append(item);
}
function draw(){
 const sel=document.getElementById("classic-work");if(!sel)return;
 box.replaceChildren();box.hidden=true;
 const id=sel.value||new URLSearchParams(location.search).get("work");
 const w=records.get(id);if(!w)return;
 const heading=txt("h3",(w.author||"Autor no identificado")+" · "+(w.title||id));
 if(w.language==="grc")heading.lang="grc";
 box.append(txt("p","FICHA CODICOLÓGICA Y FILOLÓGICA · FUENTES DOCUMENTADAS","status"),heading);
 detail(box,"Datación de la composición:",w.dating);
 detail(box,"Lengua del original:",w.language==="grc"?"griego antiguo":w.language==="la"?"latín":w.language);
 const perm=txt("p","");renderLink(perm,"Abrir ficha crítica extensa", "classics-work-record.html?work="+encodeURIComponent(w.id));box.append(perm);
 evidenceHeading("Testimonios manuscritos");
 const witnesses=(Array.isArray(w.witnessRecords)?w.witnessRecords:[]).slice().sort((a,b)=>(a.dateStart||9999)-(b.dateStart||9999));
 if(witnesses.length){
  box.append(txt("p",witnesses.length+" testimonio(s) individualizado(s) en este catálogo. El orden local no establece un stemma codicum."));
  witnesses.slice(0,12).forEach((ms,i)=>renderWitness(ms,i,witnesses.length));
  if(witnesses.length>12)box.append(txt("p","Ver los restantes testimonios en la ficha crítica extensa."));
 }else if(w.manuscript?.record||w.manuscript?.manifest){
  renderWitness({shelfmark:w.manuscript.shelfmark,library:w.manuscript.institution,record:w.manuscript.record,manifest:w.manuscript.manifest,date:w.manuscript.dating,coverage:w.manuscript.status,verification:"Datos del registro editorial, sin autopsia paleográfica documentada."},0,1);
 }else{
  box.append(txt("p","Todavía no hay una signatura manuscrita individualizada con respaldo documental en este registro. No se infiere de ello ausencia de testigos."));
  const searches=Array.isArray(w.witnessLookup?.searches)?w.witnessLookup.searches:[];
  if(searches.length){const p=txt("p","");for(const q of searches)renderLink(p,"Buscar en "+q.catalogue,q.url);if(p.childNodes.length){box.append(txt("p","Consultas exploratorias en repertorios (no equivalen a identificación de un códice):","status"),p)}}
 }
 evidenceHeading("Ediciones históricas y lecturas");
 if(w.bibliography?.editionCitation)detail(box,"Referencia editorial (revisar Chicago 18):",w.bibliography.editionCitation);
 for(const e of Array.isArray(w.historicEditions)?w.historicEditions:[]){
  const sec=txt("section","");sec.style.cssText="padding:8px 0;border-top:1px solid #8885";
  detail(sec,"Edición histórica:",[e.title,e.editor?"ed. "+e.editor:"",e.year,e.provider].filter(Boolean).join(" · "));
  detail(sec,"Cobertura:",e.coverage);
  detail(sec,"Nota bibliográfica:",e.note);
  const l=txt("p","");renderLink(l,"Leer edición histórica",e.url);renderLink(l,"Registro bibliográfico",e.record);if(l.childNodes.length)sec.append(l);box.append(sec);
 }
 if(w.reading?.url){const p=txt("p","");renderLink(p,"Consultar texto de referencia",w.reading.url);box.append(p)}
 if(w.reading?.status)detail(box,"Identificación de lectura:",w.reading.status);
 if(w.pdf?.url){const p=txt("p","");renderLink(p,"Abrir PDF o facsímil de impreso",w.pdf.url);box.append(p)}
 if(w.pdf?.url&&w.pdf?.status)detail(box,"Naturaleza del PDF:",w.pdf.status);
 box.append(txt("p","Criterio ecdótico: la obra antigua, su testimonio físico, el facsímil, la transcripción, la edición impresa y la traducción constituyen objetos documentales distintos. Los metadatos y enlaces NO constituyen colación independiente de variantes ni prueba de que el testigo mostrado sea el más antiguo conservado.","status"));
 box.hidden=false;
}
async function begin(){
 const sel=document.getElementById("classic-work");
 if(!sel)return;
 try{const r=await fetch(CATALOG,{cache:"no-cache"});if(!r.ok)throw Error("Catálogo inaccesible");const data=await r.json();
  if(!Array.isArray(data.works))throw Error("Catálogo sin obras");
  records=new Map(data.works.map(w=>[w.id,w]));
 }catch(e){console.warn("Ficha crítica:",e.message);return}
 style();(document.querySelector(".workrow")||sel).insertAdjacentElement("afterend",box);
 sel.addEventListener("change",draw);
 const requested=new URLSearchParams(location.search).get("work");
 if(requested&&records.has(requested))requestAnimationFrame(()=>{if(!sel.value)sel.value=requested;draw()});
 else draw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",begin,{once:true});else begin();
})();