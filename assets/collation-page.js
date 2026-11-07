/* Tabla de colación por locus: V514 frente a Rose (1899) y Krohn (1912), con lecturas divergentes,
   aparato crítico de las ediciones Kurilo y folio del Codex Harleianus. */
(()=>{
"use strict";
const $=s=>document.querySelector(s);
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const norm=w=>String(w||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/v/g,"u").replace(/j/g,"i");
const el=(t,c,txt)=>{const n=document.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n};
const label=l=>{const [b,c,s]=String(l).split(".");return (R[+b]||b)+"."+c+"."+s};
function words(text){return [...String(text||"").matchAll(/[\p{L}\p{M}]+/gu)].filter(m=>/\p{L}/u.test(m[0])&&!/^\d+$/.test(m[0])&&m[0].length>1).map(m=>({w:m[0],n:norm(m[0]),i:m.index,j:m.index+m[0].length}))}
/* Alineación por LCS de palabras normalizadas: devuelve operaciones de diferencia. */
function diff(a,b){
 const n=a.length,m=b.length,dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=a[i].n===b[j].n?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 const ops=[];let i=0,j=0;
 while(i<n||j<m){
  if(i<n&&j<m&&a[i].n===b[j].n){ops.push({t:"=",a:i,b:j});i++;j++}
  else if(j<m&&(i===n||dp[i][j+1]>=dp[i+1][j])){ops.push({t:"+",b:j});j++}
  else{ops.push({t:"-",a:i});i++}
 }
 return ops;
}
/* Agrupa operaciones contiguas en lecturas: «base ] testigo». */
function readings(a,b,ops){
 const out=[];let cur=null;
 for(const o of ops){
  if(o.t==="="){if(cur){out.push(cur);cur=null}continue}
  cur=cur||{base:[],wit:[],at:o.a!=null?o.a:null};
  if(o.t==="-")cur.base.push(a[o.a].w);else cur.wit.push(b[o.b].w);
  if(cur.at==null&&o.a!=null)cur.at=o.a;
 }
 if(cur)out.push(cur);
 return out;
}
function marked(text,toks,flag){
 const p=el("p","coll-text");p.lang="la";let last=0;
 toks.forEach((t,k)=>{if(t.i>last)p.append(text.slice(last,t.i));if(flag.has(k)){p.append(el("mark",null,t.w))}else p.append(t.w);last=t.j});
 if(last<text.length)p.append(text.slice(last));return p;
}

/* Herramientas de lectura independientes: preferencias y anotaciones en el navegador. */
const COLORS={paper:"#19191b",ink:"#e7e7e5",underline:"#bf9a52"};
function storeGet(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function storePut(key,data){try{localStorage.setItem(key,JSON.stringify(data))}catch{}}
function annotationKey(locus,id){return "vitruvius:subrayados:v1:"+locus+":"+id}
function nodesIn(root){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const list=[];while(w.nextNode())list.push(w.currentNode);return list}
function offsetOf(root,node,offset){
 let total=0;
 for(const n of nodesIn(root)){
  if(n===node)return total+offset;
  if(n.parentNode?.contains(node)){
   const r=document.createRange();r.selectNodeContents(n.parentNode);r.setEnd(node,offset);
   return total+r.toString().length;
  }
  total+=n.textContent.length;
 }
 return null;
}
function applyUnderline(root,start,end){
 const text=root.textContent||"";
 if(start<0||end>text.length||end<=start)return false;
 let pos=0,first=null,last=null;
 for(const n of nodesIn(root)){
  const next=pos+n.textContent.length;
  if(!first&&start<next)first={node:n,at:start-pos};
  if(first&&end<=next){last={node:n,at:end-pos};break}
  pos=next;
 }
 if(!first||!last)return false;
 const range=document.createRange();range.setStart(first.node,first.at);range.setEnd(last.node,last.at);
 const span=el("span","coll-underline");
 try{span.append(range.extractContents());range.insertNode(span);return true}catch{return false}
}
function addReadTools(card,readable,locus,id){
 readable.classList.add("coll-readable");
 const key="vitruvius:card:v1:"+id;
 const pref=Object.assign({font:"Georgia,serif",size:17,paper:COLORS.paper,ink:COLORS.ink,lupa:false},storeGet(key,{}));
 const bar=el("div","coll-cardtools");bar.setAttribute("role","toolbar");bar.setAttribute("aria-label","Lectura independiente "+id);
 const persist=()=>storePut(key,pref);
 function apply(){card.style.setProperty("--card-font",pref.font);card.style.setProperty("--card-size",pref.size+"px");card.style.setProperty("--card-paper",pref.paper);card.style.setProperty("--card-ink",pref.ink);card.classList.toggle("coll-read-lupa",pref.lupa);persist()}
 const font=el("select");font.setAttribute("aria-label","Tipografía");
 for(const [name,value] of [["Serif","Georgia,serif"],["Clásica","Garamond,Georgia,serif"],["Sans","Arial,sans-serif"],["Monoespaciada","monospace"]]){const op=el("option",null,name);op.value=value;font.append(op)}
 font.value=pref.font;font.addEventListener("change",()=>{pref.font=font.value;apply()});
 const pick=(name,val,onChange)=>{const lbl=el("label",null,name);const input=document.createElement("input");input.type="color";input.value=val;input.setAttribute("aria-label",name);input.addEventListener("input",()=>{onChange(input.value);apply()});lbl.append(input);return lbl};
 const smaller=el("button",null,"A−");smaller.type="button";smaller.title="Reducir letra";smaller.addEventListener("click",()=>{pref.size=Math.max(12,pref.size-1);apply()});
 const bigger=el("button",null,"A+");bigger.type="button";bigger.title="Agrandar letra";bigger.addEventListener("click",()=>{pref.size=Math.min(34,pref.size+1);apply()});
 const lupa=el("button",null,"🔍 Lupa");lupa.type="button";lupa.setAttribute("aria-pressed",String(pref.lupa));lupa.addEventListener("click",()=>{pref.lupa=!pref.lupa;lupa.setAttribute("aria-pressed",String(pref.lupa));apply()});
 const underline=el("button",null,"S̲ Subrayar");underline.type="button";underline.title="Seleccioná texto del cuadro y pulsá Subrayar";
 underline.addEventListener("mousedown",ev=>ev.preventDefault());
 underline.addEventListener("click",()=>{
  const sel=window.getSelection();if(!sel||sel.isCollapsed||sel.rangeCount===0)return;
  const range=sel.getRangeAt(0);
  if(!readable.contains(range.startContainer)||!readable.contains(range.endContainer))return;
  const start=offsetOf(readable,range.startContainer,range.startOffset),end=offsetOf(readable,range.endContainer,range.endOffset);
  if(start===null||end===null||end<=start)return;
  const annotations=storeGet(annotationKey(locus,id),[]);
  if(annotations.some(a=>a[0]===start&&a[1]===end))return;
  if(applyUnderline(readable,start,end)){annotations.push([start,end]);storePut(annotationKey(locus,id),annotations);sel.removeAllRanges()}
 });
 const clear=el("button",null,"Borrar subrayados");clear.type="button";clear.addEventListener("click",()=>{
  localStorage.removeItem(annotationKey(locus,id));
  // Reconstruir el contenido de forma segura manteniendo los marcadores filológicos.
  const marks=[...readable.querySelectorAll(".coll-underline")];
  for(const mark of marks){mark.replaceWith(...mark.childNodes)}readable.normalize();
 });
 bar.append(font,smaller,bigger,lupa,pick("Fondo",pref.paper,v=>pref.paper=v),pick("Texto",pref.ink,v=>pref.ink=v),underline,clear);
 const help=el("span","coll-help","Seleccioná una frase y pulsá Subrayar");bar.append(help);
 const heading=card.querySelector("h3");if(heading)heading.after(bar);else card.prepend(bar);
 apply();
 const ranges=storeGet(annotationKey(locus,id),[]);
 for(const [start,end] of ranges.slice().sort((a,b)=>b[0]-a[0]))applyUnderline(readable,start,end);
}

let corpus=[],coll=null,idx=-1,translations=[];
async function show(locus){
 idx=corpus.findIndex(p=>p.locus===locus);if(idx<0)idx=0;const P=corpus[idx];locus=P.locus;
 const u=new URL(location.href);u.searchParams.set("locus",locus);history.replaceState(null,"",u);
 $("#coll-locus").value=label(locus);$("#coll-prev").disabled=idx===0;$("#coll-next").disabled=idx>=corpus.length-1;
 document.title="Colación · Vitr. "+label(locus)+" · Vitruvius Digital Library";
 const root=$("#coll-body");root.replaceChildren();
 const head=el("h2",null,"Vitr., De arch. "+label(locus));root.append(head);
 const base=words(P.latin);
 const baseBox=el("section","coll-row coll-base");baseBox.append(el("h3",null,"V514 · texto latino de la edición de Diego Kurilo (base)"));
 const baseFlags=new Set();const rows=[];
 for(const w of coll.witnesses){
  const rec=coll.loci[locus]?.[w.id];if(!rec)continue;
  const wt=words(rec.text),ops=diff(base,wt);
  const flagW=new Set(ops.filter(o=>o.t==="+").map(o=>o.b));ops.filter(o=>o.t==="-").forEach(o=>baseFlags.add(o.a));
  rows.push({w,rec,wt,ops,flagW});
 }
 const baseText=marked(P.latin,base,baseFlags);baseBox.append(baseText);addReadTools(baseBox,baseText,locus,"recensio-es-latin");
 const links=el("p","coll-links");
 const a1=el("a",null,"Leer en el lector bilingüe →");a1.href="lector-bilingue.html?edition=recensio-es&locus="+encodeURIComponent(locus);links.append(a1);
 baseBox.append(links);root.append(baseBox);
 // Cuadros de lectura sin nuevos visores: reutilizan los mismos JSON por locus.
 const grid=el("section","coll-translation-grid");grid.setAttribute("aria-label","Traducciones disponibles del pasaje");
 for(const spec of translations){
  const passage=spec.byLocus.get(locus);
  if(!passage?.translation)continue;
  const card=el("article","coll-translation");
  card.lang=spec.lang;
  const passageText=el("p",null,passage.translation);card.append(el("h3",null,spec.label),passageText);addReadTools(card,passageText,locus,spec.id);
  const a=el("a",null,"Abrir en el lector existente →");
  a.href="lector-bilingue.html?edition="+encodeURIComponent(spec.id)+"&locus="+encodeURIComponent(locus);
  card.append(a);grid.append(card);
 }
 if(grid.childElementCount)root.append(grid);
 const witnesses=el("section","coll-witnesses");witnesses.setAttribute("aria-label","Ediciones históricas");
 for(const {w,rec,wt,ops,flagW} of rows){
  const box=el("section","coll-row");
  const h=el("h3",null,w.label+" · p. "+rec.page+(rec.pageEnd?"–"+rec.pageEnd:"")+" · semejanza "+Math.round(rec.score*100)+" %");box.append(h);
  box.append(el("p","coll-cite",w.citation));
  const witnessText=marked(rec.text,wt,flagW);box.append(witnessText);addReadTools(box,witnessText,locus,w.id);
  const rd=readings(base,wt,ops);
  if(rd.length){
   const det=el("details","coll-readings");det.open=rd.length<=14;
   det.append(el("summary",null,"Lecturas divergentes respecto de V514 · "+rd.length));
   const ol=el("ol");
   for(const r of rd.slice(0,80)){const li=el("li");li.append(el("span","coll-lem",r.base.join(" ")||"om."),el("span","coll-sep"," ] "),el("span","coll-var",r.wit.join(" ")||"om."),el("span","coll-sig"," "+w.label));ol.append(li)}
   det.append(ol);box.append(det);
  }else box.append(el("p","coll-meta","Sin diferencias de palabras respecto de V514."));
  if(w.id==="krohn-1912"){const a=el("a",null,"Abrir la página en el PDF de Krohn ↗");a.href="documents/krohn-1912.pdf#page="+rec.page;a.target="_blank";a.rel="noopener";box.append(a)}
  witnesses.append(box);
 }
 if(witnesses.childElementCount)root.append(witnesses);
 // Codex Harleianus
 const hBox=el("section","coll-row");hBox.append(el("h3",null,"Codex Harleianus (H) · British Library, Harley MS 2767"));
 try{const c=await window.CodexHConcordance?.locate(locus);
  if(c){const ex=c.exact?.[0];const f=ex?ex.folio:c.estimate?.folio;
   const p=el("p",null,ex?("Folio "+ex.folio+" · "+(window.CodexHConcordance.label?.(ex.status)||ex.status||"verificado")):(c.estimate?("Folio estimado "+c.estimate.folio+" (entre "+c.estimate.from+" y "+c.estimate.to+"; estimación proporcional dentro del libro)"):"Sin folio asignado."));hBox.append(p);
   if(f){const a=el("a",null,"Ver el folio en el visor del Codex H →");a.href="codex-h-folios-local.html?locus="+encodeURIComponent(locus);hBox.append(a)}}
 }catch{hBox.append(el("p","coll-meta","Concordancia de folios no disponible."))}
 root.append(hBox);
 // Aparato crítico de las ediciones Kurilo
 const apBox=el("section","coll-row");apBox.append(el("h3",null,"Aparato crítico · ediciones de Diego Kurilo (V514 · V554 · V297)"));
 try{const hits=await window.KuriloApparatus.forLocus(locus,{lang:"es",limit:10});
  if(!hits.length)apBox.append(el("p","coll-meta","No hay notas del aparato vinculadas a este locus."));
  for(const e of hits){const d=el("div","coll-note");d.append(el("p","coll-meta",[e.version,e.label||window.KuriloApparatus.kindLabel(e.kind,"es"),"p. "+e.page,window.KuriloApparatus.relationLabel?.(e.relation,"es")||e.relation].filter(Boolean).join(" · ")));
   d.append(el("p",null,window.KuriloApparatus.excerpt?window.KuriloApparatus.excerpt(e,locus):String(e.text).slice(0,600)));
   if(e.pdf){const a=el("a",null,"Abrir la página de la edición ↗");a.href=e.pdf;a.target="_blank";a.rel="noopener";d.append(a)}apBox.append(d)}
 }catch{apBox.append(el("p","coll-meta","Aparato no disponible."))}
 root.append(apBox);
 root.append(el("p","coll-method",coll.method+" Las diferencias señaladas pueden deberse a erratas de reconocimiento óptico: verifícalas en la página impresa antes de citarlas."));
}
function parse(v){
 const q=String(v||"").trim();if(!q)return null;
 const L=window.CodexQuery?.locus?.(q);if(L&&corpus.some(p=>p.locus===L))return L;
 const m=q.replace(/^vitr\.?\s*/i,"").match(/^([ivxlc]+|\d+)[.\s,]+(\w+)[.\s,]+(\d+)$/i);
 if(m){const b=/^\d+$/.test(m[1])?+m[1]:R.indexOf(m[1].toUpperCase());const l=b+"."+m[2].toLowerCase()+"."+m[3];if(corpus.some(p=>p.locus===l))return l}
 return corpus.find(p=>p.locus===q)?.locus||null;
}
async function boot(){
 const [c,d]=await Promise.all([fetch("data/structured/recensio-es.json").then(r=>r.json()),fetch("data/collation-loci.json").then(r=>r.json())]);
 corpus=c.passages;coll=d;
 const editions=[
  {id:"recensio-es",lang:"es",label:"Castellano · V514",data:c},
  {id:"recensio-fr",lang:"fr",label:"Français · V554"},
  {id:"theory-en",lang:"en",label:"English · V297"}
 ];
 translations=(await Promise.all(editions.map(async spec=>{
  try{
   const data=spec.data||await fetch("data/structured/"+spec.id+".json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()});
   return {...spec,byLocus:new Map((data.passages||[]).map(p=>[p.locus,p]))};
  }catch{return {...spec,byLocus:new Map()}}
 })));
 
 const list=$("#coll-list");for(const p of corpus){const o=el("option");o.value=label(p.locus);list.append(o)}
 $("#coll-form").addEventListener("submit",e=>{e.preventDefault();const l=parse($("#coll-locus").value);if(l)show(l);else $("#coll-status").textContent="Locus no reconocido. Ejemplos: I.2.4 · 3.1.1 · 5.praef.1"});
 $("#coll-prev").addEventListener("click",()=>show(corpus[idx-1].locus));$("#coll-next").addEventListener("click",()=>show(corpus[idx+1].locus));
 $("#coll-status").textContent=Object.entries(coll.counts).map(([k,v])=>coll.witnesses.find(w=>w.id===k).label+": "+v+" loci alineados").join(" · ");
 show(parse(new URLSearchParams(location.search).get("locus"))||"1.1.1");
}
boot().catch(e=>{$("#coll-status").textContent="No se pudo cargar la colación: "+e.message});
})();
