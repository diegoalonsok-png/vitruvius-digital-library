/* Parallel, per-locus reader of Diego Kurilo's already-indexed Latin, ES, FR and EN.
 * The Rose/Krohn PDF is a separate historic edition; these translations are NOT
 * falsely attributed to those historic editors. */
(()=>{"use strict";
const root=document.getElementById("coll-facsimile-readers");
if(!root)return;
const $=(s,p=document)=>p.querySelector(s);
const make=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!==undefined)e.textContent=txt;return e};
const editions=[
 {key:"recensio-es",lang:"es",label:"Castellano · Kurilo V514",field:"translation"},
 {key:"recensio-fr",lang:"fr",label:"Français · Kurilo V554",field:"translation"},
 {key:"theory-en",lang:"en",label:"English · Kurilo V297",field:"translation"},
 {key:"recensio-es",lang:"la",label:"Latine · base de Kurilo V514",field:"latin"}
];
const styles=make("style");styles.textContent=`
#coll-facsimile-readers .coll-facsimile-grid{grid-template-columns:1fr}
#coll-facsimile-readers .coll-facsimile-card{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
#coll-facsimile-readers .coll-facsimile-card>header{grid-column:1/-1}
#coll-facsimile-readers .coll-facsimile-card>.coll-facsimile-controls{grid-column:1}
#coll-facsimile-readers .coll-facsimile-card>.coll-facsimile-frame{grid-column:1;min-height:540px}
#coll-facsimile-readers .coll-facsimile-card>.coll-facsimile-ocr{grid-column:1}
.coll-parallel{grid-column:2;grid-row:2/span 3;min-width:0;display:flex;flex-direction:column;border-left:1px solid #434349;background:var(--parallel-bg,#202023);color:var(--parallel-fg,#f5f2ec)}
.coll-parallel-header{padding:12px 14px;border-bottom:1px solid #454549}
.coll-parallel-header h4{margin:0 0 7px;font:500 15px Georgia,serif}
.coll-parallel-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.coll-parallel-tools :is(button,select,input){font:12px Arial,sans-serif;min-height:32px;border:1px solid #65656b;border-radius:5px;background:#28282c;color:#f2f2f0;padding:4px 7px}
.coll-parallel-tools input[type=color]{width:37px;padding:2px}
.coll-parallel-tools input[type=search]{flex:1;min-width:120px}
.coll-parallel-tools button{cursor:pointer}
.coll-parallel-content{padding:16px;overflow:auto;max-height:770px;flex:1}
.coll-parallel-content p{font:var(--parallel-size,17px)/1.8 Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 12px}
.coll-parallel-content mark{background:#ffe55c!important;color:#1c1c14!important;padding:1px 2px;border-radius:2px}
.coll-parallel-content .coll-annotated{background:#f4db54;color:#222;border-radius:2px}
.coll-parallel-note{font:11px/1.6 Arial,sans-serif;color:#bdbdc3;padding:9px 14px;border-top:1px solid #454549}
@media(max-width:880px){
 #coll-facsimile-readers .coll-facsimile-card{display:flex;flex-direction:column}
 .coll-parallel{border-left:0;border-top:1px solid #434349;min-height:350px}
 #coll-facsimile-readers .coll-facsimile-card>.coll-facsimile-frame{min-height:400px;height:50vh}
 .coll-parallel-content{max-height:480px}
}`;document.head.append(styles);
const state=new Map();let current=new URLSearchParams(location.search).get("locus")||"1.1.1";
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/v/g,"u").replace(/j/g,"i").trim();
const key=(card,lang,locus)=>"vdl:collation:notes:"+card+":"+lang+":"+locus;
const index=new Map();
const loading=Promise.all([...new Set(editions.map(e=>e.key))].map(async name=>{
 try{const res=await fetch("data/structured/"+name+".json");if(!res.ok)throw Error("HTTP "+res.status);
 const data=await res.json();index.set(name,new Map((data.passages||[]).map(p=>[p.locus,p])))}
 catch(e){index.set(name,new Map());}
}));
function highlighted(element,text,query){
 element.replaceChildren();const phrase=norm(query);
 if(!phrase){element.textContent=text;return 0}
 const tokens=phrase.split(/\s+/).filter(Boolean);const regex=/[\p{L}\p{M}]+/gu;let end=0,n=0;
 for(const m of text.matchAll(regex)){
  element.append(document.createTextNode(text.slice(end,m.index)));
  if(tokens.includes(norm(m[0]))){element.append(make("mark",null,m[0]));n++}
  else element.append(document.createTextNode(m[0]));
  end=m.index+m[0].length
 }
 element.append(document.createTextNode(text.slice(end)));return n
}
function render(cardId){
 const x=state.get(cardId);if(!x)return;
 const selected=editions.find(e=>e.lang===x.lang),record=index.get(selected.key)?.get(current);
 const value=String(record?.[selected.field]||"").trim();
 x.content.replaceChildren();x.content.lang=x.lang;
 const title=make("p",null,value||"No hay un pasaje alineado y verificable para este locus en esta versión. Consulta el lector de la edición.");
 if(value){title.style.fontSize=x.size+"px";highlighted(title,value,x.query.value)}
 x.content.append(title);
 if(value&&x.underlines.has(key(cardId,x.lang,current))){
  for(const phrase of x.underlines.get(key(cardId,x.lang,current))){
   // Local annotations are stored as selections but only displayed as a list;
   // no fragile HTML insertion or fabricated source highlighting.
   x.content.append(make("p","coll-parallel-note","Subrayado personal: "+phrase))
  }
 }
 x.note.textContent=(record?"Pasaje indexado por locus "+current+". ":"Sin pasaje alineado para "+current+". ")+
 "Texto editorial de Diego Kurilo, no traducción de Rose ni Krohn. El PDF histórico no está sincronizado automáticamente con una página digital.";
}
function build(card,n){
 const id=n===0?"rose-1899":"krohn-1912";
 const panel=make("section","coll-parallel");panel.setAttribute("aria-label","Lector paralelo en cuatro lenguas de las ediciones Kurilo");
 const header=make("div","coll-parallel-header");header.append(make("h4",null,"Texto paralelo por locus · De architectura"));
 const controls=make("div","coll-parallel-tools"),lang=make("select"),minus=make("button",null,"A−"),plus=make("button",null,"A+");
 lang.setAttribute("aria-label","Idioma de lectura");
 for(const e of editions){const o=make("option",null,e.label);o.value=e.lang;lang.append(o)}
 const colors=make("input");colors.type="color";colors.value="#202023";colors.title="Color de fondo";
 const ink=make("input");ink.type="color";ink.value="#f5f2ec";ink.title="Color del texto";
 const query=make("input");query.type="search";query.placeholder="Buscar y resaltar palabras…";query.setAttribute("aria-label","Buscar palabras en el texto paralelo");
 const mark=make("button",null,"Subrayar selección");mark.type="button";
 const clear=make("button",null,"Quitar notas");clear.type="button";
 controls.append(lang,minus,plus,colors,ink,query,mark,clear);header.append(controls);panel.append(header);
 const content=make("div","coll-parallel-content");const note=make("div","coll-parallel-note");
 panel.append(content,note);card.append(panel);
 const x={lang:"es",size:17,query,content,note,underlines:new Map()};
 state.set(id,x);
 lang.addEventListener("change",()=>{x.lang=lang.value;render(id)});
 minus.addEventListener("click",()=>{x.size=Math.max(12,x.size-2);render(id)});
 plus.addEventListener("click",()=>{x.size=Math.min(30,x.size+2);render(id)});
 colors.addEventListener("input",()=>panel.style.setProperty("--parallel-bg",colors.value));
 ink.addEventListener("input",()=>panel.style.setProperty("--parallel-fg",ink.value));
 query.addEventListener("input",()=>render(id));
 mark.addEventListener("click",()=>{
  const selected=window.getSelection()?.toString().trim().slice(0,300);
  if(!selected||!content.contains(window.getSelection()?.anchorNode))return;
  const k=key(id,x.lang,current),saved=x.underlines.get(k)||[];
  if(!saved.includes(selected))saved.push(selected);
  x.underlines.set(k,saved);render(id)
 });
 clear.addEventListener("click",()=>{x.underlines.delete(key(id,x.lang,current));render(id)});
 render(id)
}
const cards=[...root.querySelectorAll(".coll-facsimile-card")];cards.forEach(build);
window.addEventListener("vitruvius:collation-locus",e=>{current=e.detail?.locus||current;for(const id of state.keys())render(id)});
loading.then(()=>{for(const id of state.keys())render(id)});
})();
