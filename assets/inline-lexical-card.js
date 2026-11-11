/* Non-modal glossary card: double-click a reading word; preserve single-click TTS/selection. */
(()=>{"use strict";
const selector="#search-results .parallel-passage,#search-results .result-snippet,#search-results [lang],#lexical-occurrences [lang],#reader-text,.reader-transcript";
const normalize=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").replace(/v/g,"u").replace(/j/g,"i");
const special={
 domus:{meaning:"Casa, vivienda, hogar; también la casa familiar o el grupo doméstico según el contexto.",grammar:"Sustantivo femenino, 4.ª declinación.",etymology:"Término latino heredado, relacionado con el griego δόμος (casa, edificio).",use:"La domus romana designa una vivienda privada; no todas contaban con atrio e impluvio."},
 geometria:{meaning:"Geometría: estudio de figuras, magnitudes y sus relaciones.",grammar:"Sustantivo femenino.",etymology:"Del griego γεωμετρία: γῆ (tierra) y μέτρον (medida).",use:"Disciplina indispensable en la formación del arquitecto según Vitruvio."},
 littera:{meaning:"Letra; en plural, letras, escritura o literatura según el contexto.",grammar:"Sustantivo femenino, 1.ª declinación.",etymology:"La etimología última de littera no está demostrada.",use:"Litteras puede ser acusativo plural; requiere lectura contextual."}
};
/* Curated brief meanings; translations are distinct from critical dictionary entries. */
const briefTranslations={
 domus:{es:"Casa, vivienda, hogar; también familia o grupo doméstico según el contexto.",
        en:"House, home or dwelling; also household or family, depending on context.",
        fr:"Maison, demeure ou habitation ; également maisonnée ou famille selon le contexte."},
 geometria:{es:"Geometría: estudio de figuras y magnitudes.",en:"Geometry: study of figures and magnitudes.",fr:"Géométrie : étude des figures et des grandeurs."},
 littera:{es:"Letra; en plural, escritura, letras o literatura según el contexto.",en:"Letter; in the plural, writing or literature according to context.",fr:"Lettre ; au pluriel, écriture ou littérature selon le contexte."}
};
function translatedMeaning(lemma,spanish){
 const meanings=briefTranslations[normalize(lemma)];
 if(!spanish&&!meanings)return;
 const section=document.createElement("section");
 const label=document.createElement("p");label.textContent="Significado orientativo · ES / EN / FR";
 label.style.fontWeight="600";section.append(label);
 const choices=document.createElement("div");choices.className="vlc-lang-options";
 const output=document.createElement("p");output.setAttribute("role","status");
 const buttons=[];
 for(const [lang,name] of [["es","Español"],["en","English"],["fr","Français"]]){
  const button=document.createElement("button");button.type="button";button.textContent=name;
  button.setAttribute("aria-pressed",String(lang==="es"));choices.append(button);buttons.push([lang,button]);
  button.addEventListener("click",async()=>{
   for(const [code,b] of buttons)b.setAttribute("aria-pressed",String(code===lang));
   if(lang==="es"){output.textContent=meanings?.es||spanish;return}
   if(meanings?.[lang]){output.textContent=meanings[lang];return}
   output.textContent="Esta glosa no tiene traducción editorial verificada. Traducción automática disponible bajo solicitud.";
   const request=document.createElement("button");request.type="button";request.textContent="Traducir automáticamente";
   request.style.cssText="margin-left:8px;padding:5px 8px;border:1px solid #777;border-radius:5px;background:#333;color:#fff;cursor:pointer";
   request.addEventListener("click",async()=>{
    request.disabled=true;request.textContent="Traduciendo…";
    try{
     const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
     let response;
     try{response=await fetch("https://api.mymemory.translated.net/get?"+new URLSearchParams({q:String(spanish).slice(0,400),langpair:"es|"+lang,mt:"1"}),{signal:controller.signal,referrerPolicy:"no-referrer"})}
     finally{clearTimeout(timeout)}
     if(!response.ok)throw Error("Servicio no disponible");
     const json=await response.json(),translated=json?.responseData?.translatedText;
     if(json?.responseStatus!==200||!translated||/MYMEMORY WARNING|DAILY LIMIT|QUERY LENGTH/i.test(translated))throw Error("Traducción no disponible");
     output.textContent=translated+" (traducción automática orientativa, no edición crítica)";
    }catch{output.textContent="No se pudo traducir. La glosa castellana permanece disponible."}
   },{once:true});
   output.append(" ",request);
  });
 }
 output.textContent=meanings?.es||spanish;
 section.append(choices,output);
 if(!meanings)section.append(Object.assign(document.createElement("small"),{textContent:"Las traducciones no verificadas se solicitan expresamente a un servicio externo; no se envían textos sin pulsar el botón."}));
 content.append(section);
}
const image={domus:{
 src:"https://commons.wikimedia.org/wiki/Special:FilePath/Atrium%20with%20impluvium%20in%20the%20House%20of%20the%20Vetti%20Pompeii.jpg?width=450",
 url:"https://commons.wikimedia.org/wiki/File:Atrium_with_impluvium_in_the_House_of_the_Vetti_Pompeii.jpg",
 caption:"Casa de los Vettii, Pompeya · atrio e impluvio (siglo I d. C.). Crédito: Mary Harrsch / Wikimedia Commons, CC BY-SA 4.0."
}};
const popup=document.createElement("aside");popup.id="vitruvius-lexical-card";popup.hidden=true;
popup.setAttribute("aria-label","Ficha léxica y etimológica");
popup.innerHTML='<div class="vlc-heading"><div><small>VITRUVIUS · LÉXICO</small><h3></h3></div><button type="button" aria-label="Cerrar ficha etimológica" class="vlc-close">×</button></div><div class="vlc-content"></div>';
document.body.append(popup);
const h=popup.querySelector("h3"),content=popup.querySelector(".vlc-content");
let cache=null,serial=0;
function getEntries(){if(!cache)cache=fetch("data/latin-lexicon.json").then(r=>{if(!r.ok)throw Error("Léxico no disponible");return r.json()}).then(d=>d.entries||[]).catch(()=>{cache=null;return []});return cache}
function close(){serial++;popup.hidden=true;content.replaceChildren()}
popup.querySelector(".vlc-close").addEventListener("click",close);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!popup.hidden)close()});
document.addEventListener("pointerdown",e=>{if(!popup.hidden&&!popup.contains(e.target))close()});
function line(label,value){if(!value)return;let p=document.createElement("p");let b=document.createElement("strong");b.textContent=label+" ";p.append(b,document.createTextNode(String(value)));content.append(p)}
function position(rect){
 const w=Math.min(430,window.innerWidth-24),x=Math.max(12,Math.min(rect.left,window.innerWidth-w-12));
 popup.style.width=w+"px";popup.style.left=x+"px";
 const spaceBelow=window.innerHeight-rect.bottom;
 popup.style.top=(spaceBelow>=320?rect.bottom+9:Math.max(10,rect.top-350))+"px";
}
function links(term){
 const bar=document.createElement("nav");bar.className="vlc-links";
 for(const [label,href] of [["Estudiar en Lexicon","vitruvia-lexicon.html?q="+encodeURIComponent(term)+"&mode=palabra"],["Concordancias","index-locorum.html?q="+encodeURIComponent(term)]]){
  const a=document.createElement("a");a.href=href;a.textContent=label;bar.append(a);
 }content.append(bar);
}
async function show(term,rect){
 const id=++serial;h.textContent=term;popup.hidden=false;position(rect);
 content.replaceChildren();
 const token=normalize(term);
 // Show the attested local headword immediately; corpus dictionaries are loaded
 // in the background only after the card is visibly open.
 const instant=special[token];
 if(instant){
  line("Lema:",term);
  line("Gramática:",instant.grammar);
  line("Definición:",instant.meaning);
  translatedMeaning(term,instant.meaning);
  line("Etimología:",instant.etymology);
  line("Uso en Vitruvio:",instant.use);
  if(image[token]){
   const im=image[token],fig=document.createElement("figure"),pic=document.createElement("img");
   pic.src=im.src;pic.alt="Testimonio arqueológico documentado";pic.loading="lazy";
   pic.addEventListener("error",()=>pic.remove(),{once:true});
   const cap=document.createElement("figcaption");cap.textContent=im.caption+" ";
   const a=document.createElement("a");a.href=im.url;a.target="_blank";
   a.rel="noopener noreferrer";a.textContent="Fuente y licencia";
   cap.append(a);fig.append(pic,cap);content.append(fig);
  }
  links(term);
  return;
 }
 content.textContent="Consultando repertorio…";
 const data=await getEntries();if(id!==serial)return;
 content.replaceChildren();
 const e=data.find(item=>[item.lemma,...(item.forms||[])].filter(Boolean).some(v=>normalize(v)===token));
 const lemma=e?.lemma||term,extra=special[normalize(lemma)];
 line("Lema:",lemma+(e?.headword?" · "+e.headword:""));
 line("Gramática:",e?.pos||extra?.grammar);
 const form=e?.morphology&&Object.entries(e.morphology).find(([k])=>normalize(k)===token);if(form)line("Forma:",form[1]);
 line("Definición:",e?.es||extra?.meaning);
 translatedMeaning(lemma,e?.es||extra?.meaning);
 for(const sense of (e?.senses||[]).slice(0,3))line("Acepción:",sense);
 line("Etimología:",extra?.etymology||(e?.greek?"Forma griega relacionada: "+e.greek+". No implica por sí sola derivación etimológica.":""));
 line("Uso en Vitruvio:",e?.vitruvian||extra?.use);
 if(e?.source)line("Fuente:",e.source);
 if(!e&&!extra){
  const cl=window.ClassicalLexicon;
  if(cl?.lookup){
   line("Estado:","Consultando diccionario filológico…");
   const hint=content.lastElementChild;
   const info=await cl.lookup(term,{lang:/[Ͱ-Ͽἀ-῿]/u.test(term)?"grc":"la",online:true}).catch(()=>null);
   if(id!==serial)return;
   hint?.remove();
   if(info?.entries?.length){
    const best=info.entries[0];
    if(best.lemma&&best.lemma!==lemma)line("Lema documentado:",best.lemma);
    if(best.morph)line("Morfología (repertorio):",best.morph);
    if(best.es)line("Castellano:",best.es);
    if(best.gloss)line("Definición del repertorio:",best.gloss);
    if(info.sources?.length)line("Procedencia:",info.sources.map(s=>s.label).join(" · "));
   }else line("Cobertura:","Sin entrada comprobada para esta forma. Consulte los diccionarios enlazados.");
  }else line("Cobertura:","Sin entrada individual en el léxico local; consultar fuentes externas antes de asignar una acepción.");
 }
 if(image[normalize(lemma)]){
  const im=image[normalize(lemma)],fig=document.createElement("figure"),pic=document.createElement("img");
  pic.src=im.src;pic.alt="Atrio e impluvio de una casa romana de Pompeya";pic.loading="lazy";pic.addEventListener("error",()=>pic.remove(),{once:true});
  const cap=document.createElement("figcaption");cap.textContent=im.caption+" ";const a=document.createElement("a");a.href=im.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Fuente y licencia";cap.append(a);fig.append(pic,cap);content.append(fig);
 }
 links(term);
}
// Public scoped entrypoint for direct click handlers in the main edition
// concordance. The dictionary is still fetched only after user interaction.
window.VitruviusLexicalCard=Object.freeze({
 open:(term,element)=>{
  const rect=element?.getBoundingClientRect?.()||{left:12,top:80,bottom:120};
  return show(term,rect);
 },
 close
});
// Single click on an attested search highlight (Latin, polytonic Greek,
// or an explicitly labelled translation equivalent). All unhighlighted words
// keep their previous selection and double-click behaviour.
document.addEventListener("click",event=>{
 const mark=event.target.closest?.("#search-results mark.search-hit,#lexical-occurrences mark.lexical-query-hit");
 if(!mark)return;
 const concordance=!!mark.closest("#lexical-occurrences");
 if(!concordance&&!mark.closest(".parallel-passage,.parallel-translation-text,.result-snippet"))return;
 if(!event.isTrusted||event.button!==0)return;
 const isTranslation=!!mark.closest(".parallel-translation-text");
 const query=document.querySelector("#query")?.value?.trim()||"";
 // Concordance foreign-language hits should not be mislabelled as Latin.
 // The Latin line has its own heading; translations retain their own language.
 const term=isTranslation&&mark.classList.contains("search-hit-equivalent")&&
   /^[\p{L}\p{M}]+$/u.test(query)?query:mark.textContent.trim();
 if(!/^[\p{L}\p{M}'ʼ’-]{2,70}$/u.test(term))return;
 event.preventDefault();
 event.stopPropagation();
 void show(term,mark.getBoundingClientRect());
},true);
document.addEventListener("dblclick",e=>{
 if(e.button!==0||!e.target.closest(selector)||e.target.closest("a,button,input,textarea,select,[contenteditable],#vitruvius-lexical-card"))return;
 const sel=window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return;
 const word=sel.toString().trim();
 if(!/^[\p{L}\p{M}'ʼ’-]{2,70}$/u.test(word))return;
 const rect=sel.getRangeAt(0).getBoundingClientRect();
 show(word,rect);
});
})();