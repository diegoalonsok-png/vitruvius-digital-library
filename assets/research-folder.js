/* Carpeta de investigación común a la Biblioteca Vitruviana y a Vitruvia (mismo origen, mismo almacenamiento).
   Guarda pasajes, folios, láminas, obras, códices y términos en el navegador del lector, sin cuentas.
   API: ResearchFolder.add(item) · remove(id) · list() · has(id) · button(item) · open()
   item: {id, kind, title, ref?, url?, locus?, folio?, citation?, bibtex?} */
(()=>{
"use strict";
if(window.ResearchFolder)return;
const KEY="vitruvius-research-folder-v1";
const KIND={passage:"Pasaje",folio:"Folio",plate:"Lámina",work:"Obra",codex:"Códice",term:"Término",apparatus:"Aparato",web:"Fuente externa"};
let mem=[];
const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(v)?v:[]}catch{return mem}};
const write=v=>{mem=v;try{localStorage.setItem(KEY,JSON.stringify(v))}catch{}render();document.dispatchEvent(new CustomEvent("research-folder-change",{detail:{count:v.length}}))};
const abs=u=>{try{return new URL(u,location.href).href}catch{return u||""}};
function add(item){if(!item||!item.id)return;const v=read();if(v.some(x=>x.id===item.id))return;v.push({...item,url:item.url?abs(item.url):location.href,added:new Date().toISOString().slice(0,10)});write(v)}
function remove(id){write(read().filter(x=>x.id!==id))}
const has=id=>read().some(x=>x.id===id);
function chicago(x){return x.citation||[x.title,x.ref].filter(Boolean).join(", ")+". "+(x.url||"")+"."}
function bib(x,i){if(x.bibtex)return x.bibtex;const k=(x.kind||"item")+(i+1);
 return "@misc{"+k+",\n  title = {"+String(x.title||"").replace(/[{}]/g,"")+"},\n  note  = {"+String(x.ref||"").replace(/[{}]/g,"")+"},\n  url   = {"+(x.url||"")+"},\n  urldate = {"+(x.added||"")+"}\n}"}
