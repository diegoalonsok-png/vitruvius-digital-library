/* Vitruvia Lexicon · motor léxico, fraseológico y sintáctico del mundo antiguo.
   Funciona sin servidor (GitHub Pages): índices JSON estructurados (data/lexicon/*) que el
   navegador convierte en un índice invertido con postings por forma y por lema.
   Datos: corpus local editado (Perseus DL, Wikisource, Gutenberg, ediciones Kurilo),
   lematizaciones automáticas (CLTK, Celano), glosas Lewis & Short y LSJ (Perseus DL),
   fichas etimológicas editoriales y complemento opcional de Wiktionary.
   Ninguna función inventa resultados: lo que no está en los datos se declara ausente. */
(()=>{
"use strict";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const ROOT=(()=>{const s=document.currentScript?.src||"";const i=s.indexOf("assets/vitruvia-lexicon.js");return i>=0?s.slice(0,i):""})();
const SITE="https://diegoalonsok-png.github.io/vitruvius-digital-library/";
const PAGE=SITE+"vitruvia-lexicon.html";
const GREEK=/[Ͱ-Ͽἀ-῿]/, HEBREW=/[֐-׿]/;
const TOKEN=/[\p{L}\p{M}][\p{L}\p{M}'ʼ’]*/gu;
const PAGE_SIZE=25, MAX_HITS=4000;
const CHRONO={"homer-iliad":-750,"homer-odyssey":-720,"plato-apology":-399,"aristotle-poetics":-335,"theophrastus-characters":-319,"lucretius":-55,"catullus-carmina":-54,"caesar-gallico":-50,"cicero-officiis":-44,"virgil-georgica":-29,"virgil-aeneid":-19,"vitruvius":-25,"petronius-satyrica":60,"epictetus-enchiridion":125,"apuleius-metamorphoses":170};
const DATING={"homer-iliad":"s. VIII a. C.","homer-odyssey":"s. VIII–VII a. C.","plato-apology":"c. 399–390 a. C.","aristotle-poetics":"c. 335 a. C.","theophrastus-characters":"c. 319 a. C.","lucretius":"c. 55 a. C.","catullus-carmina":"c. 60–54 a. C.","caesar-gallico":"58–50 a. C.","cicero-officiis":"44 a. C.","virgil-georgica":"29 a. C.","virgil-aeneid":"29–19 a. C.","vitruvius":"c. 30–20 a. C.","petronius-satyrica":"s. I d. C.","epictetus-enchiridion":"s. II d. C. (Arriano)","apuleius-metamorphoses":"s. II d. C."};
const STOP={la:new Set("et in est non ad cum ut quae qui quod sed ex e a ab de per si autem enim etiam aut uel nec neque quam sunt esse sit se sic item ita eius eorum ea eo id hic haec hoc is ille illa atque ac ne nam quo qua quia tum tam sibi suis sua suo suam suum quoque uti erit erunt fuit eis iis his quibus quorum quem quas quos eam eum ipse ipsa ipsum iam inter sub pro ob post ante tamen uero".split(" ")),
 grc:new Set("και δε ο η το του τησ των τον την τα τω τοισ ταισ τουσ τασ γαρ μεν τε ουκ ου ουχ εν εισ εσ εκ εξ επι προσ κατα δια μη ωσ αλλα αλλ αν οτι περι παρα απο υπο ουδε ουτε ειναι εστι εστιν αυτοσ αυτου αυτω αυτον αυτη αυτων αυτοισ τισ τι οσ ην ησ ων οι αι δ τ γ ουν δη μοι σοι με σε εγω συ ημεισ υμεισ αλλ απ αφ επ εφ κατ καθ μετ μεθ παρ υπ υφ ουδ μηδ δι ενθαδ ποτ τοτ οτ αμ ουτ μητ".split(" "))};

/* ---------- Normalización Unicode ---------- */
function fold(s){return String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[ςϲ]/g,"σ").replace(/j/g,"i").replace(/v/g,"u").replace(/[ʼ’]/g,"'")}
function foldMap(text){let norm="",map=[];const src=String(text||"");for(let i=0;i<src.length;){const cp=src.codePointAt(i),ch=String.fromCodePoint(cp),f=fold(ch);for(let k=0;k<f.length;k++){norm+=f[k];map.push(i)}i+=ch.length}map.push(src.length);return{norm,map}}
/* Clave de aproximación fonética y de errores de transcripción. */
function variantKey(k,lang){
 if(lang==="grc")return k.replace(/ει|οι|υι|η|υ/g,"ι").replace(/ω/g,"ο").replace(/αι/g,"ε").replace(/(.)\1/g,"$1");
 return k.replace(/ae|oe/g,"e").replace(/y/g,"i").replace(/ph/g,"f").replace(/th/g,"t").replace(/ch/g,"c").replace(/k/g,"c").replace(/h/g,"").replace(/ti(?=[aeiou])/g,"ci").replace(/mn/g,"n").replace(/(.)\1/g,"$1");
}
const G2L={α:"a",β:"b",γ:"g",δ:"d",ε:"e",ζ:"z",η:"e",θ:"th",ι:"i",κ:"k",λ:"l",μ:"m",ν:"n",ξ:"x",ο:"o",π:"p",ρ:"r",σ:"s",τ:"t",υ:"u",φ:"ph",χ:"ch",ψ:"ps",ω:"o"};
/* Transliteración común: ἄνθρωπος → anthropos, φύσις → phusis, ἱστορία → istoria. */
function greekToLatin(k){return k.replace(/γ(?=[γκξχ])/g,"n").replace(/ου/g,"u").replace(/./g,c=>G2L[c]??c)}
function transKeyFromGreek(k){return greekToLatin(k)}
function latinTranslitKey(q){return fold(q).replace(/^h/,"").replace(/rh/g,"r").replace(/kh/g,"ch").replace(/c(?!h)/g,"k").replace(/y/g,"u").replace(/ou/g,"u").replace(/ae/g,"ai").replace(/oe/g,"oi").replace(/f/g,"ph").replace(/ks/g,"x")}
function detectLang(s){return HEBREW.test(s)?"he":GREEK.test(s)?"grc":"la"}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function lev(a,b,max){if(Math.abs(a.length-b.length)>max)return max+1;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const cur=[i];let best=i;for(let j=1;j<=b.length;j++){cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));if(cur[j]<best)best=cur[j]}if(best>max)return max+1;prev=cur}return prev[b.length]}

