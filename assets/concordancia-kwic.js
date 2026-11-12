/* Concordancia KWIC del latín de De architectura (V514 o V297).
   Consultas:
     palabra           forma exacta (sin acentos; i/j y u/v equivalen)
     raiz*             todas las formas que empiezan así
     "a b c"           frase exacta, en ese orden
     a ~N b            proximidad: a y b a N palabras o menos, en cualquier orden
   Resultado: cada aparición con su contexto alineado, ordenable por el
   contexto izquierdo o derecho; distribución por libro (por 1.000 palabras);
   exportación CSV. Datos: data/index/latin-texto.json. */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"];
const plegar=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u");
const vitr=l=>{const m=/^(\d+)\.(.*)$/.exec(l||"");return m?(R[+m[1]]||m[1])+"."+m[2]:l};
const ANCHO=7,PASO=200;
let datos=null,corpus={},hits=[],vistos=0,orden="locus";

function preparar(ed){
 if(corpus[ed])return corpus[ed];
 const pas=datos.ediciones[ed].map(([locus,latin])=>{
  const toks=[];const re=/[A-Za-zÀ-ÿ]+|[Ͱ-Ͽἀ-῿]+/g;let m;
  while((m=re.exec(latin)))toks.push({f:m[0],p:plegar(m[0])});
  return {locus,libro:+locus.split(".")[0],toks};
 });
 const palabrasPorLibro={};for(const x of pas)palabrasPorLibro[x.libro]=(palabrasPorLibro[x.libro]||0)+x.toks.length;
 return corpus[ed]={pas,palabrasPorLibro};
}
function parsear(q){
 q=q.trim();if(!q)return null;
 let m=/^"(.+)"$/.exec(q);if(m)return {tipo:"frase",partes:plegar(m[1]).split(/\s+/).filter(Boolean)};
 m=/^(\S+)\s*~\s*(\d{1,2})\s*(\S+)$/.exec(q);if(m)return {tipo:"prox",a:term(m[1]),b:term(m[3]),n:+m[2]};
 const ws=q.split(/\s+/);
 if(ws.length>1)return {tipo:"frase",partes:ws.map(plegar)};
 return {tipo:"palabra",t:term(q)};
}
function term(w){const p=plegar(w);return p.endsWith("*")?{pref:p.slice(0,-1)}:{exacta:p}}
const casa=(t,tok)=>t.pref!==undefined?tok.p.startsWith(t.pref)&&t.pref.length>0:tok.p===t.exacta;

function buscar(){
 const q=parsear($("kw-q").value),ed=$("kw-ed").value,libro=$("kw-libro").value;
 const out=$("kw-res"),av=$("kw-aviso");
 hits=[];vistos=0;out.replaceChildren();$("kw-dist").replaceChildren();$("kw-mas").hidden=true;$("kw-csv").hidden=true;
 if(!q){av.textContent="Escriba una forma, una raíz con *, una frase entre comillas o dos palabras con ~N.";return}
 const {pas,palabrasPorLibro}=preparar(ed);
 for(const x of pas){
  if(libro&&String(x.libro)!==libro)continue;
  const T=x.toks;
  if(q.tipo==="palabra"){T.forEach((tok,i)=>{if(casa(q.t,tok))hits.push(hit(x,i,i))})}
  else if(q.tipo==="frase"){const n=q.partes.length;
   for(let i=0;i+n<=T.length;i++){let ok=true;for(let k=0;k<n;k++){const w=q.partes[k];if(w.endsWith("*")?!T[i+k].p.startsWith(w.slice(0,-1)):T[i+k].p!==w){ok=false;break}}if(ok)hits.push(hit(x,i,i+n-1))}}
  else{T.forEach((tok,i)=>{if(!casa(q.a,tok))return;
   for(let j=Math.max(0,i-q.n);j<=Math.min(T.length-1,i+q.n);j++)if(j!==i&&casa(q.b,T[j])){hits.push(hit(x,Math.min(i,j),Math.max(i,j)));break}})}
 }
 ordenar();
 const porLibro={};for(const h of hits)porLibro[h.libro]=(porLibro[h.libro]||0)+1;
 const loci=new Set(hits.map(h=>h.locus)).size;
 av.textContent=hits.length?`${hits.length} ${hits.length===1?"aparición":"apariciones"} en ${loci} ${loci===1?"locus":"loci"} · ${Object.keys(porLibro).length} ${Object.keys(porLibro).length===1?"libro":"libros"} · ${ed}`
  :"Ninguna aparición. Pruebe la raíz con * (fabric*), sin acentos, o una distancia mayor (~10).";
 distribucion(porLibro,palabrasPorLibro);
 pintar();
}
function hit(x,i,j){const T=x.toks;
 return {locus:x.locus,libro:x.libro,izq:T.slice(Math.max(0,i-ANCHO),i).map(t=>t.f).join(" "),
  clave:T.slice(i,j+1).map(t=>t.f).join(" "),der:T.slice(j+1,j+1+ANCHO).map(t=>t.f).join(" "),
  izqOrd:T.slice(0,i).reverse().map(t=>t.p).join(" "),derOrd:T.slice(j+1).map(t=>t.p).join(" ")}}
