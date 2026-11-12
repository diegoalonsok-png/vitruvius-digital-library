/* Registro ecdótico: buscador de todo el aparato del autor por locus.
   Datos: data/index/registro-ecdotico.json (scripts/build-registro-ecdotico.py).
   Primero se busca; después se muestra lo encontrado, agrupado por locus, con
   el tipo de cada registro explicado y la coincidencia subrayada. Nada se
   reescribe: cada registro conserva su procedencia y su grado. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const el=(t,p={},...h)=>{const n=document.createElement(t);for(const [k,v] of Object.entries(p)){if(v==null)continue;
 if(k==="class")n.className=v;else if(k==="text")n.textContent=v;else n.setAttribute(k,v)}n.append(...h.filter(x=>x!=null&&x!==""));return n};
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const plegar=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u");
const TIPOS={
 "decision":{rot:"Decisión ecdótica",que:"Lectura adoptada en la edición frente a la de los testimonios, según la collatio codicum impresa (Apéndice T)."},
 "lectura-h":{rot:"Lectura del Codex H",que:"Tomada sobre el facsímil de Harley MS 2767; difiere de V514. Observación para revisión, no variante establecida."},
 "glosa":{rot:"Glosa explicativa",que:"Comentario lematizado del autor (lema ] explicación), anclado al locus por el lema."},
 "nota":{rot:"Nota del aparato",que:"Nota al pie de la edición; su locus puede ser explícito o sólo candidato."}};
const PL={"decision":["decisión ecdótica","decisiones ecdóticas"],"lectura-h":["lectura del Codex H","lecturas del Codex H"],"glosa":["glosa explicativa","glosas explicativas"],"nota":["nota del aparato","notas del aparato"]};
const EDIC={V514:"V514 · castellano",V554:"V554 · francés",V297:"V297 · inglés",H:"Codex H"};
const POR_PAGINA=25;
let todos=[],vistos=0,grupos=[];

const vitr=l=>{const m=/^(\d+)\.(.*)$/.exec(l||"");return m?"Vitr. "+(R[+m[1]]||m[1])+"."+m[2]:(l||"")};
const esLocus=q=>/^(?:vitr\.?\s*)?([ivx]+|\d{1,2})[.\s]+(praef|\d{1,2})(?:[.\s]+(\d{1,2}))?$/i.exec(q.trim());
function locusDe(q){
 const m=esLocus(q);if(!m)return null;
 const rom={i:1,ii:2,iii:3,iv:4,v:5,vi:6,vii:7,viii:8,ix:9,x:10};
 const b=/^\d+$/.test(m[1])?+m[1]:rom[m[1].toLowerCase()];
 return b?[b,m[2].toLowerCase(),m[3]].filter(Boolean).join("."):null;
}
/* Subrayado tolerante a acentos, i/j y u/v, sobre el texto tal como se muestra. */
const CL={a:"[aàáâä]",e:"[eèéêë]",i:"[iíìîïj]",o:"[oóòôö]",u:"[uúùûüv]",c:"[cç]",n:"[nñ]"};
let reMarca=null;
function prepararMarca(terminos){
 const alt=terminos.filter(t=>t.length>=2).map(t=>[...t].map(c=>CL[c]||c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join(""));
 reMarca=alt.length?new RegExp("("+alt.join("|")+")","gi"):null;
}
function marcar(txt){
 const s=String(txt||"");if(!reMarca)return document.createTextNode(s);
 const f=document.createDocumentFragment();let i=0,m;reMarca.lastIndex=0;
 while((m=reMarca.exec(s))){if(m.index>i)f.append(s.slice(i,m.index));f.append(el("mark",{class:"re-hit",text:m[0]}));i=m.index+m[0].length;if(!m[0].length)reMarca.lastIndex++}
 if(i<s.length)f.append(s.slice(i));return f;
}

function filtros(){return {q:$("re-q").value.trim(),tipo:$("re-tipo").value,libro:$("re-libro").value,
 locus:$("re-locus").value,ed:$("re-edicion").value,sigla:$("re-sigla").value}}
function buscar(){
 const f=filtros();
 const loc=f.q?locusDe(f.q):null;
 const terminos=loc?[]:plegar(f.q).split(/\s+/).filter(Boolean);
 prepararMarca(terminos);
 const activo=f.q||f.tipo||f.libro||f.locus||f.ed||f.sigla;
 $("re-tipos").hidden=!!activo;
 if(!activo){$("re-aviso").hidden=true;$("re-resultados").replaceChildren();$("re-mas").hidden=true;$("re-export").hidden=true;guardarURL(f);return}
 const res=todos.filter(r=>(!f.tipo||r.tipo===f.tipo)&&(!f.libro||String(r.libro)===f.libro)&&
  (!f.locus||r.locus===f.locus)&&(!f.ed||r.version===f.ed)&&(!f.sigla||(r.sigla||[]).includes(f.sigla))&&
  (!loc||r.locus===loc||(r.locus||"").startsWith(loc+"."))&&terminos.every(t=>r._h.includes(t)));
 // agrupar por locus en el orden del tratado; sin locus canónico, al final
 const mapa=new Map();
 for(const r of res){const k=r.locusEstado==="no canónico"||!r.locus?"~":r.locus;if(!mapa.has(k))mapa.set(k,[]);mapa.get(k).push(r)}
 grupos=[...mapa.entries()];
 aviso(f,res,loc);
 vistos=0;$("re-resultados").replaceChildren();pintarMas();
 exportar(f,res);guardarURL(f);
}
function aviso(f,res,loc){
 const a=$("re-aviso");a.hidden=false;a.replaceChildren();
 a.style.animation="none";void a.offsetWidth;a.style.animation="";
 const cuenta={};for(const r of res)cuenta[r.tipo]=(cuenta[r.tipo]||0)+1;
 const qué=f.q?"«"+f.q+"»":"La selección";
 a.classList.toggle("re-cero",!res.length);
 if(!res.length){
  a.append(el("strong",{text:qué+" no aparece en el aparato"}),
   el("span",{class:"re-desglose",text:"Pruebe la raíz sin terminación (fabric, symmetr), la forma sin acentos, otra sigla, o quite filtros."}));return;
 }
 const loci=grupos.filter(([k])=>k!=="~").length;
 a.append(el("strong",{text:`${qué}: ${res.length} ${res.length===1?"registro":"registros"} en ${loci} ${loci===1?"locus":"loci"}`}),
  el("span",{class:"re-desglose",text:Object.keys(TIPOS).filter(t=>cuenta[t]).map(t=>cuenta[t]+" "+PL[t][cuenta[t]===1?0:1]).join(" · ")}));
 if(loc)a.append(el("span",{class:"re-desglose",text:"Búsqueda por locus: "+vitr(loc)}));
}
function pintarMas(){
 const out=$("re-resultados");
 const lote=grupos.slice(vistos,vistos+POR_PAGINA);
 for(const [k,regs] of lote)out.append(tarjeta(k,regs));
 vistos+=lote.length;
 const quedan=grupos.length-vistos;
 $("re-mas").hidden=quedan<=0;
 if(quedan>0)$("re-mas").textContent=`Mostrar ${Math.min(POR_PAGINA,quedan)} loci más · quedan ${quedan}`;
}
function tarjeta(k,regs){
 const sec=el("article",{class:"re-locus"});
 const cab=el("header",{},el("h2",{text:k==="~"?"Sin locus canónico":vitr(k)}),
  el("span",{class:"re-n",text:regs.length+(regs.length===1?" registro":" registros")}));
 if(k!=="~"){
  const nav=el("nav",{"aria-label":"Abrir "+vitr(k)});
  for(const [rot,href] of [["Concordancia y folio","concordancia-folios.html?locus="],["Colación","colacion.html?locus="],["Lector bilingüe","lector-bilingue.html?locus="]])
   nav.append(el("a",{href:href+encodeURIComponent(k),text:rot}));
  cab.append(nav);
 }
 sec.append(cab);
 for(const r of regs)sec.append(registro(r,k==="~"));
 return sec;
}
function lineaAparato(r){
 if(r.tipo==="decision"&&r.lema&&r.testimonios&&Object.keys(r.testimonios).length){
  const p=el("p",{class:"re-ap"},el("span",{class:"re-lema"},marcar(r.lema)),el("span",{class:"re-cor",text:" ] "}));
  Object.entries(r.testimonios).forEach(([sig,lec],i)=>{if(i)p.append("; ");p.append(marcar(lec)," ",el("span",{class:"re-sig",text:sig==="testimonio"||sig==="vulgata"?"":sig}))});
  return p;
 }
 if(r.tipo==="glosa"&&r.lema)return el("p",{class:"re-ap"},el("span",{class:"re-lema"},marcar(r.lema)),el("span",{class:"re-cor",text:" ] "}));
 if(r.tipo==="lectura-h"&&r.aparato)return el("p",{class:"re-ap"},marcar(r.aparato));
 if(r.tipo==="decision"&&r.lema)return el("p",{class:"re-ap"},el("span",{class:"re-lema"},marcar(r.lema)));
 return null;
}
function registro(r,sinLocus){
 const t=TIPOS[r.tipo]||{rot:r.tipo,que:""};
 const d=el("div",{class:"re-reg"});
 d.append(el("span",{class:"re-chip t-"+r.tipo,text:t.rot}),el("span",{class:"re-que",text:t.que}));
 const ap=lineaAparato(r);if(ap)d.append(ap);
 if(r.texto&&(r.tipo!=="lectura-h"||!r.aparato||r.texto.length<400))d.append(el("p",{class:"re-tx"},marcar(r.texto)));
 if(r.contexto){const det=el("details",{class:"re-ctx"},el("summary",{text:"Contexto de la nota en el documento"}),el("p",{},marcar(r.contexto)));
  if(reMarca&&(reMarca.lastIndex=0,reMarca.test(r.contexto))&&!(reMarca.lastIndex=0,reMarca.test(r.texto||"")))det.open=true;d.append(det)}
 const meta=el("div",{class:"re-meta"});
 meta.append(el("span",{text:EDIC[r.version]||r.version||""}));
 if(sinLocus&&r.locus)meta.append(el("span",{text:"locus impreso «"+r.locus+"» (no figura entre los 731 canónicos)"}));
 else if(r.locusEstado)meta.append(el("span",{text:r.locusEstado}));
 if(r.gradoRotulo&&r.gradoRotulo!==r.locusEstado)meta.append(el("span",{text:r.gradoRotulo}));
 for(const fo of r.folios||[])meta.append(el("a",{href:"concordancia-folios.html?folio="+encodeURIComponent(fo),text:"H f. "+fo+(r.renglon?", renglón "+r.renglon:"")+" ↗"}));
 if(r.nota)meta.append(el("span",{text:"nota "+r.nota+(r.parrafo?" · párrafo DOCX "+r.parrafo:"")}));
 if(r.pagina&&r.pdf)meta.append(el("a",{href:r.pdf,target:"_blank",rel:"noopener",text:(r.version||"")+" p. "+r.pagina+" ↗"}));
 if(r.lociPosibles?.length)meta.append(el("span",{text:"también en "+r.lociPosibles.slice(0,4).join(", ")}));
 d.append(meta);return d;
}
function exportar(f,res){
 const box=$("re-export");box.hidden=!res.length;if(!res.length)return;
 const limpio=res.map(({_h,orden,...r})=>r);
 const a=$("re-json");URL.revokeObjectURL(a.href);
 a.href=URL.createObjectURL(new Blob([JSON.stringify({consulta:f,fecha:new Date().toISOString(),registros:limpio},null,1)],{type:"application/json"}));
 $("re-cita").textContent=`Cítese: Registro ecdótico de De architectura, Vitruvius Digital Library (D. A. Kurilo), consulta ${f.q?"«"+f.q+"»":"por filtros"}, ${new Date().toLocaleDateString("es-AR")}, ${location.href}`;
}
function guardarURL(f){
 const u=new URLSearchParams();for(const [k,v] of Object.entries(f))if(v)u.set(k,v);
 history.replaceState(null,"",location.pathname+(u.toString()?"?"+u:""));
}

function poblar(doc){
 todos=doc.registros;
 for(const r of todos)r._h=plegar([r.lema,r.aparato,r.texto,r.contexto,r.locus,r.id,...(r.sigla||[]),...Object.values(r.testimonios||{}),...(r.folios||[]).map(f=>"f."+f+" "+f)].join(" "));
 const c=doc.recuentos.porTipo;
 const tipos=$("re-tipos");
 for(const [t,info] of Object.entries(TIPOS)){
  if(!c[t])continue;
  const b=el("button",{type:"button",class:"re-tipo-card"},el("strong",{text:c[t].toLocaleString("es-AR")}),el("span",{text:info.rot}),el("small",{text:info.que}));
  b.addEventListener("click",()=>{$("re-tipo").value=t;buscar();$("re-aviso").scrollIntoView({behavior:"smooth",block:"start"})});
  tipos.append(b);
  $("re-tipo").append(el("option",{value:t,text:info.rot+" ("+c[t]+")"}));
 }
 const porLibro={},porLocus=new Map(),siglas={};
 for(const r of todos){
  if(r.libro)porLibro[r.libro]=(porLibro[r.libro]||0)+1;
  if(r.locus&&r.locusEstado!=="no canónico")porLocus.set(r.locus,(porLocus.get(r.locus)||0)+1);
  for(const s of r.sigla||[])siglas[s]=(siglas[s]||0)+1;
 }
 for(let b=1;b<=10;b++)if(porLibro[b])$("re-libro").append(el("option",{value:String(b),text:"Libro "+R[b]+" ("+porLibro[b]+")"}));
 const gL=new Map();for(const [l,n] of porLocus){const b=+l.split(".")[0];if(!gL.has(b))gL.set(b,[]);gL.get(b).push([l,n])}
 for(const [b,ls] of [...gL].sort((x,y)=>x[0]-y[0])){const g=el("optgroup",{label:"Libro "+R[b]});
  for(const [l,n] of ls)g.append(el("option",{value:l,text:l+" ("+n+")"}));$("re-locus").append(g)}
 for(const [s,n] of Object.entries(siglas).sort((a,b)=>b[1]-a[1]).slice(0,24))$("re-sigla").append(el("option",{value:s,text:s+" ("+n+")"}));
 const sug=$("re-sugerencias");
 for(const s of ["symmetria","fabrica","decor","Pythia","om.","Krohn","ut vid.","1.2.1"])
  sug.append(el("button",{type:"button",text:s}));
 sug.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;$("re-q").value=b.textContent;buscar();$("re-aviso").scrollIntoView({behavior:"smooth",block:"start"})});
 // estado inicial desde la URL
 const u=new URLSearchParams(location.search);
 for(const [k,id] of [["q","re-q"],["tipo","re-tipo"],["libro","re-libro"],["locus","re-locus"],["ed","re-edicion"],["sigla","re-sigla"]])
  if(u.get(k))$(id).value=u.get(k);
 buscar();
}

