/* Vitruvia philological orthography core · independently testable.
   Unicode comparison ≠ morphology, etymology, dialect dating or OCR verification. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.VitruviaOrthography=api;
})(typeof window!=="undefined"?window:null,function(){
"use strict";
const letter=/[\p{L}\p{M}\p{N}]/u;
function glyphs(s){return String(s||"").matchAll(/\P{M}\p{M}*|\p{M}+/gu)}
function norm(s,mode="exact",language="grc"){
 let x=String(s||"").normalize("NFC").toLocaleLowerCase();
 if(mode!=="exact")x=x.normalize("NFD").replace(/\p{M}/gu,"");
 if(mode==="editorial"){
  if(language==="grc")x=x.replace(/[ςϲϹ]/g,"σ");
  if(language==="la")x=x.replace(/j/g,"i").replace(/v/g,"u");
 }
 return x;
}
function mapText(source,mode,language){
 const src=String(source||"");let text="",map=[];
 for(const m of glyphs(src)){
  const part=norm(m[0],mode,language);
  text+=part;
  for(let i=0;i<part.length;i++)map.push(m.index);
 }
 map.push(src.length);
 return {text,map};
}
function attestations(source,query,mode="exact",language="grc",limit=30){
 const q=norm(query,mode,language);
 if(!q||q.length<2)return [];
 const {text,map}=mapText(source,mode,language);
 const out=[];let from=0;
 while(out.length<limit){
  const i=text.indexOf(q,from);
  if(i<0)break;
  const before=i>0?text[i-1]:"",after=text[i+q.length]||"";
  if(!letter.test(before)&&!letter.test(after)){
   const start=map[i],end=map[Math.min(i+q.length,map.length-1)];
   if(end>start)out.push({start,end,form:String(source).slice(start,end)});
  }
  from=i+Math.max(1,q.length);
 }
 return out;
}
function diagnosis(term){
 const x=String(term||"");
 const greek=/[\u0370-\u03ff\u1f00-\u1fff]/u.test(x);
 const hebrew=/[\u0590-\u05ff]/u.test(x);
 const dia=/\p{M}/u.test(x.normalize("NFD"));
 const lunate=/[ϲϹ]/u.test(x),finalSigma=/ς/u.test(x);
 return {language:greek?"grc":hebrew?"he":"la",
  accented:dia,lunate,finalSigma,
  caveat:greek?"La escritura politónica o monotónica por sí sola no fecha un texto ni demuestra su dialecto; el koiné requiere evidencias lingüísticas y editoriales.":hebrew?"La escritura cuadrada no identifica por sí sola hebreo frente a arameo.":"Las grafías u/v e i/j varían por edición; su normalización no certifica una lectura paleográfica."};
}
function suggestedVariants(term){
 const x=String(term||"").trim(),d=diagnosis(x);
 if(!x)return[];
 const results=[
  {label:"Forma original",value:x,kind:"fuente"},
  {label:"Unicode NFC",value:x.normalize("NFC"),kind:"codificación"},
  {label:"Sin diacríticos (consulta)",value:norm(x,"diacritics",d.language),kind:"recuperación"},
  {label:"Clave ortográfica editorial",value:norm(x,"editorial",d.language),kind:"recuperación"}
 ];
 if(d.language==="grc"){
  results.push({label:"Sigma lunada experimental",value:norm(x,"editorial","grc").replace(/σ/g,"ϲ"),kind:"hipótesis gráfica"});
  results.push({label:"Alternancia vocálica por itacismo",value:null,kind:"hipótesis histórica",note:"No se genera automáticamente: depende del período, testimonio y edición."});
 }
 if(d.language==="la")results.push({label:"u/v e i/j editorial",value:norm(x,"editorial","la"),kind:"recuperación"});
 return results;
}
return {norm,mapText,attestations,diagnosis,suggestedVariants,version:"1.0"};
});