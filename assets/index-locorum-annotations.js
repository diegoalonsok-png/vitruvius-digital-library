/* Index locorum study tools. Browser-local annotations; source texts unchanged. */
(()=>{"use strict";
const results=document.getElementById("results");
if(!results)return;
const shades={gris:"#989ba2",amarillo:"#e5c34f",rojo:"#db7273",azul:"#76b8e4",verde:"#7cc6a1",violeta:"#b396db"};
const supports=Boolean(window.CSS&&CSS.highlights&&window.Highlight);
let chosen="amarillo",style="underline",scale=1;
const toolbar=document.createElement("div");
toolbar.id="locorum-annotation-tools";
toolbar.setAttribute("role","toolbar");
toolbar.setAttribute("aria-label","Herramientas de anotación de Index locorum");
toolbar.innerHTML='<span class="locorum-label">Anotaciones</span><button type="button" data-mode="underline" aria-pressed="true">Subrayar</button><button type="button" data-mode="highlight" aria-pressed="false">Resaltar</button><span class="locorum-palette" role="group" aria-label="Colores"></span><button type="button" data-action="erase" title="Borrar marcas de la selección">Borrar marca</button><button type="button" data-action="clear" title="Borrar todas las marcas del pasaje seleccionado">Limpiar pasaje</button><span class="locorum-rule"></span><button type="button" data-action="find" title="Buscar otra palabra en el índice" aria-label="Lupa buscar">⌕ Buscar</button><button type="button" data-action="smaller" title="Reducir letra de los pasajes" aria-label="Lupa reducir">A−</button><button type="button" data-action="larger" title="Aumentar letra de los pasajes" aria-label="Lupa ampliar">A+</button><output role="status" aria-live="polite"></output>';
results.before(toolbar);
const sheet=document.createElement("style");
sheet.textContent=[
'#locorum-annotation-tools{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:0 0 16px;padding:9px 12px;background:#171719;color:#eee;border:1px solid #45454a;border-radius:9px;font:12px/1.4 system-ui,sans-serif}',
'#locorum-annotation-tools button{cursor:pointer;min-height:32px;border:1px solid #505056;border-radius:5px;background:#29292d;color:#f0f0f2;padding:5px 9px;font:inherit}',
'#locorum-annotation-tools button:hover{background:#39393e}',
'#locorum-annotation-tools [data-mode][aria-pressed=true]{border-color:#cbb87c;background:#4b4435}',
'#locorum-annotation-tools .locorum-palette{display:flex;align-items:center;gap:8px;margin:0 5px}',
'#locorum-annotation-tools button.locorum-dot{width:24px;height:24px;min-height:24px;border-radius:50%;background:var(--dot);padding:0;border:2px solid #474749}',
'#locorum-annotation-tools .locorum-dot[aria-pressed=true]{outline:2px solid #eee;outline-offset:2px}',
'#locorum-annotation-tools .locorum-rule{height:23px;border-left:1px solid #606067}',
'#locorum-annotation-tools output{flex-basis:100%;min-height:0;color:#cfc7b6;font-size:11px}',
'#results .excerpt{font-size:calc(17px * var(--locorum-text-scale,1))}',
'@media print{#locorum-annotation-tools{display:none!important}}'
].concat(Object.entries(shades).flatMap(([key,value])=>[
'::highlight(locorum-h-'+key+'){background:'+value+';color:#141414}',
'::highlight(locorum-u-'+key+'){text-decoration:underline;text-decoration-color:'+value+';text-decoration-thickness:3px;text-underline-offset:4px}'
])).join("\n");
document.head.append(sheet);
const palette=toolbar.querySelector(".locorum-palette"),status=toolbar.querySelector("output");
Object.entries(shades).forEach(([name,value])=>{
 const b=document.createElement("button");b.type="button";b.className="locorum-dot";b.dataset.color=name;
 b.style.setProperty("--dot",value);b.title="Marcar en "+name;b.setAttribute("aria-label","Marcar en "+name);
 b.setAttribute("aria-pressed",String(name===chosen));palette.append(b);
});
function cardOf(node){return node?.parentElement?.closest(".passage")||null}
function identity(card){
 if(!card)return null;
 const edition=card.closest(".edition"),meta=card.querySelector(".passmeta")?.textContent||"";
 const name=edition?.querySelector("summary strong")?.textContent||"";
 const lang=edition?.querySelector("summary span")?.textContent||"";
 const excerpt=card.querySelector(".excerpt")?.textContent||"";
 // Use a stable fingerprint of the actual excerpt so independent search results do not collide.
 let hash=2166136261;
 for(const ch of excerpt){hash=Math.imul(hash^ch.charCodeAt(0),16777619)}
 return "vdl.locorum.mark.v1."+[name,lang,meta,(hash>>>0).toString(16)].join("|");
}
function get(card){
 try{const saved=JSON.parse(localStorage.getItem(identity(card))||"[]");
  return Array.isArray(saved)?saved.filter(x=>x&&Number.isInteger(x.a)&&Number.isInteger(x.b)&&x.a>=0&&x.b>x.a&&x.b<200000&&shades[x.color]&&["underline","highlight"].includes(x.mode)).slice(-100):[];
 }catch{return []}
}
function save(card,entries){
 try{localStorage.setItem(identity(card),JSON.stringify(entries.slice(-100)));return true}
 catch{status.textContent="No se pudieron guardar las marcas en este navegador.";return false}
}
function selected(){
 const s=window.getSelection();if(!s||s.isCollapsed||!s.rangeCount)return null;
 const r=s.getRangeAt(0),card=cardOf(r.startContainer);
 const quote=card?.querySelector(".excerpt");
 if(!quote||!quote.contains(r.startContainer)||!quote.contains(r.endContainer))return null;
 const before=document.createRange();before.selectNodeContents(quote);before.setEnd(r.startContainer,r.startOffset);
 const a=before.toString().length,b=a+r.toString().length;
 return b>a?{card,a,b}:null;
}
function selectedCard(){
 const range=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0):null;
 return range?cardOf(range.startContainer):null;
}
function makeRange(root,a,b){
 const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 let node,pos=0,start=null,end=null;
 while((node=walk.nextNode())){
  const bound=pos+node.textContent.length;
  if(!start&&a>=pos&&a<bound)start=[node,a-pos];
  if(!end&&b>pos&&b<=bound)end=[node,b-pos];
  pos=bound;
 }
 if(!start||!end)return null;
 const range=document.createRange();range.setStart(start[0],start[1]);range.setEnd(end[0],end[1]);return range;
}
function redraw(){
 if(!supports)return;
 const ranges={};
 Object.keys(shades).forEach(c=>{ranges["h-"+c]=[];ranges["u-"+c]=[]});
 results.querySelectorAll(".passage").forEach(card=>{
  const quote=card.querySelector(".excerpt");if(!quote)return;
  get(card).forEach(m=>{
   const range=makeRange(quote,m.a,m.b);
   if(range)ranges[(m.mode==="highlight"?"h-":"u-")+m.color].push(range);
  });
 });
 for(const [name,list] of Object.entries(ranges)){
  const id="locorum-"+name;
  if(list.length)CSS.highlights.set(id,new Highlight(...list));
  else CSS.highlights.delete(id);
 }
}
function mark(which){
 if(!supports){status.textContent="Este navegador no admite el subrayado no destructivo.";return}
 const selectedText=selected(),card=selectedText?.card||selectedCard();
 if(which==="clear"){
  if(!card){status.textContent="Seleccioná una palabra del pasaje que querés limpiar.";return}
  if(save(card,[])){redraw();status.textContent="Marcas eliminadas de este pasaje."}return;
 }
 if(!selectedText){status.textContent="Seleccioná primero las palabras que querés marcar.";return}
 const {a,b}=selectedText,items=get(card);
 if(which==="erase"){
  if(save(card,items.filter(x=>x.b<=a||x.a>=b))){redraw();status.textContent="Marcas de la selección eliminadas."}return;
 }
 if(!items.some(x=>x.a===a&&x.b===b&&x.color===chosen&&x.mode===style)){
  if(save(card,items.concat({a,b,color:chosen,mode:style}))){redraw();status.textContent="Marca guardada en este navegador."}
 }
}
toolbar.addEventListener("pointerdown",e=>{if(e.target.closest("button"))e.preventDefault()});
toolbar.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.mode){style=b.dataset.mode;toolbar.querySelectorAll("[data-mode]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));return}
 if(b.dataset.color){chosen=b.dataset.color;toolbar.querySelectorAll("[data-color]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));mark("apply");return}
 if(b.dataset.action==="erase"||b.dataset.action==="clear"){mark(b.dataset.action);return}
 if(b.dataset.action==="find"){const q=document.getElementById("query");q?.focus();q?.scrollIntoView({block:"center",behavior:"smooth"});return}
 if(b.dataset.action==="larger"||b.dataset.action==="smaller"){
  scale=Math.max(.75,Math.min(1.8,scale+(b.dataset.action==="larger"?.1:-.1)));
  results.style.setProperty("--locorum-text-scale",scale.toFixed(2));
  status.textContent="Tamaño de letra: "+Math.round(scale*100)+" %";
 }
});
let queued=false;
new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;redraw()})}).observe(results,{childList:true});
if(!supports)status.textContent="Las lupas están disponibles; las marcas requieren CSS Highlights.";
redraw();
})();