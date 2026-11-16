/* Vitruvia Lexicon · comparatio of attested word sequences (2–5).
 * Counts actual sequences of normalized surface forms in indexed original
 * passages, not lemmas, translations or verified manuscript readings.
 * No sequence may cross sentence-like punctuation or a passage boundary.
 * Designed to run lazily after the researcher asks for this analysis.
 */
(()=>{
"use strict";
const WORD=/[\p{L}\p{M}][\p{L}\p{M}'ʼ’]*/gu;
const BOUNDARY=/[.!?;··…\r\n]+/u;
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase()
 .replace(/[ςϲ]/g,"σ").replace(/j/g,"i").replace(/v/g,"u").replace(/[ʼ’]/g,"'");
function scan(text,size,emit){
 let total=0;
 for(const unit of String(text||"").split(BOUNDARY)){
  const words=Array.from(unit.matchAll(WORD),m=>m[0]);
  total+=words.length;
  for(let i=0;i+size<=words.length;i++){
   const group=words.slice(i,i+size);
   const key=group.map(fold).join(" ");
   if(key)emit(key,group.join(" "));
  }
 }
 return total;
}
async function compare(passages,options={}){
 const {workA,workB="",size=2,minHits=2,yieldEvery=120}=options;
 if(!Array.isArray(passages)||!workA||!Number.isInteger(size)||size<2||size>5||
    (workB&&workB===workA))throw new Error("Configuración de n-gramas inválida.");
 const hits=new Map();
 let tokensA=0,tokensB=0,passagesA=0,passagesB=0;
 const yieldControl=async i=>{
  if(i&&i%yieldEvery===0)await new Promise(resolve=>setTimeout(resolve,0));
 };
 // First pass: count phrases attested in the chosen work. Do not index the
 // full corpus: only phrases with >=minHits become comparison candidates.
 for(let i=0;i<passages.length;i++){
  const p=passages[i];
  if(!Array.isArray(p)||p[0]!==workA||typeof p[2]!=="string")continue;
  passagesA++;
  tokensA+=scan(p[2],size,(key,surface)=>{
   const rec=hits.get(key);
   if(rec)rec.a++;
   else hits.set(key,{key,phrase:surface,a:1,b:0,locus:String(p[1]??"")});
  });
  if(passagesA%yieldEvery===0)await yieldControl(passagesA);
 }
 if(!tokensA)throw new Error("La obra seleccionada no tiene texto original legible en el índice.");
 for(const [key,rec] of hits)if(rec.a<minHits)hits.delete(key);
 // Second pass: count the SAME phrases in the comparison corpus. Processing
 // B after A ensures stable counts regardless of original passage order.
 for(const p of passages){
  if(!Array.isArray(p)||typeof p[2]!=="string"||
     (workB?p[0]!==workB:p[0]===workA))continue;
  passagesB++;
  tokensB+=scan(p[2],size,key=>{const rec=hits.get(key);if(rec)rec.b++});
  if(passagesB%yieldEvery===0)await yieldControl(passagesB);
 }
 if(!tokensB)throw new Error("La comparación no tiene texto original legible en el índice.");
 const rows=Array.from(hits.values(),r=>{
  const rateA=r.a/tokensA*10000,rateB=r.b/tokensB*10000;
  return {...r,rateA,rateB,
   log2ratio:Math.log2(((r.a+.5)/tokensA)/((r.b+.5)/tokensB))};
 });
 rows.sort((a,b)=>b.a-a.a||b.rateA-b.rateA||a.key.localeCompare(b.key));
 const distinctive=rows.filter(r=>r.a>=3&&r.rateA>r.rateB)
  .sort((a,b)=>b.log2ratio-a.log2ratio||b.a-a.a||a.key.localeCompare(b.key));
 return {workA,workB,size,minHits,tokensA,tokensB,passagesA,passagesB,
  rows,distinctive,normalization:"orthographic-folded-surface-forms",
  boundary:"sentence-or-locus",smoothing:.5};
}
const api=Object.freeze({compare,scan,fold});
if(typeof window!=="undefined")window.VitruviaNgramEngine=api;
else if(typeof globalThis!=="undefined")globalThis.VitruviaNgramEngine=api;
})();
