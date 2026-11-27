/* Small on-demand translations for existing academic search results.
   The source and any curated translations are never overwritten.
   The browser's on-device translator is tried for modern languages only.
   For ancient languages, the reader explicitly initiates a limited external
   request to MyMemory. That output is NOT a critical edition or verified gloss. */
(()=>{"use strict";
if(window.VitruviaInlineTranslation)return;
const LANGS={la:"Latín",grc:"Griego antiguo",el:"Griego",he:"Hebreo",hbo:"Hebreo bíblico",es:"Castellano",en:"English",fr:"Français"};
const TARGETS=["es","en","fr"];
const MAX_INPUT=1200,MAX_PARTS=3,MAX_PART_BYTES=420;
const cache=new Map();
const utfBytes=value=>new TextEncoder().encode(value).length;
function chunks(text,maxBytes=MAX_PART_BYTES,maxParts=MAX_PARTS,maxInput=MAX_INPUT){
 // Split at whitespace/punctuation boundaries without breaking polytonic Greek words.
 const value=String(text||"").trim().slice(0,maxInput),parts=[];
 let rest=value;
 while(rest&&parts.length<maxParts){
  if(utfBytes(rest)<=maxBytes){parts.push(rest);break}
  let size=0,cut=0;
  for(const char of rest){
   const bytes=utfBytes(char);if(size+bytes>maxBytes)break;
   size+=bytes;cut+=char.length;
  }
  if(!cut)break;
  const head=rest.slice(0,cut);
  const boundaries=[...head.matchAll(/[\s,;··.?!:]+/gu)].map(m=>m.index+m[0].length);
  const end=boundaries.filter(x=>x>=Math.floor(cut*.40)).at(-1)||cut;
  const fragment=rest.slice(0,end).trim();
  if(!fragment)break;
  parts.push(fragment);
  rest=rest.slice(end).trimStart();
 }
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
  return result?.trim()&&!translationLooksUnchanged(text,result,source,target)?{text:result.trim(),provider:"Traducción automática local del navegador",
   partial:text.length>MAX_INPUT}:null;
 }finally{translator.destroy?.()}
}
/* Two network routes, bounded per passage. Neither produces a citable edition. */
// Greek-to-Latin transliteration is not a translation; reject mixed output that
// systematically recycles romanized Greek words (common when ancient Greek is
// sent to a modern-Greek machine model). Proper names alone do not trigger rejection.
const romanizeGreek=text=>{
 const letters={α:"a",β:"b",γ:"g",δ:"d",ε:"e",ζ:"z",η:"e",θ:"th",ι:"i",κ:"k",λ:"l",μ:"m",ν:"n",ξ:"x",ο:"o",π:"p",ρ:"r",σ:"s",ς:"s",τ:"t",υ:"u",φ:"ph",χ:"ch",ψ:"ps",ω:"o"};
 return String(text||"").normalize("NFD").replace(/[\u0300-\u036f\u1dc0-\u1dff]/g,"").toLowerCase().replace(/[α-ως]/g,c=>letters[c]||c);
};
function suspiciousGreekRomanization(original,translated){
 const sourceWords=(String(original||"").match(/[\p{Script=Greek}\p{M}]+/gu)||[])
  .map(romanizeGreek).filter(x=>x.length>=4);
 if(sourceWords.length<7)return false;
 const targetWords=(String(translated||"").normalize("NFD").replace(/[\u0300-\u036f\u1dc0-\u1dff]/g,"").toLowerCase().match(/[a-z]{4,}/g)||[]);
 if(targetWords.length<7)return false;
 const sourceSet=new Set(sourceWords);
 const matches=targetWords.filter(w=>sourceSet.has(w));
 return matches.length>=5&&matches.length/targetWords.length>=.13;
}
function translationLooksUnchanged(original,translated,source,target){
 const a=String(original||"").trim().normalize("NFKC"),b=String(translated||"").trim().normalize("NFKC");
 if(!b||a===b)return true;
 if(["grc","el"].includes(source)&&["es","en","fr"].includes(target)){
  const greek=(b.match(/[α-ωΑ-Ωά-ώἀ-῿]/g)||[]).length;
  const letters=(b.match(/[A-Za-zÀ-ÿα-ωΑ-Ωά-ώἀ-῿]/g)||[]).length;
  if(letters>20&&greek/letters>0.22)return true;
  if(suspiciousGreekRomanization(original,translated))return true;
 }
 return false;
}
async function providerMyMemory(fragment,source,target){
 const lang=source==="grc"?"el":source==="hbo"?"he":source;
 const query=new URLSearchParams({q:fragment,langpair:lang+"|"+target,mt:"1"});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7500);
 try{
  const response=await fetch("https://api.mymemory.translated.net/get?"+query,{
   method:"GET",mode:"cors",cache:"no-store",referrerPolicy:"no-referrer",signal:controller.signal
  });
  if(!response.ok)throw Error("HTTP "+response.status);
  const data=await response.json(),value=data?.responseData?.translatedText;
  if(Number(data?.responseStatus)!==200||typeof value!=="string"||!value.trim()||
   /QUERY LENGTH LIMIT|MYMEMORY WARNING|DAILY LIMIT|INVALID LANGUAGE|YOU HAVE USED ALL/i.test(value))
    throw Error("Proveedor no entregó traducción");
  if(/�|(?:Ã[\u0080-\u00bf])|(?:Â[\u0080-\u00bf])|&#(?:x[0-9a-f]+|[0-9]+);|&(?:quot|amp|apos|lt|gt);/iu.test(value))
    throw Error("Proveedor devolvió caracteres corruptos o entidades sin procesar");
  if(translationLooksUnchanged(fragment,value,source,target))throw Error("El proveedor devolvió el original sin traducir");
  return {text:value.trim(),provider:"MyMemory / Translated"};
 }finally{clearTimeout(timer)}
}
async function providerAlternate(fragment,source,target){
 const lang=source==="grc"?"el":source==="hbo"?"he":source;
 const query=new URLSearchParams({client:"gtx",sl:lang,tl:target,dt:"t",q:fragment});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7500);
 try{
  const response=await fetch("https://translate.googleapis.com/translate_a/single?"+query,{
   mode:"cors",cache:"no-store",referrerPolicy:"no-referrer",signal:controller.signal
  });
  if(!response.ok)throw Error("Proveedor alternativo HTTP "+response.status);
  const data=await response.json();
  const value=Array.isArray(data?.[0])?
    data[0].map(part=>Array.isArray(part)?String(part[0]||""):"").join(""):"";
  if(/�|(?:Ã[\u0080-\u00bf])|(?:Â[\u0080-\u00bf])|&#(?:x[0-9a-f]+|[0-9]+);/iu.test(value))throw Error("Proveedor alternativo devolvió caracteres corruptos");
  if(!value.trim()||translationLooksUnchanged(fragment,value,source,target))throw Error("Proveedor alternativo devolvió texto sin traducir");
  return {text:value.trim(),provider:"Traducción automática externa alternativa"};
 }finally{clearTimeout(timer)}
}
async function translateFragment(fragment,source,target){
 const errors=[];
 for(const candidate of [providerMyMemory,providerAlternate]){
  try{
   const r=await candidate(fragment,source,target);
   if(r?.text&&!translationLooksUnchanged(fragment,r.text,source,target))return r;
  }catch(e){errors.push(e?.message||"Error externo")}
 }
 // When Greek -> Romance fails, a documented two-stage machine translation
 // can occasionally produce a usable result: Greek -> English -> requested target.
 // Still generated text; never cite as an existing editorial translation.
 if(source==="grc"&&["es","fr"].includes(target)){
  for(const first of [providerMyMemory,providerAlternate]){
   try{
    const intermediate=await first(fragment,source,"en");
    if(translationLooksUnchanged(fragment,intermediate.text,source,"en"))continue;
    for(const second of [providerMyMemory,providerAlternate]){
     try{
      const final=await second(intermediate.text,"en",target);
      if(!translationLooksUnchanged(fragment,final.text,source,target)&&
         !translationLooksUnchanged(intermediate.text,final.text,"en",target))
       return {text:final.text,provider:"Traducción automática indirecta · griego → inglés → "+target};
     }catch(e){errors.push(e?.message||"Error de traducción indirecta")}
    }
   }catch(e){errors.push(e?.message||"Error de traducción indirecta")}
  }
 }
 throw Error("No se pudo producir una traducción real ("+errors.slice(0,2).join("; ")+")");
}
async function externalTranslation(text,source,target,fullPassage=false){
 const fragments=fullPassage?chunks(text,MAX_PART_BYTES,12,4500):chunks(text);
 // Preserve successful paragraphs when a later request hits a quota or timeout.
 // Mark the result explicitly partial; never silently interpolate missing text.
 if(!fragments.length)throw Error("Pasaje vacío");
 const translated=[];
 // No enviar tres consultas simultáneas a proveedores gratuitos: provoca
 // limitaciones 429/cuota y bloquea la traducción completa por una sola falla.
 let failed=0;
 for(const fragment of fragments){
  try{translated.push(await translateFragment(fragment,source,target))}
  catch(error){if(!translated.length)throw error;failed=fragments.length-translated.length;break}
 }
 const output=translated.map(x=>x.text).join(" ");
 if(translationLooksUnchanged(text,output,source,target))throw Error("El resultado mantiene el idioma original");
 return {text:output,provider:[...new Set(translated.map(x=>x.provider))].join(" + "),
  partial:failed>0||fragments.join("").replace(/\s+/g,"")!==text.trim().replace(/\s+/g,""),translatedFragments:translated.length,totalFragments:fragments.length};
}
function attach(sourceNode,{sourceLanguage,originalText,referenceText,referenceLanguage,referenceLabel}={}){
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
 info.textContent="El original y las traducciones editoriales permanecen visibles. Solo al solicitar una versión adicional puede enviarse un fragmento a MyMemory o al proveedor externo alternativo; el texto no se envía antes del clic. El servicio externo es orientativo y no está validado filológicamente.";
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
  if(referenceText&&TARGETS.includes(referenceLanguage)&&target===referenceLanguage){
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
    if(result&&!result.partial){if(cache.size>=150)cache.delete(cache.keys().next().value);cache.set(key,result);}
   }
   if(!result)throw Error("No se pudo obtener la traducción");
   const label=el("strong","","Versión automática orientativa · "+LANGS[source]+" → "+LANGS[target]);
   const p=el("p","",result.text);p.lang=target;p.style.cssText="margin:5px 0 4px;line-height:1.65";
   const caution=el("small","",result.provider+
    (result.partial?" · Traducción parcial: consulte el texto completo en su fuente.":"")+
    (source==="grc"?" · El proveedor trata el griego antiguo como griego moderno; interpretación especialmente incierta.":"")+
    ((source==="he"||source==="hbo")?" · El servicio traduce como hebreo moderno; el hebreo bíblico requiere cotejo filológico.":"")+
    " · No constituye traducción filológica, edición crítica ni texto citado.");
   output.append(label,p,caution);
  }catch(_){
   output.textContent="Traducción automática no disponible en este navegador o se agotó el servicio gratuito. Use la traducción editorial disponible o consulte la fuente original.";
  }finally{button.disabled=false;button.textContent="Volver a traducir";busy=false}
 });
 return true;
}
async function translate(text,source,target){
 const original=String(text||"").trim();
 if(!TARGETS.includes(target)||!Object.hasOwn(LANGS,source)||!original)throw Error("Idioma o fragmento no disponible");
 const key=[source,target,original].join("|");
 if(cache.has(key))return cache.get(key);
 let result=null;
 try{result=await browserTranslation(original,source,target)}catch(_){result=null}
 if(!result)result=await externalTranslation(original,source,target,true);
 if(!result||!result.text||translationLooksUnchanged(original,result.text,source,target))throw Error("El proveedor no entregó una traducción válida");
 cache.set(key,result);return result;
}
window.VitruviaInlineTranslation=Object.freeze({attach,translate,chunkForTest:chunks,bytesForTest:utfBytes});
})();