/* Vitruvia · ficha visual de química: moléculas, compuestos y elementos.
   Si la consulta nombra una molécula, un compuesto o un elemento («molécula de carbono», «cafeína», «átomo de
   oxígeno», «H2O»), se muestra en la columna derecha: estructura 2D (PubChem), imagen de estructura y modelo 3D
   de Wikidata/Commons, modelo de capas electrónicas, fórmula, masa, números CAS y PubChem, SMILES y propiedades.
   Fuentes: Wikidata (CC0), Wikimedia Commons (licencia en cada ficha), PubChem (NCBI, dominio público). */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().trim();
const lang=()=>(document.documentElement.lang||"es").slice(0,2);
const CHEM=new Set(["Q11173","Q11344","Q79529","Q113145171","Q43460564","Q11369","Q12140","Q8054","Q36496","Q15711994","Q4936952","Q1555","Q167701","Q37129"]);
const UNITS={Q483261:"Da",Q28924752:"g/mol",Q25267:"°C",Q11579:"K",Q13147228:"g/cm³",Q42319:"Pa",Q2286:"°F",Q844211:"kg/m³",Q22137107:"u"};
async function j(url,ms=7000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{const r=await fetch(url,{signal:c.signal,headers:{Accept:"application/json"}});return r.ok?await r.json():null}catch{return null}finally{clearTimeout(t)}}
const STOP=/^(?:la |el |los |las |una? |the |a )?(?:mol[eé]culas?|molecules?|[aá]tomos?|atoms?|elementos?(?: qu[ií]micos?)?|chemical elements?|compuestos?(?: qu[ií]micos?)?|compounds?|estructura(?: qu[ií]mica)?|f[oó]rmula(?: qu[ií]mica)?|structure|formula)\s+(?:de(?:l)?\s+|of\s+)?(?:la |el |los |las )?/i;
function subject(q){let s=String(q||"").trim(),changed=false;for(let i=0;i<2;i++){const t=s.replace(STOP,"");if(t!==s){s=t;changed=true}}return{term:s.trim(),explicit:changed}}
const claim=(e,p)=>e?.claims?.[p]?.[0]?.mainsnak?.datavalue?.value;
const claims=(e,p)=>(e?.claims?.[p]||[]).map(c=>c.mainsnak?.datavalue?.value).filter(v=>v!=null);
const isChem=e=>claims(e,"P31").some(v=>CHEM.has(v.id))||claims(e,"P279").some(v=>CHEM.has(v.id))||!!claim(e,"P274")||!!claim(e,"P1086")||!!claim(e,"P662");
async function resolve(q){
 const {term,explicit}=subject(q);if(!term||term.length<1)return null;
 // Fórmula escrita (H2O, CO2, C6H12O6): PubChem directamente.
 const formula=/^(?:[A-Z][a-z]?\d*){1,12}$/.test(term.replace(/\s+/g,""))&&/\d|[A-Z].*[A-Z]/.test(term);
 const ce=window.VitruviaCurrentEntity;let ids=[];
 if(ce?.qid&&fold(ce.query||"")===fold(q))ids.push(ce.qid);
 const s=await j("https://www.wikidata.org/w/api.php?"+new URLSearchParams({action:"wbsearchentities",search:term,language:lang(),uselang:lang(),type:"item",limit:"8",format:"json",origin:"*"}));
 ids.push(...(s?.search||[]).map(x=>x.id));
 ids=[...new Set(ids)].slice(0,9);
 if(ids.length){
  const d=await j("https://www.wikidata.org/w/api.php?"+new URLSearchParams({action:"wbgetentities",ids:ids.join("|"),props:"labels|descriptions|claims|sitelinks",languages:lang()+"|en",format:"json",origin:"*"}));
  const ents=ids.map(id=>d?.entities?.[id]).filter(Boolean);
  // Sin palabra explícita («molécula de…»), solo si la primera coincidencia ya es química (evita «Carbono» como apellido).
  const hit=explicit?ents.find(isChem):(isChem(ents[0])?ents[0]:ents.slice(0,3).find(e=>isChem(e)&&fold(e.labels?.[lang()]?.value||e.labels?.en?.value)===fold(term)));
  if(hit)return{entity:hit,term};
 }
 if(formula)return{entity:null,term,formula:term.replace(/\s+/g,"")};
 return null;
}
const commons=f=>"https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(String(f).replace(/ /g,"_"));
const fileLink=f=>"https://commons.wikimedia.org/wiki/File:"+encodeURIComponent(String(f).replace(/ /g,"_"));
function el(t,c,txt){const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
function figure(src,caption,href,cls){
 const f=el("figure","vs-fig"+(cls?" "+cls:""));const a=el("a");a.href=href||src;a.target="_blank";a.rel="noopener noreferrer";
 const img=el("img");img.src=src;img.alt=caption;img.loading="lazy";img.decoding="async";img.addEventListener("error",()=>f.remove());a.append(img);
 f.append(a,el("figcaption",null,caption));return f;
}
function qty(v){if(!v)return"";const n=Number(v.amount);const u=String(v.unit||"").split("/").pop();return (Number.isFinite(n)?String(+n.toPrecision(8)).replace(".",","):v.amount)+(UNITS[u]?" "+UNITS[u]:"")}
function css(){if($("vs-css"))return;const s=el("style");s.id="vs-css";s.textContent=`
.vs-card{border:1px solid rgba(150,140,120,.45);border-radius:14px;padding:18px;margin:0 0 18px;font:14.5px/1.55 Arial,Helvetica,sans-serif}
.vs-card h2{font:normal 26px/1.2 Georgia,serif;margin:4px 0 6px}.vs-kicker{font:600 11px/1.4 Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.75;margin:0}
.vs-figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:12px 0}.vs-fig{margin:0;background:#fff;border-radius:8px;padding:8px;text-align:center}
.vs-fig img{max-width:100%;height:auto;max-height:220px;object-fit:contain}.vs-fig figcaption{font:11.5px/1.35 Arial,sans-serif;color:#333;margin-top:4px}
.vs-dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 12px;margin:10px 0}.vs-dl dt{opacity:.75}.vs-dl dd{margin:0;overflow-wrap:anywhere}
.vs-links a{margin-right:14px;display:inline-block}.vs-big{font:600 64px/1 Georgia,serif;text-align:center;border:2px solid currentColor;border-radius:10px;width:120px;margin:8px auto;padding:10px 0}
.vs-big small{display:block;font:13px Arial,sans-serif}`;document.head.append(s)}
async function render(found,q,token){
 const panel=$("vitruvia-context");if(!panel)return;
 $("vitruvia-science")?.remove();css();
 const e=found.entity,L=lang();
 const name=e?.labels?.[L]?.value||e?.labels?.en?.value||found.term;
 const card=el("section","vs-card");card.id="vitruvia-science";card.setAttribute("aria-label","Ficha química de "+name);
 const element=!!claim(e,"P1086");
 card.append(el("p","vs-kicker",element?"Elemento químico · información visual":"Molécula o compuesto · información visual"),el("h2",null,name));
 const desc=e?.descriptions?.[L]?.value||e?.descriptions?.en?.value;if(desc)card.append(el("p",null,desc));
 const figs=el("div","vs-figs");
 if(element){
  const z=Number(claim(e,"P1086")?.amount),sym=claim(e,"P246");
  const big=el("div","vs-big",sym||"");big.append(el("small",null,"Z = "+z));const f0=el("figure","vs-fig");f0.append(big,el("figcaption",null,"Símbolo y número atómico"));figs.append(f0);
  const enName=(e?.labels?.en?.value||"").replace(/^./,c=>c.toUpperCase());
  if(z&&enName)figs.append(figure(commons("Electron shell "+String(z).padStart(3,"0")+" "+enName+".svg"),"Capas electrónicas (modelo de Bohr) · Commons",fileLink("Electron shell "+String(z).padStart(3,"0")+" "+enName+".svg")));
  if(enName)figs.append(figure(commons(enName+" spectrum visible.png"),"Espectro de emisión visible · Commons",fileLink(enName+" spectrum visible.png"),"vs-wide"));
 }
 for(const f of claims(e,"P117").slice(0,2))figs.append(figure(commons(f),"Fórmula estructural · Wikidata/Commons",fileLink(f)));
 for(const f of claims(e,"P8224").slice(0,2))figs.append(figure(commons(f),"Modelo molecular o cristalino · Commons",fileLink(f)));
 for(const f of claims(e,"P18").slice(0,2))figs.append(figure(commons(f),element?"Muestra del elemento · Commons":"Imagen · Commons",fileLink(f)));
 const cid=claim(e,"P662");
 const pubchemName=found.formula||(e?.labels?.en?.value)||found.term;
 const pcImg=cid?"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/"+encodeURIComponent(cid)+"/PNG?image_size=400x300":(!element?"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/"+encodeURIComponent(pubchemName)+"/PNG?image_size=400x300":null);
 const pcPage=cid?"https://pubchem.ncbi.nlm.nih.gov/compound/"+cid:"https://pubchem.ncbi.nlm.nih.gov/#query="+encodeURIComponent(pubchemName);
 if(pcImg)figs.prepend(figure(pcImg,"Estructura 2D · PubChem (NCBI)",pcPage));
 card.append(figs);
 const dl=el("dl","vs-dl");const row=(k,v)=>{if(!v)return;dl.append(el("dt",null,k),el("dd",null,v))};
 if(element){row("Símbolo",claim(e,"P246"));row("Número atómico",qty(claim(e,"P1086")).replace(/,0+$/,""));row("Masa atómica estándar",qty(claim(e,"P2067")));row("Configuración electrónica",claim(e,"P8000"))}
 row("Fórmula química",claim(e,"P274")||found.formula);row(element?"":"Masa molecular",element?"":qty(claim(e,"P2067")));
 row("Punto de fusión",qty(claim(e,"P2101")));row("Punto de ebullición",qty(claim(e,"P2102")));row("Densidad",qty(claim(e,"P2054")));
 row("N.º CAS",claim(e,"P231"));row("PubChem CID",cid);row("SMILES",claim(e,"P233")||claim(e,"P2017"));
 if(dl.children.length)card.append(dl);
 const links=el("p","vs-links");const add=(t,u)=>{const a=el("a",null,t+" ↗");a.href=u;a.target="_blank";a.rel="noopener noreferrer";links.append(a)};
 add("PubChem",pcPage);if(cid)add("Modelo 3D interactivo (PubChem)",pcPage+"#section=3D-Conformer");
 if(e)add("Wikidata",`https://www.wikidata.org/wiki/${e.id}`);
 const wiki=e?.sitelinks?.[L+"wiki"]?.title||e?.sitelinks?.enwiki?.title;if(wiki)add("Wikipedia",`https://${e.sitelinks?.[L+"wiki"]?L:"en"}.wikipedia.org/wiki/`+encodeURIComponent(wiki.replace(/ /g,"_")));
 add("Imágenes en Commons","https://commons.wikimedia.org/w/index.php?search="+encodeURIComponent((e?.labels?.en?.value||name)+(element?" element":" molecule"))+"&title=Special:MediaSearch&type=image");
 card.append(links,el("p","vs-kicker","Fuentes: Wikidata (CC0) · Wikimedia Commons (licencia en cada ficha) · PubChem (NCBI)"));
 if(token!==seq)return;panel.prepend(card);
 // Otros paneles redibujan la columna derecha; si la ficha desaparece, se vuelve a colocar arriba.
 const keep=new MutationObserver(()=>{if(token!==seq){keep.disconnect();return}if(!card.isConnected){const p=$("vitruvia-context");if(p)p.prepend(card)}});
 keep.observe(document.body,{childList:true,subtree:true});setTimeout(()=>keep.disconnect(),20000);
}
let seq=0;
async function run(q){const token=++seq;$("vitruvia-science")?.remove();if(!q||q.length<1)return;
 const found=await resolve(q).catch(()=>null);if(token!==seq||!found)return;await render(found,q,token)}
window.addEventListener("vitruvia:search",e=>run(e.detail?.query));
window.addEventListener("vitruvia:clear",()=>{seq++;$("vitruvia-science")?.remove()});
window.VitruviaScience={resolve,subject};
})();