function download(name,text,type){const a=document.createElement("a"),u=URL.createObjectURL(new Blob([text],{type:type+";charset=utf-8"}));a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function ris(x){
 const safeLine=t=>String(t||"").replace(/[\r\n]+/g," ").trim();
 return ["TY  - GEN","AU  - "+safeLine(x.author||"Kurilo, Diego A."),"TI  - "+safeLine(x.title),"N1  - "+safeLine([x.ref,x.locus?"locus "+x.locus:""].filter(Boolean).join("; ")),"UR  - "+safeLine(x.url),"Y2  - "+safeLine(x.added),"ER  - "].join("\r\n");
}
// Compact, URL-safe portable dossier: no service, no personal account and no upload.
// Only bounded item metadata is transferred; long folders can still be exported as files.
function shareUrl(items){
 const compact=items.map(x=>({id:String(x.id||"").slice(0,160),kind:String(x.kind||"").slice(0,40),title:String(x.title||"").slice(0,260),ref:String(x.ref||"").slice(0,260),url:String(x.url||"").slice(0,550),locus:String(x.locus||"").slice(0,60)}));
 const json=JSON.stringify(compact);
 const bytes=new TextEncoder().encode(json);
 let raw="";for(const b of bytes)raw+=String.fromCharCode(b);
 const encoded=btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
 const url=new URL(location.href);url.hash="carpeta="+encoded;
 return url.href;
}
function sharePreview(){
 const match=location.hash.match(/(?:^#|[&#])carpeta=([A-Za-z0-9_-]+)/);
 if(!match||match[1].length>12000)return;
 try{
  const data=match[1].replace(/-/g,"+").replace(/_/g,"/");
  const bin=atob(data),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
  const values=JSON.parse(new TextDecoder().decode(bytes));
  if(!Array.isArray(values)||values.length>30)return;
  const safe=values.filter(x=>x&&typeof x.id==="string"&&typeof x.title==="string"&&(!x.url||/^https?:\/\//.test(x.url))).map(x=>({id:x.id.slice(0,160),kind:String(x.kind||"work").slice(0,40),title:x.title.slice(0,260),ref:String(x.ref||"").slice(0,260),url:String(x.url||"").slice(0,550),locus:String(x.locus||"").slice(0,60),added:new Date().toISOString().slice(0,10)}));
  if(!safe.length)return;
  const banner=document.createElement("div");banner.style.cssText="position:fixed;z-index:9001;right:12px;bottom:65px;max-width:360px;border:1px solid #aa9256;background:#faf8f2;color:#273747;padding:12px;font:13px/1.5 system-ui;box-shadow:0 2px 14px #0003";
  const note=document.createElement("p");note.textContent="Antología compartida: "+safe.length+" elementos. Podés incorporarlos a tu carpeta local (sin cuenta).";
  const accept=document.createElement("button");accept.textContent="Agregar a mi carpeta";accept.type="button";
  const close=document.createElement("button");close.textContent="Cerrar";close.type="button";close.style.marginLeft="8px";
  accept.onclick=()=>{const prior=read(),ids=new Set(prior.map(x=>x.id));write([...prior,...safe.filter(x=>!ids.has(x.id))]);banner.remove();open()};
  close.onclick=()=>banner.remove();banner.append(note,accept,close);document.body.append(banner);
 }catch{}
}
let fab,dlg;
function ui(){
 if(fab)return;
 if(window.self!==window.top){fab=document.createElement("span");return} // incrustado en otro lector: sin botón flotante
 fab=document.createElement("button");fab.type="button";fab.className="research-folder-fab";fab.setAttribute("aria-haspopup","dialog");
 fab.style.cssText="position:fixed;left:14px;bottom:14px;z-index:9000;font:600 13px system-ui,sans-serif;padding:9px 13px;border-radius:20px;border:1px solid #C9A84C;background:#1f3446;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer";
 fab.addEventListener("click",open);document.body.append(fab);
 dlg=document.createElement("dialog");dlg.className="research-folder-dialog";dlg.setAttribute("aria-label","Carpeta de investigación");
 dlg.style.cssText="max-width:760px;width:92vw;max-height:84vh;border:1px solid #C9A84C;padding:18px 20px;font:15px/1.5 system-ui,sans-serif;color:#1d2a35;background:#fbf8f2";
 dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close()});document.body.append(dlg);render()}
function render(){
 if(!fab||!fab.isConnected)return;const v=read();fab.textContent="▤ Carpeta"+(v.length?" ("+v.length+")":"");fab.title="Carpeta de investigación: pasajes, folios, láminas y obras guardados";
 if(!dlg)return;dlg.replaceChildren();
 const head=document.createElement("div");head.style.cssText="display:flex;justify-content:space-between;align-items:center;gap:10px";
 const h=document.createElement("h2");h.textContent="Carpeta de investigación";h.style.margin="0";
 const x=document.createElement("button");x.type="button";x.textContent="×";x.setAttribute("aria-label","Cerrar");x.style.cssText="font-size:22px;background:none;border:0;cursor:pointer";x.onclick=()=>dlg.close();head.append(h,x);
 const p=document.createElement("p");p.style.cssText="font-size:.88em;margin:6px 0 12px;opacity:.85";p.textContent="Se guarda en este navegador y es común a la Biblioteca y a Vitruvia. "+v.length+" elementos.";
 dlg.append(head,p);
 if(!v.length){const e=document.createElement("p");e.textContent="Todavía no hay elementos. Usa «☆ Guardar» en un pasaje, un folio, una lámina, una obra o un término.";dlg.append(e);return}
 const tools=document.createElement("div");tools.style.cssText="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px";
 const mk=(t,f)=>{const b=document.createElement("button");b.type="button";b.textContent=t;b.style.cssText="font:inherit;font-size:.88em;padding:5px 10px;border:1px solid #8a7550;background:#fff;cursor:pointer";b.onclick=f;tools.append(b);return b};
 const cp=mk("Copiar bibliografía (Chicago)",()=>{const t=v.map(chicago).join("\n\n");navigator.clipboard?.writeText(t).then(()=>{cp.textContent="Copiada ✓";setTimeout(()=>cp.textContent="Copiar bibliografía (Chicago)",1500)})});
 mk("Descargar BibTeX",()=>download("carpeta-vitruvius.bib",v.map(bib).join("\n\n")+"\n","application/x-bibtex"));
 mk("Descargar RIS (Zotero)",()=>download("carpeta-vitruvius.ris",v.map(ris).join("\r\n\r\n")+"\r\n","application/x-research-info-systems"));
 mk("Compartir antología",async()=>{if(v.length>30){alert("Para un enlace compartible, seleccioná hasta 30 elementos. El dossier completo se puede imprimir o descargar.");return}const url=shareUrl(v);if(url.length>12000){alert("La antología excede el tamaño recomendado para un enlace: descargala o imprimila.");return}try{await navigator.clipboard.writeText(url);alert("Enlace copiado: podés enviarlo a otra persona.")}catch{prompt("Copiá el enlace compartible:",url)}});
 mk("Descargar lista (TXT)",()=>download("carpeta-vitruvius.txt",v.map((x,i)=>(i+1)+". ["+(KIND[x.kind]||x.kind)+"] "+x.title+(x.ref?" — "+x.ref:"")+"\n   "+x.url).join("\n")+"\n","text/plain"));
 mk("Imprimir dossier",()=>{const w=window.open("","_blank");if(!w)return;const esc=s=>String(s||"").replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  w.document.write("<!doctype html><meta charset=utf-8><title>Dossier · Carpeta de investigación</title><body style='font:15px/1.55 Georgia,serif;max-width:760px;margin:30px auto'><h1>Dossier de investigación</h1><ol>"+v.map(x=>"<li><p><b>"+esc(x.title)+"</b>"+(x.ref?" — "+esc(x.ref):"")+"<br><small>"+esc(KIND[x.kind]||x.kind)+" · "+esc(x.url)+"</small></p><p>"+esc(chicago(x))+"</p></li>").join("")+"</ol></body>");w.document.close();w.focus();w.print()});
 mk("Vaciar",()=>{if(confirm("¿Vaciar la carpeta de investigación?"))write([])});
 dlg.append(tools);
 const ul=document.createElement("ol");ul.style.cssText="padding-left:22px;margin:0";
 for(const it of v){const li=document.createElement("li");li.style.margin="0 0 10px";
  const a=document.createElement("a");a.href=it.url;a.textContent=it.title;a.style.fontWeight="600";
  const meta=document.createElement("div");meta.style.cssText="font-size:.86em;opacity:.85";meta.textContent=(KIND[it.kind]||it.kind)+(it.ref?" · "+it.ref:"")+" · guardado "+it.added;
  const rm=document.createElement("button");rm.type="button";rm.textContent="Quitar";rm.style.cssText="font:inherit;font-size:.8em;margin-left:8px;background:none;border:0;text-decoration:underline;cursor:pointer";rm.onclick=()=>remove(it.id);
  li.append(a,rm,meta);ul.append(li)}
 dlg.append(ul)}
function open(){ui();render();dlg.showModal?dlg.showModal():dlg.setAttribute("open","")}
function button(item,opts={}){const b=document.createElement("button");b.type="button";b.className="research-folder-save";
 b.style.cssText="font:inherit;font-size:.92em;background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer;"+(opts.style||"");
 const sync=()=>{const on=has(item.id);b.textContent=on?"★ En la carpeta":"☆ Guardar";b.setAttribute("aria-pressed",String(on))};
 b.addEventListener("click",()=>{has(item.id)?remove(item.id):add(item);sync()});document.addEventListener("research-folder-change",sync);sync();return b}
window.ResearchFolder={add,remove,list:read,has,button,open,version:"1.0"};
const start=()=>{ui();sharePreview();
 // Decoración automática de los resultados de los dos buscadores.
 const R=["","I","II","III","IV","V","VI","VII","VIII","IX","X"],cite=l=>{const [b,...r]=String(l).split(".");return "Vitr. "+(R[+b]||b)+"."+r.join(".").replace(/^praef\./,"praef. ")};
 const decorate=()=>{
  document.querySelectorAll("article.result-parallel:not([data-folder])").forEach(art=>{art.dataset.folder="1";const a=art.querySelector('a[href*="lector-bilingue.html"]'),acts=art.querySelector(".result-actions");if(!a||!acts)return;
   let u;try{u=new URL(a.href)}catch{return}const l=u.searchParams.get("locus");if(!l)return;
   acts.append(button({id:"passage:"+l,kind:"passage",title:"Vitruvio, De architectura · "+cite(l),ref:"edición "+(u.searchParams.get("edition")||"recensio-es"),url:a.href,locus:l}))});
  document.querySelectorAll("#result-list .result-card:not([data-folder])").forEach(card=>{card.dataset.folder="1";const t=card.querySelector("h3")?.textContent?.trim(),link=card.querySelector(".actions a, .result-actions a, a[href]");if(!t)return;
   const kt=card.querySelector(".kind")?.textContent||"",kind=/APARATO/.test(kt)?"apparatus":/FICHA DE TÉRMINO/.test(card.textContent)?"term":/LÁMINA/.test(card.textContent)?"plate":/MANUSCRITO|CÓDICE|CODEX|Codex/.test(card.querySelector(".kind")?.textContent||"")?"codex":/PASAJE|LOCUS|PASSAGE/i.test(card.querySelector(".kind")?.textContent||"")?"passage":link&&/^https?:/.test(link.getAttribute("href")||"")&&!link.href.startsWith(location.origin)?"web":"work";
   const host=card.querySelector(".actions")||card;host.append(button({id:"v:"+(link?link.href:t),kind,title:t,ref:card.querySelector(".author")?.textContent?.trim()||"",url:link?link.href:location.href},{style:"margin-left:10px"}))})};
 decorate();new MutationObserver(()=>decorate()).observe(document.body,{childList:true,subtree:true})};
document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start):start();
})();
