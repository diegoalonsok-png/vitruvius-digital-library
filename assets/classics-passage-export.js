/* Exportación conservadora de pasajes: toma únicamente el texto VISIBLE y la
   referencia indicada por el lector; no inventa CTS ni texto de una edición. */
(()=>{
"use strict";
const host=document.querySelector(".reader-toolbar");
const passage=document.getElementById("passages");
if(!host||!passage)return;
const wrap=document.createElement("span");
wrap.className="vdl-export-actions";
wrap.style.cssText="display:inline-flex;gap:6px;flex-wrap:wrap;align-items:center";
const make=(label)=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.style.cssText="font:12px/1.4 system-ui;padding:7px 10px;cursor:pointer;border:1px solid #777;border-radius:6px;background:transparent;color:inherit";wrap.append(b);return b};
const copy=make("Copiar pasaje");
const txt=make("Exportar TXT");
const status=document.createElement("span");status.setAttribute("role","status");status.setAttribute("aria-live","polite");status.style.cssText="font:11px system-ui;max-width:220px";wrap.append(status);
host.append(wrap);
const clean=s=>String(s||"").replace(/\s+/gu," ").trim();
const snapshot=()=>{
 const text=clean(passage.innerText||passage.textContent);
 if(!text)return null;
 const q=new URLSearchParams(location.search);
 const locus=clean(document.getElementById("current-locus")?.textContent)||q.get("locus")||"Sin locus confirmado";
 const work=q.get("work")||"obra no identificada";
 const language=document.getElementById("language")?.value||q.get("lang")||"no declarado";
 const attribution=clean(document.getElementById("attribution")?.textContent);
 return {text,locus,work,language,attribution,source:location.href};
};
const serialize=x=>[
 "Vitruvius Digital Library — pasaje visible",
 "Obra: "+x.work,
 "Edición/idioma seleccionado: "+x.language,
 "Referencia mostrada: "+x.locus,
 "URL del lector: "+x.source,
 x.attribution?"Atribución mostrada: "+x.attribution:"",
 "Nota: exportación de la visualización actual; no es transcripción diplomática ni cotejo crítico.",
 "",
 x.text
].filter((v,i)=>v!==""||i>5).join("\n");
copy.addEventListener("click",async()=>{
 const x=snapshot();if(!x){status.textContent="No hay texto visible para copiar.";return}
 try{await navigator.clipboard.writeText(serialize(x));status.textContent="Pasaje y referencia copiados."}
 catch{status.textContent="No se pudo copiar; utilizá Exportar TXT."}
});
txt.addEventListener("click",()=>{
 const x=snapshot();if(!x){status.textContent="No hay texto visible para exportar.";return}
 const blob=new Blob([serialize(x)],{type:"text/plain;charset=utf-8"});
 const u=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=u;a.download="vitruvius-"+x.work.replace(/[^a-z0-9-]/g,"")+"-pasaje.txt";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);
 status.textContent="Exportación TXT generada.";
});
})();
