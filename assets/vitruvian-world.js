/* Mundo vitruviano: si la consulta nombra a un códice o a una persona ligada a la tradición de
   De architectura (Barbaro, Perrault, Giocondo, Cesariano, Rose…), se muestra arriba de los resultados
   una ficha breve con los visores y fichas del sitio. Tolera errores de tipeo leves («Perraul», «Barbaros»). */
(()=>{
"use strict";
const fold=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const STOP=new Set("de del la las los el y e en por para con sobre the of and di da le les codex codice codices ms".split(" "));
function dist(a,b){if(Math.abs(a.length-b.length)>2)return 9;const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]}
const near=(w,v)=>w===v||w.length>=5&&dist(w,v)<=(w.length>=8?2:1);
let data=null;
async function load(){
 if(data)return data;
 const [world,codices]=await Promise.all([
  fetch("data/mundo-vitruviano.json").then(r=>r.json()).catch(()=>({people:[],codexLinks:{}})),
  fetch("data/vitruvia-codices.json").then(r=>r.json()).catch(()=>({records:[]}))]);
 const items=[...(world.people||[]).map(p=>({...p,kind:"person"}))];
 for(const c of codices.records||[]){
  const links=[];const reader=world.codexLinks?.[c.id]||c.reader;
  if(reader)links.push(["Abrir en el visor del sitio",reader]);
  for(const s of c.secondaryReaders||[])if(s?.url)links.push([s.title,s.url]);
  if(c.source)links.push([(c.sourceLabel||"Catálogo de la institución"),c.source]);
  links.push(["Índice de códices","index-codicum.html"]);
  items.push({id:c.id,kind:"codex",name:c.title,dates:c.date,role:[c.library,c.description].filter(Boolean).join(" · "),aliases:[c.title,...(c.aliases||[])],links});
 }
 data=items;return data;
}
function score(item,q){
 const qf=fold(q),qw=qf.split(" ").filter(w=>w.length>2&&!STOP.has(w));
 let best=0;
 for(const a of item.aliases||[]){
  const af=fold(a);if(!af)continue;
  if(qf===af){best=Math.max(best,100);continue}
  if((" "+qf+" ").includes(" "+af+" ")&&af.length>=4){best=Math.max(best,80);continue}
  const aw=af.split(" ").filter(w=>w.length>2&&!STOP.has(w));if(!aw.length||!qw.length)continue;
  // Todas las palabras distintivas del alias deben estar en la consulta (con tolerancia de tipeo).
  if(aw.every(w=>qw.some(v=>near(v,w))))best=Math.max(best,aw.length>1?75:(qw.length<=3?70:0));
 }
 return best;
}
async function match(q){
 if(!q||fold(q).length<4)return[];
 const items=await load();
 return items.map(x=>({x,s:score(x,q)})).filter(r=>r.s>=70).sort((a,b)=>b.s-a.s).slice(0,3).map(r=>r.x);
}
function el(t,c,v){const e=document.createElement(t);if(c)e.className=c;if(v!=null)e.textContent=v;return e}
function render(host,list){
 host.querySelector(".vw-box")?.remove();
 if(!list.length)return;
 const box=el("aside","vw-box");box.setAttribute("aria-label","Vínculos con los códices y ediciones del sitio");
 box.append(el("p","vw-kicker","Mundo vitruviano · códices y ediciones del sitio"));
 for(const it of list){
  const s=el("section","vw-item");
  const h=el("h3");h.append(el("span",null,it.name));if(it.dates)h.append(el("small",null," · "+it.dates));s.append(h);
  if(it.role)s.append(el("p",null,it.role.length>260?it.role.slice(0,260).replace(/\s\S*$/,"")+"…":it.role));
  const ln=el("p","vw-links");
  for(const [t,u] of it.links||[]){const a=el("a",null,t+(/^https?:/.test(u)?" ↗":" →"));a.href=u;if(/^https?:/.test(u)){a.target="_blank";a.rel="noopener noreferrer"}ln.append(a)}
  s.append(ln);box.append(s);
 }
 host.prepend(box);
}
const css=`.vw-box{border:1px solid rgba(176,150,100,.55);border-left:3px solid #b8955a;padding:14px 18px;margin:0 0 18px;border-radius:4px;background:rgba(176,150,100,.06)}
.vw-kicker{font:600 11px/1.4 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.8;margin:0 0 8px}
.vw-item+.vw-item{border-top:1px solid rgba(176,150,100,.3);margin-top:10px;padding-top:10px}
.vw-item h3{margin:0 0 4px;font-size:18px}.vw-item h3 small{font-size:13px;opacity:.75;font-weight:400}
.vw-item p{margin:0 0 6px;font-size:14px;line-height:1.55}.vw-links a{margin-right:16px;display:inline-block}`;
function style(){if(document.getElementById("vw-css"))return;const s=el("style");s.id="vw-css";s.textContent=css;document.head.append(s)}
let seq=0;
async function show(q,host){if(!host)return;const id=++seq;const list=await match(q).catch(()=>[]);if(id!==seq)return;style();render(host,list)}
window.VitruvianWorld={match,show};
document.addEventListener("DOMContentLoaded",()=>{
 // Portada: «Buscar en los textos».
 const form=document.getElementById("search-form"),results=document.getElementById("search-results");
 if(form&&results&&!document.getElementById("result-list")){
  const host=el("div");host.id="vw-host";results.before(host);
  form.addEventListener("submit",()=>show(document.getElementById("query")?.value,host));
  const q0=new URLSearchParams(location.search).get("q");if(q0)show(q0,host);
 }
 // Vitruvia: encima de la lista de resultados.
 const list=document.getElementById("result-list");
 if(list){const host=el("div");host.id="vw-host";list.before(host);
  window.addEventListener("vitruvia:search",e=>show(e.detail?.query,host));
  window.addEventListener("vitruvia:clear",()=>host.replaceChildren())}
});
})();
