/* ClassicalLexicon: búsqueda por palabra con resaltado amarillo y diccionario griego/latino.
   - Normalización sin diacríticos que conserva la longitud del texto original (offset fiel).
   - Diccionario local: glosarios por obra (forma → lema + morfología → glosa LSJ) y
     data/classical-dictionary.json (formas latinas, Wiktextract) cargados bajo demanda.
   - Complemento en línea: Wiktionary REST (CORS abierto) y enlaces a Logeion, Perseus y Wiktionary.
*/
(()=>{
"use strict";
if(window.ClassicalLexicon)return;
const ROOT=(()=>{const s=document.currentScript?.src||"";const i=s.indexOf("assets/classical-lexicon.js");return i>=0?s.slice(0,i):""})();
const GREEK=/[Ͱ-Ͽἀ-῿]/;
const WORD=/[\p{L}\p{M}ʼ’']+/gu;
function foldChar(c){
 let x=c.normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
 if(x==="ς"||x==="ϲ")x="σ";else if(x==="j")x="i";else if(x==="v")x="u";
 else if(x==="ʼ"||x==="’")x="'";
 return x;
}
/* Pliega el texto carácter a carácter: norm[i] procede de text[map[i]]. */
function foldMap(text){
 const src=String(text||"");let norm="";const map=[];
 for(let i=0;i<src.length;){
  const cp=src.codePointAt(i),ch=String.fromCodePoint(cp),f=foldChar(ch);
  for(let k=0;k<f.length;k++){norm+=f[k];map.push(i)}
  if(!f.length&&/\p{M}/u.test(ch)){/* marca combinante aislada: se omite */}
  i+=ch.length;
 }
 map.push(src.length);
 return{norm,map};
}
function fold(s){return foldMap(s).norm}
function detectLang(w){return GREEK.test(String(w||""))?"grc":"la"}
/* Coincidencias de la consulta (palabra o frase) en el texto; "whole" restringe a palabra completa o inicio de palabra. */
function find(text,query,{prefix=true}={}){
 const q=fold(String(query||"").trim().replace(/\s+/g," "));if(q.length<2)return[];
 const {norm,map}=foldMap(text),out=[];
 const isL=c=>!!c&&/[\p{L}]/u.test(c);
 let from=0;
 while(true){
  const at=norm.indexOf(q,from);if(at<0)break;
  const before=norm[at-1],after=norm[at+q.length];
  if(!isL(before)&&(prefix||!isL(after)))out.push([map[at],map[at+q.length]??String(text).length]);
  from=at+Math.max(1,q.length);
 }
 return out;
}
/* Rellena target con text y <mark class="cl-hit"> en cada coincidencia; devuelve las marcas. */
function highlightInto(target,text,query,opts){
 target.replaceChildren();const s=String(text||"");const hits=query?find(s,query,opts):[];
 let last=0;const marks=[];
 for(const [a,b] of hits){
  if(a>last)target.append(document.createTextNode(s.slice(last,a)));
  const m=document.createElement("mark");m.className="cl-hit";m.textContent=s.slice(a,b);target.append(m);marks.push(m);last=b;
 }
 if(last<s.length)target.append(document.createTextNode(s.slice(last)));
 return marks;
}
function clearDom(root){
 for(const m of [...root.querySelectorAll("mark.cl-hit")]){const t=document.createTextNode(m.textContent);m.replaceWith(t)}
 root.normalize?.();
}
/* Resalta en un árbol DOM ya construido (páginas de corpus). */
function highlightDom(root,query,opts){
 clearDom(root);if(!query||fold(query).trim().length<2)return[];
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){
  const p=n.parentElement;if(!p||p.closest("script,style,textarea,input,select,button,.cl-ui,[data-cl-skip]"))return NodeFilter.FILTER_REJECT;
  return n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT}});
 const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
 const marks=[];
 for(const n of nodes){
  const hits=find(n.nodeValue,query,opts);if(!hits.length)continue;
  const frag=document.createDocumentFragment(),s=n.nodeValue;let last=0;
  for(const [a,b] of hits){if(a>last)frag.append(s.slice(last,a));const m=document.createElement("mark");m.className="cl-hit";m.textContent=s.slice(a,b);frag.append(m);marks.push(m);last=b}
  if(last<s.length)frag.append(s.slice(last));n.replaceWith(frag);
 }
 return marks;
}
/* Palabra bajo el puntero (clic o doble clic). */
function wordAt(ev){
 const sel=window.getSelection?.()?.toString()?.trim();
 if(sel&&sel.length<=60&&!/\s/.test(sel))return clean(sel);
 let node=null,off=0;
 if(document.caretPositionFromPoint){const p=document.caretPositionFromPoint(ev.clientX,ev.clientY);if(p){node=p.offsetNode;off=p.offset}}
 else if(document.caretRangeFromPoint){const r=document.caretRangeFromPoint(ev.clientX,ev.clientY);if(r){node=r.startContainer;off=r.startOffset}}
 if(!node||node.nodeType!==3)return"";
 let host=node.parentElement;if(host?.matches("mark.cl-hit"))host=host.parentElement;
 let s=node.nodeValue;
 if(host){const r=document.createRange();r.setStart(host,0);r.setEnd(node,off);off=r.toString().length;s=host.textContent}
 let a=off,b=off;const isW=c=>!!c&&/[\p{L}\p{M}]/u.test(c);
 while(a>0&&isW(s[a-1]))a--;while(b<s.length&&isW(s[b]))b++;
 return clean(s.slice(a,b));
}
function clean(w){return String(w||"").normalize("NFC").replace(/^[^\p{L}]+|[^\p{L}\p{M}]+$/gu,"")}

