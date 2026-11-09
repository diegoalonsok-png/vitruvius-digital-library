/* Scholarly search permalink and citation tools shared by Vitruvius, Vitruvia,
 * Lexicon, Bibliotheca and Index locorum. Progressive enhancement only.
 * This exports a search citation, NOT an unverified classical passage or manuscript DOI.
 */
(()=>{"use strict";
 const configs={
  "index.html":{input:"query",form:"search-form",label:"Biblioteca · concordancias"},
  "vitruvia.html":{input:"query",form:"search-form",label:"Vitruvia · búsqueda general"},
  "vitruvia-lexicon.html":{input:"lx-q",form:null,label:"Lexicon · investigación léxica"},
  "bibliotheca-graeca-latina.html":{input:"classic-query",form:"search-form",label:"Bibliotheca · corpus clásico"},
  "index-locorum.html":{input:"query",form:"form",label:"Index locorum · concordancias"}
 };
 const page=location.pathname.split("/").pop()||"index.html";
 const config=configs[page];
 if(!config)return;
 const input=document.getElementById(config.input);
 const anchor=(config.form&&document.getElementById(config.form))||input?.closest("form")||input;
 if(!input||!anchor||document.getElementById("scholarly-query-tools"))return;
 const wrap=document.createElement("section");wrap.id="scholarly-query-tools";
 wrap.className="scholarly-query-tools";wrap.setAttribute("aria-label","Enlace y cita de la búsqueda académica");
 wrap.style.cssText="margin:12px 0 18px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;color:inherit;font:12px/1.5 system-ui,sans-serif";
 const button=(text,callback)=>{
  const b=document.createElement("button");b.type="button";b.textContent=text;
  b.style.cssText="font:inherit;cursor:pointer;border:1px solid #686970;border-radius:8px;background:#222326;color:#f1f1f1;padding:8px 11px";
  b.addEventListener("click",callback);wrap.appendChild(b);return b;
 };
 const makeLink=(text,href)=>{
  const a=document.createElement("a");a.textContent=text;a.href=href;
  a.style.cssText="color:inherit;font:inherit;text-decoration:underline;text-underline-offset:3px;margin-left:3px";
  wrap.appendChild(a);return a;
 };
 const status=document.createElement("span");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 status.style.cssText="font-size:11px;opacity:.82";
 function url(){
  const u=new URL(location.href);
  const q=String(input.value||"").trim();
  if(q)u.searchParams.set("q",q);
  else u.searchParams.delete("q");
  // A search permalink does not promise to preserve interface-only filters.
  if(page==="index.html")u.hash="buscar";
  else if(page==="vitruvia-lexicon.html")u.hash="results";
  else if(page==="vitruvia.html")u.hash="results";
  return u.href;
 }
 async function copy(value,b){
  try{
   if(!navigator.clipboard?.writeText)throw Error("Clipboard unavailable");
   await navigator.clipboard.writeText(value);
   status.textContent="Copiado al portapapeles";b.setAttribute("aria-describedby",status.id);
  }catch{
   status.textContent="Copiá el texto del cuadro";
   window.prompt("Copiar:",value);
  }
 }
 status.id="scholarly-query-status";
 button("Copiar enlace de búsqueda",function(){copy(url(),this)});
 button("Copiar referencia",function(){
  const q=String(input.value||"").trim();
  const date=new Intl.DateTimeFormat("es-AR",{year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const cite=["Kurilo, Diego A., ed. Vitruvius Digital Library: "+config.label+".",
   q?'Consulta: «'+q+'».':'Página de búsqueda académica.',
   "Biblioteca digital (consulta "+date+").",
   "DOI del portal: https://doi.org/10.5281/zenodo.23868911.",
   "URL: "+url(),
   "Nota: esta referencia identifica la interfaz consultada; las citas de pasajes requieren autor antiguo, locus, edición concreta y su propio DOI cuando exista."
  ].join("\n");
  copy(cite,this);
 });
 makeLink("Cómo citar","como-citar.html");
 makeLink("Procedencia y cobertura","control-calidad-corpus.html");
 wrap.appendChild(status);
 anchor.insertAdjacentElement("afterend",wrap);
})();
