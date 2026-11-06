/* Historical names: explicit scholarly catalogue metadata, no invented translations.
 * Latin variants are editorial name forms from the Vitruvian onomasticon.
 * Greek names are historical reference forms, NOT manuscript readings.
 */
(()=>{
"use strict";
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^a-z0-9\u0370-\u03ff\u1f00-\u1fff]+/gi," ").trim();
const tokens=s=>fold(s).split(/\s+/).filter(Boolean);
function labels(person){
 const latin=(person.aliases||[]).find(x=>/^[A-Za-zÀ-ÿ\s]+$/.test(x)&&fold(x)!==fold(person.name))||
  (person.latin_forms||[]).find(x=>/^[A-Za-zÀ-ÿ\s]+$/.test(x))||"";
 return {latin,greek:String(person.greek_name||"")};
}
function find(query,people){
 const q=fold(query);if(q.length<3||!Array.isArray(people))return [];
 return people.filter(p=>{
  if(p.kind!=="person"||!p.name)return false;
  const forms=[p.name,...(p.aliases||[]),...(p.latin_forms||[]),p.greek_name].filter(Boolean).map(fold);
  return forms.some(f=>f===q||f.startsWith(q+" ")||f.startsWith(q)&&q.length>=4);
 }).map(p=>{
  const forms=[p.name,...(p.aliases||[]),p.greek_name].filter(Boolean).map(fold);
  const exact=forms.includes(q),start=fold(p.name).startsWith(q),score=(exact?500:0)+(start?150:0)+(p.source?12:0)+(p.latin_forms?.length?8:0);
  return {person:p,score};
 }).sort((a,b)=>b.score-a.score||a.person.name.localeCompare(b.person.name)).map(x=>x.person).slice(0,5);
}
window.VitruviaHistoricalNames={fold,find,labels};
})();