/* ---------- Morfología (etiquetas Perseus/AGDT de 9 posiciones) ---------- */
const POS={n:"sustantivo",v:"verbo",a:"adjetivo",d:"adverbio",l:"artículo",g:"partícula",c:"conjunción",r:"preposición",p:"pronombre",m:"numeral",i:"interjección",e:"exclamación",u:"puntuación",x:"irregular"};
const MORPH=[null,{1:"1.ª pers.",2:"2.ª pers.",3:"3.ª pers."},{s:"singular",p:"plural",d:"dual"},{p:"presente",i:"imperfecto",r:"perfecto",l:"pluscuamperfecto",t:"futuro perfecto",f:"futuro",a:"aoristo"},{i:"indicativo",s:"subjuntivo",o:"optativo",n:"infinitivo",m:"imperativo",p:"participio"},{a:"activa",p:"pasiva",m:"media",e:"medio-pasiva"},{m:"masculino",f:"femenino",n:"neutro",c:"común"},{n:"nominativo",g:"genitivo",d:"dativo",a:"acusativo",v:"vocativo",l:"locativo",b:"ablativo"},{c:"comparativo",s:"superlativo"}];
function morph(tag){
 let t=String(tag||"");if(!t)return"";const out=[];
 if(t.length===10)t=t[0]+t.slice(2); // variante de 10 posiciones (Celano): se omite la 2.ª
 if(POS[t[0]])out.push(POS[t[0]]);
 for(let i=1;i<MORPH.length;i++){const v=MORPH[i]?.[t[i]];if(v)out.push(v)}
 return out.join(" · ");
}

