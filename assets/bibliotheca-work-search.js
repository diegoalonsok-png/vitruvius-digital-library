/* Bibliotheca home work-title and author lookup.
 * Indexes catalogued works, not book contents. Aliases are search aids only.
 */
(()=>{"use strict";
const path="data/classics-corpus/title-search-aliases-multilingual.json";
const lang={la:"latín",grc:"griego",es:"castellano",en:"inglés",fr:"francés",it:"italiano",de:"alemán",pt:"portugués"};
const greek={α:"a",β:"b",γ:"g",δ:"d",ε:"e",ζ:"z",η:"e",θ:"th",ι:"i",κ:"k",λ:"l",μ:"m",ν:"n",ξ:"x",ο:"o",π:"p",ρ:"r",σ:"s",τ:"t",υ:"y",φ:"ph",χ:"ch",ψ:"ps",ω:"o"};
const normal=s=>String(s||"").normalize("NFKD").replace(/[\u0300-\u036f\u1dc0-\u1dff]/g,"").toLowerCase().replace(/ς/g,"σ").replace(/æ/g,"ae").replace(/œ/g,"oe").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const roman=s=>normal(s).replace(/[α-ω]/g,c=>greek[c]||c);
const fold=s=>normal(s);const norm=s=>normal(s);
const ancientGenres=[
 ["epic","Épica"],["lyric","Poesía lírica"],["tragedy","Tragedia"],["comedy","Comedia"],
 ["history","Historiografía"],["biography","Biografía"],["philosophy","Filosofía"],
 ["rhetoric","Retórica y oratoria"],["dialogue","Diálogo"],["satire","Sátira"],
 ["novel","Novela antigua"],["letters","Epistolografía"],["religion","Religión y exégesis"],
 ["medicine","Medicina"],["science","Ciencias y matemáticas"],["geography","Geografía"],
 ["architecture","Arquitectura y técnica"],["agriculture","Agronomía"],["law","Derecho"],
 ["grammar","Gramática y filología"],["other","Otros géneros registrados"]
];
const genrePatterns={
 epic:/epic|epop|epope|hom[eé]ric/,lyric:/liric|lyric|elegia|elegiac|oda|poesia amorosa/,
 tragedy:/traged|tragic/,comedy:/comed|comic/,
 history:/historiograf|historia|historical|cronica|annal/,
 biography:/biograf|vidas|vitae|life of/,philosophy:/filosof|philosoph|estoic|platon|aristotel|sapiencial|etica/,
 rhetoric:/retoric|rhetoric|oratoria|orat[oó]r|discurso|eloquenc/,
 dialogue:/dialog/,satire:/satir/,novel:/novela|romance|narrativa de ficcion/,
 letters:/epistolog|epistol|cartas|correspondencia/,
 religion:/cristian|religion|exeges|teolog|patrist|himno|hymn|mitolog|mitograf/,
 medicine:/medicin|farmacolog|medical/,science:/matemat|astronom|fisic|ciencia|naturalis|natural history/,
 geography:/geograf|cartograf|etnograf|periplo/,
 architecture:/arquitect|ingenier|agrimens|hidraul|mecanic|tecnic/,
 agriculture:/agricult|agronom|botanic/,law:/juridic|derecho|leyes|legal/,
 grammar:/gramat|linguist|filolog|erudic|lexic/
};
function ancientGenre(raw){
 const g=normal(raw);if(!g)return "";
 for(const [key] of ancientGenres)if(key!=="other"&&genrePatterns[key].test(g))return key;
 return "other";
}
function romanNumber(x){let n=0,last=0;for(const c of [...String(x).toUpperCase()].reverse()){const v={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}[c]||0;n+=v<last?-v:v;last=v}return n}
function centuryOf(raw){
 const s=normal(raw);
 if(!s||/debatid|indeterminad|inciert|uncertain|disput|atribucion|composicion y atribuciones/.test(s))return "";
 // Las fechas editoriales y de testimonios no son fechas de composición.
 if(/\b(?:edicion|edition|recensio|impresion|imprenta|publicacion|publicado|published|manuscrito|manuscript|codex|codice|copia|copiado|transcripcion|facsimil|rose|krohn)\b/.test(s))return "";
 const before=/\b(?:a c|a e c|bce|bc|antes de cristo)\b/.test(s);
 const after=/\b(?:d c|ce|ad|despues de cristo)\b/.test(s);
 if(before===after)return "";
 const era=before?"bce":"ce";
 const c=s.match(/\b(?:siglo|siglos|century|centuries|s)\s+([ivxlcdm]+)\b/);
 if(c){
  const all=[...s.matchAll(/\b(?:siglo|siglos|century|centuries|s)\s+([ivxlcdm]+)\b/g)];
  if(all.length!==1)return "";
  const tail=s.slice(c.index+c[0].length).trim().replace(/^(?:a c|a e c|bce|bc|d c|ce|ad)\b/,"").trim();
  if(/^[ivxlcdm]+\b/.test(tail)||/\b(?:y|and|et)\s+[ivxlcdm]+\b/.test(tail))return "";
  const n=romanNumber(c[1]);return n>=1&&n<=14?era+":"+n:"";
 }
 const years=[...s.matchAll(/\b(\d{1,4})\b/g)].map(x=>Number(x[1])).filter(n=>n>0);
 if(!years.length||years.length>2)return "";
 const centuries=[...new Set(years.map(n=>Math.ceil(n/100)))];
 // Corpus antiguo: nunca clasificar como composición los años de una edición moderna.
 return centuries.length===1&&centuries[0]<=14?era+":"+centuries[0]:"";
}

/* Periodización histórica general orientativa. No representa una datación editorial
 * precisa ni reemplaza la ficha filológica. Solo se asigna si el intervalo de
 * composición queda completamente dentro del período. */
const historicalPeriods=[
 ["grc:archaic","Grecia · época arcaica (c. 800–480 a. C.)",-800,-481,"grc"],
 ["grc:classical","Grecia · época clásica (480–323 a. C.)",-480,-324,"grc"],
 ["grc:hellenistic","Grecia · época helenística (323–31 a. C.)",-323,-31,"grc"],
 ["grc:roman","Literatura griega de época romana (30 a. C.–284 d. C.)",-30,284,"grc"],
 ["grc:late","Literatura griega · Antigüedad tardía (285–700 d. C.)",285,700,"grc"],
 ["la:regal","Roma · época monárquica (753–509 a. C.)",-753,-510,"la"],
 ["la:republic","Roma · República (509–27 a. C.)",-509,-28,"la"],
 ["la:principate","Roma · Principado (27 a. C.–284 d. C.)",-27,284,"la"],
 ["la:late","Literatura latina · Antigüedad tardía (285–700 d. C.)",285,700,"la"]
];
function compositionSpan(raw){
 const s=normal(raw);
 if(!s||/debatid|indeterminad|inciert|uncertain|disput|atribucion|edicion|edition|recensio|imprenta|publicacion|manuscrito|manuscript|codex|codice|facsimil|rose|krohn/.test(s))return null;
 const before=/\b(?:a c|a e c|bce|bc|antes de cristo)\b/.test(s);
 const after=/\b(?:d c|ce|ad|despues de cristo)\b/.test(s);
 if(before===after)return null;
 const sign=before?-1:1;
 const cs=s.match(/\b(?:siglo|siglos|century|centuries|s)\s+([ivxlcdm]+)\b/);
 if(cs){
  if(/\b(?:siglos|centuries)\b/.test(cs[0])&&/\b(?:y|and|et)\b/.test(s))return null;
  const remainder=s.slice(cs.index+cs[0].length).replace(/\b(?:a c|a e c|bce|bc|d c|ce|ad)\b/g,"").trim();
  if(/^[ivxlcdm]+\b/.test(remainder))return null;
  const n=romanNumber(cs[1]);if(n<1||n>14)return null;
  return sign<0?[-100*n,-100*(n-1)-1]:[100*(n-1)+1,100*n];
 }
 const years=[...s.matchAll(/\b(\d{1,4})\b/g)].map(x=>Number(x[1])).filter(n=>n>0);
 if(!years.length||years.length>2||years.some(n=>n>1400))return null;
 const bounds=years.map(y=>sign*y);
 return [Math.min(...bounds),Math.max(...bounds)];
}
function periodOfWork(w){
 const span=compositionSpan(w.dating);
 if(!span)return "";
 const tongues=new Set(w.versions.filter(v=>["grc","la"].includes(v.language)).map(v=>v.language));
 // Unoriginal-language entry is not enough to infer a historical tradition.
 if(tongues.size!==1)return "";
 const language=[...tongues][0];
 return historicalPeriods.find(([id,label,from,to,lang])=>lang===language&&span[0]>=from&&span[1]<=to)?.[0]||"";
}

const make=(tag,text,cls)=>{
 const el=document.createElement(tag);if(text!=null)el.textContent=String(text);if(cls)el.className=cls;return el;
};
const safeReader=s=>typeof s==="string"&&(
 /^(?:classics-text-reader|lector-bilingue|classics-parallel-reader|classics-remote-[a-z-]+-reader)\.html\?[\w.%=&+-]+$/.test(s)||
 /^corpus\/[a-z0-9/_-]+\.html$/i.test(s))?s:null;
const workLink=id=>"classics-work-record.html?work="+encodeURIComponent(id);
const facLink=id=>"buscador-facsimiles-clasicos.html?obra="+encodeURIComponent(id);
const periodLabel=w=>historicalPeriods.find(([id])=>id===periodOfWork(w))?.[1]||"";
let model=null,loadedAliases={};
function rank(w,query){
 const qs=[normal(query),roman(query)],fields=w.forms||[];
 let best=0;
 for(const field of fields){
  for(const txt of [normal(field),roman(field)]){
   if(!txt)continue;
   for(const q of qs){
    if(!q)continue;
    if(txt===q)best=Math.max(best,130);
    else if(txt.startsWith(q+" "))best=Math.max(best,112);
    else if(txt.includes(q))best=Math.max(best,89);
    else if(q.includes(" ")&&q.split(" ").every(token=>txt.includes(token)))best=Math.max(best,73);
   }
  }
 }
 const a=normal(w.author);
 for(const q of qs){
  if(a===q)best=Math.max(best,94);
  else if(a.startsWith(q))best=Math.max(best,72);
  else if(a.includes(q))best=Math.max(best,62);
 }
 return best;
}
function addLink(parent,text,href){
 if(!href)return;
 const a=make("a",text);a.href=href;parent.append(a);
}
function render(){
 if(!model)return;
 const {input,list,count,more,limit}=model,q=input.value.trim();
 const items=model.items.filter(w=>{
  const author=fold(model.authorFilter.value.trim());
  const genre=model.genreFilter.value,century=model.centuryFilter.value,period=model.periodFilter.value,language=model.languageFilter.value,letter=model.letter;
  const group=ancientGenre(w.genre);
  const key=norm(model.sortFilter.value==="title"?w.title:w.author).trim();
  return (!author||[w.author,...w.forms].some(x=>fold(x).includes(author)))&&(!genre||group===genre)&&(!century||centuryOf(w.dating)===century)&&(!period||periodOfWork(w)===period)&&(!language||w.versions.some(v=>v.language===language))&&(!letter||key.startsWith(norm(letter)));
 });
 list.replaceChildren();more.hidden=true;
 if(!q){
  model.region.hidden=false;
  count.textContent="Catálogo completo · "+items.length+" obras. Escriba para filtrar por título o autor.";
  const all=[...items].sort((a,b)=>model.sortFilter.value==="title"?a.title.localeCompare(b.title,"es",{sensitivity:"base"}):a.author.localeCompare(b.author,"es",{sensitivity:"base"})||a.title.localeCompare(b.title,"es",{sensitivity:"base"}));
  for(const w of all.slice(0,limit)){
   const li=make("li",null,"bws-item"),heading=make("div",null,"bws-heading");
   heading.append(make("strong",w.title),make("span"," · "+w.author));li.append(heading);
   const meta=make("p",null,"bws-meta"),languages=[...new Set(w.versions.filter(v=>safeReader(v.reader)).map(v=>lang[v.language]||v.language))];
   meta.textContent=[w.genre||"",w.dating||"",periodLabel(w),languages.length?"Textos con acceso: "+languages.join(", "):w.facsimile?"Facsímil disponible · OCR automático":"Ficha catalográfica; texto no alojado"].filter(Boolean).join(" · ");li.append(meta);
   const actions=make("nav",null,"bws-actions");
   const o=w.versions.find(v=>["la","grc"].includes(v.language)&&safeReader(v.reader)),t=w.versions.find(v=>!["la","grc"].includes(v.language)&&safeReader(v.reader));
   if(o)addLink(actions,"Leer original",safeReader(o.reader));
   if(o){const u=new URL("classics-simple-parallel.html",location.href);u.searchParams.set("work",w.id);u.searchParams.set("left",o.language);u.searchParams.set("right","auto-es");addLink(actions,"Lectura simplificada",u.pathname+u.search);}
   if(t)addLink(actions,"Leer traducción · "+(lang[t.language]||t.language),safeReader(t.reader));
   if(w.facsimile)addLink(actions,"Ver facsímil",facLink(w.facsimile));
   if(!w.newWork)addLink(actions,"Ficha académica",workLink(w.id));
   li.append(actions);list.append(li);
  }
  if(all.length>limit){more.hidden=false;more.textContent="Mostrar más obras ("+(all.length-limit)+" restantes)"}
  return;
 }
 model.region.hidden=false;
 if(normal(q).length<2){count.textContent="Escriba al menos dos caracteres.";return}
 const found=items.map(w=>({w,rank:rank(w,q)})).filter(r=>r.rank>0)
  .sort((a,b)=>b.rank-a.rank||a.w.title.localeCompare(b.w.title,"es",{sensitivity:"base"}));
 count.textContent=found.length+" "+(found.length===1?"obra encontrada":"obras encontradas")+
  " por título o autor. Las equivalencias lingüísticas son claves de búsqueda, no traducciones alojadas.";
 if(!found.length){list.append(make("li","No se encontraron obras con ese título o autor. Pruebe otra grafía o denominación.","bws-empty"));return}
 for(const {w} of found.slice(0,limit)){
  const item=make("li",null,"bws-item");
  const heading=make("div",null,"bws-heading");
  heading.append(make("strong",w.title),make("span"," · "+w.author));item.append(heading);
  const meta=make("p",null,"bws-meta");
  const langs=w.versions.filter(v=>safeReader(v.reader)).map(v=>lang[v.language]||v.language);
  const avail=[...new Set(langs)];
  meta.textContent=[w.genre||"",w.dating||"",periodLabel(w)].filter(Boolean).join(" · ")+(w.genre||w.dating?" · ":"")+
   (avail.length?"Textos con acceso: "+avail.join(", "):w.facsimile?"Facsímil localizado; OCR no cotejado":"Ficha catalográfica; texto no disponible en este índice");
  item.append(meta);
  const actions=make("nav",null,"bws-actions");actions.setAttribute("aria-label","Acciones de "+w.title);
  const original=w.versions.find(v=>["la","grc"].includes(v.language)&&safeReader(v.reader));
  const translation=w.versions.find(v=>!["la","grc"].includes(v.language)&&safeReader(v.reader));
  if(original)addLink(actions,"Leer original",safeReader(original.reader));
  if(original){const u=new URL("classics-simple-parallel.html",location.href);u.searchParams.set("work",w.id);u.searchParams.set("left",original.language);u.searchParams.set("right","auto-es");addLink(actions,"Lectura simplificada",u.pathname+u.search);}
  if(translation)addLink(actions,"Leer traducción · "+(lang[translation.language]||translation.language),safeReader(translation.reader));
  if(w.facsimile)addLink(actions,"Ver facsímil",facLink(w.facsimile));
  if(!w.newWork)addLink(actions,"Ficha académica",workLink(w.id));
  item.append(actions);list.append(item);
 }
 if(found.length>limit){more.hidden=false;more.textContent="Mostrar más ("+(found.length-limit)+" restantes)"}
}
function mount(parent,data){
 if(model||!parent||!Array.isArray(data?.catalog?.works)||!Array.isArray(data?.registry?.entries))return;
 const index=new Map();
 for(const w of data.catalog.works)index.set(w.id,{
  id:w.id,title:w.title,author:w.author,genre:w.genre||"",dating:w.dating||"",forms:[w.title,w.id.replaceAll("-"," ")],
  versions:[],facsimile:null,newWork:false
 });
 for(const e of data.registry.entries){
  const w=index.get(e.workId);if(!w)continue;
  w.forms.push(e.title||"");if(safeReader(e.reader))w.versions.push(e);
 }
 const section=make("section",null,"bws");section.id="bibliotheca-work-search";
 section.setAttribute("aria-labelledby","bws-title");
 const title=make("h3","Buscar obras clásicas");title.id="bws-title";
 const subtitle=make("p","Índice académico por autor, título, género antiguo y siglo de composición (a. C. / d. C.). Los filtros no confunden la fecha de la obra con la del manuscrito o edición. Los datos no determinados permanecen sin atribución cronológica.","bws-intro");
 const form=make("form");form.setAttribute("role","search");form.setAttribute("aria-label","Búsqueda de obras clásicas");
 const label=make("label","Obra o autor");label.htmlFor="bws-query";
 const row=make("div",null,"bws-row");
 const input=make("input");input.id="bws-query";input.type="search";input.autocomplete="off";input.spellcheck=false;
 input.placeholder="De architectura · Περὶ ποιητικῆς · Ἰλιάς · Iliad · La République";
 input.setAttribute("aria-controls","bws-results");
 const submit=make("button","Buscar obra");submit.type="submit";
 row.append(input,submit);form.append(label,row);
 const region=make("div");region.hidden=true;
 const count=make("p",null,"bws-count");count.id="bws-count";count.setAttribute("role","status");count.setAttribute("aria-live","polite");
 const list=make("ol",null,"bws-results");list.id="bws-results";
 const more=make("button","Mostrar más obras","bws-more");more.type="button";more.hidden=true;
 region.append(count,list,more);
 const help=make("p",null,"bws-help");
 help.append("Para buscar palabras y pasajes dentro de las ediciones, consulte ");
 addLink(help,"Vitruvia","vitruvia.html");help.append(" o ");addLink(help,"Lexicon","vitruvia-lexicon.html");help.append(".");
 const filters=make("div",null,"bws-library-filters");
 const authorFilter=make("input");authorFilter.type="search";authorFilter.placeholder="Filtrar por autor · Ὅμηρος / Homero / Homer";authorFilter.setAttribute("aria-label","Filtrar por autor en cualquier idioma");
 const genreFilter=make("select");genreFilter.setAttribute("aria-label","Tipo de obra");genreFilter.append(new Option("Todos los tipos de obras",""));
 const presentGenres=new Set([...index.values()].map(w=>ancientGenre(w.genre)).filter(Boolean));
 ancientGenres.filter(([key])=>presentGenres.has(key)).forEach(([key,label])=>genreFilter.append(new Option(label,key)));
 const centuryFilter=make("select");centuryFilter.setAttribute("aria-label","Siglo de composición");
 centuryFilter.append(new Option("Todos los siglos de composición",""));
 const centuries=new Set([...index.values()].map(w=>centuryOf(w.dating)).filter(Boolean));
 for(const era of ["bce","ce"])for(let n=30;n>=1;n--){
  if(era==="ce"&&n>21)continue;
  const key=era+":"+n;if(!centuries.has(key))continue;
  const roman=(num)=>{let out="";for(const [v,t] of [[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]])while(num>=v){out+=t;num-=v}return out};
  centuryFilter.append(new Option("Siglo "+roman(n)+(era==="bce"?" a. C.":" d. C."),key));
 }
 const periodFilter=make("select");periodFilter.setAttribute("aria-label","Período histórico de Grecia o Roma");
 periodFilter.append(new Option("Todos los períodos históricos",""));
 const existingPeriods=new Set([...index.values()].map(w=>periodOfWork(w)).filter(Boolean));
 for(const [id,label] of historicalPeriods)if(existingPeriods.has(id))periodFilter.append(new Option(label,id));
 const languageFilter=make("select");languageFilter.setAttribute("aria-label","Lengua de texto disponible");
 [["","Todas las lenguas"],["grc","Griego"],["la","Latín"],["es","Castellano"],["en","Inglés"],["fr","Francés"]].forEach(([v,t])=>languageFilter.append(new Option(t,v)));
 const sortFilter=make("select");sortFilter.setAttribute("aria-label","Orden alfabético");
 [["author","Orden por autor A–Z"],["title","Orden por título A–Z"]].forEach(([v,t])=>sortFilter.append(new Option(t,v)));
 filters.append(authorFilter,genreFilter,centuryFilter,periodFilter,languageFilter,sortFilter);
 const alphabet=make("nav",null,"bws-alphabet");alphabet.setAttribute("aria-label","Índice alfabético por autor o título");
 for(const l of ["Todos",..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",..."ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"]){
  const b=make("button",l);b.type="button";b.setAttribute("aria-pressed",l==="Todos"?"true":"false");
  b.addEventListener("click",()=>{model.letter=l==="Todos"?"":l;model.limit=40;alphabet.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));render()});alphabet.append(b);
 }
 const historicalHint=make("p",null,"bws-help");
 historicalHint.append("Sistemas de datación de las fuentes: en Roma, magistraturas consulares y, en algunas cronografías, ab urbe condita (AUC); en Grecia, arcontes, éforos, Olimpiadas y eras locales. Son referencias históricas distintas de la cronología moderna y no se convierten automáticamente sin testimonio documental. ");
 addLink(historicalHint,"Criterios cronológicos","metodologia-catalogo-clasico.html#cronologia-antigua");
 const originalHint=make("p",null,"bws-help");
 originalHint.textContent="Puede escribir el título directamente en griego politónico o en latín; también buscar por transliteraciones o equivalencias documentadas. La periodización histórica solo se asigna cuando la fecha y la tradición lingüística acreditadas lo permiten.";
 const dateClarifier=make("p",null,"bws-help");
 dateClarifier.textContent="Cronología: el siglo corresponde a la composición antigua, nunca al año de la edición crítica (Rose 1899; Krohn 1912), del facsímil ni de la copia manuscrita. Fechas discutidas quedan sin asignación automática.";
 const standards=make("p",null,"bws-help");
 standards.append("Criterios editoriales: datación de composición documentada; género descriptivo y revisable; título original y variantes identificados; referencias Chicago 18 (notas y bibliografía). ");
 addLink(standards,"Metodología académica del índice","metodologia-catalogo-clasico.html");
 section.append(title,subtitle,form,filters,alphabet,historicalHint,originalHint,dateClarifier,standards,region,help);
 const metric=parent.querySelector(":scope > dl");
 if(metric)metric.insertAdjacentElement("beforebegin",section);else parent.prepend(section);
 model={items:[...index.values()],index,input,list,count,more,region,authorFilter,genreFilter,centuryFilter,periodFilter,languageFilter,sortFilter,letter:"",limit:40};
 for(const el of [authorFilter,genreFilter,centuryFilter,periodFilter,languageFilter,sortFilter])el.addEventListener("input",()=>{model.limit=40;render()});
 list.tabIndex=0;list.setAttribute("aria-label","Obras: use las flechas arriba y abajo, Intro para abrir el enlace");
 list.addEventListener("keydown",e=>{
  if(!["ArrowDown","ArrowUp","Home","End"].includes(e.key))return;
  const anchors=[...list.querySelectorAll("a")];if(!anchors.length)return;
  e.preventDefault();const ix=anchors.indexOf(document.activeElement);
  const next=e.key==="Home"?0:e.key==="End"?anchors.length-1:e.key==="ArrowUp"?Math.max(0,ix-1):Math.min(anchors.length-1,ix+1);
  anchors[next].focus();
 });
 document.addEventListener("keydown",e=>{
  if(!list.contains(document.activeElement)||!["ArrowDown","ArrowUp"].includes(e.key))return;
  const anchors=[...list.querySelectorAll("a")],ix=anchors.indexOf(document.activeElement);
  if(ix<0)return;e.preventDefault();anchors[Math.max(0,Math.min(anchors.length-1,ix+(e.key==="ArrowDown"?1:-1)))].focus();
 });
 form.addEventListener("submit",e=>{e.preventDefault();model.limit=40;render()});
 input.addEventListener("input",()=>{model.limit=40;render()});
 more.addEventListener("click",()=>{model.limit+=20;render()});
 render();
 fetch(path,{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("aliases unavailable");return r.json()}).then(j=>{
  loadedAliases=j.aliases||{};
  for(const [id,forms] of Object.entries(loadedAliases)){
   const w=index.get(id);if(w&&Array.isArray(forms))w.forms.push(...forms);
  }
  render();
 }).catch(()=>{/* Original-language catalogue remains searchable. */});
}
function addFacsimiles(v,cat){
 if(!model||!Array.isArray(cat?.items))return;
 const byEdition=new Map(cat.items.map(e=>[e.id,e]));
 // R2 edition IDs need not match the ancient-work catalogue ID.
 // Use the existing audited work-to-edition concordance.
 for(const [workId,editions] of Object.entries(v?.porObra||{})){
  const w=model.index.get(workId);if(!w)continue;
  for(const ed of editions){
   const fac=byEdition.get(ed.r2);
   w.facsimile ||= ed.r2;
   w.forms.push(ed.edicion||"",fac?.obra||"",fac?.tituloEdicion||"");
  }
 }
 for(const e of cat.items){
  const w=model.index.get(e.id);
  if(w){w.facsimile ||= e.id;w.forms.push(e.obra||"",e.tituloEdicion||"");}
 }
 for(const entry of v?.obrasNuevas||[]){
  if(model.index.has(entry.r2))continue;
  const w={id:entry.r2,title:entry.obra,author:entry.autor,genre:"",dating:"",forms:[entry.obra,entry.r2.replaceAll("-"," "),...(loadedAliases[entry.r2]||[])],
   versions:[],facsimile:entry.r2,newWork:true};
  model.index.set(w.id,w);model.items.push(w);
 }
 render();
}
window.BibliothecaWorkSearch={mount,addFacsimiles};
async function bootstrap(){
 const parent=document.querySelector(".searcharea");
 if(!parent||document.getElementById("bibliotheca-work-search"))return;
 try{
  const [catalogRes,registryRes]=await Promise.all([
   fetch("data/bibliotheca-graeca-latina-I-bce-I-ce.json"),
   fetch("data/classics-corpus/search-registry.json")
  ]);
  if(!catalogRes.ok||!registryRes.ok)throw Error("Catalog or registry unavailable");
  const [catalog,registry]=await Promise.all([catalogRes.json(),registryRes.json()]);
  mount(parent,{catalog,registry});
 }catch(error){console.warn("Catálogo alfabético no disponible:",error);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootstrap,{once:true});
else bootstrap();
})();