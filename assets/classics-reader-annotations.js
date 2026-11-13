/* Coloured reader annotations: browser-local, non-destructive, per work/edition/locus. */
(()=>{"use strict";
const text=document.getElementById("passages"),article=document.querySelector(".reader");
if(!text||!article)return;
const params=new URLSearchParams(location.search),work=params.get("work")||"unknown";
const colors={amarillo:"#f6dc68",verde:"#8ed6a3",azul:"#91bff0",rosa:"#e9a6d2"};
const support=!!(window.CSS&&CSS.highlights&&window.Highlight);
let mode="underline",color="amarillo";
const bar=document.createElement("div");bar.className="vdl-annotation-bar";
bar.innerHTML='<strong>Marcas</strong><button type="button" data-mode="underline" aria-pressed="true">Subrayar</button><button type="button" data-mode="highlight" aria-pressed="false">Resaltar</button><span id="vdl-annotation-palette"></span><button type="button" data-action="erase">Borrar selección</button><button type="button" data-action="clear">Limpiar pasaje</button><span class="vdl-annotation-divider"></span><button type="button" data-action="find" title="Buscar en este panel" aria-label="Lupa buscar">⌕</button><button type="button" data-action="smaller" title="Lupa reducir" aria-label="Lupa reducir">−</button><button type="button" data-action="larger" title="Lupa ampliar" aria-label="Lupa ampliar">＋</button><output aria-live="polite"></output>';
article.insertBefore(bar,article.querySelector(".reader-toolbar"));
const css=document.createElement("style");css.textContent=[
'.vdl-annotation-bar{display:flex;gap:7px;flex-wrap:wrap;align-items:center;background:#171719;border:1px solid #434349;padding:8px;margin:0 0 10px;border-radius:4px;color:#eee;font:11px system-ui}',
'.vdl-annotation-bar button{font:inherit;cursor:pointer;background:#29292b;color:#eee;border:1px solid #555;border-radius:4px;min-height:28px;padding:4px 7px}',
'.vdl-annotation-bar [aria-pressed=true]:not(.vdl-dot){border-color:#d8bd86;background:#454039}',
'.vdl-annotation-bar #vdl-annotation-palette{display:flex;gap:8px;align-items:center;margin:0 5px}',
'.vdl-annotation-bar button.vdl-dot{width:22px;height:22px;min-height:22px;padding:0;border-radius:50%;background:var(--vdl-dot);border:2px solid #444}',
'.vdl-annotation-bar .vdl-dot[aria-pressed=true]{outline:2px solid white;outline-offset:2px}',
'.vdl-annotation-bar output{flex-basis:100%;color:#d5c4a5;font-size:10px}',
'.vdl-annotation-divider{height:20px;border-left:1px solid #666}',
'@media print{.vdl-annotation-bar{display:none!important}}'
].concat(Object.entries(colors).flatMap(([name,hex])=>[
'::highlight(vdl-h-'+name+'){background:'+hex+';color:#181818}',
'::highlight(vdl-u-'+name+'){text-decoration:underline;text-decoration-color:'+hex+';text-decoration-thickness:3px;text-underline-offset:3px}'
])).join("\n");document.head.append(css);
const palette=bar.querySelector("#vdl-annotation-palette"),output=bar.querySelector("output");
Object.entries(colors).forEach(([name,hex])=>{
 const b=document.createElement("button");b.type="button";b.className="vdl-dot";b.dataset.color=name;
 b.title="Marcar en "+name;b.setAttribute("aria-label","Marcar en "+name);
 b.setAttribute("aria-pressed",String(name===color));b.style.setProperty("--vdl-dot",hex);palette.append(b);
});
const host=()=>text.querySelector("p > span:not(.locus)");
function key(){return "vdl.marks.1."+work+"."+(text.getAttribute("lang")||"la")+"."+(new URLSearchParams(location.search).get("locus")||"none");}
function read(){try{const rows=JSON.parse(localStorage.getItem(key())||"[]");return Array.isArray(rows)?rows.filter(x=>x&&Number.isInteger(x.a)&&Number.isInteger(x.b)&&x.a>=0&&x.b>x.a&&colors[x.color]&&["underline","highlight"].includes(x.mode)).slice(-150):[]}catch{return []}}
function save(rows){try{localStorage.setItem(key(),JSON.stringify(rows.slice(-150)));return true}catch{output.textContent="No se pueden guardar marcas en este navegador.";return false}}
function selection(){
 const root=host(),s=window.getSelection();if(!root||!s||s.isCollapsed||!s.rangeCount)return null;
 const r=s.getRangeAt(0);if(!root.contains(r.startContainer)||!root.contains(r.endContainer))return null;
 const before=document.createRange();before.selectNodeContents(root);before.setEnd(r.startContainer,r.startOffset);
 const a=before.toString().length,b=a+r.toString().length;return b>a?{a,b}:null;
}
function range(root,a,b){
 const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n,pos=0,first=null,last=null;
 while((n=walk.nextNode())){const end=pos+n.textContent.length;
  if(!first&&a>=pos&&a<end)first=[n,a-pos];
  if(!last&&b>pos&&b<=end)last=[n,b-pos];
  pos=end;
 }
 if(!first||!last)return null;
 const r=document.createRange();r.setStart(first[0],first[1]);r.setEnd(last[0],last[1]);return r;
}
function redraw(){
 if(!support)return;
 Object.keys(colors).forEach(c=>["h","u"].forEach(t=>CSS.highlights.delete("vdl-"+t+"-"+c)));
 const root=host();if(!root)return;
 const marks=read();
 Object.keys(colors).forEach(c=>["h","u"].forEach(t=>{
  const rs=marks.filter(x=>x.color===c&&(x.mode==="highlight"?"h":"u")===t).map(x=>range(root,x.a,x.b)).filter(Boolean);
  if(rs.length)CSS.highlights.set("vdl-"+t+"-"+c,new Highlight(...rs));
 }));
}
function action(which){
 if(which==="larger"||which==="smaller"){document.getElementById("reader-"+which)?.click();return}
 if(which==="find"){
  const input=document.getElementById("query");
  if(document.documentElement.dataset.parallelView==="true"){
   const q=window.prompt("Buscar palabra o frase en este panel:","");
   if(q!==null&&input){input.value=q;document.getElementById("find")?.click();}
  }else input?.focus();
  return;
 }
 if(!support){output.textContent="Las marcas requieren un navegador compatible con CSS Highlights.";return}
 if(which==="clear"){if(save([])){redraw();output.textContent="Marcas de este pasaje borradas."}return}
 const chosen=selection();if(!chosen){output.textContent="Selecciona primero una frase del texto.";return}
 const rows=read();
 if(which==="erase"){
  if(save(rows.filter(x=>x.b<=chosen.a||x.a>=chosen.b))){redraw();output.textContent="Marca borrada."}return;
 }
 if(!rows.some(x=>x.a===chosen.a&&x.b===chosen.b&&x.color===color&&x.mode===mode)){
  if(save(rows.concat({...chosen,color,mode}))){redraw();output.textContent="Marca guardada en este navegador."}
 }
}
bar.addEventListener("mousedown",e=>{if(e.target.closest("button"))e.preventDefault()});
bar.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.mode){mode=b.dataset.mode;bar.querySelectorAll("[data-mode]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));return}
 if(b.dataset.color){color=b.dataset.color;bar.querySelectorAll("[data-color]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));action("mark");return}
 if(b.dataset.action)action(b.dataset.action);
});
let scheduled=false;
new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;redraw()})}}).observe(text,{childList:true,subtree:true});
if(!support)output.textContent="Las lupas funcionan; este navegador no admite marcas CSS.";
redraw();
})();