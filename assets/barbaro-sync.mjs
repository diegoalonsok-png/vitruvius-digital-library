/* Barbaro 1567 · sincronización por libro y capítulo, búsqueda por locus y búsqueda léxica con resaltado.
   Datos: data/barbaro-1567-concordance.json, data/text/barbaro-1567-{it,la}.json y
   data/ocr/barbaro-1567-{it,la}/NNNN.json (OCR con cajas de palabra). El OCR de tipografía del siglo XVI
   tiene errores: se tolera una letra de diferencia en palabras largas y se pide cotejar la imagen. */
const $=id=>document.getElementById(id);
const ED={it:"Italiano",la:"Latín"};
const ROMAN={i:1,ii:2,iii:3,iiii:4,iv:4,v:5,vi:6,vii:7,viii:8,viiii:9,ix:9,x:10,xi:11,xii:12,xiii:13,xiiii:14,xiv:14,xv:15,xvi:16,xvii:17,xviii:18,xix:19,xx:20};
const num=s=>{s=String(s||"").toLowerCase();return ROMAN[s]||(/^\d+$/.test(s)?Number(s):null)};
const romanOf=n=>["","I","II","III","IV","V","VI","VII","VIII","IX","X"][n]||String(n);
// Misma normalización que el OCR: ſ→s (y la f que el OCR lee por ſ), ae/æ/ę→e, u/v, i/j, sin acentos.
const mfold=s=>String(s||"").replace(/ſ/g,"s").replace(/[æÆ]/g,"ae").replace(/[œŒ]/g,"oe").replace(/ę/g,"e").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/v/g,"u").replace(/j/g,"i").replace(/ae/g,"e").replace(/f/g,"s");
const lev=(a,b)=>{if(Math.abs(a.length-b.length)>1)return 9;let p=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const c=[i];for(let j=1;j<=b.length;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[b.length]};
let conc=null,spans={it:new Map(),la:new Map()},texts={},syncing=false,pending={it:null,la:null},lastQuery=null;

/* ---------- Interfaz ---------- */
function ui(){
 const css=document.createElement("style");css.textContent=`
.bsync{border:1px solid rgba(190,160,100,.45);border-radius:6px;padding:16px 18px;margin:0 0 18px}
.bsync h2{margin:0 0 8px;font-size:20px}.bsync form{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.bsync input[type=search]{flex:1 1 320px;padding:9px 10px;font-size:16px}.bsync select,.bsync button{padding:8px 10px}
.bsync .bs-status{font-size:13.5px;opacity:.85;margin:6px 0}.bsync ol{margin:8px 0 0;padding-left:22px;max-height:420px;overflow:auto}
.bsync li{margin:0 0 8px;line-height:1.5}.bsync li button{all:unset;cursor:pointer;text-decoration:underline;font-weight:600}
.bsync mark,.ocr-text mark{background:#ffe14d;color:#111;padding:0 1px}.bsync small{opacity:.75}
.hl-wrap{position:relative;display:block;margin:0 auto}.hl-wrap img{display:block;width:100%}
.hl-layer{position:absolute;inset:0;pointer-events:none}.hl-box{position:absolute;background:rgba(255,225,0,.38);outline:2px solid rgba(230,180,0,.9);border-radius:2px}
.ocr-text{white-space:pre-wrap;font:13px/1.55 Georgia,serif;max-height:260px;overflow:auto;padding:8px;border:1px dashed rgba(190,160,100,.4)}
.bs-place{font-size:13px;opacity:.85;margin:4px 0}`;document.head.append(css);
 const box=document.createElement("section");box.className="bsync";box.setAttribute("aria-label","Sincronización y búsqueda");
 box.innerHTML=`<h2>Sincronizar y buscar</h2>
<label><input type="checkbox" id="bs-sync" checked> Sincronizar ambas ediciones por libro y capítulo</label>
<form id="bs-form" role="search"><input type="search" id="bs-q" placeholder="Locus (III.1, praef. II, libro 5 cap. 2) o palabra o frase: symmetria, simmetria, de electione locorum" aria-label="Buscar en Barbaro 1567">
<select id="bs-where" aria-label="Edición"><option value="both">Ambas ediciones</option><option value="la">Solo latín</option><option value="it">Solo italiano</option></select>
<button type="submit">Buscar</button></form>
<p class="bs-status" id="bs-status">Cargando la concordancia…</p><ol id="bs-results"></ol>`;
 const head=document.querySelector(".head");head.after(box);
 for(const w of ["it","la"]){
  const img=$(w+"-image"),wrap=document.createElement("div");wrap.className="hl-wrap";img.before(wrap);wrap.append(img);
  const layer=document.createElement("div");layer.className="hl-layer";layer.id=w+"-layer";wrap.append(layer);
  const place=document.createElement("p");place.className="bs-place";place.id=w+"-place";$(w+"-label").after(place);
  const det=document.createElement("details");det.innerHTML=`<summary>Texto OCR de esta imagen (consulta; coteja la imagen)</summary><div class="ocr-text" id="${w}-ocr"></div>`;
  $(w+"-status").after(det);
  const st=window.BarbaroParallel?.state?.[w];if(st)window.BarbaroParallel.setZoom(w,st.zoom);
 }
 const note=document.querySelector(".notice");
 if(note)note.innerHTML="<strong>Nota ecdótica:</strong> la sincronización es orientativa: se basa en los títulos de libro y capítulo detectados por OCR y, en el latín, en la ubicación de cada locus de V514 por coincidencia de palabras. Los números de imagen siguen siendo índices digitales: coteja siempre texto y lámina.";
}

/* ---------- Concordancia ---------- */
function key(b,c){return b+"|"+c}
function buildSpans(){
 for(const w of ["it","la"]){spans[w]=new Map();
  for(const e of conc.editions[w]||[]){if(!e.book)continue;
   for(const k of [key(e.book,e.chapter??"0"),key(e.book,"*")]){const s=spans[w].get(k);if(!s)spans[w].set(k,[e.page,e.page]);else s[1]=e.page}}}
}
const entry=(w,p)=>conc?.editions?.[w]?.[p-1]||null;
function placeText(e){if(!e?.book)return"Libro y capítulo no detectados en esta imagen";
 return "Libro "+romanOf(e.book)+(e.chapter==="praef"?" · proemio":e.chapter?" · capítulo "+e.chapter:"")+(e.loci?.length?" · loci "+e.loci.slice(0,6).join(", "):"")}
function target(w,book,chapter,frac=0){
 const s=spans[w].get(key(book,chapter??"0"))||spans[w].get(key(book,"*"));if(!s)return null;
 return Math.min(s[1],s[0]+Math.round(frac*(s[1]-s[0])));
}
function syncFrom(w,p){
 const e=entry(w,p);if(!e?.book)return;
 const other=w==="it"?"la":"it";
 // Si ambas ediciones tienen detectado el mismo capítulo, proporción dentro del capítulo;
 // si no, proporción dentro del libro (los títulos de capítulo leídos por OCR son incompletos).
 const sc=spans[w].get(key(e.book,e.chapter??"0")),oc=spans[other].get(key(e.book,e.chapter??"0"));
 const sb=spans[w].get(key(e.book,"*")),ob=spans[other].get(key(e.book,"*"));
 const [s,o]=sc&&oc?[sc,oc]:[sb,ob];if(!s||!o)return;
 const frac=s[1]>s[0]?(p-s[0])/(s[1]-s[0]):0;
 const page=Math.min(o[1],o[0]+Math.round(frac*(o[1]-o[0])));
 if(page&&page!==window.BarbaroParallel.state[other].number){syncing=true;window.BarbaroParallel.loadPage(other,page,"sync");syncing=false}
}

/* ---------- Búsqueda ---------- */
function parseLocus(q){
 const s=q.trim().toLowerCase().replace(/\s+/g," ");let m;
 if((m=s.match(/^(?:praef(?:atio|\.)?|prefacio|proemio|prooemium|proemium|pr\.)\s*(?:del?\s*)?(?:libro|liber|lib\.?)?\s*([ivx]+|\d+)$/)))return{book:num(m[1]),chapter:"praef"};
 if((m=s.match(/^(?:libro|liber|lib\.?|book)\s*([ivx]+|\d+)\s*(?:,?\s*(?:prefacio|proemio|praef\.?|prooemium))$/)))return{book:num(m[1]),chapter:"praef"};
 if((m=s.match(/^(?:libro|liber|lib\.?|book)\s*([ivx]+|\d+)(?:\s*,?\s*(?:cap(?:[ií]tulo|itulum|\.)?|c\.)\s*([ivx]+|\d+))?$/)))return{book:num(m[1]),chapter:m[2]?num(m[2]):null};
 if((m=s.match(/^([ivx]+|\d+)\s*[.,:]\s*(praef|\d+)(?:\s*[.,:]\s*(\d+))?$/)))return{book:num(m[1]),chapter:m[2]==="praef"?"praef":Number(m[2]),section:m[3]?Number(m[3]):null};
 return null;
}
// Variantes orientativas: grafías del impreso y forma italiana de una palabra latina (y viceversa).
function variants(word){
 const w=mfold(word),out=new Set([w]);
 const add=x=>{if(x&&x.length>=3)out.add(x)};
 add(w.replace(/y/g,"i"));add(w.replace(/ph/g,"s").replace(/th/g,"t").replace(/y/g,"i"));
 const it=w.replace(/y/g,"i").replace(/ph/g,"s").replace(/th/g,"t").replace(/x/g,"ss").replace(/ct/g,"tt").replace(/pt/g,"tt").replace(/mm/g,"mm");
 add(it);add(it.replace(/tio$/,"tione").replace(/tionem$/,"tione").replace(/tiones$/,"tioni"));
 add(it.replace(/(us|um)$/,"o"));add(it.replace(/(ae|e)$/,"a"));add(it.replace(/ia$/,"ia"));add(it.replace(/^sy/,"si").replace(/mmetri/,"mmetri"));
 if(/a$/.test(w))add(w+"e");if(/o$/.test(w)){add(w.replace(/o$/,"us"));add(w.replace(/o$/,"um"))}
 if(/ione$/.test(w))add(w.replace(/ione$/,"io"));
 return[...out];
}
function tokens(text){const out=[];const re=/[\p{L}ſ]+/gu;let m;while((m=re.exec(text)))out.push({start:m.index,end:m.index+m[0].length,f:mfold(m[0])});return out}
function wordMatch(tok,vs){return vs.some(v=>tok===v||(v.length>=6&&tok.length>=5&&lev(tok,v)<=1)||(v.length>=7&&tok.startsWith(v.slice(0,v.length-2))&&tok.length<=v.length+3))}
function findIn(text,qw){
 const t=tokens(text),hits=[];
 for(let i=0;i<=t.length-qw.length;i++){
  let ok=true;for(let k=0;k<qw.length;k++)if(!wordMatch(t[i+k].f,qw[k])){ok=false;break}
  if(ok){hits.push([t[i].start,t[i+qw.length-1].end]);i+=qw.length-1}
 }
 return hits;
}
// Léxico del sitio: una palabra castellana, francesa o inglesa («simetría») suma su lema latino y sus formas;
// un lema latino suma sus formas declinadas.
let lexicon=null;
async function lexicalForms(word){
 if(!lexicon)lexicon=await fetch("data/latin-lexicon.json").then(r=>r.json()).then(d=>d.entries||[]).catch(()=>[]);
 const f=mfold(word),out=new Set();
 for(const e of lexicon){
  const glosses=[e.es,e.en,e.fr].filter(Boolean).flatMap(g=>String(g).split(/[;,/]/)).map(x=>mfold(x.trim()));
  const forms=[e.lemma,...(e.forms||[])].map(mfold);
  const near=f.length>=6&&forms.some(x=>lev(x.replace(/y/g,"i").replace(/(.)\1/g,"$1"),f.replace(/(.)\1/g,"$1"))<=1);
  if(glosses.includes(f)||forms.includes(f)||near)for(const x of forms)out.add(x);
 }
 return[...out];
}
async function loadText(w){if(texts[w])return texts[w];const r=await fetch("data/text/barbaro-1567-"+w+".json");if(!r.ok)throw Error("OCR en preparación");texts[w]=await r.json();return texts[w]}
function snippet(text,[a,b]){const s=Math.max(0,a-90),e=Math.min(text.length,b+120);
 const frag=document.createDocumentFragment();frag.append((s?"…":"")+text.slice(s,a).replace(/\s+/g," "));const m=document.createElement("mark");m.textContent=text.slice(a,b);frag.append(m,text.slice(b,e).replace(/\s+/g," ")+(e<text.length?"…":""));return frag}
async function search(q){
 const status=$("bs-status"),list=$("bs-results");list.replaceChildren();
 const loc=parseLocus(q);
 if(loc){lastQuery=null;
  if(!conc){status.textContent="La concordancia todavía no está publicada: no se puede ubicar el locus.";return}
  let la=null,it=null;
  if(loc.section){const k=loc.book+"."+loc.chapter+"."+loc.section;const e=(conc.editions.la||[]).find(x=>(x.loci||[]).includes(k));if(e)la=e.page}
  la=la||target("la",loc.book,loc.chapter);
  const sp=spans.la.get(key(loc.book,loc.chapter??"0"));const frac=la&&sp&&sp[1]>sp[0]?(la-sp[0])/(sp[1]-sp[0]):0;
  it=target("it",loc.book,loc.chapter,frac);
  syncing=true;if(la)window.BarbaroParallel.loadPage("la",la,"search");if(it)window.BarbaroParallel.loadPage("it",it,"search");syncing=false;
  status.textContent=la||it?"Libro "+romanOf(loc.book)+(loc.chapter==="praef"?" · proemio":loc.chapter?" · capítulo "+loc.chapter:"")+(loc.section?" · sección "+loc.section:"")+": latín imagen "+(la||"—")+", italiano imagen "+(it||"—")+". Ubicación orientativa por OCR: coteja la imagen.":"No se detectó ese libro o capítulo en el OCR de las ediciones.";
  return;
 }
 const words=q.trim().split(/\s+/).filter(Boolean);if(!words.length)return;
 const qw=[];for(const w of words){const v=new Set(variants(w));if(words.length===1)for(const x of await lexicalForms(w))for(const y of variants(x))v.add(y);qw.push([...v])}lastQuery=qw;
 const where=$("bs-where").value,eds=where==="both"?["la","it"]:[where];
 status.textContent="Buscando en el OCR…";
 let total=0;
 for(const w of eds){
  let pages;try{pages=await loadText(w)}catch(e){status.textContent="El OCR de Barbaro 1567 todavía se está preparando; la búsqueda por palabra estará disponible cuando se publique.";return}
  const h=document.createElement("li");h.style.listStyle="none";h.innerHTML="<strong>"+ED[w]+" · 1567</strong>";list.append(h);
  let n=0;
  for(const p of pages){const hits=findIn(p.text||"",qw);if(!hits.length)continue;total+=hits.length;
   if(n>=60)continue;n++;
   const li=document.createElement("li"),b=document.createElement("button");b.type="button";
   b.textContent="Imagen "+p.page+(p.label?" · p. impresa "+p.label:"")+" · "+placeText(entry(w,p.page));
   b.addEventListener("click",()=>{pending[w]=qw;window.BarbaroParallel.loadPage(w,p.page,"search");document.querySelector("#"+w+"-image")?.scrollIntoView({behavior:"smooth",block:"center"})});
   const sm=document.createElement("small");sm.append(" "+hits.length+" coincidencia(s) · ");
   li.append(b,document.createElement("br"),snippet(p.text,hits[0]),document.createElement("br"),sm);list.append(li);
  }
  if(!n){const li=document.createElement("li");li.textContent="Sin coincidencias en el OCR (esto no prueba que la palabra falte en el impreso).";list.append(li)}
 }
 status.textContent=total+" coincidencias en el OCR · variantes buscadas: "+qw.map(v=>v.slice(0,8).join("/")).join(" + ")+" · equivalencias latín–italiano orientativas; se tolera una letra de error de OCR.";
}

/* ---------- Resaltado sobre la imagen y texto OCR ---------- */
async function highlight(w,p){
 const layer=$(w+"-layer"),pane=$(w+"-ocr");if(!layer)return;layer.replaceChildren();if(pane)pane.textContent="";
 const qw=pending[w]||lastQuery;pending[w]=null;
 let d=null;try{const r=await fetch("data/ocr/barbaro-1567-"+w+"/"+String(p).padStart(4,"0")+".json");if(r.ok)d=await r.json()}catch{}
 if(window.BarbaroParallel.state[w].number!==p)return;
 if(!d){if(pane)pane.textContent="OCR de esta imagen todavía no publicado.";return}
 const text=d.text||"";
 if(pane){if(qw){const hits=findIn(text,qw);let at=0;for(const h of hits){pane.append(text.slice(at,h[0]));const m=document.createElement("mark");m.textContent=text.slice(h[0],h[1]);pane.append(m);at=h[1]}pane.append(text.slice(at))}else pane.textContent=text}
 if(!qw)return;
 const ws=d.words||[];let first=null;
 for(let i=0;i<=ws.length-qw.length;i++){
  let ok=true;for(let k=0;k<qw.length;k++){const t=tokens(ws[i+k][0])[0];if(!t||!wordMatch(t.f,qw[k])){ok=false;break}}
  if(!ok)continue;
  for(let k=0;k<qw.length;k++){const [,x,y,bw,bh]=ws[i+k];const b=document.createElement("div");b.className="hl-box";
   b.style.left=(x/10)+"%";b.style.top=(y/10)+"%";b.style.width=(bw/10)+"%";b.style.height=(bh/10)+"%";layer.append(b);first=first||b}
 }
 if(first&&window.BarbaroParallel.state[w]._scroll!==p){window.BarbaroParallel.state[w]._scroll=p;setTimeout(()=>first.scrollIntoView({block:"center",behavior:"smooth"}),300)}
}

/* ---------- Arranque ---------- */
function start(){
 ui();
 document.addEventListener("barbaro:page",e=>{const {which,number,origin}=e.detail;
  $(which+"-place").textContent=conc?placeText(entry(which,number)):"";
  highlight(which,number);
  if(conc&&$("bs-sync").checked&&!syncing&&origin!=="sync"&&origin!=="home")syncFrom(which,number);
 });
 $("bs-form").addEventListener("submit",e=>{e.preventDefault();search($("bs-q").value)});
 fetch("data/barbaro-1567-concordance.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{conc=d;buildSpans();
  $("bs-status").textContent="Concordancia lista: "+spans.la.size+" tramos en latín y "+spans.it.size+" en italiano. Busca un locus o una palabra.";
  for(const w of ["it","la"]){const n=window.BarbaroParallel.state[w].number;$(w+"-place").textContent=placeText(entry(w,n))}
 }).catch(()=>{$("bs-status").textContent="La concordancia y el OCR de ambas ediciones se están preparando. Mientras tanto, cada visor funciona por separado.";$("bs-sync").disabled=true});
 const params=new URLSearchParams(location.search);if(params.get("q")){$("bs-q").value=params.get("q");setTimeout(()=>search(params.get("q")),800)}
}
if(window.BarbaroParallel)start();else document.addEventListener("barbaro:ready",start,{once:true});
