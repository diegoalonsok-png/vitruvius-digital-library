/* Cotejo léxico tripartito por locus. Las diferencias son candidatas, NO lecturas autópticas. */
(()=>{
"use strict";
const roots=["data/structured/recensio-es.json","data/critical-editions/krohn-1912-tei-loci.json","data/critical-editions/rose-1899-transcribed-loci.json"];
const names=["Kurilo V514","Krohn 1912","Rose 1899"];
let dictionaries=[],keys=[],ready=false;
const clean=s=>(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u").replace(/[^a-z\u0370-\u03ff]+/g," ").trim().replace(/\s+/g," ");
const words=s=>(s||"").match(/[\p{L}\p{M}]+/gu)||[];
const norm=w=>clean(w);
function variants(a,b){
 const A=words(a), B=words(b), n=A.length,m=B.length;
 // Full LCS per locus; cap for unusually long paragraphs, which remain explicitly unevaluated.
 if(n*m>210000)return [{lemma:"",reading:"",warning:"Locus extenso: requiere cotejo manual"}];
 const d=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)d[i][j]=norm(A[i])===norm(B[j])?1+d[i+1][j+1]:Math.max(d[i+1][j],d[i][j+1]);
 let i=0,j=0,out=[],left=[],right=[];
 const flush=()=>{if(left.length||right.length){out.push({lemma:left.join(" ")||"∅",reading:right.join(" ")||"∅"});left=[];right=[]}};
 while(i<n||j<m){
  if(i<n&&j<m&&norm(A[i])===norm(B[j])){flush();i++;j++}
  else if(j<m&&(i===n||d[i][j+1]>=d[i+1][j]))right.push(B[j++]);
  else if(i<n)left.push(A[i++]);
 }
 flush();return out;
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function display(locus){
 const host=document.getElementById("vdl-triad-readings");if(!host||!ready)return;
 const all=dictionaries.map(d=>d.get(locus)||"");
 if(all.some(x=>!x)){host.innerHTML='<p>No hay tres textos latinos independientes disponibles para '+escape(locus)+'.</p>';return}
 const k=variants(all[0],all[1]),r=variants(all[0],all[2]);
 function edition(label,changes){return '<section><h4>'+escape(label)+' — '+changes.length+' diferencias léxicas candidatas</h4>'+(changes.length?'<ol>'+changes.slice(0,100).map(v=>'<li><i>'+escape(v.lemma)+'</i> ] '+escape(v.reading)+(v.warning?' · '+escape(v.warning):'')+'</li>').join('')+'</ol>':'<p>Sin diferencias léxicas normalizadas en este locus.</p>')+(changes.length>100?'<p>Lista abreviada; conservar fuente integral para revisión.</p>':'')+'</section>'}
 host.innerHTML='<p><strong>Locus '+escape(locus)+'</strong> · base Kurilo V514 · normalización para búsqueda: mayúsculas, u/v, i/j, acentos y puntuación. No equivale a identidad ecdótica.</p>'+edition("Krohn 1912",k)+edition("Rose 1899",r);
}
function locus(){
 const params=new URLSearchParams(location.search);const v=document.getElementById("bude-locus");
 return (v&&v.value)||params.get("locus")||"1.1.1";
}
function setup(){
 const anchor=document.getElementById("bude-content")||document.getElementById("bude-unit");
 if(!anchor)return;
 const section=document.createElement("section");section.id="vdl-triad-audit";section.style.cssText="margin:24px 0;padding:16px 22px;border:1px solid #a99d88;border-radius:8px";
 section.innerHTML='<h3>Collatio triplex · Rose / Krohn / Kurilo</h3><p>Confrontación léxica por locus según la presentación de lemas del aparato Budé ya utilizado. <strong>Estado: diferencias computacionales pendientes de verificación filológica con el impreso.</strong> No son variantes manuscritas ni emendaciones certificadas.</p><div id="vdl-triad-status" role="status">Cargando los tres originales digitales…</div><div id="vdl-triad-readings"></div>';
 anchor.insertAdjacentElement("afterend",section);
 const field=document.getElementById("bude-locus"),btn=document.getElementById("bude-go");
 if(field)field.addEventListener("change",()=>display(locus()));
 if(btn)btn.addEventListener("click",()=>setTimeout(()=>display(locus()),0));
 window.addEventListener("popstate",()=>display(locus()));
 window.addEventListener("hashchange",()=>display(locus()));
 const prev=document.getElementById("bude-prev"),next=document.getElementById("bude-next");
 [prev,next].forEach(b=>b&&b.addEventListener("click",()=>setTimeout(()=>display(locus()),100)));
 Promise.all(roots.map(async path=>{
 const res=await fetch(path);if(!res.ok)throw Error(path+" HTTP "+res.status);
 const obj=await res.json();if(!Array.isArray(obj.passages))throw Error("Corpus sin passages: "+path);
 return new Map(obj.passages.filter(p=>p.locus&&typeof p.latin==="string").map(p=>[p.locus,p.latin]));
 })).then(ds=>{
 dictionaries=ds;keys=[...ds[0].keys()];ready=true;
 const common=keys.filter(k=>ds.every(d=>d.has(k)));
 document.getElementById("vdl-triad-status").textContent="Cobertura digital: "+common.length+" de "+keys.length+" loci comunes · tres textos latinos. Verificación con impresos: pendiente.";
 display(locus());
 }).catch(e=>{document.getElementById("vdl-triad-status").textContent="No se cargó el cotejo: "+e.message});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();