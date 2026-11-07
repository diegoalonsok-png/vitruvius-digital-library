/* Non-modal glossary card: double-click a reading word; preserve single-click TTS/selection. */
(()=>{"use strict";
const selector="#search-results .parallel-passage,#search-results .result-snippet,#search-results [lang],#lexical-occurrences [lang],#reader-text,.reader-transcript";
const normalize=s=>String(s||"").normalize("NFD").replace(/\p{M}/gu,"").toLowerCase().replace(/ς/g,"σ").replace(/v/g,"u").replace(/j/g,"i");
const special={
 domus:{meaning:"Casa, vivienda, hogar; también la casa familiar o el grupo doméstico según el contexto.",grammar:"Sustantivo femenino, 4.ª declinación.",etymology:"Término latino heredado, relacionado con el griego δόμος (casa, edificio).",use:"La domus romana designa una vivienda privada; no todas contaban con atrio e impluvio."},
 geometria:{meaning:"Geometría: estudio de figuras, magnitudes y sus relaciones.",grammar:"Sustantivo femenino.",etymology:"Del griego γεωμετρία: γῆ (tierra) y μέτρον (medida).",use:"Disciplina indispensable en la formación del arquitecto según Vitruvio."},
 littera:{meaning:"Letra; en plural, letras, escritura o literatura según el contexto.",grammar:"Sustantivo femenino, 1.ª declinación.",etymology:"La etimología última de littera no está demostrada.",use:"Litteras puede ser acusativo plural; requiere lectura contextual."}
};
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
 const id=++serial;h.textContent=term;content.textContent="Consultando repertorio…";popup.hidden=false;position(rect);
 const data=await getEntries();if(id!==serial)return;
 content.replaceChildren();
 const token=normalize(term);
 const e=data.find(item=>[item.lemma,...(item.forms||[])].filter(Boolean).some(v=>normalize(v)===token));
 const lemma=e?.lemma||term,extra=special[normalize(lemma)];
 line("Lema:",lemma+(e?.headword?" · "+e.headword:""));
 line("Gramática:",e?.pos||extra?.grammar);
 const form=e?.morphology&&Object.entries(e.morphology).find(([k])=>normalize(k)===token);if(form)line("Forma:",form[1]);
 line("Definición:",e?.es||extra?.meaning);
 for(const sense of (e?.senses||[]).slice(0,3))line("Acepción:",sense);
 line("Etimología:",extra?.etymology||(e?.greek?"Forma griega relacionada: "+e.greek+". No implica por sí sola derivación etimológica.":""));
 line("Uso en Vitruvio:",e?.vitruvian||extra?.use);
 if(e?.source)line("Fuente:",e.source);
 if(!e&&!extra)line("Cobertura:","Sin entrada individual en el léxico local; consultar fuentes externas antes de asignar una acepción.");
 if(image[normalize(lemma)]){
  const im=image[normalize(lemma)],fig=document.createElement("figure"),pic=document.createElement("img");
  pic.src=im.src;pic.alt="Atrio e impluvio de una casa romana de Pompeya";pic.loading="lazy";pic.addEventListener("error",()=>pic.remove(),{once:true});
  const cap=document.createElement("figcaption");cap.textContent=im.caption+" ";const a=document.createElement("a");a.href=im.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Fuente y licencia";cap.append(a);fig.append(pic,cap);content.append(fig);
 }
 links(term);
}
document.addEventListener("dblclick",e=>{
 if(e.button!==0||!e.target.closest(selector)||e.target.closest("a,button,input,textarea,select,[contenteditable],#vitruvius-lexical-card"))return;
 const sel=window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return;
 const word=sel.toString().trim();
 if(!/^[\p{L}\p{M}'ʼ’-]{2,70}$/u.test(word))return;
 const rect=sel.getRangeAt(0).getBoundingClientRect();
 show(word,rect);
});
})();