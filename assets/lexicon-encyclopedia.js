/* Vitruvia Lexicon — ficha enciclopédica ampliada
   Contexto secundario: no sustituye testimonio antiguo ni edición crítica.
   Fuente externa de Wikipedia mediante API pública y con su atribución.
   Sin servicios de pago y sin alterar lectores de originales y traducciones. */
(function(){
"use strict";
const node=document.getElementById("lx-encyclopedia");
if(!node)return;
const cache=new Map();
const trim=s=>String(s||"").trim().replace(/\s+/g," ");
const key=s=>trim(s).normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
const alias={
 gallia:"Galia",galliae:"Galia",galliam:"Galia",
 "gallia cisalpina":"Galia Cisalpina",
 "gallia transalpina":"Galia Transalpina",
 "gallia narbonensis":"Galia Narbonense",
 architectura:"Arquitectura",ἀρχιτεκτονική:"Arquitectura"
};
/* Notas originales y prudentes. No se atribuyen a un códice ni a Wikipedia. */
const editorial={
 gallia:{
  title:"Galia en las fuentes romanas",
  summary:"Gallia es el nombre latino de un conjunto de territorios de Europa occidental descritos por autores romanos, entre ellos Julio César.",
  notes:[
   "La palabra geográfica no designó una única división administrativa durante toda la Antigüedad. Sus límites y subdivisiones variaron según la época y el autor.",
   "En la obra de César se distinguen grandes grupos de poblaciones de la Galia; posteriormente se documentan distintas organizaciones provinciales romanas. Conviene contrastar cada topónimo con el locus y su cronología."
  ],
  related:["Gallia Cisalpina","Gallia Narbonensis","Galia Comata"]
 },
 architectura:{
  title:"Architectura en la tradición antigua",
  summary:"Architectura es el sustantivo latino relacionado con architectus; en Vitruvio se vincula al saber técnico y artístico de construir.",
  notes:["La comparación con el griego ἀρχιτεκτονική exige distinguir profesión, arte y técnica; las acepciones dependen de cada pasaje.","Para estudiar la recepción histórica de un término técnico, conviene cotejar el texto latino y las traducciones de distintas épocas."],
  related:["architectus","symmetria","ordinatio","dispositio"]
 },
 symmetria:{
  title:"Symmetria y proporción",
  summary:"En el vocabulario arquitectónico antiguo, symmetria designa relaciones de medida y proporción entre partes de un conjunto.",
  notes:["No equivale automáticamente a la simetría bilateral de los usos modernos; el contexto vitruviano y la traducción elegida son esenciales."],
  related:["proportio","modulus","eurythmia"]
 }
};
const special=term=>editorial[key(term)]||null;
const el=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=txt;if(cls)n.className=cls;return n};
const link=(label,url)=>{const a=el("a",label);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a};
const valid=term=>/^[\p{L}\p{M}\p{N}\-'\s.]{2,80}$/u.test(term)&&term.split(" ").length<=4;
let serial=0;
async function wikipedia(term){
 const title=alias[key(term)]||term;
 if(cache.has(title))return cache.get(title);
 const job=(async()=>{
  for(const lang of ["es","en"]){
   const api=new URL("https://"+lang+".wikipedia.org/w/api.php");
   const params={action:"query",prop:"extracts|info|pageprops",inprop:"url",titles:title,
    redirects:"1",exintro:"1",explaintext:"1",exchars:"1150",format:"json",formatversion:"2",origin:"*"};
   for(const [k,v] of Object.entries(params))api.searchParams.set(k,v);
   try{
    const response=await fetch(api.toString(),{cache:"force-cache",credentials:"omit"});
    if(!response.ok)continue;
    const p=(await response.json()).query?.pages?.[0];
    if(!p||p.missing||p.pageprops?.disambiguation!==undefined||!p.extract?.trim())continue;
    return{title:p.title,body:p.extract.trim(),lang,
     url:p.fullurl||"https://"+lang+".wikipedia.org/wiki/"+encodeURIComponent(p.title.replace(/ /g,"_")),
     wikidata:/^Q\d+$/.test(p.pageprops?.wikibase_item||"")?p.pageprops.wikibase_item:null};
   }catch{/* Wikipedia may be unavailable: preserve the local dictionary and curated notes. */}
  }
  return null;
 })();
 cache.set(title,job);return job;
}
const renderParagraphs=(target,strings)=>{
 target.replaceChildren();
 for(const s of strings){if(trim(s))target.append(el("p",trim(s)))}
};
function update(query,opts={}){
 const term=trim(query),ticket=++serial;
 node.replaceChildren();node.hidden=true;
 if(!valid(term))return;
 const subject=alias[key(term)]||term;
 const note=special(term);
 const short=trim(opts.gloss)||note?.summary||"El enlace enciclopédico complementa las concordancias; no sustituye el original, su traducción ni el aparato crítico.";
 const shell=el("div",null,"lx-encyclopedia-layout");
 const top=el("header",null,"lx-encyclopedia-top");
 top.append(el("span","ENCICLOPEDIA · CONTEXTO DEL TÉRMINO","lx-encyclopedia-kicker"),el("h3",term));
 const lead=el("p",short,"lx-encyclopedia-summary");top.append(lead);
 const body=el("div",null,"lx-encyclopedia-expanded");
 const article=el("div",null,"lx-encyclopedia-article");
 article.append(el("h4",note?.title||"Significado, historia y contexto"));
 const paragraphs=el("div",null,"lx-encyclopedia-paragraphs");
 const placeholder=note?.notes?.length?note.notes:["Aún no hay un artículo enciclopédico confirmado para este lema. Puede consultar las fuentes vinculadas; no se atribuirá una definición o cronología que no se haya verificado."];
 renderParagraphs(paragraphs,placeholder);
 article.append(paragraphs);
 if(note?.related?.length){
  const related=el("p",null,"lx-encyclopedia-related");related.append(el("b","Términos relacionados: "));
  for(const [i,w] of note.related.entries()){
   if(i)related.append(" · ");
   related.append(link(w,"vitruvia-lexicon.html?q="+encodeURIComponent(w)+"&mode=palabra"));
  }
  article.append(related);
 }
 const aside=el("aside",null,"lx-encyclopedia-sources");
 aside.append(el("h4","Fuentes y consultas"),el("p","Referencias externas para ampliar el contexto; contrastar las afirmaciones con las fuentes primarias."));
 const references=el("div",null,"lx-encyclopedia-ref-links");
 const wikipediaSearch="https://es.wikipedia.org/w/index.php?search="+encodeURIComponent(subject);
 const wp=link("Wikipedia (buscar)",wikipediaSearch);
 const wiktionary=link("Wikcionario / Wiktionary","https://en.wiktionary.org/wiki/"+encodeURIComponent(term));
 const groki=link("Grokipedia (buscar)","https://grokipedia.com/search?q="+encodeURIComponent(subject));
 references.append(wp,wiktionary,groki);aside.append(references);
 const source=el("p","Las síntesis modernas no constituyen testimonios antiguos. Los pasajes de la biblioteca se citan por obra y locus.","lx-encyclopedia-disclaimer");
 aside.append(source);
 body.append(article,aside);shell.append(top,body);
 node.append(shell);node.hidden=false;
 wikipedia(subject).then(result=>{
  if(serial!==ticket||!result)return;
  // Resumen y párrafos son texto plano, nunca HTML remoto.
  lead.textContent=trim(opts.gloss)||note?.summary||result.body.slice(0,300).trim();
  const paragraphsFromWikipedia=result.body.split(/\n\s*\n/).map(trim).filter(Boolean).slice(0,4);
  const header=el("p","Síntesis enciclopédica (Wikipedia, "+result.lang+"):","lx-encyclopedia-attr");
  paragraphs.prepend(header);
  for(const p of paragraphsFromWikipedia){paragraphs.insertBefore(el("p",p),note?.notes?.length?paragraphs.childNodes[1]||null:null)}
  if(note?.notes?.length){
   paragraphs.append(el("p","Nota contextual editorial de Vitruvia Lexicon; debe contrastarse con las fuentes:","lx-encyclopedia-attr"));
   renderParagraphsAppendNotes(paragraphs,note.notes);
  }else if(paragraphsFromWikipedia.length){const old=paragraphs.querySelectorAll("p");for(const item of old){if(item.textContent?.startsWith("Aún no hay"))item.remove()}}
  wp.href=result.url;wp.textContent="Wikipedia ("+result.lang+"; CC BY-SA)";
  if(result.wikidata)references.insertBefore(link("Wikidata "+result.wikidata,"https://www.wikidata.org/wiki/"+result.wikidata),groki);
 }).catch(()=>{});
}
function renderParagraphsAppendNotes(target,notes){for(const s of notes)target.append(el("p",s))}
window.VitruviaEncyclopedia={update};
})();