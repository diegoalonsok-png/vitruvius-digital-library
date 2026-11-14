/* Dossier ecdótico: lectura cruzada de ediciones, comentarios y fuentes OCR.
 * La comparación digital no equivale a colación diplomática ni a lectio constituta.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const EDITIONS=[["recensio-es","V514 · castellano","es"],["recensio-fr","V554 · français","fr"],["theory-en","V297 · English","en"]];
const ROM=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const required=[
 "data/structured/recensio-es.json","data/structured/recensio-fr.json",
 "data/structured/theory-en.json","data/collation-loci.json",
 "data/apparatus/aparato-comparativo.json",
 "data/codex-h/folio-locus-map.json","data/codex-h/observaciones-h.json","data/catalog.json"
];
let cached=null,token=0,lastLocus=null;
function el(tag,text,cls){const x=document.createElement(tag);if(text!==undefined&&text!==null)x.textContent=String(text);if(cls)x.className=cls;return x}
function add(p,...children){for(const c of children)if(c!==undefined&&c!==null)p.append(c);return p}
function field(p,label,value){if(value===null||value===undefined||value==="")return;const z=el("p",null,"dl-field");add(z,el("strong",label+" · "),document.createTextNode(String(value)));p.append(z)}
function box(name,description){const s=el("section",null,"dl-section");s.append(el("h3",name));if(description)s.append(el("p",description,"dl-muted"));return s}
function link(p,name,href){if(typeof href!=="string"||!/^(https:\/\/|documents\/|[a-z0-9-]+\.html([?#]|$))/i.test(href))return;
 const a=el("a",name,"dl-link");a.href=href;if(href.startsWith("https://")){a.target="_blank";a.rel="noopener noreferrer"}p.append(a)}
function fold(x){return String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
function cleanLocus(x){let q=String(x||"").trim().replace(/^vitr\.?\s*/i,"");return /^([1-9]|10)\.(praef|\d+)\.(\d+)$/.test(q)?q:null}
function viewLocus(x){const [b,...r]=x.split(".");return "Vitr. "+(ROM[+b]||b)+"."+r.join(".")}
function subsection(parent,label,items,max=7){
 const content=el("div");for(const item of items.slice(0,Math.max(0,max)))content.append(item);
 if(items.length>max)content.append(el("p","Se muestran "+max+" de "+items.length+" entradas. Consulte la fuente completa y el Registro ecdótico.","dl-muted"));
 const d=el("details",null,"dl-detail");d.append(el("summary",label+" ("+items.length+")"),content);parent.append(d);return d
}
async function getData(){
 if(!cached)cached=Promise.all(required.map(async u=>{const r=await fetch(u);if(!r.ok)throw Error(u+" HTTP "+r.status);return r.json()})).catch(e=>{cached=null;throw e});
 return cached
}
function fPDF(meta,id){
 const entry=meta.editions?.find(e=>e.id===id);
 return entry?.read_url||entry?.source_url||({ "recensio-es":"documents/kurilo-recensio-es.pdf",
 "recensio-fr":"documents/kurilo-recensio-fr.pdf","theory-en":"documents/kurilo-theory-en.pdf"})[id]
}
function passage(record,locus){return record?.passages?.find(x=>x.locus===locus)||null}
function passagePanel(root,source,meta,locus,list){
 const grid=el("div",null,"dl-grid");
 for(let i=0;i<EDITIONS.length;i++){
  const [id,heading,lang]=EDITIONS[i],record=source[i],row=passage(record,locus),article=el("article",null,"dl-source");
  article.append(el("h4",heading));
  if(row){
   const p=el("p",row.latin||"Sin latín digitalizado","dl-latin");p.lang="la";add(article,el("h5","Textus Latinus"),p);
   if(row.latin)list.push([heading+" · latín",row.latin]);
   const t=el("p",row.translation||"Sin traducción indexada","dl-translation");t.lang=lang;
   add(article,el("h5","Interpretatio"),t);
   if(row.translation)list.push([heading+" · traducción",row.translation]);
   const page=Object.entries(row.pdf_pages||{}).map(([key,val])=>key+" "+val).join(" · ");
   if(page)field(article,"Páginas en índice",page);
  }else article.append(el("p","Sin pasaje separado en el índice de esta edición.","dl-muted"));
  const ed=meta.editions?.find(x=>x.id===id);
  if(ed?.doi)link(article,"DOI "+ed.doi,"https://doi.org/"+ed.doi);
  link(article,"Libro original",fPDF(meta,id));
  grid.append(article);
 }
 const s=box("I · Textus et interpretationes","Tres versiones editoriales; su latín procede de los libros originales. Diferencias entre V514, V554 y V297 no constituyen por sí mismas variantes manuscritas.");
 s.append(grid);root.append(s)
}
function ocrPanel(root,locus,ocr,list){
 const s=box("II · Collatio editorum · Rose y Krohn","Pasajes latinos localizados mediante OCR y alineación automática: la semejanza numérica es una medida computacional, no certeza paleográfica. Consulte el impreso antes de adoptar una variante.");
 const item=ocr.loci?.[locus];
 if(!item){s.append(el("p","Ningún pasaje alineado en este índice.","dl-muted"));root.append(s);return}
 const grid=el("div",null,"dl-grid dl-grid-two");
 for(const [id,name,filename] of [["rose-1899","Valentin Rose · 1899","https://archive.org/download/vitruviidearchit00vitr_0/vitruviidearchit00vitr_0.pdf"],["krohn-1912","F. Krohn · 1912","documents/krohn-1912.pdf"]]){
  const a=item[id],card=el("article",null,"dl-source");card.append(el("h4",name));
  if(!a){card.append(el("p","Pasaje no alineado.","dl-muted"))}
  else{
   field(card,"Página(s) OCR",String(a.page??"sin página")+(a.pageEnd?"–"+a.pageEnd:""));
   if(typeof a.score==="number")field(card,"Semejanza con el texto base",a.score.toFixed(3));
   const p=el("p",a.text||"OCR sin texto","dl-latin dl-ocr");p.lang="la";card.append(p);
   if(a.text)list.push([name+" · OCR latino",a.text]);
   link(card,"Ver página original",filename+(a.page?"#page="+encodeURIComponent(a.page):""));
  }
  grid.append(card);
 }
 s.append(grid);root.append(s)
}
function collationPanel(root,r){
 const s=box("III · Apparatus auctoris · Apéndice T","Cada entrada conserva la transcripción de lo impreso y su grado de revisión. Coincidencias V514/V554 son controles de dos publicaciones del mismo autor, no dos testimonios independientes.");
 if(!r.coll?.length)s.append(el("p","No hay entrada del Apéndice T registrada para este locus; no debe interpretarse como ausencia de variantes en los manuscritos.","dl-muted"));
 else for(const e of r.coll){
  const card=el("article",null,"dl-entry");
  const grade=e.grado||"sin grado";card.append(el("h4",(e.version||e.edition||"Edición")+" · "+grade));
  for(const [k,v] of Object.entries(e.campos||{}))field(card,k,v);
  if(e.siglaCitadas?.length)field(card,"Sigla citadas",e.siglaCitadas.join(", "));
  if(e.motivosDeRevision?.length)field(card,"Motivos de revisión",e.motivosDeRevision.join(" · "));
  const note=el("p",grade==="doble-fuente"||grade==="fuente-unica"?"Transcripción editorial con controles de extracción; requiere cotejo material para afirmar autopsia.":"Registro impreso sin verificación autóptica independiente o con transcripción pendiente.","dl-state");
  card.append(note);
  for(const f of e.folios||[])link(card,"H f. "+f,"codex-h-folios-local.html?folio="+encodeURIComponent(f));
  if(e.pdf)link(card,"Apéndice T · página "+(e.page||"original"),e.pdf);
  s.append(card)
 }
 root.append(s)
}
function historicalPanel(root,locus,historical,list){
 const s=box("IV · Apparatus criticus historicus","Entradas extraídas por OCR de los aparatos de Rose y Krohn. La atribución automática de una línea al locus puede abarcar lecturas vecinas; se debe abrir la página citada antes de formular una decisión ecdótica.");
 const data=(historical.loci||[]).find(x=>x.locus===locus);
 if(!data){s.append(el("p","No hay entradas de aparato histórico asociadas por OCR a este locus.","dl-muted"));root.append(s);return}
 for(const [id,name] of [["rose-1899","Rose 1899"],["krohn-1912","Krohn 1912"]]){
  const row=data[id],c=el("article",null,"dl-entry");c.append(el("h4",name));
  if(!row?.entradas?.length){c.append(el("p","Sin nota OCR asociada.","dl-muted"));s.append(c);continue}
  field(c,"Página",row.pagina??"sin dato");
  if(typeof row.grado==="number")field(c,"Semejanza de alineación",row.grado.toFixed(3));
  link(c,"Página impresa del aparato",row.pdf);
  const items=row.entradas.map(item=>{
   const li=el("div",null,"dl-entry");
   li.append(el("p",item.texto||"","dl-latin"));if(item.texto)list.push([name+" · nota OCR",item.texto]);
   if(item.sigla?.length)field(li,"Sigla detectadas",item.sigla.join(", "));
   if(item.pagina)field(li,"Referencia", "p. "+item.pagina+(item.linea?" · l. OCR "+item.linea:""));
   return li
  });
  subsection(c,"Mostrar las notas históricas asociadas",items,30);
  s.append(c);
 }
 root.append(s)
}
function witnessPanel(root,locus,folioMap,hobs){
 const s=box("V · Codex H · Harley MS 2767","Folio de alta resolución y notas de inspección. La localización de un pasaje o de una rúbrica no implica lectura diplomática completa del folio.");
 const loci=(folioMap.entries||[]).flatMap(e=>(e.loci||[]).filter(q=>q.locus===locus).map(q=>({folio:e.folio,status:q.status,note:q.note})));
 const observations=(hobs.observaciones||[]).filter(x=>x.locus===locus);
 if(!(loci.length||observations.length))s.append(el("p","Sin correspondencia verificada en este registro de folios. Consultar el repertorio general de H.","dl-muted"));
 for(const x of loci){
  const d=el("article",null,"dl-entry");field(d,"Folio",x.folio);field(d,"Estado del alineamiento",x.status);field(d,"Nota",x.note);
  link(d,"Abrir el folio "+x.folio,"codex-h-folios-local.html?folio="+encodeURIComponent(x.folio));s.append(d);
 }
 for(const x of observations){
  const d=el("article",null,"dl-entry");d.append(el("h4","Observación de H · folio "+x.folio));
  field(d,"Aparato propuesto",x.aparato);field(d,"Lectura anotada en H",x.H);field(d,"Detalle",x.detalle);
  field(d,"Estado",x.estado||"a revisar");
  link(d,"Ver facsímil H f. "+x.folio,"codex-h-folios-local.html?folio="+encodeURIComponent(x.folio));s.append(d)
 }
 link(s,"Concordancia de todos los folios","concordancia-folios.html?locus="+encodeURIComponent(locus));
 root.append(s)
}
function commentaryPanel(root,r,list){
 const s=box("VI · Scholia, glosas y notas de autor","Se identifican por edición, lema, número de nota y locus explícito o propuesto; no son lecturas de códices ni se consideran variantes textuales.");
 const count=(r.gloss?.length||0)+(r.notes?.length||0)+(r.candidate?.length||0)+(r.sections?.length||0)+(r.dictionary?.length||0);
 if(!count)s.append(el("p","No se indexaron comentarios enlazados directamente con este locus; consulte el índice general de comentarios.","dl-muted"));
 for(const x of r.gloss||[]){
  const c=el("article",null,"dl-entry");c.append(el("h4",(x.version||"Edición")+" · "+(x.lemma||"Glosa")));
  c.append(el("p",x.glosa||""));field(c,"Grado de anclaje",x.grado);
  if(x.pdf)link(c,"Glosa original p. "+x.page,x.pdf);s.append(c);
  list.push([String(x.version||"")+" · glosa "+(x.lemma||""),x.glosa||""])
 }
 for(const x of r.sections||[]){
  const c=el("article",null,"dl-entry");c.append(el("h4",(x.version||"Edición")+" · "+(x.rotulo||"Comentario")));
  if(x.pdf)link(c,"Sección del comentario p. "+x.page,x.pdf);s.append(c)
 }
 for(const x of r.dictionary||[]){
  const c=el("article",null,"dl-entry");c.append(el("h4",(x.version||"Edición")+" · "+x.lemma));
  c.append(el("p",x.definicion||""));field(c,"Vínculo","Contexto de sección, no coincidencia del lema certificada");
  if(x.pdf)link(c,"Diccionario p. "+x.page,x.pdf);s.append(c);
  list.push([String(x.version||"")+" · diccionario "+x.lemma,x.definicion||""])
 }
 for(const x of [...(r.notes||[]),...(r.candidate||[])]){
  const explicit=!!x.locus,c=el("article",null,"dl-entry"),ed=EDITIONS.find(e=>e[0]===x.edition);
  c.append(el("h4",(ed?.[1]||x.edition)+" · nota "+(x.footnote_id||"s/n")));
  field(c,"Localización",explicit?"Locus explícito en fuente":"Asignación candidata por indexación, a revisar");
  c.append(el("p",x.text||""));field(c,"Párrafo del DOCX",x.source_paragraph);
  if(x.anchor){
   const d=el("details",null,"dl-detail");add(d,el("summary","Contexto original"),el("p",x.anchor));c.append(d)
  }
  s.append(c);list.push([(ed?.[1]||x.edition)+" · nota "+x.footnote_id,x.text||""])
 }
 link(s,"Índice completo de comentarios y notas","indice-commentariorum.html");
 root.append(s)
}
function searchPanel(root,list){
 const s=box("Búsqueda por palabras en el locus","Concordancia local literal: cuenta apariciones en los tres textos latinos, traducciones, OCR y material exegético recuperado. No crea equivalencias semánticas ni corrige el OCR.");
 const input=el("input",null,"dl-input");input.type="search";input.placeholder="symmetria, decor, ordinatio, fabrica…";
 input.setAttribute("aria-label","Buscar palabra en textos y notas del dossier");
 const target=el("div",null,"dl-term-result");const render=()=>{
  const term=fold(input.value.trim());target.replaceChildren();
  if(term.length<2){target.append(el("p","Escriba dos o más caracteres.","dl-muted"));return}
  const results=[];for(const [label,text] of list){
   const f=fold(text);let start=0,num=0,position=-1;
   while((position=f.indexOf(term,start))!==-1){num++;start=position+Math.max(term.length,1);if(num>=500)break}
   if(num)results.push({label,text,count:num,position:f.indexOf(term)})
  }
  target.append(el("p",results.reduce((sum,x)=>sum+x.count,0)+" apariciones en "+results.length+" campos indexados."));
  for(const x of results.slice(0,40)){
   const p=el("p",null,"dl-result");p.append(el("strong",x.label+" ("+x.count+"): "));
   const a=Math.max(0,x.position-68),b=Math.min(x.text.length,x.position+term.length+90);
   p.append(document.createTextNode((a?"…":"")+x.text.slice(a,b)+(b<x.text.length?"…":"")));target.append(p)
  }
  if(results.length>40)target.append(el("p","Hay más campos coincidentes; refine la consulta.","dl-muted"));
 };
 input.addEventListener("input",render);s.append(input,target);root.append(s);
 const param=new URLSearchParams(location.search).get("q");if(param){input.value=param;render()}else render()
}
async function openLocus(locus,scroll=true){
 const id=cleanLocus(locus),wrap=$("dossier");
 if(!id||!wrap)return;
 const request=++token,last=window.VDL_ECDOTIC_COVERAGE;
 if(!last||!last.some(r=>r.locus===id)){wrap.hidden=false;wrap.replaceChildren(el("p","Locus no reconocido entre los 731 canónicos.","dl-muted"));return}
 lastLocus=id;wrap.hidden=false;wrap.replaceChildren(el("p","Reuniendo los testimonios y el comentario del locus "+id+"…","dl-muted"));
 if(scroll)wrap.scrollIntoView({behavior:"smooth",block:"start"});
 try{
  const [es,fr,en,ocr,historical,folioMap,hobs,catalog]=await getData();
  if(request!==token)return;
  const r=last.find(x=>x.locus===id),sources=[];
  const header=el("header",null,"dl-head");
  add(header,el("h2","Dossier de "+viewLocus(id)),el("p","Texto y traducción · colación impresa · Rose / Krohn · Codex H · comentario de autor","dl-muted"));
  const actions=el("div",null,"dl-actions");
  link(actions,"Copiar enlace del locus","cobertura-aparato-critico.html?locus="+encodeURIComponent(id)+"#dossier");
  link(actions,"Lectura estilo Budé","apparatus-bude.html?locus="+encodeURIComponent(id));
  link(actions,"Registro ecdótico","registro-ecdotico.html?locus="+encodeURIComponent(id));
  link(actions,"Apparatus criticus","apparatus-criticus.html?locus="+encodeURIComponent(id));
  header.append(actions);
  const core=el("div",null,"dl-body");
  passagePanel(core,[es,fr,en],catalog,id,sources);
  ocrPanel(core,id,ocr,sources);
  collationPanel(core,r);
  historicalPanel(core,id,historical,sources);
  witnessPanel(core,id,folioMap,hobs);
  commentaryPanel(core,r,sources);
  searchPanel(core,sources);
  wrap.replaceChildren(header,core);
 }catch(err){
  if(request!==token)return;
  wrap.replaceChildren(el("p","No se pudieron cargar las fuentes del dossier: "+err.message+". Los índices y visores existentes permanecen accesibles.","dl-error"));
 }
}
function init(){
 document.addEventListener("click",ev=>{
  const a=ev.target.closest("a[data-dossier]");if(!a)return;
  const locus=a.getAttribute("data-dossier");
  if(!cleanLocus(locus))return;
  ev.preventDefault();
  history.pushState(null,"","?locus="+encodeURIComponent(locus)+"#dossier");
  openLocus(locus,true)
 });
 window.addEventListener("popstate",()=>{const l=new URLSearchParams(location.search).get("locus");if(l)openLocus(l,false)});
 document.addEventListener("vdl:coverage-ready",()=>{
  const l=new URLSearchParams(location.search).get("locus");
  if(l)openLocus(l,location.hash==="#dossier")
 });
 if(Array.isArray(window.VDL_ECDOTIC_COVERAGE)){
  const l=new URLSearchParams(location.search).get("locus");
  if(l)openLocus(l,location.hash==="#dossier")
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();