/* ---------- Carga de datos ---------- */
const cache=new Map();
function load(path){if(!cache.has(path))cache.set(path,fetch(ROOT+path,{cache:"force-cache"}).then(r=>{if(!r.ok)throw new Error(path+" · HTTP "+r.status);return r.json()}));return cache.get(path)}
const L={};
async function lang(l,silent=false){
 if(L[l])return L[l];
 L[l]=(async()=>{
  if(!silent)setState(l==="grc"?"Cargando el corpus griego y su índice léxico…":"Cargando el corpus latino y su índice léxico…");
  const [corpus,forms]=await Promise.all([load(`data/lexicon/corpus-${l}.json`),load(`data/lexicon/forms-${l}.json`)]);
  const post=new Map(), freq=new Map(), workFreq=new Map(), workTokens={};
  corpus.passages.forEach((p,i)=>{
   const seen=new Set();
   for(const m of p[2].matchAll(TOKEN)){const k=fold(m[0]).replace(/'+$/,"");if(!k)continue;workTokens[p[0]]=(workTokens[p[0]]||0)+1;freq.set(k,(freq.get(k)||0)+1);
    let wf=workFreq.get(k);if(!wf){wf={};workFreq.set(k,wf)}wf[p[0]]=(wf[p[0]]||0)+1;
    if(!seen.has(k)){seen.add(k);let a=post.get(k);if(!a){a=[];post.set(k,a)}a.push(i)}}
  });
  const tokens=[...freq.values()].reduce((a,b)=>a+b,0);
  const lemmaForms=new Map();
  for(const [k,an] of Object.entries(forms.forms))for(const a of an){const lem=a[0];let s=lemmaForms.get(lem);if(!s){s=new Set();lemmaForms.set(lem,s)}s.add(k)}
  /* Formas del corpus sin análisis también se reconocen como formas. */
  const keys=[...post.keys()];
  return{l,corpus,forms,post,freq,workFreq,workTokens,tokens,lemmaForms,keys,_trans:null,_variant:null,_lemmaPost:null};
 })();
 return L[l];
}
function transIndex(D){if(!D._trans){D._trans=new Map();for(const k of D.keys){const t=transKeyFromGreek(k);let a=D._trans.get(t);if(!a){a=[];D._trans.set(t,a)}a.push(k)}}return D._trans}
function variantIndex(D){if(!D._variant){D._variant=new Map();for(const k of D.keys){const v=variantKey(k,D.l);let a=D._variant.get(v);if(!a){a=[];D._variant.set(v,a)}a.push(k)}}return D._variant}
function analyses(D,k){return D.forms.forms[k]||[]}
function lemmaInfo(D,lem){return D.forms.lemmas[lem]||{}}
function lemmaDisplay(lem){return String(lem).replace(/\d+$/,"")}

/* ---------- Morfología (etiquetas AGDT / Perseus del griego) ---------- */
/* Celano / AGDT, 10 posiciones: 0 categoría · 1 subtipo (e = nombre propio) · 2 persona · 3 número ·
   4 tiempo · 5 modo · 6 voz · 7 género · 8 caso · 9 grado. */
const TAG=[
 {i:0,v:{n:"sustantivo",v:"verbo",a:"adjetivo",d:"adverbio",l:"artículo",g:"partícula",c:"conjunción",r:"preposición",p:"pronombre",m:"numeral",i:"interjección",e:"exclamación",x:"irregular"}},
 {i:1,v:{e:"nombre propio",a:"demostrativo",r:"relativo",i:"interrogativo",x:"indefinido",p:"personal",s:"posesivo",k:"reflexivo",d:"demostrativo"}},
 {i:2,v:{1:"1.ª pers.",2:"2.ª pers.",3:"3.ª pers."}},
 {i:3,v:{s:"singular",p:"plural",d:"dual"}},
 {i:4,v:{p:"presente",i:"imperfecto",r:"perfecto",l:"pluscuamperfecto",t:"futuro perfecto",f:"futuro",a:"aoristo"}},
 {i:5,v:{i:"indicativo",s:"subjuntivo",o:"optativo",n:"infinitivo",m:"imperativo",p:"participio"}},
 {i:6,v:{a:"activa",p:"pasiva",m:"media",e:"mediopasiva"}},
 {i:7,v:{m:"masculino",f:"femenino",n:"neutro",c:"común"}},
 {i:8,v:{n:"nominativo",g:"genitivo",d:"dativo",a:"acusativo",v:"vocativo",l:"locativo"}},
 {i:9,v:{c:"comparativo",s:"superlativo"}}
];
/* Las etiquetas AGDT de 9 posiciones carecen del subtipo: se normalizan a 10. */
function normTag(t){t=String(t||"");return t.length===9?t[0]+"-"+t.slice(1):t}
function decodeTag(t){if(!t)return"";t=normTag(t);const out=[];for(const {i,v} of TAG){const c=t[i];if(c&&c!=="-"&&v[c])out.push(v[c])}return out.join(" · ")}
const PATTERN_ALIASES={pos:{noun:"n",sust:"n",n:"n",verb:"v",verbo:"v",v:"v",adj:"a",a:"a",adv:"d",art:"l",particle:"g",part:"g",conj:"c",prep:"r",pron:"p",num:"m"},
 case:{nom:"n",gen:"g",dat:"d",acc:"a",ac:"a",voc:"v"},num:{sg:"s",pl:"p",du:"d"},tense:{pres:"p",imperf:"i",perf:"r",plup:"l",fut:"f",aor:"a"},
 mood:{ind:"i",subj:"s",opt:"o",inf:"n",imp:"m",ptc:"p",part:"p"},voice:{act:"a",pass:"p",mid:"m",mp:"e"},gender:{m:"m",masc:"m",f:"f",fem:"f",n:"n",neut:"n"}};
const PATTERN_POS={pos:0,person:2,num:3,tense:4,mood:5,voice:6,gender:7,case:8};
function parsePattern(src){const conds=[];for(const part of src.split(/[\s,]+/).filter(Boolean)){const [kRaw,vRaw]=part.split("=");const k=({caso:"case",modo:"mood",tiempo:"tense",voz:"voice",genero:"gender",género:"gender",numero:"num",número:"num",persona:"person"})[kRaw]||kRaw;if(!(k in PATTERN_POS)||!vRaw)continue;const vals=vRaw.split("|").map(v=>(PATTERN_ALIASES[k]?.[v]??v));conds.push([PATTERN_POS[k],vals])}return conds}
function tagMatches(tag,conds){const t=normTag(tag);return conds.every(([pos,vals])=>vals.includes(t[pos]))}

/* ---------- Analizador de consultas ---------- */
/* Gramática: palabra · "frase exacta" · @lema · comod*n · t?xis · ~fuzzy · raiz: · [pos=verb mood=ptc case=gen] · A ..3 B (orden, hasta 3 palabras) · A NEAR/5 B (sin orden) */
function parseQuery(q,mode){
 q=String(q||"").trim();const steps=[];let near=null;
 const re=/"([^"]+)"|\[([^\]]+)\]|NEAR\/(\d+)|~(\d+)(?=\s)|\.\.(\d+)|(\S+)/g;let m;let gap=mode==="frase"||mode==="sintaxis"?0:null;
 while((m=re.exec(q))){
  if(m[1]){for(const w of m[1].split(/\s+/).filter(Boolean)){steps.push({term:mkTerm(w),gap:steps.length?0:null})}continue}
  if(m[2]){steps.push({term:{type:"pattern",src:m[2],conds:parsePattern(m[2])},gap:steps.length?(gap??0):null});gap=mode==="frase"||mode==="sintaxis"?0:null;continue}
  if(m[3]){near=+m[3];continue}
  if(m[4]){near=+m[4];continue}
  if(m[5]){gap=+m[5];continue}
  steps.push({term:mkTerm(m[6]),gap:steps.length?gap:null});gap=mode==="frase"||mode==="sintaxis"?0:null;
 }
 return{steps,near,raw:q};
}
function mkTerm(w){
 if(/^@/.test(w))return{type:"lemma",v:w.slice(1)};
 if(/^raiz:|^raíz:|^root:/i.test(w))return{type:"wild",v:w.replace(/^[^:]+:/,"")+"*"};
 if(/^~/.test(w))return{type:"fuzzy",v:w.slice(1)};
 if(/[*?]/.test(w))return{type:"wild",v:w};
 return{type:"form",v:w};
}
/* Resuelve un término en el conjunto de claves de forma del índice. */
function resolveTerm(D,t,opts={}){
 const out=new Set();const add=k=>{if(D.post.has(k))out.add(k)};
 if(t.type==="form"){const k=fold(t.v).replace(/[^\p{L}']/gu,"");add(k);
  if(opts.lemmatize){for(const a of analyses(D,k))for(const f of (D.lemmaForms.get(a[0])||[]))add(f)}
  if(opts.variants){for(const f of (variantIndex(D).get(variantKey(k,D.l))||[]))add(f)}
  if(!out.size&&D.l==="grc"&&!GREEK.test(t.v)){for(const f of (transIndex(D).get(latinTranslitKey(t.v))||[]))add(f)}
 }else if(t.type==="lemma"){const lk=fold(t.v);for(const [lem,fs] of D.lemmaForms){if(fold(lemmaDisplay(lem))===lk)for(const f of fs)add(f)}
  if(!out.size)add(lk);
 }else if(t.type==="wild"){let pat=fold(t.v);if(D.l==="grc"&&!GREEK.test(t.v)){/* comodín transliterado */const rx=new RegExp("^"+latinTranslitKey(t.v).replace(/[.+^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$");for(const [tk,fs] of transIndex(D))if(rx.test(tk))fs.forEach(add)}
  else{const rx=new RegExp("^"+pat.replace(/[.+^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$","u");for(const k of D.keys)if(rx.test(k))out.add(k)}
 }else if(t.type==="fuzzy"){const k=fold(t.v);const max=k.length>7?2:1;for(const f of D.keys)if(f[0]===k[0]&&lev(f,k,max)<=max)out.add(f);
  if(D.l==="grc"&&!GREEK.test(t.v)){const tk=latinTranslitKey(t.v);for(const [x,fs] of transIndex(D))if(lev(x,tk,max)<=max)fs.forEach(add)}
 }else if(t.type==="pattern"){for(const [k,an] of Object.entries(D.forms.forms))if(an.some(a=>a.length>2&&tagMatches(a[1],t.conds)))add(k)}
 return out;
}
/* Ejecuta la consulta: postings → verificación posicional → coincidencias con desplazamientos. */
function execute(D,parsed,opts={}){
 const sets=parsed.steps.map(s=>resolveTerm(D,s.term,opts));
 if(!sets.length||sets.some(s=>!s.size))return{hits:[],sets};
 /* Candidatos: intersección de las uniones de postings. */
 let cand=null;
 for(const s of sets){const u=new Set();for(const k of s)for(const i of D.post.get(k)||[])u.add(i);cand=cand?new Set([...cand].filter(i=>u.has(i))):u;if(!cand.size)break}
 const hits=[];const filt=opts.work||"";
 for(const i of [...cand].sort((a,b)=>a-b)){
  const p=D.corpus.passages[i];if(filt&&p[0]!==filt)continue;
  const toks=[...p[2].matchAll(TOKEN)].map(m=>({k:fold(m[0]).replace(/'+$/,""),s:m.index,e:m.index+m[0].length}));
  if(parsed.near!=null&&sets.length>1){
   for(let a=0;a<toks.length;a++){if(!sets[0].has(toks[a].k))continue;const span=[a];let ok=true;for(let j=1;j<sets.length;j++){let found=-1;for(let b=Math.max(0,a-parsed.near-1);b<=Math.min(toks.length-1,a+parsed.near+1);b++)if(b!==a&&sets[j].has(toks[b].k)){found=b;break}if(found<0){ok=false;break}span.push(found)}
    if(ok){hits.push({i,spans:span.map(x=>[toks[x].s,toks[x].e]),tok:Math.min(...span)});if(hits.length>=MAX_HITS)return{hits,sets,capped:true}}}
  }else{
   for(let a=0;a<toks.length;a++){
    if(!sets[0].has(toks[a].k))continue;const span=[a];let pos=a,ok=true;
    for(let j=1;j<sets.length;j++){const g=parsed.steps[j].gap;let found=-1;const maxGap=g==null?(opts.defaultGap??6):g;for(let b=pos+1;b<=Math.min(toks.length-1,pos+1+maxGap);b++)if(sets[j].has(toks[b].k)){found=b;break}if(found<0){ok=false;break}span.push(found);pos=found}
    if(ok){hits.push({i,spans:span.map(x=>[toks[x].s,toks[x].e]),tok:a});if(hits.length>=MAX_HITS)return{hits,sets,capped:true}}
   }
  }
 }
 return{hits,sets};
}

/* ---------- Citas y enlaces ---------- */
function work(D,id){return D.corpus.works[id]||{author:id,title:"",cite:id}}
function verseLocus(D,p,offset){
 const w=work(D,p[0]);const start=p[3];
 if(start==null||start===undefined||typeof start!=="number")return p[1];
 const before=p[2].slice(0,offset).split("\n").length-1;const book=p[1].includes(".")?p[1].split(".")[0]+".":"";
 return book+(start+before);
}
function citeOf(D,p,offset){return work(D,p[0]).cite+" "+(offset!=null?verseLocus(D,p,offset):p[1])}
function readerLink(D,p){
 const w=work(D,p[0]);let u=w.reader||"";const book=p[1].split(".")[0];
 const roman=n=>{const R=[[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];let r="";n=+n;for(const [v,s] of R)while(n>=v){r+=s;n-=v}return r};
 u=u.replace("{locus}",encodeURIComponent(p[1])).replace("{book}",book).replace("{roman}",roman(p[1]));
 if(u.includes("classics-text-reader"))u+="&locus="+encodeURIComponent(p[1]);
 return u;
}
function vitruvianLinks(locus){
 const l=encodeURIComponent(locus);
 return [["Lector bilingüe ES",`lector-bilingue.html?edition=recensio-es&locus=${l}`],["FR",`lector-bilingue.html?edition=recensio-fr&locus=${l}`],["EN",`lector-bilingue.html?edition=theory-en&locus=${l}`],["Aparato crítico",`aparato-critico.html?locus=${l}`],["Colación Rose / Krohn",`colacion.html?locus=${l}`],["Codex H",`codex-h-folios-local.html?locus=${l}`]];
}

/* ---------- Estado e interfaz ---------- */
const S={q:"",mode:"palabra",lang:"auto",work:"",page:0,result:null,D:null,ui:"es",etym:null,sent:null,phil:null,lastEntry:null};
function setState(t){const el=$("#lx-state");if(el)el.textContent=t}
const MODES={
 palabra:{label:"Palabra",help:"Ficha léxica: lema, morfología, acepciones, etimología, formas atestiguadas, distribución por autor y concordancia. Acepta formas flexionadas, transliteración (anthropos → ἄνθρωπος), comodines (aedi*) y aproximación (~simetria)."},
 lema:{label:"Lema y flexión",help:"Busca todas las formas flexionadas de un lema: @domus, @λόγος. Escriba el lema o una de sus formas."},
 etimologia:{label:"Etimología",help:"Fichas etimológicas: raíz indoeuropea, latín arcaico, griego, hebreo y préstamos; también por equivalente hebreo (בית, דבר)."},
 frase:{label:"Frase exacta",help:"Frases y fórmulas en orden exacto: \"firmitatis utilitatis venustatis\". Sintaxis: A ..3 B (B hasta tres palabras después de A); A NEAR/5 B (en cualquier orden, a cinco palabras)."},
 sintaxis:{label:"Sintaxis",help:"Patrones morfosintácticos (griego, con análisis automático): [mood=ptc case=gen] [case=gen] · @λέγω [mood=inf]. En latín: combinación de lemas y formas con distancia (@facio ..2 @opus). Incluye colocaciones."},
 paralelos:{label:"Paralelos",help:"Loci paralleli: pega una frase y Lexicon busca los pasajes que comparten más lemas significativos, ponderados por su rareza (IDF)."},
 analizar:{label:"Analizar frase",help:"Análisis palabra por palabra: lema, morfología, glosa y frecuencia en el corpus; vista interlineal y exportación TEI."},
 sententiae:{label:"Sententiae",help:"Fraseario del mundo antiguo: sentencias célebres con referencia canónica, traducción, notas sintácticas y verificación en el corpus local."}
};

function renderTabs(){
 const box=$("#lx-tabs");box.replaceChildren();
 for(const [k,m] of Object.entries(MODES)){const b=document.createElement("button");b.type="button";b.className="tab";b.dataset.mode=k;b.textContent=m.label;b.setAttribute("aria-pressed",String(S.mode===k));b.addEventListener("click",()=>{S.mode=k;renderTabs();$("#lx-mode-note").textContent=m.help;if(S.q)run()});box.append(b)}
 $("#lx-mode-note").textContent=MODES[S.mode].help;
}

/* Tokeniza un texto en <span class="w"> enlazables (interconexión de todas las palabras). */
function linkWords(text,spans=[],nl=null){
 const frag=document.createDocumentFragment();let last=0;const src=String(text||"");
 const marks=spans.slice().sort((a,b)=>a[0]-b[0]);
 const inMark=i=>marks.some(([s,e])=>i>=s&&i<e);
 const txt=t=>document.createTextNode(nl!=null?t.replace(/\n/g,nl):t);
 for(const m of src.matchAll(TOKEN)){
  if(m.index>last)frag.append(txt(src.slice(last,m.index)));
  const w=document.createElement(inMark(m.index)?"mark":"span");w.className="w";w.textContent=m[0];w.dataset.w=m[0];frag.append(w);last=m.index+m[0].length;
 }
 if(last<src.length)frag.append(txt(src.slice(last)));
 return frag;
}
function kwic(text,spans,ctx=14){
 const toks=[...text.matchAll(TOKEN)];const first=spans[0][0],lastE=spans[spans.length-1][1];
 let ti=toks.findIndex(t=>t.index>=first);if(ti<0)ti=0;let te=toks.findIndex(t=>t.index>=lastE);if(te<0)te=toks.length;
 const a=toks[Math.max(0,ti-ctx)]?.index??0;const bTok=toks[Math.min(toks.length-1,te+ctx-1)];const b=bTok?bTok.index+bTok[0].length:text.length;
 return{a,b,pre:a>0,post:b<text.length};
}

function el(tag,attrs={},...kids){const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(v==null||v===false)continue;if(k==="class")e.className=v;else if(k==="html")e.innerHTML=v;else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?"":v)}for(const c of kids.flat()){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(String(c)))}return e}

/* ---------- Ejecución ---------- */
async function run(push=true){
 const q=$("#lx-q").value.trim();S.q=q;S.page=0;
 const list=$("#lx-results");list.replaceChildren();$("#lx-entry").replaceChildren();$("#lx-entry").hidden=true;$("#lx-side-extra").replaceChildren();
 if(push){const u=new URL(location.href);u.searchParams.set("q",q);u.searchParams.set("mode",S.mode);if(S.lang!=="auto")u.searchParams.set("lang",S.lang);else u.searchParams.delete("lang");if(S.work)u.searchParams.set("work",S.work);else u.searchParams.delete("work");try{history.replaceState(null,"",u)}catch{}}
 if(!q&&S.mode!=="sententiae"){setState("Escriba una palabra, una frase o un patrón.");return}
 try{
  if(S.mode==="sententiae")return renderSententiae(q);
  if(S.mode==="etimologia")return renderEtymSearch(q);
  if(["es","en","fr","de"].includes(S.lang))return renderModernWord(q,S.lang);
  if(S.mode==="analizar")return analyzeSentence(q);
  if(S.mode==="paralelos")return parallels(q);
  const l=resolveLang(q);
  if(l==="he")return renderHebrew(q);
  const D=await lang(l);S.D=D;fillWorks(D);
  const parsed=parseQuery(q,S.mode);
  const opts={lemmatize:S.mode==="lema"||S.mode==="palabra"&&$("#lx-lemmatize").checked,variants:$("#lx-variants").checked,work:S.work,defaultGap:S.mode==="frase"?0:6};
  if(S.mode==="lema")parsed.steps.forEach(s=>{if(s.term.type==="form")s.term={type:"lemma",v:s.term.v,fallback:true}});
  let res=execute(D,parsed,opts);
  if(S.mode==="lema"&&!res.hits.length){/* el usuario escribió una forma: se resuelve su lema */parsed.steps.forEach(s=>{if(s.term.fallback)s.term={type:"form",v:s.term.v}});res=execute(D,parsed,{...opts,lemmatize:true})}
  if(!res.hits.length&&l==="la"&&S.lang==="auto"&&!/[\[@"]/.test(q)){const G=await lang("grc");const r2=execute(G,parseQuery(q,S.mode),opts);if(r2.hits.length){S.D=G;fillWorks(G);res=r2}}
  S.result={...res,parsed};
  if(S.D.l==="la"&&S.lang==="auto"&&S.mode==="palabra"&&parsed.steps.length===1&&parsed.steps[0].term.type==="form"&&res.hits.length)setTimeout(async()=>{const G=await lang("grc",true);const g=transIndex(G).get(latinTranslitKey(q));if(g?.length){const lems=[...new Set(g.flatMap(k=>analyses(G,k).map(a=>lemmaDisplay(a[0]))))].slice(0,3);const st=$("#lx-state");st.append(" ",el("button",{type:"button",class:"lx-btn",lang:"grc",onclick:()=>{$("#lx-q").value=lems[0]||g[0];S.lang="grc";$("#lx-lang").value="grc";run()}},`¿Griego? ${(lems.length?lems:g.slice(0,3)).join(", ")}`))}},0);
  if(S.mode==="palabra"&&parsed.steps.length===1&&parsed.steps[0].term.type!=="pattern")await renderEntry(S.D,parsed.steps[0].term,res);
  if(S.mode==="palabra"&&res.hits.length&&parsed.steps.length===1&&parsed.steps[0].term.type==="form"&&!GREEK.test(q)){const qq=q;findPerson(q).then(P=>{if(!P||$("#lx-q").value.trim()!==qq)return;const b=el("p",{class:"lx-person-banner"},"¿Buscaba al personaje ",el("b",{},P.name),"? ",P.greek[0]?el("span",{lang:"grc"},P.greek[0]+" · "):"",P.latin[0]||"",". ",el("button",{type:"button",class:"lx-btn",onclick:()=>renderPerson(P,qq)},"Ver sus pasajes en griego y latín"));$("#lx-entry").prepend(b)}).catch(()=>{})}
  if(S.mode==="sintaxis")renderCollocations(S.D,res);
  renderHits(S.D,res);
  if(S.mode==="palabra"&&!res.hits.length&&parsed.steps.length===1&&parsed.steps[0].term.type==="form"&&!/^\*/.test(q)){const P=await findPerson(q);if(P){await renderPerson(P,q);return}}
  if(S.mode==="palabra"&&!res.hits.length&&parsed.steps.length===1&&parsed.steps[0].term.type==="form"){const box=$("#lx-entry");box.hidden=false;box.replaceChildren(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · ETYMOLOGIA"),el("h2",{},q),el("p",{class:"article-byline"},"Sin pasajes en el corpus antiguo local: se ofrece su etimología.")));renderEtymTree(q,null,box)}
 }catch(err){console.error(err);setState("No se pudo completar la búsqueda: "+err.message)}
}
function resolveLang(q){if(S.lang!=="auto")return S.lang;const rest=q.replace(/\[[^\]]*\]/g,"").replace(/\b(NEAR\/\d+)\b|\.\.\d+/g,"");if(/\[/.test(q)&&!/[a-z]/i.test(rest.replace(/[^\p{L}]/gu,"")))return "grc";return detectLang(rest)}
function fillWorks(D){const sel=$("#lx-work");const cur=S.work;sel.replaceChildren(el("option",{value:""},"Todas las obras"));for(const [id,w] of Object.entries(D.corpus.works).sort((a,b)=>(CHRONO[a[0]]??0)-(CHRONO[b[0]]??0)))sel.append(el("option",{value:id,selected:id===cur},`${w.author} · ${w.title}`));if(!D.corpus.works[cur]){S.work="";sel.value=""}}

function renderHits(D,res){
 const list=$("#lx-results");list.replaceChildren();
 const n=res.hits.length;
 const works=new Set(res.hits.map(h=>D.corpus.passages[h.i][0]));
 setState(n?`${n.toLocaleString("es")}${res.capped?"+":""} coincidencia${n===1?"":"s"} en ${works.size} obra${works.size===1?"":"s"}${res.capped?" (límite de "+MAX_HITS+" alcanzado: filtre por obra o precise la consulta)":""} · corpus ${D.l==="grc"?"griego":"latino"} (${D.tokens.toLocaleString("es")} palabras).`:`Sin coincidencias en el corpus ${D.l==="grc"?"griego":"latino"} local.${res.sets?.some(s=>!s.size)?" Algún término no está atestiguado: pruebe ~aproximación, comodines (*) o la otra lengua.":""}`);
 $("#lx-head-title").textContent=S.mode==="frase"?"Concordancia de la frase":S.mode==="sintaxis"?"Construcciones halladas":"Concordancia";
 if(!n){list.append(el("div",{class:"empty"},"No hay pasajes que cumplan la consulta. El corpus local comprende ",String(Object.keys(D.corpus.works).length)," obras; las ausencias no significan que la palabra no exista en la lengua."));return}
 const ord=$("#lx-order").value;
 let hits=res.hits.slice();
 if(ord==="chrono")hits.sort((a,b)=>(CHRONO[D.corpus.passages[a.i][0]]??0)-(CHRONO[D.corpus.passages[b.i][0]]??0)||a.i-b.i);
 S.sorted=hits;
 renderDistribution(D,hits);
 const page=hits.slice(S.page*PAGE_SIZE,(S.page+1)*PAGE_SIZE);
 for(const h of page)list.append(hitCard(D,h));
 if(hits.length>(S.page+1)*PAGE_SIZE){list.append(el("button",{type:"button",class:"lx-more",onclick:e=>{e.target.remove();S.page++;const more=hits.slice(S.page*PAGE_SIZE,(S.page+1)*PAGE_SIZE);for(const h of more)list.append(hitCard(D,h));if(hits.length>(S.page+1)*PAGE_SIZE)list.append(e.target)}},`Mostrar ${PAGE_SIZE} más`))}
 renderExports(D,hits);
}
function hitCard(D,h){
 const p=D.corpus.passages[h.i],w=work(D,p[0]);const text=p[2];const cite=citeOf(D,p,h.spans[0][0]);
 const k=kwic(text,h.spans);
 const snippet=el("p",{class:"lx-kwic",lang:D.l==="grc"?"grc":"la"});
 if(k.pre)snippet.append("… ");
 snippet.append(linkWords(text.slice(k.a,k.b),h.spans.map(([s,e])=>[s-k.a,e-k.a])," / "));
 if(k.post)snippet.append(" …");
 const full=el("div",{class:"lx-full",hidden:true});
 const card=el("article",{class:"result-card lx-hit"},
  el("div",{class:"result-head"},el("div",{},el("div",{class:"kind"},`${w.author} · ${DATING[p[0]]||""}`),el("h3",{},el("i",{},w.title)," ",el("span",{class:"lx-cite"},cite))),el("span",{class:"meta-line"},D.l==="grc"?"griego":"latín")),
  snippet,full);
 const actions=el("div",{class:"actions"});
 actions.append(el("button",{type:"button",onclick:()=>{full.hidden=!full.hidden;if(!full.childNodes.length){const t=el("p",{class:"lx-passage",lang:D.l});t.append(linkWords(text,h.spans));full.append(t);if(p[4])full.append(el("p",{class:"lx-tr"},el("b",{},"Traducción (Kurilo, V514): "),p[4]));full.append(el("p",{class:"lx-src"},w.edition||""," ",w.license?"· "+w.license:""))}}},"Pasaje completo"));
 const rl=readerLink(D,p);if(rl)actions.append(el("a",{href:rl},"Leer en el visor"));
 if(p[0]==="vitruvius")actions.append(el("button",{type:"button",onclick:e=>showApparatus(p[1],full,e.target)},"Aparato y colación"));
 actions.append(el("button",{type:"button",onclick:()=>{$("#lx-q").value=text.slice(k.a,k.b).replace(/\s+/g," ").slice(0,400);S.mode="paralelos";renderTabs();run()}},"Paralelos"));
 actions.append(el("button",{type:"button",onclick:()=>addToNotebook({cite,text,lang:D.l,tr:p[4]||""})},"Al cuaderno exegético"));
 actions.append(el("button",{type:"button",onclick:e=>copy(`${cite}: «${text.slice(k.a,k.b).replace(/\s+/g," ").trim()}» — ${w.author}, ${w.title}. ${w.edition||""}. Vitruvia Lexicon, ${PAGE}`,e.target)},"Copiar cita"));
 card.append(actions);
 if(p[0]==="vitruvius"){const v=el("p",{class:"lx-vlinks"},"Vitruvio "+p[1]+": ");vitruvianLinks(p[1]).forEach(([t,u],i)=>{if(i)v.append(" · ");v.append(el("a",{href:u},t))});card.append(v)}
 return card;
}
/* Aparato crítico de las ediciones Kurilo y páginas de Rose / Krohn para el locus. */
async function showApparatus(locus,box,btn){
 box.hidden=false;if(box.querySelector(".lx-appbox")){box.querySelector(".lx-appbox").remove();return}
 btn.disabled=true;const old=btn.textContent;btn.textContent="Cargando aparato…";
 try{const [A,C]=await Promise.all([load("data/apparatus-index.json"),load("data/collation-loci.json")]);
  const wrap=el("div",{class:"lx-appbox"},el("h4",{},"Aparato y colación · Vitr. "+locus));
  const ents=A.entries.filter(e=>(e.loci||[]).includes(locus));
  if(ents.length){for(const e of ents.slice(0,8)){const t=(e.text||"").replace(/\s+/g," ");wrap.append(el("div",{class:"lx-appentry"},el("p",{class:"lx-small"},`${e.label||e.kind||"Aparato"} · ${e.version||""} (${e.language||""}) · p. ${e.page||"?"}${e.locusLink==="estimado"?" · vínculo estimado":""}`),el("p",{},t.length>900?t.slice(0,900)+" …":t),e.pdf?el("a",{href:e.pdf,target:"_blank",rel:"noopener"},"Abrir la página del PDF"):null))}}
  else wrap.append(el("p",{class:"lx-small"},"El índice del aparato no registra entradas vinculadas a este locus."));
  const c=C.loci?.[locus];
  if(c){for(const [id,v] of Object.entries(c)){const wit=(C.witnesses||[]).find(w=>w.id===id);wrap.append(el("div",{class:"lx-appentry"},el("p",{class:"lx-small"},`${wit?.citation||id} · p. ${v.page}${v.pageEnd&&v.pageEnd!==v.page?"–"+v.pageEnd:""} · semejanza ${v.score}`),el("p",{class:"lx-passage",lang:"la"},(v.text||"").slice(0,1600)),el("p",{class:"lx-small"},"Texto OCR con el aparato a pie de página de esa edición (siglas H, G, S…): ruido de OCR posible.")))}
   wrap.append(el("button",{type:"button",class:"lx-btn",onclick:()=>{$("#col-locus").value=locus;loadCollationExample();$("#collatio").scrollIntoView({behavior:"smooth"})}},"Colacionar este locus en el taller ecdótico"))}
  box.append(wrap);
 }catch(err){box.append(el("p",{class:"lx-small"},"No se pudo cargar el aparato: "+err.message))}
 btn.disabled=false;btn.textContent=old;
}
function renderDistribution(D,hits){
 const box=$("#lx-side-extra");const by={};for(const h of hits){const id=D.corpus.passages[h.i][0];by[id]=(by[id]||0)+1}
 const ids=Object.keys(by).sort((a,b)=>(CHRONO[a]??0)-(CHRONO[b]??0));if(!ids.length)return;
 const max=Math.max(...Object.values(by));
 const sec=el("section",{class:"lx-side-block"},el("h3",{},"Distribución diacrónica"),el("p",{class:"lx-small"},"Coincidencias por obra, en orden cronológico aproximado. Valores absolutos del corpus local."));
 for(const id of ids){const w=work(D,id);const tot=D.workTokens[id]||1;
  sec.append(el("button",{type:"button",class:"lx-bar",title:`Filtrar: ${w.author}, ${w.title}`,onclick:()=>{S.work=id;$("#lx-work").value=id;run()}},el("span",{class:"lx-bar-label"},`${w.author} · ${w.title}`,el("small",{}," ",DATING[id]||"")),el("span",{class:"lx-bar-track"},el("span",{class:"lx-bar-fill",style:`width:${Math.max(3,by[id]/max*100)}%`})),el("span",{class:"lx-bar-n"},String(by[id]),el("small",{}," · ",(by[id]/tot*10000).toFixed(1)," por 10 000 palabras"))))}
 box.prepend(sec);
}

/* ---------- Ficha léxica ---------- */
async function renderEntry(D,term,res){
 const box=$("#lx-entry");box.replaceChildren();box.hidden=false;
 const key=fold(term.v).replace(/[^\p{L}']/gu,"");
 let an=analyses(D,key);
 if(!an.length&&res.sets?.[0]?.size){const first=[...res.sets[0]][0];an=analyses(D,first)}
 const lemmas=[...new Set(an.map(a=>a[0]))];
 const curated=findCurated(lemmas.concat([term.v]));
 const title=lemmas.length?lemmas.map(lemmaDisplay).join(" / "):term.v;
 const head=el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},`LEXICON · ${D.l==="grc"?"GRAECE":"LATINE"}`),el("h2",{lang:D.l},title),
  el("p",{class:"article-byline"},term.v!==title?`Forma buscada: ${term.v}. `:"",lemmas.length?`${lemmas.length>1?"Lemas posibles":"Lema"} según la lematización automática del corpus.`:"Forma sin lema en el índice local."));
 box.append(head);
 const grid=el("div",{class:"article-grid"});const body=el("div",{class:"article-body"});const aside=el("aside",{class:"article-aside"});grid.append(body,aside);box.append(grid);
 /* Lema y morfología */
 for(const lem of lemmas.slice(0,4)){
  const info=lemmaInfo(D,lem);const forms=[...(D.lemmaForms.get(lem)||[])].filter(f=>D.freq.has(f)).sort((a,b)=>D.freq.get(b)-D.freq.get(a));
  const tags=an.filter(a=>a[0]===lem&&a.length>2).map(a=>decodeTag(a[1])).filter(Boolean);
  const sec=el("section",{class:"lx-lemma"},el("h3",{lang:D.l},lemmaDisplay(lem)," ",info.h?el("span",{class:"lx-headword"},info.h):null));
  if(tags.length)sec.append(el("p",{class:"lx-morph"},el("b",{},"Morfología de «"+term.v+"»: "),[...new Set(tags)].join(" — o bien — ")));
  else if(D.l==="la")sec.append(el("p",{class:"lx-morph"},el("b",{},"Morfología: "),info.h?`enunciado del Lewis & Short: ${info.h}`:"la lematización latina (CLTK) asigna el lema sin análisis flexivo; véase la ficha del diccionario."));
  if(info.g){const senses=info.g.split(/;\s*/).filter(Boolean);const ol=el("ol",{class:"lx-senses"});senses.slice(0,12).forEach(s=>ol.append(el("li",{},s)));sec.append(el("p",{class:"article-note"},`Acepciones (${D.l==="grc"?"LSJ":"Lewis & Short"}, glosas inglesas abreviadas en el orden del diccionario):`),ol)}
  else sec.append(el("p",{class:"article-note"},"Sin glosa del diccionario en el índice local."));
  if(forms.length){const fl=el("p",{class:"lx-forms",lang:D.l},el("b",{},`Formas atestiguadas en el corpus (${forms.length}): `));forms.slice(0,60).forEach((f,i)=>{if(i)fl.append(" · ");fl.append(el("button",{type:"button",class:"lx-formlink",onclick:()=>{$("#lx-q").value=f;run()}},f),el("small",{}," ",String(D.freq.get(f))))});if(forms.length>60)fl.append(" …");sec.append(fl);
   sec.append(el("p",{},el("button",{type:"button",class:"lx-btn",onclick:()=>{$("#lx-q").value="@"+lemmaDisplay(lem);S.mode="lema";renderTabs();run()}},`Concordancia de todo el lema (${forms.reduce((a,f)=>a+D.freq.get(f),0)} ocurrencias)`)))}
  const ext=el("p",{class:"lx-ext"},"Consultar: ");
  const lw=lemmaDisplay(lem);
  const links=D.l==="grc"?[["Logeion",`https://logeion.uchicago.edu/${encodeURIComponent(lw)}`],["LSJ · Perseus",`https://www.perseus.tufts.edu/hopper/morph?l=${encodeURIComponent(term.v)}&la=greek`],["Wiktionary",`https://en.wiktionary.org/wiki/${encodeURIComponent(lw)}#Ancient_Greek`],["TLG Lemmata",`https://stephanus.tlg.uci.edu/lexica.php`]]:[["Logeion",`https://logeion.uchicago.edu/${encodeURIComponent(lw)}`],["Lewis & Short · Perseus",`https://www.perseus.tufts.edu/hopper/morph?l=${encodeURIComponent(term.v)}&la=la`],["Wiktionary",`https://en.wiktionary.org/wiki/${encodeURIComponent(lw.normalize("NFD").replace(/\p{M}/gu,""))}#Latin`],["Thesaurus Linguae Latinae (BAdW)",`https://tll.degruyter.com/`]];
  links.forEach(([t,u],i)=>{if(i)ext.append(" · ");ext.append(el("a",{href:u,target:"_blank",rel:"noopener noreferrer"},t))});sec.append(ext);
  body.append(sec);
 }
 if(!lemmas.length&&res.sets?.[0]?.size>1){body.append(el("p",{},"Formas que satisfacen la consulta: ",[...res.sets[0]].slice(0,80).join(" · ")))}
 /* Etimología editorial */
 if(curated)body.append(etymCard(curated));
 /* Etimología en línea */
 renderEtymTree(lemmas[0]?lemmaDisplay(lemmas[0]):term.v,D.l,body);
 /* Aside: frecuencia, colocaciones, exportación */
 const total=lemmas.reduce((a,lem)=>a+[...(D.lemmaForms.get(lem)||[])].reduce((s,f)=>s+(D.freq.get(f)||0),0),0);
 aside.append(el("h3",{},"Datos del corpus"),el("p",{},`Ocurrencias de la forma: ${(D.freq.get(key)||0).toLocaleString("es")}`),el("p",{},`Ocurrencias del lema: ${total.toLocaleString("es")}`),el("p",{},`Frecuencia relativa: ${(total/D.tokens*10000).toFixed(2)} por 10 000 palabras`));
 if(res.hits.length){aside.append(el("h3",{},"Colocaciones"));aside.append(collocationList(D,res.hits,4,12))}
 const entry={lemma:lemmas.map(lemmaDisplay),form:term.v,lang:D.l,headword:lemmas.map(l=>lemmaInfo(D,l).h||"").filter(Boolean),senses:lemmas.map(l=>(lemmaInfo(D,l).g||"").split(/;\s*/).filter(Boolean)),morphology:an.filter(a=>a.length>2).map(a=>({lemma:lemmaDisplay(a[0]),tag:a[1],analysis:decodeTag(a[1])})),etymology:curated||null,frequency:{form:D.freq.get(key)||0,lemma:total,corpusTokens:D.tokens},citations:res.hits.slice(0,50).map(h=>{const p=D.corpus.passages[h.i];return{cite:citeOf(D,p,h.spans[0][0]),author:work(D,p[0]).author,work:work(D,p[0]).title,text:p[2].slice(kwic(p[2],h.spans).a,kwic(p[2],h.spans).b)}}),source:D.forms.sources,url:PAGE+"?q="+encodeURIComponent(term.v)};
 S.lastEntry=entry;
 aside.append(el("h3",{},"Exportar la ficha"),exportButtons(entry),el("h3",{},"Citar la ficha"),citeBox(lemmas.length?lemmaDisplay(lemmas[0]):term.v,entry.url));
 injectJsonLd(entry);
}
function findCurated(words){
 if(!S.etym)return null;const keys=words.map(w=>fold(lemmaDisplay(w)));
 return S.etym.entries.find(e=>keys.includes(fold(e.lemma))||keys.includes(fold(e.lemma.split(" ")[0])))||null;
}
function etymCard(e){
 const sec=el("section",{class:"lx-etym",id:"etym-"+e.id},el("h3",{},"Etimología y equivalencias ",el("small",{},"· ficha editorial")));
 const dl=el("dl",{class:"lx-dl"});const row=(k,v)=>{if(v&&(!Array.isArray(v)||v.length))dl.append(el("dt",{},k),el("dd",{},v))};
 row("Enunciado",el("span",{lang:e.l},e.head));row("Categoría",[e.pos,e.morph].filter(Boolean).join(" · "));if(e.tr)row("Transliteración",e.tr);
 if(e.sens?.length){const ol=el("ol",{});e.sens.forEach(s=>ol.append(el("li",{},s)));row("Acepciones",ol)}
 row("Etimología",e.etym);row("Raíz",el("span",{class:"lx-root"},e.root||""));
 if(e.old?.length)row("Latín arcaico / formas antiguas",e.old.map(o=>el("span",{class:"lx-chip"},el("b",{},o.f)," — ",o.src)));
 const eq=(arr,l)=>arr.map(x=>el("span",{class:"lx-chip"},el("button",{type:"button",class:"lx-formlink",lang:l,onclick:()=>{$("#lx-q").value=x.w;S.mode=l==="he"?"etimologia":"palabra";S.lang=l==="he"?"auto":l;$("#lx-lang").value=S.lang;renderTabs();run()}},x.w),x.tr?el("i",{}," "+x.tr):null," — ",x.g,x.n?el("small",{}," ",x.n):null));
 if(e.gr?.length)row("Griego antiguo",eq(e.gr,"grc"));if(e.la?.length)row("Latín",eq(e.la,"la"));if(e.he?.length)row("Hebreo bíblico",eq(e.he,"he"));
 if(e.cog?.length)row("Cognados",e.cog.join(" · "));
 sec.append(dl);
 if(e.loci?.length){sec.append(el("h4",{},"Loci"));for(const L of e.loci){const b=el("blockquote",{class:"lx-locus"},el("p",{lang:L.lang||e.l,dir:L.lang==="he"?"rtl":null,class:L.lang==="he"?"lx-he":""},L.t),L.tr?el("p",{class:"lx-tr"},L.tr):null);(L.par||[]).forEach(x=>b.append(el("p",{lang:x.lang,class:"lx-par"},el("small",{},x.lang==="grc"?"LXX / griego: ":"Vulgata / latín: "),x.t)));b.append(el("cite",{},L.c));sec.append(b)}}
 if(e.refs?.length)sec.append(el("p",{class:"article-note"},"Bibliografía: ",e.refs.join(" · ")));
 return sec;
}
async function wiktionary(word,l,box,btn){
 btn.disabled=true;btn.textContent="Cargando…";
 try{
  const title=l==="la"?word.normalize("NFD").replace(/\p{M}/gu,""):word.normalize("NFC");
  const r=await fetch(`https://en.wiktionary.org/w/api.php?action=parse&format=json&origin=*&prop=text&redirects=1&page=${encodeURIComponent(title)}`);
  const j=await r.json();if(!j.parse)throw new Error("sin entrada");
  const doc=new DOMParser().parseFromString(j.parse.text["*"],"text/html");
  const langId=l==="grc"?"Ancient_Greek":"Latin";const h2=doc.getElementById(langId);if(!h2)throw new Error("sin sección "+langId);
  let node=(h2.closest(".mw-heading")||h2.parentElement.tagName==="H2"&&h2.parentElement||h2);const out=[];let inEtym=false;
  for(let n=node.nextElementSibling;n;n=n.nextElementSibling){const isH=n.matches(".mw-heading,h2,h3,h4");if(isH){const lvl=n.matches(".mw-heading2,h2")||n.querySelector("h2");if(lvl)break;const t=n.textContent.trim();if(/^Etymology/.test(t)){inEtym=true;out.push({h:t});continue}if(inEtym)inEtym=false;continue}if(inEtym&&n.matches("p,ul,ol"))out.push({t:n.textContent.trim()})}
  btn.remove();if(!out.length){box.append(el("p",{},"Wiktionary no ofrece sección etimológica para «"+word+"»."));return}
  for(const o of out){if(o.h)box.append(el("h4",{},o.h));else if(o.t)box.append(el("p",{},o.t))}
  box.append(el("p",{class:"article-note"},"Fuente: ",el("a",{href:`https://en.wiktionary.org/wiki/${encodeURIComponent(title)}#${langId}`,target:"_blank",rel:"noopener noreferrer"},"Wiktionary, «"+title+"»")," · CC BY-SA 4.0"));
 }catch(err){btn.disabled=false;btn.textContent="Reintentar";box.append(el("p",{class:"article-note"},"No se pudo obtener la etimología en línea ("+err.message+")."))}
}


/* ---------- Personajes históricos: del nombre moderno al griego y al latín ----------
   1) Onomasticon Vitruvianum local (con tolerancia a erratas: «arquiedes» → Arquímedes).
   2) Wikidata en el navegador (etiquetas en griego antiguo, latín y griego). */
let ONO=null;
async function onomasticon(){if(!ONO){try{ONO=(await load("data/onomasticon-vitruvianum.json")).entities||[]}catch{ONO=[]}}return ONO}
function nameKeys(e){return [e.name,...(e.aliases||[]),...(e.latin_forms||[]),e.greek_name].filter(Boolean).flatMap(n=>[fold(n),fold(n).split(/\s+/)[0]])}
async function findPerson(q){
 const k=fold(q).trim();if(k.length<3)return null;const ents=await onomasticon();
 let best=null,bd=9;
 for(const e of ents){for(const n of nameKeys(e)){if(!n)continue;const d=n===k?0:lev(n,k,2);if(d<bd){bd=d;best=e}}}
 if(best&&bd<=(k.length>=8?2:k.length>=5?1:0))return{source:"onomasticon",name:best.name,kind:best.kind,period:best.period,summary:best.summary,latin:best.latin_forms||[],greek:best.greek_name?[best.greek_name]:[],loci:best.loci||[],typo:bd>0};
 try{
  const wd=async u=>(await fetch("https://www.wikidata.org/w/api.php?"+u+"&format=json&origin=*")).json();
  let ids=(await wd(`action=wbsearchentities&search=${encodeURIComponent(q)}&language=es&uselang=es&type=item&limit=6`)).search?.map(x=>x.id)||[];
  if(!ids.length)ids=((await wd(`action=query&list=search&srsearch=${encodeURIComponent(q+"~")}&srlimit=6`)).query?.search||[]).map(x=>x.title);
  if(!ids.length)return null;
  const ents=(await wd(`action=wbgetentities&ids=${ids.join("|")}&props=labels|descriptions|claims&languages=es|grc|la|el|en`)).entities||{};
  for(const id of ids){const e=ents[id];if(!e)continue;const p31=(e.claims?.P31||[]).map(c=>c.mainsnak?.datavalue?.value?.id);if(!p31.includes("Q5"))continue;
   const lab=x=>e.labels?.[x]?.value;const born=e.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time||"";
   if(born&&!/^-/.test(born)&&+born.slice(1,5)>800)continue; /* solo personajes antiguos o tardoantiguos */
   return{source:"wikidata",id,name:lab("es")||lab("en")||q,summary:e.descriptions?.es?.value||e.descriptions?.en?.value||"",latin:[lab("la")].filter(Boolean),greek:[lab("grc")].filter(Boolean),modernGreek:lab("el")||"",english:lab("en")||"",loci:[],typo:fold(lab("es")||"")!==fold(q)};
  }
 }catch{}
 return null;
}
async function renderPerson(P,q){
 const box=$("#lx-entry");box.hidden=false;box.replaceChildren();
 const G=await lang("grc",true),La=await lang("la",true);
 /* Formas griegas: nombre griego registrado o, si falta, transliteración de la forma latina/inglesa en el índice griego. */
 const gForms=new Set();const greekLemmas=new Set();
 const addLemmaForms=(D,set,k)=>{if(D.post.has(k))set.add(k);for(const a of analyses(D,k))for(const f of (D.lemmaForms.get(a[0])||[]))if(D.post.has(f))set.add(f)};
 for(const g of P.greek)addLemmaForms(G,gForms,fold(g));
 if(!gForms.size){for(const src of [...P.latin,P.english,P.name].filter(Boolean)){const t=transIndex(G).get(latinTranslitKey(src.split(/\s+/)[0]));if(t)t.forEach(f=>{addLemmaForms(G,gForms,f);const a=analyses(G,f)[0];if(a)greekLemmas.add(lemmaDisplay(a[0]))})}}
 const lForms=new Set();
 for(const l of [...P.latin,P.english].filter(Boolean)){const k=fold(l.split(/\s+/)[0]);addLemmaForms(La,lForms,k);
  if(!lForms.size){const stem=k.replace(/(es|is|us|um|em|i|e|a)$/,"");if(stem.length>=4)for(const f of La.keys)if(f.startsWith(stem)&&f.length<=stem.length+3)lForms.add(f)}}
 const greekShown=P.greek.length?P.greek:[...greekLemmas];
 box.append(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · ONOMASTICON · "+(P.kind==="place"?"LOCUS":"PERSONA")),el("h2",{},P.name),
  el("p",{class:"article-byline"},P.typo?`Interpretado como «${P.name}» a partir de «${q}». `:"",P.period||"",P.period&&P.summary?" · ":"",P.summary||"")));
 const dl=el("dl",{class:"lx-dl"});
 dl.append(el("dt",{},"Griego"),el("dd",{lang:"grc",class:"lx-root"},greekShown.join(", ")||(P.modernGreek?P.modernGreek+" (etiqueta en griego moderno)":"sin forma griega registrada")));
 dl.append(el("dt",{},"Latín"),el("dd",{lang:"la",class:"lx-root"},P.latin.join(", ")||"sin forma latina registrada"));
 if(P.loci?.length){const dd=el("dd",{});P.loci.forEach((l,i)=>{if(i)dd.append(" · ");dd.append(el("a",{href:`lector-bilingue.html?edition=recensio-es&locus=${encodeURIComponent(l)}`},"Vitr. "+l))});dl.append(el("dt",{},"Loci vitruvianos"),dd)}
 dl.append(el("dt",{},"Fuente"),el("dd",{},P.source==="onomasticon"?"Onomasticon Vitruvianum (V514)":el("a",{href:"https://www.wikidata.org/wiki/"+P.id,target:"_blank",rel:"noopener noreferrer"},"Wikidata "+P.id)));
 box.append(dl);
 const list=$("#lx-results");list.replaceChildren();$("#lx-side-extra").replaceChildren();
 let total=0;
 for(const [D,forms,label] of [[G,gForms,"griego"],[La,lForms,"latín"]]){
  if(!forms.size){list.append(el("p",{class:"lx-small"},`Sin formas del nombre en el corpus ${label} local.`));continue}
  const hits=[];for(const k of forms)for(const i of (D.post.get(k)||[])){const p=D.corpus.passages[i];for(const m of p[2].matchAll(TOKEN))if(fold(m[0]).replace(/'+$/,"")===k)hits.push({i,spans:[[m.index,m.index+m[0].length]],tok:0})}
  hits.sort((a,b)=>(CHRONO[D.corpus.passages[a.i][0]]??0)-(CHRONO[D.corpus.passages[b.i][0]]??0)||a.i-b.i);total+=hits.length;
  list.append(el("h3",{class:"lx-group-h"},`En ${label}: ${hits.length} pasaje${hits.length===1?"":"s"} · formas ${[...forms].slice(0,10).join(", ")}`));
  hits.slice(0,30).forEach(h=>list.append(hitCard(D,h)));
  if(hits.length>30)list.append(el("button",{type:"button",class:"lx-more",onclick:()=>{$("#lx-q").value="@"+(label==="griego"?greekShown[0]:P.latin[0]);S.lang=label==="griego"?"grc":"la";$("#lx-lang").value=S.lang;S.mode="lema";renderTabs();run()}},`Ver los ${hits.length} pasajes en ${label}`));
 }
 setState(`${P.name}: ${total} pasaje${total===1?"":"s"} en los textos antiguos del corpus local (griego y latín).`);
}
/* ---------- Árbol etimológico (Wiktionary, en el navegador del lector) ----------
   Para cualquier palabra latina, griega, castellana, inglesa, francesa o alemana:
   localiza la sección de la lengua, lee su párrafo «Etymology», separa ascendientes
   (from / borrowed from / inherited from), componentes (+) y cognados (cognate with,
   compare), y remonta recursivamente por las páginas de cada étimo hasta la raíz. */
const WK_LANG={es:["Spanish","castellano"],en:["English","inglés"],fr:["French","francés"],de:["German","alemán"],la:["Latin","latín"],grc:["Ancient_Greek","griego antiguo"],it:["Italian","italiano"],pt:["Portuguese","portugués"],ca:["Catalan","catalán"],gl:["Galician","gallego"],ro:["Romanian","rumano"],nl:["Dutch","neerlandés"],el:["Greek","griego moderno"],gkm:["Byzantine_Greek","griego bizantino"],"grc-koi":["Koine_Greek","griego koiné"],fro:["Old_French","francés antiguo"],frm:["Middle_French","francés medio"],osp:["Old_Spanish","castellano antiguo"],ang:["Old_English","inglés antiguo"],enm:["Middle_English","inglés medio"],goh:["Old_High_German","alto alemán antiguo"],gmh:["Middle_High_German","alto alemán medio"],non:["Old_Norse","nórdico antiguo"],got:["Gothic","gótico"],"gem-pro":["Proto-Germanic","protogermánico"],"itc-pro":["Proto-Italic","protoitálico"],"ine-pro":["Proto-Indo-European","protoindoeuropeo"],"grk-pro":["Proto-Hellenic","protohelénico"],"cel-pro":["Proto-Celtic","protocelta"],"sla-pro":["Proto-Slavic","protoeslavo"],"iir-pro":["Proto-Indo-Iranian","protoindoiranio"],sa:["Sanskrit","sánscrito"],ae:["Avestan","avéstico"],peo:["Old_Persian","persa antiguo"],fa:["Persian","persa"],hit:["Hittite","hitita"],ar:["Arabic","árabe"],he:["Hebrew","hebreo"],hbo:["Biblical_Hebrew","hebreo bíblico"],arc:["Aramaic","arameo"],akk:["Akkadian","acadio"],phn:["Phoenician","fenicio"],egy:["Egyptian","egipcio"],cop:["Coptic","copto"],ett:["Etruscan","etrusco"],osc:["Oscan","osco"],xum:["Umbrian","umbro"],"sem-pro":["Proto-Semitic","protosemítico"],"ML.":["Latin","latín medieval"],"VL.":["Latin","latín vulgar"],"LL.":["Latin","latín tardío"],"NL.":["Latin","latín moderno"],"la-lat":["Latin","latín tardío"],"la-med":["Latin","latín medieval"],"la-new":["Latin","latín moderno"],"la-vul":["Latin","latín vulgar"]};
const WK_ORDER=["es","en","fr","de","la","grc","it","pt"];
const wkCache=new Map();
function wkName(code,fallback){return WK_LANG[code]?.[1]||fallback||code}
async function wkPage(title){
 if(!wkCache.has(title))wkCache.set(title,(async()=>{const r=await fetch(`https://en.wiktionary.org/w/api.php?action=parse&format=json&origin=*&prop=text&redirects=1&page=${encodeURIComponent(title)}`);if(!r.ok)throw new Error("HTTP "+r.status);const j=await r.json();if(!j.parse)return null;return new DOMParser().parseFromString(j.parse.text["*"],"text/html")})());
 return wkCache.get(title);
}
/* Nodos de la sección de una lengua (entre su h2 y el h2 siguiente). */
function wkSection(doc,sectionId){
 let h=doc.getElementById(sectionId);if(!h)return null;const start=h.closest(".mw-heading")||h;const nodes=[];
 for(let n=start.nextElementSibling;n;n=n.nextElementSibling){if(n.matches(".mw-heading2,h2")||n.querySelector?.(":scope > h2"))break;nodes.push(n)}
 return nodes;
}
function wkLanguages(doc){return [...doc.querySelectorAll("h2[id]")].map(h=>h.id)}
function headingText(n){return (n.matches(".mw-heading")?n.querySelector("h3,h4,h5"):n.matches("h3,h4,h5")?n:null)?.textContent.trim()||""}
function wkEtymParagraphs(nodes){
 const out=[];let inE=false;
 for(const n of nodes){const ht=headingText(n);if(ht){inE=/^Etymology/.test(ht);continue}if(inE&&n.matches("p"))out.push(n);if(inE&&out.length&&n.matches("ul,ol,table,div:not(.mw-heading)"))break}
 return out;
}
function wkGloss(nodes){for(const n of nodes){if(n.matches("ol")){const li=n.querySelector(":scope > li");if(li){const c=li.cloneNode(true);c.querySelectorAll("ul,ol,dl,.HQToggle,.citation-whole,.nyms").forEach(x=>x.remove());const t=c.textContent.replace(/\s+/g," ").trim();if(t)return t.slice(0,160)}}}return""}
function wkHeadword(nodes){for(const n of nodes){const hw=n.querySelector?.(".headword-line");if(hw)return hw.textContent.replace(/\s+/g," ").trim().slice(0,120)}return""}
function parseEtymParagraph(p){
 const clone=p.cloneNode(true);clone.querySelectorAll("sup.reference,.mention-gloss-paren,.mention-tr,.mention-gloss,.mention-gloss-double-quote").forEach(x=>{if(!x.classList.contains("mention-gloss"))x.remove()});
 const mentions=[...clone.querySelectorAll("[lang]")].filter(m=>m.querySelector("a")&&!m.closest(".mention-gloss")&&!m.parentElement.closest("[lang]:not(p)"));
 const glossOf=m=>{let n=m.nextSibling,g="";for(let k=0;n&&k<6;k++,n=n.nextSibling){if(n.nodeType===1&&n.classList?.contains("mention-gloss")){g=n.textContent.trim();break}if(n.nodeType===1&&n.matches?.("[lang]"))break}return g};
 const items=mentions.map((m,i)=>{const a=m.querySelector("a");m.dataset.mi=i;return{lang:m.getAttribute("lang"),word:m.textContent.trim(),href:a.getAttribute("href")||"",gloss:glossOf(m),red:a.classList.contains("new")}});
 mentions.forEach((m,i)=>m.replaceWith(document.createTextNode(`\u0001${i}\u0001`)));
 const txt=clone.textContent;const parts=txt.split(/\u0001(\d+)\u0001/);
 const res={ancestors:[],cognates:[]};let mode="anc",prevWasComp=false;
 for(let k=1;k<parts.length;k+=2){const before=parts[k-1];const it=items[+parts[k]];if(!it||!it.word)continue;
  if(/cognat|compare|\bcf\b|akin to|doublet|see also|related to|whence also|equivalent to/i.test(before))mode="cog";
  else if(/\b(from|of)\b/i.test(before)&&mode==="cog"&&/\.\s/.test(before))mode="anc";
  if(mode==="cog"){res.cognates.push(it);continue}
  const rel=/calque/i.test(before)?"calco":/borrow|learned/i.test(before)?"préstamo":/inherit/i.test(before)?"hereda":/\+/.test(before)?"+":"de";
  it.rel=rel;if(rel==="+"&&res.ancestors.length){const last=res.ancestors[res.ancestors.length-1];(last.parts=last.parts||[{...last}]).push(it);last.compound=true;continue}
  res.ancestors.push(it);
 }
 return res;
}
function titleFromHref(h){if(!h.startsWith("/wiki/"))return null;return decodeURIComponent(h.slice(6).split("#")[0]).replace(/_/g," ")}
function sectionFromHref(h,code){const frag=h.split("#")[1];return frag?decodeURIComponent(frag):(WK_LANG[code]?.[0]||null)}
async function buildEtymTree(word,langCode){
 const tryTitles=[word,word.toLowerCase(),word.charAt(0).toUpperCase()+word.slice(1),word.normalize("NFD").replace(/[̄̆]/g,"").normalize("NFC")];
 let doc=null,title=null;for(const t of [...new Set(tryTitles)]){doc=await wkPage(t);if(doc){title=t;break}}
 if(!doc)return{error:"Wiktionary no tiene entrada para «"+word+"»."};
 const langsOnPage=wkLanguages(doc);
 const candidates=(langCode&&WK_LANG[langCode]?[langCode]:[]).concat(WK_ORDER).filter((c,i,a)=>a.indexOf(c)===i&&langsOnPage.includes(WK_LANG[c][0]));
 if(!candidates.length)return{error:"La entrada «"+word+"» de Wiktionary no tiene sección en latín, griego, castellano, inglés, francés ni alemán.",available:langsOnPage};
 const code=candidates[0];const nodes=wkSection(doc,WK_LANG[code][0]);
 const root={lang:code,word:title,gloss:wkGloss(nodes),head:wkHeadword(nodes),href:"/wiki/"+encodeURIComponent(title)+"#"+WK_LANG[code][0],cognates:[]};
 const chain=[root];const seen=new Set([code+"|"+title]);
 let cur={nodes,node:root};
 for(let depth=0;depth<7&&cur;depth++){
  const ps=wkEtymParagraphs(cur.nodes);if(!ps.length)break;
  const parsed=parseEtymParagraph(ps[0]);cur.node.cognates=parsed.cognates.slice(0,24);cur.node.etymText=ps[0].textContent.replace(/\s+/g," ").trim().slice(0,700);
  const fresh=parsed.ancestors.filter(a=>!seen.has(a.lang+"|"+a.word));if(!fresh.length)break;
  fresh.forEach(a=>{seen.add(a.lang+"|"+a.word);chain.push(a)});
  /* Se continúa por la página del último étimo que tenga entrada. */
  let next=null;for(let i=fresh.length-1;i>=0;i--){const a=fresh[i];if(!a.red&&titleFromHref(a.href)){next=a;break}}
  if(!next||next!==fresh[fresh.length-1]&&fresh.length>1&&chain.length>4)break;
  try{const d=await wkPage(titleFromHref(next.href));if(!d)break;const sec=wkSection(d,sectionFromHref(next.href,next.lang)||"");if(!sec)break;next.gloss=next.gloss||wkGloss(sec);
   if(next.lang==="ine-pro"||/Reconstruction:/.test(next.href)){next.descendants=wkDescendants(sec);next.etymText=wkEtymParagraphs(sec)[0]?.textContent.replace(/\s+/g," ").trim().slice(0,500)||"";break}
   cur={nodes:sec,node:next};}catch{break}
 }
 return{chain,code,title,available:candidates};
}
function wkDescendants(nodes){const out=[];let on=false;for(const n of nodes){const ht=headingText(n);if(ht){on=/^(Descendants|Derived terms)/.test(ht);continue}if(on&&n.matches("ul,div")){for(const li of n.querySelectorAll(":scope li")){const t=li.cloneNode(true);t.querySelectorAll("ul").forEach(x=>x.remove());const v=t.textContent.replace(/\s+/g," ").trim();if(v&&out.length<60)out.push(v)}}}return out}
function curatedTree(e){
 if(!e)return null;const chain=[{lang:e.l,word:e.lemma,gloss:(e.sens||[])[0]||"",cognates:(e.cog||[]).map(c=>({lang:"",word:c}))}];
 if(e.root&&/\*/.test(e.root))chain.push({lang:"ine-pro",word:e.root.split(/\s+[«(]/)[0],gloss:(e.root.match(/«([^»]+)»/)||[])[1]||"",rel:"de"});
 return{chain,code:e.l,title:e.lemma,curated:true};
}
async function renderEtymTree(word,langCode,box,{auto=true}={}){
 const sec=el("section",{class:"lx-tree-wrap"},el("h3",{},"Árbol etimológico"),el("p",{class:"article-note"},"Generado en su navegador a partir de Wiktionary (CC BY-SA 4.0): ascendientes, componentes, cognados y, en las raíces indoeuropeas, descendientes. Es una síntesis automática: verifíquese en de Vaan, Ernout–Meillet, Beekes, Chantraine, Corominas, OED, TLFi o Kluge."));
 const out=el("div",{class:"lx-tree"},el("p",{class:"lx-small"},"Construyendo el árbol…"));sec.append(out);box.append(sec);
 let t;try{t=await buildEtymTree(word,langCode)}catch(err){t={error:"No se pudo consultar Wiktionary ("+err.message+")."}}
 out.replaceChildren();
 if(t.error){const c=curatedTree(findCurated([word]));if(c){out.append(el("p",{class:"lx-small"},t.error+" Se muestra el árbol de la ficha editorial."));t=c}else{out.append(el("p",{class:"empty"},t.error));return sec}}
 if(t.available?.length>1){const sw=el("p",{class:"lx-small"},"Otras lenguas con esta palabra: ");t.available.slice(1).forEach(c=>sw.append(el("button",{type:"button",class:"lx-btn",onclick:()=>{sec.remove();renderEtymTree(word,c,box)}},wkName(c))," "));out.append(sw)}
 const ol=el("ol",{class:"lx-tree-list"});
 const nodes=t.chain.slice().reverse();
 nodes.forEach((n,i)=>{
  const li=el("li",{class:"lx-tree-node"+(i===nodes.length-1?" lx-tree-leaf":"")});
  const word=(a)=>{const l=a.lang;const isRecon=/\*/.test(a.word)||/-pro$/.test(l);return el("button",{type:"button",class:"lx-formlink lx-tree-word",lang:/^(grc|el|gkm|grc-koi)$/.test(l)?"grc":/^(he|hbo)$/.test(l)?"he":null,title:isRecon?"Forma reconstruida":"Ver su árbol",onclick:()=>{const target=S.mode;$("#lx-q").value=a.word.replace(/^\*/,"");if(["la","grc"].includes(l)){S.lang=l;$("#lx-lang").value=l;S.mode="palabra"}else{S.mode="etimologia";S.lang=WK_LANG[l]&&["es","en","fr","de"].includes(l)?l:"auto";$("#lx-lang").value=S.lang}renderTabs();run()}},a.word)};
  const head=el("div",{class:"lx-tree-head"},el("span",{class:"lx-tree-lang"},wkName(n.lang,n.lang)));
  if(n.compound&&n.parts)n.parts.forEach((pp,k)=>{if(k)head.append(" + ");head.append(word(pp))});else head.append(word(n));
  if(n.gloss)head.append(el("span",{class:"lx-tree-gloss"}," «",n.gloss,"»"));
  li.append(head);
  if(i<nodes.length-1){const rel=n.rel||"de";li.append(el("div",{class:"lx-tree-rel"},rel==="préstamo"?"↓ préstamo":rel==="calco"?"↓ calco":rel==="hereda"?"↓ herencia directa":"↓"))}
  if(n.cognates?.length){const cg=el("div",{class:"lx-tree-cog"},el("span",{class:"lx-small"},"Cognados y paralelos: "));n.cognates.forEach((c,k)=>{if(k)cg.append(" · ");cg.append(el("span",{},c.lang?el("small",{},wkName(c.lang,c.lang)+" "):null,c.word))});li.append(cg)}
  if(n.descendants?.length){li.append(el("details",{class:"lx-tree-desc"},el("summary",{},`Descendientes y derivados de la raíz (${n.descendants.length})`),el("ul",{},n.descendants.map(d=>el("li",{},d)))))}
  if(n.etymText&&i===nodes.length-1)li.append(el("p",{class:"article-note"},"Wiktionary: ",n.etymText));
  ol.append(li);
 });
 out.append(ol);
 if(!t.curated){const src=el("p",{class:"article-note"},"Fuente: ");t.chain.filter(n=>n.href&&n.href.startsWith("/wiki/")).slice(0,8).forEach((n,k)=>{if(k)src.append(" · ");src.append(el("a",{href:"https://en.wiktionary.org"+n.href,target:"_blank",rel:"noopener noreferrer"},n.word))});out.append(src)}
 const cur=findCurated(t.chain.filter(n=>["la","grc"].includes(n.lang)).map(n=>n.word));
 if(cur&&!box.querySelector("#etym-"+cur.id)){out.append(el("p",{},el("button",{type:"button",class:"lx-btn",onclick:()=>{$("#lx-q").value=cur.lemma;S.mode="palabra";S.lang=cur.l;$("#lx-lang").value=cur.l;renderTabs();run()}},`Ficha editorial del Etymologicum: ${cur.lemma}`)))}
 return sec;
}
async function renderModernWord(q,l){
 const box=$("#lx-entry");box.hidden=false;box.replaceChildren(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · ETYMOLOGIA"),el("h2",{},q),el("p",{class:"article-byline"},l&&WK_LANG[l]?"Lengua: "+wkName(l):"Lengua detectada en Wiktionary")));
 setState(`Etimología y árbol etimológico de «${q}».`);
 await renderEtymTree(q,l,box);
}
function collocationList(D,hits,win=4,top=12){
 const c=new Map();const stop=STOP[D.l];
 for(const h of hits.slice(0,1500)){const p=D.corpus.passages[h.i];const toks=[...p[2].matchAll(TOKEN)].map(m=>({k:fold(m[0]).replace(/'+$/,""),s:m.index}));const at=toks.findIndex(t=>t.s===h.spans[0][0]);if(at<0)continue;const own=new Set(h.spans.map(s=>s[0]));
  for(let j=Math.max(0,at-win);j<=Math.min(toks.length-1,at+win+h.spans.length-1);j++){const t=toks[j];if(own.has(t.s)||stop.has(t.k)||t.k.length<3)continue;const lem=analyses(D,t.k)[0]?.[0]||t.k;c.set(lem,(c.get(lem)||0)+1)}}
 /* Ponderación: frecuencia observada frente a la esperada (información mutua simplificada). */
 const scored=[...c.entries()].map(([lem,n])=>{const fs=D.lemmaForms.get(lem);const f=fs?[...fs].reduce((a,k)=>a+(D.freq.get(k)||0),0):(D.freq.get(lem)||1);return[lem,n,n*Math.log(1+D.tokens/(f*hits.length*win*2+1)+1)]}).filter(x=>x[1]>1).sort((a,b)=>b[2]-a[2]).slice(0,top);
 const ul=el("ol",{class:"lx-colloc"});
 if(!scored.length)ul.append(el("li",{},"Sin colocaciones recurrentes."));
 for(const [lem,n] of scored)ul.append(el("li",{},el("button",{type:"button",class:"lx-formlink",lang:D.l,onclick:()=>{$("#lx-q").value=`${S.q} NEAR/${win} @${lemmaDisplay(lem)}`;S.mode="frase";renderTabs();run()}},lemmaDisplay(lem)),el("small",{}," ×"+n)));
 return ul;
}
function renderCollocations(D,res){const box=$("#lx-side-extra");if(!res.hits.length)return;box.append(el("section",{class:"lx-side-block"},el("h3",{},"Colocaciones (±4)"),el("p",{class:"lx-small"},"Lemas que acompañan a la construcción con frecuencia superior a la esperable."),collocationList(D,res.hits,4,15)))}

/* ---------- Búsqueda hebrea y etimológica ---------- */
function renderHebrew(q){
 const k=q.normalize("NFD").replace(/[֑-ׇ]/g,"");
 const ents=(S.etym?.entries||[]).filter(e=>(e.he||[]).some(h=>h.w.normalize("NFD").replace(/[֑-ׇ]/g,"").includes(k))||(e.loci||[]).some(L=>L.lang==="he"&&L.t.includes(k)));
 const sents=(S.sent?.sententiae||[]).filter(s=>s.lang==="he"&&s.text.includes(k));
 setState(`${ents.length} ficha${ents.length===1?"":"s"} y ${sents.length} sentencia${sents.length===1?"":"s"} con «${q}». El corpus local no incluye aún texto hebreo continuo: la búsqueda recorre las equivalencias LXX/Vulgata de las fichas.`);
 const list=$("#lx-results");for(const e of ents)list.append(etymResult(e));for(const s of sents)list.append(sententiaCard(s));
 list.append(el("p",{class:"lx-ext"},"Buscar en textos hebreos: ",el("a",{href:`https://www.sefaria.org/search?q=${encodeURIComponent(q)}`,target:"_blank",rel:"noopener noreferrer"},"Sefaria")," · ",el("a",{href:`https://www.blueletterbible.org/search/search.cfm?Criteria=${encodeURIComponent(q)}&t=WLC`,target:"_blank",rel:"noopener noreferrer"},"Westminster Leningrad Codex (Blue Letter Bible)")));
}
function etymResult(e){
 const card=el("article",{class:"result-card"},el("div",{class:"kind"},`Etymologicum · ${e.l==="grc"?"griego":"latín"}`),el("h3",{lang:e.l},e.lemma," ",el("span",{class:"lx-headword"},e.head)),el("p",{},e.etym));
 const a=el("div",{class:"actions"},el("button",{type:"button",onclick:()=>{$("#lx-q").value=e.lemma;S.mode="palabra";S.lang=e.l;$("#lx-lang").value=e.l;renderTabs();run()}},"Abrir ficha completa"));card.append(a);return card;
}
async function renderEtymSearch(q){
 const k=fold(q);const he=HEBREW.test(q);if(he)return renderHebrew(q);
 const ents=(S.etym?.entries||[]).filter(e=>[e.lemma,e.head,e.tr,e.root,e.etym,...(e.gr||[]).map(x=>x.w),...(e.la||[]).map(x=>x.w),...(e.old||[]).map(x=>x.f),...(e.cog||[])].some(x=>x&&fold(x).includes(k))||(e.tr&&fold(e.tr).includes(k)));
 setState(`${ents.length} ficha${ents.length===1?"":"s"} etimológica${ents.length===1?"":"s"} con «${q}» (lema, raíz, formas arcaicas, equivalentes o cognados).`);
 const list=$("#lx-results");
 if(ents.length===1){$("#lx-entry").hidden=false;$("#lx-entry").append(etymCard(ents[0]));}
 for(const e of ents)list.append(etymResult(e));
 if(!ents.length&&!/^\*/.test(q)){const P=await findPerson(q);if(P)return renderPerson(P,q);return renderModernWord(q,null)}
 if(ents.length===1)renderEtymTree(ents[0].lemma,ents[0].l,$("#lx-entry"));
}

/* ---------- Sententiae ---------- */
let corpusCheck=null;
async function verifySententia(s){
 if(s.lang==="he")return null;const D=await lang(s.lang,true);const words=s.text.match(TOKEN)||[];if(!words.length)return null;
 const parsed={steps:words.map((w,i)=>({term:{type:"form",v:w},gap:i?0:null})),near:null};const r=execute(D,parsed,{});return r.hits.length?{D,h:r.hits[0]}:null;
}
function sententiaCard(s){
 const card=el("article",{class:"result-card lx-sent"},el("div",{class:"kind"},`${s.author} · ${(s.theme||[]).join(", ")}`),el("h3",{lang:s.lang,dir:s.lang==="he"?"rtl":null,class:s.lang==="he"?"lx-he":""},s.text));
 if(s.translit)card.append(el("p",{class:"lx-translit"},s.translit));
 card.append(el("p",{class:"lx-tr"},s.tr));
 (s.par||[]).forEach(x=>card.append(el("p",{lang:x.lang,class:"lx-par"},el("small",{},x.cite+": "),x.t)));
 if(s.syn)card.append(el("p",{class:"lx-syn"},el("b",{},"Nota sintáctica: "),s.syn));
 const status=el("span",{class:"meta-line"},"");
 card.append(el("p",{class:"author"},el("cite",{},s.cite)," ",status));
 const a=el("div",{class:"actions"});
 if(s.lang!=="he"){a.append(el("button",{type:"button",onclick:()=>{$("#lx-q").value=s.text;S.mode="analizar";renderTabs();run()}},"Analizar"),el("button",{type:"button",onclick:()=>{$("#lx-q").value=s.text;S.mode="paralelos";renderTabs();run()}},"Paralelos"))}
 a.append(el("button",{type:"button",onclick:e=>copy(`«${s.text}» (${s.cite}). Trad.: «${s.tr}».`,e.target)},"Copiar"));
 card.append(a);
 verifySententia(s).then(v=>{if(v){const p=v.D.corpus.passages[v.h.i];status.textContent=" · verificada en el corpus local: "+citeOf(v.D,p,v.h.spans[0][0]);const rl=readerLink(v.D,p);if(rl)a.prepend(el("a",{href:rl},"Ver en el texto"))}else if(s.lang!=="he")status.textContent=" · obra no incluida en el corpus local: consúltese la edición de referencia"}).catch(()=>{});
 return card;
}
function renderSententiae(q){
 const k=fold(q);const list=$("#lx-results");
 const arr=(S.sent?.sententiae||[]).filter(s=>!k||[s.text,s.tr,s.author,s.cite,(s.theme||[]).join(" "),s.translit].some(x=>x&&fold(x).includes(k)));
 setState(`${arr.length} sentencia${arr.length===1?"":"s"}${k?" con «"+q+"»":""}. Las que pertenecen a obras del corpus se verifican automáticamente.`);
 for(const s of arr)list.append(sententiaCard(s));
}

/* ---------- Analizador de frases ---------- */
async function analyzeSentence(q){
 const l=resolveLang(q);const list=$("#lx-results");
 if(l==="he"){setState("El análisis morfológico local cubre griego y latín. Para el hebreo bíblico se ofrecen las equivalencias del Etymologicum.");return renderHebrew(q)}
 const D=await lang(l);const words=[...q.matchAll(TOKEN)].map(m=>m[0]);
 setState(`Análisis de ${words.length} palabra${words.length===1?"":"s"} · ${l==="grc"?"griego":"latín"} · lematización automática: verifíquese cada análisis en contexto.`);
 const table=el("table",{class:"lx-table"},el("thead",{},el("tr",{},el("th",{},"#"),el("th",{},"Forma"),el("th",{},"Lema"),el("th",{},"Morfología"),el("th",{},"Glosa"),el("th",{},"Frec."))));
 const tb=el("tbody");table.append(tb);const inter=el("div",{class:"lx-interlinear",lang:l});const rows=[];
 words.forEach((w,i)=>{const k=fold(w).replace(/'+$/,"");let an=analyses(D,k);if(!an.length&&D.l==="grc"){const t=transIndex(D).get(latinTranslitKey(w));if(t)an=analyses(D,t[0])}
  const lems=[...new Set(an.map(a=>a[0]))];const morph=[...new Set(an.filter(a=>a.length>2).map(a=>decodeTag(a[1])))];
  const gl=lems.map(x=>(lemmaInfo(D,x).g||"").split(/;\s*/).slice(0,3).join("; ")).filter(Boolean).join(" | ");
  rows.push({n:i+1,form:w,lemma:lems.map(lemmaDisplay),morph,gloss:gl,freq:D.freq.get(k)||0});
  tb.append(el("tr",{},el("td",{},String(i+1)),el("td",{lang:l},el("button",{type:"button",class:"lx-formlink",onclick:()=>{$("#lx-q").value=w;S.mode="palabra";renderTabs();run()}},w)),el("td",{lang:l},lems.map(lemmaDisplay).join(" / ")||"—"),el("td",{},morph.join(" — o — ")||(l==="la"&&lems.length?"(sin análisis flexivo)":"—")),el("td",{},gl||"—"),el("td",{},String(D.freq.get(k)||0))));
  inter.append(el("span",{class:"lx-il"},el("b",{},w),el("i",{},lems.map(lemmaDisplay).join("/")||"?"),el("small",{},(morph[0]||"").replace(/ · /g," "))));
 });
 list.append(el("section",{class:"lx-analysis"},el("h3",{},"Vista interlineal"),inter,el("h3",{},"Tabla de análisis"),table));
 const exp=el("div",{class:"actions"},
  el("button",{type:"button",onclick:()=>download("analisis.csv",toCSV([["n","forma","lema","morfologia","glosa","frecuencia"],...rows.map(r=>[r.n,r.form,r.lemma.join("/"),r.morph.join(" | "),r.gloss,r.freq])]),"text/csv")},"CSV"),
  el("button",{type:"button",onclick:()=>download("analisis.json",JSON.stringify({text:q,lang:l,tokens:rows,source:D.forms.sources},null,2),"application/json")},"JSON"),
  el("button",{type:"button",onclick:()=>download("analisis.tei.xml",teiAnalysis(q,l,rows),"application/xml")},"XML-TEI"),
  el("button",{type:"button",onclick:()=>{S.mode="frase";renderTabs();run()}},"Buscar la frase en el corpus"),
  el("button",{type:"button",onclick:()=>{S.mode="paralelos";renderTabs();run()}},"Paralelos"));
 list.append(exp);
}

/* ---------- Paralelos (intertextualidad) ---------- */
async function lemmaPostings(D){
 if(D._lemmaPost)return D._lemmaPost;const lp=new Map();
 for(const [k,docs] of D.post){const an=analyses(D,k);const lems=an.length?[...new Set(an.map(a=>a[0]))]:[k];for(const lem of lems){if(STOP[D.l].has(fold(lemmaDisplay(lem))))continue;let s=lp.get(lem);if(!s){s=new Set();lp.set(lem,s)}docs.forEach(d=>s.add(d))}}
 D._lemmaPost=lp;return lp;
}
async function parallels(q){
 const l=resolveLang(q);if(l==="he")return renderHebrew(q);
 const D=await lang(l);setState("Calculando paralelos por lemas compartidos…");
 const lp=await lemmaPostings(D);const N=D.corpus.passages.length;
 const qLems=new Set();for(const m of q.matchAll(TOKEN)){const k=fold(m[0]);if(STOP[l].has(k)||k.length<3)continue;const an=analyses(D,k);(an.length?an.map(a=>a[0]):[k]).forEach(x=>{if(lp.has(x))qLems.add(x)})}
 if(qLems.size<2){setState("Se necesitan al menos dos palabras significativas reconocidas para buscar paralelos.");return}
 const score=new Map(),shared=new Map();
 for(const lem of qLems){const docs=lp.get(lem);const idf=Math.log(N/(docs.size+1));if(idf<=0.4)continue;for(const d of docs){score.set(d,(score.get(d)||0)+idf);let s=shared.get(d);if(!s){s=new Set();shared.set(d,s)}s.add(lem)}}
 const best=[...score.entries()].filter(([d])=>shared.get(d).size>=2).sort((a,b)=>b[1]-a[1]).slice(0,30);
 setState(`${best.length} pasaje${best.length===1?"":"s"} con dos o más lemas significativos en común (${qLems.size} lemas de la consulta). Ponderación TF-IDF por lema; es un indicio de intertextualidad, no una prueba.`);
 const list=$("#lx-results");
 for(const [d,sc] of best){const p=D.corpus.passages[d];const lemSet=shared.get(d);const spans=[];for(const m of p[2].matchAll(TOKEN)){const k=fold(m[0]);const an=analyses(D,k);if((an.length?an.map(a=>a[0]):[k]).some(x=>lemSet.has(x)))spans.push([m.index,m.index+m[0].length])}
  const card=hitCard(D,{i:d,spans:spans.length?spans:[[0,1]],tok:0});card.querySelector(".meta-line").textContent=`puntuación ${sc.toFixed(1)} · ${[...lemSet].map(lemmaDisplay).join(", ")}`;list.append(card)}
}

/* ---------- Exportación y citas ---------- */
function toCSV(rows){return "﻿"+rows.map(r=>r.map(c=>`"${String(c??"").replace(/"/g,'""')}"`).join(",")).join("\r\n")}
function xml(s){return String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function download(name,content,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type:type+";charset=utf-8"}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function copy(t,btn){const done=()=>{if(btn){const o=btn.textContent;btn.textContent="Copiado ✓";setTimeout(()=>btn.textContent=o,1400)}};if(navigator.clipboard)navigator.clipboard.writeText(t).then(done,()=>prompt("Copiar:",t));else prompt("Copiar:",t)}
function teiEntry(e){
 const lang=e.lang==="grc"?"grc":"la";
 return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
 <teiHeader><fileDesc><titleStmt><title>Vitruvia Lexicon · ${xml(e.lemma.join(" / ")||e.form)}</title><editor>Diego A. Kurilo</editor></titleStmt>
  <publicationStmt><publisher>Vitruvius Digital Library</publisher><date>${new Date().toISOString().slice(0,10)}</date><idno type="URI">${xml(e.url)}</idno><availability><licence>Datos léxicos: Lewis &amp; Short / LSJ (Perseus DL, CC BY-SA 4.0); lematización ${lang==="grc"?"Celano (CC BY-NC 4.0)":"CLTK (MIT)"}</licence></availability></publicationStmt>
  <sourceDesc><p>${xml(e.source||"")}</p></sourceDesc></fileDesc></teiHeader>
 <text><body><entry xml:lang="${lang}">
  <form type="lemma">${e.lemma.map(l=>`<orth>${xml(l)}</orth>`).join("")}</form>
  <form type="inflected"><orth>${xml(e.form)}</orth></form>
  ${e.morphology.map(m=>`<gramGrp><gram type="msd" source="AGDT">${xml(m.tag)}</gram><note>${xml(m.analysis)}</note></gramGrp>`).join("\n  ")}
  ${e.etymology?`<etym><p>${xml(e.etymology.etym)}</p><note type="root">${xml(e.etymology.root||"")}</note>${(e.etymology.he||[]).map(h=>`<cit type="equivalent"><quote xml:lang="he">${xml(h.w)}</quote><note>${xml(h.tr)} — ${xml(h.g)}</note></cit>`).join("")}</etym>`:""}
  ${e.senses.flat().map((s,i)=>`<sense n="${i+1}"><def xml:lang="en">${xml(s)}</def></sense>`).join("\n  ")}
  ${e.citations.map(c=>`<cit type="example"><quote xml:lang="${lang}">${xml(c.text.replace(/\s+/g," "))}</quote><bibl><author>${xml(c.author)}</author><title>${xml(c.work)}</title><citedRange>${xml(c.cite)}</citedRange></bibl></cit>`).join("\n  ")}
 </entry></body></text>
</TEI>`;
}
function teiAnalysis(text,l,rows){return `<?xml version="1.0" encoding="UTF-8"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Vitruvia Lexicon · análisis</title></titleStmt><publicationStmt><publisher>Vitruvius Digital Library</publisher></publicationStmt><sourceDesc><p>${xml(text)}</p></sourceDesc></fileDesc></teiHeader>
<text><body><p xml:lang="${l}"><s>${rows.map(r=>`<w n="${r.n}" lemma="${xml(r.lemma.join(" "))}" ana="${xml(r.morph.join(" | "))}">${xml(r.form)}</w>`).join(" ")}</s></p></body></text></TEI>`}
function exportButtons(entry){return el("div",{class:"actions lx-export"},
 el("button",{type:"button",onclick:()=>download(`lexicon-${fold(entry.lemma[0]||entry.form)}.json`,JSON.stringify(entry,null,2),"application/json")},"JSON"),
 el("button",{type:"button",onclick:()=>download(`lexicon-${fold(entry.lemma[0]||entry.form)}.csv`,toCSV([["lema","forma","lengua","acepciones","morfologia","raiz","frecuencia_lema"],[entry.lemma.join("/"),entry.form,entry.lang,entry.senses.flat().join(" | "),entry.morphology.map(m=>m.analysis).join(" | "),entry.etymology?.root||"",entry.frequency.lemma]]),"text/csv")},"CSV"),
 el("button",{type:"button",onclick:()=>download(`lexicon-${fold(entry.lemma[0]||entry.form)}.tei.xml`,teiEntry(entry),"application/xml")},"XML-TEI"))}
function renderExports(D,hits){
 const box=$("#lx-side-extra");
 const rows=()=>hits.slice(0,MAX_HITS).map(h=>{const p=D.corpus.passages[h.i];const k=kwic(p[2],h.spans,8);const w=work(D,p[0]);return[citeOf(D,p,h.spans[0][0]),w.author,w.title,p[2].slice(k.a,h.spans[0][0]).replace(/\s+/g," "),h.spans.map(([s,e])=>p[2].slice(s,e)).join(" … "),p[2].slice(h.spans[h.spans.length-1][1],k.b).replace(/\s+/g," "),readerLink(D,p)]});
 box.append(el("section",{class:"lx-side-block"},el("h3",{},"Exportar concordancia"),el("p",{class:"lx-small"},`${hits.length} líneas KWIC (contexto izquierdo · palabra clave · contexto derecho).`),el("div",{class:"actions"},
  el("button",{type:"button",onclick:()=>download("concordancia.csv",toCSV([["locus","autor","obra","izquierda","clave","derecha","enlace"],...rows()]),"text/csv")},"CSV"),
  el("button",{type:"button",onclick:()=>download("concordancia.json",JSON.stringify({query:S.q,mode:S.mode,lang:D.l,generated:new Date().toISOString(),source:PAGE,lines:rows().map(r=>({locus:r[0],author:r[1],work:r[2],left:r[3],key:r[4],right:r[5],link:SITE+r[6]}))},null,2),"application/json")},"JSON"),
  el("button",{type:"button",onclick:()=>download("concordancia.tei.xml",`<?xml version="1.0" encoding="UTF-8"?>\n<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Concordancia: ${xml(S.q)}</title></titleStmt><publicationStmt><publisher>Vitruvius Digital Library · Vitruvia Lexicon</publisher></publicationStmt><sourceDesc><p>${xml(PAGE)}</p></sourceDesc></fileDesc></teiHeader><text><body><list type="concordance">\n${rows().map(r=>`<item><bibl><author>${xml(r[1])}</author><title>${xml(r[2])}</title><citedRange>${xml(r[0])}</citedRange></bibl><quote xml:lang="${D.l}">${xml(r[3])} <hi rend="keyword">${xml(r[4])}</hi> ${xml(r[5])}</quote></item>`).join("\n")}\n</list></body></text></TEI>`,"application/xml")},"XML-TEI")),
  el("h3",{},"Citar esta consulta"),citeBox(S.q,location.href)));
}
function citeBox(label,url){
 const d=new Date();const months=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];const mEn=["Jan.","Feb.","Mar.","Apr.","May","June","July","Aug.","Sept.","Oct.","Nov.","Dec."];
 const styles={
  Chicago:`Kurilo, Diego A., ed. «${label}». En Vitruvia Lexicon. Vitruvius Digital Library, 2026. Consultado el ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}. ${url}.`,
  APA:`Kurilo, D. A. (Ed.). (2026). ${label}. En Vitruvia Lexicon. Vitruvius Digital Library. Recuperado el ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}, de ${url}`,
  MLA:`"${label}." Vitruvia Lexicon, edited by Diego A. Kurilo, Vitruvius Digital Library, 2026, ${url}. Accessed ${d.getDate()} ${mEn[d.getMonth()]} ${d.getFullYear()}.`,
  BibTeX:`@misc{vitruvialexicon_${fold(label).replace(/[^a-z0-9α-ω]+/g,"").slice(0,24)||"entry"},\n  editor = {Kurilo, Diego A.},\n  title = {${label}},\n  howpublished = {Vitruvia Lexicon, Vitruvius Digital Library},\n  year = {2026},\n  url = {${url}},\n  note = {Consultado el ${d.toISOString().slice(0,10)}}\n}`};
 const wrap=el("div",{class:"lx-cite-box"});const sel=el("select",{"aria-label":"Estilo de cita"});Object.keys(styles).forEach(k=>sel.append(el("option",{value:k},k)));
 const out=el("pre",{class:"lx-cite-out"},styles.Chicago);sel.addEventListener("change",()=>out.textContent=styles[sel.value]);
 wrap.append(sel,out,el("button",{type:"button",class:"lx-btn",onclick:e=>copy(out.textContent,e.target)},"Copiar cita"));return wrap;
}
function injectJsonLd(e){
 document.getElementById("lx-entry-ld")?.remove();
 const s=document.createElement("script");s.type="application/ld+json";s.id="lx-entry-ld";
 s.textContent=JSON.stringify({"@context":"https://schema.org","@type":"DefinedTerm","name":e.lemma[0]||e.form,"alternateName":e.form,"inLanguage":e.lang==="grc"?"grc":"la","description":(e.etymology?.etym||e.senses.flat().slice(0,3).join("; ")).slice(0,500),"url":e.url,"inDefinedTermSet":{"@type":"DefinedTermSet","@id":PAGE+"#etymologicum","name":"Vitruvia Lexicon"}});
 document.head.append(s);
}

/* ---------- Teclados virtuales ---------- */
const KB={
 grc:{label:"Griego politónico",rows:["ς ε ρ τ υ θ ι ο π","α σ δ φ γ η ξ κ λ","ζ χ ψ ω β ν μ ; ·"],marks:[["᾿","̓","espíritu suave"],["῾","̔","espíritu áspero"],["´","́","agudo"],["`","̀","grave"],["῀","͂","circunflejo"],["ͺ","ͅ","iota suscrita"],["¨","̈","diéresis"]]},
 he:{label:"Hebreo bíblico",rows:["ק ר א ט ו ן ם פ","ש ד ג כ ע י ח ל ך ף","ז ס ב ה נ מ צ ת ץ ־"],marks:[["שׁ","ׁ","punto de shin"],["שׂ","ׂ","punto de sin"],["בּ","ּ","dagesh"],["ָ","ָ","qamets"],["ַ","ַ","pataḥ"],["ֶ","ֶ","segol"],["ֵ","ֵ","tsere"],["ִ","ִ","ḥireq"],["ֹ","ֹ","ḥolam"],["ֻ","ֻ","qibbuts"],["ְ","ְ","shewa"]]},
 la:{label:"Latín (cantidades)",rows:["ā ē ī ō ū ȳ","ă ĕ ĭ ŏ ŭ","æ œ ë ï ⟨ ⟩ † [ ]"],marks:[["¯","̄","macrón"],["˘","̆","breve"]]}
};
function renderKeyboard(which){
 const box=$("#lx-kb");box.replaceChildren();const k=KB[which];let caps=false;
 const head=el("div",{class:"lx-kb-head"});for(const [id,v] of Object.entries(KB))head.append(el("button",{type:"button",class:"tab","aria-pressed":String(id===which),onclick:()=>renderKeyboard(id)},v.label));
 head.append(el("button",{type:"button",class:"tab lx-kb-close",onclick:()=>{box.hidden=true;$("#lx-kb-toggle").setAttribute("aria-expanded","false")}},"Cerrar ×"));box.append(head);
 const input=$("#lx-q");
 const insert=t=>{const s=input.selectionStart??input.value.length,e=input.selectionEnd??s;input.value=input.value.slice(0,s)+t+input.value.slice(e);input.setSelectionRange(s+t.length,s+t.length);input.focus()};
 const mark=m=>{const s=input.selectionStart??input.value.length;if(!s){insert(m);return}const before=input.value.slice(0,s);const after=input.value.slice(s);const nb=(before+m).normalize("NFC");input.value=nb+after;input.setSelectionRange(nb.length,nb.length);input.focus()};
 for(const r of k.rows){const row=el("div",{class:"lx-kb-row"});for(const ch of r.split(" "))row.append(el("button",{type:"button",class:"lx-key",lang:which,onclick:()=>insert(caps&&which==="grc"?ch.toUpperCase():ch)},ch));box.append(row)}
 const mrow=el("div",{class:"lx-kb-row"});for(const [g,m,t] of k.marks)mrow.append(el("button",{type:"button",class:"lx-key lx-mark",title:t,"aria-label":t,onclick:()=>mark(m)},g));
 if(which==="grc")mrow.append(el("button",{type:"button",class:"lx-key",onclick:e=>{caps=!caps;e.target.setAttribute("aria-pressed",String(caps))},"aria-pressed":"false"},"⇧ Mayús."));
 mrow.append(el("button",{type:"button",class:"lx-key",onclick:()=>insert(" ")},"espacio"),el("button",{type:"button",class:"lx-key",onclick:()=>{const s=input.selectionStart??input.value.length;if(s){const chars=[...input.value.slice(0,s)];chars.pop();const nb=chars.join("");input.value=nb+input.value.slice(s);input.setSelectionRange(nb.length,nb.length)}input.focus()}},"⌫"));
 box.append(mrow,el("p",{class:"explain"},which==="grc"?"Escriba la vocal y luego el diacrítico: se combinan en un solo carácter (NFC). También puede escribir en caracteres latinos: «anthropos» encuentra ἄνθρωπος.":which==="he"?"El hebreo se escribe de derecha a izquierda; los puntos vocálicos se añaden tras la consonante.":"Signos críticos: ⟨ ⟩ adición, [ ] supresión, † crux."));
}

/* ---------- Taller ecdótico: colación de testimonios ---------- */
function tokenizeWit(t,opts){return [...String(t).matchAll(TOKEN)].map(m=>{let k=m[0];if(opts.case)k=k.toLowerCase();if(opts.uv)k=fold(k);if(opts.ortho)k=variantKey(fold(k),detectLang(k)==="grc"?"grc":"la");return{w:m[0],k}})}
function lcsAlign(a,b){const n=a.length,m=b.length;const dp=Array.from({length:n+1},()=>new Uint16Array(m+1));for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i].k===b[j].k?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);const ops=[];let i=0,j=0;while(i<n&&j<m){if(a[i].k===b[j].k){ops.push(["=",i,j]);i++;j++}else if(dp[i+1][j]>=dp[i][j+1]){ops.push(["-",i,null]);i++}else{ops.push(["+",i,j]);j++}}while(i<n)ops.push(["-",i++,null]);while(j<m)ops.push(["+",n,j++]);return ops}
function collate(){
 const opts={case:$("#col-case").checked,uv:$("#col-uv").checked,ortho:$("#col-ortho").checked};
 const base={sig:$("#col-base-sig").value.trim()||"A",text:$("#col-base").value};
 const wits=$$(".col-wit").map(w=>({sig:w.querySelector(".col-sig").value.trim(),text:w.querySelector("textarea").value})).filter(w=>w.sig&&w.text.trim());
 const out=$("#col-out");out.replaceChildren();
 if(!base.text.trim()||!wits.length){out.append(el("p",{class:"empty"},"Introduzca el texto base y al menos un testimonio con su sigla."));return}
 const B=tokenizeWit(base.text,opts);if(B.length>1800){out.append(el("p",{class:"empty"},"Texto demasiado extenso para la colación en el navegador (máx. ≈1800 palabras por testimonio)."));return}
 /* Unidades de variación indexadas por posición del texto base. */
 const units=new Map();const key=(i,type)=>i+":"+type;
 for(const w of wits){const W=tokenizeWit(w.text,opts);const ops=lcsAlign(B,W);
  let k=0;while(k<ops.length){const op=ops[k];if(op[0]==="="){k++;continue}
   const start=op[1];const del=[],ins=[];while(k<ops.length&&ops[k][0]!=="="){if(ops[k][0]==="-")del.push(ops[k][1]);else ins.push(W[ops[k][2]].w);k++}
   const s=del.length?del[0]:start;const e=del.length?del[del.length-1]:start-1;
   const lem=del.length?B.slice(s,e+1).map(t=>t.w).join(" "):"";const rd=ins.join(" ");
   const id=del.length?`${s}-${e}`:`${start}^`;let u=units.get(id);if(!u){u={s,e,ins:!del.length,lem,readings:new Map()};units.set(id,u)}
   const r=rd||"om.";if(!u.readings.has(r))u.readings.set(r,[]);u.readings.get(r).push(w.sig);
  }}
 const arr=[...units.values()].sort((a,b)=>a.s-b.s||(a.ins?-1:1));
 /* Clasificación orientativa del tipo de variante. */
 const classify=(u,r)=>{if(r==="om."){const prev=B[u.s-1]?.k,last=B[u.e]?.k;if(prev&&last&&(prev===last||prev.slice(-3)===last.slice(-3)))return"omisión: posible salto de igual a igual (homeotéleuton)";if(u.e===u.s&&B[u.s-1]?.k===B[u.s].k)return"omisión: posible haplografía";return"omisión"}
  if(u.ins){const prevW=B[u.s-1]?.k;if(prevW&&fold(r).split(" ")[0]===prevW)return"adición: posible ditografía";return"adición"}
  const lk=variantKey(fold(u.lem),"la"),rk=variantKey(fold(r),"la");if(lk===rk)return"variante ortográfica";
  const lw=fold(u.lem).split(" "),rw=fold(r).split(" ");if(lw.length===rw.length&&lw.length>1&&[...lw].sort().join()===[...rw].sort().join())return"transposición";
  if(lw.length===1&&rw.length===1&&lev(lw[0],rw[0],2)<=2)return"sustitución: posible error paleográfico o de lectura";return"sustitución"};
 const allSig=[base.sig,...wits.map(w=>w.sig)];
 /* Aparato positivo y negativo */
 const pos=el("ol",{class:"lx-app"}),neg=el("ol",{class:"lx-app"});
 for(const u of arr){const loc=`${u.s+1}${u.ins?"^":u.e>u.s?"–"+(u.e+1):""}`;const lem=u.ins?`post ${B[u.s-1]?.w||"init."}`:u.lem;const agree=allSig.filter(s=>![...u.readings.values()].flat().includes(s));
  const negParts=[...u.readings.entries()].map(([r,sg])=>`${r==="om."?"om.":r} ${sg.join(" ")}`);const types=[...u.readings.keys()].map(r=>classify(u,r));
  neg.append(el("li",{},el("span",{class:"lx-app-n"},loc+" "),el("b",{},lem),"] ",negParts.join(" : "),el("small",{}," — ",[...new Set(types)].join("; "))));
  pos.append(el("li",{},el("span",{class:"lx-app-n"},loc+" "),el("b",{},lem)," ",agree.join(" "),"] ",negParts.join(" : ")))}
 /* Matriz de concordancia en variantes: indicio de agrupamiento (errores conjuntivos candidatos). */
 const sigs=wits.map(w=>w.sig);const mat=el("table",{class:"lx-table"});const hr=el("tr",{},el("th",{},""));sigs.forEach(s=>hr.append(el("th",{},s)));mat.append(hr);
 const shared=[];
 for(const a of sigs){const tr=el("tr",{},el("th",{},a));for(const b of sigs){let n=0;if(a!==b){for(const u of arr)for(const [r,sg] of u.readings)if(sg.includes(a)&&sg.includes(b)){n++;if(a<b)shared.push(`${a}+${b}: ${u.ins?"+":""}${u.lem||"·"}] ${r}`)}}tr.append(el("td",{},a===b?"—":String(n)))}mat.append(tr)}
 const syn=el("div",{class:"lx-synopsis"});const marked=new Set();arr.forEach(u=>{for(let i=u.s;i<=u.e;i++)marked.add(i)});const bp=el("p",{},el("b",{},base.sig+": "));B.forEach((t,i)=>{bp.append(marked.has(i)?el("mark",{},t.w):t.w," ")});syn.append(bp);
 out.append(el("p",{class:"explain"},`${arr.length} unidades de variación entre ${allSig.length} testimonios. Alineación por subsecuencia común más larga (LCS) sobre palabras normalizadas${opts.uv?" (u/v, i/j, diacríticos)":""}${opts.ortho?" y grafías equivalentes":""}. Los números remiten a la posición de la palabra en el texto base (^ = adición tras esa posición). Las clasificaciones son automáticas y orientativas.`),
  el("h4",{},"Texto base con lugares variantes"),syn,el("h4",{},"Aparato negativo"),neg,el("h4",{},"Aparato positivo"),pos,el("h4",{},"Concordancia en variantes (indicio de agrupamiento)"),mat,
  el("details",{},el("summary",{},`Variantes compartidas entre testimonios (${shared.length}) — candidatas a errores conjuntivos`),el("ul",{},shared.length?shared.slice(0,200).map(s=>el("li",{},s)):el("li",{},"Ninguna variante es compartida por dos o más testimonios."))),
  el("div",{class:"actions"},el("button",{type:"button",onclick:()=>download("colacion.tei.xml",teiApparatus(base,B,arr,allSig),"application/xml")},"Exportar aparato XML-TEI (parallel segmentation)"),el("button",{type:"button",onclick:()=>download("colacion.csv",toCSV([["locus","lema","lectura","testimonios","tipo"],...arr.flatMap(u=>[...u.readings.entries()].map(([r,sg])=>[`${u.s+1}${u.ins?"^":""}`,u.lem,r,sg.join(" "),classify(u,r)]))]),"text/csv")},"CSV")));
}
function teiApparatus(base,B,arr,sigs){
 let body="",i=0;const byStart=new Map(arr.map(u=>[u.s+(u.ins?"^":""),u]));
 const listWit=`<listWit>${sigs.map(s=>`<witness xml:id="${xml(s.replace(/\W/g,"_"))}">${xml(s)}</witness>`).join("")}</listWit>`;
 const ref=sg=>sg.map(s=>"#"+s.replace(/\W/g,"_")).join(" ");
 while(i<=B.length){const ins=byStart.get(i+"^");if(ins){const rd=[...ins.readings.entries()].map(([r,sg])=>`<rdg wit="${ref(sg)}">${xml(r)}</rdg>`).join("");const lw=sigs.filter(s=>![...ins.readings.values()].flat().includes(s));body+=`<app><lem wit="${ref(lw)}"/>${rd}</app> `}
  if(i===B.length)break;const u=byStart.get(i);
  if(u){const lw=sigs.filter(s=>![...u.readings.values()].flat().includes(s));body+=`<app><lem wit="${ref(lw)}">${xml(u.lem)}</lem>${[...u.readings.entries()].map(([r,sg])=>r==="om."?`<rdg wit="${ref(sg)}"/>`:`<rdg wit="${ref(sg)}">${xml(r)}</rdg>`).join("")}</app> `;i=u.e+1}else{body+=xml(B[i].w)+" ";i++}}
 return `<?xml version="1.0" encoding="UTF-8"?>\n<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Colación · Vitruvia Lexicon</title></titleStmt><publicationStmt><publisher>Vitruvius Digital Library</publisher></publicationStmt><sourceDesc>${listWit}</sourceDesc></fileDesc><encodingDesc><variantEncoding method="parallel-segmentation" location="internal"/></encodingDesc></teiHeader><text><body><p>${body.trim()}</p></body></text></TEI>`;
}
async function loadCollationExample(){
 const loc=$("#col-locus").value.trim()||"1.1.1";const btn=$("#col-example");btn.disabled=true;btn.textContent="Cargando…";
 try{const [c,D]=await Promise.all([load("data/collation-loci.json"),lang("la")]);const p=D.corpus.passages.find(x=>x[0]==="vitruvius"&&x[1]===loc);const lc=c.loci[loc];
  if(!p||!lc)throw new Error("locus no disponible");$("#col-base-sig").value="V514";$("#col-base").value=p[2];
  const wits=$$(".col-wit");const ids=Object.keys(lc);ids.slice(0,wits.length).forEach((id,i)=>{wits[i].querySelector(".col-sig").value=id==="rose-1899"?"Rose":"Krohn";wits[i].querySelector("textarea").value=(lc[id].text||"").replace(/\s+\d+\s+(?=[a-z])/g," ").slice(0,4000)});
  $("#col-note").textContent=`Ejemplo real: Vitr. ${loc}, texto de la edición V514 frente a las páginas OCR de Rose (1899) y Krohn (1912) alineadas en data/collation-loci.json. El OCR introduce ruido y arrastra el aparato a pie de página: es material de práctica, no una colación definitiva.`;collate()}
 catch(err){$("#col-note").textContent="No se pudo cargar el ejemplo: "+err.message}
 btn.disabled=false;btn.textContent="Cargar ejemplo vitruviano";
}

/* ---------- Cuaderno exegético ---------- */
const NB_KEY="vitruvia-lexicon-notebook-v1";
function nbLoad(){try{return JSON.parse(localStorage.getItem(NB_KEY)||"[]")}catch{return[]}}
function nbSave(a){try{localStorage.setItem(NB_KEY,JSON.stringify(a))}catch{}}
function addToNotebook(item){const a=nbLoad();a.unshift({id:Date.now(),...item,notes:{}});nbSave(a);renderNotebook();$("#exegesis").scrollIntoView({behavior:"smooth"})}
function renderNotebook(){
 const box=$("#nb-list");if(!box)return;box.replaceChildren();const a=nbLoad();const tpl=S.phil?.exegesis_template||[];
 if(!a.length){box.append(el("p",{class:"empty"},"El cuaderno está vacío. Use «Al cuaderno exegético» en cualquier pasaje, o añada uno manualmente."));return}
 for(const it of a){
  const art=el("article",{class:"lx-nb-item"},el("header",{},el("h4",{},it.cite||"Pasaje"),el("button",{type:"button",class:"lx-btn",onclick:()=>{nbSave(nbLoad().filter(x=>x.id!==it.id));renderNotebook()}},"Eliminar")),el("blockquote",{lang:it.lang},it.text),it.tr?el("p",{class:"lx-tr"},it.tr):null);
  for(const f of tpl){const ta=el("textarea",{rows:"2",placeholder:f.h,"aria-label":f.t});ta.value=it.notes?.[f.k]||"";ta.addEventListener("input",()=>{const all=nbLoad();const x=all.find(y=>y.id===it.id);if(x){x.notes=x.notes||{};x.notes[f.k]=ta.value;nbSave(all)}});art.append(el("label",{class:"lx-nb-field"},el("span",{},f.t),ta))}
  box.append(art);
 }
}
function nbExport(fmt){
 const a=nbLoad();const tpl=S.phil?.exegesis_template||[];
 if(fmt==="md")return download("cuaderno-exegetico.md",a.map(it=>`## ${it.cite}\n\n> ${it.text.replace(/\n/g,"\n> ")}\n\n${it.tr?"*"+it.tr+"*\n\n":""}${tpl.map(f=>it.notes?.[f.k]?`### ${f.t}\n\n${it.notes[f.k]}\n`:"").join("\n")}`).join("\n---\n\n"),"text/markdown");
 if(fmt==="json")return download("cuaderno-exegetico.json",JSON.stringify(a,null,2),"application/json");
 download("cuaderno-exegetico.tei.xml",`<?xml version="1.0" encoding="UTF-8"?>\n<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Cuaderno exegético · Vitruvia Lexicon</title></titleStmt><publicationStmt><p>Notas personales</p></publicationStmt><sourceDesc><p>${xml(PAGE)}</p></sourceDesc></fileDesc></teiHeader><text><body>${a.map(it=>`<div type="commentary"><head>${xml(it.cite)}</head><cit><quote xml:lang="${xml(it.lang)}">${xml(it.text)}</quote>${it.tr?`<quote type="translation" xml:lang="es">${xml(it.tr)}</quote>`:""}</cit>${tpl.map(f=>it.notes?.[f.k]?`<note type="${f.k}"><label>${xml(f.t)}</label>${xml(it.notes[f.k])}</note>`:"").join("")}</div>`).join("")}</body></text></TEI>`,"application/xml");
}

/* ---------- Instrumenta philologica ---------- */
function renderInstrumenta(){
 const P=S.phil;if(!P)return;const tabs=$("#inst-tabs"),out=$("#inst-out");
 const groups=[["signa","Signa critica"],["abbreviationes","Abreviaturas del aparato"],["errores","Tipología de errores"],["principia","Principios ecdóticos"],["codicologia","Codicología y paleografía"],["abbreviaturae","Abreviaturas medievales"],["hermeneutica","Hermenéutica y exégesis"],["bibliography","Bibliografía"]];
 let cur="signa";const filter=$("#inst-filter");
 const draw=()=>{out.replaceChildren();const k=fold(filter.value);const data=P[cur]||[];const dl=el("dl",{class:"lx-dl lx-inst"});
  for(const it of data){const term=typeof it==="string"?"":it.s||it.a||it.t;const def=typeof it==="string"?it:it.n;if(k&&!fold(term+" "+def+" "+(it.tei||"")).includes(k))continue;
   if(cur==="bibliography"){dl.append(el("dd",{class:"lx-bib"},it));continue}
   dl.append(el("dt",{class:cur==="signa"||cur==="abbreviaturae"?"lx-sign":""},term),el("dd",{},def,it.tei?el("code",{class:"lx-tei"}," TEI: "+it.tei):null))}
  out.append(dl)};
 for(const [k,t] of groups)tabs.append(el("button",{type:"button",class:"tab","aria-pressed":String(k===cur),onclick:e=>{cur=k;$$("#inst-tabs .tab").forEach(b=>b.setAttribute("aria-pressed","false"));e.target.setAttribute("aria-pressed","true");draw()}},t));
 filter.addEventListener("input",draw);draw();
}

/* ---------- Arranque ---------- */
async function init(){
 renderTabs();
 try{const th=localStorage.getItem("vitruvia-theme");if(th==="light")document.documentElement.dataset.theme="light"}catch{}
 $("#theme")?.addEventListener("click",()=>{const t=document.documentElement.dataset.theme==="light"?"dark":"light";document.documentElement.dataset.theme=t;try{localStorage.setItem("vitruvia-theme",t)}catch{}});
 $("#lx-form").addEventListener("submit",e=>{e.preventDefault();run().then(()=>$("#results").scrollIntoView({behavior:"smooth",block:"start"}))});
 $("#lx-lang").addEventListener("change",e=>{S.lang=e.target.value;if(S.q)run()});
 $("#lx-work").addEventListener("change",e=>{S.work=e.target.value;if(S.q)run()});
 $("#lx-order").addEventListener("change",()=>{if(S.result&&S.D){S.page=0;$("#lx-results").replaceChildren();$("#lx-side-extra").replaceChildren();if(S.mode==="sintaxis")renderCollocations(S.D,S.result);renderHits(S.D,S.result)}});
 ["#lx-variants","#lx-lemmatize"].forEach(id=>$(id).addEventListener("change",()=>{if(S.q)run()}));
 $("#lx-clear").addEventListener("click",()=>{$("#lx-q").value="";$("#lx-q").focus()});
 /* Autocompletado de lemas y formas atestiguadas; atajo «/» para ir al buscador. */
 {const dl=document.createElement("datalist");dl.id="lx-suggest";document.body.append(dl);$("#lx-q").setAttribute("list","lx-suggest");let timer=0;
  $("#lx-q").addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(async()=>{const v=$("#lx-q").value.trim();if(v.length<2||/[\s"@\[*?~]/.test(v)){dl.replaceChildren();return}
   const l=S.lang!=="auto"?S.lang:detectLang(v);if(l==="he"){dl.replaceChildren();return}const D=await lang(l,true);const k=fold(v);const out=new Set();
   for(const e of (S.etym?.entries||[]))if(e.l===l&&fold(e.lemma).startsWith(k))out.add(e.lemma);
   for(const lem of Object.keys(D.forms.lemmas)){if(out.size>=12)break;if(fold(lemmaDisplay(lem)).startsWith(k))out.add(lemmaDisplay(lem))}
   if(out.size<4&&!GREEK.test(v)&&S.lang==="auto"){const G=await lang("grc",true);const tk=latinTranslitKey(v);for(const [t,fs] of transIndex(G)){if(out.size>=12)break;if(t.startsWith(tk))for(const f of fs){const a=analyses(G,f)[0];out.add(a?lemmaDisplay(a[0]):f)}}}
   if(out.size<12&&D.l==="grc"&&!GREEK.test(v)){const tk=latinTranslitKey(v);for(const [t,fs] of transIndex(D)){if(out.size>=12)break;if(t.startsWith(tk))for(const f of fs){const a=analyses(D,f)[0];out.add(a?lemmaDisplay(a[0]):f)}}}
   dl.replaceChildren(...[...out].slice(0,12).map(x=>el("option",{value:x})))},180)});
  document.addEventListener("keydown",e=>{if(e.key==="/"&&!/input|textarea|select/i.test(document.activeElement?.tagName||"")){e.preventDefault();$("#lx-q").focus()}});}
 $("#lx-kb-toggle").addEventListener("click",e=>{const kb=$("#lx-kb");kb.hidden=!kb.hidden;e.currentTarget.setAttribute("aria-expanded",String(!kb.hidden));if(!kb.hidden&&!kb.childNodes.length)renderKeyboard(detectLang($("#lx-q").value)==="he"?"he":"grc")});
 $$(".suggestions [data-q]").forEach(b=>b.addEventListener("click",()=>{$("#lx-q").value=b.dataset.q;if(b.dataset.mode){S.mode=b.dataset.mode;renderTabs()}run();$("#results").scrollIntoView({behavior:"smooth",block:"start"})}));
 $$("[data-tool-mode]").forEach(a=>a.addEventListener("click",e=>{const m=a.dataset.toolMode;if(MODES[m]){e.preventDefault();S.mode=m;renderTabs();if(m==="sententiae")run();$("#lx-q").focus()}}));
 /* Interconexión: toda palabra de una cita abre su propia ficha. */
 document.addEventListener("click",e=>{const w=e.target.closest?.(".w");if(!w||!w.closest("#lx-results,#lx-entry"))return;$("#lx-q").value=w.dataset.w;S.mode="palabra";renderTabs();run();window.scrollTo({top:$("#results").offsetTop-10,behavior:"smooth"})});
 $("#col-run").addEventListener("click",collate);$("#col-example").addEventListener("click",loadCollationExample);
 $("#col-add").addEventListener("click",()=>{const n=$$(".col-wit").length;if(n>=6)return;const t=$(".col-wit").cloneNode(true);t.querySelector(".col-sig").value=String.fromCharCode(66+n);t.querySelector("textarea").value="";$("#col-wits").append(t)});
 $("#nb-add").addEventListener("click",()=>{const text=prompt("Texto del pasaje (latín, griego o hebreo):");if(!text)return;const cite=prompt("Referencia (p. ej. Vitr. 1.1.1):")||"Pasaje";addToNotebook({cite,text,lang:detectLang(text)})});
 $$("[data-nb-export]").forEach(b=>b.addEventListener("click",()=>nbExport(b.dataset.nbExport)));
 $("#site-cite")?.append(citeBox("Vitruvia Lexicon",PAGE));
 try{[S.etym,S.sent,S.phil]=await Promise.all([load("data/lexicon/etymologicum.json"),load("data/lexicon/sententiae.json"),load("data/lexicon/philologia.json")])}catch(err){console.error(err)}
 renderInstrumenta();renderNotebook();renderDaily();
 const metrics=$("#lx-metrics");if(metrics&&S.etym)metrics.querySelector("[data-m=etym]").textContent=S.etym.entries.length;if(metrics&&S.sent)metrics.querySelector("[data-m=sent]").textContent=S.sent.sententiae.length;
 const p=new URLSearchParams(location.search);
 if(p.get("mode")&&MODES[p.get("mode")])S.mode=p.get("mode");if(p.get("lang"))S.lang=p.get("lang");$("#lx-lang").value=S.lang;if(p.get("work"))S.work=p.get("work");renderTabs();
 if(p.get("q")){$("#lx-q").value=p.get("q");run(false)}else if(S.mode==="sententiae")run(false);else setState("Escriba una palabra, una frase o un patrón. El índice se carga al primer uso.");
}
function renderDaily(){
 const s=S.sent?.sententiae;if(!s?.length)return;const d=new Date();const i=(d.getFullYear()*372+d.getMonth()*31+d.getDate())%s.length;const x=s[i];
 $("#featured-title").textContent=x.text;$("#featured-title").lang=x.lang;if(x.lang==="he")$("#featured-title").dir="rtl";
 $("#featured-description").textContent=x.tr;$("#featured-credit").textContent=x.cite;
 $("#featured-link").onclick=e=>{e.preventDefault();$("#lx-q").value=x.text;S.mode=x.lang==="he"?"sententiae":"analizar";renderTabs();run();$("#results").scrollIntoView({behavior:"smooth"})};
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init):init();
window.VitruviaLexicon={fold,variantKey,greekToLatin,latinTranslitKey,parseQuery,decodeTag,version:"1.0"};
})();
