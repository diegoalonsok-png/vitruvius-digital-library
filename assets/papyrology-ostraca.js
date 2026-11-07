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

const languageOptions={
 grc:{model:"grc",dir:"ltr",lang:"grc",label:"Griego antiguo: reconocimiento orientativo; confirmar cada signo."},
 lat:{model:"lat",dir:"ltr",lang:"la",label:"Latín: reconocimiento orientativo; abreviaturas y cursivas requieren lectura especializada."},
 eng:{model:"eng",dir:"ltr",lang:"en",label:"Alfabeto latino moderno: modelo comparativo, no paleográfico."},
 heb:{model:"heb",dir:"rtl",lang:"he",label:"Hebreo (heb): reconoce principalmente escritura hebrea impresa; manuscritos y óstraca antiguos requieren cotejo."},
 paleoheb:{model:null,dir:"rtl",lang:"hbo",label:"Paleohebreo: comparación manual de glifos; no hay reconocimiento OCR especializado verificado."},
 phn:{model:null,dir:"rtl",lang:"phn",label:"Fenicio: comparación manual de glifos; no hay reconocimiento OCR especializado verificado."},
 "arc-heb":{model:"heb",dir:"rtl",lang:"arc",label:"Arameo en grafía hebrea: se prueba el modelo heb, que NO reconoce el idioma arameo como tal. Escritos paleoarameos y otras grafías requieren modelos especializados."},
 syr:{model:"syr",dir:"rtl",lang:"syr",label:"Arameo siríaco (syr): modelo para escritura siríaca. No sirve para todas las escrituras arameas antiguas."}
};
const phoenicianSigns=Array.from({length:22},(_,i)=>String.fromCodePoint(0x10900+i));
const hebrewSigns=Array.from("אבגדהוזחטיכלמנסעפצקרשת");
const signNames="alef bet gimel dalet he waw zayin het tet yod kaf lamed mem nun samekh ayin pe tsade qof resh shin taw".split(" ");
function renderAncientSigns(mode){
 const panel=$("pap-ancient-alphabet"),list=$("pap-ancient-signs");
 panel.hidden=!["phn","paleoheb"].includes(mode);list.replaceChildren();
 if(panel.hidden)return;
 for(let i=0;i<22;i++){
  const b=document.createElement("button"),big=document.createElement("span"),small=document.createElement("small");
  b.type="button";big.textContent=phoenicianSigns[i];small.textContent=signNames[i]+" · "+hebrewSigns[i];
  b.append(big,small);b.title="Glifo Unicode de comparación; verificar variantes arqueológicas";
  b.addEventListener("click",()=>{
   const letter=$("pap-build-letter");letter.value=phoenicianSigns[i];
   $("pap-build-script").value=mode;$("pap-build-script").dispatchEvent(new Event("change",{bubbles:true}));
   letter.focus();
  });list.append(b);
 }
}
function updateScript(){
 const choice=languageOptions[$("pap-ocr-lang").value]||languageOptions.grc;
 text.dir=choice.dir;text.lang=choice.lang;
 $("pap-graphemes").dir=choice.dir;
 $("pap-script-note").textContent=choice.label;
 renderAncientSigns($("pap-ocr-lang").value);
 $("pap-ocr").disabled=!available||!choice.model||running;
 $("pap-ocr-detail").disabled=!available||!choice.model||running;
 return choice;
}
$("pap-ocr-lang").addEventListener("change",updateScript);