function init(){
 $("re-form").addEventListener("submit",e=>{e.preventDefault();buscar();$("re-aviso").scrollIntoView({behavior:"smooth",block:"start"})});
 let t=null;$("re-q").addEventListener("input",()=>{clearTimeout(t);t=setTimeout(buscar,250)});
 for(const id of ["re-tipo","re-libro","re-locus","re-edicion","re-sigla"])$(id).addEventListener("change",buscar);
 $("re-mas").addEventListener("click",pintarMas);
 $("re-aviso").hidden=false;$("re-aviso").textContent="Cargando el aparato…";
 fetch("data/index/registro-ecdotico.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()})
  .then(d=>{$("re-aviso").hidden=true;poblar(d)})
  .catch(e=>{$("re-aviso").textContent="No se pudo cargar el registro ("+e.message+"). No se muestran cifras inventadas."});
 fetch("data/ecdotic-decisions.json").then(r=>r.ok?r.json():null).then(d=>{if(!d)return;
  const n=(d.decisions||[]).length;
  $("re-estricto").textContent=`Registro estricto de decisiones verificadas por autopsia del editor (data/ecdotic-decisions.json): ${n} ${n===1?"decisión":"decisiones"}. Lo que aquí se muestra es el aparato impreso y las observaciones sobre H con su grado; no sustituye ese registro.`}).catch(()=>{});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
