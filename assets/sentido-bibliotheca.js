/* Por sentido en toda la Bibliotheca · IA.
   Un tema escrito en cualquier lengua («proporciones del cuerpo humano y templos»)
   se busca en las obras indexadas de la Bibliotheca (originales y traducciones):
   1. Conceptus traduce las palabras del tema a sus equivalentes latinos y griegos
      documentados (no se inventan equivalencias);
   2. el motor de pasajes de la Bibliotheca reúne los pasajes que las contienen;
   3. el motor de Vitruvia los ordena por sentido (E5 multilingüe en el navegador,
      con BM25 de reserva si el modelo no puede descargarse);
   4. se agrupan por obra y se pueden comparar lado a lado.
   Sólo se muestran pasajes reales con su locus y enlace; no se genera texto. */
(()=>{
"use strict";
const $=s=>document.querySelector(s);
const el=(tag,attrs={},...kids)=>{const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else if(v!=null)e.setAttribute(k,v)}e.append(...kids.filter(x=>x!=null&&x!==false));return e};
const fold=v=>String(v||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const STOP=new Set("de del la el los las un una unos unas y e o u en por para a al con sin sobre entre que se su sus como mas pero lo le les the of and for in on to with by an a des du et est qui dans pour par sur une cum ad in et est quod non ut sed".split(" "));
const cargarScript=(src,ok)=>new Promise(r=>{if(ok())return r();const s=document.createElement("script");s.src=src;s.onload=r;s.onerror=r;document.head.append(s)});
let conceptus=null,etymologicum=null;
const cargarConceptus=()=>conceptus||(conceptus=fetch("data/lexicon/conceptus.json").then(r=>r.ok?r.json():{concepts:[]}).catch(()=>({concepts:[]})));
const cargarEtymologicum=()=>etymologicum||(etymologicum=fetch("data/lexicon/etymologicum.json").then(r=>r.ok?r.json():{entries:[]}).catch(()=>({entries:[]})));
// Únicamente se sugieren lemas documentados; la similitud ortográfica no es equivalencia semántica.
function distancia(a,b,limite){
 if(Math.abs(a.length-b.length)>limite)return limite+1;
 let prev=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const row=[i];let min=i;
  for(let j=1;j<=b.length;j++){const d=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));row.push(d);min=Math.min(min,d)}
  if(min>limite)return limite+1;
  prev=row;
 }
 return prev[b.length];
}
function lemaLatinoVerificado(word,entries){
 if(!/^[a-z]+$/.test(word))return null;
 const candidatos=(entries||[]).filter(e=>e.l==="la"&&/^[a-z]+$/.test(fold(e.lemma))).map(e=>fold(e.lemma));
 if(candidatos.includes(word))return {lemma:word,distancia:0};
 if(word.length<6)return null;
 const limite=word.length>=8?2:1;let mejor=null,empate=false;
 for(const lema of candidatos){
  if(lema[0]!==word[0]||Math.abs(lema.length-word.length)>limite)continue;
  const n=distancia(word,lema,limite);
  if(n>limite)continue;
  if(!mejor||n<mejor.distancia){mejor={lemma:lema,distancia:n};empate=false}
  else if(n===mejor.distancia&&lema!==mejor.lemma)empate=true;
 }
 return empate?null:mejor;
}
async function terminos(q){
 const [c,et]=await Promise.all([cargarConceptus(),cargarEtymologicum()]);
 const palabras=fold(q).split(/[^a-zͰ-Ͽἀ-῿]+/).filter(w=>w.length>3&&!STOP.has(w));
 const out=new Set(),usados=[],correcciones=[];
 for(const w of palabras){
  const raiz=w.length>6?w.slice(0,-2):w;
  let documentado=false;
  for(const k of c.concepts||[]){
   const modern=Object.values(k.modern||{}).flat().map(fold);
   if(modern.some(m=>m===w||m.startsWith(raiz)&&raiz.length>4)||(k.la||[]).some(l=>fold(l)===w)||(k.grc||[]).some(g=>fold(g)===w)){
    (k.la||[]).forEach(x=>out.add(x));(k.grc||[]).forEach(x=>out.add(x));usados.push(k.id);documentado=true;
   }
  }
  for(const alias of c.queryAliases||[]){
   if((alias.queries||[]).some(x=>fold(x)===w)){
    (alias.terms||[]).forEach(x=>out.add(x));usados.push(alias.source||"alias documentado");documentado=true;
   }
  }
  if(/^[a-z]+$/.test(w)&&w.length>4){
   const lemma=documentado?null:lemaLatinoVerificado(w,et.entries);
   const term=lemma?.lemma||w;
   out.add(term);
   if(lemma?.distancia>0)correcciones.push({escrito:w,lema:term,fuente:"Etymologicum"});
  }
 }
 return {terms:[...out].slice(0,12),conceptos:[...new Set(usados)],correcciones};
}
function resaltar(texto,claves){
 const f=document.createDocumentFragment();const ks=claves.map(k=>fold(k)).filter(k=>k.length>3).map(k=>k.length>6?k.slice(0,-2):k);
 for(const part of String(texto).split(/(\s+)/)){const w=fold(part).replace(/[^a-zͰ-Ͽἀ-῿]/g,"");if(w&&ks.some(k=>w.startsWith(k)))f.append(el("mark",{text:part}));else f.append(part)}
 return f;
}
const css=document.createElement("style");
css.textContent=`.sb-panel{margin:14px 0;border:1px solid rgba(127,127,127,.35);border-radius:10px;padding:0}
.sb-panel>summary{cursor:pointer;padding:12px 16px;font:600 14px/1.4 system-ui,Arial,sans-serif}
.sb-body{padding:0 16px 16px;font:14px/1.55 system-ui,Arial,sans-serif}
.sb-row{display:flex;gap:8px;flex-wrap:wrap}.sb-row textarea{flex:1 1 420px;min-height:54px;padding:10px;border-radius:8px;border:1px solid rgba(127,127,127,.5);background:transparent;color:inherit;font:15px/1.4 Georgia,serif}
.sb-row button{padding:10px 16px;border-radius:8px;border:1px solid currentColor;background:transparent;color:inherit;font:600 14px Arial;cursor:pointer}
.sb-nota{font-size:12px;opacity:.75;margin:6px 0}
.sb-obra{border-top:1px solid rgba(127,127,127,.3);padding:10px 0}.sb-obra h4{margin:0 0 4px;font:600 15px Georgia,serif}
.sb-pas{margin:6px 0 6px 0;padding-left:10px;border-left:2px solid rgba(127,127,127,.35)}.sb-pas p{margin:2px 0}
.sb-pas mark,.sb-comp mark{background:rgba(255,214,0,.42);color:inherit}
.sb-comp{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin:12px 0}.sb-comp article{border:1px solid rgba(127,127,127,.35);border-radius:8px;padding:10px;max-height:420px;overflow:auto}
.sb-comp h5{margin:0 0 6px;font:600 13px Arial}`;
document.head.append(css);
function montar(){
 const ancla=$("#lx-qb")||$("#lx-results")||$(".search-panel,#search-form,form[role=search]")||$("#results");if(!ancla||$("#sb-panel"))return;
 const panel=el("details",{class:"sb-panel",id:"sb-panel"},el("summary",{text:"Por sentido en toda la Bibliotheca · IA — párrafos sobre un tema en las obras clásicas, listados y comparables"}));
 const q=el("textarea",{placeholder:"Escriba un tema en cualquier lengua: proporciones del cuerpo humano como modelo del templo · el agua y la salud de una ciudad · la formación del arquitecto","aria-label":"Tema para la búsqueda por sentido"});
 const boton=el("button",{type:"button",text:"Buscar y comparar"});
 const estado=el("p",{class:"sb-nota",role:"status"});
 const comp=el("div",{class:"sb-comp"}),lista=el("div");
 const body=el("div",{class:"sb-body"},el("p",{class:"sb-nota",text:"Las palabras del tema se llevan a sus equivalentes latinos y griegos documentados en Conceptus; se reúnen los pasajes reales de la Bibliotheca y se ordenan por sentido con un modelo multilingüe que corre en su navegador (la primera vez descarga unos 120 MB; si no puede, ordena por coincidencia BM25 y lo dice). Marque hasta tres pasajes para compararlos lado a lado."}),
  el("div",{class:"sb-row"},q,boton),estado,comp,lista);
 panel.append(body);ancla.after(panel);
 const marcados=new Map();
 const pintarComp=()=>{comp.replaceChildren(...[...marcados.values()].map(r=>el("article",{},el("h5",{text:r.author+", "+r.title+" "+r.locus+(r.language?" · "+r.language:"")}),el("p",{},resaltar(r.originalText||r.excerpt,r._claves)),el("p",{},el("a",{href:r.link,target:"_blank",rel:"noopener",text:"abrir en el lector →"})))))};
 async function buscar(){
  const tema=q.value.trim();if(tema.length<4){estado.textContent="Escriba un tema de al menos unas palabras.";return}
  lista.replaceChildren();marcados.clear();pintarComp();
  estado.textContent="Traduciendo el tema a términos latinos y griegos documentados…";
  const {terms,conceptos,correcciones}=await terminos(tema);
  const remision=correcciones.length?"Corrección ortográfica documentada: "+correcciones.map(c=>"«"+c.escrito+"» → «"+c.lema+"» ("+c.fuente+")").join("; ")+" · ":"";
  if(!terms.length){estado.textContent="Ninguna palabra del tema tiene equivalentes documentados en Conceptus. Pruebe con términos técnicos (proporción, templo, agua, columna, muro, máquina…).";return}
  await cargarScript("assets/classics-corpus-search.js",()=>window.ClassicsCorpusSearch);
  if(!window.ClassicsCorpusSearch){estado.textContent="El motor de pasajes de la Bibliotheca no está disponible.";return}
  estado.textContent=remision+"Reuniendo pasajes con: "+terms.join(", ")+"…";
  const filas=await window.ClassicsCorpusSearch.searchPassages(terms,{limit:600,maxPerEdition:60,onProgress:p=>{estado.textContent="Revisando ediciones "+p.checked+"/"+p.total+" · "+p.matched+" pasajes candidatos…"}});
  /* Vitruvio entero (V514: latín y traducción) entra siempre como candidato: es el
     centro de la biblioteca y no debe quedar fuera por el tope de pasajes por edición. */
  try{
   const v=await fetch("data/structured/recensio-es.json").then(r=>r.json());
   const ks=[...terms,...fold(tema).split(/[^a-z]+/).filter(w=>w.length>4&&!STOP.has(w))].map(t=>fold(t)).map(t=>t.length>6?t.slice(0,-2):t);
   for(const p of v.passages){const t=fold(p.latin+" "+p.translation);if(ks.some(k=>t.includes(k)))filas.push({workId:"vitruvius",author:"Vitruvio",title:"De architectura (V514)",language:"la · es",locus:p.locus,excerpt:p.latin.slice(0,320)+" — "+String(p.translation).slice(0,220),originalText:p.latin+"\n\n"+p.translation,link:"lector-bilingue.html?"+new URLSearchParams({edition:"recensio-es",locus:p.locus,q:terms[0]||""})})}
  }catch{}
  if(!filas.length){estado.textContent=remision+"No se encontraron pasajes para esos términos en las fuentes que pudieron consultarse.";return}
  await cargarScript("assets/vitruvia-ai.js?v=20261104-rank-v1",()=>window.VitruviaAI?.rank);
  const docs=filas.map((r,i)=>({id:String(i),text:r.originalText||r.excerpt,row:r}));
  estado.textContent="Ordenando "+docs.length+" pasajes por sentido…";
  const res=window.VitruviaAI?.rank?await window.VitruviaAI.rank(tema+" "+terms.join(" "),docs,{limit:240,candidates:240}):{mode:"bm25-fallback",rows:docs.slice(0,60).map(d=>({doc:d}))};
  const porObra=new Map();
  for(const x of res.rows){const r=x.doc.row;r._claves=terms;const k=r.author+"|"+r.title;if(!porObra.has(k))porObra.set(k,[]);porObra.get(k).push(r)} /* diversidad: a lo sumo 4 pasajes por obra, hasta 30 obras */
  estado.textContent=remision+Math.min(res.rows.length,[...porObra.values()].reduce((a,b)=>a+Math.min(4,b.length),0))+" pasajes mostrados en "+Math.min(30,porObra.size)+" obras (de "+filas.length+" candidatos) · "+(res.mode==="neural"?"orden por sentido (IA E5 multilingüe) combinado con coincidencia textual":"orden por coincidencia textual BM25 (el modelo de IA no se cargó)")+" · conceptos: "+(conceptos.join(", ")||"—")+".";
  for(const [k,rs] of [...porObra].slice(0,30)){
   const [autor,titulo]=k.split("|");
   const caja=el("section",{class:"sb-obra"},el("h4",{text:autor+" · "+titulo+" ("+rs.length+")"}));
   for(const r of rs.slice(0,4)){
    const chk=el("input",{type:"checkbox","aria-label":"Comparar este pasaje"});
    chk.addEventListener("change",()=>{const id=r.link;if(chk.checked){if(marcados.size>=3){chk.checked=false;estado.textContent="Se comparan hasta tres pasajes a la vez.";return}marcados.set(id,r)}else marcados.delete(id);pintarComp()});
    caja.append(el("div",{class:"sb-pas"},el("p",{},el("label",{},chk," comparar")," · ",el("a",{href:r.link,target:"_blank",rel:"noopener",text:(r.locus||"pasaje")+(r.language?" · "+r.language:"")+(r.ocr?" · OCR":"")})),el("p",{},resaltar(r.excerpt,terms))));
   }
   lista.append(caja);
  }
 }
 boton.addEventListener("click",()=>buscar().catch(e=>{estado.textContent="Error: "+e.message}));
 q.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();boton.click()}});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(montar,800),{once:true});else setTimeout(montar,800);
})();
