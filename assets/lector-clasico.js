/* Lector clásico: códice conservado más antiguo (o texto original) a la izquierda y traducción a la derecha.
   Textos: Perseus Digital Library (TEI EpiDoc, CC BY-SA 4.0), leídos en el momento desde GitHub; no se copian
   al repositorio. Testimonios: data/clasicos-testimonios.json (manifiestos IIIF verificados). */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/v/g,"u").replace(/j/g,"i");
let catalog=null,witnesses=[],extraWorks=[],work=null,orig=[],trans=[],cur=0,query="",transState="idle";

/* ---------- TEI → pasajes ---------- */
function textOf(node){
 const c=node.cloneNode(true);
 for(const x of [...c.getElementsByTagNameNS("*","note"),...c.getElementsByTagNameNS("*","bibl"),...c.getElementsByTagNameNS("*","del")])x.remove();
 const lines=[...c.getElementsByTagNameNS("*","l")];
 if(lines.length)return lines.map(l=>(l.getAttribute("n")?l.getAttribute("n")+"  ":"")+l.textContent.replace(/\s+/g," ").trim()).join("\n");
 return c.textContent.replace(/\s+/g," ").trim();
}
/* Los TEI P4 antiguos (p. ej. la traducción de Plinio) usan entidades HTML (&mdash;, &dagger;…) declaradas
   en un DTD externo: el analizador XML se detiene en la primera. Se convierten a caracteres antes de leer. */
