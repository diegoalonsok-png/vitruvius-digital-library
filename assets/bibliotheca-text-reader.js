/* Self-hosted parallel classical reader — only loads verified local textual editions. */
window.BibliothecaTextReader=(function(){
const datasets={
 es:{url:"data/structured/recensio-es.json",name:"V514 · Latín / Castellano"},
 en:{url:"data/structured/theory-en.json",name:"V297 · Latín / Inglés"}
};
const cache={};
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const text=s=>String(s??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
let seq=0;
async function load(lang){if(!cache[lang])cache[lang]=fetch(datasets[lang].url).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(j=>j.passages.filter(p=>p.latin||p.translation)).catch(err=>{delete cache[lang];throw err});return cache[lang]}
async function mount(target,lang="es"){
const id=++seq;
target.innerHTML='<p role="status">Cargando texto latino y edición bilingüe alojados en GitHub…</p>';
try{
 let list=await load(lang);
 if(id!==seq||!target.isConnected)return;
 target.innerHTML='<div class="classic-read-toolbar"><label>Edición<select id="cr-edition"><option value="es">V514 · Castellano</option><option value="en">V297 · English</option></select></label><label>Libro<select id="cr-book"></select></label><label>Pasaje / locus<select id="cr-locus"></select></label><label>Buscar en el libro<input id="cr-search" type="search" placeholder="symmetria · architectura"></label></div><p id="cr-summary" role="status"></p><div id="cr-lines" class="classic-read-columns"></div><div class="classic-read-nav"><button id="cr-prev" type="button">← Locus anterior</button><button id="cr-next" type="button">Siguiente locus →</button></div><p class="classic-ref">Fuente: ediciones editoriales independientes de Diego A. Kurilo, V514 (latín-castellano) y V297 (latín-inglés). Los pasajes no son transcripciones diplomáticas de un manuscrito. Las divisiones de locus dependen de las ediciones utilizadas.</p>';
 const $=id=>target.querySelector("#"+id), e=$("cr-edition"),b=$("cr-book"),l=$("cr-locus"),q=$("cr-search"),out=$("cr-lines"),summary=$("cr-summary");
 e.value=lang; let activeBook=1,activeIdx=0,filtered=[];
 const bookList=()=>[...new Set(list.map(p=>Number(p.book)).filter(Number.isFinite))].sort((a,b)=>a-b);
 function populateBooks(){b.innerHTML=bookList().map(n=>'<option value="'+n+'">Libro '+n+'</option>').join("");if(!bookList().includes(activeBook))activeBook=bookList()[0]||1;b.value=activeBook;}
 function filteredPassages(){const query=text(q.value).trim();return list.filter(p=>Number(p.book)===activeBook&&(!query||text([p.locus,p.latin,p.translation].join(" ")).includes(query)));}
 function drawPassages(){filtered=filteredPassages();l.replaceChildren();filtered.forEach((p,i)=>{const opt=document.createElement("option");opt.value=String(i);opt.textContent=p.locus;l.append(opt)});if(activeIdx>=filtered.length)activeIdx=0;show();}
 function show(){const p=filtered[activeIdx];l.value=String(activeIdx);summary.textContent=filtered.length?(filtered.length+" loci · "+p.locus+" · "+datasets[e.value].name):"Sin pasajes para este filtro";if(!p){out.innerHTML='<p>No hay pasajes que coincidan con la búsqueda.</p>';return;}out.innerHTML='<article><h4>LATINE · '+safe(p.locus)+'</h4><p lang="la">'+safe(p.latin||"")+'</p></article><article><h4>'+(e.value==="es"?"CASTELLANO":"ENGLISH")+' · '+safe(p.locus)+'</h4><p lang="'+e.value+'">'+safe(p.translation||"Traducción no disponible para este pasaje.")+'</p></article>';q.setAttribute("aria-label","Buscar en libro "+activeBook);}
 populateBooks();drawPassages();
 b.addEventListener("change",()=>{activeBook=Number(b.value);activeIdx=0;q.value="";drawPassages()});
 l.addEventListener("change",()=>{activeIdx=Number(l.value);show()});
 q.addEventListener("input",()=>{activeIdx=0;drawPassages()});
 $("cr-prev").addEventListener("click",()=>{activeIdx=Math.max(0,activeIdx-1);show()});
 $("cr-next").addEventListener("click",()=>{activeIdx=Math.min(filtered.length-1,activeIdx+1);show()});
 e.addEventListener("change",async()=>{const lang=e.value;summary.textContent="Cargando edición "+lang+"…";try{list=await load(lang);if(!target.isConnected)return;populateBooks();activeIdx=0;drawPassages();}catch(err){summary.textContent="Error de lectura: "+err.message}});
}catch(err){target.textContent="No fue posible cargar la edición del servidor: "+err.message}
}
return{mount};
})();