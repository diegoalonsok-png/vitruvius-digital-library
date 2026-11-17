/* Lexicon · Repertorios externos verificables, griego ático/koiné y lenguas semíticas.
 * Complemento no invasivo: no altera índices, lemas ni aparatos críticos existentes.
 * Fuentes externas = consulta enlazada o respuesta remota, NUNCA diccionario importado.
 */
(()=>{"use strict";
const root=document.getElementById("lx-dictionaries"),q=document.getElementById("lx-q");
if(!root||!q)return;
const sources={
 la:[
  {name:"Lewis & Short · latín clásico",source:"Logeion, University of Chicago",url:v=>"https://logeion.uchicago.edu/"+encodeURIComponent(v),method:"Entrada en fuente externa"},
  {name:"Diccionarios latinos · ATLAS",source:"Perseus / Scaife ATLAS",url:()=>"https://atlas.perseus.tufts.edu/dictionaries/",method:"Catálogo externo"},
  {name:"Vocabulario latino nuclear",source:"Dickinson College Commentaries",url:()=>"https://dcc.dickinson.edu/vocab/core-vocabulary",method:"Vocabulario temático externo"}
 ],
 attic:[
  {name:"LSJ · griego antiguo",source:"Logeion, University of Chicago",url:v=>"https://logeion.uchicago.edu/"+encodeURIComponent(v),method:"Entrada en fuente externa"},
  {name:"Intermediate Liddell–Scott · griego ático",source:"Logeion / repertorios históricos",url:v=>"https://logeion.uchicago.edu/"+encodeURIComponent(v),method:"Consulta externa; verificar acepción por autor"},
  {name:"Diccionarios de griego · ATLAS",source:"Perseus / Scaife",url:()=>"https://atlas.perseus.tufts.edu/dictionaries/",method:"Catálogo externo"}
 ],
 koine:[
  {name:"LSJ · documentación del griego",source:"Logeion, University of Chicago",url:v=>"https://logeion.uchicago.edu/"+encodeURIComponent(v),method:"Consulta lexicográfica; no adjudica uso koiné"},
  {name:"Septuaginta griega con análisis morfológico",source:"STEP Bible / CATSS LXX",url:()=>"https://www.stepbible.org/version.jsp?version=LXX",method:"Corpus koiné; comprobar ocurrencia"},
  {name:"ATLAS · corpus griego y loci",source:"Perseus / Scaife",url:()=>"https://atlas.perseus.tufts.edu/",method:"Corpus externo; comprobar período"}
 ],
 he:[
  {name:"Brown–Driver–Briggs · hebreo bíblico",source:"Sefaria / BDB",url:()=>"https://www.sefaria.org/BDB",method:"Diccionario externo"},
  {name:"BDB Aramaic · arameo bíblico",source:"Sefaria",url:()=>"https://www.sefaria.org/texts/Reference/Dictionary",method:"Catálogo externo; sección aramea"},
  {name:"Palabra en Sefaria",source:"Sefaria",url:v=>"https://www.sefaria.org/search?q="+encodeURIComponent(v),method:"Consulta por forma"}
 ],
 arc:[
  {name:"Jastrow · arameo rabínico y hebreo",source:"Sefaria / Jastrow",url:()=>"https://www.sefaria.org/texts/Reference/Dictionary",method:"Diccionario externo; confirmar grafía y dialecto"},
  {name:"BDB Aramaic · arameo bíblico",source:"Sefaria",url:()=>"https://www.sefaria.org/texts/Reference/Dictionary",method:"Diccionario externo; arameo bíblico"},
  {name:"Comprehensive Aramaic Lexicon (CAL)",source:"Hebrew Union College",url:()=>"https://cal.huc.edu/",method:"Base lexicográfica multidiálectal; búsqueda en CAL"},
  {name:"Concordancias y dialectos arameos",source:"CAL · dialectos y textos",url:()=>"https://cal.huc.edu/newtextmenu.html",method:"Consulta externa por corpus"}
 ]
};
const labels={la:"Latín",attic:"Griego ático · politónico",koine:"Griego koiné · politónico",he:"Hebreo bíblico",arc:"Arameo"};
let lang="la",seq=0;
const el=(tag,txt,cl)=>{const x=document.createElement(tag);if(txt!==undefined)x.textContent=txt;if(cl)x.className=cl;return x};
const panel=el("section",undefined,"lx-reference-hub");panel.id="lx-reference-hub";panel.setAttribute("aria-label","Repertorios especializados y cotejo ecdótico");
panel.style.cssText="border-top:1px solid #7778;margin-top:17px;padding:14px 0";
panel.append(el("h3","Repertorios filológicos · lenguas y tradiciones"));
panel.append(el("p","Estas son consultas federadas: enlaces a diccionarios institucionales y, cuando responde la API, resultados remotos identificados. No se incorporan automáticamente a nuestro índice, ni se consideran variantes ecdóticas verificadas.","lx-dict-meta"));
const tabs=el("div");tabs.style.cssText="display:flex;gap:7px;flex-wrap:wrap;margin:12px 0";
const results=el("div");results.id="lx-reference-results";
const termNote=el("p");termNote.className="lx-dict-meta";
const status=el("p");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
const btns=new Map();
const input=el("input");input.type="text";input.placeholder="Lema o forma para consulta especializada";input.setAttribute("aria-label","Lema o forma para consultar repertorios");
input.maxLength=100;input.dir="auto";
input.style.cssText="min-width:210px;max-width:100%;padding:7px;border:1px solid #7778;border-radius:5px;background:transparent;color:inherit";
const consult=el("button","Consultar fuentes");consult.type="button";
consult.style.cssText="padding:7px 12px;border-radius:5px;border:1px solid #7778;cursor:pointer";
const queryRow=el("div");queryRow.style.cssText="display:flex;flex-wrap:wrap;gap:7px;align-items:center";
queryRow.append(input,consult);
for(const [code,name] of Object.entries(labels)){
 const b=el("button",name);b.type="button";b.dataset.refLanguage=code;
 b.style.cssText="padding:6px 10px;border-radius:5px;border:1px solid #7778;cursor:pointer";
 b.setAttribute("aria-pressed","false");btns.set(code,b);tabs.append(b);
 b.addEventListener("click",()=>{lang=code;render(true)});
}
panel.append(tabs,queryRow,termNote,results,status);
const scholarly=el("div");scholarly.style.cssText="margin-top:14px;padding:11px 12px;border-top:1px solid #7776";
scholarly.append(el("h4","Concordancia por lema y cotejo ecdótico"));
scholarly.append(el("p","La búsqueda @lema opera sobre las lematizaciones registradas en el índice local; no convierte una semejanza ortográfica en identidad morfológica. Los aparatos solo documentan variantes cuando existe un testimonio comprobado.","lx-dict-meta"));
const toolsRow=el("div");toolsRow.style.cssText="display:flex;gap:9px;flex-wrap:wrap;align-items:center";
const lemmaLink=el("a","Buscar @lema en Lexicon");lemmaLink.href="vitruvia-lexicon.html";lemmaLink.style.cssText="padding:6px 10px;border:1px solid #7777;border-radius:5px";
const formLink=el("a","Buscar forma literal");formLink.href="vitruvia-lexicon.html";formLink.style.cssText="padding:6px 10px;border:1px solid #7777;border-radius:5px";
const locus=el("input");locus.type="text";locus.placeholder="Locus: 1.1.1";locus.setAttribute("aria-label","Locus canónico de Vitruvio");
locus.style.cssText="max-width:115px;min-width:0;padding:6px;border:1px solid #7777;border-radius:5px;background:transparent;color:inherit";
const apparatus=el("a","Aparato Budé");apparatus.style.cssText="padding:6px 10px;border:1px solid #7777;border-radius:5px";
const collation=el("a","Colación por locus");collation.style.cssText="padding:6px 10px;border:1px solid #7777;border-radius:5px";
const locusHint=el("small","Introducí un locus válido; ningún enlace confirma una variante por sí solo.");
function updateScholarly(){
 const term=clean(input.value)||clean(q.value);
 lemmaLink.href="vitruvia-lexicon.html?q="+encodeURIComponent("@"+term)+"&mode=palabra";
 formLink.href="vitruvia-lexicon.html?q="+encodeURIComponent(term)+"&mode=palabra";
 const l=String(locus.value||"").trim(),valid=/^(?:[1-9]|10)\\.\\d+\\.\\d+$/.test(l);
 apparatus.href=valid?"apparatus-bude.html?locus="+encodeURIComponent(l)+"&edition=v514&translation=es":"apparatus-bude.html";
 collation.href=valid?"colacion.html?locus="+encodeURIComponent(l):"colacion.html";
 locusHint.textContent=valid?"Locus "+l+" · cotejar lecturas y fuentes; no atribuir variantes sin comprobación.":"Escribí un locus como 1.1.1; la colación automática no acredita un manuscrito.";
}
input.addEventListener("input",updateScholarly);locus.addEventListener("input",updateScholarly);
toolsRow.append(lemmaLink,formLink,locus,apparatus,collation);
scholarly.append(toolsRow,locusHint);panel.append(scholarly);
const requestedLocus=new URLSearchParams(location.search).get("locus");
if(requestedLocus)locus.value=requestedLocus;
root.append(panel);
const clean=s=>String(s||"").trim().replace(/^[@#=√]+/,"").slice(0,100);
const guess=s=>/[\u0590-\u05ff\u0700-\u074f\u0780-\u07bf]/u.test(s)?"he":/[\u0370-\u03ff\u1f00-\u1fff]/u.test(s)?"attic":"la";
function render(keepTerm=false){
 for(const [code,b] of btns)b.setAttribute("aria-pressed",String(code===lang));
 if(!keepTerm||!input.value.trim())input.value=clean(q.value);
 input.lang=lang==="he"?"he":lang==="arc"?"arc":lang==="la"?"la":"grc";
 input.dir=lang==="he"||lang==="arc"?"rtl":"auto";
 const term=clean(input.value),request=++seq;
 updateScholarly();
 results.replaceChildren();status.textContent="";
 const grc=lang==="attic"||lang==="koine";
 termNote.textContent=grc?"El politónico indica grafía, no dialecto. Ático y koiné se distinguen por corpus, autor y fecha; las acepciones deben verificarse en sus loci.":lang==="arc"?"Arameo bíblico, targúmico, rabínico y siríaco requieren distinguir dialecto y escritura; semejanza gráfica ≠ misma lectura.":"Coincidencia de forma ≠ lema inequívoco; ninguna fuente externa altera la lectura del texto.";
 if(!term){status.textContent="Ingresá un lema o forma para consultar repertorios.";return}
 const list=el("ul");list.style.cssText="list-style:none;padding:0;display:grid;gap:9px";
 for(const ref of sources[lang]){
  const li=el("li");li.style.cssText="padding:9px 12px;border:1px solid #7775;border-radius:6px";
  const a=el("a",ref.name);a.href=ref.url(term);a.target="_blank";a.rel="noopener noreferrer";
  li.append(a,el("div",ref.source+" · "+ref.method,"lx-dict-meta"));list.append(li);
 }
 results.append(list);
 if(lang==="he"||lang==="arc"){
  const run=el("button","Consultar lemas en Sefaria (API)");run.type="button";
  run.style.cssText="padding:7px 11px;border:1px solid #7778;border-radius:5px;cursor:pointer";
  results.append(run);
  run.onclick=async()=>{
   run.disabled=true;status.textContent="Consultando Sefaria; las entradas se mostrarán solo si la fuente responde.";
   try{
    const response=await fetch("https://www.sefaria.org/api/words/"+encodeURIComponent(term),{mode:"cors",headers:{Accept:"application/json"}});
    if(!response.ok)throw Error("HTTP "+response.status);
    const body=await response.json();
    if(request!==seq)return;
    const entries=Array.isArray(body)?body:Array.isArray(body?.results)?body.results:[];
    const filtered=entries.filter(e=>e&&typeof e==="object"&&
      (lang==="he"?!/aramaic|jastrow/i.test(String(e.parent_lexicon||"")):/aramaic|jastrow/i.test(String(e.parent_lexicon||""))));
    if(!filtered.length){status.textContent="Sefaria no devolvió una entrada identificable de "+labels[lang]+" para esta forma. Comprobá variantes en el diccionario externo.";return}
    const ul=el("ul");ul.style.cssText="padding-left:20px";
    for(const entry of filtered.slice(0,12)){
     const li=el("li");
     li.append(el("strong",String(entry.headword||entry.word||term).slice(0,120)+" · "),
       el("span",String(entry.parent_lexicon||"Sefaria · léxico externo").slice(0,120)));
     ul.append(li);
    }
    results.append(ul);
    status.textContent=filtered.length+" entrada(s) documentadas por respuesta de Sefaria. Encabezamientos y fuentes solamente; verificar definición y contexto en Sefaria.";
   }catch(error){
    if(request===seq)status.textContent="Consulta remota no disponible ("+error.message+"). Los enlaces a Sefaria y CAL siguen disponibles; no se inventan entradas.";
   }finally{run.disabled=false}
  };
 }
}
consult.addEventListener("click",()=>render(true));
input.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();render(true)}});
const main=document.getElementById("lx-form");
main?.addEventListener("submit",()=>{input.value=clean(q.value);lang=guess(q.value);render(true)});
lang=guess(q.value);render();updateScholarly();
})();