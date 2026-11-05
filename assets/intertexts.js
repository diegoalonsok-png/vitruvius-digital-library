/* Intertextos: en el lector bilingüe, las obras griegas y latinas que Vitruvio nombra en el locus
   abierto, con acceso a su texto en la Bibliotheca (lector con búsqueda y diccionario cuando existe). */
(()=>{
"use strict";
const box=document.createElement("section");box.className="intertexts";box.setAttribute("aria-live","polite");
let works=null,last="";
const st=document.createElement("style");st.textContent=".intertexts{margin:14px 0 0;padding:10px 14px;border-left:2px solid #C9A84C;background:rgba(128,110,75,.07);font-size:14px}.intertexts:empty{display:none}.intertexts h3{font:600 11px/1.4 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;margin:0 0 6px}.intertexts ul{margin:0;padding-left:18px}.intertexts li{margin:3px 0}.intertexts small{opacity:.75}";
document.head.append(st);
async function load(){if(!works)works=fetch("data/bibliotheca-graeca-latina-I-bce-I-ce.json").then(r=>r.json()).then(d=>d.works||[]).catch(()=>[]);return works}
async function update(){
 const locus=new URLSearchParams(location.search).get("locus")||"";if(locus===last)return;last=locus;box.replaceChildren();if(!locus)return;
 const list=(await load()).filter(w=>(w.vitruvianLoci?.loci||[]).includes(locus)&&w.id!=="vitruvius");if(!list.length)return;
 const h=document.createElement("h3");h.textContent="Autores y obras que Vitruvio nombra en este pasaje";box.append(h);
 const ul=document.createElement("ul");
 for(const w of list.slice(0,14)){const li=document.createElement("li");const a=document.createElement("a");
  const hasText=!!(w.corpusFiles||w.localHtml);
  a.href=w.localHtml&&/^classics-text-reader|^corpus\//.test(w.localHtml)?w.localHtml:"bibliotheca-graeca-latina.html?work="+encodeURIComponent(w.id)+(hasText?"&view=text":"");
  a.textContent=w.author+" · "+w.title;li.append(a);
  const s=document.createElement("small");s.textContent=hasText?" — texto en el sitio con búsqueda y diccionario":" — ficha y fuentes externas";li.append(s);ul.append(li)}
 box.append(ul);
 const n=document.createElement("small");n.textContent="La mención no implica cita literal de la obra; verifica el pasaje.";box.append(n);
}
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn):fn()}
ready(()=>{const anchor=document.getElementById("pdf-links");if(!anchor)return;anchor.after(box);
 const t=document.getElementById("latin-text");if(t)new MutationObserver(()=>setTimeout(update,30)).observe(t,{childList:true});update()});
})();
