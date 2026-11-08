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
const CHRONO={"herodotus-histories":-430,"euclid-elements":-300,"cato-agricultura":-160,"varro-rustica":-37,"columella-rustica":60,"pliny-naturalis":77,"frontinus-aquaeductu":97,"homer-iliad":-750,"homer-odyssey":-720,"plato-apology":-399,"aristotle-poetics":-335,"theophrastus-characters":-319,"lucretius":-55,"catullus-carmina":-54,"caesar-gallico":-50,"cicero-officiis":-44,"virgil-georgica":-29,"virgil-aeneid":-19,"vitruvius":-25,"petronius-satyrica":60,"epictetus-enchiridion":125,"apuleius-metamorphoses":170};
const DATING={"herodotus-histories":"c. 430 a. C.","euclid-elements":"c. 300 a. C.","cato-agricultura":"c. 160 a. C.","varro-rustica":"37 a. C.","columella-rustica":"c. 60–65 d. C.","pliny-naturalis":"77–79 d. C.","frontinus-aquaeductu":"c. 97–98 d. C.","homer-iliad":"s. VIII a. C.","homer-odyssey":"s. VIII–VII a. C.","plato-apology":"c. 399–390 a. C.","aristotle-poetics":"c. 335 a. C.","theophrastus-characters":"c. 319 a. C.","lucretius":"c. 55 a. C.","catullus-carmina":"c. 60–54 a. C.","caesar-gallico":"58–50 a. C.","cicero-officiis":"44 a. C.","virgil-georgica":"29 a. C.","virgil-aeneid":"29–19 a. C.","vitruvius":"c. 30–20 a. C.","petronius-satyrica":"s. I d. C.","epictetus-enchiridion":"s. II d. C. (Arriano)","apuleius-metamorphoses":"s. II d. C."};
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
/* Los datos del Lexicon llevan la huella de versión de la página (meta lx-data-version): el service
   worker los guarda y no se vuelven a descargar mientras no cambien. */
const DATA_VER=document.querySelector('meta[name="lx-data-version"]')?.content||"";
function load(path){const url=ROOT+path+(DATA_VER&&path.startsWith("data/lexicon/")?(path.includes("?")?"&":"?")+"v="+DATA_VER:"");if(!cache.has(path))cache.set(path,fetch(url,{cache:"force-cache"}).then(r=>{if(!r.ok)throw new Error(path+" · HTTP "+r.status);return r.json()}).catch(err=>{cache.delete(path);throw err}));return cache.get(path)}
const L={};
async function lang(l,silent=false){
 if(l==="la")loadContext();
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
 })().catch(err=>{delete L[l];throw err});
 return L[l];
}
function transIndex(D){if(!D._trans){D._trans=new Map();for(const k of D.keys){const t=transKeyFromGreek(k);let a=D._trans.get(t);if(!a){a=[];D._trans.set(t,a)}a.push(k)}}return D._trans}
function variantIndex(D){if(!D._variant){D._variant=new Map();for(const k of D.keys){const v=variantKey(k,D.l);let a=D._variant.get(v);if(!a){a=[];D._variant.set(v,a)}a.push(k)}}return D._variant}
function analyses(D,k){const a=Object.hasOwn(D.forms.forms,k)?D.forms.forms[k]:null;return Array.isArray(a)?a:[]}
function lemmaInfo(D,lem){return Object.hasOwn(D.forms.lemmas,lem)?D.forms.lemmas[lem]:{}}
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
const PATTERN_ALIASES={pos:{noun:"n",sust:"n",sustantivo:"n",n:"n",verb:"v",verbo:"v",v:"v",adj:"a",adjetivo:"a",a:"a",adv:"d",adverbio:"d",art:"l",articulo:"l",artículo:"l",particle:"g",part:"g",particula:"g",conj:"c",conjuncion:"c",prep:"r",preposicion:"r",pron:"p",pronombre:"p",num:"m"},
 case:{nom:"n",gen:"g",dat:"d",acc:"a",ac:"a",voc:"v",nominativo:"n",genitivo:"g",dativo:"d",acusativo:"a",vocativo:"v"},num:{sg:"s",pl:"p",du:"d",singular:"s",plural:"p",dual:"d"},tense:{pres:"p",imperf:"i",perf:"r",plup:"l",fut:"f",aor:"a",presente:"p",imperfecto:"i",perfecto:"r",aoristo:"a",futuro:"f"},
 mood:{ind:"i",subj:"s",opt:"o",inf:"n",imp:"m",ptc:"p",part:"p",indicativo:"i",subjuntivo:"s",optativo:"o",infinitivo:"n",imperativo:"m",participio:"p"},voice:{act:"a",pass:"p",mid:"m",mp:"e",activa:"a",pasiva:"p",media:"m"},gender:{m:"m",masc:"m",f:"f",fem:"f",n:"n",neut:"n"}};
const PATTERN_POS={pos:0,person:2,num:3,tense:4,mood:5,voice:6,gender:7,case:8};
function parsePattern(src){const conds=[];for(const part of src.split(/[\s,]+/).filter(Boolean)){const [kRaw,vRaw]=part.split("=");const k=({caso:"case",modo:"mood",tiempo:"tense",voz:"voice",genero:"gender",género:"gender",numero:"num",número:"num",persona:"person"})[kRaw]||kRaw;if(!(k in PATTERN_POS)||!vRaw)continue;const vals=vRaw.split("|").map(v=>(PATTERN_ALIASES[k]?.[v]??v));conds.push([PATTERN_POS[k],vals])}return conds}
function tagMatches(tag,conds){const t=normTag(tag);return conds.every(([pos,vals])=>vals.includes(t[pos]))}