const entityBox=document.createElement("textarea");
function decodeEntities(xml){
 return String(xml).replace(/<!DOCTYPE[^>[]*(\[[^\]]*\])?>/i,"").replace(/&([a-zA-Z][a-zA-Z0-9]*);/g,(m,n)=>{if(/^(amp|lt|gt|quot|apos)$/.test(n))return m;entityBox.innerHTML=m;const c=entityBox.value;return c===m?"":c.replace(/&/g,"&amp;").replace(/</g,"&lt;")});
}
function parseTEI(xml){
 const doc=new DOMParser().parseFromString(decodeEntities(xml),"text/xml");
 const body=doc.getElementsByTagNameNS("*","body")[0];if(!body)throw Error("TEI sin cuerpo");
 const out=[];
 // TEI P5 (div type=textpart) y TEI P4 (div1, div2, div3 numerados), como en la traducción de Plinio.
 const isPart=d=>((d.localName==="div"&&d.getAttribute("type")==="textpart")||(/^div\d$/.test(d.localName)&&d.getAttribute("n")!=null))&&!/commentary|translation/.test(d.getAttribute("subtype")||"")&&!/commentary|translation/.test(d.getAttribute("type")||"");
 const nOf=k=>{const n=k.getAttribute("n")||"";return /^(dedication|preface|praefatio|pr|prooemium)$/i.test(n)?"praef":n};
 function walk(node,path){
  const kids=[...node.children].filter(isPart);
  if(!kids.length){
   const lines=[...node.getElementsByTagNameNS("*","l")];
   // Poesía extensa (libro entero sin subdivisiones): tramos de 30 versos citables por número de verso.
   if(lines.length>45){
    for(let i=0;i<lines.length;i+=30){const part=lines.slice(i,i+30);
     const a=part[0].getAttribute("n")||String(i+1),b=part.at(-1).getAttribute("n")||String(i+part.length);
     out.push({locus:[...path,a].join("."),range:[num(a),num(b)],book:path.join("."),text:part.map(l=>(l.getAttribute("n")||"")+"  "+textOf(l)).join("\n")})}
    return;
   }
   const t=textOf(node);if(t)out.push({locus:path.join(".")||"1",text:t,book:path.slice(0,-1).join("."),
    range:lines.length?[num(lines[0].getAttribute("n")),num(lines.at(-1).getAttribute("n"))]:null});
   return;
  }
  for(const k of kids)walk(k,[...path,nOf(k)||String(kids.indexOf(k)+1)]);
 }
 const top=[...body.children].filter(d=>d.localName==="div"||/^div\d$/.test(d.localName));
 for(const d of top){if(isPart(d)){walk(d,[nOf(d)||"1"]);continue}const kids=[...d.children].filter(isPart);if(kids.length)for(const k of kids)walk(k,[nOf(k)||"1"]);else walk(d,[])}
 return out;
}
const num=s=>{const m=String(s||"").match(/\d+/);return m?Number(m[0]):NaN};
/* ---------- Texto plano (The Latin Library, espejo de CLTK en GitHub) → pasajes ---------- */
function parsePlain(txt,book){
 const out=[];let head="",k=0;
 const paras=String(txt).replace(/\r/g,"").split(/\n\s*\n/).map(p=>p.split("\n").map(l=>l.replace(/\s+/g," ").trim()).filter(Boolean).join("\n")).filter(Boolean);
 for(const p of paras){
  if(/The Latin Library|The Classics Page|Christian Latin|Neo-Latin/i.test(p)&&p.length<160||/^[\d\s]+$/.test(p))continue;
  if(!k&&!head&&/^[^\n]{3,60}:\s[^\n]{1,60}$/.test(p))continue; // cabecera «Autor: Obra» de The Latin Library
  if(p.length<70&&!p.includes("\n")){head=head?head+" · "+p:p;continue}
  k++;const m=head.match(/^\[?([IVXLC]+|\d+)\.?\]?(?:\s|$)/);
  out.push({locus:book+"."+(m?m[1]+"."+k:k),book:String(book),text:(head?head+"\n":"")+p,range:null});head="";
 }
 return out;
}
async function loadPlain(parts){
 const texts=await Promise.all(parts.map(x=>fetchText(x.url)));
 return texts.flatMap((t,i)=>parsePlain(t,parts[i].n||String(i+1)));
}
async function fetchText(url){
 const r=await fetch(url);if(!r.ok)throw Error("el repositorio respondió "+r.status);return r.text();
}
// Traducción que corresponde al pasaje: mismo locus; si no, el de prefijo más largo; en verso, el que se superpone.
function translationFor(p){
 if(!trans.length)return null;
 const exact=trans.find(t=>t.locus===p.locus);if(exact)return[exact];
 if(p.range&&!isNaN(p.range[0])){
  const bookOf=x=>x.book||x.locus.split(".").slice(0,-1).join(".");
  const same=trans.filter(t=>bookOf(t)===p.book||t.locus.split(".")[0]===p.locus.split(".")[0]);
  // Las «cards» inglesas empiezan en un verso: su tramo llega hasta la siguiente.
  const spans=same.map((t,i)=>{const s=t.range&&!isNaN(t.range[0])?t.range[0]:num(t.locus.split(".").at(-1));const e=t.range&&!isNaN(t.range[1])?t.range[1]:(same[i+1]?num(same[i+1].locus.split(".").at(-1))-1:Infinity);return{t,s,e}});
  const hit=spans.filter(x=>x.s<=p.range[1]&&x.e>=p.range[0]).map(x=>x.t);if(hit.length)return hit.slice(0,4);
 }
 const parts=p.locus.split(".");
 for(let k=parts.length-1;k>0;k--){const pre=parts.slice(0,k).join(".");const c=trans.filter(t=>t.locus===pre||t.locus.startsWith(pre+"."));if(c.length)return c.slice(0,3)}
 return null;
}

/* ---------- Búsqueda de testimonios, ediciones antiguas y traducciones en catálogos de referencia ----------
   Cuando la biblioteca no tiene un códice verificado, se ofrecen búsquedas (no enlaces directos no
   comprobados) en los catálogos especializados, armadas con el autor y la obra. */