let available=false,zoom=1,rotation=0,worker=null,running=false,objectUrl=null;
updateScript();
const state={invert:false,gray:false,sepia:false,edge:false,saturation:100,contrast:100,brightness:100,hue:0,bg:"#282c30",exposure:0,shadows:0,highlights:0,gamma:100,clarity:0,sharpness:0,originalPreview:false,levelLight:false,extractBlack:false,lightStrength:75,blackLimit:115};
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
const tonalKeys=["exposure","shadows","highlights","gamma","clarity","sharpness"];
function tonalDisplay(k,value){return k==="gamma"?(value/100).toFixed(2).replace(".",","):String(value)}
function updateTonalUI(){
 for(const k of tonalKeys){$("pap-tone-"+k).value=state[k];$("pap-tone-"+k+"-value").textContent=tonalDisplay(k,state[k])}
 $("pap-tone-original").setAttribute("aria-pressed",String(state.originalPreview));
}
function applyTonalControls(){
 if(state.originalPreview)return;
 const hasTone=state.exposure!==0||state.shadows!==0||state.highlights!==0||state.gamma!==100;
 const hasDetail=state.clarity>0||state.sharpness>0;
 if(!hasTone&&!hasDetail)return;
 const w=canvas.width,h=canvas.height,im=ctx.getImageData(0,0,w,h),data=im.data;
 // Look-up table applied to R,G,B equally, preserving the original channel ratios.
 if(hasTone){
  const lut=new Uint8ClampedArray(256),exposure=Math.pow(2,state.exposure/100),
    gamma=state.gamma/100,shadow=state.shadows/100,highlight=state.highlights/100;
  for(let i=0;i<256;i++){
   let v=Math.min(1,i/255*exposure);
   v=Math.pow(v,1/gamma);
   v+=shadow*.40*Math.pow(1-v,2)+highlight*.40*v*v;
   lut[i]=cap(v*255);
  }
  for(let i=0;i<data.length;i+=4){data[i]=lut[data[i]];data[i+1]=lut[data[i+1]];data[i+2]=lut[data[i+2]]}
 }
 // Optional light local sharpening. Use only a 4-neighbour unsharp mask,
 // so the work is bounded to one canvas and the input remains unchanged.
 if(hasDetail&&w>2&&h>2){
  const originalData=new Uint8ClampedArray(data),amount=.8*state.sharpness/100+.45*state.clarity/100;
  for(let y=1;y<h-1;y++){
   for(let x=1;x<w-1;x++){
    const i=(y*w+x)*4;
    for(let k=0;k<3;k++){
     const local=(originalData[i-4+k]+originalData[i+4+k]+originalData[i-w*4+k]+originalData[i+w*4+k])/4;
     data[i+k]=cap(originalData[i+k]+(originalData[i+k]-local)*amount);
    }
   }
  }
 }
 ctx.putImageData(im,0,0);
}
for(const k of tonalKeys)$("pap-tone-"+k).addEventListener("input",e=>{
 state[k]=Number(e.target.value);$("pap-tone-"+k+"-value").textContent=tonalDisplay(k,state[k]);show();
});
$("pap-tone-papyrus").addEventListener("click",()=>{
 Object.assign(state,{exposure:16,shadows:35,highlights:-30,gamma:110,clarity:30,sharpness:12,originalPreview:false});
 updateTonalUI();show();
});
$("pap-tone-engraved").addEventListener("click",()=>{
 Object.assign(state,{exposure:-5,shadows:22,highlights:-34,gamma:95,clarity:65,sharpness:48,originalPreview:false});
 updateTonalUI();show();
});
$("pap-tone-reset").addEventListener("click",()=>{
 Object.assign(state,{exposure:0,shadows:0,highlights:0,gamma:100,clarity:0,sharpness:0,originalPreview:false});
 updateTonalUI();show();
});
$("pap-tone-original").addEventListener("click",()=>{
 state.originalPreview=!state.originalPreview;updateTonalUI();show();
});

/* Local uneven-illumination correction; prefix sums estimate the diffuse support
 * brightness, while the source document remains unchanged. */
