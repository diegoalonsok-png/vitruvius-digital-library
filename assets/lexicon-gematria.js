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
Object.assign(greek,{"ϲ":200,"ς":200,"ϛ":6,"Ϛ":6,"ϝ":6,"Ϝ":6,"ϟ":90,"Ϟ":90,"ϙ":90,"Ϙ":90,"ϡ":900,"Ϡ":900});
const presets={
 "neron caesar":"נרון קסר","neron kaisar":"נרון קסר","neron qesar":"נרון קסר",
 "nero caesar":"נרו קסר","nero kaisar":"נרו קסר","nero qesar":"נרו קסר",
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
 if((selected==="auto"||selected==="he")&&detect(original)==="la"&&Object.hasOwn(presets,fold(original))){
   script="he";value=presets[fold(original)];translit=true;
 }
 const cleaned=script==="gr"?value.normalize("NFD").replace(/[\u0300-\u036f\u1fbd-\u1ffe]/g,"").toLowerCase():script==="la"?value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase():value.normalize("NFD").replace(/[\u0591-\u05c7]/g,"");
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
 if(!calc){result.textContent="Escribe o pega una expresión para calcular su valor.";return}
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
 if(calc.ignored.length){const warn=document.createElement("p");warn.className="lx-gem-alert";warn.textContent="Caracteres sin valor en este sistema: "+[...new Set(calc.ignored)].join(" ") +". El total es parcial: revisa la escritura o el sistema. No se convierte la grafía automáticamente.";result.append(warn)}
 if(calc.script==="la"){const p=document.createElement("p");p.className="lx-gem-alert";p.textContent="En latín se suman únicamente I, V, X, L, C, D y M (sin reglas sustractivas de escritura numeral). No existe una gematría latina única equiparable a la hebrea.";result.append(p)}
 if(calc.script==="gr"||calc.script==="he"){const p=document.createElement("p");p.className="lx-gem-explain";p.textContent=calc.script==="he"?"Los signos vocálicos y de cantilación se excluyen del cálculo; las cinco letras finales usan su valor ordinario (no mispar gadol).":"Los acentos y espíritus griegos no suman; sigma final ς equivale a σ. Se admiten signos numéricos históricos ϛ, ϟ y ϡ.";result.append(p)}
 if(calc.total===666||calc.total===616){const p=document.createElement("p");p.className="lx-gem-explain";p.textContent="La coincidencia aritmética no demuestra por sí sola una identificación histórica ni una interpretación de Apocalipsis 13:18.";result.append(p)}
}

