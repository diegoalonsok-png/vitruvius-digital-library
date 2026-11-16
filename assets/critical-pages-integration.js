/* Shared apparatus navigation, evidence-grade critical notes. No replacement of historical material. */
(()=>{"use strict";
const PAGE=[
 ["apparatus-criticus.html","Apparatus criticus"],["apparatus-bude.html","Lectura enfrentada"],
 ["registro-ecdotico.html","Registro ecdótico"],["cobertura-aparato-critico.html","Cobertura"],
 ["colacion.html","Colación"],["aparato-critico.html","Notas del autor"],
 ["aparato-comparativo.html","Comparativo"]
];
const self=location.pathname.split("/").pop().replace(/\.html$/,"");
if(!PAGE.some(x=>x[0].replace(/\.html$/,"")===self))return;
let records=new Map(),translations=new Map(),active="1.1.1",panel=null;
const elt=(tag,body)=>{const n=document.createElement(tag);if(body!==undefined)n.textContent=body;return n};
function normal(s){
 s=String(s||"").trim().toLowerCase().replace(/\s+/g,"");
 const m=s.match(/^([ivx]+)\./);
 if(m){let n=0,p=0;for(const ch of [...m[1]].reverse()){const x={i:1,v:5,x:10}[ch];n+=x<p?-x:x;p=x;}s=n+s.slice(m[1].length)}
 return s.replace(/\.praefatio\./g,".praef.").replace(/\.preface\./g,".praef.");
}
const valid=s=>/^\d{1,2}\.(?:\d+|praef)\.\d+$/.test(s);
function locus(){
 const u=normal(new URLSearchParams(location.search).get("locus"));
 if(valid(u))return u;
 for(const id of ["bude-locus","coll-locus","locus","re-locus"]){
 const input=document.getElementById(id),value=normal(input?.value);
 if(valid(value))return value;
 }
 return active;
}
function redraw(v){
 if(!panel)return;
 active=valid(normal(v))?normal(v):locus();
 const tag=panel.querySelector("[data-critical-locus]");tag.textContent="Locus "+active;
 panel.querySelectorAll("a[data-critical-page]").forEach(a=>{
 const name=a.dataset.criticalPage;
 a.href=name+"?locus="+encodeURIComponent(active)+(name==="apparatus-bude.html"?"&edition=v514&translation=es":"");
 });
 const body=panel.querySelector("[data-critical-note]");body.replaceChildren();
 const r=records.get(active);
 if(!r){body.textContent="Sin nota individual de interpretación registrada en este índice. La ausencia de nota no implica inexistencia de variantes. Consultar los textos y aparatos completos.";return;}
 const h=elt("strong","Nota ecdótica por locus · "+active);body.append(h);
 const latin=elt("p",r.criticalLine);latin.lang="la";body.append(latin);
 body.append(elt("p","Qué cambia: "+r.change));
 body.append(elt("p","Atribución: "+r.decision));
 body.append(elt("small",r.status==="print_checked"?"Impresos cotejados según registro local; testimonios manuscritos citados indirectamente.":"Comparación digital provisional; causa de la elección y lectura impresa aún no comprobadas."));
 const t=translations.get(active);
 if(t){
  const extra=elt("section");extra.className="vdl-traductological-apparatus";extra.style.cssText="margin-top:12px;border-top:1px solid #9b958a80;padding-top:10px";
  extra.append(elt("strong","Collatio interpretationum · V514 / V554 / V297"));
  extra.append(elt("p",t.analysis));
  extra.append(elt("small","Objeto: tres traducciones de Kurilo, cotejadas entre sí y con sus latines. No son traducciones de Rose o Krohn ni demuestran por sí solas su motivo editorial."));
  body.append(extra);
 }
 const link=elt("a","Ver fuentes y diferencias");link.href="aparato-comparativo.html?locus="+encodeURIComponent(active);body.append(elt("p")).append(link);
}
function init(){
 const main=document.querySelector("main");if(!main||document.getElementById("vdl-critical-siblings"))return;
 panel=elt("section");panel.id="vdl-critical-siblings";
 panel.style.cssText="border:1px solid #aaa19a;border-radius:8px;margin:18px 0 24px;padding:12px 16px;font:13px/1.6 system-ui,sans-serif;max-width:100%;box-sizing:border-box;";
 const head=elt("div");head.style.cssText="display:flex;gap:10px;flex-wrap:wrap;align-items:baseline;margin-bottom:10px";
 head.append(elt("strong","Instrumenta critica · De architectura"),elt("span","Locus 1.1.1"));
 head.lastChild.setAttribute("data-critical-locus","");
 panel.append(head);
 const nav=elt("nav");nav.setAttribute("aria-label","Secciones relacionadas del aparato crítico");
 nav.style.cssText="display:flex;flex-wrap:wrap;gap:5px 13px;margin:6px 0 12px";
 for(const [file,label] of PAGE){const a=elt("a",label);a.dataset.criticalPage=file;a.href=file;
 if(file.replace(/\.html$/,"")===self)a.setAttribute("aria-current","page");nav.append(a)}
 panel.append(nav);
 const description=elt("p","Notae criticae: lemma ] lectio; Kur. V514 / Kr. 1912 / Rose 1899. Se distinguen decisiones editoriales documentadas, lecturas de los códices y divergencias digitales pendientes de comprobación.");
 panel.append(description);
 const note=elt("div","Cargando notas documentadas…");note.setAttribute("data-critical-note","");panel.append(note);
 main.insertBefore(panel,main.firstChild);
 const eventUpdate=e=>{if(e.detail?.locus)redraw(e.detail.locus);else redraw(locus())};
 window.addEventListener("vdl:comparative-locus-render",eventUpdate);
 window.addEventListener("vitruvius:bude-locus",eventUpdate);
 window.addEventListener("popstate",()=>redraw(locus()));
 ["bude-go","bude-prev","bude-next","coll-prev","coll-next"].forEach(id=>document.getElementById(id)?.addEventListener("click",()=>setTimeout(()=>redraw(locus()),80)));
 redraw(locus());
 fetch("data/apparatus/editorial-decisions-bude-reviewed.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{
 records=new Map((d.records||[]).map(v=>[v.locus,v]));redraw(locus());
 }).catch(e=>{note.textContent="No se recuperaron las notas: "+e.message;});
 fetch("data/apparatus/colacion-traducciones-interpretacion.json",{cache:"no-cache"}).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{
  translations=new Map((d.records||[]).map(x=>[x.locus,x]));redraw(locus());
 }).catch(e=>{const p=elt("small","La comparación de traducciones no está disponible: "+e.message);panel.append(p)});

}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();