function applyLightLevelAndBlack(){
 if(state.originalPreview||(!state.levelLight&&!state.extractBlack))return;
 const w=canvas.width,h=canvas.height,N=w*h;
 const im=ctx.getImageData(0,0,w,h),p=im.data;
 const lum=new Uint8Array(N),stride=w+1,integral=new Float64Array((w+1)*(h+1));
 for(let y=0;y<h;y++){
  let row=0;
  for(let x=0;x<w;x++){
   const i=y*w+x,k=i*4;
   const v=.2126*p[k]+.7152*p[k+1]+.0722*p[k+2];
   lum[i]=v;row+=v;integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+row;
  }
 }
 const radius=Math.max(15,Math.round(Math.min(w,h)/15));
 const strength=state.levelLight?state.lightStrength/100:0;
 const limitBlack=state.blackLimit;
 for(let y=0;y<h;y++){
  const y0=Math.max(0,y-radius),y1=Math.min(h,y+radius+1);
  for(let x=0;x<w;x++){
   const x0=Math.max(0,x-radius),x1=Math.min(w,x+radius+1),i=y*w+x,k=i*4;
   const mean=(integral[y1*stride+x1]-integral[y0*stride+x1]-integral[y1*stride+x0]+integral[y0*stride+x0])/((x1-x0)*(y1-y0));
   // Local shading removal targets a consistent paper brightness.
   const normalized=cap(lum[i]+(185-mean)*strength);
   if(state.extractBlack){
    const ink=normalized<limitBlack?0:255;
    p[k]=ink;p[k+1]=ink;p[k+2]=ink;p[k+3]=255;
   }else if(state.levelLight){
    const delta=normalized-lum[i];
    p[k]=cap(p[k]+delta);p[k+1]=cap(p[k+1]+delta);p[k+2]=cap(p[k+2]+delta);
   }
  }
 }
 ctx.putImageData(im,0,0);
}
function updateLightUI(){
 $("pap-light-level").setAttribute("aria-pressed",String(state.levelLight));
 $("pap-black-extract").setAttribute("aria-pressed",String(state.extractBlack));
 $("pap-light-strength").value=state.lightStrength;
 $("pap-light-strength-value").textContent=state.lightStrength+" %";
 $("pap-black-limit").value=state.blackLimit;
 $("pap-black-limit-value").textContent=String(state.blackLimit);
}
$("pap-light-level").addEventListener("click",()=>{state.levelLight=!state.levelLight;state.originalPreview=false;updateTonalUI();updateLightUI();show()});
$("pap-black-extract").addEventListener("click",()=>{state.extractBlack=!state.extractBlack;state.originalPreview=false;updateTonalUI();updateLightUI();show()});
$("pap-black-level-reset").addEventListener("click",()=>{Object.assign(state,{levelLight:false,extractBlack:false,lightStrength:75,blackLimit:115});updateLightUI();show()});
$("pap-light-strength").addEventListener("input",e=>{state.lightStrength=Number(e.target.value);updateLightUI();show()});
$("pap-black-limit").addEventListener("input",e=>{state.blackLimit=Number(e.target.value);updateLightUI();show()});

function show(){
 if(!available)return;
 canvas.width=rotation%180?original.height:original.width;
 canvas.height=rotation%180?original.width:original.height;
 ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.translate(canvas.width/2,canvas.height/2);
 ctx.rotate(rotation*Math.PI/180);
 ctx.filter=state.originalPreview?"none":filterText();
 ctx.drawImage(original,-original.width/2,-original.height/2);
 ctx.restore();
 if(!state.originalPreview&&state.edge){
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
 applyTonalControls();
 applyLightLevelAndBlack();
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
 Object.assign(state,{invert:false,gray:false,sepia:false,edge:false,saturation:100,contrast:100,brightness:100,hue:0,bg:"#282c30",exposure:0,shadows:0,highlights:0,gamma:100,clarity:0,sharpness:0,originalPreview:false});
 Object.assign(state,{levelLight:false,extractBlack:false,lightStrength:75,blackLimit:115});
 updateTonalUI();updateLightUI();
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
  updateScript();
  status.textContent="Imagen abierta localmente: "+f.name+" · "+img.naturalWidth+" × "+img.naturalHeight+" píxeles. Usa las lupas o solicita OCR experimental.";
 }catch(e){status.textContent=e.message||"Imagen no válida."}finally{URL.revokeObjectURL(url)}
}
file.addEventListener("change",()=>{void openImage(file.files?.[0])});

/* Local drop zone. The same file input and validation are reused, so
   extraction, masks, and OCR operate identically for dropped and picked images. */
let dropDepth=0;
const imagePayload=e=>Array.from(e.dataTransfer?.items||[]).some(item=>item.kind==="file")||
 Array.from(e.dataTransfer?.types||[]).includes("Files");
