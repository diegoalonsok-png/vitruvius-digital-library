/* Búsqueda por palabra en los textos griegos y latinos alojados en el sitio
   (data/classics-corpus/*-grc.json / *-la.json). Devuelve filas para Vitruvia y el buscador del front.
   Carga los textos bajo demanda y los conserva en memoria durante la sesión. */
(()=>{
"use strict";
if(window.ClassicsCorpusSearch)return;
const WORKS=[
 ["theophrastus-characters","grc","Teofrasto","Caracteres (Ἠθικοὶ χαρακτῆρες)"],
 ["plato-apology","grc","Platón","Apología de Sócrates"],
 ["aristotle-poetics","grc","Aristóteles","Poética (Περὶ ποιητικῆς)"],
 ["epictetus-enchiridion","grc","Epicteto","Enchiridion (Ἐγχειρίδιον)"],
 ["homer-iliad","grc","Homero","Ilíada"],
 ["homer-odyssey","grc","Homero","Odisea"],
 ["caesar-gallico","la","Julio César","De bello Gallico"],
 ["virgil-aeneid","la","Virgilio","Aeneis"],
 ["virgil-georgica","la","Virgilio","Georgica"],
 ["petronius-satyrica","la","Petronio","Satyrica"],
 ["apuleius-metamorphoses","la","Apuleyo","Metamorphoses"],
 ["cicero-officiis","la","Cicerón","De officiis","corpus/cicero-de-officiis-la.html"],
 ["lucretius","la","Lucrecio","De rerum natura","corpus/lucretius-de-rerum-natura-la.html"],
 ["catullus-carmina","la","Catulo","Carmina","corpus/catullus-carmina-la.html"],
];
const cache=new Map();
function loadHtml(path){
 if(!cache.has(path))cache.set(path,fetch(path).then(r=>r.ok?r.text():"").then(h=>{
  const doc=new DOMParser().parseFromString(h,"text/html");doc.querySelectorAll("script,style,nav,header,footer").forEach(n=>n.remove());
  const blocks=[...doc.querySelectorAll("main p, main li, main blockquote, article p, .poem, .verse")].map(n=>n.textContent.replace(/\s+/g," ").trim()).filter(t=>t.length>20);
  return{attribution:(doc.querySelector('meta[name="description"]')?.content||"").split(":")[0],passages:blocks.map((t,i)=>({locus:"¶"+(i+1),text:t}))};
 }).catch(()=>null));
 return cache.get(path);
}
function load(id,lang){
 const k=id+"-"+lang;
 if(!cache.has(k))cache.set(k,(window.VitruviaData?window.VitruviaData.json("data/classics-corpus/"+k+".json"):fetch("data/classics-corpus/"+k+".json").then(r=>r.ok?r.json():null)).catch(()=>null));
 return cache.get(k);
}
const fold=s=>window.ClassicalLexicon?window.ClassicalLexicon.fold(s):String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").replace(/j/g,"i").replace(/v/g,"u");
function find(text,q){
 if(window.ClassicalLexicon)return window.ClassicalLexicon.find(text,q);
 const t=fold(text),k=fold(q),out=[];let i=t.indexOf(k);while(i>=0&&out.length<50){out.push([i,i+k.length]);i=t.indexOf(k,i+1)}return out;
}
function snippet(text,[a,b]){
 const s=Math.max(0,a-90),e=Math.min(text.length,b+130);
 return (s?"…":"")+text.slice(s,a)+"«"+text.slice(a,b)+"»"+text.slice(b,e)+(e<text.length?"…":"");
}
/* q: palabra o frase breve (latín o griego). */
async function search(q,{limit=8}={}){
 q=String(q||"").trim();
 const words=q.split(/\s+/).filter(Boolean);
 if(fold(q).replace(/[^\p{L}]/gu,"").length<3||words.length>4)return[];
 const greek=/[Ͱ-Ͽἀ-῿]/.test(q);
 const targets=WORKS.filter(w=>greek?w[1]==="grc":w[1]==="la");
 const rows=[];
 await Promise.all(targets.map(async([id,lang,author,title,html])=>{
  const d=html?await loadHtml(html):await load(id,lang);if(!d?.passages)return;
  let total=0,first=null,units=0;
  for(const p of d.passages){const h=find(p.text,q);if(!h.length)continue;total+=h.length;units++;if(!first)first={p,h:h[0]}}
  if(!total)return;
  rows.push({type:"section",kind:"classic-text",
   title:author+" · "+title+" · "+total+(total===1?" coincidencia":" coincidencias")+" en "+units+(units===1?" pasaje":" pasajes"),
   author:(lang==="grc"?"Griego":"Latín")+" · "+(d.attribution||"").split(";")[0],
   excerpt:(html?"":"Locus "+first.p.locus)+(first.p.title?" ("+first.p.title+")":"")+": "+snippet(first.p.text,first.h),
   meta:"TEXTO CLÁSICO · BÚSQUEDA POR PALABRA · resaltado y diccionario en el lector",
   rating:58+Math.min(30,total),
   link:html?html+"?q="+encodeURIComponent(q):"classics-text-reader.html?work="+id+"&lang="+lang+"&q="+encodeURIComponent(q)+"&locus="+encodeURIComponent(first.p.locus),
   workId:id,count:total,
   source:"Bibliotheca Graeca et Latina · lector del sitio"});
 }));
 return rows.sort((a,b)=>b.rating-a.rating).slice(0,limit);
}
window.ClassicsCorpusSearch={search,works:WORKS.map(w=>({id:w[0],lang:w[1],author:w[2],title:w[3]}))};
})();

