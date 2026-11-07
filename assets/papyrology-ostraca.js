/* Papyrologia et Ostraca: no user image is uploaded to Vitruvia or GitHub.
   Local optical analysis and optional local WASM OCR; never a certified transcription. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const original=document.createElement("canvas"),base=original.getContext("2d",{willReadFrequently:true});
const canvas=$("pap-image"),ctx=canvas.getContext("2d",{willReadFrequently:true});
const loupe=$("pap-loupe"),loupeCtx=loupe.getContext("2d");
const detail=$("pap-detail"),detailCtx=detail.getContext("2d");
const stage=$("pap-stage");
const status=$("pap-status"),file=$("pap-file"),text=$("pap-transcription");
let available=false,zoom=1,rotation=0,worker=null,running=false,objectUrl=null;
const state={invert:false,gray:false,sepia:false,edge:false,saturation:100,contrast:100,brightness:100,hue:0,bg:"#282c30"};
const cap=clamp=>(Number.isFinite(clamp)?Math.max(0,Math.min(255,clamp)):0);
function filterText(){return [
 state.invert?"invert(1)":"",
 state.gray?"grayscale(1)":"",
 state.sepia?"sepia(1)":"",
 "saturate("+state.saturation+"%)",
 "contrast("+state.contrast+"%)",
 "brightness("+state.brightness+"%)",
 "hue-rotate("+state.hue+"deg)"
].filter(Boolean).join(" ")}
function show(){
 if(!available)return;
 canvas.width=rotation%180?original.height:original.width;
 canvas.height=rotation%180?original.width:original.height;
 ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.translate(canvas.width/2,canvas.height/2);
 ctx.rotate(rotation*Math.PI/180);
 ctx.filter=filterText();
 ctx.drawImage(original,-original.width/2,-original.height/2);
 ctx.restore();
 if(state.edge){
  // Local edge-enhancement kernel for faint incisions; original bitmap untouched.
  const image=ctx.getImageData(0,0,canvas.width,canvas.height);
  const pixels=image.data,w=canvas.width,h=canvas.height;
  const source=new Uint8ClampedArray(pixels);
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const i=(y*w+x)*4,left=i-4,right=i+4,up=i-w*4,down=i+w*4;
   for(let k=0;k<3;k++)pixels[i+k]=cap(source[i+k]*2.9-(source[left+k]+source[right+k]+source[up+k]+source[down+k])*.475);
  }
  ctx.putImageData(image,0,0);
 }
 canvas.style.width=Math.round(canvas.width*zoom)+"px";
 canvas.style.height=Math.round(canvas.height*zoom)+"px";
 stage.style.background=state.bg;
 $("pap-zoom-value").textContent=Math.round(zoom*100)+" %";
 paintDetail(canvas.width/2,canvas.height/2);
}
function paintDetail(x,y){
 if(!available)return;
 const rectSize=Math.max(15,Math.min(150,72/zoom));
 const sx=Math.max(0,Math.min(canvas.width-rectSize,x-rectSize/2));
 const sy=Math.max(0,Math.min(canvas.height-rectSize,y-rectSize/2));
 detailCtx.clearRect(0,0,detail.width,detail.height);
 detailCtx.imageSmoothingEnabled=false;
 detailCtx.drawImage(canvas,sx,sy,rectSize,rectSize,0,0,detail.width,detail.height);
}
function inspect(ev){
 if(!available)return;
 const r=canvas.getBoundingClientRect();
 const x=(ev.clientX-r.left)/r.width*canvas.width;
 const y=(ev.clientY-r.top)/r.height*canvas.height;
 if(x<0||y<0||x>canvas.width||y>canvas.height)return;
 paintDetail(x,y);
 const mode=$("pap-loupe-mode").value;if(mode==="off"){loupe.style.display="none";return}
 const power=Number($("pap-loupe-power").value)||4;
 loupe.classList.toggle("rect",mode==="rect");
 const cssW=mode==="rect"?240:195,cssH=mode==="rect"?155:195;
 const srW=cssW/power/zoom,srH=cssH/power/zoom;
 const sx=Math.max(0,Math.min(canvas.width-srW,x-srW/2));
 const sy=Math.max(0,Math.min(canvas.height-srH,y-srH/2));
 loupeCtx.clearRect(0,0,loupe.width,loupe.height);loupeCtx.imageSmoothingEnabled=false;
 loupeCtx.drawImage(canvas,sx,sy,srW,srH,0,0,loupe.width,loupe.height);
 loupe.style.left=Math.max(5,Math.min(innerWidth-cssW-8,ev.clientX+18))+"px";
 loupe.style.top=Math.max(5,Math.min(innerHeight-cssH-8,ev.clientY+18))+"px";
 loupe.style.display="block";
}
canvas.addEventListener("pointermove",inspect);
canvas.addEventListener("pointerdown",inspect);
canvas.addEventListener("pointerleave",()=>{loupe.style.display="none"});
stage.addEventListener("scroll",()=>{loupe.style.display="none"},{passive:true});
function reset(){
 Object.assign(state,{invert:false,gray:false,sepia:false,edge:false,saturation:100,contrast:100,brightness:100,hue:0,bg:"#282c30"});
 rotation=0;zoom=1;
 for(const key of ["saturation","contrast","brightness","hue"])$("pap-"+key).value=state[key];
 $("pap-bg").value=state.bg;
 for(const key of ["invert","gray","sepia","edge"])$("pap-"+key).setAttribute("aria-pressed","false");
 for(const key of ["saturation","contrast","brightness","hue"])$("pap-"+key+"-value").textContent=state[key]+(key==="hue"?"°":" %");
 show();
}
async function openImage(f){
 if(!f)return;
 if(!/^image\/(png|jpeg|webp|bmp|gif)$/i.test(f.type)||f.size>30*1024*1024){status.textContent="Formato no admitido o imagen mayor de 30 MB.";return}
 const url=URL.createObjectURL(f),img=new Image();
 try{
  await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error("No se pudo decodificar la imagen."));img.src=url});
  if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>35000000)throw Error("Imagen demasiado grande: máximo 35 megapíxeles.");
  const shrink=Math.min(1,2400/Math.max(img.naturalWidth,img.naturalHeight));
  original.width=Math.max(1,Math.round(img.naturalWidth*shrink));
  original.height=Math.max(1,Math.round(img.naturalHeight*shrink));
  base.clearRect(0,0,original.width,original.height);base.drawImage(img,0,0,original.width,original.height);
  available=true;reset();
  zoom=Math.max(.25,Math.min(1,Math.round((stage.clientWidth-22)/original.width*100)/100));show();
  $("pap-ocr").disabled=false;$("pap-ocr-detail").disabled=false;
  status.textContent="Imagen abierta localmente: "+f.name+" · "+img.naturalWidth+" × "+img.naturalHeight+" píxeles. Usa las lupas o solicita OCR experimental.";
 }catch(e){status.textContent=e.message||"Imagen no válida."}finally{URL.revokeObjectURL(url)}
}
file.addEventListener("change",()=>{void openImage(file.files?.[0])});
for(const key of ["invert","gray","sepia","edge"])$("pap-"+key).addEventListener("click",()=>{
 state[key]=!state[key];$("pap-"+key).setAttribute("aria-pressed",String(state[key]));show();
});
for(const key of ["saturation","contrast","brightness","hue"])$("pap-"+key).addEventListener("input",e=>{
 state[key]=Number(e.target.value);$("pap-"+key+"-value").textContent=state[key]+(key==="hue"?"°":" %");show();
});
$("pap-bg").addEventListener("input",e=>{state.bg=e.target.value;show()});
$("pap-zoom-in").addEventListener("click",()=>{zoom=Math.min(8,Math.round((zoom+.25)*100)/100);show()});
$("pap-zoom-out").addEventListener("click",()=>{zoom=Math.max(.25,Math.round((zoom-.25)*100)/100);show()});
$("pap-rotate").addEventListener("click",()=>{rotation=(rotation+90)%360;show()});
$("pap-reset").addEventListener("click",reset);
$("pap-loupe-mode").addEventListener("change",()=>loupe.style.display="none");
function save(blob,filename){
 if(!blob)return;
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$("pap-export").addEventListener("click",()=>{if(!available){status.textContent="Primero carga una imagen.";return}canvas.toBlob(blob=>save(blob,"papyrologia-procesada.png"),"image/png")});
function graphemes(value){
 const container=$("pap-graphemes");container.replaceChildren();
 const segmenter=typeof Intl.Segmenter==="function"?new Intl.Segmenter("und",{granularity:"grapheme"}):null;
 const chars=segmenter?[...segmenter.segment(value)].map(x=>x.segment):Array.from(value);
 for(const ch of chars.slice(0,1500)){
  if(ch==="\n"||/^\s+$/.test(ch))continue;
  const b=document.createElement("button");b.type="button";b.textContent=ch;b.title="Insertar el signo "+ch;
  b.addEventListener("click",()=>{
   const start=text.selectionStart,end=text.selectionEnd;
   text.setRangeText(ch,start,end,"end");text.focus();graphemes(text.value);
  });container.append(b);
 }
}
text.addEventListener("input",()=>graphemes(text.value));
$("pap-copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(text.value);status.textContent="Transcripción copiada."}catch{status.textContent="No fue posible copiar: selecciona el texto manualmente."}});
$("pap-txt").addEventListener("click",()=>save(new Blob([text.value],{type:"text/plain;charset=utf-8"}),"transcripcion-papyrologia.txt"));
$("pap-clear").addEventListener("click",()=>{text.value="";graphemes("");text.focus()});
let tesseractPromise=null;

function loadTesseract(){
 if(window.Tesseract?.createWorker)return Promise.resolve(window.Tesseract);
 if(!tesseractPromise)tesseractPromise=new Promise((resolve,reject)=>{
  const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js";
  script.crossOrigin="anonymous";script.referrerPolicy="no-referrer";
  script.onload=()=>window.Tesseract?.createWorker?resolve(window.Tesseract):reject(Error("Motor OCR sin inicializar"));
  script.onerror=()=>reject(Error("No se pudo descargar el motor OCR. Comprueba conexión o bloqueadores."));
  document.head.append(script);
 }).catch(e=>{tesseractPromise=null;throw e});
 return tesseractPromise;
}
async function recognize(target){
 if(!available||running)return;
 running=true;$("pap-ocr").disabled=true;$("pap-ocr-detail").disabled=true;$("pap-cancel").disabled=false;
 const lang=$("pap-ocr-lang").value;
 status.textContent="Descargando OCR y modelo "+lang+"; procesamiento de la imagen local en curso…";
 try{
  const engine=await loadTesseract();
  if(!running)return;
  worker=await engine.createWorker(lang,1,{logger:m=>{if(running&&m.status)status.textContent="OCR local: "+m.status+" "+(m.progress?Math.round(m.progress*100)+" %":"")}});
  if(!running){await worker.terminate();worker=null;return}
  const output=await worker.recognize(target);
  if(!running)return;
  const hypothesis=String(output.data?.text||"").trim();
  if(target===detail&&text.value.trim())text.value+="\n"+hypothesis;else text.value=hypothesis;
  graphemes(text.value);
  status.textContent=hypothesis?
   "Hipótesis OCR generada localmente; revisa signo por signo y confirma sobre la imagen original.":
   "OCR terminado, pero no identificó signos fiables. Prueba inversión, contraste, otra región o transcripción manual.";
 }catch(e){status.textContent="OCR no disponible: "+(e.message||e)}
 finally{running=false;$("pap-ocr").disabled=!available;$("pap-ocr-detail").disabled=!available;$("pap-cancel").disabled=true;if(worker){const old=worker;worker=null;void old.terminate().catch(()=>{})}}
}
$("pap-ocr").addEventListener("click",()=>{void recognize(canvas)});
$("pap-ocr-detail").addEventListener("click",()=>{void recognize(detail)});
$("pap-cancel").addEventListener("click",()=>{
 running=false;$("pap-cancel").disabled=true;$("pap-ocr").disabled=!available;$("pap-ocr-detail").disabled=!available;
 if(worker){const old=worker;worker=null;void old.terminate().catch(()=>{})}
 status.textContent="OCR cancelado. La imagen local y la transcripción manual se conservan.";
});
ctx.fillStyle="#282c30";ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.fillStyle="#f4e8cf";ctx.font="24px Georgia, serif";ctx.textAlign="center";ctx.fillText("Carga un papiro, óstracon o fragmento",canvas.width/2,canvas.height/2);
detailCtx.fillStyle="#222";detailCtx.fillRect(0,0,detail.width,detail.height);
detailCtx.fillStyle="#ddd";detailCtx.font="17px Georgia";detailCtx.fillText("Detalle ampliado",140,detail.height/2);
})();