const setDragMode=active=>{
 stage.classList.toggle("pap-drag-over",active);
 $("pap-drop-hint").setAttribute("aria-hidden",String(!active));
};
stage.addEventListener("dragenter",e=>{
 if(!imagePayload(e))return;
 e.preventDefault();dropDepth++;setDragMode(true);
});
stage.addEventListener("dragover",e=>{
 if(!imagePayload(e))return;
 e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect="copy";setDragMode(true);
});
stage.addEventListener("dragleave",e=>{
 if(!imagePayload(e))return;
 e.preventDefault();dropDepth=Math.max(0,dropDepth-1);
 if(!dropDepth)setDragMode(false);
});
stage.addEventListener("drop",e=>{
 e.preventDefault();dropDepth=0;setDragMode(false);
 const dropped=Array.from(e.dataTransfer?.files||[]);
 if(dropped.length!==1){
  status.textContent=dropped.length?"Soltá una sola imagen por vez.":"No se detectó un archivo de imagen.";
  return;
 }
 const selected=dropped[0];
 // file.files is writable with an explicit user drop, in supported browsers.
 // The in-memory shared input is used by the independent ink extraction module.
 try{
  const transfer=new DataTransfer();transfer.items.add(selected);file.files=transfer.files;
 }catch{
  status.textContent="No se pudo sincronizar el selector de archivos con la imagen arrastrada.";
  return;
 }
 void openImage(selected);
});
stage.addEventListener("keydown",e=>{
 if(e.key!=="Enter"&&e.key!==" ")return;
 e.preventDefault();file.click();
});

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

$("pap-export-detail").addEventListener("click",()=>{
 if(!available){status.textContent="Primero carga una imagen y selecciona el detalle que deseas estudiar.";return}
 detail.toBlob(blob=>save(blob,"papyrologia-detalle-ampliado.png"),"image/png");
 status.textContent="Detalle guardado en tu dispositivo. Abre Google Lens o Gemini y adjunta el archivo manualmente.";
});
$("pap-copy-prompt").addEventListener("click",async()=>{
 const prompt="Actúa como asistente de paleografía, no como transcriptor infalible. Estudia este fragmento de papiro u óstracon. Determina si la escritura podría ser griega, latina, hebrea, aramea, paleohebrea o fenicia. Lee signo por signo y por renglón. Distingue lo visible de restituciones conjeturales, señala caracteres dudosos con [?], lagunas con […], propone alternativas para signos ambiguos y evita completar palabras por contexto sin indicarlo. Proporciona transcripción diplomática tentativa, transliteración y grado de incertidumbre por signo. No inventes fecha, autor, procedencia ni stemma; explica qué evidencia adicional se requiere.";
 try{await navigator.clipboard.writeText(prompt);status.textContent="Instrucciones de análisis visual copiadas para pegar en Gemini junto con la imagen."}
 catch{status.textContent="No se pudo copiar automáticamente; utiliza una conexión HTTPS y permite el portapapeles."}
});

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

/* Review a JSON hypothesis generated locally: no credentials, no uploads.
   Never render untrusted model output using innerHTML. */