// Reference examples are opt-in, never displayed as an unsolicited catalogue.
// "attested" means the numerical association is transmitted by a historical source;
// "computed" indicates a modern arithmetic calculation, not a historical claim.
const examples=[
 ["gr","Νεῖλος",365,"Nilo · valor calculado; vínculo solar no probado","computed","https://www.isopsephy.com/365-2/"],
 ["gr","Ἀβρασάξ",365,"Abrasax · Ireneo, Adversus haereses I.24.7","attested","https://www.newadvent.org/fathers/0103124.htm"],
 ["gr","Μείθρας",365,"Mithras · asociación numérica transmitida en la tradición antigua","attested","https://www.cambridge.org/core/services/aop-cambridge-core/content/view/0BCF68076A22C4DCD5AE71C9277D9D7E/S001781602510076Xa.pdf"],
 ["gr","Ἰησοῦς",888,"Jesús · Oráculos sibilinos I, 324–331","attested","https://lexarithmos.app/en/history/ancient-isopsephy/"],
 ["gr","Λατεῖνος",666,"Lateinos · Ireneo, Adversus haereses V.30","attested","https://www.newadvent.org/fathers/0103530.htm"],
 ["gr","Τειτάν",666,"Teitan · Ireneo, Adversus haereses V.30","attested","https://www.newadvent.org/fathers/0103530.htm"],
 ["gr","Ἶσις",420,"Isis · P.Oxy. XLV 3239","attested","https://lexarithmos.app/en/history/ancient-isopsephy/"],
 ["gr","ἡ μεγάλη ἐλπίς",420,"La gran esperanza · P.Oxy. XLV 3239","attested","https://lexarithmos.app/en/history/ancient-isopsephy/"],
 ["gr","δίκη",42,"Justicia · Artemidoro, Oneirocritica III.28","attested","https://lexarithmos.app/en/history/ancient-isopsephy/"],
 ["gr","γαλῆ",42,"Comadreja · Artemidoro, Oneirocritica III.28","attested","https://lexarithmos.app/en/history/ancient-isopsephy/"],
 ["gr","λόγος",373,"Logos · valor léxico calculado, sin equivalencia histórica afirmada","computed","https://lexarithmos.app/en/history/ancient-isopsephy/"],
 ["gr","σοφία",781,"Sabiduría · valor léxico calculado","computed","https://lexarithmos.app/en/history/ancient-isopsephy/"],
 ["gr","χξϛ",666,"Numeración griega 666","attested","https://www.newadvent.org/fathers/0103530.htm"],
 ["gr","χιϛ",616,"Numeración griega 616","computed","https://lexarithmos.app/en/history/ancient-isopsephy/"],
 ["he","נרון קסר",666,"Nerón César · transcripción hebrea propuesta (Ap 13:18)","interpretation","https://www.tyndalebulletin.org/article/29233-p115-and-the-number-of-the-beast"],
 ["he","נרו קסר",616,"Nero César · variante de transcripción propuesta","interpretation","https://www.tyndalebulletin.org/article/29233-p115-and-the-number-of-the-beast"],
 ["he","יין",70,"Vino · Talmud, Eruvin 65a","attested","https://www.sefaria.org/Eruvin.65a"],
 ["he","סוד",70,"Secreto · Talmud, Eruvin 65a","attested","https://www.sefaria.org/Eruvin.65a"],
 ["he","אליעזר",318,"Eliezer · Talmud, Nedarim 32a","attested","https://www.sefaria.org/Nedarim.32a"],
 ["he","תורה",611,"Torá · Talmud, Makkot 23b","attested","https://www.sefaria.org/Makkot.23b"],
 ["he","דוד",14,"David · valor ordinario","computed","https://www.sefaria.org/Genesis.1"],
 ["he","חי",18,"Vida · valor ordinario","computed","https://www.sefaria.org/Genesis.1"],
 ["he","שלום",376,"Paz · valor ordinario","computed","https://www.sefaria.org/Genesis.1"]
];
function initExamples(){
 const details=$("lx-gem-catalog");
 const list=$("lx-gem-catalog-list");
 if(!details||!list)return;
 const count=$("lx-gem-catalog-count");
 const filtered=examples.filter(([script,word,total])=>compute(word,script)?.total===total);
 if(count)count.textContent=String(filtered.length);
 for(const [script,word,total,note,status,source] of filtered){
  const button=document.createElement("button");button.type="button";button.className="lx-gem-catalog-item";
  button.setAttribute("aria-label",word+" = "+total+"; "+note);
  const expression=document.createElement("strong");expression.textContent=word;expression.lang=script==="he"?"he":"el";
  const value=document.createElement("span");value.textContent=String(total);
  const sub=document.createElement("small");sub.textContent=note;
  button.append(expression,value,sub);
  button.addEventListener("click",()=>{
   $("lx-gem-input").value=word;$("lx-gem-script").value=script;render();
   const hint=$("lx-gem-catalog-source");if(hint){
    hint.replaceChildren();
    const name=document.createElement("span");
    name.textContent=status==="attested"?"Asociación transmitida en fuente histórica: ":status==="interpretation"?"Hipótesis de lectura: ":"Valor calculado (sin afirmación de simbolismo antiguo): ";
    const link=document.createElement("a");link.href=source;link.target="_blank";link.rel="noopener noreferrer";link.textContent=note;
    hint.append(name,link);
   }
   $("lx-gem-result").scrollIntoView?.({behavior:"smooth",block:"nearest"});
  });
  list.append(button);
 }
}

$("lx-gem-form").addEventListener("submit",e=>{e.preventDefault();render()});
for(const button of root.querySelectorAll("[data-gem-example]")){
 button.addEventListener("click",()=>{$("lx-gem-input").value=button.dataset.gemExample;$("lx-gem-script").value="auto";render()});
}
$("lx-gem-script").addEventListener("change",render);
$("lx-gem-input").addEventListener("input",render);
initExamples();
render();
window.VitruviaGematria={compute,examples};
})();
