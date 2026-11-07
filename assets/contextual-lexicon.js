/* Contextual research panel for Latin words on Vitruvius main page.
   No AI-generated image or invented passage. Edition excerpts are fetched from
   registered, hosted structured transcriptions with documented loci. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const form=$("search-form"),search=$("query");
if(!form||!search)return;
const SCHEMA="data/lexicon/conceptus.json",LATIN_DICTIONARY="data/latin-lexicon.json",REGISTRY="data/classics-corpus/search-registry.json";
const romePhoto={
 src:"https://commons.wikimedia.org/wiki/Special:FilePath/Atrium%20with%20impluvium%20in%20the%20House%20of%20the%20Vetti%20Pompeii.jpg?width=760",
 source:"https://commons.wikimedia.org/wiki/File:Atrium_with_impluvium_in_the_House_of_the_Vetti_Pompeii.jpg",
 credit:"Casa de los Vettii, Pompeya. Fotografía de Mary Harrsch · Wikimedia Commons · CC BY-SA 4.0."
};
const normalized=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ");
const langTitle={es:"Castellano · V514",fr:"Francés · V554",en:"Inglés · V297"};
const termRe=/^[\p{L}\p{M}ʼ’'-]{2,70}$/u;
const ui=document.createElement("section");ui.className="ctx-launch";
const launch=document.createElement("button");launch.type="button";launch.textContent="Consultar palabra · ficha académica";launch.className="ctx-open";
const info=document.createElement("span");info.textContent="Seleccione una palabra en la página o escriba un término y abra su ficha.";
ui.append(launch,info);form.insertAdjacentElement("afterend",ui);
const layer=document.createElement("div");layer.id="contextual-lexicon";layer.className="ctx-layer";layer.hidden=true;
layer.innerHTML='<div class="ctx-shade" data-close></div><section class="ctx-dialog" role="dialog" aria-modal="true" aria-labelledby="ctx-heading"><header class="ctx-heading"><div><p class="ctx-eyebrow">VITRUVIUS · DOSSIER FILOLÓGICO</p><h2 id="ctx-heading">Ficha de palabra</h2></div><button type="button" class="ctx-close" aria-label="Cerrar visor" data-close>×</button></header><div id="ctx-body" class="ctx-body"></div></section>';
document.body.append(layer);
const body=$("ctx-body"),title=$("ctx-heading");
let lastFocus=null,serial=0,corpusPromise=null,conceptPromise=null,latinPromise=null;
function el(tag,txt,cls){const n=document.createElement(tag);if(txt!==undefined)n.textContent=String(txt);if(cls)n.className=cls;return n}
function link(url,label){const a=el("a",label);a.href=url;a.target="_self";return a}
function partHeading(text){return el("h3",text,"ctx-subtitle")}
function paragraph(txt){return el("p",txt)}
function selectedWord(){
 const sel=window.getSelection();
 const word=sel&&sel.rangeCount&&!sel.isCollapsed?String(sel).trim():"";
 return termRe.test(word)?word:search.value.trim();
}
function close(){serial++;layer.hidden=true;document.body.classList.remove("ctx-lock");lastFocus?.focus()}
layer.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",close));
document.addEventListener("keydown",e=>{if(layer.hidden)return;if(e.key==="Escape")close()});
function getConcepts(){
 if(!conceptPromise)conceptPromise=fetch(SCHEMA).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(j=>j.concepts||[]).catch(err=>{conceptPromise=null;throw err});return conceptPromise;
}
function getLatinEntries(){
 if(!latinPromise)latinPromise=fetch(LATIN_DICTIONARY).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(d=>Array.isArray(d.entries)?d.entries:[]).catch(()=>[]);
 return latinPromise;
}
function latinEntry(term,entries){
 const key=normalized(term);
 return entries.find(e=>[e.lemma,...(e.forms||[]),...(e.aliases||[])].some(form=>normalized(form)===key));
}
function data(){
 if(!corpusPromise)corpusPromise=fetch(REGISTRY).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(async registry=>{
  const entries=(registry.entries||[]).filter(e=>e.workId==="vitruvius"&&e.format==="structured-bilingual"&&e.language!=="la");
  const docs=await Promise.all(entries.map(async e=>{
   try{const r=await fetch(e.path);if(!r.ok)throw Error("HTTP "+r.status);
    const d=await r.json();return {entry:e,passages:Array.isArray(d.passages)?d.passages:[]}}
   catch{return null}
  }));
  return docs.filter(Boolean);
 }).catch(err=>{corpusPromise=null;throw err});return corpusPromise;
}
function addImage(){
 const figure=el("figure",undefined,"ctx-figure"),img=document.createElement("img");
 img.src=romePhoto.src;img.alt="Atrio con impluvium de una casa romana excavada en Pompeya, Casa de los Vettii";
 img.loading="lazy";figure.append(img);
 const caption=el("figcaption");caption.append(document.createTextNode(romePhoto.credit+" "));
 const a=link(romePhoto.source,"Ver fotografía, autoría y licencia");a.target="_blank";a.rel="noopener noreferrer";
 caption.append(a);figure.append(caption);return figure;
}
function showLinks(term){
 const nav=el("nav",undefined,"ctx-links");nav.setAttribute("aria-label","Investigación en otras secciones");
 nav.append(
 link("vitruvia-lexicon.html?q="+encodeURIComponent(term)+"&mode=palabra","Analizar en Lexicon"),
 link("index-locorum.html?q="+encodeURIComponent(term),"Concordancias · Index locorum"),
 link("vitruvia.html?q="+encodeURIComponent(term),"Buscar en Vitruvia"),
 link("lector-bilingue.html?edition=recensio-es&q="+encodeURIComponent(term),"Lector bilingüe")
 );return nav;
}
function snippet(s,term){
 const original=String(s||"").replace(/\s+/g," ").trim(),at=normalized(original).indexOf(normalized(term));
 if(at<0)return original.slice(0,300);
 return (at>85?"…":"")+original.slice(Math.max(0,at-85),Math.min(original.length,at+220))+(original.length>at+220?"…":"");
}
function hasWord(str,term){
 const n=normalized(str),q=normalized(term);let i=n.indexOf(q);while(i>=0){
 const prev=n[i-1]||"",next=n[i+q.length]||"";
 if(!/\p{L}/u.test(prev)&&!/\p{L}/u.test(next))return true;
 i=n.indexOf(q,i+Math.max(1,q.length));
 }return false;
}
async function show(term){
 term=String(term||"").trim().slice(0,70);
 if(!termRe.test(term)){search.focus();return}
 const id=++serial;lastFocus=document.activeElement;
 layer.hidden=false;document.body.classList.add("ctx-lock");title.textContent=term;
 body.replaceChildren(paragraph("Consultando repertorios y pasajes documentados…"));
 layer.querySelector(".ctx-close").focus();
 try{
  const [concepts,documents,latinEntries]=await Promise.all([getConcepts(),data(),getLatinEntries()]);if(id!==serial)return;
  body.replaceChildren();
  const match=concepts.find(c=>[...(c.la||[]),...(c.grc||[]),...Object.values(c.modern||{}).flat()].some(w=>normalized(w)===normalized(term)));
  const lexical=latinEntry(term,latinEntries);
  const header=el("div",undefined,"ctx-intro");
  const text=el("div");text.append(partHeading("Definición y correspondencias documentadas"));
  if(lexical){
   const label=lexical.headword||lexical.lemma;
   text.append(paragraph("Lema latino: "+label+(lexical.pos?" · "+lexical.pos:"")+"."));
   if(lexical.es)text.append(paragraph("Definición en castellano: "+lexical.es+"."));
   for(const sense of (lexical.senses||[]).slice(0,3))text.append(paragraph("Acepción: "+sense));
   if(lexical.vitruvian)text.append(paragraph("Uso técnico en Vitruvio: "+lexical.vitruvian));
   text.append(paragraph(lexical.verified?
    "Entrada registrada como verificada en el léxico del proyecto. Confirme la acepción precisa en el pasaje.":
    "Glosa de orientación lexicográfica del repertorio del proyecto; requiere cotejo de su acepción en el contexto y con diccionarios de referencia."));
  }
  if(match){
   const defs=match.modern?.es||[];
   if(!lexical)text.append(paragraph("Campo semántico en castellano: "+(defs.length?defs.join(" · "):match.id)+"."));
   const latin=match.la||[];
   if(latin.length)text.append(paragraph("Correspondencias latinas: "+latin.join(" · ")+"."));
   const greek=match.grc||[];
   if(greek.length)text.append(paragraph("Correspondencias en griego antiguo: "+greek.join(" · ")+"."));
   if(match.note)text.append(paragraph("Nota filológica: "+match.note));
   text.append(paragraph("Estas correspondencias son lexicográficas, no equivalencias exactas en todos los contextos."));
  }
  if(!lexical&&!match){
   text.append(paragraph("Esta forma no tiene todavía una entrada individualizada en los repertorios conectados. Consulte la concordancia y el lector para determinar su uso contextual; la ausencia de ficha no significa que la palabra carezca de significado."));
   const a=link("vitruvia-lexicon.html?q="+encodeURIComponent(term)+"&mode=palabra","Buscar lema, flexión y acepciones en Lexicon");
   text.append(a);
  }
  if(normalized(term)==="domus"){
   text.append(paragraph("Arquitectura romana: domus designa habitualmente una vivienda o casa, y puede referirse también al hogar o al grupo doméstico según el contexto. Atrium e impluvium son elementos de determinadas tipologías, no de todas las viviendas."));
   header.append(text,addImage());
  }else header.append(text);
  body.append(header,showLinks(term),partHeading("Presencia textual en las ediciones de De architectura"));
  const summary=el("p","Coincidencia literal de la forma consultada. La flexión y la sinonimia requieren análisis separado.","ctx-note");body.append(summary);
  let matched=0;
  for(const {entry,passages} of documents){
   const hits=passages.filter(p=>hasWord(p.latin||"",term));if(!hits.length)continue;
   matched++;
   const section=el("section",undefined,"ctx-edition");
   const count=el("h4",langTitle[entry.language]||entry.language+" · "+entry.edition);
   count.append(document.createTextNode(" · "+hits.length+" loci con la forma latina"));section.append(count);
   for(const p of hits.slice(0,4)){
    const item=el("div",undefined,"ctx-excerpt");
    const href=(entry.reader||"lector-bilingue.html?edition="+entry.edition)+"&locus="+encodeURIComponent(p.locus)+"&q="+encodeURIComponent(term);
    const a=link(href,"Libro/pasaje "+p.locus+" · Abrir lectura");item.append(a);
    const latin=paragraph(snippet(p.latin,term));latin.lang="la";item.append(latin);
    if(p.translation){
     const trans=paragraph("Traducción "+(langTitle[entry.language]||entry.language)+": "+String(p.translation).slice(0,300)+"…");
     trans.lang=entry.language;trans.className="ctx-translation";item.append(trans);
    }
    section.append(item);
   }
   if(hits.length>4)section.append(paragraph("Se muestran cuatro loci de esta edición; abra el lector para continuar."));
   body.append(section);
  }
  if(!matched)body.append(paragraph("No se halló esta forma latina literal en las ediciones estructuradas que pudieron cargarse. Esto no equivale a ausencia en los originales, en otros lemas o en fuentes no indexadas."));
  body.append(paragraph("Nota metodológica: cada edición conserva su propia lectura latina y traducción. Compartir el identificador de locus no demuestra identidad filológica entre todas las recensiones. La consulta no incluye automáticamente todas las formas flexionadas ni los OCR sin cotejar."));
 }catch(err){if(id!==serial)return;body.replaceChildren(paragraph("No se pudo completar la consulta: "+err.message));body.append(showLinks(term))}
}
launch.addEventListener("click",()=>show(selectedWord()));
document.addEventListener("dblclick",e=>{
 if(e.target.closest("button,a,input,textarea,select,[contenteditable],nav,header,footer,.ctx-layer"))return;
 const selected=selectedWord();
 if(termRe.test(selected))show(selected);
});
// A single click on a Latin reading passage opens the selected word dossier.
// Other page controls, links and editable areas remain unaffected.
document.addEventListener("click",e=>{
 if(!layer.hidden||e.detail!==1||e.target.closest("button,a,input,textarea,select,nav,header,footer,[contenteditable],.ctx-layer"))return;
 const region=e.target.closest('[lang="la"],.latin-text,.passage-latin,.latin-paragraph');
 if(!region)return;
 let node=null,offset=-1;
 if(document.caretPositionFromPoint){const pos=document.caretPositionFromPoint(e.clientX,e.clientY);if(pos){node=pos.offsetNode;offset=pos.offset}}
 else if(document.caretRangeFromPoint){const range=document.caretRangeFromPoint(e.clientX,e.clientY);if(range){node=range.startContainer;offset=range.startOffset}}
 if(node?.nodeType!==Node.TEXT_NODE||offset<0)return;
 const content=node.textContent||"",allowedChar=ch=>!!ch&&/[\p{L}\p{M}'ʼ’-]/u.test(ch);
 let start=offset,end=offset;
 while(start>0&&allowedChar(content[start-1]))start--;
 while(end<content.length&&allowedChar(content[end]))end++;
 const word=content.slice(start,end).replace(/^[-'ʼ’]+|[-'ʼ’]+$/g,"");
 if(termRe.test(word))show(word);
});
const example=el("button","Ejemplo: domus","ctx-example");example.type="button";example.addEventListener("click",()=>show("domus"));ui.append(example);
})();