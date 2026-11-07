/* Local, experimental document image processing. NOT a trained ancient-script recognizer.
   Input is the visitor's rendered image. No network requests or uploads. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const source=$("pap-image"),output=$("pap-ink-canvas"),out=output.getContext("2d",{willReadFrequently:true});
const status=$("pap-ink-status"),items=$("pap-ink-signs");
let ready=false,mask=null,segments=[];
const fields=["threshold","sensitivity","noise","clarity","gamma","highlights","shadows","exposure","sharpness"];
const defaults={threshold:135,sensitivity:12,noise:6,clarity:30,gamma:100,highlights:0,shadows:0,exposure:0,sharpness:0};
const value=k=>Number($("pap-ink-"+k).value),limit=(n,a=0,b=255)=>Math.max(a,Math.min(b,n));
function updateLabels(){for(const k of fields){const n=value(k);$("pap-ink-"+k+"-value").textContent=k==="gamma"?(n/100).toFixed(2).replace(".",","):String(n)}}
for(const k of fields)$("pap-ink-"+k).addEventListener("input",updateLabels);
function fill(values){for(const k of fields)$("pap-ink-"+k).value=values[k]??defaults[k];updateLabels()}
$("pap-ink-clean").addEventListener("click",()=>fill(defaults));
$("pap-ink-papyrus").addEventListener("click",()=>{$("pap-ink-mode").value="adaptive";fill({...defaults,threshold:155,sensitivity:18,clarity:55,shadows:22,highlights:-22,sharpness:18})});
$("pap-ink-ostracon").addEventListener("click",()=>{$("pap-ink-mode").value="edge";fill({...defaults,threshold:125,sensitivity:6,noise:9,clarity:65,sharpness:35})});
updateLabels();
const exportPNG=(canvas,name)=>canvas.toBlob(blob=>{
 if(!blob)return;
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
},"image/png");
function extract(){
 if(!$("pap-file").files?.length){status.textContent="Carga primero una fotografía en «Imagen local».";return}
 const w=Math.min(source.width,1500),h=Math.max(1,Math.round(source.height*w/source.width));
 if(!w||!h)return;
 const tmp=document.createElement("canvas");tmp.width=w;tmp.height=h;
 const g=tmp.getContext("2d",{willReadFrequently:true});g.fillStyle="#fff";g.fillRect(0,0,w,h);g.drawImage(source,0,0,w,h);
 const rgba=g.getImageData(0,0,w,h).data,N=w*h,gray=new Float32Array(N),integral=new Float64Array((w+1)*(h+1));
 const gamma=Math.max(.3,value("gamma")/100),exp=Math.pow(2,value("exposure")/100);
 const clarity=value("clarity")/100,hi=value("highlights"),sh=value("shadows"),sharp=value("sharpness")/100;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,k=i*4;
  let v=(.2126*rgba[k]+.7152*rgba[k+1]+.0722*rgba[k+2])*exp/255;
  v=Math.pow(limit(v,0,1),1/gamma);
  v+=sh/300*Math.pow(1-v,2)+hi/300*v*v;
  gray[i]=limit(v*255);
 }
 // Integral image enables local illumination normalization in O(image pixels).
 const stride=w+1;
 for(let y=1;y<=h;y++){
  let row=0;for(let x=1;x<=w;x++){row+=gray[(y-1)*w+x-1];integral[y*stride+x]=integral[(y-1)*stride+x]+row}
 }
 const radius=Math.max(7,Math.round(Math.min(w,h)/36)),pixels=new Uint8Array(N),mode=$("pap-ink-mode").value;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,x0=Math.max(0,x-radius),x1=Math.min(w,x+radius+1),y0=Math.max(0,y-radius),y1=Math.min(h,y+radius+1);
  const mean=(integral[y1*stride+x1]-integral[y0*stride+x1]-integral[y1*stride+x0]+integral[y0*stride+x0])/((x1-x0)*(y1-y0));
  const v=gray[i],local=limit(v+(v-mean)*clarity*1.5);
  const neigh=(xx,yy)=>gray[Math.max(0,Math.min(h-1,yy))*w+Math.max(0,Math.min(w-1,xx))];
  const outline=Math.abs(neigh(x-1,y)-neigh(x+1,y))+Math.abs(neigh(x,y-1)-neigh(x,y+1));
  const sharpen=limit(local+(local-mean)*sharp*.9);
  pixels[i]=(mode==="edge"?outline>value("threshold")*.38:mode==="adaptive"?sharpen<mean-value("sensitivity"):sharpen<value("threshold"))?1:0;
 }
 // Remove small connected blobs (noise), preserving outlines and larger characters.
 const noise=value("noise"),visited=new Uint8Array(N),queue=new Int32Array(N);
 if(noise>0){
  for(let i=0;i<N;i++){
   if(!pixels[i]||visited[i])continue;let head=0,tail=1;queue[0]=i;visited[i]=1;
   while(head<tail){const p=queue[head++],x=p%w,y=(p-x)/w;
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
     const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
     const ni=ny*w+nx;if(pixels[ni]&&!visited[ni]){visited[ni]=1;queue[tail++]=ni}
    }
   }
   if(tail<noise)for(let j=0;j<tail;j++)pixels[queue[j]]=0;
  }
 }
 output.width=w;output.height=h;const image=out.createImageData(w,h);
 for(let i=0;i<N;i++){const n=pixels[i]?0:255,k=i*4;image.data[k]=image.data[k+1]=image.data[k+2]=n;image.data[k+3]=255}
 out.putImageData(image,0,0);mask=pixels;ready=true;segments=[];items.replaceChildren();
 status.textContent="Máscara creada: "+w+" × "+h+" píxeles. Fondo blanco, regiones oscuras en negro. Ajusta filtros y compara con la fotografía original.";
}
$("pap-ink-run").addEventListener("click",extract);
$("pap-ink-export").addEventListener("click",()=>{if(!ready){status.textContent="Extrae antes los trazos.";return}exportPNG(output,"texto-extraido-blanco-negro.png")});
function components(){
 const w=output.width,h=output.height,N=w*h,seen=new Uint8Array(N),queue=new Int32Array(N),found=[];
 for(let i=0;i<N;i++){
  if(!mask[i]||seen[i])continue;
  let head=0,tail=1,minX=i%w,maxX=minX,minY=(i-minX)/w,maxY=minY;
  queue[0]=i;seen[i]=1;
  while(head<tail){
   const p=queue[head++],x=p%w,y=(p-x)/w;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;
    const ni=ny*w+nx;if(mask[ni]&&!seen[ni]){seen[ni]=1;queue[tail++]=ni}
   }
  }
  const width=maxX-minX+1,height=maxY-minY+1;
  if(tail>=Math.max(8,value("noise"))&&tail<=N*.07&&width>=2&&height>=3){
   found.push({x:minX,y:minY,w:width,h:height,area:tail});
  }
 }
 found.sort((a,b)=>a.y-b.y||a.x-b.x);
 // Assign approximate lines using vertical overlap; do not assume a true word boundary.
 const lines=[];for(const c of found){
  let line=lines.find(l=>Math.min(l.bottom,c.y+c.h)-Math.max(l.top,c.y)>-Math.min(c.h,l.bottom-l.top)*.2);
  if(!line){line={top:c.y,bottom:c.y+c.h,items:[]};lines.push(line)}
  line.items.push(c);line.top=Math.min(line.top,c.y);line.bottom=Math.max(line.bottom,c.y+c.h);
 }
 lines.sort((a,b)=>a.top-b.top);
 const alphabet=$("pap-ink-alphabet").value,rtl=["phn","heb"].includes(alphabet);
 return lines.flatMap((l,i)=>l.items.sort((a,b)=>rtl?b.x-a.x:a.x-b.x).map(c=>({...c,line:i+1}))).slice(0,160);
}
const alphabets={
 grc:Array.from("ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩϹ"),
 lat:Array.from("ABCDEFGHIKLMNOPQRSTVXYZ"),
 heb:Array.from("אבגדהוזחטיכלמנסעפצקרשת"),
 phn:Array.from({length:22},(_,i)=>String.fromCodePoint(0x10900+i))
};
function signature(c){
 const grid=24,cv=document.createElement("canvas");cv.width=cv.height=grid;
 const cg=cv.getContext("2d",{willReadFrequently:true});cg.fillStyle="#fff";cg.fillRect(0,0,grid,grid);
 const ratio=Math.min(20/c.w,20/c.h);const ww=c.w*ratio,hh=c.h*ratio;
 cg.imageSmoothingEnabled=false;cg.drawImage(output,c.x,c.y,c.w,c.h,(grid-ww)/2,(grid-hh)/2,ww,hh);
 const d=cg.getImageData(0,0,grid,grid).data;return Array.from({length:grid*grid},(_,i)=>d[i*4]<155?1:0);
}
const templates=new Map;
function template(char,script){
 const key=script+char;if(templates.has(key))return templates.get(key);
 const cv=document.createElement("canvas");cv.width=cv.height=100;
 const c=cv.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,100,100);c.fillStyle="#000";
 c.font='76px '+(script==="phn"?'"Noto Sans Phoenician","Segoe UI Historic",sans-serif':script==="heb"?'"Noto Serif Hebrew",serif':'Georgia,serif');
 c.textAlign="center";c.textBaseline="middle";c.fillText(char,50,51);
 const pixels=c.getImageData(0,0,100,100).data;
 let x0=100,y0=100,x1=0,y1=0;
 for(let y=0;y<100;y++)for(let x=0;x<100;x++)if(pixels[(y*100+x)*4]<150){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
 if(x0>x1)return null;
 const local=document.createElement("canvas");local.width=local.height=24;
 const g=local.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,24,24);
 const ratio=Math.min(20/(x1-x0+1),20/(y1-y0+1)),ww=(x1-x0+1)*ratio,hh=(y1-y0+1)*ratio;
 g.drawImage(cv,x0,y0,x1-x0+1,y1-y0+1,(24-ww)/2,(24-hh)/2,ww,hh);
 const pix=g.getImageData(0,0,24,24).data,arr=Array.from({length:576},(_,i)=>pix[i*4]<155?1:0);
 templates.set(key,arr);return arr;
}
function candidate(c){
 const script=$("pap-ink-alphabet").value,sig=signature(c),arr=[];
 for(const char of alphabets[script]){const t=template(char,script);if(!t)continue;
  let overlap=0,union=0;for(let i=0;i<576;i++){if(sig[i]&&t[i])overlap++;if(sig[i]||t[i])union++}
  arr.push({char,score:union?overlap/union:0});
 }
 return arr.sort((a,b)=>b.score-a.score).slice(0,4);
}
$("pap-ink-segment").addEventListener("click",()=>{
 if(!ready){status.textContent="Extrae primero los trazos negros.";return}
 segments=components();items.replaceChildren();
 for(const [i,c] of segments.entries()){
  const div=document.createElement("div");div.className="pap-ink-sign";
  const image=document.createElement("canvas");image.width=90;image.height=68;
  const g=image.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,90,68);
  const scale=Math.min(80/c.w,58/c.h);g.imageSmoothingEnabled=false;
  g.drawImage(output,c.x,c.y,c.w,c.h,(90-c.w*scale)/2,(68-c.h*scale)/2,c.w*scale,c.h*scale);
  const label=document.createElement("small");label.textContent="Línea "+c.line+" · segmento "+(i+1);
  div.append(image,label);
  for(const match of candidate(c)){
   const btn=document.createElement("button");btn.type="button";btn.textContent=match.char;
   btn.title="Candidato visual tipográfico, no probabilidad paleográfica";
   btn.addEventListener("click",()=>{
    $("pap-build-script").value=$("pap-ink-alphabet").value;
    $("pap-build-script").dispatchEvent(new Event("change",{bubbles:true}));
    $("pap-build-letter").value=match.char;
    $("pap-build-add").click();
    status.textContent="Signo candidato añadido a la palabra. Revisa el original antes de cerrar la lectura.";
   });div.append(btn);
  }items.append(div);
 }
 status.textContent=segments.length+" regiones oscuras aisladas. Los candidatos se comparan con letras tipográficas; revisa divisiones, orientaciones y lagunas.";
});
$("pap-ink-ocr").addEventListener("click",()=>{
 if(!ready){status.textContent="Extrae antes la imagen.";return}
 const script=$("pap-ink-alphabet").value;
 if(script==="phn"){status.textContent="No hay modelo fenicio validado: selecciona signos manualmente en la segmentación.";return}
 const ocrSelect=$("pap-ocr-lang");ocrSelect.value=script==="heb"?"heb":script==="lat"?"lat":"grc";
 ocrSelect.dispatchEvent(new Event("change",{bubbles:true}));
 document.dispatchEvent(new CustomEvent("vitruvia:ocr-extracted-mask",{detail:{canvas:output}}));
 status.textContent="Máscara preparada y enviada al OCR local experimental. Revisa la lectura resultante en el editor.";
});
})();
