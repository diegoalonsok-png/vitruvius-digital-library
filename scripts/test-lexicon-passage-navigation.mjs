#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const code=readFileSync("assets/vitruvia-lexicon.js","utf8");
const html=readFileSync("vitruvia-lexicon.html","utf8");
new vm.Script(code,{filename:"assets/vitruvia-lexicon.js"});

const extract=(a,b)=>{
 const start=code.indexOf(a),end=code.indexOf(b,start);
 assert(start>=0&&end>start,"Falta función esperada: "+a);
 return code.slice(start,end);
};
const near=extract("function previewPassagesNearWork(","function renderGroups(");
const viewer=extract("async function openViewer(","/* ---------- Citas en lenguaje natural");
assert(!near.includes('$("#results").scrollIntoView'),"No saltar al encabezado lejano de resultados");
assert(html.includes("assets/vitruvia-lexicon.js?v=20261109-inline-passages-v1"));
assert(html.includes(".lx-inline-passage-preview"));
assert(html.includes(".lx-viewer-origin"));

class Node {
 constructor(tag,attrs={}){
  this.tag=tag;this.attrs={...attrs};this.children=[];this.parentElement=null;
  this.nodeType=1;this.dataset={work:attrs["data-work"]||""};this.cells=[];
  this.textContent="";this.scrollTop=5;this.focused=false;this.isConnected=true;
 }
 append(...nodes){for(const node of nodes){if(node&&typeof node==="object"&&node.nodeType)node.parentElement=this;this.children.push(node)}}
 insertBefore(node,reference){node.parentElement=this;const i=this.children.indexOf(reference);this.children.splice(i<0?this.children.length:i,0,node)}
 remove(){const p=this.parentElement;if(p){const i=p.children.indexOf(this);if(i>=0)p.children.splice(i,1)}this.isConnected=false}
 querySelector(selector){return selector===".lx-inline-passage-row"?this.children.find(x=>x?.attrs?.class==="lx-inline-passage-row")||null:null}
 closest(selector){return selector==="tr"?this.parentElement:null}
 get previousElementSibling(){const p=this.parentElement,i=p?.children.indexOf(this);return i>0?p.children[i-1]:null}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]}
 focus(){this.focused=true}
 scrollIntoView(){}
}

const el=(tag,attrs={},...children)=>{const node=new Node(tag,attrs);node.append(...children);return node};
const parent=new Node("tbody"),tr=new Node("tr"),td=new Node("td"),button=new Node("button");
tr.cells=[td,td,td];parent.append(tr);tr.append(button);
let rendered=0,opened=0;
const sandbox={el,T:x=>x,work:()=>({author:"César",title:"De bello Gallico"}),
 groupHits:()=>[{i:0},{i:1}],hitCard:()=>{rendered++;return new Node("article")},
 renderGroups:()=>{opened++},$ :()=>({scrollIntoView(){}}),window:{matchMedia:()=>({matches:true})}};
vm.runInNewContext(near+"\nglobalThis.show=previewPassagesNearWork",sandbox);
const g={D:{l:"la"},forms:new Set(["Gallia"]),work:"caesar-gallico",label:"César"};
sandbox.show(button,g);
assert.equal(parent.children.length,2,"El pasaje debe aparecer justo después de la fila elegida");
const row=parent.children[1];
assert.equal(row.attrs.class,"lx-inline-passage-row");
assert.equal(row.previousElementSibling,tr);
assert.equal(button.attrs["aria-expanded"],"true");
assert.equal(button.textContent,"Ocultar pasajes");
assert.equal(rendered,2,"Los primeros pasajes deben aparecer en el mismo bloque");
assert.equal(opened,0,"Abrir un pasaje no debe reconstruir los resultados lejanos");
sandbox.show(button,g);
assert.equal(parent.children.length,1,"Cerrar el bloque debe devolver el listado a su forma original");
assert.equal(button.attrs["aria-expanded"],"false");
assert.equal(button.focused,true,"El foco del teclado debe volver al botón original");

const body=new Node("div");
const viewerSandbox={el,T:x=>x,work:()=>({author:"César",title:"De bello Gallico",edition:"Perseus"}),
 viewerShell:()=>body,linkWords:()=>new Node("span"),
 LECTOR_IDS:{"caesar-gallico":"phi0448.phi001"},
 S:{ui:"es"},PAGE:"https://example.org/",VIT_ED:{},EDITION_DOI:{},TOKEN:/\w+/g,
 load:async()=>({passages:[]}),fold:x=>x,vitruvianLinks:()=>[]};
vm.runInNewContext(viewer+"\nglobalThis.open=openViewer",viewerSandbox);
await viewerSandbox.open({l:"la"},["caesar-gallico","1.1","Gallia est omnis divisa"],[[0,6]],"Gallia");
assert.equal(body.children[0].tag,"section","El pasaje debe ser visible ANTES del lector embebido");
assert.equal(body.children[0].attrs.class,"lx-viewer-origin");
assert.equal(body.children[1].tag,"details","El lector largo debe estar plegado");
assert.equal(body.children[1].attrs.class,"lx-viewer-extended");
assert.equal(body.scrollTop,0,"El diálogo empieza arriba, donde está el pasaje");
assert.equal(body.children.filter(x=>x.tag==="iframe").length,0,"No insertar iframe antes del original");
console.log("PASS: Pasajes junto a obra, teclado y cierre sin saltos; original visible antes del visor embebido");
