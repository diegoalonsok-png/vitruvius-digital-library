/* Vitruvia Lexicon: contextual reading, optional Wikipedia extract.
   Single request per literal query, with a cached response. Never treated as a
   critical edition or a source for manuscript readings.
   Grokipedia link is search-only; no unverified encyclopedia excerpt is attributed to it. */
(function(){
"use strict";
const node=document.getElementById("lx-encyclopedia");
if(!node)return;
const cache=new Map(), alias={
 gallia:"Galia",galliae:"Galia",galliam:"Galia",
 "gallia cisalpina":"Galia Cisalpina",
 "gallia transalpina":"Galia Transalpina",
 "gallia narbonensis":"Galia Narbonense"
};
const trim=s=>String(s||"").trim().replace(/\s+/g," ");
const key=s=>trim(s).normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
const valid=s=>/^[\p{L}\p{M}\p{N}\-'\s.]{2,80}$/u.test(s)&&trim(s).split(" ").length<=4;
const link=(name,href)=>{const a=document.createElement("a");a.textContent=name;a.href=href;a.target="_blank";a.rel="noopener noreferrer";return a};
const text=(tag,t,cl)=>{const e=document.createElement(tag);e.textContent=t;if(cl)e.className=cl;return e};
let sequence=0;
async function wikipedia(term){
 const title=alias[key(term)]||term;
 const found=cache.get(title);if(found)return found;
 const job=(async()=>{
  for(const lang of ["es","en"]){
   const api=new URL("https://"+lang+".wikipedia.org/w/api.php");
   for(const [k,v] of Object.entries({action:"query",prop:"extracts|info|pageprops",inprop:"url",titles:title,
     redirects:"1",exintro:"1",explaintext:"1",exsentences:"2",format:"json",formatversion:"2",origin:"*"}))api.searchParams.set(k,v);
   try{
    const rsp=await fetch(api.toString(),{credentials:"omit",cache:"force-cache"});
    if(!rsp.ok)continue;
    const json=await rsp.json(),p=json.query?.pages?.[0];
    if(!p||p.missing||p.pageprops?.disambiguation!==undefined||!p.extract?.trim())continue;
    return{title:p.title,summary:p.extract.trim(),url:p.fullurl||"https://"+lang+".wikipedia.org/wiki/"+encodeURIComponent(p.title.replace(/ /g,"_")),lang};
   }catch(e){/* Link-only fallback if Wikimedia cannot be reached. */}
  }
  return null;
 })();
 cache.set(title,job);
 return job;
}
async function update(value,options={}){
 const term=trim(value),n=++sequence;
 node.replaceChildren();node.hidden=true;
 if(!valid(term))return;
 const subject=alias[key(term)]||term;
 const wikipediaSearch="https://es.wikipedia.org/w/index.php?search="+encodeURIComponent(subject);
 const grokiSearch="https://grokipedia.com/search?q="+encodeURIComponent(subject);
 const heading=text("span","Contexto enciclopédico · "+term,"lx-encyclopedia-heading");
 const preview=text("p",trim(options.gloss)||"Ver contexto enciclopédico y otras acepciones del término; no sustituye el texto clásico ni el aparato crítico.","lx-encyclopedia-summary");
 const sources=document.createElement("span");sources.className="lx-encyclopedia-links";
 const wp=link("Wikipedia",wikipediaSearch);
 sources.append(wp,document.createTextNode(" · "),link("Grokipedia (buscar)",grokiSearch));
 node.append(heading,preview,sources);node.hidden=false;
 const result=await wikipedia(subject);
 if(n!==sequence||!result)return;
 // Wikipedia excerpts are explanatory material, never quotations from the ancient witness.
 preview.textContent=result.summary;
 heading.textContent="Contexto enciclopédico · "+result.title;
 wp.href=result.url;
 wp.textContent="Wikipedia ("+result.lang+", CC BY-SA)";
}
window.VitruviaEncyclopedia={update};
})();
