(()=>{
"use strict";
const $=id=>document.getElementById(id),tbody=$("rows"),counter=$("count"),metrics=$("metrics");
const fold=x=>String(x||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
let works=[];
function metric(value,label){
 const div=document.createElement("div"),n=document.createElement("strong"),p=document.createElement("span");
 div.className="metric";n.textContent=String(value);p.textContent=label;div.append(n,p);return div;
}
function update(){
 const q=fold($("q").value.trim()),state=$("state").value,lang=$("lang").value;
 const filtered=works.filter(w=>{
  if(q&&!fold(w.author+" "+w.title+" "+w.id).includes(q))return false;
  if(lang!=="all"&&!w.translationLanguages.includes(lang))return false;
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
  td(w.translationLanguages.length?w.translationLanguages.map(x=>({es:"Castellano",en:"Inglés",fr:"Francés"}[x])).join(", "):"Sin traducción textual alojada");
  const cell=document.createElement("td"),a=document.createElement("a");
  a.href="bibliotheca-graeca-latina.html?work="+encodeURIComponent(w.id);
  a.textContent="Abrir ficha";cell.append(a);tr.append(cell);tbody.append(tr);
 }
}
fetch("data/classics-corpus/translation-availability-222.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{
 if(data.schema!=="vitruvius-classics-translation-availability-v1"||!Array.isArray(data.works))throw Error("Formato del inventario inválido");
 works=data.works;metrics.replaceChildren();
 const t=data.totals;
 metrics.append(metric(t.cataloguedWorks,"Obras catalogadas"),metric(t.originalTextIndexed,"Originales indexados"),metric(t.translatedWorksLocal,"Obras con traducción alojada"),metric(t.localTranslationLanguages.en,"Inglés"),metric(t.localTranslationLanguages.fr,"Francés"),metric(t.localTranslationLanguages.es,"Castellano"));
 update();
}).catch(e=>{counter.textContent="Inventario no disponible: "+e.message;metrics.textContent="No hay recuento verificable."});
["q","state","lang"].forEach(id=>$(id).addEventListener("input",update));
})();