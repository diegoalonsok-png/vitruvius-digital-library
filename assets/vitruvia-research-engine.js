/* VITRUVIA RESEARCH ENGINE · client-only, verifiable.
 * Three cooperating retrieval routes: locus / concept / bibliography & codices.
 * Concept retrieval uses explicit synonym expansion; vector embeddings are optional,
 * and MUST NOT be claimed active until a published checked matrix exists.
 */
(()=>{"use strict";
const base="data/";
const catalogPaths=["structured/recensio-es.json","structured/recensio-fr.json","structured/theory-en.json"];
let corporaPromise=null,codicesPromise=null;
const flat=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const stop=new Set("de del los las el la lo en un una y e o a por para que como con the and from of in on or by for et le la les des du sur de aus der die das".split(" "));
const terms=s=>flat(s).split(" ").filter(t=>t.length>2&&!stop.has(t));
const unique=a=>[...new Set(a)];
const SYNONYMS={
 symmetria:"symmetria simetria symetria proportion proportio proporcion modular modulus razon armonia harmony proportion",
 templo:"templo templum temple aedes sacrum santuario sanctuary templo temple templos",
 toscano:"toscano tuscano tuscan tuscanica tuscanicum etrusco etruscan etrusca",
 arquitect:"architectura architecturae arquitectura architecture building edilizia construir construcción",
 columna:"columna columnae column columns capitel capital fuste shaft",
 agua:"aqua aquae acqueductus acueducto canal fuentes water aqueduct hydraulic",
 manuscrito:"codex codices manuscript manuscrito códice folio pergamino palaeografia",
 vitruvio:"vitruvius vitruvio vitruve de architectura architectura",
 ciceron:"cicero ciceron cicéron",
 lucrecio:"lucretius lucrecio rerum natura",
 pitagoras:"pitagoras pitagorico pitagoricos pythagoras pythagorean pythagoreans pythagoriciens pythagoricien pythagoricus pythagorici",
 pythagoras:"pitagoras pitagorico pitagoricos pythagoras pythagorean pythagoreans pythagoriciens pythagorici"
};
function canonical(s){
 let q=flat(s).replace(/\b(harlesianus|harlesiano|harleyanus|harleian|harley|harlesian)\b/g,"harleianus")
 .replace(/\b(vitruvius|vitruve|vitruvii|vitrubio)\b/g,"vitruvio")
 .replace(/\b(codices|codice|codices|codices)\b/g,"codex")
 .replace(/\b(pitagor(?:as|icos?|icas?)|pythagor(?:as|eans?|iciens?|ici|icus))\b/g,"pitagor");
 return q
}
function tokens(q,expanded){const list=terms(canonical(q));if(!expanded)return unique(list);const out=new Set(list);
 for(const [k,v] of Object.entries(SYNONYMS)){if(list.some(w=>k.startsWith(w)||w.startsWith(k)||terms(v).includes(w)))for(const w of terms(v))out.add(w)}
 return [...out].slice(0,45)
}
function locus(q){
 const m=String(q||"").match(/(?:^|[^\da-z])((?:X|IX|IV|V?I{1,3}|\d{1,2}))\s*[.:,]\s*(\d{1,2})\s*[.:,]\s*(\d{1,2})(?!\d)/i);
 if(!m)return null;
 const romans={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10};
 return String(romans[m[1].toUpperCase()]||Number(m[1]))+"."+Number(m[2])+"."+Number(m[3])
}
/* Structural route: recognize Vitruvius prefaces before any lexical or web ranking.
   Includes Spanish, Latin, English, French, Italian and Portuguese terms. */
const romanBook={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
const ordinalBook={
 primer:1,primero:1,primera:1,first:1,premier:1,premiere:1,primi:1,primus:1,primo:1,
 segundo:2,segunda:2,second:2,secondo:2,secundi:2,secundus:2,deuxieme:2,
 tercero:3,tercero:3,tercera:3,third:3,tertii:3,tertius:3,troisieme:3,
 cuarto:4,cuarta:4,fourth:4,quarti:4,quartus:4,quatrieme:4,
 quinto:5,quinta:5,fifth:5,quinti:5,quintus:5,cinquieme:5,
 sexto:6,sexta:6,sixth:6,sexti:6,sextus:6,sixieme:6,
 septimo:7,septima:7,seventh:7,septimi:7,septimus:7,septieme:7,
 octavo:8,octava:8,eighth:8,octavi:8,octavus:8,huitieme:8,
 noveno:9,novena:9,ninth:9,noni:9,nonus:9,neuvieme:9,
 decimo:10,decima:10,tenth:10,decimi:10,decimus:10,dixieme:10
};
function resolveBook(value){
 if(!value)return null;
 const w=String(value).toLowerCase();
 const n=/^\d{1,2}$/.test(w)?Number(w):romanBook[w]||ordinalBook[w]||null;
 return n>=1&&n<=10?n:null;
}
function prefaceIntent(query){
 const n=canonical(query);
 const direct=n.match(/\b(x|ix|viii|vii|vi|v|iv|iii|ii|i|10|[1-9])\s*[.:]\s*(?:praef|praefatio|pref|prefacio|preface|prolog(?:o|ue|us)?)\b(?:\s*[.:]\s*(\d{1,2}))?/);
 if(direct)return {book:resolveBook(direct[1]),section:direct[2]?Number(direct[2]):null};
 if(!/\b(prefacio|prefacios|preface|prefaces|praefatio|praefationes|praefat(?:io|ionem|iones|ory)|praef|prologo|prologue|prologus|proemio|proemium|prooemium|prefazione|introduccion)\b/.test(n))return null;
 const parts=n.split(/\s+/),bookTerms=new Set(["libro","libros","liber","libri","librum","book","books","livre","livres","livro","livros","tomo","volumen","volume"]);
 let book=null;
 for(let i=0;i<parts.length;i++){
  if(!bookTerms.has(parts[i]))continue;
  for(const j of [i+1,i+2,i-1,i-2]){
   if(j<0||j>=parts.length)continue;
   const candidate=resolveBook(parts[j]);
   if(candidate){book=candidate;break}
  }
  if(book)break;
 }
 // Queries such as "praefatio I" or "prefacio 1" also designate a book.
 if(!book&&parts.length<=5){
  for(const word of parts){book=resolveBook(word);if(book)break}
 }
 return {book,section:null};
}
let prefacesPromise=null;
function getPrefaces(){
 if(!prefacesPromise)prefacesPromise=fetchJSON("vitruvia-prefaces.json").then(json=>{
  if(!Array.isArray(json.entries)||json.entries.length<130)throw Error("Índice de prefacios incompleto");
  return json.entries;
 }).catch(err=>{prefacesPromise=null;throw err});
 return prefacesPromise
}
function prefaceRows(intent,entries,preferred="es"){
 const roman=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
 const items=entries.filter(p=>(!intent.book||p.book===intent.book)&&(!intent.section||p.locus.endsWith("."+intent.section)));
 const groups=new Map();
 for(const p of items){
  const key=p.book+":"+p.edition;
  if(!groups.has(key))groups.set(key,{book:p.book,edition:p.edition,language:p.language,version:p.version,sections:[]});
  groups.get(key).sections.push(p);
 }
 return [...groups.values()].map(g=>{
  g.sections.sort((a,b)=>Number(a.locus.split(".").at(-1))-Number(b.locus.split(".").at(-1)));
  const first=g.sections[0],start=first?.locus||g.book+".praef.1";
  return {type:"preface",title:"De architectura · Prefacio del Libro "+roman[g.book]+" · "+g.version,
   author:"Marco Vitruvio Polión · "+(g.language==="en"?"inglés":"castellano")+" · "+g.version,
   excerpt:first?.translation?.slice(0,350)||first?.latin?.slice(0,350)||"",
   meta:"Praefatio libri "+roman[g.book]+" · "+g.sections.length+" secciones verificadas · "+g.version,
   rating:6000-(intent.book?0:g.book*2)+(g.language===preferred?3:0),
   link:"lector-bilingue.html?edition="+encodeURIComponent(g.edition)+"&locus="+encodeURIComponent(start),
   source:g.version,edition:g.edition,locus:start,book:g.book,prefaceBook:g.book,
   sections:g.sections,language:g.language};
 }).sort((a,b)=>b.rating-a.rating)
}

function classify(q){
 const n=canonical(q),l=locus(q),c=/\b(codex|manuscrit|manuscrito|manuscrit|manuscript|folio|harleianus|harley|gudianus|pithoeanus|vaticanus|scletstatensis|eton|plut)\b/.test(n);
 const bib=/\b(bibliograf|edicion|edition|krohn|rose|perrault|barbaro|sulpizio|cesariano|giocondo|isbn|doi)\b/.test(n);
 const h=/\b(harleianus|2767)\b/.test(n)||/\bcodex\s+h\b/.test(n);
 const genericVitruvian=c&&/\b(vitruvio|architectura|vitruvian\w*|vitruviano\w*|vitruvii)\b/.test(n);
 const preface=prefaceIntent(q);
 return {locus:l,preface,codex:c,harley:h,vitruvian:genericVitruvian,edition:bib,kind:preface?"preface":l?"locus":c?"manuscript":bib?"bibliography":"concept"};
}
async function fetchJSON(url){const response=await fetch(base+url,{headers:{accept:"application/json"}});if(!response.ok)throw Error("Archivo no disponible: "+url+" ("+response.status+")");return response.json()}
function getCorpora(){if(!corporaPromise)corporaPromise=Promise.allSettled(catalogPaths.map(fetchJSON)).then(res=>{
 const good=res.filter(x=>x.status==="fulfilled").map(x=>x.value);
 if(!good.length)throw Error("Ninguna de las ediciones estructuradas está disponible");
 return good.flatMap(obj=>(obj.passages||[]).map(p=>({
  edition:obj.edition||"",language:obj.language||"",version:({ "recensio-es":"V514","recensio-fr":"V554","theory-en":"V297" })[obj.edition]||obj.edition,
  locus:p.locus,book:p.book,chapter:p.chapter,latin:p.latin||"",translation:p.translation||"",
  pdfPages:p.pdf_pages||{},sourceParagraphs:p.source_paragraphs||[],method:obj.source?.method||"structured"
 })))
 }).catch(e=>{corporaPromise=null;throw e});return corporaPromise}
function getCodices(){if(!codicesPromise)codicesPromise=fetchJSON("vitruvia-codices.json").then(r=>r.records||[]).catch(e=>{codicesPromise=null;throw e});return codicesPromise}
function countWord(text,word){let pos=0,count=0;while((pos=text.indexOf(word,pos))!==-1){count++;pos+=word.length}return Math.min(3,count)}
function lexicalScore(content,q,expansion=false){
 const needle=canonical(q),text=canonical(content);if(!needle||!text)return 0;
 const core=tokens(q,false),all=tokens(q,expansion);let r=text.includes(needle)?55:0,matched=0;
 for(const t of core){if(text.includes(t)){matched++;r+=t.length>5?16:10}}
 if(core.length>1&&matched===0)return 0;
 if(core.length>1)r+=Math.floor(30*matched/core.length);
 if(expansion){for(const t of all){if(!core.includes(t)&&text.includes(t))r+=1.7}}
 return r
}
function localURL(s){return typeof s==="string"&&/^[a-z0-9/_-]+\.html(?:\?[^#]*)?$/i.test(s)}
function manuscriptRows(q,collection){
 const intent=classify(q);if(!intent.codex&&!intent.vitruvian)return [];
 const input=canonical(q),t=tokens(q,false);
 let candidates=collection.map(x=>{
  const terms2=canonical([x.title,...(x.aliases||[]),x.library,x.description].join(" "));
  let score=lexicalScore([x.title,...(x.aliases||[]),x.library].join(" "),q,false);
  if(intent.harley){if(x.id==="harley-2767")score=3000;else score=-1}
  else if(intent.vitruvian){score+=400}
  else if(t.length===1&&["codex","manuscrito","manuscript"].includes(t[0]))score+=70;
  if(t.some(a=>terms2.includes(a)))score+=40;
  return {x,score}
 }).filter(i=>i.score>0).sort((a,b)=>b.score-a.score);
 if(!candidates.length&&intent.harley){const item=collection.find(x=>x.id==="harley-2767");if(item)candidates=[{x:item,score:3000}]}
 const out=[];
 for(const {x,score} of candidates.slice(0,12)){
  const r={type:"manuscript",title:x.title,author:x.library,excerpt:x.description,meta:[x.date,x.sourceLabel].filter(Boolean).join(" · "),rating:score,source:x.library,
    link:localURL(x.reader)?x.reader:x.source||null,links:[],method:"Fichero de autoridad: "+x.id,identity:x.id,date:x.date};
  if(x.source)r.links.push({label:"Catálogo institucional",url:x.source});
  for(const z of x.secondaryReaders||[])if(localURL(z.url))r.links.push({label:z.title,url:z.url});
  out.push(r)
 }
 if(intent.harley){
  const h=collection.find(x=>x.id==="harley-2767");if(h)for(const z of [{title:"Codex H · visor doble",url:"codex-h-doble-folio.html"},{title:"Codex H · folios",url:"codex-h-folios-local.html"},{title:"Codex H · ficha",url:"harleianus.html"}]){
   if(!out.some(r=>r.link===z.url))out.push({type:"manuscript",title:z.title,author:h.library,excerpt:"Acceso al mismo testimonio Harley MS 2767. El folio se consulta sin asignarle automáticamente un locus textual.",meta:"Lector local · Harley MS 2767",link:z.url,rating:1900-out.length,source:"Biblioteca Vitruviana",identity:h.id})
  }
 }
 return out
}
function passageRows(q,corpora,{concept=false,limit=18}={}){
 const loc=locus(q),core=tokens(q,false),rows=[];
 for(const p of corpora){
  let rating=0,where="";
  const text=[p.latin,p.translation].join(" ");
  if(loc){if(p.locus===loc){rating=2500;where="Locus exacto"}else if(p.locus.startsWith(loc.slice(0,loc.lastIndexOf("."))+'.'))rating=80}
  else {const la=lexicalScore(p.latin,q,concept),modern=lexicalScore(p.translation,q,concept);rating=Math.max(la,modern);where=la>modern?"Latín original":"Traducción "+p.language}
  if(rating<10)continue;
  const page=p.pdfPages?.translation;
  const pageLabel=Number.isInteger(page)&&page>0?"página PDF "+page:"página PDF sin cotejo";
  const editionURL=({"recensio-es":"documents/kurilo-recensio-es.pdf","recensio-fr":"documents/kurilo-recensio-fr.pdf","theory-en":"documents/kurilo-theory-en.pdf"})[p.edition];
  const link=editionURL&&Number.isInteger(page)&&page>0?editionURL+"#page="+page:editionURL||null;
  const body=String(p.translation||p.latin);
  const hay=canonical(body),searchTerms=tokens(q,concept);
  let at=hay.indexOf(canonical(q));
  if(at<0){for(const term of searchTerms){const found=hay.indexOf(term);if(found>=0){at=found;break}}}
  const excerpt=at<0?body.slice(0,420):body.slice(Math.max(0,at-145),Math.min(body.length,at+330));
  rows.push({type:"passage",title:"Vitruvio · De architectura "+p.locus+" · "+p.version,author:p.language.toUpperCase()+" · "+p.version+" · "+where,
    excerpt,meta:"Locus "+p.locus+" · "+pageLabel+" · "+p.method,rating:rating+(p.edition==="recensio-es"?0.2:0),
    link,source:p.edition,edition:p.edition,locus:p.locus,pdfPage:Number.isInteger(page)&&page>0?page:null,latin:p.latin,translation:p.translation,method:concept&&!loc?"Expansión terminológica (sin vectores)":where})
 }
 return rows.sort((a,b)=>b.rating-a.rating).slice(0,limit)
}
async function query(q,opts={}){
 const result={query:q,intent:classify(q),rows:[],warnings:[]};
 if(result.intent.preface){
  try{result.rows=prefaceRows(result.intent.preface,await getPrefaces(),opts.language||"es")}
  catch(err){result.warnings.push("Índice de prefacios: "+err.message)}
  return result
 }
 const tasks=[getCorpora(),getCodices()];
 const [p,c]=await Promise.allSettled(tasks);
 if(p.status==="fulfilled")result.rows.push(...passageRows(q,p.value,{concept:!!opts.concept}));
 else result.warnings.push("Corpus estructurado: "+p.reason?.message);
 if(c.status==="fulfilled")result.rows.push(...manuscriptRows(q,c.value));
 else result.warnings.push("Catálogo de códices: "+c.reason?.message);
 // Specific local document is deliberately preferred to an unrelated generic result.
 result.rows.sort((a,b)=>b.rating-a.rating);
 return result
}
window.VitruviaResearchEngine={canonical,classify,prefaceIntent,prefaceRows,query,lexicalScore,manuscriptRows,passageRows,version:"1.1-prefaces"};
})();