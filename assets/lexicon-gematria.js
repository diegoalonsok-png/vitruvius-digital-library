/* Lexicon · calculadora epigráfica y filológica de valores de letras.
   No usa transliteración arbitraria ni interpreta resultados como pruebas históricas.
   El caso Nerón César corresponde a la forma HEBREA de las transcripciones,
   no al valor romano o isopséfico de las mismas palabras en caracteres latinos/griegos.
*/
(()=>{"use strict";
const root=document.getElementById("lx-gematria");if(!root)return;
const $=id=>document.getElementById(id);
const H="אבגדהוזחטיכלמנסעפצקרשת";
const HV=[1,2,3,4,5,6,7,8,9,10,20,30,40,50,60,70,80,90,100,200,300,400];
const G="αβγδεζηθικλμνξοπρστυφχψω";
const GV=[1,2,3,4,5,7,8,9,10,20,30,40,50,60,70,80,100,200,300,400,500,600,700,800];
const LM={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
const hebrew=Object.fromEntries([...H].map((ch,i)=>[ch,HV[i]]));
Object.assign(hebrew,{ך:20,ם:40,ן:50,ף:80,ץ:90});
const greek=Object.fromEntries([...G].map((ch,i)=>[ch,GV[i]]));
Object.assign(greek,{"ς":200,"ϛ":6,"Ϛ":6,"ϝ":6,"Ϝ":6,"ϟ":90,"Ϟ":90,"ϙ":90,"Ϙ":90,"ϡ":900,"Ϡ":900});
const presets={
 "neron caesar":"נרון קסר","neron kaisar":"נרון קסר","neron qesar":"נרון קסר",
 "nero caesar":"נרו קסר","nero kaisar":"נרו קסר","nero qesar":"נרו קסר",
 "nerus caesar":"נרו קסר","nerus kaisar":"נרו קסר"
};
function fold(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z]+/g," ").trim()}
function detect(s){if(/[\u0590-\u05ff]/u.test(s))return "he";if(/[\u0370-\u03ff\u1f00-\u1fff]/u.test(s))return "gr";return "la"}
function compute(raw,selected){
 const original=raw.trim();if(!original)return null;
 let script=selected==="auto"?detect(original):selected;
 let value=original,translit=false;
 // These forms are discrete, historically discussed transliterations.
 // Other Latin-to-Hebrew transformations require the user to enter a Hebrew spelling.
 if(script==="auto")script=detect(original);
 if(selected==="auto"&&script==="la"&&Object.hasOwn(presets,fold(original))){
   script="he";value=presets[fold(original)];translit=true;
 }
 const cleaned=script==="gr"?value.normalize("NFD").replace(/[\u0300-\u036f\u1fbd-\u1ffe]/g,"").toLowerCase():script==="la"?value.toUpperCase():value.normalize("NFC");
 const map=script==="he"?hebrew:script==="gr"?greek:LM;
 const parts=[],ignored=[];
 for(const ch of cleaned){
  if(Object.hasOwn(map,ch))parts.push({ch,n:map[ch]});
  else if(!/\s|[.,;:()\[\]'"\-–—ʹ׳״]/u.test(ch))ignored.push(ch);
 }
 return {script,value,original,translit,parts,ignored,total:parts.reduce((s,p)=>s+p.n,0)};
}
function render(){
 const result=$("lx-gem-result"),input=$("lx-gem-input").value,selected=$("lx-gem-script").value;
 const calc=compute(input,selected);
 result.replaceChildren();
 if(!calc){result.textContent="Escribí o pegá una expresión para calcular su valor.";return}
 const headline=document.createElement("div");headline.className="lx-gem-result-head";
 const total=document.createElement("strong");total.className="lx-gem-total";total.textContent=calc.parts.length?String(calc.total):"—";
 const meta=document.createElement("div");meta.className="lx-gem-meta";
 const labels={he:"Hebreo · mispar hechrechi (valor ordinario)",gr:"Griego · isopsefía",la:"Latín · suma aditiva de letras numerales romanas"};
 meta.textContent=labels[calc.script];
 headline.append(total,meta);result.append(headline);
 if(calc.translit){const p=document.createElement("p");p.className="lx-gem-alert";p.append("Transcripción hebrea histórica propuesta: ");const b=document.createElement("b");b.dir="rtl";b.lang="he";b.textContent=calc.value;p.append(b,". El cálculo corresponde a las letras hebreas, no al texto latino ingresado.");result.append(p)}
 const sequence=document.createElement("div");sequence.className="lx-gem-formula";sequence.dir=calc.script==="he"?"rtl":"ltr";sequence.lang=calc.script==="he"?"he":calc.script==="gr"?"el":"la";
 const values=document.createElement("div");values.className="lx-gem-formula";
 for(const {ch,n} of calc.parts){let token=document.createElement("span");token.className="lx-gem-letter";let a=document.createElement("b");a.textContent=ch;let b=document.createElement("small");b.textContent=n;token.append(a,b);sequence.append(token)}
 values.textContent=calc.parts.map(x=>x.n).join(" + ")+" = "+calc.total;
 result.append(sequence,values);
 if(!calc.parts.length){const warn=document.createElement("p");warn.textContent="No se identificaron letras numéricas en el alfabeto seleccionado.";result.append(warn)}
 if(calc.ignored.length){const warn=document.createElement("p");warn.className="lx-gem-alert";warn.textContent="Caracteres sin valor en este sistema: "+[...new Set(calc.ignored)].join(" ") +". No se asignó valor ni se convirtió la grafía automáticamente.";result.append(warn)}
 if(calc.script==="la"){const p=document.createElement("p");p.className="lx-gem-alert";p.textContent="En latín se suman únicamente I, V, X, L, C, D y M (sin reglas sustractivas de escritura numeral). No existe una gematría latina única equiparable a la hebrea.";result.append(p)}
 if(calc.script==="gr"||calc.script==="he"){const p=document.createElement("p");p.className="lx-gem-explain";p.textContent=calc.script==="he"?"Las cinco letras hebreas finales usan aquí su valor ordinario (no la variante mispar gadol).":"Los acentos y espíritus griegos no suman; sigma final ς equivale a σ. Se admiten signos numéricos históricos ϛ, ϟ y ϡ.";result.append(p)}
 if(calc.total===666||calc.total===616){const p=document.createElement("p");p.className="lx-gem-explain";p.textContent="La coincidencia aritmética no demuestra por sí sola una identificación histórica ni una interpretación de Apocalipsis 13:18.";result.append(p)}
}
$("lx-gem-form").addEventListener("submit",e=>{e.preventDefault();render()});
for(const button of root.querySelectorAll("[data-gem-example]")){
 button.addEventListener("click",()=>{$("lx-gem-input").value=button.dataset.gemExample;$("lx-gem-script").value="auto";render()});
}
$("lx-gem-script").addEventListener("change",render);
$("lx-gem-input").addEventListener("input",render);
render();
window.VitruviaGematria={compute};
})();