function testimoniaSearch(w){
 const a=String(w.authorLatin||w.author||""),t=String(w.titleLatin||w.title||"");const q=encodeURIComponent((a+" "+t).trim()),qt=encodeURIComponent(t);
 const L=(href,label)=>`<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`;
 const ms=[L(`https://portail.biblissima.fr/fr/search?q=${q}`,"Biblissima+ (manuscritos e impresos, IIIF)"),w.language==="grc"?L(`https://pinakes.irht.cnrs.fr/`,"Pinakes (manuscritos griegos; buscar la obra)"):"",L(`https://www.e-codices.unifr.ch/en/search/all?sQueryString=${q}`,"e-codices"),L(`https://digi.vatlib.it/`,"DigiVatLib (Vaticana; buscar la obra)"),L(`https://gallica.bnf.fr/services/engine/search/sru?operation=searchRetrieve&query=${encodeURIComponent('(gallica all "'+(a+" "+t).trim()+'") and dc.type all "manuscrit"')}`,"Gallica · manuscritos")];
 const ed=[L(`https://data.cerl.org/istc/_search?query=${q}`,"ISTC (incunables)"),L(`https://archive.org/search?query=${q}&sin=TXT`,"Internet Archive (ediciones antiguas)"),L(`https://catalog.hathitrust.org/Search/Home?lookfor=${q}&type=all&ft=ft`,"HathiTrust (texto completo)")];
 const tr=[L(`https://es.wikisource.org/w/index.php?search=${q}`,"Wikisource ES"),L(`https://en.wikisource.org/w/index.php?search=${q}`,"Wikisource EN"),L(`https://fr.wikisource.org/w/index.php?search=${q}`,"Wikisource FR"),L(`https://remacle.org/bloodwolf/index.htm`,"Remacle (traducciones francesas)"),L(`https://www.perseus.tufts.edu/hopper/searchresults?q=${qt}`,"Perseus")];
 const msOk=ms.filter(Boolean);return `<details class="lc-testimonia"><summary>Buscar testimonios, ediciones antiguas y traducciones de «${esc(t)}»</summary><p class="muted">Búsquedas en catálogos externos (no son enlaces verificados por la biblioteca): compruebe la signatura, la datación y la licencia en la institución.</p><p><b>Manuscritos</b>: ${msOk.join(" · ")}</p><p><b>Ediciones antiguas</b>: ${ed.join(" · ")}</p><p><b>Traducciones libres</b>: ${tr.join(" · ")}</p></details>`;
}
/* ---------- Marcado de la búsqueda ---------- */
function marked(text){
 if(!query)return esc(text);
 const words=query.split(/\s+/).filter(w=>w.length>1).map(fold);
 return text.split(/(\s+)/).map(tok=>{const f=fold(tok.replace(/[^\p{L}\p{N}]/gu,""));return f&&words.some(w=>f===w||(w.length>=4&&f.startsWith(w)))?"<mark>"+esc(tok)+"</mark>":esc(tok)}).join("");
}

/* ---------- Códice (IIIF) ---------- */
let canvases=[],ci=0;
async function loadWitness(w){
 const box=$("codex");box.innerHTML="<p class='muted'>Cargando las imágenes del códice…</p>";
 try{
  const m=await (await fetch(w.manifest)).json();
  canvases=(m.sequences?.[0]?.canvases||m.items||[]).map(c=>{
   const img=c.images?.[0]?.resource||c.items?.[0]?.items?.[0]?.body||{};
   let svc=img.service;if(Array.isArray(svc))svc=svc[0];
   const id=(svc?.["@id"]||svc?.id||"").replace(/\/$/,"");
   const label=typeof c.label==="string"?c.label:(Object.values(c.label||{})[0]||[])[0]||"";
   return{label,src:id?id+"/full/1000,/0/default.jpg":(img["@id"]||img.id||"")}}).filter(c=>c.src);
  ci=0;showCanvas();
 }catch(e){box.innerHTML="<p>No se pudieron cargar las imágenes desde la institución ("+esc(e.message)+"). <a target='_blank' rel='noopener' href='"+esc(w.manifest)+"'>Manifiesto IIIF ↗</a></p>"}
}
function showCanvas(){
 const box=$("codex");if(!canvases.length){box.textContent="El manifiesto no contiene imágenes.";return}
 const c=canvases[ci];
 box.innerHTML=`<div class="codex-nav"><button type="button" id="cv-prev">←</button><label>Imagen <input id="cv-n" type="number" min="1" max="${canvases.length}" value="${ci+1}"> / ${canvases.length}</label><button type="button" id="cv-next">→</button><span class="muted">${esc(c.label)}</span></div><a href="${esc(c.src.replace("/full/1000,/","/full/max/"))}" target="_blank" rel="noopener"><img alt="${esc(work.witness.shelfmark+" · "+c.label)}" src="${esc(c.src)}" loading="lazy"></a>`;
 $("cv-prev").onclick=()=>{if(ci>0){ci--;showCanvas()}};$("cv-next").onclick=()=>{if(ci<canvases.length-1){ci++;showCanvas()}};
 $("cv-n").onchange=e=>{const n=Number(e.target.value)-1;if(n>=0&&n<canvases.length){ci=n;showCanvas()}};
}

