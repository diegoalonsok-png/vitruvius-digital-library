/* «Citar» en cada resultado de locus del buscador del front: Chicago (nota y bibliografía) y BibTeX,
   con la edición de Diego Kurilo, su DOI de Zenodo y la página del PDF cuando consta. */
(()=>{
"use strict";
const ED={
 "recensio-es":{v:"V514",title:"Vitruvio. De architectura: nueva recensio académica bilingüe",lang:"latín y castellano",doi:"10.5281/zenodo.23884757"},
 "recensio-fr":{v:"V554",title:"Vitruve. De architectura: nouvelle recensio académique bilingue",lang:"latín y francés",doi:"10.5281/zenodo.23885110"},
 "theory-en":{v:"V297",title:"The Architect of Theory: Vitruvius and the Intellectual World of Roman Antiquity",lang:"latín e inglés",doi:"10.5281/zenodo.23885404"}};
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const cite=l=>{const [b,...r]=String(l).split(".");return (R[+b]||b)+"."+r.join(".").replace(/^praef\./,"praef. ")};
// Chicago 18 (14.256): en las referencias a obras clásicas, divisiones con números arábigos y sin «p.».
const arab=l=>String(l).replace(/\.praef\./,".pr.");
function texts(ed,locus,page){const e=ED[ed]||ED["recensio-es"],loc="Vitr. "+cite(locus),pg=page?", "+page:"";
 // Identificador persistente del pasaje (Canonical Text Services, numeración de Perseus: phi1056.phi001).
 const urn="urn:cts:latinLit:phi1056.phi001:"+String(locus).replace(/^(\d+)\.praef\./,"$1.pr.");
 return {
  urn,
  nota:"Vitruvio, De architectura "+arab(locus)+", en Diego Kurilo, "+e.title+" ("+e.v+"; Sophia Lux Ediciones Académicas, 2026)"+pg.replace(/p\.\s*/,"")+", https://doi.org/"+e.doi+".",
  bibliografia:"Kurilo, Diego. "+e.title+". "+e.v+". Sophia Lux Ediciones Académicas, 2026. https://doi.org/"+e.doi+".",
  bibtex:"@book{kurilo2026"+e.v.toLowerCase()+",\n  author    = {Kurilo, Diego},\n  title     = {"+e.title+"},\n  edition   = {"+e.v+"},\n  publisher = {Sophia Lux Ediciones Académicas},\n  year      = {2026},\n  doi       = {"+e.doi+"},\n  note      = {"+loc+(page?", "+page:"")+"}\n}"}}
function decorate(article){
 if(article.dataset.cite)return;article.dataset.cite="1";
 const a=article.querySelector('a[href*="lector-bilingue.html"]');if(!a)return;
 let u;try{u=new URL(a.href)}catch{return}
 const locus=u.searchParams.get("locus"),ed=u.searchParams.get("edition")||"recensio-es";if(!/^\d+\.(?:praef\.)?\d+(?:\.\d+)?$/.test(locus||""))return;
 const pm=article.textContent.match(/PDF p\. ?(\d+)/),page=pm?"p. "+pm[1]:"";
 const actions=article.querySelector(".result-actions");if(!actions)return;
 const b=document.createElement("button");b.type="button";b.textContent="Citar";b.className="cite-locus-button";
 b.style.cssText="font:inherit;background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer";
 const box=document.createElement("div");box.hidden=true;box.style.cssText="margin:10px 0;padding:10px 12px;border:1px solid rgba(160,140,100,.5);font-size:.9em";
 const t=texts(ed,locus,page);
 for(const [k,label] of [["nota","Chicago · nota"],["bibliografia","Chicago · bibliografía"],["bibtex","BibTeX"],["urn","URN CTS del pasaje"]]){
  const row=document.createElement("div");row.style.margin="0 0 8px";
  const lab=document.createElement("strong");lab.textContent=label+" ";const copy=document.createElement("button");copy.type="button";copy.textContent="Copiar";copy.style.cssText="font:inherit;font-size:.85em;margin-left:6px";
  const pre=document.createElement(k==="bibtex"?"pre":"p");pre.textContent=t[k];pre.style.cssText="margin:4px 0;white-space:pre-wrap";
  copy.addEventListener("click",()=>{navigator.clipboard?.writeText(t[k]).then(()=>{copy.textContent="Copiado ✓";setTimeout(()=>copy.textContent="Copiar",1600)}).catch(()=>{})});
  row.append(lab,copy,pre);box.append(row)}
 b.addEventListener("click",()=>{box.hidden=!box.hidden});
 actions.append(b);actions.after(box)
}
function start(){const results=document.getElementById("search-results");if(!results)return;
 new MutationObserver(()=>results.querySelectorAll("article.result-parallel:not([data-cite])").forEach(decorate)).observe(results,{childList:true,subtree:true})}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();
})();
