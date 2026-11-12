/* Registro de variantes de la collatio del Apéndice T de las ediciones Kurilo.
   Fuente: data/apparatus/collatio-validada.json (scripts/parse-collatio-codicum.py
   + scripts/validate-collatio.py). Sólo se publican como aparato las entradas
   CONFIRMADAS: impresas en las dos ediciones del autor con la misma lectura latina,
   sin arrastre de columna y coherentes con el orden de folios y con el mapa del
   facsímil. La cola de revisión se muestra aparte y rotulada como tal. */
(()=>{
"use strict";
const URL_DATA="data/apparatus/collatio-validada.json?v=20261111";
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const EDITION={"recensio-es":"V514 · castellano","recensio-fr":"V554 · français","theory-en":"V297 · English"};
const CAMPO={estaEdicion:"Esta edición",testigoH:"H (ut vid.)",krohn:"Krohn",vulgata:"Vulgata",
 lecturaVisible:"Lectura visible en H",lectura:"Lectura / problema",testigo:"Testimonio",
 edicionCotejada:"Edición cotejada",valoracion:"Valoración editorial",grado:"Grado",estado:"Estado / acción",folio:"Folio"};
const $=id=>document.getElementById(id);
const el=(t,c,txt)=>{const n=document.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=String(txt);return n};
const cita=l=>{const [b,...r]=String(l).split(".");return "Vitr. "+(R[+b]||b)+"."+r.join(".")};
const folioKey=f=>{const m=/^(\d+)([rv])$/.exec(f||"");return m?[+m[1],m[2]==="r"?0:1]:[1e6,0]};
const locusKey=l=>{const [b,c,s]=String(l).split(".");return [+b||0,c==="praef"?0:+c||0,+s||0]};
const GRADO={
 "doble-fuente":"Doble fuente del autor",
 "fuente-unica":"Fuente única",
 "transcripcion-por-comprobar":"Transcripción por comprobar",
 "orden-dudoso":"Orden de folio dudoso",
 "conflicto-con-el-facsimil":"En conflicto con el facsímil",
 "aparato-en-prosa":"Aparato en prosa del Apéndice T"};
let datos=null,filas=[];

function enlaces(e){
 const box=el("p","source-links");
 const lector=el("a",null,"Leer el pasaje");
 lector.href="lector-bilingue.html?edition="+encodeURIComponent(e.edition)+"&locus="+encodeURIComponent(e.locus);
 box.append(lector);
 for(const f of e.folios||[]){
  box.append(document.createTextNode(" · "));
  const a=el("a",null,"Folio "+f+" del códice H");
  a.href="codex-h-folios-local.html?folio="+encodeURIComponent(f);
  box.append(a);
 }
 box.append(document.createTextNode(" · "));
 const pdf=el("a",null,"Página "+e.page+" del aparato impreso");
 pdf.href=e.pdf;pdf.rel="noopener";
 box.append(pdf);
 return box;
}

function fila(e){
 const tr=el("tr");
 const th=el("th");th.scope="row";
 const loc=el("a",null,cita(e.locus));
 loc.href="aparato-critico.html?locus="+encodeURIComponent(e.locus);
 th.append(loc);
 if(e.codigosDeEvidencia?.length)th.append(el("span","review-date"," "+e.codigosDeEvidencia.join(" ")));
 tr.append(th);
 const lemma=el("td");
 lemma.append(el("span",null,e.campos.estaEdicion||e.campos.lectura||"—"));
 lemma.lang="la";
 tr.append(lemma);
 const lectura=el("td");
 lectura.lang="la";
 lectura.textContent=e.campos.testigoH||e.campos.lecturaVisible||e.campos.krohn||e.campos.vulgata||"—";
 tr.append(lectura);
 tr.append(el("td",null,(e.folios||[]).join(", ")||"—"));
 const val=el("td");
 val.append(el("span",null,e.campos.valoracion||e.campos.estado||e.campos.grado||"—"));
 val.append(el("br"));
 const sello=el("span","verification-label",GRADO[e.grado]||e.grado);
 sello.title=datos?.grados?.[e.grado]||"";
 val.append(sello);
 const proc=e.grado==="doble-fuente"
  ? " · "+(EDITION[e.edition]||e.version)+" y "+e.bilingue
  : " · "+(EDITION[e.edition]||e.version);
 val.append(el("span","review-date",proc));
 if((e.motivosDeRevision||[]).length){
  const d=el("details");
  d.append(el("summary",null,"Por qué no alcanza el grado superior"));
  const ul=el("ul");
  for(const m of e.motivosDeRevision)ul.append(el("li",null,m));
  d.append(ul);
  val.append(d);
 }
 val.append(enlaces(e));
 tr.append(val);
 return tr;
}

function pinta(){
 const q=($("coll-q").value||"").trim().toLowerCase();
 const loc=($("coll-locus").value||"").trim();
 const sig=$("coll-siglum").value;
 const gr=$("coll-grade")?.value||"";
 filas=(datos.entradas||datos.confirmadas).filter(e=>{
  if(gr&&e.grado!==gr)return false;
  if(loc&&!(e.locus===loc||e.locus.startsWith(loc+".")))return false;
  if(sig&&!(e.siglaCitadas||[]).includes(sig))return false;
  if(q){
   const hay=[e.locus,...Object.values(e.campos),...(e.siglaCitadas||[])].join(" ").toLowerCase();
   if(!hay.includes(q))return false;
  }
  return true;
 }).sort((a,b)=>{
  // Un grado desconocido va al final, nunca al principio por devolver -1.
  const og=Object.keys(GRADO);
  const pos=g=>{const i=og.indexOf(g);return i<0?og.length:i};
  const dg=pos(a.grado)-pos(b.grado);
  if(dg)return dg;
  const [x,y]=[locusKey(a.locus),locusKey(b.locus)];
  return x[0]-y[0]||x[1]-y[1]||x[2]-y[2];
 });
 const tb=$("coll-rows");tb.replaceChildren();
 for(const e of filas.slice(0,220))tb.append(fila(e));
 $("coll-count").textContent=filas.length+" entradas"+
  (filas.length>220?" (se muestran las primeras 220)":"")+
  (loc||sig||q||gr?" con el filtro aplicado":"")+".";
}

function metricas(){
 const r=datos.recuentos,box=$("coll-metrics");box.replaceChildren();
 const p=el("p","verification-label");
 p.append(el("strong",null,(r.publicadas??r.confirmadas)+" entradas publicadas"));
 p.append(document.createTextNode(
  ` del Apéndice T · ${r.foliosConfirmados} folios del códice H con locus · ${r.lociConfirmados} loci.`));
 box.append(p);
 const dl=el("dl");
 for(const [g,n] of Object.entries(r.porGrado||{})){
  const dt=el("dt");
  dt.append(el("strong",null,(GRADO[g]||g)+": "+n));
  dl.append(dt);
  dl.append(el("dd",null,datos.grados?.[g]||""));
 }
 if(dl.childNodes.length)box.append(dl);
}

function revision(){
 const box=$("coll-review");if(!box)return;box.replaceChildren();
 const motivos={};
 for(const e of datos.revision)for(const m of e.motivosDeRevision||[])motivos[m]=(motivos[m]||0)+1;
 const ul=el("ul");
 for(const [m,n] of Object.entries(motivos).sort((a,b)=>b[1]-a[1]))
  ul.append(el("li",null,n+" · "+m));
 if(!Object.keys(motivos).length)ul.append(el("li",null,"Sin entradas apartadas."));
 box.append(ul);
 const nota=el("p",null,
  "Estas entradas existen en el aparato impreso del autor, pero su lectura mecánica desde el PDF no "+
  "alcanza el grado exigido por las condiciones de admisión. Se conservan para revisión y no se "+
  "presentan como lecturas de ningún testimonio.");
 box.append(nota);
}

async function init(){
 try{
  const r=await fetch(URL_DATA);
  if(!r.ok)throw Error("HTTP "+r.status);
  datos=await r.json();
  if(!Array.isArray(datos.entradas)&&!Array.isArray(datos.confirmadas))throw Error("esquema inesperado");
  const fuente=datos.entradas||datos.confirmadas;
  const sig=new Set();
  for(const e of fuente)for(const s of e.siglaCitadas||[])sig.add(s);
  const sel=$("coll-siglum");
  for(const s of [...sig].sort())sel.append(new Option(s,s));
  const gsel=$("coll-grade");
  if(gsel)for(const [g,n] of Object.entries(datos.recuentos?.porGrado||{}))
   gsel.append(new Option((GRADO[g]||g)+" ("+n+")",g));
  metricas();revision();pinta();
  const params=new URLSearchParams(location.search);
  const l=params.get("locus");
  if(l){$("coll-locus").value=l;pinta()}
 }catch(e){
  $("coll-count").textContent="No se pudo cargar el registro de colación ("+e.message+"). No se muestran cifras sin su fuente.";
 }
}
for(const id of ["coll-q","coll-locus","coll-siglum","coll-grade"])
 document.addEventListener("DOMContentLoaded",()=>$(id)?.addEventListener("input",()=>{if(datos)pinta()}),{once:true});
document.addEventListener("DOMContentLoaded",init,{once:true});
})();
