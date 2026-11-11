/* Vitruvia · filología de la consulta
 *
 * Capa de comprensión previa a la recuperación. Resuelve los cuatro problemas
 * que hacían que el buscador perdiera resultados evidentes en lenguas antiguas:
 *
 *  1. Grafía. El griego se escribe con y sin acentos, con sigma final o media,
 *     con iota suscrita; el latín con i/j y u/v intercambiables, con ae/æ.
 *     Dos grafías de la misma palabra tenían que coincidir y no coincidían.
 *  2. Flexión. «symmetriae», «symmetriam» y «symmetrias» son la misma palabra
 *     que «symmetria». El buscador las trataba como palabras distintas.
 *  3. Escritura. Quien escribe «architekton» busca ἀρχιτέκτων; quien escribe
 *     «Βιτρούβιος» busca Vitruvio. Hacía falta una clave común a los dos
 *     alfabetos.
 *  4. Onomástica. Vitruvio, Vitruvius, Vitruve, Vitruv y Βιτρούβιος designan
 *     al mismo autor, y un buscador de humanidades debe saberlo.
 *
 * Lo que este módulo NO hace, por honestidad filológica: no analiza morfología
 * (no dice caso ni número: para eso están forms-la.json y forms-grc.json del
 * Lexicon, que son datos atestiguados), no reconstruye etimologías y no afirma
 * parentesco entre lenguas. Las raíces y los cognados viven en
 * data/lexicon/etymologicum.json, redactado sobre de Vaan, Beekes y LSJ.
 * Aquí sólo se igualan grafías y se recortan desinencias para no perder
 * resultados; la coincidencia por raíz recortada se puntúa por debajo de la
 * coincidencia literal, de modo que una forma exacta siempre gana.
 *
 * Funciona como script clásico en el navegador (window.VitruviaPhilology) y
 * como módulo en node, para poder probarlo:
 *   node scripts/test-vitruvia-philology.mjs
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(typeof root!=="undefined")root.VitruviaPhilology=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";

/* ─────────────────────────── escrituras ─────────────────────────── */

const GREEK=/[Ͱ-Ͽἀ-῿]/;
const HEBREW=/[֐-׿יִ-ﭏ]/;
const LATIN=/[A-Za-zÀ-ÖØ-öø-ÿ]/;

const stripMarks=s=>String(s==null?"":s).normalize("NFD").replace(/\p{M}+/gu,"");

/* Grafía neutral: sin acentos ni espíritus, minúscula, sigma final unificada,
   apóstrofos de elisión fuera, puntuación convertida en separador. */
