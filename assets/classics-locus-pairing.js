/* Locus pairing for hosted original and human translation.
 * Only compatible structural locators can be paired: exact reference key
 * (after edition-specific CTS URN) or individual verses wholly contained
 * inside an attested source verse interval. Nothing is aligned by ordinal.
 */
(function(root){
 "use strict";
 function key(locus){return String(locus||"").trim().split(":").pop().trim()}
 function verse(locus){
  const m=/^(\d+)\.(\d+)(?:-(\d+))?$/.exec(key(locus));
  if(!m)return null;
  const book=Number(m[1]),start=Number(m[2]),end=m[3]?Number(m[3]):start;
  return end>=start?{book,start,end}:null;
 }
 function text(p){return typeof(p?.text||p?.translation)==="string"&&String(p.text||p.translation).trim()}
 function find(original,translations){
  if(!Array.isArray(translations)||!original?.locus)return {kind:"none",passages:[]};
  const valid=translations.filter(p=>p?.locus&&text(p));
  const exact=valid.filter(p=>key(p.locus)===key(original.locus));
  if(exact.length)return {kind:"same-locus",passages:exact};
  const source=verse(original.locus);
  if(!source||source.start===source.end)return {kind:"none",passages:[]};
  const within=valid.filter(p=>{
   const target=verse(p.locus);
   return target&&target.book===source.book&&target.start>=source.start&&target.end<=source.end;
  });
  return within.length?{kind:"verse-range",passages:within}:{kind:"none",passages:[]};
 }
 const api=Object.freeze({key,verse,find});
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.ClassicsLocusPairing=api;
})(typeof window!=="undefined"?window:null);
