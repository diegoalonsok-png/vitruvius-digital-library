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
 const syncBar=document.createElement("div");
 syncBar.style.cssText="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px;background:#f0e6d3;border:1px solid #b9a887;margin:8px 0";
 const syncLabel=document.createElement("label");
 const syncCheck=document.createElement("input");syncCheck.type="checkbox";syncCheck.checked=true;
 syncLabel.append(syncCheck,document.createTextNode(" Sincronizar por locus idéntico"));
 const syncMessage=document.createElement("span");syncMessage.setAttribute("role","status");
 syncMessage.style.cssText="font:12px/1.5 system-ui";
 syncMessage.textContent="La sincronización se realiza solo con identificadores coincidentes; no se fuerzan correspondencias.";
 syncBar.append(syncLabel,syncMessage);root.append(syncBar);
 const grid=document.createElement("div");grid.className="classic-compare-panes";root.append(grid);
 const controllers=[];
 let syncBusy=false;
 function align(source){
  if(!syncCheck.checked||syncBusy||controllers.length<2)return;
  const target=controllers.find(c=>c!==source);
  const locus=source.getLocus();
  if(!locus||!target)return;
  const result=target.seek(locus);
  if(result){
   syncMessage.textContent="Locus "+locus+" en ambas versiones · correspondencia estructural, sin cotejo textual certificado.";
  }else{
   syncMessage.textContent="Sin locus idéntico para "+locus+" en la otra edición; ambos textos íntegros permanecen disponibles para comparación independiente.";
  }
 }

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
  const controller={
   getLocus:()=>pages[current]?.locus||"",
   seek:locus=>{
    const index=pages.findIndex(p=>String(p.locus||"").trim()===String(locus).trim());
    if(index<0)return false;
    syncBusy=true;current=index;display();syncBusy=false;return true;
   }
  };
  controllers.push(controller);
  function moved(){display();align(controller);}
  const mode=document.createElement("select");
  mode.setAttribute("aria-label","Tipo de búsqueda textual");
  for(const [value,label] of [["literal","Palabra o frase · literal"],["lexical","Léxica · variantes gráficas"],["semantic","Semántica · Conceptus editorial"]]){
   const o=document.createElement("option");o.value=value;o.textContent=label;mode.append(o);
  }
  mode.style.cssText="width:100%;padding:7px;margin:0 0 8px;background:#fff;color:#20384b";
  section.insertBefore(mode,query);
  let conceptsTask=null;
  async function semanticTerms(q){
   if(!conceptsTask)conceptsTask=fetch("data/lexicon/conceptus.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(j=>j.concepts||[]);
   const concepts=await conceptsTask;
   const match=concepts.find(c=>[c.id,...Object.values(c.modern||{}).flat(),...(c.la||[]),...(c.grc||[])].some(v=>typeof v==="string"&&fold(v)===fold(q)));
   if(!match)return[];
   return (match[languages.value]||[]).filter(v=>typeof v==="string"&&v.length>2);
  }
  function hasTerm(text,term){
   const a=fold(text),b=fold(term);
   if(mode.value==="lexical"){
    const norm=v=>v.replace(/j/g,"i").replace(/v/g,"u").replace(/ς/g,"σ");
    return norm(a).includes(norm(b));
   }
   return a.includes(b);
  }

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
  select.addEventListener("change",()=>{current=Number(select.value)||0;moved()});
  prev.addEventListener("click",()=>{current=Math.max(0,current-1);moved()});
  next.addEventListener("click",()=>{current=Math.min(pages.length-1,current+1);moved()});
  query.addEventListener("keydown",async e=>{
   if(e.key!=="Enter")return;
   e.preventDefault();
   const q=query.value.trim();if(!q)return;
   let terms=[q];
   if(mode.value==="semantic"){
    status.textContent="Consultando equivalencias editoriales de Conceptus…";
    try{terms=await semanticTerms(q)}catch(err){status.textContent="Conceptus no disponible: "+err.message;return}
    if(!terms.length){status.textContent="Sin correspondencia editorial documentada para este término e idioma. No se inventan sinónimos.";return}
   }
   const found=pages.findIndex(p=>terms.some(term=>hasTerm(p.text,term)));
   if(found<0){status.textContent="No hay coincidencias en esta versión ("+mode.value+").";return}
   current=found;moved();
   status.textContent+=" · "+(mode.value==="semantic"?"equivalencia documentada en Conceptus":"coincidencia léxica/literal");
  });
  load();
 }
}
return {mount};
})();
