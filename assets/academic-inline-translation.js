/* Small on-demand translations for existing academic search results.
   The source and any curated translations are never overwritten.
   The browser's on-device translator is tried for modern languages only.
   For ancient languages, the reader explicitly initiates a limited external
   request to MyMemory. That output is NOT a critical edition or verified gloss. */
(()=>{"use strict";
if(window.VitruviaInlineTranslation)return;
const LANGS={la:"Latín",grc:"Griego antiguo",el:"Griego",es:"Castellano",en:"English",fr:"Français"};
const TARGETS=["es","en","fr"];
const MAX_INPUT=1200,MAX_PARTS=3,MAX_PART_BYTES=420;
const cache=new Map();
const utfBytes=value=>new TextEncoder().encode(value).length;
function chunks(text,maxBytes=MAX_PART_BYTES,maxParts=MAX_PARTS){
 const value=String(text||"").trim().slice(0,MAX_INPUT),parts=[];
 let part="";
 for(const character of value){
  if(utfBytes(part+character)>maxBytes){
   if(part.trim())parts.push(part.trim());
   part="";
   if(parts.length>=maxParts)break;
  }
  part+=character;
 }
 if(part.trim()&&parts.length<maxParts)parts.push(part.trim());
 return parts;
}
const el=(tag,cls,content)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(content!==undefined)node.textContent=content;
 return node;
};
function uiLang(){
 const root=(document.documentElement.lang||"es").toLowerCase().slice(0,2);
 return TARGETS.includes(root)?root:"es";
}
async function browserTranslation(text,source,target){
 // Chrome's built-in translator does not list Latin or ancient Greek support.
 if(!["es","en","fr","el"].includes(source))return null;
 const API=window.Translator;
 if(!API||typeof API.availability!=="function"||typeof API.create!=="function")return null;
 const availability=await API.availability({sourceLanguage:source,targetLanguage:target});
 if(availability==="unavailable")return null;
 // The preceding click provides the required transient user activation.
 const translator=await API.create({sourceLanguage:source,targetLanguage:target});
 try{
  const result=await translator.translate(text.slice(0,MAX_INPUT));
  return result?.trim()?{text:result.trim(),provider:"Traducción automática local del navegador",
   partial:text.length>MAX_INPUT}:null;
 }finally{translator.destroy?.()}
}
async function externalTranslation(text,source,target){
 const fragments=chunks(text),translated=[];
 if(!fragments.length)return null;
 for(const fragment of fragments){
  const externalSource=source==="grc"?"el":source;
  const query=new URLSearchParams({q:fragment,langpair:externalSource+"|"+target,mt:"1"});
  const url="https://api.mymemory.translated.net/get?"+query;
  // This is called ONLY after the reader presses the explicitly marked
  // external-translation button. No background requests or bulk crawling.
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(url,{method:"GET",mode:"cors",cache:"no-store",
    referrerPolicy:"no-referrer",signal:controller.signal});
   if(!response.ok)throw Error("HTTP "+response.status);
   const data=await response.json();
   const value=data?.responseData?.translatedText;
   if(Number(data?.responseStatus)!==200||typeof value!=="string"||
      !value.trim()||/QUERY LENGTH LIMIT|MYMEMORY WARNING|DAILY LIMIT|INVALID LANGUAGE/i.test(value))
    throw Error("El proveedor no entregó una traducción utilizable");
   translated.push(value.trim());
  }finally{clearTimeout(timer)}
 }
 return {text:translated.join(" "),provider:"MyMemory / Translated · traducción automática externa",
  partial:fragments.join("").replace(/\s+/g,"")!==text.trim().replace(/\s+/g,"")};
}
function attach(sourceNode,{sourceLanguage,originalText,referenceText,referenceLabel}={}){
 if(!(sourceNode instanceof Element)||sourceNode.dataset.inlineTranslationReady==="1")return false;
 const source=String(sourceLanguage||sourceNode.lang||"").toLowerCase().split("-")[0];
 if(!Object.hasOwn(LANGS,source))return false;
 const original=String(originalText||sourceNode.textContent||"").trim();
 if(original.length<12)return false;
 sourceNode.dataset.inlineTranslationReady="1";
 const wrap=el("div","academic-inline-translation");
 wrap.style.cssText="margin:9px 0 13px;padding:9px 0 0;border-top:1px solid #7774;font:12px/1.65 system-ui,Arial,sans-serif;color:inherit";
 const label=el("label","", "Idioma de lectura ");
 label.style.cssText="margin-right:8px";
 const select=el("select");
 select.setAttribute("aria-label","Idioma de traducción del fragmento");
 select.style.cssText="background:#252528;color:#fff;border:1px solid #777;border-radius:4px;padding:6px;margin:0 8px 8px 0;max-width:130px";
 for(const lang of TARGETS){const option=el("option","",LANGS[lang]);option.value=lang;select.append(option)}
 select.value=uiLang();label.append(select);
 const button=el("button","academic-inline-translate-button","Traducir fragmento");
 button.type="button";
 button.style.cssText="background:#252528;color:#fff;border:1px solid #777;border-radius:4px;padding:6px 10px;cursor:pointer;font:12px system-ui,Arial,sans-serif";
 const info=el("p","academic-inline-translation-note");
 info.textContent="La fuente permanece visible. Al pulsar Traducir, puede enviarse solo este fragmento a MyMemory (servicio externo gratuito) si no hay traducción local del navegador; no se envía nada antes de pulsar.";
 info.style.cssText="margin:4px 0;color:inherit;opacity:.75;font-size:11px";
 const output=el("div","academic-inline-translation-output");output.setAttribute("role","status");
 output.style.cssText="margin-top:7px;white-space:pre-wrap;overflow-wrap:anywhere";
 wrap.append(label,button,info,output);
 sourceNode.insertAdjacentElement("afterend",wrap);
 let busy=false;
 button.addEventListener("click",async()=>{
  if(busy)return;
  const target=select.value;
  output.replaceChildren();
  if(source===target){
   output.textContent="El texto ya está en el idioma seleccionado.";return;
  }
  if(referenceText&&target===uiLang()){
   const p=el("p","",String(referenceText));
   p.lang=target;output.append(el("strong","","Traducción documentada: "),p,
    el("small","",referenceLabel||"Edición existente; verificar fuente y locus"));
   return;
  }
  busy=true;button.disabled=true;button.textContent="Traduciendo…";
  let result=null;
  try{
   const key=[source,target,original].join("|");
   if(cache.has(key))result=cache.get(key);
   else{
    try{result=await browserTranslation(original,source,target)}catch(_){result=null}
    if(!result)result=await externalTranslation(original,source,target);
    if(result)cache.set(key,result);
   }
   if(!result)throw Error("No se pudo obtener la traducción");
   const label=el("strong","","Versión automática orientativa · "+LANGS[source]+" → "+LANGS[target]);
   const p=el("p","",result.text);p.lang=target;p.style.cssText="margin:5px 0 4px;line-height:1.65";
   const caution=el("small","",result.provider+
    (result.partial?" · Traducción parcial: consulte el texto completo en su fuente.":"")+
    (source==="grc"?" · El proveedor trata el griego antiguo como griego moderno; interpretación especialmente incierta.":"")+
    " · No constituye traducción filológica, edición crítica ni texto citado.");
   output.append(label,p,caution);
  }catch(_){
   output.textContent="Traducción automática no disponible en este navegador o se agotó el servicio gratuito. Use la traducción editorial disponible o consulte la fuente original.";
  }finally{button.disabled=false;button.textContent="Volver a traducir";busy=false}
 });
 return true;
}
window.VitruviaInlineTranslation=Object.freeze({attach,chunkForTest:chunks,bytesForTest:utfBytes});
})();