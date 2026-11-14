/* Browser-local, non-destructive multicolour annotations for machine translations.
   The original text's analogous system lives in classics-reader-annotations.js.
   Annotations are per work, locus, target language and actual generated text. */
(()=>{"use strict";
const column=document.querySelector(".cl-translation-column");
const output=column?.querySelector(".cl-translation-output");
const controls=column?.querySelector(".cl-translation-tools");
if(!column||!output||!controls)return;
const work=new URLSearchParams(location.search).get("work")||"unknown";
const palette={amarillo:"#ffe56b",verde:"#91d6aa",azul:"#97c4f6",rosa:"#f2a8ce"};
const support=!!(window.CSS&&CSS.highlights&&window.Highlight);
const make=(tag,cl,txt)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=txt;return n};
const bar=make("div","cl-translation-annotations");
bar.setAttribute("role","group");bar.setAttribute("aria-label","Subrayados, resaltados y colores de la traducción");
bar.append(make("strong",null,"Marcas"));
const underline=make("button",null,"Subrayar"),highlight=make("button",null,"Resaltar");
underline.type=highlight.type="button";
underline.setAttribute("aria-pressed","true");highlight.setAttribute("aria-pressed","false");
bar.append(underline,highlight);
const colors=make("span","cl-annotation-palette");bar.append(colors);
const erase=make("button",null,"Borrar selección"),clear=make("button",null,"Limpiar pasaje");
erase.type=clear.type="button";bar.append(erase,clear);
const appearance=make("span","cl-annotation-appearance");bar.append(appearance);
const feedback=make("output","cl-annotations-feedback","Selecciona palabras de la traducción para marcarlas.");
feedback.setAttribute("aria-live","polite");bar.append(feedback);
controls.insertAdjacentElement("afterend",bar);
const css=make("style");
css.textContent=Object.entries(palette).flatMap(([name,hex])=>[
 '::highlight(vdl-auto-h-'+name+'){background-color:'+hex+';color:#171717}',
 '::highlight(vdl-auto-u-'+name+'){text-decoration:underline;text-decoration-color:'+hex+';text-decoration-thickness:3px;text-underline-offset:3px}'
]).join("\n");
document.head.append(css);
let currentMode="underline",currentColor="amarillo";
function selectMode(next){
 currentMode=next;
 underline.setAttribute("aria-pressed",String(next==="underline"));
 highlight.setAttribute("aria-pressed",String(next==="highlight"));
}
underline.addEventListener("click",()=>selectMode("underline"));
highlight.addEventListener("click",()=>selectMode("highlight"));
for(const [name,hex] of Object.entries(palette)){
 const b=make("button","cl-annotation-dot");
 b.type="button";b.dataset.color=name;
 b.title="Marcar en "+name;b.setAttribute("aria-label","Marcar en "+name);
 b.setAttribute("aria-pressed",String(name===currentColor));
 b.style.setProperty("--cl-dot",hex);
 colors.append(b);
 b.addEventListener("click",()=>{
  currentColor=name;
  colors.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));
  applySelection();
 });
}
const appearanceKey="vdl.classics.translation.appearance.v1."+work;
let fg="#ece9e4",bg="#151516";
try{const saved=JSON.parse(localStorage.getItem(appearanceKey)||"null");
 if(/^#[0-9a-f]{6}$/i.test(saved?.bg))bg=saved.bg;
 if(/^#[0-9a-f]{6}$/i.test(saved?.fg))fg=saved.fg;
}catch{}
function paint(){
 column.style.setProperty("--cl-translation-bg",bg);
 column.style.setProperty("--cl-translation-fg",fg);
 try{localStorage.setItem(appearanceKey,JSON.stringify({bg,fg}))}catch{}
}
paint();
for(const [kind,label] of [["bg","Fondo"],["fg","Texto"]]){
 const wrapper=make("label",null,label+" ");
 const input=make("input");input.type="color";input.value=kind==="bg"?bg:fg;
 input.setAttribute("aria-label","Color de "+(kind==="bg"?"fondo":"texto")+" de traducción");
 input.addEventListener("input",()=>{if(kind==="bg")bg=input.value;else fg=input.value;paint()});
 wrapper.append(input);appearance.append(wrapper);
}
const body=()=>output.querySelector(":scope > p:not(.cl-caution)");
function checksum(text){
 let hash=2166136261;
 for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619)}
 return(hash>>>0).toString(36);
}
function key(){
 const text=body()?.textContent||"";
 const locus=new URLSearchParams(location.search).get("locus")||"none";
 const source=document.getElementById("passages")?.getAttribute("lang")||"";
 const target=controls.querySelector("select")?.value||"es";
 return ["vdl","marks","auto","v1",work,source,locus,target,checksum(text)].join(".");
}
function read(){
 try{
  const saved=JSON.parse(localStorage.getItem(key())||"[]");
  return Array.isArray(saved)?saved.filter(x=>Number.isInteger(x.a)&&Number.isInteger(x.b)&&x.a>=0&&x.b>x.a&&palette[x.color]&&["underline","highlight"].includes(x.mode)).slice(-180):[];
 }catch{return[]}
}
function save(rows){
 try{localStorage.setItem(key(),JSON.stringify(rows.slice(-180)));return true}
 catch{feedback.textContent="No se pudieron guardar las marcas en este navegador.";return false}
}
function selection(){
 const host=body(),s=window.getSelection();
 if(!host||!s||s.isCollapsed||!s.rangeCount)return null;
 const r=s.getRangeAt(0);
 if(!host.contains(r.startContainer)||!host.contains(r.endContainer))return null;
 const before=document.createRange();before.selectNodeContents(host);
 before.setEnd(r.startContainer,r.startOffset);
 const a=before.toString().length,b=a+r.toString().length;
 return b>a?{a,b}:null;
}
function range(host,a,b){
 const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);let n,pos=0,first=null,last=null;
 while((n=walker.nextNode())){
  const end=pos+n.textContent.length;
  if(!first&&a>=pos&&a<end)first=[n,a-pos];
  if(!last&&b>pos&&b<=end)last=[n,b-pos];
  pos=end;
 }
 if(!first||!last)return null;
 const r=document.createRange();r.setStart(first[0],first[1]);r.setEnd(last[0],last[1]);return r;
}
function redraw(){
 if(!support)return;
 for(const color of Object.keys(palette))for(const type of ["h","u"])CSS.highlights.delete("vdl-auto-"+type+"-"+color);
 const host=body();if(!host)return;
 const rows=read();
 for(const color of Object.keys(palette))for(const type of ["h","u"]){
  const selected=rows.filter(x=>x.color===color&&(x.mode==="highlight"?"h":"u")===type)
   .map(x=>range(host,x.a,x.b)).filter(Boolean);
  if(selected.length)CSS.highlights.set("vdl-auto-"+type+"-"+color,new Highlight(...selected));
 }
}
function applySelection(){
 if(!support){feedback.textContent="Los resaltados requieren un navegador con CSS Highlights.";return}
 const chosen=selection();
 if(!chosen){feedback.textContent="Selecciona primero una frase dentro de la traducción.";return}
 const marks=read();
 if(!marks.some(x=>x.a===chosen.a&&x.b===chosen.b&&x.mode===currentMode&&x.color===currentColor)){
  if(save([...marks,{...chosen,mode:currentMode,color:currentColor}])){
   redraw();feedback.textContent="Marca guardada en este navegador.";
  }
 }
}
erase.addEventListener("click",()=>{
 const chosen=selection();if(!chosen){feedback.textContent="Selecciona el texto marcado que querés borrar.";return}
 if(save(read().filter(x=>x.b<=chosen.a||x.a>=chosen.b))){
  redraw();feedback.textContent="Marcas seleccionadas eliminadas.";
 }
});
clear.addEventListener("click",()=>{
 if(save([])){redraw();feedback.textContent="Marcas de esta traducción borradas."}
});
bar.addEventListener("mousedown",event=>{if(event.target.closest("button"))event.preventDefault()});
let scheduled=false;
new MutationObserver(()=>{
 if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;redraw()})}
}).observe(output,{childList:true,subtree:true,characterData:true});
if(!support)feedback.textContent="La selección de colores está disponible; los resaltados requieren CSS Highlights.";
redraw();
})();