/* ---------- Diccionarios ---------- */
const cache=new Map();
async function json(path){
 if(!cache.has(path))cache.set(path,fetch(ROOT+path).then(r=>r.ok?r.json():null).catch(()=>null));
 return cache.get(path);
}
const glossaryIndex=new Map();
async function greekGlossary(work){
 const path="data/classics-lexicon/"+work+"-grc.json";
 if(glossaryIndex.has(path))return glossaryIndex.get(path);
 const p=json(path).then(d=>{
  if(!d?.forms)return null;
  const folded=new Map();
  for(const [f,an] of Object.entries(d.forms)){const k=fold(f);if(!folded.has(k))folded.set(k,[]);for(const a of an)folded.get(k).push(a)}
  const lemmaFold=new Map();for(const l of Object.keys(d.lemmas||{}))lemmaFold.set(fold(l),l);
  return{data:d,folded,lemmaFold};
 });
 glossaryIndex.set(path,p);return p;
}
const GREEK_GLOSSARIES=["vitruvius","theophrastus-characters","plato-apology","aristotle-poetics"];
const LATIN_GLOSSARIES=new Set(["vitruvius","caesar-gallico","virgil-aeneid","virgil-georgica","petronius-satyrica","apuleius-metamorphoses","cicero-officiis","lucretius","catullus-carmina","cato-agricultura","columella-rustica","frontinus-aquaeductu","pliny-naturalis","varro-rustica"]);
async function lookupGreek(word,work){
 const works=[...new Set([work,...GREEK_GLOSSARIES].filter(Boolean))];
 const w=word.normalize("NFC").toLowerCase(),k=fold(word);
 for(const id of works){
  const g=await greekGlossary(id);if(!g)continue;
  let an=g.data.forms[w]||g.folded.get(k)||null;let via="form";
  if(!an&&g.lemmaFold.has(k)){an=[[g.lemmaFold.get(k),""]];via="lemma"}
  if(!an)continue;
  const seen=new Set(),entries=[];
  for(const [lemma,tag] of an){const key=lemma+"|"+tag;if(seen.has(key))continue;seen.add(key);
   const L=g.data.lemmas[lemma]||{};entries.push({lemma:L.probable||lemma,morph:L.probable?"lema probable (forma "+lemma+"; verificar)":morph(tag),gloss:L.g||"",lang:"grc",source:"LSJ (glosa inglesa) · lematización Celano",lsjId:L.id||""})}
  return{entries,via,sources:g.data.sources,note:g.data.note};
 }
 /* Sin forma atestiguada: lema probable por raíz común en los glosarios (orientativo). */
 if(k.length>=5){
  const stem=k.slice(0,Math.max(4,k.length-3)),score=new Map();let src=null;
  for(const id of works){const g=await greekGlossary(id);if(!g)continue;
   for(const [fk,an] of g.folded)if(fk.startsWith(stem))for(const [lemma] of an){const c=score.get(lemma)||{n:0,g};c.n++;score.set(lemma,c);src=src||g}
  }
  const best=[...score.entries()].sort((a,b)=>b[1].n-a[1].n).slice(0,2);
  if(best.length)return{entries:best.map(([lemma,{g}])=>({lemma,morph:"lema probable por raíz (forma no atestiguada en el glosario; verificar)",gloss:g.data.lemmas[lemma]?.g||"",lang:"grc",source:"LSJ"})),via:"stem",sources:src.data.sources,note:src.data.note};
 }
 return null;
}
async function lookupLatinGlossary(word,work){
 if(!LATIN_GLOSSARIES.has(work))return null;
 const d=await json("data/classics-lexicon/"+work+"-la.json");if(!d?.forms)return null;
 const k=fold(word);let lem=d.forms[k];
 if(!lem)for(const enc of ["que","ne","ue"])if(k.endsWith(enc)&&d.forms[k.slice(0,-enc.length)]){lem=d.forms[k.slice(0,-enc.length)];break}
 if(!lem)return null;
 return{entries:lem.map(l=>{const L=d.lemmas[l]||{};return{lemma:L.h||l.replace(/\d+$/,""),morph:"",gloss:L.g||"",lang:"la",source:"Lewis & Short · lematización CLTK"}}),via:"form",sources:d.sources,note:d.note};
}
async function lookupLatin(word,work){
 const g=await lookupLatinGlossary(word,work);if(g)return g;
 const d=await json("data/classical-dictionary.json");if(!d?.latin)return null;
 const lower=word.toLowerCase();
 const variants=[...new Set([lower,lower.replace(/j/g,"i"),lower.replace(/v/g,"u"),lower.replace(/u/g,"v"),lower.replace(/j/g,"i").replace(/v/g,"u"),lower.normalize("NFD").replace(/\p{M}/gu,"")])];
 for(const v of variants){
  const hit=d.latin[v];if(!hit?.length)continue;
  return{entries:hit.slice(0,6).map(e=>({lemma:e.lemma,morph:e.pos||"",gloss:(e.glosses||[]).slice(0,4).join("; "),lang:"la",source:e.source||"Wiktionary"})),via:"form",sources:[{label:d.source,license:d.license}]};
 }
 return null;
}
/* Wiktionary REST: definiciones por idioma (grc / la); sigue «form of» hasta el lema. */
async function wiktionary(word,lang,depth=0){
 const code=lang==="grc"?"grc":"la";
 try{
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),6000);
  const r=await fetch("https://en.wiktionary.org/api/rest_v1/page/definition/"+encodeURIComponent(word.normalize("NFC")),{signal:ctl.signal,headers:{Accept:"application/json"}});
  clearTimeout(t);if(!r.ok)return null;
  const d=await r.json();const sec=d[code];if(!sec?.length)return null;
  const entries=[];
  for(const s of sec.slice(0,3)){
   for(const def of (s.definitions||[]).slice(0,3)){
    const html=def.definition||"";const tmp=document.createElement("div");tmp.innerHTML=html;
    const text=tmp.textContent.replace(/\s+/g," ").trim();if(!text)continue;
    const link=tmp.querySelector("a[href*='/wiki/'],a[rel='mw:WikiLink']");
    const formOf=/\b(inflection|form|singular|plural|participle|infinitive|genitive|dative|accusative|nominative|vocative|ablative|person)\b.*\bof\b/i.test(text)&&link;
    if(formOf&&depth<1){
     const lemma=decodeURIComponent((link.getAttribute("href")||"").split("/wiki/")[1]||"").split("#")[0].replace(/_/g," ");
     if(lemma&&lemma!==word){const sub=await wiktionary(lemma,lang,depth+1);entries.push({lemma,morph:text,gloss:sub?.entries?.map(e=>e.gloss).filter(Boolean).slice(0,2).join("; ")||"",lang,source:"Wiktionary"});continue}
    }
    entries.push({lemma:word,morph:s.partOfSpeech||"",gloss:text,lang,source:"Wiktionary"});
   }
  }
  return entries.length?{entries,via:"online",sources:[{label:"Wiktionary (en)",url:"https://en.wiktionary.org/wiki/"+encodeURIComponent(word),license:"CC BY-SA 4.0"}]}:null;
 }catch{return null}
}
async function lookup(word,{lang,work,online=true}={}){
 const w=clean(word);if(!w)return{word:"",entries:[]};
 lang=lang||detectLang(w);
 let res=lang==="grc"?await lookupGreek(w,work):await lookupLatin(w,work);
 if(!res&&online)res=await wiktionary(w,lang)||(w!==w.toLowerCase()?await wiktionary(w.toLowerCase(),lang):null);
 if(lang==="la"&&res?.entries?.length){
  const lx=await json("data/latin-lexicon.json");const strip=x=>fold(String(x||"").split(/[\s,]/)[0]).replace(/-/g,"");
  for(const e of res.entries){const k=strip(e.lemma);const hit=(lx?.entries||[]).find(x=>strip(x.lemma)===k||(x.forms||[]).some(f=>fold(f)===fold(w)&&strip(x.lemma)===k));
   if(hit){e.es=hit.es;e.esSense=(hit.senses||[])[0]||"";e.term=hit.lemma}}
 }
 const first=res?.entries?.[0]?.lemma?.split(/\s/)[0]?.normalize("NFD").replace(/[\u0304\u0306]/g,"").normalize("NFC").replace(/-/g,"");
 return{word:w,lang,entries:res?.entries||[],via:res?.via||"",sources:res?.sources||[],note:res?.note||"",links:links(w,lang,first)};
}
function links(word,lang,lemma){
 const L=lemma||word,la=lang==="grc"?"greek":"la";
 return[
  ["Logeion",`https://logeion.uchicago.edu/${encodeURIComponent(L)}`],
  ["Perseus · morfología",`https://www.perseus.tufts.edu/hopper/morph?l=${encodeURIComponent(word)}&la=${la}`],
  ["Wiktionary",`https://en.wiktionary.org/wiki/${encodeURIComponent(L)}#${lang==="grc"?"Ancient_Greek":"Latin"}`],
  ...(lang==="la"?[["Whitaker's Words",`https://archives.nd.edu/cgi-bin/wordz.pl?keyword=${encodeURIComponent(word)}`]]:[])
 ];
}

