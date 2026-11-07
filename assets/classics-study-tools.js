/* Lexicon-style independent study tools. No changes to edition source files.
   User highlights/underlines are personal browser annotations by work/language/locus. */
(function(){
"use strict";
const $=(name,tag="button")=>{const el=document.createElement(tag);if(tag==="button")el.type="button";el.textContent=name;return el};
const fonts={
  classic:'"Gentium Book Plus","Cardo",Georgia,serif',
  serif:'Georgia,"Times New Roman",serif',
  sans:'system-ui,sans-serif',
  mono:'ui-monospace,monospace'
};
const safeColor=v=>typeof v==="string"&&/^#[0-9a-f]{6}$/i.test(v);
function safeRead(key,fallback){
 try{const value=JSON.parse(localStorage.getItem(key)||"null");return value&&typeof value==="object"?value:fallback;}catch{return fallback;}
}
function safeSave(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
function attach({work,side,root,column,getLocus,getLanguage,getSourceText}){
 if(!root||!column||typeof getLocus!=="function")return {render(){}};
 const prefKey="vitruvia.study.appearance.v1."+work+"."+side;
 const defaults={background:"#f9f6ec",foreground:"#202b33",font:"classic",size:20,mark:"#ffe27a"};
 const candidate=safeRead(prefKey,{});
 const pref={...defaults};
 for(const field of ["background","foreground","mark"])if(safeColor(candidate[field]))pref[field]=candidate[field];
 if(Object.hasOwn(fonts,candidate.font))pref.font=candidate.font;
 if(Number.isInteger(candidate.size)&&candidate.size>=14&&candidate.size<=38)pref.size=candidate.size;
 const annotationsKey="vitruvia.study.annotations.v1."+work;
 const annotations=safeRead(annotationsKey,{});
 const own=(language,locus)=>language+":"+locus;
 let selected=null;
 const bar=$("","div");bar.className="classic-study-tools";
 const makeColor=(label,value)=>{const wrap=$("", "label");wrap.className="classic-study-color";wrap.textContent=label;const control=document.createElement("input");control.type="color";control.value=value;control.setAttribute("aria-label",label+" visor "+(side+1));wrap.append(control);bar.append(wrap);return control};
 const background=makeColor("Fondo",pref.background);
 const foreground=makeColor("Letra",pref.foreground);
 const markColor=makeColor("Resaltado",pref.mark);
 const font=$("","select");font.setAttribute("aria-label","Tipografía visor "+(side+1));
 for(const [value,label] of [["classic","Gentium / Cardo"],["serif","Georgia"],["sans","Sans"],["mono","Mono"]]){
  const option=document.createElement("option");option.value=value;option.textContent=label;font.append(option);
 }
 font.value=pref.font;bar.append(font);
 const smaller=$("A−"),size=$("","output"),larger=$("A+");
 smaller.title="Reducir tamaño de letra";larger.title="Aumentar tamaño de letra";
 size.className="classic-study-size";bar.append(smaller,size,larger);
 const highlight=$("▧ Resaltar"),underline=$("U̲ Subrayar"),remove=$("Borrar marcas"),reset=$("Restablecer estilo");
 highlight.title="Seleccioná un fragmento del texto y presioná Resaltar";
 underline.title="Seleccioná un fragmento del texto y presioná Subrayar";
 remove.title="Quitar las marcas del pasaje actual";
 reset.title="Restablecer colores, tipografía y tamaño de este visor";
 bar.append(highlight,underline,remove,reset);
 const help=$("Seleccioná palabras del texto; las marcas se guardan en este navegador.","small");
 help.className="classic-study-tools-help";
 column.insertBefore(bar,root);column.insertBefore(help,root);
 function appearance(){
  root.style.setProperty("background",pref.background,"important");
  root.style.setProperty("color",pref.foreground,"important");
  root.style.setProperty("font-family",fonts[pref.font],"important");
  root.style.setProperty("font-size",pref.size+"px","important");
  size.textContent=pref.size+" px";
  safeSave(prefKey,pref);
 }
 for(const [el,key] of [[background,"background"],[foreground,"foreground"],[markColor,"mark"]]){
  el.addEventListener("input",()=>{if(safeColor(el.value)){pref[key]=el.value;appearance()}});
 }
 font.addEventListener("change",()=>{if(Object.hasOwn(fonts,font.value)){pref.font=font.value;appearance()}});
 smaller.addEventListener("click",()=>{pref.size=Math.max(14,pref.size-2);appearance()});
 larger.addEventListener("click",()=>{pref.size=Math.min(38,pref.size+2);appearance()});
 reset.addEventListener("click",()=>{
  Object.assign(pref,defaults);
  background.value=pref.background;foreground.value=pref.foreground;markColor.value=pref.mark;font.value=pref.font;
  appearance();help.textContent="Estilo original restablecido en este visor.";
 });
 function selectionOffsets(){
  const sel=window.getSelection();
  if(!sel||sel.rangeCount===0||sel.isCollapsed)return null;
  const range=sel.getRangeAt(0);
  if(!root.contains(range.startContainer)||!root.contains(range.endContainer))return null;
  const first=range.cloneRange();first.selectNodeContents(root);first.setEnd(range.startContainer,range.startOffset);
  const start=first.toString().length,end=start+range.toString().length;
  const source=String(getSourceText()||"");
  if(start>=0&&end>start&&end<=source.length&&source.slice(start,end)===range.toString())return {start,end,quote:source.slice(start,end),locus:getLocus(),language:getLanguage()};
  return null;
 }
 const capture=()=>{const candidate=selectionOffsets();if(candidate)selected=candidate};
 root.addEventListener("mouseup",capture);
 root.addEventListener("keyup",capture);
 // The browser can collapse a selection on toolbar click; capture before focus changes.
 bar.addEventListener("pointerdown",capture,{capture:true});
 function records(){
  const k=own(getLanguage(),getLocus());
  const list=annotations[k];
  return Array.isArray(list)?list.filter(a=>Number.isInteger(a.start)&&Number.isInteger(a.end)&&a.end>a.start&&a.start>=0&&a.end<200000):[];
 }
 function render(){
  const source=String(getSourceText()||"");
  root.replaceChildren();
  const valid=records().filter(a=>a.end<=source.length&&source.slice(a.start,a.end)===a.quote);
  if(!valid.length){root.textContent=source;appearance();selected=null;return}
  const boundaries=new Set([0,source.length]);
  valid.forEach(a=>{boundaries.add(a.start);boundaries.add(a.end)});
  const cuts=[...boundaries].sort((a,b)=>a-b);
  const fragment=document.createDocumentFragment();
  for(let i=0;i<cuts.length-1;i++){
   const start=cuts[i],end=cuts[i+1];if(end<=start)continue;
   const segment=source.slice(start,end);
   const covering=valid.filter(a=>a.start<=start&&a.end>=end);
   if(!covering.length){fragment.append(document.createTextNode(segment));continue}
   const span=document.createElement("span");span.textContent=segment;
   const marker=[...covering].reverse().find(a=>a.kind==="highlight"&&safeColor(a.color));
   if(marker)span.style.backgroundColor=marker.color;
   if(covering.some(a=>a.kind==="underline")){span.style.textDecoration="underline";span.style.textUnderlineOffset="3px"}
   span.className="classic-study-annotation";fragment.append(span);
  }
  root.append(fragment);appearance();selected=null;
 }
 function annotate(kind){
  const pick=selectionOffsets()||selected;
  if(!pick||pick.language!==getLanguage()||pick.locus!==getLocus()){
   help.textContent="Seleccioná primero una palabra o frase en el texto de este visor.";return;
  }
  const key=own(pick.language,pick.locus);
  const list=Array.isArray(annotations[key])?annotations[key]:[];
  if(list.length>=200){help.textContent="Límite de marcas de este pasaje alcanzado.";return}
  const item={start:pick.start,end:pick.end,quote:pick.quote,kind};
  if(kind==="highlight")item.color=pref.mark;
  // Remove an identical previous mark so a repeated command toggles its state.
  const index=list.findIndex(a=>a.start===item.start&&a.end===item.end&&a.kind===kind);
  if(index>=0)list.splice(index,1);else list.push(item);
  annotations[key]=list;
  const saved=safeSave(annotationsKey,annotations);
  render();window.getSelection()?.removeAllRanges();
  help.textContent=saved?"Marcas actualizadas para "+getLanguage()+" · "+getLocus()+".":"Marcas visibles; el navegador impidió guardarlas.";
 }
 highlight.addEventListener("click",()=>annotate("highlight"));
 underline.addEventListener("click",()=>annotate("underline"));
 remove.addEventListener("click",()=>{
  const key=own(getLanguage(),getLocus());
  if(!records().length){help.textContent="Este pasaje no tiene marcas.";return}
  delete annotations[key];const saved=safeSave(annotationsKey,annotations);
  render();help.textContent=saved?"Marcas del pasaje borradas.":"Marcas borradas de esta vista, sin guardar.";
 });
 appearance();
 return {render};
}
window.ClassicsStudyTools={attach};
})();