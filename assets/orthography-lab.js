/* Orthographic research laboratory. Unicode normalization is NOT
   morphological lemmatization, historical transliteration or proof of identity. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const source=$("orth-source"),button=$("orth-run");
if(!source||!button)return;
const markRe=/\p{M}/gu;
const sigmas={"ς":"σ","ϲ":"σ","Ϲ":"σ","Σ":"σ"};
const fold=s=>String(s||"").normalize("NFD").replace(markRe,"").toLocaleLowerCase().replace(/[ςϲϹ]/g,c=>sigmas[c]||c);
const escape=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function scriptOf(s){
 if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(s))return "Griego";
 if(/[\u0590-\u05ff]/u.test(s))return "Hebreo / escritura aramea cuadrada";
 if(/[a-záéíóúà-ÿ]/iu.test(s))return "Alfabeto latino";
 return "Escritura no determinada";
}
function show(){
 const input=source.value.trim().slice(0,300);
 const output=$("orth-results"),note=$("orth-note");output.replaceChildren();
 if(!input){note.textContent="Introduzca una palabra o frase para comparar sus grafías.";return}
 const variants=[
  ["Forma introducida",input,"La grafía se conserva sin cambios."],
  ["Unicode NFC",input.normalize("NFC"),"Composición canónica; no modifica la edición filológica."],
  ["Unicode NFD",input.normalize("NFD"),"Descomposición canónica; útil para inspeccionar diacríticos."],
  ["Clave de búsqueda flexible",fold(input),"Suprime signos diacríticos y unifica algunas grafías sigma. Solo sirve para localizar candidatos."],
 ];
 if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(input)){
  variants.push(["Sigma normalizada",input.replace(/[ςϲϹ]/g,c=>sigmas[c]||c),"Unifica sigma final y sigma lunada para recuperación. No reescribe el testimonio."]);
  variants.push(["Sin acentos ni espíritus",input.normalize("NFD").replace(markRe,""),"Se pierden distinciones ortográficas; consulte siempre el original."]);
 }
 if(/[\u0590-\u05ff]/u.test(input))variants.push(["Sin signos masoréticos",input.normalize("NFD").replace(markRe,""),"Capa para recuperación gráfica, no transcripción paleográfica ni interpretación del idioma."]);
 if(/[a-z]/i.test(input))variants.push(["Latinización de búsqueda u/v e i/j",fold(input).replace(/v/g,"u").replace(/j/g,"i"),"Equivalencia experimental de grafías editoriales; no implica la misma forma histórica."]);
 const table=document.createElement("table");table.className="orth-table";
 const tr=document.createElement("tr");for(const t of ["Representación","Resultado","Criterio"]){const h=document.createElement("th");h.textContent=t;tr.append(h)}table.append(tr);
 for(const [name,value,desc] of variants){
  const row=document.createElement("tr");
  for(const x of [name,value,desc]){const td=document.createElement("td");td.textContent=x;if(x===value){td.dir="auto";td.style.fontSize="1.12em"}row.append(td)}
  table.append(row);
 }
 output.append(table);
 const controls=document.createElement("div");controls.className="orth-actions";
 const options=[
  ["Buscar en Vitruvia","vitruvia.html?q="+encodeURIComponent(input)],
  ["Analizar en Lexicon","vitruvia-lexicon.html?q="+encodeURIComponent(input)+"&mode=palabra"],
  ["Buscar concordancias","index-locorum.html?q="+encodeURIComponent(input)]
 ];
 for(const [label,url] of options){const a=document.createElement("a");a.href=url;a.textContent=label;controls.append(a)}
 output.append(controls);
 note.textContent="Escritura detectada: "+scriptOf(input)+". Los resultados son transformaciones de Unicode y claves de consulta, no análisis morfológico ni resultados de OCR.";
}
button.addEventListener("click",show);
source.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();show()}});
for(const b of document.querySelectorAll("[data-example]"))b.addEventListener("click",()=>{source.value=b.dataset.example;show()});
const initial=new URLSearchParams(location.search).get("q");
if(initial){source.value=initial;show()}
})();