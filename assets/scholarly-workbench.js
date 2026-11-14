/* Philological workbench for De architectura.
   Reading notes and user underlines are private, non-critical annotations.
   The source texts, their markup and the existing apparatus remain authoritative. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const KEY="vitruvius-reader-annotations-v1";
const EDITIONS={es:"recensio-es",fr:"recensio-fr",en:"theory-en"};
const VERSIONS={es:"V514",fr:"V554",en:"V297"};
let catalogue={},draft=null,selection=null,annotations=[],memory=[],busy=false,passageState=null;
const textValue=s=>String(s??"");
const label=(es,en,fr)=>document.documentElement.lang==="en"?en:document.documentElement.lang==="fr"?fr:es;
function status(s){const x=$("wb-status");if(x)x.textContent=s}
function current(){
 const lang=$("lang")?.value||"es",edition=EDITIONS[lang],locus=[$("book")?.value,$("chapter")?.value,$("section")?.value].join(".");
 if(!/^(?:[1-9]|10)\.(?:praef|\d+)\.\d+$/.test(locus))return null;
 const bibliog=catalogue[edition];
 return {edition,lang,locus,version:bibliog?.version||VERSIONS[lang],bib:bibliog||null,
  url:new URL("lector-bilingue.html?edition="+encodeURIComponent(edition)+"&locus="+encodeURIComponent(locus),location.href).href};
}
const title=e=>e?.bibliographic_title||[e?.title,e?.subtitle].filter(Boolean).join(": ");
function getNotes(){try{const x=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(x)?x:memory}catch{return memory}}
function saveNotes(notes){
 annotations=notes.slice(0,650);
 try{localStorage.setItem(KEY,JSON.stringify(annotations));memory=annotations.slice();return true}
 catch{memory=annotations.slice();status("No se pudo guardar permanentemente en este navegador. Exporte el JSON para conservar las notas.");return false}
}
function relevant(ctx){if(!ctx)return [];return annotations.filter(a=>a.locus===ctx.locus&&a.edition===ctx.edition).sort((a,b)=>a.created.localeCompare(b.created))}
function button(label,action){
 const b=document.createElement("button");b.type="button";b.textContent=label;
 b.addEventListener("click",action);return b
}
function node(tag,cl,text){
 const el=document.createElement(tag);if(cl)el.className=cl;
 if(text!=null)el.textContent=textValue(text);return el
}
function closeBar(){const bar=$("wb-selection-toolbar");if(bar)bar.hidden=true}
function getSelectionInfo(){
 const s=window.getSelection?.();
 if(!s||s.isCollapsed||!s.rangeCount||!s.toString().trim())return null;
 const r=s.getRangeAt(0);
 const roots=["latin-text","translation-text"].map(id=>$(id)).filter(Boolean);
 const root=roots.find(el=>el.contains(r.startContainer)&&el.contains(r.endContainer));
 if(!root)return null;
 const prefix=document.createRange();prefix.selectNodeContents(root);prefix.setEnd(r.startContainer,r.startOffset);
 const start=prefix.toString().length,raw=s.toString();
 if(raw.length>3000||raw.length<1)return null;
 return {panel:root.id,quote:raw,start,end:start+raw.length,range:r.cloneRange()};
}
function presentBar(){
 const info=getSelectionInfo();
 if(!info){closeBar();return}
 selection=info;
 const rect=info.range.getBoundingClientRect(),bar=$("wb-selection-toolbar");
 if(!bar)return;
 bar.hidden=false;const width=bar.offsetWidth||330,height=bar.offsetHeight||45;
 bar.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-width-8))+"px";
 bar.style.top=Math.max(8,rect.top>height+10?rect.top-height-7:Math.min(rect.bottom+8,window.innerHeight-height-8))+"px";
}
function hideEditor(){
 $("wb-annotation-editor").hidden=true;draft=null;
}
function openEditor(info){
 const ctx=current();if(!ctx){status("Abra primero un locus de la edición.");return}
 draft=info||{panel:"passage",quote:"",start:null,end:null};
 $("wb-selected-quote").textContent=draft.quote?.trim()?"Selección: «"+draft.quote.trim()+"»":"Nota general de Vitr. "+ctx.locus+" · "+ctx.version;
 $("wb-note-input").value="";
 $("wb-annotation-editor").hidden=false;
 $("wb-note-input").focus({preventScroll:true});
 $("wb-annotation-editor").scrollIntoView({block:"nearest",behavior:"smooth"});
 closeBar();
}
function createNote(info,comment){
 const ctx=current();if(!ctx)return null;
 if(annotations.length>=650){status("Límite local de 650 notas alcanzado. Exporte y depure el cuaderno.");return null}
 const stamp=new Date().toISOString();
 const note={id:"personal-"+Date.now()+"-"+Math.floor(Math.random()*100000),kind:"private-reading-annotation",
  locus:ctx.locus,edition:ctx.edition,version:ctx.version,panel:info?.panel||"passage",
  quote:info?.quote||"",start:Number.isInteger(info?.start)?info.start:null,
  end:Number.isInteger(info?.end)?info.end:null,comment:textValue(comment).slice(0,4000),
  color:$("wb-note-color").value,created:stamp,sourceUrl:ctx.url,
  editorialStatus:"Anotación privada; sin valor de variante ni colación"};
 if(!note.comment&&!note.quote.trim()){status("Escriba un comentario o seleccione un fragmento.");return null}
 annotations.push(note);saveNotes(annotations);return note;
}
function clearMarks(){
 for(const root of [$("latin-text"),$("translation-text")]){
  if(!root)continue;
  for(const span of root.querySelectorAll(".wb-personal-mark")){
   // Preserve the original edition markup and search highlights.
   span.replaceWith(...span.childNodes);
  }
 }
}
function highlightNote(n){
 if(!n.quote||n.start==null||n.end==null)return false;
 const root=$(n.panel);if(!root||n.end<=n.start)return false;
 // Never silently re-anchor an annotation to a different reading.
 if(root.textContent.slice(n.start,n.end)!==n.quote)return false;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),segs=[];
 let t,off=0;
 while((t=walker.nextNode())){
  const len=t.nodeValue.length,a=off,b=off+len;off=b;
  if(b<=n.start||a>=n.end)continue;
  if(t.parentElement?.closest(".wb-personal-mark"))return false;
  const first=Math.max(0,n.start-a),last=Math.min(len,n.end-a);
  if(last>first)segs.push({t,first,last});
 }
 if(!segs.length)return false;
 for(let i=segs.length-1;i>=0;i--){
  let {t,first,last}=segs[i];if(!t.isConnected)continue;
  if(last<t.length)t.splitText(last);
  if(first)t=t.splitText(first);
  const span=node("span","wb-personal-mark");
  span.dataset.noteId=n.id;span.dataset.color=n.color||"gold";
  span.title="Subrayado personal, no variante textual";
  t.replaceWith(span);span.append(t);
 }
 return true;
}
function renderNotes(){
 const ctx=current(),notes=relevant(ctx),list=$("wb-saved-notes");
 if(!list)return;
 list.replaceChildren();
 $("wb-notes-count").textContent="("+notes.length+")";
 if(!notes.length){list.append(node("p","wb-muted","No hay notas personales en esta edición y locus."));return}
 for(const n of notes){
  const card=node("article","wb-note");
  const meta=node("div","wb-note-meta",n.version+" · Vitr. "+n.locus+" · "+(n.panel==="latin-text"?"Texto latino":n.panel==="translation-text"?"Traducción":"Pasaje")+" · "+n.created.slice(0,10));
  card.append(meta);
  if(n.quote)card.append(node("blockquote",null,n.quote.trim()));
  if(n.comment)card.append(node("p",null,n.comment));
  card.append(button("Eliminar nota personal",()=>{
   if(!window.confirm("¿Eliminar esta anotación privada?"))return;
   annotations=annotations.filter(v=>v.id!==n.id);saveNotes(annotations);sync();
  }));
  list.append(card);
 }
}
function sync(){
 if(busy)return;busy=true;
 try{
  clearMarks();const notes=relevant(current());
  // Descending offsets keep stable mapping if there are multiple underlines.
  notes.filter(n=>n.start!=null).sort((a,b)=>b.start-a.start).forEach(highlightNote);
  renderNotes();
  const ctx=current(),link=$("wb-ecdotics");
  if(ctx&&link)link.href="registro-ecdotico.html?q="+encodeURIComponent(ctx.locus);
  $("wb-comparison")?.setAttribute("aria-pressed",String(Boolean($("compare-all")?.checked)));
 }finally{busy=false}
}
function download(filename,contents,mime){
 const blob=new Blob([contents],{type:mime||"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob);
 const link=document.createElement("a");link.href=url;link.download=filename;
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function reference(ctx){
 const e=ctx.bib;if(!e)return null;
 return ["Kurilo, Diego A.",title(e)+".",e.edition_statement?e.edition_statement+".":"",
  (e.publication_place||"Buenos Aires")+":",(e.publisher||"Sophia Lux Ediciones Académicas")+",",
  String(e.year||"2026")+".",e.doi?"https://doi.org/"+e.doi+".":"",
  "Vitr. "+ctx.locus+".",ctx.url].filter(Boolean).join(" ");
}
function slug(ctx){return "vitruvius-"+ctx.version+"-"+ctx.locus.replace(/[^a-z0-9.-]/gi,"_")}
function bibtex(ctx){
 const e=ctx.bib;
 const clean=s=>textValue(s).replace(/[{}]/g,"").replace(/[\r\n]+/g," ");
 const fields=[
  ["author","Kurilo, Diego A."],["title",title(e)],["year",e.year||"2026"],
  ["publisher",e.publisher],["address",e.publication_place],["doi",e.doi],
  ["url",ctx.url],["note","Vitruvio, De architectura, "+ctx.locus+". "+(e.edition_statement||"")+"; "+(e.isbn?"ISBN declarado en el paratexto, compartido por V514 y V554, pendiente de verificación de asignación. ":"")+"No acredita colación manuscrita."]];
 if(e.isbn)fields.splice(5,0,["isbn",e.isbn]);
 return "@book{Kurilo"+(e.year||"2026")+ctx.version+",\n"+fields.filter(x=>x[1]).map(([k,v])=>"  "+k+" = {"+clean(v)+"}").join(",\n")+"\n}\n";
}
function ris(ctx){
 const e=ctx.bib;
 const field=(k,v)=>v?k+"  - "+textValue(v).replace(/[\r\n]+/g," "):"";
 return [["TY  - BOOK",field("AU","Kurilo, Diego A."),field("TI",title(e)),field("PY",e.year||"2026"),
  field("PB",e.publisher),field("CY",e.publication_place),field("SN",e.isbn),field("DO",e.doi),
  field("UR",ctx.url),field("N1","Vitr. "+ctx.locus+"; edición "+ctx.version+". "+(e.isbn?"ISBN consignado en V514/V554: asignación independiente pendiente de corroboración. ":"")+"Las anotaciones privadas no forman parte del aparato crítico."),"ER  - "].filter(Boolean).join("\n"),"\n"].join("");
}
function passageData(ctx){
 return {schema:"vitruvius-reader-research-v1",source:"Vitruvius Digital Library",editorialStatus:"Edición según su catálogo; sin colación autóptica general inferida",
  authorAntiquus:"Marcus Vitruvius Pollio",editorModernus:"Diego A. Kurilo",qualification:"Arquitecto con orientación en Urbanismo",
  version:ctx.version,editionId:ctx.edition,locus:ctx.locus,sourceUrl:ctx.url,
  bibliography:ctx.bib?{title:title(ctx.bib),publisher:ctx.bib.publisher,place:ctx.bib.publication_place,year:ctx.bib.year,
   isbn:ctx.bib.isbn||null,isbnNote:ctx.bib.isbn_note||null,doi:ctx.bib.doi||null}:null,
  latin:$("latin-text")?.textContent||"",translation:passageState?.hasAlignedTranslation?($("translation-text")?.textContent||""):null,translationLanguage:ctx.lang,
  pdfPages:passageState?.pdfPages||null,translationAlignment:passageState?.hasAlignedTranslation===true?"Alineación por locus (no cotejo manuscrito)":"Sin traducción alineada para este locus",
  annotations:relevant(ctx)};
}
function markdown(ctx){
 const data=passageData(ctx),notes=data.annotations;
 return [
 "# Vitruvio, De architectura "+ctx.locus+" · "+ctx.version,
 "",
 "## Fuente bibliográfica",
 reference(ctx)||"Ficha bibliográfica pendiente de carga; consulte la edición.",
 "",
 "Autor antiguo: Marco Vitruvio Polión. Responsable moderno: Diego A. Kurilo, Arquitecto con orientación en Urbanismo.",
 "Estado: "+(ctx.bib?.edition_statement||"")+ ". La alineación por locus no implica cotejo autóptico.",
 "",
 "## Texto latino de "+ctx.version,"",data.latin,
 "",
 "## Traducción ("+ctx.lang+")", "",data.translation===null?"Sin correspondencia textual disponible para este locus; no se ha añadido traducción sustituta.":data.translation,
 "",
 "## Notas personales del investigador (no forman parte del texto ni del aparato crítico)",
 ...(!notes.length?["","Sin notas personales."]:notes.flatMap(n=>["",
 "- "+n.created.slice(0,10)+" · "+n.color+" · "+(n.panel||"pasaje"),
 n.quote?"> "+n.quote.trim():"",
 n.comment||"Subrayado sin comentario."])),
 "",
 "Enlace permanente: "+ctx.url,
 "DOI de la publicación: "+(ctx.bib?.doi?"https://doi.org/"+ctx.bib.doi:"No documentado"),
 ""].join("\n");
}
function exporter(type){
 const ctx=current();if(!ctx){status("Abra un locus válido.");return}
 if(!ctx.bib){status("No se ha podido cargar la ficha bibliográfica; la exportación académica se suspende para no inventar metadatos.");return}
 const base=slug(ctx);try{
  if(type==="markdown")download(base+".md",markdown(ctx),"text/markdown;charset=utf-8");
  if(type==="bibtex")download(base+".bib",bibtex(ctx),"application/x-bibtex;charset=utf-8");
  if(type==="ris")download(base+".ris",ris(ctx),"application/x-research-info-systems;charset=utf-8");
  if(type==="json")download(base+"-notas.json",JSON.stringify(passageData(ctx),null,2),"application/json;charset=utf-8");
  status("Exportación preparada para "+ctx.version+" · Vitr. "+ctx.locus+". La cita incorpora el DOI de la edición, no el del testimonio manuscrito.");
 }catch(e){status("No se pudo generar el archivo: "+(e?.message||"error"))}
}
function lookup(){
 const info=selection||getSelectionInfo(),raw=(info?.quote||new URLSearchParams(location.search).get("q")||"").trim();
 const panel=$("wb-word-panel"),slot=$("wb-word-content");
 if(!raw){status("Seleccione una voz latina o griega antes de abrir el diccionario.");return}
 panel.hidden=false;slot.replaceChildren();
 const lex=window.ClassicalLexicon,word=raw.replace(/^[\W_]+|[\W_]+$/gu,"");
 const isSingle=/^[\p{L}\p{M}ʼ'’-]{2,80}$/u.test(word);
 if(!isSingle){
  slot.append(node("p",null,"La selección contiene más de una palabra. Para una ficha lematizada individual, seleccione una única voz."));
 }else if(lex?.renderPanel){
  const lang=info?.panel==="latin-text"?( /[\u0370-\u03ff\u1f00-\u1fff]/u.test(word)?"grc":"la"):($("lang")?.value||"es");
  Promise.resolve(lex.renderPanel(slot,word,{lang,work:"vitruvius",online:false})).catch(()=>{
   slot.append(node("p",null,"El diccionario local no dispone de una ficha verificable para esta forma."));
  });
 }else slot.append(node("p",null,"El módulo de diccionario local no está disponible en esta sesión."));
 const link=document.createElement("a");link.href="vitruvia-lexicon.html?"+new URLSearchParams({q:raw,mode:"palabra"});
 link.textContent="Abrir investigación completa en Lexicon";slot.append(link);
 if(!panel.querySelector(".wb-method-note"))panel.append(node("p","wb-muted wb-method-note","Las glosas y propuestas de lematización requieren confirmación contextual; no constituyen por sí solas una decisión crítica."));
 panel.scrollIntoView({block:"nearest",behavior:"smooth"});closeBar();
}
function mount(){
 if(!$("scholarly-workbench"))return;
 annotations=getNotes();const t=$("wb-selection-toolbar");
 for(const b of t.querySelectorAll("button"))b.addEventListener("pointerdown",e=>e.preventDefault());
 $("wb-close-selection").addEventListener("click",closeBar);
 $("wb-underline").addEventListener("click",()=>{
  const info=selection;if(!info){status("Seleccione primero un fragmento.");return}
  if(createNote(info,"")){sync();status("Subrayado personal guardado en este navegador, separado del aparato crítico.");}
  window.getSelection()?.removeAllRanges();closeBar();
 });
 $("wb-annotate").addEventListener("click",()=>openEditor(selection));
 $("wb-copy").addEventListener("click",async()=>{
  if(!selection?.quote)return;
  try{await navigator.clipboard.writeText(selection.quote);status("Fragmento seleccionado copiado, sin alterar el texto.");}catch{status("Seleccione el fragmento y utilice Ctrl+C / Cmd+C.");}
  closeBar();
 });
 $("wb-lookup").addEventListener("click",lookup);
 $("wb-add-note").addEventListener("click",()=>openEditor(getSelectionInfo()));
 $("wb-cancel-note").addEventListener("click",hideEditor);
 $("wb-save-note").addEventListener("click",()=>{
  if(createNote(draft,$("wb-note-input").value)){hideEditor();sync();status("Nota privada guardada con edición y locus. No se incorpora al aparato crítico.");}
 });
 $("wb-dictionary").addEventListener("click",lookup);
 $("wb-apparatus").addEventListener("click",()=>{
  const ctx=current();if(!ctx){status("Abra primero un locus.");return}
  const apparatus=$("locus-apparatus");
  if(apparatus){apparatus.scrollIntoView({block:"start",behavior:"smooth"});apparatus.focus?.({preventScroll:true})}
  else {status("El panel del aparato todavía no se cargó. Abra el aparato completo del locus.");
   const a=node("a",null,"Abrir aparato crítico de "+ctx.locus);a.href="aparato-critico.html?locus="+encodeURIComponent(ctx.locus);$("wb-status").append(" ",a);}
 });
 $("wb-comparison").addEventListener("click",()=>{
  const c=$("compare-all");if(!c)return;
  c.checked=!c.checked;c.dispatchEvent(new Event("change",{bubbles:true}));
  $("wb-comparison").setAttribute("aria-pressed",String(c.checked));
  if(c.checked)setTimeout(()=>$("other-translations")?.scrollIntoView({behavior:"smooth",block:"nearest"}),120);
 });
 for(const kind of ["markdown","bibtex","ris","json"])$("wb-export-"+kind).addEventListener("click",()=>exporter(kind));
 const capture=(e)=>{
  const sel=window.getSelection?.();
  // Do not allow a dictionary click to replace an intentional text selection.
  if(sel&&!sel.isCollapsed&&sel.toString().trim())e.stopImmediatePropagation();
 };
 for(const id of ["latin-text","translation-text"])$(id)?.addEventListener("click",capture,true);
 document.addEventListener("pointerup",e=>{
  if(t.contains(e.target))return;
  requestAnimationFrame(presentBar);
 });
 document.addEventListener("keyup",e=>{
  if(["Shift","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key))requestAnimationFrame(presentBar);
 });
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeBar()});
 document.addEventListener("pointerdown",e=>{
  if(!t.contains(e.target)&&!["latin-text","translation-text"].some(id=>$(id)?.contains(e.target)))closeBar();
 });
 document.addEventListener("scroll",()=>{t.hidden=true},{capture:true,passive:true});
 document.addEventListener("vitruvius:passage-rendered",event=>{
  passageState=event.detail||null;
  closeBar();selection=null;hideEditor();
  sync();
 });
 fetch("data/catalog.json?v=20261113-workbench").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(data=>{
  catalogue=Object.fromEntries((data.editions||[]).map(e=>[e.id,e]));
  sync();
 }).catch(()=>{status("No se pudieron cargar las fichas editoriales. Las exportaciones bibliográficas quedan desactivadas para evitar citas incompletas.");});
 sync();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
