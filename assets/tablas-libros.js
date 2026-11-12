/* Tablas de los libros de Diego A. Kurilo (V514, V554, V297).
   - Todas las tablas numeradas, extraídas de los PDF (data/tablas-libros.json).
   - Búsqueda dentro de títulos, encabezados y celdas, con subrayado y filtro de filas.
   - Cada locus de una celda abre el pasaje latino con su traducción (ES/FR/EN elegible).
   - Un término de la primera columna abre su índice en los tres libros:
     glosario del autor (verba-capitalia) y pasajes donde aparece. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const el=(tag,attrs={},...kids)=>{const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else if(v!=null)e.setAttribute(k,v)}e.append(...kids.filter(x=>x!=null));return e};
const fold=v=>String(v||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const plegarLat=v=>fold(v).replace(/j/g,"i").replace(/v/g,"u");
const ED={V514:{nombre:"V514 · latín–castellano",lengua:"es",datos:"data/structured/recensio-es.json",pdf:"documents/kurilo-recensio-es.pdf"},
          V554:{nombre:"V554 · latin–français",lengua:"fr",datos:"data/structured/recensio-fr.json",pdf:"documents/kurilo-recensio-fr.pdf"},
          V297:{nombre:"V297 · Latin–English",lengua:"en",datos:"data/structured/theory-en.json",pdf:"documents/kurilo-theory-en.pdf"}};
const LOCUS=/\b(\d{1,2})\.(praef\.)?(\d{1,2})(?:\.(\d{1,3}))?(?:\s*[–-]\s*(?:\d{1,2}\.)?(?:praef\.)?\d{1,3}(?:\.\d{1,3})?)?/g;
let tablas=[],textos={},glosario=null;
const cargarTexto=id=>textos[id]||(textos[id]=fetch(ED[id].datos).then(r=>r.json()).then(d=>{const m=new Map();for(const p of d.passages)m.set(p.locus,p);return {lista:d.passages,porLocus:m}}));
const cargarGlosario=()=>glosario||(glosario=fetch("data/index/verba-capitalia.json").then(r=>r.json()).then(d=>d.voces||[]).catch(()=>[]));

/* ---------- visor de pasaje ---------- */
const dlg=el("dialog",{class:"tl-dialog","aria-label":"Pasaje de Vitruvio"});
document.body.append(dlg);
dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close()});
function normalizarLocus(t){
 const m=String(t).match(/(\d{1,2})\.(praef\.)?(\d{1,2})(?:\.(\d{1,3}))?/);if(!m)return null;
 return m[2]?m[1]+".praef."+m[3]:m[1]+"."+m[3]+(m[4]?"."+m[4]:".1");
}
async function abrirPasaje(locus,lista){
 const loci=lista&&lista.length?lista:[locus];let i=Math.max(0,loci.indexOf(locus));
 let lengua=(()=>{try{return localStorage.getItem("tl-traduccion")||"V514"}catch{return "V514"}})();
 dlg.replaceChildren();
 const titulo=el("h3",{class:"tl-dlg-title"});
 const sel=el("select",{"aria-label":"Traducción"},...Object.entries(ED).map(([k,v])=>el("option",{value:k,text:v.nombre})));sel.value=lengua;
 const prev=el("button",{type:"button",text:"←",title:"Locus anterior de la tabla"}),next=el("button",{type:"button",text:"→",title:"Locus siguiente de la tabla"});
 const cerrar=el("button",{type:"button",class:"tl-close",text:"Cerrar ×",onclick:()=>dlg.close()});
 const lat=el("div",{class:"tl-lat",lang:"la"}),tra=el("div",{class:"tl-tra"}),pie=el("p",{class:"tl-dlg-foot"});
 dlg.append(el("div",{class:"tl-dlg-head"},titulo,el("label",{},"Traducción ",sel),prev,next,cerrar),el("div",{class:"tl-dlg-cols"},lat,tra),pie);
 async function pintar(){
  const loc=loci[i];titulo.textContent="Vitr. "+loc+(loci.length>1?"  ·  "+(i+1)+" / "+loci.length:"");
  prev.disabled=i===0;next.disabled=i===loci.length-1;
  lat.textContent="Cargando…";tra.textContent="";
  const [base,trad]=await Promise.all([cargarTexto("V514"),cargarTexto(sel.value)]);
  let p=base.porLocus.get(loc),q=trad.porLocus.get(loc);
  if(!p&&/\.1$/.test(loc)){const alt=loc.replace(/\.1$/,"");p=base.porLocus.get(alt);q=trad.porLocus.get(alt)}
  lat.replaceChildren(el("p",{class:"tl-k",text:"Latín · V514"}),el("p",{text:p?p.latin:"Este locus no figura con esta numeración en V514."}));
  tra.lang=ED[sel.value].lengua;
  tra.replaceChildren(el("p",{class:"tl-k",text:"Traducción · "+ED[sel.value].nombre}),el("p",{text:q?q.translation:(sel.value==="V297"?"V297 agrupa a veces el pasaje bajo otro locus; véase el capítulo en el lector.":"Sin traducción registrada para este locus.")}));
  pie.replaceChildren(el("a",{href:"lector-bilingue.html?"+new URLSearchParams({edition:{V514:"recensio-es",V554:"recensio-fr",V297:"theory-en"}[sel.value],locus:loc})},"Abrir en el lector bilingüe →"));
 }
 sel.addEventListener("change",()=>{try{localStorage.setItem("tl-traduccion",sel.value)}catch{};pintar()});
 prev.addEventListener("click",()=>{if(i>0){i--;pintar()}});next.addEventListener("click",()=>{if(i<loci.length-1){i++;pintar()}});
 dlg.showModal();pintar();
}

