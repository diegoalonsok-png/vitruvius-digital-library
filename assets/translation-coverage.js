(()=>{
"use strict";
const $=id=>document.getElementById(id),tbody=$("rows"),counter=$("count"),metrics=$("metrics");
const fold=x=>String(x||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
let works=[],candidateSources=[];
function metric(value,label){
 const div=document.createElement("div"),n=document.createElement("strong"),p=document.createElement("span");
 div.className="metric";n.textContent=String(value);p.textContent=label;div.append(n,p);return div;
}
function update(){
 const q=fold($("q").value.trim()),state=$("state").value,lang=$("lang").value,missing=$("missing-lang")?.value||"all";
 const filtered=works.filter(w=>{
  if(q&&!fold(w.author+" "+w.title+" "+w.id).includes(q))return false;
  if(lang!=="all"&&!w.translationLanguages.includes(lang))return false;
  if(missing!=="all"&&w.translationLanguages.includes(missing))return false;
  if(state==="original"&&!w.originalIndexed||state==="unindexed"&&w.originalIndexed||
    state==="translated"&&!w.translationLanguages.length||state==="no-translation"&&w.translationLanguages.length)return false;
  return true;
 });
 counter.textContent=filtered.length+" obras coinciden con los filtros.";
 tbody.replaceChildren();
 for(const w of filtered){
  const tr=document.createElement("tr");
  function td(text){const cell=document.createElement("td");cell.textContent=text;tr.append(cell);return cell}
  td(w.author);td(w.title);td(w.originalIndexed?"Indexado · "+w.originalLanguage:"Pendiente · "+w.originalLanguage);
  td(w.translationLanguages.length?w.translationLanguages.map(x=>{
   const lang=({es:"Castellano",en:"Inglés",fr:"Francés"})[x]||x;
   const complete=w.localTranslationCompleteness?.[x];
   return complete?.status==="partial"?lang+" (PARCIAL · "+complete.availableChapters+"/"+complete.expectedChapters+" capítulos; faltan "+(complete.missingLoci||[]).join(", ")+")":lang;
  }).join(", "):"Sin traducción textual alojada");
  const cell=document.createElement("td"),a=document.createElement("a");
  a.href="bibliotheca-graeca-latina.html?work="+encodeURIComponent(w.id);
  a.textContent="Abrir ficha";cell.append(a);tr.append(cell);
  const tools=document.createElement("td");
  const bibliotheca=document.createElement("a");bibliotheca.href=a.href;bibliotheca.textContent="Bibliotheca";
  const vitruvia=document.createElement("a");vitruvia.href="vitruvia.html?q="+encodeURIComponent(w.author+" "+w.title)+"&mode=all";vitruvia.textContent="Vitruvia";
  const lexicon=document.createElement("a");lexicon.href="vitruvia-lexicon.html";lexicon.textContent="Lexicon";
  tools.append(bibliotheca,document.createTextNode(" · "),vitruvia,document.createTextNode(" · "),lexicon);
  tr.append(tools);
  const candidateCell=document.createElement("td");
  const related=candidateSources.filter(x=>x.workId===w.id);
  for(const candidate of related){
   const a=document.createElement("a");a.href=candidate.url;a.target="_blank";a.rel="noopener noreferrer";
   a.textContent=({en:"Inglés",fr:"Francés",es:"Castellano"})[candidate.language]||candidate.language;
   a.title=candidate.notes||"Edición externa por comprobar";
   candidateCell.append(a,document.createTextNode(" · "+(candidate.status==="missing_loci_35_57"?"Faltan capítulos":"Fuente para incorporar")+" · "));
  }
  if(!related.length)candidateCell.textContent="Fuente pendiente de identificar";
  tr.append(candidateCell);tbody.append(tr);
 }
}
Promise.all([
 fetch("data/classics-corpus/translation-availability-222.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}),
 fetch("data/classics-corpus/translation-source-candidates.json").then(r=>r.ok?r.json():{entries:[]}).catch(()=>({entries:[]}))
]).then(([data,sources])=>{
 candidateSources=Array.isArray(sources.entries)?sources.entries:[];
 if(data.schema!=="vitruvius-classics-translation-availability-v1"||!Array.isArray(data.works))throw Error("Formato del inventario inválido");
 works=data.works;metrics.replaceChildren();
 const t=data.totals;
 metrics.append(metric(t.cataloguedWorks,"Obras catalogadas"),metric(t.originalTextIndexed,"Originales indexados"),metric(t.translatedWorksLocal,"Obras con traducción alojada"),metric(t.localTranslationLanguages.en,"Inglés"),metric(t.localTranslationLanguages.fr,"Francés"),metric(t.localTranslationLanguages.es,"Castellano"));
 update();
}).catch(e=>{counter.textContent="Inventario no disponible: "+e.message;metrics.textContent="No hay recuento verificable."});
["q","state","lang","missing-lang"].forEach(id=>$(id)?.addEventListener("input",update));
})();