/* ---------- Panel de diccionario ---------- */
function css(){
 if(document.getElementById("cl-style"))return;
 const st=document.createElement("style");st.id="cl-style";
 st.textContent=`mark.cl-hit{background:#ffe45c;color:#14120e;border-radius:2px;padding:0 1px;box-shadow:0 0 0 1px rgba(160,120,0,.25)}
mark.cl-hit.cl-current{background:#ffb703;outline:2px solid #b07d00}
.cl-dict{font:13px/1.6 system-ui,-apple-system,sans-serif;border-top:1px solid var(--line,#bcb3a4);padding:12px 0 0;margin-top:16px}
.cl-dict h4{font:600 11px/1.4 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;margin:0 0 6px;color:var(--muted,#666)}
.cl-dict .cl-word{font:20px/1.3 Georgia,"Times New Roman",serif;margin:0 0 6px}
.cl-dict .cl-entry{margin:0 0 8px;padding:6px 0 6px 10px;border-left:3px solid #e8c547}
.cl-dict .cl-lemma{font:17px/1.3 Georgia,serif;font-weight:600}.cl-dict .cl-morph{display:block;font-size:12px;color:var(--muted,#666)}
.cl-dict .cl-gloss{display:block}.cl-dict .cl-src,.cl-dict .cl-note{font-size:11px;color:var(--muted,#666)}
.cl-dict .cl-links{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:6px}.cl-dict .cl-links a{font-size:12px}
[data-cl-words]{cursor:help}`;
 document.head.append(st);
}
async function renderPanel(container,word,opts={}){
 css();container.classList.add("cl-dict");container.replaceChildren();
 const h=document.createElement("h4");h.textContent="Diccionario";container.append(h);
 const w=document.createElement("p");w.className="cl-word";w.textContent=clean(word);w.lang=detectLang(word)==="grc"?"grc":"la";container.append(w);
 const wait=document.createElement("p");wait.className="cl-note";wait.textContent="Consultando el glosario local…";container.append(wait);
 const res=await lookup(word,opts);wait.remove();
 if(!res.entries.length){const p=document.createElement("p");p.textContent="Sin entrada en los glosarios locales ni respuesta del diccionario en línea. Consulta los léxicos enlazados.";container.append(p)}
 for(const e of res.entries){
  const box=document.createElement("div");box.className="cl-entry";
  const l=document.createElement("span");l.className="cl-lemma";l.lang=e.lang==="grc"?"grc":"la";l.textContent=e.lemma;box.append(l);
  if(e.morph){const m=document.createElement("span");m.className="cl-morph";m.textContent=e.morph;box.append(m)}
  if(e.es){const es=document.createElement("span");es.className="cl-gloss";es.textContent="Castellano: "+e.es+(e.esSense?" — "+e.esSense:"");box.append(es)}
  const g=document.createElement("span");g.className="cl-gloss";g.textContent=(e.es?"Inglés (léxico): ":"")+(e.gloss||"(sin glosa breve: ver el léxico completo)");box.append(g);
  if(e.term){const a=document.createElement("a");a.href=ROOT+"termino.html?t="+encodeURIComponent(e.term);a.textContent="Ficha del término en Vitruvio →";a.style.fontSize="12px";box.append(a)}
  container.append(box);
 }
 if(res.sources?.length){const s=document.createElement("p");s.className="cl-src";s.textContent="Fuente: "+res.sources.map(x=>x.label+(x.license?" ("+x.license+")":"")).join(" · ")+(res.note?" — "+res.note:"");container.append(s)}
 const ln=document.createElement("div");ln.className="cl-links";
 for(const [t,u] of res.links){const a=document.createElement("a");a.href=u;a.target="_blank";a.rel="noopener noreferrer";a.textContent=t+" ↗";ln.append(a)}
 container.append(ln);
 return res;
}
/* Clic en una palabra de root → panel. */
function attachClick(root,container,opts={}){
 css();root.setAttribute("data-cl-words","");
 const handler=ev=>{
  if(ev.target.closest?.("a,button,input,select,textarea,.cl-ui"))return;
  const w=wordAt(ev);if(!w||w.length<2)return;
  const o=typeof opts==="function"?opts(w):opts;if(o===null)return;
  renderPanel(typeof container==="function"?container():container,w,o);
  o?.onWord?.(w);
 };
 root.addEventListener("click",handler);
 return()=>root.removeEventListener("click",handler);
}
/* Palabra completa que contiene una marca de resaltado (la búsqueda admite prefijos). */
function wordOfMark(m){
 const host=m.parentElement;if(!host)return m.textContent;
 const r=document.createRange();r.setStart(host,0);r.setEnd(m,0);const off=r.toString().length;const s=host.textContent;
 const isW=c=>!!c&&/[\p{L}\p{M}]/u.test(c);let a=off,b=off+m.textContent.length;
 while(a>0&&isW(s[a-1]))a--;while(b<s.length&&isW(s[b]))b++;return clean(s.slice(a,b));
}
window.ClassicalLexicon={wordOfMark,fold,foldMap,find,highlightInto,highlightDom,clearDom,wordAt,detectLang,lookup,renderPanel,attachClick,morph,css,links};
})();
