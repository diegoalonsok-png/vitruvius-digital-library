/* Bibliotheca · única búsqueda documental de palabras/frases.
 * Lee exclusivamente textos indexados, nunca infiere contenido de un catálogo.
 * Los lectores/facsímiles se abren bajo demanda. Chicago 18: citas verificables
 * y rótulo de referencia parcial cuando faltan datos editoriales.
 */
(()=>{"use strict";
const CATALOG="data/bibliotheca-graeca-latina-I-bce-I-ce.json?v=20261104-nota-v1";
const REGISTRY="data/classics-corpus/search-registry.json";
const LANG={grc:"Griego antiguo",la:"Latín",es:"Castellano",en:"Inglés",fr:"Francés",it:"Italiano",de:"Alemán",pt:"Portugués"};
const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").replace(/j/g,"i").replace(/v/g,"u");
const localURL=path=>{try{const u=new URL(path,location.href);return u.origin===location.origin&&/\.(?:html|pdf)$/i.test(u.pathname)?u.href:""}catch{return ""}};
const quoteWork=(w,r)=>{
 const version=(w?.localVersions||[]).find(v=>v.language===r.language&&v.citationChicago18);
 if(version)return version.citationChicago18;
 const bibliography=w?.bibliography||{};
 if(r.language===w?.language&&bibliography.originalEditionCitation)return bibliography.originalEditionCitation;
 if(r.language!==w?.language&&bibliography.translationCitation)return bibliography.translationCitation;
 return [w?.author||r.author||"Autor no identificado",w?.title||r.title||"Obra sin título",r.attribution||"Edición digital de procedencia indicada en el archivo", "Fuente digital: "+(r.source||"sin ruta declarada")].join(". ")+". Referencia bibliográfica parcial; faltan datos para atribuir una edición crítica.";
};
function rank(w){
 const d=String(w?.dating||"").toLowerCase();
 if(/arcaic/.test(fold(d)))return -750;
 if(/edici[oó]n editorial/.test(d))return Infinity;
 const year=d.match(/(\d{1,4})\s*(a\.\s*c\.|d\.\s*c\.)/);
 if(year)return Number(year[1])*(year[2].startsWith("a")?-1:1);
 const century=d.match(/(?:siglos?|s\.)\s+([ivx]+)/),roman={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10,xi:11,xii:12};
 if(century){const n=roman[century[1]];if(n)return /a\.\s*c\./.test(d)?-100*n:100*(n-1)+1}
 return Infinity;
}
function markText(parent,text,query,color){
 const needle=fold(query).trim();if(!needle){parent.textContent=text;return}
 let flat="",map=[];
 for(let i=0;i<text.length;){const ch=String.fromCodePoint(text.codePointAt(i)),s=fold(ch);for(let j=0;j<s.length;j++){flat+=s[j];map.push(i)}i+=ch.length}
 let cursor=0,pos=flat.indexOf(needle),count=0;
 while(pos>=0&&count++<80){
  const start=map[pos],last=map[pos+needle.length-1];if(start===undefined||last===undefined)break;
  const end=last+(text.codePointAt(last)>65535?2:1);
  if(start>=cursor){parent.append(document.createTextNode(text.slice(cursor,start)));const m=E("mark","bibliotheca-found-word",text.slice(start,end));m.style.backgroundColor=color;parent.append(m);cursor=end}
  pos=flat.indexOf(needle,pos+needle.length);
 }
 parent.append(document.createTextNode(text.slice(cursor)));
}
function init(){
 const input=document.getElementById("classic-query"),controls=document.querySelector(".classic-controls");
 if(!input||!controls)return;
 for(const key of ["role","aria-autocomplete","aria-controls","aria-expanded"])input.removeAttribute(key);
 const submit=E("button","bibliotheca-search-submit","Buscar en los libros");submit.type="button";controls.append(submit);
 const root=E("section","bibliotheca-unified-results");root.id="bibliotheca-unified-results";
 const coverage=E("p","bibliotheca-coverage","Verificando obras e índices…");
 coverage.setAttribute("role","status");coverage.setAttribute("aria-live","polite");root.append(coverage);
 const toolbar=E("div","bibliotheca-toolbar");toolbar.hidden=true;
 const colorLabel=E("label","","Subrayado");const color=E("input","bibliotheca-color");
 color.type="color";color.value="#b5b5b9";color.title="Color del subrayado";colorLabel.append(color);toolbar.append(colorLabel);
 const smaller=E("button","","A−"),larger=E("button","","A+"),dictionary=E("button","","Lexicon · selección"),
  pronunciation=E("button","","Pronunciar selección"),print=E("button","","PDF / imprimir"),
  email=E("button","","Correo"),whatsapp=E("button","","WhatsApp");
 for(const b of [smaller,larger,dictionary,pronunciation,print,email,whatsapp]){b.type="button";toolbar.append(b)}
 dictionary.disabled=pronunciation.disabled=true;
 print.title="Abre impresión; utiliza Guardar como PDF en el navegador.";
 email.title="Prepara un correo con el enlace a la consulta, sin adjuntar automáticamente un PDF";
 whatsapp.title="Comparte el enlace a esta consulta";
 root.append(toolbar);
 const summary=E("p","bibliotheca-summary");
 const list=E("ol","bibliotheca-groups");list.id="bibliotheca-groups";
 const more=E("button","bibliotheca-more","Mostrar 80 pasajes más");more.type="button";more.hidden=true;
 const disclaimer=E("p","bibliotheca-unindexed-warning");
 root.append(summary,list,more,disclaimer);controls.after(root);
 let catalog=[],registry=[],map=new Map(),verified=false,serial=0,query="",rows=[],shown=0,currentGroups=new Map(),counts=new Map();
 let fontSize=15,highlight=color.value,selected="",diagnostics={};
 const meta=Promise.allSettled([
  fetch(CATALOG).then(r=>{if(!r.ok)throw Error("Catálogo inaccesible");return r.json()}),
  fetch(REGISTRY).then(r=>{if(!r.ok)throw Error("Índice inaccesible");return r.json()})
 ]).then(([cat,idx])=>{
  if(cat.status==="fulfilled"&&Array.isArray(cat.value.works)){catalog=cat.value.works;map=new Map(catalog.map(w=>[w.id,w]))}
  if(idx.status==="fulfilled"&&idx.value.schema==="vitruvia-classics-search-registry-v1"&&Array.isArray(idx.value.entries)){registry=idx.value.entries;verified=true}
  updateCoverage();
 });
 const indexed=()=>new Set(registry.filter(r=>map.has(r.workId)&&r.format!=="historical-ocr-pages").map(r=>r.workId));
 function updateCoverage(){
  if(!catalog.length||!verified){coverage.textContent="No fue posible verificar todo el catálogo y los índices; no se atribuirá ausencia de coincidencias a las obras sin consultar.";return}
  coverage.textContent=catalog.length+" obras catalogadas · "+indexed().size+" con texto indexado · "+registry.length+
   " versiones buscables · "+(catalog.length-indexed().size)+" obras no indexadas (no examinadas).";
 }
 function footer(){
  if(!catalog.length||!verified){disclaimer.textContent="Cobertura no verificable: no se puede determinar cuántas obras quedaron fuera.";return}
  disclaimer.textContent="Obras sin texto indexado: "+(catalog.length-indexed().size)+" de "+catalog.length+
   ". No examinadas por el buscador. No se afirma que el término esté ausente de ellas.";
  if(diagnostics.failed)disclaimer.textContent+=" Además, "+diagnostics.failed+" versiones del registro fallaron durante esta búsqueda: resultados parciales.";
  if(diagnostics.registrySource==="fallback")disclaimer.textContent+=" El motor recurrió al registro de emergencia: cobertura incompleta.";
 }
 function compare(a,b){
  const x=map.get(a.workId)||{},y=map.get(b.workId)||{};
  const alpha=()=>String(x.title||a.title).localeCompare(String(y.title||b.title),"es",{sensitivity:"base"});
  const cmp=document.getElementById("classic-sort")?.value==="author"?alpha():rank(x)-rank(y)||alpha();
  return cmp||a.workId.localeCompare(b.workId)||String(a.language).localeCompare(String(b.language))||
   String(a.locus).localeCompare(String(b.locus),undefined,{numeric:true});
 }
 const dialog=E("dialog","bibliotheca-on-demand-viewer"),top=E("div","bibliotheca-viewer-top");
 const dialogTitle=E("strong","","Lector de clásicos"),external=E("a","","Abrir en pestaña"),close=E("button","","Cerrar");
 external.target="_blank";external.rel="noopener noreferrer";close.type="button";
 top.append(dialogTitle,external,close);dialog.append(top);document.body.append(dialog);
 let frame=null;
 close.addEventListener("click",()=>{dialog.close();frame?.remove();frame=null});
 dialog.addEventListener("close",()=>{frame?.remove();frame=null});
 function openViewer(r){
  const href=localURL(r.link);if(!href)return;
  dialogTitle.textContent=r.title+" · "+(LANG[r.language]||r.language)+" · "+(r.ocr?"Página OCR ":"Locus ")+r.locus;
  external.href=href;frame?.remove();frame=E("iframe","bibliotheca-reader-frame");
  frame.title=dialogTitle.textContent;frame.loading="lazy";dialog.append(frame);
  // Never load a PDF or reader until an explicit click.
  frame.src=href;if(!dialog.open)dialog.showModal();
 }
 function anchor(href,text){
  const url=localURL(href);if(!url)return null;
  const a=E("a","",text);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;
 }
 function group(r){
  const w=map.get(r.workId),item=E("li","bibliotheca-group"),section=E("section","");
  item.append(section);const h=E("h3","bibliotheca-group-title"),a=E("a","",w?.title||r.title);
  a.href="bibliotheca-graeca-latina.html?work="+encodeURIComponent(r.workId);h.append(a);section.append(h);
  section.append(E("p","bibliotheca-group-meta",[w?.author||r.author,w?.dating||"Datación no documentada",w?.genre].filter(Boolean).join(" · ")));
  const t=counts.get(r.workId);section.append(E("p","bibliotheca-group-count",t.units+" loci/pasajes · "+t.hits+" ocurrencias · "+t.versions+" versiones"));
  const cite=quoteWork(w,r);section.append(E("p","bibliotheca-citation","Chicago 18 · "+cite));
  const copy=E("button","bibliotheca-copy","Copiar referencia");copy.type="button";
  copy.addEventListener("click",()=>{if(navigator.clipboard?.writeText)navigator.clipboard.writeText(cite)});
  section.append(copy);const ol=E("ol","bibliotheca-passages");section.append(ol);list.append(item);return ol;
 }
 function passage(r){
  const li=E("li","bibliotheca-passage");li.lang=r.language==="grc"?"el":r.language||"es";
  const metaLine=E("p","bibliotheca-passage-meta",(r.ocr?"Página OCR ":"Locus ")+(r.locus||"sin referencia")+
  " · "+(LANG[r.language]||r.language)+" · "+(r.hitsInPassage||1)+" coincidencia(s)");
  const excerpt=E("p","bibliotheca-passage-text");excerpt.style.fontSize=fontSize+"px";
  markText(excerpt,r.excerpt||"",r.term||query,highlight);
  const actions=E("p","bibliotheca-passage-actions"),link=anchor(r.link,"Leer locus");
  if(link){actions.append(link);const view=E("button","","Abrir visor");view.type="button";view.addEventListener("click",()=>openViewer(r));actions.append(view)}
  li.append(metaLine,excerpt,actions);return li;
 }
 function next(n=80){
  const stop=Math.min(rows.length,shown+n);
  for(let i=shown;i<stop;i++){
   const r=rows[i];let block=currentGroups.get(r.workId);
   if(!block){block=group(r);currentGroups.set(r.workId,block)}
   block.append(passage(r));
  }
  shown=stop;more.hidden=shown>=rows.length;
  if(!more.hidden)more.textContent="Mostrar 80 más · "+(rows.length-shown)+" pasajes pendientes";
 }
 more.addEventListener("click",()=>next());
 function allVisible(){while(shown<rows.length)next(Math.min(1200,rows.length-shown))}
 function show(found,q){
  query=q;rows=found.slice().sort(compare);shown=0;currentGroups.clear();counts.clear();list.replaceChildren();
  for(const r of rows){
   const data=counts.get(r.workId)||{units:0,hits:0,languages:new Set()};
   data.units++;data.hits+=r.hitsInPassage||1;data.languages.add(r.language);counts.set(r.workId,data);
  }
  for(const d of counts.values())d.versions=d.languages.size;
  toolbar.hidden=false;
  const occurrences=rows.reduce((n,r)=>n+(r.hitsInPassage||1),0);
  summary.textContent=rows.length?rows.length+" pasajes documentados · "+occurrences+" ocurrencias · "+counts.size+
   " obras. Los resultados están agrupados por obra y muestran su locus, idioma y referencia bibliográfica.":
   "No se encontraron coincidencias literales en las versiones examinadas. Las obras sin indexar no fueron buscadas.";
  if(rows.length)next();else more.hidden=true;
  footer();
 }
 async function run(){
  const q=input.value.trim(),token=++serial;selected="";dictionary.disabled=pronunciation.disabled=true;
  if(!q){query="";rows=[];list.replaceChildren();summary.textContent="";disclaimer.textContent="";toolbar.hidden=true;more.hidden=true;return}
  if(q.length>180||fold(q).replace(/[^\p{L}\p{N}]/gu,"").length<2){
   summary.textContent="Introduce al menos dos letras o cifras (máximo 180 caracteres).";return
  }
  await meta;submit.disabled=true;summary.textContent="Buscando la palabra o frase en todas las versiones realmente indexadas…";
  list.replaceChildren();toolbar.hidden=true;disclaimer.textContent="";
  try{
   if(!window.ClassicsCorpusSearch?.searchPassages)throw Error("No se cargó el motor de concordancias");
   const hits=await window.ClassicsCorpusSearch.searchPassages([q],{allMatches:true});
   if(token!==serial)return;
   diagnostics=window.ClassicsCorpusSearch.diagnostics?.()||{};
   show(hits,q);
  }catch(error){if(token===serial){summary.textContent="La búsqueda no se completó: "+String(error.message||error);disclaimer.textContent="No se emitió un resultado negativo sobre archivos que no pudieron consultarse."}}
  finally{if(token===serial)submit.disabled=false}
 }
 submit.addEventListener("click",run);
 input.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();void run()}});
 input.addEventListener("input",()=>{if(!input.value.trim()){serial++;void run()}});
 document.getElementById("classic-clear")?.addEventListener("click",()=>{serial++;void run()});
 document.getElementById("classic-sort")?.addEventListener("change",()=>{if(rows.length)show(rows,query)});
 color.addEventListener("input",()=>{highlight=color.value;list.querySelectorAll("mark.bibliotheca-found-word").forEach(e=>e.style.backgroundColor=highlight)});
 larger.addEventListener("click",()=>{fontSize=Math.min(26,fontSize+2);list.querySelectorAll(".bibliotheca-passage-text").forEach(e=>e.style.fontSize=fontSize+"px")});
 smaller.addEventListener("click",()=>{fontSize=Math.max(12,fontSize-2);list.querySelectorAll(".bibliotheca-passage-text").forEach(e=>e.style.fontSize=fontSize+"px")});
 const selectText=()=>{
  const sel=window.getSelection?.(),text=sel?.toString().replace(/\s+/g," ").trim()||"";
  if(!text||text.length>120||!sel.anchorNode||!root.contains(sel.anchorNode))return;
  selected=text;dictionary.disabled=false;pronunciation.disabled=!(window.speechSynthesis&&window.SpeechSynthesisUtterance);
 };
 root.addEventListener("mouseup",selectText);root.addEventListener("keyup",selectText);
 dictionary.addEventListener("click",()=>{if(!selected)return;const url=new URL("vitruvia-lexicon.html",location.href);url.searchParams.set("q",selected);window.open(url.href,"_blank","noopener,noreferrer")});
 pronunciation.addEventListener("click",()=>{
  if(!selected||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
  const t=new SpeechSynthesisUtterance(selected),lang=window.getSelection()?.anchorNode?.parentElement?.closest("[lang]")?.lang||"es";
  t.lang=lang==="el"?"el-GR":lang==="en"?"en-US":lang==="fr"?"fr-FR":lang==="la"?"la":"es-ES";
  window.speechSynthesis.cancel();window.speechSynthesis.speak(t);
 });
 print.addEventListener("click",()=>{if(!query)return;allVisible();window.print()});
 function link(){const u=new URL("bibliotheca-graeca-latina.html",location.href);u.searchParams.set("q",query);return u.href}
 function share(){return "Bibliotheca Graeca et Latina · "+query+" · "+rows.length+" pasajes\n"+link()}
 email.addEventListener("click",()=>{if(!query)return;location.href="mailto:?subject="+encodeURIComponent("Bibliotheca · "+query)+"&body="+encodeURIComponent(share())});
 whatsapp.addEventListener("click",()=>{if(!query)return;window.open("https://wa.me/?text="+encodeURIComponent(share()),"_blank","noopener,noreferrer")});
 const params=new URLSearchParams(location.search),initial=(params.get("q")||params.get("term")||"").trim();
 if(initial&&!params.get("work")){input.value=initial;void run()}
}
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",init,{once:true}):init();
})();
