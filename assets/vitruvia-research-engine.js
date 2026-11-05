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
function parseReference(value){
 let input=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[–—−]/g,'-').replace(/\s+/g,' ').trim()
  .replace(/^(?:vitruvio|vitruvius|vitruve|vitr\.?)\s*[,;:]?\s*(?:de\s+arch(?:itectura)?\.?\s*)?/,'')
  .replace(/^de\s+arch(?:itectura)?\.?\s*/,'').trim();

 // Treat an appended author credit as context, not part of the locus.
 input=input.replace(/\s+(?:(?:de|del|por|by|of|di|da|do)\s+)?(?:marco\s+)?(?:marcus\s+)?vitruvi(?:o|us|i|e)(?:\s+pol(?:l)?io?n?)?\s*\.?$/i,'').trim();
 // Shorthand pref 1.2 refers to book I, preface, section 2.
 const shortPref=input.match(/^(?:pr|pref|praef|prefacio|preface|praefatio|prefazione|prologo|prologue|proemio|proemium|prooemium)\.?\s+(10|[1-9]|x|ix|viii|vii|vi|iv|iii|ii|i)\s*[.:/\s-]\s*(\d{1,3})\.?$/i);
 if(shortPref){
  const romanNumbers={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
  const book=romanNumbers[shortPref[1]]||Number(shortPref[1]),section=Number(shortPref[2]);
  if(book>=1&&book<=10&&section>=1&&section<=999)return{book,chapter:'praef',section};
 }

 if(!input)return null;
 const roman={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
 const ordinals={primer:1,primero:1,primera:1,first:1,primus:1,primo:1,premier:1,premiere:1,
 segundo:2,segunda:2,second:2,secondo:2,secundus:2,deuxieme:2,
 tercero:3,tercera:3,third:3,terzo:3,troisieme:3,
 cuarto:4,cuarta:4,fourth:4,quarto:4,quatrieme:4,
 quinto:5,quinta:5,fifth:5,quinto:5,cinquieme:5,
 sexto:6,sexta:6,sixth:6,sesto:6,sixieme:6,
 septimo:7,septima:7,seventh:7,settimo:7,septieme:7,
 octavo:8,octava:8,eighth:8,ottavo:8,huitieme:8,
 noveno:9,novena:9,ninth:9,nono:9,neuvieme:9,
 decimo:10,decima:10,tenth:10,dixieme:10};
 const bookValue=word=>{
  const w=String(word||'').toLowerCase(),n=/^\d{1,2}$/.test(w)?Number(w):roman[w]||ordinals[w]||null;
  return n>=1&&n<=10?n:null;
 };
 const sectionValue=word=>{
  const w=String(word||'').toLowerCase(),n=/^\d{1,3}$/.test(w)?Number(w):roman[w]||ordinals[w]||null;
  return n>=1&&n<=999?n:null;
 };
 const number='(?:10|[1-9]|viii|vii|vi|iv|iii|ii|ix|i|v|x|primero|primera|primer|segundo|segunda|tercero|tercera|cuarto|cuarta|quinto|quinta|sexto|sexta|septimo|septima|octavo|octava|noveno|novena|decimo|decima|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|premier|premiere|deuxieme|troisieme|quatrieme|cinquieme|sixieme|septieme|huitieme|neuvieme|dixieme|primo|secondo|terzo|quarto|quinto|sesto|settimo|ottavo|nono)';
 const bookWord='(?:libro|libros|liber|libri|lib\\.?|livre|livro|book|tomo|volumen|volume)';
 const preface='(?:pr|praef|praefatio|praefationes|pref|prefacio|prefacios|preface|prefaces|prefazione|prologo|prologue|prologus|proemio|proemium|prooemium)';
 const sep='(?:\\s*[.:/,-]\\s*|\\s+)';
 const full=new RegExp('^('+number+')'+sep+'('+preface+'|\\d{1,2})(?:'+sep+'(\\d{1,3}))?\\.?$','i');
 const stripped=input.replace(new RegExp('^'+bookWord+'\\s+','i'),'').trim();
 const compact=stripped.match(full);
 if(compact){
  const book=bookValue(compact[1]);
  if(!book)return null;
  const chapter=new RegExp('^'+preface+'$','i').test(compact[2])?'praef':Number(compact[2]);
  const section=compact[3]?Number(compact[3]):null;
  if(chapter===0||section===0)return null;
  return{book,chapter,section};
 }
 const prefPattern=new RegExp('\\b'+preface+'\\b','i'),prefMatch=input.match(prefPattern);
 const bookForward=input.match(new RegExp('\\b'+bookWord+'\\s*(?:n(?:umero|umber|[°º])?\\.?\\s*)?('+number+')\\b','i'));
 const bookReverse=input.match(new RegExp('\\b('+number+')\\s+'+bookWord+'\\b','i'));
 let book=bookValue(bookForward?.[1]||bookReverse?.[1]);
 if(prefMatch){
  const after=input.slice(prefMatch.index+prefMatch[0].length);
  const beforeBook=after.match(new RegExp('^\\s*('+number+')\\s+(?:de(?:l)?\\s+)?'+bookWord+'\\b','i'));
  const sectionWord=input.match(/\b(?:seccion|apartado|parrafo|paragraph|section|paragraphe|caput)\s*(?:n(?:[°º])?\.?\s*)?([ivx]+|\d{1,3}|primero|primera|first|premier)\b/i);
  let section=sectionValue(sectionWord?.[1]);
  if(book&&beforeBook&&!section)section=sectionValue(beforeBook[1]);
  if(book&&!section){
   const afterBook=after.match(new RegExp('(?:\\b'+bookWord+'\\b\\s*'+number+'\\b)\\s*[,;:.\\-]?\\s*([ivx]+|\\d{1,3})\\s*$','i'));
   if(afterBook)section=sectionValue(afterBook[1]);
  }
  if(!book){
   const direct=after.match(new RegExp('^\\s*('+number+')\\s*$','i'));
   if(direct)book=bookValue(direct[1]);
  }
  return book?{book,chapter:'praef',section}:null;
 }
 if(book){
  const chapterWord=input.match(/\b(?:capitulo|caput|chapitre|chapter|cap)\s*(?:n(?:[°º])?\.?\s*)?([ivx]+|\d{1,2})\b/i);
  const chapter=chapterWord?sectionValue(chapterWord[1]):null;
  const sectionWord=input.match(/\b(?:seccion|parrafo|section|paragraph)\s*(?:n(?:[°º])?\.?\s*)?(\d{1,3})\b/i);
  return{book,chapter,section:chapter?sectionValue(sectionWord?.[1]):null};
 }
 const bareBook=bookValue(stripped.replace(/[.]$/,''));
 return bareBook?{book:bareBook,chapter:null,section:null}:null;
}

function locus(q){
 const ref=parseReference(q);
 if(!ref||ref.chapter===null||ref.chapter==='praef')return null;
 return String(ref.book)+'.'+String(ref.chapter)+(ref.section==null?'':'.'+String(ref.section));
}
function prefaceIntent(query){
 const ref=parseReference(query);
 if(ref?.chapter==='praef')return{book:ref.book,section:ref.section};
 const n=canonical(query);
 if(!/\b(prefacio|prefacios|preface|prefaces|praefatio|praefationes|praef|pref|pr|prologo|prologue|prologus|proemio|proemium|prooemium|prefazione)\b/.test(n))return null;
 // Incomplete natural queries intentionally search across books: "prefacio I del libro"
 // requests section I but does not identify which book it belongs to.
 const partial=n.match(/\b(?:prefacio|preface|praefatio|prefazione|prologo|prologue|praef|pref)\s+(i|ii|iii|iv|v|vi|vii|viii|ix|x|\d{1,2})\s+(?:de(?:l)?\s+)?(?:libro|book|livre|liber|livro)\s*$/);
 const roman={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
 const val=partial?.[1],section=val?(roman[val]||Number(val)):null;
 return{book:null,section:section>=1&&section<=99?section:null};
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
   author:"Marco Vitruvio Polión · "+(g.language==="en"?"inglés":g.language==="fr"?"francés":"castellano")+" · "+g.version,
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
async function fetchJSON(url){if(window.VitruviaData)return window.VitruviaData.json(base+url);const response=await fetch(base+url,{headers:{accept:"application/json"}});if(!response.ok)throw Error("Archivo no disponible: "+url+" ("+response.status+")");return response.json()}
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
  if(loc){
   if(p.locus===loc){rating=2500;where="Locus exacto"}
   else if(loc.split('.').length===2&&p.locus.startsWith(loc+'.')){rating=2350;where="Capítulo solicitado"}
   else if(loc.split('.').length===3&&p.locus.startsWith(loc.slice(0,loc.lastIndexOf("."))+'.')){rating=80;where="Capítulo relacionado"}
  }
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
 // Hyphenated shorthand is ambiguous in human usage. Keep "Libro II-1" as
 // chapter 1, but offer Preface II.1 explicitly rather than silently changing it.
 const abbreviated=String(q||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .match(/^\s*(?:libro|liber|livre|livro|book)\s+(10|[1-9]|x|ix|viii|vii|vi|iv|iii|ii|i)\s*[-–—]\s*1\s*$/i);
 if(abbreviated){
  const ref=parseReference(q);
  if(ref?.book&&ref.chapter===1&&ref.section==null){
   try{
    const alternatives=prefaceRows({book:ref.book,section:1},await getPrefaces(),opts.language||"es");
    if(alternatives.length){
     const roman=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
     const suggestion={...alternatives[0],
      title:"¿Buscabas el prefacio del Libro "+roman[ref.book]+"? · §1",
      excerpt:"La notación con guion se interpreta como capítulo 1. El prefacio es una referencia distinta: "+ref.book+".praef.1.",
      meta:"Referencia alternativa · "+ref.book+".praef.1 · texto latino y traducción",
      rating:400};
     result.rows.push(suggestion);
    }
   }catch(err){result.warnings.push("Alternativa de prefacio no disponible: "+err.message)}
  }
 }
 // Specific local document is deliberately preferred to an unrelated generic result.
 result.rows.sort((a,b)=>b.rating-a.rating);
 return result
}
window.VitruviaResearchEngine={canonical,classify,prefaceIntent,prefaceRows,query,lexicalScore,manuscriptRows,passageRows,getCorpora,version:"1.2-context-panel"};
})();
