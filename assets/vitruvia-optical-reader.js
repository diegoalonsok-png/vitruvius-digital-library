/* Vitruvia · non-destructive optical reader for documented photographs.
 * CSS display adjustments only; no canvas, uploads, OCR or reconstructed signs. */
(()=>{"use strict";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const initial=()=>({zoom:100,contrast:100,brightness:100,invert:false,gray:false,lens:false,power:3,background:"#ffffff"});
function filter(s){return ["brightness("+s.brightness+"%)","contrast("+s.contrast+"%)",s.gray?"grayscale(100%)":"",s.invert?"invert(100%)":""].filter(Boolean).join(" ")}
function lensGeometry(x,y,w,h,power,size=180){
 const cx=clamp(x,0,w),cy=clamp(y,0,h);
 return {width:w*power,height:h*power,left:size/2-cx*power,top:size/2-cy*power};
}
function attach(stage,image,toolbar){
 if(!stage||!image||!toolbar||toolbar.dataset.opticalReader)return false;
 toolbar.dataset.opticalReader="1";toolbar.replaceChildren();
 toolbar.style.cssText="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0;font:12px/1.4 system-ui,sans-serif";
 stage.style.position="relative";stage.style.overflow="auto";stage.tabIndex=0;
 stage.setAttribute("aria-label","Documento ampliable; con la lupa activa, usa el puntero o las flechas del teclado");
 const state=initial(),button=(label,callback)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.style.cssText="font:inherit;color:inherit;background:transparent;border:1px solid #888;border-radius:5px;padding:7px 9px;cursor:pointer";b.addEventListener("click",callback);toolbar.append(b);return b};
 let cursor=null;
 const controls=[];
 function slider(label,key,min,max,step,suffix){
  const l=document.createElement("label"),input=document.createElement("input"),out=document.createElement("output");
  l.style.cssText="display:inline-flex;gap:5px;align-items:center;flex-wrap:wrap";l.append(document.createTextNode(label+" "));
  input.type="range";input.min=min;input.max=max;input.step=step;input.value=state[key];input.style.width="85px";input.setAttribute("aria-label",label);
  input.addEventListener("input",()=>{state[key]=Number(input.value);render()});l.append(input,out);toolbar.append(l);controls.push({key,input,out,suffix});
 }
 const lens=document.createElement("div");lens.hidden=true;lens.setAttribute("aria-hidden","true");
 lens.style.cssText="position:absolute;width:180px;height:180px;border:2px solid #9b8255;border-radius:50%;overflow:hidden;box-shadow:0 2px 12px #0009;pointer-events:none;z-index:10;background:#fff";
 const detail=document.createElement("img");detail.alt="";detail.draggable=false;detail.style.cssText="position:absolute;max-width:none!important;max-height:none!important;margin:0!important;display:block;pointer-events:none";lens.append(detail);stage.append(lens);
 function hide(){lens.hidden=true;lens.style.display="none"}
 function move(){
  if(!state.lens||!cursor||!image.naturalWidth||image.hidden){hide();return}
  const r=image.getBoundingClientRect(),v=stage.getBoundingClientRect(),x=cursor.x-r.left,y=cursor.y-r.top;
  if(x<0||y<0||x>r.width||y>r.height||cursor.x<v.left||cursor.y<v.top||cursor.x>v.right||cursor.y>v.bottom){hide();return}
  const g=lensGeometry(x,y,r.width,r.height,state.power);
  const l=clamp(cursor.x-v.left+stage.scrollLeft-90,stage.scrollLeft,Math.max(stage.scrollLeft,stage.scrollLeft+stage.clientWidth-180));
  const t=clamp(cursor.y-v.top+stage.scrollTop-90,stage.scrollTop,Math.max(stage.scrollTop,stage.scrollTop+stage.clientHeight-180));
  lens.style.left=l+"px";lens.style.top=t+"px";lens.style.display="block";lens.hidden=false;
  const src=image.currentSrc||image.src;if(detail.getAttribute("src")!==src)detail.src=src;
  detail.style.setProperty("width",g.width+"px","important");detail.style.setProperty("height",g.height+"px","important");
  detail.style.left=g.left+"px";detail.style.top=g.top+"px";detail.style.filter=filter(state);
 }
 const toggles=[];
 function toggle(label,key){const b=button(label,()=>{state[key]=!state[key];if(key==="lens"&&!state.lens)cursor=null;render()});toggles.push([b,key]);return b}
 button("−",()=>{state.zoom=clamp(state.zoom-25,50,600);render()});
 slider("Zoom","zoom",50,600,25,"%");
 button("+",()=>{state.zoom=clamp(state.zoom+25,50,600);render()});
 toggle("Lupa","lens");slider("Aumento de lupa","power",2,6,1,"×");
 toggle("Invertir","invert");toggle("Grises","gray");
 slider("Contraste","contrast",50,300,10,"%");slider("Brillo","brightness",50,200,10,"%");
 const backgrounds=document.createElement("select");backgrounds.setAttribute("aria-label","Fondo de lectura");
 for(const [label,color] of [["Blanco","#ffffff"],["Negro","#121212"],["Gris","#666666"],["Sepia","#e8dcc8"]]){const o=document.createElement("option");o.textContent=label;o.value=color;backgrounds.append(o)}
 backgrounds.addEventListener("change",()=>{state.background=backgrounds.value;render()});toolbar.append(backgrounds);
 button("Pantalla completa",()=>{if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});else stage.requestFullscreen?.().catch(()=>{})});
 button("Restablecer",()=>{Object.assign(state,initial());cursor=null;stage.scrollLeft=stage.scrollTop=0;render()});
 const note=document.createElement("small");note.textContent="Ajustes ópticos temporales; la imagen documental original no se altera. Lupa: activa y mueve el puntero o usa las flechas.";note.style.flexBasis="100%";toolbar.append(note);
 function render(){
  image.style.width=state.zoom+"%";image.style.maxWidth="none";image.style.height="auto";image.style.filter=filter(state);
  stage.style.background=state.background;backgrounds.value=state.background;
  for(const c of controls){c.input.value=state[c.key];c.out.textContent=state[c.key]+c.suffix}
  for(const [b,key] of toggles){b.setAttribute("aria-pressed",String(state[key]));b.style.fontWeight=state[key]?"700":"400"}
  if(!state.lens)hide();else move();
 }
 stage.addEventListener("pointermove",e=>{if(!state.lens)return;cursor={x:e.clientX,y:e.clientY};move()});
 stage.addEventListener("pointerdown",e=>{if(!state.lens)return;cursor={x:e.clientX,y:e.clientY};move()});
 stage.addEventListener("pointerleave",()=>{cursor=null;hide()});
 stage.addEventListener("scroll",()=>{if(state.lens)move()},{passive:true});
 stage.addEventListener("keydown",e=>{
  if(!state.lens||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Escape"].includes(e.key))return;
  if(e.key==="Escape"){state.lens=false;render();return}
  e.preventDefault();const r=stage.getBoundingClientRect();
  cursor??={x:r.left+stage.clientWidth/2,y:r.top+stage.clientHeight/2};
  cursor.x=clamp(cursor.x+(e.key==="ArrowRight"?12:e.key==="ArrowLeft"?-12:0),r.left+2,r.right-2);
  cursor.y=clamp(cursor.y+(e.key==="ArrowDown"?12:e.key==="ArrowUp"?-12:0),r.top+2,r.bottom-2);move();
 });
 image.addEventListener("load",()=>{cursor=null;hide()});image.addEventListener("error",hide);
 hide();render();return true;
}
window.VitruviaOpticalReader={attach,filter,lensGeometry,initial,version:"1.0"};
})();