function fold(value){
 let text=stripMarks(value).toLowerCase();
 text=text.replace(/[ς]/g,"σ");           // ς → σ
 text=text.replace(/[’ʼ᾽᾿'’‘`´]/g,"");
 text=text.replace(/æ/g,"ae").replace(/œ/g,"oe");
 return text.replace(/[^\p{L}\p{N}]+/gu," ").trim();
}

/* El latín de los manuscritos y de las ediciones antiguas no distingue i/j ni
   u/v: «iudicium» y «judicium», «uir» y «vir» son la misma palabra. */
function foldLatin(value,options){
 const merge=!!(options&&options.mergeDiphthongs);
 let text=fold(value).replace(/j/g,"i").replace(/v/g,"u");
 if(merge)text=text.replace(/ae|oe/g,"e").replace(/y/g,"i");
 return text;
}

/* Beta-code: notación ASCII del griego usada por Perseus y el TLG.
   Se acepta en el buscador porque sigue siendo la vía rápida para teclear
   griego sin teclado politónico. */
const BETA={a:"α",b:"β",g:"γ",d:"δ",e:"ε",z:"ζ",h:"η",q:"θ",i:"ι",k:"κ",l:"λ",m:"μ",
 n:"ν",c:"ξ",o:"ο",p:"π",r:"ρ",s:"σ",t:"τ",u:"υ",f:"φ",x:"χ",y:"ψ",w:"ω"};
function fromBetaCode(value){
 const raw=String(value==null?"":value);
 /* Sólo se convierte si lleva alguna marca del beta-code —espíritu ) ( ,
    acento / \ =, iota suscrita |, diéresis +—. Sin marcas, «symmetria» es
    latín y debe quedarse como está. */
 if(!/[)(\\/|+=]/.test(raw))return raw;
 if(!/^[a-zA-Z()\\/|+=*'\s-]+$/.test(raw.trim()))return raw;
 let out="";
 for(const ch of raw.toLowerCase()){
  if(BETA[ch])out+=BETA[ch];
  else if(/[()\\/|+=*']/.test(ch))continue;              // diacríticos del beta-code
  else out+=ch;
 }
 return out;
}

/* Clave común a los dos alfabetos. No es una transliteración científica: es
   una forma reducida donde ἀρχιτέκτων y «architectus» caen en la misma raíz.
   Convenciones: θ→th, φ→ph, χ→kh, ψ→ps, ξ→ks, η→e, ω→o, υ→u, c latina→k. */
const GREEK_KEY=[
 [/ου/g,"u"],[/ευ/g,"eu"],[/αυ/g,"au"],[/ει/g,"i"],[/οι/g,"oi"],[/αι/g,"ai"],[/υι/g,"ui"],
 [/γγ/g,"ng"],[/γκ/g,"nk"],[/γχ/g,"nkh"],[/γξ/g,"nks"],
 [/θ/g,"th"],[/φ/g,"ph"],[/χ/g,"kh"],[/ψ/g,"ps"],[/ξ/g,"ks"],
 [/α/g,"a"],[/β/g,"b"],[/γ/g,"g"],[/δ/g,"d"],[/ε/g,"e"],[/ζ/g,"z"],[/η/g,"e"],
 [/ι/g,"i"],[/κ/g,"k"],[/λ/g,"l"],[/μ/g,"m"],[/ν/g,"n"],[/ο/g,"o"],[/π/g,"p"],
 [/ρ/g,"r"],[/σ/g,"s"],[/τ/g,"t"],[/υ/g,"u"],[/ω/g,"o"]
];
const LATIN_KEY=[
 [/ph/g,"ph"],[/th/g,"th"],[/ch/g,"kh"],[/rh/g,"r"],[/qu/g,"ku"],
 [/ae/g,"ai"],[/oe/g,"oi"],[/x/g,"ks"],[/y/g,"u"],[/c/g,"k"],[/j/g,"i"],[/v/g,"u"],[/z/g,"z"]
];
function scriptKey(value){
 let text=fold(value);
 if(GREEK.test(text))for(const [re,to] of GREEK_KEY)text=text.replace(re,to);
 else for(const [re,to] of LATIN_KEY)text=text.replace(re,to);
 text=text.replace(/h(?![aeiou])/g,"h");
 return text.replace(/(.)\1+/g,"$1").trim();            // consonante doble = simple
}

function detectScript(value){
 const text=String(value==null?"":value);
 if(HEBREW.test(text))return "hebrew";
 if(GREEK.test(text))return "greek";
 if(LATIN.test(text))return "latin";
 return "unknown";
}

/* ─────────────────────────── flexión ─────────────────────────── */

/* Desinencias ordenadas de más larga a más corta. No es un lematizador: es un
   recorte para que la búsqueda no pierda la forma flexionada. Nunca deja una
   raíz de menos de cuatro caracteres, que es donde los recortes empiezan a
   confundir palabras distintas. */
const LATIN_ENDINGS=["ierunt","issent","issemus","erunt","issem","isses","isset","amini","emini",
 "imini","antur","entur","untur","ebamus","abamus","ibus","orum","arum","erum","ebus","abus",
 "ntur","mini","runt","isse","ndus","ndum","ndam","ntem","ntis","ntes","ique","que","ius","uus",
 "uum","uis","eis","ere","are","ire","ent","ant","unt","int","ens","ans","ium","iam","iem","tis",
 "mus","ris","tur","bam","bas","bat","ae","oe","ei","ui","is","es","as","os","us","um","am","em",
 "im","om","or","er","ar","ir","ur","it","et","at","ut","a","e","i","o","u","s","m"];
const GREEK_ENDINGS=["ομενος","ομενου","ομενων","οντων","μενος","μενου","μενων","ουσιν","ουσαν",
 "ασθαι","εσθαι","ηναι","σθαι","ουμαι","ομαι","οντος","οντα","ουντ","ατος","ατων","ασιν","οισι",
 "εως","εων","αις","ους","ων","ον","ος","ου","αν","ας","ης","οι","αι","ει","ες","ιν","α","ε","η",
 "ο","ω","ς","ν","ι","υ"];
/* El latín admite raíces de cuatro caracteres; el griego, de tres: sus raíces
   son más cortas (οἶκ-, λόγ-, θε-) y con un umbral de cuatro se perdían. */
const MIN_STEM=4;
const MIN_STEM_GREEK=3;
/* Las desinencias se normalizan con la misma regla que las palabras: si la
   lista trajera una sigma final, nunca coincidiría con el texto ya plegado. */
const foldList=list=>list.map(item=>fold(item)).filter(Boolean);
const LATIN_TAILS=foldList(LATIN_ENDINGS);
const GREEK_TAILS=foldList(GREEK_ENDINGS);
/* Desinencias sobre la clave común a los dos alfabetos. Permiten comparar
   θέατρον con theatrum: ambas llegan a «theatr-». Se usan sólo en esa
   comparación, nunca al recortar una palabra en su propia lengua. */
const CROSS_TAILS=["omenos","omenou","omenon","onton","menos","ousin","ousan","asthai",
 "esthai","sthai","enai","umai","omai","ontos","onta","atos","aton","asin","oisi","ibus",
 "orum","arum","eos","eon","ais","ois","ous","us","on","os","ou","an","as","es","is","in",
 "um","am","em","im","or","er","ar","ir","ur","a","e","i","o","u","s","m","n"];
function crossStem(value){
 const key=scriptKey(value);
 for(const tail of CROSS_TAILS){
  if(key.length-tail.length>=MIN_STEM_GREEK&&key.endsWith(tail))return key.slice(0,key.length-tail.length);
 }
 return key;
}

function stem(word,script){
 const text=fold(word);
 if(!text)return "";
 const kind=script||detectScript(text);
 if(kind==="hebrew")return hebrewSkeleton(text);
 const greek=kind==="greek";
 const endings=greek?GREEK_TAILS:LATIN_TAILS;
 const floor=greek?MIN_STEM_GREEK:MIN_STEM;
 const base=greek?text:foldLatin(text);
 for(const ending of endings){
  if(base.length-ending.length>=floor&&base.endsWith(ending))return base.slice(0,base.length-ending.length);
 }
 return base;
}

/* Hebreo: se quitan los prefijos y sufijos más frecuentes para dejar el
   esqueleto consonántico. La raíz triliteral REAL sólo se afirma cuando está
   en data/lexicon/hebrew-roots.json, redactado sobre BDB y HALOT; este
   esqueleto sirve para buscar, no para etimologizar. */
function hebrewSkeleton(value){
 let text=String(value==null?"":value).replace(/[֑-ׇ]/g,"");   // niqqud y cantilación
 text=text.replace(/^[והבכלמש]/,"");
 text=text.replace(/(ים|ות|יה|נו|כם|כן|הם|הן|תי|תם|ך|ו|י|ה)$/,"");
 return text;
}

/* Dos formas son de la misma familia si coinciden o si comparten una raíz
   suficientemente larga. El margen de tres caracteres cubre la flexión
   nominal y verbal sin unir palabras ajenas. */
function sameFamily(a,b){
 const x=fold(a),y=fold(b);
 if(!x||!y)return false;
 if(x===y)return true;
 const kx=scriptKey(x),ky=scriptKey(y);
 if(kx&&kx===ky)return true;
 const sx=stem(x),sy=stem(y);
 if(sx&&sx===sy&&sx.length>=MIN_STEM_GREEK)return true;
 const cx=crossStem(x),cy=crossStem(y);
 if(cx&&cx===cy&&cx.length>=MIN_STEM)return true;
 /* Último recurso: raíz compartida muy larga. El umbral es estricto a
    propósito: con un margen holgado, «templum» y «tempus» caían juntos. */
 const shortest=Math.min(kx.length,ky.length);
 if(shortest<5)return false;
 let shared=0;
 while(shared<shortest&&kx[shared]===ky[shared])shared++;
 const required=Math.max(5,Math.ceil(shortest*0.8));
 return shared>=required&&Math.abs(kx.length-ky.length)<=4;
}

/* ─────────────────────────── onomástica ─────────────────────────── */

/* Correspondencias ortográficas entre la forma castellana, la latina y la
   griega de un mismo nombre. Generan candidatos; no son reglas históricas de
   evolución fonética. El catálogo del sitio (con sus alias) manda sobre esto:
   véase scripts/build-vitruvia-onomastica.mjs. */
const NAME_RULES=[
 [/io$/,"ius"],[/ius$/,"io"],                 // Vitruvio ↔ Vitruvius
 [/on$/,"o"],[/o$/,"on"],                     // Cicerón ↔ Cicero · Platón ↔ Plato
 [/eo$/,"eus"],[/eus$/,"eo"],                 // Orfeo ↔ Orpheus
 [/ides$/,"ides"],[/edes$/,"ides"],
 [/f/g,"ph"],[/ph/g,"f"],                     // Filón ↔ Philo
 [/qu/g,"ch"],[/ch/g,"qu"],                   // Arquímedes ↔ Archimedes
 [/t/g,"th"],[/c/g,"k"],[/k/g,"c"],
 [/y/g,"i"],[/i/g,"y"]
];

function nameVariants(name,table){
 const given=String(name==null?"":name).trim();
 if(!given)return [];
 const out=new Set([given]);
 const key=fold(given);
 /* 1. El catálogo primero: si la obra o el autor existe en el sitio, sus
       alias son datos, no conjeturas. */
 const entry=table&&(table[key]||table[scriptKey(given)]);
 if(entry)for(const alias of entry)out.add(alias);
 /* 2. Reglas ortográficas, sólo sobre la forma base y de una en una. */
 for(const [from,to] of NAME_RULES){
  const candidate=key.replace(from,to);
  if(candidate&&candidate!==key&&candidate.length>=4)out.add(candidate);
 }
 return [...out];
}

/* ─────────────────────────── citas ─────────────────────────── */

/* Abreviaturas de uso corriente en filología clásica. La lista se limita a los
   autores presentes en el catálogo del sitio más los de cita habitual. */
const AUTHOR_ABBR={
 "vitr":"Vitruvio · De architectura","de arch":"Vitruvio · De architectura","arch":"Vitruvio · De architectura",
 "hom":"Homero","il":"Homero · Ilíada","od":"Homero · Odisea",
 "hdt":"Heródoto","thuc":"Tucídides","th":"Tucídides","xen":"Jenofonte",
 "pl":"Platón","plat":"Platón","arist":"Aristóteles","ar":"Aristófanes",
 "cic":"Cicerón","lucr":"Lucrecio","verg":"Virgilio","virg":"Virgilio",
 "aen":"Virgilio · Eneida","georg":"Virgilio · Geórgicas","ecl":"Virgilio · Bucólicas",
 "ov":"Ovidio","met":"Ovidio · Metamorfosis","hor":"Horacio","liv":"Tito Livio",
 "tac":"Tácito","plin":"Plinio","sen":"Séneca","quint":"Quintiliano",
 "caes":"Julio César","sall":"Salustio","str":"Estrabón","paus":"Pausanias",
 "plu":"Plutarco","plut":"Plutarco","diod":"Diodoro Sículo","jos":"Flavio Josefo",
 "gal":"Galeno","ptol":"Ptolomeo","eucl":"Euclides","archim":"Arquímedes",
 "polyb":"Polibio","pol":"Polibio","dion":"Dionisio de Halicarnaso",
 "app":"Apiano","dsc":"Dioscórides","front":"Frontino","varro":"Varrón",
 "nep":"Cornelio Nepote","mart":"Marcial","luc":"Lucano","philo":"Filón de Alejandría",
 "gen":"Génesis","ex":"Éxodo","is":"Isaías","ps":"Salmos"
};
const ROMAN=/^[ivxlcdm]+$/i;
function fromRoman(value){
 const map={i:1,v:5,x:10,l:50,c:100,d:500,m:1000};
 const text=String(value).toLowerCase();
 let total=0;
 for(let i=0;i<text.length;i++){
  const here=map[text[i]],next=map[text[i+1]];
  total+=next&&here<next?-here:here;
 }
 return total;
}

/* «Vitr. 3.1.2», «De arch. III 1, 2», «Il. 1.1», «Hdt. II 35» */
const CITATION=/\b(de\s+arch|[A-Za-zÁÉÍÓÚáéíóú]{2,9})\.?\s*([IVXLCDM]+|\d+)(?:(?:[.,]\s*|\s+)(\d+))?(?:(?:[.,]\s*|\s+)(\d+))?\b/i;
function citation(value){
 const text=String(value==null?"":value).trim();
 const match=text.match(CITATION);
 if(!match)return null;
 const abbr=fold(match[1]).replace(/\s+/g," ");
 const author=AUTHOR_ABBR[abbr];
 if(!author)return null;
 const parts=[match[2],match[3],match[4]].filter(Boolean).map(part=>ROMAN.test(part)&&!/^\d+$/.test(part)?fromRoman(part):Number(part));
 if(!parts.length)return null;
 return {author,abbr,locus:parts.join("."),parts,source:match[0].trim()};
}

/* ─────────────────────── clasificación de la consulta ─────────────────────── */

const CONCEPT_HINTS=["concepto","teoria","teoría","noción","nocion","idea","significado","sentido","definicion","definición"];
const PLACE_HINTS=["ciudad","templo de","teatro de","foro de","puerto","via","vía","provincia","isla"];
const WORK_HINTS=["libro","tratado","obra","comentario","edicion","edición","traduccion","traducción","manuscrito","codice","códice","codex","folio"];

/* El tipo de consulta decide a qué fuentes vale la pena preguntar: una cita no
   se busca en un repertorio de autoridades, y un nombre propio no se busca en
   un índice de materias. No es una inferencia sobre la intención del lector:
   es un orden de prioridad reversible, y el lector puede ignorarlo. */
function classify(query,table){
 const text=String(query==null?"":query).trim();
 const folded=fold(text);
 const script=detectScript(text);
 const tokens=folded?folded.split(" ").filter(Boolean):[];
 const cite=citation(text);
 if(cite)return {type:"citation",script,citation:cite,tokens,confidence:"alta"};
 if(script==="hebrew")return {type:"term",script,tokens,confidence:"media"};
 const lower=text.toLowerCase();
 if(CONCEPT_HINTS.some(hint=>lower.includes(hint)))return {type:"concept",script,tokens,confidence:"media"};
 if(WORK_HINTS.some(hint=>lower.includes(hint)))return {type:"work",script,tokens,confidence:"media"};
 if(PLACE_HINTS.some(hint=>lower.includes(hint)))return {type:"place",script,tokens,confidence:"baja"};
 const known=table&&(table[folded]||table[scriptKey(text)]);
 if(known)return {type:"person",script,tokens,confidence:"alta",catalogued:true};
 /* Un nombre propio se escribe con mayúscula y rara vez pasa de tres palabras. */
 const capitalised=/^[A-ZÁÉÍÓÚΑ-Ω]/.test(text)&&tokens.length<=3;
 if(capitalised&&script!=="greek")return {type:"person",script,tokens,confidence:"baja"};
 if(tokens.length===1)return {type:"term",script,tokens,confidence:"media"};
 return {type:"concept",script,tokens,confidence:"baja"};
}

/* ─────────────────────── expansión de la consulta ─────────────────────── */

const STOP=new Set(("de del la el los las un una y o u en con por para que sobre como mas más "+
 "the of and for in on with a an to from is are was were "+
 "le les des du la et ou en sur dans pour "+
 "der die das und von im mit "+
 "τον την του της των και εν δε γαρ προς οτι μεν "+
 "et in ad cum per qui quae quod non est sunt atque sed autem enim ex ab").split(/\s+/));

/* Devuelve todo lo que conviene preguntar a las fuentes a partir de lo que
   escribió el lector: la consulta tal cual, las grafías equivalentes, las
   raíces recortadas y las variantes del nombre. Cada grupo va etiquetado para
   que el ranking pueda puntuar la coincidencia literal por encima del resto. */
function expand(query,options){
 const settings=options||{};
 const table=settings.onomastica||null;
 const raw=String(query==null?"":query).trim();
 const greekFromBeta=settings.betaCode===false?raw:fromBetaCode(raw);
 const literal=raw;
 const folded=fold(raw);
 const tokens=folded.split(" ").filter(token=>token&&!STOP.has(token));
 const script=detectScript(raw);
 const kind=classify(raw,table);

 const forms=new Set();
 if(literal)forms.add(literal);
 if(greekFromBeta&&greekFromBeta!==raw)forms.add(greekFromBeta);
 if(script==="latin"){
  const variant=foldLatin(raw);
  if(variant&&variant!==folded)forms.add(variant);
 }

 const stems=[...new Set(tokens.map(token=>stem(token,script)).filter(value=>value&&value.length>=MIN_STEM))];
 const keys=[...new Set(tokens.map(scriptKey).filter(Boolean))];
 const variants=kind.type==="person"||kind.catalogued?nameVariants(raw,table):[];

 /* Frases: lo que el lector puso entre comillas se busca como bloque. */
 const phrases=[];
 const quoted=/"([^"]{2,120})"|«([^»]{2,120})»/g;
 let hit;
 while((hit=quoted.exec(raw)))phrases.push((hit[1]||hit[2]).trim());

 return {
  query:literal,
  folded,
  script,
  type:kind.type,
  confidence:kind.confidence,
  citation:kind.citation||null,
  tokens,
  stems,
  keys,
  phrases,
  forms:[...forms],
  variants:variants.filter(value=>fold(value)!==folded),
  /* Consulta que conviene enviar a una fuente externa: la literal, más la
     variante onomástica más probable si la hay. Nunca se envían las raíces
     recortadas a un buscador ajeno: devolverían ruido. */
  outbound:[literal,...(variants.slice(0,2))].filter(Boolean)
 };
}

return {fold,foldLatin,fromBetaCode,scriptKey,detectScript,stem,crossStem,hebrewSkeleton,sameFamily,
 nameVariants,citation,fromRoman,classify,expand,
 constants:{MIN_STEM,MIN_STEM_GREEK,AUTHOR_ABBR,STOP}};
});
