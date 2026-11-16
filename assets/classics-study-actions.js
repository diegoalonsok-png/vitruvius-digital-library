/* Herramientas compartidas de lectura: exporta únicamente el texto visible.
 * Los datos bibliográficos se leen de la página y la URL; no inventa citas CTS.
 * No modifica corpus, traducciones ni registros de ediciones.
 */
(()=>{
"use strict";
const isSimple=/classics-simple-parallel(?:\.html)?$/.test(location.pathname);
const isFacsimile=/buscador-facsimiles-clasicos(?:\.html)?$/.test(location.pathname);
if(!isSimple&&!isFacsimile)return;
const mount=isSimple?document.querySelector(".toolbar"):document.querySelector("#pager");
if(!mount)return;
const names=isSimple?{original:"left-text",translation:"right-text"}:{original:"folio",translation:"facing-translation"};
const el=(t,txt)=>{const node=document.createElement(t);if(txt!==undefined)node.textContent=txt;return node};
const tools=el("div");tools.className="vdl-study-actions";tools.setAttribute("role","group");tools.setAttribute("aria-label","Citar, analizar y descargar el texto visible");
tools.style.cssText="display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin:7px 0;padding:7px;border:1px solid #8887;border-radius:7px";
const action=(label,fn)=>{
 const btn=el("button",label);btn.type="button";btn.addEventListener("click",fn);
 btn.style.cssText="font:13px/1.4 system-ui;padding:7px 10px;background:transparent;color:inherit;border:1px solid #888;border-radius:6px;cursor:pointer";
 tools.append(btn);return btn
};
const status=el("span");status.setAttribute("role","status");status.setAttribute("aria-live","polite");status.style.cssText="font:12px/1.4 system-ui";
const clean=s=>String(s||"").replace(/\s+/gu," ").trim();
const source=()=>{
 const q=new URLSearchParams(location.search);
 const work=q.get("work")||q.get("obra")||document.getElementById("edition")?.value||"no identificada";
 const locus=isSimple?(document.getElementById("go-locus")?.value||q.get("locus")||"Locus no confirmado"):
  "Página digital "+(document.getElementById("pageno")?.value||"no indicada");
 return {work,locus,source:location.href}
};
const getText=id=>{
 const node=document.getElementById(id);
 if(!node||node.closest("[hidden]")||node.hidden)return "";
 const text=clean(node.innerText||node.textContent);
 return /^(cargando|loading|traduciendo)/i.test(text)?"":text;
};
const capture=()=>{
 const b=source();
 const original=getText(names.original);
 const translation=getText(names.translation);
 if(!original&&!translation)return null;
 const l=isSimple?document.getElementById("original-lang")?.value:document.getElementById("facing-source")?.value;
 const r=isSimple?document.getElementById("translation-lang")?.value:document.getElementById("facing-target")?.value;
 return {...b,original,translation,leftLanguage:l||"no indicado",rightLanguage:r||"no indicado"};
};
const format=(x,withText=true)=>[
 "Vitruvius Digital Library — consulta académica",
 "Obra / edición: "+x.work,
 "Referencia indicada en la página: "+x.locus,
 "URL de consulta: "+x.source,
 "Idioma de fuente: "+x.leftLanguage,
 "Idioma de traducción: "+x.rightLanguage,
 "Advertencia: texto visible; verificar correspondencia textual con la edición y su folio. El OCR o la traducción automática no constituyen edición crítica.",
 ...(withText?["","TEXTO FUENTE",x.original||"(no disponible)","","TRADUCCIÓN VISIBLE",x.translation||"(no disponible)"]:[])
].join("\n");
const clipboard=async text=>{
 try{await navigator.clipboard.writeText(text);status.textContent="Copiado."}
 catch{status.textContent="El navegador no permitió copiar; utilizá la descarga TXT."}
};
action("Citar",()=>{
 const x=capture();if(!x){status.textContent="Todavía no hay texto legible.";return}
 void clipboard(format(x,false));
});
action("Copiar textos",()=>{
 const x=capture();if(!x){status.textContent="Todavía no hay texto legible.";return}
 void clipboard(format(x,true));
});
action("Descargar TXT",()=>{
 const x=capture();if(!x){status.textContent="Todavía no hay texto legible.";return}
 const blob=new Blob([format(x,true)],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob);
 const a=el("a");a.href=url;a.download="vitruvius-"+x.work.replace(/[^a-z0-9_-]/gi,"-").slice(0,55)+".txt";
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 status.textContent="TXT del texto visible generado.";
});
action("Analizar palabra",()=>{
 const selection=clean(window.getSelection()?.toString());
 const input=isSimple?document.getElementById("word-query"):document.getElementById("term");
 const term=(selection.split(/\s+/)[0]||input?.value||"").slice(0,80);
 if(!term){status.textContent="Selecciona una palabra del texto o escribila en el buscador.";return}
 const u=new URL("vitruvia-lexicon.html",location.href);
 u.searchParams.set("q",term);
 u.searchParams.set("mode","palabra");
 // Preserve the reading context for a return trip and scoped lexical analysis.
 // A PDF facsimile page number is not a canonical locus.
 const ctx=source();
 if(ctx.work!=="no identificada")u.searchParams.set("work",ctx.work);
 if(isSimple){
  const locus=document.getElementById("go-locus")?.value||new URLSearchParams(location.search).get("locus")||"";
  const lang=document.getElementById("original-lang")?.value||new URLSearchParams(location.search).get("left")||"";
  if(locus&&locus!=="Locus no confirmado")u.searchParams.set("locus",locus);
  if(lang)u.searchParams.set("lang",lang);
 }
 location.assign(u.href);
});
tools.append(status);mount.insertAdjacentElement("afterend",tools);
})();
