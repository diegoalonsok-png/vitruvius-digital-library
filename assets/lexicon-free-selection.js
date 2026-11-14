/* Free text selection and manual underlines in Vitruvia Lexicon.
   A reader's underline is visual and does not alter the underlying edition. */
(()=>{"use strict";
function mount(){
 const root=document.getElementById("results");
 if(!root||document.getElementById("lx-selection-toolbar"))return;
 const style=document.createElement("style");style.id="lx-free-selection-style";
 style.textContent=[
 "#results :is(.lx-kwic,.lx-passage,.lx-tr,.lx-appbox,.lx-entry,.lx-hit,.w,mark){-webkit-user-select:text!important;user-select:text!important}",
 "#results ::selection{background:#84b9f1!important;color:#15202b!important}",
 "#results mark::selection{background:#84b9f1!important;color:#15202b!important}",
 "#results .lx-manual-underline{background:rgba(233,183,76,.17);text-decoration:underline;text-decoration-color:#d8ad59;text-decoration-thickness:2.5px;text-underline-offset:3px}",
 "#lx-selection-toolbar{position:fixed;z-index:2147481000;display:flex;align-items:center;gap:5px;max-width:calc(100vw - 20px);padding:7px;border:1px solid #c7a36a;border-radius:8px;background:#1f2127;color:#f6f4ef;box-shadow:0 8px 28px #0009;font:12px system-ui,sans-serif}",
 "#lx-selection-toolbar[hidden]{display:none!important}",
 "#lx-selection-toolbar button{background:#32353d;color:#fff;border:1px solid #62656e;border-radius:5px;padding:7px 10px;min-height:32px;font:600 12px system-ui,sans-serif;cursor:pointer}",
 "#lx-selection-toolbar button:first-child{background:#c9a767;color:#161616}",
 "#lx-selection-help{margin:8px 0 18px;display:flex;flex-wrap:wrap;gap:8px 15px;align-items:center;border-bottom:1px solid #444;padding:9px 0;color:#aaa;font:12px/1.6 system-ui,sans-serif}",
 "#lx-selection-help button{padding:5px 8px;border:1px solid #62656e;border-radius:5px;background:transparent;color:inherit;font:600 11px system-ui,sans-serif;cursor:pointer}",
 "#lx-selection-toolbar button:focus-visible,#lx-selection-help button:focus-visible{outline:3px solid #f3d080;outline-offset:2px}",
 "html[data-theme=light] #lx-selection-help{color:#545454;border-color:#ccc}",
 "@media print{#lx-selection-toolbar,#lx-selection-help{display:none!important}}"
 ].join("\n");
 document.head.append(style);
 const toolbar=document.createElement("div");
 toolbar.id="lx-selection-toolbar";toolbar.hidden=true;toolbar.setAttribute("role","toolbar");
 toolbar.setAttribute("aria-label","Herramientas de selección libre del texto");
 let remembered=null,text="";
 function close(){toolbar.hidden=true;remembered=null;text=""}
 function validRange(){
  const sel=window.getSelection?.();
  if(!sel||sel.isCollapsed||!sel.rangeCount||!sel.toString().trim())return null;
  const range=sel.getRangeAt(0);
  if(!root.contains(range.startContainer)||!root.contains(range.endContainer))return null;
  if(sel.toString().length>12000)return null;
  return range.cloneRange();
 }
 function update(){
  const range=validRange();
  if(!range){if(!toolbar.contains(document.activeElement))close();return}
  remembered=range;text=window.getSelection().toString();
  const rect=range.getBoundingClientRect();
  toolbar.hidden=false;
  const width=toolbar.offsetWidth||240,height=toolbar.offsetHeight||40;
  toolbar.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-width-8))+"px";
  toolbar.style.top=Math.max(8,rect.top>height+12?rect.top-height-8:Math.min(rect.bottom+8,window.innerHeight-height-8))+"px";
 }
 function addButton(label,handler){
  const b=document.createElement("button");b.type="button";b.textContent=label;
  b.addEventListener("pointerdown",e=>e.preventDefault());
  b.addEventListener("click",handler);toolbar.append(b);return b;
 }
 function underline(range){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),segments=[];let n;
  while((n=walker.nextNode())){
   if(!n.nodeValue||!range.intersectsNode(n))continue;
   if(n.parentElement?.closest("button,a,input,select,textarea,script,style"))continue;
   const start=n===range.startContainer?range.startOffset:0;
   const end=n===range.endContainer?range.endOffset:n.nodeValue.length;
   if(end>start)segments.push({node:n,start,end});
   if(segments.length>=500)break;
  }
  for(let i=segments.length-1;i>=0;i--){
   let {node,start,end}=segments[i];if(!node.isConnected)continue;
   if(end<node.length)node.splitText(end);
   if(start)node=node.splitText(start);
   const span=document.createElement("span");span.className="lx-manual-underline";
   span.dataset.lxManual="1";node.replaceWith(span);span.append(node);
  }
  window.getSelection()?.removeAllRanges();close();
 }
 addButton("Subrayar",()=>{if(remembered)underline(remembered)});
 const copy=addButton("Copiar",async()=>{
  try{await navigator.clipboard.writeText(text);copy.textContent="Copiado"}catch{copy.textContent="Usa Ctrl+C / Cmd+C"}
 });
 addButton("Cerrar",close);
 document.body.append(toolbar);
 const help=document.createElement("p");help.id="lx-selection-help";
 help.append(document.createTextNode("Selecciona libremente una palabra o frase del resultado; después elige «Subrayar» o «Copiar». El resaltado de búsqueda es independiente."));
 const reset=document.createElement("button");reset.type="button";reset.textContent="Quitar mis subrayados";
 reset.addEventListener("click",()=>{
  for(const span of root.querySelectorAll("[data-lx-manual='1']")){
   const parent=span.parentNode;if(!parent)continue;
   span.replaceWith(document.createTextNode(span.textContent||""));parent.normalize();
  }
  window.getSelection()?.removeAllRanges();close();
 });
 help.append(reset);
 root.querySelector(".section-head")?.after(help);
 document.addEventListener("pointerup",e=>{if(!toolbar.contains(e.target))requestAnimationFrame(update)});
 document.addEventListener("keyup",e=>{
  if(["Shift","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key))requestAnimationFrame(update)
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
 document.addEventListener("pointerdown",e=>{if(!root.contains(e.target)&&!toolbar.contains(e.target))close()});
 document.addEventListener("scroll",()=>{toolbar.hidden=true},{passive:true,capture:true});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
