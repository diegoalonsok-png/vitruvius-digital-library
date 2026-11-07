/* Visual sign comparator, not an AI classifier or a verified paleographic reading.
   All processing occurs in the browser. Type and drawing samples are never uploaded. */
(()=>{
"use strict";
const $=id=>document.getElementById(id),board=$("pap-glyph-canvas");if(!board)return;
const ctx=board.getContext("2d",{willReadFrequently:true}),status=$("pap-glyph-status"),hits=$("pap-glyph-results");
const names="alef bet gimel dalet he waw zayin het tet yod kaf lamed mem nun samekh ayin pe tsade qof resh shin taw".split(" ");
const heb=Array.from("אבגדהוזחטיכלמנסעפצקרשת");
const phn=Array.from({length:22},(_,i)=>String.fromCodePoint(0x10900+i));
const sets=[
 {script:"phn",label:"Fenicio",chars:phn,description:"glifo Unicode tipográfico"},
 {script:"paleoheb",label:"Paleohebreo (representación de comparación)",chars:phn,description:"no equivale a una forma paleohebrea original"},
 {script:"heb",label:"Hebreo cuadrado",chars:heb},
 {script:"grc",label:"Griego",chars:Array.from("ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ")},
 {script:"lat",label:"Latín",chars:Array.from("ABCDEFGHIKLMNOPQRSTVXYZ")}
];
const size=32, white=()=>{ctx.fillStyle="#fffdf8";ctx.fillRect(0,0,board.width,board.height);ctx.lineWidth=13;ctx.strokeStyle="#282d34";ctx.lineCap="round";ctx.lineJoin="round"};
white();let drawn=false,drag=false,prev;
const pos=e=>{const r=board.getBoundingClientRect();return{x:(e.clientX-r.left)*board.width/r.width,y:(e.clientY-r.top)*board.height/r.height}};
board.addEventListener("pointerdown",e=>{e.preventDefault();drawn=true;drag=true;prev=pos(e);ctx.beginPath();ctx.arc(prev.x,prev.y,6,0,2*Math.PI);ctx.fillStyle="#282d34";ctx.fill();try{board.setPointerCapture(e.pointerId)}catch{}});
board.addEventListener("pointermove",e=>{if(!drag)return;const p=pos(e);ctx.beginPath();ctx.moveTo(prev.x,prev.y);ctx.lineTo(p.x,p.y);ctx.stroke();prev=p});
for(const name of ["pointerup","pointercancel","lostpointercapture"])board.addEventListener(name,()=>{drag=false});
$("pap-glyph-clear").addEventListener("click",()=>{white();drawn=false;hits.replaceChildren();status.textContent="Lienzo vacío. Dibuja una letra o importa un detalle."});
function features(c){
 const g=c.getContext("2d",{willReadFrequently:true}),{width:w,height:h}=c,data=g.getImageData(0,0,w,h).data;
 let minX=w,minY=h,maxX=-1,maxY=-1;const ink=[];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,v=(data[i]*.3+data[i+1]*.59+data[i+2]*.11);
  if(data[i+3]>200&&v<170){ink.push([x,y]);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
 }
 if(maxX<minX||ink.length<12)return null;
 const ww=maxX-minX+1,hh=maxY-minY+1,ratio=Math.min((size-4)/ww,(size-4)/hh);
 const bx=(size-ww*ratio)/2,by=(size-hh*ratio)/2,mask=new Uint8Array(size*size);
 for(const [x,y] of ink){
  const fx=Math.round((x-minX)*ratio+bx),fy=Math.round((y-minY)*ratio+by);
  for(let yy=Math.max(0,fy-1);yy<=Math.min(size-1,fy+1);yy++)for(let xx=Math.max(0,fx-1);xx<=Math.min(size-1,fx+1);xx++)mask[yy*size+xx]=1;
 }
 return {mask,aspect:ww/hh};
}
function renderGlyph(letter,font){
 const c=document.createElement("canvas");c.width=c.height=180;
 const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,180,180);
 g.fillStyle="#222";g.textAlign="center";g.textBaseline="middle";g.font='130px '+font;g.fillText(letter,90,93);
 return features(c);
}
function similarity(a,b){
 let match=0,union=0;
 for(let i=0;i<a.mask.length;i++){if(a.mask[i]&&b.mask[i])match++;if(a.mask[i]||b.mask[i])union++}
 const shape=union?match/union:0,aspect=Math.exp(-Math.abs(Math.log(a.aspect/b.aspect)));
 return .82*shape+.18*aspect;
}
const fontFor=script=>script==="phn"||script==="paleoheb"?'"Noto Sans Phoenician","Segoe UI Historic",sans-serif':script==="heb"?'"Noto Serif Hebrew",serif':'Georgia,serif';
const templates=sets.flatMap(set=>set.chars.map((sign,i)=>({sign,script:set.script,label:set.label,name:names[i]||("Signo "+(i+1)),vector:renderGlyph(sign,fontFor(set.script))})).filter(x=>x.vector));
function proposal(sign,script){
 const letter=$("pap-build-letter"),selector=$("pap-build-script");letter.value=sign;
 if(["phn","paleoheb","heb","grc","lat"].includes(script))selector.value=script;
 selector.dispatchEvent(new Event("change",{bubbles:true}));letter.focus();
}
$("pap-glyph-match").addEventListener("click",()=>{
 const item=features(board);hits.replaceChildren();
 if(!item||!drawn){status.textContent="Dibuja o copia primero un signo legible.";return}
 const choice=$("pap-glyph-script").value;
 const filtered=templates.filter(t=>choice==="auto"||t.script===choice);
 const ranked=filtered.map(t=>({...t,score:similarity(item,t.vector)})).sort((a,b)=>b.score-a.score).slice(0,10);
 status.textContent="Comparación visual orientativa; los resultados no identifican automáticamente el idioma ni prueban una letra.";
 for(const t of ranked){
  const b=document.createElement("button");b.type="button";
  const big=document.createElement("strong");big.textContent=t.sign;
  const small=document.createElement("small");
  small.textContent=t.label+" · "+t.name+" · parecido geométrico "+Math.round(t.score*100)+"/100";
  b.append(big,small);
  b.addEventListener("click",()=>proposal(t.sign,t.script));hits.append(b);
 }
});
$("pap-glyph-detail").addEventListener("click",()=>{
 const photo=$("pap-file");if(!photo.files?.length){status.textContent="Carga antes una imagen y selecciona su detalle con la lupa.";return}
 const from=$("pap-detail");white();ctx.drawImage(from,0,0,board.width,board.height);drawn=true;
 status.textContent="Detalle copiado. Puedes reforzar trazos dibujando encima y compararlo.";
});
/* Editable diplomatic segmentation; visual selection and linguistic interpretation remain distinct. */
let word=[],phrase=[],sentences=[];
const isRTL=()=>["phn","paleoheb","heb","arc"].includes($("pap-build-script").value);
const displayToken=x=>x.certainty==="lost"?"[…]":x.certainty==="uncertain"?x.letter+"[?]":x.letter;
const textWord=characters=>characters.map(displayToken).join("");
const toPhrase=words=>words.map(textWord).join(" ");
function draw(){
 const direction=isRTL()?"rtl":"ltr";
 for(const id of ["pap-build-word","pap-build-phrase","pap-build-sentences"]){$(id).dir=direction}
 $("pap-build-word").textContent=word.length?textWord(word):"—";
 $("pap-build-phrase").textContent=phrase.length?toPhrase(phrase):"—";
 const list=$("pap-build-sentences");list.replaceChildren();
 for(const entry of sentences){const li=document.createElement("li");li.textContent=entry.text;li.dir=entry.direction;list.append(li)}
}
$("pap-build-script").addEventListener("change",draw);
$("pap-build-add").addEventListener("click",()=>{
 const letter=$("pap-build-letter").value.trim(),certainty=$("pap-build-certainty").value;
 if(!letter&&certainty!=="lost"){status.textContent="Escribe o selecciona un signo antes de incorporarlo.";return}
 word.push({letter:certainty==="lost"?"":letter,certainty});$("pap-build-letter").value="";draw();
 $("pap-glyph-status").textContent="Signo incorporado; puedes añadir la letra siguiente.";
});
$("pap-build-letter").addEventListener("keydown",e=>{if(e.key==="Enter"){$("pap-build-add").click();e.preventDefault()}});
$("pap-build-undo").addEventListener("click",()=>{word.pop();draw()});
$("pap-build-word-end").addEventListener("click",()=>{if(word.length){phrase.push(word);word=[];draw()}});
$("pap-build-word-undo").addEventListener("click",()=>{if(!word.length&&phrase.length)word=phrase.pop();draw()});
$("pap-build-phrase-end").addEventListener("click",()=>{
 if(word.length){phrase.push(word);word=[]}
 if(phrase.length){sentences.push({text:toPhrase(phrase),direction:isRTL()?"rtl":"ltr",script:$("pap-build-script").value,words:phrase});phrase=[];draw()}
});
$("pap-build-reset").addEventListener("click",()=>{if(!confirm("¿Borrar toda la composición de letras, palabras y frases?"))return;word=[];phrase=[];sentences=[];draw()});
$("pap-build-transcribe").addEventListener("click",()=>{
 const strings=sentences.map(s=>s.text);
 if(phrase.length||word.length)strings.push(toPhrase([...phrase,...(word.length?[word]:[])]));
 const final=strings.join("\n");if(!final)return;
 const editor=$("pap-transcription");editor.value=editor.value?editor.value+"\n"+final:final;
 editor.dir=isRTL()?"rtl":"ltr";editor.dispatchEvent(new Event("input",{bubbles:true}));
 editor.scrollIntoView({behavior:"smooth",block:"center"});
});
$("pap-build-export").addEventListener("click",()=>{
 const snapshot={schema:"vitruvia-papyrology-diplomatic-draft-v1",note:"Unverified human/heuristic reading, not a certified edition.",script:$("pap-build-script").value,dir:isRTL()?"rtl":"ltr",sentences,openPhrase:phrase,openWord:word};
 const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="papyrology-reading-draft.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
draw();
})();