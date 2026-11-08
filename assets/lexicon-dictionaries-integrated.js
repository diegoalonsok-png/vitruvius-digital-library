/* Diccionarios integrados de Lexicon · edición local documentada.
   Sin transformar las glosas en definiciones críticas ni inventar etimologías. */
(()=>{"use strict";
const root=document.getElementById("lx-dictionaries"),query=document.getElementById("lx-q");
if(!root||!query)return;
const output=document.getElementById("lx-dict-results");
const status=document.getElementById("lx-dict-status");
const buttons=[...root.querySelectorAll("[data-ld-lang]")];
const form=document.getElementById("lx-form");
const cache=new Map();
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
function matchEntries(doc,q,lang){
 const k=lang==="he"?heb(q):normal(q);
 if(!k)return [];
 const found=new Map();
 const add=(x)=>{if(x&&x.lemma)found.set(x.lemma,x)};
 if(doc.entries[k])add(doc.entries[k]);
 for(const lemma of (doc.forms?.[k]||[]).slice(0,6))add(doc.entries[lemma]);
 // Transliteración ortográfica aproximada: no se declara lematización.
 if(!found.size&&lang==="grc"&&/^[a-z -]{2,40}$/i.test(q)){
  for(const x of Object.values(doc.entries)){
   if(greekRoman(x.lemma)===normal(q))add(x);
   if(found.size>=8)break;
  }
 }
 if(found.size)return [...found.values()].slice(0,8);
 if(k.length<3)return [];
 for(const [token,entry] of Object.entries(doc.entries)){
  if(token.startsWith(k)){
   add(entry);if(found.size>=8)break;
  }
 }
 return [...found.values()];
}
function external(entry,lang){
 const heading=entry.lemma;
 if(lang==="he")return link("Consultar fuentes hebreas (Sefaria)","https://www.sefaria.org/search?q="+encodeURIComponent(heading));
 return link("Consultar diccionario completo en Logeion","https://logeion.uchicago.edu/"+encodeURIComponent(heading));
}
function card(e,lang){
 const wrap=node("article","lx-dict-card");
 const h=node("h3","",e.lemma);
 h.lang=lang==="grc"?"grc":lang; if(lang==="he"){h.lang="he";h.dir="rtl"}
 wrap.append(h);
 if(e.transliteration)wrap.append(node("p","lx-dict-transliteration",e.transliteration));
 wrap.append(node("p","lx-dict-gloss",e.gloss||"Sin glosa local: consultar el diccionario enlazado."));
 if(e.root)wrap.append(node("p","lx-dict-meta","Raíz registrada: "+e.root+(e.rootGloss?" · "+e.rootGloss:"")));
 if(e.relatedLatinGreek)wrap.append(node("p","lx-dict-meta","Correspondencia editorial: "+e.relatedLatinGreek));
 wrap.append(node("p","lx-dict-meta",e.source+" · "+(e.editorial||"Glosa orientativa")));
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
  const doc=await dictionary(lang);
  if(id!==sequence)return;
  const list=matchEntries(doc,q,lang);
  status.textContent=list.length
   ?list.length+" entrada(s) del repertorio local de "+names[lang]+". Las glosas son orientativas; consultar la fuente completa."
   :"No hay una entrada local para esa forma en "+names[lang]+". El enlace externo permite seguir investigando.";
  for(const e of list)output.append(card(e,lang));
  if(!list.length){
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