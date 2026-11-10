/* Diccionarios integrados de Lexicon · edición local documentada.
   Sin transformar las glosas en definiciones críticas ni inventar etimologías. */
(()=>{"use strict";
const root=document.getElementById("lx-dictionaries"),query=document.getElementById("lx-q");
if(!root||!query)return;
const output=document.getElementById("lx-dict-results");
const status=document.getElementById("lx-dict-status");
const buttons=[...root.querySelectorAll("[data-ld-lang]")];
const form=document.getElementById("lx-form");
const cache=new Map(),indexes=new WeakMap();
let sensesPromise=null;
function contextualSenses(){
 if(!sensesPromise)sensesPromise=fetch("data/lexicon/senses-vitruvianos.json")
  .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(x=>x.schema==="vitruvia-lexicon-contextual-senses-v1"&&Array.isArray(x.entries)?x.entries:[])
  .catch(()=>[]);
 return sensesPromise;
}

const names={la:"Latín",grc:"Griego antiguo",he:"Hebreo bíblico"};
let active="la",sequence=0;
const removeMarks=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"");
const normal=s=>removeMarks(s).toLocaleLowerCase("und").replace(/ς/g,"σ").replace(/j/g,"i").replace(/v/g,"u").trim();
const heb=s=>removeMarks(s).replace(/[^\u05d0-\u05ea]/g,"");
const gmap={α:"a",β:"b",γ:"g",δ:"d",ε:"e",ζ:"z",η:"e",θ:"th",ι:"i",κ:"k",λ:"l",μ:"m",ν:"n",ξ:"x",ο:"o",π:"p",ρ:"r",σ:"s",τ:"t",υ:"y",φ:"ph",χ:"ch",ψ:"ps",ω:"o"};
function greekRoman(value){
 return [...removeMarks(value).toLowerCase().replace(/ς/g,"σ")].map(c=>gmap[c]||c).join("");
}
function node(tag,cls,value){
 const e=document.createElement(tag);
 if(cls)e.className=cls;
 if(value!==undefined)e.textContent=String(value);
 return e;
}
function link(title,url){
 const a=node("a","",title);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;
}
function setLanguage(lang){
 active=names[lang]?lang:"la";
 for(const b of buttons){
  const chosen=b.dataset.ldLang===active;
  b.setAttribute("aria-pressed",chosen?"true":"false");
 }
 root.setAttribute("data-language",active);
}
async function dictionary(lang){
 if(!cache.has(lang)){
  cache.set(lang,fetch("data/lexicon/dictionary-"+lang+".json")
   .then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
   .then(d=>{if(d.schema!=="vitruvia-integrated-dictionary-v1"||d.language!==lang||
                  !d.entries||typeof d.entries!=="object")throw Error("Índice no reconocido");return d})
   .catch(e=>{cache.delete(lang);throw e}));
 }
 return cache.get(lang);
}
function dictionaryIndex(doc,lang){
 if(indexes.has(doc))return indexes.get(doc);
 const direct=new Map(),forms=new Map(),roman=new Map();
 const key=word=>lang==="he"?heb(word):normal(word);
 for(const [raw,e] of Object.entries(doc.entries||{})){
  if(!e?.lemma)continue;
  for(const form of [raw,e.lemma]){
   const k=key(form);if(!k)continue;
   if(!direct.has(k))direct.set(k,[]);
   if(!direct.get(k).includes(e))direct.get(k).push(e);
  }
  if(lang==="grc"){
   const k=normal(greekRoman(e.lemma));
   if(!roman.has(k))roman.set(k,[]);
   roman.get(k).push(e);
  }
 }
 for(const [raw,lems] of Object.entries(doc.forms||{})){
  const k=key(raw);
  if(!k||!Array.isArray(lems))continue;
  if(!forms.has(k))forms.set(k,[]);
  for(const lemma of lems.slice(0,16)){
   const e=doc.entries[lemma]||direct.get(key(lemma))?.[0];
   if(e?.lemma&&!forms.get(k).includes(e))forms.get(k).push(e);
  }
 }
 const value={direct,forms,roman};
 indexes.set(doc,value);return value;
}
function cleanQuery(q){
 return String(q||"").trim().replace(/^[@#=√]+/,"").replace(/^["“«']|["”»']$/g,"").trim();
}
function matchEntries(doc,query,lang){
 const q=cleanQuery(query),k=lang==="he"?heb(q):normal(q);
 if(!k||q.split(/\s+/).length>1)return[];
 const idx=dictionaryIndex(doc,lang),found=new Map();
 const add=(entries,kind)=>{for(const e of entries||[])if(e?.lemma&&!found.has(e.lemma))found.set(e.lemma,{entry:e,kind})};
 add(idx.direct.get(k),"lema exacto / grafía equivalente");
 add(idx.forms.get(k),"forma flexionada indexada");
 // Transliteration is merely a way of finding a Greek candidate;
 // it does not establish identity of lemma, etymology or meaning.
 if(lang==="grc"&&/^[a-z \u0027-]{2,50}$/i.test(q)){
  add(idx.roman.get(k),"transliteración orientativa · cotejar el griego");
  if(!found.size)add(idx.roman.get(k.replace(/u/g,"y")),"transliteración aproximada · cotejar");
 }
 return [...found.values()].slice(0,8);
}
function suggestions(doc,q,lang){
 const k=lang==="he"?heb(q):normal(cleanQuery(q));
 if(k.length<3)return [];
 const list=[...dictionaryIndex(doc,lang).direct.entries()];
 const out=[],seen=new Set();
 // A suggestion is NOT a dictionary hit: the reader must select it.
 const add=(term,e,reason)=>{
  if(!e?.lemma||seen.has(e.lemma))return;
  seen.add(e.lemma);out.push({lemma:e.lemma,reason});
 };
 for(const [form,entries] of list){
  if(form!==k&&form.startsWith(k))add(form,entries[0],"completamiento");
  if(out.length>=6)break;
 }
 if(!out.length&&k.length>=5){
  for(const [form,entries] of list){
   if(Math.abs(form.length-k.length)>1||form[0]!==k[0])continue;
   let left=0,right=0;
   while(left<k.length&&left<form.length&&k[left]===form[left])left++;
   while(right<k.length-left&&right<form.length-left&&k[k.length-1-right]===form[form.length-1-right])right++;
   if(k.length-left-right<=1&&form.length-left-right<=1)add(form,entries[0],"grafía próxima");
   if(out.length>=6)break;
  }
 }
 return out;
}
function meaningMentions(senses,q,lang){
 // Search text in the twenty cited Spanish explanations, not in the ancient
 // dictionary itself. Literal text match does not imply semantic equivalence.
 const spanish=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"")
  .toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const term=spanish(cleanQuery(q));
 if(!term||term.length<4||term.length>60||
    /^(de|del|los|las|una|uno|para|sobre|el|la|por|con|and|the)$/i.test(term))return [];
 return (senses||[]).filter(x=>x.language===lang&&
   (" "+spanish(x.meaning)+" ").includes(" "+term+" ")).slice(0,8);
}
function external(entry,lang){
 const heading=entry.lemma;
 if(lang==="he")return link("Consultar fuentes hebreas (Sefaria)","https://www.sefaria.org/search?q="+encodeURIComponent(heading));
 return link("Consultar diccionario completo en Logeion","https://logeion.uchicago.edu/"+encodeURIComponent(heading));
}
function card(e,lang,kind,senses){
 const wrap=node("article","lx-dict-card");
 const h=node("h3","",e.lemma);
 h.lang=lang==="grc"?"grc":lang; if(lang==="he"){h.lang="he";h.dir="rtl"}
 wrap.append(h);
 wrap.append(node("p","lx-dict-meta","Identificación: "+kind+". La concordancia no determina por sí sola qué acepción corresponde a cada pasaje."));
 if(e.transliteration)wrap.append(node("p","lx-dict-transliteration",e.transliteration));
 const glosses=String(e.gloss||"").split(/;\s*/).filter(Boolean);
 if(glosses.length>1){
  wrap.append(node("p","lx-dict-meta","Glosas abreviadas del repertorio (no son definiciones contextuales):"));
  const list=node("ol","lx-dict-gloss");
  for(const gloss of glosses.slice(0,15))list.append(node("li","",gloss));
  wrap.append(list);
 }else wrap.append(node("p","lx-dict-gloss",e.gloss||"Sin glosa local: consultar el diccionario enlazado."));
 const contextual=(senses||[]).filter(x=>x.language===lang&&normal(x.lemma)===normal(e.lemma));
 if(contextual.length){
  const section=node("details","lx-dict-context");
  section.style.cssText="margin:12px 0;padding:10px 0;border-top:1px solid #7775;border-bottom:1px solid #7775";
  section.append(node("summary","", "Sentido contextual en Vitruvio · "+contextual.length+" locus"));
  for(const sense of contextual){
   section.append(node("p","lx-dict-gloss",sense.meaning));
   const url="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(sense.locus);
   section.append(link("Vitr., De architectura "+sense.locus+" · original y traducción V514",url));
  }
  section.append(node("p","lx-dict-meta","Paráfrasis editorial documentada por locus; no sustituye las acepciones completas de Lewis & Short o LSJ."));
  wrap.append(section);
 }
 if(e.root)wrap.append(node("p","lx-dict-meta","Raíz registrada: "+e.root+(e.rootGloss?" · "+e.rootGloss:"")));
 if(e.relatedLatinGreek)wrap.append(node("p","lx-dict-meta","Correspondencia editorial: "+e.relatedLatinGreek+" (equivalencia de sentido, no cognación demostrada)"));
 wrap.append(node("p","lx-dict-meta",(e.source||"Fuente no especificada")+" · "+(e.editorial||"Glosa orientativa")));
 wrap.append(external(e,lang));
 return wrap;
}
async function search(forced=false){
 const q=query.value.trim();
 const id=++sequence;output.replaceChildren();
 if(!q||q.length>90||q.split(/\s+/).length>3){
  status.textContent=forced?"Escribe una palabra o forma breve en el buscador superior.":"Consulta un término en Lexicon para ver su entrada.";
  return;
 }
 if(!forced&&(/[\u0590-\u05ff]/.test(q)&&active!=="he"||/[\u0370-\u03ff\u1f00-\u1fff]/.test(q)&&active!=="grc")){
  setLanguage(/[\u0590-\u05ff]/.test(q)?"he":"grc");
 }
 status.textContent="Consultando "+names[active]+"…";
 try{
  const lang=active;
  const [doc,senses]=await Promise.all([dictionary(lang),contextualSenses()]);
  if(id!==sequence)return;
  const list=matchEntries(doc,q,lang);
  status.textContent=list.length
   ?list.length+" entrada(s) recuperadas por identificación de lema, flexión o grafía transliterada. Solo los lemas y formas del registro son coincidencias directas; las acepciones se evalúan por locus."
   :"No existe una correspondencia exacta de lema o forma documentada para «"+q+"» en "+names[lang]+". No se muestran definiciones de palabras parecidas.";
  for(const hit of list)output.append(card(hit.entry,lang,hit.kind,senses));
  if(!list.length){
   const inDefinitions=meaningMentions(senses,q,lang);
   if(inDefinitions.length){
    const context=node("section","lx-dict-meaning-hits");
    context.style.cssText="border-top:1px solid #7775;padding:12px 0;margin:12px 0";
    context.append(node("h3","","Palabra encontrada en explicaciones contextuales · "+inDefinitions.length));
    context.append(node("p","lx-dict-meta","Esta consulta busca palabras del castellano dentro de veinte paráfrasis editoriales de Vitruvio. No identifica automáticamente un lema griego o latino ni demuestra sinonimia."));
    for(const sense of inDefinitions){
     const line=node("p","lx-dict-gloss");
     const a=link(sense.lemma+" · Vitr. "+sense.locus,"vitruvia-lexicon.html?q="+encodeURIComponent(sense.lemma)+"&mode=palabra");
     a.lang=sense.language;line.append(a,document.createTextNode(" — "+sense.meaning));
     context.append(line);
    }
    output.append(context);
   }
   const near=suggestions(doc,q,lang);
   if(near.length){
    const label=node("p","lx-dict-meta","Sugerencias ortográficas · NO son definiciones ni coincidencias verificadas:");
    const suggestionsBox=node("div","lx-dict-suggestions");suggestionsBox.style.cssText="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0";
    for(const suggestion of near){
     const b=node("button","",suggestion.lemma);
     b.type="button";b.title="Buscar lema sugerido; "+suggestion.reason;
     b.style.cssText="background:#222;color:inherit;border:1px solid #777;border-radius:5px;padding:6px 10px;cursor:pointer";
     b.addEventListener("click",()=>{query.value=suggestion.lemma;void search(true)});
     suggestionsBox.append(b);
    }
    output.append(label,suggestionsBox);
   }
   output.append(link(lang==="he"?"Buscar en Sefaria":"Buscar en Logeion",
    lang==="he"?"https://www.sefaria.org/search?q="+encodeURIComponent(q):
    "https://logeion.uchicago.edu/"+encodeURIComponent(q)));
  }
 }catch(err){
  if(id!==sequence)return;
  status.textContent="No fue posible cargar el repertorio local: "+err.message;
 }
}
for(const btn of buttons)btn.addEventListener("click",()=>{
 setLanguage(btn.dataset.ldLang);void search(true);
});
root.querySelector("#lx-dict-refresh")?.addEventListener("click",()=>void search(true));
form?.addEventListener("submit",()=>{
 const q=query.value.trim();
 if(/[\u0590-\u05ff]/.test(q))setLanguage("he");
 else if(/[\u0370-\u03ff\u1f00-\u1fff]/.test(q))setLanguage("grc");
 void search(false);
});
const initial=new URLSearchParams(location.search).get("q");
if(initial){
 if(!query.value)query.value=initial;
 if(/[\u0590-\u05ff]/.test(initial))setLanguage("he");
 else if(/[\u0370-\u03ff\u1f00-\u1fff]/.test(initial))setLanguage("grc");
 void search(false);
}
})();