/* ---------- Lectura ---------- */
function render(){
 const p=orig[cur];if(!p)return;
 $("locus").textContent=work.title+" "+p.locus;
 {const L_=work.language==="grc"?"grc":"la";const LL=window.VitruviaLecturaLexica;
  $("original").innerHTML=`<p class="loc">${esc(p.locus)}</p>${LL?`<p class="lw-hint muted">Clic en una palabra: lema, morfología y glosa.</p>`:""}<div class="txt" lang="${L_}">${LL?LL.wrap(p.text,L_,marked):marked(p.text)}</div>`;
  if(LL)LL.attach($("original"))}
 const t=translationFor(p);
 const partial=work.translationCoverage==="partial-selected-chapters";
 const absentPartial=partial&&transState==="ok"&&!t;
 $("translation").innerHTML=absentPartial?
  "<p class='lc-notr'><b>Este capítulo no está incluido en la selección inglesa disponible.</b><br>La traducción histórica de Fairfax Harrison (1918) reúne fragmentos de Catón ordenados por temas; no es una versión íntegra de los 162 capítulos. No corresponde asignarle aquí un pasaje de otro capítulo.</p><p><a target='_blank' rel='noopener noreferrer' href='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cato/De_Agricultura/home.html'>Consultar traducción inglesa externa más completa en LacusCurtius ↗</a></p>":
  !work.translations.length?"<p class='lc-notr'><b>Por el momento la biblioteca no posee una traducción de esta obra.</b><br>Se muestra solo el texto original, a la izquierda. Cuando se incorpore una traducción abierta, aparecerá en este visor.</p>":
  trans.length?(t?t.map(x=>`<p class="loc">${esc(x.locus)}</p><div class="txt" lang="en">${marked(x.text)}</div>`).join(""):"<p class='lc-notr'>La traducción de la biblioteca no tiene un pasaje correspondiente a este locus. Pruebe con el locus anterior o el siguiente.</p>"):transState==="loading"?"<p class='muted'>Cargando la traducción… (las obras extensas, como la Naturalis historia, pueden tardar unos segundos)</p>":transState==="error"?"<p class='muted'>No se pudo descargar la traducción desde el repositorio de origen. Puede abrirla directamente en <a href='"+esc(work.translations[0].url)+"' target='_blank' rel='noopener'>GitHub · Perseus ↗</a>.</p>":"<p class='lc-notr'><b>Por el momento la biblioteca no posee una traducción alineada de esta obra.</b><br>El archivo de origen existe, pero no puede ponerse en correspondencia con el texto. <a href='"+esc(work.translations[0].url)+"' target='_blank' rel='noopener'>Abrir el archivo TEI ↗</a></p>";
 if(work.translationCoverage==="chapter-level-reordered-historical"){
  const note=document.createElement("p");note.className="muted";
  note.textContent="Inglés: Bennett y Hammond (1902). Correspondencia por capítulo, no por párrafo. La traducción histórica presenta omisiones e inserciones reconocidas por sus editores.";
  $("translation").prepend(note);
 }
 $("toc").value=String(cur);
 const u=new URL(location.href);u.searchParams.set("loc",p.locus);if(query)u.searchParams.set("q",query);else u.searchParams.delete("q");history.replaceState(null,"",u);
 const share=work.author+" · "+work.title+" "+p.locus+" — "+location.href;
 $("wa").href="https://wa.me/?text="+encodeURIComponent(share);
 $("mail").href="mailto:?subject="+encodeURIComponent(work.author+" · "+work.title+" "+p.locus)+"&body="+encodeURIComponent(share);
 /* El diccionario por clic lo da assets/lectura-lexica.js (lema, morfología, glosa); el antiguo enganche
    de classical-lexicon.js no tenía panel donde mostrarse y fallaba en cada clic. */
 if(!window.VitruviaLecturaLexica&&window.ClassicalLexicon?.attachClick&&!$("original").dataset.lex){$("original").dataset.lex="1";try{const panel=document.createElement("div");$("original").after(panel);window.ClassicalLexicon.attachClick($("original"),panel)}catch{}}
}
function search(){
 query=$("q").value.trim();const out=$("hits");out.replaceChildren();
 if(!query){render();return}
 const words=query.split(/\s+/).filter(w=>w.length>1).map(fold);
 const hit=(text)=>{const toks=text.split(/\s+/).map(t=>fold(t.replace(/[^\p{L}\p{N}]/gu,"")));return words.every(w=>toks.some(f=>f===w||(w.length>=4&&f.startsWith(w))))};
 const found=[];orig.forEach((p,i)=>{if(hit(p.text))found.push({i,side:"original"})});
 trans.forEach(t=>{if(hit(t.text)){const i=orig.findIndex(p=>p.locus===t.locus||p.locus.startsWith(t.locus+"."));if(i>=0&&!found.some(f=>f.i===i))found.push({i,side:"traducción"})}});
 found.sort((a,b)=>a.i-b.i);
 out.append(found.length+" pasajes · ");
 for(const f of found.slice(0,120)){const b=document.createElement("button");b.type="button";b.textContent=orig[f.i].locus+(f.side==="traducción"?" (trad.)":"");b.onclick=()=>{cur=f.i;render()};out.append(b," ")}
 if(found.length){cur=found[0].i}render();
}
async function openWork(id){
 work=catalog.works.find(w=>w.id===id)||extraWorks.find(w=>w.id===id);if(!work){$("status").textContent="Obra no encontrada en el catálogo.";return}
 document.title=work.author+" · "+work.title+" · Lector clásico";
 $("index").hidden=true;$("reader").hidden=false;
 $("title").textContent=work.author+" · "+work.title;$("meta").textContent=work.dates+" · "+(work.language==="grc"?"griego antiguo":"latín")+" · "+work.urn;
 work.witness=witnesses.find(w=>w.match.some(m=>work.id===m||work.authorId===m))||null;
 // Primero el códice más antiguo conservado (si hay imágenes verificadas); si no, el texto original.
 const wbox=$("witness-info");
 if(work.witness){const w=work.witness;
  wbox.innerHTML=`<strong>${esc(w.name)}</strong> · ${esc(w.shelfmark)} · ${esc(w.date)} · ${esc(w.library)}<br><span class="muted">${w.oldest?"Testimonio conservado más antiguo con imágenes abiertas.":"No es el testimonio más antiguo: "}${esc(w.note||"")}</span>${(w.also||[]).map(a=>` · <button type="button" class="alt-ms" data-m="${esc(a.manifest)}" data-s="${esc(a.shelfmark)}">${esc(a.name+" ("+a.date+")")}</button>`).join("")}`;
  for(const b of wbox.querySelectorAll(".alt-ms"))b.onclick=()=>{work.witness={...work.witness,shelfmark:b.dataset.s,manifest:b.dataset.m};loadWitness(work.witness)};
  setLeft("codex");loadWitness(w);
 }else{wbox.innerHTML="<span class='muted'>No hay todavía un manuscrito o impreso antiguo de esta obra con imágenes IIIF verificadas en la biblioteca; se muestra el texto original editado.</span>"+testimoniaSearch(work);$("tab-codex").disabled=true;setLeft("original")}
 $("status").textContent="Cargando el texto original…";
 try{orig=work.parts?await loadPlain(work.parts):parseTEI(await fetchText(work.original))}catch(e){$("status").textContent="No se pudo leer el texto original ("+e.message+").";return}
 $("toc").replaceChildren(...orig.map((p,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=p.locus;return o}));
 const loc=params.get("loc");cur=Math.max(0,orig.findIndex(p=>p.locus===loc));
 $("q").value=params.get("q")||"";query=$("q").value.trim();
 const srcName=u=>/latin_text_latin_library/.test(u||"")?"The Latin Library (texto de dominio público; copia de CLTK en GitHub)":/First1KGreek/.test(u||"")?"Open Greek and Latin · First1KGreek (CC BY-SA 4.0)":"Perseus Digital Library (CC BY-SA 4.0)";
 $("status").textContent=orig.length+" pasajes · texto: "+srcName(work.original)+(work.translations.length?" · cargando traducción…":"");render();
 if(work.translations.length){
  transState="loading";
  try{trans=parseTEI(await fetchText(work.translations[0].url));transState=trans.length?"ok":"empty";$("status").textContent=orig.length+" pasajes · traducción inglesa"+(work.translationCoverage==="partial-selected-chapters"?" parcial (Harrison 1918)":"")+": "+trans.length+" secciones · "+(work.translations[0].source||srcName(work.translations[0].url))}
  catch(e){transState="error";$("status").textContent+=" · no se pudo leer la traducción ("+e.message+")"}
  if(query)search();else render();
 }
}
function setLeft(which){
 for(const [b,p] of [["tab-codex","codex"],["tab-original","original"]]){$(b).setAttribute("aria-pressed",String(p===which));$(p).hidden=p!==which}
}
function visibleWorks(){
 const f=fold($("filter").value),lang=$("f-lang")?.value||"",all=[...catalog.works,...($("f-extra")?.checked?extraWorks:[])];
 return all.filter(w=>(!f||fold(w.author+" "+(w.authorEn||"")+" "+w.title+" "+w.id).includes(f))&&(!lang||w.language===lang));
}
function renderIndex(){
 const box=$("index-list");box.replaceChildren();
 let last=null,count=0;const list=visibleWorks();
 for(const w of list){
  if(w.authorId!==last){last=w.authorId;const h=document.createElement("h3");h.innerHTML=esc(w.author)+" <small>"+esc(w.dates)+(witnesses.some(x=>x.match.includes(w.authorId))?" · códice con imágenes":"")+"</small>";box.append(h)}
  const a=document.createElement("a");a.href="?obra="+encodeURIComponent(w.id);a.textContent=w.title+(w.translations.length?"":" · solo original");box.append(a," · ");count++;
 }
 $("index-count").textContent=count+" obras"+($("f-extra")?.checked?" (incluidas las de otras épocas)":" de "+catalog.authors+" autores (siglo II a. C.–siglo II d. C.)");
}
/* ---------- Búsqueda en el corpus: palabra o frase en todas las obras listadas ---------- */
let corpusRun=0;
async function corpusSearch(){
 const q=$("cq").value.trim(),out=$("chits");out.replaceChildren();if(!q)return;
 const run=++corpusRun,words=q.split(/\s+/).filter(w=>w.length>1).map(fold);
 const hit=text=>{const toks=text.split(/\s+/).map(t=>fold(t.replace(/[^\p{L}\p{N}]/gu,"")));return words.every(w=>toks.some(f=>f===w||(w.length>=4&&f.startsWith(w))))};
 const list=visibleWorks().slice(0,160);let done=0,total=0;
 const status=document.createElement("p");status.className="sub";out.append(status);$("cstop").hidden=false;
 const show=()=>{status.textContent=`${total} pasajes en ${done} de ${list.length} obras revisadas`+(visibleWorks().length>160?" (se revisan las primeras 160; filtra por autor o lengua para acotar)":"")+(done<list.length?"…":"")};show();
 const queue=[...list];
 async function worker(){
  while(queue.length&&run===corpusRun){
   const w=queue.shift();let ps=[];
   try{ps=w.parts?await loadPlain(w.parts):parseTEI(await fetchText(w.original))}catch{}
   if(run!==corpusRun)return;
   const found=ps.filter(p=>hit(p.text));done++;
   if(found.length){total+=found.length;
    const box=document.createElement("div");box.className="corpus-hit";const h=document.createElement("h3");h.textContent=w.author+" · "+w.title+" · "+found.length;box.append(h);
    for(const p of found.slice(0,25)){const a=document.createElement("a");a.href="?obra="+encodeURIComponent(w.id)+"&loc="+encodeURIComponent(p.locus)+"&q="+encodeURIComponent(q);
     const flat=p.text.replace(/\s+/g," ");const t=fold(flat);const at=Math.max(0,t.indexOf(words[0])-60);
     a.innerHTML="<b>"+esc(p.locus)+"</b> "+marked((at?"…":"")+flat.slice(at,at+170)+"…");box.append(a)}
    out.append(box)}
   show();
  }
 }
 const prev=query;query=q;await Promise.all([worker(),worker(),worker(),worker()]);query=prev;
 if(run===corpusRun){$("cstop").hidden=true;show()}
}
(async()=>{
 if(params.get("embed")==="1")document.documentElement.classList.add("lc-embed");
 [catalog,{witnesses},{works:extraWorks}]=await Promise.all([fetch("data/clasicos-perseus.json").then(r=>r.json()),fetch("data/clasicos-testimonios.json").then(r=>r.json()),fetch("data/clasicos-perseus-extra.json?v=20261106-en-theophrastus-v2").then(r=>r.ok?r.json():{works:[]}).catch(()=>({works:[]}))]);
 $("tab-codex").onclick=()=>setLeft("codex");$("tab-original").onclick=()=>setLeft("original");
 $("search").onsubmit=e=>{e.preventDefault();search()};
 $("prev").onclick=()=>{if(cur>0){cur--;render()}};$("next").onclick=()=>{if(cur<orig.length-1){cur++;render()}};
 $("toc").onchange=e=>{cur=Number(e.target.value);render()};
 $("filter").oninput=renderIndex;if($("f-lang"))$("f-lang").onchange=renderIndex;if($("f-extra"))$("f-extra").onchange=renderIndex;
 if($("corpus-search")){$("corpus-search").onsubmit=e=>{e.preventDefault();corpusSearch()};$("cstop").onclick=()=>{corpusRun++;$("cstop").hidden=true}}
 if(params.get("cq")&&$("cq")&&!params.get("obra")){if(params.get("extra")==="1")$("f-extra").checked=true;if(params.get("filter"))$("filter").value=params.get("filter");renderIndex();$("cq").value=params.get("cq");setTimeout(corpusSearch,50)}
 $("print").onclick=()=>window.print(); // «Guardar como PDF» en el diálogo de impresión
 // Descarga de la obra completa generada en el navegador (no ocupa espacio en el repositorio):
 // original y, si existe, traducción alineada por pasaje, con la fuente y la licencia.
 const fileBase=()=>(work.author+" - "+work.title).normalize("NFD").replace(/\p{M}/gu,"").replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g,"_").slice(0,80);
 const srcLine=()=>{const s=/latin_text_latin_library/.test(work.original)?"The Latin Library (dominio público)":/First1KGreek/.test(work.original)?"Open Greek and Latin, First1KGreek (CC BY-SA 4.0)":"Perseus Digital Library (CC BY-SA 4.0)";return "Texto: "+s+(work.translations.length&&trans.length?" · Traducción inglesa: "+(/First1KGreek/.test(work.translations[0].url)?"Open Greek and Latin":"Perseus Digital Library")+" (CC BY-SA 4.0)":"")+" · "+(work.urn||"")+" · Generado en Vitruvius Digital Library el "+new Date().toLocaleDateString("es")};
 const save=(name,text,type)=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)};
 const dl=(id,label,fn)=>{if($(id))return;const b=document.createElement("button");b.type="button";b.id=id;b.textContent=label;b.onclick=fn;$("print").after(b)};
 dl("dl-txt","Descargar TXT",()=>{if(!orig.length)return;const L=[work.author+" · "+work.title,srcLine(),""];
  const seen=new Set(); // cada sección de la traducción se escribe una sola vez, junto al primer pasaje que la cubre
  for(const p of orig){L.push("["+p.locus+"]",p.text);const t=(trans.length?translationFor(p):null)?.filter(x=>!seen.has(x));t?.forEach(x=>seen.add(x));if(t?.length)L.push("— "+t.map(x=>x.text).join(" "));L.push("")}
  save(fileBase()+".txt",L.join("\n"),"text/plain;charset=utf-8")});
 dl("dl-doc","Descargar Word",()=>{if(!orig.length)return;const lang=work.language==="grc"?"grc":"la";
  const seen=new Set();
  const rows=orig.map(p=>{const t=(trans.length?translationFor(p):null)?.filter(x=>!seen.has(x));t?.forEach(x=>seen.add(x));return `<tr><td style="width:12%;vertical-align:top;font:bold 10pt Arial">${esc(p.locus)}</td><td lang="${lang}" style="width:44%;vertical-align:top;font:11pt Georgia">${esc(p.text).replace(/\n/g,"<br>")}</td><td lang="en" style="width:44%;vertical-align:top;font:11pt Georgia">${t?.length?esc(t.map(x=>x.text).join(" ")):""}</td></tr>`}).join("");
  const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(work.title)}</title></head><body><h1 style="font:20pt Georgia">${esc(work.author)} · <i>${esc(work.title)}</i></h1><p style="font:9pt Arial">${esc(srcLine())}</p><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>Locus</th><th>${lang==="grc"?"Griego":"Latín"}</th><th>${work.translations.length?"Traducción inglesa":""}</th></tr>${rows}</table></body></html>`;
  save(fileBase()+".doc","﻿"+html,"application/msword")});
 // Ediciones descargables ya publicadas en el sitio (PDF y DOCX bilingües, documents/clasicos/).
 fetch("data/clasicos-descargas.json?v=20261106-v1").then(r=>r.ok?r.json():null).then(d=>{
  const e=d?.works?.[params.get("obra")];if(!e||$("ed-pdf"))return;
  const mk=(id,href,label,kb)=>{const a=document.createElement("a");a.id=id;a.href=href;a.setAttribute("download","");a.textContent=label;a.title=kb+" KB · original y traducción inglesa alineados (CC BY-SA 4.0)";return a};
  ($("dl-doc")||$("print")).after(mk("ed-pdf",e.pdf,"Edición PDF",e.kb.pdf),mk("ed-docx",e.docx,"Edición DOCX",e.kb.docx));
 }).catch(()=>{});
 $("cite").onclick=async()=>{
  const p=orig[cur];if(!p)return;
  const d=new Date().toLocaleDateString("es",{day:"numeric",month:"long",year:"numeric"});
  const src=/latin_text_latin_library/.test(work.original)?"The Latin Library":/First1KGreek/.test(work.original)?"Open Greek and Latin, First1KGreek":"Perseus Digital Library";
  const urn=/^urn:cts:/.test(work.urn||"")?work.urn+":"+p.locus:"";
  const link=location.href.split("#")[0];
  // Chicago 18 (14.142–14.147, obras clásicas): autor, título en cursiva y locus con números arábigos, sin coma.
  const plain=`${work.author}, ${work.title} ${p.locus}. Texto: ${src}${urn?", "+urn:""}, ${link}, consultado el ${d}.`;
  const html=`${esc(work.author)}, <i>${esc(work.title)}</i> ${esc(p.locus)}. Texto: ${esc(src)}${urn?", "+esc(urn):""}, ${esc(link)}, consultado el ${esc(d)}.`;
  try{if(window.ClipboardItem&&navigator.clipboard?.write)await navigator.clipboard.write([new ClipboardItem({"text/plain":new Blob([plain],{type:"text/plain"}),"text/html":new Blob([html],{type:"text/html"})})]);else await navigator.clipboard.writeText(plain)}catch{}
  $("cite-out").textContent=plain;$("cite-out").hidden=false;$("cite").textContent="Cita copiada ✓";setTimeout(()=>$("cite").textContent="Citar (Chicago 18)",1800);
 };
 // Atajos: ← y → cambian de pasaje; «/» lleva a la búsqueda.
 document.addEventListener("keydown",e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||$("reader").hidden)return;
  const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
  if(e.key==="ArrowLeft"){e.preventDefault();$("prev").click()}else if(e.key==="ArrowRight"){e.preventDefault();$("next").click()}else if(e.key==="/"){e.preventDefault();$("q").focus()}
 });
 $("copy").onclick=()=>navigator.clipboard?.writeText(location.href).then(()=>{$("copy").textContent="Enlace copiado ✓";setTimeout(()=>$("copy").textContent="Copiar enlace",1600)});
 const id=params.get("obra");if(id)openWork(id);else renderIndex();
})().catch(e=>{$("status").textContent="No se pudo cargar el catálogo: "+e.message});
})();