const geminiInput=$("pap-gemini-json"),geminiReport=$("pap-gemini-import-report");
function displayGeminiHypothesis(payload){
 if(payload?.schema!=="vitruvia-papyrology-multimodal-draft-v1"||payload.verified!==false)
  throw Error("Formato inesperado: se requiere una hipótesis multimodal sin verificar.");
 const a=payload.analysis;
 if(!a||!Array.isArray(a.lines)||a.lines.length>150||a.lines.some(l=>!l||!Array.isArray(l.signs)||l.signs.length>250))
  throw Error("El JSON no tiene líneas y signos de lectura válidos.");
 const lines=a.lines.map((line,i)=>({
  number:Number.isInteger(line.line_number)?line.line_number:i+1,
  reading:String(line.diplomatic_text||"").slice(0,10000),
  signs:line.signs.map(g=>({
   sign:String(g.suggested||g.visible||"").slice(0,40),
   status:["clear","uncertain","lost"].includes(g.status)?g.status:"uncertain",
   alternatives:Array.isArray(g.alternatives)?g.alternatives.slice(0,3).map(x=>String(x).slice(0,40)):[]
  }))
 }));
 const formatSign=g=>g.status==="lost"?"[…]":g.status==="uncertain"?(g.sign||"?")+"[?]":g.sign;
 const diplomatic=lines.map(l=>l.reading||l.signs.map(formatSign).join("")).join("\n");
 if(!diplomatic.trim())throw Error("No se encontraron caracteres para importar.");
 if(text.value.trim()&&!window.confirm("¿Agregar la lectura automática al editor existente? Se conservará la transcripción anterior."))return;
 text.value=(text.value.trim()?text.value+"\n\n":"")+diplomatic;
 const dir=lines.find(l=>["rtl","ltr"].includes(a.lines.find(x=>x.line_number===l.number)?.reading_direction));
 if(dir)text.dir=a.lines.find(x=>x.line_number===dir.number).reading_direction;
 text.dispatchEvent(new Event("input",{bubbles:true}));
 const scripts=Array.isArray(a.writing_system_candidates)?a.writing_system_candidates.slice(0,3).map(x=>String(x.name||"").slice(0,70)).join(", "):"sin determinar";
 const languages=Array.isArray(a.language_candidates)?a.language_candidates.slice(0,3).map(x=>String(x.name||"").slice(0,70)).join(", "):"sin determinar";
 const uncertain=lines.reduce((sum,l)=>sum+l.signs.filter(x=>x.status!=="clear").length,0);
 geminiReport.textContent="LECTURA AUTOMÁTICA · NO VERIFICADA\n"+
  "Modelo: "+String(payload.model||"Gemini")+"\n"+
  "Escritura posible: "+scripts+"\n"+
  "Idioma posible: "+languages+"\n"+
  "Líneas: "+lines.length+" · signos marcados dudosos o perdidos: "+uncertain+"\n"+
  "Revisar manualmente cada trazo y la segmentación de palabras antes de citar.";
 status.textContent="Hipótesis Gemini importada al editor. No se ha certificado la lectura.";
}
geminiInput.addEventListener("change",async()=>{
 const file=geminiInput.files?.[0];if(!file)return;
 if(file.size>2_000_000){geminiReport.textContent="JSON demasiado grande (máximo 2 MB).";return}
 try{displayGeminiHypothesis(JSON.parse(await file.text()))}
 catch(err){geminiReport.textContent="No se pudo importar la lectura: "+err.message}
 finally{geminiInput.value=""}
});
$("pap-gemini-clear").addEventListener("click",()=>{
 geminiReport.textContent="Análisis importado limpiado de la vista. La transcripción manual se conserva.";
});

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
 const selected=updateScript(),lang=selected.model;
 if(!lang){running=false;$("pap-cancel").disabled=true;status.textContent="No hay OCR validado para esta escritura. Usa el comparador de glifos.";return}
 status.textContent="Descargando OCR "+lang+" ("+$("pap-ocr-lang").selectedOptions[0].textContent+"); procesamiento local en curso…";
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
   "Hipótesis OCR ("+lang+") generada localmente; revisa signo por signo y confirma sobre la imagen original.":
   "OCR terminado, pero no identificó signos fiables. Prueba inversión, contraste, otra región o transcripción manual.";
 }catch(e){status.textContent="OCR no disponible: "+(e.message||e)}
 finally{running=false;$("pap-cancel").disabled=true;updateScript();if(worker){const old=worker;worker=null;void old.terminate().catch(()=>{})}}
}
$("pap-ocr").addEventListener("click",()=>{void recognize(canvas)});
$("pap-ocr-detail").addEventListener("click",()=>{void recognize(detail)});
/* Only a deliberate click in the extraction panel starts OCR on its local black-on-white mask. */
document.addEventListener("vitruvia:ocr-extracted-mask",event=>{
 const mask=event.detail?.canvas;
 if(!(mask instanceof HTMLCanvasElement)||!mask.width||!mask.height)return;
 if(!available||running){status.textContent="Carga una imagen y finaliza el proceso anterior antes de iniciar OCR.";return}
 void recognize(mask);
});

$("pap-cancel").addEventListener("click",()=>{
 running=false;$("pap-cancel").disabled=true;updateScript();
 if(worker){const old=worker;worker=null;void old.terminate().catch(()=>{})}
 status.textContent="OCR cancelado. La imagen local y la transcripción manual se conservan.";
});
ctx.fillStyle="#282c30";ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.fillStyle="#f4e8cf";ctx.font="24px Georgia, serif";ctx.textAlign="center";ctx.fillText("Carga un papiro, óstracon o fragmento",canvas.width/2,canvas.height/2);
detailCtx.fillStyle="#222";detailCtx.fillRect(0,0,detail.width,detail.height);
detailCtx.fillStyle="#ddd";detailCtx.font="17px Georgia";detailCtx.fillText("Detalle ampliado",140,detail.height/2);
})();
