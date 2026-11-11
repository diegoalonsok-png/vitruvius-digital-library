/* Laboratorium: evidence-aware discovery over existing local indexes. No invented passages. */
(()=>{"use strict";
const $=id=>document.getElementById(id),query=$("lab-query"),status=$("lab-status"),results=$("lab-results");
const resources={concepts:[],works:[],decisions:[]};
const fold=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase().replace(/ς/g,"σ");
const link=(href,text)=>{const a=document.createElement("a");a.href=href;a.textContent=text;return a};
const node=(tag,text,className)=>{const x=document.createElement(tag);if(text!=null)x.textContent=text;if(className)x.className=className;return x};
const params=new URLSearchParams(location.search);
const roman={I:1,V:5,X:10};
function locus(raw){const s=String(raw||"").trim().replace(/^Vitr\.?\s*/i,"");const m=/^([IVX]+)\.(\d+)\.(\d+)$/i.exec(s);if(m){const a=m[1].toUpperCase();let n=0;for(let i=0;i<a.length;i++)n+=(roman[a[i+1]]||0)>roman[a[i]]?-roman[a[i]]:roman[a[i]];return n+"."+m[2]+"."+m[3]}return /^(?:[1-9]|10)\.\d+\.\d+$/.test(s)?s:""}
async function read(path){const r=await fetch(path,{cache:"force-cache"});if(!r.ok)throw Error(path+" · HTTP "+r.status);return r.json()}
function extractConcept(c){return [c.id,...Object.values(c.modern||{}).flat(),...(c.la||[]),...(c.grc||[]),...(c.he||[]).map(x=>typeof x==="string"?x:x.w),...(c.arc||[]).map(x=>typeof x==="string"?x:x.w)].filter(Boolean)}
function routes(term,work,loc){
 const links=document.createElement("nav");links.setAttribute("aria-label","Fuentes y herramientas conectadas");
 const lex=new URL("vitruvia-lexicon.html",location.href);lex.searchParams.set("q",term);links.append(link(lex.pathname+lex.search,"Concordancia en Lexicon"));
 const bib=new URL("bibliotheca-graeca-latina.html",location.href);bib.searchParams.set("q",term);if(work)bib.searchParams.set("work",work);links.append(link(bib.pathname+bib.search,"Buscar en Bibliotheca"));
 const vi=new URL("vitruvia.html",location.href);vi.searchParams.set("q",term);links.append(link(vi.pathname+vi.search,"Búsqueda en Vitruvia"));
 if(work){const rd=new URL("classics-parallel-reader.html",location.href);rd.searchParams.set("work",work);if(loc)rd.searchParams.set("locus",loc);links.append(link(rd.pathname+rd.search,"Lector de la obra"))}
 if(loc){links.append(link("aparato-critico.html?locus="+encodeURIComponent(loc),"Aparato · "+loc));links.append(link("registro-ecdotico.html","Registro de decisiones ecdóticas"))}
 return links;
}
function drawItem(kind,title,description,terms,work,loc){
 const art=node("article",null,"result-item");art.append(node("p",kind,"kind"),node("h3",title),node("p",description));
 if(terms){const p=node("p",terms,"term");art.append(p)}
 art.append(routes(query.value.trim(),work,loc));results.append(art);
}
function show(){
 const term=query.value.trim(),t=fold(term),mode=$("lab-mode").value,loc=locus($("lab-locus").value);
 results.replaceChildren();
 if(!term){status.textContent="Escriba una palabra o concepto.";return}
 if($("lab-locus").value.trim()&&!loc)status.textContent="Locus no reconocido. Use III.1.2 o 3.1.2; se muestran resultados por término.";
 const concepts=mode==="work"?[]:resources.concepts.filter(c=>extractConcept(c).some(x=>fold(x).includes(t))).slice(0,12);
 const works=mode==="concept"?[]:resources.works.filter(w=>fold([w.author,w.title,w.id].join(" ")).includes(t)).slice(0,12);
 for(const c of concepts){
  const terms=[...(c.la||[]),...(c.grc||[]),...(c.he||[]).map(x=>typeof x==="string"?x:x.w)].filter(Boolean).join(" · ");
  drawItem("Concepto editorial · equivalencia semántica, no cognación",c.id,c.note||"Relaciones consignadas en el Conceptus local.",terms,"",loc);
 }
 for(const w of works){
  drawItem("Registro bibliográfico · estado textual declarado",w.author+" · "+w.title,
   (w.dating||"Sin datación especificada")+" · "+(w.effectiveOriginalIndexed?"Original indexado según inventario":"Original sin índice confirmado")+
   (w.translationHosted?" · traducción local declarada":" · sin traducción local declarada"),
   w.originalLanguage==="grc"?"Griego antiguo":w.originalLanguage==="la"?"Latín":"Lengua indicada en catálogo: "+(w.originalLanguage||"—"),w.id,loc);
 }
 if(loc){
  const matches=resources.decisions.filter(d=>d.locus===loc);
  drawItem("Anclaje editorial · Vitruvio","Vitr. "+loc,
   matches.length?matches.length+" decisiones registradas; consulte fuente y estado de revisión.":"Abrir el aparato y el texto por locus. La presencia del enlace no certifica una lectura manuscrita.","De architectura","vitruvius",loc);
 }
 if(!results.childNodes.length){
  const p=node("div","No se encontraron fichas coincidentes en los índices cargados. Esto no implica ausencia del término en el corpus: utilice las búsquedas textuales conectadas.","empty");
  p.append(routes(term,"",loc));results.append(p);
 }
 if(!status.textContent.startsWith("Locus no reconocido"))status.textContent=concepts.length+" conceptos · "+works.length+" obras"+(loc?" · 1 locus enlazado":"")+". Las coincidencias conceptuales son editoriales, no resultados de un modelo semántico general.";
 const u=new URL(location.href);u.searchParams.set("q",term);if(loc)u.searchParams.set("locus",loc);else u.searchParams.delete("locus");history.replaceState(null,"",u);
}
$("lab-form").addEventListener("submit",e=>{e.preventDefault();show()});
$("math-form").addEventListener("submit",e=>{
 e.preventDefault();const a=Number($("math-a").value),b=Number($("math-b").value),c=Number($("math-c").value);
 $("math-output").textContent=![a,b,c].every(Number.isFinite)||a===0?"No definido: a debe ser distinto de cero.":Number.isFinite(b*c/a)?"d = "+(b*c/a).toLocaleString("es-AR",{maximumFractionDigits:10}):"Resultado fuera del rango numérico";
});
const theme=(()=>{try{return localStorage.getItem("vitruvius-color-theme")==="light"?"light":"dark"}catch{return"dark"}})();
function paintTheme(value){document.documentElement.dataset.theme=value;$("theme").textContent=value==="light"?"☾ Oscuro":"☀ Claro";$("theme").setAttribute("aria-label",value==="light"?"Activar fondo oscuro":"Activar fondo claro");$("theme").setAttribute("aria-pressed",String(value==="dark"))}
paintTheme(theme);
$("theme").addEventListener("click",()=>{const v=document.documentElement.dataset.theme==="dark"?"light":"dark";paintTheme(v);try{localStorage.setItem("vitruvius-color-theme",v)}catch{}});
if(params.get("q"))query.value=params.get("q").slice(0,150);
if(params.get("locus"))$("lab-locus").value=params.get("locus").slice(0,32);
Promise.allSettled([
 read("data/lexicon/conceptus.json"),read("data/classics-corpus/indexation-roadmap-222.json"),read("data/ecdotic-decisions.json")
]).then(([c,w,d])=>{
 if(c.status==="fulfilled"&&Array.isArray(c.value.concepts))resources.concepts=c.value.concepts;
 if(w.status==="fulfilled"&&Array.isArray(w.value.items))resources.works=w.value.items;
 if(d.status==="fulfilled"&&Array.isArray(d.value.decisions))resources.decisions=d.value.decisions;
 const errors=[c,w,d].filter(x=>x.status==="rejected").length;
 status.textContent=resources.concepts.length+" conceptos y "+resources.works.length+" fichas cargadas."+(errors?" Atención: "+errors+" inventario(s) no disponibles.":"");
 if(query.value.trim())show();
});
})();