/* ---------- Analizador de consultas ---------- */
/* Gramática: palabra · "frase exacta" · @lema · comod*n · t?xis · ~fuzzy · prefijo: · [pos=verb mood=ptc case=gen] · A ..3 B (orden, hasta 3 palabras) · A NEAR/5 B (sin orden) */
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
 if(/^(prefijo|prefix|raiz|raíz|root):/i.test(w))return{type:"wild",v:w.replace(/^[^:]+:/,"")+"*"}; /* ortográfico: comienzo de palabra */
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
 }else if(t.type==="lemma"){const lk=fold(t.v);const exact=/\d$/.test(lk);for(const [lem,fs] of D.lemmaForms){if(exact?fold(lem)===lk:fold(lemmaDisplay(lem))===lk)for(const f of fs)add(f)}
  if(!out.size)add(lk);
 }else if(t.type==="wild"){let pat=fold(t.v);if(D.l==="grc"&&!GREEK.test(t.v)){/* comodín transliterado */const rx=new RegExp("^"+latinTranslitKey(t.v).replace(/[.+^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$");for(const [tk,fs] of transIndex(D))if(rx.test(tk))fs.forEach(add)}
  else{const rx=new RegExp("^"+pat.replace(/[.+^${}()|[\]\\]/g,"\\$&").replace(/\*/g,".*").replace(/\?/g,".")+"$","u");for(const k of D.keys)if(rx.test(k))out.add(k)}
 }else if(t.type==="fuzzy"){const k=fold(t.v);const max=k.length>7?2:1;for(const f of D.keys)if(f[0]===k[0]&&lev(f,k,max)<=max)out.add(f);
  if(D.l==="grc"&&!GREEK.test(t.v)){const tk=latinTranslitKey(t.v);for(const [x,fs] of transIndex(D))if(lev(x,tk,max)<=max)fs.forEach(add)}
 }else if(t.type==="pattern"){for(const [k,an] of Object.entries(D.forms.forms))if(an.some(a=>typeof a[1]==="string"&&tagMatches(a[1],t.conds)))add(k)}
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
 grupo:{label:"Grupo de palabras",help:"Varias palabras a la vez, en cualquier lengua (latín, griego, castellano, inglés, francés, alemán): masonry mason constructor · faber structor τέκτων · columna capitel. Cada término se resuelve a sus lemas antiguos; el resultado da una tabla por término y una concordancia conjunta. +palabra: obligatoria en el pasaje; -palabra: excluida."},
 sententiae:{label:"Sententiae",help:"Fraseario del mundo antiguo: sentencias célebres con referencia canónica, traducción, notas sintácticas y verificación en el corpus local."}
};

/* Selector junto al buscador sincronizado con la selección de cabecera. */
function syncSearchLanguageSelector(){
 const main=$("#lx-lang"),quick=$("#lx-lang-quick");
 if(main&&quick&&quick.value!==main.value)quick.value=main.value;
}
function renderTabs(){
 syncSearchLanguageSelector();
 const box=$("#lx-tabs");box.replaceChildren();
 for(const [k,m] of Object.entries(MODES)){const b=document.createElement("button");b.type="button";b.className="tab";b.dataset.mode=k;b.textContent=T(m.label);b.setAttribute("aria-pressed",String(S.mode===k));b.addEventListener("click",()=>{S.mode=k;renderTabs();if(S.q)run()});box.append(b)}
 const hi=S.ui==="en"?0:S.ui==="fr"?1:-1;$("#lx-mode-note").textContent=hi<0?MODES[S.mode].help:(MODE_I18N[S.mode]?.[hi]||MODES[S.mode].help);
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


/* ---------- Idioma de la interfaz (ES · EN · FR), compartido con el sitio ---------- */
const I18N={
 "Lema por contexto":["Lemma by context","Lemme selon le contexte"],"descartados":["ruled out","écartés"],
 "Elegido por el analizador Stanza según el contexto, entre los lemas posibles de la forma. Análisis automático: verifíquese en el pasaje.":["Chosen by the Stanza analyser from the context, among the possible lemmas of the form. Automatic analysis: check it in the passage.","Choisi par l'analyseur Stanza selon le contexte, parmi les lemmes possibles de la forme. Analyse automatique : à vérifier dans le passage."],
 "coincidencias descartadas: el análisis contextual (Stanza) asigna allí otro lema.":["matches ruled out: the contextual analysis (Stanza) assigns another lemma there.","occurrences écartées : l'analyse contextuelle (Stanza) y attribue un autre lemme."],
 "Mostrarlas también":["Show them too","Les afficher aussi"],"Aplicar el filtro contextual":["Apply the contextual filter","Appliquer le filtre contextuel"],"Se muestran todas las coincidencias de la tabla, sin el filtro contextual. ":["All table matches are shown, without the contextual filter. ","Toutes les occurrences de la table sont affichées, sans le filtre contextuel. "],
 "DOI de la edición":["Edition DOI","DOI de l'édition"],"DOI del proyecto":["Project DOI","DOI du projet"],
 "versión de datos":["data version","version des données"],"En":["In","Dans"],"ed.":["ed.","éd."],"consultado el":["accessed","consulté le"],"Consultado el":["Accessed","Consulté le"],"s. f.":["n.d.","s. d."],"editado por":["edited by","édité par"],
 "Este enlace se citó con la versión de datos":["This link was cited with data version","Ce lien a été cité avec la version de données"],"ahora se consulta la versión":["you are now viewing version","vous consultez maintenant la version"],"El texto del pasaje puede haber sido corregido desde entonces; el historial completo está en el repositorio.":["The passage may have been corrected since; the full history is in the repository.","Le passage a pu être corrigé depuis ; l'historique complet est dans le dépôt."],"Historial de cambios":["Change history","Historique des modifications"],
 "Citar":["Cite","Citer"],"Copiar":["Copy","Copier"],"Enlace estable":["Stable link","Lien stable"],"Cita con texto":["Quotation with text","Citation avec texte"],"La versión de datos identifica el estado exacto del corpus consultado; el conector de Zotero detecta además cada pasaje de la página (COinS).":["The data version identifies the exact state of the corpus consulted; the Zotero connector also detects each passage on the page (COinS).","La version des données identifie l'état exact du corpus consulté ; le connecteur Zotero détecte aussi chaque passage de la page (COinS)."],
 "Posibles fuentes y paralelos":["Possible sources and parallels","Sources et parallèles possibles"],"afinidad":["affinity","affinité"],
 "Afinidad léxica (coseno tf-idf entre lemas). Son candidatos para el estudio de fuentes y recepción: la coincidencia puede deberse al tema común y no a una relación textual.":["Lexical affinity (tf-idf cosine between lemmas). These are candidates for source and reception studies: the overlap may reflect a shared subject rather than a textual relationship.","Affinité lexicale (cosinus tf-idf entre lemmes). Ce sont des candidats pour l'étude des sources et de la réception : la coïncidence peut tenir au sujet commun et non à une relation textuelle."],
 "En Vitruvia":["In Vitruvia","Dans Vitruvia"],"Buscar en Vitruvia sin perder este lugar de lectura":["Search in Vitruvia without losing your place","Chercher dans Vitruvia sans perdre la page"],
 "sección":["section","section"],
 "Cita reconocida":["Citation recognised","Citation reconnue"],"El locus comprende":["The locus comprises","Le locus comprend"],"Mostrarlos todos":["Show them all","Les afficher tous"],
 "corregido":["corrected","corrigé"],
 "Grupo de palabras":["Word group","Groupe de mots"],"glosario":["glossary","glossaire"],"forma latina":["Latin form","forme latine"],"transliteración":["transliteration","translittération"],"Resolviendo el grupo de palabras…":["Resolving the word group…","Résolution du groupe de mots…"],
 "Término":["Term","Terme"],"Resolución":["Resolved via","Résolution"],"Lengua":["Language","Langue"],"Lema":["Lemma","Lemme"],"Pasajes":["Passages","Passages"],"Obras principales":["Main works","Œuvres principales"],"Concordancia conjunta":["Combined concordance","Concordance conjointe"],
 "Cada término se busca por lema (todas sus formas) en el corpus latino y griego; la concordancia conjunta reúne los pasajes donde aparece cualquiera de ellos.":["Each term is searched by lemma (all its forms) in the Latin and Greek corpora; the combined concordance gathers the passages where any of them occurs.","Chaque terme est cherché par lemme (toutes ses formes) dans les corpus latin et grec ; la concordance conjointe réunit les passages où l'un d'eux apparaît."],
 "Sin equivalente antiguo registrado ni forma atestiguada en el corpus. Pruebe con un sinónimo o con la palabra latina o griega.":["No ancient equivalent recorded and no attested form in the corpus. Try a synonym or the Latin or Greek word.","Aucun équivalent ancien enregistré ni forme attestée dans le corpus. Essayez un synonyme ou le mot latin ou grec."],
 "Ningún término del grupo tiene pasajes en el corpus local.":["No term of the group has passages in the local corpus.","Aucun terme du groupe n'a de passages dans le corpus local."],
 "Lema ambiguo":["Ambiguous lemma","Lemme ambigu"],"Lema verificado":["Verified lemma","Lemme vérifié"],"con lema ambiguo":["with ambiguous lemma","avec lemme ambigu"],
 "Lema verificado a mano en este pasaje":["Lemma verified by hand in this passage","Lemme vérifié à la main dans ce passage"],"La forma admite más de un lema; la tabla automática no decide por el contexto. Verifíquese en el pasaje.":["The form admits more than one lemma; the automatic table does not decide by context. Check it in the passage.","La forme admet plus d'un lemme ; la table automatique ne tranche pas selon le contexte. À vérifier dans le passage."],
 "Pasajes cuya forma hallada admite varios lemas en la tabla automática":["Passages whose matched form admits several lemmas in the automatic table","Passages dont la forme trouvée admet plusieurs lemmes dans la table automatique"],
 "Traducción inglesa · Perseus Digital Library (CC BY-SA 4.0)":["English translation · Perseus Digital Library (CC BY-SA 4.0)","Traduction anglaise · Perseus Digital Library (CC BY-SA 4.0)"],
 "alineación exacta por locus":["exact alignment by locus","alignement exact par locus"],"alineación por número de verso":["alignment by line number","alignement par numéro de vers"],"alineación por tramo de versos (aproximada)":["alignment by block of lines (approximate)","alignement par bloc de vers (approximatif)"],"alineación por capítulo (aproximada)":["alignment by chapter (approximate)","alignement par chapitre (approximatif)"],"alineación proporcional dentro del libro (orientativa)":["proportional alignment within the book (indicative only)","alignement proportionnel dans le livre (indicatif)"],
 "Resto del corpus":["Rest of the corpus","Reste du corpus"],"Elija dos obras distintas.":["Choose two different works.","Choisissez deux œuvres différentes."],"palabras":["words","mots"],"Sobrerrepresentadas en":["Overrepresented in","Surreprésentées dans"],
 "Entre paréntesis, frecuencia por 10 000 palabras. G² de Dunning: * p < 0,05 · ** p < 0,01 · *** p < 0,001 · **** p < 0,0001. log₂ ratio: tamaño del efecto (1 = el doble).":["In brackets, frequency per 10,000 words. Dunning's G²: * p < 0.05 · ** p < 0.01 · *** p < 0.001 · **** p < 0.0001. log₂ ratio: effect size (1 = twice as frequent).","Entre parenthèses, fréquence pour 10 000 mots. G² de Dunning : * p < 0,05 · ** p < 0,01 · *** p < 0,001 · **** p < 0,0001. log₂ ratio : taille de l'effet (1 = deux fois plus fréquent)."],
 "Comparatio: palabras clave de una obra":["Comparatio: keywords of a work","Comparatio : mots-clés d'une œuvre"],"Comparar":["Compare","Comparer"],
 "Traducción":["Translation","Traduction"],"Lupa":["Magnifier","Loupe"],"Resaltado":["Highlight","Surlignage"],"Herramientas de lectura":["Reading tools","Outils de lecture"],"Agranda la línea bajo el cursor":["Enlarges the line under the cursor","Agrandit la ligne sous le curseur"],
 "También en":["Also in","Aussi dans"],"obra":["work","œuvre"],"obras":["works","œuvres"],"pasaje":["passage","passage"],"pasajes":["passages","passages"],"Filtrar por esta obra":["Filter by this work","Filtrer par cette œuvre"],
 "Cargando traducción…":["Loading translation…","Chargement de la traduction…"],"No hay traducción disponible para este pasaje en el sitio.":["No translation of this passage is available on the site.","Aucune traduction de ce passage n'est disponible sur le site."],"No se pudo cargar la traducción":["The translation could not be loaded","La traduction n'a pas pu être chargée"],
 "Traducción inglesa · Perseus Digital Library (CC BY-SA 4.0) · alineación aproximada":["English translation · Perseus Digital Library (CC BY-SA 4.0) · approximate alignment","Traduction anglaise · Perseus Digital Library (CC BY-SA 4.0) · alignement approximatif"],
"← Buscador Vitruvia":["← Vitruvia search","← Recherche Vitruvia"],"Etymologicum":["Etymologicum","Etymologicum"],"Sententiae":["Sententiae","Sententiae"],"Taller ecdótico":["Textual-criticism workshop","Atelier d'ecdotique"],"Cuaderno exegético":["Exegetical notebook","Carnet exégétique"],"Instrumenta":["Instrumenta","Instrumenta"],"Método y fuentes":["Method and sources","Méthode et sources"],
"Buscador exclusivo de léxico, sintaxis y frases del mundo antiguo. Consulta palabras griegas y latinas —con su lema, morfología, acepciones y etimología, el latín arcaico y los equivalentes hebreos— y los pasajes de los autores antiguos donde se usan, con referencias canónicas verificables. Toda palabra latina, griega, castellana, inglesa, francesa o alemana recibe su árbol etimológico, y los personajes históricos se buscan por su nombre griego y latino.":["A search engine devoted to the vocabulary, syntax and phrases of the ancient world. Look up Greek and Latin words—with lemma, morphology, senses and etymology, Old Latin and Hebrew equivalents—and the passages of ancient authors where they occur, with verifiable canonical references. Every Latin, Greek, Spanish, English, French or German word gets its etymological tree, and historical figures are searched by their Greek and Latin names.","Moteur consacré au lexique, à la syntaxe et aux phrases du monde antique. Consultez les mots grecs et latins —lemme, morphologie, sens et étymologie, latin archaïque et équivalents hébreux— et les passages des auteurs anciens où ils apparaissent, avec des références canoniques vérifiables. Tout mot latin, grec, espagnol, anglais, français ou allemand reçoit son arbre étymologique, et les personnages historiques se cherchent par leur nom grec et latin."],
"Buscar ↗":["Search ↗","Rechercher ↗"],"Palabra":["Word","Mot"],"Lema y flexión":["Lemma and inflection","Lemme et flexion"],"Etimología":["Etymology","Étymologie"],"Frase exacta":["Exact phrase","Phrase exacte"],"Sintaxis":["Syntax","Syntaxe"],"Paralelos":["Parallels","Parallèles"],"Analizar frase":["Analyse sentence","Analyser la phrase"],
"Incluir todas las formas del lema":["Include all forms of the lemma","Inclure toutes les formes du lemme"],"Aproximación fonética y grafías (ae/e, ph/f, y/i; itacismo)":["Phonetic and spelling approximation (ae/e, ph/f, y/i; itacism)","Approximation phonétique et graphique (ae/e, ph/f, y/i ; iotacisme)"],
"Explorar":["Explore","Explorer"],"Campos":["Fields","Champs"],"Resultados":["Results","Résultats"],"Todas las obras":["All works","Toutes les œuvres"],"Orden del corpus":["Corpus order","Ordre du corpus"],"Orden cronológico":["Chronological order","Ordre chronologique"],
"Sintaxis de búsqueda":["Search syntax","Syntaxe de recherche"],"SENTENTIA DEL DÍA · FRASEARIO ANTIGUO":["SENTENTIA OF THE DAY · ANCIENT PHRASEBOOK","SENTENTIA DU JOUR · RECUEIL DE PHRASES ANTIQUES"],"Analizar la frase ›":["Analyse the sentence ›","Analyser la phrase ›"],
"Etymologicum · raíces, latín arcaico, hebreo":["Etymologicum · roots, Old Latin, Hebrew","Etymologicum · racines, latin archaïque, hébreu"],"Sententiae · fraseario del mundo antiguo":["Sententiae · phrasebook of the ancient world","Sententiae · phrases du monde antique"],"Taller ecdótico · colación y aparato":["Textual criticism · collation and apparatus","Ecdotique · collation et apparat"],"Cuaderno exegético · comentario lemático":["Exegetical notebook · lemmatic commentary","Carnet exégétique · commentaire lemmatique"],"Instrumenta · signos críticos y codicología":["Instrumenta · critical signs and codicology","Instrumenta · signes critiques et codicologie"],
"Índice de voces con ficha etimológica":["Index of words with an etymological entry","Index des mots avec fiche étymologique"],"Fraseario del mundo antiguo":["Phrasebook of the ancient world","Recueil de phrases du monde antique"],"Taller ecdótico: colación de testimonios y aparato crítico":["Workshop: collation of witnesses and critical apparatus","Atelier : collation des témoins et apparat critique"],"Signos críticos, abreviaturas, codicología y hermenéutica":["Critical signs, abbreviations, codicology and hermeneutics","Signes critiques, abréviations, codicologie et herméneutique"],"Método, sintaxis de búsqueda y fuentes":["Method, search syntax and sources","Méthode, syntaxe de recherche et sources"],
"Colacionar":["Collate","Collationner"],"Añadir testimonio":["Add witness","Ajouter un témoin"],"Cargar ejemplo vitruviano":["Load a Vitruvian example","Charger un exemple vitruvien"],"Añadir pasaje manualmente":["Add a passage manually","Ajouter un passage"],"Exportar Markdown":["Export Markdown","Exporter Markdown"],"Exportar JSON":["Export JSON","Exporter JSON"],"Exportar XML-TEI":["Export XML-TEI","Exporter XML-TEI"],
"Cerrar":["Close","Fermer"],"Pasaje de esta búsqueda":["Passage from this search","Passage de cette recherche"],"Abrir el lector en una pestaña":["Open the reader in a new tab","Ouvrir le lecteur dans un onglet"],
"Original y traducción en el lector clásico del sitio (Perseus Digital Library). Si el lector no encuentra el mismo locus, abre la obra al comienzo: el pasaje de esta búsqueda se muestra debajo.":["Original and translation in the site's classical reader (Perseus Digital Library). If the reader cannot find the same locus, it opens the work at the beginning; the passage from this search is shown below.","Original et traduction dans le lecteur classique du site (Perseus Digital Library). Si le lecteur ne trouve pas le même locus, il ouvre l'œuvre au début ; le passage de cette recherche figure ci-dessous."],
"Constructor de consultas · morfología y sintaxis sin escribir códigos":["Query builder · morphology and syntax without codes","Constructeur de requêtes · morphologie et syntaxe sans codes"],
"Fondo":["Background","Fond"],"Lengua: auto":["Language: auto","Langue : auto"],"Latín":["Latin","Latin"],"Griego":["Greek","Grec"],"Hebreo":["Hebrew","Hébreu"],"Castellano (etimología)":["Spanish (etymology)","Espagnol (étymologie)"],"Inglés (etimología)":["English (etymology)","Anglais (étymologie)"],"Francés (etimología)":["French (etymology)","Français (étymologie)"],"Alemán (etimología)":["German (etymology)","Allemand (étymologie)"]
};
const MODE_I18N={grupo:["Several words at once, in any language (Latin, Greek, Spanish, English, French, German): masonry mason builder · faber structor τέκτων. Each term is resolved to its ancient lemmas; you get a table per term and a combined concordance. +word: required in the passage; -word: excluded.","Plusieurs mots à la fois, dans n'importe quelle langue (latin, grec, espagnol, anglais, français, allemand) : maçon bâtisseur · faber structor τέκτων. Chaque terme est ramené à ses lemmes anciens ; on obtient un tableau par terme et une concordance conjointe. +mot : obligatoire ; -mot : exclu."],palabra:["Word entry: lemma, morphology, senses, etymology, attested forms, distribution by author and concordance. Accepts inflected forms, transliteration (anthropos → ἄνθρωπος), wildcards (aedi*) and approximation (~simetria).","Fiche lexicale : lemme, morphologie, sens, étymologie, formes attestées, distribution par auteur et concordance. Accepte formes fléchies, translittération (anthropos → ἄνθρωπος), jokers (aedi*) et approximation (~simetria)."],lema:["All inflected forms of a lemma: @domus, @λόγος.","Toutes les formes fléchies d'un lemme : @domus, @λόγος."],etimologia:["Etymology and etymological tree; PIE roots, Old Latin, Greek, Hebrew and loanwords.","Étymologie et arbre étymologique ; racines indo-européennes, latin archaïque, grec, hébreu et emprunts."],frase:["Exact phrases and formulas: \"firmitatis utilitatis venustatis\". A ..3 B (B up to three words after A); A NEAR/5 B (any order).","Phrases et formules exactes : « firmitatis utilitatis venustatis ». A ..3 B ; A NEAR/5 B (ordre libre)."],sintaxis:["Morphosyntactic patterns (Greek, automatic analysis): [mood=ptc case=gen] [case=gen]. Latin: lemmas and forms with distance (@facio ..2 @opus).","Motifs morphosyntaxiques (grec, analyse automatique) : [mood=ptc case=gen] [case=gen]. Latin : lemmes et formes avec distance (@facio ..2 @opus)."],paralelos:["Loci paralleli: passages sharing the most significant lemmas, weighted by rarity (TF-IDF).","Loci paralleli : passages partageant le plus de lemmes significatifs, pondérés par leur rareté (TF-IDF)."],analizar:["Word-by-word analysis: lemma, morphology, gloss and corpus frequency; interlinear view and TEI export.","Analyse mot à mot : lemme, morphologie, glose et fréquence ; vue interlinéaire et export TEI."],sententiae:["Ancient phrasebook: famous sentences with canonical reference, translation, syntax notes and corpus verification.","Recueil antique : sentences célèbres avec référence canonique, traduction, notes syntaxiques et vérification dans le corpus."]};
function T(es){const i=S.ui==="en"?0:S.ui==="fr"?1:-1;return i<0?es:(I18N[es]?.[i]??es)}
function applyUI(){
 for(const e of document.querySelectorAll("[data-i18n]")){if(!e.dataset.es)e.dataset.es=e.textContent.trim();e.textContent=T(e.dataset.es)}
 for(const e of document.querySelectorAll("#lx-lang option,#lx-work option[value=''],#lx-order option,#lx-tabs .tab,.lx-options label")){/* textos con nodos mixtos */
  const tn=[...e.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(!tn)continue;if(!e.dataset.es)e.dataset.es=tn.textContent.trim();tn.textContent=(e.matches(".lx-options label")?" ":"")+T(e.dataset.es)}
 document.documentElement.setAttribute("data-ui-lang",S.ui);
 renderTabs();
}

/* ---------- Ejecución ---------- */
async function run(push=true){
 syncSearchLanguageSelector();
 let q=$("#lx-q").value.trim();
 // Canonical Greek headword for the common Latin-letter transliteration.
 // Preserve normal Latin searches when the user explicitly selected Latin.
 if(["auto","grc"].includes(S.lang)&&/^logos$/i.test(q)&&["palabra","lema","etimologia"].includes(S.mode)){
  q="λόγος";$("#lx-q").value=q;S.lang="grc";$("#lx-lang").value="grc";
 }
 S.q=q;S.page=0;
 if(["palabra","lema"].includes(S.mode))window.dispatchEvent(new CustomEvent("vitruvia:lexicon-search",{detail:{query:q,mode:S.mode,language:S.lang}}));
 window.VitruviaEncyclopedia?.update(q.replace(/^[@~]/,""),{ancient:["palabra","lema","etimologia"].includes(S.mode)});
 renderOldestEvidence(q);
 const list=$("#lx-results");list.replaceChildren();$("#lx-entry").replaceChildren();$("#lx-entry").hidden=true;$("#lx-side-extra").replaceChildren();
 if(push){const u=new URL(location.href);u.searchParams.delete("qb");u.searchParams.delete("qb_lang");u.searchParams.delete("qb_filters");u.searchParams.set("q",q);u.searchParams.set("mode",S.mode);if(S.lang!=="auto")u.searchParams.set("lang",S.lang);else u.searchParams.delete("lang");if(S.work)u.searchParams.set("work",S.work);else u.searchParams.delete("work");try{history.replaceState(null,"",u)}catch{}}
 if(!q&&S.mode!=="sententiae"){setState("Escriba una palabra, una frase o un patrón.");return}
 try{
  if(["palabra","frase","grupo","lema"].includes(S.mode)&&!/["\[@*?~#=√]/.test(q)){const c=parseCitation(q);if(c)return openCitation(c,q)}
  if(S.mode==="grupo"||(S.mode==="palabra"&&/,/.test(q)&&!/["\[@*?~#=:√]/.test(q)))return renderGroupSearch(q);
  if(S.mode==="palabra"&&S.lang==="auto"&&/^[\p{L}' -]+$/u.test(q)&&q.split(/\s+/).length>=2&&!GREEK.test(q)&&!HEBREW.test(q)){const ws=q.split(/\s+/);const cs=await Promise.all(ws.map(findConcept));if(cs.filter(Boolean).length>=1&&ws.some((w,i)=>cs[i]&&Object.values(cs[i].modern).flat().some(m=>fold(m)===fold(w))))return renderGroupSearch(q)}
  if(/^(=|sem:)/i.test(q))return renderSemantic(q.replace(/^(=|sem:)\s*/i,""));
  if(/^#/.test(q))return renderTheme(q.slice(1));
  if(/^(pie|ie|ide):/i.test(q))return renderPIE(q.replace(/^[^:]+:\s*/,""));
  if(/^(concepto|concept|sentido):/i.test(q))return renderConcept(q.replace(/^[^:]+:\s*/,""));
  if(/^(√|raiz_he:|raíz_he:)/i.test(q))return renderHebrewRoot(q.replace(/^(√|raiz_he:|raíz_he:)\s*/i,""));
  /* Remisión ortográfica: eclesia/ekklesia no son lemas distintos de
     gr. ἐκκλησία y lat. ecclesia. Mantener la grafía consultada visible. */
  if(S.mode==="palabra"&&S.lang==="auto"&&["eclesia","ekklesia","ekklesía","ekklesia"].includes(fold(q))){
   const entry=(S.etym?.entries||[]).find(e=>e.id==="ecclesia"&&e.l==="grc");
   if(entry){
    const box=$("#lx-entry");box.hidden=false;
    box.append(el("header",{class:"lx-entry-head"},
     el("div",{class:"article-kicker"},"LEXICON · REMISIÓN ORTOGRÁFICA"),
     el("h2",{},"eclesia → ἐκκλησία / ecclesia"),
     el("p",{class:"article-byline"},"Grafía consultada: «"+q+"». Remite al griego ἐκκλησία (ekklēsía) y al préstamo latino ecclesia.")));
    box.append(etymCard(entry));
    const actions=el("div",{class:"actions"});
    for(const [label,word,langCode] of [
     ["Buscar ἐκκλησία en textos griegos","ἐκκλησία","grc"],
     ["Buscar ecclesia en textos latinos","ecclesia","la"],
     ["Examinar todas las formas del lema griego","@ἐκκλησία","grc"]
    ]){
     actions.append(el("button",{type:"button",class:"lx-btn",onclick:()=>{
      $("#lx-q").value=word;S.lang=langCode;$("#lx-lang").value=langCode;
      S.mode=word.startsWith("@")?"lema":"palabra";renderTabs();run();
     }},label));
    }
    box.append(actions);
    setState("Remisión eclesia: ficha editorial documentada de ἐκκλησία; consulte las concordancias griegas y latinas por separado. Una forma de consulta no implica ocurrencias literales.");
    return;
   }
  }
  if(S.mode==="sententiae")return renderSententiae(q);
  if(S.mode==="etimologia")return renderEtymSearch(q);
  if(["es","en","fr","de"].includes(S.lang))return renderModernWord(q,S.lang);
  if(S.mode==="analizar")return analyzeSentence(q);
  if(S.mode==="paralelos")return parallels(q);
  if(S.mode==="palabra"&&S.lang==="auto"&&!/[\s@"\[*?~#=:√]/.test(q)&&!GREEK.test(q)&&!HEBREW.test(q)){const c=await findConcept(q);if(c&&Object.values(c.modern).flat().some(m=>fold(m)===fold(q))){await renderModernWord(q,null);const b=el("p",{class:"lx-small"},el("button",{type:"button",class:"lx-btn",onclick:()=>{S.lang="la";$("#lx-lang").value="la";run()}},`Buscar «${q}» como palabra latina`)," ",el("button",{type:"button",class:"lx-btn",onclick:()=>{S.lang="grc";$("#lx-lang").value="grc";run()}},"como transliteración griega"));$("#lx-entry").append(b);return}}
  const l=resolveLang(q);
  if(l==="he")return renderHebrew(q);
  const D=await lang(l);S.D=D;fillWorks(D);if(l==="la")await loadContext();
   if(S.mode==="palabra"||S.mode==="lema"){const info=lemmaInfo(D,fold(q).replace(/^@/,""));if(info.g)window.VitruviaEncyclopedia?.update(q.replace(/^@/,""),{ancient:true,gloss:"Glosa histórica del índice latino (Lewis & Short): "+info.g.split(/;\s*/)[0]});}
  const parsed=parseQuery(q,S.mode);
  const opts={lemmatize:S.mode==="lema"||S.mode==="palabra"&&$("#lx-lemmatize").checked,variants:$("#lx-variants").checked,work:S.work,defaultGap:S.mode==="frase"?0:6};
  if(S.mode==="lema")parsed.steps.forEach(s=>{if(s.term.type==="form")s.term={type:"lemma",v:s.term.v,fallback:true}});
  let res=execute(D,parsed,opts);
  if(S.mode==="lema"&&!res.hits.length){/* el usuario escribió una forma: se resuelve su lema */parsed.steps.forEach(s=>{if(s.term.fallback)s.term={type:"form",v:s.term.v}});res=execute(D,parsed,{...opts,lemmatize:true})}
  if(!res.hits.length&&l==="la"&&S.lang==="auto"&&!/[\[@"]/.test(q)){const G=await lang("grc");const r2=execute(G,parseQuery(q,S.mode),opts);if(r2.hits.length){S.D=G;fillWorks(G);res=r2}}
  /* Búsqueda por lema en latín: se descartan las coincidencias en las que el análisis contextual eligió otro lema. */
  let ctxDropped=0;
  if(S.D.l==="la"&&parsed.steps.length===1&&parsed.steps[0].term.type==="lemma"){await loadContext();const want=fold(lemmaDisplay(parsed.steps[0].term.v)).replace(/^@/,"");
   if(!S.ctxAll){const kept=[];for(const h of res.hits){const p=S.D.corpus.passages[h.i];const c=ctxLemma(S.D,p,h.spans[0][0]);if(c&&fold(lemmaDisplay(c))!==want){ctxDropped++;continue}kept.push(h)}if(ctxDropped)res={...res,hits:kept}}}
  S.allHits=S.work?execute(S.D,parsed,{...opts,work:""}).hits:res.hits;
 S.result={...res,parsed};
  if(S.D.l==="la"&&S.lang==="auto"&&S.mode==="palabra"&&parsed.steps.length===1&&parsed.steps[0].term.type==="form"&&res.hits.length&&res.hits.length<25)setTimeout(async()=>{const G=await lang("grc",true);const g=transIndex(G).get(latinTranslitKey(q));if(g?.length){const lems=[...new Set(g.flatMap(k=>analyses(G,k).map(a=>lemmaDisplay(a[0]))))].slice(0,3);const st=$("#lx-state");st.append(" ",el("button",{type:"button",class:"lx-btn",lang:"grc",onclick:()=>{$("#lx-q").value=lems[0]||g[0];S.lang="grc";$("#lx-lang").value="grc";run()}},`¿Griego? ${(lems.length?lems:g.slice(0,3)).join(", ")}`))}},0);
  if(S.mode==="palabra"&&parsed.steps.length===1&&parsed.steps[0].term.type!=="pattern")await renderEntry(S.D,parsed.steps[0].term,res);
  if(S.mode==="palabra"&&res.hits.length&&parsed.steps.length===1&&parsed.steps[0].term.type==="form"){const qq=q;findConcept(q).then(c=>{if(!c||$("#lx-q").value.trim()!==qq)return;const body=$("#lx-entry .article-body");if(body)body.prepend(conceptCard(c,qq))})}
  if(S.mode==="palabra"&&res.hits.length&&parsed.steps.length===1&&parsed.steps[0].term.type==="form"&&!GREEK.test(q)){const qq=q;findPerson(q).then(P=>{if(!P||$("#lx-q").value.trim()!==qq)return;const b=el("p",{class:"lx-person-banner"},"¿Buscaba al personaje ",el("b",{},P.name),"? ",P.greek[0]?el("span",{lang:"grc"},P.greek[0]+" · "):"",P.latin[0]||"",". ",el("button",{type:"button",class:"lx-btn",onclick:()=>renderPerson(P,qq)},"Ver sus pasajes en griego y latín"));$("#lx-entry").prepend(b)}).catch(()=>{})}
  if(S.mode==="sintaxis")renderCollocations(S.D,res);
  renderHits(S.D,res);
  if(ctxDropped||S.ctxAll){const b=el("p",{class:"lx-small lx-ctx-note"},S.ctxAll?T("Se muestran todas las coincidencias de la tabla, sin el filtro contextual. "):`${ctxDropped} ${T("coincidencias descartadas: el análisis contextual (Stanza) asigna allí otro lema.")} `,el("button",{type:"button",class:"lx-btn",onclick:()=>{S.ctxAll=!S.ctxAll;run(false)}},S.ctxAll?T("Aplicar el filtro contextual"):T("Mostrarlas también")));$("#lx-results").prepend(b)}
  if(S.mode==="palabra"&&!res.hits.length&&parsed.steps.length===1&&parsed.steps[0].term.type==="form"&&!/^\*/.test(q)){const P=await findPerson(q);if(P){await renderPerson(P,q);return}}
  if(S.mode==="palabra"&&!res.hits.length&&parsed.steps.length===1&&parsed.steps[0].term.type==="form"){const box=$("#lx-entry");box.hidden=false;box.replaceChildren(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · ETYMOLOGIA"),el("h2",{},q),el("p",{class:"article-byline"},"Sin pasajes en el corpus antiguo local: se ofrecen su etimología y su raíz semántica antigua.")));const cc=await findConcept(q);if(cc)box.append(conceptCard(cc,q));renderEtymTree(q,null,box)}
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
 {const amb=ambiguityCount(D,hits);if(amb)$("#lx-state").append(" ",el("span",{class:"lx-small",title:T("Pasajes cuya forma hallada admite varios lemas en la tabla automática")},`· ${amb.toLocaleString("es")} ${T("con lema ambiguo")} (${Math.round(amb/Math.min(hits.length,3000)*100)} %)`))}
 list.append(readingToolbar());
 const page=hits.slice(S.page*PAGE_SIZE,(S.page+1)*PAGE_SIZE);
 for(const h of page)list.append(hitCard(D,h));
 if(hits.length>(S.page+1)*PAGE_SIZE){list.append(el("button",{type:"button",class:"lx-more",onclick:e=>{e.target.remove();S.page++;const more=hits.slice(S.page*PAGE_SIZE,(S.page+1)*PAGE_SIZE);for(const h of more)list.append(hitCard(D,h));if(hits.length>(S.page+1)*PAGE_SIZE)list.append(e.target)}},`Mostrar ${PAGE_SIZE} más`))}
 renderExports(D,hits);
}
/* La fecha de composición, la datación del testimonio y la edición moderna
   corresponden a entidades bibliográficas diferentes. Nunca datar V514 como antigua. */
const VITRUVIUS_ORIGINAL_DATE="siglo I a. C. · c. 27–22 a. C.";
const VITRUVIUS_OLDEST_WITNESS={
 label:"Harley MS 2767 · testimonio manuscrito conservado más antiguo conocido",
 dating:"primer cuarto del siglo IX (800–824)",
 repository:"British Library, Londres",
 url:"https://searcharchives.bl.uk/catalog/040-002048598",
 viewer:"codex-h-folios-local.html"
};
function vitruviusWitnessLine(){
 const section=el("div",{class:"lx-vitruvius-witness"});
 section.append(el("p",{class:"lx-small"},
  "Vitruvio, De architectura · diez libros · composición: "+VITRUVIUS_ORIGINAL_DATE+"."),
  el("p",{class:"lx-small"},
   "Testimonio conservado más antiguo conocido: ",el("a",{href:VITRUVIUS_OLDEST_WITNESS.url,target:"_blank",rel:"noopener noreferrer"},
    VITRUVIUS_OLDEST_WITNESS.label)," · "+VITRUVIUS_OLDEST_WITNESS.dating+" · "+VITRUVIUS_OLDEST_WITNESS.repository+". ",
   el("a",{href:VITRUVIUS_OLDEST_WITNESS.viewer},"Consultar folios digitalizados")),
  el("p",{class:"lx-small"},
   "Texto digital y traducciones: ediciones modernas de Diego A. Kurilo (V514 · castellano; V554 · francés; V297 · inglés). Las fechas de estas ediciones no corresponden a la composición de la obra antigua."));
 return section;
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
 {const amb=ambiguity(D,text,h.spans,p);if(amb)card.append(amb)}
 const trBox=el("div",{class:"lx-hit-tr",hidden:!READ.tr});card.append(trBox);card._tr=()=>fillTranslation(D,p,trBox);if(READ.tr)card._tr();
 const also=alsoIn(D,p);if(also)card.append(also);
 if(p[0]==="vitruvius"){card.append(vitruviusWitnessLine())}
 if(p[0]==="vitruvius"&&D.l==="la"){const par=paralleliBox(D,p);if(par)card.append(par)}
 const actions=el("div",{class:"actions"});
 actions.append(el("button",{type:"button",onclick:()=>{full.hidden=!full.hidden;if(!full.childNodes.length){const t=el("p",{class:"lx-passage",lang:D.l});t.append(linkWords(text,h.spans));full.append(t);if(p[4])full.append(el("p",{class:"lx-tr"},el("b",{},"Traducción (Kurilo, V514): "),p[4]));full.append(el("p",{class:"lx-src"},w.edition||""," ",w.license?"· "+w.license:""))}}},"Pasaje completo"));
 actions.append(el("button",{type:"button",class:"lx-primary",onclick:()=>openViewer(D,p,h.spans,S.q)},p[0]==="vitruvius"?"Leer con traducción (ES · FR · EN)":"Leer con traducción"));
 const rl=readerLink(D,p);if(rl)actions.append(el("a",{href:rl},"Leer en el visor"));
 if(p[0]==="vitruvius")actions.append(el("button",{type:"button",onclick:e=>showApparatus(p[1],full,e.target)},"Aparato y colación"));
 actions.append(el("button",{type:"button",onclick:()=>{$("#lx-q").value=text.slice(k.a,k.b).replace(/\s+/g," ").slice(0,400);S.mode="paralelos";renderTabs();run()}},"Paralelos"));
 actions.append(el("button",{type:"button",onclick:()=>addToNotebook({cite,text,lang:D.l,tr:p[4]||""})},"Al cuaderno exegético"));
 actions.append(el("button",{type:"button",onclick:e=>{const u=new URL(PAGE);u.searchParams.set("work",p[0]);u.searchParams.set("locus",p[1]);if(S.q)u.searchParams.set("q",S.q);copy(u.toString(),e.target)}},"Enlace al locus"));
 actions.append(el("a",{href:`vitruvia.html?q=${encodeURIComponent((S.q||"").replace(/^[@=#√]|["\[\]]/g,"").trim()||text.slice(h.spans[0][0],h.spans[0][1]))}`,target:"_blank",rel:"noopener",title:T("Buscar en Vitruvia sin perder este lugar de lectura")},T("En Vitruvia")+" ↗"));
 actions.append(citeMenu(D,p,cite,text.slice(k.a,k.b)));
 card.append(coins(D,p));
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
 const box=$("#lx-side-extra");const by={};for(const h of hits){const id=D.corpus.passages[h.i][0];(by[id]=by[id]||[]).push(h)}
 const ids=Object.keys(by).sort((a,b)=>(CHRONO[a]??0)-(CHRONO[b]??0));if(!ids.length)return;
 const max=Math.max(...ids.map(id=>by[id].length));
 const sec=el("section",{class:"lx-side-block"},el("h3",{},"Distribución diacrónica"),el("p",{class:"lx-small"},"Coincidencias por obra en orden cronológico aproximado: valor absoluto, frecuencia por 10 000 palabras con su intervalo de confianza del 95 % (Wilson), dispersión a lo largo de la obra y DP de Gries por libro (0 = repartida de modo uniforme; 1 = concentrada)."));
 if(ids.includes("vitruvius"))sec.append(vitruviusWitnessLine());
 for(const id of ids){const w=work(D,id);const tot=D.workTokens[id]||1;const k=by[id].length;const [lo,hi]=wilson(k,tot);
  const st=workStats(D,id);const strip=el("span",{class:"lx-disp",title:"Posición de cada coincidencia en la obra"});
  for(const h of by[id].slice(0,400)){const x=(st.offset[h.i]??0)/st.total;strip.append(el("i",{style:`left:${(x*100).toFixed(2)}%`}))}
  const dp=griesDP(D,st,by[id]);
  sec.append(el("button",{type:"button",class:"lx-bar",title:`Filtrar: ${w.author}, ${w.title}`,onclick:()=>{S.work=id;$("#lx-work").value=id;run()}},el("span",{class:"lx-bar-label"},`${w.author} · ${w.title}`,el("small",{}," ",DATING[id]||"")),el("span",{class:"lx-bar-track"},el("span",{class:"lx-bar-fill",style:`width:${Math.max(3,k/max*100)}%`})),el("span",{class:"lx-bar-n"},String(k),el("small",{}," · ",(k/tot*10000).toFixed(1)," por 10 000 (IC 95 %: ",(lo*10000).toFixed(1),"–",(hi*10000).toFixed(1),")",dp!=null?` · DP ${dp.toFixed(2)}`:"")),strip))}
 box.prepend(sec);
}
/* ---------- Estadística léxica ---------- */
function wilson(k,n,z=1.96){if(!n)return[0,0];const p=k/n,d=1+z*z/n,c=p+z*z/(2*n),m=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return[Math.max(0,(c-m)/d),(c+m)/d]}
function logLik(a,b,c,d){/* a: frec. en el corpus 1 (tamaño c); b: frec. en el corpus 2 (tamaño d) */const E1=c*(a+b)/(c+d),E2=d*(a+b)/(c+d);let g=0;if(a>0)g+=a*Math.log(a/E1);if(b>0)g+=b*Math.log(b/E2);return 2*g}
/* Posición acumulada de cada pasaje en su obra y tamaño de cada libro (primer segmento del locus). */
function workStats(D,id){
 D._ws=D._ws||{};if(D._ws[id])return D._ws[id];
 const offset={},books={};let total=0;
 D.corpus.passages.forEach((p,i)=>{if(p[0]!==id)return;offset[i]=total;let n=0;for(const _ of p[2].matchAll(TOKEN))n++;total+=n;const b=String(p[1]).split(".")[0];books[b]=(books[b]||0)+n});
 return D._ws[id]={offset,books,total:Math.max(total,1)};
}
function griesDP(D,st,hs){const parts=Object.keys(st.books);if(parts.length<2||hs.length<2)return null;const obs={};for(const h of hs){const b=String(D.corpus.passages[h.i][1]).split(".")[0];obs[b]=(obs[b]||0)+1}return .5*parts.reduce((a,b)=>a+Math.abs((obs[b]||0)/hs.length-st.books[b]/st.total),0)}
/* Comparación de dos obras o de una obra frente al resto del corpus (palabras clave, keyness). */
async function renderComparatio(){
 const box=$("#comp-out");if(!box)return;const l=$("#comp-lang").value;const D=await lang(l,true);
 const sa=$("#comp-a"),sb=$("#comp-b");
 if(sa.dataset.l!==l){const opts=Object.entries(D.corpus.works).sort((a,b)=>(CHRONO[a[0]]??0)-(CHRONO[b[0]]??0));sa.replaceChildren(...opts.map(([id,w])=>el("option",{value:id},`${w.author} · ${w.title}`)));sb.replaceChildren(el("option",{value:""},T("Resto del corpus")),...opts.map(([id,w])=>el("option",{value:id},`${w.author} · ${w.title}`)));sa.dataset.l=l;if(l==="la")sa.value="vitruvius";if(l==="grc")sa.value="euclid-elements"}
 const A=sa.value,B=sb.value;if(!A||A===B){box.replaceChildren(el("p",{class:"lx-small"},T("Elija dos obras distintas.")));return}
 const lem=$("#comp-lemma").checked;const c1=new Map(),c2=new Map();let n1=0,n2=0;const stop=STOP[l];
 const keyOf=k=>lem?(analyses(D,k)[0]?.[0]||k):k;
 for(const [k,wf] of D.workFreq){if(stop.has(k)||k.length<3)continue;for(const [id,n] of Object.entries(wf)){if(id===A){c1.set(keyOf(k),(c1.get(keyOf(k))||0)+n)}else if(!B||id===B){c2.set(keyOf(k),(c2.get(keyOf(k))||0)+n)}}}
 n1=D.workTokens[A]||1;n2=B?(D.workTokens[B]||1):Object.entries(D.workTokens).reduce((a,[id,n])=>id===A?a:a+n,0);
 const rows=[];for(const [k,a] of c1){const b=c2.get(k)||0;if(a<3)continue;const g=logLik(a,b,n1,n2);if(a/n1>b/n2)rows.push([k,a,b,g,Math.log2(((a+.5)/n1)/((b+.5)/n2))])}
 const neg=[];for(const [k,b] of c2){const a=c1.get(k)||0;if(b<3)continue;const g=logLik(a,b,n1,n2);if(b/n2>a/n1)neg.push([k,a,b,g,Math.log2(((a+.5)/n1)/((b+.5)/n2))])}
 rows.sort((x,y)=>y[3]-x[3]);neg.sort((x,y)=>y[3]-x[3]);
 const wa=work(D,A),wb=B?work(D,B):{author:T("Resto del corpus"),title:""};
 const table=(rs,title)=>{const t=el("table",{class:"lx-table"},el("caption",{},title),el("thead",{},el("tr",{},...["",lem?"Lema":"Forma",`${wa.author}`,`${wb.author}`,"G²","log₂ ratio"].map(h=>el("th",{},h)))));const tb=el("tbody",{});rs.slice(0,30).forEach((r,i)=>tb.append(el("tr",{},el("td",{},String(i+1)),el("td",{},el("button",{type:"button",class:"lx-formlink",lang:l,onclick:()=>{$("#lx-q").value=lem?"@"+lemmaDisplay(r[0]):r[0];S.lang=l;$("#lx-lang").value=l;S.work=A;S.mode="palabra";renderTabs();run();$("#results")?.scrollIntoView({behavior:"smooth"})}},lem?lemmaDisplay(r[0]):r[0])),el("td",{},`${r[1]} (${(r[1]/n1*10000).toFixed(1)})`),el("td",{},`${r[2]} (${(r[2]/n2*10000).toFixed(1)})`),el("td",{},r[3].toFixed(1)+(r[3]>=15.13?" ****":r[3]>=10.83?" ***":r[3]>=6.63?" **":r[3]>=3.84?" *":"")),el("td",{},r[4].toFixed(2)))));t.append(tb);return t};
 box.replaceChildren(el("p",{class:"lx-small"},`${wa.author}, ${wa.title}: ${n1.toLocaleString("es")} ${T("palabras")} · ${wb.author}${wb.title?", "+wb.title:""}: ${n2.toLocaleString("es")} ${T("palabras")}. ${T("Entre paréntesis, frecuencia por 10 000 palabras. G² de Dunning: * p < 0,05 · ** p < 0,01 · *** p < 0,001 · **** p < 0,0001. log₂ ratio: tamaño del efecto (1 = el doble).")}`),
  table(rows,`${T("Sobrerrepresentadas en")} ${wa.author}, ${wa.title}`),table(neg,`${T("Sobrerrepresentadas en")} ${wb.author}${wb.title?", "+wb.title:""}`));
}
/* ---------- Ficha léxica ---------- */
/* Atestiguaciones entre lenguas. Fecha del autor ≠ fecha del soporte.
   Una equivalencia semántica no demuestra cognación etimológica. */
function earliestLexicalHit(D,words){
 const forms=new Set();
 for(const w of words)for(const f of lemmaFormsFor(D,w))forms.add(f);
 let best=null;
 for(const form of forms)for(const i of D.post.get(form)||[]){
  const p=D.corpus.passages[i],date=CHRONO[p[0]];
  if(!Number.isFinite(date))continue;
  if(!best||date<best.date||(date===best.date&&i<best.i))best={D,p,i,date,forms};
 }
 if(!best)return null;
 best.at=0;best.match="";
 for(const m of best.p[2].matchAll(TOKEN))
  if(forms.has(fold(m[0]).replace(/'+$/,""))){best.at=m.index;best.match=m[0];break}
 return best;
}
function renderComparativeAttestations(aside,term,D){
 const q=String(term||"").trim();
 if(!/^[\p{L}\p{M}'’-]{2,60}$/u.test(q))return;
 const root=el("section",{class:"lx-attestations","aria-label":"Primeras coincidencias grecolatinas y testimonios físicos"});
 const region=el("div",{class:"lx-attestation-results","aria-live":"polite"},el("p",{class:"lx-small"},"Consultando los pasajes griegos y latinos…"));
 root.append(el("h3",{},"Primeros pasajes en griego y latín"),
  el("p",{class:"lx-small"},"Fechas aproximadas de composición de las obras, no fechas de los papiros o códices conservados."),region);
 const material=el("div",{class:"lx-attestation-material"},el("h3",{},"Objeto o manuscrito más antiguo"),
  el("p",{class:"lx-small"},"Sin testimonio físico de esta voz cotejado aún. Para identificarlo se requieren signatura, folio o línea, lectura comprobada y fecha del objeto."));
 root.append(material);aside.append(root);
 const sought=q;
 (async()=>{
  const concept=await findConcept(q);
  const refs=concept?{la:concept.la||[],grc:concept.grc||[]}:
   {la:D.l==="la"?[q]:[],grc:D.l==="grc"?[q]:[]};
  // Evitar descargar y analizar la otra lengua cuando no existe equivalencia verificada.
  const [latin,greek]=await Promise.all([
   refs.la.length?lang("la",true):Promise.resolve(null),
   refs.grc.length?lang("grc",true):Promise.resolve(null)
  ]);
  const rows=[latin?earliestLexicalHit(latin,refs.la):null,greek?earliestLexicalHit(greek,refs.grc):null]
   .filter(Boolean).sort((a,b)=>a.date-b.date||a.i-b.i);
  if(!root.isConnected||String(S.q||"").trim()!==sought)return;
  region.replaceChildren();
  if(concept)region.append(el("p",{class:"lx-small"},
   "Equivalentes semánticos registrados: latín "+refs.la.join(" · ")+"; griego "+refs.grc.join(" · ")+". No implica parentesco lingüístico."));
  else region.append(el("p",{class:"lx-small"},
   "No hay equivalencias entre ambas lenguas registradas para esta voz. Se muestra solamente la búsqueda directa."));
  if(!rows.length)region.append(el("p",{class:"lx-small"},"No hay ocurrencias verificables en los índices cronológicos locales."));
  for(const x of rows){
   const langName=x.D.l==="grc"?"Griego":"Latín",w=work(x.D,x.p[0]),end=x.at+x.match.length;
   const cite=citeOf(x.D,x.p,x.at);
   region.append(el("div",{class:"lx-attestation-row"},
    el("p",{class:"lx-small"},el("b",{},langName+" · "),el("span",{lang:x.D.l},x.match),
     " · "+cite+" · "+w.author+" · "+(DATING[x.p[0]]||"fecha no especificada")),
    el("button",{type:"button",class:"lx-btn",onclick:()=>openViewer(x.D,x.p,[[x.at,end]],x.match)},
     "Ver pasaje y traducción")));
  }
  for(const l of ["grc","la"]){
   if(rows.some(x=>x.D.l===l))continue;
   const name=l==="grc"?"Griego":"Latín";
   region.append(el("p",{class:"lx-small"},name+": "+(refs[l].length?
    "sin coincidencias en las obras indexadas para los equivalentes registrados.":
    "no hay equivalente seguro en el glosario.")));
  }
  const lookup=(S.phil?.escrituras?.lookup||[]).find(e=>(e.queries||[]).some(t=>fold(t)===fold(q)));
  const verified=(lookup?.materialAttestations||[]).filter(w=>
   w.shelfmark&&w.locus&&w.reading&&w.dating&&/^https:\/\//.test(w.sourceUrl||""));
  if(verified.length){
   material.replaceChildren(el("h3",{},"Testimonios físicos comprobados"));
   for(const w of verified)material.append(el("p",{class:"lx-small"},
    el("b",{},w.shelfmark+" · "+w.locus)," · "+w.reading+" · "+w.dating+" · ",
    el("a",{href:w.sourceUrl,target:"_blank",rel:"noopener noreferrer"},"Registro de la institución")));
   material.append(el("p",{class:"lx-small"},"La fecha del objeto se distingue de la composición literaria."));
  }
 })().catch(e=>{
  if(root.isConnected&&String(S.q||"").trim()===sought)
   region.replaceChildren(el("p",{class:"lx-small"},"La comparación no pudo completarse: "+e.message));
 });
}

/* Editorially grounded word-formation and syntactic example for λόγος.
 * Do not present historical derivation as a syntactic parse; the two trees are distinct.
 * The syntactic example is Jn 1:1 (already attested in the editorial Etymologicum).
 */
function renderLogosGrammar(){
 const sec=el("section",{class:"lx-logos-grammar",lang:"grc"},
  el("h3",{},"λόγος · árboles lingüísticos"),
  el("p",{class:"article-note"},"Análisis editorial de la forma y ejemplo sintáctico atestiguado. No equivale a un análisis automático certificado de todos los pasajes."));
 const morph=el("div",{class:"lx-tree",style:"margin:12px 0"},
  el("h4",{},"Árbol de formación de palabra"),
  el("ol",{class:"lx-tree-list"},
   el("li",{},el("b",{},"*leǵ-")," · raíz indoeuropea reconstruida: reunir, recoger"),
   el("li",{},el("b",{},"λέγω")," · verbo griego: reunir, decir"),
   el("li",{},el("b",{},"λόγ- + -ος")," · base nominal y terminación del nominativo singular masculino"),
   el("li",{},el("b",{},"λόγος, -ου, ὁ")," · sustantivo masculino de segunda declinación")));
 const syntax=el("div",{class:"lx-tree",style:"margin:12px 0"},
  el("h4",{},"Árbol sintáctico · Juan 1:1"),
  el("p",{},"Ἐν ἀρχῇ ἦν ὁ λόγος"),
  el("ol",{class:"lx-tree-list"},
   el("li",{},"Oración",el("ul",{},
    el("li",{},"Complemento preposicional: ἐν ἀρχῇ (ἐν + dativo)"),
    el("li",{},"Predicado verbal: ἦν (imperfecto de εἰμί)"),
    el("li",{},"Sujeto, sintagma nominal: ὁ λόγος",el("ul",{},
     el("li",{},"ὁ · artículo masculino, nominativo singular"),
     el("li",{},"λόγος · núcleo nominal, nominativo singular")))))));
 sec.append(morph,syntax,
  el("p",{class:"article-note"},"Etimología: Etymologicum editorial, ficha logos; referencia sintáctica: prólogo del Evangelio de Juan (Jn 1:1)."));
 return sec;
}
/* Frecuencia morfológica complementaria: siempre desglosar por obra de la
   lengua consultada, independientemente de la búsqueda literal de Bibliotheca.
   No contar OCR o traducciones como testimonios manuscritos. */
function morphologyFrequency(D,term,lemmas){
 const root=fold(term.v||"").replace(/^@/,"");
 const unique=[...new Set(lemmas.map(x=>lemmaDisplay(x)))];
 const per=unique.map(w=>({w,forms:lemmaFormsFor(D,w)}));
 if(!per.length)per.push({w:term.v,forms:new Set(D.workFreq.has(root)?[root]:[])});
 const distinctForms=new Set(per.flatMap(p=>[...p.forms]));
 const rows=[];
 for(const id of Object.keys(D.corpus.works)){
  const counts=per.map(x=>[...x.forms].reduce((sum,f)=>sum+(D.workFreq.get(f)?.[id]||0),0));
  const total=[...distinctForms].reduce((sum,f)=>sum+(D.workFreq.get(f)?.[id]||0),0);
  if(!total)continue;
  rows.push({D,id,lang:D.l,lemmas:per,counts,total,per10k:total/(D.workTokens[id]||1)*10000});
 }
 rows.sort((a,b)=>(CHRONO[a.id]??0)-(CHRONO[b.id]??0));
 const section=frequencyTable(null,{rows,trN:0});
 section.insertBefore(el("p",{class:"article-note"},
  "Frecuencia morfológica en la lengua consultada: se suman las formas documentadas de cada lema en el índice. Si hay lemas ambiguos, una misma forma puede pertenecer a más de uno; el total por obra deduplica las formas. La búsqueda literal en Bibliotheca se presenta por separado."),section.querySelector("table")||section.lastChild);
 return section;
}
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
 if(D.l==="grc"){const g=numericLine(lemmas[0]?lemmaDisplay(lemmas[0]):term.v);if(g)head.append(g)}
 box.append(head);
 const grid=el("div",{class:"article-grid"});const body=el("div",{class:"article-body"});const aside=el("aside",{class:"article-aside"});grid.append(body,aside);box.append(grid);
 if(D.l==="grc"&&(fold(term.v)==="λογοσ"||lemmas.some(l=>fold(lemmaDisplay(l))==="λογοσ")))body.append(renderLogosGrammar());
 /* Desambiguación interactiva: una forma, varios lemas posibles. */
 if(lemmas.length>1){const ch=el("div",{class:"lx-disamb"},el("p",{},el("b",{},`«${term.v}» corresponde a ${lemmas.length} lemas posibles`)," en la lematización automática, que no desambigua por el contexto. Elija cuál desea rastrear (todas sus formas):"));const a=el("div",{class:"actions"});
  lemmas.forEach(lem=>{const info=lemmaInfo(D,lem);a.append(el("button",{type:"button",lang:D.l,onclick:()=>{$("#lx-q").value="@"+lem;S.mode="lema";renderTabs();run()}},`${lemmaDisplay(lem)}${info.h?" · "+info.h:""}${info.g?" — "+info.g.split(/;\s*/)[0]:""}`))});ch.append(a);body.append(ch)}
 /* Sugerencia interlingüística desde el Etymologicum. */
 {const eq=findCurated(lemmas.concat([term.v]));if(eq&&((eq.gr||[]).length||(eq.he||[]).length)){const sg=el("p",{class:"lx-person-banner"},"Equivalentes registrados: ");(eq.l==="la"?(eq.gr||[]):(eq.la||[])).slice(0,3).forEach(x=>sg.append(el("span",{lang:eq.l==="la"?"grc":"la"},x.w)," · "));(eq.he||[]).slice(0,2).forEach(x=>sg.append(el("span",{lang:"he"},x.w)," · "));sg.append(el("button",{type:"button",class:"lx-btn",onclick:()=>{$("#lx-q").value="="+eq.lemma;run()}},`Incluir griego, latín y hebreo (=${eq.lemma})`));body.append(sg)}}
 /* Lema y morfología */
 for(const lem of lemmas.slice(0,4)){
  const info=lemmaInfo(D,lem);const forms=[...(D.lemmaForms.get(lem)||[])].filter(f=>D.freq.has(f)).sort((a,b)=>D.freq.get(b)-D.freq.get(a));
  const tags=an.filter(a=>a[0]===lem&&typeof a[1]==="string").map(a=>decodeTag(a[1])).filter(Boolean);
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
 /* La búsqueda morfológica aparece también sin ficha de Conceptus (p. ej. loci).
    Si Conceptus sí existe, su tabla multilingüe ya ofrece esta frecuencia. */
 if(!await findConcept(term.v)){
  body.append(morphologyFrequency(D,term,lemmas));
 }
 /* Etimología en línea */
 renderEtymTree(lemmas[0]?lemmaDisplay(lemmas[0]):term.v,D.l,body);
 /* Aside: frecuencia, colocaciones, exportación */
 const total=lemmas.reduce((a,lem)=>a+[...(D.lemmaForms.get(lem)||[])].reduce((s,f)=>s+(D.freq.get(f)||0),0),0);
 renderComparativeAttestations(aside,term.v,D);
 aside.append(el("h3",{},"Datos del corpus"),el("p",{},`Ocurrencias de la forma: ${(D.freq.get(key)||0).toLocaleString("es")}`),el("p",{},`Ocurrencias del lema: ${total.toLocaleString("es")}`),el("p",{},`Frecuencia relativa: ${(total/D.tokens*10000).toFixed(2)} por 10 000 palabras`));
 if(res.hits.length){aside.append(el("h3",{},"Colocaciones"));aside.append(collocationList(D,res.hits,4,12))}
 const entry={lemma:lemmas.map(lemmaDisplay),form:term.v,lang:D.l,headword:lemmas.map(l=>lemmaInfo(D,l).h||"").filter(Boolean),senses:lemmas.map(l=>(lemmaInfo(D,l).g||"").split(/;\s*/).filter(Boolean)),morphology:an.filter(a=>typeof a[1]==="string").map(a=>({lemma:lemmaDisplay(a[0]),tag:a[1],analysis:decodeTag(a[1])})),etymology:curated||null,frequency:{form:D.freq.get(key)||0,lemma:total,corpusTokens:D.tokens},citations:res.hits.slice(0,50).map(h=>{const p=D.corpus.passages[h.i];return{cite:citeOf(D,p,h.spans[0][0]),author:work(D,p[0]).author,work:work(D,p[0]).title,text:p[2].slice(kwic(p[2],h.spans).a,kwic(p[2],h.spans).b)}}),source:D.forms.sources,url:PAGE+"?q="+encodeURIComponent(term.v)};
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
 if(e.editorial_status)sec.append(el("p",{class:"article-note"},"Estado de la ficha: "+e.editorial_status));
 if(e.loci?.length)sec.append(el("p",{class:"article-note"},"Las referencias de loci enlazan con la edición y el aparato digital. La coincidencia por lema no implica identidad de lectura entre los testimonios."));
 const dl=el("dl",{class:"lx-dl"});const row=(k,v)=>{if(v&&(!Array.isArray(v)||v.length))dl.append(el("dt",{},k),el("dd",{},v))};
 row("Enunciado",el("span",{lang:e.l},e.head));row("Categoría",[e.pos,e.morph].filter(Boolean).join(" · "));if(e.tr)row("Transliteración",e.tr);
 if(e.sens?.length){const ol=el("ol",{});e.sens.forEach(s=>ol.append(el("li",{},s)));row("Acepciones",ol)}
 row("Etimología",e.etym);row("Raíz",el("span",{class:"lx-root"},e.root||""));
 if(e.old?.length)row("Latín arcaico / formas antiguas",e.old.map(o=>el("span",{class:"lx-chip"},el("b",{},o.f)," — ",o.src)));
 const eq=(arr,l)=>arr.map(x=>el("span",{class:"lx-chip"},el("button",{type:"button",class:"lx-formlink",lang:l,onclick:()=>{$("#lx-q").value=x.w;S.mode=l==="he"?"etimologia":"palabra";S.lang=l==="he"?"auto":l;$("#lx-lang").value=S.lang;renderTabs();run()}},x.w),x.tr?el("i",{}," "+x.tr):null," — ",x.g,x.n?el("small",{}," ",x.n):null));
 if(e.gr?.length)row("Griego antiguo",eq(e.gr,"grc"));if(e.la?.length)row("Latín",eq(e.la,"la"));if(e.he?.length)row(e.he.some(x=>/préstamo/i.test(x.g+" "+(x.n||"")))?"Hebreo bíblico · equivalencia o préstamo (véase cada nota)":"Hebreo bíblico · equivalencia de traducción, no parentesco",eq(e.he,"he"));
 if(e.cog?.length)row("Cognados",e.cog.join(" · "));
 sec.append(dl);
 if(e.loci?.length){sec.append(el("h4",{},"Loci"));for(const L of e.loci){const b=el("blockquote",{class:"lx-locus"},el("p",{lang:L.lang||e.l,dir:L.lang==="he"?"rtl":null,class:L.lang==="he"?"lx-he":""},L.t),L.tr?el("p",{class:"lx-tr"},L.tr):null);(L.par||[]).forEach(x=>b.append(el("p",{lang:x.lang,class:"lx-par"},el("small",{},x.lang==="grc"?"LXX / griego: ":"Vulgata / latín: "),x.t)));b.append(el("cite",{},L.c));if(L.v514_alignment){const a=L.v514_alignment,labels={literal_bilingual:"V514 · coincidencia literal bilingüe",latin_only:"V514 · latín literal / castellano no literal",non_literal:"V514 · texto latino no literal",external_source:"Referencia externa · sin cotejo V514"};b.append(el("p",{class:"article-note",title:a.note},"Estado de correspondencia: ",el("strong",{},labels[a.status]||"Pendiente")," · ",a.note));}
 const parsed=String(L.c||"").match(/(?:Vitr\.?|Vitruv\.?)[,\s]*(?:De\s*arch\.?)?\s*([IVX]+|[1-9]|10)\.([0-9]+)\.([0-9]+)/i);
 if(parsed){const roman={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};
 const loc=(roman[parsed[1].toUpperCase()]||parsed[1])+"."+parsed[2]+"."+parsed[3];
 const links=el("div",{class:"actions"});for(const [name,url] of vitruvianLinks(loc).slice(0,4))links.append(el("a",{href:url},name));b.append(links);}
 sec.append(b)}}
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
   if(!born||(!/^-/.test(born)&&+born.slice(1,5)>800))continue; /* solo personajes antiguos o tardoantiguos */
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
 if(greekShown[0]){const g=numericLine(greekShown[0]);if(g)dl.append(el("dt",{},""),el("dd",{},g))}
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

/* ---------- Resultados agrupados por lengua (operadores =, # y personajes) ---------- */
function lemmaFormsFor(D,word){
 const out=new Set();const t={type:"lemma",v:word};for(const f of resolveTerm(D,t))out.add(f);
 if(!out.size){const k=fold(word).replace(/^\*/,"");if(D.post.has(k))out.add(k);for(const a of analyses(D,k))for(const f of (D.lemmaForms.get(a[0])||[]))if(D.post.has(f))out.add(f)}
 return out;
}
function groupHits(D,forms,workId){const hits=[];for(const k of forms)for(const i of (D.post.get(k)||[])){const p=D.corpus.passages[i];if(workId&&p[0]!==workId)continue;for(const m of p[2].matchAll(TOKEN))if(fold(m[0]).replace(/'+$/,"")===k)hits.push({i,spans:[[m.index,m.index+m[0].length]],tok:0})}
 const seen=new Set();return hits.filter(h=>{const id=h.i+":"+h.spans[0][0];if(seen.has(id))return false;seen.add(id);return true}).sort((a,b)=>(CHRONO[D.corpus.passages[a.i][0]]??0)-(CHRONO[D.corpus.passages[b.i][0]]??0)||a.i-b.i)}
function renderGroups(groups){
 const list=$("#lx-results");list.replaceChildren();$("#lx-side-extra").replaceChildren();let total=0;
 for(const g of groups){
  if(!g.forms.size){list.append(el("p",{class:"lx-small"},`${g.label}: sin formas atestiguadas en el corpus local.`));continue}
  const hits=groupHits(g.D,g.forms,g.work);total+=hits.length;
  const h=el("h3",{class:"lx-group-h"},`${g.label} · ${hits.length} pasaje${hits.length===1?"":"s"}`);list.append(h);
  if(g.words?.length)list.append(el("p",{class:"lx-small",lang:g.D.l},"Lemas: ",g.words.join(" · ")));
  const box=el("div");list.append(box);let n=0;const more=()=>{hits.slice(n,n+20).forEach(x=>box.append(hitCard(g.D,x)));n+=20;btn.hidden=n>=hits.length};
  const btn=el("button",{type:"button",class:"lx-more",onclick:more},"Mostrar 20 más");list.append(btn);more();
 }
 return total;
}

/* ---------- Operador de equivalencia semántica: =aedes · sem:λόγος ---------- */
function findEquivalenceEntry(w){
 const k=fold(w);const E=S.etym?.entries||[];
 return E.find(e=>fold(e.lemma)===k)||E.find(e=>[...(e.gr||[]),...(e.la||[])].some(x=>fold(x.w)===k))||E.find(e=>(e.he||[]).some(h=>heKey(h.w)===heKey(w)));
}
async function renderSemantic(word){
 const e=findEquivalenceEntry(word);
 if(!e){setState(`«${word}» no tiene equivalencias registradas en el Etymologicum. Pruebe sin «=» para la búsqueda léxica.`);return}
 const la=[...new Set([e.l==="la"?e.lemma:null,...(e.la||[]).map(x=>x.w)].filter(Boolean))];
 const gr=[...new Set([e.l==="grc"?e.lemma:null,...(e.gr||[]).map(x=>x.w)].filter(Boolean))];
 const [La,G]=await Promise.all([lang("la",true),lang("grc",true)]);
 const lf=new Set(),gf=new Set();la.forEach(w=>lemmaFormsFor(La,w).forEach(f=>lf.add(f)));gr.forEach(w=>lemmaFormsFor(G,w).forEach(f=>gf.add(f)));
 const box=$("#lx-entry");box.hidden=false;box.replaceChildren(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · AEQUIVALENTIA"),el("h2",{lang:e.l},e.lemma),el("p",{class:"article-byline"},"Búsqueda trilingüe por las equivalencias registradas en la ficha del Etymologicum (latín, griego, hebreo).")));
 const dl=el("dl",{class:"lx-dl"});dl.append(el("dt",{},"Latín"),el("dd",{lang:"la",class:"lx-root"},la.join(" · ")||"—"),el("dt",{},"Griego"),el("dd",{lang:"grc",class:"lx-root"},gr.join(" · ")||"—"),el("dt",{},"Hebreo"),el("dd",{},(e.he||[]).map(h=>el("span",{class:"lx-chip"},el("span",{lang:"he"},h.w)," ",el("i",{},h.tr)," — ",h.g,heRootOf(h.w)?el("small",{}," · raíz ",el("button",{type:"button",class:"lx-formlink",lang:"he",onclick:()=>{$("#lx-q").value="√"+heRootOf(h.w);run()}},heRootOf(h.w))):null)).concat((e.he||[]).length?[]:["—"])));
 box.append(dl,el("p",{class:"article-note"},"Las equivalencias son correspondencias de traducción y de campo semántico, no sinónimos estrictos; incluyen cognados y derivados declarados en la ficha."));
 const total=renderGroups([{D:La,forms:lf,label:"Latín",words:la},{D:G,forms:gf,label:"Griego",words:gr}]);
 setState(`=${word}: ${total} pasajes en latín y griego por ${la.length+gr.length} lemas equivalentes${(e.he||[]).length?"; equivalentes hebreos en la ficha":""}.`);
}

/* ---------- Tesauro temático: #geometria ---------- */
let THES=null;
async function thesaurus(){if(!THES){try{THES=await load("data/lexicon/thesaurus.json")}catch{THES={themes:[]}}}return THES}
async function renderTheme(tag){
 const T=await thesaurus();const k=fold(tag);
 const t=T.themes.find(x=>x.id===k)||T.themes.find(x=>fold(x.label).includes(k))||T.themes.find(x=>x.id.startsWith(k));
 const list=$("#lx-results");
 if(!t){setState(`No hay un campo «#${tag}». Campos disponibles: ${T.themes.map(x=>"#"+x.id).join(" · ")}`);list.append(themeChips(T));return}
 const [La,G]=await Promise.all([lang("la",true),lang("grc",true)]);
 const lf=new Set(),gf=new Set();t.la.forEach(w=>lemmaFormsFor(La,w).forEach(f=>lf.add(f)));t.grc.forEach(w=>lemmaFormsFor(G,w).forEach(f=>gf.add(f)));
 const box=$("#lx-entry");box.hidden=false;box.replaceChildren(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · THESAURUS THEMATICUS"),el("h2",{},t.label),el("p",{class:"article-byline"},T.method)),themeChips(T,t.id));
 const total=renderGroups([{D:La,forms:lf,label:"Latín",words:t.la},{D:G,forms:gf,label:"Griego",words:t.grc}].filter(g=>g.words.length));
 setState(`#${t.id}: ${total} pasajes para ${t.la.length+t.grc.length} lemas del campo «${t.label}».`);
}
function themeChips(T,cur){const p=el("p",{class:"suggestions lx-themes"},el("span",{},"Campos"));for(const x of T.themes)p.append(el("button",{type:"button","aria-pressed":String(x.id===cur),onclick:()=>{$("#lx-q").value="#"+x.id;run()}},"#"+x.id));return p}

/* ---------- Raíces hebreas triconsonánticas: √בנה · raiz_he:בנה ---------- */
let HER=null;
async function heRoots(){if(!HER){try{HER=(await load("data/lexicon/hebrew-roots.json")).roots}catch{HER={}}}return HER}
const FINAL={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
function heKey(w){return String(w||"").normalize("NFD").replace(/[֑-ׇ]/g,"").replace(/[^א-ת]/g,"").replace(/[ךםןףץ]/g,c=>FINAL[c])}
function heRootOf(w){if(!HER)return"";const k=heKey(w);for(const [word,[root]] of Object.entries(HER))if(heKey(word)===k)return root;return""}
async function renderHebrewRoot(rootIn){
 const R=await heRoots();const rk=heKey(rootIn);
 const words=Object.entries(R).filter(([,v])=>heKey(v[0])===rk);
 const E=S.etym?.entries||[];const list=$("#lx-results");
 const box=$("#lx-entry");box.hidden=false;box.replaceChildren(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · RADIX HEBRAICA"),el("h2",{lang:"he",dir:"rtl",class:"lx-he"},"√"+rootIn),el("p",{class:"article-byline"},words.length?`${words.length} palabra${words.length===1?"":"s"} de esta raíz entre las equivalencias del Etymologicum (BDB, HALOT).`:"Ninguna equivalencia registrada deriva de esta raíz.")));
 for(const [w,[r,gl]] of words){
  const ents=E.filter(e=>(e.he||[]).some(h=>heKey(h.w)===heKey(w)));
  const card=el("article",{class:"result-card"},el("div",{class:"kind"},"raíz "+r+(gl?" · "+gl:"")),el("h3",{lang:"he",dir:"rtl",class:"lx-he"},w));
  const a=el("div",{class:"actions"});ents.forEach(e=>{const h=e.he.find(x=>heKey(x.w)===heKey(w));a.append(el("button",{type:"button",onclick:()=>{$("#lx-q").value=e.lemma;S.mode="palabra";S.lang=e.l;$("#lx-lang").value=e.l;renderTabs();run()}},`${e.lemma} (${h?.tr||""})`),el("button",{type:"button",onclick:()=>{$("#lx-q").value="="+e.lemma;run()}},`=${e.lemma} · trilingüe`))});
  card.append(a);list.append(card);
 }
 list.append(el("p",{class:"lx-ext"},"Raíz en léxicos en línea: ",el("a",{href:`https://www.sefaria.org/search?q=${encodeURIComponent(rootIn)}`,target:"_blank",rel:"noopener noreferrer"},"Sefaria")," · ",el("a",{href:`https://en.wiktionary.org/wiki/${encodeURIComponent([...heKey(rootIn)].join("־"))}`,target:"_blank",rel:"noopener noreferrer"},"Wiktionary (raíz)")));
 setState(`Raíz √${rootIn}: ${words.length} derivado${words.length===1?"":"s"} registrado${words.length===1?"":"s"}. El corpus local aún no incluye texto hebreo continuo: la raíz se busca en las equivalencias de las fichas.`);
}

/* ---------- Constructor visual de consultas morfosintácticas ---------- */
const QB_FIELDS=[["pos","Categoría",[["","—"],["noun","sustantivo"],["verb","verbo"],["adj","adjetivo"],["adv","adverbio"],["art","artículo"],["pron","pronombre"],["prep","preposición"],["conj","conjunción"],["part","partícula"]]],
 ["case","Caso",[["","—"],["nom","nominativo"],["gen","genitivo"],["dat","dativo"],["acc","acusativo"],["voc","vocativo"]]],
 ["num","Número",[["","—"],["sg","singular"],["pl","plural"],["du","dual"]]],
 ["gender","Género",[["","—"],["m","masculino"],["f","femenino"],["n","neutro"]]],
 ["tense","Tiempo",[["","—"],["pres","presente"],["imperf","imperfecto"],["aor","aoristo"],["perf","perfecto"],["plup","pluscuamperfecto"],["fut","futuro"]]],
 ["mood","Modo",[["","—"],["ind","indicativo"],["subj","subjuntivo"],["opt","optativo"],["imp","imperativo"],["inf","infinitivo"],["ptc","participio"]]],
 ["voice","Voz",[["","—"],["act","activa"],["mid","media"],["pass","pasiva"],["mp","mediopasiva"]]]];

/* Consulta léxica grecolatina del constructor. No se confunde
   correspondencia semántica con parentesco etimológico ni se inventan
   etiquetas flexivas latinas inexistentes en el índice. */
async function qbLexicalSearch(input,filters={},scope="both",save=true){
 const term=String(input||"").trim().replace(/^@/,"");if(!term)return;
 window.VitruviaEncyclopedia?.update(term);
 const concept=await findConcept(term);
 const map=concept?{la:concept.la||[],grc:concept.grc||[]}:
  {la:GREEK.test(term)?[]:[term],grc:GREEK.test(term)?[term]:[]};
 const languages=scope==="la"?["la"]:scope==="grc"?["grc"]:["la","grc"];
 S.q=term;S.lang="auto";S.mode="palabra";S.work="";S.result=null;S.D=null;
 $("#lx-q").value=term;$("#lx-lang").value="auto";renderTabs();
 const list=$("#lx-results"),head=$("#lx-entry");
 list.replaceChildren();head.replaceChildren();head.hidden=false;
 $("#lx-side-extra").replaceChildren();$("#lx-head-title").textContent="Concordancias grecolatinas";
 renderOldestEvidence(term);
 if(save){
  const url=new URL(location.href);
  url.searchParams.set("q",term);url.searchParams.set("mode","palabra");
  url.searchParams.set("qb","1");url.searchParams.set("qb_lang",scope);
  url.searchParams.set("qb_filters",JSON.stringify(filters));
  url.searchParams.delete("work");url.searchParams.delete("lang");
  history.replaceState(null,"",url);
 }
 head.append(el("header",{class:"lx-entry-head"},
  el("div",{class:"article-kicker"},"LEXICON · BÚSQUEDA COMPARADA"),
  el("h2",{},term),
  el("p",{class:"article-byline"},concept?
   "Se buscan los equivalentes registrados en las obras griegas y latinas. Las coincidencias de significado no prueban parentesco etimológico.":
   "Sin correspondencia moderna registrada en el glosario: se busca la forma exacta en las lenguas disponibles.")));
 if(concept?.note)head.append(el("p",{class:"lx-small"},concept.note));
 let sums={la:0,grc:0};
 for(const l of languages){
  const D=await lang(l,true),terms=map[l];
  const title=l==="la"?"Latín":"Griego antiguo";
  list.append(el("h3",{class:"lx-group-h"},title+" · "+terms.join(" · ")));
  if(!terms.length){
   list.append(el("p",{class:"lx-small"},"Sin equivalente registrado para esta lengua. No se atribuye una traducción sin fuentes."));
   continue;
  }
  const conditions=Object.entries(filters).filter(([,v])=>v);
  const conds=conditions.length?parsePattern(conditions.map(([k,v])=>k+"="+v).join(" ")):[];
  const table=el("table",{class:"lx-table"},el("thead",{},el("tr",{},...["Lema","Glosa","Formas en el índice","Pasajes"].map(x=>el("th",{},x)))));
  const tbody=el("tbody");table.append(tbody);
  const hits=[],seen=new Set();
  for(const lemma of terms){
   const fs=lemmaFormsFor(D,lemma),all=groupHits(D,fs,"");
   let kept=0;
   for(const h of all){
    const key=h.i+":"+h.spans[0][0];if(seen.has(key))continue;
    if(l==="grc"&&conds.length){
     const p=D.corpus.passages[h.i],form=p[2].slice(h.spans[0][0],h.spans[0][1]);
     const analysesForForm=analyses(D,fold(form));
     if(!analysesForForm.some(a=>a[1]&&tagMatches(a[1],conds)))continue;
    }
    seen.add(key);hits.push(h);kept++;
   }
   const lm=Object.entries(D.forms.lemmas).find(([k])=>fold(lemmaDisplay(k))===fold(lemma));
   const gloss=lm?.[1]?.g||"Glosa no registrada";
   tbody.append(el("tr",{},
    el("td",{},el("button",{type:"button",class:"lx-formlink",lang:l,onclick:()=>{
     $("#lx-q").value=lemma;S.lang=l;$("#lx-lang").value=l;S.mode="palabra";renderTabs();run();
    }},lemma)),
    el("td",{},String(gloss).split(";")[0]),el("td",{},String(fs.size)),el("td",{},String(kept))));
  }
  list.append(table);
  sums[l]=hits.length;
  if(l==="la"&&conditions.length)list.append(el("p",{class:"article-note"},
    "El corpus latino permite consultar lemas y concordancias. No dispone todavía de todas las etiquetas morfológicas flexivas por ocurrencia: el filtro de categoría, caso, género o tiempo no se aplica al latín."));
  if(l==="grc"&&conditions.length)list.append(el("p",{class:"article-note"},
    "En griego, los rasgos seleccionados filtran las etiquetas morfológicas automáticas AGDT/Celano. Las formas ambiguas deben verificarse en contexto."));
  if(!hits.length){
   list.append(el("p",{class:"lx-small"},"No se hallaron coincidencias en el corpus local con estos criterios; no equivale a ausencia histórica de la palabra."));
  }else{
   hits.slice(0,12).forEach(h=>list.append(hitCard(D,h)));
   if(hits.length>12)list.append(el("p",{class:"lx-small"},
    "Se muestran 12 de "+hits.length+" ocurrencias. Pulse el lema para consultar la concordancia completa."));
  }
 }
 setState("Consulta «"+term+"»: "+sums.la+" coincidencias latinas y "+sums.grc+" griegas en las obras indexadas.");
}
function renderQueryBuilder(){
 const host=$("#lx-qb");if(!host)return;host.replaceChildren();
 host.append(el("summary",{},"Constructor de consultas · morfología y sintaxis sin escribir códigos"));
 const row=el("div",{class:"lx-qb-row"}),sels={};
 for(const [k,label,opts] of QB_FIELDS){
  const select=el("select",{"aria-label":label});
  opts.forEach(([v,t])=>select.append(el("option",{value:v},t)));
  sels[k]=select;row.append(el("label",{},el("span",{},label),select));
 }
 const word=el("input",{type:"text",placeholder:"arquitectura · arquitetura · architectura · τέχνη","aria-label":"Palabra o lema"});
 row.append(el("label",{},el("span",{},"Palabra / lema"),word));
 const gap=el("select",{"aria-label":"Separación del anterior"});
 [["0","contigua"],["1","hasta 1 palabra"],["3","hasta 3 palabras"],["5","hasta 5 palabras"],["8","hasta 8 palabras"]].forEach(([v,t])=>gap.append(el("option",{value:v},t)));
 row.append(el("label",{},el("span",{},"Separación del anterior"),gap));
 const scope=el("select",{"aria-label":"Lengua para la búsqueda del constructor"});
 [["both","Latín y griego"],["la","Solo latín"],["grc","Solo griego"]].forEach(([v,t])=>scope.append(el("option",{value:v},t)));
 row.append(el("label",{},el("span",{},"Lenguas de búsqueda"),scope));
 host.append(row);
 const preview=el("p",{class:"lx-qb-preview",role:"status"});
 const selected=()=>Object.fromEntries(Object.entries(sels).filter(([,s])=>s.value).map(([k,s])=>[k,s.value]));
 const token=()=>{
  const w=word.value.trim();if(w)return w;
  const f=selected();const p=Object.entries(f).map(([k,v])=>k+"="+v);
  return p.length?"["+p.join(" ")+"]":"";
 };
 const update=()=>{
  const w=word.value.trim(),f=selected();
  preview.textContent=w?
   "Buscará «"+w+"» en "+(scope.value==="both"?"latín y griego":scope.value==="la"?"latín":"griego")+
   (f.pos?" · categoría: "+(QB_FIELDS[0][2].find(x=>x[0]===f.pos)?.[1]||f.pos):"")+
   ". Los rasgos se aplicarán solamente donde existan análisis morfológicos suficientes.":
   token()?"Añadirá un patrón sintáctico griego: "+token():
   "Escriba una palabra o seleccione rasgos morfológicos.";
 };
 for(const s of Object.values(sels))s.addEventListener("change",update);
 word.addEventListener("input",update);scope.addEventListener("change",update);
 const go=async()=>{
  if(word.value.trim()){
   await qbLexicalSearch(word.value,selected(),scope.value);
  }else{
   const q=$("#lx-q").value.trim()||token();
   if(!q){update();return}
   if(scope.value==="la"&&Object.keys(selected()).length){
    setState("Los patrones flexivos latinos no están disponibles en el índice actual. Busque un lema o seleccione griego.");return;
   }
   $("#lx-q").value=q;S.mode="sintaxis";S.lang="grc";$("#lx-lang").value="grc";renderTabs();await run();
  }
  $("#results").scrollIntoView({behavior:"smooth",block:"start"});
 };
 const actions=el("div",{class:"actions"},
  el("button",{type:"button",onclick:()=>{
   const t=token();if(!t)return;
   const old=$("#lx-q").value.trim();
   $("#lx-q").value=old?old+(gap.value==="0"?" ":" .."+gap.value+" ")+t:t;
   if(!word.value.trim()){
    S.mode="sintaxis";S.lang="grc";$("#lx-lang").value="grc";renderTabs();
   }update();
  }},"Añadir elemento a la consulta"),
  el("button",{type:"button",onclick:()=>go().catch(e=>{console.error(e);setState("Error de consulta: "+e.message)})},"Buscar"),
  el("button",{type:"button",onclick:()=>{
   word.value="";$("#lx-q").value="";Object.values(sels).forEach(s=>s.value="");update();
  }},"Vaciar consulta"));
 host.append(preview,actions);
 const suggestions=el("p",{class:"suggestions"},el("span",{},"Construcciones"));
 [["genitivo absoluto","[mood=ptc case=gen] ..2 [case=gen]"],["infinitivo articular","[pos=art] [mood=inf]"],["μέν … δέ","μέν ..8 δέ"],["potencial (ἄν + optativo)","ἄν ..3 [mood=opt]"],["ἵνα + subjuntivo","ἵνα ..4 [mood=subj]"],["participio atributivo","[pos=art] [mood=ptc]"],["dativo instrumental + verbo","[case=dat pos=noun] [pos=verb]"]].forEach(([t,q])=>{
  suggestions.append(el("button",{type:"button",onclick:()=>{
   $("#lx-q").value=q;word.value="";S.mode="sintaxis";S.lang="grc";$("#lx-lang").value="grc";
   renderTabs();run().then(()=>$("#results").scrollIntoView({behavior:"smooth"}));
  }},t));
 });
 host.append(suggestions,el("p",{class:"explain"},
  "Las palabras modernas se resuelven mediante equivalencias documentadas en latín y griego. El griego permite filtros morfológicos automáticos; el latín muestra lemas, glosas y concordancias, sin inventar rasgos flexivos."));
 update();
}

/* ---------- Fase I · raíz etimológica (pie:*dem-), concepto y locus directo ---------- */
function rootKey(r){return fold(String(r||"").replace(/^\*/,"").replace(/[«(].*$/,"").trim()).replace(/[-‐]/g,"")}
async function renderPIE(rootIn){
 const rk=rootKey(rootIn);const E=S.etym?.entries||[];
 const fam=E.filter(e=>e.root&&e.root.split(/\s*\+\s*|\s+y\s+/).some(r=>rootKey(r.replace(/^¿|\?.*$/g,""))===rk));
 const box=$("#lx-entry");box.hidden=false;
 box.replaceChildren(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · RADIX INDOEUROPAEA"),el("h2",{},"*"+rootIn.replace(/^\*/,"")),el("p",{class:"article-byline"},fam.length?`${fam.length} ficha${fam.length===1?"":"s"} del Etymologicum remiten a esta raíz reconstruida.`:"Ninguna ficha editorial remite a esta raíz.")));
 const list=$("#lx-results");list.replaceChildren();$("#lx-side-extra").replaceChildren();
 if(fam.length){const dl=el("dl",{class:"lx-dl"});for(const lg of ["la","grc"]){const xs=fam.filter(e=>e.l===lg);if(!xs.length)continue;const dd=el("dd",{});xs.forEach((e,i)=>{if(i)dd.append(" · ");dd.append(el("button",{type:"button",class:"lx-formlink",lang:lg,onclick:()=>{$("#lx-q").value=e.lemma;S.mode="palabra";S.lang=lg;$("#lx-lang").value=lg;renderTabs();run()}},e.lemma),el("small",{}," "+(e.sens?.[0]||"").slice(0,60)))});dl.append(el("dt",{},lg==="la"?"Latín":"Griego"),dd)}
  const cogs=[...new Set(fam.flatMap(e=>e.cog||[]))];if(cogs.length)dl.append(el("dt",{},"Cognados en otras lenguas"),el("dd",{},cogs.join(" · ")));box.append(dl)}
 box.append(el("p",{class:"article-note"},"Las raíces protoindoeuropeas son reconstrucciones comparativas, no formas atestiguadas. Se distinguen aquí de la búsqueda ortográfica por comienzo de palabra (prefijo:aedi)."));
 const sec=el("section",{class:"lx-tree-wrap"},el("h3",{},"Descendientes de la raíz (Wiktionary)"));box.append(sec);
 try{const title="Reconstruction:Proto-Indo-European/"+rootIn.replace(/^\*/,"");const d=await wkPage(title);const nodes=d&&wkSection(d,"Proto-Indo-European");
  if(!nodes){sec.append(el("p",{class:"lx-small"},"Wiktionary no tiene página para esta reconstrucción."))}
  else{const gl=wkGloss(nodes);if(gl)sec.append(el("p",{},"Significado reconstruido: «",gl,"»"));const ds=wkDescendants(nodes);sec.append(ds.length?el("ul",{class:"lx-tree-desc-list"},ds.map(x=>el("li",{},x))):el("p",{class:"lx-small"},"Sin lista de descendientes."));sec.append(el("p",{class:"article-note"},el("a",{href:"https://en.wiktionary.org/wiki/"+encodeURIComponent(title),target:"_blank",rel:"noopener noreferrer"},"Wiktionary, "+title)," · CC BY-SA 4.0"))}}
 catch(err){sec.append(el("p",{class:"lx-small"},"No se pudo consultar Wiktionary ("+err.message+")."))}
 setState(`Raíz *${rootIn.replace(/^\*/,"")}: ${fam.length} ficha${fam.length===1?"":"s"} editorial${fam.length===1?"":"es"} y descendientes de Wiktionary.`);
}
/* Búsqueda por concepto (multilingüe inversa): concepto:justicia · concepto:house */
async function renderConcept(word){
 const k=fold(word).trim();const E=S.etym?.entries||[];const re=new RegExp("(^|[^\\p{L}])"+k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?![\\p{L}])","u");
 const cur=E.filter(e=>[...(e.sens||[]),...(e.gr||[]).map(x=>x.g),...(e.la||[]).map(x=>x.g),...(e.he||[]).map(x=>x.g)].some(t=>re.test(fold(t))));
 const [La,G]=await Promise.all([lang("la",true),lang("grc",true)]);
 const glossHits=D=>{const out=[];for(const [lem,info] of Object.entries(D.forms.lemmas)){if(!info.g)continue;const senses=info.g.split(/;\s*/);const i=senses.findIndex(s=>re.test(fold(s)));if(i<0)continue;const freq=[...(D.lemmaForms.get(lem)||[])].reduce((a,f)=>a+(D.freq.get(f)||0),0);if(!freq)continue;out.push({lem,sense:senses[i],rank:i,freq})}return out.sort((a,b)=>a.rank-b.rank||b.freq-a.freq).slice(0,24)};
 const lh=glossHits(La),gh=glossHits(G);
 const box=$("#lx-entry");box.hidden=false;box.replaceChildren(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · CONCEPTUS"),el("h2",{},word),el("p",{class:"article-byline"},"Lemas antiguos cuyo significado registrado incluye este concepto. Las acepciones del Etymologicum están en castellano; las del Lewis & Short y el LSJ, en inglés: para el diccionario conviene buscar también el término inglés (concepto:justice).")));
 const list=$("#lx-results");list.replaceChildren();$("#lx-side-extra").replaceChildren();
 if(cur.length){list.append(el("h3",{class:"lx-group-h"},`Etymologicum · ${cur.length} ficha${cur.length===1?"":"s"}`));cur.forEach(e=>list.append(etymResult(e)))}
 for(const [D,arr,label] of [[La,lh,"Latín · Lewis & Short"],[G,gh,"Griego · LSJ"]]){
  list.append(el("h3",{class:"lx-group-h"},`${label} · ${arr.length} lema${arr.length===1?"":"s"}`));
  const tb=el("table",{class:"lx-table"},el("thead",{},el("tr",{},el("th",{},"Lema"),el("th",{},"Acepción"),el("th",{},"N.º de acepción"),el("th",{},"Frecuencia"))));const body=el("tbody");tb.append(body);
  arr.forEach(x=>body.append(el("tr",{},el("td",{lang:D.l},el("button",{type:"button",class:"lx-formlink",onclick:()=>{$("#lx-q").value=lemmaDisplay(x.lem);S.mode="palabra";S.lang=D.l;$("#lx-lang").value=D.l;renderTabs();run()}},lemmaDisplay(x.lem))),el("td",{},x.sense),el("td",{},String(x.rank+1)),el("td",{},String(x.freq)))));
  list.append(arr.length?tb:el("p",{class:"lx-small"},"Sin acepciones coincidentes."));
 }
 {const c=await findConcept(word);if(c)box.append(conceptCard(c,word))}
 setState(`Concepto «${word}»: ${cur.length} fichas editoriales, ${lh.length} lemas latinos y ${gh.length} griegos. Ordenados por posición de la acepción en el diccionario y por frecuencia en el corpus: la coincidencia de significado no implica parentesco etimológico.`);
}
/* Enlace permanente a un locus: vitruvia-lexicon.html?work=vitruvius&locus=1.2.1&q=symmetria */
async function openLocus(workId,locus,q){
 const l=["herodotus-histories","euclid-elements","homer-iliad","homer-odyssey","plato-apology","aristotle-poetics","theophrastus-characters","epictetus-enchiridion"].includes(workId)?"grc":"la";
 const D=await lang(l,true);let i=D.corpus.passages.findIndex(p=>p[0]===workId&&p[1]===locus);
 if(i<0)i=D.corpus.passages.findIndex(p=>p[0]===workId&&String(p[1]).startsWith(locus+"."));
 if(i<0){const [b,v]=locus.split(".");i=D.corpus.passages.findIndex((p,j)=>{if(p[0]!==workId)return false;const nx=D.corpus.passages[j+1];return p[1].split(".")[0]===b&&+p[1].split(".").pop()<=+v&&(!nx||nx[0]!==workId||nx[1].split(".")[0]!==b||+nx[1].split(".").pop()>+v)})}
 if(i<0){setState(`No se encontró el locus ${locus} en el corpus local.`);return}
 const p=D.corpus.passages[i];const spans=[];if(q){const ks=new Set(fold(q).split(/\s+/));for(const m of p[2].matchAll(TOKEN))if(ks.has(fold(m[0])))spans.push([m.index,m.index+m[0].length])}
 const card=hitCard(D,{i,spans:spans.length?spans:[[0,0]],tok:0});card.classList.add("lx-locus-direct");const full=card.querySelector(".lx-full");full.hidden=false;
 const t=el("p",{class:"lx-passage",lang:D.l});t.append(linkWords(p[2],spans));full.append(t);if(p[4])full.append(el("p",{class:"lx-tr"},el("b",{},"Traducción (Kurilo, V514): "),p[4]));
 $("#lx-results").prepend(el("h3",{class:"lx-group-h"},"Locus citado"),card);card.scrollIntoView({behavior:"smooth",block:"center"});
}

/* ---------- Raíz semántica: de la palabra moderna a las lenguas antiguas ---------- */
let CONC=null;
async function conceptus(){if(!CONC){try{CONC=(await load("data/lexicon/conceptus.json")).concepts}catch{CONC=[]}}return CONC}
async function findConcept(word){
 const C=await conceptus();const k=fold(word).trim();if(!k)return null;
 return C.find(c=>Object.values(c.modern).flat().some(m=>fold(m)===k))||C.find(c=>[...c.la,...c.grc].some(m=>fold(m)===k))||null;
}
function conceptCard(c,word){
 const sec=el("section",{class:"lx-concept"},el("h3",{},"Raíz semántica en las lenguas antiguas"),el("p",{class:"article-note"},"El mismo concepto en latín, griego, hebreo bíblico, arameo y egipcio. Son correspondencias de significado: el parentesco etimológico solo existe donde lo indica la nota o el árbol."));
 const dl=el("dl",{class:"lx-dl"});
 const go=(w,l)=>el("button",{type:"button",class:"lx-formlink",lang:l,onclick:()=>{$("#lx-q").value=w;S.mode="palabra";S.lang=l;$("#lx-lang").value=l;renderTabs();run()}},w);
 const join=(arr,f)=>{const dd=el("dd",{});arr.forEach((x,i)=>{if(i)dd.append(" · ");dd.append(f(x))});return dd};
 if(c.la.length)dl.append(el("dt",{},"Latín"),join(c.la,w=>go(w,"la")));
 if(c.grc.length)dl.append(el("dt",{},"Griego antiguo"),join(c.grc,w=>go(w,"grc")));
 if(c.he.length)dl.append(el("dt",{},"Hebreo bíblico"),join(c.he,x=>el("span",{},el("span",{lang:"he"},x.w)," ",el("i",{},x.tr)," — ",x.g,heRootOf(x.w)?el("small",{}," · ",el("button",{type:"button",class:"lx-formlink",lang:"he",onclick:()=>{$("#lx-q").value="√"+heRootOf(x.w);run()}},"√"+heRootOf(x.w))):null)));
 if(c.arc.length)dl.append(el("dt",{},"Arameo"),join(c.arc,x=>el("span",{},el("span",{lang:"he"},x.w)," ",el("i",{},x.tr)," — ",x.g)));
 if(c.egy.length)dl.append(el("dt",{},"Egipcio medio"),join(c.egy,x=>el("span",{},x.h?el("span",{class:"lx-hiero",lang:"egy"},x.h+" "):null,el("i",{class:"lx-egy"},x.tr)," — ",x.g)));
 sec.append(dl);if(c.note)sec.append(el("p",{class:"lx-syn"},el("b",{},"Parentesco: "),c.note));
 const a=el("div",{class:"actions"});
 const main=(c.entries||[])[0];if(main)a.append(el("button",{type:"button",onclick:()=>{const e=(S.etym?.entries||[]).find(x=>x.id===main);if(e){$("#lx-q").value="="+e.lemma;run()}}},"Pasajes en latín y griego (trilingüe)"));
 for(const [code,label] of [["es","castellano"],["en","inglés"],["fr","francés"],["de","alemán"]]){const w=c.modern[code]?.[0];if(w)a.append(el("button",{type:"button",onclick:()=>{$("#lx-q").value=w;S.lang=code;$("#lx-lang").value=code;S.mode="etimologia";renderTabs();run()}},`Árbol de «${w}» (${label})`))}
 sec.append(a);
 const fbox=el("div",{},el("p",{class:"lx-small"},"Calculando la frecuencia en los clásicos…"));sec.append(fbox);conceptFrequency(c).then(F=>fbox.replaceChildren(frequencyTable(c,F))).catch(()=>fbox.replaceChildren());
 return sec;
}

/* ---------- Frecuencia del concepto en cada clásico indexado ---------- */
async function conceptFrequency(c){
 const [La,G]=await Promise.all([lang("la",true),lang("grc",true)]);
 const rows=[];
 for(const [D,lemmas] of [[La,c.la],[G,c.grc]]){
  if(!lemmas.length)continue;
  const per=lemmas.map(w=>({w,forms:lemmaFormsFor(D,w)}));
  const works=Object.keys(D.corpus.works);
  for(const id of works){
   if(D.l==="grc"&&id==="vitruvius")continue; /* las voces griegas de Vitruvio ya cuentan en el corpus latino */
   const counts=per.map(x=>{let n=0;for(const f of x.forms)n+=(D.workFreq.get(f)?.[id]||0);return n});
   const total=counts.reduce((a,b)=>a+b,0);if(!total)continue;
   rows.push({D,id,lang:D.l,total,counts,lemmas:per,per10k:total/(D.workTokens[id]||1)*10000});
  }
 }
 /* Traducción castellana de Vitruvio (V514): la palabra moderna en la versión de Kurilo. */
 const es=(c.modern.es||[]).map(fold);let trN=0;
 if(es.length){const rx=new RegExp("(^|[^\\p{L}])("+es.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?:s|es)?").join("|")+")(?![\\p{L}])","gu");for(const p of La.corpus.passages)if(p[0]==="vitruvius"&&p[4])trN+=(fold(p[4]).match(rx)||[]).length}
 rows.sort((a,b)=>(CHRONO[a.id]??0)-(CHRONO[b.id]??0));
 return{rows,trN,es:c.modern.es||[]};
}
function frequencyTable(c,F){
 const sec=el("section",{class:"lx-freq"},el("h4",{},"Frecuencia en los clásicos de la biblioteca"),
  el("p",{class:"article-note"},"Coincidencias de los lemas equivalentes en el texto latino o griego editado, agrupadas por obra y fecha de composición. Las traducciones modernas se cuentan por separado; no representan lecturas del manuscrito original."));
 const tb=el("table",{class:"lx-table"},el("thead",{},el("tr",{},el("th",{},"Obra y testimonio"),el("th",{},"Fecha"),el("th",{},"Por lema / fuente"),el("th",{},"Total"),el("th",{},"‱"),el("th",{},""))));
 const body=el("tbody");tb.append(body);
 const original=F.rows.find(r=>r.id==="vitruvius"&&r.lang==="la");
 for(const r of F.rows){
  const w=work(r.D,r.id),vitruvius=r.id==="vitruvius";
  const title=el("td",{},vitruvius?"Vitruvio, ":w.author+", ",el("i",{},vitruvius?"De architectura · diez libros":w.title));
  if(vitruvius)title.append(el("small",{class:"lx-small"}," · texto latino digitalizado, edición moderna (no transcripción diplomática del Codex H)"));
  body.append(el("tr",{},title,el("td",{},vitruvius?"siglo I a. C.":DATING[r.id]||""),
   el("td",{lang:r.lang},r.lemmas.map((x,i)=>r.counts[i]?`${x.w} ${r.counts[i]}`:"").filter(Boolean).join(" · ")),
   el("td",{},el("b",{},String(r.total))),el("td",{},r.per10k.toFixed(1)),
   el("td",{},el("button",{type:"button",class:"lx-btn",onclick:()=>{
    const forms=new Set(r.lemmas.flatMap(x=>[...x.forms]));
    renderGroups([{D:r.D,forms,label:vitruvius?"Vitruvio, De architectura (latín digitalizado)":w.author+", "+w.title,words:r.lemmas.map(x=>x.w),work:r.id}]);
    $("#results").scrollIntoView({behavior:"smooth"});
   }},"Ver pasajes"))));
 }
 // La transcripción de un testimonio medieval no se puede reconstruir
 // a partir de los tokens de una edición latina o su traducción castellana.
 if(F.trN&&!original){
  body.append(el("tr",{},el("td",{},"Vitruvio, ",el("i",{},"De architectura · diez libros")," · latín de la edición digital"),
   el("td",{},"siglo I a. C. · obra original"),el("td",{lang:"la"},"Los lemas latinos equivalentes de esta consulta no tienen coincidencias en el índice latino."),
   el("td",{},el("b",{},"0")),el("td",{},"0.0"),
   el("td",{},el("a",{href:"lector-bilingue.html?edition=recensio-es"},"Consultar latín"))));
 }
 if(original||F.trN){
  const codex=el("td",{},"Vitruvio, ",el("i",{},"De architectura")," · Codex H / Harley MS 2767");
  codex.append(el("small",{class:"lx-small"}," · facsímil manuscrito, no OCR indexado"));
  body.append(el("tr",{class:"lx-manuscript-unindexed"},codex,el("td",{},"siglo IX d. C. · copia"),el("td",{},"341 imágenes digitales. No existe una transcripción íntegra verificada del códice para contar las palabras del manuscrito."),
   el("td",{},el("span",{title:"No calculable sin transcripción OCR/diplomática de Codex H"},"Sin dato")),el("td",{},"—"),
   el("td",{},el("a",{href:"codex-h-folios-local.html"},"Consultar códice H"))));
 }
 if(F.trN){
  const modern=el("td",{},"Vitruvio, ",el("i",{},"De architectura")," · traducción castellana de Diego A. Kurilo, V514 (ed. 2026)");
  body.append(el("tr",{},modern,el("td",{},"siglo I a. C. · original"),el("td",{},"Castellano moderno · "+F.es.join(" · ")),
   el("td",{},el("b",{},String(F.trN))),el("td",{},"—"),
   el("td",{},el("button",{type:"button",class:"lx-btn",onclick:()=>{
    $("#lx-q").value=F.es[0];S.lang="la";$("#lx-lang").value="la";S.work="vitruvius";showTranslationHits(F.es);
   }},"Ver pasajes"))));
 }
 sec.append(F.rows.length||F.trN?tb:el("p",{class:"lx-small"},"Sin ocurrencias en el corpus local."));
 return sec;
}
async function showTranslationHits(words){
 const La=await lang("la",true);const ks=words.map(fold);const rx=new RegExp("(^|[^\\p{L}])("+ks.map(w=>w+"(?:s|es)?").join("|")+")(?![\\p{L}])","u");
 const list=$("#lx-results");list.replaceChildren();$("#lx-side-extra").replaceChildren();let n=0;
 list.append(el("h3",{class:"lx-group-h"},"Vitruvio · traducción castellana V514"));
 for(const p of La.corpus.passages){if(p[0]!=="vitruvius"||!p[4]||!rx.test(fold(p[4])))continue;n++;
  const card=el("article",{class:"result-card"},el("div",{class:"kind"},"Vitruvio · V514"),el("h3",{},el("i",{},"De architectura")," ",el("span",{class:"lx-cite"},"Vitr. "+p[1])),el("p",{class:"lx-tr"},p[4].length>700?p[4].slice(0,700)+" …":p[4]),el("p",{class:"lx-kwic",lang:"la"},p[2].slice(0,400)+(p[2].length>400?" …":"")));
  const a=el("div",{class:"actions"});vitruvianLinks(p[1]).forEach(([t,u])=>a.append(el("a",{href:u},t)));card.append(a);list.append(card);if(n>=200)break}
 setState(`${n} pasajes de la traducción castellana de Vitruvio con ${words.join(", ")}.`);$("#results").scrollIntoView({behavior:"smooth"});
}

/* ---------- Visor bilingüe del pasaje ---------- */
const LECTOR_IDS={"herodotus-histories":"tlg0016.tlg001","euclid-elements":"tlg1799.tlg001","columella-rustica":"phi0845.phi002","pliny-naturalis":"phi0978.phi001","cato-agricultura":"stoa0079.stoa001","varro-rustica":"ll.varro-rustica","frontinus-aquaeductu":"ll.frontinus","cicero-officiis":"phi0474.phi055","caesar-gallico":"phi0448.phi001","lucretius":"phi0550.phi001","virgil-georgica":"phi0690.phi002","virgil-aeneid":"phi0690.phi003","apuleius-metamorphoses":"phi1212.phi002","catullus-carmina":"phi0472.phi001","petronius-satyrica":"phi0972.phi001","homer-iliad":"tlg0012.tlg001","homer-odyssey":"tlg0012.tlg002","plato-apology":"tlg0059.tlg002","aristotle-poetics":"tlg0086.tlg034","epictetus-enchiridion":"tlg0557.tlg002","theophrastus-characters":"tlg0093.tlg009"};
const VIT_ED={es:["data/structured/recensio-es.json","Castellano · Kurilo V514"],fr:["data/structured/recensio-fr.json","Français · Kurilo V554"],en:["data/structured/theory-en.json","English · Kurilo V297"]};
function viewerShell(title){
 document.getElementById("lx-viewer")?.remove();
 const dlg=el("dialog",{id:"lx-viewer",class:"lx-viewer","aria-label":title});
 const head=el("header",{class:"lx-viewer-head"},el("h3",{},title),el("button",{type:"button",class:"lx-btn",onclick:()=>{dlg.close();dlg.remove()}},T("Cerrar")+" ×"));
 const body=el("div",{class:"lx-viewer-body"});dlg.append(head,body);document.body.append(dlg);
 dlg.addEventListener("close",()=>dlg.remove());
 try{dlg.showModal()}catch{dlg.setAttribute("open","")}
 return body;
}
async function openViewer(D,p,spans,q){
 const w=work(D,p[0]);
 if(p[0]==="vitruvius"){
  const body=viewerShell(`Vitruvio, De architectura · ${p[1]}`);
  let ed=(S.ui==="fr"?"fr":S.ui==="en"?"en":"es"),locus=p[1];
  const bar=el("div",{class:"actions"});const grid=el("div",{class:"lx-viewer-grid"});body.append(bar,grid);
  const draw=async()=>{
   const data=await load(VIT_ED[ed][0]);const ps=data.passages;let i=ps.findIndex(x=>x.locus===locus);if(i<0)i=0;const x=ps[i];locus=x.locus;
   const ks=new Set(fold(q||"").split(/\s+/).filter(Boolean));const sp=[];for(const m of x.latin.matchAll(TOKEN))if(ks.has(fold(m[0])))sp.push([m.index,m.index+m[0].length]);
   const la=el("div",{class:"lx-viewer-col",lang:"la"},el("p",{class:"lx-small"},"Latín · V514 · Vitr. "+x.locus),el("p",{class:"lx-passage"}));la.lastChild.append(linkWords(x.latin,sp));
   const tr=el("div",{class:"lx-viewer-col",lang:ed},el("p",{class:"lx-small"},VIT_ED[ed][1]," · ",el("a",{href:"https://doi.org/"+EDITION_DOI[ed][0],target:"_blank",rel:"noopener"},"DOI "+EDITION_DOI[ed][0])),el("p",{class:"lx-tr"},x.translation||"—"));
   grid.replaceChildren(la,tr);
   bar.replaceChildren(el("button",{type:"button",disabled:i===0,onclick:()=>{locus=ps[i-1].locus;draw()}},"‹ "+(ps[i-1]?.locus||"")),...Object.entries(VIT_ED).map(([k,v])=>el("button",{type:"button","aria-pressed":String(k===ed),onclick:()=>{ed=k;draw()}},k.toUpperCase())),el("button",{type:"button",disabled:i>=ps.length-1,onclick:()=>{locus=ps[i+1].locus;draw()}},(ps[i+1]?.locus||"")+" ›"),...vitruvianLinks(x.locus).map(([t,u])=>el("a",{href:u},t)));
  };
  draw().catch(err=>body.append(el("p",{},err.message)));return;
 }
 const id=LECTOR_IDS[p[0]];const body=viewerShell(`${w.author}, ${w.title} · ${p[1]}`);
 if(!id){const c=el("p",{class:"lx-passage",lang:D.l});c.append(linkWords(p[2],spans));body.append(c);return}
 const u=`lector-clasico.html?obra=${encodeURIComponent(id)}&loc=${encodeURIComponent(p[1])}${q?"&q="+encodeURIComponent(q):""}&embed=1${D.l==="grc"||!["phi0474.phi055","phi0448.phi001","phi0550.phi001","phi0690.phi002","phi0690.phi003","phi1212.phi002","phi0472.phi001","phi0972.phi001"].includes(id)?"&extra=1":""}`;
 body.append(el("p",{class:"lx-small"},T("Original y traducción en el lector clásico del sitio (Perseus Digital Library). Si el lector no encuentra el mismo locus, abre la obra al comienzo: el pasaje de esta búsqueda se muestra debajo.")),el("iframe",{class:"lx-viewer-frame",src:u,title:`${w.author}, ${w.title}`,loading:"lazy"}),el("details",{},el("summary",{},T("Pasaje de esta búsqueda")),(()=>{const c=el("p",{class:"lx-passage",lang:D.l});c.append(linkWords(p[2],spans));return c})()),el("p",{},el("a",{href:u.replace("&embed=1",""),target:"_blank",rel:"noopener"},T("Abrir el lector en una pestaña")+" ↗")));
}




/* ---------- Citas en lenguaje natural ----------
   «libro I, ii de Vitruvio», «vitruvius pref I, II», «Vitr. 3.1.2», «Ilíada canto 6 verso 146»,
   «Heródoto II 35», «Plinio 36 95»: se reconoce la obra (nombre en castellano, latín, inglés o
   abreviatura canónica, con tolerancia a errores) y los números (arábigos o romanos). */
const CITE_WORKS=[["vitruvius",/^(vitruvi[oou]s?|vitr|vitrubio|vitrubius|de ?architectura|architectura)$/],["homer-iliad",/^(iliad[ae]?|il|hom ?il|homero|homer|homerus)$/],["homer-odyssey",/^(odisea|odyssey|odyssea|od|hom ?od)$/],["herodotus-histories",/^(herodoto|herodotus|hdt|herod|historias|histories)$/],["euclid-elements",/^(euclides|euclid|euc|elementos|elements|elementa)$/],["columella-rustica",/^(columela|columella|col)$/],["pliny-naturalis",/^(plinio|pliny|plinius|plin|naturalis|nat)$/],["cato-agricultura",/^(caton|cato|agr)$/],["varro-rustica",/^(varron|varro)$/],["frontinus-aquaeductu",/^(frontino|frontinus|frontin|aq|aquaeductu)$/],["cicero-officiis",/^(ciceron|cicero|cic|officiis|off)$/],["caesar-gallico",/^(cesar|caesar|caes|gal|gallico)$/],["lucretius",/^(lucrecio|lucretius|lucr)$/],["catullus-carmina",/^(catulo|catullus|catull)$/],["virgil-aeneid",/^(eneida|aeneid|aeneis|aen|virgilio|vergilio|virgil|vergil|verg)$/],["virgil-georgica",/^(georgicas|georgics|georgica)$/],["petronius-satyrica",/^(petronio|petronius|petr|satyricon|satyrica)$/],["apuleius-metamorphoses",/^(apuleyo|apuleius|apul|metamorfosis|metamorphoses|met)$/],["plato-apology",/^(platon|plato|apologia|apology|ap)$/],["aristotle-poetics",/^(aristoteles|aristotle|arist|poetica|poetics|po)$/],["epictetus-enchiridion",/^(epicteto|epictetus|epict|enchiridion|ench|manual)$/],["theophrastus-characters",/^(teofrasto|theophrastus|thphr|caracteres|characters|char)$/]];
const ROM={i:1,v:5,x:10,l:50,c:100};
function romanVal(t){if(!/^[ivxlc]{1,7}$/.test(t))return null;let n=0;for(let k=0;k<t.length;k++){const v=ROM[t[k]],w=ROM[t[k+1]]||0;n+=v<w?-v:v}return n>0&&n<400?n:null}
function parseCitation(q){
 const toks=String(q).normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/[.,;:()«»"'·\-–]/g," ").split(/\s+/).filter(Boolean);if(toks.length<2)return null;
 let wid=null,praef=false;const nums=[];const late={"virgil-georgica":1};
 for(let k=0;k<toks.length;k++){const t=toks[k],t2=k+1<toks.length?t+" "+toks[k+1]:null;
  const hit=CITE_WORKS.find(([,re])=>re.test(t)||(t2&&re.test(t2)));
  if(hit&&(!wid||late[hit[0]]||(wid==="homer-iliad"&&hit[0]==="homer-odyssey")||(wid==="virgil-aeneid"&&hit[0]==="virgil-georgica"))){wid=hit[0];if(t2&&hit[1].test(t2)&&!hit[1].test(t))k++;continue}
  if(/^(pr|pref|praef|praefatio|prefacio|proemio|prooemium|prologo|prologus|preface|proem)$/.test(t)){praef=true;continue}
  if(/^\d+[a-e]?$/.test(t)){nums.push(t);continue}
  const r=romanVal(t);if(r){nums.push(String(r));continue}
 }
 if(!wid||(!nums.length&&!praef))return null;
 let locus;
 if(praef)locus=wid==="vitruvius"?[nums[0]||"1","praef",...nums.slice(1)].join("."):["praef",...nums].join(".");
 else locus=nums.join(".");
 return{wid,locus};
}
async function openCitation(c,q){
 const l=["herodotus-histories","euclid-elements","homer-iliad","homer-odyssey","plato-apology","aristotle-poetics","theophrastus-characters","epictetus-enchiridion"].includes(c.wid)?"grc":"la";
 const D=await lang(l,true);S.D=D;fillWorks(D);const w=work(D,c.wid);
 setState(`${T("Cita reconocida")}: «${q}» → ${w.cite||w.author} ${c.locus} (${w.author}, ${w.title}).`);
 await openLocus(c.wid,c.locus,"");
 const n=D.corpus.passages.filter(p=>p[0]===c.wid&&(p[1]===c.locus||String(p[1]).startsWith(c.locus+"."))).length;
 if(n>1){const more=el("p",{class:"lx-small"},`${T("El locus comprende")} ${n} ${T("pasajes")}. `,el("button",{type:"button",class:"lx-btn",onclick:()=>{const list=$("#lx-results");list.replaceChildren();const hs=[];D.corpus.passages.forEach((p,i)=>{if(p[0]===c.wid&&(p[1]===c.locus||String(p[1]).startsWith(c.locus+".")))hs.push({i,spans:[[0,0]]})});S.allHits=hs;renderHits(D,{hits:hs})}},T("Mostrarlos todos")));$("#lx-results").prepend(more)}
}
/* ---------- Búsqueda por grupos de palabras ----------
   Cada palabra (moderna o antigua) se resuelve a lemas latinos y griegos: por el glosario de
   conceptos (data/lexicon/conceptus.json), por su presencia en el corpus o por transliteración.
   +palabra = obligatoria en el pasaje; -palabra = excluida. */
/* Tolerancia a errores de tipeo y a grafías vulgares: concepto más próximo por distancia de edición
   (≤1 en palabras cortas, ≤2 en largas) y, en latín, la forma atestiguada más próxima. */
async function findConceptFuzzy(w){
 const C=await conceptus();const k=fold(w).replace(/[^a-z\u0370-\u03ff\u1f00-\u1fff]/g,"");if(k.length<4)return null;const tol=k.length>6?2:1;let best=null;
 for(const c of C)for(const m of [...Object.values(c.modern).flat(),...c.la,...c.grc]){const f=fold(m);if(Math.abs(f.length-k.length)>tol)continue;const d=lev(k,f,tol);if(d<=tol&&(!best||d<best.d))best={c,d,m}}
 return best;
}
function nearestForm(D,w){const k=fold(w);if(k.length<4)return null;const tol=k.length>6?2:1;let best=null;for(const x of D.keys){if(x[0]!==k[0]||Math.abs(x.length-k.length)>tol)continue;const d=lev(k,x,tol);if(d<=tol&&(!best||d<best.d||(d===best.d&&(D.freq.get(x)||0)>(D.freq.get(best.x)||0))))best={x,d}}return best?.x||null}
async function resolveGroupWord(w){
 const out={w,la:new Set(),grc:new Set(),via:[]};let c=await findConcept(w);
 if(!c&&!GREEK.test(w)){const La0=await lang("la",true);const k0=fold(w);if(!La0.post.has(k0)&&!analyses(La0,k0).length){const f=await findConceptFuzzy(w);if(f){c=f.c;out.via.push(`${T("corregido")}: ${w} → ${f.m}`)}}}
 if(c){c.la.forEach(x=>out.la.add(x));c.grc.forEach(x=>out.grc.add(x));out.via.push(T("glosario")+": "+(c.modern.es?.[0]||c.id))}
 if(GREEK.test(w))out.grc.add(w);
 else{const La=await lang("la",true);const k=fold(w);if(La.post.has(k)||analyses(La,k).length){out.la.add(w);out.via.push(T("forma latina"))}
  else if(!c){const G=await lang("grc",true);const g=transIndex(G).get(latinTranslitKey(w));if(g?.length){out.grc.add(g[0]);out.via.push(T("transliteración"))}
   else{const nf=nearestForm(La,w);if(nf){out.la.add(nf);out.via.push(`${T("corregido")}: ${w} → ${nf}`)}}}}
 return out;
}
async function renderGroupSearch(q){
 const raw=q.split(/[,;|\s]+/).map(x=>x.trim()).filter(Boolean);if(!raw.length)return;
 const items=raw.map(x=>({sign:x[0]==="+"?"+":x[0]==="-"?"-":"",w:x.replace(/^[+-]/,"")})).filter(x=>x.w);
 setState(T("Resolviendo el grupo de palabras…"));
 const R=await Promise.all(items.map(async it=>({...it,...await resolveGroupWord(it.w)})));
 const box=$("#lx-entry");box.hidden=false;
 box.replaceChildren(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · GRUPO DE PALABRAS"),el("h2",{},items.map(x=>x.sign+x.w).join(" · ")),el("p",{class:"article-byline"},T("Cada término se busca por lema (todas sus formas) en el corpus latino y griego; la concordancia conjunta reúne los pasajes donde aparece cualquiera de ellos."))));
 const table=el("table",{class:"lx-table"},el("thead",{},el("tr",{},...[T("Término"),T("Resolución"),T("Lengua"),T("Lema"),T("Pasajes"),T("Obras principales")].map(h=>el("th",{},h)))));const tb=el("tbody",{});table.append(tb);box.append(table);
 const per={la:new Map(),grc:new Map()};const req={la:[],grc:[]},exc={la:[],grc:[]};const rows=new Map();
 for(const r of R){let any=false;
  for(const l of ["la","grc"]){const terms=[...r[l]];if(!terms.length)continue;const D=await lang(l,true);
   for(const t of terms){const rk=l+"\u0000"+t+"\u0000"+r.sign;if(rows.has(rk)){const td=rows.get(rk);td.append(" · "+r.sign+r.w);any=true;continue}
    const parsed=parseQuery(GREEK.test(t)||l==="la"?t:t,"palabra");if(parsed.steps.length===1&&parsed.steps[0].term.type==="form")parsed.steps[0].term={type:"lemma",v:t,fallback:true};
    let res=execute(D,parsed,{lemmatize:true,variants:true,work:S.work,defaultGap:6});if(!res.hits.length)res=execute(D,parseQuery(t,"palabra"),{lemmatize:true,variants:true,work:S.work,defaultGap:6});
    const set=new Set(res.hits.map(h=>h.i));if(r.sign==="+")req[l].push(set);if(r.sign==="-"){exc[l].push(set);continue}
    for(const h of res.hits)if(!per[l].has(h.i))per[l].set(h.i,h);
    const by={};for(const h of res.hits){const id=D.corpus.passages[h.i][0];by[id]=(by[id]||0)+1}
    const top=Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([id,n])=>`${work(D,id).cite||work(D,id).author} ${n}`).join(" · ");any=true;
    const tdW=el("td",{},r.sign+r.w);rows.set(rk,tdW);
    tb.append(el("tr",{},tdW,el("td",{class:"lx-small"},r.via.join(" · ")||"—"),el("td",{},l==="la"?"latín":"griego"),el("td",{},el("button",{type:"button",class:"lx-formlink",lang:l,onclick:()=>{$("#lx-q").value=t;S.lang=l;$("#lx-lang").value=l;S.mode="palabra";renderTabs();run()}},t)),el("td",{},String(set.size)),el("td",{class:"lx-small"},top||"—")))}}
  if(!any)tb.append(el("tr",{},el("td",{},r.sign+r.w),el("td",{class:"lx-small",colspan:"5"},T("Sin equivalente antiguo registrado ni forma atestiguada en el corpus. Pruebe con un sinónimo o con la palabra latina o griega."))))}
 const filt=l=>{let hs=[...per[l].values()];for(const s of req[l])hs=hs.filter(h=>s.has(h.i));for(const s of exc[l])hs=hs.filter(h=>!s.has(h.i));return hs.sort((a,b)=>a.i-b.i)};
 const la=filt("la"),gr=filt("grc");
 const show=async l=>{const D=await lang(l,true);S.D=D;fillWorks(D);const hs=l==="la"?la:gr;S.allHits=hs;S.result={hits:hs,parsed:{steps:[]}};$("#lx-results").replaceChildren();$("#lx-side-extra").replaceChildren();renderHits(D,{hits:hs});const sw=el("p",{class:"lx-small"},T("Concordancia conjunta")+": ",el("button",{type:"button",class:"lx-btn","aria-pressed":String(l==="la"),onclick:()=>show("la")},`latín (${la.length})`)," ",el("button",{type:"button",class:"lx-btn","aria-pressed":String(l==="grc"),onclick:()=>show("grc")},`griego (${gr.length})`));$("#lx-results").prepend(sw)};
 if(!la.length&&!gr.length){setState(T("Ningún término del grupo tiene pasajes en el corpus local."));return}
 await show(la.length>=gr.length?"la":"grc");
}
/* ---------- Traducción alineada en la concordancia ----------
   Vitruvio: ediciones Kurilo (ES V514 · FR V554 · EN V297) por locus, en el idioma de la interfaz.
   Demás obras: traducción inglesa de Perseus (TEI, CC BY-SA 4.0) leída desde GitHub y alineada por
   libro y verso (poesía) o por capítulo / sección (prosa). */
const TR_DOCS=new Map();
async function perseusCatalog(){const [a,b]=await Promise.all([load("data/clasicos-perseus.json"),load("data/clasicos-perseus-extra.json").catch(()=>[])]);const arr=x=>Array.isArray(x)?x:(x.works||[]);return [...arr(a),...arr(b)]}
const entityBox=document.createElement("textarea");
function decodeEntities(xml){return String(xml).replace(/<!DOCTYPE[^>[]*(\[[^\]]*\])?>/i,"").replace(/&([a-zA-Z][a-zA-Z0-9]*);/g,(m,n)=>{if(/^(amp|lt|gt|quot|apos)$/.test(n))return m;entityBox.innerHTML=m;const c=entityBox.value;return c===m?"":c.replace(/&/g,"&amp;").replace(/</g,"&lt;")})}
function teiUnits(xml){
 const doc=new DOMParser().parseFromString(decodeEntities(xml),"text/xml");const body=doc.getElementsByTagNameNS("*","body")[0];if(!body)return [];
 const SKIP=new Set(["note","bibl","del","head","foreign-note"]);const out=[];
 const clean=t=>t.replace(/\s+/g," ").trim();
 const isPart=d=>(d.localName==="div"&&d.getAttribute("type")==="textpart")||/^div\d$/.test(d.localName);
 const textOf=n=>{let t="";const w=x=>{for(const c of x.childNodes){if(c.nodeType===3)t+=c.nodeValue;else if(c.nodeType===1&&!SKIP.has(c.localName))w(c)}};w(n);return clean(t)};
 function leaf(node,path){
  const book=path.length>1?path.slice(0,-1).join("."):path.join(".");
  const ls=[...node.getElementsByTagNameNS("*","l")];
  if(ls.length>2){let n=Number(path.at(-1))||1;const numbered=ls.some(l=>l.getAttribute("n"));if(!numbered&&path.length>1)n=Number(path.at(-1))||1;else if(!numbered)n=1;
   for(const l of ls){const v=Number(String(l.getAttribute("n")||"").match(/\d+/)?.[0]);if(!isNaN(v))n=v;out.push({book:path.length>1?book:path.join("."),line:n,text:textOf(l)});n++}return}
  const ms=[...node.getElementsByTagNameNS("*","milestone")];const unit=ms.some(m=>m.getAttribute("unit")==="section")?"section":ms.some(m=>m.getAttribute("unit")==="chapter")?"chapter":null;
  if(unit){let cur=null,buf="";const flush=()=>{if(cur!=null&&clean(buf))out.push({locus:[...path,cur].filter(Boolean).join("."),text:clean(buf)});buf=""};
   const w=x=>{for(const c of x.childNodes){if(c.nodeType===3)buf+=c.nodeValue;else if(c.nodeType===1){if(c.localName==="milestone"&&c.getAttribute("unit")===unit){flush();cur=c.getAttribute("n")}else if(!SKIP.has(c.localName))w(c)}}};w(node);flush();return}
  const t=textOf(node);if(!t)return;
  if(path.length>1&&/card/.test(node.getAttribute("subtype")||""))out.push({book,card:Number(path.at(-1)),text:t});else out.push({locus:path.join("."),text:t});
 }
 function walk(node,path){const kids=[...node.children].filter(isPart);if(!kids.length)return leaf(node,path);kids.forEach((k,i)=>walk(k,[...path,k.getAttribute("n")||String(i+1)]))}
 const top=[...body.children].filter(d=>d.localName==="div"&&!isPart(d));
 if(top.length)top.forEach(d=>walk(d,[]));else walk(body,[]);
 for(const u of out)if(u.locus)u.locus=u.locus.replace(/(^|\.)(dedication|preface|pr)(?=\.|$)/i,"$1praef");
 return out;
}
async function perseusUnits(workId){
 const id=LECTOR_IDS[workId];if(!id)return null;
 if(!TR_DOCS.has(id))TR_DOCS.set(id,(async()=>{const c=(await perseusCatalog()).find(w=>w.id===id);const u=c?.translations?.find(t=>t.language==="en")?.url||c?.translations?.[0]?.url;if(!u)return null;const r=await fetch(u);if(!r.ok)throw new Error("HTTP "+r.status);return teiUnits(await r.text())})());
 return TR_DOCS.get(id);
}
function alignTranslation(U,p){
 if(!U?.length)return "";
 const parts=p[1].split(".");
 if(typeof p[3]==="number"){
  const book=parts.length>1?parts.slice(0,-1).join("."):parts[0];const s=p[3],e=s+Math.max(0,String(p[2]).split("\n").length-1);
  const ls=U.filter(u=>u.line!=null&&u.book===book&&u.line>=s&&u.line<=e);if(ls.length)return{text:ls.map(u=>u.text).join(" / "),grade:"verso"};
  const cs=U.filter(u=>u.card!=null&&u.book===book).sort((a,b)=>a.card-b.card);const hit=cs.filter((c,i)=>c.card<=e&&(cs[i+1]?cs[i+1].card-1:Infinity)>=s);if(hit.length)return{text:hit.map(c=>c.text).join(" "),grade:"tramo"};
 }
 const ex=U.find(u=>u.locus===p[1]);if(ex)return{text:ex.text,grade:"exacta"};
 const kids=U.filter(u=>u.locus?.startsWith(p[1]+"."));if(kids.length)return{text:kids.map(u=>u.text).join(" "),grade:"exacta"};
 for(let k=parts.length-1;k>0;k--){const pre=parts.slice(0,k).join(".");const c=U.filter(u=>u.locus===pre&&u.text.length<2500);if(c.length)return{text:c[0].text,grade:"capítulo"}}
 /* Prosa sin subdivisiones en la traducción (Apuleyo): reparto proporcional dentro del libro. */
 const bk=U.filter(u=>u.locus===parts[0]);if(bk.length&&parts.length>1){const D_=S.D;const same=D_?D_.corpus.passages.filter(q=>q[0]===p[0]&&String(q[1]).split(".")[0]===parts[0]):[];const idx=same.findIndex(q=>q[1]===p[1]);if(idx>=0&&same.length){const t=bk[0].text;const a=Math.floor(idx/same.length*t.length),b=Math.floor((idx+1)/same.length*t.length);const cut=x=>{const m=t.slice(x).search(/[.;:!?]\s/);return m<0?x:x+m+2};return{text:(idx?"… ":"")+t.slice(idx?cut(a):0,cut(b)).trim()+" …",grade:"proporcional"}}}
 /* Numeraciones distintas (Plinio: parágrafos de Mayhoff en el latín, capítulos de Bostock en la traducción):
    se elige el capítulo que ocupa la misma posición relativa dentro del libro, según la extensión del texto. */
 const chs=U.filter(u=>u.locus&&u.locus.split(".")[0]===parts[0]&&u.locus.includes("."));
 if(chs.length&&parts.length>1&&S.D){const same=S.D.corpus.passages.filter(q=>q[0]===p[0]&&String(q[1]).split(".")[0]===parts[0]);const idx=same.findIndex(q=>q[1]===p[1]);
  if(idx>=0){let tot=0;const cum=chs.map(u=>tot+=u.text.length);let pre=0;for(let k=0;k<idx;k++)pre+=same[k][2].length;const all=same.reduce((a,q)=>a+q[2].length,0)||1;const target=(pre+same[idx][2].length/2)/all*tot;const k=Math.max(0,cum.findIndex(c=>c>=target));const u=chs[k];return{text:u.text,grade:"proporcional",locus:u.locus}}}
 return null;
}
async function translationOf(D,p){
 if(p[0]==="vitruvius"){const ed=S.ui==="fr"?"fr":S.ui==="en"?"en":"es";const data=await load(VIT_ED[ed][0]);const x=data.passages.find(z=>z.locus===p[1]);if(x?.translation)return{text:x.translation,src:"Vitruvio · "+VIT_ED[ed][1]+" · https://doi.org/"+EDITION_DOI[ed][0]};if(p[4])return{text:p[4],src:"Vitruvio · Castellano · Kurilo V514"};return null}
 const U=await perseusUnits(p[0]);const t=alignTranslation(U,p);if(!t)return null;const G={exacta:T("alineación exacta por locus"),verso:T("alineación por número de verso"),tramo:T("alineación por tramo de versos (aproximada)"),"capítulo":T("alineación por capítulo (aproximada)"),proporcional:T("alineación proporcional dentro del libro (orientativa)")};return{text:t.text,src:T("Traducción inglesa · Perseus Digital Library (CC BY-SA 4.0)")+(t.locus?" · "+T("sección")+" "+t.locus:"")+" · "+G[t.grade],grade:t.grade};
}
async function fillTranslation(D,p,box){
 if(box.dataset.done)return;box.dataset.done="1";box.replaceChildren(el("p",{class:"lx-small"},T("Cargando traducción…")));
 try{const r=await translationOf(D,p);if(!r){box.replaceChildren(el("p",{class:"lx-small"},T("No hay traducción disponible para este pasaje en el sitio.")));return}
  const t=r.text.length>1400?r.text.slice(0,1400)+" …":r.text;box.replaceChildren(el("p",{class:"lx-tr",lang:p[0]==="vitruvius"?(S.ui==="fr"?"fr":S.ui==="en"?"en":"es"):"en"},t),el("p",{class:"lx-small"+(r.grade&&r.grade!=="exacta"&&r.grade!=="verso"?" lx-approx":"")},r.src))}
 catch(err){box.dataset.done="";box.replaceChildren(el("p",{class:"lx-small"},T("No se pudo cargar la traducción")+" ("+err.message+")."))}
}
/* ---------- Lemas ambiguos y correcciones verificadas ----------
   La lematización es por tabla de formas (sin contexto): cuando una forma admite varios lemas se
   avisa en el pasaje. data/lexicon/lemma-corrections.json guarda las asignaciones verificadas a
   mano por pasaje (obra · locus · forma → lema), que prevalecen sobre la tabla. */
let CORR=null;load("data/lexicon/lemma-corrections.json").then(j=>{CORR=j}).catch(()=>{CORR={}});
function verifiedLemma(D,p,form){const own=(o,k)=>o&&Object.hasOwn(o,k)?o[k]:null;const c=own(own(CORR,D.l),`${p[0]} ${p[1]}`);const v=own(c,fold(form));return typeof v==="string"?v:null}
/* Lemas por contexto (data/lexicon/context-la.json, scripts/annotate-latin-context.py): para cada forma
   ambigua, el lema que el analizador Stanza elige en ese pasaje, siempre entre los candidatos de la tabla. */
let CTX=null,CTXP=null;
function loadContext(){if(!CTXP)CTXP=load("data/lexicon/context-la.json").then(j=>{CTX={model:j.model,stats:j.stats,loci:j.loci};return CTX}).catch(()=>{CTX={loci:{}};return CTX});return CTXP}
function ctxLemma(D,p,start){
 if(D.l!=="la"||!CTX?.loci)return null;const key=`${p[0]} ${p[1]}`;const raw=CTX.loci[key];if(!raw)return null;
 const m=(D._ctxm=D._ctxm||new Map());let mp=m.get(key);
 if(!mp){mp=new Map();const picks=new Map(raw.split(",").map(x=>x.split(":").map(Number)));let i=0;for(const t of p[2].matchAll(TOKEN)){if(picks.has(i))mp.set(t.index,{k:picks.get(i),f:t[0]});i++}m.set(key,mp)}
 const e=mp.get(start);if(!e)return null;const an=analyses(D,fold(e.f).replace(/'+$/,""));return an[e.k]?.[0]||null;
}
function ambiguity(D,text,spans,p){
 const parts=[];let state="verified";
 for(const [a,b] of spans){const f=text.slice(a,b);const v=verifiedLemma(D,p,f);if(v){parts.push(el("span",{class:"lx-verified"},`${f} → ${lemmaDisplay(v)} ✓`));continue}
  const lems=[...new Set(analyses(D,fold(f).replace(/'+$/,"")).map(x=>x[0]))];if(lems.length<2)continue;
  const c=ctxLemma(D,p,a);if(c){parts.push(el("span",{class:"lx-ctx"},`${f} → ${lemmaDisplay(c)}`,el("small",{}," ("+T("descartados")+": "+lems.filter(x=>x!==c).slice(0,3).map(lemmaDisplay).join(", ")+")")));if(state==="verified")state="ctx";continue}
  state="amb";parts.push(el("span",{},`${f} → ${lems.slice(0,4).map(lemmaDisplay).join(" / ")}`))}
 if(!parts.length)return null;
 const L={verified:[T("Lema verificado")+": ",T("Lema verificado a mano en este pasaje")],ctx:[T("Lema por contexto")+": ",T("Elegido por el analizador Stanza según el contexto, entre los lemas posibles de la forma. Análisis automático: verifíquese en el pasaje.")],amb:[T("Lema ambiguo")+": ",T("La forma admite más de un lema; la tabla automática no decide por el contexto. Verifíquese en el pasaje.")]}[state];
 const line=el("p",{class:"lx-ambig"+(state==="ctx"?" lx-ambig-ctx":""),title:L[1]},L[0]);
 parts.forEach((x,i)=>{if(i)line.append(" · ");line.append(x)});return line;
}
function ambiguityCount(D,hits){let n=0;for(const h of hits.slice(0,3000)){const p=D.corpus.passages[h.i];if(h.spans.some(([a,b])=>{const f=p[2].slice(a,b);return !verifiedLemma(D,p,f)&&!ctxLemma(D,p,a)&&new Set(analyses(D,fold(f).replace(/'+$/,"")).map(x=>x[0])).size>1}))n++}return n}
/* ---------- Citabilidad: URN CTS, enlace estable versionado, estilos y formatos bibliográficos ----------
   Cada pasaje se cita con su referencia canónica, su identificador CTS (cuando la obra lo tiene en Perseus /
   Open Greek and Latin), la edición de base y la versión de los datos del Lexicon con que se consultó. */
const CTS_ID={vitruvius:"latinLit:phi1056.phi001","herodotus-histories":"greekLit:tlg0016.tlg001","euclid-elements":"greekLit:tlg1799.tlg001","columella-rustica":"latinLit:phi0845.phi002","pliny-naturalis":"latinLit:phi0978.phi001","cato-agricultura":"latinLit:stoa0079.stoa001"};
function ctsUrn(p){let id=CTS_ID[p[0]];if(!id){const x=LECTOR_IDS[p[0]];if(x&&/^(phi|tlg|stoa)\d/.test(x))id=(x.startsWith("tlg")?"greekLit:":"latinLit:")+x}return id?`urn:cts:${id}:${p[1]}`:null}
/* DOI del proyecto (CITATION.cff): Vitruvius Digital Library, Zenodo. */
const SITE_DOI="10.5281/zenodo.23868911";
/* DOI de las ediciones de Vitruvio de Diego A. Kurilo (auditoria.html): el latín del corpus es la recensio V514. */
const EDITION_DOI={es:["10.5281/zenodo.23884757","V514, latín-castellano"],fr:["10.5281/zenodo.23885110","V554, latín-francés"],en:["10.5281/zenodo.23885404","V297, latín-inglés"]};
function permalink(p){const u=new URL(PAGE);u.searchParams.set("work",p[0]);u.searchParams.set("locus",p[1]);if(DATA_VER)u.searchParams.set("dv",DATA_VER);return u.toString()}
function citeData(D,p,cite){
 const w=work(D,p[0]);const today=new Date().toISOString().slice(0,10);const year=new Date().getFullYear();
 const edDoi=p[0]==="vitruvius"?EDITION_DOI.es[0]:null;const ed=(w.edition||"").replace(/\s+/g," ").trim()+(edDoi?`, https://doi.org/${edDoi}`:"");const url=permalink(p);const urn=ctsUrn(p);const ver=DATA_VER?`${T("versión de datos")} ${DATA_VER}`:"";
 return{w,ed,edDoi,url,urn,ver,today,year,
  chicago:`${w.author}, ${w.title}, ${cite.replace(w.cite+" ","")}. ${ed?ed+". ":""}${T("En")} Vitruvia Lexicon, ${T("ed.")} Diego A. Kurilo${ver?", "+ver:""}. Vitruvius Digital Library. https://doi.org/${SITE_DOI}. ${url}${urn?" ("+urn+")":""} (${T("consultado el")} ${today}).`,
  apa:`${w.author}. (${T("s. f.")}). ${w.title} (${cite.replace(w.cite+" ","")})${ed?". "+ed:""}. ${T("En")} D. A. Kurilo (Ed.), Vitruvia Lexicon${ver?" ["+ver+"]":""}. Vitruvius Digital Library. https://doi.org/${SITE_DOI}. ${url}`,
  mla:`${w.author}. ${w.title}, ${cite.replace(w.cite+" ","")}. ${ed?ed+". ":""}Vitruvia Lexicon, ${T("editado por")} Diego A. Kurilo, Vitruvius Digital Library, ${year}, https://doi.org/${SITE_DOI}, ${url}. ${T("Consultado el")} ${today}.`}
}
function bibtex(D,p,cite,c){const key=(p[0]+"_"+p[1]).replace(/[^A-Za-z0-9_]/g,"_");const e=s=>String(s).replace(/[{}\\]/g,"");return `@misc{${key},\n  author = {${e(c.w.author)}},\n  title = {${e(c.w.title)}, ${e(cite)}},\n  howpublished = {Vitruvia Lexicon, ed. Diego A. Kurilo. Vitruvius Digital Library},\n  doi = {${c.edDoi||SITE_DOI}},\n  note = {${e(c.ed)}${c.urn?"; "+c.urn:""}${c.ver?"; "+c.ver:""}${c.edDoi?"; Vitruvius Digital Library, https://doi.org/"+SITE_DOI:""}},\n  url = {${c.url}},\n  urldate = {${c.today}}\n}\n`}
function ris(D,p,cite,c){return ["TY  - GEN",`AU  - ${c.w.author}`,`TI  - ${c.w.title}, ${cite}`,`T2  - Vitruvia Lexicon`,`ED  - Kurilo, Diego A.`,`UR  - ${c.url}`,`DO  - ${c.edDoi||SITE_DOI}`,`Y2  - ${c.today}`,c.urn?`M1  - ${c.urn}`:"",`N1  - ${c.ed}${c.ver?"; "+c.ver:""}`,"ER  - ",""].filter(Boolean).join("\r\n")}
function citeMenu(D,p,cite,snippet){
 const det=el("details",{class:"lx-cite-menu"},el("summary",{},T("Citar")));
 det.addEventListener("toggle",()=>{if(!det.open||det.querySelector(".lx-cite-box"))return;const c=citeData(D,p,cite);
  const box=el("div",{class:"lx-cite-box"});
  const row=(label,txt)=>el("p",{},el("b",{},label+": "),el("span",{class:"lx-cite-txt"},txt)," ",el("button",{type:"button",class:"lx-btn",onclick:e=>copy(txt,e.target)},T("Copiar")));
  box.append(row("Chicago",c.chicago),row("APA",c.apa),row("MLA",c.mla));
  if(c.urn)box.append(row("URN CTS",c.urn));
  if(c.edDoi)box.append(row(T("DOI de la edición")+" (V514)",`https://doi.org/${c.edDoi}`));
  box.append(row(T("DOI del proyecto"),`https://doi.org/${SITE_DOI}`));
  box.append(row(T("Enlace estable"),c.url),row(T("Cita con texto"),`${cite}: «${snippet.replace(/\s+/g," ").trim()}» — ${c.w.author}, ${c.w.title}. ${c.ed}. Vitruvia Lexicon, ${c.url}`));
  box.append(el("p",{},el("button",{type:"button",class:"lx-btn",onclick:()=>download(`${p[0]}-${p[1]}.bib`,bibtex(D,p,cite,c),"application/x-bibtex")},"BibTeX (.bib)")," ",el("button",{type:"button",class:"lx-btn",onclick:()=>download(`${p[0]}-${p[1]}.ris`,ris(D,p,cite,c),"application/x-research-info-systems")},"RIS (.ris) · Zotero, EndNote, Mendeley")));
  box.append(el("p",{class:"lx-small"},T("La versión de datos identifica el estado exacto del corpus consultado; el conector de Zotero detecta además cada pasaje de la página (COinS).")));
  det.append(box)});
 return det;
}
/* COinS (OpenURL en un span): el conector de Zotero reconoce cada pasaje de la página como un registro. */
function coins(D,p){const w=work(D,p[0]);const q=new URLSearchParams({ctx_ver:"Z39.88-2004",rft_val_fmt:"info:ofi/fmt:kev:mtx:book","rft.genre":"bookitem","rft.atitle":`${w.title} ${p[1]}`,"rft.btitle":"Vitruvia Lexicon","rft.au":w.author,"rft.pub":"Vitruvius Digital Library","rft_id":permalink(p)});const u=ctsUrn(p);if(u)q.append("rft_id",u);q.append("rft_id","info:doi/"+SITE_DOI);return el("span",{class:"Z3988",title:q.toString().replace(/\+/g,"%20"),"aria-hidden":"true"})}
/* ---------- Posibles fuentes y paralelos de Vitruvio (scripts/build-vitruvius-paralleli.py) ---------- */
let PARALLELI=null;
function paralleliBox(D,p){
 const det=el("details",{class:"lx-also lx-par"},el("summary",{},T("Posibles fuentes y paralelos")+"…"));
 PARALLELI=PARALLELI||load("data/lexicon/paralleli-vitruvius.json").catch(()=>null);
 PARALLELI.then(P=>{const c=P?.loci?.[p[1]];if(!c?.length){det.remove();return}det.firstChild.textContent=`${T("Posibles fuentes y paralelos")} (${c.length})`;
  det.addEventListener("toggle",()=>{if(!det.open||det.querySelector("ol"))return;
   D._idx=D._idx||new Map(D.corpus.passages.map((q,i)=>[q[0]+"\u0000"+q[1],i]));
   const ol=el("ol",{});
   for(const [wid,loc,sc,shared] of c){const i=D._idx.get(wid+"\u0000"+loc);const q=i!=null?D.corpus.passages[i]:null;const w=work(D,wid);
    const keys=new Set(shared.map(fold));const spans=[];if(q)for(const m of q[2].matchAll(TOKEN)){const an=analyses(D,fold(m[0]).replace(/'+$/,""));if((an.length?an.map(a=>fold(lemmaDisplay(a[0]))):[fold(m[0])]).some(x=>keys.has(x)))spans.push([m.index,m.index+m[0].length])}
    const li=el("li",{},el("b",{},`${w.cite||w.author} ${loc}`)," ",el("small",{},`· ${T("afinidad")} ${sc.toFixed(2)} · `,el("span",{lang:"la"},shared.slice(0,6).join(", "))));
    if(q){const k=kwic(q[2],spans.length?spans:[[0,0]],22);const snip=el("p",{class:"lx-kwic lx-par-snip",lang:"la"});snip.append(k.pre?"… ":"",linkWords(q[2].slice(k.a,k.b),spans.map(([a,b])=>[a-k.a,b-k.a])," / "),k.post?" …":"");li.append(snip,el("button",{type:"button",class:"lx-btn",onclick:()=>openViewer(D,q,spans,S.q)},T("Leer con traducción")))}
    ol.append(li)}
   det.append(el("p",{class:"lx-small"},T("Afinidad léxica (coseno tf-idf entre lemas). Son candidatos para el estudio de fuentes y recepción: la coincidencia puede deberse al tema común y no a una relación textual.")),ol)})});
 return det;
}
/* ---------- «También en…»: otras obras del corpus donde aparece la consulta ---------- */
function alsoIn(D,p){
 const all=S.allHits||[];const by=new Map();
 for(const h of all){const q=D.corpus.passages[h.i];if(!q||q[0]===p[0])continue;if(!by.has(q[0]))by.set(q[0],[]);by.get(q[0]).push(h)}
 if(!by.size)return null;
 const ids=[...by.keys()].sort((a,b)=>(CHRONO[a]??0)-(CHRONO[b]??0));const n=ids.reduce((a,id)=>a+by.get(id).length,0);
 const det=el("details",{class:"lx-also"},el("summary",{},`${T("También en")} ${ids.length} ${ids.length===1?T("obra"):T("obras")} · ${n} ${n===1?T("pasaje"):T("pasajes")}`));
 det.addEventListener("toggle",()=>{if(!det.open||det.querySelector("ul"))return;const ul=el("ul",{});
  for(const id of ids){const w=work(D,id);const hs=by.get(id);
   const li=el("li",{},el("button",{type:"button",class:"lx-btn",title:T("Filtrar por esta obra"),onclick:()=>{S.work=id;$("#lx-work").value=id;run()}},`${w.author} · `,el("i",{},w.title),` (${hs.length})`)," ");
   hs.slice(0,4).forEach(h=>{const q=D.corpus.passages[h.i];li.append(el("button",{type:"button",class:"lx-locus-btn",title:T("Leer con traducción"),onclick:()=>openViewer(D,q,h.spans,S.q)},citeOf(D,q,h.spans[0][0]).replace(w.cite+" ","")))});
   if(hs.length>4)li.append(el("span",{class:"lx-small"}," …"));ul.append(li)}
  det.append(ul)});
 return det;
}
/* ---------- Herramientas de lectura: traducción, tamaño, color del resaltado, lupa ---------- */
const READ=(()=>{try{return Object.assign({tr:false,fs:17,mark:"",lupa:false},JSON.parse(localStorage.getItem("vitruvia-lexicon-read")||"{}"))}catch{return{tr:false,fs:17,mark:"",lupa:false}}})();
const MARKS=[["","Gris"],["#7a5c12","Oro"],["#6b1f1f","Rojo"],["#1f4f6b","Azul"],["#2f5d36","Verde"],["#5a2f6b","Violeta"]];
function applyRead(){const r=$("#lx-results");if(!r)return;r.style.setProperty("--lx-fs",READ.fs+"px");if(READ.mark)r.style.setProperty("--lx-mark",READ.mark);else r.style.removeProperty("--lx-mark");r.classList.toggle("lx-lupa-on",!!READ.lupa);r.classList.toggle("lx-marked",!!READ.mark);try{localStorage.setItem("vitruvia-lexicon-read",JSON.stringify(READ))}catch{}}
function readingToolbar(){
 const bar=el("div",{class:"lx-readbar",role:"toolbar","aria-label":T("Herramientas de lectura")});
 const trB=el("button",{type:"button","aria-pressed":String(READ.tr),onclick:()=>{READ.tr=!READ.tr;trB.setAttribute("aria-pressed",String(READ.tr));for(const c of document.querySelectorAll("#lx-results .lx-hit")){const b=c.querySelector(".lx-hit-tr");if(!b)continue;b.hidden=!READ.tr;if(READ.tr)c._tr?.()}applyRead()}},T("Traducción"));
 const lupa=el("button",{type:"button","aria-pressed":String(READ.lupa),title:T("Agranda la línea bajo el cursor"),onclick:()=>{READ.lupa=!READ.lupa;lupa.setAttribute("aria-pressed",String(READ.lupa));applyRead()}},"🔍 "+T("Lupa"));
 bar.append(trB,el("button",{type:"button",title:"A−",onclick:()=>{READ.fs=Math.max(13,READ.fs-1);applyRead()}},"A−"),el("button",{type:"button",title:"A+",onclick:()=>{READ.fs=Math.min(30,READ.fs+1);applyRead()}},"A+"),lupa,el("span",{class:"lx-small"},T("Resaltado")+":"));
 for(const [c,n] of MARKS)bar.append(el("button",{type:"button",class:"lx-swatch",title:n,"aria-label":n,style:`background:${c||"#565656"}`,onclick:()=>{READ.mark=c;applyRead()}}));
 setTimeout(applyRead,0);return bar;
}
/* ---------- Isopsefía griega y guematría hebrea (valores tradicionales) ---------- */
const GR_NUM={α:1,β:2,γ:3,δ:4,ε:5,ϛ:6,ϝ:6,ζ:7,η:8,θ:9,ι:10,κ:20,λ:30,μ:40,ν:50,ξ:60,ο:70,π:80,ϙ:90,ϟ:90,ρ:100,σ:200,ς:200,ϲ:200,τ:300,υ:400,φ:500,χ:600,ψ:700,ω:800,ϡ:900};
const HE_NUM={א:1,ב:2,ג:3,ד:4,ה:5,ו:6,ז:7,ח:8,ט:9,י:10,כ:20,ך:20,ל:30,מ:40,ם:40,נ:50,ן:50,ס:60,ע:70,פ:80,ף:80,צ:90,ץ:90,ק:100,ר:200,ש:300,ת:400};
function numericValue(word){
 const s=String(word||"").normalize("NFD").replace(/[̀-֑ͯ-ׇ]/g,"").toLowerCase();let g=0,h=0,ng=0,nh=0;
 for(const c of s){if(GR_NUM[c]){g+=GR_NUM[c];ng++}else if(HE_NUM[c]){h+=HE_NUM[c];nh++}}
 return nh>ng?{sys:"he",v:h}:ng?{sys:"grc",v:g}:null;
}
function numericLine(text){
 const words=String(text||"").match(/[\p{L}\p{M}]+/gu)||[];const vals=words.map(w=>({w,n:numericValue(w)})).filter(x=>x.n);if(!vals.length)return null;
 const sys=vals[0].n.sys;const total=vals.reduce((a,x)=>a+x.n.v,0);
 return el("p",{class:"lx-gematria",title:sys==="he"?"Guematría estándar (mispar hechrají): letras finales con el mismo valor que las ordinarias":"Isopsefía griega con los valores alfabéticos milesios (ϛ 6, ϙ 90, ϡ 900)"},sys==="he"?"Guematría (valores estándar): ":"Isopsefía (valores milesios): ",vals.length>1?vals.map(x=>`${x.w} ${x.n.v}`).join(" + ")+" = ":"",el("b",{},String(total)));
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
 const sec=el("section",{class:"lx-tree-wrap"},el("h3",{},"Árbol etimológico"),el("p",{class:"article-note"},"Árbol exploratorio generado a partir de Wiktionary (CC BY-SA 4.0). No es una etimología críticamente certificada: cada vínculo de herencia, préstamo, cognación o reconstrucción requiere comprobación fonológica, cronológica y bibliográfica individual. Los cognados sugeridos no son necesariamente derivados; los paralelos semánticos no prueban parentesco."));
 sec.append(el("p",{class:"article-note"},el("a",{href:"protocolo-academico-lexicon.html",target:"_blank",rel:"noopener noreferrer"},"Ver protocolo académico: fuentes, hipótesis, testimonios y control ecdótico")));
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
 const c=await findConcept(q);if(c)box.append(conceptCard(c,q));
 await renderEtymTree(q,l,box);
}
function collocationList(D,hits,win=4,top=12){
 const c=new Map();const stop=STOP[D.l];let span=0;
 for(const h of hits.slice(0,1500)){const p=D.corpus.passages[h.i];const toks=[...p[2].matchAll(TOKEN)].map(m=>({k:fold(m[0]).replace(/'+$/,""),s:m.index}));const at=toks.findIndex(t=>t.s===h.spans[0][0]);if(at<0)continue;const own=new Set(h.spans.map(s=>s[0]));
  const a0=Math.max(0,at-win),a1=Math.min(toks.length-1,at+win+h.spans.length-1);span+=a1-a0+1-h.spans.length;
  for(let j=a0;j<=a1;j++){const t=toks[j];if(own.has(t.s)||stop.has(t.k)||t.k.length<3)continue;const lem=analyses(D,t.k)[0]?.[0]||t.k;c.set(lem,(c.get(lem)||0)+1)}}
 /* Asociación: log-likelihood de Dunning (G²) sobre la tabla 2×2 ventana/resto del corpus e
    información mutua puntual (MI = log2 O/E). Se ordena por G² y se exige O ≥ 2. */
 const N=D.tokens;
 const scored=[...c.entries()].map(([lem,O])=>{const fs=D.lemmaForms.get(lem);const f=Math.max(O,fs?[...fs].reduce((a,k)=>a+(D.freq.get(k)||0),0):(D.freq.get(lem)||O));const E=f*span/N;return[lem,O,logLik(O,f-O,span,N-span),Math.log2(O/Math.max(E,1e-9)),f]}).filter(x=>x[1]>1&&x[3]>0).sort((a,b)=>b[2]-a[2]).slice(0,top);
 const ul=el("ol",{class:"lx-colloc"});
 if(!scored.length)ul.append(el("li",{},"Sin colocaciones recurrentes."));
 for(const [lem,n,g,mi,f] of scored)ul.append(el("li",{title:`O = ${n} en la ventana · frecuencia total ${f} · G² ${g.toFixed(1)}${g>=10.83?" (p < 0,001)":g>=6.63?" (p < 0,01)":g>=3.84?" (p < 0,05)":" (no significativo)"} · MI ${mi.toFixed(2)}`},el("button",{type:"button",class:"lx-formlink",lang:D.l,onclick:()=>{$("#lx-q").value=`${S.q} NEAR/${win} @${lemmaDisplay(lem)}`;S.mode="frase";renderTabs();run()}},lemmaDisplay(lem)),el("small",{}," ×"+n+" · G² "+g.toFixed(1)+" · MI "+mi.toFixed(1)+(g>=10.83?" ***":g>=6.63?" **":g>=3.84?" *":""))));
 return ul;
}
function renderCollocations(D,res){const box=$("#lx-side-extra");if(!res.hits.length)return;box.append(el("section",{class:"lx-side-block"},el("h3",{},"Colocaciones (±4)"),el("p",{class:"lx-small"},"Lemas en una ventana de ±4 palabras, ordenados por log-likelihood de Dunning (G²); MI = información mutua. * p < 0,05 · ** p < 0,01 · *** p < 0,001."),collocationList(D,res.hits,4,15)))}

/* ---------- Búsqueda hebrea y etimológica ---------- */
function renderHebrew(q){
 const k=q.normalize("NFD").replace(/[֑-ׇ]/g,"");
 const ents=(S.etym?.entries||[]).filter(e=>(e.he||[]).some(h=>h.w.normalize("NFD").replace(/[֑-ׇ]/g,"").includes(k))||(e.loci||[]).some(L=>L.lang==="he"&&L.t.includes(k)));
 const sents=(S.sent?.sententiae||[]).filter(s=>s.lang==="he"&&s.text.includes(k));
 {const box=$("#lx-entry");box.hidden=false;box.replaceChildren(el("header",{class:"lx-entry-head"},el("div",{class:"article-kicker"},"LEXICON · HEBRAICE"),el("h2",{lang:"he",dir:"rtl",class:"lx-he"},q)));const g=numericLine(q);if(g)box.firstChild.append(g)}
 setState(`${ents.length} ficha${ents.length===1?"":"s"} y ${sents.length} sentencia${sents.length===1?"":"s"} con «${q}». El corpus local no incluye aún texto hebreo continuo: la búsqueda recorre las equivalencias LXX/Vulgata de las fichas.`);
 const list=$("#lx-results");heRoots().then(()=>{const r=heRootOf(q);if(r)list.prepend(el("p",{class:"lx-person-banner"},"Raíz: ",el("span",{lang:"he"},r)," ",el("button",{type:"button",class:"lx-btn",onclick:()=>{$("#lx-q").value="√"+r;run()}},"Ver la familia de la raíz")))});for(const e of ents)list.append(etymResult(e));for(const s of sents)list.append(sententiaCard(s));
 list.append(el("p",{class:"lx-ext"},"Buscar en textos hebreos: ",el("a",{href:`https://www.sefaria.org/search?q=${encodeURIComponent(q)}`,target:"_blank",rel:"noopener noreferrer"},"Sefaria")," · ",el("a",{href:`https://www.blueletterbible.org/search/search.cfm?Criteria=${encodeURIComponent(q)}&t=WLC`,target:"_blank",rel:"noopener noreferrer"},"Westminster Leningrad Codex (Blue Letter Bible)")));
}
function etymResult(e){
 const card=el("article",{class:"result-card"},el("div",{class:"kind"},`Etymologicum · ${e.l==="grc"?"griego":"latín"}`),el("h3",{lang:e.l},e.lemma," ",el("span",{class:"lx-headword"},e.head)),el("p",{},e.etym));
 const a=el("div",{class:"actions"},el("button",{type:"button",onclick:()=>{$("#lx-q").value=e.lemma;S.mode="palabra";S.lang=e.l;$("#lx-lang").value=e.l;renderTabs();run()}},"Abrir ficha completa"));card.append(a);return card;
}
async function renderEtymSearch(q){
 {const c=await findConcept(q);if(c&&Object.values(c.modern).flat().some(m=>fold(m)===fold(q.trim())))return renderModernWord(q.trim(),["es","en","fr","de"].includes(S.lang)?S.lang:null)}
 if(/^\*/.test(q.trim()))return renderPIE(q.trim());
 const k=fold(q);const he=HEBREW.test(q);if(he)return renderHebrew(q);
 /* Lemas, raíces y formas: coincidencia exacta o por comienzo; en la prosa de la etimología, solo palabras
    enteras (que «canto» no encuentre «encanto» dentro de la ficha de venustas). */
 const kk=k.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const wordRe=new RegExp(`(^|[^\\p{L}*])${kk}([^\\p{L}]|$)`,"u");
 const headOk=x=>{const f=fold(x).trim();return f===k.trim()||(k.trim().length>=3&&f.split(/[\s,;/·()-]+/).some(t=>t.replace(/^\*/,"").startsWith(k.trim())))};
 const ents=(S.etym?.entries||[]).filter(e=>[e.lemma,e.head,e.tr,e.root,...(e.gr||[]).map(x=>x.w),...(e.la||[]).map(x=>x.w),...(e.old||[]).map(x=>x.f),...(e.cog||[])].some(x=>x&&headOk(x))||(e.etym&&wordRe.test(fold(e.etym))));
 setState(`${ents.length} ficha${ents.length===1?"":"s"} etimológica${ents.length===1?"":"s"} con «${q}» (lema, raíz, formas arcaicas, equivalentes o cognados).`);
 const list=$("#lx-results");
 if(ents.length===1){$("#lx-entry").hidden=false;$("#lx-entry").append(etymCard(ents[0]));if(ents[0].id==="logos")$("#lx-entry").append(renderLogosGrammar());}
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
 if(s.source_status)card.append(el("p",{class:"article-note"},"Procedencia: "+s.source_status));
 if(s.lang==="he"||s.lang==="grc"){const g=numericLine(s.text);if(g)card.append(g)}
 const status=el("span",{class:"meta-line"},"");
 card.append(el("p",{class:"author"},el("cite",{},s.cite)," ",status));
 const a=el("div",{class:"actions"});
 if(s.lang!=="he"){a.append(el("button",{type:"button",onclick:()=>{$("#lx-q").value=s.text;S.mode="analizar";renderTabs();run()}},"Analizar"),el("button",{type:"button",onclick:()=>{$("#lx-q").value=s.text;S.mode="paralelos";renderTabs();run()}},"Paralelos"))}
 a.append(el("button",{type:"button",onclick:e=>copy(`«${s.text}» (${s.cite}). Trad.: «${s.tr}».`,e.target)},"Copiar"));
 card.append(a);
 verifySententia(s).then(v=>{if(v){const p=v.D.corpus.passages[v.h.i];status.textContent=" · coincidencia de palabras en el corpus local (no revisión filológica): "+citeOf(v.D,p,v.h.spans[0][0]);const rl=readerLink(v.D,p);if(rl)a.prepend(el("a",{href:rl},"Ver en el texto"))}else if(s.lang!=="he")status.textContent=" · obra no incluida en el corpus local: consúltese la edición de referencia"}).catch(()=>{});
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
  const lems=[...new Set(an.map(a=>a[0]))];const morph=[...new Set(an.filter(a=>typeof a[1]==="string").map(a=>decodeTag(a[1])))];
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

/* ---------- Escrituras antiguas, Gardiner y testimonios materiales ----------
   Todas las fichas proceden de data/lexicon/philologia.json (escrituras).
   Nunca confundir primera coincidencia del corpus con primera atestiguación física. */
function scriptoriaSource(d,id){
 const s=(d.sources||[]).find(x=>x.id===id);
 return s?el("a",{href:s.url,target:"_blank",rel:"noopener noreferrer"},s.name):null;
}
function scriptoriaSources(d,ids){
 const span=el("span",{class:"lx-small"});
 for(const [i,id] of (ids||[]).entries()){if(i)span.append(" · ");const x=scriptoriaSource(d,id);if(x)span.append(x)}
 return span;
}
function renderOldestEvidence(q){
 const box=$("#lx-antiguedad-resultados"),D=S.phil?.escrituras;if(!box)return;
 box.hidden=true;box.replaceChildren();if(!D||!q)return;
 const k=fold(q).trim(),e=(D.lookup||[]).find(x=>x.queries.some(t=>fold(t)===k));
 if(!e)return;
 const wrap=el("section",{class:"lx-etym"},
  el("h3",{},"Historia documental y testimonios de «"+q+"»"),
  el("p",{class:"article-note"},"Correspondencias léxicas para seguir en el corpus. Una palabra moderna no tiene por qué existir con idéntica forma en un papiro o códice antiguo."));
 const dl=el("dl",{class:"lx-dl"});
 for(const x of e.equivalents){
  const href="vitruvia-lexicon.html?q="+encodeURIComponent(x.word)+"&mode=palabra&lang="+x.lang;
  dl.append(el("dt",{},x.label),el("dd",{},el("a",{href,lang:x.lang},x.word)," · ",el("small",{},"Abrir concordancia y primera aparición en el corpus local")));
 }
 wrap.append(dl,el("p",{class:"lx-syn"},e.note),
  el("p",{class:"lx-small"},"Para afirmar «el códice o papiro más antiguo que contiene la palabra» se exige una lectura localizable del signo o lema, una signatura, el folio/línea y una datación material. Sin esos datos no se asigna falsamente una primera atestiguación."),
  el("p",{class:"lx-small"},"Contexto y bibliografía: ",scriptoriaSources(D,e.refs||[])));
 if(e.title)wrap.prepend(el("p",{class:"article-kicker"},e.title));
 box.append(wrap);box.hidden=false;
}
async function renderScriptoria(){
 const D=S.phil?.escrituras;if(!D)return;
 const tray=$("#lx-script-tray"),family=$("#lx-alphabet-chain"),sel=$("#lx-alphabet-select"),
       signSearch=$("#lx-gardiner-filter"),signOut=$("#lx-gardiner-out"),dictOut=$("#lx-egyptian-dictionary"),witOut=$("#lx-inscription-out");
 if(!tray||!family||!sel||!signSearch||!signOut||!dictOut||!witOut)return;
 tray.replaceChildren();
 for(const b of D.branches){
  const section=el("div",{class:"lx-side-block"},el("h3",{},b.title));
  const ordered=el("ol",{class:"lx-small"});
  b.nodes.forEach(n=>ordered.append(el("li",{},n)));
  section.append(ordered,el("p",{class:"lx-small"},"Fuentes: ",scriptoriaSources(D,b.source)));
  tray.append(section);
 }
 tray.append(el("p",{class:"lx-syn"},D.sites_note),el("p",{class:"article-note"},D.method));
 sel.replaceChildren(...D.letters.map((a,i)=>el("option",{value:String(i)},a.latin+" · "+a.name)));
 const drawLetter=()=>{
  const L=D.letters[Number(sel.value)||0];if(!L)return;
  const t=el("table",{class:"lx-table"},el("thead",{},el("tr",{},...["Origen pictográfico propuesto","Fenicio","Arameo imperial","Hebreo cuadrado","Griego","Latín"].map(x=>el("th",{},x)))));
  t.append(el("tbody",{},el("tr",{},
   el("td",{},L.motif),
   el("td",{class:"lx-old-glyph"},L.phoenician),
   el("td",{class:"lx-old-glyph"},L.aramaic),
   el("td",{class:"lx-old-glyph",lang:"he"},L.hebrew),
   el("td",{class:"lx-old-glyph",lang:"grc"},L.greek),
   el("td",{class:"lx-old-glyph"},L.latinFrom))));
  family.replaceChildren(el("h3",{},"Familia de letras · "+L.name),t,
   el("p",{class:"lx-small"},"El hebreo cuadrado sigue la rama aramea; el griego y el latín pertenecen a otra rama. Los motivos pictográficos son hipótesis generales y no reproducciones de una inscripción concreta."));
 };
 sel.addEventListener("change",drawLetter);drawLetter();
 const words=(await conceptus()).flatMap(c=>(c.egy||[]).map(e=>({concept:c.modern.es?.[0]||c.id,tr:e.tr,sign:e.h||"",gloss:e.g})));
 const drawSigns=()=>{
  const q=fold(signSearch.value.trim()),matches=D.gardiner.filter(s=>!q||fold([s.code,s.value,s.depiction,s.function,s.glyph].join(" ")).includes(q));
  const table=el("table",{class:"lx-table"},el("thead",{},el("tr",{},...["Gardiner","Signo","Valor","Representación","Función"].map(v=>el("th",{},v)))));
  const body=el("tbody");
  matches.forEach(s=>body.append(el("tr",{},
   el("td",{},el("code",{},s.code)),
   el("td",{class:"lx-old-glyph lx-hiero",lang:"egy"},s.glyph),
   el("td",{},s.value),
   el("td",{},s.depiction),
   el("td",{},s.function))));
  table.append(body);
  signOut.replaceChildren(el("p",{class:"lx-small"},matches.length+" signos de "+D.gardiner.length+" en este repertorio inicial. Los valores varían según contexto; no son traducciones literales."),table);
  const matchedWords=words.filter(w=>!q||fold([w.concept,w.tr,w.gloss,w.sign].join(" ")).includes(q));
  const wt=el("table",{class:"lx-table"},el("thead",{},el("tr",{},...["Concepto","Egipcio (transliteración)","Signo si consta","Significado registrado"].map(v=>el("th",{},v)))));
  const wb=el("tbody");
  matchedWords.forEach(w=>wb.append(el("tr",{},
   el("td",{},w.concept),el("td",{},el("i",{},w.tr)),
   el("td",{class:"lx-old-glyph lx-hiero",lang:"egy"},w.sign||"—"),
   el("td",{},w.gloss))));
  wt.append(wb);dictOut.replaceChildren(el("h3",{},"Vocabulario egipcio de conceptos documentados"),
   el("p",{class:"lx-small"},matchedWords.length+" registros de "+words.length+" procedentes del glosario conceptual del Lexicon. La grafía completa de cada palabra NO se reconstruye cuando el corpus solo conoce su transliteración."),wt);
 };
 signSearch.addEventListener("input",drawSigns);drawSigns();
 witOut.replaceChildren(el("h3",{},"Inscripciones, tablillas y códices de referencia"));
 for(const w of D.witnesses){
  witOut.append(el("article",{class:"result-card"},el("div",{class:"kind"},w.script+" · "+w.medium),
   el("h4",{},w.name),el("p",{},el("b",{},"Cronología: "),w.dating),
   el("p",{class:"lx-small"},w.note),
   el("p",{class:"lx-small"},w.localUrl?el("a",{href:w.localUrl},"Abrir visor local · "):null,scriptoriaSources(D,w.sources))));
 }
}
/* ---------- Fin del módulo de paleografía y escritura ---------- */

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


/* ---------- Paleta de fondo (como en Vitruvia) ---------- */
const PALETTE=[["Negro","#0d0d0e","dark"],["Grafito","#17191c","dark"],["Pizarra","#222a32","dark"],["Azul noche","#101b2c","dark"],["Sepia","#292019","dark"],["Verde tinta","#182720","dark"],["Marfil","#f7f5ef","light"],["Papel","#fbfaf6","light"],["Pergamino","#efe6d2","light"]];
function themeIcon(){
 const button=$("#theme");if(!button)return;
 const light=document.documentElement.dataset.theme==="light";
 // Moon in light mode indicates the next action (switch to dark); sun otherwise.
 const svg=button.querySelector("svg");if(svg)svg.innerHTML=light
  ?'<path d="M20.8 15.4A9 9 0 0 1 8.6 3.2 9 9 0 1 0 20.8 15.4Z"/>'
  :'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>';
 button.setAttribute("aria-label",light?"Activar modo oscuro":"Activar modo claro");
 button.setAttribute("title",light?"Modo oscuro":"Modo claro");
 button.setAttribute("aria-pressed",String(!light));
}
function applyBg(hex,mode){
 const r=document.documentElement;
 if(!hex){r.style.removeProperty("--lx-bg");document.body.style.removeProperty("background");themeIcon();return}
 r.style.setProperty("--lx-bg",hex);
 document.body.style.removeProperty("background");
 if(mode){r.dataset.theme=mode==="light"?"light":"dark";try{localStorage.setItem("vitruvia-theme",r.dataset.theme)}catch{}}
 themeIcon();
}
function setupPalette(){
 const box=$("#lx-palette");if(!box)return;const panel=box.querySelector(".lx-palette-panel");
 PALETTE.forEach(([n,hex,mode])=>panel.append(el("button",{type:"button",class:"lx-swatch",title:n,"aria-label":n,style:`background:${hex}`,onclick:()=>{applyBg(hex,mode);try{localStorage.setItem("vitruvia-lexicon-bg",JSON.stringify([hex,mode]))}catch{}}})));
 const custom=el("input",{type:"color",value:"#0d0d0e","aria-label":"Color personalizado"});custom.addEventListener("input",()=>{const h=custom.value;const lum=parseInt(h.slice(1,3),16)*.299+parseInt(h.slice(3,5),16)*.587+parseInt(h.slice(5,7),16)*.114;const mode=lum>150?"light":"dark";applyBg(h,mode);try{localStorage.setItem("vitruvia-lexicon-bg",JSON.stringify([h,mode]))}catch{}});
 panel.append(el("label",{class:"lx-small"},"Personalizado ",custom),el("button",{type:"button",class:"lx-btn",onclick:()=>{applyBg(null);try{localStorage.removeItem("vitruvia-lexicon-bg")}catch{}}},"Restablecer"));
 try{const v=JSON.parse(localStorage.getItem("vitruvia-lexicon-bg")||"null");if(v)applyBg(v[0],v[1])}catch{}
}
/* ---------- Arranque ---------- */
async function init(){
 try{const u=localStorage.getItem("vitruvius-ui-lang");if(["es","en","fr"].includes(u))S.ui=u}catch{}
 const uiSel=$("#lx-ui");if(uiSel){uiSel.value=S.ui;uiSel.addEventListener("change",()=>{S.ui=uiSel.value;try{localStorage.setItem("vitruvius-ui-lang",S.ui)}catch{};applyUI()})}
 try{const th=localStorage.getItem("vitruvia-theme");if(["light","dark"].includes(th))document.documentElement.dataset.theme=th}catch{}
 setupPalette();
 renderTabs();
 themeIcon();
 $("#theme")?.addEventListener("click",()=>{
  const t=document.documentElement.dataset.theme==="light"?"dark":"light";
  // An explicitly selected color must not override later theme changes.
  document.documentElement.style.removeProperty("--lx-bg");
  document.body.style.removeProperty("background");
  document.documentElement.dataset.theme=t;
  try{localStorage.setItem("vitruvia-theme",t);localStorage.removeItem("vitruvia-lexicon-bg")}catch{}
  themeIcon();
 });
 $("#lx-form").addEventListener("submit",e=>{e.preventDefault();run().then(()=>$("#results").scrollIntoView({behavior:"smooth",block:"start"}))});
 $("#lx-lang").addEventListener("change",e=>{S.lang=e.target.value;syncSearchLanguageSelector();if(S.q)run()});
 $("#lx-lang-quick")?.addEventListener("change",e=>{
  const primary=$("#lx-lang");primary.value=e.target.value;
  primary.dispatchEvent(new Event("change",{bubbles:true}));
 });
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
 {
  const t0=performance.now(),files=["etymologicum","sententiae","philologia"];
  const results=await Promise.allSettled(files.map(n=>load("data/lexicon/"+n+".json")));
  [S.etym,S.sent,S.phil]=results.map((r,i)=>{if(r.status==="fulfilled")return r.value;console.warn("Lexicon index unavailable: "+files[i],r.reason);return null});
  console.info("Vitruvia Lexicon metadata ready in "+Math.round(performance.now()-t0)+" ms");
}
 if($("#comp-go")){$("#comp-go").addEventListener("click",()=>renderComparatio().catch(e=>$("#comp-out").replaceChildren(el("p",{},e.message))));$("#comp-lang").addEventListener("change",()=>{$("#comp-a").dataset.l="";renderComparatio()})}
 /* Precarga silenciosa: mientras el lector mira la página se prepara el corpus latino (y el griego en
    conexiones rápidas), para que la primera búsqueda sea inmediata. No se hace con ahorro de datos ni
    en redes lentas; si ya hay una consulta en la dirección, la búsqueda misma carga lo que necesita. */
 {const c=navigator.connection||{};const slow=c.saveData||/(^|-)2g|3g/.test(c.effectiveType||"");
  if(!slow&&!new URLSearchParams(location.search).get("q")){const idle=window.requestIdleCallback||(f=>setTimeout(f,1200));idle(()=>lang("la",true).catch(()=>{}),{timeout:4000})}}
 renderInstrumenta();renderScriptoria().catch(err=>console.error('Escrituras:',err));renderNotebook();renderDaily();renderQueryBuilder();applyUI();heRoots();conceptus();thesaurus().then(T=>{const box=$("#lx-themes-home");if(box)box.replaceWith(themeChips(T))});
 const metrics=$("#lx-metrics");if(metrics&&S.etym)metrics.querySelector("[data-m=etym]").textContent=S.etym.entries.length;if(metrics&&S.sent)metrics.querySelector("[data-m=sent]").textContent=S.sent.sententiae.length;
 const p=new URLSearchParams(location.search);
 if(p.get("mode")&&MODES[p.get("mode")])S.mode=p.get("mode");if(p.get("lang"))S.lang=p.get("lang");$("#lx-lang").value=S.lang;if(p.get("work"))S.work=p.get("work");renderTabs();
 if(p.get("work")&&p.get("locus")){if(p.get("q"))$("#lx-q").value=p.get("q");(p.get("q")?run(false):Promise.resolve()).then(()=>openLocus(p.get("work"),p.get("locus"),p.get("q")||"")).then(()=>{
  /* Reproducibilidad: el enlace citado se creó con otra versión de los datos. */
  const dv=p.get("dv");if(dv&&DATA_VER&&dv!==DATA_VER)$("#lx-results").prepend(el("p",{class:"lx-person-banner"},`${T("Este enlace se citó con la versión de datos")} ${dv}; ${T("ahora se consulta la versión")} ${DATA_VER}. ${T("El texto del pasaje puede haber sido corregido desde entonces; el historial completo está en el repositorio.")} `,el("a",{href:"https://github.com/diegoalonsok-png/vitruvius-digital-library/commits/main/data/lexicon",target:"_blank",rel:"noopener"},T("Historial de cambios")+" ↗")))});}
 else if(p.get("qb")==="1"&&p.get("q")){let f={};try{f=JSON.parse(p.get("qb_filters")||"{}")}catch{}qbLexicalSearch(p.get("q"),f,p.get("qb_lang")||"both",false).catch(e=>setState(e.message))}else if(p.get("q")){$("#lx-q").value=p.get("q");run(false)}else if(S.mode==="sententiae")run(false);else setState("Escriba una palabra, una frase o un patrón. El índice se carga al primer uso.");
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
