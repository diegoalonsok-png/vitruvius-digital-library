/* Lexical statistics for three independently indexed Latin texts.
   Counts are calculated in the browser; no token count is asserted beforehand. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const SOURCES=[
 {id:"recensio-es",label:"Kurilo V514",url:"data/structured/recensio-es.json"},
 {id:"krohn-1912",label:"Krohn 1912",url:"data/critical-editions/krohn-1912-tei-loci.json"},
 {id:"rose-1899",label:"Rose 1899",url:"data/critical-editions/rose-1899-transcribed-loci.json"}
];
const TECH=["symmetria","decor","firmitas","utilitas","venustas","ordinatio","dispositio","eurythmia","proportio","architectura","modulus","columna","domus","aedes","machina","ratio","opus","templum"];
const STOP=new Set("et in ad de ab ex cum ut non est sunt qui quae quod qua quo sed autem enim atque vel aut si per quam ea haec his hic eius eorum se sua suae sibi esse fuit etiam omnes inter".split(" "));
const fold=x=>String(x||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/v/g,"u").replace(/j/g,"i");
const tokens=s=>(String(s||"").match(/[A-Za-zÀ-ÿ]+/g)||[]).map(fold);
const cache=new Map();
async function get(source){
 if(!cache.has(source.id))cache.set(source.id,fetch(source.url).then(r=>{if(!r.ok)throw Error(source.label+": HTTP "+r.status);return r.json()}).then(d=>{
 const rows=(d.passages||[]).map(p=>{
 const locus=String(p.locus||""),m=locus.match(/^(\d+)\.(praef|\d+)\.(\d+)$/);
 return {locus,book:m?Number(m[1]):Number(p.book)||0,chapter:m?m[2]:String(p.chapter||""),words:tokens(p.latin||"")};
 }).filter(x=>x.book>=1&&x.book<=10);
 if(rows.length!==731)throw Error(source.label+": "+rows.length+" loci; se esperaban 731");
 return rows;
 }).catch(e=>{cache.delete(source.id);throw e}));
 return cache.get(source.id);
}
function selection(rows){
 const mode=$("scope").value,b=Number($("book").value),chapter=$("chapter").value;
 return rows.filter(row=>mode==="all"||(row.book===b&&(mode==="book"||row.chapter===chapter)));
}
function tally(rows){
 const counts=new Map();let total=0;
 for(const p of rows)for(const w of p.words){total++;counts.set(w,(counts.get(w)||0)+1)}
 return {counts,total,passages:rows.length};
}
const count=(t,k)=>t.counts.get(fold(k))||0;
function clear(el){el.replaceChildren()}
function div(cls,txt,parent){const e=document.createElement("div");if(cls)e.className=cls;if(txt!=null)e.textContent=txt;parent.append(e);return e}
function cell(tag,text,parent){const e=document.createElement(tag);e.textContent=text;parent.append(e);return e}
function metric(label,value){const x=div("",null,$("metrics"));cell("strong",value,x);cell("small",label,x)}
const href=(q,book)=>"scriptorium.html?"+new URLSearchParams({q,scope:"all",match:"literal",...(book?{locus:book+".1.1"}:{})});
function bars(target,data,max,linker){
 clear(target);
 for(const [name,n] of data){
  const row=div("bar-row",null,target);
  const link=document.createElement("a");link.textContent=name;link.href=linker(name);row.append(link);
  const track=div("bar-track",null,row),bar=div("bar-fill",null,track);
  bar.style.width=(max?Math.max(1,n/max*100):0)+"%";
  cell("small",n.toLocaleString("es-AR"),row);
 }
}
let rankRows=[],trendRows=[];
function exportCsv(name,rows){
 if(!rows.length)return;
 const csv=rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
 const url=URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"}));
 const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function syncChapters(rows){
 const chapter=$("chapter"),previous=chapter.value;
 const selected=Number($("book").value),chapters=[...new Set(rows.filter(r=>r.book===selected).map(r=>r.chapter))];
 chapters.sort((a,b)=>a==="praef"?-1:b==="praef"?1:Number(a)-Number(b));
 clear(chapter);for(const c of chapters)chapter.add(new Option(c==="praef"?"Prefacio":"Capítulo "+c,c));
 if(chapters.includes(previous))chapter.value=previous;
 chapter.disabled=$("scope").value!=="chapter";
 $("book").disabled=$("scope").value==="all";
}
async function draw(){
 const status=$("status");status.textContent="Calculando frecuencias sobre los textos indexados…";
 try{
  const all=await Promise.all(SOURCES.map(get));
  const source=SOURCES.find(x=>x.id===$("edition").value)||SOURCES[0];
  const rows=all[SOURCES.indexOf(source)],picked=selection(rows),stats=tally(picked);
  clear($("metrics"));
  metric("Edición",source.label);metric("Pasajes considerados",stats.passages.toLocaleString("es-AR"));
  metric("Palabras latinas (formas)",stats.total.toLocaleString("es-AR"));
  metric("Formas gráficas distintas",stats.counts.size.toLocaleString("es-AR"));
  const filter=$("type").value;
  let words=[...stats.counts].filter(([w])=>filter==="all"||(filter==="technical"?TECH.some(t=>fold(t)===w):w.length>3&&!STOP.has(w)));
  words.sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));words=words.slice(0,24);
  rankRows=[["edicion","alcance","forma","frecuencia"],...words.map(([word,n])=>[source.label,$("scope").value,word,n])];
  bars($("rank"),words,words[0]?.[1]||1,name=>href(name));
  $("rank-method").textContent=filter==="technical"?"Lista selectiva de formas técnicas; no se presenta como lematización completa.":"Frecuencias de formas gráficas normalizadas u/v, i/j; no equivalen a lemas revisados.";
  const query=($("term").value||"").trim(),term=fold(query);
  trendRows=[["edicion","libro","forma","frecuencia","por_1000_palabras"]];
  const trend=$("trend");clear(trend);
  const grid=div("",null,trend);grid.style.display="grid";grid.style.gap="13px";
  for(let i=0;i<all.length;i++){
   const summary=div("book-row",null,grid);
   cell("strong",SOURCES[i].label,summary);
   const inner=div("mini-bars",null,summary);
   const books=[];
   for(let b=1;b<=10;b++){
    const st=tally(all[i].filter(p=>p.book===b)),n=count(st,term),norm=st.total?Math.round(n/st.total*1000*100)/100:0;
    books.push([b,n,norm]);trendRows.push([SOURCES[i].label,b,query,n,norm]);
   }
   const max=Math.max(1,...books.map(x=>x[2]));
   for(const [book,n,norm] of books){
    const row=div("mini-row",null,inner);
    const a=document.createElement("a");a.href=href(query,book);a.textContent="Libro "+book;row.append(a);
    const track=div("bar-track",null,row),bar=div("mini-fill",null,track);
    bar.style.width=(norm/max*100)+"%";
    cell("small",norm.toLocaleString("es-AR")+"‰",row);
   }
  }
  status.textContent="Frecuencias calculadas sobre "+picked.length+" loci de "+source.label+". Fuentes: transcripciones digitales por locus; las variantes requieren cotejo editorial.";
 }catch(e){status.textContent="No fue posible calcular la estadística: "+e.message;clear($("rank"));clear($("trend"))}
}
async function setup(){
 const status=$("status");
 try{
  const [primary]=await Promise.all(SOURCES.map(get));
  const books=[...new Set(primary.map(x=>x.book))].sort((a,b)=>a-b);
  const book=$("book");clear(book);for(const b of books)book.add(new Option("Libro "+b,b));
  const update=()=>{syncChapters(primary);void draw()};
  for(const id of ["scope","book","chapter","edition","type"])$(id).addEventListener("change",id==="book"||id==="scope"?update:draw);
  $("apply").addEventListener("click",draw);
  $("term").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();void draw()}});
  $("csv-rank").addEventListener("click",()=>exportCsv("vitruvius-ranking.csv",rankRows));
  $("csv-trend").addEventListener("click",()=>exportCsv("vitruvius-tendencias.csv",trendRows));
  syncChapters(primary);await draw();
 }catch(e){status.textContent="Estadística no disponible: "+e.message}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else void setup();
})();
