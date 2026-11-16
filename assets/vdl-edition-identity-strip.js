/* Edition-identification strip shared by Vitruvian editorial readers.
   Bibliographic source of truth: data/catalog.json. Manuscript/ancient-author
   identities must NOT be conflated with Kurilo's editorial editions. */
(()=>{"use strict";
if(window.__vdlEditionIdentityLoaded)return;
window.__vdlEditionIdentityLoaded=true;
if(window.top!==window.self||new URLSearchParams(location.search).get("embed")==="1")return;
const page=(location.pathname.split("/").pop()||"index.html").replace(/\.html$/i,"");
const targets=new Set([
 "lector-bilingue","comparador-loci","aparato-critico","apparatus-bude",
 "aparato-comparativo","colacion","registro-ecdotico","cobertura-aparato-critico",
 "lector-critico","loci","indices-locorum","index-locorum","commentarius-perpetuus",
 "conspectus-testimoniorum","quaestio-philologica","vitruvia"
]);
if(!targets.has(page))return;
const make=(tag,text,parent,cls)=>{const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=text;if(cls)n.className=cls;if(parent)parent.append(n);return n;};
async function init(){
 const main=document.querySelector("main");if(!main||document.getElementById("vdl-identity-strip"))return;
 const strip=make("section",null,null,"vdl-identity-strip");strip.id="vdl-identity-strip";
 strip.setAttribute("aria-label","Identificación bibliográfica de las tres ediciones de Diego Kurilo");
 const heading=make("strong","Ediciones de Diego Kurilo · Arquitecto",strip,"vdl-identity-heading");
 make("span"," · datos editoriales del catálogo",heading);
 const list=make("div",null,strip,"vdl-identity-items");
 const status=make("span","Cargando títulos, DOI e ISBN…",list);
 const details=make("details",null,strip,"vdl-identity-method");
 make("summary","Citas Chicago 18 y notas del ISBN",details);
 const method=make("div",null,details);
 const css=document.createElement("style");css.id="vdl-identity-strip-style";css.textContent=[
 ".vdl-identity-strip{margin:9px auto 13px;padding:8px 10px;border:1px solid #9a947d88;border-radius:6px;background:rgba(140,130,110,.045);font:11px/1.4 system-ui,sans-serif;color:inherit;max-width:1200px;overflow-wrap:anywhere}",
 ".vdl-identity-heading{display:block;margin-bottom:4px;font-size:11px}",
 ".vdl-identity-heading span{font-weight:400;opacity:.72}",
 ".vdl-identity-items{display:flex;flex-wrap:wrap;gap:5px 15px;align-items:baseline}",
 ".vdl-identity-item{display:inline-block;flex:1 1 270px;min-width:230px}",
 ".vdl-identity-item cite{font-style:italic;font-weight:600}",
 ".vdl-identity-item a{color:inherit;text-decoration:underline;text-underline-offset:2px}",
 ".vdl-identity-item small{font-size:10px;opacity:.85}",
 ".vdl-identity-method{margin-top:4px;font-size:10px}",
 ".vdl-identity-method summary{cursor:pointer}",
 ".vdl-identity-method p{margin:5px 0}",
 "@media(max-width:700px){.vdl-identity-items{display:block}.vdl-identity-item{display:block;padding:3px 0}}"
 ].join("\n");document.head.append(css);
 const insertion=main.querySelector("h1")||main.firstElementChild;
 if(insertion&&insertion.parentElement===main)insertion.insertAdjacentElement("afterend",strip);
 else main.insertAdjacentElement("afterbegin",strip);
 try{
  const response=await fetch("data/catalog.json",{cache:"no-cache"});
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json();
  const ids=["recensio-es","recensio-fr","theory-en"];
  const editions=ids.map(id=>(data.editions||[]).find(e=>e.id===id));
  if(editions.some(x=>!x))throw Error("Una o más fichas editoriales faltan");
  list.replaceChildren();
  for(const b of editions){
   const row=make("span",null,list,"vdl-identity-item");
   const code=make("b",b.version+": ",row);code.title=b.edition_statement||"";
   make("cite",b.bibliographic_title||b.title,row);
   row.append(" · ");
   if(b.doi){const a=make("a","DOI "+b.doi,row);a.href="https://doi.org/"+b.doi;a.rel="noopener noreferrer";}
   if(b.isbn)row.append(" · ISBN "+b.isbn+"*");
   const note=make("p",null,method);
   const author=b.bibliographic_author||"Kurilo, Diego";
   note.append(author+". ");
   make("i",b.bibliographic_title||b.title,note);
   note.append(". "+(b.edition_statement||"")+". "+(b.publication_place||"Buenos Aires")+": "+(b.publisher||"Editorial no consignada")+", "+(b.year||"s. f.")+".");
   if(b.doi){note.append(" DOI: ");const a=make("a","https://doi.org/"+b.doi,note);a.href="https://doi.org/"+b.doi;}
  }
  make("p","* ISBN 978-631-01-6651-3 declarado como compartido entre las tres ediciones por la editorial; la asignación registral individual todavía no está verificada. El autor de De architectura es Marco Vitruvio Polión; Diego Kurilo · Arquitecto es el responsable de estas ediciones, traducciones y comentarios.",method);
 }catch(e){
  status.textContent="No fue posible consultar data/catalog.json: identificadores no verificables en esta carga.";
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();