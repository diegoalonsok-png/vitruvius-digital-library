/* Recuperación independiente del buscador del front.
   Solo se activa cuando assets/app.js no completa su inicialización.
   Consulta únicamente pasajes estructurados locales; no inventa resultados
   semánticos ni procede de manuscritos/OCR. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
let running=false,done=false;
const corpus="data/structured/recensio-es.json";
function fold(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/æ/gi,"ae").replace(/œ/gi,"oe").replace(/ſ/g,"s").toLowerCase().replace(/v/g,"u").replace(/j/g,"i")}
function roman(n){return ["","I","II","III","IV","V","VI","VII","VIII","IX","X"][Number(n)]||String(n)}
function passageMatches(p,query,phrase,language){
 const search=fold(query).trim(),words=search.split(/\s+/).filter(Boolean);
 if(!words.length)return false;
 const latin=fold(p.latin||""),translation=fold(p.translation||"");
 const text=language==="la"?latin:language==="es"?translation:latin+" "+translation;
 return phrase?text.includes(search):words.every(w=>text.includes(w));
}
function textNode(tag,value,parent,className){
 const el=document.createElement(tag);if(value!=null)el.textContent=value;
 if(className)el.className=className;
 parent.append(el);return el;
}
async function rescue(query){
 if(running||!query.trim())return;
 running=true;
 const status=$("search-status"),results=$("search-results");
 if(!status||!results){running=false;return}
 status.textContent="Buscador de respaldo: consultando el índice original V514…";
 try{
  const r=await fetch(corpus,{cache:"no-cache"});
  if(!r.ok)throw Error("Índice V514 HTTP "+r.status);
  const data=await r.json();
  if(data.edition!=="recensio-es"||!Array.isArray(data.passages))throw Error("Índice estructurado incorrecto");
  const mode=$("search-mode")?.value==="phrase";
  const lang=$("text-language")?.value||"all";
  const hits=data.passages.filter(p=>passageMatches(p,query,mode,lang));
  results.replaceChildren();
  textNode("p","Modo de recuperación: coincidencias documentales en V514 (latín y castellano). No incluye todavía V554 ni V297.",results,"search-note");
  const list=textNode("div",null,results,"home-rescue-results");
  for(const p of hits.slice(0,50)){
   const article=textNode("article",null,list,"result");
   article.style.cssText="padding:12px 0;border-bottom:1px solid #8885";
   const loc=p.locus||"";
   const a=textNode("a",roman(loc.split(".")[0])+"."+loc.split(".").slice(1).join("."),article);
   a.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(loc)+"&q="+encodeURIComponent(query);
   textNode("p",String(p.latin||"").slice(0,550),article).lang="la";
   if(p.translation)textNode("p",String(p.translation).slice(0,300),article).lang="es";
  }
  status.textContent=hits.length+" pasajes de V514 con «"+query+"»."+(hits.length>50?" Se muestran los primeros 50.":"")+(hits.length===0?" Probá otra grafía o el Lexicon.":"");
  done=true;
 }catch(e){
  status.textContent="El buscador principal no se inició y el índice de recuperación tampoco pudo cargarse: "+e.message+". Consultá el lector bilingüe o volvé a intentar.";
 }finally{running=false;}
}
window.__vdlHomeSearchRescue=rescue;
function ready(){
 const form=$("search-form"),input=$("query");if(!form||!input)return;
 // Siempre frenar la navegación clásica del formulario; el buscador principal
 // gestiona el mismo evento cuando está disponible.
 form.addEventListener("submit",event=>{
  event.preventDefault();
  if(window.__vdlMainSearchReady)return;
  void rescue(input.value);
 });
 const params=new URLSearchParams(location.search);
 const initial=(params.get("q")||params.get("query")||"").trim();
 if(initial&&!input.value)input.value=initial;
 if(initial){
  setTimeout(()=>{if(!window.__vdlMainSearchReady&&!done)void rescue(initial)},3500);
 }
 const signal=setTimeout(()=>{if(!window.__vdlMainSearchReady&&$("search-status")&&!initial)$("search-status").textContent="Buscador principal aún no disponible. Podés buscar en el índice de recuperación V514."},4500);
 window.addEventListener("pagehide",()=>clearTimeout(signal),{once:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});else ready();
})();