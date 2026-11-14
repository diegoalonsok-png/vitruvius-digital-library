/* Academic text viewers for the bilingual reader.
 * Viewer-only settings: zoom, contrast, loupe, visual rulers and focus.
 * The indexed editions, critical apparatus, DOI and private notes are untouched.
 */
(()=>{"use strict";
 const root=document.getElementById("reading");
 const KEY="vitruvius-academic-text-viewers-v1";
 const paletteSet={
  inherit:null,
  invert:{bg:"#f9faf8",fg:"#101519",border:"#9a9185"},
  ivory:{bg:"#fffbf3",fg:"#253144",border:"#baab92"},
  sepia:{bg:"#eee2c9",fg:"#392e23",border:"#b49778"},
  black:{bg:"#07090c",fg:"#fffdf5",border:"#92929a"},
  graphite:{bg:"#252b33",fg:"#f6f3e9",border:"#88919a"},
  contrast:{bg:"#ffffff",fg:"#000000",border:"#555555"}
 };
 const minZoom=80,maxZoom=240,increment=10;
 const initialPane=()=>({zoom:100,palette:"inherit",magnifier:false,rule:false,ruler:false,expanded:false});
 const state={sync:true,latin:initialPane(),translation:initialPane()};
 const panes={};
 let magnifier=null,magnifierText=null,masterStatus=null,mountDone=false;
 const clampZoom=n=>Math.max(minZoom,Math.min(maxZoom,Math.round(n/increment)*increment));
 function safeState(){
  try{
   const json=JSON.parse(localStorage.getItem(KEY)||"null");if(!json||typeof json!=="object")return;
   state.sync=json.sync!==false;
   for(const key of ["latin","translation"]){
    const src=json[key];if(!src||typeof src!=="object")continue;
    state[key].zoom=Number.isFinite(Number(src.zoom))?clampZoom(Number(src.zoom)):100;
    state[key].palette=Object.prototype.hasOwnProperty.call(paletteSet,src.palette)?src.palette:"inherit";
    state[key].magnifier=src.magnifier===true;
    state[key].rule=src.rule===true;
    state[key].ruler=src.ruler===true;
   }
  }catch{/* Private preferences must never prevent the reader from loading. */}
 }
 function persist(){
  try{localStorage.setItem(KEY,JSON.stringify({
   sync:state.sync,
   latin:{zoom:state.latin.zoom,palette:state.latin.palette,magnifier:state.latin.magnifier,rule:state.latin.rule,ruler:state.latin.ruler},
   translation:{zoom:state.translation.zoom,palette:state.translation.palette,magnifier:state.translation.magnifier,rule:state.translation.rule,ruler:state.translation.ruler}
  }))}catch{/* The reader remains usable in restricted/private browsing. */}
 }
 function setStatus(text){
  if(masterStatus)masterStatus.textContent=text;
 }
 function showButton(text,title,callback){
  const button=document.createElement("button");button.type="button";button.textContent=text;button.title=title;
  button.setAttribute("aria-label",title);button.addEventListener("click",callback);
  return button;
 }
 function makeLabel(text,field){
  const label=document.createElement("label");label.append(document.createTextNode(text+" "),field);return label;
 }
 function syncZoom(key,next){
  state[key].zoom=clampZoom(next);
  if(state.sync)state[key==="latin"?"translation":"latin"].zoom=state[key].zoom;
  updateZoom();persist();
 }
 function updateZoom(){
  const pref=Number(root.dataset.readingSize||100)/100;
  const mobile=window.matchMedia("(max-width:760px)").matches;
  const base=mobile?18:20;
  for(const key of ["latin","translation"]){
   const pane=panes[key];if(!pane)continue;
   const percent=state[key].zoom;
   pane.panel.style.setProperty("--academic-font-size",(Math.round(base*pref*percent/10)/10)+"px");
   pane.percent.textContent=percent+"%";
   pane.less.disabled=percent<=minZoom;
   pane.more.disabled=percent>=maxZoom;
  }
 }
 function applyPalette(key){
  const pane=panes[key];if(!pane)return;
  const v=paletteSet[state[key].palette];
  pane.panel.dataset.academicPalette=state[key].palette;
  pane.palette.value=state[key].palette;
  if(v){
   pane.panel.style.setProperty("--academic-panel-bg",v.bg);
   pane.panel.style.setProperty("--academic-panel-fg",v.fg);
   pane.panel.style.setProperty("--academic-panel-border",v.border);
  }else{
   for(const x of ["--academic-panel-bg","--academic-panel-fg","--academic-panel-border"])pane.panel.style.removeProperty(x);
  }
  pane.invert.setAttribute("aria-pressed",String(state[key].palette==="invert"));
 }
 function applyTools(key){
  const pane=panes[key],v=state[key];if(!pane)return;
  pane.lens.setAttribute("aria-pressed",String(v.magnifier));
  pane.rule.setAttribute("aria-pressed",String(v.rule));
  pane.ruler.setAttribute("aria-pressed",String(v.ruler));
  pane.full.setAttribute("aria-pressed",String(v.expanded));
  pane.full.textContent=v.expanded?"Salir de ampliación":"Ampliar panel";
  pane.panel.dataset.readingRule=String(v.rule);
  pane.panel.dataset.ruler=String(v.ruler);
  pane.panel.classList.toggle("academic-expanded",v.expanded);
  pane.guide.hidden=!v.rule;
  if(!v.magnifier&&magnifier)magnifier.hidden=true;
  applyPalette(key);
 }
 function resetAll(){
  for(const key of ["latin","translation"]){
   Object.assign(state[key],initialPane());
   applyTools(key);
  }
  document.body.classList.remove("academic-viewer-expanded");
  updateZoom();persist();setStatus("Visores restaurados; los textos, citas y anotaciones se conservan.");
 }
 function exitExpanded(){
  let changed=false;
  for(const key of ["latin","translation"])if(state[key].expanded){
   state[key].expanded=false;applyTools(key);changed=true;
  }
  if(changed)document.body.classList.remove("academic-viewer-expanded");
 }
 function toggleExpanded(key){
  const next=!state[key].expanded;
  exitExpanded();state[key].expanded=next;
  document.body.classList.toggle("academic-viewer-expanded",next);
  applyTools(key);
  if(next)panes[key].full.focus({preventScroll:true});
  setStatus(next?"Visor "+panes[key].name+" ampliado. Presione Escape para volver.":"Vista dividida restaurada.");
 }
 function positionGuide(key,event){
  const pane=panes[key];
  if(!state[key].rule||!pane)return;
  const rect=pane.panel.getBoundingClientRect(),tr=pane.text.getBoundingClientRect();
  if(event.clientY<tr.top||event.clientY>tr.bottom||event.clientX<tr.left||event.clientX>tr.right){
   pane.guide.hidden=true;return;
  }
  const top=Math.max(tr.top-rect.top,Math.min(event.clientY-rect.top-18,tr.bottom-rect.top-36));
  pane.guide.style.top=top+"px";pane.guide.hidden=false;
 }
 function getCaretAt(x,y){
  if(document.caretPositionFromPoint){
   const c=document.caretPositionFromPoint(x,y);
   return c?{node:c.offsetNode,offset:c.offset}:null;
  }
  if(document.caretRangeFromPoint){
   const r=document.caretRangeFromPoint(x,y);
   return r?{node:r.startContainer,offset:r.startOffset}:null;
  }
  return null;
 }
 function moveLoupe(key,event){
  const pane=panes[key];
  if(!state[key].magnifier||!pane||!magnifier)return;
  const rect=pane.text.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom){magnifier.hidden=true;return}
  const caret=getCaretAt(event.clientX,event.clientY);
  if(!caret||!pane.text.contains(caret.node)){magnifier.hidden=true;return}
  const prefix=document.createRange();
  try{prefix.selectNodeContents(pane.text);prefix.setEnd(caret.node,caret.offset)}
  catch{magnifier.hidden=true;return}
  const value=pane.text.textContent||"";
  const index=prefix.toString().length;
  if(!value.trim()){magnifier.hidden=true;return}
  const begin=Math.max(0,index-24),end=Math.min(value.length,index+36);
  const snippet=(begin?"…":"")+value.slice(begin,end)+(end<value.length?"…":"");
  magnifierText.textContent=snippet;
  magnifier.hidden=false;
  const width=magnifier.offsetWidth||360,height=magnifier.offsetHeight||102;
  const x=Math.max(8,Math.min(event.clientX+18,window.innerWidth-width-8));
  const y=event.clientY>height+22?event.clientY-height-14:Math.min(window.innerHeight-height-8,event.clientY+24);
  magnifier.style.left=x+"px";magnifier.style.top=Math.max(8,y)+"px";
 }
 function insertPanel(key,panel,text){
  const name=key==="latin"?"latino":"traducción";
  const tools=document.createElement("div");tools.className="academic-panel-tools";
  tools.setAttribute("role","toolbar");tools.setAttribute("aria-label","Instrumentos académicos del visor "+name);
  const label=document.createElement("span");label.className="av-label";label.textContent=key==="latin"?"VISOR LATINO":"VISOR DE TRADUCCIÓN";tools.append(label);
  const less=showButton("−","Reducir zoom del visor "+name,()=>syncZoom(key,state[key].zoom-increment));
  const percent=document.createElement("span");percent.className="av-zoom-readout";percent.setAttribute("aria-live","polite");
  const more=showButton("+","Ampliar zoom del visor "+name,()=>syncZoom(key,state[key].zoom+increment));
  tools.append(less,percent,more);
  const palette=document.createElement("select");
  palette.setAttribute("aria-label","Paleta de colores del visor "+name);
  for(const [value,text] of [
   ["inherit","Color general"],["ivory","Papel marfil"],["sepia","Sepia"],["black","Negro"],["graphite","Grafito"],["contrast","Alto contraste"],["invert","Invertir colores"]]){
   const opt=document.createElement("option");opt.value=value;opt.textContent=text;palette.append(opt);
  }
  palette.addEventListener("change",()=>{
   state[key].palette=palette.value;applyPalette(key);persist();
  });
  tools.append(palette);
  const invert=showButton("Invertir","Invertir los colores sólo del visor "+name,()=>{
   state[key].palette=state[key].palette==="invert"?"inherit":"invert";
   applyPalette(key);persist();
  });
  const lens=showButton("Lupa","Lupa textual ampliada junto al cursor en visor "+name,()=>{
   state[key].magnifier=!state[key].magnifier;applyTools(key);persist();
   setStatus(state[key].magnifier?"Mueva el cursor sobre el pasaje: la lupa reproduce la transcripción visible a mayor tamaño, no un facsímil.":"Lupa desactivada.");
  });
  const rule=showButton("Regla","Regla horizontal para seguir una línea del visor "+name,()=>{
   state[key].rule=!state[key].rule;applyTools(key);persist();
   setStatus("Regla de lectura "+(state[key].rule?"activada":"desactivada")+"; guía visual sin escala métrica.");
  });
  const ruler=showButton("Guía lateral","Mostrar u ocultar guía vertical sin escala métrica en visor "+name,()=>{
   state[key].ruler=!state[key].ruler;applyTools(key);persist();
  });
  const full=showButton("Ampliar panel","Ampliar sólo el visor "+name+" · Escape para salir",()=>toggleExpanded(key));
  full.className="av-fullscreen";
  tools.append(invert,lens,rule,ruler,full);
  text.before(tools);
  const guide=document.createElement("div");guide.className="av-guide";guide.setAttribute("aria-hidden","true");guide.hidden=true;
  panel.append(guide);
  panes[key]={panel,text,tools,less,more,percent,palette,invert,lens,rule,ruler,full,guide,name};
  panel.classList.add("academic-viewer-panel");
  panel.dataset.academicPalette=state[key].palette;
  text.addEventListener("pointermove",event=>{positionGuide(key,event);moveLoupe(key,event)});
  text.addEventListener("pointerleave",()=>{guide.hidden=true;if(magnifier)magnifier.hidden=true});
  panel.addEventListener("scroll",()=>{if(magnifier)magnifier.hidden=true},{passive:true});
 }
 function mount(){
  if(mountDone)return;
  const reader=document.getElementById("reading");
  const bar=document.getElementById("bilingual-appearance");
  if(!reader||!bar)return;
  const frame=[...reader.querySelectorAll(":scope > .scholarly-columns")]
   .find(c=>c.querySelector("#latin-text")&&c.querySelector("#translation-text"));
  if(!frame)return;
  const latin=document.getElementById("latin-text"),translation=document.getElementById("translation-text");
  const latinPanel=latin?.closest(".scholarly-panel"),translationPanel=translation?.closest(".scholarly-panel");
  if(!latinPanel||!translationPanel)return;
  mountDone=true;
  safeState();
  reader.dataset.academicViewers="1";
  const master=document.createElement("section");master.id="academic-viewer-master";
  master.setAttribute("aria-label","Ajustes generales de los visores académicos");
  const title=document.createElement("span");title.className="av-master-title";title.textContent="VISIO PHILOLOGICA · INSTRUMENTOS";
  const sync=document.createElement("input");sync.type="checkbox";sync.id="academic-sync-zoom";sync.checked=state.sync;
  sync.addEventListener("change",()=>{
   state.sync=sync.checked;
   if(state.sync){state.translation.zoom=state.latin.zoom;updateZoom()}
   persist();setStatus(state.sync?"Zoom de ambos visores sincronizado.":"Zoom independiente en cada visor.");
  });
  const reset=showButton("Restaurar herramientas","Restaurar zoom, guías, lupa y color por panel",resetAll);
  const explanatory=document.createElement("p");explanatory.className="av-master-note";
  explanatory.textContent="Lupa de transcripción, no del facsímil · reglas de lectura sin escala · ajustes visuales privados, sin modificar el texto ni el aparato crítico.";
  masterStatus=document.createElement("p");masterStatus.className="av-master-note";
  masterStatus.id="academic-viewer-status";masterStatus.setAttribute("role","status");masterStatus.setAttribute("aria-live","polite");
  masterStatus.textContent="Zoom: 80–240 % por visor. La barra superior mantiene sus opciones generales de tipografía y colores.";
  master.append(title,makeLabel("Zoom sincronizado",sync),reset,explanatory,masterStatus);
  bar.append(master);
  magnifier=document.createElement("div");magnifier.id="academic-magnifier";magnifier.hidden=true;
  magnifier.setAttribute("role","note");magnifier.setAttribute("aria-label","Lupa textual orientativa");
  const lensTitle=document.createElement("strong");lensTitle.textContent="LVPA TEXTVALIS · TRANSCRIPCIÓN 2×";
  magnifierText=document.createElement("div");magnifierText.className="av-lens-text";
  magnifier.append(lensTitle,magnifierText);document.body.append(magnifier);
  insertPanel("latin",latinPanel,latin);
  insertPanel("translation",translationPanel,translation);
  for(const key of ["latin","translation"])applyTools(key);
  updateZoom();
  document.addEventListener("change",e=>{
   if(e.target?.id==="vdl-reading-size")requestAnimationFrame(updateZoom);
  });
  window.addEventListener("resize",updateZoom,{passive:true});
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&document.body.classList.contains("academic-viewer-expanded")){
    exitExpanded();setStatus("Vista dividida restaurada.");event.preventDefault();
   }
  });
  document.addEventListener("pointerdown",event=>{
   if(!frame.contains(event.target)&&magnifier)magnifier.hidden=true;
  });
  persist();
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
 else mount();
})();
