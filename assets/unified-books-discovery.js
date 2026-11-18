/* Shared books-and-facsimiles discoverability in Bibliotheca and Vitruvia.
 * Matches available local readers and PDFs; catalogue presence never implies full text.
 */
(()=>{"use strict";
const byId=id=>document.getElementById(id);
const fold=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").replace(/ς/g,"σ").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const maker=(tag,t)=>{const n=document.createElement(tag);if(t!=null)n.textContent=String(t);return n};
const aliases=Object.freeze({"julio cesar":"caesar","julius caesar":"caesar","jules cesar":"caesar","cayo julio cesar":"caesar","cesarin":"cesariano","cesarino":"cesariano","caesarianus":"cesariano"});
const safe=(raw,allowRemotePdf=false)=>{try{const u=new URL(String(raw||""),location.href);if(u.origin===location.origin&&/\/[a-z0-9/_-]+\.html$/i.test(u.pathname))return u.pathname+u.search+u.hash;if(allowRemotePdf&&u.origin==="https://libros.vitruvius-digital-library.org"&&/\.pdf$/i.test(u.pathname))return u.href;return ""}catch{return ""}};
const makeData=async()=>{
 const paths=["data/architecture-heritage-search.json","data/classics-corpus/search-registry.json","data/r2/catalogo-clasicos-r2.json","data/vitruvia-codices.json"];
 const data=await Promise.all(paths.map(async path=>{try{const r=await fetch(path);if(!r.ok)throw Error("HTTP "+r.status);return await r.json()}catch{return null}}));
 const out=new Map(),errors=paths.filter((_,i)=>!data[i]);
 const put=(id,source)=>{if(!id||!source)return null;let w=out.get(id);if(!w){w={id,title:source.title||"",author:source.author||"",aliases:[],access:[],sourceTypes:new Set()};out.set(id,w)}return w};
 for(const x of data[0]?.records||[]){const w=put("hist:"+x.id,x);if(!w)continue;w.title=x.title;w.author=x.author;w.aliases.push(...(x.aliases||[]),String(x.year||""));const link=safe(x.reader);if(link)w.access.push({url:link,label:"Abrir visor histórico · "+x.year,type:"facsimile"});w.sourceTypes.add("historic");}
 for(const x of data[1]?.entries||[]){const w=put("text:"+x.workId,x);if(!w)continue;w.title||=x.title||"";w.author||=x.author||"";if(x.title)w.aliases.push(x.title);const link=safe(x.reader);if(link&&!w.access.some(a=>a.url===link))w.access.push({url:link,label:"Leer "+({la:"latín",grc:"griego",es:"castellano",en:"inglés",fr:"francés"}[x.language]||x.language),type:"text",language:x.language});w.sourceTypes.add("text");}
 for(const x of data[3]?.records||[]){
  if(x.group!=="vitruvian")continue;
  const w=put("codex:"+x.id,{title:x.title,author:"Vitruvio"});if(!w)continue;
  w.aliases.push(...(x.aliases||[]),"Vitruvio","De architectura");
  const local=safe(x.reader);if(local)w.access.push({url:local,label:"Consultar códice · "+(x.date||""),type:"codex"});
  if(typeof x.source==="string"&&/^https:\/\//.test(x.source))w.access.push({url:x.source,label:"Ficha institucional del manuscrito",type:"source"});
  w.sourceTypes.add("codex");
 }
 for(const x of data[2]?.items||[]){const key="r2:"+x.id,w=put(key,{title:x.obra,author:x.autor});if(!w)continue;w.aliases.push(x.tituloEdicion||"",x.editor||"");const link=safe(x.pdf,true);if(link)w.access.push({url:link,label:"Consultar PDF facsimilar",type:"facsimile"});w.sourceTypes.add("r2");}
 return {works:[...out.values()],errors};
};
let store=null;
const fetchData=()=>store||(store=makeData().catch(e=>{store=null;throw e}));
const match=(x,q)=>{
 const key=fold(q),canonical=aliases[key]||key;
 if(key.length<2)return 0;
 const name=fold(x.author),title=fold(x.title),id=fold(x.id),other=x.aliases.map(fold);
 if(name===key||title===key)return 100;
 if(other.includes(key))return 94;
 if(name.includes(key)||title.includes(key))return 74;
 if(id.includes(canonical)||name.includes(canonical)||title.includes(canonical))return 65;
 if(other.some(a=>a.includes(key)||a.includes(canonical)))return 55;
 return 0;
};
function mount(root,queryInput){
 if(!root||!queryInput||root.querySelector(".vdl-unified-books"))return;
 const panel=maker("section");panel.className="vdl-unified-books";
 panel.setAttribute("aria-label","Catálogo unificado de libros y facsímiles");
 const h=maker("h3","Libros y visores de toda la biblioteca");
 const intro=maker("p","Busca autores y obras del corpus clásico, tratados de arquitectura y facsímiles históricos. Los resultados distinguen texto legible, PDF y visor histórico; un facsímil no equivale a una transcripción indexada.");
 const form=maker("form");form.setAttribute("role","search");
 const input=maker("input");input.type="search";input.maxLength=160;input.placeholder="Cesariano · Cesarin · Palladio · Julio César · Ἰλιάς";input.setAttribute("aria-label","Buscar todos los libros de la biblioteca");
 const go=maker("button","Buscar libros");go.type="submit";form.append(input,go);
 const status=maker("p");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 const lexLink=maker("a","Ver pasajes y lemas en Lexicon");lexLink.hidden=true;
 lexLink.style.cssText="display:inline-block;margin:7px 0 13px;text-decoration:underline;text-underline-offset:3px";
 const viewer=maker("section");viewer.className="vdl-inline-academic-reader";viewer.hidden=true;
 viewer.setAttribute("aria-label","Lectura académica dentro de Vitruvia");
 const viewerTitle=maker("h4","Lectura académica · Bibliotheca");
 const closeViewer=maker("button","Cerrar lectura");closeViewer.type="button";
 const frame=maker("iframe");frame.title="Visor académico oficial de Bibliotheca";frame.loading="lazy";
 frame.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
 frame.style.cssText="display:block;width:100%;height:min(75vh,760px);min-height:380px;border:1px solid #777;border-radius:6px;background:#101010";
 closeViewer.addEventListener("click",()=>{viewer.hidden=true;frame.removeAttribute("src")});
 viewer.append(viewerTitle,closeViewer,frame);
 const openHere=(url,title)=>{const u=new URL(url,location.href);if(u.origin!==location.origin)return;viewerTitle.textContent="Lectura académica · "+title;frame.src=u.href;viewer.hidden=false;viewer.scrollIntoView({block:"start",behavior:"smooth"})};
 const list=maker("ol");const more=maker("button","Mostrar más libros");more.type="button";more.hidden=true;
 panel.append(h,intro,form,status,lexLink,viewer,list,more);root.append(panel);
 let all=[],visible=0,current=0;
 function render(){
  for(const w of all.slice(visible,visible+12)){
   const item=maker("li"),title=maker("strong",[w.author,w.title].filter(Boolean).join(" · "));item.append(title);
   const kind=maker("p",w.sourceTypes.has("codex")?"Códice o manuscrito histórico":w.sourceTypes.has("historic")?"Visor de edición histórica":w.sourceTypes.has("text")?"Texto digital indexado":"Facsímil PDF de catálogo");item.append(kind);
   const nav=maker("nav");
   if(w.id.startsWith("text:")){
    const editions=w.access.filter(a=>a.type==="text"&&/classics-text-reader\.html\?/.test(a.url));
    const original=editions.find(a=>["grc","la"].includes(a.language))||editions[0];
    if(original){const read=maker("button","Leer aquí · visor académico");read.type="button";read.addEventListener("click",()=>{
     const url=new URL(original.url,location.href);
     if(["grc","la"].includes(original.language)){
      const available=["es","en","fr"].find(lang=>editions.some(e=>e.language===lang));
      url.searchParams.set("to",available||"es");
     }
     openHere(url.pathname+url.search,[w.author,w.title].filter(Boolean).join(" · "));
    });nav.append(read)}
   }
   for(const a of w.access.slice(0,5)){const link=maker("a",a.label);link.href=a.url;if(/^https:\/\//.test(link.href)&&new URL(link.href).origin!==location.origin){link.target="_blank";link.rel="noopener noreferrer"}nav.append(link)}
   if(w.id.startsWith("text:")){const ref=maker("a","Ficha académica");ref.href="classics-work-record.html?work="+encodeURIComponent(w.id.slice(5));nav.append(ref)}
   item.append(nav);list.append(item);
  }
  visible=Math.min(all.length,visible+12);more.hidden=visible>=all.length;
 }
 more.addEventListener("click",render);
 async function run(e){
  e?.preventDefault();const id=++current,q=input.value.trim();lexLink.hidden=fold(q).length<2;lexLink.href="vitruvia-lexicon.html?q="+encodeURIComponent(q)+"&mode=palabra&lang=es";list.replaceChildren();visible=0;all=[];more.hidden=true;viewer.hidden=true;frame.removeAttribute("src");
  if(fold(q).length<2){status.textContent="Escriba al menos dos caracteres.";return}
  status.textContent="Consultando registros internos de textos y visores…";go.disabled=true;
  try{const data=await fetchData();if(id!==current)return;
   all=data.works.map(x=>({x,score:match(x,q)})).filter(r=>r.score>0).sort((a,b)=>b.score-a.score).map(r=>r.x);
   status.textContent=all.length+" registros encontrados"+(data.errors.length?" · Catálogo parcial: fuente no disponible ("+data.errors.join(", ")+").":"")+". Los facsímiles no se cuentan como textos íntegros indexados.";
   if(!all.length)list.append(maker("li","Sin coincidencias en los registros disponibles. Revise la grafía; el resultado no prueba ausencia en el sitio."));
   else render();
  }catch{if(id===current)status.textContent="No fue posible verificar el índice; no se pueden descartar obras."}
  finally{if(id===current)go.disabled=false}
 }
 form.addEventListener("submit",run);
 const globalForm=document.getElementById("search-form");
 const globalInput=document.getElementById("classic-query")||document.getElementById("query");
 if(globalForm&&globalInput){
  globalForm.addEventListener("submit",()=>{
   const value=globalInput.value.trim();
   if(fold(value).length<2)return;
   input.value=value;
   void run();
  });
 }
 const advancedForm=document.getElementById("bws-query")?.closest("form");
 if(advancedForm)advancedForm.addEventListener("submit",()=>{
  const value=document.getElementById("bws-query").value.trim();
  if(fold(value).length<2)return;
  input.value=value;void run();
 });
 const main=document.querySelector("body");
 if(main?.classList.contains("vitruvia")){} // no dependencies on theme
 const params=new URLSearchParams(location.search);
 const sourceQuery=params.get("q")||params.get("work-query")||"";
 if(sourceQuery){input.value=sourceQuery;void run()}
 // Original form remains usable; this field can be operated independently.
}
function init(){
 const bibliography=document.querySelector(".searcharea");
 const mainSearch=document.getElementById("search-form");
 if(bibliography)mount(bibliography,null);
 else if(mainSearch){const host=maker("div");host.id="vdl-all-books-host";mainSearch.insertAdjacentElement("afterend",host);mount(host,null);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();