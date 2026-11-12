/* «En todo el sitio»: una consulta de Vitruvia o de Lexicon se cruza con todos
   los instrumentos de la biblioteca, y cada hallazgo lleva a su página con la
   consulta ya puesta. Fuentes (todas locales, sin servicios externos):
   - Glosario del autor (verba-capitalia): voz, definiciones con página, loci.
   - Onomasticon: nombres propios y voces griegas con sus formas y loci.
   - Atlas geographicus: lugares, alias y formas latinas.
   - Texto latino de V514: pasajes que contienen la forma.
   - Codex H: folios ya leídos renglón por renglón donde aparece.
   - Registro ecdótico: decisiones, glosas, notas y lecturas de H.
   - Tablas de los tres libros, mapas antiguos e iconografía.
   Nada se infiere: sólo coincidencias textuales, con su recuento. */
(()=>{
"use strict";
if(window.SitioIntegrado)return;
const fold=v=>String(v||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/j/g,"i").replace(/v/g,"u");
const griego=v=>/[Ͱ-Ͽἀ-῿]/.test(v);
const raiz=q=>{const f=fold(q).replace(/[^a-z ]/g,"").trim();if(f.length<5)return f;const r=f.replace(/(ibus|orum|arum|ae|am|as|um|us|os|is|es|em|a|e|i|o)$/,"");return r.length>=4?r:f};
const cache={};
const json=url=>cache[url]||(cache[url]=fetch(url).then(r=>r.ok?r.json():null).catch(()=>null));
const el=(tag,attrs={},...kids)=>{const e=document.createElement(tag);for(const [k,v] of Object.entries(attrs)){if(k==="class")e.className=v;else if(k==="text")e.textContent=v;else if(v!=null)e.setAttribute(k,v)}e.append(...kids.filter(x=>x!=null&&x!==false));return e};
const css=document.createElement("style");
css.textContent=`.si-panel{align-self:start;height:auto;max-height:none;grid-column:1/-1;margin:18px 0;padding:14px 16px;border:1px solid rgba(127,127,127,.35);border-radius:10px;font:14px/1.5 system-ui,Arial,sans-serif}
.si-panel h3{margin:0 0 4px;font:600 15px/1.3 Georgia,serif;letter-spacing:.01em}
.si-panel .si-nota{margin:0 0 10px;font-size:12px;opacity:.75}
.si-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.si-card{border:1px solid rgba(127,127,127,.28);border-radius:8px;padding:9px 11px}
.si-card h4{margin:0 0 4px;font:600 12px/1.3 system-ui,Arial,sans-serif;text-transform:uppercase;letter-spacing:.06em;opacity:.8}
.si-card p{margin:3px 0}.si-card a{color:inherit;text-underline-offset:3px}
.si-card .si-n{font:600 18px/1 Georgia,serif;margin-right:6px}
.si-card ul{margin:4px 0 0;padding-left:18px}.si-card li{margin:2px 0}
.si-card mark{background:rgba(255,214,0,.42);color:inherit;border-radius:2px}`;
document.head.append(css);

async function buscar(q){
 const out=[];const qf=fold(q).trim();if(qf.length<3)return out;
 const r=raiz(q),gr=griego(q);
 const re=gr?new RegExp(q.normalize("NFC").replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"):new RegExp("(^|[^a-z])"+r.replace(/ +/g,"[^a-z]+"));
 const prueba=t=>gr?re.test(String(t||"").normalize("NFC")):re.test(fold(t));
 const [voces,ono,atlas,es,lect,tablas,mapas,icono]=await Promise.all([
  json("data/index/verba-capitalia.json"),json("data/onomasticon-plenum.json"),json("data/atlas-geographicus-vitruvianus.json"),
  json("data/structured/recensio-es.json"),json("data/codex-h/lecturas/index.json"),json("data/tablas-libros.json"),
  json("data/mapas-antiguos.json"),json("data/iconografia-vitruviana.json")]);
 // Glosario del autor
 const v=(voces?.voces||[]).find(x=>fold(x.clave)===qf||(!gr&&r.length>3&&fold(x.raiz)&&r.startsWith(fold(x.raiz)))||(x.graecum||[]).some(g=>g===q.normalize("NFC")));
 if(v){
  const d=v.definiciones?.es;
  out.push({t:"Glosario del autor",n:v.ocurrencias?.reduce((a,o)=>a+o.n,0)||null,u:"inventario-aparato-autoral.html?"+new URLSearchParams({q:v.clave}),
   lin:[v.lemma+(v.graecum?.length?" · "+v.graecum.join(", "):"")+(v.parsArchitecturae?" · pars architecturae":""),d?.texto?d.texto.slice(0,180)+"… (V514, p. "+d.pagina+")":null].filter(Boolean),
   extra:v.ocurrencias?.length?[["Primer locus en la concordancia con el folio de H","concordancia-folios.html?"+new URLSearchParams({locus:v.ocurrencias[0].locus})]]:[]});
 }
 // Onomasticon
 const nombres=[...(ono?.nombres||[]),...(ono?.vocesGriegas||[])].filter(n=>prueba(n.formaPrincipal)||(n.formasAtestiguadas||[]).some(f=>prueba(f.forma))||prueba(n.clave)).slice(0,6);
 if(nombres.length)out.push({t:"Onomasticon",n:nombres.length,u:"onomasticon.html?"+new URLSearchParams({nombre:nombres[0].clave}),
  items:nombres.map(n=>[n.formaPrincipal+" · "+(n.apariciones||0)+" apariciones · "+(n.loci?.length||0)+" loci","onomasticon.html?"+new URLSearchParams({nombre:n.clave})])});
 // Atlas
 const lugares=(atlas?.extra||[]).filter(e=>[e.name,...(e.aliases||[]),...(e.latin_forms||[]),e.greek_name].some(prueba)).slice(0,5);
 if(lugares.length)out.push({t:"Atlas geographicus",n:lugares.length,u:"atlas-geographicus.html?"+new URLSearchParams({lugar:lugares[0].id}),
  items:lugares.map(e=>[e.name+(e.loci?.length?" · Vitr. "+e.loci.slice(0,3).join(", "):""),"atlas-geographicus.html?"+new URLSearchParams({lugar:e.id})])});
 // Texto latino V514
 const pas=(es?.passages||[]).filter(p=>prueba(p.latin));
 if(pas.length)out.push({t:"Texto latino · V514",n:pas.length,u:"lector-bilingue.html?"+new URLSearchParams({edition:"recensio-es",locus:pas[0].locus,q}),
  lin:["pasajes; primeros: "+pas.slice(0,8).map(p=>p.locus).join(", ")],
  extra:[["Concordancia KWIC con distribución por libro","aparato-critico.html?"+new URLSearchParams({kwic:q})+"#kwic"]]});
 // Codex H leído
 if(lect?.folios&&!gr){
  const hallados=[];
  for(const f of Object.keys(lect.folios)){const L=await json("data/codex-h/lecturas/"+f+".json");const n=(L?.lines||[]).filter(l=>prueba(l)).length;if(n)hallados.push([f,n])}
  if(hallados.length)out.push({t:"Codex H · folios leídos",n:hallados.reduce((a,b)=>a+b[1],0),u:"codex-h-folios-local.html?"+new URLSearchParams({folio:"f."+hallados[0][0],verbum:q}),
   items:hallados.map(([f,n])=>["f. "+f+" · "+n+" renglón"+(n>1?"es":"")+" (subrayado sobre la imagen)","codex-h-folios-local.html?"+new URLSearchParams({folio:"f."+f,verbum:q})])});
 }
 // Tablas de los libros
 const tb=(tablas?.tablas||[]).filter(t=>[t.titulo,...t.columnas,...t.filas.flat()].some(prueba));
 if(tb.length)out.push({t:"Tablas de los libros",n:tb.length,u:"tablas-explicativas.html?"+new URLSearchParams({q}),
  items:tb.slice(0,4).map(t=>[t.edicion+" · tabla "+t.n+": "+t.titulo,"tablas-explicativas.html?"+new URLSearchParams({q,ed:t.edicion})+"#tabla-"+t.edicion+"-"+t.n])});
 // Mapas antiguos e iconografía
 const mp=(mapas?.entries||[]).filter(m=>[m.title,m.summary,m.vitruvius,m.place].some(prueba));
 if(mp.length)out.push({t:"Mapas antiguos",n:mp.length,u:"mapas-antiguos.html",items:mp.slice(0,3).map(m=>[m.title+" · "+m.date,"mapas-antiguos.html#"+m.id])});
 const ic=(icono?.primaryRecords||[]).filter(m=>[m.title,m.locus,m.description,m.subject].some(prueba));
 if(ic.length)out.push({t:"Iconografía vitruviana",n:ic.length,u:"iconografia-vitruviana.html",items:ic.slice(0,3).map(m=>[m.title,"iconografia-vitruviana.html#"+m.id])});
 // Registro ecdótico (el índice es pesado: se consulta al final)
 const reg=await json("data/index/registro-ecdotico.json");
 const rr=(reg?.registros||[]).filter(x=>prueba(x.lema)||prueba(x.aparato)||prueba(x.texto));
 if(rr.length){
  const tipos={};for(const x of rr)tipos[x.tipo]=(tipos[x.tipo]||0)+1;
  out.push({t:"Registro ecdótico",n:rr.length,u:"registro-ecdotico.html?"+new URLSearchParams({q}),
   lin:[Object.entries(tipos).map(([k,n])=>n+" "+({decision:"decisiones",glosa:"glosas",nota:"notas","lectura-h":"lecturas de H"}[k]||k)).join(" · ")],
   items:rr.slice(0,3).map(x=>["Vitr. "+(x.locus||"—")+" · "+(x.aparato||x.lema||x.texto||"").slice(0,90),"registro-ecdotico.html?"+new URLSearchParams({q,locus:x.locus||""})])});
 }
 return out;
}
function pintar(host,q,hallazgos){
 host.replaceChildren();
 if(!hallazgos.length){host.hidden=true;return}
 host.hidden=false;
 host.append(el("h3",{text:"«"+q+"» en todo el sitio"}),el("p",{class:"si-nota",text:"Coincidencias textuales en los demás instrumentos de la biblioteca; cada enlace abre la página con la consulta puesta."}));
 const g=el("div",{class:"si-grid"});
 for(const h of hallazgos){
  const c=el("div",{class:"si-card"},el("h4",{text:h.t}),el("p",{},h.n!=null?el("span",{class:"si-n",text:String(h.n)}):null,el("a",{href:h.u,text:"abrir →"})));
  for(const l of h.lin||[])c.append(el("p",{text:l}));
  if(h.items?.length)c.append(el("ul",{},...h.items.map(([t,u])=>el("li",{},el("a",{href:u,text:t})))));
  for(const [t,u] of h.extra||[])c.append(el("p",{},el("a",{href:u,text:t+" →"})));
  g.append(c);
 }
 host.append(g);
}
let serie=0;
async function panel(q,host){
 const k=++serie;q=String(q||"").trim();
 if(!q||q.length<3||/^\d/.test(q)){host.hidden=true;return}
 host.hidden=false;host.replaceChildren(el("p",{class:"si-nota",text:"Buscando «"+q+"» en todo el sitio…"}));
 const h=await buscar(q.split(/\s+/).length>3?q.split(/\s+/).slice(0,3).join(" "):q);
 if(k===serie)pintar(host,q,h);
}
window.SitioIntegrado={buscar,panel};

/* Montaje automático en Vitruvia y en Lexicon */
function montar(inputSel,despuesDe){
 const input=document.querySelector(inputSel);if(!input)return;
 const host=el("section",{class:"si-panel",id:"sitio-integrado","aria-live":"polite"});host.hidden=true;
 const lugar=()=>document.querySelector(despuesDe);
 let ultimo="",t=0;
 const lanzar=()=>{const q=input.value.trim();if(q===ultimo)return;ultimo=q;const l0=lugar(),l=l0&&(l0.closest('.results-grid,.lx-layout,.layout,main > section')||l0);if(l&&host.nextElementSibling!==l)l.before(host);panel(q,host)};
 input.form?.addEventListener("submit",()=>setTimeout(lanzar,300));
 input.addEventListener("keydown",e=>{if(e.key==="Enter")setTimeout(lanzar,300)});
 input.addEventListener("search",()=>setTimeout(lanzar,300));
 // también cuando la consulta llega por URL o por otro control de la página
 const r=lugar();if(r)new MutationObserver(()=>{clearTimeout(t);t=setTimeout(lanzar,600)}).observe(r,{childList:true});
 setTimeout(lanzar,1500);
}
const pagina=(location.pathname.split("/").pop()||"").toLowerCase();
const iniciar=()=>{
 if(pagina==="vitruvia-lexicon.html")montar("#lx-q","#lx-results");
 else if(pagina==="vitruvia.html")montar("#query","#results");
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();
})();
/* Atlas geographicus: la ficha de cada lugar muestra también qué dice de él el
   resto de la biblioteca (glosario, V514, folios de H, tablas, mapas, registro). */
(()=>{
 if((location.pathname.split("/").pop()||"").toLowerCase()!=="atlas-geographicus.html")return;
 const iniciar=()=>{
  const cab=document.getElementById("place-heading"),det=document.getElementById("place-detail");if(!cab||!det)return;
  const host=document.createElement("section");host.className="si-panel";host.id="sitio-integrado";host.hidden=true;det.append(host);
  let ultimo="";
  const lanzar=()=>{const n=cab.querySelector(".latin-name")?.textContent?.trim()||"";const q=n.split(/[\/·(]/)[0].trim();if(!q||q===ultimo)return;ultimo=q;window.SitioIntegrado.panel(q,host)};
  new MutationObserver(()=>setTimeout(lanzar,200)).observe(cab,{childList:true,subtree:true,characterData:true});
  setTimeout(lanzar,1500);
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",iniciar,{once:true});else iniciar();
})();