function ordenar(){
 const c=new Intl.Collator("la");
 if(orden==="izq")hits.sort((a,b)=>c.compare(a.izqOrd,b.izqOrd));
 else if(orden==="der")hits.sort((a,b)=>c.compare(a.derOrd,b.derOrd));
 else if(orden==="clave")hits.sort((a,b)=>c.compare(plegar(a.clave),plegar(b.clave)));
}
function pintar(){
 const out=$("kw-res"),lote=hits.slice(vistos,vistos+PASO);
 for(const h of lote){
  const tr=document.createElement("tr");
  const a=document.createElement("a");a.href="concordancia-folios.html?locus="+encodeURIComponent(h.locus);a.textContent=vitr(h.locus);a.title="Abrir el pasaje con el folio de H y la traducción";
  const td0=document.createElement("td");td0.className="kw-loc";td0.append(a);
  const td1=document.createElement("td");td1.className="kw-izq";td1.textContent=h.izq;
  const td2=document.createElement("td");td2.className="kw-clave";const mk=document.createElement("mark");mk.textContent=h.clave;td2.append(mk);
  const td3=document.createElement("td");td3.className="kw-der";td3.textContent=h.der;
  td1.lang=td2.lang=td3.lang="la";
  tr.append(td0,td1,td2,td3);out.append(tr);
 }
 vistos+=lote.length;
 $("kw-mas").hidden=vistos>=hits.length;
 if(vistos<hits.length)$("kw-mas").textContent=`Mostrar ${Math.min(PASO,hits.length-vistos)} más · ${hits.length-vistos} restantes`;
 $("kw-csv").hidden=!hits.length;
}
function distribucion(por,pal){
 const box=$("kw-dist");if(!hits.length)return;
 const tasas=[];for(let b=1;b<=10;b++)tasas.push(pal[b]?1000*(por[b]||0)/pal[b]:0);
 const max=Math.max(...tasas)||1;
 const tit=document.createElement("p");tit.className="kw-dist-t";tit.textContent="Distribución por libro (apariciones por cada 1.000 palabras del libro)";box.append(tit);
 const g=document.createElement("div");g.className="kw-barras";
 tasas.forEach((t,i)=>{const b=i+1;const col=document.createElement("button");col.type="button";col.className="kw-col";
  col.title=`Libro ${R[b]}: ${por[b]||0} apariciones · ${t.toFixed(2)} por 1.000 palabras. Clic para filtrar.`;
  const bar=document.createElement("span");bar.className="kw-bar";bar.style.height=(4+96*t/max)+"%";
  const n=document.createElement("small");n.textContent=por[b]||0;
  const r=document.createElement("b");r.textContent=R[b];
  col.append(n,bar,r);col.addEventListener("click",()=>{$("kw-libro").value=$("kw-libro").value===String(b)?"":String(b);buscar()});
  if($("kw-libro").value===String(b))col.classList.add("kw-sel");
  g.append(col)});
 box.append(g);
}
function csv(){
 const esc=v=>'"'+String(v).replace(/"/g,'""')+'"';
 const filas=[["locus","contexto izquierdo","forma","contexto derecho"],...hits.map(h=>[h.locus,h.izq,h.clave,h.der])];
 const blob=new Blob(["﻿"+filas.map(f=>f.map(esc).join(",")).join("\n")],{type:"text/csv"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="concordancia-"+plegar($("kw-q").value).replace(/[^a-z0-9]+/g,"-")+".csv";a.click();
}
async function cargar(){
 if(datos)return;
 $("kw-aviso").textContent="Cargando el latín…";
 const r=await fetch("data/index/latin-texto.json");if(!r.ok)throw Error("HTTP "+r.status);
 datos=await r.json();$("kw-aviso").textContent="";
}
function init(){
 if(!$("kw-form"))return;
 const go=async e=>{e?.preventDefault();try{await cargar();buscar()}catch(err){$("kw-aviso").textContent="No se pudo cargar el texto latino ("+err.message+")."}};
 $("kw-form").addEventListener("submit",go);
 for(const id of ["kw-ed","kw-libro"])$(id).addEventListener("change",go);
 for(const b of document.querySelectorAll("#kw-orden button"))b.addEventListener("click",()=>{orden=b.dataset.o;
  for(const x of document.querySelectorAll("#kw-orden button"))x.setAttribute("aria-pressed",String(x===b));
  if(hits.length){ordenar();vistos=0;$("kw-res").replaceChildren();pintar()}});
 for(const b of document.querySelectorAll("#kw-ej button"))b.addEventListener("click",()=>{$("kw-q").value=b.textContent;go()});
 $("kw-mas").addEventListener("click",pintar);
 $("kw-csv").addEventListener("click",csv);
 for(let b=1;b<=10;b++){const o=document.createElement("option");o.value=String(b);o.textContent="Libro "+R[b];$("kw-libro").append(o)}
 const u=new URLSearchParams(location.search).get("kwic");if(u){$("kw-q").value=u;go()}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
