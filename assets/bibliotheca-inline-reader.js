/* Bibliotheca: lightweight in-page corpus reader, with no PDF/iframe dependency.
   Each column retrieves its own complete registered text. */
window.BibliothecaInlineReader=(()=>{
"use strict";
const languageNames={grc:"Griego original",la:"Latín original",en:"English · traducción",es:"Castellano · traducción",fr:"Français · traduction",it:"Italiano",de:"Deutsch",pt:"Português"};
const cache=new Map();
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase();
function mount(root,work){
 root.replaceChildren();
 const files=Object.entries(work.corpusFiles||{}).filter(([language,path])=>
  languageNames[language]&&/^data\/classics-corpus\/[a-z0-9-]+\.json$/.test(path)&&
  path===("data/classics-corpus/"+work.id+"-"+language+".json"));
 const intro=document.createElement("p");intro.className="classic-ref";
 intro.textContent="Lectura textual ligera: original y traducciones en columnas independientes. No se descargan PDF ni facsímiles; los loci iguales no certifican alineación filológica.";
 root.append(intro);
 if(!files.length){const p=document.createElement("p");p.textContent="Solo existe ficha bibliográfica; no hay transcripciones verificadas disponibles.";root.append(p);return}
 const all=Object.fromEntries(files);
 const original=files.find(([l])=>l==="grc"||l==="la")?.[0]||files[0][0];
 const translation=files.find(([l])=>!["grc","la"].includes(l))?.[0]||original;
 const grid=document.createElement("div");grid.className="classic-compare-panes";root.append(grid);
 const open=document.createElement("a");open.href="lector-textual-rapido.html?work="+encodeURIComponent(work.id);
 open.textContent="Abrir lector independiente en pantalla completa";
 open.style.cssText="display:inline-block;margin:10px 0;padding:9px;border:1px solid #ad9674";
 root.append(open);
 const ordered=[original,translation];
 async function get(lang){
  const key=work.id+"|"+lang;
  if(!cache.has(key))cache.set(key,fetch(all[lang]).then(r=>{
   if(!r.ok)throw Error("HTTP "+r.status);return r.json();
  }).then(j=>{
   if(j.workId!==work.id||j.language!==lang||!Array.isArray(j.passages)||!j.passages.length)
     throw Error("Archivo sin texto verificado");
   return j;
  }).catch(e=>{cache.delete(key);throw e}));
  return cache.get(key);
 }
 for(let n=0;n<Math.min(2,files.length);n++){
  const section=document.createElement("section");section.className="classic-inline-text";
  section.style.cssText="min-width:0;background:#fffdf8;color:#20384b;border:1px solid #ad9d82;padding:12px";
  const heading=document.createElement("strong");heading.textContent=n?"Traducción / segunda versión":"Original / primera versión";
  heading.style.cssText="display:block;margin-bottom:8px;font:600 14px system-ui";
  const languages=document.createElement("select");languages.setAttribute("aria-label",n?"Idioma del visor derecho":"Idioma del visor izquierdo");
  for(const [lang] of files){const o=document.createElement("option");o.value=lang;o.textContent=languageNames[lang];languages.append(o)}
  languages.value=ordered[n];languages.style.cssText="width:100%;padding:10px;margin-bottom:8px;background:white;color:#20384b;border:1px solid #9c886b";
  const row=document.createElement("div");row.style.cssText="display:flex;gap:7px;margin-bottom:8px";
  const prev=document.createElement("button");prev.type="button";prev.textContent="←";
  const select=document.createElement("select");select.setAttribute("aria-label","Capítulo o locus");select.style.cssText="min-width:0;flex:1;padding:8px;background:#fff;color:#20384b";
  const next=document.createElement("button");next.type="button";next.textContent="→";
  for(const b of [prev,next])b.style.cssText="padding:7px 12px;background:#254157;color:white;border:0;cursor:pointer";
  row.append(prev,select,next);
  const query=document.createElement("input");query.type="search";query.placeholder="Buscar en esta versión · Enter";query.setAttribute("aria-label","Buscar en el texto");
  query.style.cssText="width:100%;min-width:0;padding:9px;margin-bottom:8px;background:white;color:#20384b;border:1px solid #9c886b";
  const status=document.createElement("p");status.setAttribute("role","status");status.style.cssText="min-height:22px;font:12px/1.4 system-ui";
  const page=document.createElement("div");page.style.cssText="height:56vh;min-height:300px;overflow:auto;padding:12px;border:1px solid #ddcfba;background:#fffdfa;color:#20384b;font:19px/1.75 Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere";
  const citation=document.createElement("p");citation.style.cssText="font:12px/1.5 system-ui;overflow-wrap:anywhere";
  section.append(heading,languages,row,query,status,page,citation);grid.append(section);
  let pages=[],current=0,request=0;
  function display(){
   const p=pages[current];if(!p)return;
   page.textContent=p.text;page.lang=languages.value;page.scrollTop=0;
   select.value=String(current);prev.disabled=current===0;next.disabled=current===pages.length-1;
   status.textContent="Locus "+(p.locus||current+1)+" · "+(current+1)+" / "+pages.length;
  }
  async function load(){
   const ticket=++request,lang=languages.value;pages=[];page.textContent="";status.textContent="Cargando "+languageNames[lang]+"…";
   try{
    const d=await get(lang);if(ticket!==request||!section.isConnected)return;
    pages=d.passages.filter(x=>x&&typeof x.text==="string"&&x.text.trim().length);
    if(!pages.length)throw Error("No se encontraron pasajes con texto.");
    current=0;select.replaceChildren();
    pages.forEach((p,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=p.locus||String(i+1);select.append(o)});
    citation.textContent=(d.attribution||"Fuente documental")+". "+(d.alignment||"Sin alineación verificada");
    display();
   }catch(err){if(ticket!==request)return;status.textContent="No se pudo cargar esta versión ("+err.message+").";page.textContent="Seleccione otra versión o consulte el lector independiente."}
  }
  languages.addEventListener("change",load);
  select.addEventListener("change",()=>{current=Number(select.value)||0;display()});
  prev.addEventListener("click",()=>{current=Math.max(0,current-1);display()});
  next.addEventListener("click",()=>{current=Math.min(pages.length-1,current+1);display()});
  query.addEventListener("keydown",e=>{
   if(e.key!=="Enter")return;e.preventDefault();const q=fold(query.value.trim());if(!q)return;
   const found=pages.findIndex(p=>fold(p.text).includes(q));
   if(found<0){status.textContent="No hay coincidencias en esta versión.";return}
   current=found;display();status.textContent+=" · término localizado";
  });
  load();
 }
}
return {mount};
})();
