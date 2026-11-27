/* Scholarly access to the 811 actual editorial notes extracted from the author's DOCX.
   A note found by text is NOT linked to a locus without documentary evidence.
   Index is loaded only after user requests it. */
(()=>{
"use strict";
const page=location.pathname.split("/").pop().replace(/\.html$/,"");
const input=document.getElementById(page==="vitruvia-lexicon"?"lx-q":"query");
const form=document.getElementById(page==="vitruvia-lexicon"?"lx-form":page==="vitruvia"?"search-form":"none");
if(!input||document.getElementById("notes-critical-bridge"))return;
const wrap=document.createElement("section");wrap.id="notes-critical-bridge";wrap.className="notes-critical-bridge";
wrap.innerHTML='<details><summary>Aparato crítico original · consultar notas de V514, V554 y V297</summary><div class="notes-critical-content"><p>Las fichas consultan <strong>811 notas reales extraídas de los documentos originales de las ediciones</strong>. Una coincidencia dentro del texto de una nota no demuestra que esté anclada al pasaje buscado. Las notas con locus explícito se identifican por separado.</p><button id="notes-critical-search" type="button">Buscar notas para el término actual</button><p id="notes-critical-status" role="status">Cargue las notas cuando sea necesario; el buscador principal no descarga este archivo automáticamente.</p><div id="notes-critical-results"></div><p><a id="notes-critical-inventory-link" href="inventario-aparato-autoral.html">Explorar los 811 registros originales por locus y fuente citada →</a></p><p class="notes-critical-caution">La evidencia de aparato procede de los libros V514/V554/V297. El vínculo de una nota con un locus y la verificación de una variante manuscrita son dos controles distintos. Para consulta del aparato por página PDF, utilice <a href="aparato-critico.html">el catálogo integral</a> y el <a href="registro-ecdotico.html">registro ecdótico</a>.</p></div></details>';
(form||input).insertAdjacentElement("afterend",wrap);
const find=()=>document.getElementById("notes-critical-results");
const status=()=>document.getElementById("notes-critical-status");
const btn=document.getElementById("notes-critical-search");
const inventoryLink=document.getElementById("notes-critical-inventory-link");
function updateInventoryLink(){
 if(!inventoryLink)return;
 const q=input.value.trim().slice(0,200);
 const locus=canonicalLocus(q);
 const params=new URLSearchParams();
 if(q)params.set(locus?"locus":"q",locus||q);
 inventoryLink.href="inventario-aparato-autoral.html"+(params.size?"?"+params:"");
}
updateInventoryLink();
let pending=null,sequence=0;
const editionNames={"recensio-es":"V514 · Castellano","recensio-fr":"V554 · Français","theory-en":"V297 · English"};
function item(tag,text,cls){const x=document.createElement(tag);if(text!==undefined)x.textContent=String(text);if(cls)x.className=cls;return x}
function load(){
 if(!pending)pending=fetch("data/critical-notes.json").then(r=>{
  if(!r.ok)throw Error("HTTP "+r.status);return r.json()
 }).then(d=>{if(!Array.isArray(d.entries))throw Error("Formato de notas inválido");return d.entries})
 .catch(e=>{pending=null;throw e});
 return pending;
}
function normalize(s){return String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[ςϲ]/g,"σ")}
function canonicalLocus(value){
 const parsed=window.VitruviaResearchEngine?.parseReference?.(value);
 if(parsed?.book&&parsed.chapter&&parsed.section)return [parsed.book,parsed.chapter,parsed.section].join(".");
 const q=normalize(value).trim().replace(/^(?:locus|loc\.)\s+/,"");
 const m=q.match(/^(10|[1-9]|x|ix|viii|vii|vi|v|iv|iii|ii|i)[.,:\s]+(praef(?:atio)?|prefacio|preface|\d{1,3})[.,:\s]+(\d{1,3})$/);
 if(!m)return "";
 const roman={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
 const book=roman[m[1]]||Number(m[1]),chapter=/^\d+$/.test(m[2])?Number(m[2]):"praef",section=Number(m[3]);
 return book>=1&&book<=10&&(chapter==="praef"||chapter>0)&&section>0?[book,chapter,section].join("."):"";
}
function classify(n,q){
 const target=canonicalLocus(q),locus=canonicalLocus(n.locus||""),candidate=canonicalLocus(n.candidate_locus||"");
 const exact=!!target&&target===locus&&n.mapping_status==="explicit_in_anchor";
 const probable=!!target&&target===candidate&&!exact;
 const inText=normalize(n.text||"").includes(normalize(q));
 const inAnchor=normalize(n.anchor||"").includes(normalize(q));
 return {exact,probable,inText,inAnchor,score:(exact?1000:0)+(probable?100:0)+(inText?20:0)+(inAnchor?4:0)};
}
async function run(){
 const query=input.value.trim().slice(0,140),request=++sequence;
 find().replaceChildren();
 if(query.length<2){status().textContent="Escriba una palabra o locus para consultar las notas.";return}
 status().textContent="Leyendo las notas editoriales originales…";btn.disabled=true;
 try{
  const notes=await load();if(request!==sequence)return;
  const norm=normalize(query);
  const found=notes.map(n=>({n,c:classify(n,query)}))
   .filter(({c})=>c.exact||c.probable||c.inText||c.inAnchor)
   .sort((a,b)=>b.c.score-a.c.score||a.n.edition.localeCompare(b.n.edition)||Number(a.n.footnote_id)-Number(b.n.footnote_id));
  const exact=found.filter(x=>x.c.exact).length;
  const probable=found.filter(x=>x.c.probable).length;
  status().textContent=found.length+" notas con coincidencia, de "+notes.length+" disponibles; "+exact+" con referencia explícita en el párrafo fuente y "+probable+" con locus candidato sin cotejar. Una mención no certifica anclaje editorial ni variante manuscrita.";
  const limit=40;for(const {n,c} of found.slice(0,limit)){
   const article=item("article",undefined,"notes-critical-card");
   article.append(item("h4",(editionNames[n.edition]||n.edition)+" · nota "+n.footnote_id));
   article.append(item("p",c.exact?"Referencia explícita en el párrafo fuente: "+n.locus:c.probable?"Locus candidato pendiente de cotejo: "+n.candidate_locus:n.locus?
    "Referencia explícita distinta: "+n.locus:
    "Locus no certificado en el archivo de notas original","notes-critical-evidence"));
   const ex=item("p",n.text.slice(0,1050)+(n.text.length>1050?"…":""));
   article.append(ex);
   const nav=item("div",undefined,"notes-critical-links");
   const link=item("a","Ver aparato crítico y página PDF");
   link.href="aparato-critico.html?q="+encodeURIComponent(c.exact?n.locus:query);nav.append(link);
   if(n.locus&&n.mapping_status==="explicit_in_anchor"){
    const reader=item("a","Abrir locus en "+(editionNames[n.edition]||n.edition));
    reader.href="lector-bilingue.html?edition="+encodeURIComponent(n.edition)+"&locus="+encodeURIComponent(n.locus);nav.append(reader);
   }
   article.append(nav);find().append(article);
  }
  if(found.length>limit)find().append(item("p","Se muestran las primeras "+limit+" notas por prioridad. El catálogo integral permite examinar las demás."));
  if(!found.length)find().append(item("p","No se encontraron notas por esta cadena; ello no demuestra ausencia de aparato sobre la obra, ni ausencia de variantes en los manuscritos."));
 }catch(e){if(request===sequence)status().textContent="No se pudo cargar el índice de notas: "+e.message}
 finally{if(request===sequence)btn.disabled=false}
}
btn.addEventListener("click",run);
input.addEventListener("input",()=>{sequence++;btn.disabled=false;status().textContent="Pulse «Buscar notas» para actualizar la consulta.";find().replaceChildren();updateInventoryLink()});
})();