/* ---------- índice de un término en los libros ---------- */
async function abrirTermino(termino){
 const limpio=termino.replace(/\(.*?\)/g,"").split(/[;,/]/)[0].trim();
 const raiz=plegarLat(limpio).replace(/[^a-z ]/g,"").trim();
 dlg.replaceChildren();
 const cerrar=el("button",{type:"button",class:"tl-close",text:"Cerrar ×",onclick:()=>dlg.close()});
 const cuerpo=el("div",{class:"tl-indice"},el("p",{text:"Buscando en los tres libros…"}));
 dlg.append(el("div",{class:"tl-dlg-head"},el("h3",{class:"tl-dlg-title",text:"«"+limpio+"» en los libros de Diego A. Kurilo"}),cerrar),cuerpo);
 dlg.showModal();
 if(raiz.length<3&&!/[Ͱ-Ͽἀ-῿]/.test(limpio)){cuerpo.replaceChildren(el("p",{text:"Término demasiado breve para un índice útil."}));return}
 const [voces,es,fr,en]=await Promise.all([cargarGlosario(),cargarTexto("V514"),cargarTexto("V554"),cargarTexto("V297")]);
 cuerpo.replaceChildren();
 const r=raiz.length>6?raiz.replace(/(ae|am|as|um|us|is|es|em|a|e|i|o)$/,""):raiz;
 const voz=voces.find(v=>plegarLat(v.clave)===raiz||plegarLat(v.raiz)===r||(r.length>4&&plegarLat(v.clave).startsWith(r)));
 if(voz){
  const box=el("section",{class:"tl-glosa"},el("h4",{text:"Glosario del autor · "+voz.lemma}));
  for(const [lg,nom] of [["es","V514"],["fr","V554"],["en","V297"]]){const d=voz.definiciones?.[lg];if(d?.texto&&d.texto.length>20)box.append(el("p",{},el("strong",{text:nom+" · p. "+d.pagina+" "}),d.texto+" ",el("a",{href:d.pdf,target:"_blank",rel:"noopener",text:"PDF ↗"})))}
  if(voz.equivalentes)box.append(el("p",{class:"tl-k",text:"Equivalentes medidos en las traducciones: "+Object.entries(voz.equivalentes).map(([l,a])=>l.toUpperCase()+" "+a.map(x=>x.raiz+"…").join(", ")).join(" · ")}));
  cuerpo.append(box);
 }
 const re=/[Ͱ-Ͽἀ-῿]/.test(limpio)?new RegExp(limpio.normalize("NFC").replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"):new RegExp("(^|[^a-z])"+r.replace(/ /g,"[^a-z]+"));
 const hits=es.lista.filter(p=>re.test(plegarLat(p.latin)));
 /* En cada traducción se cuenta el término latino conservado o, si el glosario las
    mide, sus equivalentes en esa lengua (conmensurabilidad, commensurabilité…). */
 const enTrad=(lib,lg)=>{const eq=(voz?.equivalentes?.[lg]||[]).map(x=>plegarLat(x.raiz||x)).filter(Boolean);
  const rx=eq.length?new RegExp("(^|[^a-z])("+[r,...eq].join("|")+")"):re;return lib.lista.filter(p=>rx.test(plegarLat(p.translation))).length};
 cuerpo.append(el("p",{class:"tl-k",text:hits.length+" pasajes del latín (V514) contienen «"+limpio+"»"+(hits.length?" · en las traducciones (término o equivalente medido): ES "+enTrad(es,"es")+", FR "+enTrad(fr,"fr")+", EN "+enTrad(en,"en")+".":".")}));
 const lista=el("ol",{class:"tl-hits"});
 for(const p of hits.slice(0,60)){
  const t=p.latin,m=plegarLat(t).search(re),a=Math.max(0,m-70);
  lista.append(el("li",{},el("button",{type:"button",class:"tl-loc",text:"Vitr. "+p.locus,onclick:()=>abrirPasaje(p.locus,hits.map(h=>h.locus))})," ",(a?"…":"")+t.slice(a,m+1),el("mark",{text:t.slice(m+1,m+1+limpio.length+6).split(/[\s,.;:]/)[0]}),t.slice(m+1+(t.slice(m+1,m+1+limpio.length+6).split(/[\s,.;:]/)[0]).length,m+120)+"…"));
 }
 if(hits.length>60)lista.append(el("li",{text:"… y "+(hits.length-60)+" pasajes más; búsquelos en el Lexicon."}));
 cuerpo.append(lista,el("p",{class:"tl-dlg-foot"},el("a",{href:"vitruvia-lexicon.html?"+new URLSearchParams({q:limpio,mode:"palabra",lang:/[Ͱ-Ͽἀ-῿]/.test(limpio)?"grc":"la",orden:"vitruvio"})},"Abrir en Lexicon (Vitruvio primero, luego las obras clásicas) →")));
}

/* ---------- celdas ---------- */
const esLatinoOGriego=t=>/[Ͱ-Ͽἀ-῿]/.test(t)||/^[A-Za-z][a-z]+(\s[a-z]+)?(\s*\(|$)/.test(t.trim());
function celda(texto,col,colsLoci,todosLoci,q){
 const td=el("td");
 if(colsLoci.has(col)){
  let at=0;const loci=[];
  for(const m of texto.matchAll(LOCUS)){
   if(m.index>at)td.append(resaltar(texto.slice(at,m.index),q));
   const loc=normalizarLocus(m[0]);
   if(loc){loci.push(loc);td.append(el("button",{type:"button",class:"tl-loc",title:"Leer Vitr. "+loc+" en latín con su traducción",onclick:()=>abrirPasaje(loc,todosLoci)},...resaltarNodos(m[0],q)))}
   else td.append(m[0]);
   at=m.index+m[0].length;
  }
  if(at<texto.length)td.append(resaltar(texto.slice(at),q));
  return td;
 }
 if(col===0&&texto.trim()&&texto.length<70){
  td.append(el("button",{type:"button",class:"tl-term",title:"Ver dónde figura en los tres libros",onclick:()=>abrirTermino(texto)},...resaltarNodos(texto,q)));
  return td;
 }
 td.append(resaltar(texto,q));return td;
}
function resaltarNodos(t,q){
 if(!q)return [t];
 const f=fold(t),out=[];let at=0,i;
 while((i=f.indexOf(q,at))>=0){if(i>at)out.push(t.slice(at,i));out.push(el("mark",{class:"tl-hit",text:t.slice(i,i+q.length)}));at=i+q.length}
 out.push(t.slice(at));return out;
}
const resaltar=(t,q)=>{const f=document.createDocumentFragment();f.append(...resaltarNodos(t,q));return f};

/* ---------- render ---------- */
function render(){
 const ed=$("tl-ed").value,n=$("tl-tabla").value,q=fold($("tl-q").value.trim()),solo=$("tl-solo").checked;
 const root=$("tablas");root.replaceChildren();
 let nt=0,nf=0,nh=0;
 for(const t of tablas){
  if(ed&&t.edicion!==ed)continue;
  if(n&&(t.edicion+"-"+t.n)!==n)continue;
  const textoTabla=fold([t.titulo,...t.columnas,...t.filas.flat()].join(" "));
  if(q&&!textoTabla.includes(q))continue;
  nt++;
  const colsLoci=new Set(t.columnas.map((c,i)=>[c,i]).filter(([c,i])=>/loci|locus|passage|pasaje|passage|référence|referencia|De architectura/i.test(c)||t.filas.filter(f=>(f[i]||"").match(LOCUS)).length>=Math.max(2,t.filas.length*0.5)).map(([,i])=>i));
  const todosLoci=[...new Set(t.filas.flatMap(f=>[...colsLoci].flatMap(i=>[...(f[i]||"").matchAll(LOCUS)].map(m=>normalizarLocus(m[0])).filter(Boolean))))];
  const sec=el("section",{class:"tl-entry",id:"tabla-"+t.edicion+"-"+t.n});
  sec.append(el("p",{class:"tl-cat",text:ED[t.edicion].nombre+" · Tabla "+t.n+" · p. "+(t.paginaImpresa??"—")+" del libro"}),
   el("h2",{},...resaltarNodos(t.titulo,q)));
  const tabla=el("table"),thead=el("thead"),tr=el("tr");
  t.columnas.forEach(c=>tr.append(el("th",{},...resaltarNodos(c,q))));thead.append(tr);tabla.append(thead);
  const tb=el("tbody");
  for(const f of t.filas){
   const coincide=!q||fold(f.join(" ")).includes(q);
   if(solo&&q&&!coincide&&!fold(t.titulo).includes(q))continue;
   nf++;if(q&&coincide)nh++;
   const fila=el("tr",{class:q&&coincide?"tl-row-hit":""});
   f.forEach((c,i)=>fila.append(celda(c,i,colsLoci,todosLoci,q)));
   tb.append(fila);
  }
  tabla.append(tb);sec.append(el("div",{class:"tl-scroll"},tabla));
  const pie=el("div",{class:"tl-foot"});
  if(todosLoci.length)pie.append(el("button",{type:"button",class:"tl-big",onclick:()=>abrirPasaje(todosLoci[0],todosLoci)},"Leer los "+todosLoci.length+" loci de esta tabla en latín y traducción →"));
  pie.append(el("span",{class:"tl-src"},"Fuente: ",el("i",{text:t.edicion==="V297"?"The Architect of Theory":"De architectura"}),", "+t.edicion+", tabla "+t.n+", p. "+(t.paginaImpresa??"—")+" · ",el("a",{href:t.pdf,target:"_blank",rel:"noopener",text:"ver la página en el PDF ↗"})));
  sec.append(pie);
  root.append(sec);
 }
 $("tl-count").textContent=nt+" tablas · "+nf+" filas"+(q?" · "+nh+" filas con «"+$("tl-q").value.trim()+"»":"");
 if(!nt)root.append(el("p",{class:"tl-empty",text:"Ninguna tabla contiene «"+$("tl-q").value.trim()+"» en la edición elegida."}));
}
function opcionesTabla(){
 const ed=$("tl-ed").value,s=$("tl-tabla"),v=s.value;
 s.replaceChildren(el("option",{value:"",text:"Todas las tablas"}),...tablas.filter(t=>!ed||t.edicion===ed).map(t=>el("option",{value:t.edicion+"-"+t.n,text:t.edicion+" · "+t.n+". "+t.titulo})));
 if([...s.options].some(o=>o.value===v))s.value=v;
}
fetch("data/tablas-libros.json").then(r=>r.json()).then(d=>{
 tablas=d.tablas;
 const por=Object.fromEntries(Object.keys(ED).map(k=>[k,tablas.filter(t=>t.edicion===k).length]));
 $("tl-meta").textContent=tablas.length+" tablas · V514: "+por.V514+" · V554: "+por.V554+" · V297: "+por.V297+" · "+tablas.reduce((n,t)=>n+t.filas.length,0)+" filas, extraídas de los PDF publicados";
 const p=new URLSearchParams(location.search);
 if(p.get("ed"))$("tl-ed").value=p.get("ed");
 opcionesTabla();
 if(p.get("q"))$("tl-q").value=p.get("q");
 if(location.hash.startsWith("#tabla-")){const k=location.hash.slice(7);if([...$("tl-tabla").options].some(o=>o.value===k))$("tl-tabla").value=k}
 render();
 $("tl-ed").addEventListener("change",()=>{opcionesTabla();render()});
 for(const id of ["tl-tabla","tl-solo"])$(id).addEventListener("change",render);
 let t=0;$("tl-q").addEventListener("input",()=>{clearTimeout(t);t=setTimeout(render,150)});
}).catch(e=>{$("tablas").textContent="No se pudo cargar el registro de tablas: "+e.message});
$("tl-print").addEventListener("click",()=>window.print());
$("tl-copy").addEventListener("click",()=>{const u=new URL(location.href);u.search="";const q=$("tl-q").value.trim();if(q)u.searchParams.set("q",q);if($("tl-ed").value)u.searchParams.set("ed",$("tl-ed").value);navigator.clipboard?.writeText(u.href);$("tl-copy").textContent="Enlace copiado"});
})();
