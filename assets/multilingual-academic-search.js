/* Consulta interlingüística documentada: griego antiguo, griego moderno,
 * latín, hebreo y arameo. Las equivalencias Conceptus no son pasajes.
 * No afirma que existan corpus en idiomas sin transcripción alojada. */
(()=>{
"use strict";
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn,{once:true}):fn()}
ready(()=>{
 const page=location.pathname.split("/").pop();
 if(!["vitruvia.html","vitruvia-lexicon.html"].includes(page))return;
 const input=document.getElementById(page==="vitruvia.html"?"query":"lx-q");
 const form=document.getElementById(page==="vitruvia.html"?"search-form":"lx-form");
 if(!input||!form)return;
 const panel=document.createElement("section");panel.id="multilingual-academic-search";
 panel.style.cssText="margin:12px 0;padding:15px 18px;border:1px solid #998667;border-radius:14px;background:var(--surface,#1c252e);color:inherit;font:13px/1.6 system-ui,sans-serif;max-width:1100px;box-shadow:0 3px 16px rgba(0,0,0,.08)";
 const head=document.createElement("div");head.style.cssText="display:flex;gap:10px;flex-wrap:wrap;align-items:center";
 const label=document.createElement("strong");label.textContent="Consulta filológica multilingüe";label.style.cssText="font:700 15px/1.5 system-ui,sans-serif";
 const button=document.createElement("button");button.type="button";button.textContent="Buscar equivalencias documentadas";button.style.cssText="padding:10px 14px;border:1px solid #b59a6e;border-radius:9px;background:#29475e;color:white;cursor:pointer;font:650 13px system-ui,sans-serif;min-height:40px";
 const note=document.createElement("span");note.textContent="Griego antiguo · latín · hebreo · arameo";note.style.cssText="opacity:.77;font:12px/1.5 system-ui,sans-serif";
 head.append(label,button,note);
 const status=document.createElement("p");status.setAttribute("role","status");status.style.margin="8px 0 0";
 const results=document.createElement("div");results.style.cssText="display:grid;gap:8px;margin-top:9px";
 panel.append(head,status,results);form.after(panel);
 const finalForms={"ך":"כ","ם":"מ","ן":"נ","ף":"פ","ץ":"צ"};
 const norm=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLocaleLowerCase().replace(/ς/g,"σ").replace(/[ךםןףץ]/g,c=>finalForms[c]).trim();
 const termlist=c=>[c.id,...Object.values(c.modern||{}).flat(),...(c.la||[]),...(c.grc||[]),
  ...(c.he||[]).flatMap(x=>typeof x==="string"?[x]:[x.w,x.tr]),
  ...(c.arc||[]).flatMap(x=>typeof x==="string"?[x]:[x.w,x.tr])].filter(x=>typeof x==="string"&&x.trim());
 const oldScripts=/[\u0590-\u05ff]/u,greek=/[\u0370-\u03ff\u1f00-\u1fff]/u;
 let dictionary=null,loading=null;
 async function getDictionary(){
  if(dictionary)return dictionary;
  if(!loading)loading=fetch("data/lexicon/conceptus.json").then(r=>{if(!r.ok)throw Error("HTTP "+r.status);return r.json()}).then(d=>{
   if(!Array.isArray(d.concepts))throw Error("Diccionario Conceptus inválido");
   dictionary=d.concepts;return dictionary;
  }).catch(e=>{loading=null;throw e});
  return loading;
 }
 function link(href,title){const a=document.createElement("a");a.href=href;a.textContent=title;a.style.cssText="display:inline-block;margin-right:12px;color:inherit;text-decoration:underline";return a}
 function field(card,label,values,language){
  if(!values?.length)return;
  const line=document.createElement("p");line.style.margin="5px 0";
  const strong=document.createElement("strong");strong.textContent=label+": ";line.append(strong);
  const words=values.map(x=>typeof x==="string"?x:x.w||"").filter(Boolean);
  const span=document.createElement("span");span.textContent=words.join(" · ");if(language)span.lang=language;line.append(span);card.append(line);
 }
 let serial=0;
 async function run(){
  const q=input.value.trim(),id=++serial;results.replaceChildren();
  if(!q){status.textContent="Escriba una palabra en el buscador principal.";return}
  status.textContent="Consultando las equivalencias registradas…";
  try{
   const records=await getDictionary();if(id!==serial)return;
   const key=norm(q);
   const exact=records.filter(c=>termlist(c).some(t=>norm(t)===key));
   const matched=exact.slice(0,8);
   results.replaceChildren();
   if(!matched.length){status.textContent="No hay equivalencia registrada en Conceptus para esta forma. Esto no implica que la palabra no exista; el corpus multilingüe todavía es parcial.";return}
   status.textContent=matched.length+" ficha(s) de concepto documentado. Griego moderno, hebreo y arameo: consulta lexicográfica, no concordancia textual certificada.";
   for(const c of matched){
    const card=document.createElement("article");card.style.cssText="padding:13px 15px;border:1px solid #a69476;border-radius:10px;background:rgba(127,137,147,.06)";
    const h=document.createElement("strong");h.textContent="Conceptus · "+c.id;card.append(h);
    field(card,"Latín",c.la,"la");field(card,"Griego antiguo",c.grc,"grc");
    field(card,"Hebreo",c.he,"he");field(card,"Arameo",c.arc,"arc");
    const modern=document.createElement("p");modern.style.margin="5px 0";
    modern.textContent="Griego moderno: sin equivalencia editorial independiente registrada en esta ficha; no confundir automáticamente con griego antiguo.";card.append(modern);
    if(c.note){const p=document.createElement("p");p.textContent=c.note;p.style.opacity=".85";card.append(p)}
    const nav=document.createElement("div");
    nav.append(link("vitruvia-lexicon.html?q="+encodeURIComponent(q)+"&mode=palabra","Estudiar forma en Lexicon"),
      link("index-locorum.html?concept="+encodeURIComponent(c.id),"Loci documentados"),
      link("bibliotheca-graeca-latina.html?term="+encodeURIComponent(q),"Buscar textos alojados"));
    card.append(nav);results.append(card);
   }
  }catch(e){if(id===serial)status.textContent="No se pudo cargar Conceptus: "+e.message}
 }
 button.addEventListener("click",run);
 form.addEventListener("submit",()=>{if(oldScripts.test(input.value)||greek.test(input.value))run()});
 input.addEventListener("input",()=>{serial++;status.textContent="";results.replaceChildren()});
 if(oldScripts.test(new URLSearchParams(location.search).get("q")||"")||greek.test(new URLSearchParams(location.search).get("q")||"")){
  // No carga masiva: la consulta sigue siendo bajo demanda.
  status.textContent="Puede consultar también equivalencias griegas, hebreas y arameas documentadas.";
 }
});
})();