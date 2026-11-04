/* Vitruvia — on-demand full-text DISCOVERY, not claimed local ingestion.
 * Every term, quoted passage or author is searched against Wikisource indexes,
 * irrespective of whether the work is yet stored on GitHub Pages.
 * Snippets are attributed to the provider; never silently imply full-text access.
 */
(()=>{"use strict";
const cache=new Map();
const safeText=value=>String(value||"").replace(/\s+/g," ").trim();
const cleanHTML=value=>{
 const doc=new DOMParser().parseFromString(String(value||""),"text/html");
 return safeText(doc.body.textContent||"");
};
function languageTargets(query){
 const text=String(query||"");
 if(/[\u0370-\u03FF\u1F00-\u1FFF]/u.test(text))return ["el","en","la","es"];
 if(/[^\x00-\x7f]/.test(text)&&/\b(que|cómo|quien|historia|obra|autor|texto)\b/i.test(text))return ["es","en","la","fr"];
 return ["es","en","la","el"];
}
async function one(lang,query){
 const params=new URLSearchParams({action:"query",list:"search",srsearch:query,srnamespace:"0",srlimit:"12",srprop:"snippet",format:"json",origin:"*"});
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
 try{
  const response=await fetch("https://"+lang+".wikisource.org/w/api.php?"+params,{signal:controller.signal});
  if(!response.ok)throw Error("Wikisource "+lang+": "+response.status);
  const data=await response.json();
  return (data.query?.search||[]).filter(r=>r.title&&r.pageid).map((r,i)=>{
   const excerpt=cleanHTML(r.snippet);
   return {
    type:"text-external",
    title:r.title,author:"Wikisource · "+lang.toUpperCase(),
    excerpt:excerpt||"Resultado en el índice de textos de Wikisource. Abrir el documento para leerlo.",
    meta:"COINCIDENCIA EN TEXTO EXTERNO · Wikisource "+lang.toUpperCase()+" · no indexado localmente",
    source:"Wikisource "+lang.toUpperCase(),
    link:"https://"+lang+".wikisource.org/wiki/"+encodeURIComponent(r.title.replace(/ /g,"_")),
    rating:Math.max(12,56-i*3),
    externalFulltext:true,recordKind:"external-search-index",
    textLanguage:lang,pageid:r.pageid
   };
  });
 }finally{clearTimeout(timeout)}
}
async function queryExternal(query){
 const q=safeText(query);if(q.length<2||q.length>180)return {rows:[],sources:[],errors:["Consulta fuera del rango permitido"]};
 const langs=languageTargets(q);
 const results=await Promise.allSettled(langs.map(lang=>one(lang,q)));
 let rows=[],errors=[];
 for(let i=0;i<results.length;i++){
  const r=results[i];if(r.status==="fulfilled")rows.push(...r.value);
  else errors.push(langs[i]+": "+String(r.reason?.message||r.reason).slice(0,120));
 }
 const seen=new Set();rows=rows.filter(r=>{
  const key=r.link;if(seen.has(key))return false;seen.add(key);return true;
 }).sort((a,b)=>b.rating-a.rating).slice(0,36);
 return {rows,sources:langs,errors};
}
window.VitruviaExternalTexts={search(query){
 const key=safeText(query).toLowerCase();
 if(!cache.has(key))cache.set(key,queryExternal(query));
 return cache.get(key);
 },version:"1.0-wikisource-fulltext"};
})();