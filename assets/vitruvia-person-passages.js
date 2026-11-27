/* Vitruvia · documentary name occurrences; existing readers only. */
(()=>{
"use strict";
const E=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e};
const norm=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().trim();
let query="",panel=null;
function clear(q){query=norm(q);panel?.remove();panel=null}
function exactURL(p){
 try{const u=new URL(p.link,location.href);if(u.origin!==location.origin||!/(?:classics-text-reader(?:\.html)?|lector-bilingue\.html|classics-simple-parallel\.html)$/.test(u.pathname))return "";
 if(/classics-text-reader(?:\.html)?$/.test(u.pathname)&&p.source){u.searchParams.set("edition",p.source);u.searchParams.set("lang",p.language);}
 return u.href}catch{return ""}
}
function render(d){
 if(norm(d.query)!==query)return;
 const groups=new Map(),seen=new Set();
 for(const p of d.rows||[]){
  if(p.ocr||!p.locus||!p.originalText||!exactURL(p))continue;
  const key=[p.workId,p.language,p.source].join("|"),id=key+"|"+p.locus;
  if(seen.has(id))continue;seen.add(id);
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);
 }
 if(!seen.size)return;
 if(!panel){
  panel=E("section");panel.id="vitruvia-person-passages";panel.style.cssText="margin:20px 0;padding:18px;border:1px solid var(--line,#777);border-radius:10px";
  document.getElementById("vitruvia-academic-timeline")?.after(panel);
 }
 const previous=panel.querySelector("select[data-work]")?.value,prior=panel.querySelector("select[data-locus]")?.value;
 const open=panel.querySelector("iframe"),oldSrc=open?.getAttribute("src");
 panel.replaceChildren(E("h2","Testimonios textuales en Bibliotheca"),E("p","Coincidencias documentadas de nombres y variantes. El contexto debe confirmar la identidad de cada mención."));
 panel.append(E("p",seen.size+" pasajes · "+groups.size+" ediciones · "+(d.complete?"Consulta inicial terminada":"Búsqueda en curso")+" · "+(d.checked??0)+"/"+(d.total??"?")+" rutas candidatas"+(d.failed?" · "+d.failed+" no disponibles":"")+". Hasta 40 pasajes por edición y 600 resultados; no es una concordancia exhaustiva."));
 const works=E("select"),loci=E("select");works.dataset.work="1";loci.dataset.locus="1";works.setAttribute("aria-label","Obra y edición");loci.setAttribute("aria-label","Locus");
 for(const [key,list] of groups){const p=list[0],o=E("option",p.author+" · "+p.title+" · "+p.language.toUpperCase()+" ("+list.length+")");o.value=key;works.append(o)}
 if(groups.has(previous))works.value=previous;
 const controls=E("div");controls.style.cssText="display:flex;flex-wrap:wrap;gap:12px";controls.append(works,loci);panel.append(controls);
 const quote=E("blockquote");quote.style.cssText="white-space:pre-wrap;line-height:1.7";const credit=E("p"),actions=E("div");actions.style.cssText="display:flex;gap:16px;flex-wrap:wrap";
 const link=E("a","Leer original y traducción");link.target="_blank";link.rel="noopener";
 const exact=E("a","Consultar edición exacta");exact.target="_blank";exact.rel="noopener";
 const btn=E("button","Leer aquí con el visor existente");btn.type="button";
 const frame=E("iframe");frame.title="Visor de Bibliotheca";frame.hidden=true;frame.style.cssText="width:100%;height:min(70vh,680px);border:1px solid #777;margin-top:12px";
 actions.append(link,exact,btn);panel.append(quote,credit,actions,frame);
 function show(){
  const p=groups.get(works.value)?.[Number(loci.value)];if(!p)return;
  quote.textContent=p.originalText;quote.lang=p.language;credit.textContent=[p.locus,p.term?"Grafía: "+p.term:"",p.attribution].filter(Boolean).join(" · ");
  exact.href=exactURL(p);link.href=window.VitruviaReaderLinks?.parallelUrl(exact.href,location.href,p.language,p.source)||exact.href;
  frame.hidden=true;frame.removeAttribute("src");
 }
 function fill(saved){loci.replaceChildren();const list=groups.get(works.value)||[];list.forEach((p,i)=>{const o=E("option",p.locus+" · "+p.term);o.value=String(i);loci.append(o)});if(saved!==undefined&&list[Number(saved)])loci.value=saved;show()}
 works.onchange=()=>fill();loci.onchange=show;btn.onclick=()=>{frame.src=link.href;frame.hidden=false};
 fill(prior);if(oldSrc===link.href){frame.src=oldSrc;frame.hidden=false}
}
window.addEventListener("vitruvia:search",e=>clear(e.detail?.query));window.addEventListener("vitruvia:clear",()=>clear(""));
window.addEventListener("vitruvia:person-passages",e=>render(e.detail||{}));
})();