(function(){
"use strict";var $=id=>document.getElementById(id), stage=$("stage"),img=$("image");
if(!stage||!img)return;
var css=[
"#single-options{display:flex;flex-wrap:wrap;gap:7px;align-items:center;background:#e9ddca;padding:12px;margin:12px 0;border:1px solid #b99e73}",
"#single-options button{min-height:38px;padding:7px 10px}",
"#single-options select{padding:8px}",
"header{position:relative;padding-top:110px}",
"#single-top-controls{position:absolute;top:16px;right:clamp(12px,2vw,30px);display:flex;justify-content:flex-end;align-items:center;gap:16px;flex-wrap:wrap;z-index:5}",
"#single-top-controls label{display:flex;align-items:center;gap:12px;background:#29445a;color:white;border:1px solid #a5b1ba;border-radius:9px;padding:6px 8px 6px 12px}",
"#single-top-controls select{min-height:47px;min-width:178px;border:1px solid #8fa0ac;border-radius:7px;padding:8px 30px 8px 13px;background:#29445a;color:#fff;font:650 16px system-ui,sans-serif}",
"#single-top-controls button{min-height:60px;display:inline-flex;align-items:center;gap:9px;padding:12px 22px;border:1px solid #a5b1ba;border-radius:9px;background:#29445a;color:#fff;font:650 16px system-ui,sans-serif}",
"#single-top-controls .globe{font-size:20px}",
"@media(max-width:650px){header{padding-top:150px}#single-top-controls{left:12px;right:12px;justify-content:flex-start;gap:8px}#single-top-controls select{min-width:132px}#single-top-controls button{padding:8px 12px}}",
"#single-ruler{display:flex;flex-wrap:wrap;gap:9px;align-items:center;background:#eadfcd;padding:10px}",
"#single-ruler input{flex:1 1 150px}",
"#single-filters{background:#e9ddca;padding:10px;margin:8px 0}",
"#single-filters summary{cursor:pointer;font-weight:bold}",
"#single-filters label{display:inline-flex;gap:5px;align-items:center;margin:8px;flex-wrap:wrap}",
"#single-filters label input[type=range]{width:140px}",
"#stage{overflow-y:scroll!important;scrollbar-width:auto;scrollbar-color:#9a7645 #e6dac8;cursor:grab}",
"#stage.is-dragging{cursor:grabbing!important}",
"html[data-reader-theme=dark] body{background:#142638;color:#eee5d7}",
"html[data-reader-theme=dark] #single-options,html[data-reader-theme=dark] #single-ruler,html[data-reader-theme=dark] #single-filters{background:#344b5d;color:#eee5d7}",
"@media print{.gallery,.toolbar,#single-options,#single-ruler,#single-filters,#single-top-controls,nav,#state{display:none!important}#stage{height:auto;overflow:visible}#image{max-width:100%!important;width:auto!important;max-height:240mm!important;filter:none!important}}"
].join("\n");
var style=document.createElement("style");style.textContent=css;document.head.append(style);
var actions=document.createElement("div");actions.id="single-options";
actions.innerHTML='<button id="s-loupe" aria-pressed="true">◉ Desactivar lupa</button> <button id="s-print">⎙ Imprimir</button> <button id="s-email">✉ Correo</button> <button id="s-wa">WhatsApp</button>';
var headControls=document.createElement("div");headControls.id="single-top-controls";headControls.setAttribute("role","group");headControls.setAttribute("aria-label","Idioma y apariencia");
headControls.innerHTML='<label><span class="globe" aria-hidden="true">🌐</span><select id="s-language" aria-label="Idioma de interfaz"><option value="es">Español</option><option value="en">English</option><option value="fr">Français</option><option value="it">Italiano</option><option value="de">Deutsch</option><option value="pt">Português</option></select></label><button id="s-theme" type="button" aria-pressed="false">☾ Oscuro</button>';
document.querySelector("header").prepend(headControls);
var reader=document.querySelector('section[aria-label="Lector de folios"]');reader.parentNode.insertBefore(actions,reader);
var ruler=document.createElement("div");ruler.id="single-ruler";
ruler.innerHTML='<label>Bajar por el folio</label><button id="s-up">↑</button><input type="range" min="0" max="100" value="0" id="s-scroll"><output id="s-percent">0%</output><button id="s-down">↓</button>';
stage.insertAdjacentElement("afterend",ruler);
var filters=document.createElement("details");filters.id="single-filters";
filters.innerHTML='<summary>Ajustes · opacidad, brillo, contraste, inversión, sepia</summary><div id="s-filter-controls"></div>';
ruler.insertAdjacentElement("afterend",filters);
var conf=[["opacity","Opacidad",20,100,100],["brightness","Brillo",40,180,100],["contrast","Contraste",40,220,100],["saturation","Saturación",0,200,100],["grayscale","Grises",0,100,0],["sepia","Sepia",0,100,0]];
for(var [id,label,min,max,def] of conf){var l=document.createElement("label");l.textContent=label+" ";var inp=document.createElement("input");inp.type="range";inp.id="s-"+id;inp.min=min;inp.max=max;inp.value=def;l.append(inp);filters.querySelector("div").append(l);}
filters.querySelector("div").insertAdjacentHTML("beforeend",'<label>Invertir colores<input type="checkbox" id="s-invert"></label><button id="s-reset">Restablecer</button>');
function apply(){var val=id=>Number($("s-"+id).value);img.style.opacity=val("opacity")/100;
img.style.filter="brightness("+val("brightness")+"%) contrast("+val("contrast")+"%) saturate("+val("saturation")+"%) grayscale("+val("grayscale")+"%) sepia("+val("sepia")+"%) invert("+($("s-invert").checked?1:0)+")";}
for(var [k] of conf)$("s-"+k).addEventListener("input",apply);
$("s-invert").addEventListener("change",apply);
$("s-reset").addEventListener("click",()=>{for(var [k,l,m,n,d] of conf)$("s-"+k).value=d;$("s-invert").checked=false;apply()});
function sync(){var max=Math.max(0,stage.scrollHeight-stage.clientHeight),p=max?Math.round(stage.scrollTop/max*100):0;$("s-scroll").value=p;$("s-percent").textContent=p+"%";}
stage.addEventListener("scroll",sync,{passive:true});
$("s-scroll").addEventListener("input",e=>stage.scrollTop=Math.max(0,stage.scrollHeight-stage.clientHeight)*Number(e.target.value)/100);
$("s-up").addEventListener("click",()=>stage.scrollTo({top:0,behavior:"smooth"}));
$("s-down").addEventListener("click",()=>stage.scrollTo({top:stage.scrollHeight,behavior:"smooth"}));
var current="es",theme="light",magnifier=true;
try{current=localStorage.getItem("vitruvius-ui-lang")||"es";theme=localStorage.getItem("vitruvius-color-theme")==="dark"?"dark":"light"}catch(e){}
function paint(){document.documentElement.dataset.readerTheme=theme;document.documentElement.lang=current;$("s-language").value=current;
var light={es:"Claro",en:"Light",fr:"Clair",it:"Chiaro",de:"Hell",pt:"Claro"},dark={es:"Oscuro",en:"Dark",fr:"Sombre",it:"Scuro",de:"Dunkel",pt:"Escuro"};
$("s-theme").textContent=theme==="dark"?"☀ "+(light[current]||light.es):"☾ "+(dark[current]||dark.es);$("s-theme").setAttribute("aria-pressed",String(theme==="dark"));
$("s-loupe").textContent=magnifier?"◉ Desactivar lupa":"◉ Activar lupa";}
$("s-language").addEventListener("change",e=>{current=e.target.value;try{localStorage.setItem("vitruvius-ui-lang",current)}catch{}paint()});
$("s-theme").addEventListener("click",()=>{theme=theme==="dark"?"light":"dark";try{localStorage.setItem("vitruvius-color-theme",theme)}catch{}paint()});
$("s-loupe").addEventListener("click",()=>{magnifier=!magnifier;$("s-loupe").setAttribute("aria-pressed",magnifier);paint()});
function share(){var url=new URL(location.href);url.searchParams.set("folio",$("label").textContent.replace(/^Folio:\\s*/,""));return "Codex H · Harley MS 2767 · "+url.href}
$("s-print").addEventListener("click",()=>window.print());
$("s-email").addEventListener("click",()=>location.href="mailto:?subject=Codex%20H&body="+encodeURIComponent(share()));
$("s-wa").addEventListener("click",()=>window.open("https://wa.me/?text="+encodeURIComponent(share()),"_blank","noopener,noreferrer"));
var down=null;
stage.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse"||e.button!==0||img.hidden)return;down={x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop,id:e.pointerId,moved:false}});
stage.addEventListener("pointermove",e=>{if(!down||down.id!==e.pointerId)return;var dx=e.clientX-down.x,dy=e.clientY-down.y;if(!down.moved&&Math.abs(dx)+Math.abs(dy)>5){down.moved=true;stage.setPointerCapture(e.pointerId);stage.classList.add("is-dragging")}
if(down.moved){stage.scrollLeft=down.left-dx;stage.scrollTop=down.top-dy}});
function end(e){if(!down||down.id!==e.pointerId)return;down=null;stage.classList.remove("is-dragging");if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId)}
stage.addEventListener("pointerup",end);stage.addEventListener("pointercancel",end);
img.addEventListener("load",()=>{apply();sync()});
paint();apply();
})();