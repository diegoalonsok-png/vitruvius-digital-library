/* Krohn 1912: search the independent PerseusDL TEI digital transcription.
   Avoid using OCR of scanned pages as sole searchable textual authority.
   TEI is not a diplomatic manuscript transcription and is not independently
   verified against every printed page. */
(()=>{"use strict";
const panel=document.getElementById("edition-search-form");
if(!panel||document.body.dataset.edition!=="krohn-1912")return;
const block=document.createElement("section");
block.className="edition-search krohn-tei-search";
block.id="krohn-tei-search";
block.setAttribute("aria-label","Consulta del texto digital latino de Krohn sin OCR");
block.style.cssText="margin:14px 0;padding:10px 13px;border:1px solid #93886a77;border-radius:5px";
const heading=document.createElement("h3");heading.textContent="Krohn 1912 · buscar en latín TEI (sin OCR)";
heading.style.cssText="font:600 16px/1.35 Georgia,serif;margin:0 0 5px";block.append(heading);
const intro=document.createElement("p");
intro.textContent="Transcripción digital independiente procedente de PerseusDL; alineada por locus. Evita los errores del reconocimiento óptico de páginas, pero no sustituye el cotejo con el impreso ni contiene aquí un aparato crítico verificado.";
intro.className="edition-note";block.append(intro);
const form=document.createElement("form");form.style.cssText="display:flex;flex-wrap:wrap;gap:6px;align-items:end";
const label=document.createElement("label");label.textContent="Término latino o locus";
label.style.cssText="display:grid;gap:3px;flex:1 1 220px";
const input=document.createElement("input");input.type="search";input.placeholder="symmetria · numen · 3.1.1";input.maxLength=180;input.required=true;label.append(input);
const submit=document.createElement("button");submit.type="submit";submit.textContent="Buscar en TEI";
form.append(label,submit);block.append(form);
const state=document.createElement("p");state.setAttribute("role","status");state.setAttribute("aria-live","polite");state.className="edition-note";block.append(state);
const results=document.createElement("div");block.append(results);
const more=document.createElement("button");more.type="button";more.textContent="Mostrar más loci";more.hidden=true;block.append(more);
panel.insertAdjacentElement("afterend",block);
const source=document.createElement("a");source.href="https://github.com/PerseusDL/canonical-latinLit/blob/master/data/phi1056/phi001/phi1056.phi001.perseus-lat2.xml";source.target="_blank";source.rel="noopener noreferrer";source.textContent="Fuente TEI PerseusDL";
block.append(document.createTextNode(" "));block.append(source);
let dataset=null,hits=[],shown=0;
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/v/g,"u").replace(/j/g,"i");
const clean=s=>String(s||"").trim().replace(/^([IVX]+)\./i,(m,x)=>{let v=0;const r={I:1,V:5,X:10};for(let i=0;i<x.length;i++)v+=r[x[i]]<r[x[i+1]]?-r[x[i]]:r[x[i]];return v+"."}).toLowerCase();
const append=(tag,txt,parent)=>{const el=document.createElement(tag);el.textContent=txt;parent.append(el);return el};
async function load(){
 if(dataset)return dataset;
 const r=await fetch("data/critical-editions/krohn-1912-tei-loci.json",{cache:"no-cache"});
 if(!r.ok)throw Error("No se pudo consultar la transcripción TEI (HTTP "+r.status+")");
 const data=await r.json();
 if(data.edition!=="krohn-1912"||!Array.isArray(data.passages)||data.passages.length!==731)throw Error("Transcripción TEI o índice de loci incompletos");
 dataset=data.passages;return dataset;
}
function draw(){
 const frag=document.createDocumentFragment();
 for(const p of hits.slice(shown,shown+20)){
  const a=append("article","",frag);a.style.cssText="padding:10px 0;border-top:1px solid #8884";
  const heading=document.createElement("a");heading.href="lectura-comparada.html?edition=krohn-1912&reading=krohn&lang=la&locus="+encodeURIComponent(p.locus);
  heading.textContent="Vitr., De architectura "+p.locus+" · texto TEI";a.append(heading);
  const text=append("p",p.latin,a);text.lang="la";text.style.cssText="font:14px/1.7 Georgia,serif;margin:4px 0;white-space:pre-wrap";
  append("small","Transcripción digital no cotejada íntegramente con el facsímil. Locus estructurado, no variante crítica.",a);
 }
 results.append(frag);shown=Math.min(hits.length,shown+20);
 more.hidden=shown>=hits.length;more.textContent="Mostrar más ("+shown+" de "+hits.length+")";
}
form.addEventListener("submit",async e=>{
 e.preventDefault();submit.disabled=true;state.textContent="Consultando transcripción latina…";results.replaceChildren();more.hidden=true;
 try{
  const passages=await load();
  const q=fold(input.value),loc=clean(input.value),isLocus=/^(?:[1-9]|10)\.(?:praef|\d+)(?:\.\d+)?$/.test(loc);
  const words=q.split(/\s+/).filter(Boolean);
  hits=passages.filter(p=>isLocus?(p.locus===loc||p.locus.startsWith(loc+".")):words.every(w=>fold(p.latin).includes(w)));
  shown=0;draw();
  state.textContent=hits.length+" loci encontrados en la transcripción TEI. No se ha utilizado OCR para obtener estos resultados.";
 }catch(error){state.textContent="Error de consulta TEI: "+error.message;}
 finally{submit.disabled=false;}
});
more.addEventListener("click",draw);
})();