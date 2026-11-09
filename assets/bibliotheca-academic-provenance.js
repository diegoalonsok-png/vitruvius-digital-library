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
function draw(){
 const sel=document.getElementById("classic-work");if(!sel)return;
 box.replaceChildren();box.hidden=true;const id=sel.value;
 const w=records.get(id);if(!w)return;
 const heading=txt("h3",w.author+" · "+w.title);
 if(w.language==="grc")heading.lang="grc";
 box.append(txt("p","FICHA DE FUENTE · NOMBRE ANTIGUO Y TESTIMONIOS","status"),heading);
 line("Cronología editorial:",w.dating||"datación no verificada");
 if(w.bibliography?.editionCitation){
  line("Edición documentada (revisar según Chicago 18):",w.bibliography.editionCitation);
 }else{
  line("Cita bibliográfica:", "pendiente de normalización completa Chicago 18; no se asignan editor, fecha o manuscrito por conjetura");
 }
 const ms=w.manuscript||{},old=ms.oldest||{};
 if(old.record&&/^https:/.test(old.record)){
  const p=txt("p","");p.append(txt("strong","Testimonio temprano identificado: "));p.append(link("Ficha de manuscrito",old.record));box.append(p);
 }else{
  line("Testimonio más antiguo digitalizado:","sin acreditación documental suficiente en este registro");
 }
 if(ms.status)line("Estado codicológico declarado:",ms.status);
 if(ms.record&&/^https:/.test(ms.record)){
  const p=txt("p","");p.append(txt("strong","Manuscrito documentado (no necesariamente el más antiguo): "));p.append(link("Registro institucional",ms.record));box.append(p);
 }
 if(ms.manifest&&/^https:/.test(ms.manifest)){
  const p=txt("p","");p.append(txt("strong","IIIF del testimonio identificado: "));p.append(link("Manifiesto de imágenes",ms.manifest));box.append(p);
 }
 if(w.id==="vitruvius"){
  const p=txt("p","");p.append(txt("strong","Visor del testimonio H: "));p.append(link("Codex H · lectura de folios", "codex-h-doble-folio.html"));box.append(p);
 }
 if(w.reading?.url&&/^https:/.test(w.reading.url)){
  const p=txt("p","");p.append(txt("strong","Fuente de lectura externa: "));p.append(link("Consultar texto",w.reading.url));box.append(p);
 }
 box.append(txt("p","Un texto de lectura, una edición impresa, una traducción y una imagen del códice son testimonios distintos; los enlaces no acreditan por sí solos colación ecdótica.","status"));
 box.hidden=false;
}
async function begin(){
 const sel=document.getElementById("classic-work");
 if(!sel)return;
 try{const r=await fetch(CATALOG);if(!r.ok)throw Error("Catálogo inaccesible");const data=await r.json();
  if(!Array.isArray(data.works))throw Error("Catálogo sin obras");
  records=new Map(data.works.map(w=>[w.id,w]));
 }catch(e){console.warn("Ficha crítica:",e.message);return}
 style();(document.querySelector(".workrow")||sel).insertAdjacentElement("afterend",box);
 sel.addEventListener("change",draw);
 const requested=new URLSearchParams(location.search).get("work");
 if(requested&&records.has(requested))requestAnimationFrame(draw);
 else draw();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",begin,{once:true});else begin();
})();