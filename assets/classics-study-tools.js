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
function attach({work,side,root,column,getLocus,getLanguage,getSourceText,getSearchTerms}){
 if(!root||!column||typeof getLocus!=="function")return {render(){}};
 const prefKey="vitruvia.study.appearance.v1."+work+"."+side;
 const defaults={background:"#000000",foreground:"#f3f3f3",font:"classic",size:20,mark:"#ffe27a"};
 const candidate=safeRead(prefKey,{});
 // Earlier versions saved their pale default automatically on every render.
 // Migrate that implicit default to black; retain explicitly customized colors.
 if(candidate.background==="#f9f6ec"&&candidate.foreground==="#202b33"){
  candidate.background=defaults.background;candidate.foreground=defaults.foreground;
 }
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
 const magnify=$("⌕ Lupa");
 magnify.type="button";magnify.setAttribute("aria-pressed","false");
 magnify.title="Lupa de pasajes como en Vitruvia Lexicon; activa y pasá el puntero por el texto";
 bar.append(magnify);
 const lens=document.createElement("div");lens.className="classic-study-magnifying-lens";
 lens.setAttribute("aria-hidden","true");
 lens.hidden=true;document.body.append(lens);
 let magnifierOn=false;
 const hideLens=()=>{lens.hidden=true};
 function showLens(event){
  if(!magnifierOn||!root.isConnected||!root.textContent){hideLens();return}
  // Prefer the browser caret hit test to show text near the pointer, without
  // changing or reflowing the source or the stored passage annotation offsets.
  const hit=document.caretPositionFromPoint?.(event.clientX,event.clientY);
  const legacy=!hit?document.caretRangeFromPoint?.(event.clientX,event.clientY):null;
  const node=hit?.offsetNode||legacy?.startContainer;
  const offset=hit?.offset??legacy?.startOffset??0;
  const source=String(getSourceText()||"");
  let center=Math.max(0,Math.min(source.length,Math.round((event.clientY-root.getBoundingClientRect().top)/Math.max(1,root.scrollHeight)*source.length)));
  if(node&&root.contains(node)){
   const pre=document.createRange();pre.selectNodeContents(root);
   try{pre.setEnd(node,offset);center=pre.toString().length}catch{}
  }
  const start=Math.max(0,center-75),end=Math.min(source.length,center+100);
  lens.textContent=source.slice(start,end);
  lens.style.backgroundColor=pref.background;
  lens.style.color=pref.foreground;
  lens.style.fontFamily=fonts[pref.font];
  lens.style.fontSize=Math.min(44,Math.round(pref.size*1.65))+"px";
  lens.hidden=false;
  const width=Math.min(440,window.innerWidth-26);
  lens.style.maxWidth=width+"px";
  lens.style.left=Math.min(window.innerWidth-width-12,Math.max(10,event.clientX+18))+"px";
  lens.style.top=Math.max(10,Math.min(window.innerHeight-180,event.clientY+20))+"px";
 }
 magnify.addEventListener("click",()=>{
  magnifierOn=!magnifierOn;magnify.setAttribute("aria-pressed",String(magnifierOn));
  if(!magnifierOn)hideLens();
  help.textContent=magnifierOn?"Lupa activa: mueve el cursor sobre las palabras del texto.":"Lupa desactivada.";
 });
 root.addEventListener("pointermove",showLens);root.addEventListener("pointerleave",hideLens);
 root.addEventListener("scroll",hideLens,{passive:true});
 window.addEventListener("blur",hideLens);
 const highlight=$("▧ Resaltar"),underline=$("U̲ Subrayar"),remove=$("Borrar marcas"),reset=$("Restablecer estilo");
 highlight.title="Selecciona un fragmento del texto y presioná Resaltar";
 underline.title="Selecciona un fragmento del texto y presioná Subrayar";
 remove.title="Quitar las marcas del pasaje actual";
 reset.title="Restablecer colores, tipografía y tamaño de este visor";
 bar.append(highlight,underline,remove,reset);
 const readSelected=$("▶ Leer selección"),stopReading=$("■ Detener lectura");
 readSelected.title="Selecciona una palabra, oración o párrafo del texto para escucharlo; también admite selección con teclado";
 stopReading.title="Detener lectura de voz del navegador";stopReading.disabled=true;
 bar.append(readSelected,stopReading);
 let activeUtterance=null;
 const synth=window.speechSynthesis;
 function stopSpeech(){
  if(activeUtterance&&synth)synth.cancel();
  activeUtterance=null;stopReading.disabled=true;
 }
 function speakSelection(){
  const pick=selectionOffsets()||selected;
  if(!pick||pick.language!==getLanguage()||pick.locus!==getLocus()||!pick.quote.trim()){
   help.textContent="Primero selecciona con el mouse o teclado el párrafo o fragmento que deseas escuchar.";return;
  }
  if(!synth||typeof window.SpeechSynthesisUtterance!=="function"){
   help.textContent="Tu navegador no dispone de síntesis de voz. Prueba Chrome, Edge o Safari.";return;
  }
  stopSpeech();
  const utterance=new SpeechSynthesisUtterance(pick.quote);
  const lang=getLanguage();
  utterance.lang=({la:"la",grc:"el-GR",el:"el-GR",es:"es-ES",en:"en-GB",fr:"fr-FR",it:"it-IT",de:"de-DE",pt:"pt-PT"})[lang]||lang||"es-ES";
  utterance.rate=.88;
  const voices=synth.getVoices();
  const locale=utterance.lang.toLowerCase();
  const voice=voices.find(v=>v.lang.toLowerCase()===locale)||
   voices.find(v=>v.lang.toLowerCase().split("-")[0]===locale.split("-")[0]);
  if(voice)utterance.voice=voice;
  utterance.onend=utterance.onerror=()=>{if(activeUtterance===utterance){activeUtterance=null;stopReading.disabled=true}};
  activeUtterance=utterance;stopReading.disabled=false;
  help.textContent="Leyendo selección · "+lang+" · "+pick.quote.length+" caracteres.";
  synth.speak(utterance);
 }
 readSelected.addEventListener("click",speakSelection);
 stopReading.addEventListener("click",()=>{stopSpeech();help.textContent="Lectura detenida."});
 const help=$("Selecciona palabras del texto; las marcas se guardan en este navegador.","small");
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
  // DOM selection may cross annotation/mark nodes. Re-locate exact text without
  // altering the source; only accept a unique occurrence to prevent wrong highlights.
  const quote=range.toString(),at=source.indexOf(quote);
  if(quote&&at>=0&&source.indexOf(quote,at+quote.length)<0)
   return {start:at,end:at+quote.length,quote,locus:getLocus(),language:getLanguage()};
  return null;
 }
 const capture=()=>{const candidate=selectionOffsets();if(candidate)selected=candidate};
 root.addEventListener("mouseup",capture);
 root.addEventListener("keyup",capture);
 root.addEventListener("pointerup",capture);
 // The browser can collapse a selection on toolbar click; capture before focus changes.
 bar.addEventListener("pointerdown",capture,{capture:true});
 function records(){
  const k=own(getLanguage(),getLocus());
  const list=annotations[k];
  return Array.isArray(list)?list.filter(a=>Number.isInteger(a.start)&&Number.isInteger(a.end)&&a.end>a.start&&a.start>=0&&a.end<200000):[];
 }
 // Search marks are transient and separate from personally saved annotations.
 function paintSearchMatches(){
  const wanted=typeof getSearchTerms==="function"?getSearchTerms():[];
  const terms=[...new Set((Array.isArray(wanted)?wanted:[]).map(x=>String(x||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().trim()).filter(Boolean))];
  root.querySelectorAll("mark.classic-study-query-hit").forEach(mark=>mark.replaceWith(document.createTextNode(mark.textContent)));
  if(!terms.length)return;
  const normal=x=>String(x||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];while(walker.nextNode()){if(walker.currentNode.textContent?.trim())nodes.push(walker.currentNode)}
  for(const node of nodes){
   const original=node.textContent,folded=normal(original),hits=[];
   for(const term of terms){
    let cursor=0;
    while(cursor<folded.length){
     const index=folded.indexOf(term,cursor);if(index<0)break;
     const end=index+term.length;
     if((index===0||! /[\p{L}\p{N}]/u.test(folded[index-1]))&&(end===folded.length||! /[\p{L}\p{N}]/u.test(folded[end])))hits.push([index,end]);
     cursor=end;
    }
   }
   if(!hits.length)continue;
   hits.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);
   const fragment=document.createDocumentFragment();let end=0;
   for(const [a,b] of hits){if(a<end)continue;
    fragment.append(document.createTextNode(original.slice(end,a)));
    const mark=document.createElement("mark");mark.className="classic-study-query-hit";mark.textContent=original.slice(a,b);
    mark.style.cssText="background:#ffdf4f!important;color:#111!important;border-radius:2px;padding:0 1px";
    mark.title="Coincidencia textual o equivalencia léxica orientativa";fragment.append(mark);end=b;
   }
   fragment.append(document.createTextNode(original.slice(end)));node.replaceWith(fragment);
  }
 }
 function render(){
  stopSpeech();
  hideLens();
  const source=String(getSourceText()||"");
  root.replaceChildren();
  const valid=records().filter(a=>a.end<=source.length&&source.slice(a.start,a.end)===a.quote);
  if(!valid.length){root.textContent=source;appearance();paintSearchMatches();selected=null;return}
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
  root.append(fragment);appearance();paintSearchMatches();selected=null;
 }
 function annotate(kind){
  const pick=selectionOffsets()||selected;
  if(!pick||pick.language!==getLanguage()||pick.locus!==getLocus()){
   help.textContent="Selecciona primero una palabra o frase en el texto de este visor.";return;
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
 return {render,stopReading:stopSpeech};
}
window.ClassicsStudyTools={attach};
})();