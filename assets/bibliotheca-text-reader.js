/* Self-hosted parallel classical reader — only loads verified local textual editions. */
window.BibliothecaTextReader=(function(){
const datasets={
 es:{url:"data/structured/recensio-es.json",name:"V514 · Latín / Castellano"},
 fr:{url:"data/structured/recensio-fr.json",name:"V554 · Latín / Français"},
 en:{url:"data/structured/theory-en.json",name:"V297 · Latín / Inglés"}
};
const cache={};
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const text=s=>String(s??"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
let seq=0;
async function load(lang){if(!cache[lang])cache[lang]=fetch(datasets[lang].url).then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(j=>j.passages.filter(p=>p.latin||p.translation)).catch(err=>{delete cache[lang];throw err});return cache[lang]}
async function mount(target,lang="es"){
const id=++seq;
target.innerHTML='<p role="status">Cargando texto latino y edición bilingüe alojados en GitHub…</p>';
try{
 let list=await load(lang);
 if(id!==seq||!target.isConnected)return;
 target.innerHTML='<div class="classic-read-toolbar"><label>Edición<select id="cr-edition"><option value="es">V514 · Castellano</option><option value="fr">V554 · Français</option><option value="en">V297 · English</option></select></label><label>Libro<select id="cr-book"></select></label><label>Pasaje / locus<select id="cr-locus"></select></label><label>Buscar en el libro<input id="cr-search" type="search" placeholder="loci · symmetria · architectura" aria-label="Buscar en toda la edición, todos los libros y pasajes"></label></div><p id="cr-summary" role="status"></p><div id="cr-lines" class="classic-read-columns"></div><div class="classic-read-nav"><button id="cr-prev" type="button">← Locus anterior</button><button id="cr-next" type="button">Siguiente locus →</button></div><div id="cr-matches" class="classic-read-matches" aria-label="Pasajes encontrados ordenados por libro y locus" hidden></div><p class="classic-ref">Fuente: ediciones editoriales independientes de Diego A. Kurilo, V514 (latín-castellano) y V297 (latín-inglés). Los pasajes no son transcripciones diplomáticas de un manuscrito. Las divisiones de locus dependen de las ediciones utilizadas.</p>';
 const style=document.createElement("style");style.textContent=".classic-read-matches{margin:12px 0 18px;border:1px solid #a38f72;border-radius:5px;padding:12px;background:rgba(152,128,93,.08);color:inherit;font:13px/1.55 system-ui,sans-serif}.classic-read-matches[hidden]{display:none}.classic-read-matches p{margin:0 0 9px}.classic-read-match-list{display:flex;flex-wrap:wrap;gap:7px;max-height:240px;overflow-y:auto}.classic-read-match-button{padding:7px 10px;border:1px solid #a38f72;border-radius:4px;color:inherit;background:transparent;cursor:pointer;font:12px system-ui,sans-serif}.classic-read-match-button:hover,.classic-read-match-button:focus-visible{background:rgba(165,139,95,.25);outline:1px solid #a38f72}";target.prepend(style);
 const $=id=>target.querySelector("#"+id), e=$("cr-edition"),b=$("cr-book"),l=$("cr-locus"),q=$("cr-search"),out=$("cr-lines"),summary=$("cr-summary"),matches=$("cr-matches");
 e.value=lang; let activeBook=0,activeIdx=0,filtered=[];
 const bookList=()=>[...new Set(list.map(p=>Number(p.book)).filter(Number.isFinite))].sort((a,b)=>a-b);
 const prefaceBooks=()=>new Set(list.filter(p=>/\\.praef\\./.test(String(p.locus||""))).map(p=>Number(p.book)));
 function prefaceStatus(){const books=prefaceBooks();return books.size===10?"Prefacios de los diez libros disponibles":books.size+" de 10 prefacios con pasajes registrados";}

 function populateBooks(){b.innerHTML='<option value="0">Todos los libros (I–X)</option><option value="-1">Todos los prefacios (I–X)</option>'+bookList().map(n=>'<option value="'+n+'">Libro '+n+'</option>').join("");if(activeBook>0&&!bookList().includes(activeBook))activeBook=0;b.value=String(activeBook);}
 // Navigation respects the selected book; searching ignores it and examines all ten books.
 function searchHits(){const query=text(q.value).trim();if(!query)return null;
  const matches=[];for(const p of list){
   if(activeBook>0&&Number(p.book)!==activeBook)continue;
   if(activeBook===-1&&!/\\.praef\\./.test(String(p.locus||"")))continue;
   const original=String(p.latin||""),translated=String(p.translation||"");
   // Unicode word boundary: "loci" must not be mistaken for a fragment of another word.
   const found=[["Latín",original],["Traducción",translated]].filter(([,v])=>{
    const folded=text(v),at=folded.indexOf(query);
    if(at<0)return false;
    let pos=at;while(pos>=0){
     const before=folded[pos-1]||"",after=folded[pos+query.length]||"";
     if(!/[\p{L}\p{N}]/u.test(before)&&!/[\p{L}\p{N}]/u.test(after))return true;
     pos=folded.indexOf(query,pos+1);
    }return false;
   });
   if(found.length)matches.push({passage:p,fields:found.map(x=>x[0])});
  }return matches;
 }
 function filteredPassages(){const hits=searchHits();return hits?hits.map(x=>x.passage):list.filter(p=>activeBook===0||(activeBook===-1?/\\.praef\\./.test(String(p.locus||"")):Number(p.book)===activeBook));}
 function drawMatches(hits){
  matches.replaceChildren();matches.hidden=!hits;
  if(!hits)return;
  const heading=document.createElement("p");heading.textContent=hits.length+" pasajes coincidentes en "+(activeBook===0?"todos los libros (I–X)":activeBook===-1?"los prefacios I–X":"el Libro "+activeBook)+". Seleccioná un resultado para abrirlo.";
  matches.append(heading);
  const container=document.createElement("div");container.className="classic-read-match-list";
  const ordered=hits.map((hit,index)=>({...hit,index})).sort((a,b)=>Number(a.passage.book)-Number(b.passage.book)||String(a.passage.locus).localeCompare(String(b.passage.locus),undefined,{numeric:true}));
  ordered.forEach(({passage:p,fields,index})=>{
   const button=document.createElement("button");button.type="button";
   button.className="classic-read-match-button";button.textContent="Libro "+p.book+" · "+p.locus+" · "+fields.join(" y ");
   button.setAttribute("aria-label","Abrir Libro "+p.book+", pasaje "+p.locus);
   button.addEventListener("click",()=>{activeIdx=index;show();out.scrollIntoView({behavior:"smooth",block:"start"});});
   container.append(button);
  });
  matches.append(container);
 }
 function drawPassages(){const hits=searchHits();filtered=hits?hits.map(x=>x.passage):list.filter(p=>activeBook===0||(activeBook===-1?/\\.praef\\./.test(String(p.locus||"")):Number(p.book)===activeBook));
  l.replaceChildren();filtered.forEach((p,i)=>{const opt=document.createElement("option");opt.value=String(i);opt.textContent=(activeBook<=0?"Libro "+p.book+" · ":"")+p.locus;l.append(opt)});
  if(activeIdx>=filtered.length||activeIdx<0)activeIdx=0;drawMatches(hits);show();
 }
 function show(){const p=filtered[activeIdx];l.value=String(activeIdx);
  // Keep selected search scope even when the displayed locus belongs to another book.
  const searching=Boolean(q.value.trim());
  const prefNotice=activeBook===-1?" · "+prefaceStatus():"";
  summary.textContent=p?(filtered.length+(searching?" pasajes encontrados en "+(activeBook===0?"los diez libros":activeBook===-1?"los prefacios I–X":"el Libro "+activeBook):(activeBook===0?" loci de los diez libros":activeBook===-1?" loci de los prefacios I–X":" loci del Libro "+activeBook))+" · "+p.locus+" · "+datasets[e.value].name):
   searching?"Sin resultados para «"+q.value+"» en "+(activeBook===0?"los diez libros":activeBook===-1?"los prefacios I–X":"el Libro "+activeBook)+" de esta edición.":"No hay pasajes para la selección";
  if(activeBook===-1)summary.textContent+=prefNotice;
  if(!p){out.innerHTML='<p>No hay pasajes que coincidan con la búsqueda.</p>';return;}
  out.innerHTML='<article><h4>LATINE · '+safe(p.locus)+'</h4><p lang="la">'+safe(p.latin||"")+'</p></article><article><h4>'+(e.value==="es"?"CASTELLANO":e.value==="fr"?"FRANÇAIS":"ENGLISH")+' · '+safe(p.locus)+'</h4><p lang="'+e.value+'">'+safe(p.translation||"Traducción no disponible para este pasaje.")+'</p></article>';
  q.setAttribute("aria-label","Buscar en "+(activeBook===0?"todos los libros":activeBook===-1?"todos los prefacios":"Libro "+activeBook)+" de la edición "+datasets[e.value].name);
 }
 populateBooks();drawPassages();
 b.addEventListener("change",()=>{activeBook=Number(b.value);activeIdx=0;drawPassages()});
 l.addEventListener("change",()=>{activeIdx=Number(l.value);show()});
 q.addEventListener("input",()=>{activeIdx=0;drawPassages()});
 $("cr-prev").addEventListener("click",()=>{activeIdx=Math.max(0,activeIdx-1);show()});
 $("cr-next").addEventListener("click",()=>{activeIdx=Math.min(filtered.length-1,activeIdx+1);show()});
 e.addEventListener("change",async()=>{const lang=e.value;summary.textContent="Cargando edición "+lang+"…";try{list=await load(lang);if(!target.isConnected)return;populateBooks();activeIdx=0;drawPassages();}catch(err){summary.textContent="Error de lectura: "+err.message}});
}catch(err){target.textContent="No fue posible cargar la edición del servidor: "+err.message}
}
return{mount};
})();