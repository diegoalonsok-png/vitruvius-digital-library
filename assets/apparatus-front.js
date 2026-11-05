/* Buscador del front: integra el aparato crítico de las ediciones de Diego Kurilo.
   · Cada resultado de locus recibe su aparato vinculado (desplegable).
   · La consulta también se busca en el texto del aparato y de las notas. */
(()=>{
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const A=()=>window.KuriloApparatus;
const locusOf=article=>{const a=article.querySelector('a[href*="lector-bilingue.html"]');if(!a)return null;
 try{const l=new URL(a.href).searchParams.get("locus");return /^\d+\.(?:praef\.)?\d+(?:\.\d+)?$/.test(l||"")?l:null}catch{return null}};
async function decorate(article){
 if(article.dataset.apparatus)return;article.dataset.apparatus="pending";
 const locus=locusOf(article);if(!locus||!A())return;
 let hits=[];try{hits=await A().forLocus(locus,{lang:"es",limit:6})}catch{return}
 article.dataset.apparatus=String(hits.length);if(!hits.length)return;
 const d=document.createElement("details");d.className="result-apparatus";d.style.cssText="margin:12px 0 4px;border-top:1px solid rgba(201,168,76,.45);padding-top:10px";
 d.innerHTML='<summary style="cursor:pointer;font-weight:600">Aparato crítico y notas de '+esc(A().cite(locus))+' · '+hits.length+(hits.length===1?' entrada':' entradas')+'</summary>'+
  hits.map(e=>'<div style="margin:10px 0 0"><p class="result-meta" style="margin:0">'+esc(A().kindLabel(e.kind,"es"))+' · '+esc(e.version)+(e.page?' · PDF p. '+esc(e.page):'')+' · '+esc(A().relationLabel(e.relation,"es"))+'</p>'+
   '<p style="margin:.35em 0">'+esc(A().excerpt(e.text,"",360))+'</p><a href="'+esc(e.pdf)+'" target="_blank" rel="noopener">Página impresa ↗</a></div>').join("")+
  '<p style="margin-top:10px"><a href="aparato-critico.html?locus='+encodeURIComponent(locus)+'">Aparato completo del locus →</a></p>';
 const actions=article.querySelector(".result-actions");actions?article.insertBefore(d,actions):article.append(d)
}
let ticket=0;
async function lexical(){
 const q=($("#query")?.value||"").trim(),results=$("#search-results");if(!results||!A())return;
 let box=$("#apparatus-search-results");
 if(!box){box=document.createElement("section");box.id="apparatus-search-results";box.setAttribute("aria-label","Coincidencias en el aparato crítico");results.parentNode.insertBefore(box,results.nextSibling)}
 box.replaceChildren();if(q.length<3)return;
 const my=++ticket;let hits=[];
 try{hits=await A().search(q,{lang:"es",limit:6})}catch{return}
 if(my!==ticket||!hits.length)return;
 const h=document.createElement("h3");h.textContent="En el aparato crítico de las ediciones · "+hits.length+" coincidencias";
 h.style.cssText="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border-bottom:1px solid #C9A84C;padding-bottom:8px;margin-top:26px";
 box.append(h);
 for(const e of hits){const row=A().toRow(e,q,"es");const art=document.createElement("article");art.className="result";
  art.innerHTML='<div class="result-meta">'+esc(row.author)+'</div><h3>'+esc(row.title)+'</h3><p>'+esc(row.excerpt)+'</p><p class="result-locus">'+esc(row.meta)+'</p>'+
   '<div class="result-actions"><a href="'+esc(row.link)+'">Leer el locus →</a><a href="'+esc(e.pdf)+'" target="_blank" rel="noopener">Página impresa ↗</a><a href="'+esc(row.links[1].url)+'">Catálogo del aparato →</a></div>';
  box.append(art)}
}
function start(){
 const results=$("#search-results"),form=$("#search-form");if(!results||!form)return;
 new MutationObserver(()=>results.querySelectorAll("article.result-parallel:not([data-apparatus])").forEach(decorate)).observe(results,{childList:true,subtree:true});
 form.addEventListener("submit",()=>setTimeout(lexical,50));
 document.querySelectorAll(".examples [data-query]").forEach(b=>b.addEventListener("click",()=>setTimeout(lexical,120)));
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();
})();
