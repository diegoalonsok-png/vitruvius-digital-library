/* Vitruvius Digital Library — non-destructive academic image ruler.
 * Measures distances between two points in the ORIGINAL raster (digital px).
 * Optional manual calibration from a known segment in mm is explicitly
 * approximate; no physical scale or manuscript dimensions are inferred.
 * Add data-academic-ruler-image="#image-id" to an image viewport.
 */
(function () {
 "use strict";
 if (window.VitruviusAcademicImageRuler) return;
 const NS = "http://www.w3.org/2000/svg";
 const css = `
 .vdl-ar-controls{position:absolute;z-index:991;top:9px;right:9px;display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:5px;max-width:calc(100% - 18px);font:12px/1.35 system-ui,Arial,sans-serif;color:#f7f5ef}
 .vdl-ar-controls button,.vdl-ar-controls input{font:inherit;min-height:30px;box-sizing:border-box;border-radius:4px;border:1px solid #8f99a2;padding:4px 7px}
 .vdl-ar-controls button{color:#fff;background:#25394c;cursor:pointer}
 .vdl-ar-controls button[aria-pressed=true]{background:#9b7844;color:#fff;border-color:#f7dba6}
 .vdl-ar-controls input{color:#152738;background:#fff;width:104px}
 .vdl-ar-info{background:rgba(22,30,37,.93);border:1px solid #8f99a2;padding:5px 8px;border-radius:4px;white-space:normal;max-width:340px}
 .vdl-ar-overlay{position:absolute;inset:0;z-index:990;pointer-events:none;overflow:hidden}
 .vdl-ar-overlay svg{display:block;width:100%;height:100%;overflow:visible}
 .vdl-ar-controls [hidden]{display:none!important}
 `;
 function installStyle() {
  if (document.getElementById("vdl-academic-ruler-css")) return;
  const st = document.createElement("style");
  st.id = "vdl-academic-ruler-css";
  st.textContent = css;
  document.head.appendChild(st);
 }
 const el = (tag,cls,txt) => {
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(txt!=null)node.textContent=txt;
  return node;
 };
 const svgEl = tag => document.createElementNS(NS,tag);
 const format = n => new Intl.NumberFormat("es-AR",{maximumFractionDigits:1}).format(n);
 function mount(stage) {
  if (!stage || stage.dataset.academicRulerMounted==="1") return;
  const selector=stage.getAttribute("data-academic-ruler-image");
  const img=selector && document.querySelector(selector);
  if (!img || !stage.contains(img)) return;
  stage.dataset.academicRulerMounted="1";
  installStyle();
  if (getComputedStyle(stage).position==="static") stage.style.position="relative";
  const controls=el("div","vdl-ar-controls");
  const toggle=el("button","", "Regla");
  toggle.type="button";toggle.setAttribute("aria-pressed","false");
  toggle.setAttribute("aria-label","Activar regla académica para medir un segmento del folio");
  const info=el("span","vdl-ar-info","Arrastra entre dos puntos del folio");
  info.setAttribute("role","status"); info.hidden=true;
  const mmInput=el("input");
  mmInput.type="number";mmInput.min="0.0001";mmInput.step="any";mmInput.placeholder="Distancia mm";
  mmInput.title="Distancia documentada en milímetros del segmento que acaba de medir";
  mmInput.setAttribute("aria-label","Distancia real conocida del segmento, en milímetros");
  mmInput.hidden=true;
  const calibrate=el("button","","Calibrar");
  calibrate.type="button";
  calibrate.title="La calibración es aproximada y solo vale para esta imagen";
  calibrate.hidden=true;
  const clear=el("button","","Borrar");
  clear.type="button";clear.hidden=true;
  controls.append(toggle,info,mmInput,calibrate,clear);
  const overlay=el("div","vdl-ar-overlay");
  overlay.setAttribute("aria-hidden","true");
  overlay.hidden=true;
  const svg=svgEl("svg");
  const halo=svgEl("line"), line=svgEl("line"), a=svgEl("circle"), b=svgEl("circle");
  halo.setAttribute("stroke","#171717"); halo.setAttribute("stroke-width","5");
  line.setAttribute("stroke","#f5df9d");line.setAttribute("stroke-width","2.5");
  for (const circle of [a,b]) {circle.setAttribute("r","4");circle.setAttribute("fill","#f5df9d");circle.setAttribute("stroke","#171717");circle.setAttribute("stroke-width","1.5");}
  svg.append(halo,line,a,b);overlay.append(svg);
  stage.append(overlay,controls);
  let active=false, drawing=false, start=null, end=null, mmPerPx=null, src=img.getAttribute("src")||"";
  let scheduled=false;
  function sourceRect() {
   if(!img.naturalWidth || !img.naturalHeight || img.hidden) return null;
   const rect=img.getBoundingClientRect();
   if(rect.width<=0 || rect.height<=0) return null;
   let w=rect.width,h=rect.height,x=rect.left,y=rect.top;
   // For object-fit:contain, exclude letterboxing from the measurement.
   if(getComputedStyle(img).objectFit==="contain"){
    const ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight);
    const pw=img.naturalWidth*ratio,ph=img.naturalHeight*ratio;
    x+=(w-pw)/2;y+=(h-ph)/2;w=pw;h=ph;
   }
   return {x,y,w,h};
  }
  const coords=(e,strict)=>{
   const r=sourceRect();if(!r)return null;
   const u=(e.clientX-r.x)/r.w,v=(e.clientY-r.y)/r.h;
   if(strict && (u<0||u>1||v<0||v>1))return null;
   return {u:Math.min(1,Math.max(0,u)),v:Math.min(1,Math.max(0,v))};
  };
  const length=()=>!start||!end?0:Math.hypot(
   (end.u-start.u)*img.naturalWidth,(end.v-start.v)*img.naturalHeight);
  function place(e,p,rect,st) {
   const x=rect.x+rect.w*p.u-st.left;
   const y=rect.y+rect.h*p.v-st.top;
   e.setAttribute("cx",x);e.setAttribute("cy",y);
   return {x,y};
  }
  function redraw(){
   const rect=sourceRect(),st=stage.getBoundingClientRect();
   svg.setAttribute("viewBox",`0 0 ${Math.max(1,st.width)} ${Math.max(1,st.height)}`);
   const visible=Boolean(active && start && end && rect);
   overlay.hidden=!visible;
   if(visible){
    const p=place(a,start,rect,st),q=place(b,end,rect,st);
    for(const seg of [halo,line]){
     seg.setAttribute("x1",p.x);seg.setAttribute("y1",p.y);
     seg.setAttribute("x2",q.x);seg.setAttribute("y2",q.y);
    }
   }
   if(active){
    const n=length();
    info.textContent=!start?"Arrastra entre dos puntos del folio":
     !end?"Suelta el puntero para medir":
     `${format(n)} px digitales${mmPerPx ? " · "+format(n*mmPerPx)+" mm (calibración orientativa)" : " · sin escala física verificada"}`;
    mmInput.hidden=!end;calibrate.hidden=!end;clear.hidden=!start;
   }
  }
  function schedule(){
   if(scheduled)return;
   scheduled=true;
   (window.requestAnimationFrame||function(fn){return Promise.resolve().then(fn)})(()=>{
    scheduled=false;redraw();
   });
  }
  function reset(){
   drawing=false;start=null;end=null;mmPerPx=null;
   mmInput.value="";redraw();
  }
  function setActive(next){
   active=Boolean(next);
   toggle.setAttribute("aria-pressed",String(active));
   info.hidden=!active;clear.hidden=!active||!start;
   if(!active){drawing=false;mmInput.hidden=true;calibrate.hidden=true;}
   redraw();
  }
  toggle.addEventListener("click",()=>setActive(!active));
  clear.addEventListener("click",reset);
  calibrate.addEventListener("click",()=>{
   const mm=Number(mmInput.value),px=length();
   if(!Number.isFinite(mm)||mm<=0||!Number.isFinite(px)||px<1){
    info.textContent="Introduce la longitud real conocida del segmento en mm.";
    return;
   }
   mmPerPx=mm/px;
   redraw();
  });
  stage.addEventListener("pointerdown",e=>{
   if(!active || controls.contains(e.target))return;
   const p=coords(e,true);if(!p)return;
   e.preventDefault();e.stopImmediatePropagation();
   drawing=true;start=p;end=p;mmPerPx=null;mmInput.value="";
   if(stage.setPointerCapture)try{stage.setPointerCapture(e.pointerId)}catch{}
   redraw();
  },true);
  stage.addEventListener("pointermove",e=>{
   if(!active||!drawing)return;
   e.preventDefault();e.stopImmediatePropagation();
   end=coords(e,false)||end;redraw();
  },true);
  const done=e=>{
   if(!active||!drawing)return;
   e.preventDefault();e.stopImmediatePropagation();
   end=coords(e,false)||end; drawing=false;redraw();
  };
  stage.addEventListener("pointerup",done,true);
  stage.addEventListener("pointercancel",done,true);
  img.addEventListener("load",schedule);
  stage.addEventListener("scroll",schedule,{passive:true});
  window.addEventListener("resize",schedule);
  if(typeof ResizeObserver==="function"){
   const ro=new ResizeObserver(schedule);ro.observe(stage);ro.observe(img);
  }
  if(typeof MutationObserver==="function"){
   const mo=new MutationObserver(()=>{
    const now=img.getAttribute("src")||"";
    if(now!==src){src=now;reset();}
    schedule();
   });
   mo.observe(img,{attributes:true,attributeFilter:["src","style","class","hidden"]});
  }
  redraw();
 }
 function start(){
  document.querySelectorAll("[data-academic-ruler-image]").forEach(mount);
 }
 window.VitruviusAcademicImageRuler={mount,start};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});
 else start();
})();