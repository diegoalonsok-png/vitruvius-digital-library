/* Diccionario vitruviano redactado por el autor, consultable junto a la concordancia
   de formas. Fuente: data/lexicon/lexicon-auctoris.json (scripts/build-lexicon-auctoris.py),
   extraído del Glosario (Apéndice A) y del Glossarium Vitruvianum (Apéndice R.5) de las
   ediciones impresas. Cada definición remite a su página para poder verificarla. */
(()=>{
"use strict";
const URL_DATA="data/lexicon/lexicon-auctoris.json?v=20261111";
const IDIOMA={es:"castellano",fr:"français",en:"English"};
const $=id=>document.getElementById(id);
const el=(t,c,txt)=>{const n=document.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=String(txt);return n};
const fold=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u");
let datos=null;

function entrada(e){
 const art=el("article","catalog-card");
 const h=el("h3");
 h.append(el("span",null,e.lemma));
 if(e.graecum?.length){
  const g=el("span",null," ["+e.graecum.join(", ")+"]");
  g.lang="grc";h.append(g);
 }
 art.append(h);
 const meta=[];
 meta.push(e.idiomas.map(i=>IDIOMA[i]||i).join(" · "));
 if(e.atestiguadoEnElTextoLatino)meta.push("forma atestiguada en el texto latino editado");
 if(e.lociCitados?.length)meta.push("loci: "+e.lociCitados.join(", "));
 art.append(el("p","book-meta",meta.join(" · ")));
 for(const d of e.definiciones){
  const p=el("p","book-description");
  p.append(el("strong",null,(IDIOMA[d.idioma]||d.idioma)+" · "+d.version+": "));
  p.append(document.createTextNode(d.texto));
  art.append(p);
 }
 const links=el("p","book-source");
 for(const d of e.definiciones){
  if(links.childNodes.length)links.append(document.createTextNode(" · "));
  const a=el("a",null,d.version+", p. "+d.pagina);
  a.href=d.pdf;a.rel="noopener";
  links.append(a);
 }
 for(const l of e.lociCitados||[]){
  links.append(document.createTextNode(" · "));
  const a=el("a",null,"Vitr. "+l);
  a.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(l);
  links.append(a);
 }
 art.append(links);
 return art;
}

function pinta(){
 const q=fold(($("lexauc-q")?.value||"").trim());
 const soloGriego=$("lexauc-greek")?.checked;
 const rows=datos.entradas.filter(e=>{
  if(soloGriego&&!e.graecum?.length)return false;
  if(!q)return true;
  if(fold(e.lemma).includes(q))return true;
  if((e.graecum||[]).some(g=>fold(g).includes(q)))return true;
  return e.definiciones.some(d=>fold(d.texto).includes(q));
 });
 const box=$("lexauc-results");box.replaceChildren();
 for(const e of rows.slice(0,120))box.append(entrada(e));
 $("lexauc-count").textContent=rows.length+" lemas"+(rows.length>120?" (se muestran los primeros 120)":"")+
  (q||soloGriego?" con el filtro aplicado":"")+".";
}

async function init(){
 const box=$("lexauc-results");if(!box)return;
 try{
  const r=await fetch(URL_DATA);
  if(!r.ok)throw Error("HTTP "+r.status);
  datos=await r.json();
  if(!Array.isArray(datos.entradas))throw Error("esquema inesperado");
  const n=datos.recuentos;
  $("lexauc-intro").textContent=
   `${n.lemas} lemas redactados por el autor, ${n.conEquivalenteGriego} con su equivalente griego y `+
   `${n.trilingues} en las tres lenguas. A diferencia de la concordancia de formas de esta página, `+
   `son glosas de autor: cada una remite a la página impresa donde puede comprobarse.`;
  for(const id of ["lexauc-q","lexauc-greek"])$(id)?.addEventListener("input",pinta);
  pinta();
  const t=new URLSearchParams(location.search).get("q");
  if(t&&$("lexauc-q")){$("lexauc-q").value=t;pinta()}
 }catch(e){
  $("lexauc-count").textContent="No se pudo cargar el diccionario del autor ("+e.message+").";
 }
}
document.addEventListener("DOMContentLoaded",init,{once:true});
})();
